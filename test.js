const fs = require('fs');
const assert = require('assert');

// Read index.html
const html = fs.readFileSync('index.html', 'utf8');

// Extract restoreSession function
const match = html.match(/function restoreSession\(\)\s*\{[\s\S]*?\n\}/);
if (!match) throw new Error("restoreSession function not found");

const restoreSessionCode = match[0];

// Create mock environment
let mockStorage = {};
const globalMock = {
  localStorage: {
    getItem: (key) => mockStorage[key] || null,
    setItem: (key, val) => mockStorage[key] = val,
    removeItem: (key) => delete mockStorage[key]
  }
};

const runRestoreSession = () => {
  return new Function('localStorage', `
    let currentUser = null;
    let myBookings = null;
    let savedIds = null;
    ${restoreSessionCode}
    return restoreSession();
  `)(globalMock.localStorage);
};

// Test 1: valid JSON
mockStorage['vb_user'] = JSON.stringify({name: 'Test'});
assert.strictEqual(runRestoreSession(), true, 'Valid JSON should return true');

// Test 2: no user
mockStorage = {};
assert.strictEqual(runRestoreSession(), false, 'No user should return false');

// Test 3: invalid JSON
mockStorage['vb_user'] = '{invalid json}';
assert.strictEqual(runRestoreSession(), false, 'Invalid JSON should throw and return false');

console.log("All tests passed!");
