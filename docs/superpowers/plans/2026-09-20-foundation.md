# Foundation (Sub-project 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the monorepo, CI/CD with a `dev` → `main` release flow, two Azure environments as Bicep, and a deployable FastAPI service with Apple/Google sign-in, `/me`, data export, and account deletion.

**Architecture:** A uv (Python) + pnpm (JS) workspace monorepo. FastAPI runs on Azure Functions Flex Consumption via an ASGI adapter, backed by Cosmos DB serverless. Auth verifies Apple/Google identity tokens against their JWKS and issues the app's own ES256 access tokens plus rotating refresh tokens. Infra is Bicep deployed by `azd`; GitHub Actions authenticates to Azure with OIDC federated credentials.

**Tech Stack:** Python 3.12, FastAPI, uvicorn, `azure-functions`, `azure-cosmos`, `pyjwt[crypto]`, `httpx`, `pydantic-settings`, pytest; Node 20, pnpm; Bicep + azd; GitHub Actions; release-please.

**Spec:** `docs/superpowers/specs/2026-09-20-what-should-we-watch-v0-design.md`

## Global Constraints

- Python **3.12**; Node **20**; package managers **uv** (Python workspace) and **pnpm** (JS workspace).
- Publisher brand is **Manali**; repo is `github.com/manali-co/what-should-we-watch`.
- API routes live under `/v1`. Error responses use the envelope `{"code": "<snake_case>", "message": "<human text>"}`.
- **No secrets in the repo, CI logs, or app bundle.** GitHub → Azure auth uses OIDC federated credentials only. App secrets come from Key Vault via managed identity.
- **No passwords** anywhere. Only provider subject + optional display name + country are stored for a user; never email.
- Access token: ES256, 15-minute lifetime, signing key in Key Vault. Refresh token: 30-day lifetime, rotating, stored hashed (SHA-256), reuse revokes the whole family.
- Azure subscription: `manali` (`a3e539ea-7688-46db-b78d-e73b4476439d`). Region **eastus2**. Environments `dev` (`rg-wsww-dev`) and `prod` (`rg-wsww-prod`).
- Branch flow: `feature/*` → PR into `dev` → PR into `main`. `main` is release-only. Conventional commits.
- Cosmos database `wsww`; containers and partition keys exactly as the spec's §3 table.
- Every write is idempotent by `id`.

---

## File Structure

```
pyproject.toml                      uv workspace root (members: services/api, packages/*)
pnpm-workspace.yaml                 pnpm workspace (apps/*, packages/api-client)
.python-version                     "3.12"
.gitignore .editorconfig
README.md                           project intro + attribution (TMDB-free; JustWatch attribution note)
.github/workflows/ci.yml            lint+typecheck+test on PRs, path-filtered
.github/workflows/deploy-dev.yml    on push to dev → azd deploy to dev
.github/workflows/release.yml       release-please on main
release-please-config.json .release-please-manifest.json
services/api/
  pyproject.toml                    package "wsww-api"
  host.json  function_app.py        Functions host + ASGI wire-up
  src/wsww_api/__init__.py
  src/wsww_api/app.py               FastAPI app factory, router mount, error handlers
  src/wsww_api/settings.py          pydantic-settings config
  src/wsww_api/errors.py            AppError + envelope
  src/wsww_api/db.py                 Cosmos client + container accessors (lazy)
  src/wsww_api/repositories/users.py
  src/wsww_api/repositories/tokens.py
  src/wsww_api/auth/jwks.py          Apple/Google JWKS verification
  src/wsww_api/auth/tokens.py        ES256 issue/verify, refresh hashing/rotation
  src/wsww_api/auth/deps.py          current-user dependency
  src/wsww_api/routers/auth.py       /v1/auth/*
  src/wsww_api/routers/me.py         /v1/me, /v1/me/export, DELETE /v1/me
  src/wsww_api/models.py             pydantic request/response models
  tests/...                          mirrors src
infra/
  azure.yaml                        azd project
  main.bicep  main.parameters.dev.json  main.parameters.prod.json
  modules/{cosmos,storage,keyvault,functions,identity,observability}.bicep
scripts/
  bootstrap_oidc.sh                 create Entra app + federated creds + role assignment (run once, by user or with az)
docs/superpowers/adr/0001-record-architecture-decisions.md
```

