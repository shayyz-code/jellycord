# JellyCord

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwindcss&logoColor=white)
![Supabase 2.x](https://img.shields.io/badge/Supabase-2.x-3ECF8E?logo=supabase&logoColor=white)
![Electron v39](https://img.shields.io/badge/Electron-39-47848F?logo=electron&logoColor=white)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

JellyCord is a small social app crafted to help you stay connected with friends and share your vibe. It includes:

- Web app built with Next.js App Router, Tailwind CSS v4, and Supabase for auth/data
- Dynamic OG image generation and a customizable public profile page
- Desktop app built with Electron + React with a simple WebRTC demo
- Lightweight Socket.IO signaling server (Bun) for peer-to-peer connectivity

## Monorepo Structure

```
.
├─ server/               # Go chat server (rooms/chat/JWT, Docker)
├─ cli/                  # Go CLI chat client
├─ web/                  # Next.js 16 app (React 19, Tailwind v4)
│  ├─ app/               # App Router pages, API routes, middleware
│  ├─ components/        # UI components (Radix UI, shadcn-style), utilities
│  └─ package.json
├─ desktop/              # Electron + React app (electron-vite)
│  ├─ src/               # main/preload/renderer
│  ├─ server/signaling/  # Socket.IO signaling server (Bun)
│  └─ package.json
└─ README.md
```

## Features

- Supabase OAuth login and session management
- Public profile with avatar, banner, links, color theme
- Status feed with CRUD API routes backed by Supabase tables
- OG image endpoint that renders profile metadata
- Tailwind CSS v4 theming with light/dark support
- Electron desktop app showcasing WebRTC (camera/microphone), uses signaling server

## Requirements

- Node.js 20+
- npm (or your preferred package manager)
- Supabase project (URL and anon key)
- Optional: Bun (for the signaling server in `desktop/server/signaling`)

## Quick Start

### 1) Web App

1. Install dependencies:

```bash
cd web
npm install
```

2. Create `.env.local` in `web/`:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run the dev server:

```bash
npm run dev
```

The app runs at http://localhost:3000.

### 2) Database Schema (Supabase)

Create the following tables in your Supabase project. Adjust types and constraints as you see fit.

```sql
-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  name text,
  bio text,
  avatar text,
  character text,
  banner text,
  primary_color text,
  links jsonb
);

-- statuses
create table if not exists public.statuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text,
  mood text,
  created_at timestamp with time zone default now()
);

-- Useful index for filtering by user
create index if not exists idx_statuses_user_id on public.statuses(user_id);
```

### 3) Desktop App (Electron)

1. Install dependencies:

```bash
cd desktop
npm install
```

2. Start in development:

```bash
npm run dev
```

3. Typecheck and build:

```bash
npm run typecheck
npm run build
```

The Electron app uses `electron-vite` and React. Source code lives under `desktop/src`.

### 4) Signaling Server (Socket.IO + Bun)

The Electron WebRTC demo connects to a Socket.IO signaling server:

```bash
cd desktop/server/signaling
bun install
npm run start       # or: bun run index.ts
```

By default, this server listens on http://localhost:3000. The Electron renderer connects to that URL.

Note: The web app also defaults to port 3000 in development. If you need both running simultaneously, run the web app on a different port:

```bash
cd web
PORT=3001 npm run dev
```

## Notable Endpoints and Files

- API routes (web):
  - `/app/api/profile/route.ts` – profile CRUD backed by Supabase
  - `/app/api/status/route.ts` – status feed CRUD
  - `/app/api/og/route.tsx` – dynamic OG image
- Auth:
  - `/app/auth/callback/route.ts` – Supabase OAuth code exchange and profile bootstrap
  - `middleware.ts` + `lib/middleware-utils.ts` – session propagation for SSR
- Styling:
  - `app/globals.css` – Tailwind v4 tokens and theming

## Scripts

### Web

- `npm run dev` – start Next.js dev server
- `npm run build` – build for production
- `npm run start` – start production server
- `npm run lint` – lint the codebase

### Desktop

- `npm run dev` – start Electron in development
- `npm run build` – build Electron app
- `npm run build:mac|win|linux` – package for platforms
- `npm run typecheck` – run TypeScript checks
- `npm run lint` – lint the codebase

### Signaling Server

- `npm run start` (via Bun) – start the Socket.IO server

## Deployment Notes

- Web can be deployed to any Next-compatible host (e.g., Vercel). Set the environment variables used above.
- Ensure `NEXT_PUBLIC_APP_URL` is set to your deployed origin for correct OG image and robots/sitemap URLs.
- For the desktop auto-updater, see `desktop/electron-builder.yml` and `desktop/dev-app-update.yml`.

### Go Chat Server (Docker on VPS)

- **Prod compose**: `docker-compose.prod.yml`
- **Deploy config**: copy `.env.deploy.example` to `.env.deploy` and set:
  - `JELLYCORD_VPS_IP`
  - `JELLYCORD_BIND_IP` (default `127.0.0.1`)
  - `JELLYCORD_HOST_PORT` (default `8080`)
- **Secrets**: copy `.env.secrets.example` to `.env.secrets` and set:
  - `JELLYCORD_JWT_SECRET`
  - `JELLYCORD_ADMIN_KEY`

Run on VPS:

```bash
./scripts/vps-deploy.sh
cd ~/jellycord
cp .env.deploy.example .env.deploy
nano .env.deploy
cp .env.secrets.example .env.secrets
nano .env.secrets
docker compose --env-file .env.deploy -f docker-compose.prod.yml --env-file .env.secrets up -d --build
```

## License

[MIT](./LICENSE)

## Contributing

Open issues and pull requests are welcome. Please lint and typecheck before submitting changes.
