/**
 * HOLLY TEMPLATE MANAGER
 * 
 * Manages creative templates for reusable generation
 * 
 * Uses: CreativeTemplate (Prisma model)
 * 
 * ACTUAL PRISMA FIELDS (VERIFIED):
 * - id, userId, clerkUserId, name, description, type, category
 * - prompt, negativePrompt, model, parameters (Json)
 * - thumbnailUrl, isPublic, isDefault, tags (String[]), usageCount
 * - createdAt, updatedAt
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface TemplateInput {
  name: string;
  description?: string;
  type: string;
  category: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  parameters: Record<string, any>;
  thumbnailUrl?: string;
  isPublic?: boolean;
  tags?: string[];
}

export interface TemplateData {
  id: string;
  userId?: string;
  name: string;
  description?: string;
  type: string;
  category: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  parameters: Record<string, any>;
  thumbnailUrl?: string;
  isPublic: boolean;
  isDefault: boolean;
  tags: string[];
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateFilters {
  type?: string;
  category?: string;
  isPublic?: boolean;
  isDefault?: boolean;
  tags?: string[];
  limit?: number;
}

// ================== TEMPLATE MANAGER ==================

/**
 * Create new template
 */
export async function createTemplate(
  userId: string,
  template: TemplateInput
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const created = await prisma.creativeTemplate.create({
      data: {
        userId,
        clerkUserId: userId,
        name: template.name,
        description: template.description || null,
        type: template.type,
        category: template.category,
        prompt: template.prompt,
        negativePrompt: template.negativePrompt || null,
        model: template.model,
        parameters: template.parameters,
        thumbnailUrl: template.thumbnailUrl || null,
        isPublic: template.isPublic || false,
        isDefault: false,
        tags: template.tags || [],
        usageCount: 0
      }
    });

    return {
      success: true,
      templateId: created.id
    };
  } catch (error) {
    console.error('Error creating template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get template by ID
 */
export async function getTemplate(templateId: string): Promise<TemplateData | null> {
  try {
    const template = await prisma.creativeTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) return null;

    return {
      id: template.id,
      userId: template.userId || undefined,
      name: template.name,
      description: template.description || undefined,
      type: template.type,
      category: template.category,
      prompt: template.prompt,
      negativePrompt: template.negativePrompt || undefined,
      model: template.model,
      parameters: template.parameters as Record<string, any>,
      thumbnailUrl: template.thumbnailUrl || undefined,
      isPublic: template.isPublic,
      isDefault: template.isDefault,
      tags: template.tags,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  } catch (error) {
    console.error('Error getting template:', error);
    return null;
  }
}

/**
 * List templates with filters
 */
export async function listTemplates(filters?: TemplateFilters): Promise<TemplateData[]> {
  try {
    const where: any = {};

    if (filters?.type) where.type = filters.type;
    if (filters?.category) where.category = filters.category;
    if (filters?.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters?.isDefault !== undefined) where.isDefault = filters.isDefault;
    
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const templates = await prisma.creativeTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: filters?.limit || 50
    });

    return templates.map(template => ({
      id: template.id,
      userId: template.userId || undefined,
      name: template.name,
      description: template.description || undefined,
      type: template.type,
      category: template.category,
      prompt: template.prompt,
      negativePrompt: template.negativePrompt || undefined,
      model: template.model,
      parameters: template.parameters as Record<string, any>,
      thumbnailUrl: template.thumbnailUrl || undefined,
      isPublic: template.isPublic,
      isDefault: template.isDefault,
      tags: template.tags,
      usageCount: template.usageCount,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    }));
  } catch (error) {
    console.error('Error listing templates:', error);
    return [];
  }
}

/**
 * Update template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<TemplateInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.creativeTemplate.update({
      where: { id: templateId },
      data: updates
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete template
 */
export async function deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.creativeTemplate.delete({
      where: { id: templateId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Use template (increment usage count)
 */
export async function useTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.creativeTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: { increment: 1 }
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error using template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
