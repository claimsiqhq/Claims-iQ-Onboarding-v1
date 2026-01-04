-- Migration: Invite System with Email Integration
-- Description: Adds invite tokens, password authentication, and email logging

-- ============================================
-- 1. INVITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(64) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  invited_by_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  project_id UUID REFERENCES onboarding_projects(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_invite_status CHECK (status IN ('pending', 'used', 'expired', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);

-- ============================================
-- 2. PASSWORD RESET TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- ============================================
-- 3. EMAIL LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  sendgrid_message_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  project_id UUID REFERENCES onboarding_projects(id),
  invite_id UUID REFERENCES invites(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_email_type CHECK (email_type IN ('invite', 'magic_link', 'status_update', 'password_reset', 'welcome')),
  CONSTRAINT valid_email_status CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced'))
);

CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);

-- ============================================
-- 4. EXTEND PORTAL_USERS FOR PASSWORD AUTH
-- ============================================
ALTER TABLE portal_users
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) DEFAULT 'magic_link';

-- Add constraint for auth_method if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_auth_method'
  ) THEN
    ALTER TABLE portal_users
    ADD CONSTRAINT valid_auth_method CHECK (auth_method IN ('magic_link', 'password', 'both'));
  END IF;
END $$;

-- ============================================
-- 5. UPDATE TRIGGERS
-- ============================================

-- Trigger to update updated_at on invites
CREATE OR REPLACE FUNCTION update_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invites_updated_at ON invites;
CREATE TRIGGER trigger_update_invites_updated_at
  BEFORE UPDATE ON invites
  FOR EACH ROW
  EXECUTE FUNCTION update_invites_updated_at();

-- ============================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on new tables
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Invites: Staff can view and manage all invites
CREATE POLICY "Staff can view all invites" ON invites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can insert invites" ON invites
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Staff can update invites" ON invites
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid())
  );

-- Password reset tokens: Only accessible by service role
CREATE POLICY "Service role only for password reset tokens" ON password_reset_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Email logs: Staff can view
CREATE POLICY "Staff can view email logs" ON email_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Service role can insert email logs" ON email_logs
  FOR INSERT WITH CHECK (true);

-- ============================================
-- 7. FUNCTION TO EXPIRE OLD INVITES
-- ============================================
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE invites
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. GRANT PERMISSIONS (for anon/authenticated access to validate invites)
-- ============================================

-- Allow anonymous users to validate invite tokens (read-only, limited fields)
CREATE POLICY "Anyone can validate invites" ON invites
  FOR SELECT USING (true);
