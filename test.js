const fs = require('fs');
const assert = require('assert');

// Read index.html
const html = fs.readFileSync('index.html', 'utf8');

// Extract restoreSession function
const match = html.match(/function restoreSession\(\)\s*\{[\s\S]*?\n\}/);
if (!match) {
  console.error("Could not find restoreSession function");
  process.exit(1);
}

const restoreSessionCode = match[0];

function runTest() {
  const localStorageMock = {
    store: {},
    getItem: function(key) {
      return this.store[key] || null;
    },
    setItem: function(key, value) {
      this.store[key] = value.toString();
    },
    removeItem: function(key) {
      delete this.store[key];
    },
    clear: function() {
      this.store = {};
    }
  };

  const setupFn = new Function('localStorage', `
    let currentUser = null;
    let myBookings = [];
    let savedIds = [];

    ${restoreSessionCode}

    return {
      restoreSession,
      getCurrentUser: () => currentUser,
      getMyBookings: () => myBookings,
      getSavedIds: () => savedIds
    };
  `);

  const env = setupFn(localStorageMock);

  // Test 1: No saved user
  localStorageMock.clear();
  assert.strictEqual(env.restoreSession(), false, 'Should return false when no user is saved');

  // Test 2: Valid saved user, valid bookings, valid saved
  localStorageMock.store['vb_user'] = JSON.stringify({ name: 'Test User' });
  localStorageMock.store['vb_bookings'] = JSON.stringify([{ id: 1 }]);
  localStorageMock.store['vb_saved'] = JSON.stringify([1, 2]);

  assert.strictEqual(env.restoreSession(), true, 'Should return true when session is successfully restored');
  assert.deepStrictEqual(env.getCurrentUser(), { name: 'Test User' });
  assert.deepStrictEqual(env.getMyBookings(), [{ id: 1 }]);
  assert.deepStrictEqual(env.getSavedIds(), [1, 2]);

  // Test 3: Invalid JSON for user (triggers catch block)
  localStorageMock.store['vb_user'] = '{invalid json}';
  assert.strictEqual(env.restoreSession(), false, 'Should return false when user JSON is invalid');

  // Test 4: Valid user, but invalid bookings (triggers catch block)
  localStorageMock.store['vb_user'] = JSON.stringify({ name: 'Test User' });
  localStorageMock.store['vb_bookings'] = '{invalid json}';
  assert.strictEqual(env.restoreSession(), false, 'Should return false when bookings JSON is invalid');

  console.log("All tests passed!");
}

runTest();
