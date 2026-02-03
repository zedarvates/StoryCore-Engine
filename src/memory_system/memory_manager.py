"""
Memory Manager for StoryCore LLM Memory System.

This module handles all operations on memory.json including CRUD operations,
schema validation, and conflict resolution.
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

from .data_models import (
    ProjectMemory,
    Objective,
    Entity,
    Constraint,
    Decision,
    StyleRule,
    Task,
    CurrentState,
)
from .schemas import MEMORY_SCHEMA, validate_schema


class MemoryManager:
    """
    Manages memory.json operations and updates.
    
    Responsibilities:
    - Load and parse memory.json with schema validation
    - Update memory sections with validation gates
    - Handle timestamp-based conflict resolution
    - Provide specialized methods for adding objectives, entities, etc.
    
    Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
    """
    
    MEMORY_FILENAME = "assistant/memory.json"
    
    def __init__(self, project_path: Path):
        """
        Initialize the MemoryManager.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.memory_path = self.project_path / self.MEMORY_FILENAME
    
    def load_memory(self) -> Optional[ProjectMemory]:
        """
        Load and parse memory.json with schema validation.
        
        Returns:
            ProjectMemory object if successful, None if file doesn't exist or is invalid
            
        Validates: Requirements 5.1, 5.4
        """
        if not self.memory_path.exists():
            return None
        
        try:
            with open(self.memory_path, 'r', encoding='utf-8') as f:
                memory_data = json.load(f)
            
            # Validate against schema
            is_valid, errors = validate_schema(memory_data, MEMORY_SCHEMA)
            if not is_valid:
                print(f"Memory validation failed: {errors}")
                return None
            
            # Parse into ProjectMemory object
            return self._parse_memory_data(memory_data)
            
        except json.JSONDecodeError as e:
            print(f"Invalid JSON in memory file: {e}")
            return None
        except Exception as e:
            print(f"Error loading memory: {e}")
            return None
    
    def _parse_memory_data(self, data: Dict[str, Any]) -> ProjectMemory:
        """Parse memory data dictionary into ProjectMemory object."""
        # Parse objectives
        objectives = []
        for obj in data.get('objectives', []):
            objectives.append(Objective(
                id=obj.get('id', str(uuid.uuid4())),
                description=obj.get('description', ''),
                status=obj.get('status', 'active'),
                added=obj.get('added', datetime.now().isoformat())
            ))
        
        # Parse entities
        entities = []
        for ent in data.get('entities', []):
            entities.append(Entity(
                id=ent.get('id', str(uuid.uuid4())),
                name=ent.get('name', ''),
                type=ent.get('type', 'concept'),
                description=ent.get('description', ''),
                attributes=ent.get('attributes', {}),
                added=ent.get('added', datetime.now().isoformat())
            ))
        
        # Parse constraints
        constraints = []
        for con in data.get('constraints', []):
            constraints.append(Constraint(
                id=con.get('id', str(uuid.uuid4())),
                description=con.get('description', ''),
                type=con.get('type', 'technical'),
                added=con.get('added', datetime.now().isoformat())
            ))
        
        # Parse decisions
        decisions = []
        for dec in data.get('decisions', []):
            decisions.append(Decision(
                id=dec.get('id', str(uuid.uuid4())),
                description=dec.get('description', ''),
                rationale=dec.get('rationale', ''),
                alternatives_considered=dec.get('alternatives_considered', []),
                timestamp=dec.get('timestamp', datetime.now().isoformat())
            ))
        
        # Parse style rules
        style_rules = []
        for rule in data.get('style_rules', []):
            style_rules.append(StyleRule(
                category=rule.get('category', 'technical'),
                rule=rule.get('rule', ''),
                added=rule.get('added', datetime.now().isoformat())
            ))
        
        # Parse task backlog
        task_backlog = []
        for task in data.get('task_backlog', []):
            task_backlog.append(Task(
                id=task.get('id', str(uuid.uuid4())),
                description=task.get('description', ''),
                priority=task.get('priority', 'medium'),
                status=task.get('status', 'pending'),
                added=task.get('added', datetime.now().isoformat())
            ))
        
        # Parse current state
        state_data = data.get('current_state', {})
        current_state = CurrentState(
            phase=state_data.get('phase', 'unknown'),
            progress_percentage=state_data.get('progress_percentage', 0),
            active_tasks=state_data.get('active_tasks', []),
            blockers=state_data.get('blockers', []),
            last_activity=state_data.get('last_activity', datetime.now().isoformat())
        )
        
        return ProjectMemory(
            schema_version=data.get('schema_version', '1.0'),
            last_updated=data.get('last_updated', datetime.now().isoformat()),
            objectives=objectives,
            entities=entities,
            constraints=constraints,
            decisions=decisions,
            style_rules=style_rules,
            task_backlog=task_backlog,
            current_state=current_state
        )
    
    def save_memory(self, memory: ProjectMemory) -> bool:
        """
        Save memory to memory.json with validation.
        
        Args:
            memory: ProjectMemory object to save
            
        Returns:
            True if saved successfully, False otherwise
            
        Validates: Requirement 5.3
        """
        try:
            # Update timestamp
            memory.last_updated = datetime.now().isoformat()
            
            # Convert to dictionary
            memory_dict = memory.to_dict()
            
            # Validate against schema
            is_valid, errors = validate_schema(memory_dict, MEMORY_SCHEMA)
            if not is_valid:
                print(f"Memory validation failed: {errors}")
                return False
            
            # Ensure parent directory exists
            self.memory_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write to file
            with open(self.memory_path, 'w', encoding='utf-8') as f:
                json.dump(memory_dict, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Error saving memory: {e}")
            return False
    
    def update_memory(self, updates: Dict[str, Any]) -> bool:
        """
        Apply updates to memory.json.
        
        Args:
            updates: Dictionary of updates to apply
            
        Returns:
            True if update succeeded, False otherwise
            
        Validates: Requirements 5.2, 5.3
        """
        memory = self.load_memory()
        if memory is None:
            print("Cannot update: memory file not found or invalid")
            return False
        
        try:
            # Apply updates based on keys
            if 'objectives' in updates:
                memory.objectives = updates['objectives']
            if 'entities' in updates:
                memory.entities = updates['entities']
            if 'constraints' in updates:
                memory.constraints = updates['constraints']
            if 'decisions' in updates:
                memory.decisions = updates['decisions']
            if 'style_rules' in updates:
                memory.style_rules = updates['style_rules']
            if 'task_backlog' in updates:
                memory.task_backlog = updates['task_backlog']
            if 'current_state' in updates:
                state_data = updates['current_state']
                if isinstance(state_data, dict):
                    memory.current_state = CurrentState(
                        phase=state_data.get('phase', memory.current_state.phase),
                        progress_percentage=state_data.get('progress_percentage', memory.current_state.progress_percentage),
                        active_tasks=state_data.get('active_tasks', memory.current_state.active_tasks),
                        blockers=state_data.get('blockers', memory.current_state.blockers),
                        last_activity=datetime.now().isoformat()
                    )
            
            return self.save_memory(memory)
            
        except Exception as e:
            print(f"Error updating memory: {e}")
            return False
    
    def add_objective(self, description: str, status: str = "active") -> bool:
        """
        Add a new objective to memory.
        
        Args:
            description: Description of the objective
            status: Status of the objective (active|completed|abandoned)
            
        Returns:
            True if added successfully, False otherwise
            
        Validates: Requirement 5.2
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        objective = Objective(
            id=str(uuid.uuid4()),
            description=description,
            status=status,
            added=datetime.now().isoformat()
        )
        
        memory.objectives.append(objective)
        return self.save_memory(memory)
    
    def add_entity(
        self, 
        name: str, 
        entity_type: str, 
        description: str,
        attributes: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Register a new entity/module in memory.
        
        Args:
            name: Name of the entity
            type: Type of entity (character|module|component|concept)
            description: Description of the entity
            attributes: Additional attributes
            
        Returns:
            True if added successfully, False otherwise
            
        Validates: Requirement 5.2
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        entity = Entity(
            id=str(uuid.uuid4()),
            name=name,
            type=entity_type,
            description=description,
            attributes=attributes or {},
            added=datetime.now().isoformat()
        )
        
        memory.entities.append(entity)
        return self.save_memory(memory)
    
    def add_decision(
        self, 
        description: str, 
        rationale: str,
        alternatives: Optional[List[str]] = None
    ) -> bool:
        """
        Record an important decision in memory.
        
        Args:
            description: Description of the decision
            rationale: Reasoning behind the decision
            alternatives: Alternatives that were considered
            
        Returns:
            True if added successfully, False otherwise
            
        Validates: Requirement 5.2
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        decision = Decision(
            id=str(uuid.uuid4()),
            description=description,
            rationale=rationale,
            alternatives_considered=alternatives or [],
            timestamp=datetime.now().isoformat()
        )
        
        memory.decisions.append(decision)
        return self.save_memory(memory)
    
    def add_constraint(
        self, 
        description: str, 
        constraint_type: str = "technical"
    ) -> bool:
        """
        Add a project constraint to memory.
        
        Args:
            description: Description of the constraint
            type: Type of constraint (technical|creative|business)
            
        Returns:
            True if added successfully, False otherwise
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        constraint = Constraint(
            id=str(uuid.uuid4()),
            description=description,
            type=constraint_type,
            added=datetime.now().isoformat()
        )
        
        memory.constraints.append(constraint)
        return self.save_memory(memory)
    
    def add_style_rule(
        self, 
        category: str, 
        rule: str
    ) -> bool:
        """
        Add a style rule to memory.
        
        Args:
            category: Category of style rule (visual|narrative|technical)
            rule: The style rule
            
        Returns:
            True if added successfully, False otherwise
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        style_rule = StyleRule(
            category=category,
            rule=rule,
            added=datetime.now().isoformat()
        )
        
        memory.style_rules.append(style_rule)
        return self.save_memory(memory)
    
    def add_task(
        self, 
        description: str, 
        priority: str = "medium",
        status: str = "pending"
    ) -> bool:
        """
        Add a task to the backlog.
        
        Args:
            description: Description of the task
            priority: Priority level (low|medium|high|critical)
            status: Status (pending|in_progress|completed)
            
        Returns:
            True if added successfully, False otherwise
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        task = Task(
            id=str(uuid.uuid4()),
            description=description,
            priority=priority,
            status=status,
            added=datetime.now().isoformat()
        )
        
        memory.task_backlog.append(task)
        return self.save_memory(memory)
    
    def update_state(
        self, 
        phase: Optional[str] = None,
        progress_percentage: Optional[int] = None,
        active_tasks: Optional[List[str]] = None,
        blockers: Optional[List[str]] = None
    ) -> bool:
        """
        Modify current_state section.
        
        Args:
            phase: Current project phase
            progress_percentage: Progress percentage (0-100)
            active_tasks: List of active task IDs
            blockers: List of current blockers
            
        Returns:
            True if updated successfully, False otherwise
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        if phase is not None:
            memory.current_state.phase = phase
        if progress_percentage is not None:
            memory.current_state.progress_percentage = max(0, min(100, progress_percentage))
        if active_tasks is not None:
            memory.current_state.active_tasks = active_tasks
        if blockers is not None:
            memory.current_state.blockers = blockers
        
        memory.current_state.last_activity = datetime.now().isoformat()
        
        return self.save_memory(memory)
    
    def mark_objective_completed(self, objective_id: str) -> bool:
        """
        Mark an objective as completed.
        
        Args:
            objective_id: ID of the objective to complete
            
        Returns:
            True if updated successfully, False otherwise
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        for obj in memory.objectives:
            if obj.id == objective_id:
                obj.status = "completed"
                return self.save_memory(memory)
        
        return False
    
    def mark_task_completed(self, task_id: str) -> bool:
        """
        Mark a task as completed.
        
        Args:
            task_id: ID of the task to complete
            
        Returns:
            True if updated successfully, False otherwise
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        for task in memory.task_backlog:
            if task.id == task_id:
                task.status = "completed"
                return self.save_memory(memory)
        
        return False
    
    def resolve_temporal_conflict(
        self, 
        entry_type: str, 
        entry_id: str, 
        new_data: Dict[str, Any]
    ) -> bool:
        """
        Resolve conflicting information by preferring more recent entries.
        
        Args:
            entry_type: Type of entry (objectives|entities|decisions|etc.)
            entry_id: ID of the entry to update
            new_data: New data to apply
            
        Returns:
            True if resolved successfully, False otherwise
            
        Validates: Requirement 5.6
        """
        memory = self.load_memory()
        if memory is None:
            return False
        
        # Get the appropriate list based on entry type
        entries_map = {
            'objectives': memory.objectives,
            'entities': memory.entities,
            'constraints': memory.constraints,
            'decisions': memory.decisions,
            'style_rules': memory.style_rules,
            'task_backlog': memory.task_backlog,
        }
        
        entries = entries_map.get(entry_type, [])
        
        # Find and update the entry
        for entry in entries:
            if hasattr(entry, 'id') and entry.id == entry_id:
                # Update fields from new_data
                for key, value in new_data.items():
                    if hasattr(entry, key):
                        setattr(entry, key, value)
                
                # Update timestamp to most recent
                if hasattr(entry, 'added'):
                    entry.added = datetime.now().isoformat()
                elif hasattr(entry, 'timestamp'):
                    entry.timestamp = datetime.now().isoformat()
                
                return self.save_memory(memory)
        
        return False
    
    def get_memory_as_dict(self) -> Optional[Dict[str, Any]]:
        """
        Get memory as dictionary for LLM consumption.
        
        Returns:
            Memory dictionary if successful, None otherwise
        """
        memory = self.load_memory()
        if memory is None:
            return None
        
        return memory.to_dict()
    
    def validate_schema(self) -> tuple[bool, List[str]]:
        """
        Verify memory.json follows schema.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        if not self.memory_path.exists():
            return False, ["memory.json does not exist"]
        
        try:
            with open(self.memory_path, 'r', encoding='utf-8') as f:
                memory_data = json.load(f)
            
            return validate_schema(memory_data, MEMORY_SCHEMA)
            
        except json.JSONDecodeError as e:
            return False, [f"Invalid JSON: {e}"]
        except Exception as e:
            return False, [f"Validation error: {e}"]
    
    def get_active_objectives(self) -> List[Objective]:
        """
        Get all active objectives.
        
        Returns:
            List of active objectives
        """
        memory = self.load_memory()
        if memory is None:
            return []
        
        return [obj for obj in memory.objectives if obj.status == "active"]
    
    def get_pending_tasks(self) -> List[Task]:
        """
        Get all pending tasks.
        
        Returns:
            List of pending tasks
        """
        memory = self.load_memory()
        if memory is None:
            return []
        
        return [task for task in memory.task_backlog if task.status in ["pending", "in_progress"]]
    
    def get_recent_decisions(self, limit: int = 10) -> List[Decision]:
        """
        Get recent decisions sorted by timestamp.
        
        Args:
            limit: Maximum number of decisions to return
            
        Returns:
            List of recent decisions
        """
        memory = self.load_memory()
        if memory is None:
            return []
        
        sorted_decisions = sorted(
            memory.decisions,
            key=lambda d: d.timestamp,
            reverse=True
        )
        
        return sorted_decisions[:limit]

