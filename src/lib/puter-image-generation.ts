/**
 * Puter.js Image Generation Service
 * FREE image generation using Stable Diffusion, FLUX, and other models
 * No API keys required, no costs
 */

// Declare Puter types
declare global {
  interface Window {
    puter?: {
      ai: {
        txt2img: (prompt: string, options?: ImageGenerationOptions) => Promise<HTMLImageElement>;
      };
    };
  }
}

export interface ImageGenerationOptions {
  model?: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  negative_prompt?: string;
}

export type ImageModel = 
  | 'stabilityai/stable-diffusion-3-medium'
  | 'stabilityai/stable-diffusion-xl-base-1.0'
  | 'black-forest-labs/FLUX.1-dev'
  | 'black-forest-labs/FLUX.2'
  | 'Qwen/Qwen2-VL-7B-Instruct'
  | 'NanoBanana/NanoBanana-Pro';

export const IMAGE_MODELS: Record<string, { name: string; description: string }> = {
  'stabilityai/stable-diffusion-3-medium': {
    name: 'Stable Diffusion 3',
    description: 'High-quality, balanced image generation'
  },
  'stabilityai/stable-diffusion-xl-base-1.0': {
    name: 'Stable Diffusion XL',
    description: 'Extra large, detailed images'
  },
  'black-forest-labs/FLUX.1-dev': {
    name: 'FLUX.1 Dev',
    description: 'Latest FLUX model, excellent quality'
  },
  'black-forest-labs/FLUX.2': {
    name: 'FLUX.2',
    description: 'Newest FLUX model, best quality'
  },
};

/**
 * Check if Puter.js is loaded
 */
export function isPuterLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.puter?.ai?.txt2img;
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
 * Generate image from text prompt
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<HTMLImageElement> {
  // Wait for Puter to load
  const loaded = await waitForPuter();
  if (!loaded) {
    throw new Error('Puter.js failed to load. Please refresh the page.');
  }

  // Default options
  const defaultOptions: ImageGenerationOptions = {
    model: 'black-forest-labs/FLUX.1-dev', // Use FLUX by default for best quality
    ...options
  };

  try {
    const imageElement = await window.puter!.ai.txt2img(prompt, defaultOptions);
    return imageElement;
  } catch (error) {
    console.error('Image generation error:', error);
    throw new Error('Failed to generate image. Please try again.');
  }
}

/**
 * Generate image and return as base64 data URL
 */
export async function generateImageAsDataURL(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  const imageElement = await generateImage(prompt, options);
  
  return new Promise((resolve, reject) => {
    imageElement.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = imageElement.naturalWidth;
        canvas.height = imageElement.naturalHeight;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(imageElement, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        reject(error);
      }
    };
    
    imageElement.onerror = () => {
      reject(new Error('Failed to load generated image'));
    };
  });
}

/**
 * Generate image and download it
 */
export async function generateAndDownloadImage(
  prompt: string,
  filename: string = 'generated-image.png',
  options: ImageGenerationOptions = {}
): Promise<void> {
  const dataURL = await generateImageAsDataURL(prompt, options);
  
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
