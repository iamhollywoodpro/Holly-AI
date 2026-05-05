/**
 * HOLLY + CANVA INTEGRATION
 *
 * Full PKCE OAuth 2.0 flow (Canva Connect API requirement).
 * Tokens are stored per-user in the `canva_tokens` table.
 *
 * Canva API docs: https://www.canva.dev/docs/connect/
 *
 * Required env vars:
 *   CANVA_CLIENT_ID      — from Canva Developer Portal
 *   CANVA_CLIENT_SECRET  — from Canva Developer Portal
 *   CANVA_REDIRECT_URI   — e.g. https://holly.nexamusicgroup.com/api/canva/callback
 *
 * Required DB table: CanvaToken (see prisma/schema.prisma)
 */

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/monitoring/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CanvaDesignOptions {
  type:
    | "instagram-post"
    | "twitter-post"
    | "linkedin-post"
    | "youtube-thumbnail"
    | "presentation"
    | "logo"
    | "infographic"
    | "video"
    | "story"
    | "a4-document"
    | "letter";
  templateId?: string;        // Canva template/asset ID (optional)
  content?: {
    title?: string;
    subtitle?: string;
    bodyText?: string;
    images?: string[];         // Public image URLs
    colors?: string[];         // Hex codes
  };
  brandTemplateId?: string;   // Canva brand template ID
  exportFormat?: "PNG" | "PDF" | "JPG" | "MP4" | "GIF" | "PPTX";
  quality?: "draft" | "regular" | "pro";
}

export interface CanvaDesignResult {
  designId: string;
  exportUrl: string;
  thumbnailUrl: string;
  editUrl: string;
  viewUrl: string;
  format: string;
  provider: "Canva";
}

export interface CanvaTemplate {
  id: string;
  name: string;
  type: string;
  thumbnail: string;
  isPremium: boolean;
}

export interface CanvaTokenRow {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure code_verifier (PKCE spec §4.1).
 * Must be 43–128 URL-safe characters.
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(96).toString("base64url");
}

