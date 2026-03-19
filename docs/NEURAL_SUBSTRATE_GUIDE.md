# Neural Substrate Manager (NSM) - Implementation Guide

The StoryCore-Engine's reasoning capabilities have been upgraded from a passive RLM (Recursive Language Model) engine to an active **Neural Substrate Manager (NSM)**, inspired by the agentic loop architecture of Cline.

## Key Enhancements

### 1. Agentic Loop (Plan-Act-Observe)
The new `NSMEngine` implements a structured loop:
- **PLAN**: The agent MUST formulate a strategy within `<plan>` tags before acting.
- **ACT**: The agent executes tools (Python, n8n, etc.) to progress on the plan.
- **OBSERVE**: The agent captures tool outputs as "Observations" to refine its next steps.

### 2. Multi-Tool Substrate
The agent now has native access to the following tools via a restricted Python REPL:
- **GraphRAG**: `query_graph(entities)` and `query_database(query)` for lore continuity.
- **Automation**: `n8n_trigger(id, payload)` and `n8n_list_workflows()` for external pipelines.
- **Messaging**: `send_message(platform, text)` for real-time notifications (Telegram/Discord).

### 3. Substrate Rules (.rules)
A new project-level configuration file `substrate.rules` governs agent behavior, ensuring continuity, safety, and creative alignment. These rules are injected into the system prompt.

### 4. Neural Reflection (Critique-Correction)
Every final answer undergoes a **Reflection Phase** where:
1. Significant entities are extracted from the draft.
2. The **Knowledge Graph** is queried for lore consistency.
3. A critique module validates the result against the original goal and project data.

### 5. Rich Trajectory Trace
The API now returns a structured trajectory of steps (`NSMStep`), allowing the UI to display:
- **Thinking** steps.
- **Action** steps (code execution).
- **Observation** steps.
- **Critique** steps.
- **Memory** synchronization steps.

## Modified Files
- `src/assistant/nsm_engine.py`: Core implementation of the NSM.
- `src/assistant/storycore_assistant.py`: Integration of NSM into the main assistant workflow.
- `src/assistant/api/models.py`: Structured data models for the rich trajectory.
- `src/assistant/api/routes/generation.py`: API endpoints updated to provide rich NSM data.
- `substrate.rules`: Default governance rules for the agent.
- `requirements.txt`: Added `nest-asyncio` for the sync-async bridge.

## How to use
- **Rules Customization**: Edit `substrate.rules` in the root directory to add project-specific constraints.
- **Trace Visualization**: Click the **Trace** button in the `NeuralProductionAssistant` UI to see the decomposition of the agent's thoughts and actions.
- **n8n Integration**: Webhooks can now be called directly by the agent if you ask it to "Connect the current scenario to n8n".
