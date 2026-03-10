import React, { useState, useEffect } from 'react';
import * as userService from '../services/users';
import { User } from '../types/auth';

const Branches: React.FC = () => {
  const [branches, setBranches] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await userService.getChildBranches();
      setBranches(data.childBranches || []);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setBranches([]);
      } else {
        setError(err.response?.data?.message || 'Failed to load branches');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      await userService.createChildBranch(form);
      setMessage('Child branch created successfully!');
      setForm({ firstName: '', lastName: '', email: '', password: '' });
      setShowForm(false);
      loadBranches();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this branch?')) return;
    try {
      await userService.deleteUser(id);
      setBranches(prev => prev.filter(b => b._id !== id));
      setMessage('Branch deleted successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete branch');
    }
  };

  if (loading) {
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

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      {/* Create Branch Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create a New Child Branch</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                value={form.firstName}
                onChange={e => setForm({ ...form, firstName: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                value={form.lastName}
                onChange={e => setForm({ ...form, lastName: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
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
                  {branch.name.first} {branch.name.last}
                </h3>
                <p className="text-sm text-gray-500">{branch.email}</p>
                {branch.phone && <p className="text-sm text-gray-400">Phone: {branch.phone}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {branch.address?.city}, {branch.address?.country} | Joined: {new Date(branch.createdAt).toLocaleDateString()}
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
    </div>
  );
};

export default Branches;
