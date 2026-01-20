

# Grid Editor Configuration Export/Import System

Complete system for exporting and importing grid editor configurations with support for multiple formats and conflict resolution.

## Features

### ✅ Export Capabilities (Exigences: 15.1, 15.3, 15.7)

- **JSON Export**: Standard JSON format for easy storage and version control
- **YAML Export**: Human-readable format for documentation
- **URL Export**: Shareable base64-encoded URLs for quick sharing
- **Full Configuration**: Export complete state including panel positions
- **Template Export**: Export reusable settings without panel positions (Exigence: 15.6)

### ✅ Import Capabilities (Exigences: 15.2, 15.8)

- **File Import**: Import from JSON or YAML files
- **URL Import**: Import from shareable URLs (Exigence: 15.4)
- **Validation**: Comprehensive validation with detailed error messages
- **Error Handling**: Clear, actionable error messages with suggestions

### ✅ Conflict Resolution (Exigence: 15.5)

- **Automatic Detection**: Detect conflicts between current and imported configurations
- **Resolution Strategies**: Keep current, use imported, or smart merge
- **Visual Feedback**: Clear UI showing conflicts and resolution options

## Usage

### Basic Export

```typescript
import { exportGridConfiguration } from '@/services/gridEditor/ConfigurationExportImport';

const configuration: GridEditorConfiguration = {
  layout: {
    columns: 3,
    rows: 3,
    gap: 16,
    cellSize: { width: 200, height: 200 },
    snapEnabled: true,
    snapThreshold: 10,
    showGridLines: true
  },
  visualPreferences: {
    theme: 'light',
    showGridLines: true,
    showAlignmentGuides: true,
    animationsEnabled: true
  },
  snapSettings: {
    enabled: true,
    threshold: 10,
    gridSizes: [8, 16, 24, 32]
  }
};

// Export as JSON
exportGridConfiguration(configuration, 'json');

// Export as YAML
exportGridConfiguration(configuration, 'yaml');

// Export as shareable URL
exportGridConfiguration(configuration, 'url');
```

### Template Export

```typescript
import { exportAsTemplate } from '@/services/gridEditor/ConfigurationExportImport';

// Export reusable template (no panel positions)
exportAsTemplate(
  configuration,
  {
    name: '3-Column Layout',
    description: 'Standard 3-column grid with 16px gap',
    author: 'John Doe',
    tags: ['layout', 'standard', '3-column']
  },
  'json'
);
```

### Import from File

```typescript
import { importGridConfiguration } from '@/services/gridEditor/ConfigurationExportImport';

const handleFileImport = async (file: File) => {
  const result = await importGridConfiguration(file);
  
  if (result.success) {
    console.log('Configuration imported:', result.configuration);
    
    if (result.warnings) {
      console.warn('Warnings:', result.warnings);
    }
  } else {
    console.error('Import failed:', result.errors);
  }
};
```

### Import from URL

```typescript
import { importFromURL } from '@/services/gridEditor/ConfigurationExportImport';

const url = 'storycore://grid-config/eyJtZXRhZGF0YSI6...';
const result = importFromURL(url);

if (result.success) {
  console.log('Configuration imported from URL');
}
```

### Conflict Resolution

```typescript
import { 
  detectConflicts, 
  resolveConflicts 
} from '@/services/gridEditor/ConfigurationExportImport';

// Detect conflicts
const conflicts = detectConflicts(currentConfig, importedConfig);

if (conflicts.length > 0) {
  console.log('Conflicts detected:', conflicts);
  
  // Resolve with strategy
  const resolved = resolveConflicts(
    currentConfig,
    importedConfig,
    conflicts,
    'merge' // or 'keep_current' or 'use_imported'
  );
  
  console.log('Resolved configuration:', resolved);
}
```

## React Component

### Using the ConfigurationExportImport Component

```typescript
import { ConfigurationExportImport } from '@/components/gridEditor/ConfigurationExportImport';

function MyGridEditor() {
  const [config, setConfig] = useState<GridEditorConfiguration>({...});
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <button onClick={() => setShowDialog(true)}>
        Export/Import Configuration
      </button>

      {showDialog && (
        <ConfigurationExportImport
          currentConfiguration={config}
          onImport={(newConfig) => {
            setConfig(newConfig);
            setShowDialog(false);
          }}
          onClose={() => setShowDialog(false)}
        />
      )}
    </>
  );
}
```

## Configuration Structure

### Full Configuration

```typescript
interface GridEditorConfiguration {
  // Grid layout settings
  layout: {
    columns: number;
    rows: number;
    gap: number;
    cellSize: { width: number; height: number };
    snapEnabled: boolean;
    snapThreshold: number;
    showGridLines: boolean;
  };
  
  // Visual preferences
  visualPreferences: {
    theme?: 'light' | 'dark';
    showGridLines: boolean;
    showAlignmentGuides: boolean;
    animationsEnabled: boolean;
  };
  
  // Snap settings
  snapSettings: {
    enabled: boolean;
    threshold: number;
    gridSizes: number[];
  };
  
  // Optional: Panel positions (for full state export)
  panels?: GridPanel[];
}
```

### Template Configuration

```typescript
interface GridEditorTemplate {
  // Template metadata
  name: string;
  description?: string;
  author?: string;
  tags?: string[];
  
  // Reusable configuration (no panel positions)
  layout: Omit<GridLayoutConfig, 'rows'>; // Rows are dynamic
  visualPreferences: GridEditorConfiguration['visualPreferences'];
  snapSettings: GridEditorConfiguration['snapSettings'];
}
```

