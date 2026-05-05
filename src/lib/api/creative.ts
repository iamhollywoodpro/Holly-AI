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
  createdAt: Date; // FIXED: Changed to Date
}

export interface Template {
  id: string;
  name: string;
  type: string;
  description?: string;
  category?: string;
  isPublic: boolean;
  createdAt: Date; // FIXED: Changed to Date
}

export interface GenerationJob {
  id: string;
  type: string;
  status: string;
  progress: number;
  resultUrl?: string;
  createdAt: Date; // FIXED: Changed to Date
}

// Image Generation
export const generateImage = async (data: {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  numImages?: number;
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
  tone?: string;
  parameters?: Record<string, any>;
}) => {
  return apiClient.post<{ success: boolean; content: string }>('creative/content/generate', data);
};

// Assets - FIXED: Added missing exports
export const getAssets = async (filters?: {
  type?: string;
  tags?: string[];
  category?: string;
  isFavorite?: boolean;
  limit?: number;
}) => {
  return apiClient.get<Asset[]>('creative/assets', filters);
};

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

// FIXED: Added missing deleteAsset export
export const deleteAsset = async (id: string) => {
  return apiClient.delete(`creative/asset/${id}`);
};

export const toggleAssetFavorite = async (id: string) => {
  return apiClient.post<{ success: boolean; isFavorite: boolean }>(
    `creative/asset/${id}/favorite`
  );
};

// Templates - FIXED: Added missing getTemplates export
export const getTemplates = async (type?: string) => {
  return apiClient.get<Template[]>('creative/templates', type ? { type } : undefined);
};

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
