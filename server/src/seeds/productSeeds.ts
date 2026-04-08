const Product = require('../models/Product');

export const seedProducts = async (): Promise<any[]> => {
  return [
    {
      product: {
        title: 'iPhone 15 Pro',
        subtitle: 'Advanced smartphone with A17 Pro chip',
        description: 'The most powerful iPhone ever with titanium design, advanced camera system, and lightning-fast performance.'
      },
      supplier: 'Apple Inc.',
      category: 'electronics',
      image: {
        url: 'https://via.placeholder.com/300x300?text=iPhone+15+Pro',
        alt: 'iPhone 15 Pro'
      },
      price: 999.99,
      quantity_available: 50,
      in_stock: true
    },
    {
      product: {
        title: 'Dell XPS 13',
        subtitle: 'Ultra-portable laptop',
        description: 'Premium ultrabook with Intel Core i7 processor, 13-inch display, and all-day battery life.'
      },
      supplier: 'Dell Technologies',
      category: 'electronics',
      image: {
        url: 'https://via.placeholder.com/300x300?text=Dell+XPS+13',
        alt: 'Dell XPS 13 Laptop'
      },
      price: 1299.99,
      quantity_available: 25,
      in_stock: true
    },
    {
      product: {
        title: 'Nike Air Max 90',
        subtitle: 'Classic running shoes',
        description: 'Iconic sneakers with visible Air cushioning, durable materials, and timeless design.'
      },
      supplier: 'Nike Inc.',
      category: 'sports',
      image: {
        url: 'https://via.placeholder.com/300x300?text=Nike+Air+Max',
        alt: 'Nike Air Max 90 Shoes'
      },
      price: 129.99,
      quantity_available: 100,
      in_stock: true
    },
    {
      product: {
        title: 'Samsung 65" QLED TV',
        subtitle: '4K Smart TV with Quantum Dot technology',
        description: 'Premium smart TV with amazing picture quality, smart features, and sleek design.'
      },
      supplier: 'Samsung Electronics',
      category: 'electronics',
      image: {
        url: 'https://via.placeholder.com/300x300?text=Samsung+QLED',
        alt: 'Samsung QLED TV'
      },
      price: 2199.99,
      quantity_available: 15,
      in_stock: true
    },
    {
      product: {
        title: 'The Great Gatsby',
        subtitle: 'Classic American novel',
        description: 'F. Scott Fitzgerald\'s masterpiece about the American Dream and the Jazz Age.'
      },
      supplier: 'Penguin Random House',
      category: 'books',
      image: {
        url: 'https://via.placeholder.com/300x300?text=Great+Gatsby',
        alt: 'The Great Gatsby Book'
      },
      price: 14.99,
      quantity_available: 200,
      in_stock: true
    },
    {
      product: {
        title: 'Vintage Denim Jacket',
        subtitle: 'Classic blue denim jacket',
        description: 'Timeless denim jacket made from premium cotton with authentic vintage wash.'
      },
      supplier: 'Levi Strauss & Co.',
      category: 'clothing',
      image: {
        url: 'https://via.placeholder.com/300x300?text=Denim+Jacket',
        alt: 'Vintage Denim Jacket'
      },
      price: 89.99,
      quantity_available: 75,
      in_stock: true
    }
  ];
};