## Export Formats

### JSON Format

```json
{
  "metadata": {
    "version": "1.0.0",
    "exportedAt": "2024-01-19T10:00:00.000Z",
    "type": "full",
    "format": "json"
  },
  "configuration": {
    "layout": {
      "columns": 3,
      "rows": 3,
      "gap": 16,
      "cellSize": { "width": 200, "height": 200 },
      "snapEnabled": true,
      "snapThreshold": 10,
      "showGridLines": true
    },
    "visualPreferences": {
      "theme": "light",
      "showGridLines": true,
      "showAlignmentGuides": true,
      "animationsEnabled": true
    },
    "snapSettings": {
      "enabled": true,
      "threshold": 10,
      "gridSizes": [8, 16, 24, 32]
    }
  }
}
```

### YAML Format

```yaml
# Grid Editor Configuration
# Generated by StoryCore-Engine

metadata:
  version: "1.0.0"
  exportedAt: "2024-01-19T10:00:00.000Z"
  type: "full"
  format: "yaml"

configuration:
  layout:
    columns: 3
    rows: 3
    gap: 16
    cellSize:
      width: 200
      height: 200
    snapEnabled: true
    snapThreshold: 10
    showGridLines: true
  visualPreferences:
    theme: "light"
    showGridLines: true
    showAlignmentGuides: true
    animationsEnabled: true
  snapSettings:
    enabled: true
    threshold: 10
    gridSizes: [8, 16, 24, 32]
```

### URL Format

```
storycore://grid-config/eyJtZXRhZGF0YSI6eyJ2ZXJzaW9uIjoiMS4wLjAiLCJleHBvcnRlZEF0IjoiMjAyNC0wMS0xOVQxMDowMDowMC4wMDBaIiwidHlwZSI6ImZ1bGwiLCJmb3JtYXQiOiJ1cmwifSwiY29uZmlndXJhdGlvbiI6ey4uLn19
```

## Validation

### Validation Rules

The system validates:

- **Columns**: Must be between 1 and 12
- **Gap**: Must be between 0 and 100
- **Cell Size**: Must be positive values
- **Snap Threshold**: Must be between 0 and 50
- **Theme**: Must be 'light' or 'dark'
- **Grid Sizes**: Must be between 1 and 100

### Error Messages

Clear, actionable error messages with suggestions:

```typescript
{
  success: false,
  errors: [
    'Columns must be between 1 and 12',
    'Suggestions:',
    '- Check that all required fields are present',
    '- Verify that numeric values are within valid ranges',
    '- Ensure boolean fields are true or false'
  ]
}
```

## Conflict Resolution

### Conflict Types

```typescript
interface ConfigurationConflict {
  field: string;              // e.g., 'layout.columns'
  currentValue: any;          // Current value
  importedValue: any;         // Imported value
  suggestion: 'keep_current' | 'use_imported' | 'merge';
}
```

### Resolution Strategies

1. **Keep Current**: Preserve all current values
2. **Use Imported**: Apply all imported values
3. **Smart Merge**: Use suggested resolution for each conflict

## Best Practices

### Export

1. **Use Templates for Reusability**: Export templates when sharing layouts
2. **Include Metadata**: Add author and description for templates
3. **Choose Appropriate Format**: 
   - JSON for storage and version control
   - YAML for documentation
   - URL for quick sharing

### Import

1. **Validate Before Applying**: Always check import result
2. **Handle Conflicts**: Review conflicts before applying
3. **Backup Current Config**: Save current configuration before importing
4. **Test Imported Configs**: Verify imported configuration works as expected

### Security

1. **Validate Input**: All imports are validated
2. **Sanitize URLs**: URL imports are decoded safely
3. **Error Handling**: Graceful error handling with user feedback

## Examples

See `ConfigurationExportImportExample.tsx` for a complete working example.

## API Reference

### Export Functions

- `exportGridConfiguration(config, format, filename?)`: Export configuration
- `exportAsTemplate(config, templateInfo, format, filename?)`: Export as template

### Import Functions

- `importGridConfiguration(file)`: Import from file
- `importFromURL(url)`: Import from URL
- `importFromJSON(json)`: Import from JSON string

### Validation Functions

- `detectConflicts(current, imported)`: Detect configuration conflicts
- `resolveConflicts(current, imported, conflicts, strategy)`: Resolve conflicts

### Helper Functions

- `validateImportCompatibility(imported, current)`: Check compatibility
- `mergeConfigurations(base, imported, overwrite)`: Merge configurations
- `createConfigurationBackup(config, type)`: Create backup
- `restoreConfigurationFromBackup(backup)`: Restore from backup

## Requirements Mapping

- ✅ **15.1**: Export configuration to JSON with all data
- ✅ **15.2**: Import and validate configuration
- ✅ **15.3**: Export layout, snap settings, and visual preferences
- ✅ **15.4**: Share via base64-encoded URL
- ✅ **15.5**: Detect and resolve conflicts
- ✅ **15.6**: Export templates with reusable parameters only
- ✅ **15.7**: Support JSON, YAML, and URL formats
- ✅ **15.8**: Detailed error messages with suggestions

## Testing

Run the example to test all features:

```bash
npm run dev
# Navigate to /examples/configuration-export-import
```

## Future Enhancements

- [ ] Cloud storage integration
- [ ] Configuration versioning
- [ ] Collaborative editing
- [ ] Configuration presets library
- [ ] Advanced YAML parser integration
- [ ] Configuration diff viewer
- [ ] Batch import/export
- [ ] Configuration migration tools
