# StoryCore CLI

Command-line interface for StoryCore Creative Studio.

## Installation

```bash
# Build the CLI
npm run cli:build

# Link globally
npm link

# Or run directly
npm run storycore -- --help
```

## Usage

```bash
storycore <command> [options]
```

## Commands

### Init

Initialize a new StoryCore project.

```bash
storycore init my-project
storycore init my-project --template demo
storycore init my-project --output /path/to/dir
```

Options:
- `--template, -t` - Project template (default, minimal, demo)
- `--output, -o` - Output directory
- `--force, -f` - Overwrite existing project
- `--install, -i` - Install dependencies after initialization

### Import

Import media assets into the project.

```bash
storycore import /path/to/image.png
storycore import /path/to/videos --recursive
storycore import /path/to/audio --type audio
```

Options:
- `--type, -t` - Asset type (image, video, audio, auto)
- `--recursive, -r` - Recursively scan directories
- `--category, -c` - Category for the assets
- `--skip-metadata` - Skip metadata extraction

### Render

Render a composition to video.

```bash
storycore render my-composition
storycore render my-composition --quality ultra
storycore render my-composition --output /path/to/output.mp4
```

Options:
- `--quality, -q` - Render quality (draft, medium, high, ultra)
- `--output, -o` - Output file path
- `--format, -f` - Output format (mp4, webm, gif)
- `--fps` - Frame rate
- `--width` - Output width
- `--height` - Output height
- `--verbose, -v` - Verbose output
- `--browser` - Open in browser after render

### Preview

Start a live preview server.

```bash
storycore preview my-composition
storycore preview --port 3000 --browser
```

Options:
- `--port, -p` - Port for preview server
- `--browser, -b` - Open browser automatically
- `--hot-reload, -r` - Enable hot reload (default: true)
- `--fps` - Preview frame rate limit

### Export

Export composition to video file.

```bash
storycore export --format=mp4
storycore export --quality ultra --bitrate 20M
```

Options:
- `--format, -f` - Export format (mp4, webm, gif)
- `--quality, -q` - Export quality (draft, medium, high, ultra)
- `--output, -o` - Output file path
- `--bitrate, -b` - Video bitrate
- `--fps` - Frame rate
- `--width` - Output width
- `--height` - Output height
- `--composition, -c` - Composition to export

### Analyze

Analyze media file metadata.

```bash
storycore analyze /path/to/video.mp4
storycore analyze /path/to/image.png --json
storycore analyze /path/to/media --verbose
```

Options:
- `--json, -j` - Output in JSON format
- `--verbose, -v` - Show detailed information

## Global Options

```bash
storycore --help
storycore --verbose
storycore --quiet
storycore --config /path/to/config.json
storycore --api-url http://localhost:3001
storycore --api-key YOUR_API_KEY
```

Options:
- `--verbose, -v` - Enable verbose logging
- `--quiet, -q` - Suppress non-essential logging
- `--config` - Path to configuration file
- `--api-url` - Backend API URL
- `--api-key` - Backend API key

## Configuration

StoryCore CLI looks for configuration in the following order:

1. Command-line options
2. Environment variables
3. `storycore.config.json` in project root
4. Default values

### Environment Variables

| Variable | Description |
|----------|-------------|
| `STORYCORE_API_URL` | Backend API URL |
| `STORYCORE_API_KEY` | Backend API key |
| `STORYCORE_OUTPUT_DIR` | Output directory |
| `STORYCORE_ASSETS_DIR` | Assets directory |
| `STORYCORE_RENDER_QUALITY` | Default render quality |
| `STORYCORE_THEME` | UI theme (dark, light) |
| `STORYCORE_LANGUAGE` | Language |

### Example Configuration

```json
{
  "project": {
    "name": "My Project",
    "version": "1.0.0",
    "outputDir": "./output",
    "assetsDir": "./assets"
  },
  "api": {
    "url": "http://localhost:3001",
    "key": "",
    "timeout": 30000
  },
  "rendering": {
    "quality": "high",
    "width": 1920,
    "height": 1080,
    "fps": 30
  },
  "export": {
    "format": "mp4",
    "bitrate": "10M"
  }
}
```

## Exit Codes

- `0` - Success
- `1` - General error
- `2` - Invalid arguments
- `3` - File not found
- `4` - API error
- `5` - Render failed

## Progress Output

The CLI provides colored progress bars and status messages:

```
StoryCore CLI v1.0.0
Initializing: my-project
Progress: [████████████████████░░░░] 80% | Processing frames
```

## License

MIT
