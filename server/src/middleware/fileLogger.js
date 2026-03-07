const fs = require('fs');
const path = require('path');

// Simple file logger middleware - saves error messages to files
function fileLogger(req, res, next) {
    
    // Save the original res.json function
    const originalJson = res.json;
    
    // Replace res.json with our custom function
    res.json = function(data) {
        
        // Check if this is an error (status code 400 or higher)
        if (res.statusCode >= 400) {
            saveErrorToFile(req, res, data);
        }
        
        // Call the original res.json function
        return originalJson.call(this, data);
    };
    
    // Continue to the next middleware
    next();
}

// Function to save errors to a file
function saveErrorToFile(req, res, data) {
    
    // Create the logs folder if it doesn't exist
    const logsFolder = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsFolder)) {
        fs.mkdirSync(logsFolder);
    }
    
    // Create a filename with today's date (YYYY-MM-DD.log)
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${today}.log`;
    const filePath = path.join(logsFolder, fileName);
    
    // Create the error message
    const time = new Date().toLocaleString();
    const errorMessage = `[${time}] ERROR: ${req.method} ${req.url} - Status: ${res.statusCode} - ${JSON.stringify(data)}\n`;
    
    // Save to file
    fs.appendFileSync(filePath, errorMessage);
    
    // Show in console that we saved an error
    console.log(`💾 Error saved to logs/${fileName}`);
}

module.exports = fileLogger;