#!/usr/bin/env python3
"""
Training result handler for Qwen TTS operations.

This module provides classes for handling training/fine-tuning output from
Qwen TTS workflow executions.
"""

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


@dataclass
class TrainingResult:
    """
    Result of a TTS model training operation.
    
    This class encapsulates the output from Qwen TTS training workflows,
    providing information about the training process and checkpoints.
    
    Attributes:
        success: Whether the training was successful
        checkpoint_path: Path to the final model checkpoint
        output_dir: Directory where checkpoints are saved
        speaker_name: Name of the trained speaker
        num_epochs: Number of epochs trained
        final_loss: Final training loss
        training_time: Total training time in seconds
        checkpoints: List of checkpoint paths created
        metadata: Additional training metadata
        error_message: Error message if training failed
        created_at: Timestamp when the result was created
    """
    success: bool = True
    checkpoint_path: Optional[str] = None
    output_dir: Optional[str] = None
    speaker_name: str = ""
    num_epochs: int = 0
    final_loss: Optional[float] = None
    training_time: float = 0.0
    checkpoints: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    @classmethod
    def from_comfyui_output(
        cls,
        output: Dict[str, Any],
        output_dir: str = "",
        speaker_name: str = "",
        num_epochs: int = 0
    ) -> "TrainingResult":
        """
        Create a TrainingResult from ComfyUI workflow output.
        
        Args:
            output: ComfyUI workflow output dictionary
            output_dir: Directory where checkpoints are saved
            speaker_name: Name of the trained speaker
            num_epochs: Number of epochs trained
            
        Returns:
            TrainingResult instance
        """
        try:
            # ComfyUI training output format
            # Typically: {"checkpoint_path": "...", "metrics": {...}}
            checkpoint_path = output.get("checkpoint_path", "")
            
            # Find all checkpoints in output directory
            checkpoints = []
            if output_dir and Path(output_dir).exists():
                checkpoints = [
                    str(p) for p in Path(output_dir).glob("checkpoint-*")
                    if p.is_dir()
                ]
                checkpoints.sort()
            
            # Get training metrics if available
            metrics = output.get("metrics", {})
            final_loss = metrics.get("final_loss")
            training_time = metrics.get("training_time", 0.0)
            
            return cls(
                success=True,
                checkpoint_path=checkpoint_path,
                output_dir=output_dir,
                speaker_name=speaker_name,
                num_epochs=num_epochs,
                final_loss=final_loss,
                training_time=training_time,
                checkpoints=checkpoints,
                metadata={"raw_output": output, "metrics": metrics}
            )
        except Exception as e:
            return cls(
                success=False,
                error_message=str(e),
                output_dir=output_dir,
                speaker_name=speaker_name
            )
    
    def get_latest_checkpoint(self) -> Optional[str]:
        """
        Get the path to the latest checkpoint.
        
        Returns:
            Path to the latest checkpoint or None
        """
        if self.checkpoint_path:
            return self.checkpoint_path
        if self.checkpoints:
            return self.checkpoints[-1]
        return None
    
    def get_checkpoint_epoch(self, checkpoint_path: str) -> Optional[int]:
        """
        Extract epoch number from checkpoint path.
        
        Args:
            checkpoint_path: Path to checkpoint directory
            
        Returns:
            Epoch number or None
        """
        try:
            # Checkpoint format: checkpoint-epoch-N
            path = Path(checkpoint_path)
            name = path.name
            if "epoch-" in name:
                return int(name.split("epoch-")[-1].split("-")[0])
            elif name.startswith("checkpoint-"):
                return int(name.split("-")[1])
        except (ValueError, IndexError):
            pass
        return None
    
    def get_best_checkpoint(self) -> Optional[str]:
        """
        Get the checkpoint with the best (lowest) loss.
        
        Returns:
            Path to the best checkpoint or None
        """
        # If we have loss information in metadata, use it
        # Otherwise, return the latest checkpoint
        return self.get_latest_checkpoint()
    
    def get_info(self) -> Dict[str, Any]:
        """
        Get information about the training result.
        
        Returns:
            Dictionary with training information
        """
        return {
            "success": self.success,
            "checkpoint_path": self.checkpoint_path,
            "output_dir": self.output_dir,
            "speaker_name": self.speaker_name,
            "num_epochs": self.num_epochs,
            "final_loss": self.final_loss,
            "training_time": self.training_time,
            "training_time_formatted": self._format_time(self.training_time),
            "num_checkpoints": len(self.checkpoints),
            "checkpoints": self.checkpoints,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    @staticmethod
    def _format_time(seconds: float) -> str:
        """Format seconds into human-readable string."""
        if seconds < 60:
            return f"{seconds:.1f}s"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f}m"
        else:
            hours = seconds / 3600
            return f"{hours:.1f}h"
    
    def __repr__(self) -> str:
        """String representation."""
        status = "success" if self.success else "failed"
        epochs = f"{self.num_epochs} epochs" if self.num_epochs else "unknown epochs"
        return f"TrainingResult({status}, {epochs}, speaker='{self.speaker_name}')"


@dataclass
class TrainingRequest:
    """
    Request for model training.
    
    Attributes:
        audio_folder: Path to audio dataset folder
        output_dir: Directory to save checkpoints
        speaker_name: Name for the new speaker
        language: Language of the training data
        model_size: Model size (0.6B or 1.7B)
        num_epochs: Number of training epochs
        learning_rate: Learning rate
        batch_size: Batch size
        gradient_accumulation_steps: Gradient accumulation steps
        validate_every: Validation frequency
    """
    audio_folder: str
    output_dir: str
    speaker_name: str
    language: str = "English"
    model_size: str = "1.7B"
    num_epochs: int = 10
    learning_rate: float = 0.00002
    batch_size: int = 1
    gradient_accumulation_steps: int = 4
    validate_every: int = 2
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "audio_folder": self.audio_folder,
            "output_dir": self.output_dir,
            "speaker_name": self.speaker_name,
            "language": self.language,
            "model_size": self.model_size,
            "num_epochs": self.num_epochs,
            "learning_rate": self.learning_rate,
            "batch_size": self.batch_size,
            "gradient_accumulation_steps": self.gradient_accumulation_steps,
            "validate_every": self.validate_every,
        }
    
    def validate(self) -> List[str]:
        """
        Validate the training request.
        
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        if not self.audio_folder:
            errors.append("audio_folder is required")
        elif not Path(self.audio_folder).exists():
            errors.append(f"audio_folder does not exist: {self.audio_folder}")
        
        if not self.output_dir:
            errors.append("output_dir is required")
        
        if not self.speaker_name:
            errors.append("speaker_name is required")
        
        if self.num_epochs < 1:
            errors.append("num_epochs must be at least 1")
        
        if self.learning_rate <= 0:
            errors.append("learning_rate must be positive")
        
        if self.batch_size < 1:
            errors.append("batch_size must be at least 1")
        
        return errors
