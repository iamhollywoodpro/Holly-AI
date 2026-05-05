/**
 * PHASE 8: API Integration Hub
 * Generic API client for connecting to external services
 */

import { prisma } from '@/lib/db';

// ===========================
// TypeScript Interfaces
// ===========================

export interface APIConfig {
  apiName?: string; // If provided, load from database
  url?: string; // Direct URL (if not using registered API)
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  auth?: {
    type: 'api_key' | 'bearer' | 'oauth';
    token?: string;
    key?: string;
  };
}

export interface APIResponse {
  success: boolean;
  status?: number;
  data?: any;
  headers?: Record<string, string>;
  error?: string;
  duration: number;
}

export interface APIDefinitionInput {
  name: string;
  description: string;
  baseUrl: string;
  authType: 'none' | 'api_key' | 'oauth' | 'bearer';
  headers?: Record<string, string>;
  rateLimit?: number;
  status?: 'active' | 'disabled' | 'testing';
  createdBy?: 'system' | 'holly' | 'admin';
}

export interface ListAPIOptions {
  status?: 'active' | 'disabled' | 'testing';
  createdBy?: 'system' | 'holly' | 'admin';
}

// ===========================
// Core Functions
// ===========================

/**
 * Call an external API
 */
export async function callAPI(config: APIConfig): Promise<APIResponse> {
  const startTime = Date.now();

  try {
    let apiDef;
    let finalUrl: string;
    let finalHeaders: Record<string, string> = {
      'User-Agent': 'HOLLY-AI/1.0',
      'Content-Type': 'application/json',
      ...config.headers
    };

    // If apiName provided, load from database
    if (config.apiName) {
      apiDef = await prisma.aPIDefinition.findUnique({
        where: { name: config.apiName }
      });

      if (!apiDef) {
        throw new Error(`API '${config.apiName}' not found`);
      }

      if (apiDef.status === 'disabled') {
        throw new Error(`API '${config.apiName}' is disabled`);
      }

      // Build URL from baseUrl
      finalUrl = apiDef.baseUrl + (config.url || '');

      // Merge headers
      const dbHeaders = (apiDef.headers as Record<string, string>) || {};
      finalHeaders = { ...finalHeaders, ...dbHeaders };

    } else if (config.url) {
      // Direct URL call
      finalUrl = config.url;
    } else {
      throw new Error('Either apiName or url must be provided');
    }

    // Add authentication
    if (config.auth) {
      switch (config.auth.type) {
        case 'api_key':
          if (config.auth.key) {
            finalHeaders['X-API-Key'] = config.auth.key;
          }
          break;
        case 'bearer':
          if (config.auth.token) {
            finalHeaders['Authorization'] = `Bearer ${config.auth.token}`;
          }
          break;
        case 'oauth':
          if (config.auth.token) {
            finalHeaders['Authorization'] = `OAuth ${config.auth.token}`;
          }
          break;
      }
    }

    // Make the request
    const controller = new AbortController();
    const timeout = config.timeout || 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions: RequestInit = {
      method: config.method || 'GET',
      headers: finalHeaders,
      signal: controller.signal
    };

    if (config.body && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method!)) {
      requestOptions.body = JSON.stringify(config.body);
    }

    const response = await fetch(finalUrl, requestOptions);
    clearTimeout(timeoutId);

    // Parse response
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    const duration = Date.now() - startTime;

    // Update API usage stats if using registered API
    if (apiDef) {
      await prisma.aPIDefinition.update({
        where: { id: apiDef.id },
        data: {
          callCount: { increment: 1 },
          lastUsed: new Date()
        }
      });
    }

    return {
      success: response.ok,
      status: response.status,
      data,
      headers: responseHeaders,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    };
  }
}

/**
 * Register a new API integration
 */
export async function registerAPI(apiDef: APIDefinitionInput): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Check if API with this name already exists
    const existing = await prisma.aPIDefinition.findUnique({
      where: { name: apiDef.name }
    });

    if (existing) {
      return {
        success: false,
        error: `API with name '${apiDef.name}' already exists`
      };
    }

    // Create new API definition
    const created = await prisma.aPIDefinition.create({
      data: {
        name: apiDef.name,
        description: apiDef.description,
        baseUrl: apiDef.baseUrl,
        authType: apiDef.authType,
        headers: apiDef.headers ? JSON.parse(JSON.stringify(apiDef.headers)) : null,
        rateLimit: apiDef.rateLimit,
        status: apiDef.status || 'testing',
        createdBy: apiDef.createdBy || 'holly',
        callCount: 0
      }
    });

    return {
      success: true,
      id: created.id
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * List all registered APIs
 */
export async function listAPIs(options?: ListAPIOptions): Promise<any[]> {
  try {
    const where: any = {};

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.createdBy) {
      where.createdBy = options.createdBy;
    }

    const apis = await prisma.aPIDefinition.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return apis;

  } catch (error) {
    console.error('[APIHub] List failed:', error);
    return [];
  }
}

/**
 * Test API connection
 */
export async function testConnection(apiName: string): Promise<{ success: boolean; message: string; duration?: number }> {
  try {
    // Get API definition
    const apiDef = await prisma.aPIDefinition.findUnique({
      where: { name: apiName }
    });

    if (!apiDef) {
      return {
        success: false,
        message: `API '${apiName}' not found`
      };
    }

    // Make a simple GET request to baseUrl
    const result = await callAPI({
      apiName,
      method: 'GET'
    });

    return {
      success: result.success,
      message: result.success 
        ? `Connection successful (${result.status})`
        : `Connection failed: ${result.error}`,
      duration: result.duration
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
