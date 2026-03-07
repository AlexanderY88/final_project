import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { logout, getProfile } from '../features/auth/authSlice';

const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Fetch fresh user data when component mounts
    dispatch(getProfile());
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1>Dashboard</h1>
        <button 
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {user && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h2>Welcome, {user.firstName} {user.lastName}!</h2>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Member since:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      )}

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <h3>Your Full-Stack Project is Ready!</h3>
        <p>This dashboard demonstrates:</p>
        <ul>
          <li>✅ JWT Authentication</li>
          <li>✅ Redux State Management</li>
          <li>✅ TypeScript Integration</li>
          <li>✅ Protected Routes</li>
          <li>✅ API Communication</li>
        </ul>
        
        <p style={{ marginTop: '1rem', color: '#666' }}>
          You can now build upon this foundation to create your full-stack application!
        </p>
      </div>
    </div>
  );
};

export default Dashboard;