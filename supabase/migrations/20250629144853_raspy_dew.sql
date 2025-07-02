/*
  # Fix Conversations Table Policies

  1. Cleanup
    - Drop existing policies on the conversations table to resolve conflicts
  
  2. Security
    - Re-create the policy with proper access controls
    - Ensure users can only access their own conversation data
*/

-- Drop the existing policy if it exists to avoid the "already exists" error
DROP POLICY IF EXISTS "Users can access own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can access their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

-- Re-create the comprehensive policy with proper access controls
CREATE POLICY "Users can access own conversations"
  ON conversations
  FOR ALL
  USING (auth.uid() = user_id);

-- Make sure RLS is enabled for the conversations table
ALTER TABLE IF EXISTS conversations ENABLE ROW LEVEL SECURITY;

-- Validate policies
SELECT 
  schemaname, 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'conversations';