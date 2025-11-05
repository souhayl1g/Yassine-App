#!/usr/bin/env node

/**
 * Test script for fuzzy search functionality
 * Run with: node test-fuzzy-search.js
 */

const Fuse = require('fuse.js');

// Test data simulating tickets/batches
const testData = [
  {
    id: 1,
    clientName: 'أحمد محمد علي',
    ticketNumber: 'T001-2024',
    notes: 'زيتون ممتاز من المزرعة الجنوبية'
  },
  {
    id: 2,
    clientName: 'فاطمة الزهراء',
    ticketNumber: 'T002-2024',
    notes: 'طلب عاجل - عميل مهم'
  },
  {
    id: 3,
    clientName: 'محمد أحمد الصالح',
    ticketNumber: 'T003-2024',
    notes: 'زيتون عضوي'
  },
  {
    id: 4,
    clientName: 'Sara Johnson',
    ticketNumber: 'T004-2024',
    notes: 'English client - premium olives'
  }
];

// Test fuzzy search configuration
const fuseOptions = {
  keys: [
    { name: 'id', weight: 0.3 },
    { name: 'clientName', weight: 0.4 },
    { name: 'ticketNumber', weight: 0.2 },
    { name: 'notes', weight: 0.1 }
  ],
  threshold: 0.4,
  includeScore: true,
  includeMatches: true,
  minMatchCharLength: 2
};

function testFuzzySearch(query, expectedResults = null) {
  console.log(`\n🔍 Testing search for: "${query}"`);
  console.log('─'.repeat(50));
  
  const fuse = new Fuse(testData, fuseOptions);
  const results = fuse.search(query);
  
  if (results.length === 0) {
    console.log('❌ No results found');
    return;
  }
  
  results.forEach((result, index) => {
    const { item, score, matches } = result;
    console.log(`${index + 1}. ${item.clientName} (Score: ${score?.toFixed(3)})`);
    console.log(`   ID: ${item.id}, Ticket: ${item.ticketNumber}`);
    
    if (matches && matches.length > 0) {
      console.log(`   Matches:`);
      matches.forEach(match => {
        console.log(`     - ${match.key}: "${match.value}"`);
      });
    }
    console.log('');
  });
}

// Run tests
console.log('🧪 Fuzzy Search Test Suite');
console.log('='.repeat(50));

// Test exact matches
testFuzzySearch('أحمد');
testFuzzySearch('محمد');
testFuzzySearch('T001');

// Test partial matches
testFuzzySearch('احمد'); // Missing diacritics
testFuzzySearch('فاطمه'); // Wrong ending
testFuzzySearch('ahmed'); // Transliteration

// Test typos
testFuzzySearch('احممد'); // Extra letter
testFuzzySearch('فطمة'); // Missing letter
testFuzzySearch('T01'); // Partial ticket number

// Test combinations
testFuzzySearch('محمد أحمد');
testFuzzySearch('زيتون');

console.log('\n✅ Fuzzy search tests completed!');
