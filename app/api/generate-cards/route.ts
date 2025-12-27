import { NextRequest, NextResponse } from "next/server";
import { Card, CardColor } from "@/lib/types";
import { getCachedThemeCards, cacheThemeCards, initDatabase } from "@/lib/db";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const POSTGRES_URL = process.env.POSTGRES_URL;

// Initialize database on first request (only if configured)
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized && POSTGRES_URL) {
    await initDatabase();
    dbInitialized = true;
  }
}

const CARD_COLORS: CardColor[] = ["amber", "crimson", "emerald", "violet", "cyan", "rose", "slate"];

const DEFAULT_CARD_COUNT = 7; // Draft mode: generate 7, pick 5

// Common game icon keywords for mapping
const ICON_KEYWORDS = [
  "sword", "shield", "skull", "fire", "lightning", "heart", "star", "crown",
  "dragon", "wolf", "eagle", "snake", "spider", "castle", "tower", "gem",
  "potion", "scroll", "book", "wand", "staff", "bow", "arrow", "axe",
  "hammer", "dagger", "claw", "fist", "boot", "helmet", "armor", "ring",
  "eye", "moon", "sun", "cloud", "leaf", "tree", "mountain", "wave",
  "bomb", "trap", "key", "lock", "chain", "wing", "horn", "skull-crossbones"
];

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeResponse {
  content: Array<{ type: "text"; text: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const { theme, playerId, roomId, partyHost, count = DEFAULT_CARD_COUNT } = await request.json();

    if (!theme) {
      return NextResponse.json(
        { error: "Theme is required" },
        { status: 400 }
      );
    }

    const cardCount = Math.min(Math.max(count, 5), 10); // Between 5 and 10

    // Initialize database if configured
    await ensureDbInitialized();

    // Check cache for existing cards for this theme
    if (POSTGRES_URL) {
      try {
        const cachedCards = await getCachedThemeCards(theme);
        if (cachedCards && cachedCards.length > 0) {
          console.log(`[Cards] Using cached cards for theme: "${theme}"`);
          
          // Assign new IDs to cached cards for this player
          const cardsWithIds = cachedCards.map((card, index) => ({
            ...card,
            id: `${playerId || 'card'}-${index}-${Date.now()}`,
          }));
          
          if (partyHost && roomId && playerId) {
            await sendCardsToParty(partyHost, roomId, playerId, cardsWithIds, cardCount > 5);
          }
          
          return NextResponse.json({ cards: cardsWithIds, cached: true });
        }
      } catch (error) {
        console.error(`[Cards] Error checking database cache:`, error);
        // Continue to generate new cards if cache check fails
      }
    }

    if (!ANTHROPIC_API_KEY) {
      console.warn("No ANTHROPIC_API_KEY found, using mock cards");
      const mockCards = generateMockCards(theme, cardCount);
      
      if (partyHost && roomId && playerId) {
        await sendCardsToParty(partyHost, roomId, playerId, mockCards, cardCount > 5);
      }
      
      return NextResponse.json({ cards: mockCards });
    }

    const prompt = `Generate exactly ${cardCount} unique trading card game cards based on the theme: "${theme}"

Each card must have:
- name: A creative name related to the theme (2-4 words max)
- attack: A number between 1 and 8
- defense: A number between 1 and 6
- ability: A short special ability (one sentence, should reference game mechanics like "bonus damage", "first round", "low HP", etc.)
- flavorText: A funny or thematic one-liner quote
- color: One of: amber, crimson, emerald, violet, cyan, rose, slate (pick colors that match the card's personality)
- imagePrompt: A short, vivid description for AI art generation (e.g., "fierce warrior with glowing sword, dark fantasy style, dramatic lighting")
- iconKeyword: A single word for icon mapping, must be one of: ${ICON_KEYWORDS.slice(0, 30).join(", ")}

Important:
- Make cards balanced (higher attack = lower defense generally)
- Make abilities varied and interesting - include some powerful abilities and some situational ones
- Keep flavor text witty and theme-appropriate
- Each card should feel unique within the set
- Create a mix of aggressive (high attack) and defensive (high defense) cards
- Include 1-2 "star" cards that are clearly more powerful but balanced with situational abilities
- Make imagePrompt descriptive but concise (under 100 characters), suitable for fantasy card art
- Choose iconKeyword that best represents the card's theme or ability

Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "cards": [
    {
      "name": "Example Name",
      "attack": 5,
      "defense": 3,
      "ability": "Deal 2 bonus damage if this is the first round",
      "flavorText": "A witty quote here",
      "color": "violet",
      "imagePrompt": "mystical warrior with glowing purple aura, fantasy art style",
      "iconKeyword": "sword"
    }
  ]
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3500,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ] as ClaudeMessage[],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      
      const mockCards = generateMockCards(theme, cardCount);
      if (partyHost && roomId && playerId) {
        await sendCardsToParty(partyHost, roomId, playerId, mockCards, cardCount > 5);
      }
      return NextResponse.json({ cards: mockCards });
    }

    const data = (await response.json()) as ClaudeResponse;
    const textContent = data.content.find((c) => c.type === "text");
    
    if (!textContent) {
      throw new Error("No text content in response");
    }

    let cards: Card[];
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsed = JSON.parse(jsonMatch[0]);
      cards = parsed.cards.map((card: Omit<Card, 'id'>, index: number) => ({
        ...card,
        id: `${playerId || 'card'}-${index}-${Date.now()}`,
        // Ensure art fields exist with fallbacks
        imagePrompt: card.imagePrompt || `${card.name}, fantasy trading card art style`,
        iconKeyword: card.iconKeyword || getDefaultIcon(card.color),
      }));
    } catch (parseError) {
      console.error("Failed to parse Claude response:", textContent.text);
      cards = generateMockCards(theme, cardCount);
    }

    // Cache the newly generated cards (without player-specific IDs)
    if (POSTGRES_URL) {
      try {
        const cardsForCache = cards.map(card => ({
          ...card,
          id: '', // Remove player-specific ID for caching
        }));
        const cacheResult = await cacheThemeCards(theme, cardsForCache);
        if (cacheResult) {
          console.log(`[Cards] Successfully cached cards for theme: "${theme}"`);
        } else {
          console.error(`[Cards] Failed to cache cards for theme: "${theme}"`);
        }
      } catch (error) {
        console.error(`[Cards] Error caching cards in database:`, error);
      }
    }

    if (partyHost && roomId && playerId) {
      await sendCardsToParty(partyHost, roomId, playerId, cards, cardCount > 5);
    }

    return NextResponse.json({ cards, cached: false });
  } catch (error) {
    console.error("Error generating cards:", error);
    return NextResponse.json(
      { error: "Failed to generate cards" },
      { status: 500 }
    );
  }
}

// Get a default icon based on card color
function getDefaultIcon(color: CardColor): string {
  const colorIconMap: Record<CardColor, string> = {
    amber: "fire",
    crimson: "skull",
    emerald: "leaf",
    violet: "star",
    cyan: "wave",
    rose: "heart",
    slate: "shield",
  };
  return colorIconMap[color] || "sword";
}

async function sendCardsToParty(
  partyHost: string,
  roomId: string,
  playerId: string,
  cards: Card[],
  isDraft: boolean = true
) {
  try {
    const protocol = partyHost.includes("localhost") ? "http" : "https";
    const url = `${protocol}://${partyHost}/party/${roomId}`;
    
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        playerId,
        cards,
        isDraft,
      }),
    });
  } catch (error) {
    console.error("Failed to send cards to PartyKit:", error);
  }
}

