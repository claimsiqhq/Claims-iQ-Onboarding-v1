import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { loginSchema, verifyOtpSchema } from '../../shared/validation';
import { requireAuth } from '../middleware/auth';
import { fromZodError } from 'zod-validation-error';

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

export default router;
