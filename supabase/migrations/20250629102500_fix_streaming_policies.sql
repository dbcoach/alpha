/*
  # Fix streaming table policies
  
  1. Drop any existing conflicting policies
  2. Recreate clean policies with IF NOT EXISTS pattern
  3. Ensure streaming tables work properly
*/

-- Drop existing policies if they exist (suppress errors)
DROP POLICY IF EXISTS "Users can only access their own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "Users can view own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "Users can insert own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "Users can update own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "Users can delete own streaming sessions" ON streaming_sessions;

DROP POLICY IF EXISTS "Users can only access chunks from their own sessions" ON streaming_chunks;
DROP POLICY IF EXISTS "Users can view own streaming chunks" ON streaming_chunks;
DROP POLICY IF EXISTS "Users can insert own streaming chunks" ON streaming_chunks;
DROP POLICY IF EXISTS "Users can update own streaming chunks" ON streaming_chunks;
DROP POLICY IF EXISTS "Users can delete own streaming chunks" ON streaming_chunks;

DROP POLICY IF EXISTS "Users can only access insights from their own sessions" ON streaming_insights;
DROP POLICY IF EXISTS "Users can view own streaming insights" ON streaming_insights;
DROP POLICY IF EXISTS "Users can insert own streaming insights" ON streaming_insights;
DROP POLICY IF EXISTS "Users can update own streaming insights" ON streaming_insights;
DROP POLICY IF EXISTS "Users can delete own streaming insights" ON streaming_insights;

-- Create new clean policies
-- Streaming sessions policies
CREATE POLICY "streaming_sessions_user_access" ON streaming_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Streaming chunks policies  
CREATE POLICY "streaming_chunks_user_access" ON streaming_chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM streaming_sessions 
            WHERE streaming_sessions.id = streaming_chunks.streaming_session_id 
            AND streaming_sessions.user_id = auth.uid()
        )
    );

-- Streaming insights policies
CREATE POLICY "streaming_insights_user_access" ON streaming_insights
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM streaming_sessions 
            WHERE streaming_sessions.id = streaming_insights.streaming_session_id 
            AND streaming_sessions.user_id = auth.uid()
        )
    );