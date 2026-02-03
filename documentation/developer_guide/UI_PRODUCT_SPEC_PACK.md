# StoryCore-Engine UI + Product Spec Pack v1.0

## Executive Summary

StoryCore-Engine is a coherence-first, measurable multimodal pipeline for cinematic storyboarding that transforms simple prompts into production-ready visual narratives. The system integrates PromotionEngine (grid slicing + upscaling), QA metrics (Laplacian variance), AutofixEngine (self-correcting quality loop), and an intelligent Dashboard for review and control.

**90-Second Demo Walkthrough:**
1. User creates project → System generates 3x3 master grid (coherence anchor)
2. PromotionEngine slices grid → promotes to 16:9 cinematic panels → applies QA validation
3. AutofixEngine detects quality issues → automatically adjusts parameters → re-processes
4. Dashboard displays results with QA badges, before/after comparisons, and repromote controls
5. User reviews, approves, or requests targeted refinements → Export complete package

---

## 1. CANONICAL TERMINOLOGY MAP

| Old Term(s) | Canonical Term | JSON Field Name | UI Display |
|-------------|----------------|-----------------|------------|
| Plan-sequence, Scene | Shot | `shot_id` | Shot |
| Puppet, Character | Entity | `entity_id` | Character |
| Master Grid, Coherence Grid | Grid Anchor | `grid_anchor_path` | Master Grid |
| Promotion, Upscaling | Panel Promotion | `promotion_metadata` | Promoted |
| Refinement, Enhancement | Panel Refinement | `refinement_metadata` | Refined |
| QA Check, Validation | Quality Assessment | `qa_report` | QA Score |
| Autofix, Self-Correction | Quality Recovery | `autofix_logs` | Auto-Fixed |
| Layer 1 (Puppet) | Pose Layer | `pose_conditioning` | Pose |
| Layer 3 (Camera) | Camera Layer | `camera_conditioning` | Camera |
| Layer 4 (Lighting) | Lighting Layer | `lighting_conditioning` | Lighting |
| Layer 8 (Annotations) | Metadata Layer | `annotation_metadata` | Notes |
| Storyboard Panel | Keyframe | `keyframe_assets` | Panel |
| ComfyUI Workflow | Generation Pipeline | `generation_metadata` | Pipeline |

---

## 2. UNIFIED USER JOURNEY (UI Flow)

### Phase 1: Project Initialization
```
[Create Project] → [Auto-Generate Story] → [Generate Master Grid]
     ↓
[Grid Anchor Created] → [Visual Coherence Established]
```

### Phase 2: Panel Processing Pipeline
```
[Master Grid] → [Slice to Panels] → [Center-Fill Crop 16:9] → [Upscale 2x]
     ↓
[Initial QA Check] → [Laplacian Variance Analysis]
     ↓
[Quality Decision Point]
     ├─ PASS → [Save Promoted Panel]
     └─ FAIL → [AutofixEngine] → [Adjust Parameters] → [Re-process] → [Final QA]
```

### Phase 3: Dashboard Review & Control
```
[Dashboard View] → [Grid Overview] → [Panel Details]
     ↓
[QA Badges] → [Before/After Comparison] → [Autofix Tooltips]
     ↓
[User Actions]
     ├─ Approve → [Export Package]
     ├─ Repromote → [Manual Parameter Adjustment]
     └─ Regenerate → [New Seed + Re-process]
```

### Phase 4: Export & Delivery
```
[Export Command] → [Package Assembly] → [ZIP Archive]
     ↓
[Complete Package]: Project Files + QA Reports + Demo Assets + Video Plan
```

---

## 3. DATA CONTRACT ALIGNMENT (Minimum Viable Schema)

