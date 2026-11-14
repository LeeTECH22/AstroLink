/**
 * API Endpoint Test Script
 * Tests all Supabase-powered NASA research endpoints.
 * Run with: node test-api.mjs
 */

const BASE_URL = 'http://localhost:5001/api';

async function testEndpoint(name, url, options = {}) {
  console.log(`\n=== Testing: ${name} ===`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2).substring(0, 500));
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('=== Phase 2: API Endpoint Testing ===\n');
  
  // Test 1: GET /api/research/questions (all questions)
  await testEndpoint(
    'Get all questions (page 1, limit 5)',
    `${BASE_URL}/research/questions?page=1&limit=5`
  );
  
  // Test 2: GET /api/research/questions with category filter
  await testEndpoint(
    'Get questions with category filter',
    `${BASE_URL}/research/questions?page=1&limit=5&category=1`
  );
  
  // Test 3: GET /api/research/questions/:id (valid ID)
  await testEndpoint(
    'Get question by ID (valid)',
    `${BASE_URL}/research/questions/1`
  );
  
  // Test 4: GET /api/research/questions/:id (invalid ID)
  await testEndpoint(
    'Get question by ID (invalid - 999)',
    `${BASE_URL}/research/questions/999`
  );
  
  // Test 5: GET /api/research/questions/search
  await testEndpoint(
    'Search questions',
    `${BASE_URL}/research/questions/search?q=moon&page=1&limit=5`
  );
  
  // Test 6: GET /api/research/questions/search (no results)
  await testEndpoint(
    'Search questions (no results)',
    `${BASE_URL}/research/questions/search?q=xyznonexistent&page=1&limit=5`
  );
  
  // Test 7: GET /api/research/questions (invalid page)
  await testEndpoint(
    'Get questions (invalid page)',
    `${BASE_URL}/research/questions?page=0&limit=5`
  );
  
  // Test 8: GET /api/research/questions (invalid limit)
  await testEndpoint(
    'Get questions (invalid limit)',
    `${BASE_URL}/research/questions?page=1&limit=999`
  );
  
  console.log('\n=== Phase 2 Complete ===');
}

runAllTests().catch(console.error);
