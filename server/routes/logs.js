// Logs Management and Analytics Routes
const express = require('express');
const loggingService = require('../src/services/LoggingService');
const authMiddleware = require('../src/middleware/auth');
const User = require('../src/models/User');
const Product = require('../src/models/Product');
const ProductQuantityHistory = require('../src/models/ProductQuantityHistory');
const router = express.Router();

const toLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get Logs by Type and Date/Hour - GET /api/logs/:type/:date/:hour?
router.get('/:type/:date/:hour?', authMiddleware, async (req, res) => {
    try {
        const { type, date, hour } = req.params;
        const currentUser = req.user;
        
        // Only admin and main_brunch can access logs
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch') {
            return res.status(403).json({ 
                message: "Access denied: Only admins and main branch managers can view logs" 
            });
        }
        
        // Validate log type
        const validTypes = ['api', 'products', 'errors', 'auth'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ 
                message: `Invalid log type. Valid types: ${validTypes.join(', ')}` 
            });
        }
        
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ 
                message: "Invalid date format. Use YYYY-MM-DD" 
            });
        }
        
        // Validate hour if provided (0-23)
        let hourNum = null;
        if (hour !== undefined) {
            hourNum = parseInt(hour);
            if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
                return res.status(400).json({ 
                    message: "Invalid hour. Must be between 0-23" 
                });
            }
        }
        
        // Get logs
        const logs = await loggingService.getLogs(type, date, hourNum);
        
        // Filter logs based on user permissions
        let filteredLogs = logs;
        if (currentUser.role === 'main_brunch') {
            // Main branch can only see their branch logs
            filteredLogs = logs.filter(log => 
                !log.branchId || 
                (currentUser.brunches && currentUser.brunches.includes(log.branchId))
            );
        }
        
        res.status(200).json({
            message: "Logs retrieved successfully",
            logType: type,
            date: date,
            hour: hour || 'all',
            totalEntries: filteredLogs.length,
            logs: filteredLogs
        });
        
    } catch (error) {
        console.error("Error retrieving logs:", error);
        res.status(500).json({ message: "Server error retrieving logs" });
    }
});

// Get Business Analytics for a Date - GET /api/logs/analytics/:date
router.get('/analytics/:date', authMiddleware, async (req, res) => {
    try {
        const { date } = req.params;
        const currentUser = req.user;
        
        // Only admin and main_brunch can access analytics
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch') {
            return res.status(403).json({ 
                message: "Access denied: Only admins and main branch managers can view analytics" 
            });
        }
        
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({ 
                message: "Invalid date format. Use YYYY-MM-DD" 
            });
        }
        
        // Get analytics data
        const analytics = await loggingService.getBusinessAnalytics(date);
        
        // Filter analytics for main_brunch users
        if (currentUser.role === 'main_brunch' && currentUser.brunches) {
            // Filter by branch access (this would need more detailed implementation)
            analytics.branchRestricted = true;
            analytics.accessibleBranches = currentUser.brunches;
        }
        
        res.status(200).json({
            message: "Analytics retrieved successfully",
            date: date,
            analytics: analytics,
            generatedAt: new Date().toISOString()
        });
        
    } catch (error) {
        console.error("Error retrieving analytics:", error);
        res.status(500).json({ message: "Server error retrieving analytics" });
    }
});

