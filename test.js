const fs = require('fs');

const htmlContent = fs.readFileSync('index.html', 'utf-8');

// Extract doSearch
const doSearchMatch = htmlContent.match(/function doSearch\(q\) \{([\s\S]*?)\n\}/);
if (!doSearchMatch) {
    console.error('Could not find doSearch function in index.html');
    process.exit(1);
}

const doSearchBody = doSearchMatch[1];
const doSearch = new Function('q', doSearchBody);

// Mocks
global.VENUES = [
    {id: 1, name: 'Venue A', city: 'City X'},
    {id: 2, name: 'Venue B', city: 'City Y'},
    {id: 3, name: 'Place C', city: 'City X'}
];

let rCountEl = { textContent: '' };
let renderedId = null;
let renderedList = null;

global.R = function(id) {
    if (id === 'search-count') return rCountEl;
    return null;
};

global.renderVenueList = function(id, list) {
    renderedId = id;
    renderedList = list;
};

function runTest(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
    } catch (e) {
        console.error(`❌ ${name}`);
        console.error(e);
        process.exit(1);
    }
}

function resetMocks() {
    rCountEl.textContent = '';
    renderedId = null;
    renderedList = null;
}

console.log('Running tests for doSearch...\n');

runTest('Empty query returns all venues', () => {
    resetMocks();
    doSearch('');
    if (renderedList.length !== 3) throw new Error(`Expected 3 venues, got ${renderedList.length}`);
    if (rCountEl.textContent !== 'All venues') throw new Error(`Expected "All venues", got "${rCountEl.textContent}"`);
});

runTest('Null/undefined query returns all venues', () => {
    resetMocks();
    doSearch(null);
    if (renderedList.length !== 3) throw new Error(`Expected 3 venues, got ${renderedList.length}`);
});

runTest('Query matching venue name (case-insensitive)', () => {
    resetMocks();
    doSearch('venue');
    if (renderedList.length !== 2) throw new Error(`Expected 2 venues, got ${renderedList.length}`);
    if (renderedList[0].name !== 'Venue A' || renderedList[1].name !== 'Venue B') throw new Error('Wrong venues returned');
    if (rCountEl.textContent !== '2 results for "venue"') throw new Error(`Expected "2 results for \\"venue\\"", got "${rCountEl.textContent}"`);
});

runTest('Query matching city (case-insensitive)', () => {
    resetMocks();
    doSearch('city x');
    if (renderedList.length !== 2) throw new Error(`Expected 2 venues, got ${renderedList.length}`);
    if (renderedList[0].id !== 1 || renderedList[1].id !== 3) throw new Error('Wrong venues returned');
    if (rCountEl.textContent !== '2 results for "city x"') throw new Error(`Expected "2 results for \\"city x\\"", got "${rCountEl.textContent}"`);
});

runTest('Query with exactly 1 result', () => {
    resetMocks();
    doSearch('City Y');
    if (renderedList.length !== 1) throw new Error(`Expected 1 venue, got ${renderedList.length}`);
    if (rCountEl.textContent !== '1 result for "City Y"') throw new Error(`Expected "1 result for \\"City Y\\"", got "${rCountEl.textContent}"`);
});

runTest('Query with no matches', () => {
    resetMocks();
    doSearch('nonexistent');
    if (renderedList.length !== 0) throw new Error(`Expected 0 venues, got ${renderedList.length}`);
    if (rCountEl.textContent !== '0 results for "nonexistent"') throw new Error(`Expected "0 results for \\"nonexistent\\"", got "${rCountEl.textContent}"`);
});

console.log('\nAll tests passed successfully! 🚀');
