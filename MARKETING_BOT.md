# Vortx X Marketing Bot

The bot is a separate Cloudflare Worker (`vortx-marketing-bot`) scheduled to post once per day at `14:17 UTC`.

It pulls live counts from:

- `https://vortxmkt.com/api/friction-feed`
- `https://vortxmkt.com/api/source-transparency`

Then it creates a compliance-safe subscription CTA for Vortx. By default, it attaches a locally generated PNG teaser card made inside the Worker, so there are no OpenAI or paid image-generation calls.

## Required X Credentials

For text + image posting, X requires user-context write credentials. Add these locally to `.dev.vars` and as Cloudflare Worker secrets for `vortx-marketing-bot`:

```env
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=
```

`X_BEARER_TOKEN` is useful for read-only app calls, but it is not enough for posting images. If you only have OAuth 2.0 user auth with `tweet.write`, set:

```env
X_OAUTH2_USER_TOKEN=
```

That can post text, but image upload still needs OAuth 1.0a access token + access token secret.

## Image Generation

```env
MARKETING_IMAGE_MODE=teaser-card
MARKETING_IMAGE_REQUIRED=false
```

You do not have to use OpenAI. The default `teaser-card` mode generates a PNG image directly in the Worker from live Vortx counts and paywall-safe teaser text.

Set `MARKETING_IMAGE_MODE=none` for text-only posts.

## Optional Ollama Creative Direction

Ollama is used for post/card copy direction, not a paid image API. The Worker still creates the PNG card itself. This means Ollama can make each post/card feel less templated while the image is still generated for free inside the Worker.

Important: Cloudflare Workers cannot call `localhost`, so production needs a reachable Ollama endpoint such as a private server or Cloudflare Tunnel.

```env
MARKETING_CREATIVE_MODE=ollama
OLLAMA_BASE_URL=https://your-ollama-endpoint.example.com
OLLAMA_MODEL=llama3.1
OLLAMA_REQUIRED=false
```

Keep `MARKETING_CREATIVE_MODE=deterministic` if you do not want the bot to call Ollama. Set `OLLAMA_REQUIRED=true` only if posting should fail when Ollama is unavailable.

## Company Spotlight Rotation

Each post highlights **one real company** rotated daily from the live Supabase queue (full legal name when the service role key is configured).

- Tweet hook/body name the spotlight company, record type, jurisdiction, and friction score.
- Teaser image foregrounds the company name and score instead of aggregate-only stats.
- Set `MARKETING_BOT_ROTATION_OFFSET` to shift which company is picked on a given day.

## Recognized-Company Boost

`worker/brand-recognition.js` boosts lead selection toward names people recognize (national brands +35, listed tickers +20, additive to the friction score). The boost applies to:

- X spotlight rotation (`fetchSpotlightEntity`)
- Discord channel lead picks (`#alpha-feed`, `#mass-layoffs`, `#bankruptcy-watch`)
- The weekly Reddit digest ordering

A famous brand with a weak signal still cannot bury a strong signal from an unknown company; the boost is capped at +55.

## Score Consistency (caption vs card)

The caption and hero-card number must come from the same value: **friction score, then severity; never confidence**. `signalScoreValue` in `worker/x-marketing-cron.js` is intentionally identical to `worker/discord-free-alpha.js`. A past bug took `max(score, severity, confidence)` for the card, which printed the confidence (e.g. 82) while the caption said the score (e.g. 66).

## Dramatic, High-Conversion Framing

The bot uses dramatic hooks and paywall-safe teasers:

- one rotated spotlight company per post
- aggregate live counts (`100 recent records`, `10 financial-distress signals`)
- source freshness (`latest queue date`)
- redacted record categories (`bankruptcy docket`, `WARN notice`, `receivership`)
- conversion CTAs (`Unlock watchlists and exports`)

It must not claim wrongdoing, predict legal outcomes, or give trading/financial advice. Each post includes a protective phrase such as `Research only` or `Not trading advice`.

## Safety Switches

```env
MARKETING_BOT_ENABLED=false
MARKETING_BOT_DRY_RUN=true
MARKETING_BOT_RUN_TOKEN=
MARKETING_CTA_URL=https://vortxmkt.com/?view=pricing
```

Keep `MARKETING_BOT_ENABLED=false` and `MARKETING_BOT_DRY_RUN=true` until credentials are verified.

## Discord ACCESS_FREE_ALPHA

Category: **ACCESS_FREE_ALPHA** (segmented channels so members can mute what they do not need).

| Channel | Schedule (UTC) | Format | Content |
| --- | --- | --- | --- |
| `#alpha-feed` | Ingest hourly + daily digest | Relief-framed **hero card** PNG + caption | **Material trades only** (dollar threshold or cluster-buy). Not the raw Form 4 firehose. |
| `#mass-layoffs` | Ingest hourly + Tue/Fri digest | **Amber workforce hero card** + caption | **Every new WARN** as it hits (no brand gate) |
| `#congress-and-insiders` | Ingest hourly + Wed/Sat digest | Trading hero card + caption | Same material-trade filter as `#alpha-feed` |
| `#market-chatter` | Thu `17 14 * * 4` | Hero card + caption | Mixed public-record chatter (not the trade tape) |

