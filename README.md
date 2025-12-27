# Theme Deck Wars 🎴⚔️

A generative AI card battler where you pick any theme and battle with AI-generated cards!

## How It Works

1. **Create a game** and share the 4-letter room code with a friend
2. **Pick your themes** - anything goes! ("90s Cartoons" vs "Medieval Weapons")
3. **AI generates cards** - Claude creates 5 unique cards per player based on your themes
4. **Battle!** - Take turns playing cards to reduce your opponent's HP to zero

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS 4
- **Realtime Multiplayer**: PartyKit (WebSocket-based rooms)
- **AI Card Generation**: Anthropic Claude API
- **Styling**: Custom card designs with themed gradients

## Getting Started

### Prerequisites

- Node.js 18+
- An Anthropic API key (for card generation)

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Add your Anthropic API key to .env.local
# ANTHROPIC_API_KEY=your-key-here
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
   - Set environment variables:
     - `ANTHROPIC_API_KEY` - Your Anthropic API key
     - `NEXT_PUBLIC_PARTYKIT_HOST` - Your PartyKit URL (without https://)

## Game Rules

- Each player starts with **20 HP**
- You receive **5 cards** based on your theme
- **Attack > Defense** = Damage dealt
- Play all 5 cards across 5 rounds
- First to reduce opponent's HP to **0** wins!

### Card Abilities

Cards may have special abilities that trigger based on:
- First/final round bonuses
- Low HP conditions
- Name-based interactions
- Random double damage

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

