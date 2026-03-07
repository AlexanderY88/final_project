const ProductQuantityHistory = require('../models/ProductQuantityHistory');

/**
 * Records quantity change in history
 * @param {Object} options - Configuration object
 * @param {String} options.productId - Product ID
 * @param {Object} options.productInfo - Product basic info (title, category, supplier)
 * @param {Number} options.previousQuantity - Previous quantity
 * @param {Number} options.newQuantity - New quantity
 * @param {String} options.changeType - Type of change (manual_update, initial_creation, etc.)
 * @param {Object} options.changedBy - User who made the change
 * @param {String} options.notes - Optional notes
 */
const recordQuantityChange = async (options) => {
    try {
        const {
            productId,
            productInfo,
            previousQuantity,
            newQuantity,
            changeType = 'manual_update',
            changedBy,
            notes = ''
        } = options;

        // Calculate quantity change
        const quantityChange = newQuantity - previousQuantity;

        // Get current date for aggregation
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
        const day = now.getDate();
        const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

        // Create history record
        const historyRecord = new ProductQuantityHistory({
            productId,
            productInfo,
            previousQuantity,
            newQuantity,
            quantityChange,
            changeType,
            changedBy,
            aggregationFields: {
                year,
                month,
                day,
                yearMonth
            },
            notes
        });

        await historyRecord.save();
        console.log(`📊 Quantity change recorded: ${productInfo.title} (${previousQuantity} → ${newQuantity})`);
        
        return historyRecord;

    } catch (error) {
        console.error('❌ Error recording quantity change:', error);
        throw error;
    }
};

/**
 * Get product quantity statistics by month for specific product
 * @param {String} productId - Product ID
 * @param {Object} options - Query options
 * @param {Number} options.year - Year (optional, defaults to current year)
 * @param {Number} options.months - Number of months to return (default: 12)
 * @param {String} options.branchFilter - Filter by specific branch (optional)
 */
const getProductQuantityStatistics = async (productId, options = {}) => {
    try {
        const {
            year = new Date().getFullYear(),
            months = 12,
            branchFilter = null
        } = options;

        // Build match conditions
        const matchConditions = {
            productId: productId,
            'aggregationFields.year': year
        };

        // Add branch filter if specified
        if (branchFilter) {
            matchConditions['changedBy.branchName'] = branchFilter;
        }

        // Aggregate data by month
        const monthlyStats = await ProductQuantityHistory.aggregate([
            {
                $match: matchConditions
            },
            {
                $sort: { createdAt: 1 } // Sort by creation date ascending
            },
            {
                $group: {
                    _id: {
                        year: '$aggregationFields.year',
                        month: '$aggregationFields.month',
                        yearMonth: '$aggregationFields.yearMonth'
                    },
                    // Get the latest quantity for each month (last change of the month)
                    latestQuantity: { $last: '$newQuantity' },
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
                    changes: {
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
                    }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1 }
            },
            {
                $limit: months
            }
        ]);

        // Get product info for the response
        const firstRecord = await ProductQuantityHistory.findOne({ productId }).select('productInfo');
        
        return {
            productId,
            productInfo: firstRecord ? firstRecord.productInfo : null,
            year,
            branchFilter,
            monthlyStatistics: monthlyStats.map(stat => ({
                month: stat._id.month,
                yearMonth: stat._id.yearMonth,
                quantity: stat.latestQuantity,
                totalChanges: stat.totalChanges,
                totalIncrease: stat.totalIncrease,
                totalDecrease: stat.totalDecrease,
                changes: stat.changes
            }))
        };

    } catch (error) {
        console.error('❌ Error getting product statistics:', error);
        throw error;
    }
};

/**
 * Get statistics for all branches - aggregated view
 * @param {Object} options - Query options
 * @param {Number} options.year - Year (optional, defaults to current year)
 * @param {Number} options.months - Number of months (default: 12)
 */
const getAllBranchesStatistics = async (options = {}) => {
    try {
        const {
            year = new Date().getFullYear(),
            months = 12
        } = options;

        // Aggregate by branch and month
        const branchStats = await ProductQuantityHistory.aggregate([
            {
                $match: {
                    'aggregationFields.year': year
                }
            },
            {
                $group: {
                    _id: {
                        branchName: '$changedBy.branchName',
                        userId: '$changedBy.userId',
                        yearMonth: '$aggregationFields.yearMonth',
                        month: '$aggregationFields.month'
                    },
                    totalProducts: { $addToSet: '$productId' },
                    totalQuantityChanges: { $sum: '$quantityChange' },
                    totalChangesCount: { $sum: 1 }
                }
            },
            {
                $group: {
                    _id: {
                        branchName: '$_id.branchName',
                        userId: '$_id.userId'
                    },
                    monthlyData: {
                        $push: {
                            month: '$_id.month',
                            yearMonth: '$_id.yearMonth',
                            uniqueProducts: { $size: '$totalProducts' },
                            totalQuantityChanges: '$totalQuantityChanges',
                            totalChangesCount: '$totalChangesCount'
                        }
                    }
                }
            },
            {
                $sort: { '_id.branchName': 1 }
            }
        ]);

        return {
            year,
            totalBranches: branchStats.length,
            branchStatistics: branchStats.map(branch => ({
                branchName: branch._id.branchName,
                userId: branch._id.userId,
                monthlyData: branch.monthlyData.sort((a, b) => a.month - b.month)
            }))
        };

    } catch (error) {
        console.error('❌ Error getting all branches statistics:', error);
        throw error;
    }
};

module.exports = {
    recordQuantityChange,
    getProductQuantityStatistics,
    getAllBranchesStatistics
};