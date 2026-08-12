# Internal Developer README

Welcome to the NativeForms Shopify App source code! This document provides an overview of the environment setup, deployment instructions, and known gaps / technical debt intentionally deferred during the 10-Day MVP build.

## Environment Variables

For local development, create a `.env` file in the project root with the following:

```env
SHOPIFY_API_KEY="your_client_id_from_partners_dashboard"
SHOPIFY_API_SECRET="your_client_secret"
SCOPES="read_themes,write_themes,read_customers"
SHOPIFY_APP_URL="https://your-ngrok-or-cloudflare-tunnel"
DATABASE_URL="file:dev.sqlite" # (Or your Postgres connection string for production)
```

## Deployment

1. **Database:** Switch `DATABASE_URL` from SQLite to Postgres in production. Make sure to run `npx prisma migrate deploy` in your production build step.
2. **App Hosting:** Deploy the Remix app to Vercel, Heroku, or Fly.io. Ensure environment variables are correctly populated in the hosting provider.
3. **App Extensions:** Run `npm run deploy` via Shopify CLI to push the Theme App Extension (`extensions/form-builder-extension`) to the Shopify Partners Dashboard.
4. **GDPR Webhooks:** Update the webhook URLs in `shopify.app.toml` to your production URL, and re-run `npm run deploy` to sync the privacy compliance endpoints.

## Known Gaps (Day 11+)

The following features were deferred during the initial 10-day sprint and must be implemented before a public App Store launch:

1. **Deep Integrations:** 
   - Klaviyo, Google Sheets, and Zapier (OAuth flows and field mappings) are currently stubbed in the UI but lack backend functionality.
2. **GDPR Webhook Logic:** 
   - `webhooks.customers.redact`, `webhooks.customers.data_request`, and `webhooks.shop.redact` are currently returning HTTP 200 to pass compliance checks, but do not actually delete or export data yet. You must implement the logic to search the database and purge/redact records before publishing publicly.
3. **Advanced Conditional Logic:** 
   - A full rule engine (show/hide fields based on answers) needs to be built into the builder and evaluated in the storefront runtime.
4. **Rating, Signature & Premium Fields:** 
   - The UI scaffolding exists in the Builder sidebar, but the runtime HTML/JS implementation for these specialized fields (e.g. Signature canvas, NPS) needs to be completed.
5. **App Proxy Rate Limiting:** 
   - The `/api/proxy` endpoints currently do not enforce IP rate limiting. Add basic rate limits to prevent malicious bot floods (even though reCAPTCHA v3 is in place).
6. **Dark Mode Theme Variants:** 
   - Complete the Starter+ advanced configuration to allow varying CSS variables for Dark vs Light mode in the store.
