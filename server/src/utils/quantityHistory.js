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

module.exports = {
    recordQuantityChange
};