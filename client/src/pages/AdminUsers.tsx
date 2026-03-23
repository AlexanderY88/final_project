import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchAllUsers, deleteUser } from '../features/users/usersSlice';
import * as userService from '../services/users';
import { User } from '../types/auth';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';

const AdminUsers: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users, isLoading, error: reduxError } = useAppSelector(state => state.users);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchAllUsers());
  }, [dispatch]);

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

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      const isAdmin = newRole === 'admin';
      const isMainBrunch = newRole === 'main_brunch';
      await userService.updateProfile(id, { isAdmin, isMainBrunch });
      toast.success('Role updated successfully');
      dispatch(fetchAllUsers());
    } catch (err: any) {
      toast.error('Failed to update role');
    }
  };

  const getRoleLabel = (u: User) => {
    if (u.isAdmin) return 'Admin';
    if (u.isMainBrunch) return 'Main Branch';
    return 'Child Branch';
  };

  const getRoleColor = (u: User) => {
    if (u.isAdmin) return 'bg-purple-100 text-purple-700';
    if (u.isMainBrunch) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  const getRoleValue = (u: User) => {
    if (u.isAdmin) return 'admin';
    if (u.isMainBrunch) return 'main_brunch';
    return 'user';
  };

  if (isLoading && users.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">All Users</h1>
        <p className="text-sm text-gray-500">{users.length} users total</p>
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
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Change Role</th>
                <th className="text-left px-5 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-800">{u.name?.first} {u.name?.last}</p>
                    <p className="text-xs text-gray-400">{u.address?.city}, {u.address?.country}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(u)}`}>
                      {getRoleLabel(u)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      title="Change role"
                      value={getRoleValue(u)}
                      onChange={e => handleRoleChange(u._id, e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="user">Child Branch</option>
                      <option value="main_brunch">Main Branch</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDelete(u._id)}
                      className="text-sm text-red-600 hover:text-red-800 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No users found</p>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete User"
        message="Are you sure you want to delete this user? All their products and data will be permanently removed."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default AdminUsers;
