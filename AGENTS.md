<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Home Cooked Agent Guide

Home Cooked is a production-oriented private family recipe platform. Treat user recipes, family membership, invitations, and photos as private data.

## Stack

- Next.js 16 App Router with Server Components and server actions.
- React 19.
- TypeScript.
- Tailwind CSS v4.
- Supabase Auth, Postgres, Storage, and Row Level Security.
- React Hook Form and Zod for forms and validation.
- Resend for member invitation email.
- Cloudflare Workers AI for the pantry recipe idea feature, with optional OpenAI fallback only when configured.

## Working Directory

- The application repo is `app/`.
- Run app commands from `app/`, not from the FamilyRecipe root.
- Shared product context lives in `README.md`, `PRODUCTION_READINESS_PLAN.md`, and `PRODUCTION_EXECUTION_PLAN.md`.

## Commands

- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Production build: `npm run build`
- Patch/minor/major package version: `npm run version:patch`, `npm run version:minor`, `npm run version:major`

Before considering a code task complete, run the narrowest relevant check. For broad changes, run `npm run lint` and `npm run build`.

## Implementation Standards

- Prefer existing local patterns over new abstractions.
- Keep edits scoped to the requested feature or bug.
- Do not rewrite large areas just to change style.
- Preserve user data semantics and existing migrations unless the task explicitly changes them.
- Use TypeScript types and Zod schemas rather than ad hoc validation.
- Keep server-only secrets and service-role usage out of client components.
- Never commit or expose `.env.local` values.

## Next.js 16 Rules

- Read relevant files under `node_modules/next/dist/docs/` before changing routing, metadata, caching, server actions, middleware, or image behavior.
- Assume older Next.js training data may be wrong.
- Prefer App Router conventions already used in `src/app/`.
- Keep server actions on the server and avoid importing server-only modules into client components.

## Supabase Rules

- Treat RLS as production-critical.
- Use the anon key in browser-safe clients only.
- Use `SUPABASE_SERVICE_ROLE_KEY` only in server-only code paths and only when RLS bypass is intentional.
- For migrations, make policy and storage behavior explicit.
- When changing tables, check related validators, types, server actions, storage rules, and UI states.
- Permission-sensitive work must consider Keeper, Contributor, Family, unauthenticated users, and unrelated cookbook members.

## UI And Product Rules

- This is an app, not a landing page. Prioritize usable workflows over marketing layout.
- Mobile Safari is a first-class target.
- Every primary flow needs loading, empty, error, and success states.
- Use existing component primitives from `src/components/` before adding new ones.
- Use `lucide-react` icons where icons are appropriate.
- Avoid hidden desktop-only actions for core workflows.

## Deployment And Operations

- Vercel deployment must have separate local, staging, and production environment assumptions.
- Verify environment variables before release work.
- Do not run production-impacting commands without explicit user approval.
- Do not log secrets, invite tokens, raw private recipe content, or service-role keys.

## MCP Connectors

- Project MCP config lives in `.mcp.json`.
- Supabase MCP is configured read-only by default and expects `SUPABASE_PROJECT_REF` in the local shell environment.
- Vercel MCP uses the official remote endpoint and authenticates through the client.
- Keep human approval enabled for MCP tool calls, especially database, deployment, log, and environment operations.
- Do not connect MCP tools to production data unless the user explicitly approves the risk and scope.

## Agent Usage

- Codex should be the primary implementation and review agent.
- Claude Code may use project subagents from `app/.claude/agents/` when launched inside the app repo, or from the FamilyRecipe root `.claude/agents/` directory when launched one level up.
- Use specialized agents for bounded review or implementation help:
  - `react-ui` for React, App Router, Tailwind, responsive UI, and accessibility.
  - `supabase-rls` for schema, migrations, RLS, storage policies, and server data access.
  - `vercel-release` for deployment, environment, build, and release readiness.
  - `qa-review` for regression review, checks, and acceptance coverage.
