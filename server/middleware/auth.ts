import type { Request, Response, NextFunction } from 'express';
import { supabase, createAuthenticatedClient, verifyToken } from '../lib/supabase';
import { getTenantContext, TenantContext } from '../lib/tenant';

// Extend Express Request to include auth info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        accessToken: string;
      };
      tenant?: TenantContext;
      supabaseClient?: ReturnType<typeof createAuthenticatedClient>;
    }
  }
}

/**
 * Extract access token from request
 * Checks Authorization header (Bearer token) and cookies
 */
function extractAccessToken(req: Request): string | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie
  const accessToken = req.cookies?.['sb-access-token'];
  if (accessToken) {
    return accessToken;
  }

  return null;
}

/**
 * Middleware to require authentication
 * Verifies the Supabase access token and attaches user info to request
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accessToken = extractAccessToken(req);

    if (!accessToken) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify the token
    const user = await verifyToken(accessToken);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Create authenticated client for this request
    const supabaseClient = createAuthenticatedClient(accessToken);

    // Get tenant context
    const tenantContext = await getTenantContext(supabaseClient, user.id);
    if (!tenantContext) {
      res.status(403).json({ error: 'User not found in system. Please contact support.' });
      return;
    }

    // Attach to request
    req.user = {
      id: user.id,
      email: user.email || '',
      accessToken,
    };
    req.tenant = tenantContext;
    req.supabaseClient = supabaseClient;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Middleware to optionally authenticate
 * Attaches user info if token is valid, but doesn't block if not present
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accessToken = extractAccessToken(req);

    if (accessToken) {
      const user = await verifyToken(accessToken);
      if (user) {
        const supabaseClient = createAuthenticatedClient(accessToken);
        const tenantContext = await getTenantContext(supabaseClient, user.id);

        if (tenantContext) {
          req.user = {
            id: user.id,
            email: user.email || '',
            accessToken,
          };
          req.tenant = tenantContext;
          req.supabaseClient = supabaseClient;
        }
      }
    }

    next();
  } catch (error) {
    // Don't fail for optional auth, just continue without user
    next();
  }
}

/**
 * Middleware to require Claims IQ staff role
 * Must be used after requireAuth
 */
export function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.tenant.userType !== 'claims_iq_staff') {
    res.status(403).json({ error: 'Staff access required' });
    return;
  }

  next();
}

/**
 * Middleware to require portal user role
 * Must be used after requireAuth
 */
export function requirePortalUser(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.tenant.userType !== 'portal_user') {
    res.status(403).json({ error: 'Portal access required' });
    return;
  }

  next();
}
