import axios, { AxiosInstance, AxiosError } from 'axios';
import { useSettingsStore } from '../store/settingsStore';

const DEFAULT_BASE_URL = 'https://holly.nexamusicgroup.com';

function createApiClient(): AxiosInstance {
  const { serverUrl, apiKey } = useSettingsStore.getState();
  const base = (serverUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');

  const client = axios.create({
    baseURL: base,
    timeout: 60000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  client.interceptors.request.use((config) => {
    const { apiKey: key } = useSettingsStore.getState();
    if (key) {
      config.headers.Authorization = `Bearer ${key}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        console.warn('HOLLY API: Unauthorized — check your API key');
      }
      return Promise.reject(error);
    },
  );

  return client;
}

let _client: AxiosInstance | null = null;

export function getApiClient(): AxiosInstance {
  if (!_client) {
    _client = createApiClient();
  }
  return _client;
}

export function resetApiClient(): void {
  _client = null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  id: string;
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function sendChatMessage(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; stream?: boolean },
): Promise<ChatResponse> {
  const client = getApiClient();
  const body: ChatRequest = {
    messages,
    model: options?.model || 'holly-v1',
    temperature: options?.temperature ?? 0.7,
    stream: false,
    ...options,
  };
  const { data } = await client.post<ChatResponse>('/api/chat', body);
  return data;
}

export async function streamChatMessage(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  options?: { model?: string; temperature?: number },
): Promise<string> {
  const { serverUrl, apiKey } = useSettingsStore.getState();
  const base = (serverUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');

    const response = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      messages,
      model: options?.model || 'holly-v1',
      temperature: options?.temperature ?? 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat stream failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') break;
        try {
          const parsed = JSON.parse(payload);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullText += content;
            onChunk(fullText);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  return fullText;
}

export interface MusicGenerateRequest {
  prompt: string;
  genre?: string;
  mood?: string;
  duration?: number;
  instrumental?: boolean;
}

export interface MusicGenerateResponse {
  id: string;
  audio_url: string;
  status: 'processing' | 'completed' | 'failed';
  lyrics?: string;
  cover_url?: string;
}

export async function generateSong(
  request: MusicGenerateRequest,
): Promise<MusicGenerateResponse> {
  const client = getApiClient();
  const { data } = await client.post<MusicGenerateResponse>(
    '/api/music/generate',
    request,
  );
  return data;
}

export async function generateLyrics(
  prompt: string,
  style?: string,
): Promise<{ lyrics: string }> {
  const client = getApiClient();
  const { data } = await client.post<{ lyrics: string }>(
    '/api/music/generate-lyrics',
    { prompt, style },
  );
  return data;
}

export async function generateCover(
  prompt: string,
): Promise<{ cover_url: string }> {
  const client = getApiClient();
  const { data } = await client.post<{ cover_url: string }>(
    '/api/music/generate-cover',
    { prompt },
  );
  return data;
}

export async function getMusicHistory(): Promise<MusicGenerateResponse[]> {
  const client = getApiClient();
  const { data } = await client.get<MusicGenerateResponse[]>('/api/music/history');
  return data;
}

export interface AuraAnalysisRequest {
  track_url?: string;
  track_data?: string;
  title?: string;
  artist?: string;
}

export interface AuraScore {
  category: string;
  score: number;
  max: number;
  feedback: string;
}

export interface AuraAnalysisResponse {
  id: string;
  overall_score: number;
  scores: AuraScore[];
  summary: string;
  recommendations: string[];
  market_potential: number;
}

export async function submitAuraAnalysis(
  request: AuraAnalysisRequest,
): Promise<AuraAnalysisResponse> {
  const client = getApiClient();
  const { data } = await client.post<AuraAnalysisResponse>(
    '/api/aura/analyze',
    request,
  );
  return data;
}

export async function getAuraResults(
  id: string,
): Promise<AuraAnalysisResponse> {
  const client = getApiClient();
  const { data } = await client.get<AuraAnalysisResponse>(
    `/api/aura/results/${id}`,
  );
  return data;
}

export async function getAuraHistory(): Promise<AuraAnalysisResponse[]> {
  const client = getApiClient();
  const { data } = await client.get<AuraAnalysisResponse[]>('/api/aura/history');
  return data;
}

export interface ImageGenerateResponse {
  success: boolean;
  imageUrl: string;
  url: string;
  provider: string;
}

export async function generateImage(
  prompt: string,
  aspectRatio: string = '1:1',
): Promise<ImageGenerateResponse> {
  const client = getApiClient();
  const { data } = await client.post<ImageGenerateResponse>(
    '/api/image/generate-ultimate',
    { prompt, aspectRatio },
  );
  return data;
}

export async function checkHealth(): Promise<{ status: string }> {
  const client = getApiClient();
  const { data } = await client.get<{ status: string }>('/api/health');
  return data;
}
