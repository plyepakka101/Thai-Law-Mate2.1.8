<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Ayy7h3uPCTNMHwFlMwbSG-UafUTlt1Mq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and fill in:
   - `DATABASE_URL` — Neon connection string (required for cloud storage)
   - `GEMINI_API_KEY` — Gemini API key
3. Create the Neon schema and seed the built-in codes (once per database):
   `npm run seed:neon`
4. Run the app:
   `npm run dev`

## Where data is stored

Custom books, custom sections, notes and settings are written to `localStorage`
first and then pushed to Neon PostgreSQL through the `/api/*` endpoints. Those
endpoints are Vercel serverless functions; `npm run dev` serves them locally via
the Vite plugin in [dev-api-plugin.ts](dev-api-plugin.ts) using the same
`DATABASE_URL`.

If a write cannot reach Neon it is kept in a retry queue (`thai_law_mate_pending_sync`)
and the app shows a warning banner with a manual retry button, so data is never
silently local-only. On a deployment, set `DATABASE_URL` in the Vercel project
environment variables — otherwise `/api/*` answers `503` and nothing is stored
in the cloud.
