import { NextRequest, NextResponse } from "next/server";

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";
const MODEL = "@cf/black-forest-labs/flux-1-schnell";

// Simple in-memory cache to avoid regenerating the same images
const imageCache = new Map<string, string>();
const MAX_CACHE_SIZE = 100;

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = prompt.slice(0, 100).toLowerCase().trim();
    if (imageCache.has(cacheKey)) {
      return NextResponse.json({ image: imageCache.get(cacheKey) });
    }

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

    // Cloudflare returns binary image data
    const imageBuffer = await cfResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const dataUrl = `data:image/png;base64,${base64Image}`;

    // Cache the result
    if (imageCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = imageCache.keys().next().value;
      if (firstKey) imageCache.delete(firstKey);
    }
    imageCache.set(cacheKey, dataUrl);

    return NextResponse.json({ image: dataUrl });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
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

