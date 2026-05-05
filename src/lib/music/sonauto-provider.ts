export interface SonautoGenerateParams {
  prompt: string;
  tags?: string[];
  num_songs?: number;
  lyrics?: string;
  instrumental?: boolean;
  seed?: number;
  duration?: number;
}

export interface SonautoGenerationResult {
  task_id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE';
}

export interface SonautoSongResult {
  song_paths: string[];
  lyrics?: string;
  seed: number;
  tags: string[];
  error_message?: string;
}

export class SonautoProvider {
  private apiKey: string;
  private baseUrl = 'https://api.sonauto.ai/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SONAUTO_API_KEY || '';
  }

  get isConfigured(): boolean {
    return this.apiKey.length > 0 && this.apiKey !== 'your_sonauto_api_key';
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async generate(params: SonautoGenerateParams): Promise<SonautoGenerationResult> {
    const payload: Record<string, unknown> = {
      prompt: params.prompt,
      num_songs: params.num_songs || 1,
    };
    if (params.tags && params.tags.length > 0) payload.tags = params.tags;
    if (params.lyrics) payload.lyrics = params.lyrics;
    if (params.instrumental) payload.instrumental = true;
    if (params.seed != null) payload.seed = params.seed;
    if (params.duration) payload.duration = params.duration;

    console.log(`[Sonauto] Starting generation: "${params.prompt.slice(0, 80)}..." tags=${params.tags?.join(',') || 'none'}`);

    const response = await fetch(`${this.baseUrl}/generations`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Sonauto generate failed (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const task_id = data.task_id;
    if (!task_id) throw new Error('Sonauto returned no task_id');

    console.log(`[Sonauto] Generation started — task_id: ${task_id}`);
    return { task_id, status: 'PENDING' };
  }

  async pollStatus(taskId: string): Promise<'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILURE'> {
    const response = await fetch(`${this.baseUrl}/generations/status/${taskId}`, {
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(`Sonauto status check failed (${response.status})`);
    }

    const status = (await response.text()).trim().replace(/"/g, '') as SonautoGenerationResult['status'];
    return status;
  }

  async waitForCompletion(taskId: string, maxWaitMs = 300_000, pollIntervalMs = 5_000): Promise<SonautoSongResult> {
    const start = Date.now();
    let lastStatus = 'PENDING';

    while (Date.now() - start < maxWaitMs) {
      const status = await this.pollStatus(taskId);

      if (status !== lastStatus) {
        console.log(`[Sonauto] Task ${taskId}: ${status}`);
        lastStatus = status;
      }

      if (status === 'SUCCESS') {
        return this.getResult(taskId);
      }

      if (status === 'FAILURE') {
        const result = await this.getResult(taskId).catch(() => null);
        const errorMsg = result?.error_message || 'Unknown error';
        throw new Error(`Sonauto generation failed: ${errorMsg}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Sonauto generation timed out after ${maxWaitMs / 1000}s`);
  }

  async getResult(taskId: string): Promise<SonautoSongResult> {
    const response = await fetch(`${this.baseUrl}/generations/${taskId}`, {
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(`Sonauto get result failed (${response.status})`);
    }

    return response.json();
  }

  async downloadAudio(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sonauto download failed (${response.status})`);

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async generateAndWait(params: SonautoGenerateParams, maxWaitMs = 300_000): Promise<{ result: SonautoSongResult; audioBuffers: Buffer[] }> {
    const { task_id } = await this.generate(params);
    const result = await this.waitForCompletion(task_id, maxWaitMs);

    const audioBuffers: Buffer[] = [];
    for (const path of result.song_paths) {
      const buf = await this.downloadAudio(path);
      audioBuffers.push(buf);
      console.log(`[Sonauto] Downloaded audio: ${buf.length} bytes from ${path.substring(0, 80)}...`);
    }

    return { result, audioBuffers };
  }
}

export const sonautoProvider = new SonautoProvider();
