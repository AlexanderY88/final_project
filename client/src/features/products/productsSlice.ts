import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as productService from '../../services/products';
import { Product, ProductFormData } from '../../types/product';

interface ProductsState {
  products: Product[];
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  products: [],
  currentPage: 1,
  totalPages: 1,
  totalProducts: 0,
  isLoading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk(
  'products/fetchAll',
  async ({ page = 1, limit = 12 }: { page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      return await productService.getAll(page, limit);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const createProduct = createAsyncThunk(
  'products/create',
  async ({ data, image }: { data: ProductFormData; image?: File }, { rejectWithValue }) => {
    try {
      return await productService.create(data, image);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create product');
    }
  }
);

export const updateProduct = createAsyncThunk(
  'products/update',
  async ({ id, data, image }: { id: string; data: ProductFormData; image?: File }, { rejectWithValue }) => {
    try {
      return await productService.update(id, data, image);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update product');
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await productService.remove(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
    }
  }
);

export const updateQuantity = createAsyncThunk(
  'products/updateQuantity',
  async ({ id, quantity }: { id: string; quantity: number }, { rejectWithValue }) => {
    try {
      const result = await productService.updateQuantity(id, quantity);
      return { id, quantity, result };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update quantity');
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload.products;
        state.currentPage = action.payload.currentPage;
        state.totalPages = action.payload.totalPages;
        state.totalProducts = action.payload.totalProducts;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false;
        // The API returns { product: {...} } or the product object directly, adjust accordingly
        const newProduct = action.payload.product || action.payload;
        state.products.unshift(newProduct);
        state.totalProducts += 1;
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update product
      .addCase(updateProduct.fulfilled, (state, action) => {
        const updatedProduct = action.payload.product || action.payload;
        const idx = state.products.findIndex(p => p._id === updatedProduct._id);
        if (idx !== -1) state.products[idx] = updatedProduct;
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      // Delete product
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.products = state.products.filter(p => p._id !== action.payload);
        state.totalProducts -= 1;
      })
      // Update quantity
      .addCase(updateQuantity.fulfilled, (state, action) => {
        const idx = state.products.findIndex(p => p._id === action.payload.id);
        if (idx !== -1) state.products[idx].quantity = action.payload.quantity;
      });
  },
});

export const { clearError } = productsSlice.actions;
export default productsSlice.reducer;
