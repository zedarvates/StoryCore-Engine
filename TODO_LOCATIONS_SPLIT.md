# TODO: Split Locations into Separate Files

## Phase 1: Python End-to-End (`src/end_to_end/`) - COMPLETED
- [x] 1.1 Update `Location` dataclass in `data_models.py` to add `significance` and `atmosphere` fields
- [x] 1.2 Modify `ProjectStructureBuilder` to create `locations/` directory
- [x] 1.3 Save each location as separate JSON file `{location_id}.json`
- [x] 1.4 Update `world_config.json` to have location references instead of full data
- [x] 1.5 Add methods to load locations from separate files

## Phase 2: Backend API (`backend/`) - COMPLETED
- [x] 2.1 Ensure location_api.py is consistent with new Location fields
- [x] 2.2 Use 'locations' directory exclusively (unified from French "lieux")

## Phase 3: Dashboard Integration - COMPLETED
- [x] 3.1 Backend API now supports loading from `/api/locations/project/{project_id}`

## Phase 4: Testing - READY
- Run project creation to verify locations are saved as separate files

## Files Edited:
1. `src/end_to_end/data_models.py` - Added fields to Location dataclass
2. `src/end_to_end/project_structure_builder.py` - Split locations into files
3. `backend/location_api.py` - Added significance and atmosphere fields

## New Project Structure:
```
project/
├── world_config.json (references locations)
├── locations/
│   ├── {location_id_1}.json
│   ├── {location_id_2}.json
│   └── ...
├── characters.json
├── story_structure.json
├── sequence_plan.json
├── music_description.json
└── ...
```


