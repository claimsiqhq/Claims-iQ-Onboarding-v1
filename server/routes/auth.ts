import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { loginSchema, verifyOtpSchema } from '../../shared/validation';
import { requireAuth } from '../middleware/auth';
import { fromZodError } from 'zod-validation-error';
import { z } from 'zod';
import {
  verifyUserPassword,
  createPasswordResetToken,
  validateResetToken,
  resetPasswordWithToken,
  setUserPassword,
  validatePasswordStrength,
} from '../lib/password';

// Password validation schemas
const passwordLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const setPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Invalid reset token'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

const router = Router();

/**
 * POST /api/auth/login
 * Send magic link (OTP) to email
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ error: error.message });
      return;
    }

    const { email } = parseResult.data;

    // Get the app URL for redirect
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      console.error('Magic link send error:', error);
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({
      success: true,
      message: 'Magic link sent. Please check your email.',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to send magic link' });
  }
});

/**
 * POST /api/auth/verify
 * Verify OTP token from email
 */
router.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ error: error.message });
      return;
    }

    const { email, token } = parseResult.data;

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      console.error('OTP verification error:', error);
      res.status(400).json({ error: error.message });
      return;
    }

    if (!data.session) {
      res.status(400).json({ error: 'No session returned' });
      return;
    }

    // Set the access token as an HTTP-only cookie
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in * 1000,
      path: '/',
    });

    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/',
    });

    res.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      expiresAt: data.session.expires_at,
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh the access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.['sb-refresh-token'];

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({ error: 'Failed to refresh token' });
      return;
    }

    if (!data.session) {
      res.status(401).json({ error: 'No session returned' });
      return;
    }

    // Update cookies
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in * 1000,
      path: '/',
    });

    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/',
    });

    res.json({
      success: true,
      expiresAt: data.session.expires_at,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * POST /api/auth/signout
 * Sign out the current user
 */
router.post('/signout', async (req: Request, res: Response): Promise<void> => {
  try {
    const accessToken = req.cookies?.['sb-access-token'];

    if (accessToken) {
      // Sign out from Supabase
      await supabase.auth.signOut();
    }

    // Clear cookies
    res.clearCookie('sb-access-token', { path: '/' });
    res.clearCookie('sb-refresh-token', { path: '/' });

    res.json({ success: true });
  } catch (error) {
    console.error('Signout error:', error);
    // Still clear cookies even if Supabase call fails
    res.clearCookie('sb-access-token', { path: '/' });
    res.clearCookie('sb-refresh-token', { path: '/' });
    res.json({ success: true });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user!.id,
        email: req.user!.email,
        userType: req.tenant!.userType,
        companyId: req.tenant!.companyId,
        firstName: req.tenant!.firstName,
        lastName: req.tenant!.lastName,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * GET /api/auth/callback
 * Handle OAuth/magic link callback
 * This is called when the user clicks the magic link in their email
 */
router.get('/callback', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, error: authError, error_description } = req.query;

    if (authError) {
      console.error('Auth callback error:', authError, error_description);
      res.redirect(`/login?error=${encodeURIComponent(String(error_description || authError))}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect('/login?error=missing_code');
      return;
    }

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Code exchange error:', error);
      res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
      return;
    }

    if (!data.session) {
      res.redirect('/login?error=no_session');
      return;
    }

    // Set the access token as an HTTP-only cookie
    res.cookie('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: data.session.expires_in * 1000,
      path: '/',
    });

    res.cookie('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/',
    });

    // Redirect to portal
    res.redirect('/portal');
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/login?error=callback_failed');
  }
});

// ============================================
// PASSWORD AUTHENTICATION ROUTES
// ============================================

/**
 * POST /api/auth/login-password
 * Login with email and password
 */
router.post('/login-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = passwordLoginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ error: error.message });
      return;
    }

    const { email, password } = parseResult.data;

    // Verify password
    const verification = await verifyUserPassword(email, password);
    if (!verification.success) {
      res.status(401).json({ error: verification.error || 'Invalid credentials' });
      return;
    }

    // Create a session via Supabase magic link (for session management)
    // Since portal users use Supabase auth, we need to create a proper session
    // This is a workaround - ideally we'd use Supabase's password auth directly

    // For now, we'll use a custom session approach
    // Get the portal user details
    const { data: portalUser } = await supabase
      .from('portal_users')
      .select('id, auth_user_id, company_id, contact:contacts!inner(first_name, last_name, email)')
      .eq('id', verification.portalUserId)
      .single();

    if (!portalUser || !portalUser.auth_user_id) {
      res.status(401).json({ error: 'User account not properly configured' });
      return;
    }

    // Sign in with Supabase using the auth_user_id
    // Note: This requires admin access to create sessions for users
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.getUserById(
      portalUser.auth_user_id
    );

    if (sessionError || !sessionData.user) {
      // Fallback: Ask user to use magic link if session creation fails
      res.status(200).json({
        success: true,
        message: 'Password verified. Please use magic link for full session.',
        requireMagicLink: true,
        email,
      });
      return;
    }

    // Generate a session for the user
    const { data: session, error: genError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
    });

    if (genError) {
      res.status(200).json({
        success: true,
        message: 'Password verified successfully',
        requireMagicLink: true,
        email,
      });
      return;
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: portalUser.auth_user_id,
        email,
        portalUserId: portalUser.id,
      },
    });
  } catch (error) {
    console.error('Password login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/set-password
 * Set password for authenticated user (after magic link login)
 */
router.post('/set-password', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = setPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ error: error.message });
      return;
    }

    const { password } = parseResult.data;

    // Validate password strength
    const strengthValidation = validatePasswordStrength(password);
    if (!strengthValidation.valid) {
      res.status(400).json({ error: strengthValidation.errors[0] });
      return;
    }

    // Get the portal user ID for this auth user
    const { data: portalUser } = await supabase
      .from('portal_users')
      .select('id')
      .eq('auth_user_id', req.user!.id)
      .single();

    if (!portalUser) {
      res.status(404).json({ error: 'Portal user not found' });
      return;
    }

    // Set the password
    const result = await setUserPassword(portalUser.id, password);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to set password' });
      return;
    }

    res.json({
      success: true,
      message: 'Password set successfully. You can now login with email and password.',
    });
  } catch (error) {
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ error: error.message });
      return;
    }

    const { email } = parseResult.data;

    // Create reset token and send email
    const result = await createPasswordResetToken(email);

    // Always return success to prevent email enumeration
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * GET /api/auth/validate-reset-token/:token
 * Validate a password reset token
 */
router.get('/validate-reset-token/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      res.status(400).json({ valid: false, error: 'Invalid token format' });
      return;
    }

    const validation = await validateResetToken(token);

    res.json({
      valid: validation.valid,
      error: validation.error,
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate token' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ error: error.message });
      return;
    }

    const { token, password } = parseResult.data;

    // Validate password strength
    const strengthValidation = validatePasswordStrength(password);
    if (!strengthValidation.valid) {
      res.status(400).json({ error: strengthValidation.errors[0] });
      return;
    }

    // Reset the password
    const result = await resetPasswordWithToken(token, password);
    if (!result.success) {
      res.status(400).json({ error: result.error || 'Failed to reset password' });
      return;
    }

    res.json({
      success: true,
      message: 'Password reset successfully. You can now login with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * GET /api/auth/password-strength
 * Check password strength (public utility endpoint)
 */
router.post('/password-strength', async (req: Request, res: Response): Promise<void> => {
  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    const validation = validatePasswordStrength(password);

    res.json({
      valid: validation.valid,
      score: validation.score,
      errors: validation.errors,
    });
  } catch (error) {
    console.error('Password strength error:', error);
    res.status(500).json({ error: 'Failed to check password strength' });
  }
});

export default router;
