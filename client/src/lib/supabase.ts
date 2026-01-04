import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/types';

// Get Supabase URL and key from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

// Create the Supabase client for browser use
// Note: We're using cookies for auth tokens (set by the server), not Supabase's
// built-in session management. This is because we want the server to control auth.
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      // Don't auto-refresh since server handles tokens
      autoRefreshToken: false,
      // Don't persist session locally since we use HTTP-only cookies
      persistSession: false,
      // Don't detect session from URL since server handles callback
      detectSessionInUrl: false,
    },
  }
);

// Re-export for convenience
export type { Database };
