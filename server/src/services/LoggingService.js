/**
 * Advanced Logging Service
 * Handles structured logging with business intelligence and audit trails
 * 
 * Features:
 * - Hourly log rotation for easy management
 * - Branch and user tracking for audit trails
 * - Product operation logging (quantity changes, CRUD)
 * - HTTP status code monitoring
 * - JSON structured logs for easy parsing
 * - Error tracking and business metrics
 */

const fs = require('fs');
const path = require('path');

class LoggingService {
    constructor() {
        this.logsDir = path.join(__dirname, '../../logs');
        this.ensureLogsDirectory();
    }

    /**
     * Ensure logs directory exists with proper structure
     */
    ensureLogsDirectory() {
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }

        // Create subdirectories for different log types
        const subdirs = ['api', 'errors', 'products', 'auth'];
        subdirs.forEach(subdir => {
            const dirPath = path.join(this.logsDir, subdir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        });
    }

    /**
     * Get hourly log filename based on current timestamp
     * Format: YYYY-MM-DD-HH
     */
    getHourlyLogFile(logType = 'api') {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        
        const filename = `${year}-${month}-${day}-${hour}.log`;
        return path.join(this.logsDir, logType, filename);
    }

    /**
     * Extract business data from request and user
     */
    extractBusinessData(req, user, additionalData = {}) {
        return {
            // User Information
            userId: user?._id || null,
            userEmail: user?.email || null,
            userRole: user?.role || 'anonymous',
            branchId: user?.brunches?.[0] || user?.branchId || null,
            branchName: user?.branchName || 'Unknown',

            // Request Information  
            method: req.method,
            endpoint: req.originalUrl || req.url,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            
            // Product Data (if available)
            productId: req.body?.productId || req.params?.id || additionalData.productId,
            quantity: req.body?.quantity || additionalData.quantity,
            quantityChange: additionalData.quantityChange,
            operation: additionalData.operation, // 'create', 'update', 'delete', 'quantity_change'
            
            // Additional business data
            ...additionalData
        };
    }

    /**
     * Log API Request/Response with business intelligence
     */
    logApiRequest(req, res, user, duration, additionalData = {}) {
        const businessData = this.extractBusinessData(req, user, additionalData);
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'INFO',
            type: 'API_REQUEST',
            
            // HTTP Information
            statusCode: res.statusCode,
            statusMessage: this.getStatusMessage(res.statusCode),
            duration: duration,
            
            // Business Intelligence Data
            ...businessData,
            
            // Request/Response Data
            requestBody: this.sanitizeRequestBody(req.body),
            responseSize: res.get('Content-Length') || 0,
            
            // Performance and Monitoring
            success: res.statusCode >= 200 && res.statusCode < 400,
            error: res.statusCode >= 400,
            serverError: res.statusCode >= 500
        };

        this.writeLog('api', logEntry);

        // Also log errors separately for easier monitoring
        if (res.statusCode >= 400) {
            this.logError(req, res, user, null, additionalData);
        }

