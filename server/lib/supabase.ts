import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../../shared/types';

// Server-side Supabase client
// Uses the anon key - all RLS policies are enforced
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Create the base Supabase client for server-side operations
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Create an authenticated Supabase client for a specific user
 * This should be used when making requests on behalf of an authenticated user
 */
export function createAuthenticatedClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(
    supabaseUrl || '',
    supabaseAnonKey || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
}

/**
 * Verify a Supabase access token and return the user
 */
export async function verifyToken(accessToken: string): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }

  return user;
}

/**
 * Get user type (claims_iq_staff or portal_user)
 */
export async function getUserType(
  client: SupabaseClient<Database>,
  userId: string
): Promise<'claims_iq_staff' | 'portal_user' | null> {
  // Check if user is Claims IQ staff
  const { data: staffUser } = await client
    .from('users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (staffUser) {
    return 'claims_iq_staff';
  }

  // Check if user is a portal user
  const { data: portalUser } = await client
    .from('portal_users')
    .select('id')
    .eq('auth_user_id', userId)
    .single();

  if (portalUser) {
    return 'portal_user';
  }

  return null;
}

/**
 * Get company ID for a portal user
 */
export async function getPortalUserCompanyId(
  client: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data: portalUser } = await client
    .from('portal_users')
    .select('company_id')
    .eq('auth_user_id', userId)
    .single();

  return portalUser?.company_id || null;
}
