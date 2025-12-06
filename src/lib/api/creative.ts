/**
 * Creative API Service
 */

import { apiClient } from './client';

// Types
export interface Asset {
  id: string;
  name: string;
  type: string;
  url: string;
  category?: string;
  isFavorite: boolean;
  tags: string[];
  createdAt: string;
}

export interface Template {
  id: string;
  name: string;
  type: string;
  description?: string;
  category?: string;
  isPublic: boolean;
  createdAt: string;
}

export interface GenerationJob {
  id: string;
  type: string;
  status: string;
  progress: number;
  resultUrl?: string;
  createdAt: string;
}

// Image Generation
export const generateImage = async (data: {
  prompt: string;
  model?: string;
  parameters?: Record<string, any>;
}) => {
  return apiClient.post<{ success: boolean; jobId: string }>('creative/image/generate', data);
};

export const getImageStatus = async (jobId: string) => {
  return apiClient.get<GenerationJob>(`creative/image/${jobId}/status`);
};

export const listImages = async (params?: { status?: string; limit?: number }) => {
  return apiClient.get<GenerationJob[]>('creative/images', params);
};

// Content Generation
export const generateContent = async (data: {
  type: string;
  topic: string;
  parameters?: Record<string, any>;
}) => {
  return apiClient.post<{ success: boolean; content: string }>('creative/content/generate', data);
};

// Assets
export const listAssets = async (params?: {
  type?: string;
  category?: string;
  isFavorite?: boolean;
  limit?: number;
}) => {
  return apiClient.get<Asset[]>('creative/assets', params);
};

export const getAsset = async (id: string) => {
  return apiClient.get<Asset>(`creative/asset/${id}`);
};

export const toggleAssetFavorite = async (id: string) => {
  return apiClient.post<{ success: boolean; isFavorite: boolean }>(
    `creative/asset/${id}/favorite`
  );
};

// Templates
export const listTemplates = async (params?: {
  type?: string;
  category?: string;
  limit?: number;
}) => {
  return apiClient.get<Template[]>('creative/templates', params);
};

export const useTemplate = async (id: string) => {
  return apiClient.post<{ success: boolean }>(`creative/template/${id}/use`);
};
