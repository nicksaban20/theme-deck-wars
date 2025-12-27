# Theme Deck Wars 🎴⚔️

A generative AI card battler where you pick any theme and battle with AI-generated cards!

## How It Works

1. **Create a game** and share the 4-letter room code with a friend
2. **Pick your themes** - anything goes! ("90s Cartoons" vs "Medieval Weapons")
3. **AI generates cards** - Claude creates 7 unique cards per player based on your themes
4. **Draft your deck** - Select 5 cards from your pool of 7
5. **Battle in Best of 3!** - Take turns playing cards with mana costs, speed-based turn order, and special perks
6. **Win the match** - First to win 2 games takes the match!

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS 4
- **Realtime Multiplayer**: PartyKit (WebSocket-based rooms)
- **AI Card Generation**: Anthropic Claude API
- **AI Image Generation**: Cloudflare Workers AI (Flux-1 Schnell)
- **Database**: Vercel Postgres (theme & image caching, game history)
- **Storage**: Vercel Blob (generated card images)
- **Styling**: Custom card designs with themed gradients

## Getting Started

### Prerequisites

- Node.js 18+
- An Anthropic API key (for card generation)
- Cloudflare account (optional, for AI image generation)
- Vercel account (optional, for database and blob storage)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Add your API keys to .env.local
# Required:
# ANTHROPIC_API_KEY=your-key-here
# NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999 (or your PartyKit URL)
#
# Optional (for production):
# CLOUDFLARE_ACCOUNT_ID=your-account-id
# CLOUDFLARE_API_TOKEN=your-api-token
# POSTGRES_URL=your-postgres-url
# BLOB_READ_WRITE_TOKEN=your-blob-token
# NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

### Development

Run both the Next.js dev server and PartyKit server:

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start PartyKit server
npm run party
```

Open [http://localhost:3000](http://localhost:3000) to play!

### Deployment

1. **Deploy PartyKit**:
   ```bash
   npm run party:deploy
   ```
   Note the deployed URL (e.g., `theme-deck-wars.your-username.partykit.dev`)

2. **Deploy to Vercel**:
   - Connect your repo to Vercel
   - Set environment variables (see DEPLOY.md for details):
     - `ANTHROPIC_API_KEY` - Your Anthropic API key (required)
     - `NEXT_PUBLIC_PARTYKIT_HOST` - Your PartyKit URL (required)
     - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare account ID (optional, for AI images)
     - `CLOUDFLARE_API_TOKEN` - Cloudflare API token (optional, for AI images)
     - `POSTGRES_URL` - Vercel Postgres connection string (optional, for caching)
     - `BLOB_READ_WRITE_TOKEN` - Vercel Blob token (optional, for image storage)
     - `NEXT_PUBLIC_APP_URL` - Your app URL (optional, for game history)

## Game Rules

- Each player starts with **20 HP** and **3 Mana**
- You draft **5 cards** from a pool of 7 generated cards
- **Mana System**: Cards cost mana to play (1-5), mana regenerates each turn
- **Speed System**: Higher speed cards act first in each round
- **Attack > Defense** = Damage dealt
- **Best of 3**: First to win 2 games wins the match
- Play all 5 cards across 5 rounds per game
- First to reduce opponent's HP to **0** wins the game!

### Card Stats & Perks

Each card has:
- **Mana Cost** (1-5): Resource cost to play
- **Speed** (1-10): Turn order (higher = faster)
- **Rarity**: Common, Rare, or Epic
- **Perks**: Special abilities that activate automatically:
  - **Passive**: Always active (damage boost, damage reduction, healing)
  - **Triggered**: Activates on specific events (onPlay, onDeath, onFirstRound, etc.)
  - **Combo**: Activates with specific card synergies or color combinations
  - **Status Effects**: Applies buffs/debuffs (poison, shield, rage, etc.)

## Project Structure

```
├── app/
│   ├── page.tsx              # Landing page (create/join)
│   ├── game/[roomId]/        # Game room page
│   └── api/generate-cards/   # Claude card generation
├── components/
│   ├── Card.tsx              # Card component
│   ├── BattleArena.tsx       # Main game board
│   ├── ThemePicker.tsx       # Theme selection
│   └── ...                   # Other UI components
├── party/
│   └── game.ts               # PartyKit server (game logic)
└── lib/
    ├── types.ts              # TypeScript types
    └── gameLogic.ts          # Combat calculations
```

## Cost Estimate

- **Vercel**: Free tier (100GB bandwidth)
- **PartyKit**: Free tier (50K connections/month)
- **Claude**: ~$0.003 per game (generating 10 cards)

## License

MIT

