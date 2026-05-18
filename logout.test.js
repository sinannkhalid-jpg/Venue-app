const fs = require('fs');
const assert = require('assert');

// 1. Read index.html and extract the doLogout function
const html = fs.readFileSync('index.html', 'utf-8');
const match = html.match(/function doLogout\(\) \{([\s\S]*?)\n\}/);

if (!match) {
    console.error("Could not find doLogout function in index.html");
    process.exit(1);
}

const doLogoutBody = match[1];

// Helper to run the test in a mocked environment
function runDoLogout(mockEnv) {
    // We use "new Function" to evaluate the function body within the context of our mock environment
    const names = Object.keys(mockEnv);
    const args = Object.values(mockEnv);

    // We need to allow the function to mutate variables like currentUser, savedIds, myBookings.
    // If we just pass them as arguments, reassigning them won't affect the outer mockEnv.
    // So we use a 'with' block.
    const fn = new Function('env', `
        with (env) {
            ${doLogoutBody}
        }
    `);

    fn(mockEnv);
}

function runTests() {
    console.log("Running tests for doLogout...");

    // Test 1: Happy Path
    let removedItems = [];
    let domElements = {
        'main-app': { style: { display: 'block' } },
        'bottom-nav': { classList: { remove: (cls) => domElements['bottom-nav'].classes.delete(cls) }, classes: new Set(['visible']) },
        'auth-login': { classList: { add: (cls) => domElements['auth-login'].classes.add(cls) }, classes: new Set() }
    };

    let authScreens = [
        { classList: { remove: (cls) => authScreens[0].classes.delete(cls) }, classes: new Set(['active']) },
        { classList: { remove: (cls) => authScreens[1].classes.delete(cls) }, classes: new Set(['active']) }
    ];

    let mockEnv = {
        localStorage: {
            removeItem: (key) => removedItems.push(key)
        },
        currentUser: { name: 'testuser' },
        savedIds: [1, 2, 3],
        myBookings: [{ id: 1 }],
        R: (id) => domElements[id],
        document: {
            querySelectorAll: (selector) => {
                if (selector === '.auth-screen') return authScreens;
                return [];
            }
        }
    };

    runDoLogout(mockEnv);

    assert.deepStrictEqual(removedItems, ['vb_user', 'vb_bookings', 'vb_saved'], "localStorage keys not removed correctly");
    assert.strictEqual(mockEnv.currentUser, null, "currentUser not reset to null");
    assert.deepStrictEqual(mockEnv.savedIds, [], "savedIds not reset to empty array");
    assert.deepStrictEqual(mockEnv.myBookings, [], "myBookings not reset to empty array");
    assert.strictEqual(domElements['main-app'].style.display, 'none', "main-app display not set to none");
    assert.strictEqual(domElements['bottom-nav'].classes.has('visible'), false, "bottom-nav visible class not removed");
    assert.strictEqual(authScreens[0].classes.has('active'), false, "auth-screen active class not removed");
    assert.strictEqual(authScreens[1].classes.has('active'), false, "auth-screen active class not removed");
    assert.strictEqual(domElements['auth-login'].classes.has('active'), true, "auth-login active class not added");

    console.log("Test 1 passed: Happy path");

    // Test 2: Exception Path (localStorage throws)
    removedItems = [];
    let errorThrown = false;
    let mockEnvError = {
        localStorage: {
            removeItem: (key) => { throw new Error("Mock error"); }
        },
        currentUser: { name: 'testuser' },
        savedIds: [1],
        myBookings: [1],
        R: (id) => domElements[id],
        document: {
            querySelectorAll: (selector) => {
                if (selector === '.auth-screen') return authScreens;
                return [];
            }
        }
    };

    try {
        runDoLogout(mockEnvError);
    } catch (e) {
        errorThrown = true;
    }

    assert.strictEqual(errorThrown, false, "doLogout should catch localStorage exceptions");
    assert.strictEqual(mockEnvError.currentUser, null, "currentUser not reset to null after exception");

    console.log("Test 2 passed: Exception path");
    console.log("All tests passed!");
}

runTests();
