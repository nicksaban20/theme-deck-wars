import { NextRequest, NextResponse } from "next/server";
import { getCachedImageUrl, cacheImageUrl, initDatabase } from "@/lib/db";
import { uploadImageToBlob, base64ToBuffer, isBlobConfigured } from "@/lib/blob";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const POSTGRES_URL = process.env.POSTGRES_URL;

const CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
const MODEL = "@cf/black-forest-labs/flux-1-schnell";

// Simple in-memory cache as fallback
const memoryCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

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
    const { prompt, cardId } = await request.json();

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

    // 1. Check database cache first (persistent)
    if (POSTGRES_URL) {
      try {
        const cachedUrl = await getCachedImageUrl(normalizedPrompt);
        if (cachedUrl) {
          console.log(`[Image API] DB cache hit for: ${normalizedPrompt.slice(0, 30)}...`);
          return NextResponse.json({ image: cachedUrl, cached: true });
        }
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
    
    console.log(`[Image API] Generating image for: ${prompt.slice(0, 50)}...`);

    // Check for Cloudflare credentials
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
      console.warn("Cloudflare credentials not configured, returning error");
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

    const base64Image = cfData.result.image;
    console.log(`[Image API] Successfully generated image`);

    // Try to upload to Vercel Blob for persistent storage
    let imageUrl: string;
    
    if (isBlobConfigured()) {
      const imageBuffer = base64ToBuffer(base64Image);
      const blobUrl = await uploadImageToBlob(imageBuffer, normalizedPrompt);
      
      if (blobUrl) {
        imageUrl = blobUrl;
        
        // Cache URL in database
        if (POSTGRES_URL) {
          try {
            await cacheImageUrl(normalizedPrompt, blobUrl);
            console.log(`[Image API] Cached Blob URL in database`);
          } catch (error) {
            console.error(`[Image API] Failed to cache Blob URL in database:`, error);
          }
        }
        
        console.log(`[Image API] Stored image in Vercel Blob: ${blobUrl}`);
      } else {
        // Fall back to base64 data URL
        imageUrl = `data:image/jpeg;base64,${base64Image}`;
        
        // Still cache base64 URL in database if Postgres is available
        if (POSTGRES_URL) {
          try {
            await cacheImageUrl(normalizedPrompt, imageUrl);
            console.log(`[Image API] Cached base64 URL in database (Blob upload failed)`);
          } catch (error) {
            console.error(`[Image API] Failed to cache base64 URL in database:`, error);
          }
        }
      }
    } else {
      // No Blob configured, use base64 data URL
      imageUrl = `data:image/jpeg;base64,${base64Image}`;
      
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

    return NextResponse.json({ image: imageUrl, cached: false });
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
