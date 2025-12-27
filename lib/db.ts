import { sql } from '@vercel/postgres';
import { Card } from './types';

// Normalize theme for consistent caching (lowercase, trimmed, remove extra spaces)
export function normalizeTheme(theme: string): string {
  return theme.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Normalize prompt for image caching
export function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 100);
}

// Initialize database tables
export async function initDatabase() {
  try {
    // Create theme_cards table
    await sql`
      CREATE TABLE IF NOT EXISTS theme_cards (
        id SERIAL PRIMARY KEY,
        theme_key VARCHAR(255) UNIQUE NOT NULL,
        original_theme VARCHAR(255) NOT NULL,
        cards JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        use_count INTEGER DEFAULT 1
      )
    `;

    // Create card_images table
    await sql`
      CREATE TABLE IF NOT EXISTS card_images (
        id SERIAL PRIMARY KEY,
        prompt_key VARCHAR(255) UNIQUE NOT NULL,
        r2_url VARCHAR(512) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create games table
    await sql`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(10) NOT NULL,
        player1_name VARCHAR(100),
        player1_theme VARCHAR(255),
        player2_name VARCHAR(100),
        player2_theme VARCHAR(255),
        winner_name VARCHAR(100),
        match_score VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP
      )
    `;

    console.log('[DB] Database tables initialized');
    return true;
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error);
    return false;
  }
}

// ============ Theme Cards Cache ============

export interface CachedTheme {
  id: number;
  theme_key: string;
  original_theme: string;
  cards: Card[];
  created_at: Date;
  use_count: number;
}

// Get cached cards for a theme
export async function getCachedThemeCards(theme: string): Promise<Card[] | null> {
  try {
    const themeKey = normalizeTheme(theme);
    
    const result = await sql<CachedTheme>`
      SELECT cards FROM theme_cards WHERE theme_key = ${themeKey}
    `;
    
    if (result.rows.length > 0) {
      // Increment use count
      await sql`
        UPDATE theme_cards SET use_count = use_count + 1 WHERE theme_key = ${themeKey}
      `;
      
      console.log(`[DB] Cache hit for theme: "${theme}"`);
      return result.rows[0].cards as unknown as Card[];
    }
    
    return null;
  } catch (error) {
    console.error('[DB] Error getting cached theme cards:', error);
    return null;
  }
}

// Store cards for a theme in cache
export async function cacheThemeCards(theme: string, cards: Card[]): Promise<boolean> {
  try {
    const themeKey = normalizeTheme(theme);
    
    await sql`
      INSERT INTO theme_cards (theme_key, original_theme, cards)
      VALUES (${themeKey}, ${theme}, ${JSON.stringify(cards)})
      ON CONFLICT (theme_key) DO UPDATE SET
        cards = ${JSON.stringify(cards)},
        use_count = theme_cards.use_count + 1
    `;
    
    console.log(`[DB] Cached cards for theme: "${theme}"`);
    return true;
  } catch (error) {
    console.error('[DB] Error caching theme cards:', error);
    return false;
  }
}

// ============ Image Cache ============

export interface CachedImage {
  id: number;
  prompt_key: string;
  r2_url: string;
  created_at: Date;
}

// Get cached image URL for a prompt
export async function getCachedImageUrl(prompt: string): Promise<string | null> {
  try {
    const promptKey = normalizePrompt(prompt);
    
    const result = await sql<CachedImage>`
      SELECT r2_url FROM card_images WHERE prompt_key = ${promptKey}
    `;
    
    if (result.rows.length > 0) {
      console.log(`[DB] Image cache hit for prompt: "${prompt.slice(0, 30)}..."`);
      return result.rows[0].r2_url;
    }
    
    return null;
  } catch (error) {
    console.error('[DB] Error getting cached image:', error);
    return null;
  }
}

// Store image URL in cache
export async function cacheImageUrl(prompt: string, r2Url: string): Promise<boolean> {
  try {
    const promptKey = normalizePrompt(prompt);
    
    await sql`
      INSERT INTO card_images (prompt_key, r2_url)
      VALUES (${promptKey}, ${r2Url})
      ON CONFLICT (prompt_key) DO UPDATE SET r2_url = ${r2Url}
    `;
    
    console.log(`[DB] Cached image for prompt: "${prompt.slice(0, 30)}..."`);
    return true;
  } catch (error) {
    console.error('[DB] Error caching image:', error);
    return false;
  }
}

// ============ Game History ============

export interface GameRecord {
  id: number;
  room_id: string;
  player1_name: string;
  player1_theme: string;
  player2_name: string;
  player2_theme: string;
  winner_name: string | null;
  match_score: string | null;
  created_at: Date;
  ended_at: Date | null;
}

// Record a new game starting
export async function recordGameStart(
  roomId: string,
  player1Name: string,
  player1Theme: string,
  player2Name: string,
  player2Theme: string
): Promise<number | null> {
  try {
    const result = await sql`
      INSERT INTO games (room_id, player1_name, player1_theme, player2_name, player2_theme)
      VALUES (${roomId}, ${player1Name}, ${player1Theme}, ${player2Name}, ${player2Theme})
      RETURNING id
    `;
    
    console.log(`[DB] Recorded game start: ${roomId}`);
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('[DB] Error recording game start:', error);
    return null;
  }
}

// Record game ending
export async function recordGameEnd(
  roomId: string,
  winnerName: string | null,
  matchScore: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE games 
      SET winner_name = ${winnerName}, 
          match_score = ${matchScore},
          ended_at = NOW()
      WHERE room_id = ${roomId} AND ended_at IS NULL
    `;
    
    console.log(`[DB] Recorded game end: ${roomId}, winner: ${winnerName}`);
    return true;
  } catch (error) {
    console.error('[DB] Error recording game end:', error);
    return false;
  }
}

// Get recent games
export async function getRecentGames(limit: number = 10): Promise<GameRecord[]> {
  try {
    const result = await sql<GameRecord>`
      SELECT * FROM games ORDER BY created_at DESC LIMIT ${limit}
    `;
    return result.rows;
  } catch (error) {
    console.error('[DB] Error getting recent games:', error);
    return [];
  }
}

// Get popular themes
export async function getPopularThemes(limit: number = 10): Promise<{ theme: string; count: number }[]> {
  try {
    const result = await sql`
      SELECT original_theme as theme, use_count as count 
      FROM theme_cards 
      ORDER BY use_count DESC 
      LIMIT ${limit}
    `;
    return result.rows as { theme: string; count: number }[];
  } catch (error) {
    console.error('[DB] Error getting popular themes:', error);
    return [];
  }
}

