# Creative Studio UI

> Professional video storyboard editor for StoryCore-Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.2-blue.svg)](https://reactjs.org/)

## Overview

Creative Studio UI is a modern React-based web application that provides a visual interface for creating and managing video storyboards. It serves as the frontend companion to the StoryCore-Engine backend pipeline, enabling creative professionals to plan video sequences through an intuitive drag-and-drop interface.

### Key Features

- ✨ **Visual Storyboard Canvas** - Drag-and-drop interface for arranging shots
- 🎬 **Professional Timeline Editor** - Precise control over timing and transitions
- 🎵 **Advanced Audio Management** - Multi-track audio with surround sound support
- 🤖 **AI-Powered Chat Assistant** - Natural language project creation with configurable LLM providers
- 🌐 **Multi-Language Support** - AI responses in 9 languages (French, English, Spanish, German, Italian, Portuguese, Japanese, Chinese, Korean)
- 🔐 **Secure API Key Management** - Encrypted storage with AES-GCM encryption
- 💬 **Real-time Streaming Responses** - See AI responses appear word-by-word
- 🎨 **Visual Effects & Filters** - Professional-grade image processing
- 📝 **Text & Titles** - Customizable text layers with animations
- ⚡ **Real-time Preview** - See your storyboard come to life
- 🔄 **Undo/Redo System** - Experiment freely without fear
- 💾 **Auto-save** - Never lose your work
- 🔌 **StoryCore-Engine Integration** - Seamless backend processing

## Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+)

### Installation

```bash
# Clone the repository
git clone https://github.com/storycore-engine/creative-studio-ui.git
cd creative-studio-ui

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
# Build the application
npm run build

# Preview production build
npm run preview
```

## Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete guide for end users
- **[LLM Chatbox Configuration Guide](docs/LLM_CHATBOX_CONFIGURATION_GUIDE.md)** - Configure AI assistant with various LLM providers
- **[API Reference](docs/API_REFERENCE.md)** - Developer API documentation
- **[Code Examples](docs/EXAMPLES.md)** - Practical code examples

## Project Structure

```
creative-studio-ui/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components (shadcn/ui)
│   │   ├── launcher/       # Landing page components
│   │   ├── canvas/         # Storyboard canvas components
│   │   ├── timeline/       # Timeline editor components
│   │   ├── audio/          # Audio management components
│   │   └── effects/        # Visual effects components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state stores
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── lib/                # Third-party integrations
│   └── pages/              # Page components
├── docs/                   # Documentation
├── public/                 # Static assets
└── tests/                  # Test files
```

## Technology Stack

- **React 19.2** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite** - Build tool
- **Zustand** - State management
- **React DnD** - Drag and drop
- **Shadcn/ui** - Component library
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Query** - Data fetching
- **Vitest** - Testing framework

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:ui          # Open Vitest UI
```

### Code Style

This project uses:
- **ESLint** for code linting
- **Prettier** for code formatting
- **TypeScript** for type checking

Run `npm run lint` and `npm run format` before committing.

### Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test -- --coverage
```

## Build Configuration

### Overview

This project uses a carefully configured TypeScript/Vite build system designed to prevent module resolution conflicts between TypeScript source files and compiled JavaScript artifacts. The configuration ensures that:

- TypeScript source files (`.ts`, `.tsx`) remain in `src/`
- Compiled JavaScript artifacts are output only to `dist/`
- No `.js` files are accidentally generated in the source directory
- Module resolution always prefers TypeScript files over JavaScript files

### Build Scripts

The following npm scripts manage the build process:

```bash
# Cleanup Scripts
npm run clean              # Remove .js files from src/ directory
npm run clean:dist         # Remove dist/ directory

# Validation Scripts
npm run validate           # Check build configuration for issues
npm run validate -- --fix  # Attempt automatic fixes for issues
npm run validate -- --ci   # Run validation in CI mode (strict)

# Development & Build
npm run dev                # Start dev server (runs cleanup first)
npm run build              # Build for production (runs cleanup + validation)
npm run preview            # Preview production build
```

### Automated Cleanup System

The build system includes automated cleanup hooks that run before development and production builds:

- **Pre-development**: Removes any stray `.js` files from `src/` before starting the dev server
- **Pre-build**: Cleans both `src/` and `dist/` directories before compilation
- **Post-build**: Validates that no `.js` files were accidentally created in `src/`

These hooks ensure that module resolution conflicts never occur, even if TypeScript accidentally generates files in the wrong location.

### Manual Cleanup

If you encounter module resolution errors or need to manually clean the project:

```bash
# Remove all .js files from src/ directory
npm run clean

# Remove the entire dist/ directory
npm run clean:dist

# Clean everything and rebuild
npm run clean && npm run clean:dist && npm run build
```

**Cleanup Options:**

```bash
# Dry run (preview what would be deleted)
node scripts/clean-build-artifacts.cjs --dry-run

# Verbose output (see each file being removed)
node scripts/clean-build-artifacts.cjs --verbose

# Clean specific directory
node scripts/clean-build-artifacts.cjs --target-dir src/components
```

### Build Validation

The validation script checks for common configuration issues:

```bash
# Run validation
npm run validate
```

**What it checks:**

1. ✅ No `.js` files in `src/` directory
2. ✅ TypeScript `noEmit` is correctly configured
3. ✅ `.gitignore` contains proper patterns
4. ✅ Module resolution settings are correct

**Validation Output Example:**

```
✓ No .js files found in src/
✓ TypeScript noEmit is correctly set
✗ .gitignore missing src/**/*.js pattern
  Fix: Add 'src/**/*.js' to .gitignore

Validation failed with 1 error(s)
Run 'npm run validate -- --fix' to attempt automatic fixes
```

**Automatic Fixes:**

```bash
# Attempt to fix issues automatically
npm run validate -- --fix
```

This will:
- Add missing `.gitignore` patterns
- Suggest (but not modify) TypeScript configuration fixes
- Report what was fixed and what needs manual intervention

### TypeScript Configuration

The project uses multiple TypeScript configuration files:

- **`tsconfig.app.json`**: Application code configuration
- **`tsconfig.node.json`**: Node.js scripts configuration
- **`tsconfig.test.json`**: Test files configuration

**Key Settings:**

```json
{
  "compilerOptions": {
    "noEmit": true,                    // Prevent .js generation
    "moduleResolution": "bundler",     // Vite-compatible resolution
    "allowImportingTsExtensions": true // Allow .ts imports
  },
  "exclude": ["dist", "**/*.js"]       // Exclude output and .js files
}
```

These settings ensure that:
- TypeScript performs type checking only (no `.js` output)
- Vite handles all JavaScript generation via esbuild
- Module resolution works correctly with TypeScript files

### Troubleshooting Build Issues

#### Problem: Module resolution errors (e.g., "Cannot find module")

**Symptoms:**
```
Error: Cannot find module './undoRedo'
Error: exports is not defined
```

**Solution:**
```bash
# Clean and rebuild
npm run clean
npm run dev
```

**Root Cause:** Stray `.js` files in `src/` conflicting with `.ts` files.

#### Problem: TypeScript generating .js files in src/

**Symptoms:**
- `.js` files appearing in `src/` after running `tsc`
- Validation reports `.js` files in source directory

**Solution:**
```bash
# Check TypeScript configuration
npm run validate

# If noEmit is false, update tsconfig.app.json:
# "noEmit": true
```

**Root Cause:** TypeScript compiler configured to emit JavaScript files.

#### Problem: Build fails with "Cannot write file" errors

**Symptoms:**
```
Error: Cannot write file 'src/components/MyComponent.js'
```

**Solution:**
```bash
# Remove conflicting files
npm run clean

# Verify TypeScript configuration
npm run validate
```

**Root Cause:** TypeScript trying to write to `src/` directory.

#### Problem: Git tracking .js files in src/

**Symptoms:**
- `git status` shows `.js` files in `src/`
- Validation reports missing `.gitignore` patterns

**Solution:**
```bash
# Add proper .gitignore patterns
npm run validate -- --fix

# Remove tracked .js files
git rm src/**/*.js
git commit -m "Remove compiled artifacts from source"
```

**Root Cause:** Missing or incorrect `.gitignore` patterns.

#### Problem: HMR (Hot Module Replacement) not working

**Symptoms:**
- Changes not reflected in browser
- Dev server requires manual refresh

**Solution:**
```bash
# Clean and restart dev server
npm run clean
npm run dev
```

**Root Cause:** Stale `.js` files interfering with HMR.

### CI/CD Integration

For continuous integration pipelines, use the validation script in strict mode:

```yaml
# GitHub Actions example
- name: Validate build configuration
  run: npm run validate -- --ci

- name: Build project
  run: npm run build

- name: Post-build validation
  run: npm run validate -- --ci
```

The `--ci` flag ensures:
- Non-zero exit code on validation failure
- No interactive prompts
- Formatted output for CI logs

### Advanced Configuration

#### Custom Cleanup Patterns

Edit `scripts/clean-build-artifacts.cjs` to customize cleanup behavior:

```javascript
const config = {
  sourceDirs: ['src'],
  removePatterns: ['**/*.js', '**/*.js.map'],
  preservePatterns: ['*.config.js', 'vite.config.ts'],
  excludeDirs: ['node_modules', 'dist', '.git']
};
```

#### Custom Validation Rules

Edit `scripts/validate-build-config.cjs` to add custom validation checks:

```javascript
// Add custom validation
function validateCustomRule() {
  // Your validation logic
  return { valid: true, issues: [] };
}
```

### Performance Considerations

**Cleanup Performance:**
- Typical cleanup time: < 2 seconds
- Large projects (1000+ files): < 5 seconds
- Runs asynchronously to minimize build delay

**Validation Performance:**
- Typical validation time: < 1 second
- Includes file system scanning and config parsing
- Minimal impact on development workflow

### Best Practices

1. **Always run cleanup before troubleshooting** - Many issues are caused by stray `.js` files
2. **Use validation regularly** - Catch configuration issues early
3. **Enable pre-commit hooks** - Prevent committing `.js` files to `src/`
4. **Monitor build output** - Watch for unexpected `.js` file generation
5. **Keep TypeScript config consistent** - Ensure all `tsconfig` files have correct settings

### Additional Resources

- **Cleanup Script**: `scripts/clean-build-artifacts.cjs`
- **Validation Script**: `scripts/validate-build-config.cjs`
- **TypeScript Config**: `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.test.json`
- **Vite Config**: `vite.config.ts`
- **Git Ignore**: `.gitignore`

## Features in Detail

### LLM Chatbox Enhancement

The AI-powered chatbox has been significantly enhanced with professional-grade LLM integration:

**Provider Support:**
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Sonnet, Haiku
- **Local**: Ollama with any installed model
- **Custom**: Connect to custom LLM endpoints

**Configuration Options:**
- Temperature control (0-2 range, 0.1 increments)
- Max tokens (100-4000 range)
- Streaming toggle for real-time responses
- Model selection based on provider
- API key management with encryption

**Language Support:**
The chatbox supports 9 languages with native AI responses:
- French (Français) 🇫🇷
- English 🇬🇧
- Spanish (Español) 🇪🇸
- German (Deutsch) 🇩🇪
- Italian (Italiano) 🇮🇹
- Portuguese (Português) 🇵🇹
- Japanese (日本語) 🇯🇵
- Chinese (中文) 🇨🇳
- Korean (한국어) 🇰🇷

**Security Features:**
- AES-GCM 256-bit encryption for API keys
- Session-based encryption keys
- Masked API key display (only last 4 characters visible)
- Secure localStorage with encrypted storage
- No plain-text API keys in memory or logs

**Smart Features:**
- Automatic browser language detection
- Fallback mode when LLM unavailable
- Automatic mode recovery when service restored
- Connection validation before saving
- Error recovery with retry/configure options
- Stream cancellation on new messages
- Graceful handling of interruptions

**User Experience:**
- Real-time streaming responses (word-by-word)
- Typing indicators during generation
- System messages for status changes
- Contextual error messages with recovery actions
- Configuration persistence across sessions
- Automatic Ollama migration support

For detailed configuration instructions, see the [LLM Chatbox Configuration Guide](docs/LLM_CHATBOX_CONFIGURATION_GUIDE.md).

### Storyboard Canvas

- Grid layout with responsive sizing
- Drag-and-drop shot reordering
- Visual selection indicators
- Double-click to edit
- Context menu actions

### Timeline Editor

- Horizontal timeline with time markers
- Duration bars for each shot
- Draggable playhead
- Zoom controls
- Transition indicators
- Audio waveform visualization

### Audio Management

- Multi-track audio support
- Volume, pan, fade controls
- Professional audio effects:
  - Limiter
  - Voice Clarity (auto-enhance)
  - Gain control
  - Distortion
  - Bass/Treble boost
  - EQ, Compressor, Noise reduction
- Surround sound (5.1, 7.1)
- Spatial audio positioning
- Automation curves (Houdini-style)
- AI-powered voiceover generation

### Visual Effects

- Filter library (vintage, blur, etc.)
- Adjustable parameters
- Effect stacking
- Real-time preview
- Custom effect presets

### Text & Titles

- Multiple text layers per shot
- Font, size, color customization
- Position and alignment controls
- Text animations (fade, slide, typewriter)
- Text templates
- Stroke and shadow effects

### AI Chat Assistant

The enhanced LLM chatbox provides intelligent assistance with configurable AI providers:

**Supported Providers:**
- OpenAI (GPT-4, GPT-3.5)
- Anthropic (Claude 3 Opus, Sonnet, Haiku)
- Local (Ollama)
- Custom endpoints

**Features:**
- Natural language project creation
- Shot generation from descriptions
- Asset suggestions
- Audio configuration assistance
- Scene-based surround sound presets
- Multi-language responses (9 languages)
- Real-time streaming responses
- Automatic fallback mode when offline
- Secure API key encryption
- Configurable temperature and token limits

**Configuration:**
1. Click the settings icon (⚙️) next to the status indicator
2. Select your LLM provider and model
3. Enter your API key (if required)
4. Adjust parameters (temperature, max tokens)
5. Save and start chatting!

**Language Selection:**
1. Click the globe icon (🌐) next to the settings button
2. Choose from 9 supported languages
3. AI responses automatically adapt to your language

For detailed configuration instructions, see [LLM Chatbox Configuration Guide](docs/LLM_CHATBOX_CONFIGURATION_GUIDE.md).

## Integration with StoryCore-Engine

Creative Studio UI exports projects in the StoryCore-Engine Data Contract v1 format:

```json
{
  "schema_version": "1.0",
  "project_name": "my-project",
  "shots": [...],
  "assets": [...],
  "capabilities": {
    "grid_generation": true,
    "promotion_engine": true,
    "qa_engine": true,
    "autofix_engine": true
  },
  "generation_status": {
    "grid": "pending",
    "promotion": "pending"
  }
}
```

### Backend Processing

1. Export project from Creative Studio UI
2. Process with StoryCore-Engine CLI:

```bash
storycore grid --project my-project
storycore promote --project my-project
storycore qa --project my-project
storycore export --project my-project
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write TypeScript for all new code
- Follow the existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass before submitting PR

## Roadmap

### Current Version (v1.0)

- ✅ Core storyboard editing
- ✅ Timeline editor
- ✅ Audio management
- ✅ Visual effects
- ✅ Text layers
- ✅ AI chat assistant
- ✅ Undo/redo system

### Upcoming Features (v1.1)

- [ ] Real-time collaboration
- [ ] Cloud project storage
- [ ] Advanced camera movements
- [ ] 3D scene composition
- [ ] Video export (direct rendering)
- [ ] Plugin system

### Future Enhancements (v2.0)

- [ ] Multi-user editing
- [ ] Version control integration
- [ ] Advanced color grading
- [ ] Motion tracking
- [ ] AI-powered scene suggestions

## Performance

### Optimization Tips

- Use compressed image formats (JPG instead of PNG)
- Limit simultaneous effects (max 5 per shot)
- Close unused panels to reduce rendering
- Clear cache regularly (Settings > Clear Cache)
- Use virtual scrolling for large asset libraries

### Browser Compatibility

| Browser | Minimum Version | Recommended |
|---------|----------------|-------------|
| Chrome  | 90+            | Latest      |
| Firefox | 88+            | Latest      |
| Safari  | 14+            | Latest      |
| Edge    | 90+            | Latest      |

## Security

### API Key Protection

The Creative Studio UI implements multiple security layers to protect your LLM API keys:

**Encryption:**
- AES-GCM 256-bit encryption for all API keys
- Session-specific encryption keys (regenerated each session)
- Keys stored encrypted in localStorage, never in plain text
- Encryption keys cleared on browser close

**Display Security:**
- API keys masked in UI (e.g., `••••••••••••1234`)
- Only last 4 characters visible for verification
- No API keys in console logs or error messages

**Transmission Security:**
- All API calls use HTTPS encryption
- Keys only sent to their respective providers
- No third-party key sharing or logging

**Best Practices:**
- Rotate API keys regularly (monthly recommended)
- Use minimal required permissions for API keys
- Monitor API usage for unexpected activity
- Clear browser data on shared computers
- Use different keys for development and production

**Security Limitations:**

While the application implements encryption, localStorage is not a secure storage mechanism for highly sensitive data. Consider these limitations:

- Browser access: Physical access to computer can potentially access localStorage
- XSS vulnerabilities: Cross-site scripting could access localStorage
- Browser extensions: Malicious extensions could read localStorage
- Shared computers: Other users might access your data

**Recommendation:** For production environments, consider implementing server-side API key management with secure token exchange.

For more details, see the [LLM Chatbox Configuration Guide](docs/LLM_CHATBOX_CONFIGURATION_GUIDE.md#api-key-security).

## Troubleshooting

### Common Issues

**Problem**: Application won't start
- **Solution**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`

**Problem**: Drag-and-drop not working
- **Solution**: Ensure you're using a supported browser. Try refreshing the page.

**Problem**: Audio not playing
- **Solution**: Check browser audio permissions. Verify audio file format (MP3, WAV, OGG).

**Problem**: Export fails
- **Solution**: Check for missing assets or invalid shot durations. Verify disk space.

### LLM Chatbox Issues

**Problem**: "Connection validation failed" error
- **Solutions**:
  - Verify your API key is correct and active
  - Check your internet connection
  - Ensure the provider's API is not experiencing outages
  - Verify your account has sufficient credits
  - Check for firewall or proxy blocking API requests

**Problem**: "Authentication failed" error
- **Solutions**:
  - Double-check your API key (copy-paste to avoid typos)
  - Verify the API key has the correct permissions
  - Ensure your account is in good standing
  - Try generating a new API key

**Problem**: Chatbox stuck in fallback mode (orange status)
- **Solutions**:
  - Click "Configure LLM" button in warning banner
  - Complete configuration with valid API key
  - Save configuration to trigger connection validation
  - Verify connection status changes to "En ligne" (green)

**Problem**: Responses appear slowly or freeze mid-stream
- **Solutions**:
  - Check your internet connection speed
  - Try disabling streaming in configuration
  - Reduce max tokens to decrease response size
  - Switch to a faster model (e.g., GPT-3.5 instead of GPT-4)

**Problem**: Assistant responds in wrong language
- **Solutions**:
  - Verify language selector shows correct language
  - Try changing language and changing back
  - Clear browser cache and reload
  - Check that your LLM provider supports the selected language

**Problem**: Language preference not persisting
- **Solutions**:
  - Check browser localStorage is enabled
  - Verify you're not in private/incognito mode
  - Check browser storage quota is not exceeded
  - Try clearing localStorage and setting preference again

For more troubleshooting help, see the [LLM Chatbox Configuration Guide](docs/LLM_CHATBOX_CONFIGURATION_GUIDE.md#troubleshooting).

### Getting Help

- **Documentation**: Check the [docs](docs/) folder
- **Issues**: [GitHub Issues](https://github.com/storycore-engine/creative-studio-ui/issues)
- **Email**: support@storycore-engine.com
- **Community**: [Forum](https://forum.storycore-engine.com)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- Drag-and-drop powered by [React DnD](https://react-dnd.github.io/react-dnd/)

## Contact

- **Website**: https://storycore-engine.com
- **Email**: support@storycore-engine.com
- **Twitter**: [@StoryCoreEngine](https://twitter.com/StoryCoreEngine)
- **GitHub**: [storycore-engine](https://github.com/storycore-engine)

---

Made with ❤️ by the StoryCore team
