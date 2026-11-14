import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. NASA research features will be disabled.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

export interface NasaResearchQuestion {
  question_id: number
  question: string
  category: number
  answer_material: string | null
  scientific_background: string | null
  key_findings: string[] | null
  sources: string[] | null
  related_questions: number[] | null
  research_status: string | null
  created_at: string
  updated_at: string
}

export interface NasaChatSession {
  id: string
  user_id: string | null
  title: string
  created_at: string
  updated_at: string
}

export interface NasaChatMessage {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  message: string
  question_id: number | null
  matched_sources: string[] | null
  created_at: string
}