Ingest-time posts run from `vortx-ingest-cron` after each source pull. Trade materiality defaults: Form 4 ≥ `$100k` or severity ≥ `78`, Congress ≥ `$50k` or severity ≥ `78`, **or** `3+` same-ticker buys in `7` days. Override with `DISCORD_TRADE_FORM4_MIN_AMOUNT`, `DISCORD_TRADE_CONGRESS_MIN_AMOUNT`, `DISCORD_CLUSTER_BUY_MIN`. Preview: `npm run discord:ingest-preview`. Manual: `POST /discord-ingest-posts` on the ingest Worker (`?dry_run=1` supported). Webhook secrets must exist on **both** `vortx-ingest-cron` and `vortx-marketing-bot`.

Relief headline on segmented channels: `Subscribers saw this before the headline.`

Preview without posting:

```bash
cd /home/dbz/vibe-seo/vortx
npm run discord:preview                              # #alpha-feed
npm run discord:preview -- --channel=mass-layoffs
npm run discord:preview -- --channel=bankruptcy-watch
npm run discord:preview:all                          # all three channels
```

Post live (each channel needs its own webhook from Discord → channel → Integrations → Webhooks):

```env
DISCORD_ALPHA_FEED_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_MASS_LAYOFFS_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_BANKRUPTCY_WATCH_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_BOT_ENABLED=true
DISCORD_BOT_DRY_RUN=false
```

`DISCORD_WEBHOOK_URL` still works as a legacy alias for `#alpha-feed` when `DISCORD_ALPHA_FEED_WEBHOOK_URL` is unset.

```bash
npm run discord:post
```

The marketing Worker crons post to the mapped channel when `DISCORD_BOT_ENABLED=true` and the channel webhook is set (independent of the X tweet). Manual trigger:

- `POST /discord/run?channel=alpha-feed` (default)
- `POST /discord/run?channel=mass-layoffs`
- `POST /discord/run?channel=bankruptcy-watch`
- `POST /discord/run?channel=all`

Use header `x-run-token: $MARKETING_BOT_RUN_TOKEN`.

## Discord UPGRADE // UNLOCK_FULL_QUEUE

Category: **UPGRADE // UNLOCK_FULL_QUEUE** (urgency teasers + premium narrative; unlock CTA on every drop).

| Channel | Schedule (UTC) | Format | Content |
| --- | --- | --- | --- |
| `#unfiltered-signals` | Daily `17 14 * * *` | **Teaser hero card** + caption | Headline + score fully visible; source + timeline **LOCKED** on card; urgency hook: `Your exposure window just opened.` |
| `#death-spirals` | Weekly Mon `17 14 * * 1` | Curated pattern story | Multi-signal spiral (lien → WARN → bankruptcy); pattern visible, underlying docs **LOCKED** |
| `#data-dumps` | Weekly Thu `17 14 * * 4` | CSV preview block | Masked sample export for vendor-risk / legal-ops; full CSV/API **LOCKED** |

Preview:

```bash
npm run discord:preview -- --channel=unfiltered-signals
npm run discord:preview -- --channel=death-spirals
npm run discord:preview -- --channel=data-dumps
npm run discord:preview:all                          # all six Discord channels
```

Webhooks:

```env
DISCORD_UNFILTERED_SIGNALS_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_DEATH_SPIRALS_WEBHOOK_URL=https://discord.com/api/webhooks/...
DISCORD_DATA_DUMPS_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

Manual trigger: `POST /discord/run?channel=unfiltered-signals` (or `death-spirals`, `data-dumps`, `all`).

### Trend-aligned spotlight + hashtags

Before each X post and Discord drop, the bot loads **Google Trends RSS** (`MARKETING_TRENDS_GEO`, default `US`), scores live WARN/bankruptcy/lien candidates, and picks the company best aligned with what is trending. Posts append **dynamic hashtags** matched to the signal and trends (e.g. `#WARN`, `#Texas`, topic tags). Override or boost with `MARKETING_TREND_KEYWORDS=layoffs,bankruptcy,...`. Disable with `MARKETING_TRENDS_DISABLED=true`.

## Reddit Weekly (r/VortxUnredacted)

