"""
JSON Schema definitions for all data models.

This module provides JSON Schema validators for input validation
and output structure verification.
"""

from typing import Dict, Any

# Claim Schema
CLAIM_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "id": {"type": "string"},
        "text": {"type": "string"},
        "position": {
            "type": "array",
            "items": {"type": "integer"},
            "minItems": 2,
            "maxItems": 2
        },
        "domain": {
            "type": ["string", "null"],
            "enum": ["physics", "biology", "history", "statistics", "general", None]
        },
        "confidence": {
            "type": ["number", "null"],
            "minimum": 0,
            "maximum": 100
        },
        "risk_level": {
            "type": ["string", "null"],
            "enum": ["low", "medium", "high", "critical", None]
        },
        "evidence": {
            "type": "array",
            "items": {"$ref": "#/definitions/evidence"}
        },
        "recommendation": {"type": ["string", "null"]}
    },
    "required": ["id", "text", "position"],
    "additionalProperties": False
}

# Evidence Schema
EVIDENCE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "source": {"type": "string"},
        "source_type": {
            "type": "string",
            "enum": ["academic", "news", "government", "encyclopedia"]
        },
        "credibility_score": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        },
        "relevance": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        },
        "excerpt": {"type": "string"},
        "url": {"type": ["string", "null"]},
        "publication_date": {"type": ["string", "null"]}
    },
    "required": ["source", "source_type", "credibility_score", "relevance", "excerpt"],
    "additionalProperties": False
}

# Verification Result Schema
VERIFICATION_RESULT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "claim": {"$ref": "#/definitions/claim"},
        "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        },
        "risk_level": {
            "type": "string",
            "enum": ["low", "medium", "high", "critical"]
        },
        "supporting_evidence": {
            "type": "array",
            "items": {"$ref": "#/definitions/evidence"}
        },
        "contradicting_evidence": {
            "type": "array",
            "items": {"$ref": "#/definitions/evidence"}
        },
        "reasoning": {"type": "string"},
        "recommendation": {"type": "string"}
    },
    "required": ["claim", "confidence", "risk_level", "supporting_evidence", 
                 "contradicting_evidence", "reasoning", "recommendation"],
    "additionalProperties": False
}

# Manipulation Signal Schema
MANIPULATION_SIGNAL_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "type": {
            "type": "string",
            "enum": ["logical_inconsistency", "emotional_manipulation", "narrative_bias"]
        },
        "severity": {
            "type": "string",
            "enum": ["low", "medium", "high"]
        },
        "timestamp_start": {"type": ["string", "null"]},
        "timestamp_end": {"type": ["string", "null"]},
        "description": {"type": "string"},
        "evidence": {"type": "string"},
        "confidence": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        }
    },
    "required": ["type", "severity", "description", "evidence", "confidence"],
    "additionalProperties": False
}

# Report Schema
REPORT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "metadata": {
            "type": "object",
            "properties": {
                "timestamp": {"type": "string"},
                "version": {"type": "string"},
                "input_hash": {"type": "string"},
                "processing_time_ms": {"type": "number"}
            },
            "required": ["timestamp", "version", "input_hash", "processing_time_ms"]
        },
        "claims": {
            "type": "array",
            "items": {"$ref": "#/definitions/verification_result"}
        },
        "manipulation_signals": {
            "type": "array",
            "items": {"$ref": "#/definitions/manipulation_signal"}
        },
        "summary_statistics": {
            "type": "object",
            "properties": {
                "total_claims": {"type": "integer"},
                "high_risk_count": {"type": "integer"},
                "average_confidence": {"type": "number"},
                "domains_analyzed": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        },
        "human_summary": {"type": "string"},
        "recommendations": {
            "type": "array",
            "items": {"type": "string"}
        },
        "disclaimer": {"type": "string"}
    },
    "required": ["metadata", "claims", "manipulation_signals", "summary_statistics",
                 "human_summary", "recommendations", "disclaimer"],
    "additionalProperties": False
}

# Configuration Schema
CONFIGURATION_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "confidence_threshold": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        },
        "risk_level_mappings": {
            "type": "object",
            "properties": {
                "critical": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2
                },
                "high": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2
                },
                "medium": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2
                },
                "low": {
                    "type": "array",
                    "items": {"type": "number"},
                    "minItems": 2,
                    "maxItems": 2
                }
            }
        },
        "trusted_sources": {
            "type": "object",
            "additionalProperties": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "custom_domains": {
            "type": "array",
            "items": {"type": "string"}
        },
        "cache_enabled": {"type": "boolean"},
        "cache_ttl_seconds": {
            "type": "integer",
            "minimum": 0
        },
        "max_concurrent_verifications": {
            "type": "integer",
            "minimum": 1
        },
        "timeout_seconds": {
            "type": "integer",
            "minimum": 1
        },
        "environments": {
            "type": "object",
            "additionalProperties": {"type": "object"}
        }
    },
    "additionalProperties": False
}

# Scientific Audit Agent Input Schema
SCIENTIFIC_AUDIT_INPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "content": {"type": "string"},
        "domain_hint": {"type": ["string", "null"]},
        "confidence_threshold": {
            "type": ["number", "null"],
            "minimum": 0,
            "maximum": 100
        },
        "trusted_sources": {
            "type": ["array", "null"],
            "items": {"type": "string"}
        }
    },
    "required": ["content"],
    "additionalProperties": False
}

# Anti-Fake Video Agent Input Schema
ANTIFAKE_VIDEO_INPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "transcript": {"type": "string"},
        "timestamps": {
            "type": ["array", "null"],
            "items": {"type": "string"}
        },
        "metadata": {
            "type": ["object", "null"],
            "properties": {
                "source": {"type": ["string", "null"]},
                "duration_seconds": {"type": ["number", "null"]}
            }
        }
    },
    "required": ["transcript"],
    "additionalProperties": False
}

# Fact Checker Command Response Schema
FACT_CHECKER_RESPONSE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "status": {
            "type": "string",
            "enum": ["success", "error"]
        },
        "mode": {
            "type": "string",
            "enum": ["text", "video"]
        },
        "agent": {
            "type": "string",
            "enum": ["scientific_audit", "antifake_video"]
        },
        "report": {"type": "object"},
        "summary": {"type": "string"},
        "processing_time_ms": {"type": "number"},
        "cached": {"type": "boolean"}
    },
    "required": ["status", "mode", "agent", "report", "summary", 
                 "processing_time_ms", "cached"],
    "additionalProperties": False
}

# Alias for configuration schema (used by configuration module)
CONFIG_SCHEMA = CONFIGURATION_SCHEMA

# Complete schema with definitions
COMPLETE_SCHEMA: Dict[str, Any] = {
    "definitions": {
        "claim": CLAIM_SCHEMA,
        "evidence": EVIDENCE_SCHEMA,
        "verification_result": VERIFICATION_RESULT_SCHEMA,
        "manipulation_signal": MANIPULATION_SIGNAL_SCHEMA,
        "report": REPORT_SCHEMA,
        "configuration": CONFIGURATION_SCHEMA
    }
}
