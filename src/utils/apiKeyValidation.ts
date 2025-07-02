/**
 * Client-side API Key Validation Utilities
 * For validating API key format and providing user feedback
 */

export interface ApiKeyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  strength: 'weak' | 'medium' | 'strong';
}

export class ApiKeyValidator {
  private static readonly VALID_PREFIX = 'dbcoach_live_sk_';
  private static readonly EXPECTED_LENGTH = 48; // prefix + 32 chars
  private static readonly VALID_CHARS = /^[A-Za-z0-9]+$/;

  /**
   * Validate API key format on the client side
   */
  static validateFormat(apiKey: string): ApiKeyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if key exists
    if (!apiKey || apiKey.trim().length === 0) {
      errors.push('API key is required');
      return { isValid: false, errors, warnings, strength: 'weak' };
    }

    const trimmedKey = apiKey.trim();

    // Check prefix
    if (!trimmedKey.startsWith(this.VALID_PREFIX)) {
      errors.push(`API key must start with "${this.VALID_PREFIX}"`);
    }

    // Check length
    if (trimmedKey.length !== this.EXPECTED_LENGTH) {
      errors.push(`API key must be exactly ${this.EXPECTED_LENGTH} characters long`);
    }

    // Check character set
    if (!this.VALID_CHARS.test(trimmedKey)) {
      errors.push('API key contains invalid characters. Only alphanumeric characters are allowed.');
    }

    // Check for common security issues
    if (trimmedKey.includes(' ')) {
      warnings.push('API key should not contain spaces');
    }

    if (trimmedKey.toLowerCase() === trimmedKey || trimmedKey.toUpperCase() === trimmedKey) {
      warnings.push('API key should contain mixed case characters for better security');
    }

