const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

let tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  let passed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ ${name}`);
      console.error(err.stack);
    }
  }
  console.log(`\n${passed}/${tests.length} tests passed.`);
  if (passed !== tests.length) process.exit(1);
}

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
const scriptContent = scriptMatch[1];

function createSandbox() {
  const mockElements = {};

  const documentMock = {
    getElementById: (id) => {
      if (!mockElements[id]) {
        mockElements[id] = {
          value: '',
          classList: {
            classes: new Set(),
            add: function(c) { this.classes.add(c); },
            remove: function(c) { this.classes.delete(c); },
            contains: function(c) { return this.classes.has(c); }
          },
          style: {}
        };
      }
      return mockElements[id];
    },
    querySelectorAll: () => [],
    querySelector: () => null
  };

  const sandbox = {
    document: documentMock,
    window: { addEventListener: () => {} },
    localStorage: {
      store: {},
      setItem: function(k, v) { this.store[k] = String(v); },
      getItem: function(k) { return this.store[k] || null; },
      removeItem: function(k) { delete this.store[k]; }
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    console: console,
    mockElements: mockElements,
    toastArgs: null,
    setupAppCalled: false
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptContent, sandbox);

  // Override specific functions in the sandbox context
  vm.runInContext(`
    showToast = function(msg, type) {
      toastArgs = [msg, type];
    };
    setupApp = function() {
      setupAppCalled = true;
    };
  `, sandbox);

  return sandbox;
}

test('doLogin - happy path with correct credentials', () => {
  const env = createSandbox();

  // Set up inputs
  env.mockElements['l-email'] = {
    value: '  customer@demo.com  ', // Test trim()
    classList: { remove: () => {} }
  };
  env.mockElements['l-pass'] = {
    value: 'demo123',
    classList: { remove: () => {} }
  };

  // Create mock elements that doLogin interacts with
  env.mockElements['auth-login'] = {
    classList: {
      classes: new Set(['active']),
      remove: function(c) { this.classes.delete(c); },
      add: function(c) { this.classes.add(c); }
    }
  };
  env.mockElements['main-app'] = { style: { display: 'none' } };
  env.mockElements['bottom-nav'] = {
    classList: {
      classes: new Set(),
      remove: function(c) { this.classes.delete(c); },
      add: function(c) { this.classes.add(c); }
    }
  };

  // Run doLogin
  env.doLogin();

  // Convert the VM object to a normal JS object before assertion
  const currentUser = JSON.parse(JSON.stringify(env.currentUser));

  // Assert currentUser is set correctly
  assert.deepStrictEqual(currentUser, {
    email: 'customer@demo.com',
    name: 'Alex Kumar',
    role: 'customer',
    initials: 'AK'
  });

  // Assert localStorage was updated
  const storedUser = JSON.parse(env.localStorage.store['vb_user']);
  assert.deepStrictEqual(storedUser, currentUser);
  assert.ok(env.localStorage.store['vb_bookings']);
  assert.ok(env.localStorage.store['vb_saved']);

  // Assert DOM updates
  assert.strictEqual(env.mockElements['auth-login'].classList.classes.has('active'), false);
  assert.strictEqual(env.mockElements['main-app'].style.display, 'block');
  assert.strictEqual(env.mockElements['bottom-nav'].classList.classes.has('visible'), true);

  // Assert setupApp was called
  assert.strictEqual(env.setupAppCalled, true);

  // Assert no toast error was shown
  assert.strictEqual(env.toastArgs, null);
});

test('doLogin - incorrect password', () => {
  const env = createSandbox();

  env.mockElements['l-email'] = { value: 'customer@demo.com' };
  env.mockElements['l-pass'] = { value: 'wrongpass' };

  env.doLogin();

  assert.strictEqual(env.currentUser, null);
  const toastArgs = JSON.parse(JSON.stringify(env.toastArgs));
  assert.deepStrictEqual(toastArgs, ['Invalid email or password', 'err']);
  assert.strictEqual(env.setupAppCalled, false);
});

test('doLogin - non-existent user', () => {
  const env = createSandbox();

  env.mockElements['l-email'] = { value: 'nobody@demo.com' };
  env.mockElements['l-pass'] = { value: 'demo123' };

  env.doLogin();

  assert.strictEqual(env.currentUser, null);
  const toastArgs = JSON.parse(JSON.stringify(env.toastArgs));
  assert.deepStrictEqual(toastArgs, ['Invalid email or password', 'err']);
  assert.strictEqual(env.setupAppCalled, false);
});

runTests();
