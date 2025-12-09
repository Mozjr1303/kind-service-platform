import React, { useState, useEffect } from 'react';
import { Calendar, DollarSign, Star, MapPin, Clock, ChevronRight, ChevronLeft, CheckCircle, Briefcase, Camera, X, Upload, AlertCircle, MessageCircle, Send, Smile, Phone, MoreVertical, ArrowRight, User } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';

const serviceCategories = [
   'Plumbing',
   'Electrician',
   'Carpentry',
   'Painting',
   'Cleaning',
   'AC Repair'
];

const mockJobs = [
   { id: 1, title: 'House Plumbing', client: 'Moses Aaron Makunganga', time: 'Today, 2:00 PM', location: 'Blantyre', price: '45,000', status: 'confirmed' },
];

interface ProviderDashboardProps {
   providerName?: string;
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({ providerName = 'Professional' }) => {
   // State for onboarding/setup status
   const [isSetupComplete, setIsSetupComplete] = useState(() => {
      return localStorage.getItem('providerSetupComplete') === 'true';
   });

   // State for service and location
   const [selectedService, setSelectedService] = useState(() => {
      return localStorage.getItem('providerService') || '';
   });
   const [selectedLocation, setSelectedLocation] = useState(() => {
      return localStorage.getItem('providerLocation') || '';
   });

   // State for stats and data
   const [stats] = useState({
      earnings: 0,
      jobsCompleted: 0,
      rating: 0,
      ratingCount: 0
   });

   const [jobs, setJobs] = useState<any[]>(mockJobs); // Initialize with mock jobs
   const [reviews] = useState<any[]>([]); // Empty for new providers

   // Profile Update State
   const [showProfileModal, setShowProfileModal] = useState(false);
   const [displayName, setDisplayName] = useState(providerName);
   const [profileForm, setProfileForm] = useState({
      name: providerName,
      bio: '',
      hourlyRate: '',
      service: selectedService,
      location: selectedLocation
   });
   const [isSaving, setIsSaving] = useState(false);
   const [contactRequests, setContactRequests] = useState<any[]>([]);
   const [loadingRequests, setLoadingRequests] = useState(false);

   // Chat State
   const [showChatModal, setShowChatModal] = useState(false);
   const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
   const [messages, setMessages] = useState<any[]>([]);
   const [newMessage, setNewMessage] = useState('');

   // Calendar State
   const [showCalendarModal, setShowCalendarModal] = useState(false);
   const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

   const openConversation = async (req: any) => {
      setSelectedRequest(req);
      setShowChatModal(true);

      // Initial message from the contact request (Client sent this)
      const initialMessage = {
         id: `initial-${req.id}`,
         sender_role: 'CLIENT',
         sender_id: req.client_id, // This should be in the request object
         name: req.client_name,
         message: req.message,
         created_at: req.created_at || req.approved_at
      };

      try {
         const res = await fetch(`https://kind-app-x9ef.onrender.com/api/messages/${req.id}`);
         if (res.ok) {
            const data = await res.json();
            const fetchedMessages = Array.isArray(data) ? data : [];

            // If the API doesn't return the initial contact message, prepend it
            const hasInitial = fetchedMessages.some((m: any) => m.message === req.message && m.sender_role === 'CLIENT');

            if (!hasInitial && req.message) {
               setMessages([initialMessage, ...fetchedMessages]);
            } else {
               setMessages(fetchedMessages);
            }
         } else {
            if (req.message) {
               setMessages([initialMessage]);
            } else {
               setMessages([]);
            }
         }
      } catch (e) {
         console.error('Failed to load messages', e);
         if (req.message) {
            setMessages([initialMessage]);
         } else {
            setMessages([]);
         }
      }
   };

   const sendMessage = async () => {
      if (!newMessage.trim() || !selectedRequest) return;

      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName'); // or displayName
      if (!userId) return;

      try {
         const res = await fetch('https://kind-app-x9ef.onrender.com/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               contact_request_id: selectedRequest.id,
               sender_id: parseInt(userId),
               sender_name: userName || displayName,
               sender_role: 'PROVIDER',
               message: newMessage.trim()
            })
         });

