
import asyncio
import uuid
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from src.assistant.rlm_engine import RLMEngine, RLMAgentCore, RLMSubtask

class FastAgent(RLMAgentCore):
    def __init__(self):
        self.call_count = 0

    async def call_llm(self, history, system_prompt=None):
        self.call_count += 1
        if self.call_count > 1:
            return "FINAL_ANSWER: Parallel subtasks executed successfully."
        
        # Request parallel subtasks
        return """
```python
results = run_subtasks_parallel([
    {"description": "Analyze character Arwen", "context_slice": "Arwen is a..."},
    {"description": "Analyze character Mordak", "context_slice": "Mordak is a..."}
])
print(f"DEBUG: Parallel results: {results}")
```
"""

    async def run_subtask(self, subtask, context):
        print(f" [Subtask Running] {subtask.description}")
        await asyncio.sleep(0.1) # Simulate work
        return f"Result for {subtask.description}"

    async def query_database(self, query): return "db result"
    async def query_graph(self, entities, max_depth=1): return "graph result"

async def test():
    def on_step(msg):
        print(f" [RLM-STEP] {msg}")

    engine = RLMEngine(FastAgent(), on_step_event=on_step)
    final = await engine.process("Run parallel analysis", "")
    print(f"\nFinal Result: {final}")

if __name__ == "__main__":
    asyncio.run(test())
