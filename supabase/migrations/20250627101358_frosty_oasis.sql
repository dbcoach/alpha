/*
  # Create API Keys Management System

  1. New Tables
    - `api_keys` - Store encrypted API keys with metadata
    - `api_key_usage_logs` - Track API key usage for analytics and rate limiting
    - `security_audit_logs` - Log security events for monitoring

  2. Security
    - Enable RLS on all tables
    - Add policies for user access control
    - Secure storage of encrypted key data

  3. Features
    - Comprehensive API key management
    - Usage tracking and analytics
    - Rate limiting support
    - IP whitelisting
    - Key expiration
    - Security audit logging
*/

-- Create API Keys table with all required fields
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL, -- Encrypted/hashed version of the actual key
  key_preview TEXT NOT NULL, -- First few characters for UI display
  permissions TEXT[] DEFAULT ARRAY['read'] NOT NULL,
  ip_whitelist TEXT[], -- Array of allowed IP addresses/CIDR blocks
  expires_at TIMESTAMPTZ, -- Optional expiration date
  last_used TIMESTAMPTZ, -- Last time the key was used
  usage_count INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create API Key Usage Logs table for tracking and rate limiting
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  client_ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  user_agent TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create Security Audit Logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- e.g., 'api_key_created', 'api_key_rotated', 'ip_whitelist_violation'
  metadata JSONB, -- Additional event-specific data
  client_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for api_key_usage_logs
CREATE POLICY "Users can view usage logs for their API keys" ON api_key_usage_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM api_keys 
      WHERE api_keys.id = api_key_usage_logs.api_key_id 
      AND api_keys.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert usage logs" ON api_key_usage_logs
  FOR INSERT WITH CHECK (true); -- Allow system to log usage

-- RLS Policies for security_audit_logs
CREATE POLICY "Users can view their own security logs" ON security_audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert security logs" ON security_audit_logs
  FOR INSERT WITH CHECK (true); -- Allow system to log security events

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_usage_count(key_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE api_keys 
  SET usage_count = usage_count + 1
  WHERE id = key_id
  RETURNING usage_count INTO new_count;
  
  RETURN COALESCE(new_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_client_ip ON api_key_usage_logs(client_ip);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at DESC);

-- Create a function to clean up old usage logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_key_usage_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to clean up old security logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_security_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM security_audit_logs 
  WHERE created_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON api_keys TO authenticated;
GRANT ALL ON api_key_usage_logs TO authenticated;
GRANT ALL ON security_audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION increment_usage_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_usage_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_security_logs() TO authenticated;