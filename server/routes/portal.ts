import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireProjectAccess, TenantAccessError } from '../lib/tenant';
import { updateChecklistItemSchema } from '../../shared/validation';
import { fromZodError } from 'zod-validation-error';
import type { ProjectWithDetails, ProjectSummary, ChecklistItemWithTemplate } from '../../shared/types';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const router = Router();

// All portal routes require authentication
router.use(requireAuth);

/**
 * GET /api/portal/projects
 * Get all projects accessible to the current user
 */
router.get('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;

    let query = client
      .from('onboarding_projects')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        target_go_live_date,
        company:companies(id, legal_name, dba_name),
        module_selections(module_type, is_selected),
        checklist_items(status)
      `)
      .order('created_at', { ascending: false });

    // Portal users can only see their company's projects
    if (tenant.userType === 'portal_user' && tenant.companyId) {
      query = query.eq('company_id', tenant.companyId);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error('Projects fetch error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch projects' });
      return;
    }

    // Transform to ProjectSummary format
    const summaries: ProjectSummary[] = (projects || []).map((project: any) => {
      const checklistItems = project.checklist_items || [];
      const completed = checklistItems.filter((i: any) => i.status === 'complete').length;
      const companyData = Array.isArray(project.company) ? project.company[0] : project.company;

      return {
        id: project.id,
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        target_go_live_date: project.target_go_live_date,
        company: companyData || null,
        primary_contact: null, // Will fetch separately if needed
        module_selections: project.module_selections || [],
        checklist_progress: {
          total: checklistItems.length,
          completed,
        },
      };
    });

    res.json({ success: true, projects: summaries });
  } catch (error) {
    console.error('Projects fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/portal/projects/:projectId
 * Get a single project with all related data
 */
router.get('/projects/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { data: project, error } = await client
      .from('onboarding_projects')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Project fetch error:', error);
      if (error.code === 'PGRST116') {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to fetch project' });
      return;
    }

    const projectWithDetails = {
      ...project,
      company: project.company,
      module_selections: [],
      checklist_items: [],
      documents: [],
      contacts: [],
      primary_contact: null,
      integration_configs: [],
      security_compliance_config: null,
    };

    res.json({ success: true, project: projectWithDetails });
  } catch (error) {
    console.error('Project fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

/**
 * GET /api/portal/projects/:projectId/checklist
 * Get checklist items for a project
 */
router.get('/projects/:projectId/checklist', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { data: checklistItems, error } = await client
      .from('checklist_items')
      .select(`
        *,
        template:checklist_templates(*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      // Table or columns might not exist - return empty array
      console.error('Checklist fetch error:', error);
      res.json({ success: true, checklist: [] });
      return;
    }

    res.json({ success: true, checklist: checklistItems || [] });
  } catch (error) {
    console.error('Checklist fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch checklist' });
  }
});

/**
 * PATCH /api/portal/checklist/:itemId
 * Update a checklist item status
 */
