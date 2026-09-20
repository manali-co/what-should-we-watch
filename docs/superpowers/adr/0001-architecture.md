# 0001 — Foundation architecture

Accepted 2026-09-20. See `docs/superpowers/specs/2026-09-20-what-should-we-watch-v0-design.md`.

- Monorepo: uv (Python) + pnpm (JS).
- API: FastAPI on Azure Functions Flex Consumption; Cosmos DB serverless with vector search; Blob + CDN posters.
- Auth: native Apple/Google sign-in, API-issued ES256 access tokens + rotating refresh tokens.
- No TMDB (terms forbid AI use / image hosting); availability from the Streaming Availability API with JustWatch attribution.
- CI/CD: `feature/*` → `dev` → `main`; release-please; two Azure environments; GitHub→Azure via OIDC.
