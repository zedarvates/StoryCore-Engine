# TODO: Standardize imports in src/end_to_end to use absolute paths

## Files Updated (16 files):
- [x] prompt_parser.py - Changed `.data_models` and `.llm_client` to absolute
- [x] comfyui_integration.py - Changed `.data_models` to absolute
- [x] pipeline_executor.py - Changed `.data_models` to absolute
- [x] error_recovery_manager.py - Changed `.data_models` to absolute
- [x] sequence_planner.py - Changed `.data_models` to absolute
- [x] world_config_generator.py - Changed `.data_models` to absolute
- [x] character_generator.py - Changed `.data_models` to absolute
- [x] story_structure_generator.py - Changed `.data_models` to absolute
- [x] dialogue_script_generator.py - Changed `.data_models` to absolute
- [x] music_description_generator.py - Changed `.data_models` to absolute
- [x] connection_manager.py - Changed `.data_models` to absolute
- [x] quality_validator.py - Changed `.data_models` to absolute
- [x] config.py - Changed `.data_models` to absolute
- [x] workflow_manager.py - Changed `.workflow_configs` to absolute
- [x] generation_engine.py - Changed all relative imports to absolute
- [x] ui_integration.py - Changed all relative imports to absolute

## Pattern Applied:
- `from .data_models import` → `from src.end_to_end.data_models import`
- `from .connection_manager import` → `from src.end_to_end.connection_manager import`
- etc.

## Notes:
- `__init__.py` intentionally uses relative imports for module re-exporting
- All 16 module files have been successfully updated

## Completed:
All imports in src/end_to_end module files now use absolute paths for improved clarity and consistency.

