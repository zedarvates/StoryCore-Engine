# TODO: StoryCore LLM Assistant Improvement Implementation

## Phase 1: Foundation (Week 1)
### 1.1 Enhanced Project Structure
- [ ] Create `src/assistant/project_structure_manager.py`
  - Implement hierarchical folder generation (01_elements/, 02_shots/, etc.)
  - Add file naming conventions (XXnumber_name format)
  - Create asset directory management
  
- [ ] Update `src/assistant/models.py`
  - Add EnhancedShotSpec model
  - Add Segment model
  - Add AssetMetadata model
  - Add TechnicalSpecs model

### 1.2 Detailed Shot Specification System
- [ ] Create `src/assistant/enhanced_shot_spec.py`
  - Implement ShotSpec class with all fields
  - Add validation logic
  - Add serialization/deserialization
  
- [ ] Create `src/assistant/scene_breakdown_engine.py`
  - Implement detailed scene analysis
  - Add timecode handling
  - Generate shot breakdowns from prompts

### 1.3 Asset Management System
- [ ] Create `src/assistant/asset_registry.py`
  - Track all visual assets with metadata
  - Implement asset versioning
  - Add asset relationship tracking
  
- [ ] Create `src/assistant/asset_generator.py`
  - Generate assets with embedded metadata
  - Handle reference image linking

---

## Phase 2: Workflow (Week 2)
### 2.1 Segmented Production Workflow
- [ ] Create `src/assistant/workflow_state_manager.py`
  - Track workflow phases
  - Manage state transitions
  - Implement checkpoint validation
  
- [ ] Create `src/assistant/segment_producer.py`
  - Produce videos segment by segment
  - Handle segment dependencies
  - Track segment status

### 2.2 Checkpoint/Validation System
- [ ] Create `src/assistant/checkpoint_validator.py`
  - Validate before phase transitions
  - Check asset completeness
  - Verify quality gates

### 2.3 User Interaction Improvements
- [ ] Create `src/assistant/confirmation_workflow.py`
  - Implement confirmation points
  - Handle user feedback integration
  - Manage approval workflows
  
- [ ] Update `src/assistant/prompt_parser.py`
  - Parse technical specifications from prompts
  - Extract model preferences
  - Handle language preferences

---

## Phase 3: Intelligence (Week 3)
### 3.1 Strategic Model Selection
- [ ] Create `src/assistant/model_capability_registry.py`
  - Database of model capabilities
  - Performance characteristics
  - Best use cases per model
  
- [ ] Create `src/assistant/model_selector.py`
  - Select optimal model per scene type
  - Handle fallback strategies
  - Consider technical constraints

### 3.2 Technical Specifications Manager
- [ ] Create `src/assistant/technical_specs_manager.py`
  - Store per-project technical specs
  - Manage prompt templates
  - Handle default specifications

### 3.3 Regeneration Handling
- [ ] Create `src/assistant/feedback_processor.py`
  - Process user corrections
  - Identify regeneration targets
  - Apply modifications intelligently
  
- [ ] Create `src/assistant/regeneration_manager.py`
  - Smart regeneration with context
  - Preserve consistency
  - Minimize unnecessary regeneration

---

## Phase 4: Polish (Week 4)
### 4.1 Detailed Storyboard Generation
- [ ] Create `src/assistant/storyboard_generator.py`
  - Generate detailed storyboards
  - Include technical specifications
  - Handle multiple formats
  
- [ ] Create `src/assistant/segment_builder.py`
  - Build segments from analysis
  - Handle segment transitions
  - Manage segment dependencies

### 4.2 Timecode Management
- [ ] Create `src/assistant/timecode_manager.py`
  - Parse/format timecodes
  - Handle multiple timecode formats
  - Calculate durations

### 4.3 Integration & Testing
- [ ] Update `src/assistant/storycore_assistant.py`
  - Integrate new workflows
  - Update main interface
  - Handle backward compatibility
  
- [ ] Update `creative-studio-ui/src/components/wizard/world-builder/LLMAssistant.tsx`
  - Enhanced UI for new features
  - Better feedback display
  - Improved interaction patterns

---

## Implementation Order (Start Here)

### Step 1: Create TODO.md
- [x] This file created

### Step 2: Core Models (src/assistant/models.py)
- [ ] Add EnhancedShotSpec class
- [ ] Add Segment class
- [ ] Add AssetMetadata class
- [ ] Add TechnicalSpecs class
- [ ] Update imports

### Step 3: Project Structure Manager
- [ ] Create project_structure_manager.py
- [ ] Test folder generation
- [ ] Test file naming

### Step 4: Asset Registry
- [ ] Create asset_registry.py
- [ ] Create asset_generator.py
- [ ] Test asset tracking

### Step 5: Shot Specification System
- [ ] Create enhanced_shot_spec.py
- [ ] Create scene_breakdown_engine.py
- [ ] Test shot generation

### Step 6: Workflow Manager
- [ ] Create workflow_state_manager.py
- [ ] Create segment_producer.py
- [ ] Test phase transitions

### Step 7: Model Selection
- [ ] Create model_capability_registry.py
- [ ] Create model_selector.py
- [ ] Test model selection logic

### Step 8: Integration
- [ ] Update storycore_assistant.py
- [ ] Update LLMAssistant.tsx
- [ ] End-to-end testing

---

## Notes

- Each task should include unit tests
- All new modules should have proper docstrings
- Follow existing code style (black, isort)
- Update this TODO as implementation progresses

