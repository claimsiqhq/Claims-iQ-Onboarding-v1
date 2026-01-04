import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../../shared/types';

// Server-side Supabase configuration
// Uses the secret key for admin operations (token verification, user lookups)
// See: https://supabase.com/docs/guides/api/api-keys
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  console.error('Missing Supabase URL. Please set SUPABASE_URL environment variable');
}

if (!supabaseSecretKey && !supabasePublishableKey) {
  console.error('Missing Supabase key. Please set SUPABASE_SECRET_KEY or VITE_SUPABASE_PUBLISHABLE_KEY');
}

// Create the base Supabase client for server-side admin operations
// Uses secret key if available (bypasses RLS), falls back to publishable key
export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseSecretKey || supabasePublishableKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Create an authenticated Supabase client for a specific user
 * This uses the publishable key with the user's access token for RLS enforcement
 */
export function createAuthenticatedClient(accessToken: string): SupabaseClient<Database> {
  return createClient<Database>(
    supabaseUrl || '',
    supabasePublishableKey || supabaseSecretKey || '',
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
