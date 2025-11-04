/**
 * HOLLY + CANVA INTEGRATION
 * 
 * Connects HOLLY to Canva API for automated design creation
 * Uses Hollywood's Canva subscription (premium templates unlocked)
 * 
 * Capabilities:
 * - Auto-create social media posts
 * - Generate presentations
 * - Create thumbnails
 * - Design marketing materials
 * - Apply brand kits
 * - Export to PNG/PDF/MP4
 */

interface CanvaDesignOptions {
  type: 'instagram-post' | 'twitter-post' | 'linkedin-post' | 'youtube-thumbnail' | 
        'presentation' | 'logo' | 'infographic' | 'video' | 'story';
  template?: string; // Template ID (optional)
  content: {
    title?: string;
    subtitle?: string;
    bodyText?: string;
    images?: string[]; // URLs
    colors?: string[]; // Hex codes
    fonts?: string[];
  };
  brandKit?: string; // Brand kit ID
  exportFormat?: 'png' | 'pdf' | 'jpg' | 'mp4' | 'gif';
  quality?: 'draft' | 'standard' | 'high';
}

interface CanvaDesignResult {
  designId: string;
  exportUrl: string;
  thumbnailUrl: string;
  editUrl: string;
  format: string;
  dimensions: { width: number; height: number };
  provider: 'Canva';
}

interface CanvaTemplate {
  id: string;
  name: string;
  type: string;
  thumbnail: string;
  isPremium: boolean;
}

class CanvaIntegration {
  private readonly CLIENT_ID = process.env.CANVA_CLIENT_ID;
  private readonly CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
  private readonly REDIRECT_URI = process.env.CANVA_REDIRECT_URI;
  private readonly BASE_URL = 'https://api.canva.com/rest/v1';
  
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Initialize OAuth (user needs to authorize once)
   */
  async authorize(): Promise<string> {
    // Generate authorization URL
    const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
    authUrl.searchParams.set('client_id', this.CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', this.REDIRECT_URI!);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'design:content:write design:content:read asset:read asset:write');

    return authUrl.toString();
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
        redirect_uri: this.REDIRECT_URI!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;

    // Store tokens securely (e.g., in database)
    await this.storeTokens(data.access_token, data.refresh_token);
  }

  /**
   * Create design from template or scratch
   */
  async createDesign(options: CanvaDesignOptions): Promise<CanvaDesignResult> {
    if (!this.accessToken) {
      throw new Error('Not authorized. Please call authorize() first.');
    }

    // Step 1: Create design
    const designResponse = await fetch(`${this.BASE_URL}/designs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_type: options.type,
        ...(options.template && { asset_id: options.template }),
      }),
    });

    if (!designResponse.ok) {
      throw new Error(`Failed to create design: ${designResponse.statusText}`);
    }

    const design = await designResponse.json();
    const designId = design.design.id;

    // Step 2: Autofill content
    if (options.content) {
      await this.autofillDesign(designId, options.content, options.brandKit);
    }

    // Step 3: Export design
    const exportUrl = await this.exportDesign(designId, options.exportFormat || 'png', options.quality || 'high');

    return {
      designId,
      exportUrl,
      thumbnailUrl: design.design.thumbnail_url,
      editUrl: design.design.urls.edit_url,
      format: options.exportFormat || 'png',
      dimensions: {
        width: design.design.width,
        height: design.design.height,
      },
      provider: 'Canva',
    };
  }

  /**
   * Autofill design with content
   */
  private async autofillDesign(
    designId: string,
    content: CanvaDesignOptions['content'],
    brandKitId?: string
  ): Promise<void> {
    const payload: any = {};

    // Add text content
    if (content.title) {
      payload.title = { text: content.title };
    }
    if (content.subtitle) {
      payload.subtitle = { text: content.subtitle };
    }
    if (content.bodyText) {
      payload.body = { text: content.bodyText };
    }

    // Add images
    if (content.images && content.images.length > 0) {
      payload.images = content.images.map((url, index) => ({
        position: index,
        url,
      }));
    }

    // Apply brand kit
    if (brandKitId) {
      payload.brand_template_id = brandKitId;
    }

    // Apply colors
    if (content.colors) {
      payload.colors = content.colors;
    }

    const response = await fetch(`${this.BASE_URL}/designs/${designId}/autofill`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Failed to autofill design');
    }
  }

  /**
   * Export design to file
   */
  private async exportDesign(
    designId: string,
    format: string,
    quality: string
  ): Promise<string> {
    // Request export
    const exportResponse = await fetch(`${this.BASE_URL}/exports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_id: designId,
        format: format.toUpperCase(),
        quality: quality.toUpperCase(),
      }),
    });

    if (!exportResponse.ok) {
      throw new Error('Failed to request export');
    }

    const exportData = await exportResponse.json();
    const exportId = exportData.export.id;

    // Poll for export completion
    return await this.pollExportStatus(exportId);
  }

  /**
   * Poll export status until complete
   */
  private async pollExportStatus(exportId: string): Promise<string> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.BASE_URL}/exports/${exportId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check export status');
      }

      const data = await response.json();

      if (data.export.status === 'success') {
        return data.export.url;
      } else if (data.export.status === 'failed') {
        throw new Error('Export failed');
      }

      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Export timeout');
  }

  /**
   * Search templates
   */
  async searchTemplates(query: string, type?: string): Promise<CanvaTemplate[]> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    const url = new URL(`${this.BASE_URL}/templates`);
    url.searchParams.set('query', query);
    if (type) {
      url.searchParams.set('design_type', type);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to search templates');
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.design_type,
      thumbnail: item.thumbnail_url,
      isPremium: item.is_premium,
    }));
  }

  /**
   * Quick create: Instagram post
   */
  async createInstagramPost(content: {
    title: string;
    image?: string;
    brandKit?: string;
  }): Promise<CanvaDesignResult> {
    return await this.createDesign({
      type: 'instagram-post',
      content: {
        title: content.title,
        images: content.image ? [content.image] : undefined,
      },
      brandKit: content.brandKit,
      exportFormat: 'png',
    });
  }

  /**
   * Quick create: YouTube thumbnail
   */
  async createYouTubeThumbnail(content: {
    title: string;
    subtitle?: string;
    image?: string;
  }): Promise<CanvaDesignResult> {
    return await this.createDesign({
      type: 'youtube-thumbnail',
      content: {
        title: content.title,
        subtitle: content.subtitle,
        images: content.image ? [content.image] : undefined,
      },
      exportFormat: 'png',
      quality: 'high',
    });
  }

  /**
   * Quick create: Presentation
   */
  async createPresentation(slides: Array<{
    title: string;
    content: string;
  }>): Promise<CanvaDesignResult> {
    // Combine all slides into one design
    const content = {
      title: slides[0]?.title,
      bodyText: slides.map(s => `${s.title}\n${s.content}`).join('\n\n'),
    };

    return await this.createDesign({
      type: 'presentation',
      content,
      exportFormat: 'pdf',
    });
  }

  /**
   * Store tokens securely (implement based on your storage)
   */
  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    // TODO: Store in database or secure storage
    // For now, store in memory
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.CLIENT_ID!,
        client_secret: this.CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    await this.storeTokens(data.access_token, data.refresh_token);
  }
}

// Export singleton
export const canvaIntegration = new CanvaIntegration();

// Export types
export type { CanvaDesignOptions, CanvaDesignResult, CanvaTemplate };