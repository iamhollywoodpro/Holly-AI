# 🆓 HOLLY AI - Free Open Source API Integration Guide

## 🎯 Goal: Zero Token Limits, Zero Subscriptions

This guide shows how to integrate FREE, open-source APIs for all of HOLLY's features, eliminating dependency on paid services.

---

## 📊 Current vs. Free Alternatives

### AI/LLM Services

| Current | Free Alternative | Status |
|---------|------------------|--------|
| Google Gemini 2.5 Flash | ✅ Already FREE (generous tier) | Active |
| OpenAI GPT-4 | ❌ Paid | Replace with Ollama |
| Anthropic Claude | ❌ Paid | Replace with Ollama |
| Groq | ✅ FREE tier available | Active |

### Audio Services

| Current | Free Alternative | Status |
|---------|------------------|--------|
| Suno Music Generation | ⚠️ Limited free | Replace with MusicGen |
| Fish-Speech TTS | ✅ Open source | Active |
| Whisper STT | ✅ Open source | Active |
| Audio Analysis | ❌ Missing | Add essentia.js |

### Vision Services

| Current | Free Alternative | Status |
|---------|------------------|--------|
| Gemini Vision | ✅ FREE tier | Active |
| Image Generation | ⚠️ Limited | Add Stable Diffusion |

---

## 🚀 Recommended Free API Stack

### 1. LLM - Ollama (Local, Unlimited)

```typescript
// src/lib/ai/providers/ollama.ts

/**
 * Ollama - Run LLMs locally with NO limits
 * Models: Llama 3.2, Mistral, Gemma, Phi-3, CodeLlama
 */

import { hollyLogger } from '@/lib/logger';

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
}

export class OllamaProvider {
  private baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  private logger = hollyLogger.ai;

  async generate(
    prompt: string,
    model: string = 'llama3.2',
    options: {
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    } = {}
  ): Promise<string> {
    this.logger.debug('Ollama generate', { model });

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          num_predict: options.maxTokens || 2048,
        }
      })
    });

    const data: OllamaResponse = await response.json();
    return data.response;
  }

  async chat(
    messages: { role: string; content: string }[],
    model: string = 'llama3.2'
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      })
    });

    const data = await response.json();
    return data.message?.content || '';
  }

  async embed(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt: text })
    });

    const data = await response.json();
    return data.embedding;
  }

  // Available models (run `ollama pull <model>`)
  getModels() {
    return {
      chat: ['llama3.2', 'mistral', 'gemma2', 'phi3'],
      code: ['codellama', 'deepseek-coder', 'starCoder2'],
      embedding: ['nomic-embed-text', 'mxbai-embed-large'],
      vision: ['llava', 'bakllava'],
    };
  }
}

export const ollama = new OllamaProvider();
```

### 2. Speech-to-Text - Whisper (Open Source)

```typescript
// src/lib/speech/whisper.ts

/**
 * Whisper - Open source speech recognition
 * Runs locally via whisper.cpp or HuggingFace
 */

import { hollyLogger } from '@/lib/logger';

export class WhisperSTT {
  private logger = hollyLogger.ai;

  async transcribe(
    audioBuffer: Buffer,
    options: {
      language?: string;
      model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
    } = {}
  ): Promise<{ text: string; segments?: { start: number; end: number; text: string }[] }> {
    this.logger.info('Transcribing audio with Whisper');

    // Option 1: Use HuggingFace FREE Inference API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'audio/webm',
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      // Fallback to local whisper.cpp
      return this.transcribeLocal(audioBuffer);
    }

    return response.json();
  }

  private async transcribeLocal(audioBuffer: Buffer) {
    // Call local whisper.cpp server
    const response = await fetch('http://localhost:8080/inference', {
      method: 'POST',
      body: audioBuffer,
    });

    return response.json();
  }
}

export const whisperSTT = new WhisperSTT();
```

### 3. Text-to-Speech - Coqui TTS (Open Source)

```typescript
// src/lib/speech/coqui-tts.ts

/**
 * Coqui TTS - Open source text-to-speech
 * Multiple voices, styles, and languages
 */

import { hollyLogger } from '@/lib/logger';

export class CoquiTTS {
  private logger = hollyLogger.ai;

  async synthesize(
    text: string,
    options: {
      voice?: string;
      language?: string;
      speed?: number;
    } = {}
  ): Promise<Buffer> {
    this.logger.info('Synthesizing speech with Coqui TTS');

    // Use Coqui TTS API (free self-hosted)
    const response = await fetch('http://localhost:5002/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speaker_id: options.voice || 'default',
        style_wav: '',
        language_id: options.language || 'en',
      })
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Available voices
  getVoices() {
    return [
      { id: 'holly_default', name: 'Holly (Default)', gender: 'female' },
      { id: 'holly_professional', name: 'Holly (Professional)', gender: 'female' },
      { id: 'holly_friendly', name: 'Holly (Friendly)', gender: 'female' },
    ];
  }
}

export const coquiTTS = new CoquiTTS();
```

