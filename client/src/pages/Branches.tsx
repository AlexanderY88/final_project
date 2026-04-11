import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchChildBranches, deleteUser } from '../features/users/usersSlice';
import * as userService from '../services/users';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
import { childBranchSchema, getFieldErrorWithJoi, getInputClassName, validateWithJoi } from '../utils/validation';

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
  const focusBranchId = searchParams.get('focusBranchId') || undefined;
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

  const branchValidationForm = {
    ...form,
    houseNumber: form.houseNumber === '' ? undefined : Number(form.houseNumber),
    zip: form.zip === '' ? '' : Number(form.zip),
    ...(mainBranchContextId ? { mainBrunchId: mainBranchContextId } : {}),
  };

  useEffect(() => {
    dispatch(fetchChildBranches(selectedUserId));
  }, [dispatch, selectedUserId]);

  useEffect(() => {
    if (!focusBranchId || branches.length === 0) return;

    const target = document.getElementById(`branch-card-${focusBranchId}`);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [branches, focusBranchId]);

  const handleFieldChange = (name: string, value: string) => {
    const nextForm = { ...form, [name]: value };
    setForm(nextForm);

    const normalized = {
      ...nextForm,
      houseNumber: nextForm.houseNumber === '' ? undefined : Number(nextForm.houseNumber),
      zip: nextForm.zip === '' ? '' : Number(nextForm.zip),
      ...(mainBranchContextId ? { mainBrunchId: mainBranchContextId } : {}),
    };

    const fieldError = getFieldErrorWithJoi(childBranchSchema, normalized, name);
    setValidationErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canCreateBranch) {
      toast.error('Open a specific main branch first, then create its child branch from this page.');
      return;
    }

    const nextErrors = validateWithJoi(childBranchSchema, branchValidationForm);
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstError = Object.values(nextErrors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }

    const normalizedForm = {
      ...form,
      email: String(form.email).trim().toLowerCase(),
      houseNumber: Number(form.houseNumber),
      zip: Number(form.zip || 10000),
      ...(mainBranchContextId ? { mainBrunchId: mainBranchContextId } : {}),
    };

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
      const backendError = err?.response?.data;
      const errorMsg =
        (typeof backendError === 'string' ? backendError : undefined) ||
        backendError?.message ||
        err?.message ||
        'Failed to create branch';
      toast.error(errorMsg);
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
            onClick={() => {
              if (isAdmin && selectedUserId) {
                navigate(`/dashboard?userId=${selectedUserId}&from=admin-users`);
                return;
              }
              navigate(-1);
            }}
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
        <form onSubmit={handleCreate} noValidate className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create a New Child Branch</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">Branch Name *</label>
              <input
                id="firstName"
                value={form.firstName}
                onChange={e => {
                  handleFieldChange('firstName', e.target.value);
                }}
                required
                className={getInputClassName(!!validationErrors.firstName, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="North Branch"
              />
              {validationErrors.firstName && <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Manager *</label>
              <input
                id="lastName"
                value={form.lastName}
                onChange={e => {
                  handleFieldChange('lastName', e.target.value);
                }}
                required
                className={getInputClassName(!!validationErrors.lastName, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="David Cohen"
              />
              {validationErrors.lastName && <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                id="email"
                type="text"
                inputMode="email"
                value={form.email}
                onChange={e => {
                  handleFieldChange('email', e.target.value);
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
                  handleFieldChange('password', e.target.value);
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
                  handleFieldChange('phone', e.target.value);
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
                  handleFieldChange('country', e.target.value);
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
                  handleFieldChange('city', e.target.value);
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
                  handleFieldChange('street', e.target.value);
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
                  handleFieldChange('houseNumber', e.target.value);
                }}
                required
                className={getInputClassName(!!validationErrors.houseNumber, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
                placeholder="10"
              />
              {validationErrors.houseNumber && <p className="mt-1 text-sm text-red-600">{validationErrors.houseNumber}</p>}
            </div>
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input
                id="zip"
                type="number"
                min="1"
                value={form.zip}
                onChange={e => {
                  handleFieldChange('zip', e.target.value);
                }}
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
              id={`branch-card-${branch._id}`}
              className={`bg-white rounded-xl shadow-md p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${focusBranchId === branch._id ? 'ring-2 ring-indigo-400 border border-indigo-200' : ''}`}
            >
              <div>
                <h3 className="font-semibold text-gray-800">
                  {branch.name?.first}
                </h3>
                {focusBranchId === branch._id && (
                  <p className="text-xs text-indigo-700 font-medium mt-1">Focused branch</p>
                )}
                <p className="text-sm text-gray-500">Manager: {branch.name?.last}</p>
                <p className="text-sm text-gray-500">{branch.email}</p>
                {branch.phone && <p className="text-sm text-gray-400">Phone: {branch.phone}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  {branch.address?.city}, {branch.address?.country} | Joined: {branch.createdAt ? new Date(branch.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!isAdmin && (
                  <button
                    onClick={() => navigate(`/products?userId=${branch._id}&from=branches-list`)}
                    className="text-sm text-green-700 hover:text-green-900 border border-green-200 px-4 py-1.5 rounded-lg hover:bg-green-50 transition"
                  >
                    View Branch Products
                  </button>
                )}
                {!isAdmin && (
                  <button
                    onClick={() => navigate(`/profile?userId=${branch._id}&from=branches-list`)}
                    className="text-sm text-amber-700 hover:text-amber-900 border border-amber-200 px-4 py-1.5 rounded-lg hover:bg-amber-50 transition"
                  >
                    Update Branch
                  </button>
                )}
                {isAdmin && selectedUserId && (
                  <button
                    onClick={() => navigate(`/dashboard?userId=${branch._id}&from=branches-list&mainBranchId=${selectedUserId}`)}
                    className="text-sm text-indigo-700 hover:text-indigo-900 border border-indigo-200 px-4 py-1.5 rounded-lg hover:bg-indigo-50 transition"
                  >
                    Open Branch
                  </button>
                )}
                {isAdmin && selectedUserId && (
                  <button
                    onClick={() => navigate(`/profile?userId=${branch._id}&from=branches-list&mainBranchId=${selectedUserId}`)}
                    className="text-sm text-amber-700 hover:text-amber-900 border border-amber-200 px-4 py-1.5 rounded-lg hover:bg-amber-50 transition"
                  >
                    Branch Details
                  </button>
                )}
                <button
                  onClick={() => handleDelete(branch._id)}
                  className="text-sm text-red-600 hover:text-red-800 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-50 transition"
                >
                  Delete
                </button>
              </div>
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
