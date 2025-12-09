require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Firebase Admin
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // For Render/Prod: Parse the JSON string from env var
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT', e);
  }
} else if (!process.env.FUNCTION_NAME) {
  // For Local Development: Load from file
  try {
    serviceAccount = require('./serviceAccountKey.json');
  } catch (e) {
    console.warn('serviceAccountKey.json not found');
  }
}

if (process.env.FUNCTION_NAME) {
  admin.initializeApp();
} else if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  console.warn('Running without Firebase Admin credentials. DB calls may fail.');
}
const db = admin.firestore();

// Initialize AfricasTalking SMS
const AfricasTalking = require('africastalking');
const africastalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
});

app.use(cors());
app.use(bodyParser.json());

// Helper to format Firestore docs
const formatDoc = (doc) => ({ id: doc.id, ...doc.data() });

// Passport Configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
  passReqToCallback: true
},
  function (req, accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "/api/auth/facebook/callback",
  profileFields: ['id', 'emails', 'name'],
  passReqToCallback: true
},
  function (req, accessToken, refreshToken, profile, cb) {
    return cb(null, profile);
  }
));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Search Providers Endpoint (Active only)
app.get('/api/providers', async (req, res) => {
  try {
    const { service, location } = req.query;
    let query = db.collection('users')
      .where('role', '==', 'PROVIDER')
      .where('status', '==', 'active');

    // Firestore filtering is exact, so 'LIKE' search needs client-side or specific solutions like Algolia.
    // For now, we'll fetch then filter in memory for partial matches since dataset is likely small initially.
    const snapshot = await query.get();
    let providers = snapshot.docs.map(formatDoc);

    if (service) {
      const lowerService = service.toLowerCase();
      providers = providers.filter(p => p.service && p.service.toLowerCase().includes(lowerService));
    }
    if (location) {
      const lowerLocation = location.toLowerCase();
      providers = providers.filter(p => p.location && p.location.toLowerCase().includes(lowerLocation));
    }

    res.json(providers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, phone_number } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (!snapshot.empty) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    const normalizedRole = role.trim().toUpperCase();
    const status = normalizedRole === 'PROVIDER' ? 'pending' : 'active';

    const newUser = {
      name,
      email,
      password: hashed,
      role: normalizedRole,
      status,
      created_at: now,
      phone_number: phone_number || null
    };

    const docRef = await db.collection('users').add(newUser);
    const userId = docRef.id;

    // Send SMS notification if it's a new provider
    if (normalizedRole === 'PROVIDER') {
      const adminPhone = process.env.ADMIN_PHONE_NUMBER;
      if (adminPhone) {
        const message = `Afri Talk Alert: New provider registered!\nName: ${name}\nEmail: ${email}\nPhone: ${phone_number || 'N/A'}\nStatus: Pending approval`;
        try {
          await africastalking.SMS.send({ to: [adminPhone], message });
        } catch (smsError) {
          console.error('SMS sending failed:', smsError);
        }
      }
    }

    res.status(201).json({ id: userId, name, email, role: normalizedRole, status });

  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing email or password' });

    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) return res.status(400).json({ message: 'Invalid credentials' });

    const userToken = snapshot.docs[0];
    const user = formatDoc(userToken);

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      status: user.status
    }, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      service: user.service,
      location: user.location,
      status: user.status,
      phone_number: user.phone_number
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Missing token' });

  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const doc = await db.collection('users').doc(decoded.id).get();

    if (doc.exists) {
      const user = formatDoc(doc);
      // Remove password before sending back
      delete user.password;
      res.json({ user });
    } else {
      res.json({ user: decoded }); // Fallback to token data
    }
  } catch (e) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Admin: Get Pending Providers
