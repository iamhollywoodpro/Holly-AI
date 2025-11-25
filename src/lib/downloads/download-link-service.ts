/**
 * HOLLY Download Link Service
 * 
 * Manages secure, expiring download links for generated files
 * - Generate short, shareable links
 * - Set expiration and download limits
 * - Track analytics (download count, IPs)
 * - Password protection (optional)
 * - Integration with Work Log
 * 
 * @author HOLLY AI System
 */

import { PrismaClient } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Expiration presets
export const EXPIRATION_PRESETS = {
  '1hour': 1 * 60 * 60 * 1000,
  '24hours': 24 * 60 * 60 * 1000,
  '7days': 7 * 24 * 60 * 60 * 1000,
  '30days': 30 * 24 * 60 * 60 * 1000,
  'never': null,
} as const;

export type ExpirationPreset = keyof typeof EXPIRATION_PRESETS;

export interface CreateDownloadLinkOptions {
  userId: string;
  conversationId?: string;
  fileName: string;
  fileType: 'image' | 'audio' | 'video' | 'document' | 'code' | 'other';
  fileSize: number;
  storagePath: string;
  mimeType: string;
  
  // Optional security
  password?: string;
  expiration?: ExpirationPreset | number; // Preset or custom milliseconds
  maxDownloads?: number;
  
  // Optional metadata
  title?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  
  // Work Log integration
  generatedBy?: string;
  generationTime?: number;
}

export interface DownloadLinkInfo {
  id: string;
  linkId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  mimeType: string;
  title?: string;
  description?: string;
  tags: string[];
  expiresAt?: Date;
  maxDownloads?: number;
  downloadCount: number;
  isRevoked: boolean;
  hasPassword: boolean;
  createdAt: Date;
  shareUrl: string;
}

/**
 * Generate a short, URL-safe link ID
 */
