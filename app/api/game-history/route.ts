import { NextRequest, NextResponse } from "next/server";
import { 
  recordGameStart, 
  recordGameEnd, 
  getRecentGames,
  getPopularThemes,
  initDatabase 
} from "@/lib/db";

const POSTGRES_URL = process.env.POSTGRES_URL;

// Initialize database on first request
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized && POSTGRES_URL) {
    await initDatabase();
    dbInitialized = true;
  }
}

// Record game start or end
export async function POST(request: NextRequest) {
  if (!POSTGRES_URL) {
    return NextResponse.json({ success: false, error: "Database not configured" });
  }

  try {
    await ensureDbInitialized();
    
    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      const { roomId, player1Name, player1Theme, player2Name, player2Theme } = body;
      
      const gameId = await recordGameStart(
        roomId,
        player1Name,
        player1Theme,
        player2Name,
        player2Theme
      );

      return NextResponse.json({ success: true, gameId });
    }

    if (action === "end") {
      const { roomId, winnerName, matchScore } = body;
      
      const success = await recordGameEnd(roomId, winnerName, matchScore);
      
      return NextResponse.json({ success });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'start' or 'end'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error recording game:", error);
    return NextResponse.json(
      { error: "Failed to record game" },
      { status: 500 }
    );
  }
}

// Get game stats
export async function GET(request: NextRequest) {
  if (!POSTGRES_URL) {
    return NextResponse.json({ 
      recentGames: [],
      popularThemes: [],
      configured: false 
    });
  }

  try {
    await ensureDbInitialized();
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";

    if (type === "recent") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const games = await getRecentGames(limit);
      return NextResponse.json({ games });
    }

    if (type === "themes") {
      const limit = parseInt(searchParams.get("limit") || "10");
      const themes = await getPopularThemes(limit);
      return NextResponse.json({ themes });
    }

    // Return all stats
    const [recentGames, popularThemes] = await Promise.all([
      getRecentGames(10),
      getPopularThemes(10),
    ]);

    return NextResponse.json({
      recentGames,
      popularThemes,
      configured: true,
    });
  } catch (error) {
    console.error("Error getting game stats:", error);
    return NextResponse.json(
      { error: "Failed to get game stats" },
      { status: 500 }
    );
  }
}

