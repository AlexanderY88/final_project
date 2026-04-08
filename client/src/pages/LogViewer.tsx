import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  productTitle?: string;
  operation?: string;
  oldQuantity?: number;
  newQuantity?: number;
  branchName?: string;
  message?: string;
}

type DateRangePreset = 'last_day' | 'last_week' | 'last_half_year' | 'last_year' | 'custom';

const MAX_LOOKBACK_DAYS = 730;
const LOGS_PER_PAGE = 20;

function isProductChangeLog(log: LogEntry) {
  const operation = (log.operation || '').toLowerCase();
  const endpoint = (log.endpoint || '').toLowerCase();

  if (['create', 'update', 'delete', 'quantity_change', 'manual_update'].includes(operation)) {
    return true;
  }

  // Fallbacks for older/missing operation values.
  if (endpoint.includes('/quantity')) {
    return true;
  }

  if (typeof log.oldQuantity === 'number' || typeof log.newQuantity === 'number') {
    return true;
  }

  return false;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return formatDateInput(date);
}

function getPresetRange(preset: Exclude<DateRangePreset, 'custom'>) {
  const today = formatDateInput(new Date());

  switch (preset) {
    case 'last_day':
      return { dateFrom: today, dateTo: today };
    case 'last_week':
      return { dateFrom: getDateDaysAgo(6), dateTo: today };
    case 'last_half_year':
      return { dateFrom: getDateDaysAgo(182), dateTo: today };
    case 'last_year':
      return { dateFrom: getDateDaysAgo(364), dateTo: today };
    default:
      return { dateFrom: today, dateTo: today };
  }
}

function getLogBadgeClasses(log: LogEntry) {
  if (log.operation === 'delete') return 'bg-red-100 text-red-800';
  if (log.operation === 'create') return 'bg-green-100 text-green-800';
  return 'bg-blue-100 text-blue-800';
}

function renderProductDetails(log: LogEntry) {
  if (!log.productId && !log.productTitle) {
    return null;
  }

  return (
    <div className="space-y-1">
      {log.productTitle && <div className="text-sm font-medium text-gray-700">{log.productTitle}</div>}
      {log.productId && <div className="text-xs font-mono text-gray-400 break-all">ID: {log.productId}</div>}
    </div>
  );
}

