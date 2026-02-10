/**
 * Security and Validation Utilities
 *
 * Centralized validation and sanitization functions for:
 * - Safe JSON parsing with error handling
 * - Filename validation (prevents path traversal)
 * - URL validation (prevents SSRF attacks)
 * - Error message sanitization (prevents sensitive data exposure)
 */

/**
 * Result type for validation functions
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Patterns that commonly indicate API keys or tokens
 * Used to sanitize error messages
 */
const SENSITIVE_PATTERNS = [
  // API key patterns (sk-,Bearer, etc.)
  /sk-[a-zA-Z0-9]{20,}/g,
  /Bearer\s+[a-zA-Z0-9]{20,}/gi,
  /api[_-]?key["\']?\s*[:=]\s*["\']?[a-zA-Z0-9]{20,}/gi,
  /token["\']?\s*[:=]\s*["\']?[a-zA-Z0-9]{20,}/gi,
  // Generic long alphanumeric strings that might be keys
  /\b[a-zA-Z0-9]{32,}\b/g,
];

/**
 * Safely parses JSON with error handling
 *
 * @param json - JSON string to parse
 * @param schema - Optional schema validation function
 * @returns Parsed object or null if parsing fails
 *
 * @example
 * const result = safeJsonParse<User>(userData, userSchema);
 * if (!result) {
 *   return res.status(400).json({ error: 'Invalid JSON format' });
 * }
 */
export function safeJsonParse<T = unknown>(
  json: string,
  schema?: (data: unknown) => data is T
): T | null {
  if (typeof json !== 'string') {
    return null;
  }

  // Check for null byte injection (potential exploit vector)
  if (json.includes('\0')) {
    console.error('JSON parse blocked: null byte detected');
    return null;
  }

  // Limit size to prevent DoS (max 10MB)
  if (json.length > 10 * 1024 * 1024) {
    console.error('JSON parse blocked: content too large');
    return null;
  }

  try {
    const parsed = JSON.parse(json);

    // Run schema validation if provided
    if (schema && !schema(parsed)) {
      console.error('JSON parse blocked: schema validation failed');
      return null;
    }

    return parsed as T;
  } catch (error) {
    // Log the error type but not the full content (may be sensitive)
    if (error instanceof SyntaxError) {
      console.error('JSON parse failed: SyntaxError at position', (error as any).position);
    } else if (error instanceof Error) {
      console.error('JSON parse failed:', error.message);
    } else {
      console.error('JSON parse failed: unknown error');
    }
    return null;
  }
}

/**
 * Validates a filename for security and allowed characters
 *
 * Prevents:
 * - Path traversal attacks (../, ..\)
 * - Null byte injection
 * - Absolute paths
 * - Special characters that cause issues on different filesystems
 *
 * @param filename - The filename to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * const validation = validateFilename(userInput);
 * if (!validation.valid) {
 *   return res.status(400).json({ error: validation.error });
 * }
 */
export function validateFilename(filename: string): ValidationResult {
  if (typeof filename !== 'string') {
    return { valid: false, error: 'Filename must be a string' };
  }

  // Check for empty filename
  if (!filename || filename.trim().length === 0) {
    return { valid: false, error: 'Filename cannot be empty' };
  }

  // Check length limit (255 is common filesystem limit)
  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' };
  }

  // Block null bytes (known exploit vector in path operations)
  if (filename.includes('\0')) {
    return { valid: false, error: 'Invalid filename: null bytes not allowed' };
  }

  // Block path traversal patterns
  if (filename.includes('..') || filename.includes('./') || filename.includes('.\\')) {
    return { valid: false, error: 'Invalid filename: path traversal not allowed' };
  }

  // Block absolute paths (Unix and Windows)
  if (filename.startsWith('/') || /^[a-zA-Z]:/.test(filename)) {
    return { valid: false, error: 'Invalid filename: absolute paths not allowed' };
  }

  // Block shell metacharacters that could be exploited
  const shellChars = /[|;&$<>`]/;
  if (shellChars.test(filename)) {
    return { valid: false, error: 'Invalid filename: contains restricted characters' };
  }

  // Allow only safe characters: letters, numbers, hyphens, underscores, dots
  // Also allow Unicode letters for international filenames
  const safePattern = /^[\p{L}\p{N}_\-./\\]+$/u;
  if (!safePattern.test(filename)) {
    return { valid: false, error: 'Invalid filename: contains unsupported characters' };
  }

  // Reserved filenames on Windows
  const windowsReserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  const basename = filename.replace(/\.[^.]+$/, ''); // Remove extension
  if (windowsReserved.test(basename)) {
    return { valid: false, error: 'Invalid filename: reserved system name' };
  }

  return { valid: true };
}

/**
 * Validates a provider URL to prevent SSRF (Server-Side Request Forgery) attacks
 *
 * Blocks:
 * - Private/internal network addresses (localhost, 127.0.0.1, 192.168.x.x, etc.)
 * - Link-local addresses
 * - Non-HTTP(S) protocols
 *
 * @param url - The URL to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * const validation = validateProviderUrl(provider.baseUrl);
 * if (!validation.valid) {
 *   return { success: false, error: validation.error };
 * }
 */
export function validateProviderUrl(url: string): ValidationResult {
  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }

  if (!url || url.trim().length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP and HTTPS protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  // Block localhost variants
  const localhostPatterns = [
    'localhost',
    '127.',
    '0.0.0.0',
    '::1',
    '[::1]',
  ];
  if (localhostPatterns.some(pattern => hostname === pattern || hostname.startsWith(pattern))) {
    return { valid: false, error: 'Access to localhost is not allowed' };
  }

  // Block private IP ranges (RFC 1918)
  // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  const privateIpPatterns = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
  ];
  if (privateIpPatterns.some(pattern => pattern.test(hostname))) {
    return { valid: false, error: 'Access to private networks is not allowed' };
  }

  // Block link-local addresses (169.254.0.0/16)
  if (hostname.startsWith('169.254.')) {
    return { valid: false, error: 'Access to link-local networks is not allowed' };
  }

  // Block class E multicast (240.0.0.0/4)
  if (/^2[4-9]\./.test(hostname) || /^22[0-9]\./.test(hostname)) {
    return { valid: false, error: 'Access to multicast networks is not allowed' };
  }

  // Block metadata endpoints (cloud provider metadata services)
  const metadataEndpoints = [
    'metadata',
    '169.254.169.254',
  ];
  if (metadataEndpoints.some(endpoint => hostname.includes(endpoint))) {
    return { valid: false, error: 'Access to metadata endpoints is not allowed' };
  }

  return { valid: true };
}

/**
 * Sanitizes error messages to prevent exposure of sensitive data
 *
 * Removes:
 * - API keys and tokens
 * - Passwords
 * - Other sensitive identifiers
 *
 * @param message - The error message to sanitize
 * @returns Sanitized error message safe to return to clients
 *
 * @example
 * return {
 *   success: false,
 *   error: sanitizeErrorMessage(`API error (${response.status})`),
 * };
 */
export function sanitizeErrorMessage(message: string): string {
  if (typeof message !== 'string') {
    return 'An error occurred';
  }

  let sanitized = message;

  // Remove common sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // Truncate very long messages (may contain embedded sensitive data)
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500) + '...';
  }

  return sanitized;
}

/**
 * Creates a JSON schema validator that checks for required fields
 *
 * @param requiredFields - Array of required field names
 * @returns A schema validation function
 *
 * @example
 * const storeSchema = createObjectSchema(['sentences', 'version']);
 * const store = safeJsonParse(content, storeSchema);
 */
export function createObjectSchema(requiredFields: string[]): (data: unknown) => boolean {
  return (data: unknown): data is Record<string, unknown> => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    for (const field of requiredFields) {
      if (!(field in obj)) {
        return false;
      }
    }

    return true;
  };
}

/**
 * Schema validator for arrays
 */
export function isArraySchema(data: unknown): data is unknown[] {
  return Array.isArray(data);
}

/**
 * Combined schema validator (checks both object and array fields)
 */
export function createStoreSchema(
  objectFields: string[],
  arrayField: string
): (data: unknown) => boolean {
  return (data: unknown): boolean => {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const obj = data as Record<string, unknown>;

    // Check required object fields
    for (const field of objectFields) {
      if (!(field in obj)) {
        return false;
      }
    }

    // Check array field
    if (!(arrayField in obj) || !Array.isArray(obj[arrayField])) {
      return false;
    }

    return true;
  };
}

// Export common schemas for convenience
export const SENTENCE_STORE_SCHEMA = createStoreSchema(['version', 'lastModified'], 'sentences');
export const TAG_STORE_SCHEMA = createStoreSchema(['version', 'lastModified'], 'userTags');
export const VOCABULARY_STORE_SCHEMA = createStoreSchema(['version', 'lastModified'], 'items');
