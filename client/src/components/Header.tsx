import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../app/hooks';
import { logout } from '../features/auth/authSlice';

const Header: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    setMobileMenuOpen(false);
  };

  const closeMobile = () => setMobileMenuOpen(false);

  const isActive = (path: string) => location.pathname === path;

  const isAdmin = user?.isAdmin;
  const isMainBranch = user?.isMainBrunch;

  const userName = user?.name?.first || 'User';

  const navLinkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition duration-200 ${
      isActive(path)
        ? 'bg-indigo-700 text-white'
        : 'text-gray-300 hover:bg-indigo-500 hover:text-white'
    }`;

  const mobileNavLinkClass = (path: string) =>
    `block px-3 py-2 rounded-md text-base font-medium transition duration-200 ${
      isActive(path)
        ? 'bg-indigo-700 text-white'
        : 'text-gray-300 hover:bg-indigo-500 hover:text-white'
    }`;

  return (
    <nav className="bg-indigo-600 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center space-x-2 hover:opacity-90 transition duration-200">
              <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <span className="text-white text-xl font-bold tracking-wide">StockManager</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {/* Always visible */}
            <Link to="/about" className={navLinkClass('/about')}>About Us</Link>
            <Link to="/contact" className={navLinkClass('/contact')}>Contact Us</Link>

            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={navLinkClass('/dashboard')}>Dashboard</Link>
                <Link to="/products" className={navLinkClass('/products')}>Products</Link>

                {(isMainBranch || isAdmin) && (
                  <Link to="/branches" className={navLinkClass('/branches')}>Branches</Link>
                )}

                {isAdmin && (
                  <Link to="/admin/users" className={navLinkClass('/admin/users')}>All Users</Link>
                )}

                <Link to="/profile" className={navLinkClass('/profile')}>My Profile</Link>

                {/* Divider + user info + logout */}
                <div className="flex items-center ml-3 pl-3 border-l border-indigo-400 space-x-3">
                  <span className="text-indigo-200 text-sm">
                    Hello, {userName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200 focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-indigo-600"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              /* Guest links */
              <>
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                    isActive('/login')
                      ? 'bg-white text-indigo-600'
                      : 'text-white border border-white hover:bg-white hover:text-indigo-600'
                  }`}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className={`px-4 py-2 rounded-md text-sm font-medium transition duration-200 ${
                    isActive('/register')
                      ? 'bg-indigo-800 text-white'
                      : 'bg-white text-indigo-600 hover:bg-indigo-50'
                  }`}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-white rounded-md p-2"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-indigo-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {/* Always visible */}
            <Link to="/about" className={mobileNavLinkClass('/about')} onClick={closeMobile}>About Us</Link>
            <Link to="/contact" className={mobileNavLinkClass('/contact')} onClick={closeMobile}>Contact Us</Link>

            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className={mobileNavLinkClass('/dashboard')} onClick={closeMobile}>Dashboard</Link>
                <Link to="/products" className={mobileNavLinkClass('/products')} onClick={closeMobile}>Products</Link>

                {(isMainBranch || isAdmin) && (
                  <Link to="/branches" className={mobileNavLinkClass('/branches')} onClick={closeMobile}>Branches</Link>
                )}

                {isAdmin && (
                  <Link to="/admin/users" className={mobileNavLinkClass('/admin/users')} onClick={closeMobile}>All Users</Link>
                )}

                <Link to="/profile" className={mobileNavLinkClass('/profile')} onClick={closeMobile}>My Profile</Link>

                <div className="border-t border-indigo-500 mt-2 pt-2">
                  <span className="block px-3 py-2 text-indigo-200 text-sm">
                    Hello, {userName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-300 hover:bg-red-600 hover:text-white transition duration-200"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className={mobileNavLinkClass('/login')} onClick={closeMobile}>Login</Link>
                <Link to="/register" className={mobileNavLinkClass('/register')} onClick={closeMobile}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;