        // Log product operations separately for business intelligence
        if (businessData.productId && businessData.operation) {
            this.logProductOperation(logEntry);
        }
    }

    /**
     * Log Product-specific operations for business intelligence
     */
    logProductOperation(logData) {
        const productLog = {
            timestamp: logData.timestamp,
            level: 'INFO',
            type: 'PRODUCT_OPERATION',
            
            // Product Business Intelligence
            productId: logData.productId,
            operation: logData.operation,
            quantity: logData.quantity,
            quantityChange: logData.quantityChange,
            
            // User and Branch tracking
            userId: logData.userId,
            userRole: logData.userRole,
            branchId: logData.branchId,
            branchName: logData.branchName,
            
            // Operation result
            statusCode: logData.statusCode,
            success: logData.success,
            
            // Timestamp for analytics
            hour: new Date().getHours(),
            dayOfWeek: new Date().getDay(),
            date: new Date().toISOString().split('T')[0]
        };

        this.writeLog('products', productLog);
    }

    /**
     * Log Authentication events
     */
    logAuthEvent(req, user, event, success = true, additionalData = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: success ? 'INFO' : 'WARN',
            type: 'AUTH_EVENT',
            
            // Authentication Information
            event: event, // 'login', 'register', 'logout', 'token_refresh', 'permission_denied'
            success: success,
            
            // User Information
            userId: user?._id || null,
            userEmail: user?.email || additionalData.email || null,
            userRole: user?.role || null,
            branchId: user?.brunches?.[0] || null,
            
            // Request Information
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl || req.url,
            
            // Additional data
            ...additionalData
        };

        this.writeLog('auth', logEntry);
    }

    /**
     * Log Errors with detailed information
     */
    logError(req, res, user, error, additionalData = {}) {
        const businessData = this.extractBusinessData(req, user, additionalData);
        
        const errorLog = {
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            type: 'ERROR',
            
            // Error Information
            statusCode: res?.statusCode || 500,
            errorMessage: error?.message || 'Unknown error',
            errorStack: error?.stack || null,
            
            // Business Context
            ...businessData,
            
            // Request Context
            requestBody: this.sanitizeRequestBody(req.body),
            requestParams: req.params,
            requestQuery: req.query
        };

        this.writeLog('errors', errorLog);
    }

    /**
     * Get human-readable status message
     */
    getStatusMessage(statusCode) {
        const statusMessages = {
            200: 'Success',
            201: 'Created',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            409: 'Conflict',
            422: 'Validation Error',
            500: 'Internal Server Error',
        };
        return statusMessages[statusCode] || 'Unknown Status';
    }

    /**
     * Sanitize request body to remove sensitive information
     */
    sanitizeRequestBody(body) {
        if (!body || typeof body !== 'object') return body;
        
        const sanitized = { ...body };
        
        // Remove sensitive fields
        const sensitiveFields = ['password', 'token', 'authToken', 'jwt'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }

    /**
     * Write log entry to file
     */
    writeLog(logType, logEntry) {
        try {
            const logFile = this.getHourlyLogFile(logType);
            const logLine = JSON.stringify(logEntry) + '\n';
            
            fs.appendFileSync(logFile, logLine, 'utf8');
        } catch (error) {
            console.error('Failed to write log:', error);
        }
    }

    /**
     * Get logs for specific hour/date range
     */
    async getLogs(logType, date, hour = null) {
        try {
            let filename;
            if (hour !== null) {
                // Specific hour
                const hourStr = String(hour).padStart(2, '0');
                filename = `${date}-${hourStr}.log`;
            } else {
                // All day - need to read multiple files
                const logs = [];
                for (let h = 0; h < 24; h++) {
                    const hourStr = String(h).padStart(2, '0');
                    const hourFilename = `${date}-${hourStr}.log`;
                    const filepath = path.join(this.logsDir, logType, hourFilename);
                    
                    if (fs.existsSync(filepath)) {
                        const content = fs.readFileSync(filepath, 'utf8');
                        const lines = content.trim().split('\n').filter(line => line);
                        lines.forEach(line => {
                            try {
                                logs.push(JSON.parse(line));
                            } catch (e) {
                                // Skip invalid JSON lines
                            }
                        });
                    }
                }
                return logs;
            }
            
            const filepath = path.join(this.logsDir, logType, filename);
            if (!fs.existsSync(filepath)) {
                return [];
            }

            const content = fs.readFileSync(filepath, 'utf8');
            const lines = content.trim().split('\n').filter(line => line);
            
            return lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (error) {
                    console.error('Failed to parse log line:', line);
                    return null;
                }
            }).filter(Boolean);
        } catch (error) {
            console.error('Failed to read logs:', error);
            return [];
        }
    }

    /**
     * Get business analytics from logs
     */
    async getBusinessAnalytics(date) {
        const apiLogs = await this.getLogs('api', date);
        const productLogs = await this.getLogs('products', date);
        
        return {
            // Request Analytics
            totalRequests: apiLogs.length,
            successfulRequests: apiLogs.filter(log => log.success).length,
            failedRequests: apiLogs.filter(log => log.error).length,
            
            // User Activity by Role
            requestsByRole: this.groupBy(apiLogs, 'userRole'),
            requestsByBranch: this.groupBy(apiLogs, 'branchId'),
            
            // Product Operations
            productOperations: productLogs.length,
            operationsByType: this.groupBy(productLogs, 'operation'),
            quantityChanges: productLogs.reduce((sum, log) => sum + (Math.abs(log.quantityChange) || 0), 0),
            
            // Performance Metrics
            averageResponseTime: apiLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / apiLogs.length || 0,
            
            // Hourly Distribution
            requestsByHour: apiLogs.reduce((acc, log) => {
                const hour = new Date(log.timestamp).getHours();
                acc[hour] = (acc[hour] || 0) + 1;
                return acc;
            }, {})
        };
    }

    /**
     * Utility function to group array by key
     */
    groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key] || 'unknown';
            result[group] = (result[group] || 0) + 1;
            return result;
        }, {});
    }
}

module.exports = new LoggingService();