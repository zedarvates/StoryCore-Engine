# Creative Studio UI Documentation

Welcome to the Creative Studio UI documentation. This directory contains comprehensive guides for developers working with the build system, configuration, and troubleshooting.

## 📚 Documentation Index

### Build Configuration

- **[BUILD_CONFIGURATION.md](BUILD_CONFIGURATION.md)** - Complete guide to the TypeScript build configuration system
  - Architecture overview
  - Component details
  - Configuration files
  - Testing strategy
  - CI/CD integration
  - Advanced topics

- **[SCRIPTS_REFERENCE.md](SCRIPTS_REFERENCE.md)** - Quick reference for all build scripts
  - Cleanup scripts
  - Validation scripts
  - Development scripts
  - Build scripts
  - Testing scripts
  - Common workflows

- **[TROUBLESHOOTING_BUILD.md](TROUBLESHOOTING_BUILD.md)** - Solutions for common build issues
  - Module resolution errors
  - TypeScript configuration issues
  - Git and version control
  - Development server issues
  - Build failures
  - Performance issues

### User Guides

- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete guide for end users (if available)
- **[API_REFERENCE.md](API_REFERENCE.md)** - Developer API documentation (if available)
- **[EXAMPLES.md](EXAMPLES.md)** - Practical code examples (if available)

## 🚀 Quick Start

### For Developers

If you're new to the project, start here:

1. **Read the main [README](../README.md)** - Get an overview of the project
2. **Review [BUILD_CONFIGURATION.md](BUILD_CONFIGURATION.md)** - Understand the build system
3. **Bookmark [SCRIPTS_REFERENCE.md](SCRIPTS_REFERENCE.md)** - Quick reference for daily tasks
4. **Keep [TROUBLESHOOTING_BUILD.md](TROUBLESHOOTING_BUILD.md)** handy - For when things go wrong

### Common Tasks

**Starting development:**
```bash
npm run clean
npm run dev
```

**Before committing:**
```bash
npm run validate
npm test
```

**Building for production:**
```bash
npm run build
```

**Troubleshooting:**
```bash
npm run clean
npm run validate
```

## 🔧 Build System Overview

The Creative Studio UI uses a carefully configured TypeScript/Vite build system designed to prevent module resolution conflicts. Key features:

- **Automated cleanup** - Removes stray `.js` files before builds
- **Configuration validation** - Detects and reports issues
- **TypeScript no-emit** - Prevents `.js` generation in source
- **Git protection** - Ignores compiled artifacts
- **CI/CD ready** - Works in automated pipelines

### Key Scripts

| Script | Purpose |
|--------|---------|
| `npm run clean` | Remove `.js` files from `src/` |
| `npm run validate` | Check build configuration |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |

See [SCRIPTS_REFERENCE.md](SCRIPTS_REFERENCE.md) for complete details.

## 🐛 Troubleshooting

### Most Common Issues

1. **Module resolution errors** → `npm run clean && npm run dev`
2. **TypeScript generating .js files** → Set `noEmit: true` in tsconfig
3. **Git tracking .js files** → `npm run validate -- --fix`
4. **HMR not working** → `npm run clean && npm run dev`

See [TROUBLESHOOTING_BUILD.md](TROUBLESHOOTING_BUILD.md) for detailed solutions.

## 📖 Documentation Structure

### BUILD_CONFIGURATION.md

Comprehensive guide covering:
- Problem statement and solution
- Architecture and data flow
- Component implementation details
- TypeScript configuration
- Cleanup and validation systems
- Troubleshooting guide
- CI/CD integration
- Advanced topics

**Best for:** Understanding the system in depth, implementing custom solutions

### SCRIPTS_REFERENCE.md

Quick reference guide covering:
- All available scripts
- Usage examples
- Options and flags
- Common workflows
- Troubleshooting commands

**Best for:** Daily development tasks, quick lookups

### TROUBLESHOOTING_BUILD.md

Problem-solution guide covering:
- Common error messages
- Step-by-step solutions
- Diagnostic commands
- Preventive measures
- Emergency recovery