app.get('/api/admin/pending-providers', async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .where('role', '==', 'PROVIDER')
      .where('status', '==', 'pending')
      .get();

    const providers = snapshot.docs.map(formatDoc);
    res.json(providers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Admin: Approve/Reject Provider
app.put('/api/admin/providers/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const userRef = db.collection('users').doc(id);
    const doc = await userRef.get();

    if (!doc.exists) return res.status(404).json({ message: 'Provider not found' });
    const provider = doc.data();

    if (provider.role !== 'PROVIDER') return res.status(400).json({ message: 'User is not a provider' });

    await userRef.update({ status: status });

    // SMS Notifications
    const adminPhone = process.env.ADMIN_PHONE_NUMBER;
    const statusText = status === 'active' ? 'APPROVED' : 'REJECTED';

    if (adminPhone) {
      const adminMessage = `KIND Alert: Provider ${statusText}!\nName: ${provider.name}\nEmail: ${provider.email}\nService: ${provider.service || 'N/A'}\nStatus: ${statusText}`;
      africastalking.SMS.send({ to: [adminPhone], message: adminMessage }).catch(e => console.error(e));
    }

    if (provider.phone_number) {
      const providerMessage = `Hello ${provider.name}, your provider account on KIND has been ${status === 'active' ? 'APPROVED' : 'REJECTED'}. ${status === 'active' ? 'You can now log in.' : 'Please contact support.'}`;
      africastalking.SMS.send({ to: [provider.phone_number], message: providerMessage }).catch(e => console.error(e));
    }

    res.json({ message: `Provider ${status}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      delete data.password;
      return { id: doc.id, ...data };
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, role, service, location, phone_number } = req.body;

  try {
    const userRef = db.collection('users').doc(id);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ message: 'User not found' });

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role) updates.role = role;
    if (service) updates.service = service;
    if (location) updates.location = location;
    if (phone_number) updates.phone_number = phone_number;

    await userRef.update(updates);

    const updatedDoc = await userRef.get();
    const updatedUser = formatDoc(updatedDoc);
    delete updatedUser.password;

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Delete Contact Requests
    const clientRequests = await db.collection('contact_requests').where('client_id', '==', id).get();
    const providerRequests = await db.collection('contact_requests').where('provider_id', '==', id).get();

    const batch = db.batch();
    clientRequests.docs.forEach((doc) => batch.delete(doc.ref));
    providerRequests.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    // 2. Delete User
    await db.collection('users').doc(id).delete();

    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Helper to handle OAuth success
const handleOAuthCallback = async (req, res, provider) => {
  const profile = req.user;
  const email = profile.emails ? profile.emails[0].value : null;
  const name = profile.displayName || `${profile.name.givenName} ${profile.name.familyName}`;

  if (!email) {
    return res.redirect('/login?error=No email provided by ' + provider);
  }

  try {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();

    if (!snapshot.empty) {
      // User exists - Login
      const doc = snapshot.docs[0];
      const row = formatDoc(doc);
      const token = jwt.sign({ id: row.id, role: row.role, name: row.name, email: row.email, status: row.status }, JWT_SECRET, { expiresIn: '8h' });
      res.redirect(`http://localhost:3000/#/oauth-callback?token=${token}&role=${row.role}&name=${encodeURIComponent(row.name)}&id=${row.id}&status=${row.status}`);
    } else {
      // User is NEW - Redirect to frontend to select role
      const registerToken = jwt.sign({ name, email, provider }, JWT_SECRET, { expiresIn: '1h' });
      res.redirect(`http://localhost:3000/#/oauth-callback?registerToken=${registerToken}&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`);
    }
  } catch (err) {
    console.error(err);
    res.redirect('/login?error=Database error');
  }
};

// OAuth Routes
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/api/auth/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), (req, res) => handleOAuthCallback(req, res, 'Google'));

app.get('/api/auth/facebook', passport.authenticate('facebook', { scope: ['public_profile', 'email'] }));
app.get('/api/auth/facebook/callback', passport.authenticate('facebook', { session: false, failureRedirect: '/login' }), (req, res) => handleOAuthCallback(req, res, 'Facebook'));

// Complete OAuth Registration
app.post('/api/auth/oauth-complete', async (req, res) => {
  const { registerToken, role, phone_number } = req.body;

  if (!registerToken || !role) {
    return res.status(400).json({ message: 'Missing token or role' });
  }

  try {
    const decoded = jwt.verify(registerToken, JWT_SECRET);
    const { name, email } = decoded;

    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (!snapshot.empty) return res.status(400).json({ message: 'User already exists' });

    const randomPassword = await bcrypt.hash(Math.random().toString(36), 10);
    const now = new Date().toISOString();
    const status = role.toUpperCase() === 'PROVIDER' ? 'pending' : 'active';

    const newUser = {
      name,
      email,
      password: randomPassword,
      role: role.toUpperCase(),
      status,
      created_at: now,
      phone_number: phone_number || null
    };

    const docRef = await db.collection('users').add(newUser);
    const userId = docRef.id;

    const token = jwt.sign({ ...newUser, id: userId }, JWT_SECRET, { expiresIn: '8h' });
    res.status(201).json({ token, ...newUser, id: userId });

  } catch (e) {
    console.error(e);
    return res.status(400).json({ message: 'Invalid or expired registration token' });
  }
});

