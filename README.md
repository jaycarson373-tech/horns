# Horns Bot

Horns is an opt-in X bot. It only polls direct mentions of the bot account, edits the mentioning user's profile picture to add horns, and replies to that exact mention with `Horns added.` plus the edited image.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the Supabase table by running [supabase/processed_mentions.sql](./supabase/processed_mentions.sql).

3. Copy `.env.example` to `.env` and fill in real credentials.

   X's current v2 media upload and post creation docs use an OAuth2 user access token. Set `X_OAUTH2_USER_TOKEN` if you have one with write/media scopes. If it is absent, the bot falls back to the OAuth1 credentials listed in the requested env vars.

4. Run a safe dry run locally:

   ```bash
   npm run poll:once
   ```

5. Set `DRY_RUN=false` only after dry-run logs look correct.

## Railway Deployment

Railway is the recommended host for this bot because it can run the worker as a long-lived process. This repo includes [railway.json](./railway.json), which tells Railway to start the container with:

```bash
npm run poll
```

Deploy from GitHub:

1. Push this repo to GitHub.
2. In Railway, create a new project and choose "Deploy from GitHub repo".
3. Select the repo.
4. Open the service's Variables tab.
5. Paste the values from `.env.example`, filled with real credentials.
6. Keep `DRY_RUN=true` for the first deploy.
7. Watch the deploy logs.
8. After a successful dry run, change `DRY_RUN=false` and redeploy.

Deploy with Railway CLI:

```bash
railway init
railway up
```

Then add the environment variables in the Railway dashboard or with `railway variables`.

## Local Running

Long-running worker:

```bash
npm run poll
```

## Safety Defaults

- `DRY_RUN=true` by default; the bot logs actions without posting.
- No keyword search is used. The bot only calls the bot user's mentions timeline.
- `processed_mentions.mention_id` is unique, so each mention is processed at most once.
- `MAX_GLOBAL_REPLIES_PER_HOUR` defaults to `20`.
- One reply per author per hour is enforced.
- Protected/unavailable profiles are skipped.
- OpenAI moderation runs when `OPENAI_API_KEY` is present and `MODERATION_ENABLED=true`.
- `REQUIRE_IMAGE_MODERATION=true` makes missing moderation fail closed.
- Public replies set X's `made_with_ai` flag because the attached media is AI-edited.

## Image Providers

`IMAGE_PROVIDER=auto` prefers OpenAI when `OPENAI_API_KEY` is set, then Replicate when `REPLICATE_API_TOKEN` and `REPLICATE_MODEL` are set.

Replicate models have different input schemas, so set `REPLICATE_MODEL`, `REPLICATE_PROMPT_FIELD`, and `REPLICATE_IMAGE_FIELD` for the model you choose.

`SHARP_FALLBACK_ENABLED=true` enables a simple local horns overlay if the image provider is unavailable or fails. Keep it off if every public reply must be AI-edited.

## Cost Notes

Railway has a Free plan with a small monthly credit and a separate free trial, but a real always-on bot may outgrow that. X API access and AI image editing may also cost money. For the cheapest test mode, keep `DRY_RUN=true` and use `IMAGE_PROVIDER=sharp` with `SHARP_FALLBACK_ENABLED=true`.
