import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchChildBranches, deleteUser } from '../features/users/usersSlice';
import * as userService from '../services/users';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
import { childBranchSchema, getInputClassName, validateWithJoi } from '../utils/validation';

const Branches: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { childBranches: branches, isLoading, error: reduxError } = useAppSelector(state => state.users);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const selectedUserId = searchParams.get('userId') || undefined;
  const isAdmin = !!currentUser?.isAdmin;
  const mainBranchContextId = isAdmin ? selectedUserId : currentUser?.isMainBrunch ? currentUser._id : undefined;
  const canCreateBranch = !isAdmin || !!mainBranchContextId;

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    country: 'Israel',
    city: '',
    street: '',
    houseNumber: '',
    zip: '',
  });

  useEffect(() => {
    dispatch(fetchChildBranches(selectedUserId));
  }, [dispatch, selectedUserId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateBranch) {
      toast.error('Open a specific main branch first, then create its child branch from this page.');
      return;
    }

    const normalizedForm = {
      ...form,
      houseNumber: Number(form.houseNumber),
      zip: Number(form.zip),
      ...(mainBranchContextId ? { mainBrunchId: mainBranchContextId } : {}),
    };
    const nextErrors = validateWithJoi(childBranchSchema, normalizedForm);
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setCreating(true);

    try {
      await userService.createChildBranch(normalizedForm);
      toast.success('Child branch created successfully!');
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        country: 'Israel',
        city: '',
        street: '',
        houseNumber: '',
        zip: '',
      });
      setShowForm(false);
      dispatch(fetchChildBranches(selectedUserId));
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

  const clearFieldError = (field: string) => {
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  if (isLoading && branches.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col justify-center items-center gap-4 py-10">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-600">Loading branches...</p>
        </div>

        <div className="space-y-3" aria-label="Loading branches list">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white rounded-xl shadow-md p-5 animate-pulse">
              <div className="h-4 w-52 bg-gray-300 rounded mb-2"></div>
              <div className="h-3.5 w-64 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-40 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Child Branches</h1>
            <p className="text-sm text-gray-500">{branches.length} branches</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!canCreateBranch}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {showForm ? 'Cancel' : '+ New Branch'}
        </button>
      </div>

      {reduxError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">{reduxError}</div>
      )}

      {isAdmin && !mainBranchContextId && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg mb-4">
          Choose a main branch first, then open its Branches page to create a child branch automatically under it.
        </div>
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
                onChange={e => {
                  setForm({ ...form, firstName: e.target.value });
                  clearFieldError('firstName');
                }}
                required
                className={getInputClassName(!!validationErrors.firstName, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="John"
              />
              {validationErrors.firstName && <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={e => {
                  setForm({ ...form, lastName: e.target.value });
                  clearFieldError('lastName');
                }}
                required
                className={getInputClassName(!!validationErrors.lastName, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="Doe"
              />
              {validationErrors.lastName && <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={e => {
                  setForm({ ...form, email: e.target.value });
                  clearFieldError('email');
                }}
                required
                className={getInputClassName(!!validationErrors.email, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="john@example.com"
              />
              {validationErrors.email && <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={e => {
                  setForm({ ...form, password: e.target.value });
                  clearFieldError('password');
                }}
                required
                minLength={6}
                className={getInputClassName(!!validationErrors.password, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="Min 6 characters"
              />
              {validationErrors.password && <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                id="phone"
                value={form.phone}
                onChange={e => {
                  setForm({ ...form, phone: e.target.value });
                  clearFieldError('phone');
                }}
                required
                className={getInputClassName(!!validationErrors.phone, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="0501234567"
              />
              {validationErrors.phone && <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>}
            </div>
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input
                id="country"
                value={form.country}
                onChange={e => {
                  setForm({ ...form, country: e.target.value });
                  clearFieldError('country');
                }}
                required
                className={getInputClassName(!!validationErrors.country, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="Israel"
              />
              {validationErrors.country && <p className="mt-1 text-sm text-red-600">{validationErrors.country}</p>}
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                id="city"
                value={form.city}
                onChange={e => {
                  setForm({ ...form, city: e.target.value });
                  clearFieldError('city');
                }}
                required
                className={getInputClassName(!!validationErrors.city, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="Tel Aviv"
              />
              {validationErrors.city && <p className="mt-1 text-sm text-red-600">{validationErrors.city}</p>}
            </div>
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street *</label>
              <input
                id="street"
                value={form.street}
                onChange={e => {
                  setForm({ ...form, street: e.target.value });
                  clearFieldError('street');
                }}
                required
                className={getInputClassName(!!validationErrors.street, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="Herzl"
              />
              {validationErrors.street && <p className="mt-1 text-sm text-red-600">{validationErrors.street}</p>}
            </div>
            <div>
              <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 mb-1">House Number *</label>
              <input
                id="houseNumber"
                type="number"
                min="1"
                value={form.houseNumber}
                onChange={e => {
                  setForm({ ...form, houseNumber: e.target.value });
                  clearFieldError('houseNumber');
                }}
                required
                className={getInputClassName(!!validationErrors.houseNumber, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="10"
              />
              {validationErrors.houseNumber && <p className="mt-1 text-sm text-red-600">{validationErrors.houseNumber}</p>}
            </div>
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
              <input
                id="zip"
                type="number"
                min="1"
                value={form.zip}
                onChange={e => {
                  setForm({ ...form, zip: e.target.value });
                  clearFieldError('zip');
                }}
                required
                className={getInputClassName(!!validationErrors.zip, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="6100000"
              />
              {validationErrors.zip && <p className="mt-1 text-sm text-red-600">{validationErrors.zip}</p>}
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