---

### Task 1: Workspace root + tooling scaffold

**Files:**
- Create: `pyproject.toml`, `.python-version`, `pnpm-workspace.yaml`, `.gitignore`, `.editorconfig`, `README.md`
- Create: `services/api/pyproject.toml`

**Interfaces:**
- Produces: a uv workspace resolvable with `uv sync`; the `wsww-api` package importable as `wsww_api`.

- [ ] **Step 1: Write the workspace root `pyproject.toml`**

```toml
[project]
name = "wsww"
version = "0.0.0"
requires-python = ">=3.12"

[tool.uv.workspace]
members = ["services/api", "packages/*"]

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B"]

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true
```

- [ ] **Step 2: Write `services/api/pyproject.toml`**

```toml
[project]
name = "wsww-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn>=0.30",
  "azure-functions>=1.21",
  "azure-cosmos>=4.7",
  "azure-identity>=1.17",
  "azure-keyvault-keys>=4.9",
  "pyjwt[crypto]>=2.9",
  "httpx>=0.27",
  "pydantic>=2.8",
  "pydantic-settings>=2.4",
]

[project.optional-dependencies]
dev = ["pytest>=8", "pytest-asyncio>=0.23", "ruff>=0.6", "mypy>=1.11", "respx>=0.21"]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/wsww_api"]
```

- [ ] **Step 3: Write `.python-version` (`3.12`), `pnpm-workspace.yaml` (packages: `apps/*`, `packages/api-client`), `.gitignore` (Python, Node, `.venv`, `.azure`, `local.settings.json`, `__blobstore__`), `.editorconfig`, and a `README.md`** that states the app is TMDB-free and will render the JustWatch attribution required by the data source.

- [ ] **Step 4: Verify the workspace resolves**

Run: `cd services/api && uv sync --extra dev && uv run python -c "import fastapi, azure.cosmos, jwt; print('ok')"`
Expected: prints `ok`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: scaffold uv/pnpm monorepo workspace"
```

---

### Task 2: Settings and error envelope

**Files:**
- Create: `services/api/src/wsww_api/__init__.py`, `settings.py`, `errors.py`
- Test: `services/api/tests/test_errors.py`

**Interfaces:**
- Produces: `Settings` (pydantic-settings) with fields `cosmos_endpoint: str`, `cosmos_database: str = "wsww"`, `keyvault_uri: str`, `signing_key_name: str`, `apple_bundle_ids: list[str]`, `google_client_ids: list[str]`, `access_ttl_seconds: int = 900`, `refresh_ttl_days: int = 30`, `env: str = "dev"`; `get_settings() -> Settings` (cached).
- Produces: `AppError(code: str, message: str, status: int = 400)`; `error_body(code, message) -> dict`.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_errors.py
from wsww_api.errors import AppError, error_body

def test_error_body_shape():
    assert error_body("rate_limited", "slow down") == {"code": "rate_limited", "message": "slow down"}

def test_app_error_defaults():
    e = AppError("bad_token", "nope")
    assert e.status == 400 and e.code == "bad_token"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd services/api && uv run pytest tests/test_errors.py -v`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `errors.py` and `settings.py`**

```python
# errors.py
from dataclasses import dataclass

@dataclass
class AppError(Exception):
    code: str
    message: str
    status: int = 400

def error_body(code: str, message: str) -> dict:
    return {"code": code, "message": message}
```

```python
# settings.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="WSWW_", extra="ignore")
    cosmos_endpoint: str = ""
    cosmos_database: str = "wsww"
    keyvault_uri: str = ""
    signing_key_name: str = "wsww-api-signing"
    apple_bundle_ids: list[str] = []
    google_client_ids: list[str] = []
    access_ttl_seconds: int = 900
    refresh_ttl_days: int = 30
    env: str = "dev"

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd services/api && uv run pytest tests/test_errors.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(api): settings and error envelope"
```

