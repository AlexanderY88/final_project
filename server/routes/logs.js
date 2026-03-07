/**
 * Logs Management and Analytics Routes
 * Provides access to structured logs and business intelligence
 * 
 * Features:
 * - View logs by type, date, and hour
 * - Business analytics and reporting
 * - Performance metrics
 * - User activity monitoring
 * - Product operation insights
 */

const express = require('express');
const loggingService = require('../src/services/LoggingService');
const authMiddleware = require('../src/middleware/auth');
const router = express.Router();

/**
 * Get Logs by Type and Date/Hour
 * GET /api/logs/:type/:date/:hour?
 * Available types: api, products, errors, auth
 */
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

/**
 * Get Business Analytics for a Date
 * GET /api/logs/analytics/:date
 */
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

/**
 * Search Logs with Filters
 * POST /api/logs/search
 * Body: { logType, dateFrom, dateTo, filters: { userId, branchId, statusCode, operation } }
 */
router.post('/search', authMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        
        // Only admin and main_brunch can search logs
        if (currentUser.role !== 'admin' && currentUser.role !== 'main_brunch') {
            return res.status(403).json({ 
                message: "Access denied: Only admins and main branch managers can search logs" 
            });
        }
        
        const { logType, dateFrom, dateTo, filters = {} } = req.body;
        
        // Validate required fields
        if (!logType || !dateFrom || !dateTo) {
            return res.status(400).json({ 
                message: "logType, dateFrom, and dateTo are required" 
            });
        }
        
        // Simple search implementation (could be enhanced)
        const searchResults = [];
        
        // Get date range
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
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
                
                // Branch restriction for main_brunch users
                if (currentUser.role === 'main_brunch') {
                    if (log.branchId && currentUser.brunches && !currentUser.brunches.includes(log.branchId)) {
                        match = false;
                    }
                }
                
                return match;
            });
            
            searchResults.push(...filteredLogs);
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

/**
 * Get Recent Error Summary
 * GET /api/logs/errors/summary
 */
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