### 4. Music Generation - MusicGen (Open Source)

```typescript
// src/lib/music/musicgen.ts

/**
 * MusicGen - Meta's open source music generation
 * Generate music from text descriptions
 */

import { hollyLogger } from '@/lib/logger';

export class MusicGenGenerator {
  private logger = hollyLogger.ai;

  async generate(
    prompt: string,
    options: {
      duration?: number;
      model?: 'small' | 'medium' | 'large';
      temperature?: number;
    } = {}
  ): Promise<{ audioUrl: string; duration: number }> {
    this.logger.info('Generating music with MusicGen', { prompt });

    // Use HuggingFace FREE Inference API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/musicgen-large',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            duration: options.duration || 10,
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error('MusicGen generation failed');
    }

    // Returns audio buffer
    const audioBuffer = await response.arrayBuffer();
    
    // Save to storage and return URL
    // ... implementation depends on your storage

    return {
      audioUrl: 'generated-audio-url',
      duration: options.duration || 10,
    };
  }

  async generateWithMelody(
    prompt: string,
    melodyBuffer: Buffer,
    options: { duration?: number } = {}
  ): Promise<{ audioUrl: string; duration: number }> {
    // MusicGen can use a melody as conditioning
    this.logger.info('Generating music with melody conditioning');

    // Implementation for melody-conditioned generation
    return this.generate(prompt, options);
  }
}

export const musicGen = new MusicGenGenerator();
```

### 5. Audio Analysis - Essentia.js (Open Source)

```typescript
// src/lib/audio/essentia.ts

/**
 * Essentia.js - Open source audio analysis
 * BPM detection, key detection, mood classification
 */

import { hollyLogger } from '@/lib/logger';

export class EssentiaAnalyzer {
  private logger = hollyLogger.ai;

  async analyze(audioBuffer: Buffer): Promise<{
    bpm: number;
    key: string;
    mode: string;
    energy: number;
    danceability: number;
  }> {
    this.logger.info('Analyzing audio with Essentia');

    // Essentia.js runs in browser/Node via WebAssembly
    // This would integrate with the essentia.js library
    
    // For server-side, use Python Essentia via subprocess
    const result = await this.runPythonAnalysis(audioBuffer);
    
    return result;
  }

  private async runPythonAnalysis(audioBuffer: Buffer) {
    // Use Python Essentia for accurate analysis
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Save buffer to temp file
    const tempPath = `/tmp/audio-${Date.now()}.wav`;
    require('fs').writeFileSync(tempPath, audioBuffer);

    try {
      const { stdout } = await execAsync(
        `python3 analyze_audio.py "${tempPath}"`
      );

      return JSON.parse(stdout);
    } finally {
      // Cleanup temp file
      require('fs').unlinkSync(tempPath);
    }
  }
}

export const essentiaAnalyzer = new EssentiaAnalyzer();
```

### 6. Image Generation - Stable Diffusion (Open Source)

```typescript
// src/lib/image/stable-diffusion.ts

/**
 * Stable Diffusion - Open source image generation
 * Runs locally or via free APIs
 */

import { hollyLogger } from '@/lib/logger';

export class StableDiffusionGenerator {
  private logger = hollyLogger.ai;

  async generate(
    prompt: string,
    options: {
      negativePrompt?: string;
      width?: number;
      height?: number;
      steps?: number;
      seed?: number;
    } = {}
  ): Promise<{ imageUrl: string; seed: number }> {
    this.logger.info('Generating image with Stable Diffusion');

    // Option 1: Use HuggingFace FREE Inference API
    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: options.negativePrompt,
            width: options.width || 1024,
            height: options.height || 1024,
            num_inference_steps: options.steps || 30,
          }
        }),
      }
    );

    if (!response.ok) {
      // Fallback to local Stable Diffusion
      return this.generateLocal(prompt, options);
    }

    const imageBuffer = await response.arrayBuffer();
    
    // Save to storage and return URL
    // ... implementation depends on your storage

    return {
      imageUrl: 'generated-image-url',
      seed: options.seed || Math.floor(Math.random() * 999999999),
    };
  }

  private async generateLocal(prompt: string, options: any) {
    // Call local Automatic1111 or ComfyUI API
    const response = await fetch('http://localhost:7860/sdapi/v1/txt2img', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        negative_prompt: options.negativePrompt,
        width: options.width || 512,
        height: options.height || 512,
        steps: options.steps || 20,
      })
    });

    const data = await response.json();
    
    // data.images contains base64 encoded images
    return {
      imageUrl: `data:image/png;base64,${data.images[0]}`,
      seed: data.info?.seed || 0,
    };
  }

  async imageToImage(
    sourceImageUrl: string,
    prompt: string,
    options: { strength?: number } = {}
  ): Promise<{ imageUrl: string }> {
    this.logger.info('Running img2img with Stable Diffusion');

    // Implementation for image-to-image transformation
    // ...
    
    return { imageUrl: 'transformed-image-url' };
  }
}

export const stableDiffusion = new StableDiffusionGenerator();
```