// Search Logs with Filters - POST /api/logs/search
router.post('/search', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Only admin and main_brunch can search logs
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch') {
            return res.status(403).json({ 
                message: "Access denied: Only admins and main branch managers can search logs" 
            });
        }
        
        const { logType, dateFrom, dateTo, contextUserId, filters = {} } = req.body;
        
        // Validate required fields
        if (!logType || !dateFrom || !dateTo) {
            return res.status(400).json({ 
                message: "logType, dateFrom, and dateTo are required" 
            });
        }

        // Resolve allowed user IDs for admin impersonation
        let allowedUserIds = null; // null = no restriction
        if (currentUser.role === 'admin' && contextUserId) {
            const contextUser = await User.findById(contextUserId).select('_id isAdmin isMainBrunch');
            if (contextUser && !contextUser.isAdmin) {
                allowedUserIds = [contextUser._id.toString()];
                if (contextUser.isMainBrunch) {
                    const children = await User.find({ brunches: contextUser._id, isMainBrunch: false, isAdmin: false }).select('_id');
                    allowedUserIds.push(...children.map(u => u._id.toString()));
                }
                // Product/API logs store actor userId. Include admin actor so context views
                // don't become empty when admin performs actions inside selected branch context.
                allowedUserIds.push(currentUser._id.toString());
            }
        } else if (currentUser.role === 'main_brunch') {
            allowedUserIds = [currentUser._id.toString()];
            const children = await User.find({ brunches: currentUser._id, isMainBrunch: false, isAdmin: false }).select('_id');
            allowedUserIds.push(...children.map(u => u._id.toString()));
        }
        
        // Simple search implementation (could be enhanced)
        const searchResults = [];

        const toComparableUserId = (value) => {
            if (value === null || value === undefined) return null;
            return String(value);
        };
        
        // Get date range
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = toLocalDateString(d);
            const dayLogs = await loggingService.getLogs(logType, dateStr);
            
            // Apply filters
            const filteredLogs = dayLogs.filter(log => {
                let match = true;
                
                // Apply user filters
                if (filters.userId && log.userId !== filters.userId) match = false;
                if (filters.branchId && log.branchId !== filters.branchId) match = false;
                if (filters.statusCode && log.statusCode !== filters.statusCode) match = false;
                if (filters.operation && log.operation !== filters.operation) match = false;
                if (filters.userRole && log.userRole !== filters.userRole) match = false;
                
                // Scope to allowed users (admin impersonation or main_brunch own scope)
                if (allowedUserIds !== null && log.userId) {
                    const logUserId = toComparableUserId(log.userId);
                    if (!allowedUserIds.includes(logUserId)) match = false;
                }
                
                return match;
            });
            
            searchResults.push(...filteredLogs);
        }

        // Quantity history fallback from DB for product logs.
        if (logType === 'products') {
            const rangeStart = new Date(dateFrom);
            rangeStart.setHours(0, 0, 0, 0);
            const rangeEnd = new Date(dateTo);
            rangeEnd.setHours(23, 59, 59, 999);

            const historyRecords = await ProductQuantityHistory.find({
                createdAt: { $gte: rangeStart, $lte: rangeEnd }
            }).lean();

            const mappedHistoryLogs = historyRecords.map((record) => ({
                timestamp: record.createdAt,
                level: 'INFO',
                type: 'PRODUCT_OPERATION',
                userId: record.changedBy?.userId,
                userEmail: record.changedBy?.username || null,
                userRole: record.changedBy?.role || null,
                branchName: record.changedBy?.branchName || null,
                productId: record.productId,
                productTitle: record.productInfo?.title,
                operation: 'quantity_change',
                oldQuantity: record.previousQuantity,
                newQuantity: record.newQuantity,
                quantityChange: record.quantityChange,
                quantityChangeType: record.quantityChange > 0 ? 'increase' : record.quantityChange < 0 ? 'decrease' : 'no_change',
                endpoint: `/api/products/${record.productId}/quantity`,
                statusCode: 200,
                success: true,
                source: 'quantity_history'
            }));

            const filteredHistoryLogs = mappedHistoryLogs.filter((log) => {
                let match = true;
                if (filters.userId && toComparableUserId(log.userId) !== toComparableUserId(filters.userId)) match = false;
                if (filters.statusCode && log.statusCode !== filters.statusCode) match = false;
                if (filters.operation && log.operation !== filters.operation) match = false;
                if (filters.userRole && log.userRole !== filters.userRole) match = false;

                if (allowedUserIds !== null && log.userId) {
                    const logUserId = toComparableUserId(log.userId);
                    if (!allowedUserIds.includes(logUserId)) match = false;
                }

                return match;
            });

            // Deduplicate: only add DB records if NOT already in file logs
            const fileLogKeys = new Set(
                searchResults
                    .filter(log => log.source !== 'quantity_history')
                    .map((log) => `${String(log.productId).toLowerCase()}|${String(log.oldQuantity)}|${String(log.newQuantity)}`)
            );

            for (const log of filteredHistoryLogs) {
                const key = `${String(log.productId).toLowerCase()}|${String(log.oldQuantity)}|${String(log.newQuantity)}`;
                if (!fileLogKeys.has(key)) {
                    searchResults.push(log);
                }
            }
        }
        
        // Global deduplication for all quantity_change logs to prevent duplicates
        if (logType === 'products') {
            const seenKeys = new Set();
            const deduplicatedResults = [];
            
            for (const log of searchResults) {
                if (log.operation === 'quantity_change') {
                    const key = `${String(log.productId).toLowerCase()}|${String(log.oldQuantity)}|${String(log.newQuantity)}|${String(log.userId || 'system')}`;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        deduplicatedResults.push(log);
                    }
                } else {
                    deduplicatedResults.push(log);
                }
            }
            
            searchResults = deduplicatedResults;
        }
        
        // Enrich logs with product titles if missing
        const productIds = [...new Set(
            searchResults
                .filter(log => log.productId && !log.productTitle)
                .map(log => log.productId)
        )];
        
        if (productIds.length > 0) {
            try {
                const products = await Product.find({ _id: { $in: productIds } }).select('_id title').lean();
                const productTitleMap = {};
                products.forEach(p => {
                    productTitleMap[p._id.toString()] = p.title;
                });
                
                searchResults.forEach(log => {
                    if (log.productId && !log.productTitle && productTitleMap[log.productId]) {
                        log.productTitle = productTitleMap[log.productId];
                    }
                });
            } catch (enrichError) {
                console.error('Error enriching product titles:', enrichError);
            }
        }
        
        res.status(200).json({
            message: "Search completed successfully",
            searchCriteria: {
                logType,
                dateFrom,
                dateTo,
                filters
            },
            totalResults: searchResults.length,
            results: searchResults.slice(0, 1000) // Limit to 1000 results
        });
        
    } catch (error) {
        console.error("Error searching logs:", error);
        res.status(500).json({ message: "Server error searching logs" });
    }
});

