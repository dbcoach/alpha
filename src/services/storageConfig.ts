import { supabase } from '../lib/supabase';
import { 
  ConversationStorage, 
  LocalStorageConversations, 
  SupabaseConversations,
  ConversationMigration 
} from './conversationStorage';

/**
 * Storage configuration - easily switch between localStorage and Supabase
 */
class StorageConfig {
  private static instance: StorageConfig;
  private currentStorage: ConversationStorage;
  private storageType: 'localStorage' | 'supabase' = 'localStorage';

  private constructor() {
    this.currentStorage = new LocalStorageConversations();
  }

  static getInstance(): StorageConfig {
    if (!StorageConfig.instance) {
      StorageConfig.instance = new StorageConfig();
    }
    return StorageConfig.instance;
  }

  getStorage(): ConversationStorage {
    return this.currentStorage;
  }

  getStorageType(): 'localStorage' | 'supabase' {
    return this.storageType;
  }

  async switchToSupabase(): Promise<void> {
    console.log('🔄 Switching to Supabase storage...');
    this.currentStorage = new SupabaseConversations(supabase);
    this.storageType = 'supabase';
    console.log('✅ Switched to Supabase storage');
  }

  async switchToLocalStorage(): Promise<void> {
    console.log('🔄 Switching to localStorage...');
    this.currentStorage = new LocalStorageConversations();
    this.storageType = 'localStorage';
    console.log('✅ Switched to localStorage');
  }

  async migrateToSupabase(): Promise<{ migrated: number; errors: string[] }> {
    const localStorage = new LocalStorageConversations();
    const supabaseStorage = new SupabaseConversations(supabase);
    
    const results = await ConversationMigration.migrateLocalStorageToSupabase(
      supabaseStorage,
      localStorage
    );

    // Switch to Supabase after successful migration
    if (results.errors.length === 0) {
      await this.switchToSupabase();
    }

    return results;
  }
}

// Export singleton instance
export const storageConfig = StorageConfig.getInstance();
export const conversationStorage = storageConfig.getStorage();