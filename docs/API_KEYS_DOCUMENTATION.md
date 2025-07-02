# API Keys Management System Documentation

## Overview

The DB.Coach API Keys Management System provides secure, scalable API key authentication for accessing the DBCoach services. This system follows OWASP security guidelines and implements enterprise-grade security features including encryption at rest, rate limiting, IP whitelisting, and automatic key rotation.

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Key Format](#api-key-format)
3. [Authentication Methods](#authentication-methods)
4. [Security Features](#security-features)
5. [Rate Limiting](#rate-limiting)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

## Quick Start

### Creating Your First API Key

1. **Login to DBCoach Dashboard**
   ```
   Navigate to: https://your-domain.com/settings/api-keys
   ```

2. **Create New API Key**
   ```javascript
   // Click "Create New Key" button
   // Fill in the form:
   {
     "name": "Production API",
     "permissions": ["read", "write"],
     "ip_whitelist": ["192.168.1.0/24"],
     "expires_in_days": 90
   }
   ```

3. **Secure Your Key**
   ```bash
   # Store in environment variable
   export DBCOACH_API_KEY="dbcoach_live_sk_[your-key-here]"
   ```

### Making Your First API Call

```javascript
// Node.js Example
const fetch = require('node-fetch');

const response = await fetch('https://api.dbcoach.com/v1/designs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.DBCOACH_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: "E-commerce database with products and orders",
    database_type: "postgresql"
  })
});

const result = await response.json();
console.log(result);
```

## API Key Format

### Structure
```
dbcoach_live_sk_[32-character-random-string]
```

### Examples
```
✅ Valid:   dbcoach_live_sk_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6
❌ Invalid: dbcoach_test_sk_shortkey
❌ Invalid: sk_dbcoach_wrongprefix
❌ Invalid: dbcoach_live_sk_special@chars
```

### Validation Rules

1. **Prefix**: Must start with `dbcoach_live_sk_`
2. **Length**: Exactly 48 characters total
3. **Character Set**: Alphanumeric only (A-Z, a-z, 0-9)
4. **Uniqueness**: Each key is cryptographically unique
5. **Entropy**: High entropy random generation using Web Crypto API

## Authentication Methods

### 1. Bearer Token (Recommended)
```javascript
headers: {
  'Authorization': 'Bearer dbcoach_live_sk_your_key_here'
}
```

### 2. X-API-Key Header
```javascript
headers: {
  'X-API-Key': 'dbcoach_live_sk_your_key_here'
}
```

### 3. Query Parameter (Not Recommended)
```
https://api.dbcoach.com/v1/designs?api_key=dbcoach_live_sk_your_key_here
```

⚠️ **Security Note**: Query parameters are logged and visible in URLs. Use only for testing.

## Security Features

### 1. Encryption at Rest
- API keys are hashed using PBKDF2 with 10,000 iterations
- Salt-based hashing prevents rainbow table attacks
- Only key preview (first 12 characters) stored for UI display

### 2. IP Whitelisting
```javascript
// Single IP
"ip_whitelist": ["192.168.1.100"]

// IP Range (CIDR)
"ip_whitelist": ["192.168.1.0/24", "10.0.0.0/8"]

// Multiple IPs
"ip_whitelist": ["203.0.113.1", "203.0.113.2"]

// Wildcard (Not Recommended)
"ip_whitelist": ["*"]
```

### 3. Key Expiration
```javascript
{
  "expires_in_days": 90,  // Auto-expire in 90 days
  "expires_in_days": null // Never expires (not recommended)
}
```

### 4. Permission System
```javascript
{
  "permissions": [
    "read",    // Read database designs and data
    "write",   // Create and modify designs
    "delete",  // Delete designs and data
    "admin"    // Full access (includes all permissions)
  ]
}
```

### 5. Rate Limiting
- **Default Limit**: 1,000 requests per hour per API key
- **Rate Window**: 1 hour sliding window
- **Burst Protection**: Request spike detection
- **Gradual Backoff**: Automatic retry suggestions

### 6. Key Rotation
```javascript
// Automatic rotation
const rotatedKey = await apiKeyService.rotateApiKey(userId, keyId);

// Manual rotation via API
POST /api/v1/keys/:keyId/rotate
Authorization: Bearer admin_key_here
```

## Rate Limiting

### Default Limits
| Plan | Requests/Hour | Burst Limit | Concurrent |
|------|---------------|-------------|------------|
| Free | 100 | 10 | 2 |
| Pro | 1,000 | 50 | 10 |
| Enterprise | 10,000 | 200 | 50 |

### Rate Limit Headers
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 3600
```

### Rate Limit Exceeded Response
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "message": "Maximum 1000 requests per hour exceeded",
  "retryAfter": 3542
}
```

## Error Handling

### Error Response Format
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "message": "Detailed error message",
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "req_abc123"
}
```

### Common Error Codes

| Code | Status | Description | Solution |
|------|--------|-------------|----------|
| `MISSING_API_KEY` | 401 | No API key provided | Include API key in request |
| `INVALID_API_KEY` | 401 | Invalid key format | Check key format and validity |
| `API_KEY_EXPIRED` | 401 | Key has expired | Rotate or create new key |
| `IP_NOT_WHITELISTED` | 401 | IP not allowed | Add IP to whitelist |
| `INSUFFICIENT_PERMISSIONS` | 403 | Missing required permissions | Update key permissions |
| `RATE_LIMITED` | 429 | Too many requests | Wait and retry |

### Error Handling Examples

```javascript
// JavaScript Error Handling
async function makeAPICall() {
  try {
    const response = await fetch('/api/v1/designs', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      switch (error.code) {
        case 'RATE_LIMITED':
          // Wait and retry
          await new Promise(resolve => 
            setTimeout(resolve, error.retryAfter * 1000)
          );
          return makeAPICall();
          
        case 'API_KEY_EXPIRED':
          // Refresh API key
          await refreshApiKey();
          return makeAPICall();
          
        case 'INSUFFICIENT_PERMISSIONS':
          throw new Error('API key needs additional permissions');
          
        default:
          throw new Error(`API Error: ${error.message}`);
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}
```

## Best Practices

### 1. Key Storage and Management

```bash
# ✅ DO: Use environment variables
export DBCOACH_API_KEY="dbcoach_live_sk_your_key"

# ✅ DO: Use secret management services
aws secretsmanager get-secret-value --secret-id dbcoach-api-key

# ❌ DON'T: Hardcode in source code
const apiKey = "dbcoach_live_sk_hardcoded_key"; // Never do this!

# ❌ DON'T: Store in version control
git add .env  # Make sure .env is in .gitignore
```

### 2. Permission Management

```javascript
// ✅ DO: Use least privilege principle
{
  "name": "Read-only Analytics",
  "permissions": ["read"]
}

// ❌ DON'T: Use admin permissions unnecessarily
{
  "name": "Simple Integration",
  "permissions": ["admin"]  // Too broad!
}
```

### 3. IP Whitelisting

```javascript
// ✅ DO: Restrict to specific IPs/ranges
"ip_whitelist": ["203.0.113.100", "192.168.1.0/24"]

// ⚠️ AVOID: Wildcards in production
"ip_whitelist": ["*"]  // Only for development
```

### 4. Key Rotation

```javascript
// ✅ DO: Regular rotation schedule
const rotationSchedule = {
  development: 30,   // 30 days
  staging: 60,      // 60 days
  production: 90    // 90 days
};

// ✅ DO: Implement graceful key transition
async function rotateKey() {
  const newKey = await createNewKey();
  await updateApplicationConfig(newKey);
  await verifyNewKeyWorks();
  await revokeOldKey();
}
```

### 5. Monitoring and Alerting

```javascript
// ✅ DO: Monitor key usage
const monitoringConfig = {
  unusualActivity: true,
  rateLimitApproaching: true,
  ipViolations: true,
  keyExpiration: 7 // days before expiry
};

// ✅ DO: Set up alerts
const alerts = {
  email: "admin@company.com",
  webhook: "https://your-webhook.com/alerts",
  slack: "#security-alerts"
};
```

## API Reference

### Authentication Endpoints

#### Create API Key
```http
POST /api/v1/keys
Authorization: Bearer user_session_token
Content-Type: application/json

{
  "name": "Production API",
  "permissions": ["read", "write"],
  "ip_whitelist": ["192.168.1.0/24"],
  "expires_in_days": 90
}
```

#### List API Keys
```http
GET /api/v1/keys
Authorization: Bearer user_session_token
```

#### Get API Key Details
```http
GET /api/v1/keys/:keyId
Authorization: Bearer user_session_token
```

#### Update API Key
```http
PUT /api/v1/keys/:keyId
Authorization: Bearer user_session_token
Content-Type: application/json

{
  "name": "Updated Name",
  "permissions": ["read"],
  "is_active": false
}
```

#### Rotate API Key
```http
POST /api/v1/keys/:keyId/rotate
Authorization: Bearer user_session_token
```

#### Revoke API Key
```http
DELETE /api/v1/keys/:keyId
Authorization: Bearer user_session_token
```

#### Get Usage Statistics
```http
GET /api/v1/keys/:keyId/usage
Authorization: Bearer user_session_token
```

### Protected Endpoints

#### Generate Database Design
```http
POST /api/v1/designs
Authorization: Bearer dbcoach_live_sk_your_key
Content-Type: application/json

{
  "prompt": "E-commerce platform with products, orders, and customers",
  "database_type": "postgresql",
  "mode": "dbcoach_pro"
}
```

#### List Designs
```http
GET /api/v1/designs
Authorization: Bearer dbcoach_live_sk_your_key
```

#### Get Design Details
```http
GET /api/v1/designs/:designId
Authorization: Bearer dbcoach_live_sk_your_key
```

## Testing

### Unit Tests

```javascript
// Jest/Vitest Example
import { apiKeyService } from '../services/apiKeyService';

describe('API Key Service', () => {
  test('should generate valid API key format', async () => {
    const result = await apiKeyService.createApiKey(userId, {
      name: 'Test Key',
      permissions: ['read']
    });
    
    expect(result.apiKey).toMatch(/^dbcoach_live_sk_[A-Za-z0-9]{32}$/);
    expect(result.apiKey).toHaveLength(48);
  });
  
  test('should validate API key correctly', async () => {
    const validation = await apiKeyService.validateApiKey(
      'dbcoach_live_sk_validkey123',
      '192.168.1.1',
      '/api/test'
    );
    
    expect(validation.isValid).toBe(true);
  });
});
```

### Integration Tests

```javascript
// API Integration Test
describe('API Key Authentication', () => {
  test('should authenticate valid requests', async () => {
    const response = await fetch('/api/v1/designs', {
      headers: {
        'Authorization': `Bearer ${validApiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status).toBe(200);
  });
  
  test('should reject invalid API keys', async () => {
    const response = await fetch('/api/v1/designs', {
      headers: {
        'Authorization': 'Bearer invalid_key',
        'Content-Type': 'application/json'
      }
    });
    
    expect(response.status).toBe(401);
  });
});
```

### Security Tests

```javascript
// Security Test Suite
describe('Security Validation', () => {
  test('should prevent SQL injection in key validation', async () => {
    const maliciousKey = "dbcoach_live_sk_'; DROP TABLE api_keys; --";
    
    const result = await apiKeyService.validateApiKey(
      maliciousKey,
      '192.168.1.1',
      '/api/test'
    );
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid API key format');
  });
  
  test('should enforce rate limiting', async () => {
    // Make requests beyond rate limit
    const promises = Array.from({ length: 1001 }, () =>
      makeAPIRequest(validApiKey)
    );
    
    const results = await Promise.all(promises);
    const rateLimitedRequests = results.filter(r => r.status === 429);
    
    expect(rateLimitedRequests.length).toBeGreaterThan(0);
  });
});
```

### Load Testing

```javascript
// Artillery.io Configuration
module.exports = {
  config: {
    target: 'https://api.dbcoach.com',
    phases: [
      { duration: 60, arrivalRate: 10 },   // Ramp up
      { duration: 300, arrivalRate: 50 },  // Sustained load
      { duration: 60, arrivalRate: 100 }   // Peak load
    ],
    headers: {
      'Authorization': 'Bearer {{ $randomString() }}'
    }
  },
  scenarios: [
    {
      name: 'API Key Validation',
      requests: [
        {
          get: {
            url: '/api/v1/designs'
          }
        }
      ]
    }
  ]
};
```

## Troubleshooting

### Common Issues

#### 1. "Invalid API key format" Error

**Problem**: API key doesn't match expected format
```
❌ Error: "Invalid API key format"
```

**Solutions**:
```bash
# Check key format
echo $DBCOACH_API_KEY | grep -E '^dbcoach_live_sk_[A-Za-z0-9]{32}$'

# Verify key length
echo ${#DBCOACH_API_KEY}  # Should be 48

# Check for hidden characters
xxd <<< $DBCOACH_API_KEY
```

#### 2. "IP address not whitelisted" Error

**Problem**: Request coming from non-whitelisted IP
```json
{
  "error": "IP address not whitelisted",
  "code": "IP_NOT_WHITELISTED"
}
```

**Solutions**:
```bash
# Check your current IP
curl ipinfo.io/ip

# Update IP whitelist via API
curl -X PUT /api/v1/keys/your-key-id \
  -H "Authorization: Bearer session_token" \
  -d '{"ip_whitelist": ["your.current.ip.address"]}'
```

#### 3. Rate Limiting Issues

**Problem**: Too many requests
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 3600
}
```

**Solutions**:
```javascript
// Implement exponential backoff
async function makeRequestWithBackoff(apiCall, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.code === 'RATE_LIMITED' && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

#### 4. Key Expiration

**Problem**: API key has expired
```json
{
  "error": "API key has expired",
  "code": "API_KEY_EXPIRED"
}
```

**Solutions**:
```javascript
// Set up key expiration monitoring
const checkKeyExpiration = async () => {
  const keys = await apiKeyService.getUserApiKeys(userId);
  
  keys.forEach(key => {
    if (key.expires_at) {
      const daysUntilExpiry = (new Date(key.expires_at) - new Date()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry < 7) {
        console.warn(`Key "${key.name}" expires in ${daysUntilExpiry} days`);
        // Trigger rotation or renewal process
      }
    }
  });
};
```

### Debug Mode

```javascript
// Enable debug logging
const apiKeyService = new ApiKeyService({
  debug: true,
  logLevel: 'verbose'
});

// Check service health
const healthCheck = await apiKeyService.healthCheck();
console.log('Service Status:', healthCheck);
```

### Support and Contact

For additional support:
- 📧 Email: support@dbcoach.com
- 💬 Discord: [DBCoach Community](https://discord.gg/dbcoach)
- 📖 Documentation: [docs.dbcoach.com](https://docs.dbcoach.com)
- 🐛 Bug Reports: [GitHub Issues](https://github.com/dbcoach/issues)

---

**Last Updated**: January 2024  
**Version**: 1.0.0  
**API Version**: v1