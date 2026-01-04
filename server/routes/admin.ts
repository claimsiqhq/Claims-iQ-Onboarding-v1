import { Router, Request, Response } from 'express';
import { requireAuth, requireStaff } from '../middleware/auth';
import { updateProjectSchema } from '../../shared/validation';
import { fromZodError } from 'zod-validation-error';
import type { ProjectSummary } from '../../shared/types';

const router = Router();

// All admin routes require authentication and staff role
router.use(requireAuth);
router.use(requireStaff);

/**
 * GET /api/admin/projects
 * Get all projects (admin view)
 */
router.get('/projects', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;

    // Support filtering by status
    const { status } = req.query;

    let query = client
      .from('onboarding_projects')
      .select(`
        id,
        status,
        created_at,
        updated_at,
        target_go_live_date,
        company:companies(id, legal_name, dba_name),
        primary_contact:contacts!inner(id, first_name, last_name, email),
        module_selections(module_type, is_selected),
        checklist_items(status)
      `)
      .eq('contacts.role', 'primary')
      .order('created_at', { ascending: false });

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    const { data: projects, error } = await query;

    if (error) {
      console.error('Admin projects fetch error:', error);

      // Try alternate query without join filter
      const { data: altProjects, error: altError } = await client
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

      if (altError) {
        res.status(500).json({ success: false, error: 'Failed to fetch projects' });
        return;
      }

      // Transform to ProjectSummary format
      const summaries: ProjectSummary[] = (altProjects || []).map((project: any) => {
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
          primary_contact: null,
          module_selections: project.module_selections || [],
          checklist_progress: {
            total: checklistItems.length,
            completed,
          },
        };
      });

      res.json({ success: true, projects: summaries });
      return;
    }

    // Transform to ProjectSummary format
    const summaries: ProjectSummary[] = (projects || []).map((project: any) => {
      const checklistItems = project.checklist_items || [];
      const completed = checklistItems.filter((i: any) => i.status === 'complete').length;
      const companyData = Array.isArray(project.company) ? project.company[0] : project.company;
      const primaryContact = Array.isArray(project.primary_contact)
        ? project.primary_contact[0]
        : project.primary_contact;

      return {
        id: project.id,
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        target_go_live_date: project.target_go_live_date,
        company: companyData || null,
        primary_contact: primaryContact || null,
        module_selections: project.module_selections || [],
        checklist_progress: {
          total: checklistItems.length,
          completed,
        },
      };
    });

    res.json({ success: true, projects: summaries });
  } catch (error) {
    console.error('Admin projects fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch projects' });
  }
});

/**
 * GET /api/admin/projects/:projectId
 * Get a single project with full details (admin view)
 */
router.get('/projects/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const { projectId } = req.params;

    const { data: project, error } = await client
      .from('onboarding_projects')
      .select(`
        *,
        company:companies(*),
        contacts:contacts(*),
        module_selections(
          *,
          core_config:core_module_configs(*),
          comms_config:comms_module_configs(*),
          fnol_config:fnol_module_configs(*)
        ),
        checklist_items(*, template:checklist_templates(*)),
        documents(*),
        integration_configs(*),
        security_compliance_config:security_compliance_configs(*),
        activity_logs(*)
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Admin project fetch error:', error);
      if (error.code === 'PGRST116') {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }
      res.status(500).json({ success: false, error: 'Failed to fetch project' });
      return;
    }

    res.json({ success: true, project });
  } catch (error) {
    console.error('Admin project fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch project' });
  }
});

/**
 * PATCH /api/admin/projects/:projectId
 * Update a project (admin only)
 */
router.patch('/projects/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const tenant = req.tenant!;
    const { projectId } = req.params;

    // Validate input
    const parseResult = updateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    // Verify project exists
    const { data: existing, error: fetchError } = await client
      .from('onboarding_projects')
      .select('id, status')
      .eq('id', projectId)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    // Update the project
    const { error: updateError } = await client
      .from('onboarding_projects')
      .update(parseResult.data)
      .eq('id', projectId);

    if (updateError) {
      console.error('Project update error:', updateError);
      res.status(500).json({ success: false, error: 'Failed to update project' });
      return;
    }

    // Log activity
    await client.from('activity_logs').insert({
      project_id: projectId,
      user_id: tenant.userId,
      action: 'project_updated',
      details: {
        updates: parseResult.data,
        previous_status: existing.status,
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Project update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;

    // Get counts by status
    const { data: projects, error } = await client
      .from('onboarding_projects')
      .select('status');

    if (error) {
      console.error('Stats fetch error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch stats' });
      return;
    }

    const statusCounts: Record<string, number> = {};
    for (const project of projects || []) {
      statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
    }

    // Get total companies
    const { count: companyCount } = await client
      .from('companies')
      .select('*', { count: 'exact', head: true });

    res.json({
      success: true,
      stats: {
        totalProjects: projects?.length || 0,
        totalCompanies: companyCount || 0,
        byStatus: statusCounts,
      },
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/companies
 * Get all companies
 */
router.get('/companies', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;

    const { data: companies, error } = await client
      .from('companies')
      .select(`
        *,
        contacts(id, first_name, last_name, email, role),
        onboarding_projects(id, status)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Companies fetch error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch companies' });
      return;
    }

    res.json({ success: true, companies });
  } catch (error) {
    console.error('Companies fetch error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch companies' });
  }
});

/**
 * POST /api/admin/portal-users
 * Create a portal user for a contact
 */
router.post('/portal-users', async (req: Request, res: Response): Promise<void> => {
  try {
    const client = req.supabaseClient!;
    const { contactId } = req.body;

    if (!contactId) {
      res.status(400).json({ success: false, error: 'Contact ID is required' });
      return;
    }

    // Get the contact
    const { data: contact, error: contactError } = await client
      .from('contacts')
      .select('id, email, company_id')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      res.status(404).json({ success: false, error: 'Contact not found' });
      return;
    }

    // Check if portal user already exists
    const { data: existingPortalUser } = await client
      .from('portal_users')
      .select('id')
      .eq('contact_id', contactId)
      .single();

    if (existingPortalUser) {
      res.status(400).json({ success: false, error: 'Portal user already exists for this contact' });
      return;
    }

    // Note: In a real implementation, you would:
    // 1. Create a Supabase auth user for this email (or invite them)
    // 2. Create the portal_users record with the auth_user_id
    // For now, we'll return instructions for the manual step

    res.json({
      success: true,
      message: 'To complete portal user setup:',
      steps: [
        '1. The contact will need to use the magic link login with their email',
        '2. After their first login, their auth_user_id will be available',
        '3. Create portal_users record linking auth_user_id to company_id and contact_id',
      ],
      contact: {
        id: contact.id,
        email: contact.email,
        companyId: contact.company_id,
      },
    });
  } catch (error) {
    console.error('Portal user creation error:', error);
    res.status(500).json({ success: false, error: 'Failed to create portal user' });
  }
});

export default router;
