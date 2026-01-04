import { Router, Request, Response } from 'express';
import { requireAuth, requireStaff } from '../middleware/auth';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import {
  createInvite,
  getInvites,
  getInviteById,
  revokeInvite,
  resendInvite,
  validateInvite,
} from '../lib/invite';

const router = Router();

// Validation schemas
const createInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  companyName: z.string().max(255).optional(),
  expirationDays: z.number().int().min(1).max(30).optional(),
});

const listInvitesSchema = z.object({
  status: z.enum(['pending', 'used', 'expired', 'revoked']).optional(),
  email: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ============================================
// PUBLIC ROUTES (for validating invites)
// ============================================

/**
 * GET /api/invites/validate/:token
 * Validate an invite token (public endpoint)
 */
router.get('/validate/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      res.status(400).json({ success: false, error: 'Invalid token format' });
      return;
    }

    const validation = await validateInvite(token);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: validation.error,
      });
      return;
    }

    // Return limited info for security
    res.json({
      success: true,
      invite: {
        email: validation.invite!.email,
        companyName: validation.invite!.company_name,
        expiresAt: validation.invite!.expires_at,
      },
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to validate invite' });
  }
});

// ============================================
// PROTECTED ROUTES (staff only)
// ============================================

// Apply auth middleware to all routes below
router.use(requireAuth);
router.use(requireStaff);

/**
 * POST /api/invites
 * Create a new invite and send email
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = createInviteSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    const { email, companyName, expirationDays } = parseResult.data;

    // Get the inviter's name
    const inviterName = req.tenant?.firstName && req.tenant?.lastName
      ? `${req.tenant.firstName} ${req.tenant.lastName}`
      : 'Claims iQ Team';

    const result = await createInvite({
      email,
      companyName,
      invitedById: req.tenant!.userId,
      invitedByName: inviterName,
      expirationDays,
    });

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({
      success: true,
      invite: result.invite,
      message: `Invite sent to ${email}`,
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to create invite' });
  }
});

/**
 * GET /api/invites
 * List all invites with optional filtering
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = listInvitesSchema.safeParse(req.query);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    const { status, email, limit, offset } = parseResult.data;

    const result = await getInvites({
      status,
      email,
      limit: limit || 50,
      offset: offset || 0,
    });

    res.json({
      success: true,
      invites: result.invites,
      total: result.total,
      limit: limit || 50,
      offset: offset || 0,
    });
  } catch (error) {
    console.error('List invites error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invites' });
  }
});

/**
 * GET /api/invites/:id
 * Get a single invite by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const invite = await getInviteById(id);

    if (!invite) {
      res.status(404).json({ success: false, error: 'Invite not found' });
      return;
    }

    res.json({ success: true, invite });
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invite' });
  }
});

/**
 * POST /api/invites/:id/resend
 * Resend an invite email
 */
router.post('/:id/resend', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get the inviter's name
    const inviterName = req.tenant?.firstName && req.tenant?.lastName
      ? `${req.tenant.firstName} ${req.tenant.lastName}`
      : 'Claims iQ Team';

    const result = await resendInvite(id, inviterName);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, message: 'Invite resent successfully' });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to resend invite' });
  }
});

/**
 * POST /api/invites/:id/revoke
 * Revoke an invite
 */
router.post('/:id/revoke', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const success = await revokeInvite(id);

    if (!success) {
      res.status(400).json({
        success: false,
        error: 'Failed to revoke invite. It may already be used or revoked.',
      });
      return;
    }

    res.json({ success: true, message: 'Invite revoked successfully' });
  } catch (error) {
    console.error('Revoke invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to revoke invite' });
  }
});

/**
 * GET /api/invites/stats/summary
 * Get invite statistics
 */
router.get('/stats/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const [pending, used, expired, revoked] = await Promise.all([
      getInvites({ status: 'pending', limit: 1 }),
      getInvites({ status: 'used', limit: 1 }),
      getInvites({ status: 'expired', limit: 1 }),
      getInvites({ status: 'revoked', limit: 1 }),
    ]);

    res.json({
      success: true,
      stats: {
        pending: pending.total,
        used: used.total,
        expired: expired.total,
        revoked: revoked.total,
        total: pending.total + used.total + expired.total + revoked.total,
      },
    });
  } catch (error) {
    console.error('Invite stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

export default router;
