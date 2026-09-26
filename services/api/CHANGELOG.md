# Changelog

## [0.2.0](https://github.com/manali-co/what-should-we-watch/compare/api-v0.1.0...api-v0.2.0) (2026-09-26)


### Features

* **api:** app factory, auth endpoints, me/export/delete with full tests ([240cbb0](https://github.com/manali-co/what-should-we-watch/commit/240cbb0dacfc70d7df0b501ccffd36ce5d981759))
* **api:** Apple/Google JWKS verification and ES256 app tokens ([a601f5f](https://github.com/manali-co/what-should-we-watch/commit/a601f5f17a6a1f5731f50aba8f1daefbf8e5b01d))
* **api:** Azure Functions ASGI host with lazy Cosmos access ([9546193](https://github.com/manali-co/what-should-we-watch/commit/9546193959154414aa2235c0149616ece40fd7f2))
* **api:** Clerk user.deleted webhook — purge server data on account deletion ([d8a4bbe](https://github.com/manali-co/what-should-we-watch/commit/d8a4bbe277b0ea48bde9c3d6926f7977efe2e552))
* **api:** Key Vault ES256 signer with remote-signing path ([19510df](https://github.com/manali-co/what-should-we-watch/commit/19510df8408097f31ac376d50cad4059cbb3bd26))
* **api:** OpenAI-direct strong ranker (GPT-6 Astra) for where Azure lacks quota ([#29](https://github.com/manali-co/what-should-we-watch/issues/29)) ([4bdfda2](https://github.com/manali-co/what-should-we-watch/commit/4bdfda2c8f0726776b6d11c6d77e39e0f8540e07))
* **api:** real account deletion + data export (App Store + GDPR/CCPA) ([e9e042f](https://github.com/manali-co/what-should-we-watch/commit/e9e042f9a9fa67816f36d180d3df6e3e2e4f21f8))
* **api:** repository layer with in-memory test double ([3497926](https://github.com/manali-co/what-should-we-watch/commit/3497926d919581c14572f17ef999bc2c10ba1ca6))
* **api:** request/error logging to App Insights + configurable group-ranking model ([#28](https://github.com/manali-co/what-should-we-watch/issues/28) [#29](https://github.com/manali-co/what-should-we-watch/issues/29)) ([92e31fa](https://github.com/manali-co/what-should-we-watch/commit/92e31fa7db043d67f8191e8023b70491e25c251a))
* **auth:** Clerk sign-in (Apple/Google/email/passkeys) + Face ID lock ([95a529f](https://github.com/manali-co/what-should-we-watch/commit/95a529fdcbbec8126a1b79dd12529be75c1e998f))
* **catalog:** ingest US movies from Streaming Availability API + /v1/catalog/deck ([4724b54](https://github.com/manali-co/what-should-we-watch/commit/4724b5439c834fcf8497b08eec1b302789dadb29))
* **mobile+api:** real poster deck from the live catalog + CORS ([4da9bd3](https://github.com/manali-co/what-should-we-watch/commit/4da9bd3d11c58db9cf9c3f500b8baf456a77051f))
* **mobile:** wire ranked results + real taste — the mascot as the intelligence ([bb7d5a7](https://github.com/manali-co/what-should-we-watch/commit/bb7d5a76cb4aebab86d65e4adaa7b7b3b8ca86dc))
* **recs:** Astra-judge wiring + [#41](https://github.com/manali-co/what-should-we-watch/issues/41) vibe-embedding A/B experiment ([2dd98ce](https://github.com/manali-co/what-should-we-watch/commit/2dd98ce7da410eb62ee50936de7912fa1f6d3aea))
* **recs:** LLM recommendation engine with Cosmos vector search ([d17bb0d](https://github.com/manali-co/what-should-we-watch/commit/d17bb0d042a503fd4bb4c87fcfa1e39b2beb82c5))
* **recs:** LLM-ranked shortlist + real taste profile (intelligence, batch 1) ([7168c88](https://github.com/manali-co/what-should-we-watch/commit/7168c883253a468a1294e9969c04af0b9084868e))
* **recs:** personalise deck with moment, taste profile, and swipe history ([48e08be](https://github.com/manali-co/what-should-we-watch/commit/48e08be320e97400c61c692b975fc2e36f94e307))
* **recs:** vibe-&gt;movie search-index eval harness (P@k / nDCG@k / MRR) ([d1169f8](https://github.com/manali-co/what-should-we-watch/commit/d1169f88eb3adfff467332c5801f40ed3f00c8c7))


### Bug Fixes

* address CodeRabbit — validate reasoning effort, bump openai pin, clamp card height ([6552ffc](https://github.com/manali-co/what-should-we-watch/commit/6552ffcab2d51d21e7bd9b57aaea46b1c576c598))
* **api:** actually capture telemetry — instrument App Insights + fix deploy deps ([#28](https://github.com/manali-co/what-should-we-watch/issues/28)) ([fa86594](https://github.com/manali-co/what-should-we-watch/commit/fa86594e4ff17828ce896778930693d6ba2c9333))
* **api:** lazy Key Vault key load so health survives cold start; Functions publish layout ([f4c5ad9](https://github.com/manali-co/what-should-we-watch/commit/f4c5ad91873f76bc2ed64e91c6e2e641649b41a7))
* **api:** log recs failures instead of swallowing them ([#42](https://github.com/manali-co/what-should-we-watch/issues/42) [#28](https://github.com/manali-co/what-should-we-watch/issues/28)) ([78850cb](https://github.com/manali-co/what-should-we-watch/commit/78850cb25bebfcf702da78a81c7957459a6067c6))
* **api:** malformed identity tokens return 401 bad_token instead of 500 ([651826a](https://github.com/manali-co/what-should-we-watch/commit/651826a44e059cecf86bf9bd00e4579812524854))
* **api:** satisfy ruff line-length so CI passes ([38f14bf](https://github.com/manali-co/what-should-we-watch/commit/38f14bf6fd7f18689c6ecf3f2d3f4eeb3206f324))
* **catalog:** include no-poster films to widen the mood-matched pool ([4dce993](https://github.com/manali-co/what-should-we-watch/commit/4dce993cd22df44e08311e413f6d982c2bdd9744))
* MI KeyVault secret-read + webhook robustness (CodeRabbit [#68](https://github.com/manali-co/what-should-we-watch/issues/68)) ([3605dba](https://github.com/manali-co/what-should-we-watch/commit/3605dbae200ab714510e50baa4376b15ea97ead6))
* **recs:** eval correctness + reproducibility (CodeRabbit [#50](https://github.com/manali-co/what-should-we-watch/issues/50)) ([628de47](https://github.com/manali-co/what-should-we-watch/commit/628de477831a24f3fd57e2c89dcb613e27150e71))
* **recs:** short punchy verdict — the paragraph-long one broke the EndScreen ([2159175](https://github.com/manali-co/what-should-we-watch/commit/2159175ab3a3061c4ced0917c332563995eb6060))
