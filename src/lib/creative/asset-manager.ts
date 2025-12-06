/**
 * HOLLY ASSET MANAGER
 * 
 * Manages generated creative assets (images, videos, audio)
 * 
 * Uses: CreativeAsset (Prisma model)
 * 
 * ACTUAL PRISMA FIELDS (VERIFIED):
 * - id, userId, clerkUserId, type, category, title, description
 * - prompt, negativePrompt, model, generationId
 * - url, thumbnailUrl, fileSize, duration, width, height, format
 * - parameters (Json), seed, steps, guidance, sampler
 * - status, isPublic, isFavorite, tags (String[]), metadata (Json)
 * - provider, cost, createdAt, updatedAt
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface AssetInput {
  type: string;
  category: string;
  title?: string;
  description?: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  generationId?: string;
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  parameters?: Record<string, any>;
  seed?: string;
  steps?: number;
  guidance?: number;
  sampler?: string;
  status?: string;
  isPublic?: boolean;
  tags?: string[];
  provider?: string;
  cost?: number;
}

export interface AssetData {
  id: string;
  userId: string;
  type: string;
  category: string;
  title?: string;
  description?: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  parameters?: Record<string, any>;
  status: string;
  isPublic: boolean;
  isFavorite: boolean;
  tags: string[];
  provider?: string;
  cost?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetFilters {
  type?: string;
  category?: string;
  status?: string;
  isFavorite?: boolean;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface AssetUpdates {
  title?: string;
  description?: string;
  category?: string;
  isPublic?: boolean;
  tags?: string[];
}

// ================== ASSET MANAGER ==================

/**
 * Save new asset
 */
export async function saveAsset(
  userId: string,
  asset: AssetInput
): Promise<{ success: boolean; assetId?: string; error?: string }> {
  try {
    const created = await prisma.creativeAsset.create({
      data: {
        userId,
        clerkUserId: userId,
        type: asset.type,
        category: asset.category,
        title: asset.title || null,
        description: asset.description || null,
        prompt: asset.prompt,
        negativePrompt: asset.negativePrompt || null,
        model: asset.model,
        generationId: asset.generationId || null,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl || null,
        fileSize: asset.fileSize || null,
        duration: asset.duration || null,
        width: asset.width || null,
        height: asset.height || null,
        format: asset.format || null,
        parameters: asset.parameters || null,
        seed: asset.seed || null,
        steps: asset.steps || null,
        guidance: asset.guidance || null,
        sampler: asset.sampler || null,
        status: asset.status || 'completed',
        isPublic: asset.isPublic || false,
        isFavorite: false,
        tags: asset.tags || [],
        metadata: null,
        provider: asset.provider || null,
        cost: asset.cost || null
      }
    });

    return {
      success: true,
      assetId: created.id
    };
  } catch (error) {
    console.error('Error saving asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get asset by ID
 */
export async function getAsset(assetId: string): Promise<AssetData | null> {
  try {
    const asset = await prisma.creativeAsset.findUnique({
      where: { id: assetId }
    });

    if (!asset) return null;

    return {
      id: asset.id,
      userId: asset.userId,
      type: asset.type,
      category: asset.category,
      title: asset.title || undefined,
      description: asset.description || undefined,
      prompt: asset.prompt,
      negativePrompt: asset.negativePrompt || undefined,
      model: asset.model,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl || undefined,
      fileSize: asset.fileSize || undefined,
      duration: asset.duration || undefined,
      width: asset.width || undefined,
      height: asset.height || undefined,
      format: asset.format || undefined,
      parameters: asset.parameters ? (asset.parameters as Record<string, any>) : undefined,
      status: asset.status,
      isPublic: asset.isPublic,
      isFavorite: asset.isFavorite,
      tags: asset.tags,
      provider: asset.provider || undefined,
      cost: asset.cost || undefined,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    };
  } catch (error) {
    console.error('Error getting asset:', error);
    return null;
  }
}

/**
 * List user assets with filters
 */
export async function listAssets(
  userId: string,
  filters?: AssetFilters
): Promise<AssetData[]> {
  try {
    const where: any = { userId };

    if (filters?.type) where.type = filters.type;
    if (filters?.category) where.category = filters.category;
    if (filters?.status) where.status = filters.status;
    if (filters?.isFavorite !== undefined) where.isFavorite = filters.isFavorite;
    
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const assets = await prisma.creativeAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50
    });

    return assets.map(asset => ({
      id: asset.id,
      userId: asset.userId,
      type: asset.type,
      category: asset.category,
      title: asset.title || undefined,
      description: asset.description || undefined,
      prompt: asset.prompt,
      negativePrompt: asset.negativePrompt || undefined,
      model: asset.model,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl || undefined,
      fileSize: asset.fileSize || undefined,
      duration: asset.duration || undefined,
      width: asset.width || undefined,
      height: asset.height || undefined,
      format: asset.format || undefined,
      parameters: asset.parameters ? (asset.parameters as Record<string, any>) : undefined,
      status: asset.status,
      isPublic: asset.isPublic,
      isFavorite: asset.isFavorite,
      tags: asset.tags,
      provider: asset.provider || undefined,
      cost: asset.cost || undefined,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt
    }));
  } catch (error) {
    console.error('Error listing assets:', error);
    return [];
  }
}

/**
 * Update asset
 */
export async function updateAsset(
  assetId: string,
  updates: AssetUpdates
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.creativeAsset.update({
      where: { id: assetId },
      data: updates
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete asset
 */
export async function deleteAsset(assetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.creativeAsset.delete({
      where: { id: assetId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Toggle favorite status
 */
export async function toggleFavorite(assetId: string): Promise<{ success: boolean; isFavorite?: boolean; error?: string }> {
  try {
    const asset = await prisma.creativeAsset.findUnique({
      where: { id: assetId }
    });

    if (!asset) {
      return {
        success: false,
        error: 'Asset not found'
      };
    }

    const updated = await prisma.creativeAsset.update({
      where: { id: assetId },
      data: {
        isFavorite: !asset.isFavorite
      }
    });

    return {
      success: true,
      isFavorite: updated.isFavorite
    };
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Add tags to asset
 */
export async function addTags(assetId: string, tags: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    const asset = await prisma.creativeAsset.findUnique({
      where: { id: assetId }
    });

    if (!asset) {
      return {
        success: false,
        error: 'Asset not found'
      };
    }

    // Merge existing tags with new tags (remove duplicates)
    const allTags = [...new Set([...asset.tags, ...tags])];

    await prisma.creativeAsset.update({
      where: { id: assetId },
      data: {
        tags: allTags
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error adding tags:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
