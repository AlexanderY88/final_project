import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 text-gray-400 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <p className="text-sm">
            &copy; {currentYear} Alexander Yarovinsky. All rights reserved.
          </p>
          <div className="flex space-x-6 text-sm">
            <a href="/about" className="hover:text-white transition duration-200">About Us</a>
            <a href="/contact" className="hover:text-white transition duration-200">Contact Us</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
