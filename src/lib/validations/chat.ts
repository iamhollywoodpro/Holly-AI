/**
 * HOLLY API Validation Schemas
 * Zod schemas for validating API inputs
 */

import { z } from 'zod';

// ============================================================================
// Chat Validation
// ============================================================================

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .max(10000, 'Message content too long (max 10,000 characters)'),
  fileAttachments: z.array(z.object({
    name: z.string(),
    url: z.string().url('Invalid file URL'),
    type: z.string(),
    vision: z.object({
      description: z.string(),
      summary: z.string(),
      keyElements: z.array(z.string()),
      model: z.string(),
    }).optional(),
    music: z.any().optional(),
  })).optional(),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema)
    .min(1, 'At least one message is required')
    .max(50, 'Too many messages in request (max 50)'),
  conversationId: z.string().optional(),
  userId: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ============================================================================
// Conversation Validation
// ============================================================================

export const CreateConversationSchema = z.object({
  title: z.string().max(200, 'Title too long').optional(),
  firstMessage: z.string().max(10000).optional(),
});

export const UpdateConversationSchema = z.object({
  title: z.string().max(200, 'Title too long').min(1, 'Title cannot be empty'),
});

export const CreateMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(50000, 'Content too long'),
  emotion: z.string().optional(),
});

export type CreateConversationRequest = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationRequest = z.infer<typeof UpdateConversationSchema>;
export type CreateMessageRequest = z.infer<typeof CreateMessageSchema>;

// ============================================================================
// Consciousness & Goals Validation
// ============================================================================

export const CreateGoalSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long'),
  description: z.string()
    .max(2000, 'Description too long')
    .optional(),
  category: z.string()
    .default('general'),
  priority: z.number()
    .int('Priority must be an integer')
    .min(1, 'Priority must be at least 1')
    .max(10, 'Priority cannot exceed 10')
    .default(5),
  targetDate: z.string()
    .datetime('Invalid date format')
    .optional()
    .nullable(),
});

export const UpdateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  priority: z.number().int().min(1).max(10).optional(),
  progress: z.number().min(0).max(1).optional(),
  targetDate: z.string().datetime().nullable().optional(),
});

export const RecordExperienceSchema = z.object({
  type: z.string().min(1, 'Experience type is required'),
  content: z.record(z.string(), z.any()),
  significance: z.number()
    .min(0, 'Significance must be at least 0')
    .max(1, 'Significance cannot exceed 1')
    .default(0.5),
  emotionalImpact: z.number()
    .min(-1)
    .max(1)
    .optional(),
  primaryEmotion: z.string().optional(),
  secondaryEmotions: z.array(z.string()).optional(),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalSchema>;
export type UpdateGoalRequest = z.infer<typeof UpdateGoalSchema>;
export type RecordExperienceRequest = z.infer<typeof RecordExperienceSchema>;

// ============================================================================
// Project Validation
// ============================================================================

export const CreateProjectSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .max(100, 'Project name too long'),
  description: z.string()
    .max(5000, 'Description too long')
    .optional(),
  category: z.string().max(50).optional(),
  technologies: z.array(z.string()).default([]),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .default('#a855f7'),
  targetEndDate: z.string().datetime().optional(),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().max(50).optional(),
  technologies: z.array(z.string()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.enum(['active', 'completed', 'archived']).optional(),
  progress: z.number().min(0).max(1).optional(),
  targetEndDate: z.string().datetime().optional(),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectRequest = z.infer<typeof UpdateProjectSchema>;

// ============================================================================
// GitHub Validation
// ============================================================================

export const GitHubCommitSchema = z.object({
  files: z.array(z.object({
    path: z.string().min(1, 'File path is required'),
    content: z.string(),
  })).min(1, 'At least one file is required'),
  message: z.string()
    .min(1, 'Commit message is required')
    .max(500, 'Commit message too long'),
  branch: z.string()
    .max(100)
    .default('main'),
});

export const CreateIssueSchema = z.object({
  title: z.string()
    .min(1, 'Issue title is required')
    .max(256, 'Issue title too long'),
  body: z.string().max(65536).optional(),
  labels: z.array(z.string()).optional(),
});

export const CreatePRSchema = z.object({
  title: z.string()
    .min(1, 'PR title is required')
    .max(256, 'PR title too long'),
  description: z.string().max(65536).optional(),
  sourceBranch: z.string().min(1, 'Source branch is required'),
  targetBranch: z.string().default('main'),
});

export type GitHubCommitRequest = z.infer<typeof GitHubCommitSchema>;
export type CreateIssueRequest = z.infer<typeof CreateIssueSchema>;
export type CreatePRRequest = z.infer<typeof CreatePRSchema>;

// ============================================================================
// File Upload Validation
// ============================================================================

const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a',
  'video/mp4', 'video/webm',
  'application/pdf',
  'text/plain', 'text/markdown',
  'application/json',
] as const;

export const FileUploadSchema = z.object({
  fileName: z.string().max(255),
  fileSize: z.number()
    .max(50 * 1024 * 1024, 'File size cannot exceed 50MB'),
  fileType: z.string().refine(
    (type) => ALLOWED_FILE_TYPES.includes(type as any),
    { message: 'Unsupported file type' }
  ),
});

export type FileUploadRequest = z.infer<typeof FileUploadSchema>;

// ============================================================================
// Music Validation
// ============================================================================

export const MusicGenerateSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(2000, 'Prompt too long'),
  lyrics: z.string().max(10000).optional(),
  style: z.string().max(100).optional(),
  duration: z.number().min(10).max(300).optional(),
  modelPreference: z.enum(['suno', 'musicgen', 'riffusion', 'audiocraft']).optional(),
});

