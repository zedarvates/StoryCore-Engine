"""
JSON schema definitions for StoryCore-Engine data contracts.
Based on DOCUMENT 51 - DATA CONTRACT SPECIFICATION.
"""

# Project.json schema - Unified Project Object (UPO)
PROJECT_SCHEMA = {
    "type": "object",
    "required": [
        "schema_version",
        "project_id", 
        "created_at",
        "updated_at",
        "config",
        "coherence_anchors",
        "shots_index",
        "asset_manifest",
        "status"
    ],
    "properties": {
        "schema_version": {"type": "string"},
        "project_id": {"type": "string"},
        "created_at": {"type": "string"},
        "updated_at": {"type": "string"},
        "config": {
            "type": "object",
            "required": [
                "hackathon_mode",
                "global_seed",
                "target_aspect_ratio",
                "target_resolution", 
                "target_duration_seconds"
            ],
            "properties": {
                "hackathon_mode": {"type": "boolean"},
                "global_seed": {"type": "integer"},
                "target_aspect_ratio": {"type": "string"},
                "target_resolution": {"type": "string"},
                "target_duration_seconds": {"type": "integer"},
                "time_budget_seconds": {"type": "integer"}
            }
        },
        "coherence_anchors": {
            "type": "object",
            "required": [
                "style_anchor_id",
                "palette_id",
                "character_sheet_ids",
                "lighting_direction",
                "lighting_temperature",
                "perspective_type",
                "horizon_line"
            ],
            "properties": {
                "style_anchor_id": {"type": "string"},
                "palette_id": {"type": "string"},
                "character_sheet_ids": {"type": "array", "items": {"type": "string"}},
                "lighting_direction": {"type": "string"},
                "lighting_temperature": {"type": "string"},
                "perspective_type": {"type": "string"},
                "horizon_line": {"type": "string"}
            }
        },
        "shots_index": {"type": "object"},
        "asset_manifest": {
            "type": "object",
            "properties": {
                "grid": {
                    "type": "object",
                    "properties": {
                        "asset_id": {"type": "string"},
                        "path": {"type": "string"},
                        "type": {"type": "string"},
                        "dimensions": {"type": "string"},
                        "created_at": {"type": "string"}
                    }
                },
                "panels": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "asset_id": {"type": "string"},
                            "path": {"type": "string"},
                            "panel_index": {"type": "integer"}
                        }
                    }
                },
                "promoted_panels": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "asset_id": {"type": "string"},
                            "path": {"type": "string"},
                            "original_panel": {"type": "string"},
                            "original_resolution": {"type": "string"},
                            "promoted_resolution": {"type": "string"}
                        }
                    }
                },
                "promotion_metadata": {
                    "type": "object",
                    "properties": {
                        "scale_factor": {"type": "integer"},
                        "method": {"type": "string"},
                        "created_at": {"type": "string"},
                        "total_panels": {"type": "integer"}
                    }
                },
                "refined_panels": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "asset_id": {"type": "string"},
                            "path": {"type": "string"},
                            "original_source": {"type": "string"},
                            "resolution": {"type": "string"}
                        }
                    }
                },
                "refinement_metadata": {
                    "type": "object",
                    "properties": {
                        "input": {"type": "string"},
                        "mode": {"type": "string"},
                        "strength": {"type": "number"},
                        "created_at": {"type": "string"},
                        "total_panels": {"type": "integer"}
                    }
                },
                "refinement_metrics": {
                    "type": "object",
                    "properties": {
                        "panel_metrics": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "panel": {"type": "string"},
                                    "sharpness_before": {"type": "number"},
                                    "sharpness_after": {"type": "number"},
                                    "improvement_percent": {"type": "number"}
                                }
                            }
                        },
                        "summary": {
                            "type": "object",
                            "properties": {
                                "min_improvement_percent": {"type": "number"},
                                "mean_improvement_percent": {"type": "number"},
                                "max_improvement_percent": {"type": "number"},
                                "computed_at": {"type": "string"}
                            }
                        }
                    }
                },
                "comparison_assets": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "asset_id": {"type": "string"},
                            "path": {"type": "string"},
                            "type": {"type": "string"},
                            "mode": {"type": "string"},
                            "panel": {"type": "string"},
                            "panels": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        }
                    }
                },
                "comparison_metadata": {
                    "type": "object",
                    "properties": {
                        "created_at": {"type": "string"},
                        "total_comparisons": {"type": "integer"}
                    }
                },
                "panel_to_shot_map": {"type": "object"}
            }
        },
        "status": {
            "type": "object",
            "required": ["current_phase", "qa_passed"],
            "properties": {
                "current_phase": {"type": "string"},
                "qa_passed": {"type": "boolean"},
                "last_qa_report_id": {"type": ["string", "null"]}
            }
        }
    }
}

# Storyboard.json schema
STORYBOARD_SCHEMA = {
    "type": "object",
    "required": ["storyboard_id", "project_id", "shots"],
    "properties": {
        "storyboard_id": {"type": "string"},
        "project_id": {"type": "string"},
        "shots": {
            "type": "array",
            "items": {
                "type": "object",
                "required": [
                    "shot_id",
                    "scene_id", 
                    "shot_number",
                    "version",
                    "title",
                    "description",
                    "duration_seconds",
                    "prompt_modules"
                ],
                "properties": {
                    "shot_id": {"type": "string"},
                    "scene_id": {"type": "string"},
                    "shot_number": {"type": "integer"},
                    "version": {"type": "string"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "duration_seconds": {"type": "number"},
                    "prompt_modules": {
                        "type": "object",
                        "required": ["subject", "camera", "lighting", "color", "style", "technical"],
                        "properties": {
                            "subject": {"type": "string"},
                            "camera": {"type": "string"},
                            "lighting": {"type": "string"},
                            "color": {"type": "string"},
                            "style": {"type": "string"},
                            "technical": {"type": "object"}
                        }
                    }
                }
            }
        }
    }
}

# QA Report schema stub
QA_REPORT_SCHEMA = {
    "type": "object",
    "required": ["qa_report_id", "project_id", "timestamp", "overall_score", "passed"],
    "properties": {
        "qa_report_id": {"type": "string"},
        "project_id": {"type": "string"},
        "timestamp": {"type": "string"},
        "overall_score": {"type": "number"},
        "passed": {"type": "boolean"},
        "issues": {"type": "array"}
    }
}
