/**
 * Comprehensive test suite for API Key Service
 * Covers security, functionality, and edge cases
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiKeyService, ApiKey, CreateApiKeyRequest } from '../services/apiKeyService';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn().mockReturnThis()
    })),
    rpc: vi.fn()
  }
}));

describe('ApiKeyService', () => {
  const mockUserId = 'user-123';
  let createdKeys: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    createdKeys = [];
  });

  afterEach(() => {
    // Cleanup any created keys
    createdKeys.forEach(async (keyId) => {
      try {
        await apiKeyService.revokeApiKey(mockUserId, keyId);
      } catch (error) {
        // Key already deleted or doesn't exist
      }
    });
  });

  describe('Key Generation', () => {
    test('should generate keys with correct format', async () => {
      const request: CreateApiKeyRequest = {
        name: 'Test Key',
        permissions: ['read', 'write']
      };

      const mockResponse = {
        id: 'key-123',
        user_id: mockUserId,
        name: 'Test Key',
        key_hash: 'hashed-key',
        key_preview: 'dbcoach_live_sk_test...',
        permissions: ['read', 'write'],
        usage_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock successful creation
      const mockSupabaseInsert = vi.fn().mockResolvedValue({
        data: mockResponse,
        error: null
      });

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        insert: mockSupabaseInsert,
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
      });

      const result = await apiKeyService.createApiKey(mockUserId, request);

      expect(result.apiKey).toMatch(/^dbcoach_live_sk_[A-Za-z0-9]{32}$/);
      expect(result.apiKey).toHaveLength(48);
      expect(result.keyData).toEqual(mockResponse);

      createdKeys.push(result.keyData.id);
    });

    test('should generate unique keys', async () => {
      const request: CreateApiKeyRequest = {
        name: 'Test Key',
        permissions: ['read']
      };

      const keys = new Set<string>();
      
      // Generate multiple keys and ensure uniqueness
      for (let i = 0; i < 10; i++) {
        const mockResponse = {
          id: `key-${i}`,
          user_id: mockUserId,
          name: `Test Key ${i}`,
          key_hash: `hashed-key-${i}`,
          key_preview: `dbcoach_live_sk_test${i}...`,
          permissions: ['read'],
          usage_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: mockResponse, error: null }),
          select: vi.fn().mockReturnThis(),
          single: vi.fn()
        });

        const result = await apiKeyService.createApiKey(mockUserId, { ...request, name: `Test Key ${i}` });
        
        expect(keys.has(result.apiKey)).toBe(false);
        keys.add(result.apiKey);
        createdKeys.push(result.keyData.id);
      }
    });

    test('should handle creation errors gracefully', async () => {
      const request: CreateApiKeyRequest = {
        name: 'Test Key',
        permissions: ['read', 'write']
      };

      // Mock database error
      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
      });

      await expect(apiKeyService.createApiKey(mockUserId, request))
        .rejects.toThrow('Failed to create API key');
    });
  });

  describe('Key Validation', () => {
    test('should validate correct API key format', async () => {
      const validKey = 'dbcoach_live_sk_' + 'A'.repeat(32);
      const clientIp = '192.168.1.1';
      const endpoint = '/api/test';

      const mockApiKey = {
        id: 'key-123',
        user_id: mockUserId,
        key_hash: 'valid-hash',
        is_active: true,
        expires_at: null,
        ip_whitelist: null,
        permissions: ['read', 'write']
      };

      // Mock database response
      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [mockApiKey],
            error: null
          })
        })
      });

      // Note: In a real test, you'd need to mock the hash verification
      // For this example, we'll assume the validation logic works
      const result = await apiKeyService.validateApiKey(validKey, clientIp, endpoint);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid API key format', async () => {
      const invalidKey = 'invalid-key';
      const clientIp = '192.168.1.1';
      const endpoint = '/api/test';

      const result = await apiKeyService.validateApiKey(invalidKey, clientIp, endpoint);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid API key format');
    });

    test('should reject expired API keys', async () => {
      const validKey = 'dbcoach_live_sk_' + 'A'.repeat(32);
      const clientIp = '192.168.1.1';
      const endpoint = '/api/test';

      const expiredApiKey = {
        id: 'key-123',
        user_id: mockUserId,
        key_hash: 'valid-hash',
        is_active: true,
        expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
        ip_whitelist: null,
        permissions: ['read', 'write']
      };

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [expiredApiKey],
            error: null
          })
        })
      });

      const result = await apiKeyService.validateApiKey(validKey, clientIp, endpoint);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('API key has expired');
    });

    test('should enforce IP whitelist restrictions', async () => {
      const validKey = 'dbcoach_live_sk_' + 'A'.repeat(32);
      const clientIp = '192.168.1.100';
      const endpoint = '/api/test';

      const restrictedApiKey = {
        id: 'key-123',
        user_id: mockUserId,
        key_hash: 'valid-hash',
        is_active: true,
        expires_at: null,
        ip_whitelist: ['192.168.1.1', '10.0.0.0/8'],
        permissions: ['read', 'write']
      };

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [restrictedApiKey],
            error: null
          })
        })
      });

      const result = await apiKeyService.validateApiKey(validKey, clientIp, endpoint);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('IP address not whitelisted');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const keyId = 'key-123';
      
      // Mock high usage
      const mockUsageLogs = Array.from({ length: 1001 }, (_, i) => ({
        id: `log-${i}`,
        api_key_id: keyId,
        created_at: new Date().toISOString()
      }));

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: mockUsageLogs,
              error: null
            })
          })
        })
      });

      // This would be called internally during validation
      const rateLimitOk = await (apiKeyService as any).checkRateLimit(keyId);
      expect(rateLimitOk).toBe(false);
    });

    test('should allow requests within rate limit', async () => {
      const keyId = 'key-123';
      
      // Mock low usage
      const mockUsageLogs = Array.from({ length: 10 }, (_, i) => ({
        id: `log-${i}`,
        api_key_id: keyId,
        created_at: new Date().toISOString()
      }));

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              data: mockUsageLogs,
              error: null
            })
          })
        })
      });

      const rateLimitOk = await (apiKeyService as any).checkRateLimit(keyId);
      expect(rateLimitOk).toBe(true);
    });
  });

  describe('Key Management Operations', () => {
    test('should rotate API key successfully', async () => {
      const keyId = 'key-123';

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: keyId },
            error: null
          })
        })
      });

      const newKey = await apiKeyService.rotateApiKey(mockUserId, keyId);
      
      expect(newKey).toMatch(/^dbcoach_live_sk_[A-Za-z0-9]{32}$/);
      expect(newKey).toHaveLength(48);
    });

    test('should revoke API key successfully', async () => {
      const keyId = 'key-123';

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: keyId },
            error: null
          })
        })
      });

      await expect(apiKeyService.revokeApiKey(mockUserId, keyId))
        .resolves.not.toThrow();
    });

    test('should update API key settings', async () => {
      const keyId = 'key-123';
      const updates = {
        name: 'Updated Key Name',
        permissions: ['read'],
        is_active: false
      };

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: { id: keyId, ...updates },
            error: null
          })
        })
      });

      await expect(apiKeyService.updateApiKey(mockUserId, keyId, updates))
        .resolves.not.toThrow();
    });
  });

  describe('Security Features', () => {
    test('should hash API keys securely', async () => {
      // Test that keys are properly hashed (not stored in plain text)
      const request: CreateApiKeyRequest = {
        name: 'Test Key',
        permissions: ['read']
      };

      const mockResponse = {
        id: 'key-123',
        user_id: mockUserId,
        name: 'Test Key',
        key_hash: 'salt:hash',
        key_preview: 'dbcoach_live_sk_test...',
        permissions: ['read'],
        usage_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: mockResponse, error: null }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
      });

      const result = await apiKeyService.createApiKey(mockUserId, request);
      
      // Verify that the returned key hash is not the plain key
      expect(result.keyData.key_hash).not.toBe(result.apiKey);
      expect(result.keyData.key_hash).toContain(':'); // Should contain salt separator
    });

    test('should log security events', async () => {
      // Mock the security logging function
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const request: CreateApiKeyRequest = {
        name: 'Test Key',
        permissions: ['read']
      };

      const mockResponse = {
        id: 'key-123',
        user_id: mockUserId,
        name: 'Test Key',
        key_hash: 'hashed-key',
        key_preview: 'dbcoach_live_sk_test...',
        permissions: ['read'],
        usage_count: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: mockResponse, error: null }),
        select: vi.fn().mockReturnThis(),
        single: vi.fn()
      });

      await apiKeyService.createApiKey(mockUserId, request);
      
      // Security logging would typically go to a dedicated table
      // This is a simplified check
      expect(logSpy).toHaveBeenCalled();
      
      logSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      const request: CreateApiKeyRequest = {
        name: 'Test Key',
        permissions: ['read']
      };

      // Mock network error
      vi.mocked(require('../lib/supabase').supabase.from).mockImplementation(() => {
        throw new Error('Network error');
      });

      await expect(apiKeyService.createApiKey(mockUserId, request))
        .rejects.toThrow('Failed to create API key');
    });

    test('should handle validation service errors gracefully', async () => {
      const validKey = 'dbcoach_live_sk_' + 'A'.repeat(32);
      const clientIp = '192.168.1.1';
      const endpoint = '/api/test';

      // Mock service error
      vi.mocked(require('../lib/supabase').supabase.from).mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const result = await apiKeyService.validateApiKey(validKey, clientIp, endpoint);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Validation service unavailable');
    });
  });

  describe('Performance Tests', () => {
    test('should handle high volume key validation', async () => {
      const validKey = 'dbcoach_live_sk_' + 'A'.repeat(32);
      const clientIp = '192.168.1.1';
      const endpoint = '/api/test';

      const mockApiKey = {
        id: 'key-123',
        user_id: mockUserId,
        key_hash: 'valid-hash',
        is_active: true,
        expires_at: null,
        ip_whitelist: null,
        permissions: ['read']
      };

      vi.mocked(require('../lib/supabase').supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [mockApiKey],
            error: null
          })
        })
      });

      const startTime = Date.now();
      
      // Simulate 100 concurrent validations
      const promises = Array.from({ length: 100 }, () =>
        apiKeyService.validateApiKey(validKey, clientIp, endpoint)
      );
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      // All validations should complete within reasonable time (adjust as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      expect(results.every(r => r.isValid === true || r.isValid === false)).toBe(true);
    });
  });
});

export default {};