### Core Project Schema
```json
{
  "schema_version": "1.0",
  "project_id": "storycore_project_001",
  "created_at": "2026-01-08T15:25:00Z",
  "updated_at": "2026-01-08T15:25:00Z",
  
  "capabilities": {
    "grid": true,
    "promote": true,
    "refine": true,
    "compare": true,
    "qa": true,
    "export": true,
    "dashboard": true,
    "narrative": true,
    "video_plan": true,
    "auto_fix": true
  },
  
  "generation_status": {
    "grid": "done",
    "promote": "done", 
    "refine": "done",
    "compare": "done",
    "qa": "passed",
    "export": "pending",
    "dashboard": "done",
    "narrative": "done",
    "video_plan": "done"
  },
  
  "coherence_anchors": {
    "style_anchor_id": "STYLE_CINE_REALISM_V1",
    "palette_id": "PALETTE_SUNSET_01",
    "grid_anchor_path": "assets/images/master_grid_3x3.png",
    "global_seed": 42
  },
  
  "asset_manifest": {
    "grid_metadata": {
      "specification": "3x3",
      "cell_size": 256,
      "total_panels": 9
    },
    "promotion_metadata": {
      "total_panels": 9,
      "upscale_factor": 2,
      "target_aspect_ratio": 1.778,
      "processing_completed": true
    },
    "refinement_metadata": {
      "total_panels": 9,
      "enhancement_mode": "unsharp",
      "panel_metrics": [
        {
          "panel": "panel_01",
          "sharpness_before": 89.2,
          "sharpness_after": 156.7,
          "improvement_percent": 75.6
        }
      ]
    },
    "qa_metadata": {
      "overall_score": 4.2,
      "passed": true,
      "categories": {
        "data_contract_compliance": 5.0,
        "schema_validation": 5.0,
        "coherence_consistency": 4.5,
        "shot_structure": 4.0,
        "file_structure": 5.0
      }
    },
    "autofix_metadata": {
      "autofix_enabled": true,
      "panels_processed": 3,
      "success_rate": 85.7,
      "autofix_logs": [
        {
          "panel_id": "panel_01",
          "initial_sharpness": 45.2,
          "final_sharpness": 67.8,
          "improvement_delta": 22.6,
          "final_status": "IMPROVED",
          "applied_adjustments": {
            "denoising_strength": -0.05,
            "sharpen_amount": 0.15
          }
        }
      ]
    },
    "video_plan_metadata": {
      "video_plan_generated": true,
      "total_shots": 9,
      "total_duration": 27.0,
      "camera_movements": {
        "static": 6,
        "pan": 2,
        "zoom": 1
      }
    }
  }
}
```

### Storyboard Layer Integration
```json
{
  "storyboard": {
    "shots": [
      {
        "shot_id": "shot_01",
        "layers": {
          "pose_conditioning": {
            "layer_id": 1,
            "puppet_data": "P1_standing_forward",
            "joint_positions": [[100, 200], [120, 180]],
            "orientation": "forward"
          },
          "camera_conditioning": {
            "layer_id": 3,
            "horizon_line": 150,
            "vanishing_points": [[400, 150], [800, 150]],
            "camera_height": "eye_level",
            "shot_type": "medium_shot"
          },
          "lighting_conditioning": {
            "layer_id": 4,
            "primary_direction": "top_right",
            "shadow_direction": "bottom_left",
            "temperature": "warm",
            "intensity": 0.8
          },
          "annotation_metadata": {
            "layer_id": 8,
            "shot_number": 1,
            "character_names": ["protagonist"],
            "action_notes": "character enters frame",
            "emotional_cue": "determined"
          }
        }
      }
    ]
  }
}
```

---

## 4. UI REQUIREMENTS (MVP) — Minimal but Intelligent Dashboard

### Core Dashboard Components

#### 4.1 Grid Overview Panel
- **Master Grid Display**: 3x3 grid with panel thumbnails
- **Status Indicators**: Color-coded badges (Processing/Done/Failed/Auto-Fixed)
- **QA Score Badge**: Overall project score with color coding
- **Video Ready Badge**: Shows when video_plan.json exists

#### 4.2 Panel Detail View
- **Before/After Comparison**: Hover or slider to compare promoted vs refined
- **QA Metrics Display**: Sharpness score, quality tier, aspect ratio
- **Autofix Tooltip**: Shows applied corrections and improvement delta
- **Processing History**: Timeline of operations performed on panel

#### 4.3 Control Surface
- **Repromote Panel**: Button to re-process individual panel with parameter adjustment
- **Batch Operations**: Select multiple panels for bulk processing
- **Parameter Override**: Sliders for denoising_strength, sharpen_amount
- **Seed Control**: Input field for deterministic regeneration