         if (res.ok) {
            const sentMessage = await res.json();
            setMessages([...messages, sentMessage]);
            setNewMessage('');
         }
      } catch (e) {
         console.error('Failed to send message', e);
      }
   };

   const [status, setStatus] = useState<string>(() => {
      return localStorage.getItem('userStatus') || 'active';
   });

   // Sync displayName with prop if it changes (and we haven't locally modified it yet)
   useEffect(() => {
      setDisplayName(providerName);
      setProfileForm(prev => ({ ...prev, name: providerName }));
   }, [providerName]);

   // Sync service/location with local storage on mount
   useEffect(() => {
      setProfileForm(prev => ({
         ...prev,
         service: selectedService,
         location: selectedLocation
      }));

      // Fetch user ID and Status
      const fetchUserData = async () => {
         const token = localStorage.getItem('token');
         if (token) {
            try {
               const res = await fetch('https://kind-app-x9ef.onrender.com/api/me', {
                  headers: { Authorization: `Bearer ${token}` }
               });
               if (res.ok) {
                  const data = await res.json();
                  if (data.user) {
                     if (data.user.id) localStorage.setItem('userId', data.user.id);
                     if (data.user.status) setStatus(data.user.status);
                  }
               }
            } catch (e) {
               console.error('Failed to fetch user data', e);
            }
         }
      };
      fetchUserData();
   }, [selectedService, selectedLocation]);

   // Calculate Completion Percentage
   const [completionPercentage, setCompletionPercentage] = useState(0);

   useEffect(() => {
      let filled = 0;
      const total = 5;

      if (profileForm.name && profileForm.name.trim() !== '') filled++;
      if (profileForm.service && profileForm.service !== '') filled++;
      if (profileForm.location && profileForm.location !== '') filled++;
      if (profileForm.bio && profileForm.bio.trim() !== '') filled++;
      if (profileForm.hourlyRate && profileForm.hourlyRate !== '') filled++;

      // Bonus for having a profile photo (simulated check if generic seed is not used, 
      // but for now let's stick to form fields or assume photo is always 'there' or hard to check without real upload)

      setCompletionPercentage(Math.round((filled / total) * 100));
   }, [profileForm]);

   if (status === 'pending') {
      return (
         <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 max-w-lg w-full shadow-xl border border-slate-100 dark:border-slate-700 text-center">
               <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-100">
                  <Clock className="text-amber-600" size={40} />
               </div>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Awaiting Approval</h2>
               <p className="text-slate-500 dark:text-slate-400 text-lg mb-6">
                  Your provider account is currently under review by our administrators. You will be notified once your account is approved.
               </p>
               <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-400 text-sm">
                  <strong>Note:</strong> You cannot accept jobs or appear in search results until approved.
               </div>
            </div>
         </div>
      );
   }

   if (status === 'rejected') {
      return (
         <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 max-w-lg w-full shadow-xl border border-slate-100 dark:border-slate-700 text-center">
               <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-100">
                  <AlertCircle className="text-red-600" size={40} />
               </div>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Account Rejected</h2>
               <p className="text-slate-500 dark:text-slate-400 text-lg mb-6">
                  Your provider account application has been rejected by our administrators.
               </p>
               <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-800 text-sm">
                  Please contact support for more information.
               </div>
            </div>
         </div>
      );
   }

   // Fetch contact requests AND merge into jobs
   const fetchContactRequests = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      setLoadingRequests(true);
      try {
         const res = await fetch(`https://kind-app-x9ef.onrender.com/api/contact-requests/provider/${userId}`);
         if (res.ok) {
            const data = await res.json();
            const requests = Array.isArray(data) ? data : [];
            setContactRequests(requests);

            // Convert requests to job-like objects
            const requestJobs = requests.map((req: any) => ({
               id: `req-${req.id}`,
               originalRequest: req, // Keep original request for chat
               title: 'Service Request', // Generic title or derive from service
               client: req.client_name,
               time: new Date(req.approved_at).toLocaleDateString(),
               location: 'Remote/On-site', // Placeholder
               price: 'TBD',
               status: 'pending_chat', // Custom status
               isRequest: true
            }));

            // Merge with existing mock jobs (avoiding duplicates if multiple calls)
            // For this demo, we reset jobs to mock + fetched requests each time to avoid duplication
            setJobs([...mockJobs, ...requestJobs]);
         }
      } catch (e) {
         console.error('Failed to fetch contact requests', e);
      } finally {
         setLoadingRequests(false);
      }
   };

   useEffect(() => {
      if (isSetupComplete) {
         fetchContactRequests();
      }
   }, [isSetupComplete]);


   // ... (Rest of component functions)




   const handleServiceChange = (service: string) => {
      setSelectedService(service);
   };

   const handleLocationChange = (location: string) => {
      setSelectedLocation(location);
   };

   const handleOnboardingComplete = async () => {
      if (selectedService && selectedLocation) {
         localStorage.setItem('providerSetupComplete', 'true');
         localStorage.setItem('providerService', selectedService);
         localStorage.setItem('providerLocation', selectedLocation);
         setIsSetupComplete(true);

         // Sync with server if userId exists
         const userId = localStorage.getItem('userId');
         if (userId) {
            try {
               await fetch(`https://kind-app-x9ef.onrender.com/api/users/${userId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     service: selectedService,
                     location: selectedLocation
                  })
               });
            } catch (e) {
               console.error('Failed to sync onboarding data', e);
            }
         }
      }
   };

   const handleProfileUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSaving(true);

      try {
         const userId = localStorage.getItem('userId');
         if (!userId) throw new Error('User ID not found');

         // 1. Update User Basic Info (Name, Service, Location) via API
         const res = await fetch(`https://kind-app-x9ef.onrender.com/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               name: profileForm.name,
               service: profileForm.service,
               location: profileForm.location
            })
         });

         if (!res.ok) throw new Error('Failed to update profile');

         // 2. Update Local Storage & State
         localStorage.setItem('userName', profileForm.name);
         localStorage.setItem('providerService', profileForm.service);
         localStorage.setItem('providerLocation', profileForm.location);

         setDisplayName(profileForm.name);
         setSelectedService(profileForm.service);
         setSelectedLocation(profileForm.location);

         // Close Modal
         setShowProfileModal(false);
         alert('Profile updated successfully!');
      } catch (err) {
         console.error(err);
         alert('Error updating profile. Please try again.');
      } finally {
         setIsSaving(false);
      }
   };

   // ----------------------------------------------------------------------
   // VIEW 1: SETUP SCREEN (For new providers)
   // ----------------------------------------------------------------------
   if (!isSetupComplete) {
      return (
         <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 md:p-12 max-w-lg w-full shadow-xl border border-slate-100 dark:border-slate-700">
               <div className="text-center mb-10">
                  <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-100">
                     <span className="text-5xl">👋</span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Welcome to KIND!</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-lg">Let's set up your professional profile to get you started.</p>
               </div>

               <div className="space-y-6">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        What service do you provide? <span className="text-rose-500">*</span>
                     </label>
                     <div className="relative">
                        <select
                           value={selectedService}
                           onChange={(e) => handleServiceChange(e.target.value)}
                           className="w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-purple-600 dark:text-purple-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-bold appearance-none"
                        >
                           <option value="">Select a service...</option>
                           {serviceCategories.map((category) => (
                              <option key={category} value={category} className="text-purple-600 dark:text-purple-400 font-medium">
                                 {category}
                              </option>
                           ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                           <ChevronRight className="rotate-90" size={20} />
                        </div>
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        Where do you operate? <span className="text-rose-500">*</span>
                     </label>
                     <div className="relative">
                        <select
                           value={selectedLocation}
                           onChange={(e) => handleLocationChange(e.target.value)}
                           className="w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-purple-600 dark:text-purple-400 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-bold appearance-none"
                        >
                           <option value="">Select a location...</option>
                           <option value="Blantyre" className="text-purple-600 dark:text-purple-400 font-medium">Blantyre</option>
                           <option value="Lilongwe" className="text-purple-600 dark:text-purple-400 font-medium">Lilongwe</option>
                           <option value="Mzuzu" className="text-purple-600 dark:text-purple-400 font-medium">Mzuzu</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                           <ChevronRight className="rotate-90" size={20} />
                        </div>
                     </div>
                  </div>

                  <button
                     onClick={handleOnboardingComplete}
                     disabled={!selectedService || !selectedLocation}
                     className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-[0.98] ${selectedService && selectedLocation
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                  >
                     {selectedService && selectedLocation ? 'Launch Dashboard' : 'Complete Setup'}
                  </button>
               </div>
            </div>
         </div>
      );
   }

   // ----------------------------------------------------------------------
   // VIEW 2: MAIN DASHBOARD (For existing providers)
   // ----------------------------------------------------------------------
   return (
      <div className="space-y-12 pb-20">
         {/* Hero Header */}
         <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-900 text-white shadow-2xl shadow-slate-200 dark:shadow-none">
            {/* Background Elements */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581578731117-104f2a863a30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/90 via-slate-900/80 to-transparent"></div>

            <div className="relative z-10 p-8 md:p-12">
               <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sm font-medium text-indigo-300 mb-4">
                        <span className="relative flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Active Provider
                     </div>
                     <h1 className="text-3xl md:text-5xl font-bold mb-2">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-300">{displayName}!</span>
                     </h1>
                     <p className="text-indigo-100 text-lg">Here's what's happening with your business today.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto items-start sm:items-center">
                     {/* Service Badge */}
                     <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 min-w-[160px]">
                        <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Service</p>
                        <div className="flex items-center gap-2 text-white font-bold text-lg">
                           <Briefcase size={20} className="text-indigo-400" />
                           {selectedService || 'General'}
                        </div>
                        <p className="text-white/60 text-xs mt-1">{selectedLocation}</p>
                     </div>

                     {/* Earnings */}
                     <div className="text-left sm:text-right">
                        <p className="text-indigo-100 text-sm font-medium mb-1">Earnings (Oct)</p>
                        <p className="text-3xl font-bold">MWK {stats.earnings.toLocaleString()}</p>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Stats Row */}
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
               title="Jobs Completed"
               value={stats.jobsCompleted.toString()}
               icon={CheckCircle}
               colorClass="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400"
            />
            <StatCard
               title="Total Earnings"
               value={`MWK ${stats.earnings.toLocaleString()}`}
               trend={stats.earnings > 0 ? "8% vs last mo" : "No earnings yet"}
               trendUp={stats.earnings > 0}
               icon={(props: { size?: number }) => (
                  <span className="font-black leading-none flex items-center justify-center" style={{ fontSize: props.size ? props.size - 4 : 20 }}>MK</span>
               )}
               colorClass="text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400"
            />
            <StatCard
               title="Client Rating"
               value={stats.rating > 0 ? stats.rating.toString() : "New"}
               icon={Star}
               colorClass="text-amber-500 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
            />
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Job Feed */}
            <div className="lg:col-span-2 space-y-6">
               <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Jobs & Requests</h2>
                  <div className="flex items-center gap-3">
                     <button
                        onClick={fetchContactRequests}
                        disabled={loadingRequests}
                        className="text-indigo-600 text-sm font-medium hover:underline flex items-center gap-1"
                     >
                        <Clock size={14} className={loadingRequests ? "animate-spin" : ""} />
                        {loadingRequests ? 'Updating...' : 'Update List'}
                     </button>
                     {jobs.length > 0 && (
                        <button
                           onClick={() => setShowCalendarModal(true)}
                           className="text-indigo-600 text-sm font-medium hover:underline"
                        >
                           View Calendar
                        </button>
                     )}
                  </div>
               </div>

               <div className="space-y-4">
                  {jobs.length > 0 ? (
                     jobs.map(job => (
                        <div key={job.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col gap-4">
                           <div className="flex flex-col sm:flex-row justify-between gap-4">
                              <div className="flex gap-4">
                                 <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    <Calendar size={20} />
                                 </div>
                                 <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                       <h3 className="font-bold text-slate-900 dark:text-white">{job.title}</h3>
                                       {job.isRequest ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                             New Request
                                          </span>
                                       ) : (
                                          <Badge status={job.status} />
                                       )}
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Client: {job.client}</p>
                                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                                       <span className="flex items-center gap-1"><Clock size={12} /> {job.time}</span>
                                       <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                                    </div>

                                    {/* Show message preview if it's a request */}
                                    {job.isRequest && job.originalRequest?.message && (
                                       <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg mt-3 text-sm text-slate-600 dark:text-slate-300 italic">
                                          "{job.originalRequest.message}"
                                       </div>
                                    )}
                                 </div>
                              </div>
                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                 <span className="text-lg font-bold text-slate-900 dark:text-white">{job.price === 'TBD' ? 'Price TBD' : `MWK ${job.price}`}</span>
                                 {!job.isRequest && (
                                    <button className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-indigo-600 hover:text-white transition-colors">
                                       <ChevronRight size={16} />
                                    </button>
                                 )}
                              </div>
                           </div>

                           {/* Action button for requests */}
                           {job.isRequest && (
                              <button
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    openConversation(job.originalRequest);
                                 }}
                                 className="w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                              >
                                 View Conversation
                              </button>
                           )}
                        </div>
                     ))
                  ) : (
                     <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-500">
                           <Calendar size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No upcoming jobs</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                           Once clients book your services, your upcoming jobs will appear here.
                        </p>
                     </div>
                  )}
               </div>
            </div>

            {/* Side Panel (Profile/Notifications) */}
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Completion Status</h3>
                  <div className="relative pt-1">
                     <div className="flex mb-2 items-center justify-between">
                        <div>
                           <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-100">
                              Profile
                           </span>
                        </div>
                        <div className="text-right">
                           <span className="text-xs font-semibold inline-block text-indigo-600">
                              {completionPercentage}%
                           </span>
                        </div>
                     </div>
                     <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100 dark:bg-slate-700">
                        <div style={{ width: `${completionPercentage}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"></div>
                     </div>
                     <p className="text-xs text-slate-500 dark:text-slate-400">Complete your bio and add portfolio photos to increase visibility.</p>
                     <button
                        onClick={() => setShowProfileModal(true)}
                        className="mt-4 w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                     >
                        Update Profile
                     </button>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Reviews</h3>
                  <div className="space-y-4">
                     {reviews.length > 0 ? (
                        reviews.map((review, i) => (
                           <div key={i} className="pb-4 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0">
                              <div className="flex items-center gap-1 text-amber-400 mb-1">
                                 {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} className={i < review.rating ? "" : "text-slate-200 dark:text-slate-700"} />
                                 ))}
                              </div>
                              <p className="text-sm text-slate-600 italic">"{review.text}"</p>
                              <p className="text-xs text-slate-400 mt-2">- {review.client}, {review.date}</p>
                           </div>
                        ))
                     ) : (
                        <div className="text-center py-6">
                           <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-300 dark:text-amber-500">
                              <Star size={20} />
                           </div>
                           <p className="text-slate-500 dark:text-slate-400 text-sm">No reviews yet</p>
                           <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Reviews will appear here after you complete jobs.</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* Chat Modal */}
         {showChatModal && selectedRequest && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
               <div className="bg-[#efe7dd] rounded-none md:rounded-2xl w-full h-full md:max-w-md md:h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">

                  {/* WhatsApp Header - Provider Side */}
                  <div className="bg-indigo-600 px-4 py-3 flex items-center gap-3 shadow-md z-10 text-white shrink-0">
                     <button
                        onClick={() => setShowChatModal(false)}
                        className="p-1 -ml-1 hover:bg-white/10 rounded-full transition-colors"
                     >
                        <ArrowRight className="w-6 h-6 rotate-180" />
                     </button>

                     <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border border-white/30">
                        <span className="font-bold text-lg">{selectedRequest.client_name?.charAt(0)}</span>
                     </div>

                     <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg leading-none truncate">
                           {selectedRequest.client_name || 'Client'}
                        </h3>
                        <p className="text-xs text-indigo-100 mt-0.5 truncate opacity-90">
                           Potential Client
                        </p>
                     </div>


                  </div>

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#f0f2f5] relative">
                     <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat bg-[length:400px_400px]"></div>

                     {messages.length > 0 ? (
                        messages.map((msg, idx) => {
                           // Provider logic: I am the provider. 
                           // If msg.sender_role === 'PROVIDER' -> It's ME (right side).
                           // If msg.sender_role === 'CLIENT' -> Is CLIENT (left side).
                           const isMe = msg.sender_role === 'PROVIDER' || msg.sender_id === parseInt(localStorage.getItem('userId') || '0');

                           return (
                              <div
                                 key={idx}
                                 className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} relative z-10`}
                              >
                                 <div
                                    className={`
                                       max-w-[85%] px-3 py-2 rounded-lg shadow-sm text-[15px] leading-relaxed relative break-words
                                       ${isMe ? 'bg-indigo-100 text-slate-900 rounded-tr-none' : 'bg-white text-slate-900 rounded-tl-none'}
                                    `}
                                 >
                                    <p>{msg.message}</p>
                                    <span className={`text-[10px] block text-right mt-1 ${isMe ? 'text-indigo-800/60' : 'text-slate-400'}`}>
                                       {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                       {isMe && <span className="ml-1 inline-block">✓✓</span>}
                                    </span>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="flex flex-col items-center justify-center py-10 opacity-60">
                           <div className="bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-lg shadow-sm text-xs text-slate-800 text-center max-w-xs">
                              👋 Reply to {selectedRequest.client_name}
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Input Area */}
                  <div className="p-2 bg-[#f8fafc] flex items-end gap-2 shrink-0 pb-safe border-t border-slate-200">
                     <div className="flex-1 bg-white rounded-2xl flex items-center px-4 py-2 shadow-sm border border-slate-100 min-h-[50px]">
                        <input
                           type="text"
                           value={newMessage}
                           onChange={(e) => setNewMessage(e.target.value)}
                           placeholder="Message..."
                           className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-900 placeholder-slate-400 text-base"
                           onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                        />
                     </div>
                     <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className={`p-3 rounded-full shadow-md transition-all transform active:scale-95 mb-0.5 flex items-center justify-center ${newMessage.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400'}`}
                     >
                        <Send size={20} className={newMessage.trim() ? 'ml-0.5' : ''} />
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Profile Update Modal */}
         {showProfileModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Update Profile</h2>
                     <button
                        onClick={() => setShowProfileModal(false)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                     >
                        <X size={24} />
                     </button>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                     {/* Profile Photo */}
                     <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 relative group cursor-pointer hover:border-indigo-400 transition-colors">
                           <Camera className="text-slate-400 dark:text-slate-500 group-hover:text-indigo-500" size={32} />
                        </div>
                        <div>
                           <h3 className="font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                           <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Upload a professional photo of yourself.</p>
                           <button type="button" className="text-indigo-600 text-sm font-bold hover:underline">Upload New</button>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                           <input
                              type="text"
                              value={profileForm.name}
                              onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hourly Rate (MWK)</label>
                           <input
                              type="text"
                              value={profileForm.hourlyRate}
                              onChange={e => setProfileForm({ ...profileForm, hourlyRate: e.target.value })}
                              placeholder="e.g. 15,000"
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Bio</label>
                        <textarea
                           rows={4}
                           value={profileForm.bio}
                           onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                           placeholder="Tell clients about your experience and skills..."
                           className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        ></textarea>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Service Category</label>
                           <select
                              value={profileForm.service}
                              onChange={e => setProfileForm({ ...profileForm, service: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                              {serviceCategories.map(cat => (
                                 <option key={cat} value={cat}>{cat}</option>
                              ))}
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Location</label>
                           <select
                              value={profileForm.location}
                              onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                           >
                              <option value="Blantyre">Blantyre</option>
                              <option value="Lilongwe">Lilongwe</option>
                              <option value="Mzuzu">Mzuzu</option>
                           </select>
                        </div>
                     </div>

                     {/* Portfolio Upload */}
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Portfolio Photos</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                           <Upload className="mx-auto text-slate-400 mb-2" size={32} />
                           <p className="text-slate-600 font-medium">Click to upload or drag and drop</p>
                           <p className="text-slate-400 text-sm">SVG, PNG, JPG or GIF (max. 3MB)</p>
                        </div>
                     </div>

                     <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                        <button
                           type="button"
                           onClick={() => setShowProfileModal(false)}
                           className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                           Cancel
                        </button>
                        <button
                           type="submit"
                           disabled={isSaving}
                           className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50"
                        >
                           {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
         {/* Calendar Modal */}
         {showCalendarModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
               <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-bold text-slate-900">Schedule</h2>
                     <button
                        onClick={() => setShowCalendarModal(false)}
                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                     >
                        <X size={24} />
                     </button>
                  </div>

                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-xl font-bold text-slate-800">
                        {currentCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                     </h3>
                     <div className="flex items-center gap-2">
                        <button
                           onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1)))}
                           className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                        >
                           <ChevronLeft size={20} />
                        </button>
                        <button
                           onClick={() => setCurrentCalendarDate(new Date())}
                           className="text-sm font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg"
                        >
                           Today
                        </button>
                        <button
                           onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1)))}
                           className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
                        >
                           <ChevronRight size={20} />
                        </button>
                     </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
                     {/* Weekday Headers */}
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                           {day}
                        </div>
                     ))}

                     {/* Days */}
                     {(() => {
                        const days = [];
                        const year = currentCalendarDate.getFullYear();
                        const month = currentCalendarDate.getMonth();

                        const firstDayOfMonth = new Date(year, month, 1).getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const daysInPrevMonth = new Date(year, month, 0).getDate();

                        // Previous month days
                        for (let i = 0; i < firstDayOfMonth; i++) {
                           const day = daysInPrevMonth - firstDayOfMonth + 1 + i;
                           days.push(
                              <div key={`prev-${day}`} className="bg-white p-2 min-h-[100px] bg-slate-50 text-slate-400 opacity-50">
                                 <span className="text-sm font-medium">{day}</span>
                              </div>
                           );
                        }

                        // Current month days
                        for (let day = 1; day <= daysInMonth; day++) {
                           const date = new Date(year, month, day);
                           const isToday = new Date().toDateString() === date.toDateString();

                           // Check for jobs on this day
                           const dayJobs = jobs.filter(job => {
                              // Very basic date matching for demo purposes
                              // In production, parse job.time properly
                              if (job.time.includes('Today') && isToday) return true;
                              // Approximate check for other dates
                              return false;
                           });

                           days.push(
                              <div key={`curr-${day}`} className={`bg-white p-2 min-h-[100px] hover:bg-slate-50 transition-colors ${isToday ? 'ring-1 ring-inset ring-indigo-500' : ''}`}>
                                 <div className="flex justify-between items-start">
                                    <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700'}`}>
                                       {day}
                                    </span>
                                 </div>
                                 <div className="mt-2 space-y-1">
                                    {dayJobs.map(job => (
                                       <div key={job.id} className="text-[10px] p-1 rounded bg-indigo-100 text-indigo-700 font-medium truncate">
                                          {job.title}
                                       </div>
                                    ))}
                                    {/* Mock indicator for demo density */}
                                    {day === 15 && <div className="text-[10px] p-1 rounded bg-emerald-100 text-emerald-700 font-medium truncate">Completed Job</div>}
                                 </div>
                              </div>
                           );
                        }

                        // Next month filler
                        const totalSlots = Math.ceil((days.length) / 7) * 7;
                        const remaining = totalSlots - days.length;
                        for (let i = 1; i <= remaining; i++) {
                           days.push(
                              <div key={`next-${i}`} className="bg-white p-2 min-h-[100px] bg-slate-50 text-slate-400 opacity-50">
                                 <span className="text-sm font-medium">{i}</span>
                              </div>
                           );
                        }

                        return days;
                     })()}
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};

