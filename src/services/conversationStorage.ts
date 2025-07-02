/**
 * Abstract conversation storage interface
 * Supports both localStorage and future Supabase implementations
 */

export interface SavedConversation {
  id: string;
  prompt: string;
  dbType: string;
  title: string; // Smart generated title
  generatedContent: Record<string, string>; // Task ID -> content
  insights: Array<{
    agent: string;
    message: string;
    timestamp: string; // ISO string for serialization
  }>;
  tasks: Array<{
    id: string;
    title: string;
    agent: string;
    status: 'completed';
    progress: number;
  }>;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  status: 'completed';
  userId?: string; // For future multi-user support
  metadata?: {
    duration: number;
    totalChunks: number;
    totalInsights: number;
    mode: string; // 'dbcoach' | 'standard'
  };
}

export interface ConversationStorage {
  saveConversation(conversation: SavedConversation): Promise<void>;
  loadConversations(userId?: string): Promise<SavedConversation[]>;
  getConversation(id: string): Promise<SavedConversation | null>;
  deleteConversation(id: string): Promise<void>;
  updateConversation(id: string, updates: Partial<SavedConversation>): Promise<void>;
  searchConversations(query: string, userId?: string): Promise<SavedConversation[]>;
}

/**
 * LocalStorage implementation of conversation storage
 */
export class LocalStorageConversations implements ConversationStorage {
  private readonly STORAGE_KEY = 'dbcoach_conversations';
  private readonly MAX_CONVERSATIONS = 100; // Prevent localStorage bloat

