import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector } from './app/hooks';
import Header from './components/Header';
import Footer from './components/Footer';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import SessionExpired from './pages/SessionExpired';
import Dashboard from './pages/DashboardPage';
import Products from './pages/Products';
import ProductForm from './pages/ProductForm';
import ProductDetails from './pages/ProductDetails';
import LogViewer from './pages/LogViewer';
import Profile from './pages/Profile';
import Branches from './pages/Branches';
import AdminUsers from './pages/AdminUsers';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import Mailbox from './pages/Mailbox';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const defaultAuthenticatedRoute = user?.isAdmin ? '/admin/users' : '/dashboard';

  return (
    <Router>
      <div className="App min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={isAuthenticated ? <Navigate to={defaultAuthenticatedRoute} replace /> : <Login />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to={defaultAuthenticatedRoute} replace /> : <Register />} />
            <Route path="/session-expired" element={<SessionExpired />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/contact" element={<ContactUs />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><LogViewer /></ProtectedRoute>} />
            <Route path="/products/new" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
            <Route path="/products/:id" element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
            <Route path="/products/:id/edit" element={<ProtectedRoute><ProductForm /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/branches" element={<ProtectedRoute><Branches /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/mailbox" element={<ProtectedRoute><Mailbox /></ProtectedRoute>} />

            {/* Default & catch-all */}
            <Route path="/" element={<Navigate to={isAuthenticated ? defaultAuthenticatedRoute : '/login'} replace />} />
            <Route path="*" element={<Navigate to={isAuthenticated ? defaultAuthenticatedRoute : '/login'} replace />} />
          </Routes>
        </main>
        <Footer />
        <ToastContainer position="bottom-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
