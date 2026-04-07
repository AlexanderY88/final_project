import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as productService from '../services/products';
import { Product } from '../types/product';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

const ProductDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setError('Missing product ID');
      setLoading(false);
      return;
    }

    productService.getById(id)
      .then((response) => {
        setProduct(response);
      })
      .catch(() => {
        setError('Failed to load product details');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const getImageUrl = (currentProduct: Product) => {
    if (!currentProduct.image) return null;

    if (currentProduct.image.imageType === 'url' && currentProduct.image.url) {
      return currentProduct.image.url;
    }

    const filename = currentProduct.image.filename ||
      (typeof currentProduct.image.path === 'string'
        ? currentProduct.image.path.replace(/\\/g, '/').split('/').pop()
        : null);

    if (!filename) return null;
    return `${API_BASE_URL}/api/images/products/${encodeURIComponent(filename)}`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col justify-center items-center gap-4 py-12">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          {error || 'Product not found'}
        </div>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const imageUrl = getImageUrl(product);
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="border border-gray-300 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Product Details</h1>
            <p className="text-sm text-gray-500">Read-only product information</p>
          </div>
        </div>

        <Link
          to={`/products/${product._id}/edit`}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          Edit Product
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Product Image</div>
            {imageUrl ? (
              <div className="w-full h-64 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                <img src={imageUrl} alt={product.image?.alt || product.product.title} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 text-sm">
                No image available
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Product Info</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Title</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.product.title}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Subtitle</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.product.subtitle || '-'}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-sm font-medium text-gray-700 mb-1">Description</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 whitespace-pre-wrap min-h-[96px]">{product.product.description}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Supplier</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.supplier}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Category</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.category}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Quantity</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 font-semibold">{product.quantity}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Image Alt Text</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.image?.alt || '-'}</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Branch Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Country</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.branch_address.country}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">City</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.branch_address.city}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Street</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.branch_address.street}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">House Number</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.branch_address.houseNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">State</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.branch_address.state || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">ZIP Code</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.branch_address.zip}</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Meta</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Created By</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.createdBy?.username || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Role</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{product.createdBy?.role || '-'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Created At</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{new Date(product.createdAt).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Updated At</div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800">{new Date(product.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;