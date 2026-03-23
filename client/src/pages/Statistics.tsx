import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../app/hooks';
import { getBranchStatisticsOverview, getMyBranchStatistics } from '../services/products';
import { toast } from 'react-toastify';

interface StatEntry {
  _id: {
    branchName: string;
    branchId: string;
    year: number;
    month: number;
    yearMonth: string;
    date?: string;
  };
  uniqueProducts: string[];
  totalQuantityChanges: number;
  totalChangesCount: number;
  totalIncrease: number;
  totalDecrease: number;
}

const Statistics: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [stats, setStats] = useState<StatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('last_6_months');

  const fetchStats = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let data;
      // Admin and Main Branch use the overview endpoint
      if (user.isAdmin || user.isMainBrunch) {
        data = await getBranchStatisticsOverview({ timePeriod });
      } else {
        // Child branch uses the my-branch endpoint
        data = await getMyBranchStatistics({ timePeriod });
      }
      
      // The API returns { message, requestedBy, statistics }
      setStats(data.statistics || []);
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      toast.error(error.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [timePeriod, user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!user) return null;

  // Group stats by branch for the UI
  const groupedStats = stats.reduce((acc: { [key: string]: StatEntry[] }, curr) => {
    const branchName = curr._id.branchName || 'Unknown Branch';
    if (!acc[branchName]) acc[branchName] = [];
    acc[branchName].push(curr);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Statistics</h1>
          <p className="mt-1 text-sm text-gray-500">
            {user.isAdmin 
              ? 'Viewing statistics for all system branches' 
              : user.isMainBrunch 
                ? 'Viewing statistics for your branch and connected child branches' 
                : 'Viewing your branch inventory activity'}
          </p>
        </div>

        <div className="mt-4 md:mt-0">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            title="Select time period for statistics"
            aria-label="Select statistics time range"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
          >
            <option value="current_month">Current Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="last_year">Last Year</option>
            <option value="current_year">Current Year</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : stats.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900">No data found</h3>
          <p className="text-gray-500 italic mt-2">There is no recorded inventory activity for the selected time period.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {Object.entries(groupedStats).map(([branchName, branchData]) => (
            <div key={branchName} className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-100">
              <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                <h2 className="text-lg leading-6 font-semibold text-indigo-700">
                   🏢 {branchName}
                </h2>
              </div>
              
              <div className="px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Summary Cards */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Total Actions</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {branchData.reduce((sum, s) => sum + s.totalChangesCount, 0)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider">Total Increase</p>
                    <p className="text-2xl font-bold text-green-900">
                      +{branchData.reduce((sum, s) => sum + s.totalIncrease, 0)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <p className="text-xs text-red-600 font-bold uppercase tracking-wider">Total Decrease</p>
                    <p className="text-2xl font-bold text-red-900">
                      -{branchData.reduce((sum, s) => sum + s.totalDecrease, 0)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Unique Items</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {new Set(branchData.flatMap(s => s.uniqueProducts)).size}
                    </p>
                  </div>
                </div>

                <div className="mt-8 border-t border-gray-100 pt-6">
                   <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-widest">Activity History</h3>
                   <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Increases</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Decreases</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Change</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ops Count</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {branchData.sort((a,b) => b._id.yearMonth.localeCompare(a._id.yearMonth)).map((s, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{s._id.yearMonth}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">+{s.totalIncrease}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">-{s.totalDecrease}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                               <span className={s.totalQuantityChanges >= 0 ? 'text-green-700' : 'text-red-700'}>
                                  {s.totalQuantityChanges > 0 ? '+' : ''}{s.totalQuantityChanges}
                               </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.totalChangesCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Statistics;