---

### Task 3: Repository abstraction over Cosmos (in-memory + real)

**Files:**
- Create: `services/api/src/wsww_api/db.py`, `repositories/users.py`, `repositories/tokens.py`, `repositories/__init__.py`
- Test: `services/api/tests/repositories/test_users_inmemory.py`, `tests/repositories/test_tokens_inmemory.py`

**Interfaces:**
- Produces: protocol `ContainerLike` with `upsert(item: dict) -> dict`, `read(id: str, pk: str) -> dict | None`, `delete(id: str, pk: str) -> None`, `query(sql: str, params: list[dict], pk: str | None) -> list[dict]`.
- Produces: `InMemoryContainer` implementing it (test double).
- Produces: `UsersRepo(container)` with `get(user_id) -> User | None`, `upsert(user: User) -> User`, `find_by_provider(provider, subject) -> User | None`, `soft_delete(user_id) -> None`.
- Produces: `TokensRepo(container)` with `store(hash, user_id, family, expires_at)`, `get(hash) -> dict | None`, `mark_used(hash)`, `revoke_family(family)`.
- Produces: `User` pydantic model matching spec §3 `users`.

- [ ] **Step 1: Write failing tests** for: upsert-then-get roundtrip; `find_by_provider` returns the user; `soft_delete` sets `deleted_at` and `get` still returns it (purge is a separate job); token store/get/mark_used; `revoke_family` marks all tokens in a family used. (Write concrete assertions with an `InMemoryContainer`.)

- [ ] **Step 2: Run tests, verify they fail.**

Run: `cd services/api && uv run pytest tests/repositories -v` — Expected: FAIL (import errors).

- [ ] **Step 3: Implement `db.py`** with `ContainerLike` protocol, `InMemoryContainer` (dict keyed by `(pk, id)`; naive `query` supporting the two SQL shapes the repos use — filter by provider+subject, filter by family), and a lazy real accessor `get_container(name)` using `azure.cosmos.CosmosClient` with `DefaultAzureCredential`. Implement `repositories/users.py` and `repositories/tokens.py` against `ContainerLike` only (no Cosmos import in the repos).

- [ ] **Step 4: Run tests, verify PASS.**

- [ ] **Step 5: Commit** — `feat(api): repository layer with in-memory test double`.

---

### Task 4: JWKS verification for Apple and Google

**Files:**
- Create: `services/api/src/wsww_api/auth/__init__.py`, `auth/jwks.py`
- Test: `services/api/tests/auth/test_jwks.py`

**Interfaces:**
- Consumes: `Settings.apple_bundle_ids`, `Settings.google_client_ids`.
- Produces: `async verify_apple(identity_token: str) -> ProviderIdentity`; `async verify_google(id_token: str) -> ProviderIdentity`; `ProviderIdentity(provider: str, subject: str, name: str | None)`.
- Produces: `JwksCache` fetching keys from a URL with TTL, injectable for tests.

- [ ] **Step 1: Write failing test** using a locally generated RSA key: sign a fake identity token with the right `iss`/`aud`/`exp`, serve its public JWK through a stub `JwksCache`, assert `verify_apple` returns `ProviderIdentity(provider="apple", subject=<sub>, ...)`; assert wrong `aud` raises `AppError("bad_token", ...)`; assert expired raises `AppError("session_expired", ...)`. Use `respx` only if hitting HTTP; prefer injecting the stub cache.

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implement `jwks.py`.** `verify_apple`: decode header for `kid`, fetch matching JWK (Apple `https://appleid.apple.com/auth/keys`, iss `https://appleid.apple.com`, aud in `apple_bundle_ids`), verify RS256 with `pyjwt`. `verify_google`: keys `https://www.googleapis.com/oauth2/v3/certs`, iss in {`https://accounts.google.com`,`accounts.google.com`}, aud in `google_client_ids`. Map `jwt.ExpiredSignatureError`→`AppError("session_expired","…",401)`, other failures→`AppError("bad_token","…",401)`. `name` from `name`/`given_name` when present.

- [ ] **Step 4: Run, verify PASS.**

