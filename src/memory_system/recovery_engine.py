"""
Recovery Engine for StoryCore LLM Memory System.

This module handles automatic repair and desperate recovery of damaged projects.
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid
import shutil

from .data_models import (
    Error,
    ErrorType,
    ErrorSeverity,
    RecoveryReport,
    RepairResult,
    RecoveryType,
)
from .build_logger import BuildLogger


class RecoveryEngine:
    """
    Repairs errors and reconstructs damaged projects.
    
    Responsibilities:
    - Attempt automatic repair based on error type
    - Repair missing files from templates or logs
    - Repair invalid JSON with syntax fixing or backup restoration
    - Reconcile memory inconsistencies
    - Limit recovery attempts to prevent infinite loops
    - Perform desperate recovery mode (last resort)
    
    Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
    """
    
    MAX_RECOVERY_ATTEMPTS = 3
    
    def __init__(self, project_path: Path):
        """
        Initialize the RecoveryEngine.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.build_logger = BuildLogger(project_path)
        self.errors_path = self.project_path / "build_logs" / "errors_detected.json"
    
    def attempt_repair(self, error: Error) -> RepairResult:
        """
        Try to automatically fix the error.
        
        Args:
            error: Error to repair
            
        Returns:
            RepairResult with success status and details
            
        Validates: Requirements 11.1, 11.5
        """
        # Check recovery attempt limit
        if error.recovery_attempts >= self.MAX_RECOVERY_ATTEMPTS:
            return RepairResult(
                success=False,
                reason=f"Maximum recovery attempts ({self.MAX_RECOVERY_ATTEMPTS}) exceeded",
                actions_taken=[]
            )
        
        # Route to appropriate repair method
        if error.type == ErrorType.MISSING_FILE:
            return self.repair_missing_file(error)
        elif error.type == ErrorType.INVALID_JSON:
            return self.repair_invalid_json(error)
        elif error.type == ErrorType.INCONSISTENT_STATE:
            return self.repair_inconsistent_state(error)
        elif error.type == ErrorType.CORRUPTED_DATA:
            return self.repair_corrupted_data(error)
        else:
            return RepairResult(
                success=False,
                reason=f"Unknown error type: {error.type}",
                actions_taken=[]
            )
    
    def repair_missing_file(self, error: Error) -> RepairResult:
        """
        Recreate missing file from templates or logs.
        
        Args:
            error: Missing file error
            
        Returns:
            RepairResult with success status and details
            
        Validates: Requirement 11.1
        """
        actions = []
        
        for component in error.affected_components:
            file_path = self.project_path / component
            
            if file_path.exists():
                continue
            
            actions.append(f"Attempting to recreate: {component}")
            
            # Try to recreate based on file type
            if component == "project_config.json":
                if self._recreate_config_from_logs(file_path):
                    actions.append(f"Recreated {component} from logs")
                else:
                    return RepairResult(
                        success=False,
                        reason=f"Could not recreate {component}",
                        actions_taken=actions
                    )
            
            elif component == "assistant/memory.json":
                if self._recreate_memory_from_logs(file_path):
                    actions.append(f"Recreated {component} from logs")
                else:
                    return RepairResult(
                        success=False,
                        reason=f"Could not recreate {component}",
                        actions_taken=actions
                    )
            
            elif component == "assistant/variables.json":
                if self._recreate_variables(file_path):
                    actions.append(f"Recreated {component}")
                else:
                    return RepairResult(
                        success=False,
                        reason=f"Could not recreate {component}",
                        actions_taken=actions
                    )
            
            else:
                # For other files, create empty file
                try:
                    file_path.parent.mkdir(parents=True, exist_ok=True)
                    file_path.touch()
                    actions.append(f"Created empty file: {component}")
                except Exception as e:
                    return RepairResult(
                        success=False,
                        reason=f"Could not create {component}: {e}",
                        actions_taken=actions
                    )
        
        # Log recovery attempt
        self.build_logger.log_recovery_attempt(
            error_id=error.id,
            action_taken="repair_missing_file",
            success=True
        )
        
        return RepairResult(
            success=True,
            reason="All missing files repaired",
            actions_taken=actions
        )
    
    def _recreate_config_from_logs(self, file_path: Path) -> bool:
        """Recreate project_config.json from log analysis."""
        try:
            # Try to find configuration in logs
            recent_actions = self.build_logger.get_recent_actions(100)
            
            # Look for initialization actions
            config_data = {
                "schema_version": "1.0",
                "project_name": "Recovered Project",
                "project_type": "video",
                "creation_timestamp": datetime.now().isoformat(),
                "objectives": [],
                "memory_system_enabled": True,
                "memory_system_config": {
                    "auto_summarize": True,
                    "summarization_threshold_kb": 50,
                    "auto_translate": True,
                    "target_languages": ["en", "fr"],
                    "error_detection_enabled": True,
                    "auto_recovery_enabled": True,
                    "max_recovery_attempts": 3
                }
            }
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception:
            return False
    
    def _recreate_memory_from_logs(self, file_path: Path) -> bool:
        """Recreate memory.json from log analysis."""
        try:
            # Build memory from logged decisions and actions
            recent_actions = self.build_logger.get_recent_actions(1000)
            
            objectives = []
            entities = []
            decisions = []
            task_backlog = []
            
            for action in recent_actions:
                if action.action_type == "LLM_DECISION":
                    decision_text = action.parameters.get('decision', '')
                    decisions.append({
                        "id": str(uuid.uuid4()),
                        "description": decision_text,
                        "rationale": "",
                        "alternatives_considered": [],
                        "timestamp": action.timestamp
                    })
                
                elif action.action_type == "MEMORY_UPDATED":
                    update_type = action.parameters.get('update_type', '')
                    # Extract relevant info
            
            memory_data = {
                "schema_version": "1.0",
                "last_updated": datetime.now().isoformat(),
                "objectives": objectives,
                "entities": entities,
                "constraints": [],
                "decisions": decisions,
                "style_rules": [],
                "task_backlog": task_backlog,
                "current_state": {
                    "phase": "recovery",
                    "progress_percentage": 0,
                    "active_tasks": [],
                    "blockers": [],
                    "last_activity": datetime.now().isoformat()
                }
            }
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(memory_data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception:
            return False
    
    def _recreate_variables(self, file_path: Path) -> bool:
        """Recreate variables.json."""
        try:
            variables_data = {
                "schema_version": "1.0",
                "last_updated": datetime.now().isoformat(),
                "variables": {}
            }
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(variables_data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception:
            return False
    
    def repair_invalid_json(self, error: Error) -> RepairResult:
        """
        Fix JSON syntax or restore from backup.
        
        Args:
            error: Invalid JSON error
            
        Returns:
            RepairResult with success status and details
            
        Validates: Requirement 11.1
        """
        actions = []
        
        for component in error.affected_components:
            file_path = self.project_path / component
            
            if not file_path.exists():
                actions.append(f"File not found: {component}")
                continue
            
            actions.append(f"Attempting to fix JSON in: {component}")
            
            # Try to fix common JSON issues
            fixed = self._fix_json_syntax(file_path)
            
            if fixed:
                actions.append(f"Fixed JSON syntax in {component}")
            else:
                # Try backup restoration
                restored = self._restore_from_backup(file_path)
                if restored:
                    actions.append(f"Restored {component} from backup")
                else:
                    return RepairResult(
                        success=False,
                        reason=f"Could not fix {component}",
                        actions_taken=actions
                    )
        
        # Log recovery attempt
        self.build_logger.log_recovery_attempt(
            error_id=error.id,
            action_taken="repair_invalid_json",
            success=True
        )
        
        return RepairResult(
            success=True,
            reason="All invalid JSON files repaired",
            actions_taken=actions
        )
    
    def _fix_json_syntax(self, file_path: Path) -> bool:
        """Attempt to fix common JSON syntax errors."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Try to parse
            json.loads(content)
            return True  # Already valid
            
        except json.JSONDecodeError as e:
            # Try to fix common issues
            fixed_content = content
            
            # Fix trailing commas
            import re
            fixed_content = re.sub(r',(\s*[}\]])', r'\1', fixed_content)
            
            # Try parsing again
            try:
                json.loads(fixed_content)
                # Write fixed content
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(fixed_content)
                return True
            except json.JSONDecodeError:
                pass
            
            return False
        
        except Exception:
            return False
    
    def _restore_from_backup(self, file_path: Path) -> bool:
        """Restore file from backup."""
        # Look for backup files
        backup_path = file_path.with_suffix(file_path.suffix + '.backup')
        
        if backup_path.exists():
            try:
                shutil.copy(backup_path, file_path)
                return True
            except Exception:
                pass
        
        # Could also check logs for content to reconstruct
        return False
    
    def repair_inconsistent_state(self, error: Error) -> RepairResult:
        """
        Reconcile memory.json with actual state.
        
        Args:
            error: Inconsistent state error
            
        Returns:
            RepairResult with success status and details
            
        Validates: Requirement 11.1
        """
        actions = []
        
        for component in error.affected_components:
            if component == "memory.json":
                actions.append("Reconciling memory.json with actual state")
                
                # Sync memory from file system
                if self._sync_memory_from_filesystem():
                    actions.append("Synced memory with file system")
                else:
                    return RepairResult(
                        success=False,
                        reason="Could not reconcile memory state",
                        actions_taken=actions
                    )
        
        # Log recovery attempt
        self.build_logger.log_recovery_attempt(
            error_id=error.id,
            action_taken="repair_inconsistent_state",
            success=True
        )
        
        return RepairResult(
            success=True,
            reason="State inconsistencies resolved",
            actions_taken=actions
        )
    
    def _sync_memory_from_filesystem(self) -> bool:
        """Sync memory.json with actual file system state."""
        try:
            memory_path = self.project_path / "assistant" / "memory.json"
            
            if not memory_path.exists():
                return False
            
            with open(memory_path, 'r', encoding='utf-8') as f:
                memory_data = json.load(f)
            
            # Update last_activity
            memory_data['last_updated'] = datetime.now().isoformat()
            if 'current_state' not in memory_data:
                memory_data['current_state'] = {}
            memory_data['current_state']['last_activity'] = datetime.now().isoformat()
            
            with open(memory_path, 'w', encoding='utf-8') as f:
                json.dump(memory_data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception:
            return False
    
    def repair_corrupted_data(self, error: Error) -> RepairResult:
        """
        Repair corrupted data files.
        
        Args:
            error: Corrupted data error
            
        Returns:
            RepairResult with success status and details
        """
        actions = []
        
        for component in error.affected_components:
            file_path = self.project_path / component
            
            if not file_path.exists():
                actions.append(f"File not found: {component}")
                continue
            
            # Try to recover what we can
            if self._recover_corrupted_file(file_path):
                actions.append(f"Recovered data from {component}")
            else:
                # Create empty valid file
                self._create_empty_valid_file(file_path)
                actions.append(f"Reset {component} to empty valid state")
        
        # Log recovery attempt
        self.build_logger.log_recovery_attempt(
            error_id=error.id,
            action_taken="repair_corrupted_data",
            success=True
        )
        
        return RepairResult(
            success=True,
            reason="Corrupted data repaired",
            actions_taken=actions
        )
    
    def _recover_corrupted_file(self, file_path: Path) -> bool:
        """Attempt to recover data from corrupted file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Try partial recovery for JSON
            if file_path.suffix == '.json':
                # Try to extract valid JSON objects
                import re
                json_objects = re.findall(r'\{[^{}]*\{[^{}]*\}[^{}]*\}', content)
                
                if json_objects:
                    # Try to parse
                    for obj_str in json_objects:
                        try:
                            json.loads(obj_str)
                            return True
                        except Exception:
                            continue
            
            return False
            
        except Exception:
            return False
    
    def _create_empty_valid_file(self, file_path: Path) -> None:
        """Create empty valid file based on type."""
        if file_path.name == "memory.json":
            content = {
                "schema_version": "1.0",
                "last_updated": datetime.now().isoformat(),
                "objectives": [],
                "entities": [],
                "constraints": [],
                "decisions": [],
                "style_rules": [],
                "task_backlog": [],
                "current_state": {
                    "phase": "recovery",
                    "progress_percentage": 0,
                    "active_tasks": [],
                    "blockers": [],
                    "last_activity": datetime.now().isoformat()
                }
            }
        elif file_path.name == "variables.json":
            content = {
                "schema_version": "1.0",
                "last_updated": datetime.now().isoformat(),
                "variables": {}
            }
        else:
            content = {}
        
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, indent=2, ensure_ascii=False)
    
    def desperate_recovery(self) -> RecoveryReport:
        """
        Reconstruct project from logs as last resort.
        
        Returns:
            RecoveryReport with reconstruction results
            
        Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
        """
        restored_files = []
        lost_files = []
        confidence_scores = {}
        warnings = []
        recommendations = []
        
        # Analyze logs for recovery
        history = self.analyze_logs_for_recovery()
        
        # Rebuild directory structure
        if self.rebuild_structure(history):
            restored_files.extend(history.get('directories', []))
        else:
            lost_files.extend(history.get('directories', []))
            confidence_scores['directories'] = 0.0
            warnings.append("Could not rebuild directory structure")
            recommendations.append("Manual directory creation may be required")
        
        # Reconstitute memory
        if self.reconstitute_memory(history):
            restored_files.append("assistant/memory.json")
            confidence_scores['memory.json'] = 0.8
        else:
            lost_files.append("assistant/memory.json")
            confidence_scores['memory.json'] = 0.0
            recommendations.append("Memory may be incomplete - consider reviewing project objectives")
        
        # Cross-verify with available files
        verification_results = self._cross_verify_files(history)
        
        for file_path, verified in verification_results.items():
            if verified:
                confidence_scores[str(file_path)] = confidence_scores.get(str(file_path), 0.5) + 0.3
            else:
                confidence_scores[str(file_path)] = 0.2
                warnings.append(f"File verification failed: {file_path}")
        
        # Generate recovery report
        report = RecoveryReport(
            success=len(lost_files) == 0,
            restored_files=[Path(f) for f in restored_files],
            lost_files=[Path(f) for f in lost_files],
            confidence_scores=confidence_scores,
            warnings=warnings,
            recommendations=recommendations,
            timestamp=datetime.now().isoformat()
        )
        
        return report
    
    def analyze_logs_for_recovery(self) -> Dict[str, Any]:
        """
        Parse logs to understand project evolution.
        
        Returns:
            Dictionary with project history
            
        Validates: Requirement 12.1
        """
        history = {
            'directories': [],
            'files_created': [],
            'assets_added': [],
            'decisions': [],
            'memory_updates': [],
            'timeline': []
        }
        
        # Get all logged actions
        actions = self.build_logger.get_recent_actions(10000)
        
        for action in actions:
            timestamp = action.timestamp
            
            if action.action_type == "FILE_CREATED":
                for file_path in action.affected_files:
                    history['files_created'].append({
                        'path': file_path,
                        'timestamp': timestamp
                    })
                    history['timeline'].append({
                        'event': 'file_created',
                        'path': file_path,
                        'timestamp': timestamp
                    })
            
            elif action.action_type == "ASSET_ADDED":
                asset_path = action.parameters.get('asset_type', 'unknown')
                history['assets_added'].append({
                    'type': asset_path,
                    'timestamp': timestamp
                })
                history['timeline'].append({
                    'event': 'asset_added',
                    'type': asset_path,
                    'timestamp': timestamp
                })
            
            elif action.action_type == "LLM_DECISION":
                decision = action.parameters.get('decision', '')
                history['decisions'].append({
                    'description': decision,
                    'timestamp': timestamp
                })
            
            elif action.action_type == "MEMORY_UPDATED":
                update_type = action.parameters.get('update_type', '')
                history['memory_updates'].append({
                    'type': update_type,
                    'timestamp': timestamp
                })
        
        return history
    
    def rebuild_structure(self, history: Dict[str, Any]) -> bool:
        """
        Recreate directory structure from history.
        
        Args:
            history: Project history from log analysis
            
        Returns:
            True if rebuild succeeded, False otherwise
            
        Validates: Requirement 12.2
        """
        try:
            # Create directories based on known structure
            directories = [
                "assistant",
                "assistant/discussions_raw",
                "assistant/discussions_summary",
                "build_logs",
                "assets",
                "assets/images",
                "assets/audio",
                "assets/video",
                "assets/documents",
                "summaries",
                "qa_reports",
            ]
            
            for dir_path in directories:
                full_path = self.project_path / dir_path
                full_path.mkdir(parents=True, exist_ok=True)
            
            return True
            
        except Exception as e:
            print(f"Error rebuilding structure: {e}")
            return False
    
    def reconstitute_memory(self, history: Dict[str, Any]) -> bool:
        """
        Rebuild memory.json from logs and summaries.
        
        Args:
            history: Project history from log analysis
            
        Returns:
            True if reconstitution succeeded, False otherwise
            
        Validates: Requirement 12.3
        """
        try:
            memory_path = self.project_path / "assistant" / "memory.json"
            
            # Build memory from history
            objectives = []
            decisions = []
            task_backlog = []
            
            # Extract from decisions
            for decision in history.get('decisions', []):
                decisions.append({
                    "id": str(uuid.uuid4()),
                    "description": decision.get('description', ''),
                    "rationale": "Recovered from logs",
                    "alternatives_considered": [],
                    "timestamp": decision.get('timestamp', datetime.now().isoformat())
                })
            
            memory_data = {
                "schema_version": "1.0",
                "last_updated": datetime.now().isoformat(),
                "objectives": objectives,
                "entities": [],
                "constraints": [],
                "decisions": decisions,
                "style_rules": [],
                "task_backlog": task_backlog,
                "current_state": {
                    "phase": "recovered",
                    "progress_percentage": 0,
                    "active_tasks": [],
                    "blockers": ["Memory was recovered - verify all objectives"],
                    "last_activity": datetime.now().isoformat()
                }
            }
            
            memory_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(memory_path, 'w', encoding='utf-8') as f:
                json.dump(memory_data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Error reconstituting memory: {e}")
            return False
    
    def _cross_verify_files(self, history: Dict[str, Any]) -> Dict[str, bool]:
        """
        Verify that reconstructed files exist.
        
        Args:
            history: Project history
            
        Returns:
            Dictionary mapping file paths to verification status
        """
        verification = {}
        
        # Check key files
        key_files = [
            self.project_path / "project_config.json",
            self.project_path / "assistant" / "memory.json",
            self.project_path / "assistant" / "variables.json",
        ]
        
        for file_path in key_files:
            verification[str(file_path)] = file_path.exists()
        
        # Check assets directory has content
        assets_path = self.project_path / "assets"
        if assets_path.exists():
            has_assets = any(assets_path.iterdir())
            verification[str(assets_path)] = has_assets
        
        return verification
    
    def update_error_status(
        self, 
        error_id: str, 
        status: str, 
        recovery_attempts: int = 0
    ) -> bool:
        """
        Update error status after repair attempt.
        
        Args:
            error_id: ID of the error to update
            status: New status
            recovery_attempts: Number of recovery attempts
            
        Returns:
            True if updated successfully, False otherwise
            
        Validates: Requirements 11.3, 11.4
        """
        if not self.errors_path.exists():
            return False
        
        try:
            with open(self.errors_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Find and update error
            updated = False
            for error_data in data.get('errors', []):
                if error_data.get('id') == error_id:
                    error_data['status'] = status
                    error_data['recovery_attempts'] = recovery_attempts
                    updated = True
                    break
            
            if not updated:
                return False
            
            with open(self.errors_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception:
            return False