function generateLinkId(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Hash a password securely
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Hash an IP address for privacy
 */
function hashIp(ip: string): string {
  return createHash('sha256').update(ip + process.env.IP_SALT || 'holly-salt').digest('hex').substring(0, 16);
}

/**
 * Create a new download link
 */
export async function createDownloadLink(
  options: CreateDownloadLinkOptions
): Promise<DownloadLinkInfo> {
  // Generate unique link ID
  let linkId = generateLinkId();
  let attempts = 0;
  
  while (attempts < 10) {
    const existing = await prisma.downloadLink.findUnique({
      where: { linkId },
    });
    
    if (!existing) break;
    
    linkId = generateLinkId();
    attempts++;
  }
  
  if (attempts >= 10) {
    throw new Error('Failed to generate unique link ID');
  }
  
  // Calculate expiration
  let expiresAt: Date | null = null;
  
  if (options.expiration) {
    if (typeof options.expiration === 'string') {
      const ms = EXPIRATION_PRESETS[options.expiration];
      if (ms) {
        expiresAt = new Date(Date.now() + ms);
      }
    } else {
      expiresAt = new Date(Date.now() + options.expiration);
    }
  }
  
  // Hash password if provided
  const hashedPassword = options.password ? hashPassword(options.password) : null;
  
  // Create link
  const link = await prisma.downloadLink.create({
    data: {
      userId: options.userId,
      conversationId: options.conversationId,
      linkId,
      fileName: options.fileName,
      fileType: options.fileType,
      fileSize: options.fileSize,
      storagePath: options.storagePath,
      mimeType: options.mimeType,
      password: hashedPassword,
      expiresAt,
      maxDownloads: options.maxDownloads,
      title: options.title,
      description: options.description,
      tags: options.tags || [],
      metadata: options.metadata || {},
      generatedBy: options.generatedBy,
      generationTime: options.generationTime,
    },
  });
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = `${baseUrl}/download/${linkId}`;
  
  return {
    id: link.id,
    linkId: link.linkId,
    fileName: link.fileName,
    fileType: link.fileType,
    fileSize: link.fileSize,
    mimeType: link.mimeType,
    title: link.title || undefined,
    description: link.description || undefined,
    tags: (link.tags as string[]) || [],
    expiresAt: link.expiresAt || undefined,
    maxDownloads: link.maxDownloads || undefined,
    downloadCount: link.downloadCount,
    isRevoked: !!link.revokedAt,
    hasPassword: !!link.password,
    createdAt: link.createdAt,
    shareUrl,
  };
}

/**
 * Get download link info by linkId
 */
export async function getDownloadLink(
  linkId: string
): Promise<DownloadLinkInfo | null> {
  const link = await prisma.downloadLink.findUnique({
    where: { linkId },
  });
  
  if (!link) return null;
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const shareUrl = `${baseUrl}/download/${linkId}`;
  
  return {
    id: link.id,
    linkId: link.linkId,
    fileName: link.fileName,
    fileType: link.fileType,
    fileSize: link.fileSize,
    mimeType: link.mimeType,
    title: link.title || undefined,
    description: link.description || undefined,
    tags: (link.tags as string[]) || [],
    expiresAt: link.expiresAt || undefined,
    maxDownloads: link.maxDownloads || undefined,
    downloadCount: link.downloadCount,
    isRevoked: !!link.revokedAt,
    hasPassword: !!link.password,
    createdAt: link.createdAt,
    shareUrl,
  };
}

/**
 * Verify download access
 */
export async function verifyDownloadAccess(
  linkId: string,
  password?: string,
  ipAddress?: string
): Promise<{ allowed: boolean; reason?: string; link?: any }> {
  const link = await prisma.downloadLink.findUnique({
    where: { linkId },
  });
  
  if (!link) {
    return { allowed: false, reason: 'Link not found' };
  }
  
  // Check if revoked
  if (!!link.revokedAt) {
    return { allowed: false, reason: 'Link has been revoked' };
  }
  
  // Check expiration
  if (link.expiresAt && new Date() > link.expiresAt) {
    return { allowed: false, reason: 'Link has expired' };
  }
  
  // Check download limit
  if (link.maxDownloads && link.downloadCount >= link.maxDownloads) {
    return { allowed: false, reason: 'Download limit reached' };
  }
  
  // Check password
  if (link.password) {
    if (!password) {
      return { allowed: false, reason: 'Password required' };
    }
    
    const hashedInput = hashPassword(password);
    if (hashedInput !== link.password) {
      return { allowed: false, reason: 'Incorrect password' };
    }
  }
  
  return { allowed: true, link };
}

/**
 * Record a download
 */
export async function recordDownload(
  linkId: string,
  ipAddress?: string
): Promise<void> {
  const hashedIp = ipAddress ? hashIp(ipAddress) : 'unknown';
  
  await prisma.downloadLink.update({
    where: { linkId },
    data: {
      downloadCount: { increment: 1 },
      lastDownloadAt: new Date(),
      downloadIps: {
        push: hashedIp,
      },
    },
  });
}

/**
 * Revoke a download link
 */
export async function revokeDownloadLink(
  linkId: string,
  userId: string
): Promise<boolean> {
  const link = await prisma.downloadLink.findUnique({
    where: { linkId },
  });
  
  if (!link || link.userId !== userId) {
    return false;
  }
  
  await prisma.downloadLink.update({
    where: { linkId },
    data: {
      revokedAt: new Date(),
    },
  });
  
  return true;
}

/**
 * Get user's download links
 */
export async function getUserDownloadLinks(
  userId: string,
  limit: number = 50
): Promise<DownloadLinkInfo[]> {
  const links = await prisma.downloadLink.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return links.map(link => ({
    id: link.id,
    linkId: link.linkId,
    fileName: link.fileName,
    fileType: link.fileType,
    fileSize: link.fileSize,
    mimeType: link.mimeType,
    title: link.title || undefined,
    description: link.description || undefined,
    tags: (link.tags as string[]) || [],
    expiresAt: link.expiresAt || undefined,
    maxDownloads: link.maxDownloads || undefined,
    downloadCount: link.downloadCount,
    isRevoked: !!link.revokedAt,
    hasPassword: !!link.password,
    createdAt: link.createdAt,
    shareUrl: `${baseUrl}/download/${link.linkId}`,
  }));
}

/**
 * Cleanup expired links (called by cron)
 */
export async function cleanupExpiredLinks(): Promise<{
  deletedCount: number;
}> {
  const now = new Date();
  
  const result = await prisma.downloadLink.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { revokedAt: { not: null, lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } }, // Delete revoked links after 7 days
      ],
    },
  });
  
  return { deletedCount: result.count };
}

export default {
  createDownloadLink,
  getDownloadLink,
  verifyDownloadAccess,
  recordDownload,
  revokeDownloadLink,
  getUserDownloadLinks,
  cleanupExpiredLinks,
};
