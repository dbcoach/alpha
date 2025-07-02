import { supabase } from '../lib/supabase';

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_preview: string; // First 8 chars for UI display
  permissions: string[];
  ip_whitelist?: string[];
  expires_at?: string;
  last_used?: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyUsageStats {
  total_requests: number;
  requests_today: number;
  last_request_ip?: string;
  last_request_at?: string;
  rate_limit_hits: number;
}

export interface ApiKeyValidationResult {
  isValid: boolean;
  key?: ApiKey;
  error?: string;
  rateLimited?: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: string[];
  ip_whitelist?: string[];
  expires_in_days?: number;
}

class ApiKeyService {
  private readonly ENCRYPTION_KEY = import.meta.env.VITE_API_KEY_ENCRYPTION_KEY || 'default-dev-key-change-in-production';
  private readonly RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
  private readonly DEFAULT_RATE_LIMIT = 1000; // requests per hour

  /**
   * Generate a cryptographically secure API key
   * Format: dbcoach_live_sk_[32_random_chars]
   */
  private generateSecureApiKey(): string {
    const prefix = 'dbcoach_live_sk_';
    const keyLength = 32;
    
    // Use Web Crypto API for cryptographically secure random generation
    const array = new Uint8Array(keyLength);
    crypto.getRandomValues(array);
    
    // Convert to base62 (alphanumeric) for better readability
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < keyLength; i++) {
      result += chars[array[i] % chars.length];
    }
    
