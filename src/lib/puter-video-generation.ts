/**
 * Puter.js Video Generation Service
 * FREE video generation using Wan 2.2 AI models
 * No API keys required, no costs
 */

// Declare Puter types
declare global {
  interface Window {
    puter?: {
      ai: {
        txt2vid: (prompt: string, options?: VideoGenerationOptions) => Promise<HTMLVideoElement>;
      };
    };
  }
}

export interface VideoGenerationOptions {
  model?: string;
  image_url?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export type VideoModel = 
  | 'Wan-AI/Wan2.2-T2V-A14B'  // Text-to-Video
  | 'Wan-AI/Wan2.2-I2V-A14B'; // Image-to-Video

export const VIDEO_MODELS: Record<string, { name: string; description: string }> = {
  'Wan-AI/Wan2.2-T2V-A14B': {
    name: 'Wan 2.2 Text-to-Video',
    description: 'Generate videos from text descriptions'
  },
  'Wan-AI/Wan2.2-I2V-A14B': {
    name: 'Wan 2.2 Image-to-Video',
    description: 'Animate static images into videos'
  },
};

/**
 * Check if Puter.js is loaded
 */
export function isPuterLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.puter?.ai?.txt2vid;
}

/**
 * Wait for Puter.js to load
 */
export async function waitForPuter(timeout = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  while (!isPuterLoaded()) {
    if (Date.now() - startTime > timeout) {
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return true;
}

/**
 * Generate video from text prompt
 */
export async function generateVideoFromText(
  prompt: string,
  options: VideoGenerationOptions = {}
): Promise<HTMLVideoElement> {
  // Wait for Puter to load
  const loaded = await waitForPuter();
  if (!loaded) {
    throw new Error('Puter.js failed to load. Please refresh the page.');
  }

  // Default options for text-to-video
  const defaultOptions: VideoGenerationOptions = {
    model: 'Wan-AI/Wan2.2-T2V-A14B',
    ...options
  };

  try {
    const videoElement = await window.puter!.ai.txt2vid(prompt, defaultOptions);
    
    // Auto-play video when loaded
    videoElement.addEventListener('loadeddata', () => {
      videoElement.play().catch(() => {
        // Ignore autoplay errors (browser restrictions)
      });
    });
    
    return videoElement;
  } catch (error) {
    console.error('Video generation error:', error);
    throw new Error('Failed to generate video. Please try again.');
  }
}

/**
 * Generate video from image
 */
export async function generateVideoFromImage(
  prompt: string,
  imageUrl: string,
  options: VideoGenerationOptions = {}
): Promise<HTMLVideoElement> {
  // Wait for Puter to load
  const loaded = await waitForPuter();
  if (!loaded) {
    throw new Error('Puter.js failed to load. Please refresh the page.');
  }

  // Default options for image-to-video
  const defaultOptions: VideoGenerationOptions = {
    model: 'Wan-AI/Wan2.2-I2V-A14B',
    image_url: imageUrl,
    ...options
  };

  try {
    const videoElement = await window.puter!.ai.txt2vid(prompt, defaultOptions);
    
    // Auto-play video when loaded
    videoElement.addEventListener('loadeddata', () => {
      videoElement.play().catch(() => {
        // Ignore autoplay errors (browser restrictions)
      });
    });
    
    return videoElement;
  } catch (error) {
    console.error('Video generation error:', error);
    throw new Error('Failed to generate video from image. Please try again.');
  }
}

/**
 * Generate video and download it
 */
export async function generateAndDownloadVideo(
  prompt: string,
  filename: string = 'generated-video.mp4',
  options: VideoGenerationOptions = {}
): Promise<void> {
  const videoElement = options.image_url
    ? await generateVideoFromImage(prompt, options.image_url, options)
    : await generateVideoFromText(prompt, options);
  
  // Wait for video to load
  await new Promise<void>((resolve, reject) => {
    videoElement.addEventListener('loadeddata', () => resolve());
    videoElement.addEventListener('error', () => reject(new Error('Failed to load video')));
  });
  
  // Download video
  const link = document.createElement('a');
  link.href = videoElement.src;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Get video blob for upload
 */
export async function generateVideoBlob(
  prompt: string,
  options: VideoGenerationOptions = {}
): Promise<Blob> {
  const videoElement = options.image_url
    ? await generateVideoFromImage(prompt, options.image_url, options)
    : await generateVideoFromText(prompt, options);
  
  // Wait for video to load
  await new Promise<void>((resolve, reject) => {
    videoElement.addEventListener('loadeddata', () => resolve());
    videoElement.addEventListener('error', () => reject(new Error('Failed to load video')));
  });
  
  // Fetch video as blob
  const response = await fetch(videoElement.src);
  return await response.blob();
}
