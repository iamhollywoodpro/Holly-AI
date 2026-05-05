'use client';

import { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  data: Uint8Array;
  isActive: boolean;
  barCount?: number;
  color?: string;
  inactiveColor?: string;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function WaveformVisualizer({
  data,
  isActive,
  barCount = 32,
  color = '#22d3ee',
  inactiveColor = '#9d25f4',
  height = 48,
  className,
  style,
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const smoothedRef = useRef<Float32Array>(new Float32Array(barCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, rect.width, rect.height);

      const smoothed = smoothedRef.current;
      const step = Math.max(1, Math.floor((data.length || barCount) / barCount));

      for (let i = 0; i < barCount; i++) {
        const rawVal = data.length > 0 ? (data[i * step] ?? 0) / 255 : 0;
        const target = isActive ? rawVal : 0;
        smoothed[i] += (target - smoothed[i]) * 0.15;

        const barHeight = Math.max(2, smoothed[i] * rect.height * 0.9);
        const x = (i / barCount) * rect.width;
        const barWidth = Math.max(1, (rect.width / barCount) * 0.6);
        const y = (rect.height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        gradient.addColorStop(0, isActive ? color : inactiveColor);
        gradient.addColorStop(1, isActive ? `${inactiveColor}88` : `${color}44`);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [data, isActive, barCount, color, inactiveColor]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: `${height}px`, display: 'block', ...style }}
    />
  );
}

interface CircularWaveformProps {
  data: Uint8Array;
  isActive: boolean;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function CircularWaveform({
  data,
  isActive,
  size = 120,
  color = '#22d3ee',
  className,
  style,
}: CircularWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const smoothedRef = useRef<Float32Array>(new Float32Array(64).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

      ctx.clearRect(0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;
      const baseRadius = size * 0.25;
      const maxBarLength = size * 0.2;
      const barCount = 64;
      const smoothed = smoothedRef.current;
      const step = Math.max(1, Math.floor((data.length || barCount) / barCount));

      for (let i = 0; i < barCount; i++) {
        const rawVal = data.length > 0 ? (data[i * step] ?? 0) / 255 : 0;
        const target = isActive ? rawVal : 0;
        smoothed[i] += (target - smoothed[i]) * 0.15;

        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        const barLength = Math.max(1, smoothed[i] * maxBarLength);

        const x1 = centerX + Math.cos(angle) * baseRadius;
        const y1 = centerY + Math.sin(angle) * baseRadius;
        const x2 = centerX + Math.cos(angle) * (baseRadius + barLength);
        const y2 = centerY + Math.sin(angle) * (baseRadius + barLength);

        ctx.strokeStyle = isActive
          ? `${color}${Math.round(60 + smoothed[i] * 195).toString(16).padStart(2, '0')}`
          : `${color}30`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      if (isActive) {
        const avgVolume = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;
        const glowRadius = baseRadius + avgVolume * maxBarLength * 0.5;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
        gradient.addColorStop(0, `${color}20`);
        gradient.addColorStop(1, `${color}00`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [data, isActive, size, color]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: `${size}px`, height: `${size}px`, ...style }}
    />
  );
}
