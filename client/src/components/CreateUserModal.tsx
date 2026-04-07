import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as userService from '../services/users';
import { User } from '../types/auth';
import { createUserSchema, validateWithJoi } from '../utils/validation';

type UserRole = 'admin' | 'main_brunch' | 'user';

interface CreateUserFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  phone: string;
  city: string;
  country: string;
  street: string;
  houseNumber: string;
  zip: string;
  mainBrunchId: string;
}

const createInitialFormData = (): CreateUserFormData => ({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'main_brunch',
  phone: '',
  city: 'Tel Aviv',
  country: 'Israel',
  street: '',
  houseNumber: '',
  zip: '',
  mainBrunchId: '',
});

const getInputClass = (hasError: boolean) =>
  `w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
    hasError ? 'border-red-500' : 'border-gray-300'
  }`;

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
  mainBranches?: User[];
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
  mainBranches = [],
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserFormData>(createInitialFormData());

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(createInitialFormData());
      setErrors({});
    }
  }, [isOpen]);

  const validateForm = (): boolean => {
    const nextErrors = validateWithJoi(createUserSchema, {
      ...formData,
      houseNumber: Number(formData.houseNumber),
      zip: Number(formData.zip),
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const userData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone || '0000000000',
        city: formData.city,
        country: formData.country,
        street: formData.street.trim(),
        houseNumber: Number(formData.houseNumber),
        zip: Number(formData.zip),
        ...(formData.role === 'user' && formData.mainBrunchId && { mainBrunchId: formData.mainBrunchId }),
      };

      await userService.createUser(userData);
      toast.success('User created successfully');
      onUserCreated();
      onClose();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Failed to create user';
      toast.error(errorMsg);
      setErrors(prev => ({
        ...prev,
        submit: errorMsg,
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Create New User</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="e.g. John"
                className={getInputClass(!!errors.firstName)}
              />
              {errors.firstName && (
                <p className="text-red-600 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="e.g. Doe"
                className={getInputClass(!!errors.lastName)}
              />
              {errors.lastName && (
                <p className="text-red-600 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className={getInputClass(!!errors.email)}
              />
              {errors.email && (
                <p className="text-red-600 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Min 6 chars with uppercase, number, special char"
                className={getInputClass(!!errors.password)}
              />
              {errors.password && (
                <p className="text-red-600 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={getInputClass(!!errors.confirmPassword)}
              />
              {errors.confirmPassword && (
                <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Role */}
            <div className="md:col-span-2">
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="user">Child Branch</option>
                <option value="main_brunch">Main Branch</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Main Branch Selection (if role is user) */}
            {formData.role === 'user' && (
              <div className="md:col-span-2">
                <label htmlFor="mainBrunchId" className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Main Branch *
                </label>
                <select
                  id="mainBrunchId"
                  name="mainBrunchId"
                  value={formData.mainBrunchId}
                  onChange={handleChange}
                  className={getInputClass(!!errors.mainBrunchId)}
                >
                  <option value="">Select a main branch</option>
                  {mainBranches.map(branch => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name?.first} {branch.name?.last} ({branch.email})
                    </option>
                  ))}
                </select>
                {errors.mainBrunchId && (
                  <p className="text-red-600 text-xs mt-1">{errors.mainBrunchId}</p>
                )}
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="0500000000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Tel Aviv"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Israel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Street */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="street"
                className={getInputClass(!!errors.street)}
              />
              {errors.street && (
                <p className="text-red-600 text-xs mt-1">{errors.street}</p>
              )}
            </div>

            {/* House Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                House Number
              </label>
              <input
                type="number"
                name="houseNumber"
                value={formData.houseNumber}
                onChange={handleChange}
                min="1"
                placeholder="House number"
                className={getInputClass(!!errors.houseNumber)}
              />
              {errors.houseNumber && (
                <p className="text-red-600 text-xs mt-1">{errors.houseNumber}</p>
              )}
            </div>

            {/* ZIP Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="number"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                min="1"
                placeholder="ZIP code"
                className={getInputClass(!!errors.zip)}
              />
              {errors.zip && (
                <p className="text-red-600 text-xs mt-1">{errors.zip}</p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
