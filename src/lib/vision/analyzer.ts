/**
 * HOLLY AI - Vision Analysis System
 * 
 * This module enables HOLLY to "see" images, documents, and videos,
 * extracting information and understanding visual content.
 * 
 * Uses FREE models only — no Google, no Gemini, no paid APIs.
 * Primary:  Qwen2.5-VL-72B via OpenRouter (free tier)
 * Fallback: HuggingFace free vision models
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
// OpenRouter Vision Client (free Qwen2.5-VL-72B)
// ============================================================================

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const VISION_MODEL       = 'qwen/qwen2.5-vl-72b-instruct:free';

async function callOpenRouterVision(imageUrl: string, prompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured. Add it to your environment variables.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://holly.nexamusicgroup.com',
      'X-Title': 'HOLLY AI',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`Vision API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No analysis returned.';
}

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
      const prompt = this.getPromptForType(analysisType);
      const rawText = await callOpenRouterVision(imageUrl, prompt);
      const analysis = this.parseVisionResponse(rawText);
      
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

      const rawText = await callOpenRouterVision(documentUrl, prompt);
      const analysis = this.parseDocumentResponse(rawText);
      
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
   * Analyze a video (description-based since we can't pass video to vision model)
   */
  async analyzeVideo(videoUrl: string): Promise<VideoAnalysis> {
    this.logger.info('Analyzing video', { videoUrl });

    try {
      const prompt = `You are HOLLY, an expert video analysis AI. 

A video URL has been provided: ${videoUrl}

Based on the URL and any available metadata, provide a structured video analysis template:
{
  "description": "Description of likely video content based on URL/context",
  "summary": "Summary of expected content",
  "duration": 0,
  "frameCount": 0,
  "scenes": [
    {"timestamp": 0, "description": "Opening scene", "keyframe": ""}
  ],
  "audioDescription": "Description of audio content",
  "transcription": "Available transcription if any",
  "highlights": ["Key moment 1", "Key moment 2"],
  "mood": "Overall mood",
  "style": "Production style",
  "tags": ["tag1", "tag2"],
  "isSafe": true,
  "flaggedContent": []
}

Return ONLY valid JSON.`;

      // For video, we can't pass a video URL to the vision model directly
      // Use Groq to generate a template response based on the URL
      const Groq = (await import('groq-sdk')).default;
      const groqKey = process.env.GROQ_API_KEY;
      
      let rawText = '';
      if (groqKey) {
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 800,
        });
        rawText = completion.choices[0]?.message?.content || '';
      }

      const analysis = this.parseVideoResponse(rawText);
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
      const prompt = `Extract ALL text from this image. Return a JSON array of text elements:
[
  {
    "text": "the extracted text",
    "confidence": 0.95,
    "language": "en"
  }
]

Return ONLY valid JSON array. If no text is found, return empty array [].`;

      const rawText = await callOpenRouterVision(imageUrl, prompt);
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      
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

      const rawText = await callOpenRouterVision(imageUrl, prompt);
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      
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
      // If no JSON, use the raw text as description
      if (text.trim()) {
        return { ...defaults, description: text.trim(), summary: text.trim().substring(0, 150) };
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
}

// ============================================================================
// Singleton Export
// ============================================================================

export const visionAnalyzer = new VisionAnalyzer();
