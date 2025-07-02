import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  name?: string;
  bio?: string;
  company?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  editor_theme: string;
  font_size: string;
  animations: boolean;
  glassmorphism: boolean;
  compact_mode: boolean;
  high_contrast: boolean;
  ai_model: string;
  temperature: number;
  auto_suggestions: boolean;
  email_notifications: boolean;
  marketing_emails: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key: string;
  permissions: string[];
  last_used?: string;
  created_at: string;
}

class SettingsService {
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          ...profileData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Also update the auth user metadata for avatar_url if provided
      if (profileData.avatar_url !== undefined) {
        const { error: authError } = await supabase.auth.updateUser({
          data: {
            ...supabase.auth.getUser().then(({ data }) => data.user?.user_metadata || {}),
            avatar_url: profileData.avatar_url,
            name: profileData.name
          }
        });

        if (authError) {
          console.warn('Failed to update auth user metadata:', authError);
          // Don't throw here as the profile was updated successfully
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw error;
    }
  }

  async updateUserPreferences(
    userId: string, 
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching API keys:', error);
      throw error;
    }
  }

  async createApiKey(userId: string, name: string, permissions: string[]): Promise<ApiKey> {
    try {
      // Generate a secure API key
      const keyPrefix = 'db_live_sk_';
      const keyBody = this.generateSecureKey(32);
      const apiKey = keyPrefix + keyBody;

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: userId,
          name,
          key: apiKey,
          permissions,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating API key:', error);
      throw error;
    }
  }

  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', userId); // Ensure user can only delete their own keys

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  }

  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', keyId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating API key last used:', error);
      throw error;
    }
  }

  private generateSecureKey(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    
    return result;
  }

  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      // Validate file
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPG, PNG, or GIF image.');
      }

      if (file.size > maxSize) {
        throw new Error('File too large. Please upload an image smaller than 5MB.');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image. Please try again.');
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error('Failed to get image URL. Please try again.');
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to upload avatar. Please try again.');
    }
  }

  async deleteUserAccount(userId: string): Promise<void> {
    try {
      // In a real implementation, you'd want to:
      // 1. Delete user data from all related tables
      // 2. Delete files from storage
      // 3. Cancel subscriptions
      // 4. Log the deletion for compliance
      
      // Delete avatar from storage
      try {
        await supabase.storage
          .from('avatars')
          .remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.gif`]);
      } catch (storageError) {
        console.warn('Failed to delete avatar from storage:', storageError);
      }

      // Delete profile data
      try {
        await supabase
          .from('user_profiles')
          .delete()
          .eq('id', userId);
      } catch (profileError) {
        console.warn('Failed to delete user profile:', profileError);
      }

      // Delete preferences
      try {
        await supabase
          .from('user_preferences')
          .delete()
          .eq('user_id', userId);
      } catch (prefsError) {
        console.warn('Failed to delete user preferences:', prefsError);
      }

      // Delete API keys
      try {
        await supabase
          .from('api_keys')
          .delete()
          .eq('user_id', userId);
      } catch (apiKeysError) {
        console.warn('Failed to delete API keys:', apiKeysError);
      }

      // Note: In production, you might want to use the Admin API for this
      // For now, the user will need to delete their account through the auth provider
      console.log('User data cleanup completed for user:', userId);
      
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  }
}

export const settingsService = new SettingsService();