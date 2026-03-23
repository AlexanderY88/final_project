import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchChildBranches, deleteUser } from '../features/users/usersSlice';
import * as userService from '../services/users';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';

const Branches: React.FC = () => {
  const dispatch = useAppDispatch();
  const { childBranches: branches, isLoading, error: reduxError } = useAppSelector(state => state.users);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    dispatch(fetchChildBranches());
  }, [dispatch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      await userService.createChildBranch(form);
      toast.success('Child branch created successfully!');
      setForm({ firstName: '', lastName: '', email: '', password: '' });
      setShowForm(false);
      dispatch(fetchChildBranches());
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await dispatch(deleteUser(deleteId)).unwrap();
        toast.success('Branch deleted successfully');
      } catch (err: any) {
        toast.error(err || 'Failed to delete branch');
      } finally {
        setDeleteId(null);
      }
    }
  };

  if (isLoading && branches.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Child Branches</h1>
          <p className="text-sm text-gray-500">{branches.length} branches</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          {showForm ? 'Cancel' : '+ New Branch'}
        </button>
      </div>

      {reduxError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">{reduxError}</div>
      )}

      {/* Create Branch Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create a New Child Branch</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                id="firstName"
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Min 6 characters"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium"
          >
            {creating ? 'Creating...' : 'Create Branch'}
          </button>
        </form>
      )}

      {/* Branches List */}
      {branches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-md">
          <p className="text-gray-500 text-lg">No child branches yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first child branch above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map(branch => (
            <div
              key={branch._id}
              className="bg-white rounded-xl shadow-md p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
            >
              <div>
                <h3 className="font-semibold text-gray-800">
                  {branch.name?.first} {branch.name?.last}
                </h3>
                <p className="text-sm text-gray-500">{branch.email}</p>
                {branch.phone && <p className="text-sm text-gray-400">Phone: {branch.phone}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {branch.address?.city}, {branch.address?.country} | Joined: {branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <button
                onClick={() => handleDelete(branch._id)}
                className="text-sm text-red-600 hover:text-red-800 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 transition"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete Branch"
        message="Are you sure you want to delete this branch? All their inventory will be removed."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

export default Branches;
