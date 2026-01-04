import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { supabase } from './supabase';
import { sendPasswordResetEmail } from './email';

// Configuration
const SALT_ROUNDS = 12;
const RESET_TOKEN_LENGTH = 32;
const RESET_TOKEN_EXPIRATION_HOURS = parseInt(
  process.env.PASSWORD_RESET_EXPIRATION_HOURS || '24',
  10
);

// Password validation rules
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULES = {
  minLength: PASSWORD_MIN_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
  } else {
    score += 1;
  }

  // Check for uppercase
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  // Check for lowercase
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  // Check for number
  if (PASSWORD_RULES.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  // Check for special character
  if (PASSWORD_RULES.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  // Bonus points for length
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  return {
    valid: errors.length === 0,
    errors,
    score: Math.min(score, 5), // Max score of 5
  };
}

/**
 * Generate a random temporary password
 */
export function generateTemporaryPassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';

  // Ensure we have at least one of each required character type
  password += 'A'; // uppercase
  password += 'a'; // lowercase
  password += '1'; // number
  password += '!'; // special

  // Fill the rest randomly
  const bytes = crypto.randomBytes(length - 4);
  for (let i = 0; i < length - 4; i++) {
    password += charset[bytes[i] % charset.length];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Generate a secure reset token
 */
function generateResetToken(): string {
  return crypto.randomBytes(RESET_TOKEN_LENGTH).toString('hex');
}

/**
 * Create a password reset token and send email
 */
export async function createPasswordResetToken(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the portal user by email
    const { data: portalUser, error: userError } = await supabase
      .from('portal_users')
      .select('id, contact:contacts!inner(first_name, last_name, email)')
      .eq('contacts.email', email.toLowerCase())
      .single();

    if (userError || !portalUser) {
      // Don't reveal whether email exists for security
      return { success: true };
    }

    // Generate token
    const token = generateResetToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRATION_HOURS);

    // Delete any existing tokens for this user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', portalUser.id);

    // Create new token
    const { error: insertError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: portalUser.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Failed to create reset token:', insertError);
      return { success: false, error: 'Failed to create reset token' };
    }

    // Build reset URL
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    const resetUrl = `${appUrl}/reset-password/${token}`;

    // Get contact info
    const contact = Array.isArray(portalUser.contact)
      ? portalUser.contact[0]
      : portalUser.contact;

    // Send email
    await sendPasswordResetEmail(email, {
      recipientName: contact ? `${contact.first_name} ${contact.last_name}` : undefined,
      resetUrl,
      expiresIn: `${RESET_TOKEN_EXPIRATION_HOURS} hours`,
    });

    return { success: true };
  } catch (error) {
    console.error('Create password reset token error:', error);
    return { success: false, error: 'Failed to process request' };
  }
}

/**
 * Validate a password reset token
 */
export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; userId?: string; error?: string }> {
  try {
    const { data: resetToken, error } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .single();

    if (error || !resetToken) {
      return { valid: false, error: 'Invalid reset token' };
    }

    // Check if already used
    if (resetToken.used_at) {
      return { valid: false, error: 'This reset link has already been used' };
    }

    // Check expiration
    const expiresAt = new Date(resetToken.expires_at);
    if (expiresAt < new Date()) {
      return { valid: false, error: 'This reset link has expired' };
    }

    return { valid: true, userId: resetToken.user_id };
  } catch (error) {
    console.error('Validate reset token error:', error);
    return { valid: false, error: 'Failed to validate token' };
  }
}

/**
 * Reset password using token
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate token first
    const validation = await validateResetToken(token);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return { success: false, error: passwordValidation.errors[0] };
    }

    // Hash the new password
    const passwordHash = await hashPassword(newPassword);

    // Update the portal user's password
    const { error: updateError } = await supabase
      .from('portal_users')
      .update({
        password_hash: passwordHash,
        password_set_at: new Date().toISOString(),
        auth_method: 'both', // Enable both password and magic link
      })
      .eq('id', validation.userId);

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return { success: false, error: 'Failed to update password' };
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}

/**
 * Set password for a portal user (after magic link auth)
 */
export async function setUserPassword(
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate password strength
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] };
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Update the portal user
    const { error } = await supabase
      .from('portal_users')
      .update({
        password_hash: passwordHash,
        password_set_at: new Date().toISOString(),
        auth_method: 'both', // Enable both password and magic link
      })
      .eq('id', userId);

    if (error) {
      console.error('Failed to set password:', error);
      return { success: false, error: 'Failed to set password' };
    }

    return { success: true };
  } catch (error) {
    console.error('Set password error:', error);
    return { success: false, error: 'Failed to set password' };
  }
}

/**
 * Verify user password for login
 */
export async function verifyUserPassword(
  email: string,
  password: string
): Promise<{ success: boolean; userId?: string; portalUserId?: string; error?: string }> {
  try {
    // Find the portal user by email
    const { data: portalUser, error } = await supabase
      .from('portal_users')
      .select('id, auth_user_id, password_hash, auth_method, contact:contacts!inner(email)')
      .eq('contacts.email', email.toLowerCase())
      .single();

    if (error || !portalUser) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Check if password auth is enabled
    if (!portalUser.password_hash) {
      return { success: false, error: 'Password login not enabled. Please use magic link.' };
    }

    // Verify password
    const isValid = await verifyPassword(password, portalUser.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    return {
      success: true,
      userId: portalUser.auth_user_id,
      portalUserId: portalUser.id,
    };
  } catch (error) {
    console.error('Verify user password error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}
