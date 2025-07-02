-- Run this SQL script in your Supabase SQL Editor to fix the policy conflicts
-- This will safely reset all policies and ensure the database is ready for the application

-- Step 1: Clean up existing policies to avoid conflicts
DO $$ 
DECLARE
    pol record;
BEGIN
    -- Drop all existing policies on database_projects
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'database_projects' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON database_projects', pol.policyname);
    END LOOP;
    
    -- Drop all existing policies on database_sessions  
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'database_sessions' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON database_sessions', pol.policyname);
    END LOOP;
    
    -- Drop all existing policies on database_queries
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'database_queries' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON database_queries', pol.policyname);
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE database_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_queries ENABLE ROW LEVEL SECURITY;

-- Step 3: Create fresh policies for database_projects
CREATE POLICY "Users can view their own projects" ON database_projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON database_projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON database_projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON database_projects
  FOR DELETE USING (auth.uid() = user_id);

-- Step 4: Create fresh policies for database_sessions
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

-- Step 5: Create fresh policies for database_queries
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

-- Step 6: Ensure the update function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Clean up and recreate triggers
DROP TRIGGER IF EXISTS update_database_projects_updated_at ON database_projects;
DROP TRIGGER IF EXISTS update_database_sessions_updated_at ON database_sessions;

CREATE TRIGGER update_database_projects_updated_at
  BEFORE UPDATE ON database_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_sessions_updated_at
  BEFORE UPDATE ON database_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database policies and triggers have been successfully reset!' AS status;