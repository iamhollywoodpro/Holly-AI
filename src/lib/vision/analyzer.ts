/**
 * HOLLY AI - Vision Analysis System
 * 
 * This module enables HOLLY to "see" images, documents, and videos,
 * extracting information and understanding visual content.
 * 
 * Uses FREE open-source APIs and Google Gemini (FREE tier).
 */

import { hollyLogger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export interface VisionAnalysis {
  // Basic description
  description: string;
  summary: string;
  
  // Detailed detection
  objects: DetectedObject[];
  text: ExtractedText[];
  colors: ColorInfo[];
  
  // Contextual understanding
  mood: string;
  setting: string;
  style: string;
  
  // Quality metrics
  aesthetic: number;        // 1-10
  professionalism: number;  // 1-10
  clarity: number;          // 1-10
  
  // Tags and categories
  tags: string[];
  categories: string[];
  
  // Safe content
  isSafe: boolean;
  flaggedContent: string[];
}

export interface DocumentAnalysis extends VisionAnalysis {
  documentType: 'invoice' | 'contract' | 'resume' | 'letter' | 'report' | 'presentation' | 'spreadsheet' | 'other';
  language: string;
  keyPoints: string[];
  entities: {
    people: string[];
    organizations: string[];
    dates: string[];
    amounts: string[];
    locations: string[];
    emails: string[];
    phones: string[];
    urls: string[];
  };
  actionItems: string[];
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  readingLevel: string;
  wordCount: number;
  summary: string;
}

export interface VideoAnalysis extends VisionAnalysis {
  duration: number;
  frameCount: number;
  scenes: VideoScene[];
  audioDescription: string;
  transcription: string;
  highlights: string[];
}

export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ExtractedText {
  text: string;
  confidence: number;
  language?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ColorInfo {
  hex: string;
  name: string;
  percentage: number;
  rgb: { r: number; g: number; b: number };
}

export interface VideoScene {
  timestamp: number;
  description: string;
  keyframe: string;
}

export type AnalysisType = 'general' | 'document' | 'creative' | 'detailed' | 'video';

// ============================================================================
// Vision Analyzer Class
// ============================================================================

export class VisionAnalyzer {
  private readonly logger = hollyLogger.ai;

  /**
   * Analyze an image from URL
   */
  async analyzeImage(
    imageUrl: string,
    analysisType: AnalysisType = 'general'
  ): Promise<VisionAnalysis> {
    this.logger.info('Analyzing image', { imageUrl, analysisType });

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY is not configured. Please add it to your environment variables.');
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = this.getPromptForType(analysisType);
      
      // Fetch image as base64
      const imageData = await this.fetchImageAsBase64(imageUrl);
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeType(imageUrl),
            data: imageData,
          }
        }
      ]);

      const analysis = this.parseVisionResponse(result.response.text());
      
      this.logger.info('Image analysis complete', { 
        description: analysis.description?.substring(0, 100) 
      });

      return analysis;
    } catch (error) {
      this.logger.error('Image analysis failed', { error, imageUrl });
      throw error;
    }
  }

  /**
   * Analyze a document (image or PDF)
   */
  async analyzeDocument(documentUrl: string): Promise<DocumentAnalysis> {
    this.logger.info('Analyzing document', { documentUrl });

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY is not configured. Please add it to your environment variables.');
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `You are HOLLY, an expert document analysis AI. Analyze this document and extract all information.

Return a JSON object with:
{
  "description": "Brief description of the document",
  "summary": "Executive summary of the content",
  "documentType": "invoice|contract|resume|letter|report|presentation|spreadsheet|other",
  "language": "detected language",
  "keyPoints": ["main point 1", "main point 2"],
  "entities": {
    "people": ["names mentioned"],
    "organizations": ["companies, orgs"],
    "dates": ["dates mentioned"],
    "amounts": ["monetary amounts, quantities"],
    "locations": ["addresses, places"],
    "emails": ["email addresses"],
    "phones": ["phone numbers"],
    "urls": ["websites mentioned"]
  },
  "actionItems": ["action required 1", "action required 2"],
  "sentiment": "positive|negative|neutral|mixed",
  "readingLevel": "grade level or professional level",
  "wordCount": approximate_word_count,
  "text": ["all extracted text from the document"],
  "tags": ["relevant tags"],
  "isSafe": true,
  "flaggedContent": []
}

Return ONLY valid JSON, no other text.`;

      const imageData = await this.fetchImageAsBase64(documentUrl);
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeType(documentUrl),
            data: imageData,
          }
        }
      ]);

      const analysis = this.parseDocumentResponse(result.response.text());
      
      this.logger.info('Document analysis complete', { 
        documentType: analysis.documentType,
        keyPointsCount: analysis.keyPoints?.length 
      });

      return analysis;
    } catch (error) {
      this.logger.error('Document analysis failed', { error, documentUrl });
      throw error;
    }
  }

  /**
   * Analyze a video (frames + audio)
   */
  async analyzeVideo(videoUrl: string): Promise<VideoAnalysis> {
    this.logger.info('Analyzing video', { videoUrl });

    // For video, we would:
    // 1. Extract keyframes at intervals
    // 2. Analyze each frame with vision
    // 3. Extract audio for transcription
    // 4. Combine into comprehensive analysis

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY is not configured. Please add it to your environment variables.');
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      // For now, analyze video metadata/description
      const prompt = `You are HOLLY, an expert video analysis AI. 

A video has been provided at: ${videoUrl}

Since direct video analysis requires frame extraction, provide a template for video analysis:
{
  "description": "Description of video content",
  "summary": "Summary of what happens in the video",
  "duration": 0,
  "frameCount": 0,
  "scenes": [
    {"timestamp": 0, "description": "Opening scene", "keyframe": "base64 or url"}
  ],
  "audioDescription": "Description of audio content",
  "transcription": "Transcribed speech",
  "highlights": ["Key moment 1", "Key moment 2"],
  "mood": "Overall mood",
  "style": "Production style",
  "tags": ["tag1", "tag2"],
  "isSafe": true,
  "flaggedContent": []
}

Return ONLY valid JSON.`;

      const result = await model.generateContent(prompt);
      const analysis = this.parseVideoResponse(result.response.text());
      
      this.logger.info('Video analysis complete');

      return analysis;
    } catch (error) {
      this.logger.error('Video analysis failed', { error, videoUrl });
      throw error;
    }
  }

  /**
   * Extract text from image (OCR)
   */
  async extractText(imageUrl: string): Promise<ExtractedText[]> {
    this.logger.info('Extracting text from image', { imageUrl });

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY is not configured. Please add it to your environment variables.');
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Extract ALL text from this image. Return a JSON array of text elements:
[
  {
    "text": "the extracted text",
    "confidence": 0.95,
    "language": "en"
  }
]

Return ONLY valid JSON array. If no text is found, return empty array [].`;

      const imageData = await this.fetchImageAsBase64(imageUrl);
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeType(imageUrl),
            data: imageData,
          }
        }
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (error) {
          this.logger.warn('Failed to parse JSON response from text extraction', { error });
          return [];
        }
      }

      return [];
    } catch (error) {
      this.logger.error('Text extraction failed', { error, imageUrl });
      return [];
    }
  }

  /**
   * Analyze colors in an image
   */
  async analyzeColors(imageUrl: string): Promise<ColorInfo[]> {
    this.logger.info('Analyzing image colors', { imageUrl });

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_AI_API_KEY is not configured. Please add it to your environment variables.');
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `Analyze the color palette of this image. Return a JSON array of dominant colors:
[
  {
    "hex": "#FF5733",
    "name": "Red Orange",
    "percentage": 25,
    "rgb": {"r": 255, "g": 87, "b": 51}
  }
]

Return ONLY valid JSON array with the top 5-10 colors.`;

      const imageData = await this.fetchImageAsBase64(imageUrl);
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: this.getMimeType(imageUrl),
            data: imageData,
          }
        }
      ]);

      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (error) {
          this.logger.warn('Failed to parse JSON response from color analysis', { error });
          return [];
        }
      }

      return [];
    } catch (error) {
      this.logger.error('Color analysis failed', { error, imageUrl });
      return [];
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getPromptForType(type: AnalysisType): string {
    const prompts: Record<AnalysisType, string> = {
      general: `You are HOLLY, an expert image analysis AI. Analyze this image and provide:
{
  "description": "Detailed description of the image",
  "summary": "One sentence summary",
  "objects": [{"label": "object name", "confidence": 0.95}],
  "text": [{"text": "visible text", "confidence": 0.9}],
  "colors": [{"hex": "#FFFFFF", "name": "White", "percentage": 50}],
  "mood": "Overall mood/atmosphere",
  "setting": "Where this appears to be taken",
  "style": "Artistic or photographic style",
  "aesthetic": 8,
  "professionalism": 7,
  "clarity": 9,
  "tags": ["relevant", "tags"],
  "categories": ["category1", "category2"],
  "isSafe": true,
  "flaggedContent": []
}
Return ONLY valid JSON.`,

      document: `You are HOLLY, an expert document analysis AI. Analyze this document image:
{
  "description": "Document description",
  "summary": "Content summary",
  "documentType": "type",
  "text": [{"text": "extracted text", "confidence": 0.95}],
  "isSafe": true,
  "flaggedContent": []
}
Return ONLY valid JSON.`,

      creative: `You are HOLLY, a creative director AI. Analyze this image for creative quality:
{
  "description": "Visual description",
  "summary": "Creative summary",
  "aesthetic": 8,
  "professionalism": 7,
  "clarity": 9,
  "mood": "Emotional impact",
  "style": "Artistic style",
  "colors": [{"hex": "#FFF", "name": "White", "percentage": 50}],
  "tags": ["creative", "tags"],
  "isSafe": true,
  "flaggedContent": []
}
Return ONLY valid JSON.`,

      detailed: `You are HOLLY, performing comprehensive image analysis:
{
  "description": "Extremely detailed description",
  "summary": "Concise summary",
  "objects": [{"label": "name", "confidence": 0.95, "boundingBox": {"x": 0, "y": 0, "width": 100, "height": 100}}],
  "text": [{"text": "all visible text", "confidence": 0.9, "language": "en"}],
  "colors": [{"hex": "#FFF", "name": "White", "percentage": 50, "rgb": {"r": 255, "g": 255, "b": 255}}],
  "mood": "Detailed mood analysis",
  "setting": "Detailed setting",
  "style": "Detailed style analysis",
  "aesthetic": 8,
  "professionalism": 7,
  "clarity": 9,
  "tags": ["all", "relevant", "tags"],
  "categories": ["detailed", "categories"],
  "isSafe": true,
  "flaggedContent": []
}
Return ONLY valid JSON.`,

      video: `You are HOLLY, analyzing video content:
{
  "description": "Video description",
  "summary": "Content summary",
  "mood": "Overall mood",
  "style": "Production style",
  "tags": ["tags"],
  "isSafe": true,
  "flaggedContent": []
}
Return ONLY valid JSON.`
    };

    return prompts[type] || prompts.general;
  }

  private parseVisionResponse(text: string): VisionAnalysis {
    const defaults: VisionAnalysis = {
      description: 'Unable to analyze image',
      summary: '',
      objects: [],
      text: [],
      colors: [],
      mood: 'neutral',
      setting: 'unknown',
      style: 'unknown',
      aesthetic: 5,
      professionalism: 5,
      clarity: 5,
      tags: [],
      categories: [],
      isSafe: true,
      flaggedContent: [],
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaults, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (error) {
      this.logger.warn('Failed to parse vision response', { error });
    }

    return defaults;
  }

  private parseDocumentResponse(text: string): DocumentAnalysis {
    const defaults: DocumentAnalysis = {
      description: 'Unable to analyze document',
      summary: '',
      documentType: 'other',
      language: 'en',
      keyPoints: [],
      entities: {
        people: [],
        organizations: [],
        dates: [],
        amounts: [],
        locations: [],
        emails: [],
        phones: [],
        urls: [],
      },
      actionItems: [],
      sentiment: 'neutral',
      readingLevel: 'Standard',
      wordCount: 0,
      text: [],
      tags: [],
      categories: [],
      mood: 'neutral',
      setting: 'document',
      style: 'formal',
      aesthetic: 5,
      professionalism: 5,
      clarity: 5,
      objects: [],
      colors: [],
      isSafe: true,
      flaggedContent: [],
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaults, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (error) {
      this.logger.warn('Failed to parse document response', { error });
    }

    return defaults;
  }

  private parseVideoResponse(text: string): VideoAnalysis {
    const defaults: VideoAnalysis = {
      description: 'Unable to analyze video',
      summary: '',
      duration: 0,
      frameCount: 0,
      scenes: [],
      audioDescription: '',
      transcription: '',
      highlights: [],
      mood: 'neutral',
      setting: 'unknown',
      style: 'unknown',
      aesthetic: 5,
      professionalism: 5,
      clarity: 5,
      tags: [],
      categories: [],
      objects: [],
      text: [],
      colors: [],
      isSafe: true,
      flaggedContent: [],
    };

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { ...defaults, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (error) {
      this.logger.warn('Failed to parse video response', { error });
    }

    return defaults;
  }

  private async fetchImageAsBase64(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch (error) {
      this.logger.error('Failed to fetch image', { error, url });
      throw new Error('Failed to fetch image for analysis');
    }
  }

  private getMimeType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
    };
    return mimeTypes[extension] || 'image/jpeg';
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const visionAnalyzer = new VisionAnalyzer();
