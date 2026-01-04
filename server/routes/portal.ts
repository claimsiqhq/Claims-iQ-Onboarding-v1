import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { requireProjectAccess, TenantAccessError } from '../lib/tenant';
import { updateChecklistItemSchema } from '../../shared/validation';
import { fromZodError } from 'zod-validation-error';
import type { ProjectWithDetails, ProjectSummary, ChecklistItemWithTemplate } from '../../shared/types';

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
        security_compliance_config:security_compliance_configs(*)
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

    // Find primary contact
    const contacts = project.contacts as { role: string }[] || [];
    const primaryContact = contacts.find((c) => c.role === 'primary') || null;

    const projectWithDetails: ProjectWithDetails = {
      ...project,
      company: project.company,
      module_selections: project.module_selections,
      checklist_items: project.checklist_items || [],
      documents: project.documents || [],
      contacts: project.contacts || [],
      primary_contact: primaryContact,
      integration_configs: project.integration_configs || [],
      security_compliance_config: Array.isArray(project.security_compliance_config)
        ? project.security_compliance_config[0] || null
        : project.security_compliance_config,
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
      .order('template(order_index)', { ascending: true });

    if (error) {
      console.error('Checklist fetch error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch checklist' });
      return;
    }

    res.json({ success: true, checklist: checklistItems as ChecklistItemWithTemplate[] });
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

export default router;
