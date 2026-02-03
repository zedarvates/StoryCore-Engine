"""
Scientific Fact-Checking & Multimedia Anti-Fake System

A modular add-on for StoryCore-Engine that provides automated verification
capabilities for text content and video transcripts.
"""

__version__ = "1.0.0"

# Import core models
from .models import (
    Claim,
    Evidence,
    VerificationResult,
    ManipulationSignal,
    Report,
    Configuration,
    DomainType,
    RiskLevel,
    SourceType,
    ManipulationType,
    SeverityLevel
)

# Import API functions
from .fact_extraction import (
    extract_claims,
    extract_claim_boundaries,
    merge_overlapping_claims
)

from .domain_routing import (
    classify_domain,
    classify_domains_batch,
    get_domain_confidence,
    get_supported_domains,
    validate_domain
)

from .trusted_sources import (
    Source,
    get_trusted_sources,
    get_all_trusted_sources,
    get_source_by_url,
    is_source_trusted,
    get_source_credibility,
    add_custom_source,
    get_sources_by_type,
    get_source_statistics
)

from .evidence_retrieval import (
    retrieve_evidence,
    retrieve_evidence_batch,
    calculate_relevance_score,
    extract_relevant_excerpt,
    filter_evidence_by_credibility,
    filter_evidence_by_relevance,
    rank_evidence
)

from .fact_checking import (
    verify_claim,
    verify_claims_batch,
    calculate_overall_confidence,
    count_high_risk_claims,
    filter_by_risk_level,
    get_verification_summary
)

from .report_generation import (
    generate_report,
    export_report_json,
    export_report_markdown,
    export_report_pdf,
    save_report_to_file
)

# Import agents
from .scientific_audit_agent import (
    ScientificAuditAgent,
    create_agent as create_scientific_audit_agent
)

from .antifake_video_agent import (
    AntiFakeVideoAgent,
    create_agent as create_antifake_video_agent
)

# Import command interface
from .fact_checker_command import (
    FactCheckerCommand,
    create_command
)

# Import validation
from .validation import (
    ValidationError as InputValidationError,
    ValidationResult,
    validate_claim,
    validate_evidence,
    validate_scientific_audit_input,
    validate_antifake_video_input,
    validate_fact_checker_command,
    validate_configuration
)

# Import error handling
from .error_handling import (
    ErrorCategory,
    FactCheckerError,
    ValidationError as ErrorHandlingValidationError,
    ProcessingError,
    ConfigurationError,
    SafetyConstraintViolation,
    TimeoutError as FactCheckerTimeoutError,
    ResourceError,
    NetworkError,
    RetryConfig,
    with_retry,
    CircuitBreaker,
    handle_error,
    graceful_degradation,
    ErrorLogger
)

# Import safety constraints
from .safety_constraints import (
    apply_safety_constraints,
    apply_uncertainty_handling,
    check_content_safety,
    check_uncertainty_compliance,
    get_safety_report,
    add_uncertainty_language
)

# Import caching
from .caching import (
    FactCheckerCache,
    CacheEntry,
    get_cache,
    reset_cache
)

# Import batch processing
from .batch_processing import (
    BatchProcessor,
    BatchItem,
    BatchProgress,
    BatchResult,
    BatchItemStatus,
    create_batch_processor
)

# Import rate limiting
from .rate_limiting import (
    RateLimiter,
    RateLimitConfig,
    RateLimitStatus,
    RateLimitError,
    ClientRateLimiter,
    get_rate_limiter,
    reset_rate_limiter,
    create_429_response
)

__all__ = [
    # Models
    'Claim',
    'Evidence',
    'VerificationResult',
    'ManipulationSignal',
    'Report',
    'Configuration',
    'DomainType',
    'RiskLevel',
    'SourceType',
    'ManipulationType',
    'SeverityLevel',
    # Fact Extraction
    'extract_claims',
    'extract_claim_boundaries',
    'merge_overlapping_claims',
    # Domain Routing
    'classify_domain',
    'classify_domains_batch',
    'get_domain_confidence',
    'get_supported_domains',
    'validate_domain',
    # Trusted Sources
    'Source',
    'get_trusted_sources',
    'get_all_trusted_sources',
    'get_source_by_url',
    'is_source_trusted',
    'get_source_credibility',
    'add_custom_source',
    'get_sources_by_type',
    'get_source_statistics',
    # Evidence Retrieval
    'retrieve_evidence',
    'retrieve_evidence_batch',
    'calculate_relevance_score',
    'extract_relevant_excerpt',
    'filter_evidence_by_credibility',
    'filter_evidence_by_relevance',
    'rank_evidence',
    # Fact Checking
    'verify_claim',
    'verify_claims_batch',
    'calculate_overall_confidence',
    'count_high_risk_claims',
    'filter_by_risk_level',
    'get_verification_summary',
    # Report Generation
    'generate_report',
    'export_report_json',
    'export_report_markdown',
    'export_report_pdf',
    'save_report_to_file',
    # Agents
    'ScientificAuditAgent',
    'create_scientific_audit_agent',
    'AntiFakeVideoAgent',
    'create_antifake_video_agent',
    # Command Interface
    'FactCheckerCommand',
    'create_command',
    # Validation
    'InputValidationError',
    'ValidationResult',
    'validate_claim',
    'validate_evidence',
    'validate_scientific_audit_input',
    'validate_antifake_video_input',
    'validate_fact_checker_command',
    'validate_configuration',
    # Error Handling
    'ErrorCategory',
    'FactCheckerError',
    'ErrorHandlingValidationError',
    'ProcessingError',
    'ConfigurationError',
    'SafetyConstraintViolation',
    'FactCheckerTimeoutError',
    'ResourceError',
    'NetworkError',
    'RetryConfig',
    'with_retry',
    'CircuitBreaker',
    'handle_error',
    'graceful_degradation',
    'ErrorLogger',
    # Safety Constraints
    'apply_safety_constraints',
    'apply_uncertainty_handling',
    'check_content_safety',
    'check_uncertainty_compliance',
    'get_safety_report',
    'add_uncertainty_language',
    # Caching
    'FactCheckerCache',
    'CacheEntry',
    'get_cache',
    'reset_cache',
    # Batch Processing
    'BatchProcessor',
    'BatchItem',
    'BatchProgress',
    'BatchResult',
    'BatchItemStatus',
    'create_batch_processor',
    # Rate Limiting
    'RateLimiter',
    'RateLimitConfig',
    'RateLimitStatus',
    'RateLimitError',
    'ClientRateLimiter',
    'get_rate_limiter',
    'reset_rate_limiter',
    'create_429_response',
]
