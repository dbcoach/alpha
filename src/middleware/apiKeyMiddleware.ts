/**
 * API Key Authentication Middleware
 * Validates API keys for incoming requests to protected endpoints
 */

import { apiKeyService, ApiKeyValidationResult } from '../services/apiKeyService';

export interface ApiKeyContext {
  userId?: string;
  keyId?: string;
  permissions?: string[];
  isValid: boolean;
}

/**
 * Express.js middleware for API key authentication
 */
export const authenticateApiKey = (requiredPermissions: string[] = []) => {
  return async (req: any, res: any, next: any) => {
    try {
      const apiKey = extractApiKeyFromRequest(req);
      const clientIp = getClientIp(req);
      const endpoint = req.path;

      if (!apiKey) {
        return res.status(401).json({
          error: 'API key required',
          code: 'MISSING_API_KEY',
          message: 'Please provide a valid API key in the Authorization header'
        });
      }

      const validation: ApiKeyValidationResult = await apiKeyService.validateApiKey(
        apiKey,
        clientIp,
        endpoint
      );

      if (!validation.isValid) {
        const statusCode = validation.rateLimited ? 429 : 401;
        return res.status(statusCode).json({
          error: validation.error,
          code: validation.rateLimited ? 'RATE_LIMITED' : 'INVALID_API_KEY',
          message: validation.error
        });
      }

      // Check permissions
      if (requiredPermissions.length > 0 && validation.key) {
        const hasPermission = requiredPermissions.every(permission =>
          validation.key!.permissions.includes(permission) ||
          validation.key!.permissions.includes('admin')
        );

        if (!hasPermission) {
          return res.status(403).json({
            error: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `This API key requires the following permissions: ${requiredPermissions.join(', ')}`
          });
        }
      }

      // Add key context to request
      req.apiKeyContext = {
        userId: validation.key?.user_id,
        keyId: validation.key?.id,
        permissions: validation.key?.permissions,
        isValid: true
      } as ApiKeyContext;

      next();
    } catch (error) {
      console.error('API key authentication error:', error);
      res.status(500).json({
        error: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_ERROR',
        message: 'Please try again later'
      });
    }
  };
};

/**
 * Extract API key from request headers
 */
function extractApiKeyFromRequest(req: any): string | null {
  // Check Authorization header (Bearer format)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check X-API-Key header
  const apiKeyHeader = req.headers['x-api-key'];
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check query parameter (not recommended for production)
  const queryApiKey = req.query.api_key;
  if (queryApiKey) {
    return queryApiKey;
  }

  return null;
}

/**
 * Get client IP address considering proxies
 */
function getClientIp(req: any): string {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Rate limiting middleware specifically for API key usage
 */
export const apiKeyRateLimit = (windowMs: number = 3600000, maxRequests: number = 1000) => {
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: any, res: any, next: any) => {
    const apiKeyContext = req.apiKeyContext as ApiKeyContext;
    
    if (!apiKeyContext?.keyId) {
      return next();
    }

    const now = Date.now();
    const keyId = apiKeyContext.keyId;
    const current = requestCounts.get(keyId);

    if (!current || now > current.resetTime) {
      requestCounts.set(keyId, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (current.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMITED',
        message: `Maximum ${maxRequests} requests per hour exceeded`,
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
    }

    current.count++;
    next();
  };
};

/**
 * Logging middleware for API key usage
 */
export const logApiKeyUsage = () => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const originalSend = res.send;

    res.send = function(body: any) {
      const apiKeyContext = req.apiKeyContext as ApiKeyContext;
      const duration = Date.now() - startTime;
      
      if (apiKeyContext?.keyId) {
        // Log API usage (implement based on your logging system)
        console.log('API Key Usage:', {
          keyId: apiKeyContext.keyId,
          userId: apiKeyContext.userId,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        });
      }

      originalSend.call(this, body);
    };

    next();
  };
};

export default {
  authenticateApiKey,
  apiKeyRateLimit,
  logApiKeyUsage
};