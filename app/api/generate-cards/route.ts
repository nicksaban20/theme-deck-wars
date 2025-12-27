import { NextRequest, NextResponse } from "next/server";
import { Card, CardColor } from "@/lib/types";
import { getCachedThemeCards, cacheThemeCards, initDatabase } from "@/lib/db";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const POSTGRES_URL = process.env.POSTGRES_URL;
const LOCAL_GGUF_URL = process.env.LOCAL_GGUF_URL || "http://127.0.0.1:8080";

// Generate image for a single card and return URL
async function generateCardImage(card: Card): Promise<string | null> {
  try {
    const prompt = card.imagePrompt || `${card.name}, fantasy trading card art`;

    // Try local GGUF first
    try {
      const ggufResponse = await fetch(`${LOCAL_GGUF_URL}/v1/images/generations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, size: "256x256" }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (ggufResponse.ok) {
        const data = await ggufResponse.json();
        if (data.data?.[0]?.b64_json) {
          return `data:image/png;base64,${data.data[0].b64_json}`;
        }
      }
    } catch {
      console.log(`[Cards] Local GGUF not available, skipping image for ${card.name}`);
    }

    return null;
  } catch (error) {
    console.error(`[Cards] Error generating image for ${card.name}:`, error);
    return null;
  }
}

// Generate images for all cards (sequentially to avoid overwhelming SD server)
async function generateImagesForCards(cards: Card[]): Promise<Card[]> {
  console.log(`[Cards] Generating images for ${cards.length} cards (sequentially)...`);

  const cardsWithImages: Card[] = [];
  for (const card of cards) {
    const imageUrl = await generateCardImage(card);
    cardsWithImages.push(imageUrl ? { ...card, imageUrl } : card);
  }

  const successCount = cardsWithImages.filter(c => c.imageUrl).length;
  console.log(`[Cards] Generated ${successCount}/${cards.length} images`);

  return cardsWithImages;
}

// Initialize database on first request (only if configured)
let dbInitialized = false;
async function ensureDbInitialized() {
  if (!dbInitialized && POSTGRES_URL) {
    await initDatabase();
    dbInitialized = true;
  }
}

const CARD_COLORS: CardColor[] = ["amber", "crimson", "emerald", "violet", "cyan", "rose", "slate"];

const DEFAULT_CARD_COUNT = 9; // Draft mode: generate 9, pick 5

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
    const { theme, playerId, roomId, partyHost, count = DEFAULT_CARD_COUNT, gameNumber, previousStrategy, opponentStrategy } = await request.json();

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
          let cardsWithIds = cachedCards.map((card, index) => ({
            ...card,
            id: `${playerId || 'card'}-${index}-${Date.now()}`,
          }));

          // Generate images for cards that don't have them
          const cardsNeedingImages = cardsWithIds.filter(c => !c.imageUrl);
          if (cardsNeedingImages.length > 0) {
            console.log(`[Cards] Generating images for ${cardsNeedingImages.length} cached cards without images...`);
            cardsWithIds = await generateImagesForCards(cardsWithIds);

            // Update cache with new images (non-blocking)
            const cardsForCache = cardsWithIds.map(card => ({ ...card, id: '' }));
            cacheThemeCards(theme, cardsForCache).catch(err =>
              console.error('[Cards] Failed to update cache with images:', err)
            );
          }

          if (partyHost && roomId && playerId) {
            await sendCardsToParty(partyHost, roomId, playerId, cardsWithIds, true); // Always draft mode for initial generation
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
        await sendCardsToParty(partyHost, roomId, playerId, mockCards, true); // Always draft mode for initial generation
      }

      return NextResponse.json({ cards: mockCards });
    }

    // Adaptive generation: In games 2-3, generate counter/adaptive cards
    let adaptiveContext = "";
    if (gameNumber && gameNumber > 1) {
      if (previousStrategy) {
        adaptiveContext = `\n\nPrevious game context: Your previous strategy was "${previousStrategy}". Generate cards that complement or improve upon this strategy.`;
      }
      if (opponentStrategy) {
        adaptiveContext += `\n\nOpponent's previous strategy: "${opponentStrategy}". Consider generating cards that can counter or adapt to this strategy while staying true to your theme.`;
      }
    }

    const prompt = `Generate exactly ${cardCount} unique trading card game cards based on the theme: "${theme}"${adaptiveContext}

Each card must have:
- name: A creative name related to the theme (2-4 words max)
- attack: A number between 1 and 8
- defense: A number between 1 and 6
- manaCost: A number between 1 and 5 (resource cost to play, higher = more powerful)
- speed: A number between 1 and 10 (initiative/turn order, higher = faster)
- rarity: One of "common", "rare", or "epic" (epic should be most powerful, common most basic)
- ability: A short human-readable description of the card's special ability
- flavorText: A funny or thematic one-liner quote
- color: One of: amber, crimson, emerald, violet, cyan, rose, slate (pick colors that match the card's personality)
- imagePrompt: A short, vivid description for AI art generation (e.g., "fierce warrior with glowing sword, dark fantasy style, dramatic lighting")
- iconKeyword: A single word for icon mapping, must be one of: ${ICON_KEYWORDS.slice(0, 30).join(", ")}
- perks: A structured object with optional arrays for different perk types:
  * passive: Array of passive perks (always active)
    - type: "damageReduction" | "damageBoost" | "healPerTurn" | "drawCard"
    - value: number (for damage/heal) or boolean (for drawCard)
  * triggered: Array of triggered perks (activate on events)
    - type: "onPlay" | "onDeath" | "onFirstRound" | "onLastRound" | "onLowHP"
    - effect: string description
    - value: optional number
  * combo: Array of combo perks (synergy with other cards)
    - synergyWith: optional array of card names
    - requiresColor: optional array of colors
    - comboEffect: string description
    - value: optional number
  * status: Array of status effects (buffs/debuffs)
    - type: string (e.g., "poison", "shield", "rage")
    - value: number
    - duration: optional number of rounds

Important:
- Balance: manaCost + attack + defense should total approximately 10-15
- Higher manaCost cards should be more powerful (higher attack/defense or better perks)
- Speed should correlate with card type (fast attackers = high speed, slow tanks = low speed)
- Rarity distribution: 3-4 common, 2-3 rare, 1 epic per set
- Make abilities varied and interesting
- Keep flavor text witty and theme-appropriate
- Each card should feel unique within the set
- Create a mix of aggressive (high attack) and defensive (high defense) cards
- Include 1-2 "star" cards (epic rarity) that are clearly more powerful
- Make imagePrompt descriptive but concise (under 100 characters), suitable for fantasy card art
- Choose iconKeyword that best represents the card's theme or ability
- Perks should be balanced - don't make cards overpowered

Respond ONLY with a valid JSON object in this exact format, no other text:
{
  "cards": [
    {
      "name": "Example Name",
      "attack": 5,
      "defense": 3,
      "manaCost": 2,
      "speed": 7,
      "rarity": "rare",
      "ability": "Deal 2 bonus damage if this is the first round",
      "flavorText": "A witty quote here",
      "color": "violet",
      "imagePrompt": "mystical warrior with glowing purple aura, fantasy art style",
      "iconKeyword": "sword",
      "perks": {
        "triggered": [
          {
            "type": "onFirstRound",
            "effect": "Deal 2 bonus damage",
            "value": 2
          }
        ]
      }
    }
  ]
}`;

    // Add timeout to prevent indefinite waiting
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
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
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // Handle timeout or network errors
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn("[Cards] Anthropic API timeout after 15 seconds, using mock cards");
      } else {
        console.error("[Cards] Anthropic API fetch error:", fetchError);
      }

      const mockCards = generateMockCards(theme, cardCount);
      if (partyHost && roomId && playerId) {
        await sendCardsToParty(partyHost, roomId, playerId, mockCards, true);
      }
      return NextResponse.json({ cards: mockCards, timeout: true });
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);

      const mockCards = generateMockCards(theme, cardCount);
      if (partyHost && roomId && playerId) {
        await sendCardsToParty(partyHost, roomId, playerId, mockCards, true); // Always draft mode for initial generation
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
      const parsed = JSON.parse(jsonMatch[0]) as { cards?: unknown[] };
      if (!parsed.cards || !Array.isArray(parsed.cards)) {
        throw new Error("Invalid card structure in Claude response");
      }

      interface RawCard {
        name?: string;
        attack?: number;
        defense?: number;
        ability?: string;
        flavorText?: string;
        color?: string;
        manaCost?: number;
        speed?: number;
        rarity?: string;
        perks?: unknown;
        imagePrompt?: string;
        iconKeyword?: string;
      }

      cards = (parsed.cards as RawCard[]).map((card, index: number) => {
        // Validate and sanitize card data
        const validColor: CardColor = (card.color && ['amber', 'crimson', 'emerald', 'violet', 'cyan', 'rose', 'slate'].includes(card.color))
          ? (card.color as CardColor)
          : 'slate';

        return {
          id: `${playerId || 'card'}-${index}-${Date.now()}`,
          name: card.name || `Card ${index + 1}`,
          attack: typeof card.attack === 'number' ? Math.max(1, Math.min(8, card.attack)) : 3,
          defense: typeof card.defense === 'number' ? Math.max(1, Math.min(6, card.defense)) : 2,
          ability: card.ability || '',
          flavorText: card.flavorText || '',
          color: validColor,
          // New stats with defaults for backward compatibility
          manaCost: typeof card.manaCost === 'number' ? Math.max(1, Math.min(5, card.manaCost)) : 1,
          speed: typeof card.speed === 'number' ? Math.max(1, Math.min(10, card.speed)) : 5,
          rarity: (card.rarity && ['common', 'rare', 'epic'].includes(card.rarity)) ? card.rarity : 'common',
          perks: (card.perks && typeof card.perks === 'object') ? card.perks : {},
          // Art fields with fallbacks
          imagePrompt: card.imagePrompt || `${card.name || 'card'}, fantasy trading card art style`,
          iconKeyword: card.iconKeyword || getDefaultIcon(validColor),
        } as Card;
      });

      // Ensure we have the right number of cards
      if (cards.length < cardCount) {
        console.warn(`[Cards] Only got ${cards.length} cards, generating ${cardCount - cards.length} more`);
        const additionalCards = generateMockCards(theme, cardCount - cards.length);
        cards = [...cards, ...additionalCards];
      }
    } catch (parseError) {
      console.error("[Cards] Failed to parse Claude response:", parseError);
      if (parseError instanceof Error) {
        console.error("[Cards] Error details:", parseError.message);
      }
      console.error("[Cards] Response preview:", textContent.text?.slice(0, 500));
      cards = generateMockCards(theme, cardCount);
    }

    // Pre-generate images for all cards (runs in parallel)
    cards = await generateImagesForCards(cards);

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
      await sendCardsToParty(partyHost, roomId, playerId, cards, true); // Always draft mode for initial generation
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
    // Handle PartyKit URL format - it might already include protocol or might be just the host
    let url: string;
    if (partyHost.startsWith("http://") || partyHost.startsWith("https://")) {
      url = `${partyHost}/party/${roomId}`;
    } else {
      const protocol = partyHost.includes("localhost") || partyHost.includes("127.0.0.1") ? "http" : "https";
      url = `${protocol}://${partyHost}/party/${roomId}`;
    }

    console.log(`[sendCardsToParty] Sending ${cards.length} cards to PartyKit for player ${playerId}, isDraft: ${isDraft}`);
    console.log(`[sendCardsToParty] URL: ${url}`);

    const response = await fetch(url, {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[sendCardsToParty] Failed to send cards to PartyKit: HTTP ${response.status} - ${errorText}`);
      throw new Error(`PartyKit request failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json().catch(() => ({}));
    console.log(`[sendCardsToParty] Successfully sent cards to PartyKit for player ${playerId}`, responseData);
  } catch (error) {
    console.error(`[sendCardsToParty] Error sending cards to PartyKit for player ${playerId}:`, error);
    throw error; // Re-throw to let caller handle it
  }
}

