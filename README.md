# Chronos Atlas

An interactive 3D observatory for world history: 1,000 historical figures, 340 civilizational lifespans, 177+ countries with GDP, a live World Monitor news desk, a WebGL globe, a liquid timeline across 17,000 years, and a 3D Solar System — fully localized into 20 languages.

![Chronos Atlas](https://img.shields.io/badge/3D-WebGL-0a84ff) ![Languages](https://img.shields.io/badge/languages-20-4f8fff) ![Figures](https://img.shields.io/badge/figures-1%2C000-8b7dff)

## Highlights

- **World Monitor** — live global headlines from GDELT with automatic fallbacks to Google News, Bing News and established world-news wires. Nothing to configure and no API key needed. Includes a 3D news globe, hotspot map, watchlist, saved stories, CSV export, live aircraft (OpenSky) and per-story Wikipedia context.
- **1,000 historical figures** — rulers, scientists, philosophers, explorers, strategists and artists from 3,500 BCE to the present, with Turkish + English names, roles and summaries.
- **340 civilizations** — peak territory, population, GDP share, inventions, rulers, architecture and wars.
- **Liquid Timeline** — 17,000 years in one zoomable object with wars, trade arteries and GDP trajectories.
- **3D Solar System** — planetary telemetry, missions and an orbiting probe.
- **20 languages**, right-to-left support, script-aware typography, and automatic browser-language detection on first visit. A server-side translation layer localizes every visible word (the Chronos Atlas name stays as-is).
- **Live encyclopedia** — Wikipedia summaries, photos and World Bank GDP in place, server-proxied and cached.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5000
```

Production:

```bash
npm run build
npm start          # serves dist/ + APIs on PORT (default 3000 as set in .env)
```

Copy `.env.example` to `.env` to change the port or add optional keys. Everything works without keys; `GEMINI_API_KEY` is only needed for the AI historian assistant.

## Architecture

| Path | Purpose |
| --- | --- |
| `server.ts` | Express + Vite host, all keyless API proxies (news, aircraft, Wikipedia, World Bank, translation, AI) |
| `src/views/` | Home, Timeline, Explore, Monitor, Civilizations/Countries, Solar System, Academy, Settings |
| `src/components/MonitorGlobe.tsx` | three.js monitor globe with quality scaling, context-loss recovery and marker diffing |
| `src/components/Globe3D.tsx` | Historical 3D Earth with borders, pins and trade routes |
| `src/i18n/` | 20-language catalogs, phrasebook, browser detection, runtime auto-translation |
| `src/data/` | Civilizations, figures, countries, events, wars, trade routes, media |

## Data & attribution

Headlines belong to their original publishers (GDELT Project, Google News, Bing News, BBC, Al Jazeera, DW). Aircraft data from the OpenSky Network. Encyclopedia text from Wikipedia (CC BY-SA). GDP from the World Bank. This project is an educational atlas, not an authoritative scholarly source.

## License

MIT
