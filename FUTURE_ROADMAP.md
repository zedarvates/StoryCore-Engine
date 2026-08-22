# Future Roadmap - StoryCore Engine v3.1+

Reflecting the successful integration of **Hybrid Inference**, **Voice Cloning v2**, and **GPU Telemetry (v3.1)**.

## ✅ 1. Recently Implemented (March 2026)

- [x] **Voice Cloning v2**: Integrated `Qwen2.5-Audio` for zero-shot synthesis with emotional preservation.
- [x] **Hybrid Inference Engine**: Automatic CPU offloading for audio/text tasks to save 4GB+ VRAM per session.
- [x] **GPU Telemetry & Health Score**: Real-time monitoring of VRAM, temperature, and performance bottlenecks.
- [x] **Multi-Pass Super-Resolution**: Iterative 4x-8x upscaling logic for cinematic fidelity.

## 🚀 2. Next Generation: Automation & Scale

- **Distributed Render Farm**: Orchestrate `ComfyUI` nodes across multiple machines for extreme parallel video generation.
- **Vision Integration**: Real-time visual analysis of generated frames to automatically detect and correct visual artifacts.
- **Temporal Stabilization v2**: Implement 60fps frame interpolation and consistent temporal smoothing for AI-generated video.
- **Infrastructure as Code (IaC)**: Kubernetes Helm charts for distributed production orchestration.

## 📊 3. Monitoring & Advanced Analytics

- **Lore Graph RAG v3**: Deep narrative consistency checking using recursive reasoning (RLM) across 100k+ word scripts.
- **Carbon Footprint Tracking**: Monitor energy usage per generation to optimize for sustainability alongside performance.
- **Predictive VRAM Guard**: AI-driven prediction of memory peaks before generation starts to prevent OOM.

## 🎨 4. Cinematic Core Expansion

- **Direct Storyboard-to-Timeline**: Seamless drag-and-drop from the AI Storyboard directly into the EditForge timeline with auto-assembly.
- **Physics-Aware Audio**: Dynamic spatialization based on 3D scene depth maps generated during the video pass.

## 🧠 5. Dynamic AI Residency & Conditional Compute (added August 2026)

StoryCore should extend its existing Hybrid Inference and GPU Telemetry layers with a provider-neutral scheduler inspired by dynamic sparse/MoE serving systems such as FreeToken. The objective is not merely to load larger models, but to keep the **right capability resident at the right time** while protecting interactive latency and render stability.

### P0 — Hot / warm / cold residency

- [ ] Model GPU VRAM, system RAM, and disk as explicit residency tiers: **hot**, **warm**, and **cold**.
- [ ] Track footprint, load time, recent use, predicted reuse, device affinity, and reliability for each model/component.
- [ ] Treat text LLMs, vision models, embeddings, STT, TTS/voice, adapters, ControlNet-like auxiliaries, and optional expert groups as independently schedulable resources where backend support permits it.
- [ ] Add admission control before every promotion so StoryCore refuses or queues work before an OOM occurs.
- [ ] Keep current static/hybrid placement available as a rollback mode.

### P0 — Workload-aware placement

- [ ] Define workload classes such as `interactive_dialogue`, `story_planning`, `vision_validation`, `voice`, `image_generation`, `video_generation`, and `background_analysis`.
- [ ] Reserve latency-sensitive resources for interactive work instead of allowing background rendering to consume all VRAM.
- [ ] Score placements using expected latency, VRAM pressure, promotion cost, queue depth, and fallback availability.
- [ ] Record a concise explanation for every promotion, eviction, fallback, and queue decision in GPU telemetry.

### P1 — Predictive prewarming

- [ ] Use timeline/project state to prewarm likely next capabilities (for example: storyboard -> vision validation -> voice -> render) only when the predicted gain exceeds load/transfer cost.
- [ ] Begin with deterministic workflow heuristics; only introduce learned prefetch when labels and calibration can be audited.
- [ ] Track false prefetches and VRAM churn so aggressive prediction cannot silently reduce stability.

### P1 — Asymmetric multi-GPU roles

Reference target includes commodity local workstations with 2 × 12 GB GPUs.

- [ ] Benchmark primary-generation GPU + secondary assistant GPU against model splitting.
- [ ] Allow the secondary GPU to host draft/speculative text inference, embeddings, STT/TTS, lightweight vision checks, or frequently reused specialists.
- [ ] Never treat two GPUs as transparent pooled VRAM; track each memory budget separately.
- [ ] Measure PCIe transfer overhead explicitly and reject placements that save VRAM but increase end-to-end latency.
- [ ] Support degraded operation if one GPU worker fails or disappears.

### P1 — Speculative execution for agentic workflows

- [ ] Allow a cheap/local draft path to propose story, dialogue, metadata, or tool decisions while a stronger verifier accepts/rejects them.
- [ ] Keep verifier authority separate from proposer authority.
- [ ] Measure acceptance rate, rejected work, TTFT, total compute, and final-output quality.
- [ ] Use this first for structured agent tasks, not irreversible project mutations.

### P1 — Failure-aware serving

- [ ] Standardize `retry -> alternate backend/model -> abstain/queue` instead of unlimited retries.
- [ ] Detect repeated backend/model failures and trip a temporary circuit breaker.
- [ ] Preserve project state when a model is evicted, crashes, or returns malformed streaming output.
- [ ] Add long-run concurrency tests covering render + voice + assistant activity simultaneously.

### Acceptance gate

A dynamic-residency optimization graduates only if it improves at least one useful dimension without unacceptable regression elsewhere. Benchmarks must record:

- TTFT and median/p95 completion latency;
- peak VRAM **per GPU** and peak system RAM;
- promotion/load time and bytes transferred;
- queue time, cache hit rate, and eviction count;
- success/verification rate and fallback count;
- stability under long-running mixed workloads;
- final output quality for the affected StoryCore workflow.

---
**Maintained by:** StoryCore-Engine Team  
**Last Updated:** August 22, 2026