export const MusicAnalyzeSchema = z.object({
  trackId: z.string().min(1, 'Track ID is required'),
  analyzeFeatures: z.boolean().default(true),
  analyzeHitPotential: z.boolean().default(true),
  analyzeGenre: z.boolean().default(true),
});

export type MusicGenerateRequest = z.infer<typeof MusicGenerateSchema>;
export type MusicAnalyzeRequest = z.infer<typeof MusicAnalyzeSchema>;

// ============================================================================
// Image Generation Validation
// ============================================================================

export const ImageGenerateSchema = z.object({
  prompt: z.string()
    .min(1, 'Prompt is required')
    .max(2000, 'Prompt too long'),
  style: z.string().max(100).optional(),
  width: z.number().int().min(256).max(2048).default(1024),
  height: z.number().int().min(256).max(2048).default(1024),
  modelPreference: z.enum([
    'flux-schnell', 'flux-dev', 'sdxl', 'animagine', 'realistic', 'proteus'
  ]).optional(),
  negativePrompt: z.string().max(1000).optional(),
});

export type ImageGenerateRequest = z.infer<typeof ImageGenerateSchema>;

// ============================================================================
// Settings Validation
// ============================================================================

export const UserSettingsSchema = z.object({
  primaryMode: z.enum(['general', 'music', 'dev', 'all-access']).default('general'),
  musicRoles: z.array(z.string()).default([]),
  musicGenres: z.array(z.string()).default([]),
  devRoles: z.array(z.string()).default([]),
  devLanguages: z.array(z.string()).default([]),
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    desktop: z.boolean().default(false),
  }).default({ email: true, push: true, desktop: false }),
});

export type UserSettingsRequest = z.infer<typeof UserSettingsSchema>;

// ============================================================================
// Validation Helper
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '../api/responses';

/**
 * Validate request body against a Zod schema
 * Returns parsed data or error response
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await req.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      // Format Zod errors nicely
      const errors = result.error.flatten();
      return {
        error: apiError.badRequest(
          'Validation failed',
          errors.fieldErrors
        )
      };
    }

    return { data: result.data };
  } catch (e) {
    return {
      error: apiError.badRequest('Invalid JSON body')
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T } | { error: NextResponse } {
  // Convert searchParams to object
  const params: Record<string, string | string[]> = {};
  searchParams.forEach((value, key) => {
    const existing = params[key];
    if (existing) {
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    } else {
      params[key] = value;
    }
  });

  const result = schema.safeParse(params);

  if (!result.success) {
    return {
      error: apiError.badRequest(
        'Invalid query parameters',
        result.error.flatten().fieldErrors
      )
    };
  }

  return { data: result.data };
}
