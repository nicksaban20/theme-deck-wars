import { NextRequest, NextResponse } from "next/server";
import { getCachedImageUrl, cacheImageUrl, initDatabase } from "@/lib/db";
import { uploadImageToBlob, base64ToBuffer, isBlobConfigured } from "@/lib/blob";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const POSTGRES_URL = process.env.POSTGRES_URL;

// Local diffusion configuration (AUTOMATIC1111 WebUI)
const LOCAL_DIFFUSION_ENABLED = process.env.LOCAL_DIFFUSION_ENABLED === "true";
const LOCAL_DIFFUSION_URL = process.env.LOCAL_DIFFUSION_URL || "http://127.0.0.1:7860";

// GGUF local diffusion configuration (sd-api-server / WasmEdge)
const LOCAL_GGUF_URL = process.env.LOCAL_GGUF_URL || "http://127.0.0.1:8080";

const CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
const MODEL = "@cf/black-forest-labs/flux-1-schnell";

// Simple in-memory cache as fallback
const memoryCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

// Generate image using local AUTOMATIC1111 WebUI API
async function generateWithLocalDiffusion(prompt: string): Promise<string | null> {
  try {
    console.log(`[Image API] Trying local diffusion at ${LOCAL_DIFFUSION_URL}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${LOCAL_DIFFUSION_URL}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt}, fantasy card game art, high quality, detailed`,
        negative_prompt: "blurry, low quality, text, watermark, signature, ugly, deformed",
        steps: 20,
        width: 512,
        height: 512,
        cfg_scale: 7,
        sampler_name: "Euler a",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Image API] Local diffusion error: ${response.status}`);
      return null;
    }

    const data = await response.json() as { images?: string[] };

    if (data.images && data.images[0]) {
      console.log(`[Image API] Local diffusion success!`);
      return `data:image/png;base64,${data.images[0]}`;
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Image API] Local diffusion timeout`);
    } else {
      console.error(`[Image API] Local diffusion error:`, error);
    }
    return null;
  }
}

