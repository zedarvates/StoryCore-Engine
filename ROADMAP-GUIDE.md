# StoryCore-Engine Roadmap Guide

## Overview

The StoryCore-Engine roadmap system automatically generates and maintains a public-facing ROADMAP.md file from internal technical specifications. This guide explains how to use the roadmap system effectively.

## Quick Start

### Generate Roadmap

Generate a fresh roadmap from all specs in `.kiro/specs/`:

```bash
python storycore.py roadmap generate
```

This creates:
- `ROADMAP.md` - Public-facing roadmap organized by timeline and priority
- `CHANGELOG.md` - Chronological record of completed features

### Update Roadmap

Update the roadmap after spec changes:

```bash
python storycore.py roadmap update
```

This synchronizes the roadmap with any changes to specs while preserving manual edits.

### Validate Roadmap

Check for broken links and inconsistencies:

```bash
python storycore.py roadmap validate
```

This reports:
- Broken links to spec directories
- Missing roadmap badges in specs
- Invalid metadata values

## Roadmap Structure

### Timeline Organization

Features are organized by quarters:
- **Q1 2026** (January - March)
- **Q2 2026** (April - June)
- **Q3 2026** (July - September)
- **Q4 2026** (October - December)
- **Future Considerations** (no target date)

### Priority Levels

- 🔴 **High Priority**: Critical features for core functionality
- 🟡 **Medium Priority**: Important features for enhanced capabilities
- 🟢 **Low Priority**: Nice-to-have features and optimizations

### Status Indicators

- ✅ **Completed**: Feature is fully implemented and tested
- 🚧 **In Progress**: Feature is currently being developed
- 📋 **Planned**: Feature is scheduled for development
- 💡 **Future Considerations**: Feature is under consideration

### Categories

- `UI`: User interface and creative studio components
- `Backend`: Core engine and processing logic
- `Infrastructure`: System architecture and deployment
- `Documentation`: User guides and technical documentation
- `Testing`: Test suites and quality assurance
- `Tooling`: Development tools and CLI commands
- `Migration`: Code refactoring and modernization

## Spec Metadata

### Frontmatter Format

Add YAML frontmatter to spec files to control roadmap presentation:

```yaml
---
priority: high
category: UI
timeline: Q2 2026
status: in-progress
---
```

### Supported Fields

- **priority**: `high`, `medium`, or `low`
- **category**: `UI`, `Backend`, `Infrastructure`, `Documentation`, `Testing`, `Tooling`, `Migration`
- **timeline**: `Q1 2026`, `Q2 2026`, etc.
- **status**: `completed`, `in-progress`, `planned`, `future`

### Automatic Inference

If frontmatter is missing, the system infers metadata from:
- **Category**: Spec name patterns (e.g., `ui-*` → UI)
- **Priority**: Content keywords and dependencies
- **Status**: Task completion percentage in tasks.md
- **Timeline**: Completion dates from git history

## Task-Based Status

The system determines feature status from tasks.md:

- **0% complete**: 📋 Planned
- **1-99% complete**: 🚧 In Progress
- **100% complete**: ✅ Completed

Task format:
```markdown
- [ ] Task not started
- [x] Task completed
- [-] Task in progress
- [~] Task queued
```

Optional tasks (marked with `*`) are excluded from completion calculation:
```markdown
- [ ]* Optional task
```

## Bidirectional Linking

### Roadmap → Specs

Each feature entry includes a link to its spec directory:
```markdown
[View Spec](.kiro/specs/feature-name)
```

### Specs → Roadmap

The system automatically adds badges to spec files:
```markdown
[📋 View in Public Roadmap](../../ROADMAP.md#feature-name)
```

## Configuration

### Default Configuration

The system uses sensible defaults:
- Specs directory: `.kiro/specs/`
- Output path: `ROADMAP.md`
- Changelog path: `CHANGELOG.md`
- Max description length: 300 characters

### Custom Configuration

Create `.kiro/roadmap-config.yaml` to customize:

