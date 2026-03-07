const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp + random number + original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + fileExtension);
  }
});

// File upload constraints configuration
const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB in bytes
  MAX_FILES: 1, // Only one file per upload
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
};

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    // Accept only specific image formats
    if (UPLOAD_LIMITS.ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${UPLOAD_LIMITS.ALLOWED_TYPES.join(', ')} images are allowed!`), false);
    }
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: UPLOAD_LIMITS.MAX_FILE_SIZE, // 5MB limit
    files: UPLOAD_LIMITS.MAX_FILES // Only one file per upload
  },
  fileFilter: fileFilter
});

// Export single file upload middleware and configuration
module.exports = {
  uploadProductImage: upload.single('productImage'), // 'productImage' is the field name
  uploadDir: uploadDir,
  UPLOAD_LIMITS: UPLOAD_LIMITS // Export limits for reference
};