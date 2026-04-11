import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchProducts, deleteProduct, updateQuantity } from '../features/products/productsSlice';
import { fetchChildBranches } from '../features/users/usersSlice';
import * as userService from '../services/users';
import { toast } from 'react-toastify';
import ConfirmationModal from '../components/ConfirmationModal';
import { Product } from '../types/product';
import { User } from '../types/auth';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, '')
  .replace(/\/$/, '');

type QuantityModalMode = 'add' | 'subtract' | 'update';
type ProductsViewMode = 'cards' | 'table';

interface QuantityModalState {
  productId: string;
  currentQty: number;
  title: string;
  mode: QuantityModalMode;
}

const getContextParams = (selectedUserId?: string, source?: string) => {
  if (!selectedUserId) return '';
  const params = new URLSearchParams({ userId: selectedUserId });
  if (source) params.set('from', source);
  return `?${params.toString()}`;
};

const getCreateContextParams = (viewUserId?: string, contextUserId?: string, source?: string) => {
  const params = new URLSearchParams();
  if (viewUserId) params.set('userId', viewUserId);
  if (contextUserId) params.set('contextUserId', contextUserId);
  if (source) params.set('from', source);
  const query = params.toString();
  return query ? `?${query}` : '';
};

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

const shortenDescription = (description: string) =>
  description.length > 50 ? `${description.slice(0, 50)}...` : description;

