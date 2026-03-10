import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { getProfile } from '../features/auth/authSlice';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const role = user.isAdmin ? 'Admin' : user.isMainBrunch ? 'Main Branch' : 'Branch User';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user.name.first}!</h1>
        <p className="mt-1 text-indigo-100">
          {role} &bull; {user.email}
        </p>
      </div>

      {/* Quick Actions */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Link to="/products" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition text-center group">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition">Products</h3>
          <p className="text-sm text-gray-500 mt-1">Manage inventory & stock</p>
        </Link>

        <Link to="/profile" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition text-center group">
          <div className="text-4xl mb-3">👤</div>
          <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition">My Profile</h3>
          <p className="text-sm text-gray-500 mt-1">Update your information</p>
        </Link>

        {(user.isMainBrunch || user.isAdmin) && (
          <Link to="/branches" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition text-center group">
            <div className="text-4xl mb-3">🏢</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition">Branches</h3>
            <p className="text-sm text-gray-500 mt-1">Manage child branches</p>
          </Link>
        )}

        {user.isAdmin && (
          <Link to="/admin/users" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition text-center group">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 transition">All Users</h3>
            <p className="text-sm text-gray-500 mt-1">Admin user management</p>
          </Link>
        )}
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Name: </span>
            <span className="text-gray-800">{user.name.first} {user.name.last}</span>
          </div>
          <div>
            <span className="text-gray-500">Email: </span>
            <span className="text-gray-800">{user.email}</span>
          </div>
          <div>
            <span className="text-gray-500">Phone: </span>
            <span className="text-gray-800">{user.phone || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-500">Location: </span>
            <span className="text-gray-800">{user.address?.city}, {user.address?.country}</span>
          </div>
          <div>
            <span className="text-gray-500">Role: </span>
            <span className="text-gray-800 font-medium">{role}</span>
          </div>
          <div>
            <span className="text-gray-500">Member since: </span>
            <span className="text-gray-800">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;