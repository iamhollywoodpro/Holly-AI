// Google Drive List Files API
// Lists files from Google Drive
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';


export async function POST(req: NextRequest) {
  try {
    const { folderId, pageSize = 100, userId } = await req.json();

    // TODO: Implement actual Google Drive list API
    const result = {
      success: true,
      files: [
        { id: '1', name: 'example.pdf', mimeType: 'application/pdf', size: 1024000 },
        { id: '2', name: 'document.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 512000 }
      ],
      nextPageToken: null,
      totalFiles: 2,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
