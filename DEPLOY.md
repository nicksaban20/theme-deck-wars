# Theme Deck Wars - Deployment Guide

Your PartyKit server is already deployed at:
**https://theme-deck-wars.nicksaban20.partykit.dev**

## Step 1: Push to GitHub

First, create a repository on GitHub and push your code:

```bash
# Add your GitHub repository as origin
git remote add origin https://github.com/YOUR_USERNAME/theme-deck-wars.git

# Push to GitHub
git push -u origin main
```

## Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New..." → "Project"
3. Import your `theme-deck-wars` repository
4. **Configure Environment Variables:**

   | Variable | Value |
   |----------|-------|
   | `ANTHROPIC_API_KEY` | Your Claude API key from [console.anthropic.com](https://console.anthropic.com) |
   | `NEXT_PUBLIC_PARTYKIT_HOST` | `theme-deck-wars.nicksaban20.partykit.dev` |

5. Click "Deploy"

## Step 3: Verify Deployment

Once deployed, your game will be available at your Vercel URL (e.g., `theme-deck-wars.vercel.app`).

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Claude API key for AI card generation | `sk-ant-api03-...` |
| `NEXT_PUBLIC_PARTYKIT_HOST` | PartyKit server URL (no https://) | `theme-deck-wars.nicksaban20.partykit.dev` |

## Updating PartyKit

If you make changes to the PartyKit server (`party/game.ts`), redeploy with:

```bash
npx partykit deploy
```

## Troubleshooting

### Cards not generating
- Check that `ANTHROPIC_API_KEY` is set correctly in Vercel
- Verify API key has valid credits at [console.anthropic.com](https://console.anthropic.com)

### WebSocket connection issues
- Ensure `NEXT_PUBLIC_PARTYKIT_HOST` matches your deployed PartyKit URL
- Check browser console for connection errors

### PartyKit not responding
- Redeploy PartyKit: `npx partykit deploy`
- Check PartyKit dashboard for logs

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Vercel | 100GB bandwidth, unlimited deploys |
| PartyKit | 50K connections/month |
| Pollinations.ai | Unlimited (community resource) |
| Game-icons.net | Unlimited (CC-BY license) |
| Claude API | Pay-per-use (~$0.003/game) |

## Local Development

For local development, set `.env.local`:

```
ANTHROPIC_API_KEY=your-key
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
```

Then run:
```bash
npm run party  # Terminal 1 - PartyKit server
npm run dev    # Terminal 2 - Next.js
```