// Get Recent Error Summary - GET /api/logs/errors/summary
router.get('/errors/summary', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Only admin and main_brunch can view error summaries  
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch') {
            return res.status(403).json({ 
                message: "Access denied: Only admins and main branch managers can view error summaries" 
            });
        }
        
        const today = new Date().toISOString().split('T')[0];
        const errors = await loggingService.getLogs('errors', today);
        
        // Filter for branch access if needed
        let filteredErrors = errors;
        if (currentUser.role === 'main_brunch' && currentUser.brunches) {
            filteredErrors = errors.filter(error => 
                !error.branchId || currentUser.brunches.includes(error.branchId)
            );
        }
        
        // Summarize errors
        const summary = {
            totalErrors: filteredErrors.length,
            errorsByStatus: {},
            errorsByEndpoint: {},
            errorsByHour: {},
            recentErrors: filteredErrors.slice(-10) // Last 10 errors
        };
        
        filteredErrors.forEach(error => {
            // Group by status code
            const status = error.statusCode || 'unknown';
            summary.errorsByStatus[status] = (summary.errorsByStatus[status] || 0) + 1;
            
            // Group by endpoint
            const endpoint = error.endpoint || 'unknown';
            summary.errorsByEndpoint[endpoint] = (summary.errorsByEndpoint[endpoint] || 0) + 1;
            
            // Group by hour  
            const hour = new Date(error.timestamp).getHours();
            summary.errorsByHour[hour] = (summary.errorsByHour[hour] || 0) + 1;
        });
        
        res.status(200).json({
            message: "Error summary retrieved successfully",
            date: today,
            summary: summary
        });
        
    } catch (error) {
        console.error("Error retrieving error summary:", error);
        res.status(500).json({ message: "Server error retrieving error summary" });
    }
});

module.exports = router;