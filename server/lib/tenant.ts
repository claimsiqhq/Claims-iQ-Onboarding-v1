import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../shared/types';

/**
 * Tenant context for the current user
 */
export interface TenantContext {
  userId: string;
  userType: 'claims_iq_staff' | 'portal_user';
  companyId: string | null;
  email: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Custom error for tenant access violations
 */
export class TenantAccessError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

/**
 * Get tenant context from an authenticated Supabase client
 */
export async function getTenantContext(
  client: SupabaseClient<Database>,
  authUserId: string
): Promise<TenantContext | null> {
  // First, check if user is Claims IQ staff
  const { data: staffUser } = await client
    .from('users')
    .select('id, email, first_name, last_name')
    .eq('auth_user_id', authUserId)
    .single();

  if (staffUser) {
    return {
      userId: staffUser.id,
      userType: 'claims_iq_staff',
      companyId: null, // Staff can access all companies
      email: staffUser.email,
      firstName: staffUser.first_name,
      lastName: staffUser.last_name,
    };
  }

  // Check if user is a portal user
  const { data: portalUser } = await client
    .from('portal_users')
    .select(`
      id,
      company_id,
      contact:contacts(first_name, last_name, email)
    `)
    .eq('auth_user_id', authUserId)
    .single();

  if (portalUser) {
    // Handle the contact relation - it could be an array or object
    const contactData = portalUser.contact;
    const contact = Array.isArray(contactData) ? contactData[0] : contactData;
    return {
      userId: portalUser.id,
      userType: 'portal_user',
      companyId: portalUser.company_id,
      email: contact?.email || '',
      firstName: contact?.first_name,
      lastName: contact?.last_name,
    };
  }

  return null;
}

/**
 * Validate that a user has access to a specific project
 * This is defense-in-depth on top of RLS policies
 */
export async function validateProjectAccess(
  client: SupabaseClient<Database>,
  tenantContext: TenantContext,
  projectId: string
): Promise<boolean> {
  // Claims IQ staff can access all projects
  if (tenantContext.userType === 'claims_iq_staff') {
    // Verify project exists
    const { data: project } = await client
      .from('onboarding_projects')
      .select('id')
      .eq('id', projectId)
      .single();

    return !!project;
  }

  // Portal users can only access their company's projects
  if (tenantContext.userType === 'portal_user' && tenantContext.companyId) {
    const { data: project } = await client
      .from('onboarding_projects')
      .select('id, company_id')
      .eq('id', projectId)
      .eq('company_id', tenantContext.companyId)
      .single();

    return !!project;
  }

  return false;
}

/**
 * Validate that a user has access to a specific company
 */
export async function validateCompanyAccess(
  tenantContext: TenantContext,
  companyId: string
): Promise<boolean> {
  // Claims IQ staff can access all companies
  if (tenantContext.userType === 'claims_iq_staff') {
    return true;
  }

  // Portal users can only access their own company
  return tenantContext.companyId === companyId;
}

/**
 * Require project access or throw TenantAccessError
 */
export async function requireProjectAccess(
  client: SupabaseClient<Database>,
  tenantContext: TenantContext,
  projectId: string
): Promise<void> {
  const hasAccess = await validateProjectAccess(client, tenantContext, projectId);
  if (!hasAccess) {
    throw new TenantAccessError(`Access denied to project ${projectId}`);
  }
}

/**
 * Require company access or throw TenantAccessError
 */
export function requireCompanyAccess(
  tenantContext: TenantContext,
  companyId: string
): void {
  const hasAccess = validateCompanyAccess(tenantContext, companyId);
  if (!hasAccess) {
    throw new TenantAccessError(`Access denied to company ${companyId}`);
  }
}

/**
 * Require staff role or throw TenantAccessError
 */
export function requireStaffRole(tenantContext: TenantContext): void {
  if (tenantContext.userType !== 'claims_iq_staff') {
    throw new TenantAccessError('This action requires Claims IQ staff privileges');
  }
}
