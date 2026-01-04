import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { onboardingFormSchema } from '../../shared/validation';
import { fromZodError } from 'zod-validation-error';
import type { OnboardingFormData, ModuleType } from '../../shared/types';

const router = Router();

/**
 * POST /api/onboarding/submit
 * Submit the complete onboarding form
 * Creates company, contact, project, and module selections
 */
router.post('/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input
    const parseResult = onboardingFormSchema.safeParse(req.body);
    if (!parseResult.success) {
      const error = fromZodError(parseResult.error);
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    const formData = parseResult.data as OnboardingFormData;

    // Start a transaction-like operation
    // Note: Supabase doesn't support true transactions via the client
    // If any step fails, we handle cleanup as best we can

    let companyId: string | null = null;
    let contactId: string | null = null;
    let projectId: string | null = null;

    try {
      // 1. Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          legal_name: formData.company.legal_name,
          dba_name: formData.company.dba_name || null,
          website: formData.company.website || null,
          address_line_1: formData.company.address_line_1,
          address_line_2: formData.company.address_line_2 || null,
          city: formData.company.city,
          state: formData.company.state,
          postal_code: formData.company.postal_code,
          company_size: formData.company.company_size || null,
          lines_of_business: formData.company.lines_of_business || [],
        })
        .select('id')
        .single();

      if (companyError) {
        console.error('Company insert error:', companyError);
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      companyId = company.id;

      // 2. Create primary contact
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          company_id: companyId,
          first_name: formData.contact.first_name,
          last_name: formData.contact.last_name,
          email: formData.contact.email,
          phone: formData.contact.phone || null,
          title: formData.contact.title || null,
          role: 'primary',
          is_active: true,
        })
        .select('id')
        .single();

      if (contactError) {
        console.error('Contact insert error:', contactError);
        throw new Error(`Failed to create contact: ${contactError.message}`);
      }

      contactId = contact.id;

      // 3. Create onboarding project
      const { data: project, error: projectError } = await supabase
        .from('onboarding_projects')
        .insert({
          company_id: companyId,
          status: 'discovery_in_progress',
          notes: null,
        })
        .select('id')
        .single();

      if (projectError) {
        console.error('Project insert error:', projectError);
        throw new Error(`Failed to create project: ${projectError.message}`);
      }

      projectId = project.id;

      // 4. Create module selections
      const moduleTypes: ModuleType[] = ['core', 'comms', 'fnol'];
      const moduleSelectionsToInsert = moduleTypes.map((moduleType) => ({
        project_id: projectId!,
        module_type: moduleType,
        is_selected: formData.modules[moduleType],
      }));

      const { data: moduleSelections, error: moduleError } = await supabase
        .from('module_selections')
        .insert(moduleSelectionsToInsert)
        .select('id, module_type, is_selected');

      if (moduleError) {
        console.error('Module selection insert error:', moduleError);
        throw new Error(`Failed to create module selections: ${moduleError.message}`);
      }

      // 5. Update module configs if requirements are provided
      // The database trigger should auto-create config records when is_selected=true
      // We just need to update them with the requirements

      if (formData.requirements) {
        // Wait a bit for triggers to create the config records
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Update core config if provided
        if (formData.requirements.core && formData.modules.core) {
          const coreSelection = moduleSelections.find((m) => m.module_type === 'core');
          if (coreSelection) {
            const { error: coreConfigError } = await supabase
              .from('core_module_configs')
              .update({
                claim_types: formData.requirements.core.claim_types || [],
                perils: formData.requirements.core.perils || [],
                document_types: formData.requirements.core.document_types || [],
                monthly_claim_volume: formData.requirements.core.monthly_claim_volume || null,
                monthly_document_volume: formData.requirements.core.monthly_document_volume || null,
                pain_points: formData.requirements.core.pain_points || null,
              })
              .eq('module_selection_id', coreSelection.id);

            if (coreConfigError) {
              console.error('Core config update error:', coreConfigError);
              // Non-fatal, continue
            }
          }
        }

        // Update comms config if provided
        if (formData.requirements.comms && formData.modules.comms) {
          const commsSelection = moduleSelections.find((m) => m.module_type === 'comms');
          if (commsSelection) {
            const { error: commsConfigError } = await supabase
              .from('comms_module_configs')
              .update({
                desired_channels: formData.requirements.comms.desired_channels || [],
                monthly_message_volume: formData.requirements.comms.monthly_message_volume || null,
                white_label_level: formData.requirements.comms.white_label_level || 'none',
                languages_required: formData.requirements.comms.languages_required || ['English'],
              })
              .eq('module_selection_id', commsSelection.id);

            if (commsConfigError) {
              console.error('Comms config update error:', commsConfigError);
              // Non-fatal, continue
            }
          }
        }

        // Update FNOL config if provided
        if (formData.requirements.fnol && formData.modules.fnol) {
          const fnolSelection = moduleSelections.find((m) => m.module_type === 'fnol');
          if (fnolSelection) {
            const { error: fnolConfigError } = await supabase
              .from('fnol_module_configs')
              .update({
                desired_intake_methods: formData.requirements.fnol.desired_intake_methods || [],
                monthly_fnol_volume: formData.requirements.fnol.monthly_fnol_volume || null,
                lines_of_business: formData.requirements.fnol.lines_of_business || [],
                photo_required: formData.requirements.fnol.photo_required || false,
                video_required: formData.requirements.fnol.video_required || false,
              })
              .eq('module_selection_id', fnolSelection.id);

            if (fnolConfigError) {
              console.error('FNOL config update error:', fnolConfigError);
              // Non-fatal, continue
            }
          }
        }
      }

      // 6. Log activity
      await supabase.from('activity_logs').insert({
        project_id: projectId,
        user_id: null, // Anonymous submission
        action: 'onboarding_submitted',
        details: {
          company_name: formData.company.legal_name,
          contact_email: formData.contact.email,
          modules_selected: Object.entries(formData.modules)
            .filter(([, selected]) => selected)
            .map(([type]) => type),
        },
      });

      res.json({
        success: true,
        projectId,
        message: 'Onboarding form submitted successfully',
      });
    } catch (innerError) {
      // Attempt cleanup on failure
      console.error('Onboarding submission failed, attempting cleanup:', innerError);

      if (projectId) {
        await supabase.from('onboarding_projects').delete().eq('id', projectId);
      }
      if (contactId) {
        await supabase.from('contacts').delete().eq('id', contactId);
      }
      if (companyId) {
        await supabase.from('companies').delete().eq('id', companyId);
      }

      throw innerError;
    }
  } catch (error) {
    console.error('Onboarding submission error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit onboarding form',
    });
  }
});

/**
 * GET /api/onboarding/status/:projectId
 * Get the status of an onboarding submission (public, no auth required)
 * Used for confirmation pages
 */
router.get('/status/:projectId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId } = req.params;

    const { data: project, error } = await supabase
      .from('onboarding_projects')
      .select(`
        id,
        status,
        created_at,
        company:companies(legal_name, dba_name)
      `)
      .eq('id', projectId)
      .single();

    if (error || !project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    const companyData = Array.isArray(project.company) ? project.company[0] : project.company;
    res.json({
      success: true,
      project: {
        id: project.id,
        status: project.status,
        createdAt: project.created_at,
        companyName: (companyData as { legal_name: string } | null)?.legal_name,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ success: false, error: 'Failed to check status' });
  }
});

export default router;
