/*
  # Streaming Data Capture System

  1. New Tables
    - `streaming_sessions` - Main session information and metadata
    - `streaming_chunks` - Individual content chunks from streaming generation
    - `streaming_insights` - Reasoning and decision insights during generation

  2. Purpose
    - Capture and persist real-time streaming generation data
    - Allow users to review and share their generation sessions
    - Support for continuation and history viewing
*/

-- Create streaming_sessions table
CREATE TABLE IF NOT EXISTS streaming_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    project_id UUID REFERENCES database_projects(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    database_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('initializing', 'streaming', 'completed', 'error')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completion_data JSONB,
    error_message TEXT
);

-- Create streaming_chunks table
CREATE TABLE IF NOT EXISTS streaming_chunks (
    id TEXT PRIMARY KEY,
    streaming_session_id TEXT NOT NULL REFERENCES streaming_sessions(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    task_title TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('text', 'code', 'schema', 'query')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Create streaming_insights table
CREATE TABLE IF NOT EXISTS streaming_insights (
    id TEXT PRIMARY KEY,
    streaming_session_id TEXT NOT NULL REFERENCES streaming_sessions(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    message TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('reasoning', 'decision', 'progress', 'completion')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_user_id ON streaming_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_status ON streaming_sessions(status);
CREATE INDEX IF NOT EXISTS idx_streaming_sessions_created_at ON streaming_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_streaming_chunks_session_id ON streaming_chunks(streaming_session_id);
CREATE INDEX IF NOT EXISTS idx_streaming_chunks_chunk_index ON streaming_chunks(streaming_session_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_streaming_chunks_timestamp ON streaming_chunks(timestamp);

CREATE INDEX IF NOT EXISTS idx_streaming_insights_session_id ON streaming_insights(streaming_session_id);
CREATE INDEX IF NOT EXISTS idx_streaming_insights_timestamp ON streaming_insights(timestamp);

-- Row Level Security (RLS)
ALTER TABLE streaming_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can only access their own streaming sessions" ON streaming_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access chunks from their own sessions" ON streaming_chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM streaming_sessions 
            WHERE streaming_sessions.id = streaming_chunks.streaming_session_id 
            AND streaming_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access insights from their own sessions" ON streaming_insights
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM streaming_sessions 
            WHERE streaming_sessions.id = streaming_insights.streaming_session_id 
            AND streaming_sessions.user_id = auth.uid()
        )
    );

-- Create function for table creation (used by the service)
CREATE OR REPLACE FUNCTION create_streaming_tables()
RETURNS VOID AS $$
BEGIN
    -- This function is called by the service to ensure tables exist
    -- Tables are already created above, so this just returns
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;