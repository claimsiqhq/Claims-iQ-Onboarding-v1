import { z } from 'zod';

// Company size enum
export const companySizeSchema = z.enum(['micro', 'small', 'medium', 'large', 'enterprise']);

// Contact role enum
export const contactRoleSchema = z.enum(['primary', 'technical', 'executive', 'billing', 'other']);

// Project status enum
export const projectStatusSchema = z.enum([
  'discovery_in_progress',
  'sow_pending',
  'contract_signed',
  'onboarding',
  'live',
  'churned',
]);

// Module type enum
export const moduleTypeSchema = z.enum(['core', 'comms', 'fnol']);

// White label level enum
export const whiteLabelLevelSchema = z.enum(['none', 'basic', 'full']);

// Checklist status enum
export const checklistStatusSchema = z.enum(['pending', 'in_progress', 'complete', 'blocked']);

// Company validation schema
export const companySchema = z.object({
  legal_name: z.string().min(1, 'Company name is required').max(255),
  dba_name: z.string().max(255).optional().nullable(),
  website: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  address_line_1: z.string().min(1, 'Address is required').max(255),
  address_line_2: z.string().max(255).optional().nullable(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  postal_code: z.string().min(1, 'Postal code is required').max(20),
  company_size: companySizeSchema.optional().nullable(),
  lines_of_business: z.array(z.string()).default([]),
});

// Contact validation schema
export const contactSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(30).optional().nullable(),
  title: z.string().max(100).optional().nullable(),
});

// Module selection schema
export const modulesSchema = z.object({
  core: z.boolean().default(false),
  comms: z.boolean().default(false),
  fnol: z.boolean().default(false),
}).refine((data) => data.core || data.comms || data.fnol, {
  message: 'At least one module must be selected',
});

// Core module requirements schema
export const coreRequirementsSchema = z.object({
  claim_types: z.array(z.string()).default([]),
  perils: z.array(z.string()).default([]),
  document_types: z.array(z.string()).default([]),
  monthly_claim_volume: z.number().int().positive().optional().nullable(),
  monthly_document_volume: z.number().int().positive().optional().nullable(),
  pain_points: z.string().max(2000).optional().nullable(),
});

// Comms module requirements schema
export const commsRequirementsSchema = z.object({
  desired_channels: z.array(z.string()).default([]),
  monthly_message_volume: z.number().int().positive().optional().nullable(),
  white_label_level: whiteLabelLevelSchema.default('none'),
  languages_required: z.array(z.string()).default(['English']),
});

// FNOL module requirements schema
export const fnolRequirementsSchema = z.object({
  desired_intake_methods: z.array(z.string()).default([]),
  monthly_fnol_volume: z.number().int().positive().optional().nullable(),
  lines_of_business: z.array(z.string()).default([]),
  photo_required: z.boolean().default(false),
  video_required: z.boolean().default(false),
});

// Combined requirements schema
export const requirementsSchema = z.object({
  core: coreRequirementsSchema.optional(),
  comms: commsRequirementsSchema.optional(),
  fnol: fnolRequirementsSchema.optional(),
}).optional();

// Complete onboarding form schema
export const onboardingFormSchema = z.object({
  company: companySchema,
  contact: contactSchema,
  modules: modulesSchema,
  requirements: requirementsSchema,
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Verify OTP schema
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z.string().min(6, 'Token must be at least 6 characters'),
});

// Checklist item update schema
export const updateChecklistItemSchema = z.object({
  status: checklistStatusSchema,
  notes: z.string().max(2000).optional().nullable(),
});

// Project update schema (for discovery phase)
export const updateProjectSchema = z.object({
  status: projectStatusSchema.optional(),
  target_go_live_date: z.string().datetime().optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

// Type exports
export type CompanyInput = z.infer<typeof companySchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ModulesInput = z.infer<typeof modulesSchema>;
export type CoreRequirementsInput = z.infer<typeof coreRequirementsSchema>;
export type CommsRequirementsInput = z.infer<typeof commsRequirementsSchema>;
export type FnolRequirementsInput = z.infer<typeof fnolRequirementsSchema>;
export type RequirementsInput = z.infer<typeof requirementsSchema>;
export type OnboardingFormInput = z.infer<typeof onboardingFormSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