    // Calculate strength
    const strength = this.calculateStrength(trimmedKey);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      strength
    };
  }

  /**
   * Calculate API key strength based on entropy and patterns
   */
  private static calculateStrength(apiKey: string): 'weak' | 'medium' | 'strong' {
    if (apiKey.length < this.EXPECTED_LENGTH) {
      return 'weak';
    }

    const keyPart = apiKey.replace(this.VALID_PREFIX, '');
    
    // Check character diversity
    const hasLower = /[a-z]/.test(keyPart);
    const hasUpper = /[A-Z]/.test(keyPart);
    const hasNumbers = /[0-9]/.test(keyPart);

    const diversityScore = [hasLower, hasUpper, hasNumbers].filter(Boolean).length;

    // Check for patterns
    const hasRepeatingChars = /(.)\1{3,}/.test(keyPart);
    const hasSequentialChars = this.hasSequentialPattern(keyPart);

    if (diversityScore >= 3 && !hasRepeatingChars && !hasSequentialChars) {
      return 'strong';
    } else if (diversityScore >= 2 && !hasRepeatingChars) {
      return 'medium';
    } else {
      return 'weak';
    }
  }

  /**
   * Check for sequential character patterns
   */
  private static hasSequentialPattern(str: string): boolean {
    for (let i = 0; i < str.length - 3; i++) {
      const char1 = str.charCodeAt(i);
      const char2 = str.charCodeAt(i + 1);
      const char3 = str.charCodeAt(i + 2);
      const char4 = str.charCodeAt(i + 3);

      if (char2 === char1 + 1 && char3 === char2 + 1 && char4 === char3 + 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Mask API key for display purposes
   */
  static maskApiKey(apiKey: string, visibleChars: number = 8): string {
    if (apiKey.length <= visibleChars) {
      return apiKey;
    }

    const prefix = apiKey.substring(0, visibleChars);
    const maskedLength = apiKey.length - visibleChars;
    const mask = '•'.repeat(maskedLength);
    
    return prefix + mask;
  }

  /**
   * Generate a preview of the API key for UI display
   */
  static generatePreview(apiKey: string): string {
    if (!apiKey || apiKey.length < 16) {
      return apiKey;
    }

    const start = apiKey.substring(0, 12);
    const end = apiKey.substring(apiKey.length - 4);
    
    return `${start}...${end}`;
  }

  /**
   * Check if API key appears to be from a test environment
   */
  static isTestKey(apiKey: string): boolean {
    const testIndicators = [
      'test',
      'dev',
      'demo',
      'sample',
      'example'
    ];

    const lowerKey = apiKey.toLowerCase();
    return testIndicators.some(indicator => lowerKey.includes(indicator));
  }

  /**
   * Validate permissions array
   */
  static validatePermissions(permissions: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validPermissions = ['read', 'write', 'delete', 'admin'];

    if (!Array.isArray(permissions)) {
      errors.push('Permissions must be an array');
      return { isValid: false, errors };
    }

    if (permissions.length === 0) {
      errors.push('At least one permission is required');
    }

    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      errors.push(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate IP whitelist entries
   */
  static validateIpWhitelist(ipList: string[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(ipList)) {
      errors.push('IP whitelist must be an array');
      return { isValid: false, errors };
    }

    for (const ip of ipList) {
      if (!this.isValidIpOrCidr(ip)) {
        errors.push(`Invalid IP address or CIDR notation: ${ip}`);
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate IP address or CIDR notation
   */
  private static isValidIpOrCidr(ip: string): boolean {
    // IPv4 address pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    // CIDR pattern
    const cidrPattern = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

    if (ip === '*') {
      return true; // Wildcard
    }

    if (ipv4Pattern.test(ip)) {
      // Validate IPv4 octets
      const octets = ip.split('.').map(Number);
      return octets.every(octet => octet >= 0 && octet <= 255);
    }

    if (cidrPattern.test(ip)) {
      const [address, prefix] = ip.split('/');
      const prefixNum = parseInt(prefix, 10);
      
      // Validate address part
      if (!ipv4Pattern.test(address)) {
        return false;
      }
      
      const octets = address.split('.').map(Number);
      if (!octets.every(octet => octet >= 0 && octet <= 255)) {
        return false;
      }
      
      // Validate prefix
      return prefixNum >= 0 && prefixNum <= 32;
    }

    return false;
  }
}

/**
 * API Key security utilities
 */
export class ApiKeySecurity {
  /**
   * Check if API key might be compromised
   */
  static checkCompromiseIndicators(apiKey: string): string[] {
    const indicators: string[] = [];

    // Check for common test patterns
    if (ApiKeyValidator.isTestKey(apiKey)) {
      indicators.push('Key appears to be from test environment');
    }

    // Check for weak patterns
    const validation = ApiKeyValidator.validateFormat(apiKey);
    if (validation.strength === 'weak') {
      indicators.push('Key has weak entropy or patterns');
    }

    return indicators;
  }

  /**
   * Generate security recommendations for API key usage
   */
  static generateSecurityRecommendations(apiKey: string, permissions: string[], ipWhitelist: string[]): string[] {
    const recommendations: string[] = [];

    // Check permissions
    if (permissions.includes('admin')) {
      recommendations.push('Consider using more specific permissions instead of admin access');
    }

    if (permissions.length > 3) {
      recommendations.push('Consider splitting functionality across multiple keys with specific permissions');
    }

    // Check IP restrictions
    if (!ipWhitelist || ipWhitelist.length === 0) {
      recommendations.push('Consider adding IP whitelist restrictions for enhanced security');
    }

    if (ipWhitelist && ipWhitelist.includes('*')) {
      recommendations.push('Wildcard IP access (*) reduces security - consider specific IP ranges');
    }

    // Key management
    recommendations.push('Rotate this key regularly (recommended: every 90 days)');
    recommendations.push('Monitor key usage and set up alerts for unusual activity');
    recommendations.push('Store keys securely using environment variables or secret management');

    return recommendations;
  }
}

export default {
  ApiKeyValidator,
  ApiKeySecurity
};