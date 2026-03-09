declare module '../models/User' {
  interface IUser {
    _id?: string;
    name: {
      first: string;
      middle?: string;
      last: string;
    };
    phone: string;
    email: string;
    password: string;
    role: 'admin' | 'main_brunch' | 'user';
    branchName?: string;
    parentBranch?: string;
    created_at: Date;
  }

  const User: any;
  export = User;
  export { IUser };
}

declare module '../models/Product' {
  interface IProduct {
    _id?: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    quantity: number;
    supplier?: string;
    imageUrls: string[];
    branchName: string;
    created_at: Date;
    updated_at: Date;
  }

  const Product: any;
  export = Product;
  export { IProduct };
}

declare module '../models/ProductQuantityHistory' {
  interface IProductQuantityHistory {
    _id?: string;
    productId: string;
    branchName: string;
    oldQuantity: number;
    newQuantity: number;
    changeType: 'increase' | 'decrease' | 'update';
    changedBy: string;
    reason?: string;
    created_at: Date;
  }

  const ProductQuantityHistory: any;
  export = ProductQuantityHistory;
  export { IProductQuantityHistory };
}