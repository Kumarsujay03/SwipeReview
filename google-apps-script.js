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

    // Every data request must carry a valid session token from login
    const session = verifySessionToken(e.parameter.token);
    if (!session) {
        return jsonResponse({ error: 'Unauthorized', code: 401 });
    }

    // Check if this is an update request
    if (e.parameter.action === 'update') {
        return handleUpdate(sheet, e.parameter, session);
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
 * @param {Object} session - Verified session from the token ({ name, email })
 * @returns {TextOutput} JSON response
 */
function handleUpdate(sheet, params, session) {
    try {
        const id = params.id;
        const status = params.status;
        // Attribute the decision to the signed-in reviewer, not a client-supplied name
        const userName = session.name;
        const comment = params.comment || '';

        if (!id || !status) {
            return ContentService.createTextOutput(JSON.stringify({
                error: 'Missing required fields: id or status'
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
 * Handle POST requests - used only for login, so the password travels in the
 * request body instead of the URL. The frontend sends the body as text/plain
 * to avoid a CORS preflight.
 * @param {Object} e - Event object containing the POST body
 * @returns {TextOutput} JSON response
 */
function doPost(e) {
    let body = {};
    try {
        body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (err) {
        return jsonResponse({ error: 'Invalid JSON body' });
    }

    if (body.action === 'login') {
        return handleLogin(body);
    }

    return jsonResponse({ error: 'Unsupported action' });
}

// ---------------------------------------------------------------------------
// Reviewer login
//
// Reviewers live in a sheet tab named "Users" with the columns:
//   Name | Email | Salt | PasswordHash
// Passwords are never stored: only a random salt and an iterated, salted
// SHA-256 hash. Use the "SwipeReview > Add / update reviewer" menu in the
// spreadsheet to create or change a reviewer (see SHEETS_SETUP.md).
// ---------------------------------------------------------------------------

const USERS_SHEET_NAME = 'Users';
const HASH_ITERATIONS = 1000;

/**
 * Verify a reviewer's email and password against the Users sheet
 * @param {Object} body - { email, password }
 * @returns {TextOutput} JSON response with { success, user } or { error }
 */
function handleLogin(body) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
        return jsonResponse({ error: 'Missing email or password' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
    if (!sheet) {
        return jsonResponse({ error: 'Sheet "' + USERS_SHEET_NAME + '" not found' });
    }

    const rows = sheet.getDataRange().getValues().slice(1); // skip header
    const row = rows.find(r => String(r[1]).trim().toLowerCase() === email);

    // Hash even when the email is unknown so timing doesn't reveal valid emails
    const salt = row ? String(row[2]) : 'unknown-user';
    const expected = row ? String(row[3]) : '';
    const actual = hashPassword(password, salt);

    if (!row || !expected || !constantTimeEquals(actual, expected)) {
        return jsonResponse({ error: 'Invalid credentials' });
    }

    const secret = getSessionSecret();
    if (!secret) {
        return jsonResponse({ error: 'Server not configured: run "SwipeReview > Generate session secret"' });
    }

    const expiresAt = Date.now() + SESSION_TTL_MS;
    return jsonResponse({
        success: true,
        user: { name: String(row[0]), email: email },
        token: createSessionToken(email, expiresAt, secret),
        expiresAt: expiresAt
    });
}

// ---------------------------------------------------------------------------
// Session tokens
//
// After login the client receives a token of the form
//   base64url({"e": email, "x": expiresAtMs}) + "." + base64url(HMAC-SHA256)
// signed with a secret stored in Script Properties (SESSION_SECRET), never in
// code. Every fetch/update request must send it. Deleting a reviewer's row in
// the Users tab revokes their access immediately; rotating the secret signs
// everyone out.
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSessionSecret() {
    return PropertiesService.getScriptProperties().getProperty('SESSION_SECRET');
}

function signPayload(payload, secret) {
    return Utilities.base64EncodeWebSafe(
        Utilities.computeHmacSha256Signature(payload, secret, Utilities.Charset.UTF_8));
}

function createSessionToken(email, expiresAt, secret) {
    const payload = Utilities.base64EncodeWebSafe(
        JSON.stringify({ e: email, x: expiresAt }), Utilities.Charset.UTF_8);
    return payload + '.' + signPayload(payload, secret);
}

/**
 * Verify a session token and return the reviewer it belongs to
 * @param {string} token
 * @returns {Object|null} { name, email } or null if invalid, expired or revoked
 */
function verifySessionToken(token) {
    const secret = getSessionSecret();
    if (!secret || !token) return null;

    const parts = String(token).split('.');
    if (parts.length !== 2) return null;
    if (!constantTimeEquals(signPayload(parts[0], secret), parts[1])) return null;

    let claims;
    try {
        claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString());
    } catch (err) {
        return null;
    }
    if (!claims || typeof claims.x !== 'number' || claims.x < Date.now()) return null;

    // The reviewer must still exist, so removing their row revokes access
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET_NAME);
    if (!sheet) return null;
    const row = sheet.getDataRange().getValues().slice(1)
        .find(r => String(r[1]).trim().toLowerCase() === claims.e);
    return row ? { name: String(row[0]), email: claims.e } : null;
}

/**
 * Creates (or replaces) the random secret used to sign session tokens.
 * Replacing it signs every reviewer out.
 */
function generateSessionSecret() {
    const secret = Utilities.getUuid() + Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty('SESSION_SECRET', secret);
    SpreadsheetApp.getUi().alert('Session secret generated. Any existing sessions are now signed out.');
}

/**
 * Iterated, salted SHA-256 hash as a hex string
 * @param {string} password
 * @param {string} salt
 * @returns {string}
 */
function hashPassword(password, salt) {
    let hash = toHex(Utilities.computeDigest(
        Utilities.DigestAlgorithm.SHA_256, salt + password, Utilities.Charset.UTF_8));
    for (let i = 1; i < HASH_ITERATIONS; i++) {
        hash = toHex(Utilities.computeDigest(
            Utilities.DigestAlgorithm.SHA_256, salt + hash, Utilities.Charset.UTF_8));
    }
    return hash;
}

function toHex(bytes) {
    return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function constantTimeEquals(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

function jsonResponse(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Adds a "SwipeReview" menu to the spreadsheet for managing reviewers
 */
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu('SwipeReview')
        .addItem('Add / update reviewer', 'addOrUpdateReviewer')
        .addItem('Generate session secret', 'generateSessionSecret')
        .addToUi();
}

/**
 * Prompts for a reviewer's name, email and password, then stores the name,
 * email, a fresh random salt and the password hash in the Users sheet.
 * The plaintext password is never written anywhere.
 */
function addOrUpdateReviewer() {
    const ui = SpreadsheetApp.getUi();

    const ask = (prompt) => {
        const res = ui.prompt('SwipeReview', prompt, ui.ButtonSet.OK_CANCEL);
        return res.getSelectedButton() === ui.Button.OK ? res.getResponseText().trim() : null;
    };

    const name = ask('Reviewer name:');
    if (!name) return;
    const email = (ask('Reviewer email:') || '').toLowerCase();
    if (!email) return;
    const password = ask('New password (at least 10 characters):');
    if (!password) return;
    if (password.length < 10) {
        ui.alert('Password must be at least 10 characters. Nothing was saved.');
        return;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(USERS_SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(USERS_SHEET_NAME);
        sheet.appendRow(['Name', 'Email', 'Salt', 'PasswordHash']);
    }

    const salt = Utilities.getUuid();
    const hash = hashPassword(password, salt);

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).trim().toLowerCase() === email) {
            sheet.getRange(i + 1, 1, 1, 4).setValues([[name, email, salt, hash]]);
            ui.alert('Updated reviewer ' + email);
            return;
        }
    }

    sheet.appendRow([name, email, salt, hash]);
    ui.alert('Added reviewer ' + email);
}
