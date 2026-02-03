"""
Build Logger for StoryCore LLM Memory System.

This module handles comprehensive action logging for tracking project evolution.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import json
import os

from .data_models import (
    Action,
    AssetInfo,
)


class BuildLogger:
    """
    Manages comprehensive logging of all structural actions and changes.
    
    Responsibilities:
    - Log all structural actions to build_steps_raw.log
    - Ensure append-only behavior
    - Maintain consistent structured format
    - Log file creation, asset additions, variable changes, etc.
    
    Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5
    """
    
    BUILD_LOGS_DIR = "build_logs"
    RAW_LOG_FILENAME = "build_steps_raw.log"
    CLEAN_LOG_FILENAME = "build_steps_clean.txt"
    TRANSLATED_LOG_FILENAME = "build_steps_translated.txt"
    RECOVERY_LOG_FILENAME = "recovery_attempts.log"
    
    def __init__(self, project_path: Path):
        """
        Initialize the BuildLogger.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.logs_path = self.project_path / self.BUILD_LOGS_DIR
        self.raw_log_path = self.logs_path / self.RAW_LOG_FILENAME
        self.recovery_log_path = self.logs_path / self.RECOVERY_LOG_FILENAME
    
    def log_action(
        self,
        action_type: str,
        affected_files: Optional[List[str]] = None,
        parameters: Optional[Dict[str, Any]] = None,
        triggered_by: str = "system"
    ) -> bool:
        """
        Append action to build_steps_raw.log.
        
        Args:
            action_type: Type of action (e.g., "FILE_CREATED", "ASSET_ADDED")
            affected_files: List of affected file paths
            parameters: Additional action parameters
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirements 8.1, 8.3, 8.4, 8.5
        """
        try:
            # Ensure directory exists
            self.logs_path.mkdir(parents=True, exist_ok=True)
            
            # Create action entry
            action = Action(
                timestamp=datetime.now().isoformat(),
                action_type=action_type,
                affected_files=affected_files or [],
                parameters=parameters or {},
                triggered_by=triggered_by
            )
            
            # Format as structured log entry
            log_entry = self._format_action_entry(action)
            
            # Append to raw log
            with open(self.raw_log_path, 'a', encoding='utf-8') as f:
                f.write(log_entry)
            
            return True
            
        except Exception as e:
            print(f"Error logging action: {e}")
            return False
    
    def _format_action_entry(self, action: Action) -> str:
        """Format an action as a log entry."""
        lines = []
        lines.append(f"[{action.timestamp}] ACTION: {action.action_type}")
        
        if action.affected_files:
            lines.append("  Files:")
            for file in action.affected_files:
                lines.append(f"    - {file}")
        
        if action.parameters:
            lines.append("  Parameters:")
            for key, value in action.parameters.items():
                lines.append(f"    {key}: {value}")
        
        if action.triggered_by:
            lines.append(f"  Triggered_By: {action.triggered_by}")
        
        lines.append("")
        lines.append("")
        
        return "\n".join(lines)
    
    def log_file_creation(
        self,
        file_path: Path,
        triggered_by: str = "system"
    ) -> bool:
        """
        Log file creation event.
        
        Args:
            file_path: Path to the created file
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirement 8.2
        """
        return self.log_action(
            action_type="FILE_CREATED",
            affected_files=[str(file_path)],
            parameters={
                "file_size": file_path.stat().st_size if file_path.exists() else 0
            },
            triggered_by=triggered_by
        )
    
    def log_asset_addition(
        self,
        asset_info: AssetInfo,
        triggered_by: str = "system"
    ) -> bool:
        """
        Log asset addition event.
        
        Args:
            asset_info: Information about the added asset
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirement 8.2
        """
        return self.log_action(
            action_type="ASSET_ADDED",
            affected_files=[str(asset_info.path)],
            parameters={
                "asset_type": asset_info.type.value,
                "asset_size": asset_info.size_bytes,
                "description": asset_info.description
            },
            triggered_by=triggered_by
        )
    
    def log_memory_update(
        self,
        update_type: str,
        details: Dict[str, Any],
        triggered_by: str = "system"
    ) -> bool:
        """
        Log memory.json modification.
        
        Args:
            update_type: Type of memory update
            details: Details of the update
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirement 8.2
        """
        return self.log_action(
            action_type="MEMORY_UPDATED",
            affected_files=["assistant/memory.json"],
            parameters={
                "update_type": update_type,
                **details
            },
            triggered_by=triggered_by
        )
    
    def log_variable_change(
        self,
        variable_name: str,
        old_value: Any,
        new_value: Any,
        triggered_by: str = "system"
    ) -> bool:
        """
        Log variable change event.
        
        Args:
            variable_name: Name of the variable
            old_value: Previous value
            new_value: New value
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirements 8.2, 15.3
        """
        return self.log_action(
            action_type="VARIABLE_CHANGED",
            affected_files=["assistant/variables.json"],
            parameters={
                "variable": variable_name,
                "old_value": str(old_value),
                "new_value": str(new_value)
            },
            triggered_by=triggered_by
        )
    
    def log_summary_generation(
        self,
        summary_type: str,
        source_file: str,
        output_file: str,
        triggered_by: str = "system"
    ) -> bool:
        """
        Log summary generation event.
        
        Args:
            summary_type: Type of summary
            source_file: Source file for summary
            output_file: Output summary file
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirement 8.2
        """
        return self.log_action(
            action_type="SUMMARY_GENERATED",
            affected_files=[output_file],
            parameters={
                "summary_type": summary_type,
                "source": source_file,
                "output": output_file
            },
            triggered_by=triggered_by
        )
    
    def log_decision(
        self,
        decision: str,
        details: Optional[Dict[str, Any]] = None,
        triggered_by: str = "llm"
    ) -> bool:
        """
        Log LLM decision event.
        
        Args:
            decision: Description of the decision
            details: Additional details
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirement 8.2
        """
        return self.log_action(
            action_type="LLM_DECISION",
            affected_files=[],
            parameters={
                "decision": decision,
                **(details or {})
            },
            triggered_by=triggered_by
        )
    
    def log_error(
        self,
        error_type: str,
        description: str,
        affected_components: Optional[List[str]] = None,
        triggered_by: str = "system"
    ) -> bool:
        """
        Log error event.
        
        Args:
            error_type: Type of error
            description: Error description
            affected_components: Affected components
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
        """
        return self.log_action(
            action_type="ERROR_DETECTED",
            affected_files=affected_components or [],
            parameters={
                "error_type": error_type,
                "description": description
            },
            triggered_by=triggered_by
        )
    
    def log_recovery_attempt(
        self,
        error_id: str,
        action_taken: str,
        success: bool,
        triggered_by: str = "system"
    ) -> bool:
        """
        Log recovery attempt to recovery_attempts.log.
        
        Args:
            error_id: ID of the error being recovered
            action_taken: Action taken for recovery
            success: Whether recovery was successful
            triggered_by: What triggered this action
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirement 11.2
        """
        try:
            # Ensure directory exists
            self.logs_path.mkdir(parents=True, exist_ok=True)
            
            log_entry = f"[{datetime.now().isoformat()}] ERROR_ID: {error_id}\n"
            log_entry += f"  Action: {action_taken}\n"
            log_entry += f"  Success: {success}\n"
            log_entry += f"  Triggered_By: {triggered_by}\n"
            log_entry += "\n"
            
            with open(self.recovery_log_path, 'a', encoding='utf-8') as f:
                f.write(log_entry)
            
            return True
            
        except Exception as e:
            print(f"Error logging recovery attempt: {e}")
            return False
    
    def get_recent_actions(self, limit: int = 50) -> List[Action]:
        """
        Retrieve recent logged actions.
        
        Args:
            limit: Maximum number of actions to return
            
        Returns:
            List of recent actions
            
        Validates: Requirement 8.3
        """
        if not self.raw_log_path.exists():
            return []
        
        actions = []
        
        try:
            with open(self.raw_log_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse log entries
            actions = self._parse_log_entries(content)
            
            # Return most recent
            return actions[-limit:] if len(actions) > limit else actions
        
        except Exception as e:
            print(f"Error reading log: {e}")
            return []
    
    def _parse_log_entries(self, content: str) -> List[Action]:
        """Parse log entries from raw log content."""
        actions = []
        current_action = None
        
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            
            if not line:
                if current_action:
                    actions.append(current_action)
                    current_action = None
                continue
            
            # Parse timestamp and action type
            if line.startswith('[') and '] ACTION:' in line:
                if current_action:
                    actions.append(current_action)
                
                timestamp = line[1:line.index(']')]
                action_type = line[line.index('] ACTION:') + 9:]
                
                current_action = Action(
                    timestamp=timestamp,
                    action_type=action_type,
                    affected_files=[],
                    parameters={},
                    triggered_by=""
                )
            
            # Parse file entries
            elif line.startswith('- ') and current_action:
                current_action.affected_files.append(line[2:])
            
            # Parse parameters
            elif ': ' in line and not line.startswith('Triggered_By') and current_action:
                # This is a parameter or triggered by
                if 'Triggered_By:' in line:
                    current_action.triggered_by = line.split('Triggered_By:')[1].strip()
                else:
                    parts = line.split(': ', 1)
                    if len(parts) == 2:
                        current_action.parameters[parts[0].strip()] = parts[1].strip()
        
        # Don't forget the last action
        if current_action:
            actions.append(current_action)
        
        return actions
    
    def get_action_count(self) -> int:
        """
        Get the total number of logged actions.
        
        Returns:
            Number of actions in the log
        """
        if not self.raw_log_path.exists():
            return 0
        
        try:
            with open(self.raw_log_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return content.count('] ACTION:')
        
        except Exception:
            return 0
    
    def get_log_content(self) -> str:
        """
        Get the raw log content.
        
        Returns:
            Raw log content
        """
        if not self.raw_log_path.exists():
            return ""
        
        try:
            with open(self.raw_log_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            return ""
    
    def search_logs(self, query: str) -> List[Action]:
        """
        Search log entries by query.
        
        Args:
            query: Search query
            
        Returns:
            List of matching actions
        """
        actions = self.get_recent_actions(1000)  # Search recent actions
        query_lower = query.lower()
        
        matching = []
        for action in actions:
            # Search in action type
            if query_lower in action.action_type.lower():
                matching.append(action)
                continue
            
            # Search in affected files
            for file in action.affected_files:
                if query_lower in file.lower():
                    matching.append(action)
                    break
            
            # Search in parameters
            for key, value in action.parameters.items():
                if query_lower in str(value).lower():
                    matching.append(action)
                    break
        
        return matching

