import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchAllUsers, deleteUser } from '../features/users/usersSlice';
import * as userService from '../services/users';
import { User } from '../types/auth';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';

import CreateUserModal from '../components/CreateUserModal';
const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { users, isLoading, error: reduxError } = useAppSelector(state => state.users);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [mainBranches, setMainBranches] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'main_branch' | 'user'>('all');
  const [cityFilter, setCityFilter] = useState('');

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchAllUsers({
          search: search.trim() || undefined,
          role: roleFilter === 'all' ? undefined : roleFilter,
          city: cityFilter.trim() || undefined,
        })
      );
    }, 350);

    return () => clearTimeout(timer);
  }, [dispatch, search, roleFilter, cityFilter]);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await dispatch(deleteUser(deleteId)).unwrap();
        toast.success('User deleted successfully');
      } catch (err: any) {
        toast.error(err || 'Failed to delete user');
      } finally {
        setDeleteId(null);
      }
    }
  };

  const getRoleLabel = (u: User) => {
    if (u.isAdmin) return 'Admin';
    if (u.isMainBranch) return 'Main Branch';
    return 'Child Branch';
  };

    useEffect(() => {
      const fetchMainBranches = async () => {
        try {
          const response = await userService.getAllUsers({ role: 'main_branch' });
          setMainBranches(response);
        } catch (error) {
          console.error('Failed to fetch main branches:', error);
        }
      };
      fetchMainBranches();
    }, []);

    const handleUserCreated = () => {
      dispatch(fetchAllUsers());
    };
  const getRoleColor = (u: User) => {
    if (u.isAdmin) return 'bg-purple-100 text-purple-700';
    if (u.isMainBranch) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setCityFilter('');
  };

  const adminCount = users.filter((u) => u.isAdmin).length;
  const mainBranchCount = users.filter((u) => u.isMainBranch && !u.isAdmin).length;
  const childBranchCount = users.filter((u) => !u.isMainBranch && !u.isAdmin).length;

  if (isLoading && users.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col justify-center items-center gap-4 py-10">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-600">Loading users...</p>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse" aria-label="Loading users table">
          <div className="px-5 py-3 bg-gray-50 border-b">
            <div className="h-4 w-40 bg-gray-200 rounded"></div>
          </div>
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="grid grid-cols-5 gap-4 px-5 py-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">All Users</h1>
          <p className="text-sm text-gray-500">{users.length} users match current filters</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
        >
          Create New User
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Admins</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{adminCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Main Branches</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{mainBranchCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Child Branches</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{childBranchCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search name or email</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. admin@company.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <select
              title="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'main_branch' | 'user')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="main_branch">Main Branch</option>
              <option value="user">Child Branch</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
            <input
              type="text"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              placeholder="e.g. Tel Aviv"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={clearFilters}
            className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            Clear filters
          </button>
        </div>
      </div>

      {reduxError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">{reduxError}</div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Name</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Email</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Role</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Created</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u._id} className="admin-users-row hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    {u.isAdmin ? (
                      <p className="font-medium text-gray-800">{u.name?.first} {u.name?.last}</p>
                    ) : (
                      <>
                        <p className="font-medium text-gray-800">Branch: {u.name?.first}</p>
                        <p className="text-xs text-gray-500">Manager: {u.name?.last}</p>
                      </>
                    )}
                    <p className="text-xs text-gray-400">{u.address?.city}, {u.address?.country}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(u)}`}>
                      {getRoleLabel(u)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/dashboard?userId=${u._id}&from=admin-users`)}
                        className="text-sm text-indigo-700 hover:text-indigo-900 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
                      >
                        Open Dashboard
                      </button>
                      <button
                        onClick={() => navigate(`/profile?userId=${u._id}&from=admin-users`)}
                        className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(u._id)}
                        className="text-sm text-red-600 hover:text-red-800 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No users found for current filters</p>
          <p className="text-gray-400 text-sm mt-2">Try clearing filters or verify seed data.</p>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete User"
        message="Are you sure you want to delete this user? All their products and data will be permanently removed."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
        <CreateUserModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onUserCreated={handleUserCreated}
          mainBranches={mainBranches}
        />
    </div>
  );
};

export default AdminUsers;