router.patch('/checklist/:itemId', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { itemId } = req.params;

    // Validate input
    const parseResult = updateChecklistItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    // First, get the checklist item to validate project access
    const { data: checklistItem, error: fetchError } = await client
      .from('checklist_items')
      .select('id, project_id')
      .eq('id', itemId)
      .single();

    if (fetchError || !checklistItem) {
      res.status(404).json({ success: false, error: 'Checklist item not found' });
      return;
    }

    // Validate access to the project
    try {
      await requireProjectAccess(client, tenant, checklistItem.project_id);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    // Update the checklist item
    const updateData: { status: string; notes?: string | null; completed_at?: string | null } = {
      status: parseResult.data.status,
    };

    if (parseResult.data.notes !== undefined) {
      updateData.notes = parseResult.data.notes;
    }

    if (parseResult.data.status === 'complete') {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    const { error: updateError } = await client
      .from('checklist_items')
      .update(updateData)
      .eq('id', itemId);

    if (updateError) {
      console.error('Checklist update error:', updateError);
      res.status(500).json({ success: false, error: 'Failed to update checklist item' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: checklistItem.project_id,
      user_id: tenant.userId,
      action: 'checklist_item_updated',
      details: {
        item_id: itemId,
        new_status: parseResult.data.status,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Checklist update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update checklist item' });
  }
});

/**
 * GET /api/portal/projects/:projectId/documents
 * Get documents for a project
 */
router.get('/projects/:projectId/documents', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { data: documents, error } = await client
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Documents fetch error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch documents' });
      return;
    }

    res.json({ success: true, documents });
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
});

/**
 * POST /api/portal/projects/:projectId/sow/approve
 * Approve and sign the Statement of Work
 */
router.post('/projects/:projectId/sow/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    // Check if already signed
    const { data: existingProject, error: fetchError } = await client
      .from('onboarding_projects')
      .select('id, sow_signed_at, status')
      .eq('id', projectId)
      .single();

    if (fetchError || !existingProject) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    if (existingProject.sow_signed_at) {
      res.status(400).json({ success: false, error: 'SOW has already been signed' });
      return;
    }

    // Update project with SOW approval
    const { data: updatedProject, error: updateError } = await client
      .from('onboarding_projects')
      .update({
        sow_signed_at: new Date().toISOString(),
        stage: 'technical',
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('SOW approval error:', updateError);
      res.status(500).json({ success: false, error: 'Failed to approve SOW' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: projectId,
      user_id: tenant.userId,
      action: 'sow_approved',
      details: {
        signed_by_email: tenant.email,
        signed_at: new Date().toISOString(),
      },
    });

    res.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error('SOW approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve SOW' });
  }
});

/**
 * PATCH /api/portal/profile
 * Update the current user's profile information
 */
router.patch('/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { firstName, lastName, phone, title } = req.body;

    // Get the portal user's contact_id
    const { data: portalUser, error: portalUserError } = await client
      .from('portal_users')
      .select('contact_id')
      .eq('id', tenant.userId)
      .single();

    if (portalUserError || !portalUser || !portalUser.contact_id) {
      res.status(404).json({ success: false, error: 'User profile not found' });
      return;
    }

    // Update the contact record
    const updateData: Record<string, string | null> = {};
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone || null;
    if (title !== undefined) updateData.title = title || null;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedContact, error: updateError } = await client
      .from('contacts')
      .update(updateData)
      .eq('id', portalUser.contact_id)
      .select()
      .single();

    if (updateError) {
      console.error('Profile update error:', updateError);
      res.status(500).json({ success: false, error: 'Failed to update profile' });
      return;
    }

    res.json({ success: true, contact: updatedContact });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

/**
 * POST /api/portal/team/invite
 * Invite a new team member to the organization
 */
router.post('/team/invite', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { email, firstName, lastName, title, role } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName) {
      res.status(400).json({ success: false, error: 'Email, first name, and last name are required' });
      return;
    }

    // Portal users must have a company
    if (!tenant.companyId) {
      res.status(403).json({ success: false, error: 'Company not found for user' });
      return;
    }

    // Check if contact already exists with this email for this company
    const { data: existingContact } = await client
      .from('contacts')
      .select('id')
      .eq('company_id', tenant.companyId)
      .eq('email', email.toLowerCase())
      .single();

    if (existingContact) {
      res.status(400).json({ success: false, error: 'A contact with this email already exists' });
      return;
    }

    // Create new contact record
    const { data: contact, error: contactError } = await client
      .from('contacts')
      .insert({
        company_id: tenant.companyId,
        first_name: firstName,
        last_name: lastName,
        email: email.toLowerCase(),
        title: title || null,
        role: role || 'other',
        is_active: true,
      })
      .select()
      .single();

    if (contactError) {
      console.error('Contact creation error:', contactError);
      res.status(500).json({ success: false, error: 'Failed to create contact' });
      return;
    }

    // Import invite functions dynamically to avoid circular deps
    const { createInvite } = await import('../lib/invite');

    // Get inviter's name
    const inviterName = tenant.firstName && tenant.lastName
      ? `${tenant.firstName} ${tenant.lastName}`
      : 'Your Team';

    // Create invite for the new team member
    const inviteResult = await createInvite({
      email: email.toLowerCase(),
      companyName: undefined, // Will be linked to existing company
      invitedById: tenant.userId,
      invitedByName: inviterName,
      expirationDays: 14,
      metadata: {
        inviteType: 'team_member',
        contactId: contact.id,
        companyId: tenant.companyId,
      },
    });

    if (!inviteResult.success) {
      // Contact was created but invite failed - still return success with warning
      res.json({
        success: true,
        contact,
        invite: null,
        warning: 'Contact created but invite email could not be sent',
      });
      return;
    }

    res.json({
      success: true,
      contact,
      invite: inviteResult.invite,
      message: `Invitation sent to ${email}`,
    });
  } catch (error) {
    console.error('Team invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to invite team member' });
  }
});

