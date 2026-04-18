# CLAUDE.md — web

Astro frontend app: "THE ARCHIVE", a DVD-era movie catalog connected to the GraphQL backend in `../api`.

## Node.js Version

Uses Node.js **24** as specified in [.nvmrc](.nvmrc). Always activate it before any command:

```bash
nvm use   # reads .nvmrc automatically
```

## Commands

```bash
# Development
pnpm dev           # Dev server → http://localhost:4321

# Build & Preview
pnpm build         # Static build → dist/
pnpm preview       # Preview the build (port 4321)

# Testing
pnpm test              # Vitest (15 tests, run mode)
npm run test:watch    # Vitest in watch mode
npm run test:coverage # Coverage report → coverage/

# Performance audit (requires dev server running)
npm run lighthouse    # Unlighthouse against http://localhost:4321
```

## Architecture

**Stack:** Astro 6 (SSG) + Tailwind CSS v4 + Vitest + Unlighthouse  
**Node:** 24 · **Package manager:** pnpm

### Feature structure

```
src/
├── features/
│   ├── catalog/                        # Feature: movie listing
│   │   ├── components/
│   │   │   ├── MovieCard.astro         # DVD case card with animated disc on hover
│   │   │   └── MovieGrid.astro         # Responsive grid (2→5 columns)
│   │   ├── services/
│   │   │   ├── movies.mock.ts          # 10 hardcoded movies
│   │   │   ├── movies.mock.test.ts     # Mock data tests
│   │   │   ├── movies.service.ts       # GraphQL fetch + mock fallback
│   │   │   └── movies.service.test.ts  # Service tests (with/without endpoint)
│   │   └── types/movie.types.ts        # Types: Movie, Chapter, BonusMaterial…
│   └── movie-details/                  # Feature: movie detail
│       └── components/MovieModal.astro # SSG modal + vanilla JS (no framework)
├── layouts/
│   └── BaseLayout.astro                # Header + Sidebar + BottomNav + SEO meta
├── pages/
│   └── index.astro                     # Main page — composes grid + modal
└── styles/
    └── global.css                      # Tailwind @theme + custom DVD classes
```

### Key patterns

**GraphQL with mock fallback:** `movies.service.ts` reads `import.meta.env.PUBLIC_GRAPHQL_URL` inside each function (not at module level) to allow stubbing in tests. If the variable is empty, it returns `MOCK_MOVIES` without fetching.

**SSG modal:** `MovieModal.astro` pre-renders a `<template data-movie-template="id">` per movie at build time. On card click, JS clones the matching template and injects it into the DOM — no runtime fetch, no React/Vue.

**Dynamic module testing:** Tests that exercise the endpoint branches use `vi.resetModules()` + dynamic `import()` to force re-evaluation of `import.meta.env` per test case. See `movies.service.test.ts`.

### Design — "The Digital Rental Archive"

The full design system is documented in [../designs/DESIGN.md](../designs/DESIGN.md). Critical rules:

- **No 1px borders.** Separation is achieved through `surface` token shifts.
- **Max border-radius `xl` (0.5rem).** No pills.
- **Palette:** `surface` `#111317` · `primary-container` `#e50914` (red) · `secondary-container` `#ffdb3c` (Blockbuster yellow).
- **Fonts:** `font-headline` Epilogue · `font-label` Space Grotesk · `font-body` Work Sans.
- **Custom classes in global.css:** `.dvd-sheen`, `.dvd-spine`, `.dvd-bezel`, `.disc-rainbow`, `.plastic-texture`, `.remote-glow`.

### Environment variables

| Variable | Purpose |
|---|---|
| `PUBLIC_GRAPHQL_URL` | GraphQL endpoint URL (`../api` in prod). Empty → uses mock. |

Copy [.env.example](.env.example) to `.env` and adjust.

### Connecting to the API

The backend runs at `http://localhost:3000/graphql` by default (see [../api/CLAUDE.md](../api/CLAUDE.md)).

```bash
# .env
PUBLIC_GRAPHQL_URL=http://localhost:3000/graphql
```

### Unlighthouse

Configured in [unlighthouse.config.ts](unlighthouse.config.ts). Minimum budget: **90** across Performance, Accessibility, Best Practices, and SEO. Report is generated in `.unlighthouse/` (gitignored).
