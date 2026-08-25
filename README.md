# Home Cooked

A private, collaborative recipe book where people can — preserve recipes, share memories, and invite others to contribute.

## Stack

- **Next.js 16** (App Router, server actions)
- **Supabase** (Postgres + Auth + Storage + Row Level Security)
- **Tailwind CSS v4**
- **React Hook Form** + **Zod**

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project.

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Origin of *this* environment — `http://localhost:3000` locally, the real domain in Vercel. Every auth email link is built from it, so a production value in `.env.local` sends your local sign-ins to the live site |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers AI → Use REST API |
| `CLOUDFLARE_WORKERS_AI_API_TOKEN` | Cloudflare Dashboard → Workers AI → Create Workers AI API Token |
| `CLOUDFLARE_WORKERS_AI_MODEL` | Optional. Defaults to `@cf/meta/llama-3.1-8b-instruct` |
| `RESEND_API_KEY` | Resend → API Keys. Used for auth and member invitation emails |
| `EMAIL_FROM` | Verified Resend sender, e.g. `Home Cooked <noreply@send.your-domain.com>` |
| `SEND_EMAIL_HOOK_SECRET` | Supabase → Authentication → Hooks → Send Email. Required for sign-in codes |
| `ADMIN_EMAILS` | Optional. Comma-separated user emails allowed to access `/app/admin` |

> **Important:** Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It bypasses all Row Level Security policies and is used only in server actions.

The pantry-based recipe idea feature uses Cloudflare Workers AI by default. Cloudflare provides a free daily Workers AI allocation, and requests will fail closed if the Cloudflare variables are not configured. An optional OpenAI fallback is supported with `OPENAI_API_KEY`, but leaving it unset avoids OpenAI API charges.

All email goes out through Resend from the app server. Member invitations are sent directly; Supabase Auth email is routed through the **Send Email hook** (Authentication → Hooks → Send Email, pointed at `/api/auth/send-email`), which renders our own templates and bypasses the Supabase SMTP and Email Template settings entirely — changes made there have no effect.

### Auth configuration

Sign-in is passwordless: one screen takes an email address, Supabase emails a 6-digit code, and `verifyOtp` starts the session. Google OAuth is offered alongside it. Set the following in the Supabase dashboard:

- **Authentication → Sign In / Providers → Email** — Confirm email **on**, Email OTP Expiration **600** seconds (the default of 3600 is too long, and the emails say 10 minutes). Email OTP Length may be anything from 6 to 10; the form accepts that whole range rather than hardcoding one length (see `src/lib/otp.ts`).
- **Authentication → Providers → Google** — enable and paste the client ID/secret. In Google Cloud Console the authorised redirect URI is Supabase's, not the app's: `https://<project-ref>.supabase.co/auth/v1/callback`.
- **Authentication → URL Configuration → Redirect URLs** — `http://localhost:3000/**` and `https://<your-domain>/**`. Wildcards are needed because the callback carries a `?next=` parameter.
- **Authentication → Rate Limits** — every sign-in now sends an email, so raise the hourly email ceiling deliberately.

#### Testing sign-in locally

The Send Email hook is an outbound webhook from Supabase's servers, so it can never reach `localhost` — and the hook URL is a single project-wide setting, so pointing it at a tunnel takes production email down for as long as it is aimed there. Leave it on the production URL and test locally without email:

1. Submit your address on `/sign-in` as normal. The form advances to the code step.
2. Open `/dev/otp?email=you@example.com` and copy `code` from the JSON.
3. Paste it into the form.

`generateLink` is the only API that returns the plaintext OTP — `auth.users.confirmation_token` holds a hash and the logs never record it. Each call mints a **new** code that supersedes the last, so always use the most recent one. The route 404s when `NODE_ENV=production`.

If step 1 errors, `&create=1` mints the user and a code without sending anything; `/sign-in?email=you@example.com&sent=1` then jumps straight to the code step.

To see the email templates themselves, open `/dev/email-preview/sign-in-code` and `/dev/email-preview/signup-welcome` — they render the real templates with no Supabase involved. Testing genuine delivery of our templates means using a deployed environment, or accepting the production-email tradeoff of a temporary tunnel plus a matching `NEXT_PUBLIC_SITE_URL`.

While the hook is disabled, Supabase falls back to its own built-in templates, which are link-only and contain no 6-digit code.

### 4. Run database migrations

Apply the SQL migrations in `supabase/migrations/` to your project via the Supabase dashboard SQL editor or the Supabase CLI:

```bash
npx supabase db push
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/              # Next.js App Router pages
    sign-in/        # Passwordless entry: email → 6-digit code
    auth/           # confirm (email link) and callback (OAuth) routes
    onboarding/     # Create first book
    app/            # Authenticated app shell
      books/[bookId]/
        recipes/[recipeId]/
        members/
        collections/
  components/
    ui/             # Design system primitives (Button, Input, Dialog…)
    recipe/         # Recipe-specific components
    book/           # Book cover, cards
  lib/
    actions/        # Server actions (auth, books, recipes, members…)
    supabase/       # Supabase clients (browser, server, service role)
    types/          # Shared TypeScript types
    validators/     # Zod schemas
```

## Permissions model

| Role | Can do |
|---|---|
| **Keeper** | Full access — edit/delete any recipe, manage members, delete book |
| **Contributor** | Add recipes, edit/delete own recipes, add memories |
| **Family** | Read-only — browse recipes, add reactions and memories |
