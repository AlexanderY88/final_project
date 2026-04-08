import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { register, clearError } from '../features/auth/authSlice';
import { RegisterData } from '../types/auth';
import { getFieldErrorWithJoi, getInputClassName, registerSchema, validateWithJoi } from '../utils/validation';

const Register: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const [userData, setUserData] = useState<RegisterData>({
    email: '',
    password: '',
    passwordConfirm: '',
    firstName: '',
    lastName: '',
    role: 'main_brunch',
    phone: '',
    country: 'Israel',
    city: '',
    street: '',
    houseNumber: '',
    zip: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextUserData = {
      ...userData,
      [name]: value,
    };

    setUserData(nextUserData);

    const fieldError = getFieldErrorWithJoi(registerSchema, nextUserData as RegisterData & { role: string }, name);
    setValidationErrors((prev) => ({
      ...prev,
      [name]: fieldError,
    }));
  };

  const clearFieldError = (field: string) => {
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const hasValidationErrors = Object.keys(
    validateWithJoi(registerSchema, userData as RegisterData & { role: string })
  ).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validateWithJoi(registerSchema, userData as RegisterData & { role: string });
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    dispatch(clearError());
    // Send only necessary fields to server (exclude passwordConfirm)
    const { passwordConfirm, ...dataToSend } = userData;
    dispatch(register(dataToSend));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-sm text-gray-600">Join us today and get started</p>
          </div>


          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Company Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={userData.firstName}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={getInputClassName(!!validationErrors.firstName, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                  placeholder="Your Company"
                />
                {validationErrors.firstName && <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>}
              </div>

              {/* Manager Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Manager Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={userData.lastName}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  className={getInputClassName(!!validationErrors.lastName, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                  placeholder="Manager Name"
                />
                {validationErrors.lastName && <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={userData.email}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                className={getInputClassName(!!validationErrors.email, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                placeholder="john.doe@example.com"
              />
              {validationErrors.email && <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={userData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                disabled={isLoading}
                className={getInputClassName(!!validationErrors.password, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                placeholder="At least 6 characters"
              />
              {validationErrors.password && <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>}
              <p className="mt-1 text-xs text-gray-500">Must include uppercase, lowercase, digit, and special character</p>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password *
              </label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={userData.passwordConfirm}
                onChange={handleInputChange}
                onFocus={() => clearFieldError('passwordConfirm')}
                required
                disabled={isLoading}
                className={getInputClassName(!!validationErrors.passwordConfirm, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                placeholder="Confirm your password"
              />
              {validationErrors.passwordConfirm && <p className="mt-1 text-sm text-red-600">{validationErrors.passwordConfirm}</p>}
            </div>

            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={userData.phone}
                onChange={handleInputChange}
                onFocus={() => clearFieldError('phone')}
                required
                disabled={isLoading}
                className={getInputClassName(!!validationErrors.phone, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                placeholder="0501234567"
              />
              {validationErrors.phone && <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>}
            </div>

            {/* Address Fields */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Address Information</h3>
              
              {/* Country and City Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={userData.country}
                    onChange={handleInputChange}
                    onFocus={() => clearFieldError('country')}
                    required
                    disabled={isLoading}
                    className={getInputClassName(!!validationErrors.country, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                    placeholder="Israel"
                  />
                  {validationErrors.country && <p className="mt-1 text-sm text-red-600">{validationErrors.country}</p>}
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={userData.city}
                    onChange={handleInputChange}
                    onFocus={() => clearFieldError('city')}
                    required
                    disabled={isLoading}
                    className={getInputClassName(!!validationErrors.city, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                    placeholder="Tel Aviv"
                  />
                  {validationErrors.city && <p className="mt-1 text-sm text-red-600">{validationErrors.city}</p>}
                </div>
              </div>

              {/* Street and House Number Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-2">
                    Street *
                  </label>
                  <input
                    type="text"
                    id="street"
                    name="street"
                    value={userData.street}
                    onChange={handleInputChange}
                    onFocus={() => clearFieldError('street')}
                    required
                    disabled={isLoading}
                    className={getInputClassName(!!validationErrors.street, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                    placeholder="Main Street"
                  />
                  {validationErrors.street && <p className="mt-1 text-sm text-red-600">{validationErrors.street}</p>}
                </div>

                <div>
                  <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    House Number *
                  </label>
                  <input
                    type="number"
                    id="houseNumber"
                    name="houseNumber"
                    value={userData.houseNumber}
                    onChange={handleInputChange}
                    onFocus={() => clearFieldError('houseNumber')}
                    min="1"
                    required
                    disabled={isLoading}
                    className={getInputClassName(!!validationErrors.houseNumber, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                    placeholder="10"
                  />
                  {validationErrors.houseNumber && <p className="mt-1 text-sm text-red-600">{validationErrors.houseNumber}</p>}
                </div>
              </div>

              {/* ZIP Code */}
              <div className="mb-4">
                <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="number"
                  id="zip"
                  name="zip"
                  value={userData.zip}
                  onChange={handleInputChange}
                  onFocus={() => clearFieldError('zip')}
                  min="1"
                  disabled={isLoading}
                  className={getInputClassName(!!validationErrors.zip, 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed')}
                  placeholder="6100000"
                />
                {validationErrors.zip && <p className="mt-1 text-sm text-red-600">{validationErrors.zip}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || hasValidationErrors}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Error Message - Below Button */}
            {error && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 mt-4">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a 
                href="/login" 
                className="font-medium text-emerald-600 hover:text-emerald-500 transition duration-200"
              >
                Sign in here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;