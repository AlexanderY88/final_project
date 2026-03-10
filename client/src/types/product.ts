export interface Product {
  _id: string;
  product: {
    title: string;
    subtitle?: string;
    description: string;
  };
  supplier: string;
  category: string;
  image?: {
    filename?: string;
    originalName?: string;
    path?: string;
    mimetype?: string;
    size?: number;
    url?: string;
    alt?: string;
    imageType?: 'upload' | 'url';
  };
  branch_address: {
    state?: string;
    country: string;
    city: string;
    street: string;
    houseNumber: number;
    zip: number;
  };
  quantity: number;
  createdBy: {
    userId: string;
    username: string;
    role: 'admin' | 'main_brunch' | 'user';
    branchName?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  title: string;
  subtitle?: string;
  description: string;
  supplier: string;
  category: string;
  quantity: number;
  state?: string;
  country: string;
  city: string;
  street: string;
  houseNumber: number;
  zip: number;
  imageUrl?: string;
  imageAlt?: string;
  imageType?: 'upload' | 'url';
}

export interface PaginatedProducts {
  products: Product[];
  currentPage: number;
  totalPages: number;
  totalProducts: number;
}
