# Changelog

All notable changes to the StoryCore Gem Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-03-04

### 🎉 First Stable Release — Gem Protocol MVP

#### Core Gem Engine

- `UserWallet` model with balance, tier, and total earned tracking
- `GemTransaction` model for full audit trail of all Gem flows
- `GemEscrow` model for P2P compute payment escrow (atomic delivery)
- `WorkerNode` model for GPU compute provider registration
- `TaskCategory` model for compute task types and VRAM requirements
- `GemEngineStandalone` engine: `process_transaction`, `transfer_gems`, `create_escrow`, `release_escrow`, `cancel_escrow`

#### REST API Endpoints (`/v1/gems/`)

- `GET /balance/{user_id}` — Query wallet balance and tier
- `GET /history/{user_id}` — Full transaction history
- `POST /transfer` — P2P Gem transfer between users
- `POST /escrow/create` — Create atomic compute escrow
- `POST /escrow/release/{escrow_id}` — Release Gems to worker on task completion
- `POST /escrow/cancel/{escrow_id}` — Cancel and refund escrow to sender
- `POST /worker/register` — Register GPU node with vRAM and capabilities
- `POST /worker/heartbeat/{worker_id}` — Node presence keepalive
- `GET /workers` — List all registered compute nodes
- `GET /task-categories` — List available compute task types with costs
- `POST /tasks/seed` — Seed default categories: video, audio, science, research

#### Human Contribution Analysis (Pillar 1)

- `POST /ai/analyze-contribution` — AI-scored effort quantification
  - Heuristic scoring: effort × impact multiplier (keywords: `fix`, `critical`, `security`)
  - Safety cap: max 100 Gems per contribution

#### AI Agent Economy (Pillar 4)

- `POST /ai/agent/register` — Register AI agents (OpenClaw, LangChain, AutoGPT, custom)
  - Open mode (no signature) and HMAC-SHA256 secured mode
- `POST /ai/agent-contribution` — Submit agent output for Gem valuation
  - Formula: `base_value × quality_score × novelty_multiplier × reputation_factor`
  - Task types: `research` (15), `code` (25), `creative` (12), `summarization` (10), `orchestration` (30)
  - Novelty deduplication via SHA-256 content hashing (duplicate penalty: 0.1×)
  - Logarithmic reputation growth with contribution history (max factor: 3.0)
  - Rate limiting: 50 contributions/hour per `agent_id`
  - Contributions >50 Gems flagged for human review; hard cap at 150 Gems
- `GET /ai/agents` — Agent leaderboard sorted by total Gems earned

#### Infrastructure

- Async SQLAlchemy with `aiosqlite` for zero-config local development
- FastAPI with full OpenAPI/Swagger docs at `/docs`
- Background task for stale worker cleanup
- Hot-reload development server via `uvicorn --reload`

#### Documentation

- `README.md` — Full Gem Protocol vision: 5 pillars documented
  - Pillar 1: Human Contribution (GitHub integration)
  - Pillar 2: Compute Sharing (P2P Mesh + Escrow)
  - Pillar 3: Universal Utility (Science, Research, Agents)
  - Pillar 4: AI Agent Economy (Proof-of-Intelligence, OpenClaw bridge)
  - Pillar 5: API Budget Recycling (Zero-Waste Intelligence)
- `LICENSE` — MIT License
- `CHANGELOG.md` — This file

#### Architecture Notes

- In-memory rate limiter and agent registry (MVP) — Redis recommended for production
- Heuristic scoring engine (MVP) — LLM-based evaluation planned for v1.1
- HMAC-SHA256 optional in open/dev mode; mandatory when `shared_secret` is configured

---

## [Unreleased] — Planned for v1.1.0

### Planned

- LLM-based quality scoring (replace heuristics with Gemini/Claude API call)
- Redis-backed rate limiting and persistent agent registry
- GitHub webhook: automatic commit → Gem reward pipeline
- Agent task queue: StoryCore broadcasts pending tasks; agents claim and process
- API Budget Recycler: end-of-month surplus detection and auto-routing
- Multi-signature escrow for high-value compute tasks (>500 Gems)
- REST webhook callbacks when tasks are assigned to agents
