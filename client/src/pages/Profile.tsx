import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { getProfile } from '../features/auth/authSlice';
import * as userService from '../services/users';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
import { User } from '../types/auth';

const Profile: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAppSelector(state => state.auth);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loadingProfileUser, setLoadingProfileUser] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<'admin' | 'main_brunch' | 'user' | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);

  const selectedUserId = searchParams.get('userId');
  const from = searchParams.get('from');
  const isAdminEditingOtherUser = !!(user?.isAdmin && selectedUserId);
  const currentProfileUser = isAdminEditingOtherUser ? profileUser : user;

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    street: '',
    houseNumber: 0,
    zip: 0,
    state: '',
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!isAdminEditingOtherUser || !selectedUserId) {
      setProfileUser(null);
      setLoadingProfileUser(false);
      return;
    }

    let mounted = true;

    const loadUser = async () => {
      setLoadingProfileUser(true);
      try {
        const selectedUser = await userService.getById(selectedUserId);
        if (mounted) {
          setProfileUser(selectedUser);
        }
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to load selected user';
        if (mounted) {
          setError(errorMsg);
        }
        toast.error(errorMsg);
      } finally {
        if (mounted) {
          setLoadingProfileUser(false);
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [user, isAdminEditingOtherUser, selectedUserId]);

  // Load user data into form
  useEffect(() => {
    if (currentProfileUser) {
      setForm({
        firstName: currentProfileUser.name.first,
        lastName: currentProfileUser.name.last,
        middleName: currentProfileUser.name.middle || '',
        email: currentProfileUser.email,
        phone: currentProfileUser.phone || '',
        country: currentProfileUser.address.country,
        city: currentProfileUser.address.city,
        street: currentProfileUser.address.street,
        houseNumber: currentProfileUser.address.houseNumber,
        zip: currentProfileUser.address.zip,
        state: currentProfileUser.address.state || '',
      });
    }
  }, [currentProfileUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const getRoleValue = (u: User) => {
    if (u.isAdmin) return 'admin';
    if (u.isMainBrunch) return 'main_brunch';
    return 'user';
  };

  const handleConfirmRoleChange = async () => {
    if (!pendingRoleChange || !currentProfileUser) return;
    setRoleChanging(true);
    try {
      const updatedUser = await userService.updateProfile(currentProfileUser._id, {
        isAdmin: pendingRoleChange === 'admin',
        isMainBrunch: pendingRoleChange === 'main_brunch',
      });
      setProfileUser(updatedUser);
      toast.success('Role updated successfully');
    } catch (err: any) {
      toast.error('Failed to update role');
    } finally {
      setPendingRoleChange(null);
      setRoleChanging(false);
    }
  };

  const handleSave = () => {
    if (!currentProfileUser) return;
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    if (!currentProfileUser) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const updatedUser = await userService.updateProfile(currentProfileUser._id, {
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName,
        email: form.email,
        phone: form.phone,
        address: {
          state: form.state,
          country: form.country,
          city: form.city,
          street: form.street,
          houseNumber: Number(form.houseNumber),
          zip: Number(form.zip),
        },
      });
      toast.success('Profile updated successfully!');
      setMessage('Profile updated successfully!');
      setEditing(false);
      if (isAdminEditingOtherUser) {
        setProfileUser(updatedUser);
      } else {
        dispatch(getProfile());
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to update profile';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (!user || loadingProfileUser || !currentProfileUser) {
    return (
      <div className="min-h-[55vh] flex flex-col justify-center items-center gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-indigo-100"></div>
          <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
        </div>
        <p className="text-sm font-medium text-gray-600">Loading profile...</p>
      </div>
    );
  }

  const roleLabel = currentProfileUser.isAdmin ? 'Admin' : currentProfileUser.isMainBrunch ? 'Main Branch' : 'Branch User';
  const roleLabelMap: Record<string, string> = { admin: 'Admin', main_brunch: 'Main Branch', user: 'Child Branch' };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isAdminEditingOtherUser ? 'Update User' : 'My Profile'}
          </h1>
          {isAdminEditingOtherUser && (
            <p className="text-sm text-gray-500 mt-1">Editing {currentProfileUser.email}</p>
          )}
        </div>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
          {roleLabel}
        </span>
      </div>

      <ConfirmationModal
        isOpen={showConfirm}
        title={isAdminEditingOtherUser ? 'Update User' : 'Update Profile'}
        message={isAdminEditingOtherUser
          ? 'Are you sure you want to save the changes to this user?'
          : 'Are you sure you want to save the changes to your profile?'}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmationModal
        isOpen={!!pendingRoleChange}
        title="Change User Role"
        message={pendingRoleChange
          ? `Are you sure you want to change ${currentProfileUser.name.first}'s role to ${roleLabelMap[pendingRoleChange]}?`
          : ''}
        onConfirm={handleConfirmRoleChange}
        onCancel={() => setPendingRoleChange(null)}
      />

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Personal Info */}
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-600 mb-1">First Name</label>
            <input
              id="firstName"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              disabled={!editing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-600 mb-1">Last Name</label>
            <input
              id="lastName"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              disabled={!editing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="middleName" className="block text-sm font-medium text-gray-600 mb-1">Middle Name</label>
            <input
              id="middleName"
              name="middleName"
              value={form.middleName}
              onChange={handleChange}
              disabled={!editing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              disabled={!editing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
            <input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              disabled={!editing}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Address */}
        <h2 className="text-lg font-semibold text-gray-800 mt-6 mb-4">Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-600 mb-1">Country</label>
            <input id="country" name="country" value={form.country} onChange={handleChange} disabled={!editing} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-600 mb-1">City</label>
            <input id="city" name="city" value={form.city} onChange={handleChange} disabled={!editing} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="street" className="block text-sm font-medium text-gray-600 mb-1">Street</label>
            <input id="street" name="street" value={form.street} onChange={handleChange} disabled={!editing} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-600 mb-1">House Number</label>
            <input id="houseNumber" type="number" name="houseNumber" value={form.houseNumber} onChange={handleChange} disabled={!editing} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="state" className="block text-sm font-medium text-gray-600 mb-1">State</label>
            <input id="state" name="state" value={form.state} onChange={handleChange} disabled={!editing} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <div>
            <label htmlFor="zip" className="block text-sm font-medium text-gray-600 mb-1">ZIP Code</label>
            <input id="zip" type="number" name="zip" value={form.zip} onChange={handleChange} disabled={!editing} className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex gap-3">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="border border-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              {isAdminEditingOtherUser ? 'Edit User' : 'Edit Profile'}
            </button>
          )}

          {isAdminEditingOtherUser && (
            <button
              type="button"
              onClick={() => {
                if (from === 'admin-users' && selectedUserId) {
                  navigate(`/dashboard?userId=${selectedUserId}&from=admin-users`);
                  return;
                }

                navigate('/admin/users');
              }}
              className="border border-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 transition"
            >
              Back
            </button>
          )}
        </div>

        {/* Change Role — admin only */}
        {isAdminEditingOtherUser && (
          <div className="mt-6 pt-4 border-t">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Change Role</h2>
            <div className="flex items-center gap-4">
              <select
                title="Select new role"
                defaultValue={getRoleValue(currentProfileUser)}
                key={currentProfileUser._id}
                onChange={e => setPendingRoleChange(e.target.value as 'admin' | 'main_brunch' | 'user')}
                disabled={roleChanging}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="user">Child Branch</option>
                <option value="main_brunch">Main Branch</option>
                <option value="admin">Admin</option>
              </select>
              <span className="text-sm text-gray-500">{roleChanging ? 'Updating...' : 'Select a role to change it'}</span>
            </div>
          </div>
        )}

        {/* Meta Info */}
        <div className="mt-6 pt-4 border-t text-sm text-gray-400">
          <p>Member since: {new Date(currentProfileUser.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