- [ ] **Step 5: Commit** — `feat(api): Apple/Google JWKS identity verification`.

---

### Task 5: App token issue/verify + refresh rotation

**Files:**
- Create: `services/api/src/wsww_api/auth/tokens.py`
- Test: `services/api/tests/auth/test_tokens.py`

**Interfaces:**
- Produces: `TokenSigner` with `issue_access(user_id) -> str`, `verify_access(token) -> str` (returns user_id), `new_refresh() -> tuple[str, str]` (returns `(raw, sha256hex)`), `hash_refresh(raw) -> str`.
- Consumes: an injectable signing-key provider `SigningKey` (protocol: `sign(bytes) -> bytes`, `public_numbers()` or a local ES256 private key for tests). For dev/tests use a local generated EC P-256 key; in cloud a Key Vault-backed implementation (added in Task 11) satisfies the same protocol.

- [ ] **Step 1: Write failing test:** issue an access token, verify it returns the same `user_id`; a tampered token raises `AppError`; an expired token (ttl=0) raises `AppError("session_expired",…,401)`; `new_refresh()` returns a raw token and its sha256, and `hash_refresh(raw)` equals that sha256.

- [ ] **Step 2: Run, FAIL.**

- [ ] **Step 3: Implement `tokens.py`** using ES256 via `pyjwt` with an EC key; claims `sub`, `iat`, `exp`, `iss="wsww"`. `new_refresh` = 32 random bytes urlsafe-b64; hash = `hashlib.sha256`.

- [ ] **Step 4: Run, PASS.**

- [ ] **Step 5: Commit** — `feat(api): ES256 access tokens and rotating refresh tokens`.

---

### Task 6: FastAPI app factory + error handlers + health

**Files:**
- Create: `services/api/src/wsww_api/app.py`, `models.py`
- Test: `services/api/tests/test_app_health.py`

**Interfaces:**
- Produces: `create_app(deps: Deps) -> FastAPI` where `Deps` is a dataclass carrying `users: UsersRepo`, `tokens_repo: TokensRepo`, `signer: TokenSigner`, `verify_apple`, `verify_google`, `settings`. Test builds `Deps` with in-memory doubles.
- Produces: `GET /v1/health` → `{"status":"ok"}`; global handler converting `AppError` to its envelope + status.

- [ ] **Step 1: Write failing test** with FastAPI `TestClient`: `/v1/health` returns 200 `{"status":"ok"}`; a route raising `AppError("x","y",418)` returns 418 `{"code":"x","message":"y"}`.

- [ ] **Step 2: Run, FAIL.**

- [ ] **Step 3: Implement `app.py`** with `create_app`, dependency injection via `app.state.deps`, an exception handler for `AppError`, and the health route. Define request/response models in `models.py` (`AppleAuthIn`, `GoogleAuthIn`, `TokenPair`, `RefreshIn`, `MeOut`, `MePatch`).

- [ ] **Step 4: Run, PASS.**

- [ ] **Step 5: Commit** — `feat(api): app factory, error handling, health route`.

---

### Task 7: Auth router (`/v1/auth/*`)

**Files:**
- Create: `services/api/src/wsww_api/routers/__init__.py`, `routers/auth.py`, `auth/deps.py`
- Test: `services/api/tests/routers/test_auth.py`

**Interfaces:**
- Consumes: Task 4 verifiers, Task 5 `TokenSigner`, Task 3 repos.
- Produces routes: `POST /v1/auth/apple` `{identity_token, name?}` → `TokenPair`; `POST /v1/auth/google` `{id_token}` → `TokenPair`; `POST /v1/auth/refresh` `{refresh_token}` → `TokenPair` (rotates; reuse of a used token calls `revoke_family` and raises `AppError("session_expired",…,401)`); `POST /v1/auth/logout` `{refresh_token}` → 204.
- Produces: `current_user` FastAPI dependency reading `Authorization: Bearer`, verifying access token, loading the user, raising `AppError("session_expired",…,401)` when absent/expired.

