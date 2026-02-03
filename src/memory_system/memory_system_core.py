"""
Memory System Core - Main orchestrator for the LLM Memory System.

This module provides the central coordination point for all memory system operations,
integrating all managers and providing the complete public API.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

from .data_models import (
    ProjectConfig,
    ProjectMemory,
    Conversation,
    Message,
    AssetInfo,
    AssetType,
    ValidationResult,
    ProjectContext,
    RecoveryReport,
    RecoveryType,
    Error,
    ErrorType,
    ErrorSeverity,
)
from .config_manager import ConfigManager
from .directory_manager import DirectoryManager
from .discussion_manager import DiscussionManager
from .memory_manager import MemoryManager
from .asset_manager import AssetManager
from .build_logger import BuildLogger
from .log_processor import LogProcessor
from .error_detector import ErrorDetector
from .recovery_engine import RecoveryEngine
from .summarization_engine import SummarizationEngine
from .timeline_generator import TimelineGenerator
from .variables_manager import VariablesManager
from .auto_qa_system import AutoQASystem


class MemorySystemCore:
    """
    Central orchestrator that coordinates all memory system operations.
    
    This class provides the main public API for interacting with the memory system.
    It integrates all managers and handles cross-component coordination.
    
    Validates: Requirements 1.1, 3.1, 6.1, 5.2, 10.1, 11.1, 12.1, and all other requirements
    """
    
    def __init__(self, project_path: Path, config: Optional[ProjectConfig] = None):
        """
        Initialize memory system for a project.
        
        Args:
            project_path: Path to the project directory
            config: Optional project configuration (loaded from file if not provided)
        """
        self.project_path = Path(project_path)
        
        # Initialize configuration
        self.config_manager = ConfigManager(project_path)
        
        if config:
            self.config = config
        else:
            self.config = self.config_manager.load_config()
        
        # Initialize all managers
        self.directory_manager = DirectoryManager()
        self.discussion_manager = DiscussionManager(project_path)
        self.memory_manager = MemoryManager(project_path)
        self.asset_manager = AssetManager(project_path)
        self.build_logger = BuildLogger(project_path)
        self.log_processor = LogProcessor(project_path)
        self.error_detector = ErrorDetector(project_path)
        self.recovery_engine = RecoveryEngine(project_path)
        self.summarization_engine = SummarizationEngine(project_path)
        self.timeline_generator = TimelineGenerator(project_path)
        self.variables_manager = VariablesManager(project_path)
        self.qa_system = AutoQASystem(project_path)
    
    # =========================================================================
    # Project Initialization
    # =========================================================================
    
    def initialize_project(
        self,
        project_name: str,
        project_type: str = "video",
        objectives: Optional[List[str]] = None,
        enable_memory_system: bool = True
    ) -> bool:
        """
        Create complete directory structure and initialize files.
        
        Args:
            project_name: Name of the project
            project_type: Type of project (video, script, creative, technical)
            objectives: List of project objectives
            enable_memory_system: Whether to enable memory system features
            
        Returns:
            True if initialization succeeded, False otherwise
            
        Validates: Requirement 1.1
        """
        if objectives is None:
            objectives = []
        
        try:
            # Sanitize project name
            sanitized_name = self.directory_manager._sanitize_project_name(project_name)
            
            # Create configuration
            if self.config is None:
                self.config = self.config_manager.create_default_config(
                    project_name=sanitized_name,
                    project_type=project_type,
                    objectives=objectives
                )
                self.config.memory_system_enabled = enable_memory_system
            
            # Create directory structure
            if not self.directory_manager.create_structure(self.project_path):
                return False
            
            # Initialize files
            if not self.directory_manager.initialize_files(self.project_path, self.config):
                return False
            
            # Save configuration
            if not self.config_manager.save_config(self.config):
                return False
            
            # Log initialization
            self.build_logger.log_action(
                action_type="PROJECT_INITIALIZED",
                affected_files=["project_config.json"],
                parameters={
                    "project_name": sanitized_name,
                    "project_type": project_type,
                    "objectives_count": str(len(objectives))
                },
                triggered_by="memory_system_core"
            )
            
            # Record in timeline
            self.timeline_generator.record_project_creation(
                project_name=sanitized_name,
                project_type=project_type,
                objectives=objectives
            )
            
            # Update overview
            self._update_project_overview()
            
            return True
            
        except Exception as e:
            print(f"Error initializing project: {e}")
            return False
    
    # =========================================================================
    # Discussion Management
    # =========================================================================
    
    def record_discussion(
        self,
        messages: List[Dict[str, Any]],
        session_id: Optional[str] = None
    ) -> bool:
        """
        Record a conversation and trigger summarization if needed.
        
        Args:
            messages: List of message dictionaries with 'role', 'content', 'timestamp'
            session_id: Optional session identifier
            
        Returns:
            True if recording succeeded, False otherwise
            
        Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
        """
        try:
            # Convert to Conversation object
            conversation = self._create_conversation(messages, session_id)
            
            # Record the conversation
            discussion_file = self.discussion_manager.record_conversation(
                conversation, 
                session_id
            )
            
            # Log the action
            self.build_logger.log_action(
                action_type="DISCUSSION_RECORDED",
                affected_files=[str(discussion_file)],
                parameters={
                    "message_count": str(len(messages)),
                    "session_id": conversation.session_id
                },
                triggered_by="memory_system_core"
            )
            
            # Check if summarization is needed
            if self.discussion_manager.should_summarize(discussion_file):
                self._trigger_summarization(discussion_file)
            
            # Update overview
            self._update_project_overview()
            
            return True
            
        except Exception as e:
            print(f"Error recording discussion: {e}")
            return False
    
    def _create_conversation(
        self,
        messages: List[Dict[str, Any]],
        session_id: Optional[str] = None
    ) -> Conversation:
        """Create a Conversation object from message list."""
        message_objects = []
        
        for msg in messages:
            timestamp = msg.get('timestamp', datetime.now())
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp)
            
            message_objects.append(Message(
                role=msg.get('role', 'user'),
                content=msg.get('content', ''),
                timestamp=timestamp
            ))
        
        start_time = message_objects[0].timestamp if message_objects else datetime.now()
        
        if session_id is None:
            session_id = f"session_{start_time.strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        return Conversation(
            messages=message_objects,
            session_id=session_id,
            start_time=start_time
        )
    
    def _trigger_summarization(self, discussion_file: Path) -> None:
        """Trigger summarization for a discussion file."""
        try:
            summary_file = self.discussion_manager.create_summary(discussion_file)
            
            if summary_file:
                self.build_logger.log_summary_generation(
                    summary_type="discussion",
                    source_file=str(discussion_file),
                    output_file=str(summary_file),
                    triggered_by="memory_system_core"
                )
                
                # Extract key information and update memory
                self._extract_and_update_memory(str(discussion_file))
        
        except Exception as e:
            print(f"Error during summarization: {e}")
    
    def _extract_and_update_memory(self, discussion_file: str) -> None:
        """Extract key information from discussion and update memory."""
        try:
            with open(discussion_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            key_info = self.discussion_manager.extract_key_information(content)
            
            # Update memory with extracted information
            if key_info["decisions"]:
                for decision in key_info["decisions"]:
                    self.memory_manager.add_decision(
                        description=decision,
                        rationale="Extracted from discussion"
                    )
            
            if key_info["constraints"]:
                for constraint in key_info["constraints"]:
                    self.memory_manager.add_constraint(description=constraint)
            
            # Log memory update
            self.build_logger.log_memory_update(
                update_type="discussion_extraction",
                details={"decisions": len(key_info["decisions"])},
                triggered_by="memory_system_core"
            )
        
        except Exception as e:
            print(f"Error extracting memory from discussion: {e}")
    
    # =========================================================================
    # Asset Management
    # =========================================================================
    
    def add_asset(
        self,
        asset_path: Path,
        asset_type: str,
        description: str = ""
    ) -> bool:
        """
        Add an asset and update indices.
        
        Args:
            asset_path: Path to the asset file
            asset_type: Type of the asset (image, audio, video, document)
            description: Optional description
            
        Returns:
            True if asset was added successfully, False otherwise
            
        Validates: Requirements 6.1, 6.2, 6.3
        """
        try:
            # Convert string to enum
            type_enum = AssetType(asset_type)
            
            # Store the asset
            asset_info = self.asset_manager.store_asset(
                Path(asset_path),
                type_enum,
                description
            )
            
            if asset_info is None:
                return False
            
            # Log the action
            self.build_logger.log_asset_addition(asset_info, triggered_by="memory_system_core")
            
            # Record in timeline
            self.timeline_generator.record_asset_addition(
                asset_name=asset_info.filename,
                asset_type=asset_type
            )
            
            # Trigger asset summarization
            self.asset_manager.summarize_assets()
            
            # Update overview
            self._update_project_overview()
            
            return True
            
        except Exception as e:
            print(f"Error adding asset: {e}")
            return False
    
    # =========================================================================
    # Memory Management
    # =========================================================================
    
    def update_memory(self, updates: Dict[str, Any]) -> bool:
        """
        Update project memory with new information.
        
        Args:
            updates: Dictionary of updates to apply
            
        Returns:
            True if update succeeded, False otherwise
            
        Validates: Requirement 5.2
        """
        try:
            result = self.memory_manager.update_memory(updates)
            
            if result:
                self.build_logger.log_memory_update(
                    update_type="manual",
                    details=updates,
                    triggered_by="memory_system_core"
                )
                
                # Update overview
                self._update_project_overview()
            
            return result
            
        except Exception as e:
            print(f"Error updating memory: {e}")
            return False
    
    def add_memory_objective(self, description: str) -> bool:
        """Add an objective to memory."""
        return self.memory_manager.add_objective(description)
    
    def add_memory_entity(
        self,
        name: str,
        entity_type: str,
        description: str,
        attributes: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Add an entity to memory."""
        return self.memory_manager.add_entity(name, entity_type, description, attributes)
    
    def add_memory_decision(
        self,
        description: str,
        rationale: str,
        alternatives: Optional[List[str]] = None
    ) -> bool:
        """Add a decision to memory."""
        return self.memory_manager.add_decision(description, rationale, alternatives)
    
    # =========================================================================
    # Project Context
    # =========================================================================
    
    def get_project_context(self) -> Optional[ProjectContext]:
        """
        Retrieve complete project context for LLM.
        
        Returns:
            Complete project context, or None if unavailable
            
        Validates: Requirement 5.4
        """
        try:
            # Load configuration
            config = self.config_manager.load_config()
            if config is None:
                return None
            
            # Load memory
            memory = self.memory_manager.load_memory()
            if memory is None:
                # Create empty memory
                memory = ProjectMemory()
            
            # Get recent discussions
            recent_discussions = self.discussion_manager.get_discussion_history(5)
            discussion_texts = [str(d) for d in recent_discussions]
            
            # Get asset summary
            asset_summary = self.asset_manager.get_asset_index()
            
            # Get project overview
            project_overview = self.timeline_generator.get_overview()
            
            # Get timeline
            timeline = self.timeline_generator.get_timeline(20)
            timeline_text = "\n".join([
                f"[{t['timestamp']}] {t['event_type']}: {t['description']}"
                for t in timeline
            ])
            
            return ProjectContext(
                config=config,
                memory=memory,
                recent_discussions=discussion_texts,
                asset_summary=asset_summary,
                project_overview=project_overview,
                timeline=timeline_text
            )
            
        except Exception as e:
            print(f"Error getting project context: {e}")
            return None
    
    # =========================================================================
    # Validation and Error Handling
    # =========================================================================
    
    def validate_project_state(self) -> ValidationResult:
        """
        Check project integrity and detect errors.
        
        Returns:
            Validation result with any detected errors
            
        Validates: Requirements 10.1, 10.4, 10.5, 10.6
        """
        try:
            # Detect errors
            errors = self.error_detector.detect_errors()
            
            # Log errors
            if errors:
                self.error_detector.log_errors(errors)
            
            # Log validation action
            self.build_logger.log_action(
                action_type="PROJECT_VALIDATED",
                affected_files=["build_logs/errors_detected.json"],
                parameters={"errors_found": str(len(errors))},
                triggered_by="memory_system_core"
            )
            
            # Determine overall validity
            critical_errors = [e for e in errors if e.severity == ErrorSeverity.CRITICAL]
            valid = len(critical_errors) == 0
            
            return ValidationResult(
                valid=valid,
                errors=errors,
                warnings=[e.description for e in errors if e.severity != ErrorSeverity.CRITICAL]
            )
            
        except Exception as e:
            print(f"Error validating project: {e}")
            return ValidationResult(
                valid=False,
                errors=[Error(
                    id=str(uuid.uuid4()),
                    type=ErrorType.CORRUPTED_DATA,
                    severity=ErrorSeverity.CRITICAL,
                    detected=datetime.now().isoformat(),
                    description=f"Validation error: {str(e)}",
                    affected_components=["memory_system_core"],
                    status="detected"
                )],
                warnings=[]
            )
    
    def trigger_recovery(
        self,
        recovery_type: RecoveryType = RecoveryType.AUTOMATIC
    ) -> RecoveryReport:
        """
        Initiate error recovery or desperate recovery mode.
        
        Args:
            recovery_type: Type of recovery to perform
            
        Returns:
            Recovery report with results
            
        Validates: Requirements 11.1, 12.1
        """
        try:
            if recovery_type == RecoveryType.DESPERATE:
                # Perform desperate recovery
                report = self.recovery_engine.desperate_recovery()
                
                self.timeline_generator.record_recovery(
                    recovery_type="desperate",
                    result="success" if report.success else "partial"
                )
                
                return report
            
            else:
                # Get active errors
                active_errors = self.error_detector.get_active_errors()
                
                if not active_errors:
                    return RecoveryReport(
                        success=True,
                        restored_files=[],
                        lost_files=[],
                        confidence_scores={},
                        warnings=[],
                        recommendations=["No active errors to repair"],
                        timestamp=datetime.now().isoformat()
                    )
                
                # Attempt repairs
                restored = []
                failed = []
                
                for error in active_errors:
                    result = self.recovery_engine.attempt_repair(error)
                    
                    if result.success:
                        restored.append(error.id)
                        
                        # Update error status
                        self.recovery_engine.update_error_status(
                            error.id,
                            status="resolved",
                            recovery_attempts=error.recovery_attempts + 1
                        )
                    else:
                        failed.append(error.id)
                        
                        # Update error status
                        self.recovery_engine.update_error_status(
                            error.id,
                            status="requires_manual_intervention" if error.recovery_attempts >= 3 else "repair_attempted",
                            recovery_attempts=error.recovery_attempts + 1
                        )
                
                # Record in timeline
                self.timeline_generator.record_recovery(
                    recovery_type="automatic",
                    result=f"restored: {len(restored)}, failed: {len(failed)}"
                )
                
                return RecoveryReport(
                    success=len(failed) == 0,
                    restored_files=[Path(e) for e in restored],
                    lost_files=[Path(e) for e in failed],
                    confidence_scores={},
                    warnings=[f"Failed to repair {len(failed)} errors"],
                    recommendations=["Manual intervention may be required for failed repairs"] if failed else [],
                    timestamp=datetime.now().isoformat()
                )
        
        except Exception as e:
            print(f"Error during recovery: {e}")
            return RecoveryReport(
                success=False,
                errors=[str(e)],
                timestamp=datetime.now().isoformat()
            )
    
    # =========================================================================
    # Utility Methods
    # =========================================================================
    
    def _update_project_overview(self) -> None:
        """Update the project overview from current state."""
        try:
            context = self.get_project_context()
            if context:
                context_dict = {
                    'config': context.config.to_dict() if hasattr(context.config, 'to_dict') else {},
                    'memory': context.memory.to_dict() if hasattr(context.memory, 'to_dict') else {}
                }
                self.timeline_generator.update_overview(context_dict)
        
        except Exception as e:
            print(f"Error updating project overview: {e}")
    
    def run_quality_check(self) -> Dict[str, Any]:
        """
        Run quality assurance checks.
        
        Returns:
            QA report dictionary
        """
        report = self.qa_system.generate_qa_report()
        
        return {
            "timestamp": report.timestamp,
            "overall_score": report.overall_score,
            "checks_passed": report.checks_passed,
            "checks_failed": report.checks_failed,
            "issues": [
                {"type": i.type, "severity": i.severity, "description": i.description}
                for i in report.issues
            ],
            "recommendations": report.recommendations
        }
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get current system status.
        
        Returns:
            Status dictionary
        """
        validation = self.validate_project_state()
        qa_report = self.qa_system.get_latest_report()
        
        return {
            "project_path": str(self.project_path),
            "config_loaded": self.config is not None,
            "validation_valid": validation.valid,
            "errors_count": len(validation.errors),
            "qa_score": qa_report.overall_score if qa_report else None,
            "last_activity": datetime.now().isoformat()
        }
    
    def clean_logs(self) -> bool:
        """Clean and process build logs."""
        clean_path = self.log_processor.clean_logs()
        translate_path = self.log_processor.translate_logs("fr")
        
        return clean_path is not None
    
    def get_variable(self, name: str, default: Any = None) -> Any:
        """Get a project variable."""
        return self.variables_manager.get_value(name, default)
    
    def set_variable(
        self,
        name: str,
        value: Any,
        description: str = ""
    ) -> bool:
        """Set a project variable."""
        return self.variables_manager.set_variable(name, value, description=description)
    
    def get_timeline(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get timeline events."""
        return self.timeline_generator.get_timeline(limit)