The marketing Worker posts a **weekly digest** to [reddit.com/r/VortxUnredacted](https://www.reddit.com/r/VortxUnredacted/) every **Monday 14:17 UTC** (shares the `17 14 * * 1` trigger; Cloudflare free plan caps a Worker at 5 crons). The digest lists up to 5 companies (recognized brands first, one row per company with multi-state filings collapsed), a CTA to vortxmkt.com, and the research-only disclaimer.

Create a Reddit **script app** at <https://www.reddit.com/prefs/apps> with the posting account, then set secrets:

```bash
npx wrangler secret put REDDIT_CLIENT_ID --config wrangler.marketing.jsonc
npx wrangler secret put REDDIT_CLIENT_SECRET --config wrangler.marketing.jsonc
npx wrangler secret put REDDIT_USERNAME --config wrangler.marketing.jsonc
npx wrangler secret put REDDIT_PASSWORD --config wrangler.marketing.jsonc
```

Vars (already in `wrangler.marketing.jsonc`): `REDDIT_SUBREDDIT=VortxUnredacted`, `REDDIT_BOT_ENABLED=true`, `REDDIT_BOT_DRY_RUN=true`. Flip `REDDIT_BOT_DRY_RUN` to `false` after a dry run looks right, then `npm run marketing:deploy`.

Preview and manual post:

```bash
npm run reddit:preview   # dry run, prints title + markdown body
npm run reddit:post      # posts live using .dev.vars credentials
```

Manual trigger on the deployed Worker: `POST /reddit/run` (add `?dry=1` for a dry run) with header `x-run-token: $MARKETING_BOT_RUN_TOKEN`.

Note: accounts posting to Reddit via the API should be flaired/approved in the subreddit and follow its rules; the digest format is compliance-safe (public records, no wrongdoing claims).

## Substack spotlight draft

The daily X spotlight also becomes a **Substack draft** (not an auto-send). Same company, research-only copy, composer URL for review.

```env
SUBSTACK_SID=
SUBSTACK_PUBLICATION_URL=https://vortxmkt.substack.com
SUBSTACK_MARKETING_DRAFT=true
SUBSTACK_MARKETING_PUBLISH=false
```

`npm run marketing:preview` now includes a `substack` object. Manual: `POST /substack/run` with `x-run-token` and a JSON spotlight, or `npm run substack:preview -- --name "Acme"`.

## ByBizu announcements (not the Form 4 firehose)

Stream start / new YouTube upload can cross-post a **link + title** to Discord `#announcements`, X, and the FemaleSpace1 Facebook page. Litigation cards stay on Vortx channels.

```env
DISCORD_ANNOUNCEMENTS_WEBHOOK_URL=
ANNOUNCE_ENABLED=true
```

```bash
npm run announce:preview -- --title "New episode" --url https://www.youtube.com/@ByBizu
```

Manual Worker: `POST /announce` with `{ "kind": "youtube"|"live"|"vod", "url": "https://...", "title": "...", "platform": "youtube"|"kick"|"twitch" }`.

vibe-clips writes the same copy after each edit:

```text
social/youtube-short.mp4
social/tiktok-hook.mp4
social/going-live.txt
social/announce.json
```

```bash
cd /home/dbz/vibe-seo/tools/video-automation
./vibe-clips --social-pack --latest
```

## Kick + Twitch live alerts

Daily cron checks `kick.com/bybizu` and Twitch Helix for `bybizu_`. Newly live streams fire the announcement pack once per stream id. No VODs-as-legal-teasers.

```env
LIVE_ALERTS_ENABLED=true
KICK_LOGIN=bybizu
TWITCH_LOGIN=bybizu_
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
```

```bash
npm run live:preview
```

`POST /live/check` with the run token.

## Facebook FemaleSpace1 weekly story

Monday 14:17 UTC posts a **ByBizu story** (YouTube link), not a Vortx Form 4 card. Set `FACEBOOK_WEEKLY_BRAND=vortx` only if that page should carry a research-only desk teaser.

```env
FACEBOOK_WEEKLY_ENABLED=true
FACEBOOK_WEEKLY_BRAND=bybizu
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=
```

`POST /facebook/run` forces a post on any weekday (still needs the page token).

What this stack will not do: scrape Discord/YouTube, auto-DM, or comment-spam.

## Local Dry Run

```bash
cd /home/dbz/vibe-seo/vortx
npm run marketing:preview
```

## Manual Live Post

Use this when you want to post on demand:

```bash
cd /home/dbz/vibe-seo/vortx
npm run marketing:post
```

This posts immediately using the local `.dev.vars` X credentials.

## Check X Credentials

```bash
cd /home/dbz/vibe-seo/vortx
npm run x:check
```

## Check Current Site/Data Health

```bash
cd /home/dbz/vibe-seo/vortx
npm run ops:check
```

## Deploy Scheduled Worker

```bash
cd /home/dbz/vibe-seo/vortx
npm run marketing:deploy
```

Then add secrets:

```bash
npx wrangler secret put X_API_KEY --config wrangler.marketing.jsonc
npx wrangler secret put X_API_SECRET --config wrangler.marketing.jsonc
npx wrangler secret put X_ACCESS_TOKEN --config wrangler.marketing.jsonc
npx wrangler secret put X_ACCESS_TOKEN_SECRET --config wrangler.marketing.jsonc
npx wrangler secret put MARKETING_BOT_RUN_TOKEN --config wrangler.marketing.jsonc
```

After secrets are in place, set these vars in `wrangler.marketing.jsonc`:

```jsonc
"MARKETING_BOT_ENABLED": "true",
"MARKETING_BOT_DRY_RUN": "false"
```

Redeploy with `npm run marketing:deploy`.

## Scheduled Posting

The Worker is scheduled at:

```text
17 14 * * *
```

That is daily at `14:17 UTC`. It only posts automatically when production has:

```jsonc
"MARKETING_BOT_ENABLED": "true",
"MARKETING_BOT_DRY_RUN": "false"
```