```yaml
specs_directory: .kiro/specs
output_path: ROADMAP.md
changelog_path: CHANGELOG.md
include_future: true
max_description_length: 300

status_emoji:
  completed: "✅"
  in-progress: "🚧"
  planned: "📋"
  future: "💡"

priority_emoji:
  high: "🔴"
  medium: "🟡"
  low: "🟢"
```

### CLI Overrides

Override configuration via command-line flags:

```bash
python storycore.py roadmap generate \
  --specs-dir custom/specs \
  --output custom-roadmap.md \
  --no-future
```

## Synchronization

### Automatic Updates

The roadmap stays synchronized with spec changes:

1. **New Spec**: Automatically added to roadmap
2. **Modified Spec**: Metadata and status updated
3. **Deleted Spec**: Removed from roadmap
4. **Task Completion**: Status updated automatically

### Manual Edits

Protected sections preserve manual edits:

```markdown
<!-- MANUAL_EDIT_START -->
Custom content here is preserved during updates
<!-- MANUAL_EDIT_END -->
```

## Changelog

### Automatic Entries

When a feature reaches 100% completion:
1. Entry added to CHANGELOG.md
2. Organized by release version or month
3. Includes completion date and description
4. Links back to roadmap

### Format

```markdown
## January 2026

### Feature Name
**Released:** 2026-01-19

Brief description of the feature.

[View in Roadmap](ROADMAP.md#feature-name)
```

## Best Practices

### Writing Descriptions

- Keep descriptions to 2-3 sentences
- Focus on user-facing benefits
- Avoid technical jargon
- Use active voice

### Setting Priorities

- **High**: Blocking other work or critical functionality
- **Medium**: Important but not blocking
- **Low**: Nice-to-have enhancements

### Timeline Planning

- Be realistic with target dates
- Use quarters for flexibility
- Move to "Future Considerations" if uncertain

### Maintaining Specs

- Update tasks.md as work progresses
- Add frontmatter for explicit control
- Keep descriptions current
- Link related specs

## Troubleshooting

### Broken Links

If validation reports broken links:

1. Check spec directory exists
2. Verify spec has required files (requirements.md, design.md, or tasks.md)
3. Run `roadmap update` to fix links

### Missing Badges

If specs lack roadmap badges:

1. Run `roadmap generate` to add badges
2. Check file permissions
3. Verify spec is in `.kiro/specs/`

### Incorrect Status

If status doesn't match reality:

1. Check tasks.md completion percentage
2. Add explicit status in frontmatter
3. Verify checkbox syntax in tasks.md

### Metadata Not Applied

If frontmatter isn't working:

1. Verify YAML syntax
2. Check field names match exactly
3. Ensure frontmatter is at file start
4. Run `roadmap validate` for errors

## Advanced Usage

### Dry Run

Preview changes without modifying files:

```bash
python storycore.py roadmap generate --dry-run
```

### Verbose Output

See detailed processing information:

```bash
python storycore.py roadmap generate --verbose
```

### Custom Filters

Generate roadmap for specific categories:

```bash
python storycore.py roadmap generate --category UI
```

## Integration

### CI/CD Pipeline

Add roadmap generation to your workflow:

```yaml
- name: Update Roadmap
  run: |
    python storycore.py roadmap update
    git add ROADMAP.md CHANGELOG.md
    git commit -m "Update roadmap [skip ci]"
```

### Pre-commit Hook

Validate roadmap before commits:

```bash
#!/bin/bash
python storycore.py roadmap validate
if [ $? -ne 0 ]; then
  echo "Roadmap validation failed"
  exit 1
fi
```

### Documentation Site

Include roadmap in documentation:

```markdown
# Project Roadmap

[!INCLUDE[](../ROADMAP.md)]
```

## Support

For issues or questions:
- Check [GitHub Issues](https://github.com/storycore-engine/issues)
- Review [Design Document](.kiro/specs/public-roadmap/design.md)
- Consult [Requirements](.kiro/specs/public-roadmap/requirements.md)

---

*This guide covers the essential features of the roadmap system. For technical details, see the design and requirements documents in `.kiro/specs/public-roadmap/`.*
