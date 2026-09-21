# What Should We Watch

A mood-driven film picker for iOS and Android, by **Manali**.

Pick one or more moods and get a deck of ten films that are actually available on
your streaming services in your country right now. Swipe to decide; every decision
teaches it.

## Monorepo

- `services/api` — FastAPI on Azure Functions (Flex Consumption)
- `packages/recs` — recommendation engine (later sub-project)
- `packages/catalog` — catalog ingest + poster pipeline (later sub-project)
- `apps/mobile` — Expo / React Native app (later sub-project)
- `infra` — Bicep + azd
- `docs/superpowers` — specs and plans

Python is managed with **uv**, JavaScript with **pnpm**.

## Data & attribution

This app does **not** use TMDB. Streaming availability comes from the
Streaming Availability API; the app renders the required **JustWatch** attribution
in Settings › About.