/**
 * GET /api/portal/team
 * Get team members and pending invitations for the user's company
 */
router.get('/team', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;

    if (!tenant.companyId) {
      res.status(403).json({ success: false, error: 'Company not found for user' });
      return;
    }

    // Get all contacts for this company
    const { data: contacts, error: contactsError } = await client
      .from('contacts')
      .select('*')
      .eq('company_id', tenant.companyId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (contactsError) {
      console.error('Team fetch error:', contactsError);
      res.status(500).json({ success: false, error: 'Failed to fetch team members' });
      return;
    }

    // Get pending invitations for this company
    const { data: invites, error: invitesError } = await client
      .from('invites')
      .select('*')
      .eq('status', 'pending')
      .contains('metadata', { companyId: tenant.companyId });

    res.json({
      success: true,
      contacts: contacts || [],
      pendingInvites: invites || [],
    });
  } catch (error) {
    console.error('Team fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch team' });
  }
});

/**
 * GET /api/portal/projects/:projectId/activity
 * Get activity log for a project
 */
router.get('/projects/:projectId/activity', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { data: activities, error } = await client
      .from('activity_logs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Activity fetch error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch activity' });
      return;
    }

    res.json({ success: true, activities });
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

/**
 * GET /api/portal/projects/:projectId/sow/pdf
 * Generate and download SOW as PDF
 */
