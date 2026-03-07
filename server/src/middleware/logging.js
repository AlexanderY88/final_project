/**
 * Request Logging Middleware
 * Automatically logs all API requests with business intelligence data
 * 
 * Features:
 * - Automatic request/response logging
 * - Performance timing
 * - Business data extraction
 * - Error tracking
 * - User activity monitoring
 */

const loggingService = require('../services/LoggingService');

/**
 * Request Logging Middleware
 * Captures comprehensive request/response data with business intelligence
 */
const requestLogger = (additionalData = {}) => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Store original methods
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Override response methods to capture data
        res.send = function(body) {
            const duration = Date.now() - startTime;
            
            // Log the request/response
            loggingService.logApiRequest(
                req, 
                res, 
                req.user, 
                duration, 
                {
                    ...additionalData,
                    responseBody: typeof body === 'string' ? body.substring(0, 500) : '[Object]' // Limit size
                }
            );
            
            return originalSend.call(this, body);
        };
        
        res.json = function(body) {
            const duration = Date.now() - startTime;
            
            // Log the request/response
            loggingService.logApiRequest(
                req, 
                res, 
                req.user, 
                duration, 
                {
                    ...additionalData,
                    responseBody: JSON.stringify(body).substring(0, 500) // Limit size
                }
            );
            
            return originalJson.call(this, body);
        };
        
        next();
    };
};

/**
 * Product Operation Logger
 * Specifically logs product-related operations with business data
 */
const logProductOperation = (operation) => {
    return (req, res, next) => {
        // Store product operation data in request for later logging
        req.logData = {
            operation: operation,
            productId: req.params.id || req.body.productId,
            quantity: req.body.quantity,
            timestamp: new Date().toISOString()
        };
        
        next();
    };
};

/**
 * Quantity Change Logger
 * Logs when product quantities are modified
 */
const logQuantityChange = (oldQuantity, newQuantity, productId) => {
    return (req, res, next) => {
        const quantityChange = newQuantity - oldQuantity;
        
        req.logData = {
            ...req.logData,
            operation: 'quantity_change',
            productId: productId,
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            quantityChange: quantityChange,
            quantityChangeType: quantityChange > 0 ? 'increase' : quantityChange < 0 ? 'decrease' : 'no_change'
        };
        
        next();
    };
};

/**
 * Authentication Event Logger
 */
const logAuthEvent = (event) => {
    return (req, res, next) => {
        const originalSend = res.send;
        const originalJson = res.json;
        
        res.send = function(body) {
            const success = res.statusCode >= 200 && res.statusCode < 400;
            
            loggingService.logAuthEvent(
                req, 
                req.user, 
                event, 
                success,
                {
                    email: req.body?.email,
                    statusCode: res.statusCode
                }
            );
            
            return originalSend.call(this, body);
        };
        
        res.json = function(body) {
            const success = res.statusCode >= 200 && res.statusCode < 400;
            
            loggingService.logAuthEvent(
                req, 
                req.user, 
                event, 
                success,
                {
                    email: req.body?.email,
                    statusCode: res.statusCode,
                    responseData: body
                }
            );
            
            return originalJson.call(this, body);
        };
        
        next();
    };
};

/**
 * Error Logger Middleware
 * Captures and logs all errors
 */
const errorLogger = (error, req, res, next) => {
    loggingService.logError(req, res, req.user, error, {
        errorType: error.constructor.name,
        url: req.originalUrl,
        method: req.method
    });
    
    next(error);
};

module.exports = {
    requestLogger,
    logProductOperation,
    logQuantityChange,
    logAuthEvent,
    errorLogger
};