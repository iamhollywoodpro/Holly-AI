/**
 * HOLLY IMAGE GENERATOR
 * 
 * Generates images using AI models and manages generation jobs
 * 
 * Uses: GenerationJob, CreativeAsset (Prisma models)
 * 
 * ACTUAL PRISMA FIELDS (VERIFIED):
 * GenerationJob: id, userId, clerkUserId, type, status, priority, prompt, negativePrompt, model, parameters, templateId, progress, currentStep, totalSteps, estimatedTime, resultUrl, resultUrls, error, errorCode, queuePosition, startedAt, completedAt, cancelledAt, metadata, retryCount, maxRetries, createdAt, updatedAt
 */

import { prisma } from '@/lib/db';
import { saveAsset } from './asset-manager';

// ================== TYPE DEFINITIONS ==================

export interface ImageGenOptions {
  negativePrompt?: string;
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidance?: number;
  seed?: string;
  sampler?: string;
  style?: string;
  quality?: string;
}

export interface ImageModifications {
  prompt?: string;
  negativePrompt?: string;
  strength?: number;
  seed?: string;
}

export interface ImageFilters {
  category?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isFavorite?: boolean;
  limit?: number;
}

export interface JobStatus {
  id: string;
  status: string;
  progress: number;
  currentStep?: string;
  estimatedTime?: number;
  resultUrl?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ================== IMAGE GENERATOR ==================

/**
 * Generate image (creates generation job)
 */
export async function generateImage(
  userId: string,
  prompt: string,
  options: ImageGenOptions = {}
): Promise<{ success: boolean; jobId?: string; assetId?: string; error?: string }> {
  try {
    // Create generation job
    const job = await prisma.generationJob.create({
      data: {
        userId,
        clerkUserId: userId,
        type: 'image',
        status: 'pending',
        priority: 'normal',
        prompt,
        negativePrompt: options.negativePrompt || null,
        model: options.model || 'dall-e-3',
        parameters: {
          width: options.width || 1024,
          height: options.height || 1024,
          steps: options.steps || 30,
          guidance: options.guidance || 7.5,
          seed: options.seed || null,
          sampler: options.sampler || 'euler',
          style: options.style || 'natural',
          quality: options.quality || 'standard'
        },
        templateId: null,
        progress: 0,
        currentStep: 'queued',
        totalSteps: 3,
        estimatedTime: 30,
        resultUrl: null,
        resultUrls: [],
        error: null,
        errorCode: null,
        queuePosition: null,
        metadata: {},
        retryCount: 0,
        maxRetries: 3
      }
    });

    // For now, simulate instant generation (replace with actual API call later)
    // In production, this would be handled by a background worker
    const mockResultUrl = `https://placeholder.com/generated-${job.id}.png`;
    
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        progress: 100,
        resultUrl: mockResultUrl,
        completedAt: new Date()
      }
    });

    // Save as asset
    const assetResult = await saveAsset(userId, {
      type: 'image',
      category: 'ai-generated',
      title: `Generated: ${prompt.substring(0, 50)}`,
      prompt,
      negativePrompt: options.negativePrompt,
      model: options.model || 'dall-e-3',
      generationId: job.id,
      url: mockResultUrl,
      width: options.width || 1024,
      height: options.height || 1024,
      format: 'png',
      parameters: job.parameters as Record<string, any>,
      seed: options.seed,
      steps: options.steps,
      guidance: options.guidance,
      sampler: options.sampler,
      status: 'completed',
      provider: 'openai',
      cost: 0.04
    });

    return {
      success: true,
      jobId: job.id,
      assetId: assetResult.assetId
    };
  } catch (error) {
    console.error('Error generating image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get generation job status
 */
export async function getImageStatus(jobId: string): Promise<JobStatus | null> {
  try {
    const job = await prisma.generationJob.findUnique({
      where: { id: jobId }
    });

    if (!job) return null;

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep || undefined,
      estimatedTime: job.estimatedTime || undefined,
      resultUrl: job.resultUrl || undefined,
      error: job.error || undefined,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    };
  } catch (error) {
    console.error('Error getting image status:', error);
    return null;
  }
}

/**
 * Regenerate image with modifications
 */
export async function regenerateImage(
  assetId: string,
  modifications: ImageModifications
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    // Get original asset
    const { getAsset } = await import('./asset-manager');
    const originalAsset = await getAsset(assetId);

    if (!originalAsset) {
      return {
        success: false,
        error: 'Original asset not found'
      };
    }

    // Create new generation job with modifications
    const job = await prisma.generationJob.create({
      data: {
        userId: originalAsset.userId,
        clerkUserId: originalAsset.userId,
        type: 'image',
        status: 'pending',
        priority: 'normal',
        prompt: modifications.prompt || originalAsset.prompt,
        negativePrompt: modifications.negativePrompt || originalAsset.negativePrompt || null,
        model: originalAsset.model,
        parameters: {
          ...originalAsset.parameters,
          strength: modifications.strength || 0.8,
          seed: modifications.seed || originalAsset.parameters?.seed
        },
        templateId: null,
        progress: 0,
        currentStep: 'queued',
        totalSteps: 3,
        estimatedTime: 30,
        resultUrl: null,
        resultUrls: [],
        error: null,
        errorCode: null,
        metadata: {
          regeneratedFrom: assetId
        },
        retryCount: 0,
        maxRetries: 3
      }
    });

    return {
      success: true,
      jobId: job.id
    };
  } catch (error) {
    console.error('Error regenerating image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * List user images (wrapper around asset manager)
 */
export async function listUserImages(
  userId: string,
  filters?: ImageFilters
) {
  const { listAssets } = await import('./asset-manager');
  
  return listAssets(userId, {
    type: 'image',
    category: filters?.category,
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo,
    isFavorite: filters?.isFavorite,
    limit: filters?.limit
  });
}
