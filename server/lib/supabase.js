'use strict';

/**
 * Supabase client for backend NASA research data access.
 *
 * This module provides a server-side Supabase client for accessing the
 * nasa_research_questions table and managing conversation history.
 *
 * Environment variables:
 *   SUPABASE_URL - Supabase project URL
 *   SUPABASE_ANON_KEY - Supabase anonymous key (safe for backend use)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase client initialized');
} else {
  console.warn('Supabase credentials not configured. NASA research endpoints will be unavailable.');
}

module.exports = { supabase };
