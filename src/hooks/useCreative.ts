// React Hooks for Creative API
'use client';

import { useState, useEffect, useCallback } from 'react';
import * as creativeApi from '@/lib/api/creative';

// Hook for generating images
export function useImageGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const generate = useCallback(async (data: {
    prompt: string;
    model?: string;
    width?: number;
    height?: number;
    numImages?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await creativeApi.generateImage(data);
      setResult(res);
      return res;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error, result };
}

// Hook for fetching assets
export function useAssets() {
  const [assets, setAssets] = useState<creativeApi.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async (filters?: {
    type?: string;
    tags?: string[];
  }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await creativeApi.getAssets(filters);
      setAssets(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAsset = useCallback(async (assetId: string) => {
    try {
      await creativeApi.deleteAsset(assetId);
      setAssets(prev => prev.filter(a => a.id !== assetId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return { assets, loading, error, fetchAssets, deleteAsset };
}

// Hook for templates
export function useTemplates() {
  const [templates, setTemplates] = useState<creativeApi.Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async (type?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await creativeApi.getTemplates(type);
      setTemplates(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, fetchTemplates };
}