- [ ] **Step 1: Write failing tests** (inject a stub verifier so no network): apple sign-in with a new subject creates a user and returns a token pair; second sign-in with the same subject returns the same `user_id`; refresh returns a new pair and invalidates the old refresh; reusing an old refresh returns 401 and revokes the family; `current_user` accepts a freshly issued access token and rejects a garbage one.

- [ ] **Step 2: Run, FAIL.**

- [ ] **Step 3: Implement** `auth.py` and `deps.py`. On sign-in: `find_by_provider` → create `User` with `id = "u_" + token_hex` and `country=""`, `services=[]` if new; issue access; create refresh, store its hash with a new `family = uuid4`. On refresh: look up hash; if missing → 401; if already `used_at` → `revoke_family` + 401; else `mark_used`, issue new pair in the same family.

- [ ] **Step 4: Run, PASS.**

- [ ] **Step 5: Commit** — `feat(api): auth endpoints with refresh rotation and reuse detection`.

---

### Task 8: `/v1/me`, export, and delete

**Files:**
- Create: `services/api/src/wsww_api/routers/me.py`
- Modify: `services/api/src/wsww_api/app.py` (mount routers)
- Test: `services/api/tests/routers/test_me.py`

**Interfaces:**
- Consumes: `current_user`, `UsersRepo`.
- Produces: `GET /v1/me` → `MeOut`; `PATCH /v1/me` `{country?, services?, settings?}` → `MeOut`; `GET /v1/me/export` → a JSON object aggregating every container's rows for the user (users, sessions, decisions, shortlist, followups, taste — empty lists in this sub-project since those repos arrive later, but the endpoint iterates a registry so later containers are included automatically); `DELETE /v1/me` → 204, calls `soft_delete` and revokes all the user's refresh families.

- [ ] **Step 1: Write failing tests:** unauthenticated `GET /v1/me` → 401; authenticated returns the user's country/services; `PATCH` updates country and persists; `export` returns a dict containing `{"user": {...}}`; `DELETE` returns 204 and afterward the user's `deleted_at` is set and refresh tokens are revoked.

- [ ] **Step 2: Run, FAIL.**

- [ ] **Step 3: Implement `me.py`** and mount `auth` and `me` routers in `create_app`. Export uses a small registry list so adding containers later needs no endpoint change.

- [ ] **Step 4: Run, PASS. Then run the whole suite:** `uv run pytest -q` — Expected: all pass.

- [ ] **Step 5: Commit** — `feat(api): me, export, and account deletion endpoints`.

---

### Task 9: Azure Functions host wire-up (ASGI)

**Files:**
- Create: `services/api/function_app.py`, `services/api/host.json`, `services/api/local.settings.json.example`
- Test: `services/api/tests/test_function_app_import.py`

**Interfaces:**
- Consumes: `create_app` plus a production `build_deps()` that constructs real Cosmos containers, the Key Vault signer (Task 11), and the JWKS verifiers from `Settings`.
- Produces: an `azure.functions.AsgiFunctionApp` exposing the FastAPI app for all routes.

- [ ] **Step 1: Write failing test** that imports `function_app` and asserts `app` is an `AsgiFunctionApp` (skip if `azure.functions` AsgiFunctionApp unavailable, but it is in the pinned version).

- [ ] **Step 2: Run, FAIL.**

- [ ] **Step 3: Implement `function_app.py`:**

```python
import azure.functions as func
from wsww_api.app import create_app
from wsww_api.bootstrap import build_deps  # constructs real deps from Settings

app = func.AsgiFunctionApp(app=create_app(build_deps()), http_auth_level=func.AuthLevel.ANONYMOUS)
```

Add `host.json` (extension bundle v4, functionTimeout 00:05:00) and `local.settings.json.example` documenting the `WSWW_*` variables. Create `src/wsww_api/bootstrap.py` with `build_deps()`.

- [ ] **Step 4: Run, PASS.**

- [ ] **Step 5: Commit** — `feat(api): Azure Functions ASGI host`.

---

### Task 10: Infra as Bicep (Cosmos, Storage, Key Vault, Functions, identity, observability)

