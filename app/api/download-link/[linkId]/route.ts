// Download Link Access API
import { NextRequest, NextResponse } from 'next/server';
import { 
  getDownloadLink, 
  verifyDownloadAccess, 
  recordDownload 
} from '@/lib/downloads/download-link-service';

export const runtime = 'nodejs';

// GET /api/download-link/[linkId] - Get link info (no download)
export async function GET(
  req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const linkId = params.linkId;
    
    const link = await getDownloadLink(linkId);
    
    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }
    
    // Return public info (hide sensitive data)
    return NextResponse.json({
      success: true,
      link: {
        linkId: link.linkId,
        fileName: link.fileName,
        fileType: link.fileType,
        fileSize: link.fileSize,
        mimeType: link.mimeType,
        title: link.title,
        description: link.description,
        tags: link.tags,
        expiresAt: link.expiresAt,
        maxDownloads: link.maxDownloads,
        downloadCount: link.downloadCount,
        isRevoked: link.isRevoked,
        hasPassword: link.hasPassword,
        createdAt: link.createdAt,
      },
    });
    
  } catch (error: any) {
    console.error('Get download link error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get download link' },
      { status: 500 }
    );
  }
}

// POST /api/download-link/[linkId] - Verify access and get download URL
export async function POST(
  req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  try {
    const linkId = params.linkId;
    const body = await req.json();
    const password = body.password;
    
    // Get client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    
    // Verify access
    const verification = await verifyDownloadAccess(linkId, password, ip);
    
    if (!verification.allowed) {
      return NextResponse.json(
        { 
          error: verification.reason,
          requiresPassword: verification.reason === 'Password required',
        },
        { status: 403 }
      );
    }
    
    // Record download
    await recordDownload(linkId, ip);
    
    // Return download info
    const link = verification.link;
    
    return NextResponse.json({
      success: true,
      download: {
        fileName: link.fileName,
        fileSize: link.fileSize,
        mimeType: link.mimeType,
        storagePath: link.storagePath, // Frontend will use this to fetch the file
      },
    });
    
  } catch (error: any) {
    console.error('Verify download link error:', error);
    
    return NextResponse.json(
      { error: 'Failed to verify download link' },
      { status: 500 }
    );
  }
}
