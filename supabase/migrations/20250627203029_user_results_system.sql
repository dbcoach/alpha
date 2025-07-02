/*
  # User Results Management System

  1. New Tables
    - `user_results` - Stores metadata about each stored result
    - `result_data` - Stores the actual result content
    - `result_categories` - User-defined categories for organizing results
    - `result_tags` - Flexible tagging system for results
    - `user_result_categories` - Junction table linking results to categories
    - `user_result_tags` - Junction table linking results to tags

  2. Security
    - Enable RLS on all tables
    - Add policies ensuring users can only access their own data

  3. Storage
    - Create user-results bucket for large result files
    - Add storage policies for file access control

  4. Indexes
    - Add performance indexes for search and filtering
*/

-- Main user results table
CREATE TABLE IF NOT EXISTS user_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  original_query text,
  result_format text NOT NULL CHECK (result_format IN ('json', 'csv', 'table')),
  storage_type text NOT NULL CHECK (storage_type IN ('inline', 'object_storage')),
  data_size_bytes integer DEFAULT 0,
  is_favorite boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

-- Result data storage table
CREATE TABLE IF NOT EXISTS result_data (
  result_id uuid PRIMARY KEY REFERENCES user_results(id) ON DELETE CASCADE,
  content_json jsonb,
  content_text text,
  object_storage_path text
);

-- Categories for organizing results
CREATE TABLE IF NOT EXISTS result_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Tags for flexible labeling
CREATE TABLE IF NOT EXISTS result_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

-- Junction table for result-category relationships
CREATE TABLE IF NOT EXISTS user_result_categories (
  result_id uuid REFERENCES user_results(id) ON DELETE CASCADE,
  category_id uuid REFERENCES result_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (result_id, category_id)
);

-- Junction table for result-tag relationships
CREATE TABLE IF NOT EXISTS user_result_tags (
  result_id uuid REFERENCES user_results(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES result_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (result_id, tag_id)
);

-- Enable Row Level Security
ALTER TABLE user_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_result_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_result_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_results
CREATE POLICY "Users can view their own results" ON user_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own results" ON user_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own results" ON user_results
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own results" ON user_results
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for result_data
CREATE POLICY "Users can view their own result data" ON result_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = result_data.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own result data" ON result_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = result_data.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own result data" ON result_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = result_data.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own result data" ON result_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = result_data.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

-- RLS Policies for result_categories
CREATE POLICY "Users can view their own categories" ON result_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories" ON result_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON result_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON result_categories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for result_tags
CREATE POLICY "Users can view their own tags" ON result_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON result_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON result_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON result_tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for user_result_categories junction table
CREATE POLICY "Users can view their own result categories" ON user_result_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = user_result_categories.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own result categories" ON user_result_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = user_result_categories.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own result categories" ON user_result_categories
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = user_result_categories.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

-- RLS Policies for user_result_tags junction table
CREATE POLICY "Users can view their own result tags" ON user_result_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = user_result_tags.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own result tags" ON user_result_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = user_result_tags.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own result tags" ON user_result_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_results 
      WHERE user_results.id = user_result_tags.result_id 
      AND user_results.user_id = auth.uid()
    )
  );

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_user_results_updated_at
  BEFORE UPDATE ON user_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for user results
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('user-results', 'user-results', false)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Storage policies for user results
DO $$
BEGIN
  CREATE POLICY "Users can upload their own results" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'user-results' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can view their own results" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'user-results' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update their own results" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'user-results' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete their own results" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'user-results' AND 
      auth.uid()::text = (storage.foldername(name))[1]
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_results_user_id ON user_results(user_id);
CREATE INDEX IF NOT EXISTS idx_user_results_created_at ON user_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_results_is_favorite ON user_results(is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_user_results_title_search ON user_results USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_user_results_description_search ON user_results USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_user_results_query_search ON user_results USING gin(to_tsvector('english', original_query));
CREATE INDEX IF NOT EXISTS idx_user_results_deleted_at ON user_results(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_result_categories_user_id ON result_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_result_categories_name ON result_categories(user_id, name);

CREATE INDEX IF NOT EXISTS idx_result_tags_user_id ON result_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_result_tags_name ON result_tags(user_id, name);

CREATE INDEX IF NOT EXISTS idx_user_result_categories_result_id ON user_result_categories(result_id);
CREATE INDEX IF NOT EXISTS idx_user_result_categories_category_id ON user_result_categories(category_id);

CREATE INDEX IF NOT EXISTS idx_user_result_tags_result_id ON user_result_tags(result_id);
CREATE INDEX IF NOT EXISTS idx_user_result_tags_tag_id ON user_result_tags(tag_id);