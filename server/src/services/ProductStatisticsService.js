/**
 * Product Statistics Service
 * Advanced analytics engine for product quantity tracking and business intelligence
 * 
 * Features:
 * - Flexible time period analysis with switch-based date calculation
 * - Branch comparison and filtering capabilities
 * - MongoDB aggregation pipelines for complex queries
 * - Quantity change history tracking across multiple time periods
 * - Support for custom date ranges and predefined periods
 * - Role-based data access and filtering
 */

const ProductQuantityHistory = require('../models/ProductQuantityHistory');
const Product = require('../models/Product');
const User = require('../models/User');

/**
 * Statistics Service for Product Quantity Analysis
 * Handles various time periods, date ranges, and branch filtering for comprehensive analytics
 */
class ProductStatisticsService {

    /**
     * Get Date Range Based on Time Period Selection
     * Calculates start and end dates for various predefined time periods
     * 
     * @param {String} timePeriod - Time period selection (last_3_months, last_6_months, etc.)
     * @param {String} customStartDate - Custom start date for flexible range (optional)
     * @param {String} customEndDate - Custom end date for flexible range (optional)
     * @returns {Object} Date range object with startDate and endDate properties
     */
    static getDateRange(timePeriod, customStartDate = null, customEndDate = null) {
        const now = new Date();
        let startDate, endDate;

        // Switch-based time period calculation for flexible analytics
        switch (timePeriod) {
            case 'last_3_months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;

            case 'last_6_months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;

            case 'last_year':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;

            case 'last_2_years':
                startDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;

            case 'current_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;

            case 'current_year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;

            case 'custom_range':
                if (!customStartDate || !customEndDate) {
                    throw new Error('Custom date range requires both start and end dates');
                }
                startDate = new Date(customStartDate);
                endDate = new Date(customEndDate);
                
                if (startDate > endDate) {
                    throw new Error('Start date cannot be later than end date');
                }
                break;

            default:
                // Default to last 6 months
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        return { startDate, endDate };
    }

    /**
     * Get product quantity statistics for specific product with flexible filtering
     * @param {String} productId - Product ID
     * @param {Object} filterOptions - Filter options
     * @returns {Object} Statistics data
     */
    static async getProductStatistics(productId, filterOptions = {}) {
        try {
            const {
                timePeriod = 'last_6_months',
                customStartDate = null,
                customEndDate = null,
                branchId = null,
                branchName = null,
                groupBy = 'month', // 'day', 'week', 'month', 'year'
                includeDetails = true
            } = filterOptions;

            // Get date range
            const { startDate, endDate } = this.getDateRange(timePeriod, customStartDate, customEndDate);

            // Build match conditions
            const matchConditions = {
                productId: productId,
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            };

            // Add branch filter if specified
            if (branchId) {
                matchConditions['changedBy.userId'] = branchId;
            } else if (branchName) {
                matchConditions['changedBy.branchName'] = branchName;
            }

            // Get product info
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            // Build aggregation pipeline based on groupBy parameter
            let groupByField;
            let sortField;

            switch (groupBy) {
                case 'day':
                    groupByField = {
                        year: '$aggregationFields.year',
                        month: '$aggregationFields.month',
                        day: '$aggregationFields.day',
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        }
                    };
                    sortField = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
                    break;

                case 'week':
                    groupByField = {
                        year: { $year: '$createdAt' },
                        week: { $week: '$createdAt' },
                        date: {
                            $dateToString: {
                                format: '%Y-W%U',
                                date: '$createdAt'
                            }
                        }
                    };
                    sortField = { '_id.year': 1, '_id.week': 1 };
                    break;

                case 'year':
                    groupByField = {
                        year: '$aggregationFields.year',
                        date: {
                            $dateToString: {
                                format: '%Y',
                                date: '$createdAt'
                            }
                        }
                    };
                    sortField = { '_id.year': 1 };
                    break;

                default: // month
                    groupByField = {
                        year: '$aggregationFields.year',
                        month: '$aggregationFields.month',
                        yearMonth: '$aggregationFields.yearMonth'
                    };
                    sortField = { '_id.year': 1, '_id.month': 1 };
            }

            // Execute aggregation
            const statistics = await ProductQuantityHistory.aggregate([
                { $match: matchConditions },
                { $sort: { createdAt: 1 } },
                {
                    $group: {
                        _id: groupByField,
                        // Get the latest quantity for the period
                        latestQuantity: { $last: '$newQuantity' },
                        firstQuantity: { $first: '$previousQuantity' },
                        totalChanges: { $sum: 1 },
                        totalIncrease: {
                            $sum: {
                                $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0]
                            }
                        },
                        totalDecrease: {
                            $sum: {
                                $cond: [{ $lt: ['$quantityChange', 0] }, { $abs: '$quantityChange' }, 0]
                            }
                        },
                        netChange: { $sum: '$quantityChange' },
                        // Collect changes if details are requested
                        changes: includeDetails ? {
                            $push: {
                                date: '$createdAt',
                                previousQuantity: '$previousQuantity',
                                newQuantity: '$newQuantity',
                                change: '$quantityChange',
                                changedBy: '$changedBy.username',
                                branchName: '$changedBy.branchName',
                                changeType: '$changeType',
                                notes: '$notes'
                            }
                        } : []
                    }
                },
                { $sort: sortField }
            ]);

            // Calculate summary statistics
            const summaryStats = statistics.reduce((summary, period) => {
                summary.totalPeriods = statistics.length;
                summary.totalChanges += period.totalChanges;
                summary.totalIncrease += period.totalIncrease;
                summary.totalDecrease += period.totalDecrease;
                summary.netChange += period.netChange;
                
                if (period.latestQuantity > summary.maxQuantity) {
                    summary.maxQuantity = period.latestQuantity;
                    summary.maxQuantityPeriod = period._id.date || period._id.yearMonth || `${period._id.year}`;
                }
                
                if (period.latestQuantity < summary.minQuantity || summary.minQuantity === null) {
                    summary.minQuantity = period.latestQuantity;
                    summary.minQuantityPeriod = period._id.date || period._id.yearMonth || `${period._id.year}`;
                }
                
                return summary;
            }, {
                totalPeriods: 0,
                totalChanges: 0,
                totalIncrease: 0,
                totalDecrease: 0,
                netChange: 0,
                maxQuantity: 0,
                maxQuantityPeriod: null,
                minQuantity: null,
                minQuantityPeriod: null
            });

            return {
                productInfo: {
                    id: product._id,
                    title: product.product.title,
                    category: product.category,
                    supplier: product.supplier,
                    currentQuantity: product.quantity
                },
                filterOptions: {
                    timePeriod,
                    dateRange: { startDate, endDate },
                    branchId,
                    branchName,
                    groupBy
                },
                summary: summaryStats,
                periodicData: statistics.map(stat => ({
                    period: stat._id.date || stat._id.yearMonth || `${stat._id.year}`,
                    periodDetails: stat._id,
                    quantity: stat.latestQuantity,
                    quantityAtStart: stat.firstQuantity,
                    totalChanges: stat.totalChanges,
                    totalIncrease: stat.totalIncrease,
                    totalDecrease: stat.totalDecrease,
                    netChange: stat.netChange,
                    changes: includeDetails ? stat.changes : []
                }))
            };

        } catch (error) {
            console.error('❌ Error getting product statistics:', error);
            throw error;
        }
    }

    /**
     * Get branch-based statistics with flexible filtering
     * @param {Object} filterOptions - Filter options
     * @returns {Object} Branch statistics data
     */
    static async getBranchStatistics(filterOptions = {}) {
        try {
            const {
                timePeriod = 'last_6_months',
                customStartDate = null,
                customEndDate = null,
                branchId = null,
                branchName = null,
                groupBy = 'month',
                includeProductDetails = false
            } = filterOptions;

            // Get date range
            const { startDate, endDate } = this.getDateRange(timePeriod, customStartDate, customEndDate);

            // Build match conditions
            const matchConditions = {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate
                }
            };

            // Add branch filter if specified
            if (filterOptions.allowedBranchIds && filterOptions.allowedBranchIds.length > 0) {
                // For main branches, filter by their list of managed branches
                matchConditions['changedBy.userId'] = { $in: filterOptions.allowedBranchIds };
            } else if (branchId) {
                matchConditions['changedBy.userId'] = branchId;
            } else if (branchName) {
                matchConditions['changedBy.branchName'] = branchName;
            }

            // Build groupBy field based on groupBy parameter and branch
            let groupByField;
            let sortField;

            switch (groupBy) {
                case 'day':
                    groupByField = {
                        branchName: '$changedBy.branchName',
                        branchId: '$changedBy.userId',
                        year: '$aggregationFields.year',
                        month: '$aggregationFields.month',
                        day: '$aggregationFields.day',
                        date: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        }
                    };
                    sortField = { '_id.branchName': 1, '_id.year': 1, '_id.month': 1, '_id.day': 1 };
                    break;

                case 'year':
                    groupByField = {
                        branchName: '$changedBy.branchName',
                        branchId: '$changedBy.userId',
                        year: '$aggregationFields.year'
                    };
                    sortField = { '_id.branchName': 1, '_id.year': 1 };
                    break;

                default: // month
                    groupByField = {
                        branchName: '$changedBy.branchName',
                        branchId: '$changedBy.userId',
                        year: '$aggregationFields.year',
                        month: '$aggregationFields.month',
                        yearMonth: '$aggregationFields.yearMonth'
                    };
                    sortField = { '_id.branchName': 1, '_id.year': 1, '_id.month': 1 };
            }

            // Execute aggregation
            const branchStats = await ProductQuantityHistory.aggregate([
                { $match: matchConditions },
                { $sort: { createdAt: 1 } },
                {
                    $group: {
                        _id: groupByField,
                        uniqueProducts: { $addToSet: '$productId' },
                        totalQuantityChanges: { $sum: '$quantityChange' },
                        totalChangesCount: { $sum: 1 },
                        totalIncrease: {
                            $sum: {
                                $cond: [{ $gt: ['$quantityChange', 0] }, '$quantityChange', 0]
                            }
                        },
                        totalDecrease: {
                            $sum: {
                                $cond: [{ $lt: ['$quantityChange', 0] }, { $abs: '$quantityChange' }, 0]
                            }
                        },
                        productDetails: includeProductDetails ? {
                            $push: {
                                productId: '$productId',
                                productTitle: '$productInfo.title',
                                quantityChange: '$quantityChange',
                                changeType: '$changeType',
                                date: '$createdAt'
                            }
                        } : []
                    }
                },
                { $sort: sortField },
                {
                    $group: {
                        _id: {
                            branchName: '$_id.branchName',
                            branchId: '$_id.branchId'
                        },
                        periodicData: {
                            $push: {
                                period: {
                                    $switch: {
                                        branches: [
                                            {
                                                case: { $eq: [groupBy, 'day'] },
                                                then: '$_id.date'
                                            },
                                            {
                                                case: { $eq: [groupBy, 'year'] },
                                                then: { $toString: '$_id.year' }
                                            }
                                        ],
                                        default: '$_id.yearMonth'
                                    }
                                },
                                periodDetails: '$_id',
                                uniqueProductsCount: { $size: '$uniqueProducts' },
                                totalQuantityChanges: '$totalQuantityChanges',
                                totalChangesCount: '$totalChangesCount',
                                totalIncrease: '$totalIncrease',
                                totalDecrease: '$totalDecrease',
                                productDetails: '$productDetails'
                            }
                        },
                        // Calculate branch totals
                        branchTotalChanges: { $sum: '$totalChangesCount' },
                        branchTotalQuantityChanges: { $sum: '$totalQuantityChanges' },
                        branchTotalIncrease: { $sum: '$totalIncrease' },
                        branchTotalDecrease: { $sum: '$totalDecrease' },
                        allUniqueProducts: { $push: '$uniqueProducts' }
                    }
                },
                { $sort: { '_id.branchName': 1 } }
            ]);

            // Calculate overall summary
            const overallSummary = branchStats.reduce((summary, branch) => {
                summary.totalBranches = branchStats.length;
                summary.totalChanges += branch.branchTotalChanges;
                summary.totalQuantityChanges += branch.branchTotalQuantityChanges;
                summary.totalIncrease += branch.branchTotalIncrease;
                summary.totalDecrease += branch.branchTotalDecrease;
                
                // Flatten and deduplicate products
                const branchProducts = branch.allUniqueProducts.flat();
                branchProducts.forEach(productId => {
                    if (!summary.uniqueProducts.includes(productId)) {
                        summary.uniqueProducts.push(productId);
                    }
                });
                
                return summary;
            }, {
                totalBranches: 0,
                totalChanges: 0,
                totalQuantityChanges: 0,
                totalIncrease: 0,
                totalDecrease: 0,
                uniqueProducts: []
            });

            overallSummary.totalUniqueProducts = overallSummary.uniqueProducts.length;
            delete overallSummary.uniqueProducts; // Remove the array, keep only count

            return {
                filterOptions: {
                    timePeriod,
                    dateRange: { startDate, endDate },
                    branchId,
                    branchName,
                    groupBy
                },
                summary: overallSummary,
                branchStatistics: branchStats.map(branch => ({
                    branchInfo: {
                        branchId: branch._id.branchId,
                        branchName: branch._id.branchName
                    },
                    branchSummary: {
                        totalChanges: branch.branchTotalChanges,
                        totalQuantityChanges: branch.branchTotalQuantityChanges,
                        totalIncrease: branch.branchTotalIncrease,
                        totalDecrease: branch.branchTotalDecrease,
                        uniqueProductsCount: [...new Set(branch.allUniqueProducts.flat())].length
                    },
                    periodicData: branch.periodicData
                }))
            };

        } catch (error) {
            console.error('❌ Error getting branch statistics:', error);
            throw error;
        }
    }

    /**
     * Get comparison statistics between branches
     * @param {Array} branchIds - Array of branch IDs to compare
     * @param {Object} filterOptions - Filter options
     * @returns {Object} Comparison data
     */
    static async getBranchComparison(branchIds, filterOptions = {}) {
        try {
            const {
                timePeriod = 'last_6_months',
                customStartDate = null,
                customEndDate = null,
                groupBy = 'month'
            } = filterOptions;

            // Get statistics for each branch
            const branchComparisons = await Promise.all(
                branchIds.map(async (branchId) => {
                    const stats = await this.getBranchStatistics({
                        ...filterOptions,
                        branchId: branchId
                    });
                    return {
                        branchId: branchId,
                        statistics: stats
                    };
                })
            );

            // Calculate comparison metrics
            const comparison = {
                filterOptions: {
                    timePeriod,
                    branchIds,
                    groupBy
                },
                branchComparisons: branchComparisons,
                comparisonMetrics: {
                    mostActiveBranch: null,
                    leastActiveBranch: null,
                    highestQuantityChange: null,
                    lowestQuantityChange: null
                }
            };

            // Find most/least active branches
            let maxChanges = 0;
            let minChanges = Infinity;

            branchComparisons.forEach(branch => {
                const totalChanges = branch.statistics.summary.totalChanges;
                
                if (totalChanges > maxChanges) {
                    maxChanges = totalChanges;
                    comparison.comparisonMetrics.mostActiveBranch = {
                        branchId: branch.branchId,
                        totalChanges: totalChanges
                    };
                }
                
                if (totalChanges < minChanges) {
                    minChanges = totalChanges;
                    comparison.comparisonMetrics.leastActiveBranch = {
                        branchId: branch.branchId,
                        totalChanges: totalChanges
                    };
                }
            });

            return comparison;

        } catch (error) {
            console.error('❌ Error getting branch comparison:', error);
            throw error;
        }
    }
}

module.exports = ProductStatisticsService;