import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { getProfile } from '../features/auth/authSlice';
import * as userService from '../services/users';

const Profile: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  // Load user data into form
  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.name.first,
        lastName: user.name.last,
        middleName: user.name.middle || '',
        email: user.email,
        phone: user.phone || '',
        country: user.address.country,
        city: user.address.city,
        street: user.address.street,
        houseNumber: user.address.houseNumber,
        zip: user.address.zip,
        state: user.address.state || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      await userService.updateProfile(user._id, {
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
      setMessage('Profile updated successfully!');
      setEditing(false);
      dispatch(getProfile()); // Refresh user data in Redux
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const roleLabel = user.isAdmin ? 'Admin' : user.isMainBrunch ? 'Main Branch' : 'Branch User';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Profile</h1>
        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
          {roleLabel}
        </span>
      </div>

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
              Edit Profile
            </button>
          )}
        </div>

        {/* Meta Info */}
        <div className="mt-6 pt-4 border-t text-sm text-gray-400">
          <p>Member since: {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Profile;
