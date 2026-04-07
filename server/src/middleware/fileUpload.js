const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sharp = require('sharp');

// Create uploads folder if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads/products');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB source upload before optimization
const TARGET_FILE_SIZE = 1024 * 1024; // 1MB optimized target
const MAX_DIMENSION = 1920;

// Multer storage — saves file with a random name for security
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Random name so the original filename is never stored on disk
    const randomName = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  }
});

// Only allow image files
const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG and WebP images are allowed'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter
});

const optimizeUploadedImage = async (req, res, next) => {
  if (!req.file) {
    next();
    return;
  }

  const originalPath = req.file.path;
  const originalName = req.file.originalname;
  const optimizedFilename = `${path.parse(req.file.filename).name}.webp`;
  const optimizedPath = path.join(uploadDir, optimizedFilename);

  const dimensionSteps = [MAX_DIMENSION, 1600, 1280, 960];
  const qualitySteps = [82, 72, 62, 52, 42];

  try {
    let outputBuffer = null;

    for (const dimension of dimensionSteps) {
      for (const quality of qualitySteps) {
        const candidateBuffer = await sharp(originalPath)
          .rotate()
          .resize({
            width: dimension,
            height: dimension,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality })
          .toBuffer();

        outputBuffer = candidateBuffer;
        if (candidateBuffer.length <= TARGET_FILE_SIZE) {
          break;
        }
      }

      if (outputBuffer && outputBuffer.length <= TARGET_FILE_SIZE) {
        break;
      }
    }

    if (!outputBuffer) {
      throw new Error('Failed to optimize uploaded image');
    }

    await fs.promises.writeFile(optimizedPath, outputBuffer);

    if (optimizedPath !== originalPath && fs.existsSync(originalPath)) {
      await fs.promises.unlink(originalPath);
    }

    req.file.filename = optimizedFilename;
    req.file.path = optimizedPath;
    req.file.mimetype = 'image/webp';
    req.file.size = outputBuffer.length;
    req.file.originalname = originalName;

    next();
  } catch (error) {
    if (fs.existsSync(originalPath)) {
      await fs.promises.unlink(originalPath).catch(() => {});
    }
    if (fs.existsSync(optimizedPath)) {
      await fs.promises.unlink(optimizedPath).catch(() => {});
    }
    next(error);
  }
};

// uploadWithSecurity is an array so it works as Express middleware chain
const uploadWithSecurity = [upload.single('productImage'), optimizeUploadedImage];

module.exports = {
  uploadWithSecurity,
  uploadProductImage: upload.single('productImage'),
  uploadDir
};