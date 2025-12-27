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
   | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (from dashboard URL) |
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers AI permissions |

5. Click "Deploy"

## Step 3: Get Cloudflare Credentials (for AI Art)

The game uses Cloudflare Workers AI for fast image generation:

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Account ID**: Found in the URL: `dash.cloudflare.com/{ACCOUNT_ID}/...`
3. **API Token**:
   - Go to Profile (top right) → API Tokens
   - Click "Create Token"
   - Use the "Workers AI" template (or create custom with Workers AI permissions)
   - Copy the token

**Free Tier**: 10,000 neurons/day = ~250-500 images/day

## Step 4: Verify Deployment

Once deployed, your game will be available at your Vercel URL (e.g., `theme-deck-wars.vercel.app`).

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key for card generation | `sk-ant-api03-...` |
| `NEXT_PUBLIC_PARTYKIT_HOST` | PartyKit server URL (no https://) | `theme-deck-wars.nicksaban20.partykit.dev` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | `abc123def456...` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | `your-token-here` |

## Updating PartyKit

If you make changes to the PartyKit server (`party/game.ts`), redeploy with:

```bash
npx partykit deploy
```

## Troubleshooting

### Cards not generating
- Check that `ANTHROPIC_API_KEY` is set correctly in Vercel
- Verify API key has valid credits at [console.anthropic.com](https://console.anthropic.com)

### AI Art not loading
- Verify `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set in Vercel
- Check Cloudflare dashboard for usage/errors
- The Icons mode works without Cloudflare as a fallback

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
| Cloudflare AI | 10,000 neurons/day (~250-500 images) |
| Claude API | Pay-per-use (~$0.003/game) |

## Local Development

For local development, set `.env.local`:

```
ANTHROPIC_API_KEY=your-claude-key
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

Then run:
```bash
npm run party  # Terminal 1 - PartyKit server
npm run dev    # Terminal 2 - Next.js
```
