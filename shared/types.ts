// Database types for Supabase
// These match the database schema deployed in Supabase

export type CompanySize = 'micro' | 'small' | 'medium' | 'large' | 'enterprise';
export type ContactRole = 'primary' | 'technical' | 'executive' | 'billing' | 'other';
export type ProjectStatus =
  | 'discovery_in_progress'
  | 'sow_pending'
  | 'contract_signed'
  | 'onboarding'
  | 'live'
  | 'churned';
export type ModuleType = 'core' | 'comms' | 'fnol';
export type WhiteLabelLevel = 'none' | 'basic' | 'full';
export type ChecklistStatus = 'pending' | 'in_progress' | 'complete' | 'blocked';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';

// Core Tables

export interface Company {
  id: string;
  legal_name: string;
  dba_name: string | null;
  website: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  company_size: CompanySize | null;
  lines_of_business: string[];
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  title: string | null;
  role: ContactRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OnboardingProject {
  id: string;
  company_id: string;
  status: ProjectStatus;
  stage: string | null;
  target_go_live_date: string | null;
  actual_go_live_date: string | null;
  assigned_csm_id: string | null;
  sow_signed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleSelection {
  id: string;
  project_id: string;
  module_type: ModuleType;
  is_selected: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoreModuleConfig {
  id: string;
  module_selection_id: string;
  claim_types: string[];
  perils: string[];
  document_types: string[];
  monthly_claim_volume: number | null;
  monthly_document_volume: number | null;
  pain_points: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommsModuleConfig {
  id: string;
  module_selection_id: string;
  desired_channels: string[];
  monthly_message_volume: number | null;
  white_label_level: WhiteLabelLevel;
  languages_required: string[];
  created_at: string;
  updated_at: string;
}

export interface FnolModuleConfig {
  id: string;
  module_selection_id: string;
  desired_intake_methods: string[];
  monthly_fnol_volume: number | null;
  lines_of_business: string[];
  photo_required: boolean;
  video_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationConfig {
  id: string;
  project_id: string;
  system_name: string;
  system_type: string;
  connection_method: string | null;
  api_documentation_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SecurityComplianceConfig {
  id: string;
  project_id: string;
  sso_required: boolean;
  sso_provider: string | null;
  data_retention_days: number | null;
  geographic_restrictions: string[];
  compliance_requirements: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  order_index: number;
  required_for_modules: ModuleType[];
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  project_id: string;
  template_id: string;
  status: ChecklistStatus;
  assigned_to_id: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  uploaded_by_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  project_id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface User {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PortalUser {
  id: string;
  auth_user_id: string;
  company_id: string;
  contact_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Composite Types for API responses

export interface ModuleSelectionWithConfig extends ModuleSelection {
  core_config: CoreModuleConfig | null;
  comms_config: CommsModuleConfig | null;
  fnol_config: FnolModuleConfig | null;
}

export interface ChecklistItemWithTemplate extends ChecklistItem {
  template: ChecklistTemplate;
}

export interface ProjectWithDetails extends OnboardingProject {
  company: Company;
  module_selections: ModuleSelectionWithConfig[];
  checklist_items: ChecklistItemWithTemplate[];
  documents: Document[];
  contacts: Contact[];
  primary_contact: Contact | null;
  integration_configs: IntegrationConfig[];
  security_compliance_config: SecurityComplianceConfig | null;
}

export interface ProjectSummary {
  id: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
  target_go_live_date: string | null;
  company: {
    id: string;
    legal_name: string;
    dba_name: string | null;
  } | null;
  primary_contact: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  module_selections: {
    module_type: string;
    is_selected: boolean;
  }[];
  checklist_progress: {
    total: number;
    completed: number;
  };
}

// Supabase Database type for client
// Note: For full type safety, use `npx supabase gen types typescript` to generate types
// This is a simplified version that provides basic structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

// Onboarding Form Data type (used for form submission)
export interface OnboardingFormData {
  company: {
    legal_name: string;
    dba_name?: string;
    website?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    company_size?: CompanySize;
    lines_of_business: string[];
  };
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    title?: string;
  };
  modules: {
    core: boolean;
    comms: boolean;
    fnol: boolean;
  };
  requirements?: {
    core?: {
      claim_types: string[];
      perils: string[];
      document_types: string[];
      monthly_claim_volume?: number;
      monthly_document_volume?: number;
      pain_points?: string;
    };
    comms?: {
      desired_channels: string[];
      monthly_message_volume?: number;
      white_label_level?: WhiteLabelLevel;
      languages_required: string[];
    };
    fnol?: {
      desired_intake_methods: string[];
      monthly_fnol_volume?: number;
      lines_of_business: string[];
      photo_required: boolean;
      video_required: boolean;
    };
  };
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface OnboardingSubmitResponse {
  success: boolean;
  projectId?: string;
  error?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  userType: 'claims_iq_staff' | 'portal_user';
  companyId: string | null;
  firstName?: string;
  lastName?: string;
}