  async saveConversation(conversation: SavedConversation): Promise<void> {
    try {
      const conversations = await this.loadConversations();
      console.log('Before save - existing conversations:', conversations.length);
      
      // Remove any existing conversation with same ID
      const filtered = conversations.filter(c => c.id !== conversation.id);
      
      // Add new conversation at the beginning
      filtered.unshift(conversation);
      
      // Limit total conversations
      const limited = filtered.slice(0, this.MAX_CONVERSATIONS);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limited));
      console.log(`✅ Saved conversation: "${conversation.title}" (Total: ${limited.length})`);
      console.log('Conversation data:', conversation);
    } catch (error) {
      console.error('❌ Error saving conversation to localStorage:', error);
      throw new Error('Failed to save conversation');
    }
  }

  async loadConversations(userId?: string): Promise<SavedConversation[]> {
    try {
      console.log('🔍 Loading conversations from localStorage...');
      const stored = localStorage.getItem(this.STORAGE_KEY);
      console.log('📦 Raw localStorage data:', stored ? 'Found data' : 'No data found');
      
      if (!stored) {
        console.log('❌ No conversations stored in localStorage');
        return [];
      }
      
      const conversations = JSON.parse(stored) as SavedConversation[];
      console.log('📊 Parsed conversations:', conversations.length, conversations);
      
      // Filter by userId if provided (for future multi-user support)
      const filtered = userId 
        ? conversations.filter(c => c.userId === userId)
        : conversations;
      
      console.log('✅ Returning filtered conversations:', filtered.length, filtered);
      return filtered;
    } catch (error) {
      console.error('❌ Error loading conversations from localStorage:', error);
      return [];
    }
  }

  async getConversation(id: string): Promise<SavedConversation | null> {
    const conversations = await this.loadConversations();
    return conversations.find(c => c.id === id) || null;
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      const conversations = await this.loadConversations();
      const filtered = conversations.filter(c => c.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      console.log(`Deleted conversation: ${id}`);
    } catch (error) {
      console.error('Error deleting conversation from localStorage:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  async updateConversation(id: string, updates: Partial<SavedConversation>): Promise<void> {
    try {
      const conversations = await this.loadConversations();
      const index = conversations.findIndex(c => c.id === id);
      
      if (index === -1) {
        throw new Error('Conversation not found');
      }
      
      conversations[index] = {
        ...conversations[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conversations));
      console.log(`Updated conversation: ${id}`);
    } catch (error) {
      console.error('Error updating conversation in localStorage:', error);
      throw new Error('Failed to update conversation');
    }
  }

  async searchConversations(query: string, userId?: string): Promise<SavedConversation[]> {
    const conversations = await this.loadConversations(userId);
    const lowercaseQuery = query.toLowerCase();
    
    return conversations.filter(conversation =>
      conversation.title.toLowerCase().includes(lowercaseQuery) ||
      conversation.prompt.toLowerCase().includes(lowercaseQuery) ||
      conversation.dbType.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Utility methods
  async getStorageStats(): Promise<{ total: number; sizeKB: number }> {
    const conversations = await this.loadConversations();
    const stored = localStorage.getItem(this.STORAGE_KEY) || '[]';
    return {
      total: conversations.length,
      sizeKB: Math.round((stored.length * 2) / 1024) // Rough estimate
    };
  }

  async exportConversations(): Promise<string> {
    const conversations = await this.loadConversations();
    return JSON.stringify(conversations, null, 2);
  }

  async importConversations(data: string): Promise<void> {
    try {
      const imported = JSON.parse(data) as SavedConversation[];
      const existing = await this.loadConversations();
      
      // Merge without duplicates
      const merged = [...imported];
      existing.forEach(conv => {
        if (!merged.find(m => m.id === conv.id)) {
          merged.push(conv);
        }
      });
      
      // Sort by creation date and limit
      merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const limited = merged.slice(0, this.MAX_CONVERSATIONS);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limited));
      console.log(`Imported ${imported.length} conversations`);
    } catch (error) {
      console.error('Error importing conversations:', error);
      throw new Error('Failed to import conversations');
    }
  }
}

/**
 * Title generation utility
 */
export class ConversationTitleGenerator {
  private static readonly domainPatterns: Record<string, string[]> = {
    'E-commerce Platform': ['shop', 'store', 'product', 'cart', 'order', 'payment', 'inventory', 'ecommerce', 'marketplace'],
    'Blog Management': ['blog', 'post', 'article', 'author', 'comment', 'category', 'cms', 'content'],
    'Social Network': ['social', 'user', 'post', 'comment', 'like', 'follow', 'feed', 'friend', 'message'],
    'CRM System': ['customer', 'lead', 'contact', 'sales', 'deal', 'client', 'crm', 'pipeline'],
    'Education Platform': ['student', 'course', 'lesson', 'grade', 'assignment', 'teacher', 'learning', 'education'],
    'Healthcare System': ['patient', 'doctor', 'appointment', 'medical', 'health', 'treatment', 'clinic', 'hospital'],
    'Financial System': ['transaction', 'account', 'balance', 'payment', 'bank', 'finance', 'invoice', 'billing'],
    'Inventory Management': ['inventory', 'warehouse', 'stock', 'supplier', 'procurement', 'asset'],
    'Project Management': ['project', 'task', 'team', 'milestone', 'deadline', 'collaboration'],
    'Restaurant System': ['restaurant', 'menu', 'order', 'food', 'recipe', 'kitchen', 'dining'],
    'Library System': ['library', 'book', 'author', 'catalog', 'borrowing', 'member'],
    'Hotel Booking': ['hotel', 'booking', 'reservation', 'room', 'guest', 'accommodation'],
    'Event Management': ['event', 'ticket', 'venue', 'attendee', 'registration', 'schedule']
  };

  static generate(prompt: string, dbType: string): string {
    const cleanPrompt = prompt.replace(/[^\w\s]/g, '').toLowerCase();
    
    // Find matching domain pattern
    for (const [domain, keywords] of Object.entries(this.domainPatterns)) {
      if (keywords.some(keyword => cleanPrompt.includes(keyword))) {
        return `${domain} (${dbType})`;
      }
    }
    
    // Fallback: extract first few meaningful words
    const words = cleanPrompt.split(' ').filter(word => 
      word.length > 3 && 
      !['database', 'create', 'build', 'design', 'make', 'system', 'table', 'need', 'want', 'like', 'would', 'please'].includes(word)
    );
    
    if (words.length > 0) {
      const title = words.slice(0, 2)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `${title} ${dbType} Database`;
    }
    
    return `${dbType} Database Design`;
  }
}

/**
 * Supabase implementation of conversation storage
 */
export class SupabaseConversations implements ConversationStorage {
  private supabase: any;

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient;
  }

  async saveConversation(conversation: SavedConversation): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .upsert({
          id: conversation.id,
          user_id: conversation.userId,
          prompt: conversation.prompt,
          db_type: conversation.dbType,
          title: conversation.title,
          generated_content: conversation.generatedContent,
          insights: conversation.insights,
          tasks: conversation.tasks,
          status: conversation.status,
          metadata: conversation.metadata,
          created_at: conversation.createdAt,
          updated_at: conversation.updatedAt
        });

      if (error) throw error;
      console.log(`✅ Saved conversation to Supabase: "${conversation.title}"`);
    } catch (error) {
      console.error('❌ Error saving conversation to Supabase:', error);
      throw new Error('Failed to save conversation to database');
    }
  }

  async loadConversations(userId?: string): Promise<SavedConversation[]> {
    try {
      let query = this.supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map((row: any) => ({
        id: row.id,
        prompt: row.prompt,
        dbType: row.db_type,
        title: row.title,
        generatedContent: row.generated_content,
        insights: row.insights,
        tasks: row.tasks,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: row.status,
        userId: row.user_id,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('❌ Error loading conversations from Supabase:', error);
      return [];
    }
  }

  async getConversation(id: string): Promise<SavedConversation | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        prompt: data.prompt,
        dbType: data.db_type,
        title: data.title,
        generatedContent: data.generated_content,
        insights: data.insights,
        tasks: data.tasks,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        status: data.status,
        userId: data.user_id,
        metadata: data.metadata
      };
    } catch (error) {
      console.error('❌ Error getting conversation from Supabase:', error);
      return null;
    }
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      console.log(`🗑️ Deleted conversation: ${id}`);
    } catch (error) {
      console.error('❌ Error deleting conversation from Supabase:', error);
      throw new Error('Failed to delete conversation');
    }
  }

  async updateConversation(id: string, updates: Partial<SavedConversation>): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      console.log(`✏️ Updated conversation: ${id}`);
    } catch (error) {
      console.error('❌ Error updating conversation in Supabase:', error);
      throw new Error('Failed to update conversation');
    }
  }

  async searchConversations(query: string, userId?: string): Promise<SavedConversation[]> {
    try {
      let supabaseQuery = this.supabase
        .from('conversations')
        .select('*')
        .or(`title.ilike.%${query}%,prompt.ilike.%${query}%,db_type.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (userId) {
        supabaseQuery = supabaseQuery.eq('user_id', userId);
      }

      const { data, error } = await supabaseQuery;
      if (error) throw error;

      return data.map((row: any) => ({
        id: row.id,
        prompt: row.prompt,
        dbType: row.db_type,
        title: row.title,
        generatedContent: row.generated_content,
        insights: row.insights,
        tasks: row.tasks,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        status: row.status,
        userId: row.user_id,
        metadata: row.metadata
      }));
    } catch (error) {
      console.error('❌ Error searching conversations in Supabase:', error);
      return [];
    }
  }
}

/**
 * Migration utility to transfer localStorage data to Supabase
 */
export class ConversationMigration {
  static async migrateLocalStorageToSupabase(
    supabaseStorage: SupabaseConversations,
    localStorageStorage: LocalStorageConversations
  ): Promise<{ migrated: number; errors: string[] }> {
    const results = { migrated: 0, errors: [] as string[] };
    
    try {
      console.log('🔄 Starting migration from localStorage to Supabase...');
      
      // Get all conversations from localStorage
      const localConversations = await localStorageStorage.loadConversations();
      console.log(`📦 Found ${localConversations.length} conversations in localStorage`);
      
      // Migrate each conversation
      for (const conversation of localConversations) {
        try {
          await supabaseStorage.saveConversation(conversation);
          results.migrated++;
          console.log(`✅ Migrated: "${conversation.title}"`);
        } catch (error) {
          const errorMsg = `Failed to migrate "${conversation.title}": ${error}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }
      
      console.log(`🎉 Migration complete: ${results.migrated}/${localConversations.length} conversations migrated`);
      
    } catch (error) {
      results.errors.push(`Migration failed: ${error}`);
      console.error('❌ Migration failed:', error);
    }
    
    return results;
  }
}

// Singleton instance - switch between localStorage and Supabase
import { supabase } from '../lib/supabase';

// UNCOMMENT the line below after creating the conversations table in Supabase:
export const conversationStorage: ConversationStorage = new SupabaseConversations(supabase);

// Comment out this line after switching to Supabase:
// export const conversationStorage: ConversationStorage = new LocalStorageConversations();