router.get('/projects/:projectId/sow/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    // Fetch full project details
    const { data: project, error } = await client
      .from('onboarding_projects')
      .select(`
        *,
        company:companies(*),
        module_selections(*,
          core_config:core_module_configs(*),
          comms_config:comms_module_configs(*),
          fnol_config:fnol_module_configs(*)
        ),
        contacts(*)
      `)
      .eq('id', projectId)
      .single();

    if (error || !project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const company = Array.isArray(project.company) ? project.company[0] : project.company;
    const contacts = project.contacts || [];
    const primaryContact = contacts.find((c: any) => c.role === 'primary') || contacts[0];
    const selectedModules = (project.module_selections || []).filter((m: any) => m.is_selected);

    // Create PDF document
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    });

    // Set response headers
    const filename = `SOW_${company?.legal_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Document'}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // --- PDF Content ---

    // Header
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#2563eb')
      .text('Claims iQ', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#1f2937')
      .text('Statement of Work', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280')
      .text(`Document ID: SOW-${projectId.slice(0, 8).toUpperCase()}`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

    doc.moveDown(2);

    // Client Information Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937')
      .text('1. CLIENT INFORMATION');
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    doc.text(`Company Name: ${company?.legal_name || 'N/A'}`);
    if (company?.dba_name) {
      doc.text(`DBA: ${company.dba_name}`);
    }
    doc.text(`Address: ${company?.address_line_1 || ''} ${company?.address_line_2 || ''}`);
    doc.text(`${company?.city || ''}, ${company?.state || ''} ${company?.postal_code || ''}`);
    doc.moveDown(0.5);
    doc.text(`Primary Contact: ${primaryContact?.first_name || ''} ${primaryContact?.last_name || ''}`);
    doc.text(`Email: ${primaryContact?.email || 'N/A'}`);
    doc.text(`Phone: ${primaryContact?.phone || 'N/A'}`);
    doc.text(`Title: ${primaryContact?.title || 'N/A'}`);

    doc.moveDown(1.5);

    // Selected Modules Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937')
      .text('2. SELECTED MODULES & SERVICES');
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');

    for (const module of selectedModules) {
      const moduleName = module.module_type === 'core' ? 'Core Claims Platform'
        : module.module_type === 'comms' ? 'Communications Suite'
        : 'FNOL Intake';

      doc.font('Helvetica-Bold').text(`• ${moduleName}`);
      doc.font('Helvetica');

      if (module.module_type === 'core' && module.core_config) {
        const config = Array.isArray(module.core_config) ? module.core_config[0] : module.core_config;
        if (config?.claim_types?.length) {
          doc.text(`  Claim Types: ${config.claim_types.join(', ')}`, { indent: 20 });
        }
        if (config?.monthly_claim_volume) {
          doc.text(`  Monthly Volume: ${config.monthly_claim_volume.toLocaleString()} claims`, { indent: 20 });
        }
      }

      if (module.module_type === 'comms' && module.comms_config) {
        const config = Array.isArray(module.comms_config) ? module.comms_config[0] : module.comms_config;
        if (config?.desired_channels?.length) {
          doc.text(`  Channels: ${config.desired_channels.join(', ')}`, { indent: 20 });
        }
        if (config?.languages_required?.length) {
          doc.text(`  Languages: ${config.languages_required.join(', ')}`, { indent: 20 });
        }
      }

      if (module.module_type === 'fnol' && module.fnol_config) {
        const config = Array.isArray(module.fnol_config) ? module.fnol_config[0] : module.fnol_config;
        if (config?.desired_intake_methods?.length) {
          doc.text(`  Intake Methods: ${config.desired_intake_methods.join(', ')}`, { indent: 20 });
        }
        if (config?.lines_of_business?.length) {
          doc.text(`  Lines of Business: ${config.lines_of_business.join(', ')}`, { indent: 20 });
        }
      }

      doc.moveDown(0.5);
    }

    doc.moveDown(1);

    // Timeline Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937')
      .text('3. PROJECT TIMELINE');
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    doc.text(`Project Start Date: ${new Date(project.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    doc.text(`Target Go-Live: ${project.target_go_live_date
      ? new Date(project.target_go_live_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'To be determined'}`);

    doc.moveDown(1.5);

    // Terms Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937')
      .text('4. TERMS & CONDITIONS');
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke('#e5e7eb');
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text('4.1 This Statement of Work ("SOW") is entered into between Claims iQ Inc. ("Provider") and the Client identified above.');
    doc.moveDown(0.3);
    doc.text('4.2 Provider agrees to deliver the services and modules specified in Section 2 according to the timeline outlined in Section 3.');
    doc.moveDown(0.3);
    doc.text('4.3 Client agrees to provide necessary access, data, and cooperation to facilitate successful implementation.');
    doc.moveDown(0.3);
    doc.text('4.4 Both parties agree to maintain confidentiality of all proprietary information exchanged during this engagement.');
    doc.moveDown(0.3);
    doc.text('4.5 This SOW is governed by the Master Services Agreement between the parties.');

    doc.moveDown(2);

    // Signature Section
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1f2937')
      .text('5. ACCEPTANCE & SIGNATURES');
    doc.moveTo(72, doc.y).lineTo(540, doc.y).stroke('#e5e7eb');
    doc.moveDown(1);

    const signatureY = doc.y;

    // Client signature
    doc.fontSize(10).font('Helvetica');
    doc.text('CLIENT:', 72, signatureY);
    doc.moveDown(2);
    doc.text('_________________________________', 72);
    doc.text(`${primaryContact?.first_name || ''} ${primaryContact?.last_name || ''}`, 72);
    doc.text(primaryContact?.title || 'Authorized Representative', 72);
    doc.text(`Date: ${project.sow_signed_at
      ? new Date(project.sow_signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '_______________'}`, 72);

    // Provider signature
    doc.fontSize(10);
    doc.text('CLAIMS iQ INC.:', 320, signatureY);
    doc.text('_________________________________', 320, signatureY + 28);
    doc.text('Authorized Representative', 320, signatureY + 42);
    doc.text('Date: _______________', 320, signatureY + 56);

    // Footer
    doc.fontSize(8).fillColor('#9ca3af')
      .text('Claims iQ Inc. | www.claimsiq.com | Confidential', 72, 700, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error('SOW PDF generation error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

/**
 * POST /api/portal/projects/:projectId/documents/upload
 * Upload a document to the project
 */
router.post('/projects/:projectId/documents/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const storagePath = `projects/${projectId}/${uniqueId}${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await client.storage
      .from('documents')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      res.status(500).json({ success: false, error: 'Failed to upload file' });
      return;
    }

    // Create document record in database
    const { data: document, error: dbError } = await client
      .from('documents')
      .insert({
        project_id: projectId,
        name: file.originalname,
        file_path: storagePath,
        file_type: file.mimetype,
        file_size: file.size,
        status: 'pending',
        uploaded_by_id: tenant.userId,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Document record error:', dbError);
      // Try to clean up the uploaded file
      await client.storage.from('documents').remove([storagePath]);
      res.status(500).json({ success: false, error: 'Failed to save document record' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: projectId,
      user_id: tenant.userId,
      action: 'document_uploaded',
      details: {
        document_name: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
      },
    });

    res.json({ success: true, document });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload document' });
  }
});

/**
 * DELETE /api/portal/documents/:documentId
 * Delete a document
 */
router.delete('/documents/:documentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { documentId } = req.params;

    // Get the document to find project and file path
    const { data: document, error: fetchError } = await client
      .from('documents')
      .select('*, project:onboarding_projects(company_id)')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    // Validate access to the project
    try {
      await requireProjectAccess(client, tenant, document.project_id);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    // Delete from storage
    const { error: storageError } = await client.storage
      .from('documents')
      .remove([document.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      // Continue anyway to remove the database record
    }

    // Delete database record
    const { error: deleteError } = await client
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('Document delete error:', deleteError);
      res.status(500).json({ success: false, error: 'Failed to delete document' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: document.project_id,
      user_id: tenant.userId,
      action: 'document_deleted',
      details: {
        document_name: document.name,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Document delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
});

/**
 * GET /api/portal/documents/:documentId/download
 * Get a signed URL to download a document
 */
router.get('/documents/:documentId/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { documentId } = req.params;

    // Get the document
    const { data: document, error: fetchError } = await client
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      res.status(404).json({ success: false, error: 'Document not found' });
      return;
    }

    // Validate access
    try {
      await requireProjectAccess(client, tenant, document.project_id);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    // Get signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await client.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600);

    if (urlError || !signedUrl) {
      console.error('Signed URL error:', urlError);
      res.status(500).json({ success: false, error: 'Failed to generate download URL' });
      return;
    }

    res.json({ success: true, url: signedUrl.signedUrl, document });
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ success: false, error: 'Failed to get download URL' });
  }
});

/**
 * GET /api/portal/projects/:projectId/integrations
 * Get integration configurations for a project
 */
router.get('/projects/:projectId/integrations', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { data: integrations, error } = await client
      .from('integration_configs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Integrations fetch error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
      return;
    }

    res.json({ success: true, integrations: integrations || [] });
  } catch (error) {
    console.error('Integrations fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
  }
});

/**
 * POST /api/portal/projects/:projectId/integrations
 * Add a new integration configuration
 */
router.post('/projects/:projectId/integrations', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;
    const { systemName, systemType, connectionMethod, apiDocumentationUrl, notes } = req.body;

    // Validate required fields
    if (!systemName || !systemType) {
      res.status(400).json({ success: false, error: 'System name and type are required' });
      return;
    }

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { data: integration, error } = await client
      .from('integration_configs')
      .insert({
        project_id: projectId,
        system_name: systemName,
        system_type: systemType,
        connection_method: connectionMethod || null,
        api_documentation_url: apiDocumentationUrl || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Integration create error:', error);
      res.status(500).json({ success: false, error: 'Failed to create integration' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: projectId,
      user_id: tenant.userId,
      action: 'integration_added',
      details: {
        system_name: systemName,
        system_type: systemType,
      },
    });

    res.json({ success: true, integration });
  } catch (error) {
    console.error('Integration create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create integration' });
  }
});

/**
 * PATCH /api/portal/integrations/:integrationId
 * Update an integration configuration
 */
router.patch('/integrations/:integrationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { integrationId } = req.params;
    const { systemName, systemType, connectionMethod, apiDocumentationUrl, notes } = req.body;

    // Get the integration to find project
    const { data: existing, error: fetchError } = await client
      .from('integration_configs')
      .select('project_id')
      .eq('id', integrationId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ success: false, error: 'Integration not found' });
      return;
    }

    // Validate access
    try {
      await requireProjectAccess(client, tenant, existing.project_id);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
    if (systemName !== undefined) updateData.system_name = systemName;
    if (systemType !== undefined) updateData.system_type = systemType;
    if (connectionMethod !== undefined) updateData.connection_method = connectionMethod || null;
    if (apiDocumentationUrl !== undefined) updateData.api_documentation_url = apiDocumentationUrl || null;
    if (notes !== undefined) updateData.notes = notes || null;

    const { data: integration, error } = await client
      .from('integration_configs')
      .update(updateData)
      .eq('id', integrationId)
      .select()
      .single();

    if (error) {
      console.error('Integration update error:', error);
      res.status(500).json({ success: false, error: 'Failed to update integration' });
      return;
    }

    res.json({ success: true, integration });
  } catch (error) {
    console.error('Integration update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update integration' });
  }
});

