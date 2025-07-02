-- Create conversations table for ChatGPT-like conversation history
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  db_type TEXT NOT NULL,
  title TEXT NOT NULL,
  generated_content JSONB DEFAULT '{}',
  insights JSONB DEFAULT '[]',
  tasks JSONB DEFAULT '[]',
  status TEXT DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create basic indexes for performance (no trigram extensions needed)
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS conversations_title_idx ON conversations(title);
CREATE INDEX IF NOT EXISTS conversations_db_type_idx ON conversations(db_type);

-- Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop the existing policy first to avoid the "already exists" error
DROP POLICY IF EXISTS "Users can access own conversations" ON conversations;

-- Policy: Users can only access their own conversations
CREATE POLICY "Users can access own conversations" ON conversations
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON conversations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversations TO service_role;