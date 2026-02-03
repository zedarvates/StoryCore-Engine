"""
Error Detector for StoryCore LLM Memory System.

This module detects and classifies errors in the project.
"""

import json
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

from .data_models import (
    Error,
    ErrorType,
    ErrorSeverity,
)
from .schemas import (
    PROJECT_CONFIG_SCHEMA,
    MEMORY_SCHEMA,
    VARIABLES_SCHEMA,
    ERRORS_SCHEMA,
    validate_schema,
)


class ErrorClassification:
    """Result of error classification."""
    
    def __init__(
        self,
        error_type: ErrorType,
        severity: ErrorSeverity,
        affected_components: List[str],
        diagnostic_info: Dict[str, Any]
    ):
        self.type = error_type
        self.severity = severity
        self.affected_components = affected_components
        self.diagnostic_info = diagnostic_info


class ErrorDetector:
    """
    Detects and classifies errors in the project.
    
    Responsibilities:
    - Scan project for errors and inconsistencies
    - Validate JSON files for schema compliance
    - Check state consistency between memory and actual files
    - Classify errors by type and severity
    
    Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
    """
    
    # Required directory structure
    REQUIRED_DIRECTORIES = [
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
    
    # Required files
    REQUIRED_FILES = [
        "project_config.json",
        "assistant/memory.json",
        "assistant/variables.json",
    ]
    
    def __init__(self, project_path: Path):
        """
        Initialize the ErrorDetector.
        
        Args:
            project_path: Root path for the project
        """
        self.project_path = Path(project_path)
        self.errors_path = self.project_path / "build_logs" / "errors_detected.json"
    
    def detect_errors(self) -> List[Error]:
        """
        Scan project for errors and inconsistencies.
        
        Returns:
            List of detected errors
            
        Validates: Requirement 10.1
        """
        errors = []
        
        # Check for missing files
        missing_file_errors = self.check_missing_files()
        errors.extend(missing_file_errors)
        
        # Validate JSON files
        json_errors = self.validate_json_files()
        errors.extend(json_errors)
        
        # Check state consistency
        state_errors = self.check_state_consistency()
        errors.extend(state_errors)
        
        return errors
    
    def check_missing_files(self) -> List[Error]:
        """
        Identify missing required files and directories.
        
        Returns:
            List of missing file errors
            
        Validates: Requirement 10.4
        """
        errors = []
        
        # Check directories
        for dir_path in self.REQUIRED_DIRECTORIES:
            full_path = self.project_path / dir_path
            if not full_path.exists():
                errors.append(Error(
                    id=str(uuid.uuid4()),
                    type=ErrorType.MISSING_FILE,
                    severity=ErrorSeverity.HIGH,
                    detected=datetime.now().isoformat(),
                    description=f"Missing required directory: {dir_path}",
                    affected_components=[dir_path],
                    diagnostic_info={"expected_path": str(full_path)},
                    status="detected"
                ))
        
        # Check files
        for file_path in self.REQUIRED_FILES:
            full_path = self.project_path / file_path
            if not full_path.exists():
                errors.append(Error(
                    id=str(uuid.uuid4()),
                    type=ErrorType.MISSING_FILE,
                    severity=ErrorSeverity.HIGH,
                    detected=datetime.now().isoformat(),
                    description=f"Missing required file: {file_path}",
                    affected_components=[file_path],
                    diagnostic_info={"expected_path": str(full_path)},
                    status="detected"
                ))
        
        return errors
    
    def validate_json_files(self) -> List[Error]:
        """
        Check JSON files for schema compliance.
        
        Returns:
            List of JSON validation errors
            
        Validates: Requirement 10.5
        """
        errors = []
        
        json_files = {
            "project_config.json": PROJECT_CONFIG_SCHEMA,
            "assistant/memory.json": MEMORY_SCHEMA,
            "assistant/variables.json": VARIABLES_SCHEMA,
        }
        
        for filename, schema in json_files.items():
            file_path = self.project_path / filename
            
            if not file_path.exists():
                continue
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                is_valid, validation_errors = validate_schema(data, schema)
                
                if not is_valid:
                    errors.append(Error(
                        id=str(uuid.uuid4()),
                        type=ErrorType.INVALID_JSON,
                        severity=ErrorSeverity.HIGH,
                        detected=datetime.now().isoformat(),
                        description=f"Invalid JSON in {filename}: {validation_errors[0] if validation_errors else 'Unknown error'}",
                        affected_components=[filename],
                        diagnostic_info={
                            "errors": validation_errors,
                            "schema_version": data.get("schema_version", "unknown")
                        },
                        status="detected"
                    ))
            
            except json.JSONDecodeError as e:
                errors.append(Error(
                    id=str(uuid.uuid4()),
                    type=ErrorType.INVALID_JSON,
                    severity=ErrorSeverity.CRITICAL,
                    detected=datetime.now().isoformat(),
                    description=f"JSON syntax error in {filename}: {str(e)}",
                    affected_components=[filename],
                    diagnostic_info={"error_position": e.pos if hasattr(e, 'pos') else None},
                    status="detected"
                ))
            
            except Exception as e:
                errors.append(Error(
                    id=str(uuid.uuid4()),
                    type=ErrorType.CORRUPTED_DATA,
                    severity=ErrorSeverity.HIGH,
                    detected=datetime.now().isoformat(),
                    description=f"Error reading {filename}: {str(e)}",
                    affected_components=[filename],
                    diagnostic_info={},
                    status="detected"
                ))
        
        return errors
    
    def check_state_consistency(self) -> List[Error]:
        """
        Verify memory.json matches actual project state.
        
        Returns:
            List of state inconsistency errors
            
        Validates: Requirement 10.6
        """
        errors = []
        
        memory_path = self.project_path / "assistant/memory.json"
        
        if not memory_path.exists():
            return errors
        
        try:
            with open(memory_path, 'r', encoding='utf-8') as f:
                memory_data = json.load(f)
            
            # Check current_state phase is valid
            current_state = memory_data.get('current_state', {})
            valid_phases = [
                'initialization', 'planning', 'development', 'testing',
                'review', 'deployment', 'completed', 'unknown'
            ]
            
            phase = current_state.get('phase', 'unknown')
            if phase not in valid_phases:
                errors.append(Error(
                    id=str(uuid.uuid4()),
                    type=ErrorType.INCONSISTENT_STATE,
                    severity=ErrorSeverity.LOW,
                    detected=datetime.now().isoformat(),
                    description=f"Invalid project phase: {phase}",
                    affected_components=["memory.json"],
                    diagnostic_info={
                        "invalid_phase": phase,
                        "valid_phases": valid_phases
                    },
                    status="detected"
                ))
            
            # Check progress percentage is valid
            progress = current_state.get('progress_percentage', 0)
            if not isinstance(progress, (int, float)) or progress < 0 or progress > 100:
                errors.append(Error(
                    id=str(uuid.uuid4()),
                    type=ErrorType.INCONSISTENT_STATE,
                    severity=ErrorSeverity.LOW,
                    detected=datetime.now().isoformat(),
                    description=f"Invalid progress percentage: {progress}",
                    affected_components=["memory.json"],
                    diagnostic_info={"invalid_progress": progress},
                    status="detected"
                ))
        
        except Exception as e:
            errors.append(Error(
                id=str(uuid.uuid4()),
                type=ErrorType.CORRUPTED_DATA,
                severity=ErrorSeverity.CRITICAL,
                detected=datetime.now().isoformat(),
                description=f"Error checking state consistency: {str(e)}",
                affected_components=["memory.json"],
                diagnostic_info={},
                status="detected"
            ))
        
        return errors
    
    def classify_error(self, error: Error) -> ErrorClassification:
        """
        Categorize error by type and severity.
        
        Args:
            error: Error to classify
            
        Returns:
            Error classification result
            
        Validates: Requirement 10.2
        """
        return ErrorClassification(
            error_type=error.type,
            severity=error.severity,
            affected_components=error.affected_components,
            diagnostic_info=error.diagnostic_info
        )
    
    def log_errors(self, errors: List[Error]) -> bool:
        """
        Log errors to errors_detected.json.
        
        Args:
            errors: List of errors to log
            
        Returns:
            True if logged successfully, False otherwise
            
        Validates: Requirements 10.1, 10.3
        """
        try:
            # Load existing errors
            existing_errors = []
            if self.errors_path.exists():
                try:
                    with open(self.errors_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        existing_errors = data.get('errors', [])
                except (json.JSONDecodeError, KeyError):
                    existing_errors = []
            
            # Add new errors
            for error in errors:
                existing_errors.append(error.to_dict())
            
            # Write back
            errors_path = self.errors_path.parent
            errors_path.mkdir(parents=True, exist_ok=True)
            
            output_data = {
                "schema_version": "1.0",
                "errors": existing_errors
            }
            
            with open(self.errors_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Error logging errors: {e}")
            return False
    
    def get_errors_by_type(self, error_type: ErrorType) -> List[Error]:
        """
        Get all errors of a specific type.
        
        Args:
            error_type: Type of errors to retrieve
            
        Returns:
            List of matching errors
        """
        if not self.errors_path.exists():
            return []
        
        try:
            with open(self.errors_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            errors = []
            for error_data in data.get('errors', []):
                if error_data.get('type') == error_type.value:
                    errors.append(Error(
                        id=error_data.get('id', ''),
                        type=ErrorType(error_data.get('type', 'missing_file')),
                        severity=ErrorSeverity(error_data.get('severity', 'low')),
                        detected=error_data.get('detected', ''),
                        description=error_data.get('description', ''),
                        affected_components=error_data.get('affected_components', []),
                        diagnostic_info=error_data.get('diagnostic_info', {}),
                        status=error_data.get('status', 'detected'),
                        recovery_attempts=error_data.get('recovery_attempts', 0)
                    ))
            
            return errors
            
        except Exception:
            return []
    
    def get_active_errors(self) -> List[Error]:
        """
        Get all active (non-resolved) errors.
        
        Returns:
            List of active errors
        """
        if not self.errors_path.exists():
            return []
        
        try:
            with open(self.errors_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            errors = []
            for error_data in data.get('errors', []):
                status = error_data.get('status', 'detected')
                if status in ['detected', 'repair_attempted']:
                    errors.append(Error(
                        id=error_data.get('id', ''),
                        type=ErrorType(error_data.get('type', 'missing_file')),
                        severity=ErrorSeverity(error_data.get('severity', 'low')),
                        detected=error_data.get('detected', ''),
                        description=error_data.get('description', ''),
                        affected_components=error_data.get('affected_components', []),
                        diagnostic_info=error_data.get('diagnostic_info', {}),
                        status=status,
                        recovery_attempts=error_data.get('recovery_attempts', 0)
                    ))
            
            return errors
            
        except Exception:
            return []
    
    def clear_resolved_errors(self) -> bool:
        """
        Remove resolved errors from the errors file.
        
        Returns:
            True if cleared successfully, False otherwise
        """
        if not self.errors_path.exists():
            return True
        
        try:
            with open(self.errors_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Keep only active errors
            active_errors = [
                e for e in data.get('errors', [])
                if e.get('status') in ['detected', 'repair_attempted', 'requires_manual_intervention']
            ]
            
            data['errors'] = active_errors
            
            with open(self.errors_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Error clearing resolved errors: {e}")
            return False

