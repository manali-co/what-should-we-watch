# What Should We Watch — v0 design

Status: approved 2026-09-20. Owner: Ayush (manali-co). Publisher brand: **Manali**.

## 1. Product

A mood-driven film picker for iOS and Android. You open it on the couch, pick one or more moods, and it deals a deck of ten films that are **actually available on your streaming services in your country right now**. You swipe to decide. Every decision teaches it. Later, a group of people can decide together.

Origin: the "Tonight" artifact (https://claude.ai/artifact/BcsmvgSHbxmxXs3FQUShvH). v0 targets parity with that artifact's core loop, minus imports, plus real availability.

### Goals for v0

- Installable by friends via TestFlight and Play internal testing.
- Sign in with Apple and Google. No passwords anywhere.
- Onboarding: country, services (auto-detected from installed apps, user confirms), sign-in last.
- Mood picker (design from the Claude Design project; three concepts, one chosen).
- Deck of ten real, available films with poster, service, expiry note, and a one-line "why".
- Swipes: **left = dislike, right = like (strong shortlist), up = maybe, down = watched → then pills liked / okay / disliked**. Same three pills under the card.
- Deck re-ranks in real time: when three cards remain, the next ten are fetched with this session's swipes weighted.
- Shortlist grouped by strong yes and maybe, with "Watch now" deep links.
- Close the loop: after "Watch now", the next app open asks "Did you watch X?" (yes / no / started it) then the reaction pills.
- Taste page: what the model has learned, in plain sentences, plus simple patterns.
- Settings: country, services, sign-in accounts, theme, follow-up notification, data export, delete account.
- Feels as smooth as Apple's own apps: gestures on the UI thread, native stack navigation, haptics, posters preloaded with blurred placeholders.

### Non-goals for v0

- No watch-history imports of any kind (no CSV, no paste, no screenshots, no scraping).
- No TV / Chromecast detection (candidate for a later release).
- No group mode (but the data model carries participants from day one).
- No web app. No monetization. No analytics beyond crash reporting.
- Countries other than the US (catalog is US-only in v0 to stay within the free data tier; the schema is per-country from the start).

### Hard rules

- **Geography.** A title appears only if it is on one of the user's services in the user's country today. Never "probably on Netflix". Availability comes from stored data with an expiry date, never from the model.
- **No TMDB.** Its terms forbid use in AI-based applications and as an image host.
- **No money reaches the developer.** Free app, no donations, no ads (immigration constraint).

## 2. Architecture (Approach A, approved)

- **Mobile:** Expo (managed, new architecture), TypeScript, expo-router, react-native-reanimated + react-native-gesture-handler for the deck, expo-image, TanStack Query, a small Zustand store, expo-secure-store for tokens, expo-haptics. Typed API client generated from the API's OpenAPI document.
- **API:** FastAPI (Python 3.12) hosted on **Azure Functions Flex Consumption** via ASGI. Routes under `/v1`.
- **Data:** **Azure Cosmos DB serverless (NoSQL)** with built-in vector indexing (DiskANN). No Azure AI Search.
- **Posters:** copied at ingest into **Azure Blob Storage**, served via Azure CDN / Front Door, WebP at two widths (300, 600) plus a blurhash.
- **Catalog source:** Movie of the Night **Streaming Availability API** (free tier 1,000 requests/month; commercial use allowed). Attribution shown in Settings › About.
- **LLM:** Azure OpenAI reasoning models. Default `gpt-5.4-mini` at medium effort; `gpt-5.4-nano` fallback. Structured outputs (JSON schema). Embeddings: `text-embedding-3-large` (or the Azure equivalent available in the region).
- **Auth:** native Sign in with Apple and Google Sign-In SDKs in the app → identity token → API verifies against Apple/Google JWKS → API issues its own ES256 access token (15 min) + rotating refresh token (30 days, hashed at rest, reuse detection).
- **Secrets:** Azure Key Vault, accessed by managed identity. No secrets in the repo, ever.
- **Infra:** Bicep deployed with the Azure Developer CLI (`azd`). Two environments, `dev` and `prod`, in the `manali` subscription.
- **CI/CD:** GitHub Actions with a `dev` → `main` release flow (see §10). EAS Build for mobile binaries.

### Repo layout (monorepo, github.com/manali-co/what-should-we-watch)

```
apps/mobile/            Expo app
services/api/           FastAPI app (Functions host)
packages/recs/          recommendation engine (Python package, own semver)
packages/catalog/       catalog ingest + poster pipeline (Python package)
packages/api-client/    generated TypeScript client
infra/                  Bicep + azure.yaml
docs/                   specs, plans, ADRs
.github/workflows/      CI
```

Python packages managed with **uv** workspaces; JavaScript with **pnpm** workspaces.

## 3. Data model (Cosmos DB, one database `wsww`)

| Container | Partition key | Purpose |
|---|---|---|
| `users` | `/id` | `id`, `providers[{provider: apple|google, subject}]`, `displayName?`, `country`, `services[]`, `settings{theme, followupNotifications}`, `createdAt`, `deletedAt?` |
| `sessions` | `/userId` | `id`, `userId`, `participants[userId]`, `moods[]`, `company`, `length`, `moment{localHour, daypart, weekday, isWeekend, season, holidayWindow, timeZone}`, `country`, `services[]`, `recsVersion`, `read`, `picks[]`, `createdAt` |
| `decisions` | `/userId` | `id`, `userId`, `sessionId`, `titleId`, `action: dislike|like|maybe|watched`, `reaction?: liked|okay|disliked`, `dwellMs`, `rank`, `wildcard`, `at` |
| `shortlist` | `/userId` | `userId`, `titleId`, `level: yes|maybe`, `addedAt`, `watchNowAt?`, `service?` |
| `followups` | `/userId` | `id`, `userId`, `titleId`, `askedAfter`, `answer?: watched|no|started`, `reaction?`, `answeredAt?` |
| `taste` | `/userId` | `userId`, `notes` (≤140 words, model-written), `vector[]`, `updatedAt` |
| `catalog` | `/country` | `id` (provider id), `country`, `title`, `year`, `runtimeMin`, `genres[]`, `overview`, `directors[]`, `cast[]`, `rating`, `embedding[]`, `poster{path, blurhash}`, `availability[{service, type: subscription|free|rent|buy, link, expiresOn?}]`, `updatedAt`, `removedAt?` |
| `refreshTokens` | `/userId` | `id` (hash), `userId`, `family`, `expiresAt`, `usedAt?` |

Rules: every write is idempotent by id. `deletedAt` on a user triggers a purge job across all containers. Nothing stores email addresses.

## 4. API surface (`/v1`)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/apple` | body: identity token, optional name → tokens |
| POST | `/auth/google` | body: id token → tokens |
| POST | `/auth/refresh` | rotating refresh; reuse → revoke family |
| POST | `/auth/logout` | revoke family |
| GET/PATCH | `/me` | profile, country, services, settings |
| GET | `/me/export` | JSON of everything about the user |
| DELETE | `/me` | schedules purge; immediate token revoke |
| GET | `/catalog/services?country=US` | services offered in a country |
| GET | `/catalog/titles/{id}` | one title with availability |
| POST | `/sessions` | body: moods, company, length, moment → `{sessionId, read, picks[10]}` |
| POST | `/sessions/{id}/decisions` | body: decision → 204 |
| POST | `/sessions/{id}/more` | next ten, weighted by this session's decisions |
| GET | `/shortlist` | grouped client-side |
| POST | `/shortlist/{titleId}/watch-now` | records intent, returns deep link, creates followup |
| DELETE | `/shortlist/{titleId}` | |
| GET | `/followups/pending` | at most one |
| POST | `/followups/{id}` | answer + reaction |
| GET | `/taste` | notes + pattern summaries |

Errors are a typed envelope `{code, message}`; the client maps every `code` to friendly copy. Rate limit: 60 requests/min/user, 20 deck requests/day/user in v0.

## 5. Recommendation engine (`packages/recs`)

Public interface: `rank(request: RankRequest) -> RankResult`, where the request carries the session, the user's taste, recent decisions, and a candidate list, and the result carries ten picks (about 7 core, 2 stretch, 1 wildcard), a one-sentence `read`, and rewritten `taste_notes`.

Pipeline:

1. **Query build.** Moods (+ custom words) → embedding. Filters: country, services, runtime by `length`, exclude titles decided in the last 30 days and anything on the shortlist.
2. **Candidate generation.** Cosmos vector search, top 60.
3. **Re-rank.** Reasoning model with structured output. Prompt includes: the moment, moods, company, length, taste notes, the last 160 decisions summarised, this session's decisions so far (weighted highest), and the 60 candidates with metadata. Every candidate is real and available by construction; the model may only choose from the list.
4. **Persist.** Session picks, taste notes, recs version.

Real-time: the client calls `/more` when three cards remain; the engine re-runs with this session's swipes weighted highest and previous picks excluded.

Budget guards: 60 s timeout, one retry on nano, prompt size capped, per-user daily deck cap.

Evaluation: a growing set of recorded sessions with human-labelled "good pick" judgments; a score is reported in CI. The threshold for 1.0.0 is set once ≥ 50 sessions exist.

## 6. Catalog pipeline (`packages/catalog`)

- Initial load per country: page through the provider's search-by-filters for movies on the supported services; write to `catalog`.
- Daily timer (Functions): pull the changes feed since the last watermark; upsert availability, set `expiresOn`, set `removedAt` for departures.
- Poster pipeline: download once, generate WebP 300/600 + blurhash, upload to Blob, store the path. **Open item:** confirm the provider's terms allow storing images; if not, cache at the edge instead.
- Embeddings computed on insert/metadata change only.
- Supported services in v0 (US): Netflix, Disney+, Hulu, Apple TV+, HBO Max, Prime Video, Paramount+, Peacock.

## 7. Mobile app

Screens (expo-router): `onboarding/*`, `(tabs)/tonight`, `(tabs)/shortlist`, `(tabs)/taste`, `settings/*`, `followup` (modal on launch when pending).

- **Installed-app detection:** iOS `canOpenURL` with declared schemes; Android package queries with `<queries>`. Pre-tick detected services; user confirms.
- **Deck:** gesture + reanimated worklets; thresholds and physics from the design's motion notes; stamps per direction; undo; next card visible underneath; posters prefetched for the whole deck.
- **Offline:** shortlist and last deck cached; deck requests disabled with a clear message.
- **Theming:** tokens from the Claude Design project (`theme.ts`), dark and light.
- **Accessibility:** buttons mirror every swipe; reduced-motion respected; dynamic type supported.

Quality bar (measured on a mid-range Android and an iPhone two generations old): no dropped frames during a swipe, cold start < 1.5 s to the mood screen, deck reveal < 100 ms after data arrives.

## 8. Security and privacy

- Identity tokens verified against Apple and Google JWKS (cached, rotated).
- Access token: ES256, 15 min, key in Key Vault. Refresh: 30 days, rotating, hashed, family revocation on reuse.
- Stored PII: provider subject, optional display name, country. No email.
- Export and delete endpoints live from sub-project one.
- Managed identity for all Azure-to-Azure access. Secrets never in code, CI logs, or the app bundle.
- Dependencies pinned; Dependabot on.

## 9. Testing

- **API:** pytest; repository abstraction with an in-memory implementation for unit tests and the Cosmos emulator for integration; contract tests generated from the OpenAPI document.
- **Recs:** golden tests on recorded model outputs; the evaluation set above.
- **Catalog:** fixture-based tests for the changes feed and poster pipeline.
- **Mobile:** Jest + React Native Testing Library for logic and components; Maestro flows for onboarding and the deck.
- **CI:** ruff, mypy, pytest; eslint, tsc, jest; on every PR. Main is protected.

## 10. Versioning and releases

Three independent semver streams: `api` (also `/v1` path), `mobile` (app version + build number), `recs` (package version, stamped on every session). Conventional commits; changelogs per package; release-please.

### Branching and CI/CD

- **Branches:** `feature/*` → PR into `dev` → PR from `dev` into `main`. `main` is release-only. Both `dev` and `main` are protected: PR required, CI green required, linear history.
- **CI on every PR:** lint, typecheck, unit and contract tests for every package touched (path-filtered so a mobile-only PR does not run the Python suite). Preview builds of the mobile app via EAS on `dev` PRs when `apps/mobile` changes.
- **Merge to `dev`:** deploys API, catalog jobs and infra to the Azure **dev** environment (`rg-wsww-dev`) with `azd deploy`. Mobile: an EAS development build published to the internal channel (over-the-air update when only JS changed).
- **Merge to `main` (release):** release-please opens or updates a release PR that bumps each changed package's version and changelog. Merging that PR tags `api-vX.Y.Z`, `recs-vX.Y.Z`, `mobile-vX.Y.Z`; the tag workflow deploys to the Azure **prod** environment (`rg-wsww-prod`) and runs EAS production builds submitted to TestFlight and Play internal testing.
- **Environments:** two Azure environments in the `manali` subscription, `dev` and `prod`, same Bicep, different parameters. Secrets per environment in Key Vault; GitHub Actions authenticates with OIDC federated credentials (no long-lived Azure secrets in GitHub).
- **Rollback:** redeploy the previous tag. Cosmos schema changes are additive only in v0.

**1.0.0 criteria:** live on both stores; follow-up loop closing for real users; crash-free sessions ≥ 99.5% over 30 days; every screen in both themes with no accessibility errors; recs evaluation score at or above the threshold set from data; zero P1 bugs open; TMDB-free and attribution correct.

## 11. Build order (sub-projects, each with its own plan)

1. **Foundation:** repo, workspaces, CI/CD with the dev → main release flow, infra for dev and prod (Functions, Cosmos, Blob, Key Vault), auth endpoints, `/me`, export, delete.
2. **Catalog:** provider client, initial US load, daily sync, poster pipeline, embeddings.
3. **Recs:** `packages/recs`, `/sessions` and `/more`, evaluation harness.
4. **Mobile:** design tokens, onboarding, mood screen, deck, shortlist, settings.
5. **Loop and taste:** watch-now, follow-ups, taste page.
6. **Polish:** offline, errors, motion tuning, TestFlight and Play internal testing.

## 12. Open items

- Confirm the Streaming Availability API terms on storing poster images.
- Confirm Azure OpenAI quota for `gpt-5.4-mini` in the chosen region.
- Choose the mood-selector concept once the Claude Design variants are reviewed.
- Apple Developer enrollment (individual) and Play developer name "Manali" pending user action.
