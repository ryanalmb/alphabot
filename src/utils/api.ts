import { APIGatewayProxyResult } from 'aws-lambda';
import { APIResponse } from '../types';

// CORS headers for API responses
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Content-Type': 'application/json',
};

// Create standardized API response
export function createResponse<T>(
  statusCode: number,
  data: T,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  const response: APIResponse<T> = {
    success: statusCode >= 200 && statusCode < 300,
    timestamp: new Date().toISOString(),
  };

  if (response.success) {
    response.data = data;
  } else {
    response.error = typeof data === 'string' ? data : (data as any)?.error || 'Unknown error';
    response.message = typeof data === 'object' && data !== null ? (data as any)?.message : undefined;
  }

  return {
    statusCode,
    headers: { ...corsHeaders, ...headers },
    body: JSON.stringify(response),
  };
}

// Parse JWT token from Authorization header
export function parseJWT(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}

// Extract user ID from JWT payload
export function extractUserIdFromToken(token: any): string | null {
  if (!token || !token.sub) return null;
  return token.sub;
}

// Validate pagination parameters
export function validatePaginationParams(
  page?: string,
  limit?: string
): { page: number; limit: number; offset: number } {
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
  const offset = (pageNum - 1) * limitNum;
  
  return { page: pageNum, limit: limitNum, offset };
}

// Create pagination metadata
export function createPaginationMeta(
  total: number,
  page: number,
  limit: number
): {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// Sanitize user input
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

// Rate limiting helper
export function createRateLimitKey(
  userId: string,
  endpoint: string,
  timeWindow: string = 'minute'
): string {
  const timestamp = Math.floor(Date.now() / (timeWindow === 'minute' ? 60000 : 3600000));
  return `rate_limit:${userId}:${endpoint}:${timestamp}`;
}

// Error response helpers
export function createErrorResponse(
  statusCode: number,
  message: string,
  details?: any
): APIGatewayProxyResult {
  return createResponse(statusCode, {
    error: message,
    details,
  });
}

export function createValidationErrorResponse(errors: string[]): APIGatewayProxyResult {
  return createResponse(400, {
    error: 'Validation failed',
    details: errors,
  });
}

export function createUnauthorizedResponse(message: string = 'Unauthorized'): APIGatewayProxyResult {
  return createResponse(401, { error: message });
}

export function createForbiddenResponse(message: string = 'Forbidden'): APIGatewayProxyResult {
  return createResponse(403, { error: message });
}

export function createNotFoundResponse(resource: string = 'Resource'): APIGatewayProxyResult {
  return createResponse(404, { error: `${resource} not found` });
}

export function createConflictResponse(message: string): APIGatewayProxyResult {
  return createResponse(409, { error: message });
}

export function createTooManyRequestsResponse(message: string = 'Too many requests'): APIGatewayProxyResult {
  return createResponse(429, { error: message });
}

export function createInternalServerErrorResponse(message: string = 'Internal server error'): APIGatewayProxyResult {
  return createResponse(500, { error: message });
}

// Success response helpers
export function createSuccessResponse<T>(data: T): APIGatewayProxyResult {
  return createResponse(200, data);
}

export function createCreatedResponse<T>(data: T): APIGatewayProxyResult {
  return createResponse(201, data);
}

export function createAcceptedResponse(message: string = 'Request accepted'): APIGatewayProxyResult {
  return createResponse(202, { message });
}

export function createNoContentResponse(): APIGatewayProxyResult {
  return {
    statusCode: 204,
    headers: corsHeaders,
    body: '',
  };
}

// Query parameter helpers
export function parseQueryParams(
  queryStringParameters: Record<string, string> | null
): Record<string, any> {
  if (!queryStringParameters) return {};
  
  const params: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(queryStringParameters)) {
    // Try to parse as number
    if (/^\d+$/.test(value)) {
      params[key] = parseInt(value, 10);
    }
    // Try to parse as float
    else if (/^\d+\.\d+$/.test(value)) {
      params[key] = parseFloat(value);
    }
    // Try to parse as boolean
    else if (value === 'true' || value === 'false') {
      params[key] = value === 'true';
    }
    // Keep as string
    else {
      params[key] = value;
    }
  }
  
  return params;
}

// Path parameter helpers
export function extractPathParams(
  path: string,
  template: string
): Record<string, string> {
  const pathParts = path.split('/').filter(Boolean);
  const templateParts = template.split('/').filter(Boolean);
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < templateParts.length; i++) {
    const templatePart = templateParts[i];
    if (templatePart.startsWith('{') && templatePart.endsWith('}')) {
      const paramName = templatePart.slice(1, -1);
      params[paramName] = pathParts[i] || '';
    }
  }
  
  return params;
}

// Request body helpers
export function parseRequestBody<T>(body: string | null): T | null {
  if (!body) return null;
  
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

// Cache helpers
export function createCacheKey(prefix: string, ...parts: string[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export function createCacheHeaders(maxAge: number): Record<string, string> {
  return {
    'Cache-Control': `public, max-age=${maxAge}`,
    'ETag': `"${Date.now()}"`,
  };
}

// Security helpers
export function validateOrigin(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
}

export function createSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
}

// Logging helpers
export function createRequestLog(
  method: string,
  path: string,
  userId?: string,
  duration?: number
): Record<string, any> {
  return {
    method,
    path,
    userId,
    duration,
    timestamp: new Date().toISOString(),
  };
}

// Type guards
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export default {
  corsHeaders,
  createResponse,
  parseJWT,
  extractUserIdFromToken,
  validatePaginationParams,
  createPaginationMeta,
  sanitizeInput,
  createRateLimitKey,
  createErrorResponse,
  createValidationErrorResponse,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createNotFoundResponse,
  createConflictResponse,
  createTooManyRequestsResponse,
  createInternalServerErrorResponse,
  createSuccessResponse,
  createCreatedResponse,
  createAcceptedResponse,
  createNoContentResponse,
  parseQueryParams,
  extractPathParams,
  parseRequestBody,
  createCacheKey,
  createCacheHeaders,
  validateOrigin,
  createSecurityHeaders,
  createRequestLog,
  isValidUUID,
  isValidEmail,
  isValidUrl,
};