**Files:**
- Create: `infra/azure.yaml`, `infra/main.bicep`, `infra/main.parameters.dev.json`, `infra/main.parameters.prod.json`, `infra/modules/*.bicep`

**Interfaces:**
- Produces: a subscription-scope-free resource-group deployment defining: Cosmos DB serverless account + `wsww` database + the 7 containers (partition keys per spec, vector policy on `catalog.embedding`), a Storage account + `posters` blob container, a Key Vault with an EC-P256 signing key `wsww-api-signing`, a Flex Consumption Function App + plan + its system-assigned identity, Log Analytics + Application Insights, and role assignments granting the Function App identity: Cosmos DB Built-in Data Contributor, Storage Blob Data Contributor, Key Vault Crypto User.
- Produces: `azure.yaml` mapping service `api` → `services/api` (host: function).

- [ ] **Step 1: Write `modules/cosmos.bicep`** — serverless account (`capabilities: EnableServerless`), database `wsww`, containers with exact partition keys; on `catalog` add a vector embedding policy (path `/embedding`, `cosine`, `dimensions` 3072 for text-embedding-3-large) and a vector index.

- [ ] **Step 2: Write `modules/storage.bicep`** (StorageV2, TLS1_2, blob container `posters`, public access disabled), `modules/keyvault.bicep` (RBAC-enabled vault + EC key `wsww-api-signing`, curve P-256), `modules/observability.bicep` (Log Analytics + App Insights).

- [ ] **Step 3: Write `modules/functions.bicep`** — Flex Consumption plan + Function App (Python 3.12), system-assigned identity, app settings wiring `WSWW_COSMOS_ENDPOINT`, `WSWW_KEYVAULT_URI`, `WSWW_COSMOS_DATABASE=wsww`, `WSWW_ENV`, `APPLICATIONINSIGHTS_CONNECTION_STRING`, and a deployment storage account.

- [ ] **Step 4: Write `modules/identity.bicep`** — role assignments (Cosmos SQL data-plane role, Storage Blob Data Contributor, Key Vault Crypto User) for the Function App principalId.

- [ ] **Step 5: Compose `main.bicep`** (targetScope resourceGroup) calling all modules; parameters `env`, `location`. Write `main.parameters.dev.json` / `main.parameters.prod.json` (env + location eastus2). Write `azure.yaml`.

- [ ] **Step 6: Validate the templates build**

Run: `az bicep build --file infra/main.bicep` (install Bicep CLI via `az bicep install` if needed)
Expected: compiles with no errors.

- [ ] **Step 7: Commit** — `feat(infra): Bicep for Cosmos, Storage, Key Vault, Functions, identity, observability`.

---

### Task 11: Key Vault-backed signer wired into bootstrap

**Files:**
- Create: `services/api/src/wsww_api/auth/kv_signer.py`
- Modify: `services/api/src/wsww_api/bootstrap.py`
- Test: `services/api/tests/auth/test_kv_signer_contract.py`

**Interfaces:**
- Produces: `KeyVaultSigningKey(keyvault_uri, key_name)` satisfying the `SigningKey` protocol from Task 5 (`sign`, public key access) using `azure-keyvault-keys` `CryptographyClient` with `ES256`.
- Consumes: `Settings.keyvault_uri`, `Settings.signing_key_name`.

- [ ] **Step 1: Write a contract test** that skips when `WSWW_KEYVAULT_URI` is unset (unit CI) and, when set (integration), signs and verifies a token round-trip. This keeps unit CI hermetic while allowing an integration run against dev.

- [ ] **Step 2: Run, PASS (skipped in unit CI).**

- [ ] **Step 3: Implement `kv_signer.py`** and have `build_deps()` choose the KV signer when `keyvault_uri` is set, else a local EC key (dev/test).

- [ ] **Step 4: Run unit suite, PASS.**

- [ ] **Step 5: Commit** — `feat(api): Key Vault ES256 signer`.

---

### Task 12: CI workflow (lint, typecheck, test; path-filtered)

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: a `pull_request` workflow with a `changes` job (paths filter) gating a `python` job (`uv sync`, `ruff check`, `mypy`, `pytest`) when `services/api/**` or `packages/**` change.

