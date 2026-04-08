import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { createProduct, updateProduct } from '../features/products/productsSlice';
import * as productService from '../services/products';
import * as userService from '../services/users';
import { ProductFormData } from '../types/product';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
import { getFieldErrorWithJoi, getInputClassName, productFormSchema, validateWithJoi } from '../utils/validation';

const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
const LEGACY_EMPTY_ALT_VALUES = new Set(['no image uploaded']);

const sanitizeImageAlt = (value?: string) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  return LEGACY_EMPTY_ALT_VALUES.has(trimmed.toLowerCase()) ? '' : trimmed;
};

const ProductForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const selectedUserId = searchParams.get('userId') || undefined;
  const source = searchParams.get('from') || undefined;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const getReturnProductsPath = () => {
    const params = new URLSearchParams();
    if (selectedUserId) params.set('userId', selectedUserId);
    if (source) params.set('from', source);

    const query = params.toString();
    return query ? `/products?${query}` : '/products';
  };

  const [form, setForm] = useState<ProductFormData>({
    title: '',
    subtitle: '',
    description: '',
    supplier: '',
    category: '',
    quantity: 0,
    imageUrl: '',
    imageAlt: '',
    imageType: 'upload',
    contextUserId: selectedUserId,
  });

  // Load product data when editing
  useEffect(() => {
    if (isEdit && id) {
      productService.getById(id).then(product => {
        setForm({
          title: product.product.title,
          subtitle: product.product.subtitle || '',
          description: product.product.description,
          supplier: product.supplier,
          category: product.category,
          quantity: product.quantity,
          imageUrl: product.image?.url || '',
          imageAlt: sanitizeImageAlt(product.image?.alt),
          imageType: product.image?.imageType || 'upload',
          contextUserId: selectedUserId,
        });
      }).catch(() => setError('Failed to load product data'));
    }
  }, [id, isEdit, selectedUserId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;

    if (file && file.size > MAX_IMAGE_FILE_SIZE) {
      setImageFile(null);
      setImagePreview(null);
      e.target.value = '';
      toast.error('Image file is too large. Maximum allowed source file size is 10MB before compression.');
      return;
    }

    setImageFile(file);
    if (file && LEGACY_EMPTY_ALT_VALUES.has((form.imageAlt || '').trim().toLowerCase())) {
      setForm((prev) => ({ ...prev, imageAlt: '' }));
    }
    if (validationErrors.imageUrl) {
      setValidationErrors((prev) => ({ ...prev, imageUrl: '' }));
    }
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const nextForm = {
      ...form,
      [name]: name === 'imageAlt' ? sanitizeImageAlt(value) : value,
    };

    if (name === 'imageUrl' && value.trim() && LEGACY_EMPTY_ALT_VALUES.has((form.imageAlt || '').trim().toLowerCase())) {
      nextForm.imageAlt = '';
    }

    setForm(nextForm);

    const formForValidation = {
      ...nextForm,
      quantity: Number(nextForm.quantity),
      imageUrl: nextForm.imageType === 'url' ? (nextForm.imageUrl || '').trim() : '',
    };

    const fieldError = getFieldErrorWithJoi(productFormSchema, formForValidation, name);
    setValidationErrors((prev) => ({ ...prev, [name]: fieldError }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formForValidation = {
      ...form,
      quantity: Number(form.quantity),
      imageUrl: form.imageType === 'url' ? (form.imageUrl || '').trim() : '',
    };

    const nextErrors = validateWithJoi(productFormSchema, formForValidation);
    const hasImageInput = Boolean(imageFile) || (form.imageType === 'url' && (form.imageUrl || '').trim().length > 0);
    if (hasImageInput && !(form.imageAlt || '').trim()) {
      nextErrors.imageAlt = 'Image description is required when an image is provided.';
    }
    setValidationErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setShowConfirm(true);
  };

  const liveValidationPayload = useMemo(() => ({
    ...form,
    quantity: Number(form.quantity),
    imageUrl: form.imageType === 'url' ? (form.imageUrl || '').trim() : '',
  }), [form]);

  const isSubmitDisabled = useMemo(() => {
    const nextErrors = validateWithJoi(productFormSchema, liveValidationPayload);
    const hasImageInput = Boolean(imageFile) || (form.imageType === 'url' && (form.imageUrl || '').trim().length > 0);
    if (hasImageInput && !(form.imageAlt || '').trim()) {
      nextErrors.imageAlt = 'Image description is required when an image is provided.';
    }
    return loading || Object.keys(nextErrors).length > 0;
  }, [form.imageAlt, form.imageType, form.imageUrl, imageFile, liveValidationPayload, loading]);

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError('');

    let legacyAddress = user?.address;
    if (selectedUserId) {
      try {
        const selectedUser = await userService.getById(selectedUserId);
        if (selectedUser?.address) {
          legacyAddress = selectedUser.address;
        }
      } catch {
        // Fallback to logged-in user address.
      }
    }

    const safeLegacyAddress = {
      country: legacyAddress?.country || 'Israel',
      city: legacyAddress?.city || 'Tel Aviv',
      street: legacyAddress?.street || 'Default',
      houseNumber: legacyAddress?.houseNumber || 1,
      zip: legacyAddress?.zip || 10000,
      state: legacyAddress?.state || '',
    };

    const normalizedForm = {
      ...form,
      subtitle: (form.subtitle || '').trim() || undefined,
      imageUrl: form.imageType === 'url' ? ((form.imageUrl || '').trim() || undefined) : undefined,
      imageAlt: (form.imageAlt || '').trim() || undefined,
      contextUserId: selectedUserId,
      country: safeLegacyAddress.country,
      city: safeLegacyAddress.city,
      street: safeLegacyAddress.street,
      houseNumber: safeLegacyAddress.houseNumber,
      zip: safeLegacyAddress.zip,
      state: safeLegacyAddress.state,
    };

    try {
      if (isEdit && id) {
        await dispatch(updateProduct({ id, data: normalizedForm, image: imageFile || undefined })).unwrap();
        toast.success('Product updated successfully!');
      } else {
        await dispatch(createProduct({ data: normalizedForm, image: imageFile || undefined })).unwrap();
        toast.success('Product created successfully!');
      }
      // Replace history entry so browser Back does not reopen create/edit form.
      navigate(getReturnProductsPath(), { replace: true });
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to save product';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirm(false);
    navigate(getReturnProductsPath());
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Edit Product' : 'Create New Product'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md p-6 space-y-5">
        {/* Product Info */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            minLength={2}
            placeholder="Enter product title (required field)"
            className={getInputClassName(!!validationErrors.title, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
          />
          {validationErrors.title && <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>}
        </div>

        <div>
          <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
          <input
            id="subtitle"
            name="subtitle"
            value={form.subtitle}
            onChange={handleChange}
            maxLength={256}
            className={getInputClassName(!!validationErrors.subtitle, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
          />
          {validationErrors.subtitle && <p className="mt-1 text-sm text-red-600">{validationErrors.subtitle}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            required
            minLength={10}
            maxLength={516}
            rows={5}
            placeholder="Enter product description (required field)"
            className={getInputClassName(!!validationErrors.description, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none overflow-y-auto')}
          />
          {validationErrors.description && <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
            <input
              id="supplier"
              name="supplier"
              value={form.supplier}
              onChange={handleChange}
              required
              minLength={1}
              maxLength={50}
              placeholder="Enter supplier name (required field)"
              className={getInputClassName(!!validationErrors.supplier, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
            />
            {validationErrors.supplier && <p className="mt-1 text-sm text-red-600">{validationErrors.supplier}</p>}
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <input
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              minLength={1}
              maxLength={50}
              placeholder="Enter product category (required field)"
              className={getInputClassName(!!validationErrors.category, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
            />
            {validationErrors.category && <p className="mt-1 text-sm text-red-600">{validationErrors.category}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input
            id="quantity"
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            min={0}
            step={1}
            className={getInputClassName(!!validationErrors.quantity, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
          />
          {validationErrors.quantity && <p className="mt-1 text-sm text-red-600">{validationErrors.quantity}</p>}
        </div>

        {/* Image Section */}
        <div className="border-t pt-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
          
          {(imagePreview || (form.imageType === 'url' && form.imageUrl)) && (
            <div className="mb-4 relative w-full h-48 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={form.imageType === 'upload' ? imagePreview! : form.imageUrl} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
            </div>
          )}

          <div className="flex gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="imageType"
                value="upload"
                checked={form.imageType === 'upload'}
                onChange={handleChange}
              />
              <span className="text-sm">Upload File</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="imageType"
                value="url"
                checked={form.imageType === 'url'}
                onChange={handleChange}
              />
              <span className="text-sm">Image URL</span>
            </label>
          </div>

          {form.imageType === 'upload' ? (
            <div>
              <input
                id="imageFile"
                title="Upload product image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <p className="mt-2 text-xs text-gray-500">
                Allowed formats: PNG, JPG, JPEG, WebP. Maximum source file size: 10MB.
              </p>
            </div>
          ) : (
            <input
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className={getInputClassName(!!validationErrors.imageUrl, 'w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
            />
          )}
          {validationErrors.imageUrl && <p className="mt-1 text-sm text-red-600">{validationErrors.imageUrl}</p>}

          <input
            name="imageAlt"
            value={form.imageAlt}
            onChange={handleChange}
            placeholder="Image description (required when image is added)"
            maxLength={100}
            className={getInputClassName(!!validationErrors.imageAlt, 'w-full mt-2 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent')}
          />
          {validationErrors.imageAlt && <p className="mt-1 text-sm text-red-600">{validationErrors.imageAlt}</p>}
          <p className="mt-2 text-xs text-gray-500">
            Image description is required when adding an image (file upload or URL), and can be up to 100 characters.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => setShowCancelConfirm(true)}
            className="border border-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">{error}</div>
        )}
      </form>

      <ConfirmationModal
        isOpen={showConfirm}
        title={isEdit ? 'Update Product' : 'Create Product'}
        message={`Are you sure you want to ${isEdit ? 'update' : 'create'} this product?`}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />

      <ConfirmationModal
        isOpen={showCancelConfirm}
        title="Cancel Changes"
        message="Are you sure you want to cancel? Unsaved changes will be lost."
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
};

export default ProductForm;