/**
 * DELETE /api/portal/integrations/:integrationId
 * Delete an integration configuration
 */
router.delete('/integrations/:integrationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { integrationId } = req.params;

    // Get the integration to find project
    const { data: existing, error: fetchError } = await client
      .from('integration_configs')
      .select('project_id, system_name')
      .eq('id', integrationId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ success: false, error: 'Integration not found' });
      return;
    }

    // Validate access
    try {
      await requireProjectAccess(client, tenant, existing.project_id);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { error } = await client
      .from('integration_configs')
      .delete()
      .eq('id', integrationId);

    if (error) {
      console.error('Integration delete error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete integration' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: existing.project_id,
      user_id: tenant.userId,
      action: 'integration_removed',
      details: {
        system_name: existing.system_name,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Integration delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete integration' });
  }
});

/**
 * POST /api/portal/projects/:projectId/webhooks
 * Register a webhook URL for the project
 */
router.post('/projects/:projectId/webhooks', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;
    const { url, events, description } = req.body;

    if (!url) {
      res.status(400).json({ success: false, error: 'Webhook URL is required' });
      return;
    }

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    // Generate a secret for webhook signature verification
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    const { data: webhook, error } = await client
      .from('webhooks')
      .insert({
        project_id: projectId,
        url,
        events: events || ['*'],
        description: description || null,
        secret: webhookSecret,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Webhook create error:', error);
      res.status(500).json({ success: false, error: 'Failed to create webhook' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: projectId,
      user_id: tenant.userId,
      action: 'webhook_registered',
      details: {
        url,
        events: events || ['*'],
      },
    });

    res.json({ success: true, webhook: { ...webhook, secret: webhookSecret } });
  } catch (error) {
    console.error('Webhook create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create webhook' });
  }
});

