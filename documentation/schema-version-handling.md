# Schema Version Handling

## Overview

The Feedback & Diagnostics system implements comprehensive schema version handling to ensure backward compatibility with payloads created in previous implementation phases. This allows the system to accept and process feedback reports from older versions of the client while maintaining data integrity and validation.

## Requirements

**Requirement 9.5**: Backward Compatibility
- The system SHALL maintain backward compatibility with previous phases
- Payloads from earlier implementation phases SHALL be successfully processed
- Schema version mismatches SHALL be logged for monitoring
- Migration from old formats to current format SHALL be automatic and transparent

## Schema Versions

### Current Version: 1.0

The current schema version includes all fields defined in the complete Data Contract v1:

```json
{
  "schema_version": "1.0",
  "report_type": "bug|enhancement|question",
  "timestamp": "ISO-8601 timestamp",
  "system_info": {
    "storycore_version": "string",
    "python_version": "string",
    "os_platform": "string",
    "os_version": "string (optional)",
    "language": "string (optional)"
  },
  "module_context": {
    "active_module": "string",
    "module_state": {}
  },
  "user_input": {
    "description": "string (min 10 chars)",
    "reproduction_steps": "string (optional)"
  },
  "diagnostics": {
    "stacktrace": "string|null",
    "logs": ["string"],
    "memory_usage_mb": "number",
    "process_state": {}
  },
  "screenshot_base64": "string|null"
}
```

### Supported Legacy Versions

#### Phase 1 (MVP) - No Schema Version

Phase 1 payloads were created before the `schema_version` field was introduced. They contain:
- `report_type`
- `timestamp`
- `system_info` (basic fields only)
- `user_input`

**Missing fields**: `schema_version`, `module_context`, `diagnostics`, `screenshot_base64`

#### Version 0.9 - Pre-Release

Version 0.9 payloads include the `schema_version` field but may be missing some optional fields:
- `schema_version`: "0.9"
- All Phase 1 fields
- May have partial `module_context` or `diagnostics`

## Migration Process

### Automatic Migration

The backend proxy automatically migrates payloads from older versions to the current version (1.0) before processing. The migration process:

1. **Detects the schema version** from the payload
2. **Applies version-specific transformations**:
   - Phase 1 (no version): Adds `schema_version: "1.0"` and all missing fields with defaults
   - Version 0.9: Updates version to "1.0" and adds any missing fields
   - Version 1.0: Ensures all optional fields have proper defaults
3. **Validates the migrated payload** against the current schema
4. **Logs migration details** for monitoring and debugging
5. **Processes the payload** as if it were originally version 1.0

### Migration Rules

#### Adding Missing Fields

When fields are missing from older payloads, the following defaults are used:

```python
# module_context default
{
  "active_module": "unknown",
  "module_state": {}
}

# diagnostics default
{
  "stacktrace": None,
  "logs": [],
  "memory_usage_mb": 0,
  "process_state": {}
}

# screenshot_base64 default
None
```

#### Preserving Existing Data

Migration **always preserves** existing data in the payload:
- All user-provided fields are kept unchanged
- System information is preserved exactly as provided
- Partial data structures are completed, not replaced

### Migration Logging

All migrations are logged with detailed information:

```
INFO - Payload schema version: 0.9
INFO - Migrated payload: 3 changes
INFO -   - Migrating from 0.9 to 1.0
INFO -   - Added default diagnostics
INFO -   - Added default screenshot_base64
INFO - Schema version validation passed: Schema version 1.0 is valid
```

## API Behavior

### Endpoint: POST /api/v1/report

The report submission endpoint handles schema versions as follows:

1. **Accepts payloads with any supported schema version** (or no version)
2. **Automatically migrates** to current version before validation
3. **Returns success** if migration and validation succeed
4. **Returns 400 Bad Request** if:
   - Schema version is unsupported (e.g., "2.0")
   - Migration fails due to invalid data
   - Migrated payload fails validation

### Response Examples

#### Successful Migration

```json
{
  "status": "success",
  "issue_url": "https://github.com/zedarvates/StoryCore-Engine/issues/123",
  "issue_number": 123
}
```

#### Unsupported Version

```json
{
  "status": "error",
  "message": "Unsupported schema version: 2.0. Only version 1.0 is supported. Supported versions: 1.0",
  "fallback_mode": "manual"
}
```

## Implementation Details

### Key Components

#### 1. Schema Version Validator (`backend/payload_validator.py`)

```python
def validate_schema_version(payload: Dict[str, Any]) -> Tuple[bool, str]:
    """
    Validate the schema_version field.
    
    Returns:
        (is_valid, message): Validation result and message
    """
```

#### 2. Payload Migration (`backend/payload_validator.py`)

