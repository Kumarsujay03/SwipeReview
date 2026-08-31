// Google Apps Script for LinkedIn Content Review App
// This script should be added to your Google Sheet via Extensions > Apps Script

/**
 * Handle GET requests - Fetch data from the sheet OR update status
 * @param {Object} e - Event object containing query parameters
 * @returns {TextOutput} JSON response
 */
function doGet(e) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Linkedin');

    if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({
            error: 'Sheet "Linkedin" not found'
        })).setMimeType(ContentService.MimeType.JSON);
    }

    // Check if this is an update request
    if (e.parameter.action === 'update') {
        return handleUpdate(sheet, e.parameter);
    }

    // Otherwise, fetch data
    return handleFetch(sheet, e.parameter);
}

/**
 * Fetch data from the sheet
 * @param {Sheet} sheet - The sheet object
 * @param {Object} params - Query parameters
 * @returns {TextOutput} JSON response
 */
function handleFetch(sheet, params) {
    // Get all data
    const data = sheet.getDataRange().getValues();
    const headers = data[0]; // First row contains headers
    const rows = data.slice(1); // All rows except header

    // Convert to array of objects
    let results = rows.map((row, index) => {
        let obj = {};
        headers.forEach((header, i) => {
            obj[header] = row[i];
        });
        obj.rowIndex = index + 2; // +2 because: +1 for header, +1 for 1-based indexing
        return obj;
    });

    // Filter based on history parameter
    const isHistory = params && params.history === 'true';

    if (isHistory) {
        // Return items with Status (processed items)
        results = results.filter(item => item.Status && item.Status.trim() !== '');
    } else {
        // Return items without Status (pending items)
        results = results.filter(item => !item.Status || item.Status.trim() === '');
    }

    // Transform to match frontend expected format
    const transformed = results.map(item => ({
        id: item.ID,
        title: item.Title,
        content: item.Content,
        timestamp: item.Date,
        status: item.Status || '',
        comments: item.Comment || ''
    }));

    return ContentService.createTextOutput(JSON.stringify({
        data: transformed
    })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle update request
 * @param {Sheet} sheet - The sheet object
 * @param {Object} params - Query parameters
 * @returns {TextOutput} JSON response
 */
function handleUpdate(sheet, params) {
    try {
        const id = params.id;
        const status = params.status;
        const userName = params.userName;
        const comment = params.comment || '';

        if (!id || !status || !userName) {
            return ContentService.createTextOutput(JSON.stringify({
                error: 'Missing required fields: id, status, or userName'
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // Find the row with matching ID
        const data = sheet.getDataRange().getValues();
        let rowIndex = -1;

        for (let i = 1; i < data.length; i++) { // Start from 1 to skip header
            if (data[i][0] == id) { // Column A (index 0) is ID
                rowIndex = i + 1; // +1 for 1-based indexing
                break;
            }
        }

        if (rowIndex === -1) {
            return ContentService.createTextOutput(JSON.stringify({
                error: 'ID not found: ' + id
            })).setMimeType(ContentService.MimeType.JSON);
        }

        // Format status with user name
        const fullStatus = `${status} by ${userName}`;

        // Update Status (Column E) and Comment (Column F)
        sheet.getRange(rowIndex, 5).setValue(fullStatus); // Column E (5th column)
        sheet.getRange(rowIndex, 6).setValue(decodeURIComponent(comment)); // Column F (6th column)

        return ContentService.createTextOutput(JSON.stringify({
            success: true,
            message: 'Status updated successfully',
            rowIndex: rowIndex,
            status: fullStatus
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({
            error: error.toString()
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Handle POST requests - Not used due to CORS limitations
 * Keeping for reference
 */
function doPost(e) {
    return ContentService.createTextOutput(JSON.stringify({
        error: 'POST not supported. Use GET with action=update parameter instead.'
    })).setMimeType(ContentService.MimeType.JSON);
}
