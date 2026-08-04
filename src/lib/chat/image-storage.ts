/**
 * Image Storage — persists generated images so they survive chat reloads.
 *
 * Problem: Generated images were inlined as base64 data URIs in the SSE stream,
 * then stripped before saving to the database (to avoid context bloat). Result:
 * images visible during chat but gone after reload.
 *
 * Solution: Save the image bytes to disk under public/generated-images/,
 * return a real URL that persists. The URL stays in the message content and
 * renders correctly on reload.
 */

import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const IMAGE_DIR = path.join(process.cwd(), 'public', 'generated-images');
const IMAGE_URL_PREFIX = '/generated-images';

// Ensure the directory exists
let dirReady = false;
async function ensureDir() {
  if (dirReady) return;
  try {
    await fs.mkdir(IMAGE_DIR, { recursive: true });
    dirReady = true;
  } catch {
    // May fail in read-only environments — fall back to data URI
  }
}

/**
 * Save a generated image (base64 data URI) to disk and return a public URL.
 * If saving fails (e.g., read-only filesystem), returns the original data URI
 * as a fallback so the image at least renders in the current session.
 */
export async function saveGeneratedImage(
  dataUri: string,
  conversationId?: string,
): Promise<string> {
  // If it's not a data URI, return as-is (already a URL)
  if (!dataUri.startsWith('data:image/')) {
    return dataUri;
  }

  try {
    await ensureDir();

    // Parse the data URI
    const match = dataUri.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!match) return dataUri;

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1] === 'png' ? 'png' : 'png';
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Generate a unique filename: convId-timestamp-hash.ext
    const hash = crypto.createHash('md5').update(base64Data).digest('hex').substring(0, 8);
    const timestamp = Date.now();
    const convPart = conversationId ? conversationId.substring(0, 12) : 'img';
    const filename = `${convPart}-${timestamp}-${hash}.${ext}`;
    const filepath = path.join(IMAGE_DIR, filename);

    // Write to disk
    await fs.writeFile(filepath, buffer);

    // Return the public URL path
    return `${IMAGE_URL_PREFIX}/${filename}`;
  } catch (err) {
    console.warn('[ImageStorage] Failed to save image, using data URI fallback:', err);
    return dataUri;
  }
}

/**
 * Replace all data:image URIs in a text with persisted URLs.
 * Used by the chat route before saving messages.
 */
export async function persistImagesInText(
  text: string,
  conversationId?: string,
): Promise<string> {
  // Match markdown image tags with data URIs: ![alt](data:image/...)
  const dataUriPattern = /!\[([^\]]*)\]\((data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+)\)/g;

  let result = text;
  const matches = [...text.matchAll(dataUriPattern)];

  for (const match of matches) {
    const alt = match[1] || '';
    const dataUri = match[2];
    const url = await saveGeneratedImage(dataUri, conversationId);
    const replacement = `![${alt}](${url})`;
    result = result.replace(match[0], replacement);
  }

  return result;
}
