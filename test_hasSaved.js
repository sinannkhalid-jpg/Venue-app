const fs = require('fs');

const content = fs.readFileSync('index.html', 'utf8');

// Extract hasSaved function
// Matches "function hasSaved(...) { ... }" including nested braces
const hasSavedMatch = content.match(/function\s+hasSaved\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);

if (!hasSavedMatch) {
  console.error('Could not find hasSaved function in index.html');
  process.exit(1);
}

const hasSavedCode = hasSavedMatch[0];

const testHasSaved = (id, currentSavedIds) => {
  // Use a wrapper that defines savedIds in its scope
  const script = `
    const savedIds = ${JSON.stringify(currentSavedIds)};
    ${hasSavedCode}
    return hasSaved(id);
  `;
  const fn = new Function('id', script);
  return fn(id);
};

// Test Cases
const runTests = () => {
  console.log('Running tests for hasSaved...');
  let failed = false;

  const assert = (condition, message) => {
    if (!condition) {
      console.error('❌ ' + message);
      failed = true;
    } else {
      console.log('✅ ' + message.split(':')[0] + ' Passed');
    }
  };

  // Test 1: ID exists
  assert(testHasSaved(1, [1, 2, 3]) === true, 'Test 1: Should return true when ID exists');

  // Test 2: ID does not exist
  assert(testHasSaved(4, [1, 2, 3]) === false, 'Test 2: Should return false when ID does not exist');

  // Test 3: savedIds is empty
  assert(testHasSaved(1, []) === false, 'Test 3: Should return false when savedIds is empty');

  // Test 4: Strict equality (number vs string)
  assert(testHasSaved('1', [1, 2, 3]) === false, 'Test 4: Should return false for string "1" if savedIds has number 1');

  // Test 5: ID is null
  assert(testHasSaved(null, [1, 2, 3]) === false, 'Test 5: Should return false when ID is null');

  // Test 6: ID is undefined
  assert(testHasSaved(undefined, [1, 2, 3]) === false, 'Test 6: Should return false when ID is undefined');

  if (failed) {
    console.log('\nSome tests FAILED.');
    process.exit(1);
  } else {
    console.log('\nAll tests PASSED.');
  }
};

runTests();
