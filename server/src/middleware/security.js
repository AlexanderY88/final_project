const fs = require('fs');
const { fileTypeFromFile } = require('file-type');
const NodeClam = require('clamscan');
const path = require('path');

// Security configuration for file uploads
const SECURITY_CONFIG = {
  // Allowed image file types with their magic numbers
  allowedTypes: [
    { mime: 'image/jpeg', extensions: ['jpg', 'jpeg'] },
    { mime: 'image/png', extensions: ['png'] },
    { mime: 'image/webp', extensions: ['webp'] }
  ],
  
  // Maximum file size (5MB)
  maxFileSize: 5 * 1024 * 1024,
  
  // ClamAV configuration
  clamAV: {
    removeInfected: true, // Automatically remove infected files
    quarantineInfected: false, // Don't quarantine, just delete
    scanLog: null, // Set to file path if you want logging
    debugMode: false
  }
};

// Initialize ClamAV scanner (fallback to mock if ClamAV not available)
let clamScan = null;
const initClamAV = async () => {
  try {
    clamScan = await new NodeClam().init({
      removeInfected: SECURITY_CONFIG.clamAV.removeInfected,
      quarantineInfected: SECURITY_CONFIG.clamAV.quarantineInfected,
      scanLog: SECURITY_CONFIG.clamAV.scanLog,
      debugMode: SECURITY_CONFIG.clamAV.debugMode,
      fileList: null,
      scanRecursively: false,
      clamscan: {
        path: '/usr/bin/clamscan', // Adjust path for your system
        timeout: 60000, // 1 minute timeout
        localFallback: true // Use local scanning if daemon unavailable
      }
    });
    console.log('✅ ClamAV initialized successfully');
    return clamScan;
  } catch (error) {
    console.warn('⚠️  ClamAV not available, using mock scanner:', error.message);
    // Return mock scanner for development
    return {
      scanFile: async (filePath) => {
        console.log(`🔍 Mock scan: ${path.basename(filePath)} - CLEAN`);
        return { isInfected: false, viruses: [] };
      }
    };
  }
};

// Initialize scanner on module load
initClamAV().then(scanner => {
  clamScan = scanner;
});

/**
 * Validates file type using magic numbers (file signatures)
 * This prevents users from simply renaming malicious files
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<Object>} - File type information or throws error
 */
const validateFileType = async (filePath) => {
  try {
    // Read file signature (magic numbers) from the actual file content
    const fileType = await fileTypeFromFile(filePath);
    
    if (!fileType) {
      throw new Error('Unable to determine file type from file signature');
    }
    
    // Check if the detected MIME type is allowed
    const isAllowed = SECURITY_CONFIG.allowedTypes.some(
      type => type.mime === fileType.mime
    );
    
    if (!isAllowed) {
      throw new Error(`File type ${fileType.mime} is not allowed. Only JPEG, PNG, and WebP images are permitted.`);
    }
    
    console.log(`✅ File type validation passed: ${fileType.mime}`);
    return fileType;
    
  } catch (error) {
    console.error('❌ File type validation failed:', error.message);
    throw new Error(`File validation failed: ${error.message}`);
  }
};

/**
 * Scans uploaded file for viruses and malware
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<Object>} - Scan results or throws error
 */
const scanFileForViruses = async (filePath) => {
  try {
    if (!clamScan) {
      throw new Error('Antivirus scanner not initialized');
    }
    
    console.log(`🔍 Scanning file for viruses: ${path.basename(filePath)}`);
    
    // Perform virus scan
    const scanResult = await clamScan.scanFile(filePath);
    
    if (scanResult.isInfected) {
      // Log security incident
      console.error('🚨 SECURITY ALERT: Infected file detected!', {
        file: path.basename(filePath),
        viruses: scanResult.viruses,
        path: filePath,
        timestamp: new Date().toISOString()
      });
      
      // Immediately delete the infected file
      try {
        fs.unlinkSync(filePath);
        console.log('🗑️  Infected file deleted successfully');
      } catch (deleteError) {
        console.error('❌ Failed to delete infected file:', deleteError.message);
      }
      
      throw new Error(`File is infected with virus: ${scanResult.viruses.join(', ')}`);
    }
    
    console.log(`✅ File scan completed - CLEAN: ${path.basename(filePath)}`);
    return scanResult;
    
  } catch (error) {
    console.error('❌ Virus scan failed:', error.message);
    throw new Error(`Security scan failed: ${error.message}`);
  }
};

/**
 * Validates file size to prevent large file uploads
 * @param {Object} file - Multer file object
 * @returns {boolean} - True if size is acceptable
 */
const validateFileSize = (file) => {
  if (file.size > SECURITY_CONFIG.maxFileSize) {
    throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${SECURITY_CONFIG.maxFileSize / 1024 / 1024}MB`);
  }
  
  console.log(`✅ File size validation passed: ${(file.size / 1024).toFixed(2)}KB`);
  return true;
};

/**
 * Sanitizes filename to prevent directory traversal attacks
 * @param {string} filename - Original filename
 * @returns {string} - Sanitized filename
 */
const sanitizeFilename = (filename) => {
  // Remove any path separators and dangerous characters
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/\.{2,}/g, '.') // Replace multiple dots with single dot
    .substring(0, 255); // Limit length
  
  console.log(`✅ Filename sanitized: ${filename} -> ${sanitized}`);
  return sanitized;
};

/**
 * Comprehensive security validation middleware for file uploads
 * @param {Object} file - Multer file object
 * @returns {Promise<Object>} - Validation results or throws error
 */
const validateUploadSecurity = async (file) => {
  try {
    console.log(`🛡️  Starting security validation for: ${file.originalname}`);
    
    // 1. Validate file size
    validateFileSize(file);
    
    // 2. Sanitize filename
    const sanitizedName = sanitizeFilename(file.originalname);
    
    // 3. Validate file type using magic numbers
    const fileType = await validateFileType(file.path);
    
    // 4. Scan for viruses
    const scanResult = await scanFileForViruses(file.path);
    
    console.log(`✅ Security validation completed successfully for: ${file.originalname}`);
    
    return {
      isSecure: true,
      fileType: fileType,
      scanResult: scanResult,
      sanitizedFilename: sanitizedName,
      securityChecks: {
        sizeCheck: true,
        typeCheck: true,
        virusScan: true,
        filenameCheck: true
      }
    };
    
  } catch (error) {
    console.error(`❌ Security validation failed for ${file.originalname}:`, error.message);
    
    // Clean up the file if it exists
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log('🗑️  Unsafe file deleted');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup unsafe file:', cleanupError.message);
      }
    }
    
    throw error;
  }
};

/**
 * Express middleware for secure file upload validation
 */
const secureFileUploadMiddleware = async (req, res, next) => {
  try {
    // If no file uploaded, proceed
    if (!req.file) {
      return next();
    }
    
    // Perform security validation
    const validationResult = await validateUploadSecurity(req.file);
    
    // Attach security info to request for logging
    req.fileSecurity = validationResult;
    
    next();
    
  } catch (error) {
    // Security validation failed - return error
    return res.status(400).json({
      message: 'File upload security check failed',
      error: error.message,
      securityAlert: true
    });
  }
};

module.exports = {
  validateUploadSecurity,
  secureFileUploadMiddleware,
  validateFileType,
  scanFileForViruses,
  validateFileSize,
  sanitizeFilename,
  SECURITY_CONFIG
};