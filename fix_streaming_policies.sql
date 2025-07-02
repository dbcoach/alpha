-- Quick fix for streaming table policy conflicts
-- Run this directly in Supabase SQL editor if needed

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Users can only access their own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "Users can view own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "Users can insert own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "Users can update own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "Users can delete own streaming sessions" ON streaming_sessions;
DROP POLICY IF EXISTS "streaming_sessions_access" ON streaming_sessions;

DROP POLICY IF EXISTS "Users can only access chunks from their own sessions" ON streaming_chunks;
DROP POLICY IF EXISTS "Users can view own streaming chunks" ON streaming_chunks;
DROP POLICY IF EXISTS "Users can insert own streaming chunks" ON streaming_chunks;
DROP POLICY IF EXISTS "Users can update own streaming chunks" ON streaming_chunks;
DROP POLICY IF EXISTS "Users can delete own streaming chunks" ON streaming_chunks;
DROP POLICY IF EXISTS "streaming_chunks_access" ON streaming_chunks;

DROP POLICY IF EXISTS "Users can only access insights from their own sessions" ON streaming_insights;
DROP POLICY IF EXISTS "Users can view own streaming insights" ON streaming_insights;
DROP POLICY IF EXISTS "Users can insert own streaming insights" ON streaming_insights;
DROP POLICY IF EXISTS "Users can update own streaming insights" ON streaming_insights;
DROP POLICY IF EXISTS "Users can delete own streaming insights" ON streaming_insights;
DROP POLICY IF EXISTS "streaming_insights_access" ON streaming_insights;

-- Create simple, clean policies
CREATE POLICY "streaming_sessions_policy" ON streaming_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "streaming_chunks_policy" ON streaming_chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM streaming_sessions 
            WHERE streaming_sessions.id = streaming_chunks.streaming_session_id 
            AND streaming_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "streaming_insights_policy" ON streaming_insights
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM streaming_sessions 
            WHERE streaming_sessions.id = streaming_insights.streaming_session_id 
            AND streaming_sessions.user_id = auth.uid()
        )
    );