/**
 * Derive code_challenge from code_verifier using SHA-256 + base64url.
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

/**
 * Generate a random CSRF state string.
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString("base64url");
}

// ─── Token storage helpers (DB) ───────────────────────────────────────────────

const CANVA_BASE_URL = "https://api.canva.com/rest/v1";

async function loadToken(userId: string): Promise<CanvaTokenRow | null> {
  try {
    const row = await prisma.canvaToken.findUnique({ where: { userId } });
    return row as CanvaTokenRow | null;
  } catch {
    return null;
  }
}

async function saveToken(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number,
  scope: string,
  canvaUserId?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  await prisma.canvaToken.upsert({
    where: { userId },
    update: { accessToken, refreshToken, expiresAt, scope, canvaUserId, updatedAt: new Date() },
    create: { userId, accessToken, refreshToken, expiresAt, scope, canvaUserId },
  });
}

// ─── Core CanvaIntegration class ──────────────────────────────────────────────

class CanvaIntegration {
  private readonly CLIENT_ID     = process.env.CANVA_CLIENT_ID || "";
  private readonly CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET || "";
  private readonly REDIRECT_URI  = process.env.CANVA_REDIRECT_URI || "";

  isConfigured(): boolean {
    return !!(this.CLIENT_ID && this.CLIENT_SECRET && this.REDIRECT_URI);
  }

  // ── Step 1: Build the authorization URL (send user here) ──────────────────

  buildAuthUrl(codeVerifier: string, state: string): string {
    const challenge = generateCodeChallenge(codeVerifier);
    const url = new URL("https://www.canva.com/api/oauth/authorize");
    url.searchParams.set("code_challenge",        challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("scope",
      "asset:read asset:write design:content:read design:content:write " +
      "design:meta:read folder:read profile:read"
    );
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id",     this.CLIENT_ID);
    url.searchParams.set("state",         state);
    url.searchParams.set("redirect_uri",  this.REDIRECT_URI);
    return url.toString();
  }

  // ── Step 2: Exchange authorization code for tokens ────────────────────────

  async exchangeCode(code: string, codeVerifier: string, userId: string): Promise<void> {
    const credentials = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString("base64");

    const response = await fetch(`${CANVA_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type:    "authorization_code",
        code,
        code_verifier: codeVerifier,
        redirect_uri:  this.REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Canva token exchange failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    await saveToken(
      userId,
      data.access_token,
      data.refresh_token,
      data.expires_in ?? 3600,
      data.scope ?? "",
    );
    logger.info("Canva OAuth complete — tokens stored", { userId, scope: data.scope, category: "canva" });
  }

  // ── Token refresh ─────────────────────────────────────────────────────────

  private async refreshAccessToken(userId: string, refreshToken: string): Promise<string> {
    const credentials = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString("base64");

    const response = await fetch(`${CANVA_BASE_URL}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/x-www-form-urlencoded",
        "Authorization": `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type:    "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Canva token refresh failed (${response.status}): ${err}`);
    }

    const data = await response.json();
    await saveToken(
      userId,
      data.access_token,
      data.refresh_token,
      data.expires_in ?? 3600,
      data.scope ?? "",
    );
    logger.info("Canva token refreshed", { userId, category: "canva" });
    return data.access_token;
  }

  // ── Get a valid access token (auto-refresh if expired) ───────────────────

  async getAccessToken(userId: string): Promise<string> {
    const row = await loadToken(userId);
    if (!row) {
      throw new Error("Not authorized with Canva. Please connect your Canva account first.");
    }

    // Refresh 60 s before expiry
    const needsRefresh = row.expiresAt.getTime() - Date.now() < 60_000;
    if (needsRefresh) {
      return this.refreshAccessToken(userId, row.refreshToken);
    }

    return row.accessToken;
  }

  // ── Check if user has connected Canva ────────────────────────────────────

  async isConnected(userId: string): Promise<boolean> {
    const row = await loadToken(userId);
    return !!row;
  }

  // ── Disconnect / revoke ───────────────────────────────────────────────────

  async disconnect(userId: string): Promise<void> {
    const row = await loadToken(userId);
    if (!row) return;

    // Attempt to revoke on Canva side (best-effort)
    try {
      const credentials = Buffer.from(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`).toString("base64");
      await fetch(`${CANVA_BASE_URL}/oauth/revoke`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/x-www-form-urlencoded",
          "Authorization": `Basic ${credentials}`,
        },
        body: new URLSearchParams({ token: row.accessToken }),
      });
    } catch { /* ignore */ }

    await prisma.canvaToken.delete({ where: { userId } });
    logger.info("Canva disconnected", { userId, category: "canva" });
  }

  // ── API helper — authenticated fetch ─────────────────────────────────────

  private async apiFetch(
    userId: string,
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAccessToken(userId);
    return fetch(`${CANVA_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
        ...(options.headers || {}),
      },
    });
  }

  // ── Create a new design ───────────────────────────────────────────────────

  async createDesign(userId: string, options: CanvaDesignOptions): Promise<CanvaDesignResult> {
    // Map friendly type name to Canva design_type_id
    const typeMap: Record<string, string> = {
      "instagram-post":   "instagram-post",
      "twitter-post":     "twitter-post",
      "linkedin-post":    "linkedin-post",
      "youtube-thumbnail":"youtube-thumbnail",
      "presentation":     "presentation",
      "logo":             "logo",
      "infographic":      "infographic",
      "video":            "video",
      "story":            "instagram-story",
      "a4-document":      "a4-document",
      "letter":           "letter",
    };

    const designBody: any = {
      design_type: { type: "preset", name: typeMap[options.type] ?? options.type },
    };

    if (options.templateId) {
      designBody.asset_id = options.templateId;
    }

    const res = await this.apiFetch(userId, "/designs", {
      method: "POST",
      body:   JSON.stringify(designBody),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Canva createDesign failed (${res.status}): ${err}`);
    }

    const data   = await res.json();
    const design = data.design;

    // Autofill content if provided
    if (options.content && options.brandTemplateId) {
      await this.autofillDesign(userId, design.id, options.content, options.brandTemplateId);
    }

    // Export
    const exportUrl = await this.exportDesign(
      userId,
      design.id,
      options.exportFormat ?? "PNG",
      options.quality       ?? "regular"
    );

    return {
      designId:     design.id,
      exportUrl,
      thumbnailUrl: design.thumbnail?.url  ?? "",
      editUrl:      design.urls?.edit_url  ?? `https://www.canva.com/design/${design.id}/edit`,
      viewUrl:      design.urls?.view_url  ?? `https://www.canva.com/design/${design.id}/view`,
      format:       options.exportFormat   ?? "PNG",
      provider:     "Canva",
    };
  }

  // ── Autofill brand template with data ────────────────────────────────────

  async autofillDesign(
    userId: string,
    designId: string,
    content: CanvaDesignOptions["content"],
    brandTemplateId: string
  ): Promise<string> {
    const data: any[] = [];

    if (content?.title)    data.push({ name: "title",    type: "text",  text: content.title });
    if (content?.subtitle) data.push({ name: "subtitle", type: "text",  text: content.subtitle });
    if (content?.bodyText) data.push({ name: "body",     type: "text",  text: content.bodyText });
    if (content?.images?.[0]) {
      data.push({ name: "image", type: "image", asset_id: content.images[0] });
    }

    const res = await this.apiFetch(userId, `/brand-templates/${brandTemplateId}/autofill`, {
      method: "POST",
      body:   JSON.stringify({ data }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.warn("Canva autofill failed (non-fatal)", { err, category: "canva" });
      return designId;
    }

    const result = await res.json();
    return result.design?.id ?? designId;
  }

  // ── Export design to file URL ─────────────────────────────────────────────

  async exportDesign(
    userId: string,
    designId: string,
    format: string,
    quality: string
  ): Promise<string> {
    const res = await this.apiFetch(userId, "/exports", {
      method: "POST",
      body:   JSON.stringify({
        design_id: designId,
        format:    format.toUpperCase(),
        quality:   quality === "draft" ? "1" : quality === "pro" ? "3" : "2",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Canva export request failed (${res.status}): ${err}`);
    }

    const exportData = await res.json();
    const exportId   = exportData.export?.id ?? exportData.job?.id;
    if (!exportId) throw new Error("Canva export: no export ID in response");

    return this.pollExport(userId, exportId);
  }

  // ── Poll export until done ────────────────────────────────────────────────

  private async pollExport(userId: string, exportId: string): Promise<string> {
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));

      const res = await this.apiFetch(userId, `/exports/${exportId}`);
      if (!res.ok) throw new Error(`Canva export poll failed (${res.status})`);

      const data   = await res.json();
      const exp    = data.export ?? data;
      const status = exp.status ?? exp.state;

      if (status === "success" || status === "completed") {
        const url = exp.urls?.[0] ?? exp.url ?? exp.download_url;
        if (!url) throw new Error("Canva export succeeded but no URL returned");
        return url;
      }
      if (status === "failed" || status === "error") {
        throw new Error(`Canva export failed: ${JSON.stringify(exp.error ?? exp)}`);
      }
    }
    throw new Error("Canva export timed out after 60 s");
  }

  // ── Search templates ──────────────────────────────────────────────────────

  async searchTemplates(userId: string, query: string, type?: string): Promise<CanvaTemplate[]> {
    const url = new URL(`${CANVA_BASE_URL}/templates`);
    url.searchParams.set("query", query);
    if (type) url.searchParams.set("design_type", type);

    const res = await this.apiFetch(userId, `/templates?${url.searchParams.toString()}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Canva template search failed (${res.status}): ${err}`);
    }

    const data = await res.json();
    return (data.items ?? []).map((item: any) => ({
      id:        item.id,
      name:      item.name ?? item.title,
      type:      item.design_type ?? item.type,
      thumbnail: item.thumbnail_url ?? item.thumbnail?.url ?? "",
      isPremium: item.is_premium ?? false,
    }));
  }

  // ── List user designs ─────────────────────────────────────────────────────

  async listDesigns(userId: string, limit = 20): Promise<any[]> {
    const res = await this.apiFetch(userId, `/designs?limit=${limit}&ownership=owned`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Canva listDesigns failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    return data.items ?? data.designs ?? [];
  }

  // ── Get Canva user profile ────────────────────────────────────────────────

  async getUserProfile(userId: string): Promise<any> {
    const res = await this.apiFetch(userId, "/users/me");
    if (!res.ok) throw new Error(`Canva profile fetch failed (${res.status})`);
    return res.json();
  }

  // ── Quick-create helpers ──────────────────────────────────────────────────

  async createInstagramPost(userId: string, content: { title: string; image?: string }): Promise<CanvaDesignResult> {
    return this.createDesign(userId, {
      type:         "instagram-post",
      content:      { title: content.title, images: content.image ? [content.image] : undefined },
      exportFormat: "PNG",
    });
  }

  async createYouTubeThumbnail(userId: string, content: { title: string; subtitle?: string; image?: string }): Promise<CanvaDesignResult> {
    return this.createDesign(userId, {
      type:         "youtube-thumbnail",
      content:      { title: content.title, subtitle: content.subtitle, images: content.image ? [content.image] : undefined },
      exportFormat: "PNG",
      quality:      "pro",
    });
  }

  async createPresentation(userId: string, slides: Array<{ title: string; content: string }>): Promise<CanvaDesignResult> {
    return this.createDesign(userId, {
      type:         "presentation",
      content:      { title: slides[0]?.title, bodyText: slides.map(s => `${s.title}\n${s.content}`).join("\n\n") },
      exportFormat: "PDF",
    });
  }
}

// Singleton
export const canvaIntegration = new CanvaIntegration();
export { CanvaIntegration };
