import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../app/hooks';
import * as logService from '../services/logs';
import { toast } from 'react-toastify';

interface LogEntry {
  timestamp: string;
  level: string;
  type: string;
  userId?: string;
  userEmail?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  productId?: string;
  operation?: string;
  oldQuantity?: number;
  newQuantity?: number;
  branchName?: string;
  message?: string;
}

const LogViewer: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [logType, setLogType] = useState('products');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await logService.getLogs(logType, date);
      setLogs(response.logs || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [logType, date]);

  useEffect(() => {
    if (user && (user.isAdmin || user.isMainBrunch)) {
      fetchLogs();
    }
  }, [fetchLogs, user]);

  if (!user || (!user.isAdmin && !user.isMainBrunch)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
        <p className="text-gray-500">Only Admins and Main Branch Managers can view logs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Activity Logs</h1>
          <p className="text-sm text-gray-500 italic">Audit trails for business operations</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <select 
            value={logType} 
            onChange={e => setLogType(e.target.value)}
            title="Select log type"
            aria-label="Filter logs by type"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="products">Product Operations</option>
            <option value="auth">Auth Events</option>
            <option value="api">API Traffic</option>
            <option value="errors">Error Logs</option>
          </select>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            title="Select log date"
            aria-label="Search logs by date"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          />
          <button 
            onClick={fetchLogs}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center border border-gray-100">
          <p className="text-gray-400">No log entries found for this type on {date}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User / Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status / Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{log.userEmail || 'System'}</div>
                      <div className="text-xs text-gray-400">{log.branchName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${log.operation === 'delete' ? 'bg-red-100 text-red-800' : 
                          log.operation === 'create' ? 'bg-green-100 text-green-800' : 
                          'bg-blue-100 text-blue-800'}`}>
                        {log.operation || log.method || 'EVENT'}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{log.endpoint || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.operation === 'quantity_change' ? (
                        <span className="font-mono">
                          {log.oldQuantity} → <span className="font-bold text-indigo-600">{log.newQuantity}</span>
                        </span>
                      ) : log.statusCode ? (
                        <span className={log.statusCode >= 400 ? 'text-red-600 font-bold' : 'text-green-600'}>
                          HTTP {log.statusCode}
                        </span>
                      ) : (
                        log.message || 'N/A'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;