**Best for:** Fixing issues quickly, debugging problems

## 🎯 Getting Help

### Self-Service

1. **Check [TROUBLESHOOTING_BUILD.md](TROUBLESHOOTING_BUILD.md)** - Most issues are covered
2. **Run diagnostics** - `npm run validate`
3. **Search documentation** - Use Ctrl+F in the docs
4. **Check the main [README](../README.md)** - General project information

### Asking for Help

If you need to create an issue, include:

1. **Error message** - Full terminal output
2. **Validation output** - Result of `npm run validate`
3. **Configuration** - Contents of `tsconfig.app.json`
4. **Environment** - Node version, OS, npm version
5. **Steps to reproduce** - What you did before the error

## 🔄 Keeping Documentation Updated

This documentation is maintained alongside the codebase. When making changes:

1. **Update relevant docs** - Keep documentation in sync with code
2. **Add examples** - Show how to use new features
3. **Update troubleshooting** - Add solutions for new issues
4. **Test instructions** - Verify all commands work

## 📝 Contributing to Documentation

Improvements to documentation are always welcome! When contributing:

1. **Be clear and concise** - Use simple language
2. **Provide examples** - Show, don't just tell
3. **Test commands** - Ensure all code examples work
4. **Follow structure** - Match existing documentation style
5. **Update index** - Add new docs to this README

## 🏗️ Documentation Standards

### File Naming

- Use `SCREAMING_SNAKE_CASE.md` for documentation files
- Use descriptive names that indicate content
- Group related docs in subdirectories

### Content Structure

- Start with table of contents for long docs
- Use clear headings and subheadings
- Include code examples with syntax highlighting
- Add "Quick Start" sections for common tasks
- End with "Summary" or "Next Steps"

### Code Examples

```bash
# Always include comments
npm run clean  # Remove .js files from src/

# Show expected output when helpful
npm run validate
# Output:
# ✓ No .js files found in src/
# ✓ TypeScript noEmit is correctly set
```

### Formatting

- Use **bold** for emphasis
- Use `code` for commands, file names, and code
- Use > blockquotes for important notes
- Use tables for comparisons
- Use lists for steps or options

## 🔗 Related Resources

### Internal

- [Main README](../README.md) - Project overview
- [Package.json](../package.json) - Script definitions
- [TypeScript Config](../tsconfig.app.json) - TypeScript settings
- [Vite Config](../vite.config.ts) - Build configuration

### External

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://react.dev/)
- [Vitest Documentation](https://vitest.dev/)

## 📊 Documentation Metrics

- **Total documentation**: 4 main guides
- **Total pages**: ~100 pages equivalent
- **Code examples**: 50+ examples
- **Troubleshooting solutions**: 20+ common issues
- **Last updated**: 2026-01-17

## 🎓 Learning Path

### Beginner

1. Read main [README](../README.md)
2. Follow Quick Start in [BUILD_CONFIGURATION.md](BUILD_CONFIGURATION.md)
3. Try common workflows in [SCRIPTS_REFERENCE.md](SCRIPTS_REFERENCE.md)

### Intermediate

1. Study architecture in [BUILD_CONFIGURATION.md](BUILD_CONFIGURATION.md)
2. Learn all scripts in [SCRIPTS_REFERENCE.md](SCRIPTS_REFERENCE.md)
3. Practice troubleshooting with [TROUBLESHOOTING_BUILD.md](TROUBLESHOOTING_BUILD.md)

### Advanced

1. Understand implementation details in [BUILD_CONFIGURATION.md](BUILD_CONFIGURATION.md)
2. Customize scripts and configuration
3. Contribute to documentation and tooling

## 📞 Support

For questions or issues:

1. **Documentation** - Check this directory first
2. **GitHub Issues** - Search existing issues
3. **Create Issue** - Provide detailed information
4. **Email** - support@storycore-engine.com (if available)

---

**Last Updated:** January 17, 2026

**Maintained By:** StoryCore-Engine Development Team

**License:** MIT
