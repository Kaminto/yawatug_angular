// Production-ready Supabase client with environment variables
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Use environment variables for production
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://lqmcokwbqnjuufcvodos.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxbWNva3dicW5qdXVmY3ZvZG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNTA2ODksImV4cCI6MjA2MjgyNjY4OX0.NGjUtUJJaChBRTBsHMCV_20ZZNp1f9iB0RHRM65Dksw";

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'x-application-name': 'Yawatu Minerals App'
    }
  }
});