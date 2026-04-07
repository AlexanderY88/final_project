import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchProducts, deleteProduct, updateQuantity } from '../features/products/productsSlice';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
import { Product } from '../types/product';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

type QuantityModalMode = 'add' | 'subtract' | 'update';

interface QuantityModalState {
  productId: string;
  currentQty: number;
  title: string;
  mode: QuantityModalMode;
}

const getAdminContextParams = (selectedUserId?: string) =>
  selectedUserId ? `?userId=${selectedUserId}&from=admin-users` : '';

const getProductImageUrl = (product: Product) => {
  if (!product.image) return null;

  if (product.image.imageType === 'url' && product.image.url) {
    return product.image.url;
  }

  const filename = product.image.filename ||
    (typeof product.image.path === 'string'
      ? product.image.path.replace(/\\/g, '/').split('/').pop()
      : null);

  if (!filename) return null;
  return `${API_BASE_URL}/api/images/products/${encodeURIComponent(filename)}`;
};

const getQuantityModalTitle = (mode: QuantityModalMode) => {
  if (mode === 'add') return 'Add Quantity';
  if (mode === 'subtract') return 'Subtract Quantity';
  return 'Update Quantity';
};

const getQuantityModalMessage = (modal: QuantityModalState) => {
  if (modal.mode === 'add') {
    return `How many units do you want to add to ${modal.title}?`;
  }

  if (modal.mode === 'subtract') {
    return `How many units do you want to subtract from ${modal.title}?`;
  }

  return `What is the correct quantity for ${modal.title}? The current quantity is ${modal.currentQty}.`;
};

const getValidatedQuantityValue = (input: string, modal: QuantityModalState) => {
  const normalizedInput = input.trim();
  const numericValue = Number(normalizedInput);

  if (!normalizedInput || !Number.isInteger(numericValue) || numericValue < 0) {
    return { error: 'Please enter a valid whole number' };
  }

  if ((modal.mode === 'add' || modal.mode === 'subtract') && numericValue === 0) {
    return { error: 'Please enter a quantity greater than 0' };
  }

  if (modal.mode === 'subtract' && numericValue > modal.currentQty) {
    return { error: `Cannot subtract ${numericValue}. Current quantity is ${modal.currentQty}.` };
  }

  return { value: numericValue };
};

const calculateNextQuantity = (modal: QuantityModalState, value: number) => {
  if (modal.mode === 'add') return modal.currentQty + value;
  if (modal.mode === 'subtract') return Math.max(0, modal.currentQty - value);
  return value;
};

