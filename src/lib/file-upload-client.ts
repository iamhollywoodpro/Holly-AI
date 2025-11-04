// lib/file-upload-client.ts - Client-side file upload helper
// Calls server-side API route to bypass RLS issues

export interface UploadResult {
  success: boolean;
  publicUrl?: string;
  fileType?: string;
  error?: string;
}

/**
 * Upload a file via server-side API route
 * This bypasses Supabase RLS by using service role key on the backend
 */
export async function uploadFileViaAPI(
  file: File,
  userId?: string,
  conversationId?: string
): Promise<UploadResult> {
  try {
    console.log('[uploadFileViaAPI] Starting upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: userId || 'guest',
      conversationId: conversationId || 'none'
    });

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('userId', userId);
    if (conversationId) formData.append('conversationId', conversationId);

    // Call server-side API route
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[uploadFileViaAPI] Server error:', errorData);
      return {
        success: false,
        error: errorData.error || 'Upload failed'
      };
    }

    const result = await response.json();
    console.log('[uploadFileViaAPI] Upload successful:', result);

    return result;
  } catch (error) {
    console.error('[uploadFileViaAPI] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