/**
 * GET /api/portal/projects/:projectId/webhooks
 * Get all webhooks for a project
 */
router.get('/projects/:projectId/webhooks', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { data: webhooks, error } = await client
      .from('webhooks')
      .select('id, url, events, description, is_active, created_at, updated_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      // Table might not exist - return empty array
      console.error('Webhooks fetch error:', error);
      res.json({ success: true, webhooks: [] });
      return;
    }

    res.json({ success: true, webhooks: webhooks || [] });
  } catch (error) {
    console.error('Webhooks fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch webhooks' });
  }
});

/**
 * DELETE /api/portal/webhooks/:webhookId
 * Delete a webhook
 */
router.delete('/webhooks/:webhookId', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { webhookId } = req.params;

    // Get the webhook to find project
    const { data: existing, error: fetchError } = await client
      .from('webhooks')
      .select('project_id, url')
      .eq('id', webhookId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    // Validate access
    try {
      await requireProjectAccess(client, tenant, existing.project_id);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    const { error } = await client
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    if (error) {
      console.error('Webhook delete error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete webhook' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete webhook' });
  }
});

/**
 * POST /api/portal/projects/:projectId/api-credentials/regenerate
 * Regenerate API credentials for a project
 */
router.post('/projects/:projectId/api-credentials/regenerate', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate access
    try {
      await requireProjectAccess(client, tenant, projectId);
    } catch (e) {
      if (e instanceof TenantAccessError) {
        res.status(403).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }

    // Generate new API credentials
    const apiKey = `ciq_${crypto.randomBytes(24).toString('hex')}`;
    const apiSecret = crypto.randomBytes(32).toString('hex');

    // Update project with new credentials
    const { error } = await client
      .from('onboarding_projects')
      .update({
        api_key: apiKey,
        api_secret_hash: crypto.createHash('sha256').update(apiSecret).digest('hex'),
        api_credentials_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (error) {
      console.error('API credentials error:', error);
      res.status(500).json({ success: false, error: 'Failed to regenerate credentials' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: projectId,
      user_id: tenant.userId,
      action: 'api_credentials_regenerated',
      details: {},
    });

    // Return the secret (only shown once)
    res.json({
      success: true,
      credentials: {
        apiKey,
        apiSecret, // Only returned on generation, not stored in plain text
        generatedAt: new Date().toISOString(),
      },
      warning: 'Save these credentials securely. The API secret will not be shown again.',
    });
  } catch (error) {
    console.error('API credentials error:', error);
    res.status(500).json({ success: false, error: 'Failed to regenerate credentials' });
  }
});

export default router;