#### 4.4 QA Dashboard
- **Category Breakdown**: Visual breakdown of QA scores by category
- **Issue List**: Expandable list of detected issues with suggested fixes
- **Autofix Summary**: Success rate, panels processed, improvement statistics
- **Export Readiness**: Clear indication of project completion status

### UI Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Project Name | QA Score Badge | Video Ready Badge   │
├─────────────────────────────────────────────────────────────┤
│ Grid Overview (3x3)          │ Panel Detail View           │
│ [P1] [P2] [P3]               │ ┌─────────────────────────┐ │
│ [P4] [P5] [P6]               │ │ Before/After Slider     │ │
│ [P7] [P8] [P9]               │ │ QA: 156.7 (Good)       │ │
│                              │ │ Auto-Fixed: +22.6      │ │
│ QA Categories:               │ └─────────────────────────┘ │
│ ✓ Data Contract: 5.0         │ Controls:                   │
│ ✓ Schema: 5.0                │ [Repromote] [Regenerate]    │
│ ✓ Coherence: 4.5             │ Denoising: [0.35] ±0.05    │
│ ⚠ Shot Structure: 4.0        │ Sharpen: [1.0] ±0.15       │
│ ✓ File Structure: 5.0        │ Seed: [42] [Random]        │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. COMFYUI INTEGRATION SURFACE (Payload Schema)

### Layer-to-Conditioning Mapping

#### 5.1 Pose Layer (Layer 1) → OpenPose ControlNet
```json
{
  "controlnet_pose": {
    "model": "control_openpose",
    "conditioning_scale": 1.0,
    "input_data": {
      "puppet_skeleton": "P1_standing_forward",
      "joint_coordinates": [[100, 200], [120, 180], [140, 160]],
      "orientation_vector": [0, 1],
      "pose_confidence": 0.95
    }
  }
}
```

#### 5.2 Camera Layer (Layer 3) → Depth/Lineart ControlNet
```json
{
  "controlnet_depth": {
    "model": "control_depth",
    "conditioning_scale": 0.8,
    "input_data": {
      "horizon_line": 150,
      "vanishing_points": [[400, 150], [800, 150]],
      "perspective_type": "2_point",
      "camera_height": "eye_level"
    }
  },
  "controlnet_lineart": {
    "model": "control_lineart",
    "conditioning_scale": 0.6,
    "input_data": {
      "framing_guides": true,
      "perspective_grid": true,
      "composition_guides": false
    }
  }
}
```

#### 5.3 Lighting Layer (Layer 4) → IP-Adapter
```json
{
  "ip_adapter_lighting": {
    "model": "ip_adapter_plus",
    "conditioning_scale": 0.7,
    "input_data": {
      "lighting_reference": "warm_golden_hour",
      "primary_direction": "top_right",
      "shadow_direction": "bottom_left",
      "temperature_kelvin": 3200,
      "intensity_multiplier": 0.8
    }
  }
}
```

#### 5.4 Complete ComfyUI Workflow Payload
```json
{
  "workflow_id": "storycore_panel_generation_v1",
  "base_model": "sdxl_cinematic_v1.safetensors",
  "prompt": "{global_style_anchor}, {shot_description}, {character_description}, highly detailed, cinematic lighting, 8k resolution",
  "negative_prompt": "low quality, blurry, distorted, extra limbs, face drift, lighting inconsistencies, perspective errors",
  "sampling": {
    "sampler": "dpmpp_2m_karras",
    "steps": 25,
    "cfg_scale": 7.5,
    "seed": 42,
    "width": 1024,
    "height": 576
  },
  "controlnets": [
    {
      "type": "openpose",
      "model": "control_openpose_sdxl",
      "conditioning_scale": 1.0,
      "input_image": "pose_layer_data"
    },
    {
      "type": "depth",
      "model": "control_depth_sdxl", 
      "conditioning_scale": 0.8,
      "input_image": "camera_layer_data"
    },
    {
      "type": "lineart",
      "model": "control_lineart_sdxl",
      "conditioning_scale": 0.6,
      "input_image": "camera_guides_data"
    }
  ],
  "ip_adapters": [
    {
      "type": "style_reference",
      "model": "ip_adapter_plus_sdxl",
      "conditioning_scale": 0.7,
      "reference_image": "lighting_reference_data"
    }
  ],
  "post_processing": {
    "upscale": false,
    "face_restore": false,
    "color_grading": true
  }
}
```

