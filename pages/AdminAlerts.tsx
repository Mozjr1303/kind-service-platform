import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, Filter, Search, Bell } from 'lucide-react';

type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';

interface Alert {
    id: number;
    title: string;
    message: string;
    severity: AlertSeverity;
    timestamp: string;
    isRead: boolean;
}

const mockAlerts: Alert[] = [
    {
        id: 1,
        title: 'Pending Provider Approvals',
        message: '5 new service providers are awaiting account approval.',
        severity: 'warning',
        timestamp: '10 mins ago',
        isRead: false
    },
    {
        id: 2,
        title: 'High Server Load',
        message: 'Server CPU usage has exceeded 85% for the last 15 minutes.',
        severity: 'critical',
        timestamp: '1 hour ago',
        isRead: false
    },
    {
        id: 3,
        title: 'System Maintenance Scheduled',
        message: 'Routine maintenance is scheduled for Sunday at 2:00 AM UTC.',
        severity: 'info',
        timestamp: '3 hours ago',
        isRead: true
    },
    {
        id: 4,
        title: 'Payment Gateway Issue Resolved',
        message: 'The connectivity issue with the payment provider has been resolved.',
        severity: 'success',
        timestamp: '5 hours ago',
        isRead: true
    },
    {
        id: 5,
        title: 'New Client Registration Spike',
        message: 'Unusual number of new client registrations detected from IP block 192.168.x.x.',
        severity: 'warning',
        timestamp: '1 day ago',
        isRead: true
    },
];

export const AdminAlerts: React.FC = () => {
    const [filter, setFilter] = useState('all');
    const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

    const getSeverityStyles = (severity: AlertSeverity) => {
        switch (severity) {
            case 'critical': return 'bg-rose-50 border-rose-100 text-rose-800';
            case 'warning': return 'bg-amber-50 border-amber-100 text-amber-800';
            case 'success': return 'bg-emerald-50 border-emerald-100 text-emerald-800';
            case 'info': return 'bg-blue-50 border-blue-100 text-blue-800';
            default: return 'bg-slate-50 border-slate-100 text-slate-800';
        }
    };

    const getSeverityIcon = (severity: AlertSeverity) => {
        switch (severity) {
            case 'critical': return <XCircle className="w-5 h-5 text-rose-600" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-600" />;
            case 'info': return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !alert.isRead;
        return alert.severity === filter;
    });

    const markAsRead = (id: number) => {
        setAlerts(alerts.map(a => a.id === id ? { ...a, isRead: true } : a));
    };

    const deleteAlert = (id: number) => {
        setAlerts(alerts.filter(a => a.id !== id));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">System Alerts</h3>
                <button
                    onClick={() => setAlerts(alerts.map(a => ({ ...a, isRead: true })))}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    Mark all as read
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className="lg:col-span-1 space-y-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${filter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        All Alerts
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${filter === 'unread' ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        Unread
                    </button>
                    <div className="pt-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-4">Severity</div>
                    <button
                        onClick={() => setFilter('critical')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${filter === 'critical' ? 'bg-rose-50 text-rose-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        Critical
                    </button>
                    <button
                        onClick={() => setFilter('warning')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${filter === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        Warning
                    </button>
                    <button
                        onClick={() => setFilter('info')}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${filter === 'info' ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                        Info
                    </button>
                </div>

                {/* Alerts List */}
                <div className="lg:col-span-3 space-y-4">
                    {filteredAlerts.length > 0 ? (
                        filteredAlerts.map(alert => (
                            <div
                                key={alert.id}
                                className={`p-4 rounded-xl border flex gap-4 ${getSeverityStyles(alert.severity)} ${!alert.isRead ? 'shadow-sm ring-1 ring-inset ring-black/5' : 'opacity-75'}`}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {getSeverityIcon(alert.severity)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className="text-sm font-bold flex items-center gap-2">
                                                {alert.title}
                                                {!alert.isRead && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                                            </h4>
                                            <p className="text-sm mt-1 opacity-90">{alert.message}</p>
                                            <p className="text-xs mt-2 opacity-75">{alert.timestamp}</p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            {!alert.isRead && (
                                                <button
                                                    onClick={() => markAsRead(alert.id)}
                                                    className="text-xs font-medium hover:underline opacity-75 hover:opacity-100"
                                                >
                                                    Mark read
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteAlert(alert.id)}
                                                className="text-xs font-medium hover:underline opacity-75 hover:opacity-100 text-rose-700"
                                            >
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 text-center">
                            <Bell className="w-12 h-12 text-slate-200 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900">No alerts found</h3>
                            <p className="text-sm text-slate-500">You're all caught up! No alerts match your current filter.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