const Products: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { products, totalPages, totalProducts, isLoading, error } = useAppSelector(state => state.products);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quantityModal, setQuantityModal] = useState<QuantityModalState | null>(null);
  const [quantityInput, setQuantityInput] = useState('');

  const selectedUserId = searchParams.get('userId') || undefined;
  const adminContextParams = getAdminContextParams(selectedUserId);

  useEffect(() => {
    dispatch(fetchProducts({ page, limit: 12, userId: selectedUserId }));
  }, [dispatch, page, selectedUserId]);

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
      try {
        await dispatch(deleteProduct(deleteId)).unwrap();
        toast.success('Product deleted successfully');
      } catch (err: any) {
        toast.error(err || 'Failed to delete product');
      } finally {
        setDeleteId(null);
      }
    }
  };

  const openQuantityModal = (productId: string, currentQty: number, title: string, mode: QuantityModalMode) => {
    setQuantityModal({ productId, currentQty, title, mode });
    setQuantityInput('');
  };

  const closeQuantityModal = () => {
    setQuantityModal(null);
    setQuantityInput('');
  };

  const handleQuantityModalConfirm = async () => {
    if (!quantityModal) return;

    const validated = getValidatedQuantityValue(quantityInput, quantityModal);
    if (validated.error) {
      toast.error(validated.error);
      return;
    }

    const nextQuantity = calculateNextQuantity(quantityModal, validated.value as number);

    try {
      await dispatch(updateQuantity({ id: quantityModal.productId, quantity: nextQuantity })).unwrap();
      toast.success(`Quantity updated to ${nextQuantity}`);
      closeQuantityModal();
    } catch (err: any) {
      toast.error(err || 'Failed to update quantity');
    }
  };

  const filtered = products.filter(p =>
    p.product.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading && products.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col justify-center items-center gap-4 py-10">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-indigo-100"></div>
            <div className="absolute inset-0 h-14 w-14 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin"></div>
          </div>
          <p className="text-sm font-medium text-gray-600">Loading products...</p>
          <div className="flex items-center gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.2s]"></span>
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.1s]"></span>
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-bounce"></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Loading product cards">
          {[1, 2, 3, 4, 5, 6].map((card) => (
            <div key={card} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4 space-y-3">
                <div className="h-5 w-2/3 bg-gray-300 rounded"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                <div className="h-3.5 w-full bg-gray-200 rounded"></div>
                <div className="h-3.5 w-5/6 bg-gray-200 rounded"></div>
                <div className="flex gap-2 pt-2">
                  <div className="h-7 w-20 bg-gray-200 rounded-full"></div>
                  <div className="h-7 w-20 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
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
            <h1 className="text-2xl font-bold text-gray-800">Products</h1>
            <p className="text-sm text-gray-500">{totalProducts} total products</p>
          </div>
        </div>
        <Link
          to={`/products/new${adminContextParams}`}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          + New Product
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, category, or supplier..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => {
          const imageUrl = getProductImageUrl(product);

          return (
          <div key={product._id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition flex flex-col h-full">
            {/* Image */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.image?.alt || product.product.title}
                className="w-full h-48 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            <div className="p-5 flex-1 flex flex-col">
              {/* Title & Description - Fixed Height Section */}
              <div className="min-h-[120px] mb-3">
                <h3 className="text-lg font-semibold text-gray-800 line-clamp-2">{product.product.title}</h3>
                {product.product.subtitle && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{product.product.subtitle}</p>
                )}
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.product.description}</p>
              </div>

              {/* Tags */}
              <div className="mt-2 flex flex-wrap gap-2 mb-4">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{product.category}</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{product.supplier}</span>
              </div>

              {/* Quantity Controls */}
              <div className="mt-auto">
                <div className="text-lg font-bold text-gray-800 mb-3">Qty: {product.quantity}</div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'add')}
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition text-sm font-medium"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'subtract')}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    Sub
                  </button>
                  <button
                    onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'update')}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* Branch Info */}
              <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-400">
                <p>Branch: {product.branch_address.city}, {product.branch_address.country}</p>
                <p>By: {product.createdBy?.username || 'Unknown'} ({product.createdBy?.role})</p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Link
                  to={`/products/${product._id}${adminContextParams}`}
                  className="text-center text-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition font-medium"
                >
                  Details
                </Link>
                <Link
                  to={`/products/${product._id}/edit${adminContextParams}`}
                  className="text-center text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-2 rounded-lg hover:bg-yellow-100 transition font-medium"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(product._id)}
                  className="text-sm bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 transition font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No products found</p>
          <Link to={`/products/new${adminContextParams}`} className="text-indigo-600 hover:underline mt-2 inline-block">
            Create your first product
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {quantityModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="quantity-modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeQuantityModal}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="quantity-modal-title">
                  {getQuantityModalTitle(quantityModal.mode)}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">{getQuantityModalMessage(quantityModal)}</p>
                </div>
                <div className="mt-4">
                  <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    id="quantity-input"
                    type="number"
                    min="0"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={quantityModal.mode === 'update' ? 'Enter the correct quantity' : 'Enter quantity'}
                  />
                </div>
                {quantityModal.mode !== 'update' && (
                  <p className="mt-2 text-xs text-gray-400">Current quantity: {quantityModal.currentQty}</p>
                )}
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleQuantityModalConfirm}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeQuantityModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
