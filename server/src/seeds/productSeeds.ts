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
      branch_address: {
        state: 'NY',
        country: 'USA',
        city: 'New York',
        street: 'Fifth Avenue',
        houseNumber: 767,
        zip: 10153
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
      branch_address: {
        state: 'CA',
        country: 'USA',
        city: 'Los Angeles',
        street: 'Sunset Boulevard',
        houseNumber: 1234,
        zip: 90028
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
      branch_address: {
        state: 'FL',
        country: 'USA',
        city: 'Miami',
        street: 'Ocean Drive',
        houseNumber: 456,
        zip: 33139
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
      branch_address: {
        state: 'TX',
        country: 'USA',
        city: 'Houston',
        street: 'Main Street',
        houseNumber: 789,
        zip: 77002
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
      branch_address: {
        state: 'IL',
        country: 'USA',
        city: 'Chicago',
        street: 'Michigan Avenue',
        houseNumber: 321,
        zip: 60601
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
      branch_address: {
        country: 'USA',
        city: 'San Francisco',
        street: 'Market Street',
        houseNumber: 555,
        zip: 94102
      },
      price: 89.99,
      quantity_available: 75,
      in_stock: true
    }
  ];
};