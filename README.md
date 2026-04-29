# Family Recipe Book

A private, collaborative recipe book for families — preserve recipes, share memories, and invite the whole family to contribute.

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
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers AI → Use REST API |
| `CLOUDFLARE_WORKERS_AI_API_TOKEN` | Cloudflare Dashboard → Workers AI → Create Workers AI API Token |
| `CLOUDFLARE_WORKERS_AI_MODEL` | Optional. Defaults to `@cf/meta/llama-3.1-8b-instruct` |

> **Important:** Never commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to the browser. It bypasses all Row Level Security policies and is used only in server actions.

The pantry-based recipe idea feature uses Cloudflare Workers AI by default. Cloudflare provides a free daily Workers AI allocation, and requests will fail closed if the Cloudflare variables are not configured. An optional OpenAI fallback is supported with `OPENAI_API_KEY`, but leaving it unset avoids OpenAI API charges.

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
    (auth)/         # Sign-in / sign-up
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
