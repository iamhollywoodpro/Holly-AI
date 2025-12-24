/**
 * Client-side file upload to Vercel Blob
 * Bypasses API route size limits by uploading directly from browser
 */

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadFileToBlob(
  file: File,
  folder: 'audio' | 'images' = 'audio',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Create FormData with the file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress({
            loaded: e.loaded,
            total: e.total,
            percentage: Math.round((e.loaded / e.total) * 100),
          });
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              success: true,
              url: response.url,
            });
          } catch (error) {
            reject({
              success: false,
              error: 'Failed to parse response',
            });
          }
        } else {
          reject({
            success: false,
            error: `Upload failed with status ${xhr.status}`,
          });
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject({
          success: false,
          error: 'Network error during upload',
        });
      });

      xhr.addEventListener('abort', () => {
        reject({
          success: false,
          error: 'Upload cancelled',
        });
      });

      // Send request
      xhr.open('POST', '/api/upload/client');
      xhr.send(formData);
    });
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}