function generateMockCards(theme: string, count: number): Card[] {
  const themeWords = theme.split(" ");
  const baseName = themeWords[0] || "Mystery";
  
  const cardTemplates = [
    { prefix: "Mighty", attack: 7, defense: 2, ability: "Deal 2 bonus damage on the first round", icon: "sword" },
    { prefix: "Swift", attack: 4, defense: 4, ability: "If your HP is below half, gain +2 attack", icon: "lightning" },
    { prefix: "Ancient", attack: 5, defense: 5, ability: "Deal 3 bonus damage in the final round", icon: "crown" },
    { prefix: "Shadow", attack: 6, defense: 3, ability: "25% chance to deal double damage", icon: "skull" },
    { prefix: "Noble", attack: 3, defense: 6, ability: "Reduce incoming damage by 1", icon: "shield" },
    { prefix: "Fierce", attack: 8, defense: 1, ability: "If opponent's last card had higher defense, deal +3", icon: "fire" },
    { prefix: "Guardian", attack: 2, defense: 6, ability: "Heal 2 HP after playing this card", icon: "heart" },
  ];

  return cardTemplates.slice(0, count).map((template, index) => ({
    id: `mock-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `${template.prefix} ${baseName}`,
    attack: template.attack,
    defense: template.defense,
    ability: template.ability,
    flavorText: `A legendary ${baseName.toLowerCase()} of great power.`,
    color: CARD_COLORS[index % CARD_COLORS.length],
    imagePrompt: `${template.prefix.toLowerCase()} ${baseName.toLowerCase()}, epic fantasy card art, dramatic lighting`,
    iconKeyword: template.icon,
  }));
}