    return prefix + result;
  }

  /**
   * Hash API key using SHA-256 with salt
   */
  private async hashApiKey(apiKey: string): Promise<string> {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyData = encoder.encode(apiKey);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 10000,
        hash: 'SHA-256'
      },
      key,
      256
    );
    
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    return saltHex + ':' + hashHex;
  }

  /**
   * Verify API key against stored hash
   */
  private async verifyApiKey(apiKey: string, storedHash: string): Promise<boolean> {
    try {
      const [saltHex, hashHex] = storedHash.split(':');
      const encoder = new TextEncoder();
      const keyData = encoder.encode(apiKey);
      const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 10000,
          hash: 'SHA-256'
        },
        key,
        256
      );
      
      const computedHashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('');
      return computedHashHex === hashHex;
    } catch (error) {
      console.error('Error verifying API key:', error);
      return false;
    }
  }

  /**
   * Validate IP address against whitelist
   */
  private validateIpAddress(clientIp: string, whitelist?: string[]): boolean {
    if (!whitelist || whitelist.length === 0) {
      return true; // No restrictions
    }

    return whitelist.some(allowedIp => {
      // Support CIDR notation and exact matches
      if (allowedIp.includes('/')) {
        // CIDR validation would require additional library
        // For now, implement exact match and wildcard
        return this.matchesCidr(clientIp, allowedIp);
      }
      return clientIp === allowedIp || allowedIp === '*';
    });
  }

  /**
   * Simple CIDR matching (basic implementation)
   */
  private matchesCidr(ip: string, cidr: string): boolean {
    // This is a simplified implementation
    // In production, use a proper CIDR library
    const [network, prefixLength] = cidr.split('/');
    if (!prefixLength) return ip === network;
    
    // For demonstration - in production use proper CIDR validation
    return ip.startsWith(network.split('.').slice(0, parseInt(prefixLength) / 8).join('.'));
  }

  /**
   * Check rate limiting for API key
   */
  private async checkRateLimit(keyId: string): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - this.RATE_LIMIT_WINDOW);
      
      const { data, error } = await supabase
        .from('api_key_usage_logs')
        .select('id')
        .eq('api_key_id', keyId)
        .gte('created_at', oneHourAgo.toISOString());

      if (error) throw error;

      return (data?.length || 0) < this.DEFAULT_RATE_LIMIT;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return false; // Fail closed
    }
  }

  /**
   * Log API key usage
   */
  private async logApiKeyUsage(keyId: string, clientIp: string, endpoint: string): Promise<void> {
    try {
      await supabase
        .from('api_key_usage_logs')
        .insert({
          api_key_id: keyId,
          client_ip: clientIp,
          endpoint,
          created_at: new Date().toISOString()
        });

      // Update last_used timestamp and usage count
      await supabase
        .from('api_keys')
        .update({
          last_used: new Date().toISOString(),
          usage_count: supabase.rpc('increment_usage_count', { key_id: keyId })
        })
        .eq('id', keyId);
    } catch (error) {
      console.error('Failed to log API key usage:', error);
    }
  }

  /**
   * Create a new API key with enhanced security
   */
  async createApiKey(userId: string, request: CreateApiKeyRequest): Promise<{ apiKey: string; keyData: ApiKey }> {
    try {
      const rawApiKey = this.generateSecureApiKey();
      const keyHash = await this.hashApiKey(rawApiKey);
      const keyPreview = rawApiKey.substring(0, 12) + '...';
      
      const expiresAt = request.expires_in_days 
        ? new Date(Date.now() + (request.expires_in_days * 24 * 60 * 60 * 1000)).toISOString()
        : null;

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: userId,
          name: request.name,
          key_hash: keyHash,
          key_preview: keyPreview,
          permissions: request.permissions,
          ip_whitelist: request.ip_whitelist,
          expires_at: expiresAt,
          usage_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log key creation
      await this.logSecurityEvent(userId, 'api_key_created', {
        key_id: data.id,
        key_name: request.name
      });

      return {
        apiKey: rawApiKey, // Return only once during creation
        keyData: data
      };
    } catch (error) {
      console.error('Error creating API key:', error);
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Validate API key for incoming requests
   */
  async validateApiKey(apiKey: string, clientIp: string, endpoint: string): Promise<ApiKeyValidationResult> {
    try {
      // Basic format validation
      if (!apiKey.startsWith('dbcoach_live_sk_') || apiKey.length !== 48) {
        return { isValid: false, error: 'Invalid API key format' };
      }

      // Get all active API keys (we need to check hashes)
      const { data: apiKeys, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Find matching key by verifying hash
      let matchedKey: ApiKey | null = null;
      for (const key of apiKeys || []) {
        if (await this.verifyApiKey(apiKey, key.key_hash)) {
          matchedKey = key;
          break;
        }
      }

      if (!matchedKey) {
        return { isValid: false, error: 'API key not found or inactive' };
      }

      // Check expiration
      if (matchedKey.expires_at && new Date(matchedKey.expires_at) < new Date()) {
        return { isValid: false, error: 'API key has expired' };
      }

      // Check IP whitelist
      if (!this.validateIpAddress(clientIp, matchedKey.ip_whitelist)) {
        await this.logSecurityEvent(matchedKey.user_id, 'ip_whitelist_violation', {
          key_id: matchedKey.id,
          client_ip: clientIp,
          endpoint
        });
        return { isValid: false, error: 'IP address not whitelisted' };
      }

      // Check rate limiting
      const rateLimitOk = await this.checkRateLimit(matchedKey.id);
      if (!rateLimitOk) {
        return { isValid: false, error: 'Rate limit exceeded', rateLimited: true };
      }

      // Log successful usage
      await this.logApiKeyUsage(matchedKey.id, clientIp, endpoint);

      return { isValid: true, key: matchedKey };
    } catch (error) {
      console.error('API key validation failed:', error);
      return { isValid: false, error: 'Validation service unavailable' };
    }
  }

  /**
   * Get user's API keys
   */
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

  /**
   * Revoke (delete) API key
   */
  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', userId);

      if (error) throw error;

      // Log key revocation
      await this.logSecurityEvent(userId, 'api_key_revoked', {
        key_id: keyId
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      throw error;
    }
  }

  /**
   * Rotate API key (generate new key, keep same metadata)
   */
  async rotateApiKey(userId: string, keyId: string): Promise<string> {
    try {
      const newRawKey = this.generateSecureApiKey();
      const newKeyHash = await this.hashApiKey(newRawKey);
      const newKeyPreview = newRawKey.substring(0, 12) + '...';

      const { error } = await supabase
        .from('api_keys')
        .update({
          key_hash: newKeyHash,
          key_preview: newKeyPreview,
          updated_at: new Date().toISOString(),
          usage_count: 0 // Reset usage count
        })
        .eq('id', keyId)
        .eq('user_id', userId);

      if (error) throw error;

      // Log key rotation
      await this.logSecurityEvent(userId, 'api_key_rotated', {
        key_id: keyId
      });

      return newRawKey;
    } catch (error) {
      console.error('Error rotating API key:', error);
      throw error;
    }
  }

  /**
   * Update API key settings
   */
  async updateApiKey(userId: string, keyId: string, updates: Partial<Pick<ApiKey, 'name' | 'permissions' | 'ip_whitelist' | 'is_active'>>): Promise<void> {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', keyId)
        .eq('user_id', userId);

      if (error) throw error;

      // Log key update
      await this.logSecurityEvent(userId, 'api_key_updated', {
        key_id: keyId,
        changes: Object.keys(updates)
      });
    } catch (error) {
      console.error('Error updating API key:', error);
      throw error;
    }
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyUsageStats(keyId: string): Promise<ApiKeyUsageStats> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: totalUsage, error: totalError } = await supabase
        .from('api_key_usage_logs')
        .select('id')
        .eq('api_key_id', keyId);

      const { data: todayUsage, error: todayError } = await supabase
        .from('api_key_usage_logs')
        .select('id')
        .eq('api_key_id', keyId)
        .gte('created_at', today.toISOString());

      const { data: lastRequest, error: lastError } = await supabase
        .from('api_key_usage_logs')
        .select('client_ip, created_at')
        .eq('api_key_id', keyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (totalError || todayError) {
        console.error('Error fetching usage stats:', totalError || todayError);
      }

      return {
        total_requests: totalUsage?.length || 0,
        requests_today: todayUsage?.length || 0,
        last_request_ip: lastRequest?.client_ip,
        last_request_at: lastRequest?.created_at,
        rate_limit_hits: 0 // TODO: Implement rate limit hit tracking
      };
    } catch (error) {
      console.error('Error fetching API key usage stats:', error);
      throw error;
    }
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(userId: string, eventType: string, metadata: any): Promise<void> {
    try {
      await supabase
        .from('security_audit_logs')
        .insert({
          user_id: userId,
          event_type: eventType,
          metadata,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Clean up expired API keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) throw error;
      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning up expired keys:', error);
      throw error;
    }
  }
}

export const apiKeyService = new ApiKeyService();
export default apiKeyService;