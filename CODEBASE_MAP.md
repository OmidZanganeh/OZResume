# Codebase map — Omid Zanganeh resume / tools site

**Read this file first** before opening many source files. Update this doc when you add routes, APIs, or major features.

## What this repo is

- **Next.js 16** (App Router) personal site: resume, projects, **AI News**, and many **browser-based GIS/PDF tools**.
- **Styling:** `app/globals.css` + CSS Modules per page (`*.module.css`).
- **Theme:** `app/context/ThemeContext.tsx` + `DarkModeToggle`.
- **Deploy:** Vercel-oriented; some APIs use Redis (`ioredis`) where configured.

## Top-level layout

| Path | Role |
|------|------|
| `app/layout.tsx` | Root layout, fonts, theme provider |
| `app/page.tsx` | Resume landing (client); header, stats, jobs, sidebar, `ToolsHoverCard` |
| `app/globals.css` | Global styles, `html { zoom }` etc. |
| `app/sitemap.ts`, `app/robots.ts` | SEO |
| `app/opengraph-image.tsx` | Dynamic OG |
| `public/` | Static assets (images, PDF resume) |
| `.cursorignore` | Excludes deps, build output, `.env*`, logs, `archive/`, root `gis_*` exports from indexing |
| `archive/` | Local bulky files (exports, screenshots); not indexed — see `archive/README.md` |
| `.cursor/rules/` | Cursor rules; `project-context.mdc` is always applied |

## App routes (pages)

| URL | Main file(s) |
|-----|----------------|
| `/` | `app/page.tsx` |
| `/projects` | `app/projects/page.tsx` |
| `/news` | `app/news/page.tsx`, `app/news/layout.tsx` |
| `/tools` | `app/tools/page.tsx`, `app/tools/page.module.css` |
| `/tools/gis-downloader` | `app/tools/gis-downloader/page.tsx`, `MapPanel.tsx`, `layout.tsx`, `page.module.css` |
| `/tools/pdf-image-tools` | `app/tools/pdf-image-tools/page.tsx`, `format-utils.ts`, `layout.tsx` |
| `/tools/image-tools` | `app/tools/image-tools/page.tsx` (CSV→GeoJSON, EXIF) |
| `/tools/coordinate-converter` | `page.tsx`, `MapPicker.tsx` |
| `/tools/unit-converter` | `page.tsx` |
| `/tools/isochrone` | `page.tsx`, `IsochroneMap.tsx` |
| `/tools/elevation-profile` | `page.tsx`, `ElevationMap.tsx` |
| `/tools/geocoder` | `page.tsx`, `GeocoderMap.tsx` |
| `/tools/census` | `page.tsx`, `CensusMap.tsx` |

## API routes (`app/api/*/route.ts`)

| Route | Purpose (short) |
|-------|------------------|
| `ai-news` | Fetches/aggregates AI news for `/news` |
| `census` | Census/ACS proxy |
| `elevation` | Elevation/tile proxy |
| `geocode` | Geocoding proxy |
| `gis-proxy` | Generic GIS/fetch proxy |
| `isochrone` | Isochrone backend |
| `overpass` | OpenStreetMap Overpass proxy |
| `visitors` | Visitor counter |
| `leaderboard` | Game leaderboard |
| `sudoku` | Sudoku puzzle API |
| `gym-flow/data` | Gym Flow cloud JSON (auth required) |
| `gym-flow/profile` | PATCH merge `userProfile` into cloud payload (auth + DB) |
| `gym-flow/register` | Email/password Gym Flow registration |
| `gym-flow/nutrition/search` | USDA FoodData Central + Open Food Facts search (auth; `USDA_FDC_API_KEY` optional for USDA) |
| `gym-flow/nutrition/item` | USDA FDC or Open Food Facts product detail; codes `usda:{fdcId}` vs barcode |

## Shared UI components (`app/components/`)

| Component | Used for |
|-----------|-----------|
| `GameHub.tsx` | Game modal from resume “Bored?” |
| `RecruiterTour.tsx` | Neon “Recruiter tour” modal + Geo-Bot mascot (header **✨ Recruiter tour**) |
| `ToolsHoverCard.tsx` | Header tools dropdown on resume |
| `ContactForm.tsx`, `VisitorCounter.tsx` | Footer / contact |
| `JourneySection.tsx`, `SkillRadar.tsx`, `SkillBar.tsx` | Resume sections |
| `ScrollFadeIn.tsx` | Scroll animations |
| `games/*` | Individual mini-games |

## Heavy / special dependencies

- **GIS:** `leaflet`, `react-leaflet`, `jszip`, `osmtogeojson`, custom shapefile writer in gis-downloader.
- **PDF/image tools:** `pdf-lib`, `pdfjs-dist` (worker from jsDelivr), `jszip`.
- **EXIF:** `exifr`.

## Conventions for edits

- **New tool page:** Add under `app/tools/<name>/`, register in `app/tools/page.tsx`, `ToolsHoverCard.tsx`, `sitemap.ts`, and JSON-LD in `app/tools/page.tsx` if needed.
- **GIS downloader UI/layout bugs:** Often `page.module.css` + flex/`min-height: 0`; remember global `zoom` affects viewport behavior.
- **SEO for a tool:** Prefer `app/tools/<tool>/layout.tsx` metadata + sitemap entry.

## Gym Flow PWA

| Item | Path / value |
|------|--------------|
| Source | `Gym Webapp/src/` — React + Vite app |
| Build cmd | `cd "Gym Webapp" && npm run build` (runs `tsc && vite build`) |
| Output | `public/gym-flow/` ← Vite writes directly here (see `vite.config.ts`) |
| Served at | `/gym-flow/` (Next.js treats `public/` as static) |
| Cloud backup | Signed-in users: in-memory app state + `GET/PUT /api/gym-flow/data` (no localStorage for workout data). Optional profile step `/gym-flow-profile-setup` · `PATCH /api/gym-flow/profile`. Unsigned: data is session-only until sign-in. |
| Env | `.env.example` — `DATABASE_URL` **or** `POSTGRES_URL` (Vercel template), `AUTH_SECRET`, `AUTH_GOOGLE_*` · helper `lib/db/database-url.ts` |
| PWA listing | `app/web-apps/page.tsx` |
| Summary tab | `Gym Webapp/src/App.tsx` — `view === 'summary'`: calendar, nutrition overview panel (3 cards), analysis-period chips, `MuscleSpider`, `BodyMapFigure`. Bottom nav: Summary → Plans → Activity → Nutrition → Settings. |

**Edit flow:** change files in `Gym Webapp/src/` → run build → commit `public/gym-flow/` → deploy to Vercel.

## Out of index / ignore

- **`archive/`** and **`.cursorignore`** patterns: do not rely on these for edits; move noise into `archive/` to save tokens.
- Root **`gis_*.geojson`** / **`gis_*.kml`**: in `.cursorignore`.