### 7. Code Execution - Judge0 (Open Source)

```typescript
// src/lib/code/judge0.ts

/**
 * Judge0 - Open source code execution engine
 * Run code in 60+ languages safely
 */

import { hollyLogger } from '@/lib/logger';

export class Judge0Executor {
  private baseUrl = process.env.JUDGE0_URL || 'https://judge0-ce.p.rapidapi.com';
  private logger = hollyLogger.ai;

  async execute(
    code: string,
    language: string,
    options: {
      input?: string;
      timeout?: number;
    } = {}
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    time: number;
    memory: number;
  }> {
    this.logger.info('Executing code with Judge0', { language });

    const languageIds: Record<string, number> = {
      javascript: 63,
      typescript: 74,
      python: 71,
      java: 62,
      cpp: 54,
      c: 50,
      go: 60,
      rust: 73,
      ruby: 72,
      php: 68,
    };

    // Create submission
    const createResponse = await fetch(`${this.baseUrl}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageIds[language] || 63,
        stdin: options.input || '',
        cpu_time_limit: options.timeout || 5,
      })
    });

    const { token } = await createResponse.json();

    // Wait for result
    await new Promise(resolve => setTimeout(resolve, 1000));

    const resultResponse = await fetch(`${this.baseUrl}/submissions/${token}`);
    const result = await resultResponse.json();

    return {
      stdout: result.stdout || '',
      stderr: result.stderr || result.compile_output || '',
      exitCode: result.status?.id || 0,
      time: result.time || 0,
      memory: result.memory || 0,
    };
  }
}

export const judge0 = new Judge0Executor();
```

---

## 📋 Complete Integration Checklist

### Phase 1: Core AI (Week 1)
- [ ] Install Ollama locally
- [ ] Pull models: `ollama pull llama3.2`, `ollama pull codellama`
- [ ] Create OllamaProvider class
- [ ] Update AI orchestrator to use Ollama

### Phase 2: Speech (Week 2)
- [ ] Set up Whisper.cpp server
- [ ] Install Coqui TTS
- [ ] Create speech providers
- [ ] Update voice endpoints

### Phase 3: Music & Audio (Week 3)
- [ ] Set up MusicGen
- [ ] Install Essentia
- [ ] Create audio analysis pipeline
- [ ] Update music endpoints

### Phase 4: Vision & Images (Week 4)
- [ ] Set up Stable Diffusion (Automatic1111 or ComfyUI)
- [ ] Create image providers
- [ ] Update image generation endpoints

### Phase 5: Code Execution (Week 5)
- [ ] Set up Judge0
- [ ] Create code execution provider
- [ ] Update code tools

---

## 🆓 Total Cost: $0/month

With this stack, HOLLY runs entirely on:
- **Local compute** (your hardware)
- **Free API tiers** (HuggingFace, Gemini)
- **Open source models** (Ollama, Whisper, MusicGen, SD)

**No subscriptions. No token limits. No restrictions.**

---

## 🔧 Environment Variables

```env
# .env additions for free APIs

# Ollama (local)
OLLAMA_URL=http://localhost:11434

# HuggingFace (FREE tier)
HF_TOKEN=your_huggingface_token

# Judge0 (self-hosted or free tier)
JUDGE0_URL=http://localhost:2358

# Whisper.cpp (local)
WHISPER_URL=http://localhost:8080

# Coqui TTS (local)
COQUI_TTS_URL=http://localhost:5002

# Stable Diffusion (local)
SD_URL=http://localhost:7860
```

---

## 🚀 Quick Start Commands

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.2
ollama pull codellama
ollama pull llava  # Vision model

# Start Ollama server
ollama serve

# Install Whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp && make

# Install Coqui TTS
pip install TTS
tts-server --model_name tts_models/en/vctk/vits

# Install Stable Diffusion (Automatic1111)
# See: https://github.com/AUTOMATIC1111/stable-diffusion-webui

# Install Judge0
docker run -p 2358:2358 judge0/judge0:latest
```

---

**HOLLY becomes 100% FREE and UNLIMITED!** 🎉