function generateMockCards(theme: string, count: number): Card[] {
  // Use last word of theme for better naming (e.g., "Famous Scientists" -> "Scientists")
  const themeWords = theme.split(" ").filter(w => w.length > 0);
  const baseName = themeWords[themeWords.length - 1] || themeWords[0] || "Mystery";

  const cardTemplates = [
    { prefix: "Mighty", attack: 7, defense: 2, ability: "Deal 2 bonus damage on the first round", icon: "sword" },
    { prefix: "Swift", attack: 4, defense: 4, ability: "If your HP is below half, gain +2 attack", icon: "lightning" },
    { prefix: "Ancient", attack: 5, defense: 5, ability: "Deal 3 bonus damage in the final round", icon: "crown" },
    { prefix: "Shadow", attack: 6, defense: 3, ability: "25% chance to deal double damage", icon: "skull" },
    { prefix: "Noble", attack: 3, defense: 6, ability: "Reduce incoming damage by 1", icon: "shield" },
    { prefix: "Fierce", attack: 8, defense: 1, ability: "If opponent's last card had higher defense, deal +3", icon: "fire" },
    { prefix: "Guardian", attack: 2, defense: 6, ability: "Heal 2 HP after playing this card", icon: "heart" },
    { prefix: "Mystic", attack: 4, defense: 5, ability: "Gain +1 attack for each round played", icon: "wand" },
    { prefix: "Elite", attack: 6, defense: 4, ability: "Deal 1 bonus damage per card played this game", icon: "star" },
  ];

  return cardTemplates.slice(0, count).map((template, index) => ({
    id: `mock-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: `${template.prefix} ${baseName}`,
    attack: template.attack,
    defense: template.defense,
    ability: template.ability,
    flavorText: `A legendary ${baseName.toLowerCase()} of great power.`,
    color: CARD_COLORS[index % CARD_COLORS.length],
    manaCost: Math.min(3, Math.floor((template.attack + template.defense) / 3)),
    speed: 5 + (index % 3) - 1, // Vary speed between 4-6
    rarity: index < 4 ? 'common' : index < 6 ? 'rare' : 'epic',
    perks: {},
    imagePrompt: `${template.prefix.toLowerCase()} ${baseName.toLowerCase()}, epic fantasy card art, dramatic lighting`,
    iconKeyword: template.icon,
  } as Card));
}
