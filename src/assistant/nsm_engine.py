"""
Neural Substrate Manager (NSM) Engine for StoryCore Assistant.

Inspired by Cline's agentic architecture and refined for multimodal production.
This manager orchestrates the 'substrate' (context, tools, and memories) 
through a Plan-Act-Observe loop.
"""

import ast
import asyncio
import json
import re
import uuid
from typing import Any, Dict, List, Callable, Optional, Union, Tuple
from dataclasses import dataclass, field
from io import StringIO
import contextlib
from .rlm_engine import SecurityValidator, SecurityError, RLMSubtask, RLMAgentCore

@dataclass
class NSMStep:
    """Represents a single step in a plan."""
    id: str
    description: str
    status: str = "pending"  # pending, in_progress, completed, failed
    output: Optional[str] = None

@dataclass
class NSMPlan:
    """Represents a planned sequence of actions."""
    title: str
    steps: List[NSMStep]
    rationale: str

@dataclass
class SubstrateState:
    """The current state of the neural substrate."""
    context: str = ""
    rules: List[str] = field(default_factory=list)
    memory_bank: Dict[str, Any] = field(default_factory=dict)
    active_plan: Optional[NSMPlan] = None
    trajectory: List[Dict[str, Any]] = field(default_factory=list)
    project_root: Optional[str] = None
    environment_vars: Dict[str, str] = field(default_factory=dict)

