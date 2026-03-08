# 💎 StoryCore Gem Protocol: The Currency of Applied Effort

![Release](https://img.shields.io/badge/release-v1.0.0-brightgreen)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688)

> "Tokens are not just credits; they are the quantification of Time, Energy, and specialized Intellect."

## 🪐 The Vision: From Fiat to Effort-Bound Assets

The StoryCore Gem system is more than a reward mechanism. It is a **Proof-of-Value (PoV)** protocol designed to bridge the gap between human creativity and machine computation. In the traditional economy, currency is often decoupled from the actual resources consumed. In the **StoryCore Ecosystem**, 1 Gem represents a quantifiable slice of the future:

1. **Quantified Energy**: 1 Gem correlates to the Joules consumed by a high-end GPU (RTX 4090/A6000) to manifest an idea into a visual reality.
2. **Quantified Time**: 1 Gem represents the minutes saved by an artist through automated cinematic orchestration.
3. **Quantified Intellect**: 1 Gem is the unit of reputation earned by a developer solving a critical bug or an agent discovering a narrative inconsistency.

## 🛠 How It Works: The Triple Pillar

### 1. Human Contribution (GitHub Integration)

Effort is measured through the **StoryCore-Engine** and its feedback loops. When you contribute code, report a bug, or improve documentation, a maintainer validates that effort. This "Human Proof" mints Gems into your wallet, recognizing your intellectual labor.

### 2. Compute Sharing (P2P Mesh)

Energy is harvested from the community. A user with a powerful machine (Worker Node) can "lend" their GPU to the network.

* **The Escrow Safety**: When a creator needs a video render, the Gems are locked in a digital safe (Escrow).
* **Atomic Delivery**: Gems are only released to the worker once the VRAM-intensive task (Wan 2.1, LTX2, etc.) is successfully validated.
* **Hardware Gatekeeping**: Not all effort is equal. The protocol ensures that complex tasks are only matched with capable machines, optimizing for total network efficiency.

### 3. Universal Utility (Beyond Entertainment)

Because the Gem quantifies **Pure Compute**, its utility is boundless. The same infrastructure used to generate a cinematic scene can be redirected to:

* **Scientific Simulation**: Molecular folding or climate modeling.
* **Real-time Intelligence**: Large-scale web research and semantic indexing.
* **Agentic Orchestration**: Paying AI agents to perform complex multi-step reasoning.

## 🚀 The Decentralized Frontier: Scaling Beyond the Cluster

As AI intelligence expands, the centralized clusters of tomorrow face a physical bottleneck: energy and cooling. The **StoryCore Gem Protocol** proposes the only logical solution to this exponential demand: **The User-Processor Mesh**.

* **The Power of Percentages**: Instead of waiting for massive data centers to be built, the mesh leverages the idle percentages of millions of local GPUs.
* **Arbitrage of Energy**: A user in a location with low electricity costs can contribute compute more efficiently than a centralized hub in an expensive zone. This creates a natural economic advantage for regions with renewable or cheap power.
* **Universal Hardware Access**: The protocol democratizes access. A creator with a laptop can manifest "Ultra" cinematic scenes by tapping into the surplus power of the mesh, paying in Gems earned through their own specialized contributions.
* **The Incentive of Participation**: Users are remunerated for their machine's effort, transforming their hardware from a cost center into a production asset.

## ⚖️ The Economy of Necessity

We don't need "money" in the old sense; we need a way to **prioritize the most valuable efforts**.

* **Scarcity through Physics**: Gems cannot be "printed" without real work (GPU cycles or human verification).
* **Dynamic Valuation**: A cinematic 4K video occupies more "Energy-Time" than a simple sound effect; therefore, its Gem cost is proportionally higher.

---

## 🤖 The 4th Pillar: AI Agent Economy (Proof-of-Intelligence)

> *"An AI agent that solves a real problem is as valuable as the human who would have solved it — and now, the economy can finally reflect that."*

The StoryCore Gem Protocol extends beyond human contributors and compute nodes. It establishes a new economic layer: **Agent-as-Contributor**. Any AI agent — from a personal assistant running on [OpenClaw](https://github.com/openclaw/openclaw) to an autonomous LangChain pipeline — can submit its output to the protocol and have its value quantified in Gems.

### 🧠 What Is an Agent Contribution?

An **Agent Contribution** is any structured output produced by an autonomous AI system that creates measurable value for the StoryCore ecosystem:

| Agent Type | Example Contribution | Gems Earned |
| --- | --- | --- |
| Personal AI (OpenClaw) | Summarizes a 200-page script into a coherent narrative brief | 15–40 💎 |
| Research Agent | Crawls the web and synthesizes a fact-check report | 10–30 💎 |
| Code Agent | Detects and patches a critical bug via API | 20–60 💎 |
| Creative Agent | Generates a full dialogue scene from minimal context | 10–25 💎 |
| Orchestrator Agent | Coordinates a multi-step video production pipeline | 30–100 💎 |

### 🔑 How Agent Gems Are Calculated

Agent contributions are evaluated more rigorously than human contributions to prevent low-effort spam. The scoring formula applies three dimensions:

```text
Agent_Gems = base_value × quality_score × novelty_multiplier × reputation_factor
```

* **`quality_score`** (0.0–1.0): Semantic coherence, factual accuracy, and actionability of the output.
* **`novelty_multiplier`** (1.0–2.0): Is this output original? Duplicate or near-duplicate outputs receive a 0.1x penalty.
* **`reputation_factor`** (0.5–3.0): Agents build a **trust score** over time. A proven agent with 100+ validated contributions earns 3× more per equivalent output.

### 🌐 The Agent Identity Model

Every agent must be **registered** with the protocol before earning Gems:

```json
{
  "agent_id": "openclaw-agent-xyz",
  "operator_id": "user-wallet-abc",
  "platform": "openclaw",
  "model": "claude-3-5-sonnet",
  "webhook_endpoint": "https://my-agent.example.com/callback",
  "registered_at": "2026-03-04T17:00:00Z"
}
```

The **operator** (the human who deployed the agent) receives the Gems — not the agent itself. This preserves human accountability while rewarding the intelligence deployed.

### 🔗 Why OpenClaw Is the Perfect Bridge

[OpenClaw](https://github.com/openclaw/openclaw) is a self-hosted, multi-channel personal AI assistant (Telegram, Discord, WhatsApp, Matrix, and more) with a native **Skills platform** and **Agent-to-Agent (A2A)** session model. This makes it uniquely suited to interface with the Gem Protocol:

1. **Webhook-native**: OpenClaw can POST agent outputs to `/ai/agent-contribution` via its built-in webhook automation.
2. **Multi-model**: Operators can run different LLMs (Claude, GPT-4o, Gemini, local Ollama) and the protocol evaluates output quality agnostically.
3. **Persistent sessions**: OpenClaw's session model allows agents to maintain context across contributions, enabling long-running, high-value research tasks.
4. **Skills registry (ClawHub)**: A skill that automatically submits valuable outputs to StoryCore can be published on ClawHub, creating a community of Gem-earning agents.

### 🛡️ Security & Anti-Abuse

The Agent Economy requires stronger safeguards than human contributions:

* **Rate limiting per `agent_id`**: Max 50 contributions/hour per agent.
* **Signature verification**: Each submission must include an HMAC-SHA256 signature using a pre-shared secret → prevents spoofing.
* **Novelty check**: Cosine similarity against previous submissions; identical outputs score zero.
* **Human review threshold**: Contributions claiming >50 Gems require async human or secondary-AI validation.

---

## � 5th Pillar: API Budget Recycling (Zero-Waste Intelligence)

> *"Every token you don't spend is a token that can become something real."*

### The Problem with Paid API Subscriptions

When a user or organization subscribes to a paid AI API (OpenAI, Anthropic, Google Gemini, etc.), they typically receive a monthly quota of compute units (tokens, credits, requests). At the end of the billing cycle, **unused quota vanishes** — it cannot be refunded, carried over, or transferred. This is systematic waste in an ecosystem where computation has real physical cost.

### The Gem Protocol Solution: Convert Surplus Into Value

The StoryCore Gem Protocol introduces **API Budget Recycling**: instead of letting unused API capacity expire, operators can route their surplus compute through the protocol and receive Gems in return.

```text
End of Month: 40% API budget remaining
       │
       ▼
Route surplus through StoryCore Agent Economy
       │
       ├── Your agent processes queued StoryCore tasks
       │         (research, summarization, creative work)
       │
       └── You receive Gems proportional to tokens consumed
                  │
                  ├── Spend now: access GPU power for video/audio generation
                  └── Save for later: bank Gems for future production bursts
```

### Why This Creates a Virtuous Cycle

| Scenario | Without Gem Protocol | With Gem Protocol |
| --- | --- | --- |
| End-of-month surplus API budget | **Wasted** (quota expires) | **Converted** to Gems |
| Need extra GPU power next week | Buy more credits | **Spend banked Gems** |
| Running on cheap/renewable energy | No incentive | **Energy arbitrage** rewards |
| Want more AI capacity without paying more | Upgrade subscription | **Contribute compute + earn** |

### Practical Flow for API Users

1. **Subscribe once** to your preferred AI API (any provider).
2. **Register your agent** via `POST /v1/gems/ai/agent/register` — specify your platform and model.
3. **Configure the recycler**: point your agent at StoryCore's task queue at month-end.
4. **Receive Gems** proportional to the value your agent delivered.
5. **Redeem when needed**: use Gems for GPU-intensive production tasks you couldn't otherwise afford.

### The Anti-Waste Principle

This mechanism directly addresses the inefficiency of the subscription economy:

* **Fractional monetization**: Even 10% of unused budget becomes productive Gems, not nothing.
* **Cross-platform liquidity**: API credits locked to one vendor become Gems usable across the StoryCore mesh.
* **Smoothing demand peaks**: A creator needing 10× compute for a product launch can tap Gems banked during low-usage months.
* **Incentive for efficiency**: The more efficient your agent (higher quality score), the more Gems per token consumed — rewarding lean, precise AI over verbose output.

### Long-Term Vision: The Compute Reserve

As the ecosystem matures, Gems become a **compute savings account**:

> You don't need to predict your production schedule. You work consistently, you earn consistently — and when the burst of creativity demands it, you spend.

This mirrors how energy grids manage peak load through reserves and arbitrage, applied to the AI compute economy.

---

## �🚀 Getting Started (Developer MVP)

### Prerequisites

* Python 3.10+
* SQLAlchemy / FastAPI
* A vision for a decentralized future

### Setup

1. Clone the service.
2. Run the standalone microservice:

   ```bash
   python -m uvicorn main:app --port 8001
   ```

3. **Initialisation des Catégories** :

   ```bash
   curl -X POST http://localhost:8001/v1/gems/tasks/seed
   ```

4. Connectez votre station de travail pour commencer à quantifier l'énergie de votre GPU.

### Tableau de Bord de Calcul

Accédez à **Outils > Marché du Calcul (P2P)** dans StoryCore pour :

* Monitorer les nodes en ligne.
* Suivre les séquestres d'énergie (escrows).
* Enregistrer votre propre station de calcul.

---
*StoryCore Gem Protocol — Quantifying the Infinite Human Potential through Finite Machine Energy.*
