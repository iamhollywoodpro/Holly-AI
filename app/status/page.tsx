'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Server, Database, Key, Cpu, Activity, CheckCircle, AlertTriangle, XCircle, Zap, Globe, Music, Image, Video } from 'lucide-react';

interface HealthData {
  status: string;
  health: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  summary: {
    activeAiProviders: number;
    configuredIntegrations: number;
    configuredPlatforms: string[];
  };
  providers: Record<string, boolean>;
  integrations: Record<string, boolean>;
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    memoryUsageMB: number;
  };
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const [showAiProviders, setShowAiProviders] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  async function checkHealth() {
    setLoading(true);
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setLastCheck(new Date());
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'healthy': return { color: 'text-[#D4A853]', bg: 'bg-[#D4A853]/10', border: 'border-[#D4A853]/30', icon: <CheckCircle className="w-5 h-5" />, label: 'Nominal Operational' };
      case 'degraded': return { color: 'text-[#B84052]', bg: 'bg-[#B84052]/10', border: 'border-[#B84052]/30', icon: <AlertTriangle className="w-5 h-5" />, label: 'Degraded Cognition' };
      case 'critical': return { color: 'text-[#B84052]', bg: 'bg-[#B84052]/10', border: 'border-[#B84052]/30', icon: <XCircle className="w-5 h-5" />, label: 'Critical Protocol Failure' };
      default: return { color: 'text-[#8C8476]', bg: 'bg-[#1A1815]/10', border: 'border-[#1A1815]/30', icon: <Activity className="w-5 h-5" />, label: 'Unknown' };
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const providerLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    groq: { label: 'Groq (Llama 3.3 70B)', icon: <Zap className="w-4 h-4" /> },
    openrouter: { label: 'OpenRouter', icon: <Globe className="w-4 h-4" /> },
    nvidia: { label: 'NVIDIA NIM', icon: <Cpu className="w-4 h-4" /> },
    cloudflare: { label: 'Cloudflare Workers AI', icon: <Globe className="w-4 h-4" /> },
    ollama: { label: 'Ollama (Local)', icon: <Server className="w-4 h-4" /> },
    openai: { label: 'OpenAI', icon: <Zap className="w-4 h-4" /> },
  };

  const integrationLabels: Record<string, { label: string; icon: React.ReactNode; category: string }> = {
    database: { label: 'PostgreSQL (NeonDB)', icon: <Database className="w-4 h-4" />, category: 'core' },
    clerk: { label: 'Clerk Auth', icon: <Key className="w-4 h-4" />, category: 'core' },
    suno: { label: 'Suno Music API', icon: <Music className="w-4 h-4" />, category: 'media' },
    acestep: { label: 'ACE-Step Music', icon: <Music className="w-4 h-4" />, category: 'media' },
    kokoro_tts: { label: 'Kokoro TTS', icon: <Music className="w-4 h-4" />, category: 'media' },
    voxcpm2_tts: { label: 'VoxCPM2 TTS', icon: <Music className="w-4 h-4" />, category: 'media' },
    fal_ai: { label: 'Fal.ai', icon: <Image className="w-4 h-4" />, category: 'media' },
    replicate: { label: 'Replicate', icon: <Video className="w-4 h-4" />, category: 'media' },
    blob_storage: { label: 'Vercel Blob', icon: <Database className="w-4 h-4" />, category: 'storage' },
    github: { label: 'GitHub', icon: <Globe className="w-4 h-4" />, category: 'integrations' },
    spotify: { label: 'Spotify', icon: <Music className="w-4 h-4" />, category: 'integrations' },
    soundcloud: { label: 'SoundCloud', icon: <Music className="w-4 h-4" />, category: 'integrations' },
    youtube: { label: 'YouTube', icon: <Video className="w-4 h-4" />, category: 'integrations' },
    notion: { label: 'Notion', icon: <Globe className="w-4 h-4" />, category: 'integrations' },
    slack: { label: 'Slack', icon: <Globe className="w-4 h-4" />, category: 'integrations' },
    canva: { label: 'Canva', icon: <Image className="w-4 h-4" />, category: 'integrations' },
    google_drive: { label: 'Google Drive', icon: <Database className="w-4 h-4" />, category: 'integrations' },
    dropbox: { label: 'Dropbox', icon: <Database className="w-4 h-4" />, category: 'integrations' },
    instagram: { label: 'Instagram', icon: <Image className="w-4 h-4" />, category: 'integrations' },
    tiktok: { label: 'TikTok', icon: <Video className="w-4 h-4" />, category: 'integrations' },
    apple_music: { label: 'Apple Music', icon: <Music className="w-4 h-4" />, category: 'integrations' },
  };

  return (
    <div className="min-h-screen bg-[#0B0A08] text-[#F5F0E8]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#D4A853] uppercase tracking-[0.2em] mb-1">Nexus Status</h1>
          <p className="text-[#8C8476] text-xs font-medium uppercase tracking-widest">Real-time health monitoring for all sovereign services</p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Last checked: {lastCheck.toLocaleTimeString()}</span>
            {health && (
              <span>· Uptime: {formatUptime(health.uptime)}</span>
            )}
          </div>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#D4A853] border border-[#D4A853]/20 rounded-lg hover:bg-[#D4A853]/10 disabled:opacity-50 transition-colors uppercase font-bold tracking-tighter"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>

        {!health ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 text-gray-600 animate-spin" />
            <p className="text-gray-500 text-sm">Loading system status…</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className={`p-5 rounded-xl border-2 ${getStatusConfig(health.health).bg} ${getStatusConfig(health.health).border}`}>
              <div className="flex items-center gap-3">
                <span className={getStatusConfig(health.health).color}>
                  {getStatusConfig(health.health).icon}
                </span>
                <div>
                  <p className={`text-lg font-bold ${getStatusConfig(health.health).color}`}>
                    {getStatusConfig(health.health).label}
                  </p>
                  <p className="text-xs text-gray-500">
                    v{health.version} · {health.environment} · Node {health.system.nodeVersion}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-black text-[#D4A853]">{health.summary.activeAiProviders}</p>
                  <p className="text-[10px] text-[#8C8476] uppercase font-bold">Active Engines</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#12110F] border border-[#D4A853]/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-[#D4A853]">{health.summary.activeAiProviders}</p>
                <p className="text-[10px] text-[#8C8476] uppercase font-bold">AI Providers</p>
              </div>
              <div className="bg-[#12110F] border border-[#D4A853]/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-[#D4A853]">{health.summary.configuredIntegrations}</p>
                <p className="text-[10px] text-[#8C8476] uppercase font-bold">Integrations</p>
              </div>
              <div className="bg-[#12110F] border border-[#D4A853]/10 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-[#D4A853]">{health.system.memoryUsageMB}MB</p>
                <p className="text-[10px] text-[#8C8476] uppercase font-bold">Cognitive Load</p>
              </div>
            </div>

            {/* AI Providers Collapsible */}
            <div className="sdi-glass border border-white/5 rounded-2xl p-5 transition-all">
              <button
                onClick={() => setShowAiProviders(v => !v)}
                className="w-full flex items-center justify-between text-sm font-bold text-[#F5F0E8] uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#D4A853]" />
                  AI Providers
                </span>
                <span className="text-xs text-[#D4A853] hover:text-white transition-colors font-mono">
                  {showAiProviders ? '[-]' : '[+]'}
                </span>
              </button>
              
              {showAiProviders && (
                <div className="space-y-2 mt-4">
                  {Object.entries(health.providers).map(([key, active]) => {
                    const info = providerLabels[key] || { label: key, icon: <Server className="w-4 h-4" /> };
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-lg ${active ? 'bg-[#D4A853]/5 border border-[#D4A853]/20' : 'bg-[#1A1815]/30 border border-[#1A1815]/30'}`}>
                        <span className={active ? 'text-[#D4A853]' : 'text-[#5C564D]'}>{info.icon}</span>
                        <span className={`text-sm flex-1 font-medium ${active ? 'text-[#F5F0E8]' : 'text-[#5C564D]'}`}>{info.label}</span>
                        {active ? (
                          <span className="text-[10px] text-[#D4A853] flex items-center gap-1 uppercase font-black tracking-tighter"><CheckCircle className="w-3 h-3" /> Active</span>
                        ) : (
                          <span className="text-[10px] text-[#5C564D] uppercase font-bold tracking-tighter">Standby</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Integrations Collapsible */}
            <div className="sdi-glass border border-white/5 rounded-2xl p-5 transition-all">
              <button
                onClick={() => setShowIntegrations(v => !v)}
                className="w-full flex items-center justify-between text-sm font-bold text-[#F5F0E8] uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#D4A853]" />
                  Integrations & Services
                </span>
                <span className="text-xs text-[#D4A853] hover:text-white transition-colors font-mono">
                  {showIntegrations ? '[-]' : '[+]'}
                </span>
              </button>

              {showIntegrations && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {Object.entries(health.integrations).map(([key, active]) => {
                    const info = integrationLabels[key] || { label: key, icon: <Server className="w-4 h-4" />, category: 'other' };
                    return (
                      <div key={key} className={`flex items-center gap-2.5 p-2.5 rounded-lg ${active ? 'bg-[#12110F]/60 border border-white/5' : 'bg-[#12110F]/20 opacity-50'}`}>
                        <span className={active ? 'text-[#D4A853]' : 'text-[#5C564D]'}>{info.icon}</span>
                        <span className={`text-[11px] flex-1 font-medium ${active ? 'text-[#D1C8B8]' : 'text-[#5C564D]'}`}>{info.label}</span>
                        {active ? (
                          <span className="w-2 h-2 rounded-full bg-[#D4A853] shadow-[0_0_5px_#D4A853]" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-[#1A1815]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* System Info Collapsible */}
            <div className="sdi-glass border border-white/5 rounded-2xl p-5 transition-all">
              <button
                onClick={() => setShowSystemInfo(v => !v)}
                className="w-full flex items-center justify-between text-sm font-bold text-[#F5F0E8] uppercase tracking-wider"
              >
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#D4A853]" />
                  System Info
                </span>
                <span className="text-xs text-[#D4A853] hover:text-white transition-colors font-mono">
                  {showSystemInfo ? '[-]' : '[+]'}
                </span>
              </button>

              {showSystemInfo && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Node</p>
                    <p className="text-sm text-white">{health.system.nodeVersion}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Platform</p>
                    <p className="text-sm text-white">{health.system.platform}/{health.system.arch}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Environment</p>
                    <p className="text-sm text-white capitalize">{health.environment}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider">Version</p>
                    <p className="text-sm text-white">{health.version}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
