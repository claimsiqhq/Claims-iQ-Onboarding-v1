import { createClient } from '@supabase/supabase-js';
import type { Database } from '@shared/types';

// Get Supabase URL and publishable key from Vite environment variables
// See: https://supabase.com/docs/guides/api/api-keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

// Create the Supabase client for browser use
// Note: We're using cookies for auth tokens (set by the server), not Supabase's
// built-in session management. This is because we want the server to control auth.
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabasePublishableKey || '',
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
