import { supabase } from '../lib/supabase';
import { databaseProjectsService } from './databaseProjectsService';

export interface StreamingData {
  id: string;
  user_id: string;
  session_id: string;
  project_id?: string;
  prompt: string;
  database_type: string;
  status: 'initializing' | 'streaming' | 'completed' | 'error';
  created_at: string;
  updated_at: string;
  completion_data?: any;
  error_message?: string;
}

export interface StreamingChunk {
  id: string;
  streaming_session_id: string;
  task_id: string;
  task_title: string;
  agent_name: string;
  chunk_index: number;
  content: string;
  content_type: 'text' | 'code' | 'schema' | 'query';
  timestamp: string;
  metadata?: any;
}

export interface StreamingInsight {
  id: string;
  streaming_session_id: string;
  agent_name: string;
  message: string;
  insight_type: 'reasoning' | 'decision' | 'progress' | 'completion';
  timestamp: string;
  metadata?: any;
}

export interface CapturedStreamingSession {
  streamingData: StreamingData;
  chunks: StreamingChunk[];
  insights: StreamingInsight[];
  totalChunks: number;
  completedChunks: number;
  startTime: Date;
  endTime?: Date;
}

class StreamingDataCaptureService {
  private activeSessions = new Map<string, CapturedStreamingSession>();
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create tables if they don't exist
      await this.createTables();
      this.isInitialized = true;
      console.log('StreamingDataCapture service initialized');
    } catch (error) {
      console.error('Failed to initialize StreamingDataCapture:', error);
      throw error;
    }
  }

  private async createTables() {
    try {
      // Try to call the RPC function first
      const { error: rpcError } = await supabase.rpc('create_streaming_tables');
      if (!rpcError) {
        console.log('Streaming tables verified via RPC');
        return;
      }
    } catch (error) {
      console.log('RPC function not available, checking tables directly');
    }

    // Check if tables exist by trying to query them
    try {
      const { error: testError } = await supabase
        .from('streaming_sessions')
        .select('id')
        .limit(1);
      
      if (!testError) {
        console.log('Streaming tables already exist');
        return;
      }
      
      // Handle policy conflicts specifically
      if (testError.message && testError.message.includes('policy')) {
        console.warn('Database policy conflict detected, but tables exist. Using in-memory storage.');
        return;
      }
    } catch (error) {
      console.log('Tables do not exist or have policy issues, will use fallback storage');
    }

    // If we get here, tables don't exist or have issues
    console.warn('Streaming tables not found or have policy conflicts. Data will be stored in memory only.');
    console.warn('To persist data, please run the streaming migration or fix policy conflicts.');
  }

  /**
   * Start a new streaming capture session
   */
  async startCapture(userId: string, prompt: string, databaseType: string): Promise<string> {
    try {
      const sessionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      let streamingData: StreamingData;

      // Try to create streaming session record in database
      try {
        const { data, error } = await supabase
          .from('streaming_sessions')
          .insert({
            id: sessionId,
            user_id: userId,
            prompt,
            database_type: databaseType,
            status: 'initializing',
            created_at: now,
            updated_at: now
          })
          .select()
          .single();

        if (error) throw error;
        streamingData = data as StreamingData;
        console.log(`Created database session: ${sessionId}`);
      } catch (dbError) {
        // Fallback: create in-memory only session
        console.warn('Database not available, using in-memory session:', dbError);
        streamingData = {
          id: sessionId,
          user_id: userId,
          session_id: sessionId,
          prompt,
          database_type: databaseType,
          status: 'initializing',
          created_at: now,
          updated_at: now
        };
      }

      // Initialize in-memory session
      const session: CapturedStreamingSession = {
        streamingData,
        chunks: [],
        insights: [],
        totalChunks: 0,
        completedChunks: 0,
        startTime: new Date()
      };

      this.activeSessions.set(sessionId, session);

      console.log(`Started streaming capture session: ${sessionId}`);
      return sessionId;
    } catch (error) {
      console.error('Error starting streaming capture:', error);
      throw error;
    }
  }

  /**
   * Capture a streaming chunk in real-time
   */
  async captureChunk(
    sessionId: string,
    taskId: string,
    taskTitle: string,
    agentName: string,
    content: string,
    contentType: 'text' | 'code' | 'schema' | 'query' = 'text',
    metadata?: any
  ): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`No active session found: ${sessionId}`);
      }

      const chunkId = `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const chunk: StreamingChunk = {
        id: chunkId,
        streaming_session_id: sessionId,
        task_id: taskId,
        task_title: taskTitle,
        agent_name: agentName,
        chunk_index: session.chunks.length,
        content,
        content_type: contentType,
        timestamp: now,
        metadata
      };

      // Try to save to database
      try {
        const { error } = await supabase
          .from('streaming_chunks')
          .insert(chunk);

        if (error) throw error;
      } catch (dbError) {
        console.warn('Failed to save chunk to database, keeping in memory only:', dbError);
      }

      // Update in-memory session
      session.chunks.push(chunk);
      session.completedChunks++;

      // Update session status
      await this.updateSessionStatus(sessionId, 'streaming');

      console.log(`Captured chunk ${chunk.chunk_index} for session ${sessionId}`);
    } catch (error) {
      console.error('Error capturing chunk:', error);
      await this.handleError(sessionId, `Failed to capture chunk: ${error.message}`);
      throw error;
    }
  }

  /**
   * Capture AI insights during streaming
   */
  async captureInsight(
    sessionId: string,
    agentName: string,
    message: string,
    insightType: 'reasoning' | 'decision' | 'progress' | 'completion' = 'reasoning',
    metadata?: any
  ): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`No active session found: ${sessionId}`);
      }

      const insightId = `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const insight: StreamingInsight = {
        id: insightId,
        streaming_session_id: sessionId,
        agent_name: agentName,
        message,
        insight_type: insightType,
        timestamp: now,
        metadata
      };

      // Try to save to database
      try {
        const { error } = await supabase
          .from('streaming_insights')
          .insert(insight);

        if (error) throw error;
      } catch (dbError) {
        console.warn('Failed to save insight to database, keeping in memory only:', dbError);
      }

      // Update in-memory session
      session.insights.push(insight);

      console.log(`Captured insight for session ${sessionId}: ${message}`);
    } catch (error) {
      console.error('Error capturing insight:', error);
      // Don't throw for insights - they're non-critical
    }
  }

  /**
   * Complete a streaming session and create project
   */
  async completeCapture(sessionId: string, completionData?: any): Promise<string> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error(`No active session found: ${sessionId}`);
      }

      session.endTime = new Date();
      
      // Mark session as completed first (even if project creation fails)
      session.streamingData.status = 'completed';
      session.streamingData.completion_data = completionData;
      session.streamingData.updated_at = new Date().toISOString();

      let projectId: string;

      try {
        // Create database project
        const projectTitle = this.generateProjectTitle(session.streamingData.prompt, session.streamingData.database_type);
        const project = await databaseProjectsService.createProject(session.streamingData.user_id, {
          database_name: projectTitle,
          database_type: session.streamingData.database_type as any,
          description: session.streamingData.prompt,
          metadata: {
            streaming_session_id: sessionId,
            generation_mode: 'streaming',
            total_chunks: session.chunks.length,
            total_insights: session.insights.length,
            duration_ms: session.endTime.getTime() - session.startTime.getTime(),
            completion_data: completionData,
            generated_at: new Date().toISOString()
          }
        });

        projectId = project.id;
        session.streamingData.project_id = projectId;

        // Create session within project
        const dbSession = await databaseProjectsService.createSession({
          project_id: project.id,
          session_name: "Live Streaming Generation",
          description: `Database generated via streaming interface`
        });

        // Convert chunks to queries
        for (const chunk of session.chunks) {
          await databaseProjectsService.createQuery({
            session_id: dbSession.id,
            project_id: project.id,
            query_text: `${chunk.task_title} (${chunk.agent_name})`,
            query_type: chunk.content_type === 'query' ? 'OTHER' : 'OTHER',
            description: chunk.task_title,
            results_data: {
              content: chunk.content,
              taskId: chunk.task_id,
              agent: chunk.agent_name,
              contentType: chunk.content_type,
              chunkIndex: chunk.chunk_index,
              metadata: chunk.metadata
            },
            results_format: 'json',
            success: true
          });
        }
      } catch (projectError) {
        console.warn('Failed to create database project, but streaming session is still valid:', projectError);
        // Generate a fallback project ID for the conversation interface
        projectId = `stream_project_${sessionId}`;
        session.streamingData.project_id = projectId;
      }

      // Update streaming session status
      try {
        await supabase
          .from('streaming_sessions')
          .update({
            status: 'completed',
            project_id: project.id,
            completion_data: completionData,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);
      } catch (dbError) {
        console.warn('Failed to update session status in database:', dbError);
        // Update in-memory session status
        session.streamingData.status = 'completed';
        session.streamingData.project_id = project.id;
        session.streamingData.completion_data = completionData;
        session.streamingData.updated_at = new Date().toISOString();
      }

      // Don't delete in-memory session if database is not available
      // Keep it for conversation list access
      const dbAvailable = await this.isDatabaseAvailable();
      if (dbAvailable) {
        this.activeSessions.delete(sessionId);
      } else {
        console.log(`Keeping session ${sessionId} in memory for conversation list access`);
      }

      console.log(`Completed streaming capture session: ${sessionId}, created project: ${project.id}`);
      return project.id;
    } catch (error) {
      console.error('Error completing capture:', error);
      await this.handleError(sessionId, `Failed to complete session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle errors and implement rollback
   */
  private async handleError(sessionId: string, errorMessage: string): Promise<void> {
    try {
      // Update session status to error
      await supabase
        .from('streaming_sessions')
        .update({
          status: 'error',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      // Optionally clean up partial data
      const session = this.activeSessions.get(sessionId);
      if (session) {
        console.log(`Rolling back session ${sessionId} due to error: ${errorMessage}`);
        // Could implement more sophisticated rollback logic here
      }

      // Only delete if database is available, otherwise keep for conversation list
      const dbAvailable = await this.isDatabaseAvailable();
      if (dbAvailable) {
        this.activeSessions.delete(sessionId);
      }
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(sessionId: string, status: StreamingData['status']): Promise<void> {
    try {
      await supabase
        .from('streaming_sessions')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    } catch (error) {
      console.warn('Failed to update session status in database:', error);
      
      // Update in-memory session status
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.streamingData.status = status;
        session.streamingData.updated_at = new Date().toISOString();
      }
    }
  }

  /**
   * Get all saved streaming sessions for a user
   */
  async getSavedSessions(userId: string): Promise<StreamingData[]> {
    try {
      let databaseSessions: StreamingData[] = [];
      
      // Try to get sessions from database
      try {
        const { data, error } = await supabase
          .from('streaming_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          // Handle specific policy errors
          if (error.message && (error.message.includes('policy') || error.message.includes('RLS'))) {
            console.warn('Database RLS policy conflict, using in-memory sessions only');
          } else {
            throw error;
          }
        } else {
          databaseSessions = data || [];
        }
      } catch (dbError) {
        console.warn('Cannot access streaming_sessions table:', dbError);
      }

      // Get in-memory sessions for this user
      const inMemorySessions: StreamingData[] = [];
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.streamingData.user_id === userId) {
          inMemorySessions.push(session.streamingData);
        }
      }

      // Combine and sort by created_at
      const allSessions = [...databaseSessions, ...inMemorySessions];
      return allSessions.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error getting saved sessions:', error);
      
      // Fallback: return only in-memory sessions
      const inMemorySessions: StreamingData[] = [];
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (session.streamingData.user_id === userId) {
          inMemorySessions.push(session.streamingData);
        }
      }
      return inMemorySessions;
    }
  }

  /**
   * Get complete session data including chunks and insights
   */
  async getSessionData(sessionId: string): Promise<CapturedStreamingSession | null> {
    try {
      // Get session metadata
      const { data: sessionData, error: sessionError } = await supabase
        .from('streaming_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      // Get chunks
      const { data: chunks, error: chunksError } = await supabase
        .from('streaming_chunks')
        .select('*')
        .eq('streaming_session_id', sessionId)
        .order('chunk_index', { ascending: true });

      if (chunksError) throw chunksError;

      // Get insights
      const { data: insights, error: insightsError } = await supabase
        .from('streaming_insights')
        .select('*')
        .eq('streaming_session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (insightsError) throw insightsError;

      return {
        streamingData: sessionData as StreamingData,
        chunks: chunks || [],
        insights: insights || [],
        totalChunks: chunks?.length || 0,
        completedChunks: chunks?.length || 0,
        startTime: new Date(sessionData.created_at),
        endTime: sessionData.status === 'completed' ? new Date(sessionData.updated_at) : undefined
      };
    } catch (error) {
      console.error('Error getting session data:', error);
      return null;
    }
  }

  /**
   * Generate intelligent project title
   */
  private generateProjectTitle(prompt: string, dbType: string): string {
    const promptLower = prompt.toLowerCase();
    
    const domainPatterns = {
      'E-Commerce Platform': ['shop', 'store', 'product', 'cart', 'order', 'payment', 'inventory'],
      'Blog Management System': ['blog', 'post', 'article', 'author', 'comment', 'category'],
      'Social Network Platform': ['social', 'user', 'post', 'comment', 'like', 'follow', 'feed'],
      'Customer Management System': ['customer', 'lead', 'contact', 'sales', 'deal', 'client'],
      'Education Platform': ['student', 'course', 'lesson', 'grade', 'assignment', 'teacher'],
      'Healthcare System': ['patient', 'doctor', 'appointment', 'medical', 'health', 'treatment'],
      'Financial System': ['transaction', 'account', 'balance', 'payment', 'bank', 'finance']
    };
    
    for (const [title, keywords] of Object.entries(domainPatterns)) {
      if (keywords.some(keyword => promptLower.includes(keyword))) {
        return `${title} (${dbType})`;
      }
    }
    
    const firstWords = prompt.split(' ').slice(0, 3).join(' ');
    return `${firstWords} Database (${dbType})`;
  }

  /**
   * Get chunks for a specific session
   */
  async getSessionChunks(sessionId: string): Promise<StreamingChunk[]> {
    try {
      // Check in-memory first
      const inMemorySession = this.activeSessions.get(sessionId);
      if (inMemorySession) {
        return inMemorySession.chunks;
      }

      // Try database
      const { data, error } = await supabase
        .from('streaming_chunks')
        .select('*')
        .eq('streaming_session_id', sessionId)
        .order('chunk_index', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Error getting session chunks:', error);
      return [];
    }
  }

  /**
   * Get insights for a specific session
   */
  async getSessionInsights(sessionId: string): Promise<StreamingInsight[]> {
    try {
      // Check in-memory first
      const inMemorySession = this.activeSessions.get(sessionId);
      if (inMemorySession) {
        return inMemorySession.insights;
      }

      // Try database
      const { data, error } = await supabase
        .from('streaming_insights')
        .select('*')
        .eq('streaming_session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('Error getting session insights:', error);
      return [];
    }
  }

  /**
   * Check if database is available
   */
  private async isDatabaseAvailable(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('streaming_sessions')
        .select('id')
        .limit(1);
      return !error;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get active session info
   */
  getActiveSession(sessionId: string): CapturedStreamingSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Validate data consistency
   */
  async validateDataConsistency(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await this.getSessionData(sessionId);
      if (!sessionData) return false;

      // Check chunk sequence integrity
      const expectedIndices = Array.from({length: sessionData.chunks.length}, (_, i) => i);
      const actualIndices = sessionData.chunks.map(c => c.chunk_index).sort((a, b) => a - b);
      
      const indicesMatch = expectedIndices.every((val, index) => val === actualIndices[index]);
      
      if (!indicesMatch) {
        console.error(`Data consistency check failed for session ${sessionId}: chunk indices mismatch`);
        return false;
      }

      // Additional consistency checks could be added here
      return true;
    } catch (error) {
      console.error('Error validating data consistency:', error);
      return false;
    }
  }
}

export const streamingDataCapture = new StreamingDataCaptureService();