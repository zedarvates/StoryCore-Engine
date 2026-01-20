# Roadmap Configuration Guide

This guide explains how to configure the Public Roadmap Generator using configuration files and CLI flags.

## Configuration Sources

The roadmap generator supports three configuration sources with the following precedence (highest to lowest):

1. **CLI Flags** - Command-line arguments override all other settings
2. **YAML Config File** - Custom configuration file (default: `.kiro/roadmap-config.yaml`)
3. **Default Values** - Built-in defaults from `RoadmapConfig` dataclass

## Configuration File

### Location

The default configuration file location is `.kiro/roadmap-config.yaml`. You can specify a custom location using the `--config` flag:

```bash
python storycore.py roadmap generate --config custom-config.yaml
```

### Creating a Configuration File

An example configuration file is provided at `.kiro/roadmap-config.yaml.example`. Copy it to get started:

```bash
cp .kiro/roadmap-config.yaml.example .kiro/roadmap-config.yaml
```

### Configuration Options

```yaml
# Path to internal specs directory
specs_directory: .kiro/specs

# Path for generated ROADMAP.md file
output_path: ROADMAP.md

# Path for generated CHANGELOG.md file
changelog_path: CHANGELOG.md

# Whether to include "Future Considerations" section for undated features
include_future: true

# Maximum length for feature descriptions (in characters)
max_description_length: 300

# Emoji for feature statuses
status_emoji:
  completed: "✅"
  in-progress: "🚧"
  planned: "📋"
  future: "💡"

# Emoji for priority levels
priority_emoji:
  High: "🔴"
  Medium: "🟡"
  Low: "🟢"
```

## CLI Flag Overrides

All configuration options can be overridden via CLI flags:

### Generate Command

```bash
python storycore.py roadmap generate \
  --config custom-config.yaml \
  --specs-dir custom/specs \
  --output docs/ROADMAP.md \
  --changelog docs/CHANGELOG.md \
  --max-description-length 500 \
  --no-future
```

### Update Command

```bash
python storycore.py roadmap update \
  --config custom-config.yaml \
  --specs-dir custom/specs \
  --output docs/ROADMAP.md
```

### Validate Command

```bash
python storycore.py roadmap validate \
  --config custom-config.yaml \
  --specs-dir custom/specs \
  --roadmap docs/ROADMAP.md
```

## Configuration Examples

### Example 1: Custom Output Location

Place roadmap in `docs/` directory:

```yaml
specs_directory: .kiro/specs
output_path: docs/ROADMAP.md
changelog_path: docs/CHANGELOG.md
```

### Example 2: Shorter Descriptions

Limit feature descriptions to 200 characters:

```yaml
max_description_length: 200
```

### Example 3: Custom Emoji

Use different emoji for statuses:

```yaml
status_emoji:
  completed: "✔️"
  in-progress: "⏳"
  planned: "📝"
  future: "🔮"

priority_emoji:
  High: "🚨"
  Medium: "⚠️"
  Low: "ℹ️"
```

### Example 4: Exclude Future Features

Don't include undated features in the roadmap:

```yaml
include_future: false
```

## Configuration Precedence Example

Given this configuration file:

```yaml
# .kiro/roadmap-config.yaml
specs_directory: yaml/specs
output_path: yaml/ROADMAP.md
max_description_length: 200
```

And this CLI command:

```bash
python storycore.py roadmap generate \
  --output cli/ROADMAP.md \
  --max-description-length 400
```

The final configuration will be:

- `specs_directory`: `yaml/specs` (from YAML)
- `output_path`: `cli/ROADMAP.md` (from CLI - overrides YAML)
- `max_description_length`: `400` (from CLI - overrides YAML)
- `changelog_path`: `CHANGELOG.md` (from defaults)
- `include_future`: `true` (from defaults)

## Default Values

If no configuration file exists and no CLI flags are provided, these defaults are used:

| Option | Default Value |
|--------|---------------|
| `specs_directory` | `.kiro/specs` |
| `output_path` | `ROADMAP.md` |
| `changelog_path` | `CHANGELOG.md` |
| `include_future` | `true` |
| `max_description_length` | `300` |
| `status_emoji.completed` | `✅` |
| `status_emoji.in-progress` | `🚧` |
| `status_emoji.planned` | `📋` |
| `status_emoji.future` | `💡` |
| `priority_emoji.High` | `🔴` |
| `priority_emoji.Medium` | `🟡` |
| `priority_emoji.Low` | `🟢` |

## Validation

The configuration loader validates all values:

- **Paths**: Converted to `Path` objects
- **max_description_length**: Must be a positive integer (falls back to 300 if invalid)
- **Emoji**: Missing emoji use defaults
- **Malformed YAML**: Falls back to defaults with a warning

## Troubleshooting

### Configuration Not Loading

If your configuration file isn't being loaded:

1. Check the file path is correct (default: `.kiro/roadmap-config.yaml`)
2. Verify the YAML syntax is valid
3. Check file permissions
4. Look for warning messages in the output

### Invalid Configuration Values

If you see warnings about invalid configuration:

1. Check the YAML syntax
2. Verify enum values match exactly (e.g., `completed`, not `Completed`)
3. Ensure numeric values are positive integers
4. Check that paths are valid

### CLI Flags Not Working

If CLI flags aren't overriding configuration:

1. Ensure you're using the correct flag names (see `--help`)
2. Check flag values are valid
3. Verify the flag is placed after the subcommand (e.g., `roadmap generate --output ...`)

## Best Practices

1. **Version Control**: Commit `.kiro/roadmap-config.yaml` to share configuration with team
2. **Example File**: Keep `.kiro/roadmap-config.yaml.example` updated with all options
3. **Documentation**: Document custom emoji choices in comments
4. **Testing**: Use `--dry-run` to preview changes before applying
5. **Validation**: Run `roadmap validate` after configuration changes

## API Usage

You can also use the configuration loader programmatically:

```python
from pathlib import Path
from src.roadmap.config_loader import ConfigLoader

# Load with defaults
config = ConfigLoader.load_config()

# Load with custom config file
config = ConfigLoader.load_config(
    config_path=Path("custom-config.yaml")
)

# Load with CLI overrides
config = ConfigLoader.load_config(
    config_path=Path(".kiro/roadmap-config.yaml"),
    cli_overrides={
        "output_path": "docs/ROADMAP.md",
        "max_description_length": 500
    }
)

# Create default config file
ConfigLoader.create_default_config_file(
    output_path=Path(".kiro/roadmap-config.yaml")
)
```

## See Also

- [Roadmap Generator Guide](roadmap-generator.md)
- [CLI Reference](cli-reference.md)
- [Requirements Document](../.kiro/specs/public-roadmap/requirements.md)
- [Design Document](../.kiro/specs/public-roadmap/design.md)
