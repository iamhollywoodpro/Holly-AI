'use client';

export interface VADConfig {
  silenceThreshold: number;
  silenceDurationMs: number;
  minSpeechDurationMs: number;
  sampleRate: number;
}

export interface VADState {
  isSpeaking: boolean;
  volume: number;
  speechStarted: boolean;
}

type VADCallback = (state: VADState) => void;

const DEFAULT_CONFIG: VADConfig = {
  silenceThreshold: 0.015,
  silenceDurationMs: 1500,
  minSpeechDurationMs: 300,
  sampleRate: 16000,
};

export class VoiceActivityDetector {
  private config: VADConfig;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private animFrameId: number | null = null;
  private listeners: Set<VADCallback> = new Set();

  private isSpeaking = false;
  private speechStartTime = 0;
  private lastSoundTime = 0;
  private volume = 0;
  private stopped = false;

  constructor(config?: Partial<VADConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async start(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.stopped = false;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext({ sampleRate: this.config.sampleRate });
      this.source = this.audioContext.createMediaStreamSource(this.stream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      this.source.connect(this.analyser);

      this.loop();
      return true;
    } catch (err) {
      console.error('[VAD] Failed to start:', err);
      return false;
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.animFrameId != null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.analyser = null;
    this.isSpeaking = false;
    this.volume = 0;
    this.notifyAll();
  }

  getState(): VADState {
    return {
      isSpeaking: this.isSpeaking,
      volume: this.volume,
      speechStarted: this.speechStartTime > 0,
    };
  }

  onStateChange(cb: VADCallback): () => void {
    this.listeners.add(cb);
    return () => { this.listeners.delete(cb); };
  }

  getFrequencyData(): Uint8Array {
    const data = new Uint8Array(this.analyser?.frequencyBinCount ?? 0);
    this.analyser?.getByteFrequencyData(data);
    return data;
  }

  getTimeDomainData(): Uint8Array {
    const data = new Uint8Array(this.analyser?.fftSize ?? 0);
    this.analyser?.getByteTimeDomainData(data);
    return data;
  }

  private loop = (): void => {
    if (this.stopped || !this.analyser) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const data = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);
    this.volume = rms;

    const now = performance.now();

    if (rms > this.config.silenceThreshold) {
      this.lastSoundTime = now;

      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.speechStartTime = now;
        this.notifyAll();
      }
    } else if (this.isSpeaking) {
      const speechDuration = this.lastSoundTime - this.speechStartTime;
      const silenceDuration = now - this.lastSoundTime;

      if (silenceDuration > this.config.silenceDurationMs && speechDuration > this.config.minSpeechDurationMs) {
        this.isSpeaking = false;
        this.speechStartTime = 0;
        this.notifyAll();
      }
    }

    this.notifyAll();
  };

  private notifyAll(): void {
    const state = this.getState();
    for (const cb of this.listeners) {
      cb(state);
    }
  }
}
