/**
 * Supabase Integration Test Script (ES Module)
 * Tests the nasa_research_questions table and verifies all functionality.
 * Run with: node test-supabase.mjs
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_CANDIDATES = [path.join(ROOT_DIR, '.env'), path.join(__dirname, '.env')];

ENV_CANDIDATES.forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('=== Phase 1: Supabase Verification ===\n');

// Step 1: Verify credentials exist (without printing values)
console.log('1. Checking Supabase credentials...');
if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL not found in environment');
  process.exit(1);
}
if (!supabaseAnonKey) {
  console.error('❌ SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}
console.log('✅ Supabase credentials found');
console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`);
console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`);

// Step 2: Initialize Supabase client
console.log('\n2. Initializing Supabase client...');
const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Supabase client initialized');

// Step 3: Test connection
console.log('\n3. Testing Supabase connection...');
async function testConnection() {
  try {
    const { data, error } = await supabase.from('nasa_research_questions').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

// Step 4: Query table and count records
console.log('\n4. Querying nasa_research_questions table...');
async function queryTable() {
  try {
    const { data, error, count } = await supabase
      .from('nasa_research_questions')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (error) throw error;
    console.log(`✅ Table query successful`);
    console.log(`   Total records: ${count}`);
    return count;
  } catch (error) {
    console.error('❌ Table query failed:', error.message);
    return 0;
  }
}

// Step 5: Get sample records
console.log('\n5. Retrieving 3 sample records...');
async function getSampleRecords() {
  try {
    const { data, error } = await supabase
      .from('nasa_research_questions')
      .select('*')
      .order('question_id', { ascending: true })
      .limit(3);
    
    if (error) throw error;
    console.log(`✅ Retrieved ${data.length} sample records`);
    data.forEach((record, i) => {
      console.log(`\n   Record ${i + 1}:`);
      console.log(`   - question_id: ${record.question_id}`);
      console.log(`   - question: ${record.question.substring(0, 80)}...`);
      console.log(`   - category: ${record.category}`);
      console.log(`   - has key_findings: ${Array.isArray(record.key_findings) && record.key_findings.length > 0}`);
      console.log(`   - has sources: ${Array.isArray(record.sources) && record.sources.length > 0}`);
      console.log(`   - has related_questions: ${Array.isArray(record.related_questions) && record.related_questions.length > 0}`);
    });
    return data;
  } catch (error) {
    console.error('❌ Sample records query failed:', error.message);
    return [];
  }
}

// Step 6: Verify JSONB fields
console.log('\n6. Verifying JSONB fields...');
async function verifyJsonbFields() {
  try {
    const { data, error } = await supabase
      .from('nasa_research_questions')
      .select('question_id, key_findings, sources, related_questions')
      .not('key_findings', 'is', null)
      .not('sources', 'is', null)
      .not('related_questions', 'is', null)
      .limit(1);
    
    if (error) throw error;
    if (data.length === 0) {
      console.log('⚠️  No records with all JSONB fields populated');
      return false;
    }
    
    const record = data[0];
    console.log('✅ JSONB fields verified:');
    console.log(`   - key_findings type: ${typeof record.key_findings}, is array: ${Array.isArray(record.key_findings)}`);
    console.log(`   - sources type: ${typeof record.sources}, is array: ${Array.isArray(record.sources)}`);
    console.log(`   - related_questions type: ${typeof record.related_questions}, is array: ${Array.isArray(record.related_questions)}`);
    return true;
  } catch (error) {
    console.error('❌ JSONB verification failed:', error.message);
    return false;
  }
}

// Step 7: Test pagination
console.log('\n7. Testing pagination...');
async function testPagination() {
  try {
    const page1 = await supabase
      .from('nasa_research_questions')
      .select('*', { count: 'exact' })
      .range(0, 9)
      .order('question_id', { ascending: true });
    
    const page2 = await supabase
      .from('nasa_research_questions')
      .select('*', { count: 'exact' })
      .range(10, 19)
      .order('question_id', { ascending: true });
    
    if (page1.error) throw page1.error;
    if (page2.error) throw page2.error;
    
    console.log(`✅ Pagination working:`);
    console.log(`   Page 1: ${page1.data.length} records (IDs ${page1.data[0]?.question_id}-${page1.data[page1.data.length-1]?.question_id})`);
    console.log(`   Page 2: ${page2.data.length} records (IDs ${page2.data[0]?.question_id}-${page2.data[page2.data.length-1]?.question_id})`);
    console.log(`   Total count: ${page1.count}`);
    return true;
  } catch (error) {
    console.error('❌ Pagination test failed:', error.message);
    return false;
  }
}

// Step 8: Test category filtering
console.log('\n8. Testing category filtering...');
async function testCategoryFilter() {
  try {
    const { data, error, count } = await supabase
      .from('nasa_research_questions')
      .select('*', { count: 'exact' })
      .eq('category', 1)
      .limit(5);
    
    if (error) throw error;
    console.log(`✅ Category filter working:`);
    console.log(`   Category 1 records: ${count}`);
    console.log(`   Sample IDs: ${data.map(r => r.question_id).join(', ')}`);
    return true;
  } catch (error) {
    console.error('❌ Category filter test failed:', error.message);
    return false;
  }
}

// Step 9: Test full-text search
console.log('\n9. Testing full-text search...');
async function testSearch() {
  try {
    const { data, error, count } = await supabase
      .from('nasa_research_questions')
      .select('*', { count: 'exact' })
      .or('question.ilike.%moon%,answer_material.ilike.%moon%,scientific_background.ilike.%moon%')
      .limit(5);
    
    if (error) throw error;
    console.log(`✅ Full-text search working:`);
    console.log(`   Search "moon" results: ${count}`);
    console.log(`   Sample questions:`);
    data.forEach((r, i) => {
      console.log(`   ${i + 1}. Q${r.question_id}: ${r.question.substring(0, 60)}...`);
    });
    return true;
  } catch (error) {
    console.error('❌ Search test failed:', error.message);
    return false;
  }
}

// Step 10: Test individual question retrieval
console.log('\n10. Testing individual question retrieval...');
async function testIndividualRetrieval() {
  try {
    const { data, error } = await supabase
      .from('nasa_research_questions')
      .select('*')
      .eq('question_id', 1)
      .single();
    
    if (error) throw error;
    console.log(`✅ Individual retrieval working:`);
    console.log(`   Question ID: ${data.question_id}`);
    console.log(`   Question: ${data.question.substring(0, 80)}...`);
    console.log(`   Category: ${data.category}`);
    return true;
  } catch (error) {
    console.error('❌ Individual retrieval test failed:', error.message);
    return false;
  }
}

// Step 11: Verify RLS and read permissions
console.log('\n11. Verifying RLS and read permissions...');
async function verifyRLS() {
  try {
    // Try to read without authentication (should work if RLS allows public read)
    const { data, error } = await supabase
      .from('nasa_research_questions')
      .select('question_id')
      .limit(1);
    
    if (error) {
      if (error.code === '42501' || error.message.includes('permission denied')) {
        console.log('⚠️  RLS is enabled - public read may be restricted');
        console.log('   Error:', error.message);
        return false;
      }
      throw error;
    }
    
    console.log('✅ RLS verification:');
    console.log('   Public read access: ALLOWED');
    console.log('   Can read question_id:', data.length > 0 ? 'YES' : 'NO');
    return true;
  } catch (error) {
    console.error('❌ RLS verification failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  const connectionOk = await testConnection();
  if (!connectionOk) {
    console.error('\n❌ Cannot proceed - Supabase connection failed');
    process.exit(1);
  }

  const count = await queryTable();
  await getSampleRecords();
  await verifyJsonbFields();
  await testPagination();
  await testCategoryFilter();
  await testSearch();
  await testIndividualRetrieval();
  await verifyRLS();

  console.log('\n=== Phase 1 Complete ===');
  console.log(`Total records found: ${count}`);
  console.log('Expected: 340');
  console.log(count === 340 ? '✅ Record count matches!' : '❌ Record count mismatch!');
}

runAllTests().catch(console.error);
