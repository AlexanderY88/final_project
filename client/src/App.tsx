import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './app/hooks';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
            } 
          />
          <Route 
            path="/register" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />
            } 
          />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route 
            path="/" 
            element={
              <Navigate 
                to={isAuthenticated ? "/dashboard" : "/login"} 
                replace 
              />
            } 
          />
          
          {/* Catch all route */}
          <Route 
            path="*" 
            element={
              <Navigate 
                to={isAuthenticated ? "/dashboard" : "/login"} 
                replace 
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
