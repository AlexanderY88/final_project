# 🏪 **Final Project - Product Management System**

A comprehensive Node.js/Express backend API for product management with role-based authentication, secure file uploads, and advanced statistics tracking.

## 📋 **Table of Contents**
- [Features](#features)
- [Dependencies](#dependencies)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [API Documentation](#api-documentation)
  - [Authentication APIs](#authentication-apis)
  - [Product Management APIs](#product-management-apis)
  - [Statistics APIs](#statistics-apis)
- [File Upload Security](#file-upload-security)
- [Role-Based Access Control](#role-based-access-control)
- [Database Schema](#database-schema)

## 🚀 **Features**

### **Core Features**
- ✅ **User Authentication & Authorization** with JWT tokens
- ✅ **Role-based Access Control** (Admin, Main Branch, Child Branches)
- ✅ **Product CRUD Operations** with advanced filtering
- ✅ **Secure File Upload System** with virus scanning
- ✅ **Dual Image Support** (file uploads + external URLs)
- ✅ **Advanced Statistics & Analytics** with flexible time periods
- ✅ **Branch Management System** with hierarchical permissions
- ✅ **Quantity History Tracking** for inventory management

### **Security Features**
- 🛡️ **Rate Limiting Protection** against brute force attacks
- 🛡️ **File Type Validation** using magic numbers
- 🛡️ **Antivirus Scanning** with ClamAV integration
- 🛡️ **JWT Authentication** with bcrypt password hashing
- 🛡️ **Input Validation** with Joi schemas
- 🛡️ **Role-based API Access** control

## 📦 **Dependencies**

### **Production Dependencies**
```json
{
  "express": "^4.18.2",
  "express-rate-limit": "^7.1.5",
  "mongoose": "^7.5.0",
  "jsonwebtoken": "^9.0.2",
  "bcryptjs": "^2.4.3",
  "joi": "^17.9.2",
  "multer": "^1.4.5-lts.1",
  "file-type": "^18.5.0",
  "clamscan": "^2.1.2",
  "cors": "^2.8.5",
  "helmet": "^7.0.0",
  "lodash": "^4.17.21",
  "chalk": "^4.1.2"
}
```

### **Development Dependencies**
```json
{
  "nodemon": "^3.0.1",
  "dotenv": "^16.3.1"
}
```

## 🛠️ **Installation**

### **1. Clone Repository**
```bash
git clone https://github.com/AlexanderY88/final_project.git
cd final_project
```

### **2. Install Dependencies**
```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies (if applicable)
cd ../client
npm install
```

### **3. Install Required Packages**
```bash
# In server directory
npm install express express-rate-limit mongoose jsonwebtoken bcryptjs joi multer file-type clamscan cors helmet lodash chalk

# In client directory
cd ../client
npm install -D tailwindcss postcss autoprefixer
```

### **4. Tailwind CSS Setup**
Tailwind CSS is already configured with:
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration  
- Tailwind directives in `src/index.css`

The configuration scans all TypeScript and JavaScript files in the src directory for Tailwind classes.

## ⚙️ **Environment Setup**

Create `.env` file in server directory:

```env
# Database Configuration
MONGODB_URI_LOCAL=mongodb://localhost:27017/final_project_dev
MONGODB_URI_PRODUCTION=your_azure_mongodb_connection_string
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# ClamAV Configuration (Optional)
CLAMAV_PATH=/usr/bin/clamscan
```

## �️ **Rate Limiting Protection**

The application includes comprehensive brute force protection through express-rate-limit middleware:

### **General API Rate Limiting**
- **Limit**: 100 requests per 15 minutes per IP address
- **Scope**: All `/api/*` routes
- **Purpose**: Prevents API abuse and DoS attacks

### **Login Protection**
- **Limit**: 5 login attempts per 15 minutes per IP address
- **Scope**: All `/api/users/*` routes (login, register, etc.)
- **Smart Counting**: Only failed attempts count against the limit
- **Auto-Reset**: Counters automatically reset every 15 minutes

### **Response Headers**
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Reset time for the current window

### **Error Response Example**
```json
{
  "error": "Too many login attempts from this IP, please try again after 15 minutes.",
  "retryAfter": "15 minutes"
}
```

## �📖 **API Documentation**

### **Base URL**: `http://localhost:3001/api`

---

## 🔐 **Authentication APIs**

### **1. User Registration**
```http
POST /users/register
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "phone": "1234567890",
  "role": "user",
  "branchName": "Downtown Store"
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "64f8b2c3d1234567890abcde",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

**What it does:** Creates a new user account with hashed password and role assignment.

---

### **2. User Login**
```http
POST /users/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8b2c3d1234567890abcde",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user"
  }
}
```

**What it does:** Authenticates user credentials and returns JWT token for API access.

---

### **3. Get User Profile**
```http
GET /users/profile
```

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**Response:** `200 OK`
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": "64f8b2c3d1234567890abcde",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "role": "user",
    "branchName": "Downtown Store"
  }
}
```

**What it does:** Returns current user's profile information based on JWT token.

---

### **4. Update User Profile**
```http
PUT /users/profile
```

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**Request Body:**
```json
{
  "first_name": "John Updated",
  "last_name": "Doe Updated",
  "phone": "9876543210",
  "branchName": "Updated Store Name"
}
```

**What it does:** Updates user profile information (password changes require current password verification).

---

### **5. Delete User** *(Admin/Main Branch Only)*
```http
DELETE /users/:userId
```

**Headers:**
```
Authorization: Bearer admin_or_main_brunch_token
```

**What it does:** Deletes a user account and all associated data (cascade deletion).

---

## 📦 **Product Management APIs**

### **1. Create Product with Image Upload**
```http
POST /products/create
```

**Headers:**
```
Authorization: Bearer your_jwt_token_here
Content-Type: multipart/form-data
```

**Form Data:**
```
title: "Laptop Dell XPS"
subtitle: "High-performance laptop"
description: "Professional laptop with latest specs"
supplier: "Dell Inc."
category: "Electronics"
quantity: 50
country: "USA"
city: "New York"
street: "Main Street"
houseNumber: 123
zip: 10001
productImage: [file] (optional - for file upload)
imageUrl: "https://example.com/image.jpg" (optional - for external URL)
imageAlt: "Dell XPS laptop image"
imageType: "upload" or "url"
```

**Response:** `201 Created`
```json
{
  "message": "Product created successfully",
  "product": {
    "id": "64f8b2c3d1234567890abcde",
    "product": {
      "title": "Laptop Dell XPS",
      "description": "Professional laptop with latest specs"
    },
    "quantity": 50,
    "image": {
      "filename": "product-1678901234567-123456789.jpg",
      "imageType": "upload",
      "securityValidated": true
    }
  },
  "securityValidation": "passed"
}
```

**What it does:** Creates a new product with secure image upload, file validation, and virus scanning.

---

### **2. Get All Products** *(Public)*
```http
GET /products?page=1&limit=10
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "products": [...],
  "currentPage": 1,
  "totalPages": 5,
  "totalProducts": 50
}
```

**What it does:** Retrieves paginated list of all products.

---

### **3. Get Product by ID** *(Public)*
```http
GET /products/:productId
```

**What it does:** Retrieves detailed information about a specific product.

---

### **4. Update Product**
```http
PUT /products/:productId
```

**Headers:**
```
Authorization: Bearer your_jwt_token_here
Content-Type: multipart/form-data
```

**Form Data:** Same as create product

**What it does:** Updates product information with optional image replacement and security validation.

---

### **5. Update Product Quantity Only**
```http
PATCH /products/:productId/quantity
```

**Headers:**
```
Authorization: Bearer your_jwt_token_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 75
}
```

**Response:** `200 OK`
```json
{
  "message": "Product quantity updated successfully",
  "product": {
    "id": "64f8b2c3d1234567890abcde",
    "title": "Laptop Dell XPS",
    "previousQuantity": 50,
    "newQuantity": 75
  }
}
```

**What it does:** Updates only the quantity field and records the change in history for statistics.

---

### **6. Delete Product**
```http
DELETE /products/:productId
```

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**What it does:** Deletes product and associated image files from server.

---

### **7. Get Child Branches Report** *(Main Branch/Admin Only)*
```http
GET /products/branches/report
```

**Headers:**
```
Authorization: Bearer main_brunch_or_admin_token
```

**Response:** `200 OK`
```json
{
  "message": "Child branches report generated successfully",
  "summary": {
    "totalChildBranches": 3,
    "overallTotalProducts": 45,
    "overallTotalQuantity": 1250
  },
  "childBranches": [
    {
      "branchInfo": {
        "branchId": "64f8b2c3d1234567890abc01",
        "branchName": "Downtown Store",
        "managerName": "John Smith"
      },
      "productSummary": {
        "totalProducts": 15,
        "totalQuantity": 450
      },
      "products": [...]
    }
  ]
}
```

**What it does:** Generates comprehensive report of all child branches with their products and quantities.

---

## 📊 **Statistics APIs**

### **1. Product Statistics**
```http
GET /products/statistics/:productId
```

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**Query Parameters:**
- `timePeriod`: `last_3_months`, `last_6_months`, `last_year`, `last_2_years`, `current_month`, `current_year`, `custom_range`
- `customStartDate`: `YYYY-MM-DD` (required if timePeriod=custom_range)
- `customEndDate`: `YYYY-MM-DD` (required if timePeriod=custom_range)
- `branchId`: Filter by specific branch (admin/main_brunch only)
- `branchName`: Filter by branch name (admin/main_brunch only)
- `groupBy`: `day`, `week`, `month`, `year`
- `includeDetails`: `true`, `false`

**Example:**
```http
GET /products/statistics/64f8b2c3d1234567890abcde?timePeriod=last_6_months&groupBy=month&includeDetails=true
```

**Response:** `200 OK`
```json
{
  "message": "Product quantity statistics retrieved successfully",
  "statistics": {
    "productInfo": {
      "title": "Laptop Dell XPS",
      "currentQuantity": 45
    },
    "summary": {
      "totalChanges": 15,
      "totalIncrease": 85,
      "totalDecrease": 40,
      "netChange": 45,
      "maxQuantity": 50,
      "minQuantity": 20
    },
    "periodicData": [
      {
        "period": "2025-10",
        "quantity": 20,
        "totalChanges": 1,
        "netChange": 20,
        "changes": [...]
      }
    ]
  }
}
```

**What it does:** Provides detailed quantity statistics for a specific product over time with flexible filtering options.

---

### **2. All Branches Statistics Overview** *(Admin/Main Branch Only)*
```http
GET /products/statistics/branches/overview
```

**Headers:**
```
Authorization: Bearer admin_or_main_brunch_token
```

**Query Parameters:** Same as product statistics

**What it does:** Provides comprehensive statistics overview for all branches with activity analysis.

---

### **3. Branch Comparison Statistics** *(Admin/Main Branch Only)*
```http
GET /products/statistics/branches/compare?branchIds=id1,id2,id3&timePeriod=last_year
```

**Headers:**
```
Authorization: Bearer admin_or_main_brunch_token
```

**Query Parameters:**
- `branchIds`: Comma-separated list of branch IDs to compare
- Other parameters same as product statistics

**What it does:** Compares activity and performance between multiple branches.

---

### **4. Personal Branch Statistics**
```http
GET /products/statistics/my-branch
```

**Headers:**
```
Authorization: Bearer your_jwt_token_here
```

**Query Parameters:** Same as other statistics APIs

**What it does:** Shows statistics for current user's branch activities (accessible to all authenticated users).

---

## 🛡️ **File Upload Security**

### **Security Features:**
1. **File Type Validation**: Uses magic numbers to verify actual file types
2. **Virus Scanning**: ClamAV integration with automatic infected file removal
3. **Size Limits**: Maximum 5MB per file
4. **Filename Sanitization**: Prevents directory traversal attacks
5. **Storage Organization**: Organized file structure with unique naming

### **Supported Image Formats:**
- JPEG/JPG
- PNG  
- WebP

### **Security Validation Process:**
1. ✅ **Size Check**: Validates file size limits
2. ✅ **Type Check**: Magic number validation
3. ✅ **Virus Scan**: ClamAV antivirus scanning
4. ✅ **Filename Sanitization**: Safe filename generation
5. ✅ **Audit Logging**: Complete security audit trail

---

## 🔐 **Role-Based Access Control**

### **Admin Users**
- ✅ **Full System Access**: All endpoints and operations
- ✅ **User Management**: Create, update, delete users
- ✅ **Global Statistics**: View all branches and products
- ✅ **Branch Comparison**: Compare any branches

### **Main Branch Users (main_brunch)**
- ✅ **Branch Management**: Manage child branches
- ✅ **Product Management**: CRUD operations on all products
- ✅ **Statistics Access**: View all branch statistics
- ✅ **Reports**: Generate comprehensive reports
- ❌ **User Administration**: Cannot manage other main_brunch or admin users

### **Child Branch Users (user)**
- ✅ **Own Products**: CRUD operations on products they created
- ✅ **Personal Statistics**: View their own activity statistics
- ✅ **Profile Management**: Update own profile information
- ❌ **Other Branches**: Cannot access other branches' data
- ❌ **Admin Functions**: Cannot perform administrative tasks

---

## 🗄️ **Database Schema**

### **Users Collection**
```javascript
{
  first_name: String (required),
  last_name: String (required), 
  email: String (unique, required),
  password: String (hashed, required),
  phone: String (optional),
  role: Enum ['admin', 'main_brunch', 'user'],
  branchName: String (optional),
  isEmailVerified: Boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

### **Products Collection**
```javascript
{
  product: {
    title: String (required),
    subtitle: String (optional),
    description: String (required)
  },
  supplier: String (required),
  category: String (required),
  image: {
    // File upload fields
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    // External URL field
    url: String,
    // Common fields
    alt: String,
    imageType: Enum ['upload', 'url'],
    // Security fields
    securityValidated: Boolean,
    validationTimestamp: Date
  },
  branch_address: {
    state: String,
    country: String (required),
    city: String (required),
    street: String (required),
    houseNumber: Number (required),
    zip: Number (required)
  },
  quantity: Number (required, min: 0),
  createdBy: {
    userId: ObjectId (ref: 'users'),
    username: String,
    role: String,
    branchName: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### **ProductQuantityHistory Collection**
```javascript
{
  productId: ObjectId (ref: 'products'),
  productInfo: {
    title: String,
    category: String,
    supplier: String
  },
  previousQuantity: Number,
  newQuantity: Number,
  quantityChange: Number,
  changeType: Enum ['manual_update', 'initial_creation', 'bulk_update', 'sale', 'restock'],
  changedBy: {
    userId: ObjectId (ref: 'users'),
    username: String,
    role: String,
    branchName: String
  },
  aggregationFields: {
    year: Number,
    month: Number,
    day: Number,
    yearMonth: String
  },
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 **Getting Started**

### **1. Start MongoDB**
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas connection string
```

### **2. Seed Database** *(Optional)*

#### **Quick Seeding**
```bash
cd server
node src/seeds/userSeeds.js
node src/seeds/productSeeds.js
```

#### **Comprehensive Test Data**
```bash
cd server
npm run seed:full
```

**🎯 Comprehensive Seed Data Structure:**

This creates a complete test environment with:

**👥 Users Created (9 total):**
- **1 Admin**: `admin@company.com`
- **3 Main Branch Managers:**
  - `main1@company.com` (Tel Aviv Main - No children)
  - `main2@company.com` (Jerusalem Main - 2 children)  
  - `main3@company.com` (Haifa Main - 3 children)
- **5 Child Branch Users:**
  - `child2_1@company.com` (Jerusalem Branch A)
  - `child2_2@company.com` (Jerusalem Branch B)
  - `child3_1@company.com` (Haifa Branch A)
  - `child3_2@company.com` (Haifa Branch B)
  - `child3_3@company.com` (Haifa Branch C)

**🛍️ Products Created (35 total):**
- **Tel Aviv Main Branch**: 5 products
- **Jerusalem Main + Children**: 15 products (5 per branch)
- **Haifa Children Branches**: 15 products (5 per branch)

**🔐 Login Credentials:**
- **Password for ALL users**: `Password123!`
- **Categories**: Electronics, Clothing, Books, Home & Garden, Sports, Toys, Beauty, Food & Beverage, Automotive, Health
- **Realistic Data**: Israeli cities, varied suppliers, random quantities (50-250 per product)

### **🎯 Test User Accounts**

#### **👑 Admin Account**
- **Email**: `admin@company.com`
- **Password**: `Password123!`
- **Role**: `admin`
- **Access**: Full system access, user management, global statistics

#### **🏢 Main Branch Managers**

**1. Tel Aviv Main Branch (No Children)**
- **Email**: `main1@company.com`
- **Password**: `Password123!`
- **Role**: `main_brunch`
- **Branch**: Tel Aviv Main Branch
- **Products**: 5 products
- **Children**: None

**2. Jerusalem Main Branch (2 Children)**
- **Email**: `main2@company.com`  
- **Password**: `Password123!`
- **Role**: `main_brunch`
- **Branch**: Jerusalem Main Branch
- **Products**: 15 products total (5 + 5 + 5)
- **Children**: 2 child branches

**3. Haifa Main Branch (3 Children)**
- **Email**: `main3@company.com`
- **Password**: `Password123!`
- **Role**: `main_brunch`
- **Branch**: Haifa Main Branch  
- **Products**: 15 products total (3×5)
- **Children**: 3 child branches

#### **🌿 Child Branch Users**

**Jerusalem Child Branches**
- **Email**: `child2_1@company.com` | **Password**: `Password123!` | **Branch**: Jerusalem Branch A | **Products**: 5
- **Email**: `child2_2@company.com` | **Password**: `Password123!` | **Branch**: Jerusalem Branch B | **Products**: 5

**Haifa Child Branches**  
- **Email**: `child3_1@company.com` | **Password**: `Password123!` | **Branch**: Haifa Branch A | **Products**: 5
- **Email**: `child3_2@company.com` | **Password**: `Password123!` | **Branch**: Haifa Branch B | **Products**: 5
- **Email**: `child3_3@company.com` | **Password**: `Password123!` | **Branch**: Haifa Branch C | **Products**: 5

**📊 Test Scenarios Enabled:**
- Admin managing all branches (`admin@company.com`)
- Main branch managers with different hierarchies:
  - Single branch operation (`main1@company.com`)
  - Managing 2 child branches (`main2@company.com`) 
  - Managing 3 child branches (`main3@company.com`)
- Child branch operations and restrictions (`child2_1@company.com`, etc.)
- Product statistics across multiple time periods
- Role-based access control testing
- Branch comparison analytics  
- Quantity history tracking

**💡 Quick Test Tips:**
- Login as admin to see full system capabilities
- Login as `main2@company.com` to test 2-child hierarchy
- Login as `main3@company.com` to test 3-child hierarchy  
- Login as any child user to see restricted access
- All passwords are `Password123!`

### **3. Start Server**
```bash
cd server
npm start
# or for development
npm run dev
```

### **4. Test API**
```bash
# Register a new user
curl -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "password": "Password123!",
    "role": "user"
  }'
```

---

## 📝 **Notes**

### **Development Mode**
- Uses local MongoDB connection
- Detailed logging enabled
- Hot reloading with nodemon

### **Production Mode**
- Azure MongoDB Atlas integration
- Security headers with Helmet
- Optimized error handling
- ClamAV antivirus integration

### **File Structure**
```
server/
├── src/
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic services
│   ├── utils/          # Utility functions
│   └── seeds/          # Database seeders
├── uploads/            # File upload storage
├── docs/              # Documentation
└── package.json       # Dependencies
```

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🤝 **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Made with ❤️ by Alexander Y**

## 🏗️ Project Structure

```
final_project/
├── client/                 # React TypeScript Frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── features/      # Redux slices
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript type definitions
│   │   └── app/           # Redux store configuration
│   ├── public/
│   └── package.json
├── server/                # Node.js Backend
│   ├── src/
│   │   ├── controllers/   # Route handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # Express routes
│   │   ├── utils/         # Utility functions
│   │   └── index.ts       # Server entry point
│   ├── dist/              # Compiled JavaScript (generated)
│   └── package.json
└── package.json           # Root package.json for scripts
```

## 🚀 Technologies Used

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (client + server)
npm run install:all
```

### 2. Environment Setup

#### Server Environment (.env in server folder)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/final_project
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
```

#### Client Environment (.env in client folder)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_NAME=Final Project Client
```

### 3. Start MongoDB
Make sure MongoDB is running locally or update the MONGODB_URI in server/.env to point to your MongoDB instance.

### 4. Run the Application

#### Option 1: Run both client and server together
```bash
npm run dev
```

#### Option 2: Run separately
```bash
# Terminal 1: Start server
npm run server:dev

# Terminal 2: Start client
npm run client:dev
```

## 📡 API Endpoints

### User Management & Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login 
- `GET /api/users/profile` - Get current user profile (protected)
- `PUT /api/users/update-profile/:id` - Update user profile (role-based)
- `DELETE /api/users/:id` - Delete user account (role-based with cascade)
- `GET /api/users/:id` - Get user by ID (role-based access)

### Branch Management
- `GET /api/users/child-brunches` - Get child branches (main_brunch & admin only)
- `POST /api/users/create-child-brunch` - Create new child branch (main_brunch & admin only)

### Health Check
- `GET /api/health` - Server health check

## 🔐 Authentication Flow

1. User registers/logs in
2. Server returns JWT token
3. Token stored in localStorage
4. Token sent with API requests via Authorization header
5. Protected routes check for valid token
6. Automatic redirect to login if token invalid/expired

## 📱 Features

### Implemented
- ✅ User registration and login
- ✅ JWT-based authentication
- ✅ Protected routes
- ✅ Redux state management
- ✅ TypeScript integration
- ✅ Responsive design
- ✅ Error handling
- ✅ API service layer
- ✅ MongoDB integration
- ✅ Password hashing

### Ready to Extend
- 🔄 User profile management
- 🔄 Role-based access control
- 🔄 Password reset functionality
- 🔄 Email verification
- 🔄 Social login
- 🔄 Real-time features (Socket.io)
- 🔄 File upload
- 🔄 Admin dashboard

## 🧪 Development Scripts

```bash
# Root level
npm run dev              # Run both client and server
npm run install:all      # Install all dependencies
npm run client:dev       # Run only client
npm run server:dev       # Run only server
npm run build           # Build client for production
npm run server:start    # Start production server

# Server level (cd server)
npm run dev             # Development with hot reload
npm run build           # Compile TypeScript
npm run start           # Production start
npm test               # Run tests

# Client level (cd client)
npm start              # Development server
npm run build          # Production build
npm test              # Run tests
npm run eject          # Eject from CRA
```

## 📁 Key Files Overview

### Backend
- `server/src/index.ts` - Main server file
- `server/src/models/User.ts` - User model with Mongoose
- `server/src/models/Product.ts` - Product model with Mongoose
- `server/routes/users.js` - User management and authentication routes
- `server/src/middleware/auth.ts` - JWT middleware
- `server/src/utils/jwt.ts` - JWT utility functions
- `server/src/config/database.ts` - Database connection configuration
- `server/src/seeds/` - Database seeding system

### Frontend
- `client/src/App.tsx` - Main app component with routing
- `client/src/features/auth/authSlice.ts` - Redux auth slice
- `client/src/services/auth.ts` - Authentication service
- `client/src/services/api.ts` - HTTP client configuration
- `client/src/components/Login.tsx` - Login component
- `client/src/components/Register.tsx` - Registration component

## 🔧 Customization

This project serves as a solid foundation for a full-stack application. You can extend it by:

1. Adding new models and API endpoints
2. Creating additional React components and pages
3. Implementing new Redux slices for different features
4. Adding new middleware for logging, rate limiting, etc.
5. Integrating additional services (email, payment, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is open source and available under the MIT License.