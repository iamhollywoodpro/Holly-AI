/**
 * Music Media Generator
 * 
 * Generates visual content for music marketing:
 * - Album covers
 * - Single artwork
 * - Social media posts
 * - Music video concepts
 * - Lyric videos
 * - Promotional graphics
 */

export interface AlbumCoverRequest {
  trackTitle: string;
  artist: string;
  genre: string[];
  mood: string[];
  style: 'minimalist' | 'bold' | 'artistic' | 'photographic' | 'abstract' | 'retro' | 'modern';
  colorScheme?: string;
  additionalDetails?: string;
}

export interface SocialMediaPostRequest {
  type: 'instagram' | 'tiktok' | 'twitter' | 'facebook';
  content: 'release_announcement' | 'snippet_visual' | 'behind_the_scenes' | 'lyric_card' | 'event_promo';
  trackTitle: string;
  artist: string;
  releaseDate?: Date;
  streamingLinks?: string[];
  customText?: string;
}

export interface MusicVideoConceptRequest {
  trackTitle: string;
  artist: string;
  genre: string;
  mood: string;
  lyrics?: string;
  budget: 'low' | 'medium' | 'high';
  duration: number;
}

export class MediaGenerator {
  async generateAlbumCover(request: AlbumCoverRequest): Promise<{
    imageUrl: string;
    prompt: string;
  }> {
    const prompt = this.buildAlbumCoverPrompt(request);
    
    const response = await fetch('/api/media/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspectRatio: '1:1',
        quality: 'high'
      })
    });
    
    const data = await response.json();
    return { imageUrl: data.imageUrl, prompt };
  }
  
  private buildAlbumCoverPrompt(request: AlbumCoverRequest): string {
    let prompt = `Professional album cover for "${request.trackTitle}" by ${request.artist}. `;
    prompt += `${request.genre.join('/')} music. Mood: ${request.mood.join(', ')}. `;
    prompt += `${request.style} style. `;
    if (request.colorScheme) prompt += `Color palette: ${request.colorScheme}. `;
    if (request.additionalDetails) prompt += `${request.additionalDetails}. `;
    prompt += 'High quality, 3000x3000px, no text.';
    return prompt;
  }
  
  async generateSocialMediaPost(request: SocialMediaPostRequest): Promise<{
    imageUrl: string;
    caption: string;
    hashtags: string[];
  }> {
    const dimensions = this.getSocialMediaDimensions(request.type);
    const prompt = this.buildSocialMediaPrompt(request);
    
    const response = await fetch('/api/media/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspectRatio: dimensions.aspectRatio })
    });
    
    const data = await response.json();
    
    return {
      imageUrl: data.imageUrl,
      caption: this.generateCaption(request),
      hashtags: this.generateHashtags(request)
    };
  }
  
  private getSocialMediaDimensions(type: string) {
    const dims = {
      instagram: { aspectRatio: '1:1', width: 1080, height: 1080 },
      tiktok: { aspectRatio: '9:16', width: 1080, height: 1920 },
      twitter: { aspectRatio: '16:9', width: 1200, height: 675 },
      facebook: { aspectRatio: '1.91:1', width: 1200, height: 628 }
    };
    return dims[type as keyof typeof dims] || dims.instagram;
  }
  
  private buildSocialMediaPrompt(request: SocialMediaPostRequest): string {
    const templates = {
      release_announcement: `Music release announcement for "${request.trackTitle}" by ${request.artist}. Modern, vibrant, professional.`,
      snippet_visual: `Audio snippet visual for "${request.trackTitle}". Waveform, dynamic, energetic.`,
      behind_the_scenes: `Studio aesthetic for "${request.trackTitle}". Recording vibes, artistic.`,
      lyric_card: `Lyric card background for "${request.trackTitle}". Minimalist, aesthetic.`,
      event_promo: `Event promo for ${request.artist}. Bold, attention-grabbing.`
    };
    return templates[request.content];
  }
  
  private generateCaption(request: SocialMediaPostRequest): string {
    const captions = {
      release_announcement: `🎵 NEW MUSIC! "${request.trackTitle}" OUT NOW! Link in bio 🔥`,
      snippet_visual: `🎧 Preview of "${request.trackTitle}" coming soon! Thoughts? 👇`,
      behind_the_scenes: `Behind the scenes of "${request.trackTitle}" 🎙️`,
      lyric_card: `📝 Favorite lyric from "${request.trackTitle}" 💭`,
      event_promo: `📍 LIVE! Don't miss it! 🎫`
    };
    return request.customText || captions[request.content];
  }
  
  private generateHashtags(request: SocialMediaPostRequest): string[] {
    return [
      '#NewMusic',
      '#MusicRelease',
      `#${request.artist.replace(/\s+/g, '')}`,
      '#IndieArtist',
      '#MusicProduction'
    ];
  }
  
  async generateMusicVideoConcept(request: MusicVideoConceptRequest): Promise<{
    concept: string;
    scenes: Array<{ description: string; duration: number }>;
    budgetBreakdown: Record<string, string>;
  }> {
    const conceptPrompt = `Generate music video concept for "${request.trackTitle}" by ${request.artist}. Genre: ${request.genre}, Mood: ${request.mood}, Budget: ${request.budget}`;
    
    const response = await fetch('/api/ai/generate-concept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: conceptPrompt })
    });
    
    const data = await response.json();
    
    return {
      concept: data.concept,
      scenes: data.scenes || [],
      budgetBreakdown: this.generateBudgetBreakdown(request.budget)
    };
  }
  
  private generateBudgetBreakdown(budget: string): Record<string, string> {
    const breakdowns = {
      low: {
        'Director/Videographer': '$500-1,000',
        'Equipment': '$200-500',
        'Editing': '$300-600',
        'Total': '$1,000-2,600'
      },
      medium: {
        'Director': '$2,000-4,000',
        'Cinematographer': '$1,500-3,000',
        'Equipment': '$1,000-2,000',
        'Editing': '$1,500-3,000',
        'Total': '$7,500-16,000'
      },
      high: {
        'Director': '$5,000-15,000',
        'Production Company': '$10,000-30,000',
        'Equipment': '$3,000-10,000',
        'Editing/VFX': '$5,000-20,000',
        'Total': '$32,000-108,000'
      }
    };
    return breakdowns[budget as keyof typeof breakdowns] || breakdowns.low;
  }
}

export const mediaGenerator = new MediaGenerator();
export async function createAlbumCover(request: AlbumCoverRequest) {
  return mediaGenerator.generateAlbumCover(request);
}
export async function createSocialPost(request: SocialMediaPostRequest) {
  return mediaGenerator.generateSocialMediaPost(request);
}
export async function createVideoConcept(request: MusicVideoConceptRequest) {
  return mediaGenerator.generateMusicVideoConcept(request);
}