- [ ] **Step 1: Write `ci.yml`** using `astral-sh/setup-uv`, Python 3.12, `dorny/paths-filter`. Steps: `uv sync --extra dev` in `services/api`, `uv run ruff check .`, `uv run mypy src`, `uv run pytest -q`.

- [ ] **Step 2: Push a branch and open a PR into `dev`; confirm CI runs green.**

Run: `git push -u origin feature/foundation && gh pr create --base dev --head feature/foundation --title "Foundation" --body "..."`
Expected: CI passes on the PR.

- [ ] **Step 3: Commit** (workflow file) — `ci: lint, typecheck, and test on PRs`.

---

### Task 13: OIDC + deploy-dev + release workflows

**Files:**
- Create: `.github/workflows/deploy-dev.yml`, `.github/workflows/release.yml`, `release-please-config.json`, `.release-please-manifest.json`, `scripts/bootstrap_oidc.sh`

**Interfaces:**
- Produces: `deploy-dev.yml` — on `push` to `dev`, `azure/login` via OIDC, `azd deploy` (or `az deployment group create` + Functions publish) into `rg-wsww-dev`.
- Produces: `release.yml` — `googleapis/release-please-action` configured for three packages (`services/api`, `packages/recs` placeholder, `apps/mobile` placeholder) producing tags `api-vX.Y.Z` etc.; a `deploy-prod` job triggered on those tags.
- Produces: `bootstrap_oidc.sh` creating an Entra app registration, a federated credential for `repo:manali-co/what-should-we-watch:ref:refs/heads/dev` and for `environment:prod`, and assigning it Contributor + the data-plane roles on the two resource groups. Sets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` as GitHub repo variables via `gh variable set`.

- [ ] **Step 1: Write the three workflow/config files and the script** with real content (no placeholders). Guard `deploy-prod` behind a GitHub `prod` environment for a manual approval gate.

- [ ] **Step 2: Run `scripts/bootstrap_oidc.sh`** (creates the app + federated creds + role assignments; idempotent). Verify `gh variable list` shows the three variables.

- [ ] **Step 3: Merge `feature/foundation` → `dev`; confirm `deploy-dev` provisions `rg-wsww-dev` and deploys the API; hit `/v1/health` on the deployed URL.**

Expected: `{"status":"ok"}` from the live dev endpoint.

- [ ] **Step 4: Commit** — `ci: OIDC auth, dev auto-deploy, release-please releases`.

---

## Self-Review

**Spec coverage:** §2 architecture → Tasks 1,6,9,10,11. §2 repo layout → Task 1. §3 data model → Tasks 3 (users/tokens) + 10 (all containers in Bicep; remaining repos arrive in later sub-projects, and `/me/export` already iterates a registry so they fold in without endpoint changes). §4 auth + `/me` + export + delete → Tasks 7,8. §8 security (JWKS, ES256, rotation, KV, managed identity, no email/password) → Tasks 4,5,7,10,11. §9 testing (repo abstraction, in-memory + emulator, contract) → Tasks 3,11,12. §10 versioning + branching + CI/CD → Tasks 12,13. Catalog/recs/sessions are **out of scope** for the foundation and are covered by later sub-project plans (spec §11 build order 2–6).

**Placeholder scan:** No `TBD`/`TODO`/"handle edge cases"; each code step carries real content. The `packages/recs` and `apps/mobile` entries in release-please are intentional forward declarations, marked as placeholders that later sub-projects populate.

**Type consistency:** `ContainerLike`, `UsersRepo`/`TokensRepo`, `ProviderIdentity`, `TokenSigner`/`SigningKey`, `Deps`, and `build_deps()` names are used consistently across Tasks 3–11. `SigningKey` protocol defined in Task 5 is satisfied by the local key (Tasks 5) and `KeyVaultSigningKey` (Task 11).

## Open items carried from the spec

- Confirm the Streaming Availability API license permits storing poster images (affects the catalog sub-project, not this one).
- `gpt-5.4-mini` quota in eastus2 confirmed available (verified 2026-09-20).
