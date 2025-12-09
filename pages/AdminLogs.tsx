import React, { useState } from 'react';
import { Search, Filter, MoreHorizontal } from 'lucide-react';

const mockLogs = [
    { id: 1, timestamp: '2024-10-24 14:31', action: 'Update User Profile', user: 'admin@kind.com', status: 'Success', detail: 'Updated profile details for user #123' },
    { id: 2, timestamp: '2024-10-24 14:35', action: 'Approve Provider', user: 'admin@kind.com', status: 'Success', detail: 'Approved provider #45' },
    { id: 3, timestamp: '2024-10-24 14:40', action: 'Login Attempt', user: 'unknown@ip.addr', status: 'Failed', detail: 'Invalid password attempt' },
    { id: 4, timestamp: '2024-10-24 14:42', action: 'Delete Job', user: 'provider@test.com', status: 'Success', detail: 'Deleted job listing "Plumbing Fix"' },
    { id: 5, timestamp: '2024-10-24 15:00', action: 'System Backup', user: 'System', status: 'Success', detail: 'Automated daily backup completed' },
    { id: 6, timestamp: '2024-10-24 15:15', action: 'Update Settings', user: 'admin@kind.com', status: 'Success', detail: 'Changed email notification settings' },
    { id: 7, timestamp: '2024-10-24 15:30', action: 'New Registration', user: 'newuser@gmail.com', status: 'Success', detail: 'User registered via email' },
    { id: 8, timestamp: '2024-10-24 16:00', action: 'Database Optimization', user: 'System', status: 'Warning', detail: 'High latency detected during index rebuild' },
];

export const AdminLogs: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('All');

    const filteredLogs = mockLogs.filter(log =>
        (filter === 'All' || log.status === filter) &&
        (log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.detail.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">System Logs</h3>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Activity Log</h3>
                        <p className="text-sm text-slate-500 mt-1">Audit trail of system activities and user actions</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Success">Success</option>
                            <option value="Failed">Failed</option>
                            <option value="Warning">Warning</option>
                        </select>
                        <button className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100">
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{log.action}</td>
                                        <td className="px-6 py-4 text-slate-600">{log.user}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${log.status === 'Success' ? 'bg-emerald-50 text-emerald-700' :
                                                    log.status === 'Failed' ? 'bg-red-50 text-red-700' :
                                                        'bg-amber-50 text-amber-700'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'Success' ? 'bg-emerald-500' :
                                                        log.status === 'Failed' ? 'bg-red-500' :
                                                            'bg-amber-500'
                                                    }`}></span>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.detail}>
                                            {log.detail}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-slate-400 hover:text-slate-600">
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No logs found matching your criteria
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