const LogViewer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector(state => state.auth);
    const selectedUserId = searchParams.get('userId') || undefined;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [logType, setLogType] = useState('products_changes');
  const [rangePreset, setRangePreset] = useState<DateRangePreset>('last_day');
  const [startDate, setStartDate] = useState(formatDateInput(new Date()));
  const [endDate, setEndDate] = useState(formatDateInput(new Date()));
  const [currentPage, setCurrentPage] = useState(1);

  const today = formatDateInput(new Date());
  const minAllowedDate = getDateDaysAgo(MAX_LOOKBACK_DAYS);

  const activeDateRange = useMemo(() => {
    return rangePreset === 'custom'
      ? { dateFrom: startDate, dateTo: endDate }
      : getPresetRange(rangePreset);
  }, [endDate, rangePreset, startDate]);

  const visibleLogs = useMemo(() => {
    if (logType !== 'products_changes') {
      return logs;
    }

    return logs.filter(isProductChangeLog);
  }, [logType, logs]);

  const totalPages = Math.max(1, Math.ceil(visibleLogs.length / LOGS_PER_PAGE));

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
    return visibleLogs.slice(startIndex, startIndex + LOGS_PER_PAGE);
  }, [currentPage, visibleLogs]);

  const fetchLogs = React.useCallback(async () => {
    const { dateFrom, dateTo } = activeDateRange;
    const effectiveLogType = logType === 'products_changes' ? 'products' : logType;

    if (!dateFrom || !dateTo) {
      toast.error('Please select both start and end dates.');
      return;
    }

    if (dateFrom > dateTo) {
      toast.error('Start date cannot be later than end date.');
      return;
    }

    if (dateFrom < minAllowedDate) {
      toast.error('Custom history can only go back up to 2 years.');
      return;
    }

    setLoading(true);
    try {
      const response = await logService.searchLogsByRange({
        logType: effectiveLogType,
        dateFrom,
        dateTo,
        contextUserId: selectedUserId,
      });

      let nextLogs = Array.isArray(response.results) ? response.results : [];
      
      // Client-side deduplication for quantity_change logs
      const seenKeys = new Set();
      nextLogs = nextLogs.filter((log: LogEntry) => {
        if (log.operation === 'quantity_change') {
          const key = `${log.productId}|${log.oldQuantity}|${log.newQuantity}|${log.userId || 'system'}`;
          if (seenKeys.has(key)) {
            return false; // Skip duplicate
          }
          seenKeys.add(key);
        }
        return true;
      });
      
      nextLogs.sort((left: LogEntry, right: LogEntry) => {
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
      });
      setLogs(nextLogs);
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load logs');
      setLogs([]);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  }, [activeDateRange, logType, minAllowedDate, selectedUserId]);

  useEffect(() => {
    if (user && (user.isAdmin || user.isMainBrunch)) {
      fetchLogs();
    }
  }, [fetchLogs, user]);

  useEffect(() => {
    if (!user?.isAdmin && (logType === 'api' || logType === 'errors')) {
      setLogType('products_changes');
    }
  }, [logType, user?.isAdmin]);

  const handlePresetChange = (value: DateRangePreset) => {
    setRangePreset(value);

    if (value !== 'custom') {
      const range = getPresetRange(value);
      setStartDate(range.dateFrom);
      setEndDate(range.dateTo);
    }
  };

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
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            ← Back
          </button>
          <select 
            value={logType} 
            onChange={e => setLogType(e.target.value)}
            title="Select log type"
            aria-label="Filter logs by type"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="products_changes">Product Changes</option>
            <option value="auth">Auth Events</option>
            {user?.isAdmin && <option value="api">API Traffic</option>}
            {user?.isAdmin && <option value="errors">Error Logs</option>}
          </select>
          <select
            value={rangePreset}
            onChange={e => handlePresetChange(e.target.value as DateRangePreset)}
            title="Select date range"
            aria-label="Filter logs by date range"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="last_day">Last day</option>
            <option value="last_week">Last week</option>
            <option value="last_half_year">Last half year</option>
            <option value="last_year">Last year</option>
            <option value="custom">Choose dates</option>
          </select>
          {rangePreset === 'custom' && (
            <>
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600">
                <span className="whitespace-nowrap font-medium">From date</span>
                <input
                  type="date"
                  value={startDate}
                  min={minAllowedDate}
                  max={today}
                  onChange={e => setStartDate(e.target.value)}
                  title="Select start date"
                  aria-label="Select start date"
                  className="min-w-0 border-0 bg-transparent p-0 text-sm font-normal text-gray-700 focus:ring-0"
                />
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600">
                <span className="whitespace-nowrap font-medium">To date</span>
                <input
                  type="date"
                  value={endDate}
                  min={minAllowedDate}
                  max={today}
                  onChange={e => setEndDate(e.target.value)}
                  title="Select end date"
                  aria-label="Select end date"
                  className="min-w-0 border-0 bg-transparent p-0 text-sm font-normal text-gray-700 focus:ring-0"
                />
              </label>
            </>
          )}
          <button 
            onClick={fetchLogs}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center gap-4 py-12" aria-label="Loading logs">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-600">Loading logs...</p>
        </div>
      ) : visibleLogs.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center border border-gray-100">
          <p className="text-gray-400">
            No log entries found for this filter between {activeDateRange.dateFrom} and {activeDateRange.dateTo}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>
              Showing {paginatedLogs.length} of {visibleLogs.length} events (page {currentPage} of {totalPages})
            </p>
          </div>

          <div className="space-y-3 md:hidden">
            {paginatedLogs.map((log, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow border border-gray-100 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 break-all">{log.userEmail || 'System'}</p>
                    <p className="text-xs text-gray-400">{log.branchName || 'N/A'}</p>
                  </div>
                  <p className="text-xs text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLogBadgeClasses(log)}`}>
                    {log.operation || log.method || 'EVENT'}
                  </span>
                  <div className="text-right text-sm text-gray-500">
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
                  </div>
                </div>

                {log.endpoint && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">Endpoint</p>
                    <p className="text-xs text-gray-600 break-all">{log.endpoint}</p>
                  </div>
                )}

                {renderProductDetails(log) && (
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1">Product</p>
                    {renderProductDetails(log)}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-xl shadow overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User / Branch</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status / Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLogs.map((log, idx) => (
                    <tr key={idx} className="history-log-row hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{log.userEmail || 'System'}</div>
                        <div className="text-xs text-gray-400">{log.branchName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getLogBadgeClasses(log)}`}>
                            {log.operation || log.method || 'EVENT'}
                          </span>
                          <div className="text-xs text-gray-500 mt-1 break-all">{log.endpoint || ''}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-gray-700">
                        <div className="truncate">
                          {log.productTitle && log.productTitle !== log.productId ? (
                            <>
                              <div className="font-medium truncate">{log.productTitle}</div>
                            </>
                          ) : (
                            <span className="text-gray-400 truncate">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left text-sm text-gray-500">
                        <div>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition duration-150"
              >
                ← Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition duration-150 ${
                    page === currentPage
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition duration-150"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LogViewer;
