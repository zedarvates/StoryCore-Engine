# TODO: Location Logic Loop Implementation

## Overview
Implementing the "Location Logic Loop" framework (Function → Constraints → Culture → Reputation → Emergent Details) into StoryCore's story creation system.

---

## Phase 1: Backend - Data Models & Types ✅ COMPLETE

### 1.1 Update `backend/story_transformer.py`
- [x] Add `LocationFunction` enum (ECONOMIC, DEFENSIVE, SOCIAL, LOGISTICAL)
- [x] Add `LocationSubFunction` enum (TRADE_HUB, MINING, FORTRESS, etc.)
- [x] Add `ConstraintType` enum (ENVIRONMENTAL, RESOURCE_SCARCITY, EXTERNAL_THREAT)
- [x] Add `ExternalThreatType` enum
- [x] Add `CulturalAdaptationType` enum
- [x] Add `LocationConstraint` dataclass
- [x] Add `LocationCulture` dataclass
- [x] Add `LocationReputation` dataclass
- [x] Add `EmergentDetails` dataclass
- [x] Add `LogicLoopLocation` dataclass with all fields
- [x] Add `generate_logic_loop_location()` function with all helper functions

### 1.2 Example Generated Location
The framework now generates locations like:
```
"Crystal Deep":
- Function: Economic (mining)
- Constraints: Dragons (high), no timber (medium)
- Culture: Guild-based, miners revered
- Reputation: "Glimmering Grave" - rich but deadly
- Emergent Details: Name from crystal mines, "Memorial of the Fallen" landmark
- Story Hooks: Supply line attacks, dragon awakening
```

---

## Phase 2: Backend - LLM Integration ✅ COMPLETE

### 2.1 Update `backend/llm_api.py`
- [x] Add `location_function` prompt template
- [x] Add `location_constraints` prompt template
- [x] Add `location_culture` prompt template
- [x] Add `location_reputation` prompt template
- [x] Add `location_emergent_details` prompt template
- [x] Add `location_story_hooks` prompt template
- [x] Add `location_full_generation` prompt template (complete 5-layer generation)

---

## Phase 3: Backend - Location API Integration (IN PROGRESS)

### 3.1 Update `backend/location_api.py`
- [ ] Add new Pydantic models for Location Logic Loop fields
- [ ] Add `POST /api/locations/generate-logic-loop` endpoint for AI location generation
- [ ] Add `POST /api/locations/{id}/enhance-logic-loop` endpoint for enhancing existing locations
- [ ] Add `GET /api/locations/{id}/logic-loop` endpoint to get full logic loop analysis
- [ ] Add `POST /api/locations/{id}/generate-story-hooks` endpoint for story hook generation

---

## Phase 4: Frontend - TypeScript Types

### 4.1 Update `creative-studio-ui/src/types/world.ts`
- [ ] Add `LocationFunction` type
- [ ] Add `LocationConstraint` interface
- [ ] Add `LocationCulture` interface
- [ ] Add `LocationReputation` interface
- [ ] Add `EmergentDetails` interface
- [ ] Update `Location` interface with all new fields

---

## Phase 5: Frontend - UI Components

### 5.1 Create `creative-studio-ui/src/components/location/logic/`
- [ ] Create `LocationFunctionSelector.tsx`
- [ ] Create `LocationConstraintsEditor.tsx`
- [ ] Create `LocationCultureEditor.tsx`
- [ ] Create `LocationReputationEditor.tsx`
- [ ] Create `LocationEmergentDetails.tsx`

### 5.2 Update `creative-studio-ui/src/components/location/LocationEditor.tsx`
- [ ] Add tabs for each layer of Location Logic Loop
- [ ] Add visualization of how details flow from function to emergent

---

## Examples

### Example 1: Mining City
```
Function: Resource extraction (crystals)
Constraints: Dangerous tunnels, toxic dust
Culture: Mask-makers revered, tunnel-sense valued
Reputation: "Glimmering Grave" - rich but deadly
Emergent Details: Name "Crystal Deep", landmark "Mask Maker's Circle"
```

### Example 2: Coastal Trading Port
```
Function: Trade hub
Constraints: Unpredictable tsunamis
Culture: Buildings on stilts, wave-watcher guild
Reputation: "Reckless gamblers" vs "Resilient survivors"
Emergent Details: Name "Port Vigil", landmark "Tidebreaker Wall"
```

---

## Files Modified

### Backend - COMPLETE
- `backend/story_transformer.py` ✅
- `backend/llm_api.py` ✅

### Backend - IN PROGRESS
- `backend/location_api.py` (adding logic loop endpoints)

### Frontend - PENDING
- `creative-studio-ui/src/types/world.ts`
- `creative-studio-ui/src/components/location/logic/*.tsx`
- `creative-studio-ui/src/components/location/LocationEditor.tsx`

---

## Status: Phase 1-2 Complete - Phase 3 In Progress
## Next Step: Add Location Logic Loop endpoints to location_api.py

