import { put } from '@vercel/blob';

// Check if Vercel Blob is configured
export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// Generate a unique filename from prompt
function generateFilename(prompt: string): string {
  // Create a simple hash from the prompt
  const hash = prompt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 50);
  
  // Add timestamp for uniqueness
  const timestamp = Date.now().toString(36);
  
  return `cards/${hash}-${timestamp}.jpg`;
}

// Upload image to Vercel Blob and return the public URL
export async function uploadImageToBlob(
  imageBuffer: Buffer,
  prompt: string
): Promise<string | null> {
  if (!isBlobConfigured()) {
    console.warn('[Blob] Vercel Blob not configured, skipping upload');
    return null;
  }

  try {
    const filename = generateFilename(prompt);
    
    const blob = await put(filename, imageBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    console.log(`[Blob] Uploaded image: ${blob.url}`);
    return blob.url;
  } catch (error) {
    console.error('[Blob] Failed to upload image:', error);
    return null;
  }
}

// Convert base64 string to Buffer
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

