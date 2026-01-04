import sgMail from '@sendgrid/mail';
import { supabase } from './supabase';

// Types
export interface EmailOptions {
  to: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
  subject?: string;
  html?: string;
  text?: string;
}

export interface InviteEmailData {
  recipientName?: string;
  companyName?: string;
  inviteUrl: string;
  expiresAt: string;
  invitedBy: string;
}

export interface StatusUpdateEmailData {
  recipientName: string;
  companyName: string;
  previousStatus: string;
  newStatus: string;
  statusMessage: string;
  portalUrl: string;
}

export interface MagicLinkEmailData {
  recipientName?: string;
  magicLinkUrl: string;
  expiresIn: string;
}

export interface PasswordResetEmailData {
  recipientName?: string;
  resetUrl: string;
  expiresIn: string;
}

export interface WelcomeEmailData {
  recipientName: string;
  companyName: string;
  portalUrl: string;
}

// Email type for logging
export type EmailType = 'invite' | 'magic_link' | 'status_update' | 'password_reset' | 'welcome';

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
} else {
  console.warn('SendGrid API key not configured. Emails will not be sent.');
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@claimsiq.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Claims iQ';

// Status labels for email templates
const STATUS_LABELS: Record<string, string> = {
  discovery_in_progress: 'Discovery In Progress',
  sow_pending: 'Statement of Work Pending',
  contract_signed: 'Contract Signed',
  onboarding: 'Onboarding',
  live: 'Live',
  churned: 'Churned',
};

const STATUS_MESSAGES: Record<string, string> = {
  discovery_in_progress: 'We are currently reviewing your requirements and preparing your proposal.',
  sow_pending: 'Your Statement of Work is ready for review. Please check your email for next steps.',
  contract_signed: 'Great news! Your contract has been signed and we are preparing your onboarding.',
  onboarding: 'Your onboarding process has officially begun! Our team is setting up your Claims iQ platform.',
  live: 'Congratulations! Your Claims iQ platform is now live and ready to use!',
  churned: 'Your project status has been updated.',
};

/**
 * Log email to database for audit trail
 */
async function logEmail(
  emailType: EmailType,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed',
  options?: {
    messageId?: string;
    errorMessage?: string;
    projectId?: string;
    inviteId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await supabase.from('email_logs').insert({
      email_type: emailType,
      recipient_email: recipientEmail,
      subject,
      status,
      sendgrid_message_id: options?.messageId,
      error_message: options?.errorMessage,
      project_id: options?.projectId,
      invite_id: options?.inviteId,
      metadata: options?.metadata || {},
    });
  } catch (error) {
    console.error('Failed to log email:', error);
  }
}

/**
 * Send an email via SendGrid
 */
export async function sendEmail(
  options: EmailOptions
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!apiKey) {
    console.warn('SendGrid not configured, email not sent:', options.to);
    return { success: false, error: 'SendGrid not configured' };
  }

  try {
    const msg = {
      to: options.to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: options.subject || 'Claims iQ Notification',
      ...(options.templateId
        ? {
            templateId: options.templateId,
            dynamicTemplateData: options.dynamicTemplateData,
          }
        : {
            html: options.html || '',
            text: options.text || '',
          }),
    } as sgMail.MailDataRequired;

    const [response] = await sgMail.send(msg);
    const messageId = response.headers['x-message-id'];

    return { success: true, messageId };
  } catch (error) {
    console.error('SendGrid error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send invite email to a prospective client
 */
export async function sendInviteEmail(
  email: string,
  data: InviteEmailData,
  inviteId?: string
): Promise<{ success: boolean; messageId?: string }> {
  const subject = 'You\'ve been invited to onboard with Claims iQ';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #1a56db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
        .company-name { font-weight: bold; color: #1a56db; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Claims iQ</h1>
        </div>
        <div class="content">
          <h2>You're Invited!</h2>
          <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
          <p>You have been invited to begin the onboarding process with <strong>Claims iQ</strong>.</p>
          ${data.companyName ? `<p>Company: <span class="company-name">${data.companyName}</span></p>` : ''}
          <p>Click the button below to start your onboarding:</p>
          <p style="text-align: center;">
            <a href="${data.inviteUrl}" class="button">Start Onboarding</a>
          </p>
          <p><strong>This link will expire on ${data.expiresAt}.</strong></p>
          <p>If you have any questions, please contact us.</p>
          <div class="footer">
            <p>Invited by: ${data.invitedBy}</p>
            <p>If you did not expect this invitation, please ignore this email.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
You're Invited to Claims iQ!

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

You have been invited to begin the onboarding process with Claims iQ.
${data.companyName ? `Company: ${data.companyName}` : ''}

Click here to start your onboarding: ${data.inviteUrl}

This link will expire on ${data.expiresAt}.

Invited by: ${data.invitedBy}

If you did not expect this invitation, please ignore this email.
  `;

  const result = await sendEmail({ to: email, subject, html, text });

  await logEmail('invite', email, subject, result.success ? 'sent' : 'failed', {
    messageId: result.messageId,
    errorMessage: result.error,
    inviteId,
  });

  return result;
}

/**
 * Send magic link email for authentication
 */
export async function sendMagicLinkEmail(
  email: string,
  data: MagicLinkEmailData
): Promise<{ success: boolean; messageId?: string }> {
  const subject = 'Your Claims iQ Sign-In Link';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #1a56db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Claims iQ</h1>
        </div>
        <div class="content">
          <h2>Sign In to Your Account</h2>
          <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
          <p>Click the button below to sign in to your Claims iQ portal:</p>
          <p style="text-align: center;">
            <a href="${data.magicLinkUrl}" class="button">Sign In</a>
          </p>
          <div class="warning">
            <strong>⚠️ This link expires in ${data.expiresIn}.</strong>
          </div>
          <div class="footer">
            <p>If you didn't request this sign-in link, you can safely ignore this email.</p>
            <p>For security, never share this link with anyone.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Sign In to Claims iQ

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

Click here to sign in to your Claims iQ portal: ${data.magicLinkUrl}

This link expires in ${data.expiresIn}.

If you didn't request this sign-in link, you can safely ignore this email.
For security, never share this link with anyone.
  `;

  const result = await sendEmail({ to: email, subject, html, text });

  await logEmail('magic_link', email, subject, result.success ? 'sent' : 'failed', {
    messageId: result.messageId,
    errorMessage: result.error,
  });

  return result;
}

/**
 * Send status update notification email
 */
export async function sendStatusUpdateEmail(
  email: string,
  data: StatusUpdateEmailData,
  projectId?: string
): Promise<{ success: boolean; messageId?: string }> {
  const subject = `Your Claims iQ Onboarding Status: ${data.newStatus}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #1a56db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .status-change { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .status-old { background: #e5e7eb; color: #374151; }
        .status-new { background: #10b981; color: white; }
        .arrow { margin: 0 15px; font-size: 24px; color: #9ca3af; }
        .message { background: #dbeafe; border-left: 4px solid #1a56db; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Claims iQ</h1>
        </div>
        <div class="content">
          <h2>Status Update</h2>
          <p>Hello ${data.recipientName},</p>
          <p>Your onboarding status for <strong>${data.companyName}</strong> has been updated:</p>

          <div class="status-change">
            <span class="status status-old">${data.previousStatus}</span>
            <span class="arrow">→</span>
            <span class="status status-new">${data.newStatus}</span>
          </div>

          <div class="message">
            <p>${data.statusMessage}</p>
          </div>

          <p style="text-align: center;">
            <a href="${data.portalUrl}" class="button">View in Portal</a>
          </p>

          <p>If you have any questions, please don't hesitate to reach out to your Claims iQ representative.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Status Update - Claims iQ

Hello ${data.recipientName},

Your onboarding status for ${data.companyName} has been updated:

${data.previousStatus} → ${data.newStatus}

${data.statusMessage}

View your portal: ${data.portalUrl}

If you have any questions, please don't hesitate to reach out to your Claims iQ representative.
  `;

  const result = await sendEmail({ to: email, subject, html, text });

  await logEmail('status_update', email, subject, result.success ? 'sent' : 'failed', {
    messageId: result.messageId,
    errorMessage: result.error,
    projectId,
    metadata: { previousStatus: data.previousStatus, newStatus: data.newStatus },
  });

  return result;
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  data: PasswordResetEmailData
): Promise<{ success: boolean; messageId?: string }> {
  const subject = 'Reset Your Claims iQ Password';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #1a56db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #666; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 4px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Claims iQ</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello${data.recipientName ? ` ${data.recipientName}` : ''},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center;">
            <a href="${data.resetUrl}" class="button">Reset Password</a>
          </p>
          <div class="warning">
            <strong>⚠️ This link expires in ${data.expiresIn}.</strong>
          </div>
          <div class="footer">
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <p>For security, never share this link with anyone.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Reset Your Claims iQ Password

Hello${data.recipientName ? ` ${data.recipientName}` : ''},

We received a request to reset your password. Click here to create a new password:
${data.resetUrl}

This link expires in ${data.expiresIn}.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
For security, never share this link with anyone.
  `;

  const result = await sendEmail({ to: email, subject, html, text });

  await logEmail('password_reset', email, subject, result.success ? 'sent' : 'failed', {
    messageId: result.messageId,
    errorMessage: result.error,
  });

  return result;
}

/**
 * Send welcome email after onboarding submission
 */
export async function sendWelcomeEmail(
  email: string,
  data: WelcomeEmailData,
  projectId?: string
): Promise<{ success: boolean; messageId?: string }> {
  const subject = 'Welcome to Claims iQ!';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #1a56db; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .step { display: flex; margin: 10px 0; }
        .step-number { background: #1a56db; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to Claims iQ!</h1>
        </div>
        <div class="content">
          <h2>Thank You for Choosing Us</h2>
          <p>Hello ${data.recipientName},</p>
          <p>Thank you for completing the onboarding form for <strong>${data.companyName}</strong>. We're excited to work with you!</p>

          <div class="steps">
            <h3>What's Next?</h3>
            <div class="step">
              <div class="step-number">1</div>
              <p><strong>Discovery:</strong> Our team will review your requirements and prepare a detailed proposal.</p>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <p><strong>Statement of Work:</strong> We'll send you a customized SOW for your review.</p>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <p><strong>Onboarding:</strong> Once approved, we'll begin setting up your Claims iQ platform.</p>
            </div>
          </div>

          <p>You can track your onboarding progress anytime in our portal:</p>
          <p style="text-align: center;">
            <a href="${data.portalUrl}" class="button">Access Portal</a>
          </p>

          <p>We'll be in touch shortly with next steps!</p>
          <p>Best regards,<br>The Claims iQ Team</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to Claims iQ!

Hello ${data.recipientName},

Thank you for completing the onboarding form for ${data.companyName}. We're excited to work with you!

What's Next?

1. Discovery: Our team will review your requirements and prepare a detailed proposal.
2. Statement of Work: We'll send you a customized SOW for your review.
3. Onboarding: Once approved, we'll begin setting up your Claims iQ platform.

You can track your onboarding progress anytime in our portal: ${data.portalUrl}

We'll be in touch shortly with next steps!

Best regards,
The Claims iQ Team
  `;

  const result = await sendEmail({ to: email, subject, html, text });

  await logEmail('welcome', email, subject, result.success ? 'sent' : 'failed', {
    messageId: result.messageId,
    errorMessage: result.error,
    projectId,
  });

  return result;
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Get status message for notification
 */
export function getStatusMessage(status: string): string {
  return STATUS_MESSAGES[status] || 'Your project status has been updated.';
}