```python
def migrate_payload_to_current_version(payload: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """
    Migrate a payload from an older schema version to the current version.
    
    Returns:
        (migrated_payload, migration_notes): Migrated payload and list of changes
    """
```

#### 3. Backend Proxy Integration (`backend/feedback_proxy.py`)

The backend proxy integrates schema version handling into the request processing pipeline:

1. Parse raw JSON body
2. Check rate limits
3. **Migrate schema version** (before Pydantic validation)
4. Validate with Pydantic
5. Validate payload size
6. Validate screenshot
7. Perform JSON schema validation
8. Create GitHub issue

### Migration Flow Diagram

```
┌─────────────────────┐
│ Incoming Payload    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Detect Schema       │
│ Version             │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Version OK?  │
    └──────┬───────┘
           │
     ┌─────┴─────┐
     │           │
    Yes         No
     │           │
     │           ▼
     │    ┌──────────────┐
     │    │ Migrate to   │
     │    │ Current      │
     │    │ Version      │
     │    └──────┬───────┘
     │           │
     └─────┬─────┘
           │
           ▼
┌─────────────────────┐
│ Validate Migrated   │
│ Payload             │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Process Report      │
└─────────────────────┘
```

## Testing

### Unit Tests

**File**: `backend/test_schema_version_handling.py`

Tests cover:
- Schema version validation (valid, missing, invalid type, unsupported)
- Supported versions list
- Payload migration (Phase 1, version 0.9, current version, partial payloads)
- Data preservation during migration
- Migration + validation integration

### Integration Tests

**File**: `backend/test_schema_version_integration.py`

Tests cover:
- Current version payload acceptance
- Phase 1 payload migration and acceptance
- Version 0.9 payload migration
- Unsupported version rejection
- Data preservation through full pipeline
- Partial 1.0 payload completion
- Schema version logging
- Migration logging

### Running Tests

```bash
# Run all schema version tests
python -m pytest backend/test_schema_version_handling.py backend/test_schema_version_integration.py -v

# Run specific test class
python -m pytest backend/test_schema_version_handling.py::TestPayloadMigration -v

# Run with coverage
python -m pytest backend/test_schema_version_handling.py --cov=backend.payload_validator --cov-report=html
```

## Monitoring and Debugging

### Log Messages

Schema version handling generates detailed log messages:

```
# Normal processing
INFO - Payload schema version: 1.0
INFO - Schema version validation passed: Schema version 1.0 is valid

# Migration
INFO - Payload schema version: unknown
INFO - Migrated payload: 4 changes
INFO -   - No schema_version found - assuming Phase 1 payload
INFO -   - Migrating from Phase 1 to 1.0
INFO -   - Added default module_context
INFO -   - Added default diagnostics
INFO -   - Added default screenshot_base64

# Errors
WARNING - Unsupported schema version: 2.0
ERROR - [ValidationError] Validation failed for field 'schema_version'
```

### Metrics to Monitor

1. **Migration Rate**: Percentage of requests requiring migration
2. **Version Distribution**: Count of requests by schema version
3. **Migration Failures**: Count and reasons for migration failures
4. **Validation Failures**: Post-migration validation failures

## Future Considerations

### Adding New Schema Versions

When adding a new schema version (e.g., 1.1 or 2.0):

1. Update `REPORT_PAYLOAD_SCHEMA` in `payload_validator.py`
2. Add version to `get_supported_schema_versions()`
3. Add migration logic in `migrate_payload_to_current_version()`
4. Update Pydantic model in `feedback_proxy.py`
5. Add tests for new version migration
6. Update documentation

### Deprecating Old Versions

To deprecate support for old versions:

1. Add deprecation warnings to logs
2. Set a sunset date for the version
3. Update client applications to use current version
4. Remove migration logic after sunset date
5. Update supported versions list

## Best Practices

### For Client Developers

1. **Always include `schema_version`** in payloads
2. **Use the current version** (1.0) for new implementations
3. **Test with the backend** to ensure compatibility
4. **Monitor logs** for migration warnings

### For Backend Developers

1. **Never remove migration logic** without a deprecation period
2. **Log all migrations** for monitoring
3. **Preserve existing data** during migration
4. **Test migration paths** thoroughly
5. **Document version changes** clearly

## References

- **Design Document**: `.kiro/specs/feedback-diagnostics/design.md`
- **Requirements**: `.kiro/specs/feedback-diagnostics/requirements.md` (Requirement 9.5)
- **Task**: `.kiro/specs/feedback-diagnostics/tasks.md` (Task 23.1)
- **Implementation**: `backend/payload_validator.py`, `backend/feedback_proxy.py`
- **Tests**: `backend/test_schema_version_handling.py`, `backend/test_schema_version_integration.py`
