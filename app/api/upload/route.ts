// app/api/upload/route.ts - Server-side file upload handler
// Bypasses Supabase RLS by using service role key

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Server-side client with SERVICE ROLE KEY (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const STORAGE_BUCKETS = {
  audio: 'holly-audio',
  video: 'holly-video',
  images: 'holly-images',
  code: 'holly-code',
  documents: 'holly-documents',
  data: 'holly-data'
} as const;

const FILE_TYPE_MAP: Record<string, keyof typeof STORAGE_BUCKETS> = {
  mp3: 'audio', wav: 'audio', ogg: 'audio', m4a: 'audio', flac: 'audio', aac: 'audio',
  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',
  jpg: 'images', jpeg: 'images', png: 'images', gif: 'images', webp: 'images', svg: 'images',
  js: 'code', ts: 'code', tsx: 'code', jsx: 'code', py: 'code', css: 'code', html: 'code', json: 'code',
  pdf: 'documents', txt: 'documents', doc: 'documents', docx: 'documents', md: 'documents',
  csv: 'data', xlsx: 'data', xls: 'data', xml: 'data', sql: 'data'
};

export async function POST(request: NextRequest) {
  try {
    console.log('[API /upload] Request received');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const conversationId = formData.get('conversationId') as string;

    if (!file) {
      console.error('[API /upload] No file in request');
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log('[API /upload] File received:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension) {
      return NextResponse.json(
        { success: false, error: 'Invalid file name' },
        { status: 400 }
      );
    }

    // Determine bucket
    const bucketType = FILE_TYPE_MAP[fileExtension];
    if (!bucketType) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: .${fileExtension}` },
        { status: 400 }
      );
    }

    const bucketName = STORAGE_BUCKETS[bucketType];
    console.log('[API /upload] Target bucket:', bucketName);

    // Generate unique file path
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${timestamp}_${randomString}_${safeName}`;

    console.log('[API /upload] Generated path:', filePath);

    // Convert File to ArrayBuffer for Supabase
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload using SERVICE ROLE KEY (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[API /upload] Upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    console.log('[API /upload] Upload successful');

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('[API /upload] Could not generate public URL');
      return NextResponse.json(
        { success: false, error: 'Could not generate public URL' },
        { status: 500 }
      );
    }

    console.log('[API /upload] Public URL:', urlData.publicUrl);

    // Save metadata to database
    try {
      const { error: dbError } = await supabaseAdmin
        .from('holly_file_uploads')
        .insert({
          user_id: userId || null,
          conversation_id: conversationId || null,
          file_name: file.name,
          file_type: bucketType,
          file_size: file.size,
          storage_path: filePath,
          bucket_name: bucketName,
          public_url: urlData.publicUrl,
          mime_type: file.type
        });

      if (dbError) {
        console.error('[API /upload] Database error:', dbError);
        // Don't fail the upload if database insert fails
      }
    } catch (dbError) {
      console.error('[API /upload] Database exception:', dbError);
    }

    return NextResponse.json({
      success: true,
      publicUrl: urlData.publicUrl,
      fileType: bucketType
    });

  } catch (error) {
    console.error('[API /upload] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
