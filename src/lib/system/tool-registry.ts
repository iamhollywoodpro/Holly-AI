/**
 * HOLLY's Dynamic Tool Registry
 * 
 * Manages tool definitions that can be registered, updated, and removed at runtime
 * Part of Phase 7: Foundation Layer
 */

import { prisma } from '@/lib/db';
import { writeSourceFile } from './file-system';
import * as path from 'path';

// ===========================
// Type Definitions (from architecture doc)
// ===========================

export interface ToolSchema {
  name: string;
  description: string;
  category: 'system' | 'creative' | 'analysis' | 'integration';
  parameters: {
    type: 'object';
    properties: Record<string, ParameterDefinition>;
    required: string[];
  };
  implementation?: string; // Path to implementation file
}

export interface ParameterDefinition {
  type: string;
  description: string;
  enum?: string[];
  default?: any;
}

export interface ToolRegistration {
  success: boolean;
  toolId?: string;
  error?: string;
  conflicts?: string[];
}

// ===========================
// Validation Functions
// ===========================

/**
 * Validate tool schema structure
 */
export function validateToolSchema(schema: ToolSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!schema.name || typeof schema.name !== 'string') {
    errors.push('Tool name is required and must be a string');
  }
  
  if (!schema.description || typeof schema.description !== 'string') {
    errors.push('Tool description is required and must be a string');
  }
  
  if (!schema.category || !['system', 'creative', 'analysis', 'integration'].includes(schema.category)) {
    errors.push('Tool category must be one of: system, creative, analysis, integration');
  }
  
  // Validate parameters structure
  if (!schema.parameters || typeof schema.parameters !== 'object') {
    errors.push('Tool parameters are required');
  } else {
    if (schema.parameters.type !== 'object') {
      errors.push('Parameters type must be "object"');
    }
    
    if (!schema.parameters.properties || typeof schema.parameters.properties !== 'object') {
      errors.push('Parameters must have properties object');
    }
    
    if (!Array.isArray(schema.parameters.required)) {
      errors.push('Parameters required must be an array');
    }
    
    // Validate each parameter
    for (const [paramName, paramDef] of Object.entries(schema.parameters.properties)) {
      if (!paramDef.type) {
        errors.push(`Parameter "${paramName}" missing type`);
      }
      if (!paramDef.description) {
        errors.push(`Parameter "${paramName}" missing description`);
      }
    }
  }
  
  // Validate tool name format (alphanumeric, underscores, hyphens only)
  if (schema.name && !/^[a-z0-9_-]+$/i.test(schema.name)) {
    errors.push('Tool name can only contain letters, numbers, underscores, and hyphens');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ===========================
// Public API Functions
// ===========================

/**
 * Register new tool in the system
 */
export async function registerTool(
  schema: ToolSchema,
  options?: { override?: boolean; validate?: boolean }
): Promise<ToolRegistration> {
  try {
    // Validate schema if requested (default true)
    if (options?.validate !== false) {
      const validation = validateToolSchema(schema);
      if (!validation.valid) {
        return {
          success: false,
          error: `Schema validation failed: ${validation.errors.join(', ')}`
        };
      }
    }
    
    // Check for existing tool with same name
    const existing = await prisma.toolDefinition.findUnique({
      where: { name: schema.name }
    });
    
    if (existing && !options?.override) {
      return {
        success: false,
        error: 'Tool with this name already exists',
        conflicts: [existing.name]
      };
    }
    
    // Create or update tool definition
    // Note: Prisma field names match exactly from schema
    const toolData = {
      name: schema.name,
      description: schema.description,
      category: schema.category,
      schema: JSON.parse(JSON.stringify(schema.parameters)), // Convert to plain JSON
      status: 'testing' as const, // New tools start in testing mode
      createdBy: 'holly' as const,
      version: '1.0.0',
      usageCount: 0,
      successRate: null,
      lastUsed: null
    };
    
    let tool;
    if (existing && options?.override) {
      // Update existing
      tool = await prisma.toolDefinition.update({
        where: { id: existing.id },
        data: {
          ...toolData,
          version: incrementVersion(existing.version)
        }
      });
    } else {
      // Create new
      tool = await prisma.toolDefinition.create({
        data: toolData
      });
    }
    
    console.log('[ToolRegistry] Tool registered:', tool.name);
    
    return {
      success: true,
      toolId: tool.id
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ToolRegistry] Registration failed:', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Unregister tool from the system
 */
export async function unregisterTool(
  toolName: string,
  options?: { force?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if tool exists
    const tool = await prisma.toolDefinition.findUnique({
      where: { name: toolName }
    });
    
    if (!tool) {
      return {
        success: false,
        error: 'Tool not found'
      };
    }
    
    // Check if tool is system-critical (can't be removed without force)
    if (tool.createdBy === 'system' && !options?.force) {
      return {
        success: false,
        error: 'Cannot remove system tool without force flag'
      };
    }
    
    // Delete tool
    await prisma.toolDefinition.delete({
      where: { id: tool.id }
    });
    
    console.log('[ToolRegistry] Tool unregistered:', toolName);
    
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ToolRegistry] Unregistration failed:', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Update existing tool definition
 */
export async function updateTool(
  toolName: string,
  updates: Partial<ToolSchema>
): Promise<ToolRegistration> {
  try {
    // Find existing tool
    const existing = await prisma.toolDefinition.findUnique({
      where: { name: toolName }
    });
    
    if (!existing) {
      return {
        success: false,
        error: 'Tool not found'
      };
    }
    
    // Merge updates with existing schema
    const currentSchema = existing.schema as any;
    const updatedData: any = {};
    
    if (updates.description) {
      updatedData.description = updates.description;
    }
    
    if (updates.category) {
      updatedData.category = updates.category;
    }
    
    if (updates.parameters) {
      updatedData.schema = JSON.parse(JSON.stringify(updates.parameters)); // Convert to plain JSON
    }
    
    // Increment version
    updatedData.version = incrementVersion(existing.version);
    
    // Update in database
    const tool = await prisma.toolDefinition.update({
      where: { id: existing.id },
      data: updatedData
    });
    
    console.log('[ToolRegistry] Tool updated:', tool.name, 'version:', tool.version);
    
    return {
      success: true,
      toolId: tool.id
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ToolRegistry] Update failed:', errorMsg);
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * List available tools with optional filters
 */
export async function listAvailableTools(
  filters?: { category?: string; status?: string }
): Promise<any[]> {
  try {
    const where: any = {};
    
    if (filters?.category) {
      where.category = filters.category;
    }
    
    if (filters?.status) {
      where.status = filters.status;
    }
    
    const tools = await prisma.toolDefinition.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    return tools;
  } catch (error) {
    console.error('[ToolRegistry] List failed:', error);
    return [];
  }
}

/**
 * Generate boilerplate code for a new tool
 */
export async function generateToolBoilerplate(
  toolName: string,
  purpose: string
): Promise<{ success: boolean; code?: string; path?: string; error?: string }> {
  try {
    // Validate tool name
    if (!/^[a-z0-9_-]+$/i.test(toolName)) {
      return {
        success: false,
        error: 'Invalid tool name format'
      };
    }
    
    // Generate boilerplate code
    const code = `/**
 * ${toolName}
 * 
 * Purpose: ${purpose}
 * Generated: ${new Date().toISOString()}
 */

export interface ${toPascalCase(toolName)}Options {
  // TODO: Define options
}

export interface ${toPascalCase(toolName)}Result {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * ${purpose}
 */
export async function ${toolName}(
  options: ${toPascalCase(toolName)}Options
): Promise<${toPascalCase(toolName)}Result> {
  try {
    // TODO: Implement functionality
    
    return {
      success: true,
      data: {}
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMsg
    };
  }
}
`;
    
    // Determine file path
    const filePath = `src/lib/tools/${toolName}.ts`;
    
    // Write file
    const writeResult = await writeSourceFile(filePath, code);
    
    if (!writeResult.success) {
      return {
        success: false,
        error: writeResult.error
      };
    }
    
    return {
      success: true,
      code,
      path: writeResult.path
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Record tool usage for statistics
 */
export async function recordToolUsage(
  toolName: string,
  success: boolean
): Promise<void> {
  try {
    const tool = await prisma.toolDefinition.findUnique({
      where: { name: toolName }
    });
    
    if (!tool) {
      return;
    }
    
    // Calculate new success rate
    const totalCalls = tool.usageCount + 1;
    const currentSuccesses = tool.successRate 
      ? Math.round((tool.successRate / 100) * tool.usageCount)
      : 0;
    const newSuccesses = currentSuccesses + (success ? 1 : 0);
    const newSuccessRate = (newSuccesses / totalCalls) * 100;
    
    // Update tool statistics
    await prisma.toolDefinition.update({
      where: { id: tool.id },
      data: {
        usageCount: totalCalls,
        successRate: newSuccessRate,
        lastUsed: new Date()
      }
    });
  } catch (error) {
    console.error('[ToolRegistry] Failed to record usage:', error);
  }
}

// ===========================
// Helper Functions
// ===========================

/**
 * Increment semantic version
 */
function incrementVersion(version: string): string {
  const parts = version.split('.');
  const patch = parseInt(parts[2] || '0') + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}

/**
 * Convert string to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}