// Contact Request Endpoints (Auto-approved, no admin step)
app.post('/api/contact-requests', async (req, res) => {
  const { client_id, client_name, provider_id, provider_name, message } = req.body;

  if (!client_id || !provider_id) {
    return res.status(400).json({ message: 'Client ID and Provider ID are required' });
  }

  const created_at = new Date().toISOString();

  try {
    const newRequest = {
      client_id,
      client_name,
      provider_id,
      provider_name,
      message: message || '',
      status: 'approved',
      created_at,
      approved_at: created_at
    };

    const docRef = await db.collection('contact_requests').add(newRequest);

    res.status(201).json({
      id: docRef.id,
      message: 'Contact request approved',
      status: 'approved',
      approved_at: created_at
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create contact request' });
  }
});

app.get('/api/contact-requests', async (req, res) => {
  try {
    const snapshot = await db.collection('contact_requests')
      .orderBy('created_at', 'desc')
      .get();
    res.json(snapshot.docs.map(formatDoc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Client-side view of their own contact requests (conversations)
app.get('/api/contact-requests/client/:clientId', async (req, res) => {
  const { clientId } = req.params;

  try {
    const snapshot = await db.collection('contact_requests')
      .where('client_id', '==', clientId)
      .orderBy('created_at', 'desc')
      .get();

    res.json(snapshot.docs.map(formatDoc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.get('/api/contact-requests/provider/:providerId', async (req, res) => {
  const { providerId } = req.params;

  try {
    const snapshot = await db.collection('contact_requests')
      .where('provider_id', '==', providerId)
      .where('status', '==', 'approved')
      .orderBy('approved_at', 'desc')
      .get();

    res.json(snapshot.docs.map(formatDoc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/contact-requests/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const approved_at = status === 'approved' ? new Date().toISOString() : null;

  try {
    const requestRef = db.collection('contact_requests').doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) return res.status(404).json({ message: 'Contact request not found' });

    const request = requestDoc.data();

    await requestRef.update({ status, approved_at });

    // Fetch user details for SMS
    const clientDoc = await db.collection('users').doc(request.client_id).get();
    const providerDoc = await db.collection('users').doc(request.provider_id).get();

    const client = clientDoc.data() || {};
    const provider = providerDoc.data() || {};

    if (status === 'approved') {
      const sms = africastalking.SMS;
      const adminPhone = process.env.ADMIN_PHONE_NUMBER;

      if (adminPhone) {
        const adminMessage = `KIND Alert: Contact request approved!\nClient: ${request.client_name}\nProvider: ${request.provider_name}\nService: ${provider.service || 'N/A'}`;
        sms.send({ to: [adminPhone], message: adminMessage }).catch(e => console.error(e));
      }

      if (client.phone_number) {
        const clientMessage = `Good news! Your request for ${request.provider_name} (${provider.service}) has been APPROVED. Contact them at: ${provider.phone_number || provider.email}.`;
        sms.send({ to: [client.phone_number], message: clientMessage }).catch(e => console.error(e));
      }

      if (provider.phone_number) {
        const providerMessage = `Hello ${request.provider_name}, a new client (${request.client_name}) has been given your contact details.`;
        sms.send({ to: [provider.phone_number], message: providerMessage }).catch(e => console.error(e));
      }
    }

    res.json({ message: `Contact request ${status}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

// Messages API Endpoints
app.post('/api/messages', async (req, res) => {
  const { contact_request_id, sender_id, sender_name, sender_role, message } = req.body;

  if (!contact_request_id || !sender_id || !sender_name || !sender_role || !message) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const created_at = new Date().toISOString();

  try {
    const newMessage = {
      contact_request_id,
      sender_id,
      sender_name,
      sender_role,
      message,
      created_at
    };

    const docRef = await db.collection('messages').add(newMessage);

    res.status(201).json({ id: docRef.id, ...newMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

app.get('/api/messages/:contactRequestId', async (req, res) => {
  const { contactRequestId } = req.params;

  try {
    const snapshot = await db.collection('messages')
      .where('contact_request_id', '==', contactRequestId)
      .orderBy('created_at', 'asc')
      .get();

    res.json(snapshot.docs.map(formatDoc));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.put('/api/messages/:messageId/read', async (req, res) => {
  const { messageId } = req.params;
  const read_at = new Date().toISOString();

  try {
    await db.collection('messages').doc(messageId).update({ read_at });
    res.json({ message: 'Message marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.FUNCTION_NAME) {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

const functions = require('firebase-functions');
exports.api = functions.https.onRequest(app);

