import crypto from 'crypto';
import { supabase } from './supabase';
import { sendInviteEmail } from './email';

// Types
export interface InviteData {
  email: string;
  companyName?: string;
  invitedById: string;
  invitedByName: string;
  expirationDays?: number;
  metadata?: Record<string, unknown>;
}

export interface Invite {
  id: string;
  token: string;
  email: string;
  company_name: string | null;
  invited_by_id: string | null;
  status: 'pending' | 'used' | 'expired' | 'revoked';
  expires_at: string;
  used_at: string | null;
  project_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InviteValidation {
  valid: boolean;
  invite?: Invite;
  error?: string;
}

// Configuration
const DEFAULT_EXPIRATION_DAYS = parseInt(process.env.INVITE_EXPIRATION_DAYS || '7', 10);
const TOKEN_LENGTH = parseInt(process.env.INVITE_TOKEN_LENGTH || '32', 10);

/**
 * Generate a cryptographically secure random token
 */
export function generateInviteToken(length: number = TOKEN_LENGTH): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Create a new invite and send the invitation email
 */
export async function createInvite(data: InviteData): Promise<{
  success: boolean;
  invite?: Invite;
  error?: string;
}> {
  try {
    const token = generateInviteToken();
    const expirationDays = data.expirationDays || DEFAULT_EXPIRATION_DAYS;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Insert invite into database
    const { data: invite, error: insertError } = await supabase
      .from('invites')
      .insert({
        token,
        email: data.email.toLowerCase(),
        company_name: data.companyName || null,
        invited_by_id: data.invitedById,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create invite:', insertError);
      return { success: false, error: 'Failed to create invite' };
    }

    // Build invite URL
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const inviteUrl = `${appUrl}/onboarding/${token}`;

    // Send invite email
    const emailResult = await sendInviteEmail(
      data.email,
      {
        recipientName: data.companyName ? undefined : undefined, // Name not available for invites
        companyName: data.companyName,
        inviteUrl,
        expiresAt: expiresAt.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        invitedBy: data.invitedByName,
      },
      invite.id
    );

    if (!emailResult.success) {
      console.warn('Invite created but email failed to send:', data.email);
    }

    return { success: true, invite };
  } catch (error) {
    console.error('Create invite error:', error);
    return { success: false, error: 'Failed to create invite' };
  }
}

/**
 * Validate an invite token
 */
export async function validateInvite(token: string): Promise<InviteValidation> {
  try {
    // First, expire any old invites
    await expireOldInvites();

    // Look up the invite
    const { data: invite, error } = await supabase
      .from('invites')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return { valid: false, error: 'Invalid invite token' };
    }

    // Check status
    if (invite.status === 'used') {
      return { valid: false, error: 'This invite has already been used' };
    }

    if (invite.status === 'expired') {
      return { valid: false, error: 'This invite has expired' };
    }

    if (invite.status === 'revoked') {
      return { valid: false, error: 'This invite has been revoked' };
    }

    // Check expiration
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      // Mark as expired
      await supabase
        .from('invites')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', invite.id);

      return { valid: false, error: 'This invite has expired' };
    }

    return { valid: true, invite };
  } catch (error) {
    console.error('Validate invite error:', error);
    return { valid: false, error: 'Failed to validate invite' };
  }
}

/**
 * Mark an invite as used after successful onboarding submission
 */
export async function markInviteUsed(
  token: string,
  projectId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invites')
      .update({
        status: 'used',
        used_at: new Date().toISOString(),
        project_id: projectId,
        updated_at: new Date().toISOString(),
      })
      .eq('token', token)
      .eq('status', 'pending');

    if (error) {
      console.error('Failed to mark invite as used:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Mark invite used error:', error);
    return false;
  }
}

/**
 * Revoke an invite (admin action)
 */
export async function revokeInvite(inviteId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invites')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteId)
      .eq('status', 'pending');

    if (error) {
      console.error('Failed to revoke invite:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Revoke invite error:', error);
    return false;
  }
}

/**
 * Resend an invite email
 */
export async function resendInvite(
  inviteId: string,
  invitedByName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the invite
    const { data: invite, error: fetchError } = await supabase
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (fetchError || !invite) {
      return { success: false, error: 'Invite not found' };
    }

    if (invite.status !== 'pending') {
      return { success: false, error: 'Can only resend pending invites' };
    }

    // Check if expired
    const expiresAt = new Date(invite.expires_at);
    if (expiresAt < new Date()) {
      return { success: false, error: 'Invite has expired. Please create a new one.' };
    }

    // Build invite URL
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const inviteUrl = `${appUrl}/onboarding/${invite.token}`;

    // Send email
    const emailResult = await sendInviteEmail(
      invite.email,
      {
        companyName: invite.company_name || undefined,
        inviteUrl,
        expiresAt: expiresAt.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        invitedBy: invitedByName,
      },
      invite.id
    );

    if (!emailResult.success) {
      return { success: false, error: 'Failed to send email' };
    }

    return { success: true };
  } catch (error) {
    console.error('Resend invite error:', error);
    return { success: false, error: 'Failed to resend invite' };
  }
}

/**
 * Expire old invites (should be called periodically)
 */
export async function expireOldInvites(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('invites')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString())
      .select('id');

    if (error) {
      console.error('Failed to expire old invites:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Expire old invites error:', error);
    return 0;
  }
}

/**
 * Get all invites with optional filtering
 */
export async function getInvites(filters?: {
  status?: string;
  email?: string;
  limit?: number;
  offset?: number;
}): Promise<{ invites: Invite[]; total: number }> {
  try {
    let query = supabase
      .from('invites')
      .select('*, inviter:users!invited_by_id(id, username)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.email) {
      query = query.ilike('email', `%${filters.email}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Failed to get invites:', error);
      return { invites: [], total: 0 };
    }

    return { invites: data || [], total: count || 0 };
  } catch (error) {
    console.error('Get invites error:', error);
    return { invites: [], total: 0 };
  }
}

/**
 * Get a single invite by ID
 */
export async function getInviteById(inviteId: string): Promise<Invite | null> {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('id', inviteId)
      .single();

    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get invite error:', error);
    return null;
  }
}
