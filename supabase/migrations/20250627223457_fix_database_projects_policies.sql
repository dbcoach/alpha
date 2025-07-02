-- Fix database projects policies by ensuring clean state
-- This migration safely recreates all policies and ensures the database is ready

-- First, ensure tables exist (they should, but just in case)
CREATE TABLE IF NOT EXISTS database_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  database_name text NOT NULL,
  database_type text NOT NULL CHECK (database_type IN ('SQL', 'NoSQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'SQLite')),
  description text,
  last_accessed timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS database_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES database_projects(id) ON DELETE CASCADE,
  session_name text,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS database_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES database_sessions(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES database_projects(id) ON DELETE CASCADE,
  query_text text NOT NULL,
  query_type text NOT NULL CHECK (query_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'OTHER')),
  results_data jsonb,
  results_format text NOT NULL CHECK (results_format IN ('json', 'csv', 'table')),
  execution_time_ms integer,
  row_count integer,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE database_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_queries ENABLE ROW LEVEL SECURITY;

-- Clean slate: Drop ALL existing policies to avoid conflicts
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Drop all policies on database_projects
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE tablename = 'database_projects' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
    
    -- Drop all policies on database_sessions
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE tablename = 'database_sessions' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
    
    -- Drop all policies on database_queries
    FOR pol IN SELECT schemaname, tablename, policyname 
               FROM pg_policies 
               WHERE tablename = 'database_queries' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Create fresh policies for database_projects
CREATE POLICY "Users can view their own projects" ON database_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON database_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON database_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON database_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Create fresh policies for database_sessions
CREATE POLICY "Users can view sessions for their projects" ON database_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM database_projects 
      WHERE database_projects.id = database_sessions.project_id 
      AND database_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert sessions for their projects" ON database_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM database_projects 
      WHERE database_projects.id = database_sessions.project_id 
      AND database_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sessions for their projects" ON database_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM database_projects 
      WHERE database_projects.id = database_sessions.project_id 
      AND database_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sessions for their projects" ON database_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM database_projects 
      WHERE database_projects.id = database_sessions.project_id 
      AND database_projects.user_id = auth.uid()
    )
  );

-- Create fresh policies for database_queries
CREATE POLICY "Users can view queries for their projects" ON database_queries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM database_projects 
      WHERE database_projects.id = database_queries.project_id 
      AND database_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert queries for their projects" ON database_queries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM database_projects 
      WHERE database_projects.id = database_queries.project_id 
      AND database_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update queries for their projects" ON database_queries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM database_projects 
      WHERE database_projects.id = database_queries.project_id 
      AND database_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete queries for their projects" ON database_queries
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM database_projects 
      WHERE database_projects.id = database_queries.project_id 
      AND database_projects.user_id = auth.uid()
    )
  );

-- Ensure the update_updated_at_column function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Clean slate: Drop existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_database_projects_updated_at ON database_projects;
DROP TRIGGER IF EXISTS update_database_sessions_updated_at ON database_sessions;

-- Create fresh triggers for automatic timestamp updates
CREATE TRIGGER update_database_projects_updated_at
  BEFORE UPDATE ON database_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_sessions_updated_at
  BEFORE UPDATE ON database_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create performance indexes (using IF NOT EXISTS to be safe)
CREATE INDEX IF NOT EXISTS idx_database_projects_user_id ON database_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_database_projects_last_accessed ON database_projects(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_database_projects_database_name ON database_projects USING gin(to_tsvector('english', database_name));

CREATE INDEX IF NOT EXISTS idx_database_sessions_project_id ON database_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_database_sessions_created_at ON database_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_database_queries_session_id ON database_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_database_queries_project_id ON database_queries(project_id);
CREATE INDEX IF NOT EXISTS idx_database_queries_created_at ON database_queries(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_database_queries_query_text ON database_queries USING gin(to_tsvector('english', query_text));
CREATE INDEX IF NOT EXISTS idx_database_queries_success ON database_queries(success, created_at DESC);