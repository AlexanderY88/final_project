import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { createProduct, updateProduct } from '../features/products/productsSlice';
import * as productService from '../services/products';
import { ProductFormData } from '../types/product';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';

const ProductForm: React.FC = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<ProductFormData>({
    title: '',
    subtitle: '',
    description: '',
    supplier: '',
    category: '',
    quantity: 0,
    state: '',
    country: user?.address?.country || '',
    city: user?.address?.city || '',
    street: user?.address?.street || '',
    houseNumber: user?.address?.houseNumber || 1,
    zip: user?.address?.zip || 10000,
    imageUrl: '',
    imageAlt: '',
    imageType: 'upload',
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
          state: product.branch_address.state || '',
          country: product.branch_address.country,
          city: product.branch_address.city,
          street: product.branch_address.street,
          houseNumber: product.branch_address.houseNumber,
          zip: product.branch_address.zip,
          imageUrl: product.image?.url || '',
          imageAlt: product.image?.alt || '',
          imageType: product.image?.imageType || 'upload',
        });
      }).catch(() => setError('Failed to load product data'));
    }
  }, [id, isEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
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
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError('');

    try {
      if (isEdit && id) {
        await dispatch(updateProduct({ id, data: form, image: imageFile || undefined })).unwrap();
        toast.success('Product updated successfully!');
      } else {
        await dispatch(createProduct({ data: form, image: imageFile || undefined })).unwrap();
        toast.success('Product created successfully!');
      }
      navigate('/products');
    } catch (err: any) {
      const errorMsg = typeof err === 'string' ? err : 'Failed to save product';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Edit Product' : 'Create New Product'}
      </h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
          <input
            id="subtitle"
            name="subtitle"
            value={form.subtitle}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
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
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <input
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
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
            <input
              id="imageFile"
              title="Upload product image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          ) : (
            <input
              name="imageUrl"
              value={form.imageUrl}
              onChange={handleChange}
              placeholder="https://example.com/image.jpg"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          )}

          <input
            name="imageAlt"
            value={form.imageAlt}
            onChange={handleChange}
            placeholder="Image description (alt text)"
            className="w-full mt-2 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Branch Address */}
        <div className="border-t pt-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Branch Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input id="country" name="country" value={form.country} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input id="city" name="city" value={form.city} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street *</label>
              <input id="street" name="street" value={form.street} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700 mb-1">House Number *</label>
              <input id="houseNumber" type="number" name="houseNumber" value={form.houseNumber} onChange={handleChange} required min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input id="state" name="state" value={form.state} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
              <input id="zip" type="number" name="zip" value={form.zip} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="border border-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showConfirm}
        title={isEdit ? 'Update Product' : 'Create Product'}
        message={`Are you sure you want to ${isEdit ? 'update' : 'create'} this product?`}
        onConfirm={handleConfirmSave}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default ProductForm;
