import { supabase } from '../lib/supabase';
import { sendStatusUpdateEmail, getStatusLabel, getStatusMessage } from '../lib/email';

/**
 * Send status update notification when a project status changes
 */
export async function notifyStatusChange(
  projectId: string,
  previousStatus: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get project with company and primary contact
    const { data: project, error: projectError } = await supabase
      .from('onboarding_projects')
      .select(`
        id,
        company:companies(legal_name)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Failed to fetch project for notification:', projectError);
      return { success: false, error: 'Project not found' };
    }

    // Get primary contact separately
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('company_id', (project.company as any)?.id || project.id)
      .eq('role', 'primary')
      .limit(1);

    // Try to get contacts via company
    let contact = contacts?.[0];

    if (!contact) {
      // Fallback: get contact through company relationship
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('id', (project.company as any)?.id)
        .single();

      if (companyData) {
        const { data: fallbackContacts } = await supabase
          .from('contacts')
          .select('first_name, last_name, email')
          .eq('company_id', companyData.id)
          .limit(1);

        contact = fallbackContacts?.[0];
      }
    }

    if (!contact) {
      console.warn('No contact found for project notification:', projectId);
      return { success: false, error: 'No contact found for project' };
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    // Handle company which could be an array or object from the join
    const companyRaw = project.company;
    const companyData = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as { legal_name: string } | null;

    // Send the email
    const result = await sendStatusUpdateEmail(
      contact.email,
      {
        recipientName: `${contact.first_name} ${contact.last_name}`,
        companyName: companyData?.legal_name || 'Your Company',
        previousStatus: getStatusLabel(previousStatus),
        newStatus: getStatusLabel(newStatus),
        statusMessage: getStatusMessage(newStatus),
        portalUrl: `${appUrl}/portal`,
      },
      projectId
    );

    if (!result.success) {
      console.error('Failed to send status update email:', contact.email);
      return { success: false, error: 'Failed to send email' };
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      project_id: projectId,
      user_id: null, // System action
      action: 'status_notification_sent',
      details: {
        recipient_email: contact.email,
        previous_status: previousStatus,
        new_status: newStatus,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Status notification error:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Send notifications to all relevant contacts for a project
 * (e.g., when there are multiple contacts to notify)
 */
export async function notifyAllProjectContacts(
  projectId: string,
  previousStatus: string,
  newStatus: string
): Promise<{ success: boolean; sentCount: number; errors: string[] }> {
  try {
    // Get project with company
    const { data: project, error: projectError } = await supabase
      .from('onboarding_projects')
      .select(`
        id,
        company_id,
        company:companies(legal_name)
      `)
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return { success: false, sentCount: 0, errors: ['Project not found'] };
    }

    // Get all active contacts
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('first_name, last_name, email')
      .eq('company_id', project.company_id)
      .eq('is_active', true);

    if (contactError || !contacts?.length) {
      return { success: false, sentCount: 0, errors: ['No contacts found'] };
    }

    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    // Handle company which could be an array or object from the join
    const companyRaw = project.company;
    const companyData = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as { legal_name: string } | null;
    const errors: string[] = [];
    let sentCount = 0;

    // Send to each contact
    for (const contact of contacts) {
      const result = await sendStatusUpdateEmail(
        contact.email,
        {
          recipientName: `${contact.first_name} ${contact.last_name}`,
          companyName: companyData?.legal_name || 'Your Company',
          previousStatus: getStatusLabel(previousStatus),
          newStatus: getStatusLabel(newStatus),
          statusMessage: getStatusMessage(newStatus),
          portalUrl: `${appUrl}/portal`,
        },
        projectId
      );

      if (result.success) {
        sentCount++;
      } else {
        errors.push(`Failed to send to ${contact.email}`);
      }
    }

    return {
      success: sentCount > 0,
      sentCount,
      errors,
    };
  } catch (error) {
    console.error('Notify all contacts error:', error);
    return { success: false, sentCount: 0, errors: ['Internal error'] };
  }
}