---

## 6. COMPATIBILITY FIX LIST

### 6.1 Terminology Inconsistencies
**Issue**: Mixed use of "plan-sequence", "scene", "shot"
**Fix**: Standardize on "shot" throughout all documents and code
**Field Changes**: 
- `plan_sequence_id` → `shot_id`
- `scene_breakdown` → `shot_breakdown`

### 6.2 Layer Numbering Conflicts
**Issue**: Document 25 defines 8 layers, but some references use different numbering
**Fix**: Enforce canonical layer structure:
- Layer 0: Background → `background_layer`
- Layer 1: Puppets → `pose_conditioning`
- Layer 3: Camera → `camera_conditioning`
- Layer 4: Lighting → `lighting_conditioning`
- Layer 8: Annotations → `annotation_metadata`

### 6.3 QA Metrics Alignment
**Issue**: Multiple QA scoring systems referenced
**Fix**: Standardize on Laplacian Variance with defined thresholds:
- `sharpness_score` (float): Laplacian variance value
- `quality_tier` (string): "too_soft" | "acceptable" | "good" | "excellent" | "oversharpen_risk"
- `qa_passed` (boolean): Overall pass/fail status

### 6.4 Seed Determinism
**Issue**: Inconsistent seed handling across modules
**Fix**: Implement hierarchical seed system:
- `global_seed` (int): Project-level seed
- `panel_seed` (int): `global_seed + hash(panel_id) % 1000000`
- `operation_seed` (int): `panel_seed + operation_offset`

### 6.5 Asset Path Standardization
**Issue**: Inconsistent file naming and directory structure
**Fix**: Enforce canonical structure:
```
assets/
├── images/
│   ├── master_grid_3x3.png
│   ├── panels/panel_01.ppm ... panel_09.ppm
│   ├── promoted/panel_01_promoted.png ... panel_09_promoted.png
│   ├── refined/panel_01_refined.png ... panel_09_refined.png
│   └── compare/compare_all.png
├── metadata/
│   ├── qa_report.json
│   ├── autofix_logs.json
│   └── video_plan.json
└── exports/
    └── {project_name}_export_{timestamp}.zip
```

### 6.6 Data Contract Schema Versioning
**Issue**: No clear versioning strategy for schema evolution
**Fix**: Implement semantic versioning:
- `schema_version`: "1.0" (current)
- Backward compatibility through `ProjectManager.ensure_schema_compliance()`
- Migration paths for future versions

### 6.7 UI Component Naming
**Issue**: React components use French terminology
**Fix**: Standardize on English:
- `Plan d'ouverture` → `Opening Shot`
- `Travelling avant` → `Dolly Forward`
- `Plan rapproché` → `Close-up Shot`

### 6.8 ComfyUI Workflow Integration
**Issue**: Layer data not properly mapped to ControlNet inputs
**Fix**: Implement layer-to-conditioning pipeline:
- Pose Layer → OpenPose ControlNet preprocessing
- Camera Layer → Depth/Lineart ControlNet preprocessing  
- Lighting Layer → IP-Adapter reference image generation
- Annotation Layer → Prompt augmentation only

---

## Implementation Priority

### Phase 1 (Immediate - Hackathon MVP)
1. Implement canonical terminology across all modules
2. Deploy enhanced Dashboard with QA badges and autofix tooltips
3. Integrate PromotionEngine + AutofixEngine pipeline
4. Standardize data contract schema v1.0

### Phase 2 (Post-Hackathon)
1. Full ComfyUI workflow integration with layer conditioning
2. Advanced UI controls for parameter adjustment
3. Real-time preview and iteration capabilities
4. Collaborative features and version control

### Phase 3 (Production)
1. External API integrations (cloud processing)
2. Advanced analytics and quality metrics
3. Plugin architecture for custom engines
4. Enterprise deployment and scaling

---

*This specification ensures internal consistency across all StoryCore-Engine components while maintaining hackathon development speed and production-ready architecture.*
