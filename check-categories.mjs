/**
 * Check actual category values in Supabase
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_CANDIDATES = [path.join(ROOT_DIR, '.env'), path.join(__dirname, '.env')];

ENV_CANDIDATES.forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkCategories() {
  try {
    const { data, error } = await supabase
      .from('nasa_research_questions')
      .select('category')
      .limit(10);
    
    if (error) throw error;
    
    console.log('Sample category values:');
    const uniqueCategories = [...new Set(data.map(r => r.category))];
    uniqueCategories.forEach((cat, i) => {
      console.log(`${i + 1}. "${cat}"`);
    });
    
    // Get all unique categories
    const { data: allData } = await supabase
      .from('nasa_research_questions')
      .select('category');
    
    const allCategories = [...new Set(allData.map(r => r.category))];
    console.log(`\nTotal unique categories: ${allCategories.length}`);
    allCategories.forEach((cat, i) => {
      console.log(`${i + 1}. "${cat}"`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCategories();
