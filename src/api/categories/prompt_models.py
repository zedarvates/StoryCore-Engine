"""
Data models for Prompt Engineering API category.

This module defines all data structures used by prompt engineering endpoints.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class PromptTemplate:
    """Prompt template structure."""
    id: str
    name: str
    description: str
    template: str
    variables: List[str] = field(default_factory=list)
    category: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PromptTestResult:
    """Result of prompt testing."""
    template_id: str
    inputs: Dict[str, Any]
    output: str
    success: bool
    execution_time_ms: float
    token_count: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PromptOptimizationResult:
    """Result of prompt optimization."""
    original_template: str
    optimized_template: str
    improvements: List[str] = field(default_factory=list)
    expected_improvement: Optional[float] = None
    reasoning: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PromptVariables:
    """Extracted prompt variables."""
    template: str
    variables: List[Dict[str, Any]] = field(default_factory=list)  # name, type, description, required
    variable_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PromptChain:
    """Prompt chain structure."""
    id: str
    name: str
    description: str
    steps: List[Dict[str, Any]] = field(default_factory=list)  # template_id, inputs, output_mapping
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PromptChainExecutionResult:
    """Result of prompt chain execution."""
    chain_id: str
    steps_executed: int
    step_results: List[Dict[str, Any]] = field(default_factory=list)
    final_output: Any = None
    success: bool = True
    total_execution_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