const Products: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAppSelector(state => state.auth.user);
  const { products, totalPages, totalProducts, isLoading, error } = useAppSelector(state => state.products);
  const { childBranches } = useAppSelector(state => state.users);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [quantityModal, setQuantityModal] = useState<QuantityModalState | null>(null);
  const [quantityInput, setQuantityInput] = useState('');
  const [viewMode, setViewMode] = useState<ProductsViewMode>('cards');

  const selectedUserId = searchParams.get('userId') || undefined;
  const selectedMainBranchId = searchParams.get('mainBranchId') || undefined;
  const selectedScope = searchParams.get('scope') || undefined;
  const source = searchParams.get('from') || undefined;
  const isAdminUser = !!currentUser?.isAdmin;
  const isMainBranchUser = !isAdminUser && !!currentUser?.isMainBrunch;
  const isAdminAllBranchesSelected = isAdminUser && selectedScope === 'all';
  const isAllBranchesSelected = isMainBranchUser && selectedScope === 'all';
  const [adminContextBranch, setAdminContextBranch] = useState<User | null>(null);
  const [adminNetworkMainBranch, setAdminNetworkMainBranch] = useState<User | null>(null);

  const effectiveSelectedUserId = isAdminUser
    ? (isAdminAllBranchesSelected
      ? (selectedMainBranchId || adminNetworkMainBranch?._id || selectedUserId)
      : selectedUserId)
    : isMainBranchUser
    ? (isAllBranchesSelected ? undefined : (selectedUserId || currentUser?._id))
    : selectedUserId;

  const effectiveCreateContextUserId = isMainBranchUser
    ? (isAllBranchesSelected ? (currentUser?._id || undefined) : effectiveSelectedUserId)
    : effectiveSelectedUserId;

  const contextParams = getContextParams(effectiveSelectedUserId, source);
  const createContextParams = getCreateContextParams(effectiveSelectedUserId, effectiveCreateContextUserId, source);

  useEffect(() => {
    if (!isMainBranchUser || !currentUser?._id) return;
    dispatch(fetchChildBranches());
  }, [dispatch, isMainBranchUser, currentUser?._id]);

  useEffect(() => {
    if (!isAdminUser || !selectedUserId) {
      setAdminContextBranch(null);
      setAdminNetworkMainBranch(null);
      return;
    }

    let active = true;

    const loadAdminBranchNetwork = async () => {
      try {
        const selectedBranch = await userService.getById(selectedUserId);
        if (!active) return;

        setAdminContextBranch(selectedBranch);

        const mainBranchId = selectedMainBranchId || (selectedBranch.isMainBrunch
          ? selectedBranch._id
          : selectedBranch.brunches?.[0]);

        if (!mainBranchId) {
          setAdminNetworkMainBranch(selectedBranch.isMainBrunch ? selectedBranch : null);
          return;
        }

        if (selectedMainBranchId !== mainBranchId) {
          const params = new URLSearchParams(searchParams);
          params.set('mainBranchId', mainBranchId);
          if (!params.get('userId')) {
            params.set('userId', selectedBranch._id);
          }
          setSearchParams(params);
        }

        const mainBranch = selectedBranch.isMainBrunch
          ? selectedBranch
          : await userService.getById(mainBranchId);

        if (!active) return;

        setAdminNetworkMainBranch(mainBranch);
        dispatch(fetchChildBranches(mainBranch._id));
      } catch (loadError) {
        if (!active) return;

        setAdminContextBranch(null);
        setAdminNetworkMainBranch(null);
      }
    };

    loadAdminBranchNetwork();

    return () => {
      active = false;
    };
  }, [dispatch, isAdminUser, searchParams, selectedMainBranchId, selectedUserId, setSearchParams]);

  const shouldShowBranchSelector = isMainBranchUser || (isAdminUser && !!adminNetworkMainBranch && !!adminContextBranch);

  const branchOptions = useMemo(() => {
    if (isAdminUser && adminNetworkMainBranch && adminContextBranch) {
      return [
        { id: 'all', label: 'All Branches (This Network)' },
        { id: adminNetworkMainBranch._id, label: `${adminNetworkMainBranch.name.first} (Main Branch)` },
        ...childBranches.map((branch) => ({ id: branch._id, label: `${branch.name.first} (Child)` })),
      ];
    }

    if (isMainBranchUser && currentUser) {
      return [
        { id: 'all', label: 'All Branches' },
        { id: currentUser._id, label: `${currentUser.name.first} (Main Branch)` },
        ...childBranches.map((branch) => ({ id: branch._id, label: `${branch.name.first} (Child)` })),
      ];
    }

    return [];
  }, [adminContextBranch, adminNetworkMainBranch, childBranches, currentUser, isAdminUser, isMainBranchUser]);

  useEffect(() => {
    dispatch(fetchProducts({ page, limit: 12, userId: effectiveSelectedUserId, scope: selectedScope || undefined }));
  }, [dispatch, page, effectiveSelectedUserId, selectedScope]);

  const handleBranchSelectionChange = (branchUserId: string) => {
    const params = new URLSearchParams(searchParams);
    if (branchUserId === 'all' && isMainBranchUser) {
      params.delete('userId');
      params.set('scope', 'all');
    } else if (branchUserId === 'all' && isAdminUser) {
      params.set('scope', 'all');
      if (adminNetworkMainBranch?._id) {
        params.set('mainBranchId', adminNetworkMainBranch._id);
        // Keep backend query scoped to this specific main branch network.
        params.set('userId', adminNetworkMainBranch._id);
      }
    } else {
      params.set('userId', branchUserId);
      params.delete('scope');
    }

    if (isAdminUser && adminNetworkMainBranch?._id) {
      params.set('mainBranchId', adminNetworkMainBranch._id);
    }

    if (source) {
      params.set('from', source);
    }
    setSearchParams(params);
    setPage(1);
  };

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

  const scopeFilteredProducts = useMemo(() => {
    if (isAdminUser) {
      // Admin in a selected network: enforce rendering only what current scope allows,
      // even if a previous broader response arrives out of order.
      if (!isAdminAllBranchesSelected && effectiveSelectedUserId) {
        return products.filter((p) => String(p.createdBy?.userId || '') === String(effectiveSelectedUserId));
      }

      if (isAdminAllBranchesSelected && branchOptions.length > 0) {
        const allowedIds = new Set(branchOptions.filter((b) => b.id !== 'all').map((b) => String(b.id)));
        return products.filter((p) => allowedIds.has(String(p.createdBy?.userId || '')));
      }

      return products;
    }

    if (!isMainBranchUser || isAllBranchesSelected || !effectiveSelectedUserId) {
      return products;
    }

    return products.filter((p) => String(p.createdBy?.userId || '') === String(effectiveSelectedUserId));
  }, [
    products,
    isAdminUser,
    isAdminAllBranchesSelected,
    branchOptions,
    isMainBranchUser,
    isAllBranchesSelected,
    effectiveSelectedUserId,
  ]);

  const filtered = scopeFilteredProducts.filter(p =>
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
        <div className="flex items-center gap-2">
          {shouldShowBranchSelector && branchOptions.length > 0 && (
            <div className="min-w-[220px]">
              <label htmlFor="branch-select" className="sr-only">Select branch</label>
              <select
                id="branch-select"
                value={(isAllBranchesSelected || isAdminAllBranchesSelected) ? 'all' : (effectiveSelectedUserId || '')}
                onChange={(e) => handleBranchSelectionChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm transition ${viewMode === 'cards' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 text-sm transition ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Table
            </button>
          </div>

          <Link
            to={`/products/new${createContextParams}`}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            + New Product
          </Link>
        </div>
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

      {viewMode === 'cards' ? (
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
                  <p>Branch ID: {product.createdBy?.userId || 'N/A'}</p>
                  <p>By: {product.createdBy?.username || 'Unknown'} ({product.createdBy?.role || 'N/A'})</p>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Link
                    to={`/products/${product._id}${contextParams}`}
                    className="text-center text-sm bg-blue-50 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg hover:bg-blue-100 transition font-medium"
                  >
                    Details
                  </Link>
                  <Link
                    to={`/products/${product._id}/edit${contextParams}`}
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
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-200 md:hidden">
            {filtered.map((product) => (
              <div key={product._id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">Title</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{product.product.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Qty</p>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">{product.quantity}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Description</p>
                  <p className="text-sm text-gray-700 mt-0.5">{shortenDescription(product.product.description)}</p>
                </div>

                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Supplier</p>
                  <p className="text-sm text-gray-700 mt-0.5">{product.supplier}</p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Link
                    to={`/products/${product._id}${contextParams}`}
                    className="text-center bg-blue-600 text-white px-2.5 py-2 rounded-lg hover:bg-blue-700 transition text-xs font-medium"
                  >
                    Details
                  </Link>
                  <Link
                    to={`/products/${product._id}/edit${contextParams}`}
                    className="text-center bg-yellow-600 text-white px-2.5 py-2 rounded-lg hover:bg-yellow-700 transition text-xs font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="bg-red-600 text-white px-2.5 py-2 rounded-lg hover:bg-red-700 transition text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'add')}
                    className="bg-green-600 text-white px-2.5 py-2 rounded-lg hover:bg-green-700 transition text-xs font-medium"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'subtract')}
                    className="bg-red-600 text-white px-2.5 py-2 rounded-lg hover:bg-red-700 transition text-xs font-medium"
                  >
                    Sub
                  </button>
                  <button
                    onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'update')}
                    className="bg-indigo-600 text-white px-2.5 py-2 rounded-lg hover:bg-indigo-700 transition text-xs font-medium"
                  >
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1100px] w-full table-auto divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="w-24 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="w-[460px] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filtered.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-3 align-top text-left text-sm font-medium text-gray-800">{product.product.title}</td>
                    <td className="px-3 py-3 align-top text-left text-sm text-gray-600">{shortenDescription(product.product.description)}</td>
                    <td className="px-3 py-3 align-top text-left text-sm text-gray-700">{product.supplier}</td>
                    <td className="px-3 py-3 text-sm text-center font-semibold text-gray-800">{product.quantity}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-nowrap items-center justify-end gap-1.5">
                        <Link
                          to={`/products/${product._id}${contextParams}`}
                          className="bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 transition text-xs font-medium whitespace-nowrap"
                        >
                          Details
                        </Link>
                        <Link
                          to={`/products/${product._id}/edit${contextParams}`}
                          className="bg-yellow-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-yellow-700 transition text-xs font-medium whitespace-nowrap"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'add')}
                          className="bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 transition text-xs font-medium whitespace-nowrap"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'subtract')}
                          className="bg-red-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-700 transition text-xs font-medium whitespace-nowrap"
                        >
                          Sub
                        </button>
                        <button
                          onClick={() => openQuantityModal(product._id, product.quantity, product.product.title, 'update')}
                          className="bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-indigo-700 transition text-xs font-medium whitespace-nowrap"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleDelete(product._id)}
                          className="bg-red-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-red-700 transition text-xs font-medium whitespace-nowrap"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No products found</p>
          <Link to={`/products/new${createContextParams}`} className="text-indigo-600 hover:underline mt-2 inline-block">
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
