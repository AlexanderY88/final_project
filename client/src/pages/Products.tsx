import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchProducts, deleteProduct, updateQuantity } from '../features/products/productsSlice';

const API_URL = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';

const Products: React.FC = () => {
  const dispatch = useAppDispatch();
  const { products, totalPages, totalProducts, isLoading, error } = useAppSelector(state => state.products);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchProducts({ page, limit: 12 }));
  }, [dispatch, page]);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      dispatch(deleteProduct(id));
    }
  };

  const handleQuantityChange = (id: string, currentQty: number, change: number) => {
    const newQty = Math.max(0, currentQty + change);
    dispatch(updateQuantity({ id, quantity: newQty }));
  };

  const getImageUrl = (product: any) => {
    if (!product.image) return null;
    if (product.image.imageType === 'url' && product.image.url) return product.image.url;
    if (product.image.filename) return `${API_URL}/api/images/products/${product.image.filename}`;
    return null;
  };

  const filtered = products.filter(p =>
    p.product.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading && products.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500">{totalProducts} total products</p>
        </div>
        <Link
          to="/products/new"
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
        {filtered.map(product => (
          <div key={product._id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition">
            {/* Image */}
            {getImageUrl(product) ? (
              <img
                src={getImageUrl(product)!}
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

            <div className="p-4">
              {/* Title & Description */}
              <h3 className="text-lg font-semibold text-gray-800">{product.product.title}</h3>
              {product.product.subtitle && (
                <p className="text-sm text-gray-500">{product.product.subtitle}</p>
              )}
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.product.description}</p>

              {/* Tags */}
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{product.category}</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{product.supplier}</span>
              </div>

              {/* Quantity Controls */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Qty:</span>
                <button
                  onClick={() => handleQuantityChange(product._id, product.quantity, -1)}
                  className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold transition"
                >
                  -
                </button>
                <span className="text-xl font-bold text-gray-800 min-w-[2rem] text-center">
                  {product.quantity}
                </span>
                <button
                  onClick={() => handleQuantityChange(product._id, product.quantity, 1)}
                  className="w-8 h-8 rounded-full bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold transition"
                >
                  +
                </button>
              </div>

              {/* Branch Info */}
              <div className="mt-3 text-xs text-gray-400">
                <p>Branch: {product.branch_address.city}, {product.branch_address.country}</p>
                <p>By: {product.createdBy?.username || 'Unknown'} ({product.createdBy?.role})</p>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <Link
                  to={`/products/${product._id}/edit`}
                  className="flex-1 text-center text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-2 rounded-lg hover:bg-yellow-100 transition font-medium"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(product._id)}
                  className="flex-1 text-sm bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-100 transition font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">No products found</p>
          <Link to="/products/new" className="text-indigo-600 hover:underline mt-2 inline-block">
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
    </div>
  );
};

export default Products;
