# CatifyBot

CatifyBot is an opt-in X bot. It only polls direct mentions of the bot account, downloads the mentioning user's public profile picture, AI-edits it into a cute kitten avatar, and replies to that exact mention with `Catified. 🐱` plus the edited image.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create or migrate the Supabase table by running [supabase/processed_mentions.sql](./supabase/processed_mentions.sql). The table is shared-safe through `bot_project`, so future bots can reuse it without mention ID collisions.

3. Copy `.env.example` to `.env` and fill in real credentials.

   X's current v2 media upload and post creation docs use an OAuth2 user access token. Set `X_OAUTH2_USER_TOKEN` only if you have a real user-context token with write/media scopes. If it is absent, the bot falls back to OAuth1 credentials.

4. Run a safe dry run locally:

   ```bash
   npm run poll:once
   ```

5. Set `DRY_RUN=false` only after dry-run logs look correct.

## Railway Deployment

Railway is the recommended host because this bot runs as a long-lived worker. [railway.json](./railway.json) starts the container with:

```bash
npm run poll
```

Deploy from GitHub:

1. Push this repo to GitHub.
2. In Railway, create a new project and choose "Deploy from GitHub repo".
3. Select the repo.
4. Open the service's Variables tab.
5. Paste values from `.env.example`, filled with real credentials.
6. Keep `DRY_RUN=true` for the first deploy.
7. Watch deploy logs.
8. After a successful dry run, change `DRY_RUN=false` and redeploy.

Required bot vars:

```env
BOT_USERNAME=CatifyBot
BOT_USER_ID=
BOT_PROJECT_KEY=catifybot
DRY_RUN=true
```

## Local Running

Long-running worker:

```bash
npm run poll
```

Single poll:

```bash
npm run poll:once
```

## Safety Defaults

- `DRY_RUN=true` by default; the bot logs actions without posting.
- No keyword search is used. The bot only calls the bot user's mentions timeline.
- Mentions are stored in Supabase and are not processed twice once they succeed.
- Failed mentions can retry after a deployment or auth fix.
- `MAX_GLOBAL_REPLIES_PER_HOUR` defaults to `20`.
- One reply per author per hour is enforced.
- Protected/unavailable profiles are skipped.
- OpenAI moderation runs when `OPENAI_API_KEY` is present and `MODERATION_ENABLED=true`.
- `REQUIRE_IMAGE_MODERATION=true` makes missing moderation fail closed.
- Public replies set X's `made_with_ai` flag because the attached media is AI-edited.

## Image Providers

`IMAGE_PROVIDER=auto` prefers OpenAI when `OPENAI_API_KEY` is set, then Replicate when `REPLICATE_API_TOKEN` and `REPLICATE_MODEL` are set.

Replicate models have different input schemas, so set `REPLICATE_MODEL`, `REPLICATE_PROMPT_FIELD`, and `REPLICATE_IMAGE_FIELD` for the model you choose.

`SHARP_FALLBACK_ENABLED=true` enables a simple local cat-face overlay if the image provider is unavailable or fails. Keep it off if every public reply must be AI-edited.

## Configuration

Bot-specific branding lives in [lib/botConfig.ts](./lib/botConfig.ts):

- `botName`
- `defaultBotUsername`
- `transformationName`
- `imagePrompt`
- `replyText`

Future transformation bots should change that file first instead of rewriting queue, X, or Supabase logic.