// Generate image using GGUF model via sd-api-server (OpenAI-compatible API)
async function generateWithGGUF(prompt: string): Promise<string | null> {
  try {
    console.log(`[Image API] Trying GGUF at ${LOCAL_GGUF_URL}...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for local

    const response = await fetch(`${LOCAL_GGUF_URL}/v1/images/generations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt}, fantasy trading card art, high quality`,
        n: 1,
        size: "512x512",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Image API] GGUF error: ${response.status}`);
      return null;
    }

    const data = await response.json() as { data?: Array<{ b64_json?: string; url?: string }> };

    if (data.data?.[0]?.b64_json) {
      console.log(`[Image API] GGUF success!`);
      return `data:image/png;base64,${data.data[0].b64_json}`;
    } else if (data.data?.[0]?.url) {
      console.log(`[Image API] GGUF success (URL)!`);
      return data.data[0].url;
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Image API] GGUF timeout`);
    } else {
      console.error(`[Image API] GGUF error:`, error);
    }
    return null;
  }
}

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized && POSTGRES_URL) {
    await initDatabase();
    dbInitialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, cardId, artStyle } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Normalize prompt for caching
    const normalizedPrompt = prompt.slice(0, 100).toLowerCase().trim();

    // Initialize database if configured
    await ensureDbInitialized();

    console.log(`[Image API] Processing request for: "${prompt.slice(0, 50)}..."`);
    console.log(`[Image API] Config Status -> Postgres: ${POSTGRES_URL ? 'YES' : 'NO'}, Blob: ${isBlobConfigured() ? 'YES' : 'NO'}`);

    // 1. Check database cache first (persistent)
    if (POSTGRES_URL) {
      try {
        const cachedUrl = await getCachedImageUrl(normalizedPrompt);
        if (cachedUrl) {
          console.log(`[Image API] CACHE HIT! Returning cached image for: ${normalizedPrompt.slice(0, 30)}...`);
          return NextResponse.json({ image: cachedUrl, cached: true });
        }
        console.log(`[Image API] Cache MISS for: ${normalizedPrompt.slice(0, 30)}...`);
      } catch (error) {
        console.error(`[Image API] Error checking database cache:`, error);
        // Continue to generate new image if cache check fails
      }
    }

    // 2. Check in-memory cache (fallback)
    const cacheKey = cardId
      ? `${cardId}-${normalizedPrompt}`
      : normalizedPrompt;

    if (memoryCache.has(cacheKey)) {
      console.log(`[Image API] Memory cache hit for: ${cacheKey.slice(0, 30)}...`);
      return NextResponse.json({ image: memoryCache.get(cacheKey), cached: true });
    }

    console.log(`[Image API] Generating image for: ${prompt.slice(0, 50)}... (artStyle: ${artStyle || 'default'})`);

    let base64Image: string | null = null;
    let imageSource = "unknown";

    // 3. Try GGUF local generation if artStyle is 'local-ai'
    if (artStyle === "local-ai") {
      const ggufImage = await generateWithGGUF(prompt);
      if (ggufImage) {
        // GGUF returns full data URL or URL, extract base64 if needed
        if (ggufImage.startsWith('data:')) {
          const base64Match = ggufImage.match(/base64,(.+)/);
          if (base64Match) {
            base64Image = base64Match[1];
            imageSource = "gguf";
          }
        } else {
          // Direct URL - return it directly
          return NextResponse.json({ image: ggufImage, cached: false, source: "gguf" });
        }
      }
    }

    // 4. Try AUTOMATIC1111 if enabled and not already generated
    if (!base64Image && LOCAL_DIFFUSION_ENABLED) {
      const localImage = await generateWithLocalDiffusion(prompt);
      if (localImage) {
        // Local returns full data URL, extract base64 for consistent handling
        const base64Match = localImage.match(/base64,(.+)/);
        if (base64Match) {
          base64Image = base64Match[1];
          imageSource = "local";
        }
      }
    }

    // 4. Fall back to Cloudflare if local failed or disabled
    // CRITICAL: Do NOT use Cloudflare if user specifically requested 'local-ai'
    if (!base64Image && artStyle !== "local-ai") {
      // Check for Cloudflare credentials
      if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        if (LOCAL_DIFFUSION_ENABLED) {
          console.warn("Local diffusion failed and Cloudflare not configured");
        } else {
          console.warn("Cloudflare credentials not configured, returning error");
        }
        return NextResponse.json(
          { error: "Image generation not configured" },
          { status: 503 }
        );
      }

      // Call Cloudflare Workers AI
      const cfResponse = await fetch(
        `${CF_API_BASE}/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt.slice(0, 200), // Limit prompt length
          }),
        }
      );

      if (!cfResponse.ok) {
        const errorText = await cfResponse.text();
        console.error("Cloudflare AI error:", cfResponse.status, errorText);
        return NextResponse.json(
          { error: "Image generation failed" },
          { status: cfResponse.status }
        );
      }

      // Cloudflare returns JSON with base64 image in result.image
      const cfData = await cfResponse.json() as { result?: { image?: string }; success?: boolean; errors?: unknown[] };

      if (!cfData.result?.image) {
        console.error("Cloudflare AI returned no image:", cfData);
        return NextResponse.json(
          { error: "No image in response" },
          { status: 500 }
        );
      }

      base64Image = cfData.result.image;
      imageSource = "cloudflare";
    }

    if (!base64Image) {
      console.warn(`[Image API] Failed to generate image (Source: ${imageSource})`);
      return NextResponse.json(
        { error: "Failed to generate image" },
        { status: 500 }
      );
    }

    console.log(`[Image API] Successfully generated image via ${imageSource}`);

    // Try to upload to Vercel Blob for persistent storage
    // Default to base64 Data URL (always works)
    let imageUrl = `data:image/png;base64,${base64Image}`;

    // Try to upload to Vercel Blob for persistent storage if configured
    if (isBlobConfigured()) {
      const imageBuffer = base64ToBuffer(base64Image);
      const blobUrl = await uploadImageToBlob(imageBuffer, normalizedPrompt);

      if (blobUrl) {
        imageUrl = blobUrl;
        console.log(`[Image API] Stored image in Vercel Blob: ${blobUrl}`);
      } else {
        console.warn(`[Image API] Blob upload failed, using Data URI`);
      }
    }

    // Cache the final URL in database if Postgres is available
    if (POSTGRES_URL) {
      try {
        await cacheImageUrl(normalizedPrompt, imageUrl);
        console.log(`[Image API] Cached URL in database`);
      } catch (error) {
        console.error(`[Image API] Failed to cache URL in database:`, error);
      }
    }
  } else {
    // No Blob configured, use base64 data URL
    imageUrl = `data:image/png;base64,${base64Image}`;

    // Cache base64 URL in database if Postgres is available
    if (POSTGRES_URL) {
      try {
        await cacheImageUrl(normalizedPrompt, imageUrl);
        console.log(`[Image API] Cached base64 URL in database (Blob not configured)`);
      } catch (error) {
        console.error(`[Image API] Failed to cache base64 URL in database:`, error);
      }
    }
  }

  // Cache in memory as fallback
  if (memoryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) memoryCache.delete(firstKey);
  }
  memoryCache.set(cacheKey, imageUrl);

  return NextResponse.json({ image: imageUrl, cached: false, source: imageSource });
} catch (error) {
  console.error("[Image API] Error generating image:", error);

  // Provide more specific error messages
  if (error instanceof Error) {
    console.error("[Image API] Error details:", error.message);
  }

  // Return error but don't crash - let client handle fallback
  return NextResponse.json(
    {
      error: "Failed to generate image",
      message: error instanceof Error ? error.message : "Unknown error"
    },
    { status: 500 }
  );
}
}

// Also support GET for simple testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get("prompt");

  if (!prompt) {
    return NextResponse.json(
      { error: "Prompt query parameter is required" },
      { status: 400 }
    );
  }

  // Reuse POST logic
  const postRequest = new NextRequest(request.url, {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });

  return POST(postRequest);
}