class NSMEngine:
    """
    Neural Substrate Manager Orchestrator.
    Manages the lifecycle of an agentic session through a structured substrate.
    """
    
    def __init__(
        self,
        agent_core: RLMAgentCore,
        graph_rag: Optional[Any] = None,
        rules_path: Optional[str] = None
    ):
        self.agent_core = agent_core
        self.graph_rag = graph_rag
        self.state = SubstrateState()
        self.max_iterations = 12
        self.on_step_callback: Optional[Callable[[str], None]] = None
        
        # Load rules if available
        if rules_path:
            self._load_rules(rules_path)

    def _load_rules(self, path: str):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                self.state.rules = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        except Exception as e:
            print(f"Warning: Could not load rules from {path}: {e}")

    def _notify(self, message: str, step_type: str = "thinking"):
        from datetime import datetime
        self.state.trajectory.append({
            "type": step_type, 
            "message": message, 
            "timestamp": datetime.now().isoformat()
        })
        if self.on_step_callback:
            self.on_step_callback(message)

    async def process(self, prompt: str, massive_context: str, project_root: Optional[str] = None) -> str:
        """Process a request thru the Plan-Act-Observe loop."""
        self.state.context = massive_context
        self.state.trajectory = []
        self.state.project_root = project_root
        
        # 1. Initialize Memory Bank from GraphRAG and file
        await self._sync_memory_bank(load_from_file=True)
        
        system_prompt = self._build_system_prompt()
        history = f"User Request: {prompt}\n"
        
        for i in range(self.max_iterations):
            self._notify(f"Thinking (Iteration {i+1})...", "thinking")
            
            # 2. Call LLM for planning or action
            response = await self.agent_core.call_llm(history, system_prompt=system_prompt)
            history += f"\nAssistant: {response}\n"
            
            # Detect Plan updates
            plan_match = re.search(r"<plan>(.*?)</plan>", response, re.DOTALL)
            if plan_match:
                plan_text = plan_match.group(1).strip()
                self._notify("Plan formulated/updated.", "planning")
                
                # Parse steps from bullet points or numbered list
                step_lines = [line.strip().lstrip('- ').lstrip('1234567890. ') for line in plan_text.split('\n') if line.strip()]
                new_steps = [NSMStep(id=str(uuid.uuid4())[:4], description=s) for s in step_lines]
                
                # Try to preserve status of existing steps if possible (simple heuristic)
                if self.state.active_plan:
                    for ns in new_steps:
                        for os in self.state.active_plan.steps:
                            if ns.description == os.description:
                                ns.status = os.status
                                ns.id = os.id
                
                self.state.active_plan = NSMPlan(title="Current Plan", steps=new_steps, rationale="Ongoing strategy")

            # Detect Memory Updates via tags
            mem_updates = re.finditer(r'<memory_update key="(.*?)" value="(.*?)" />', response)
            for m in mem_updates:
                self.state.memory_bank[m.group(1)] = m.group(2)
                self._notify(f"Memory Updated: {m.group(1)}", "memory")
            
            # Detect Step Completions
            step_completes = re.finditer(r'<step_completed id="(.*?)" />', response)
            for m in step_completes:
                step_id = m.group(1)
                if self.state.active_plan:
                    for s in self.state.active_plan.steps:
                        if s.id == step_id:
                            s.status = "completed"
                            self._notify(f"Step Completed: {s.description}", "planning")

            # Check for FINAL_ANSWER
            if "FINAL_ANSWER:" in response:
                result = response.split("FINAL_ANSWER:")[1].strip()
                return await self._finalize(result, prompt)
            
            # Execute Tools (Python, n8n, etc.)
            tool_output = await self._execute_tools(response)
            if tool_output:
                history += f"\nObservation:\n{tool_output}\n"
                self._notify("Observation captured.", "observation")
                # Auto-save memory bank after tool execution if it changed
                await self._sync_memory_bank(save_to_file=True)
            else:
                history += "\nSystem: No tool execution detected. Please provide a plan or final answer.\n"
        
        return "Error: Maximum iterations reached without final answer."

    def _build_system_prompt(self) -> str:
        rules_str = "\n".join([f"- {r}" for r in self.state.rules])
        memory_summary = json.dumps(self.state.memory_bank, indent=2)
        project_root = self.state.project_root or "Not specified"
        
        return f"""You are the Neural Substrate Manager (NSM).
Your goal is to solve complex production tasks by managing your environment (the substrate).

[SUBSTRATE RULES]
{rules_str}

[MEMORY BANK (STATE)]
{memory_summary}
Project Root: {project_root}

[OPERATING MODES]
1. PLAN: Always start complex tasks by wrapping your strategy in <plan>...</plan> tags. Update it as you learn.
2. THINK: Before acting, use `<thought>...</thought>` to explain your reasoning.
3. ACT: Execute tools via python blocks.
4. OBSERVE: Analyze the output of your tools before proceeding.
5. MEMORY: Use `<memory_update key="..." value="..." />` to persist important facts.
6. PROGRESS: Use `<step_completed id="..." />` to mark plan steps as done.

[TOOLS AVAILABLE (via Python)]
- `read_file(path)`: Read content of a file.
- `write_file(path, content)`: Overwrite or create a file.
- `patch_file(path, search_str, replace_str)`: Replace a specific block of text in a file.
- `list_dir(path='.')`: List directory contents.
- `terminal_run(command)`: Run a shell command and get output (allowed: ls, git, grep, findstr, cat, mkdir, echo).
- `git_log(n=5)`: Get the last N git commits.
- `git_diff()`: Get current uncommitted changes.
- `query_database(query)`: Vector search in project documentation.
- `query_graph(entities)`: Story Knowledge Graph lookup.
- `n8n_trigger(id, payload)`: Trigger production automation.
- `send_message(platform, text)`: Notify team members.

[SAFETY]
- Only operate within the Project Root: {project_root}
- Do not delete directories.

To finish, use: FINAL_ANSWER: your response.
"""

    async def _sync_memory_bank(self, load_from_file=False, save_to_file=False):
        """Syncs the internal memory bank with global project state and persistence file."""
        import os
        
        # 1. Path Setup
        memory_file = None
        if self.state.project_root:
            memory_file = os.path.join(self.state.project_root, "memory_bank.json")

        # 2. Load from file if requested
        if load_from_file and memory_file and os.path.exists(memory_file):
            try:
                with open(memory_file, 'r', encoding='utf-8') as f:
                    file_mem = json.load(f)
                    self.state.memory_bank.update(file_mem)
                self._notify("Memory Bank loaded from substrate storage.", "memory")
            except Exception as e:
                self._notify(f"Memory Load Error: {e}", "error")

        # 3. Dynamic Sync from GraphRAG
        if self.graph_rag:
            self._notify("Synchronizing Substrate with Knowledge Graph...", "memory")
            try:
                # Use query_timeline or similar if available
                if hasattr(self.graph_rag, 'query_timeline'):
                     self.state.memory_bank["timeline"] = self.graph_rag.query_timeline()
                
                # Update project entities summary
                entities_summary = await self.agent_core.query_graph([], max_depth=0)
                self.state.memory_bank["entities_summary"] = entities_summary
                self.state.memory_bank["last_sync_ts"] = str(uuid.uuid4())[:8]
            except Exception as e:
                self._notify(f"Graph Sync Warning: {e}", "error")

        # 4. Save to file if requested
        if save_to_file and memory_file:
            try:
                with open(memory_file, 'w', encoding='utf-8') as f:
                    json.dump(self.state.memory_bank, f, indent=2)
                self._notify("Memory Bank persisted to substrate.", "memory")
            except Exception as e:
                self._notify(f"Memory Save Error: {e}", "error")

    async def _execute_tools(self, response: str) -> str:
        """Detect and execute tools in the response via a restricted REPL."""
        outputs = []
        import os
        from pathlib import Path
        
        # Detect and execute Python blocks
        code_matches = re.finditer(r"```python\n(.*?)```", response, re.DOTALL)
        for match in code_matches:
            code = match.group(1)
            self._notify("Executing Substrate Action (Python)...", "action")
            
            # Setup REPL with tools
            from .rlm_engine import RestrictedPythonREPL
            repl = RestrictedPythonREPL(self.state.context)
            
            # Helper to run async methods in sync REPL
            def run_sync(coro):
                loop = asyncio.get_event_loop()
                import nest_asyncio
                nest_asyncio.apply()
                return loop.run_until_complete(coro)

            # Security Wrapper for file paths
            def safe_path(path):
                if not self.state.project_root:
                    raise PermissionError("Project root not set. File operations disabled.")
                abs_root = os.path.abspath(self.state.project_root)
                abs_path = os.path.abspath(os.path.join(abs_root, path))
                if not abs_path.startswith(abs_root):
                    raise PermissionError(f"Access denied: {path} is outside project root.")
                return abs_path

            # File Tools
            def read_file(path):
                with open(safe_path(path), 'r', encoding='utf-8') as f:
                    return f.read()
            
            def write_file(path, content):
                sp = safe_path(path)
                os.makedirs(os.path.dirname(sp), exist_ok=True)
                with open(sp, 'w', encoding='utf-8') as f:
                    f.write(content)
                return f"Successfully wrote to {path}"

            def list_dir(path='.'):
                return os.listdir(safe_path(path))

            def patch_file(path, search_str, replace_str):
                sp = safe_path(path)
                with open(sp, 'r', encoding='utf-8') as f:
                    content = f.read()
                if search_str not in content:
                    return f"Error: Search string not found in {path}"
                new_content = content.replace(search_str, replace_str, 1)
                with open(sp, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                return f"Successfully patched {path}"

            def git_log(n=5):
                return terminal_run(f"git log -n {n} --oneline")

            def git_diff():
                return terminal_run("git diff")

            def terminal_run(command):
                import subprocess
                # Restricted set of commands
                allowed = ['ls', 'dir', 'git', 'grep', 'findstr', 'cat', 'type', 'mkdir', 'echo']
                base_cmd = command.split()[0].lower()
                if base_cmd not in allowed:
                    return f"Error: Command '{base_cmd}' not allowed. Restricted to: {', '.join(allowed)}"
                try:
                    res = subprocess.run(command, shell=True, capture_output=True, text=True, cwd=self.state.project_root, timeout=10)
                    return res.stdout + res.stderr
                except Exception as e:
                    return str(e)

            # Inject Tools
            repl.set_variable("read_file", read_file)
            repl.set_variable("write_file", write_file)
            repl.set_variable("patch_file", patch_file)
            repl.set_variable("list_dir", list_dir)
            repl.set_variable("terminal_run", terminal_run)
            repl.set_variable("git_log", git_log)
            repl.set_variable("git_diff", git_diff)
            repl.set_variable("query_database", lambda q: run_sync(self.agent_core.query_database(q)))
            repl.set_variable("query_graph", lambda e, d=1: run_sync(self.agent_core.query_graph(e, d)))
            
            if hasattr(self.agent_core, "trigger_n8n"):
                repl.set_variable("n8n_trigger", lambda i, p: run_sync(self.agent_core.trigger_n8n(i, p)))
            if hasattr(self.agent_core, "list_n8n"):
                repl.set_variable("n8n_list_workflows", lambda: run_sync(self.agent_core.list_n8n()))
            if hasattr(self.agent_core, "send_message"):
                repl.set_variable("send_message", lambda p, t, tid=None: run_sync(self.agent_core.send_message(p, t, tid)))

            # Execute code
            output = repl.execute(code)
            outputs.append(f"Output for block:\n{output}")
            
        return "\n".join(outputs) if outputs else ""

    async def _finalize(self, result: str, original_prompt: str) -> str:
        """Apply Critique-Correction (Reflection) loop."""
        if not self.graph_rag:
            return result
            
        self._notify("Neural Substrate Reflection (Critique Phase)...", "critique")
        
        # Build reflection context
        lore_context = ""
        consistency_report = ""
        
        # Identify entities in result for GraphRAG check
        potential_entities = list(set(re.findall(r'\b[A-Z][a-z]+\b', result)))
        if potential_entities:
            self._notify(f"Checking lore consistency for: {', '.join(potential_entities[:5])}", "critique")
            lore_context = await self.agent_core.query_graph(potential_entities[:8], max_depth=1)
            if hasattr(self.graph_rag, "check_consistency"):
                consistency_report = self.graph_rag.check_consistency(result)

        reflection_prompt = f"""You are the Critique-Correction module of the NSM.
Read the original request, the generated result, and the Lore/Consistency data.

[REQUEST]: {original_prompt}
[RESULT]: {result}
[LORE DATA]: {lore_context}
[CONSISTENCY]: {consistency_report}

Validate if the result respects the project lore and solves the task.
If flaws exist, fix them. Return the final version prefixed with APPROVED_ANSWER:
"""
        
        reflection_response = await self.agent_core.call_llm(reflection_prompt)
        if "APPROVED_ANSWER:" in reflection_response:
            return reflection_response.split("APPROVED_ANSWER:")[1].strip()
        
        return result
