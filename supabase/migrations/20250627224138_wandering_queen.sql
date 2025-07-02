/*
  # Database Projects System

  This replaces the previous results system with a project-centric approach
  that matches the bolt.new style interface where users can:
  1. See a list of database projects they've worked on
  2. Click on a project to see all sessions and history
  3. View detailed query history for each session

  ## Tables Structure:
  - database_projects: Main project list (like bolt.new project list)
  - database_sessions: Work sessions within each project
  - database_queries: Individual queries and results within sessions
*/

-- Main database projects table (replaces user_results concept)
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

-- Sessions within each project (work periods/conversations)
CREATE TABLE IF NOT EXISTS database_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES database_projects(id) ON DELETE CASCADE,
  session_name text,
  description text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Individual queries and their results within sessions
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

-- Enable Row Level Security
ALTER TABLE database_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE database_queries ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies only if they don't already exist
DO $$
BEGIN
  -- RLS Policies for database_projects
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_projects' AND policyname = 'Users can view their own projects'
  ) THEN
    CREATE POLICY "Users can view their own projects" ON database_projects
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_projects' AND policyname = 'Users can insert their own projects'
  ) THEN
    CREATE POLICY "Users can insert their own projects" ON database_projects
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_projects' AND policyname = 'Users can update their own projects'
  ) THEN
    CREATE POLICY "Users can update their own projects" ON database_projects
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_projects' AND policyname = 'Users can delete their own projects'
  ) THEN
    CREATE POLICY "Users can delete their own projects" ON database_projects
      FOR DELETE USING (auth.uid() = user_id);
  END IF;

  -- RLS Policies for database_sessions
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_sessions' AND policyname = 'Users can view sessions for their projects'
  ) THEN
    CREATE POLICY "Users can view sessions for their projects" ON database_sessions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM database_projects 
          WHERE database_projects.id = database_sessions.project_id 
          AND database_projects.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_sessions' AND policyname = 'Users can insert sessions for their projects'
  ) THEN
    CREATE POLICY "Users can insert sessions for their projects" ON database_sessions
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM database_projects 
          WHERE database_projects.id = database_sessions.project_id 
          AND database_projects.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_sessions' AND policyname = 'Users can update sessions for their projects'
  ) THEN
    CREATE POLICY "Users can update sessions for their projects" ON database_sessions
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM database_projects 
          WHERE database_projects.id = database_sessions.project_id 
          AND database_projects.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_sessions' AND policyname = 'Users can delete sessions for their projects'
  ) THEN
    CREATE POLICY "Users can delete sessions for their projects" ON database_sessions
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM database_projects 
          WHERE database_projects.id = database_sessions.project_id 
          AND database_projects.user_id = auth.uid()
        )
      );
  END IF;

  -- RLS Policies for database_queries
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_queries' AND policyname = 'Users can view queries for their projects'
  ) THEN
    CREATE POLICY "Users can view queries for their projects" ON database_queries
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM database_projects 
          WHERE database_projects.id = database_queries.project_id 
          AND database_projects.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_queries' AND policyname = 'Users can insert queries for their projects'
  ) THEN
    CREATE POLICY "Users can insert queries for their projects" ON database_queries
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM database_projects 
          WHERE database_projects.id = database_queries.project_id 
          AND database_projects.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_queries' AND policyname = 'Users can update queries for their projects'
  ) THEN
    CREATE POLICY "Users can update queries for their projects" ON database_queries
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM database_projects 
          WHERE database_projects.id = database_queries.project_id 
          AND database_projects.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'database_queries' AND policyname = 'Users can delete queries for their projects'
  ) THEN
    CREATE POLICY "Users can delete queries for their projects" ON database_queries
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM database_projects 
          WHERE database_projects.id = database_queries.project_id 
          AND database_projects.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- Create triggers if they don't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_database_projects_updated_at'
  ) THEN
    CREATE TRIGGER update_database_projects_updated_at
      BEFORE UPDATE ON database_projects
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_database_sessions_updated_at'
  ) THEN
    CREATE TRIGGER update_database_sessions_updated_at
      BEFORE UPDATE ON database_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- Create indexes if they don't already exist
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