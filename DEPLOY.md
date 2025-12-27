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

   **Required:**
   | Variable | Value |
   |----------|-------|
   | `ANTHROPIC_API_KEY` | Your Claude API key from [console.anthropic.com](https://console.anthropic.com) |
   | `NEXT_PUBLIC_PARTYKIT_HOST` | `theme-deck-wars.nicksaban20.partykit.dev` |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel app URL (e.g., `https://theme-deck-wars.vercel.app`) |
   | `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID (from dashboard URL) |
   | `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers AI permissions |

   **Optional (for caching & persistence):**
   | Variable | Value |
   |----------|-------|
   | `POSTGRES_URL` | Vercel Postgres connection string (auto-added by Vercel) |
   | `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (auto-added by Vercel) |

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

## Step 4: Setup Vercel Postgres (Optional but Recommended)

Enables theme caching (same theme = same cards) and game history tracking:

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Storage" → "Create Database" → "Postgres"
3. Follow the setup wizard
4. The `POSTGRES_URL` environment variable will be automatically added to your project
5. Redeploy your app to apply changes

**Benefits:**
- Themes are cached: "Dragons" always generates the same 7 cards
- No duplicate API calls for popular themes
- Game history is tracked (players, themes, winners)

## Step 5: Setup Vercel Blob (Optional but Recommended)

Enables persistent image storage (images load instantly from cache):

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → "Storage" → "Create Database" → "Blob"
3. Follow the setup wizard
4. The `BLOB_READ_WRITE_TOKEN` environment variable will be automatically added

**Benefits:**
- Images are stored permanently in Vercel Blob
- Same image prompt = instant load from cache
- No regeneration costs for repeat images
- Seamless integration with Vercel (no extra credentials)

## Step 6: Verify Deployment

Once deployed, your game will be available at your Vercel URL (e.g., `theme-deck-wars.vercel.app`).

## Environment Variables Reference

**Required:**
| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key for card generation | `sk-ant-api03-...` |
| `NEXT_PUBLIC_PARTYKIT_HOST` | PartyKit server URL (no https://) | `theme-deck-wars.nicksaban20.partykit.dev` |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL | `https://theme-deck-wars.vercel.app` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | `abc123def456...` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token | `your-token-here` |

**Optional (Database & Storage) - Auto-added by Vercel:**
| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_URL` | Vercel Postgres connection string | `postgres://...` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token | `vercel_blob_...` |

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
| Vercel Postgres | 256MB storage, 60 compute hours/month |
| Vercel Blob | 250MB storage on Hobby plan |
| PartyKit | 50K connections/month |
| Cloudflare AI | 10,000 neurons/day (~250-500 images) |
| Claude API | Pay-per-use (~$0.003/game) |

## Local Development

For local development, set `.env.local`:

```
# Required
ANTHROPIC_API_KEY=your-claude-key
NEXT_PUBLIC_PARTYKIT_HOST=localhost:1999
NEXT_PUBLIC_APP_URL=http://localhost:3000
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# Optional (for caching - leave empty if not using)
POSTGRES_URL=
BLOB_READ_WRITE_TOKEN=
```

Then run:
```bash
npm run party  # Terminal 1 - PartyKit server
npm run dev    # Terminal 2 - Next.js
```

**Note:** Without Postgres/R2 configured, the app still works but won't cache themes or images.
