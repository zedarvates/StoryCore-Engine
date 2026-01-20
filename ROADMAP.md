# StoryCore-Engine Development Roadmap

Welcome to the StoryCore-Engine public roadmap! This document provides visibility into our development direction, organized by timeline and priority.

**Last Updated:** January 20, 2026 at 12:19 PM

## About This Roadmap

This roadmap consolidates information from our internal technical specifications and presents it in a user-friendly format. Features are organized by:

- **Timeline Quarters**: When we plan to deliver capabilities
- **Priority Levels**: Which features are most critical
- **Categories**: Type of work (UI, Backend, Infrastructure, etc.)
- **Status**: Current implementation state

For detailed technical specifications, follow the links to individual feature documents.

## Table of Contents

- [Recently Completed](#recently-completed)
- [Future Considerations](#future-considerations)
- [Legend](#legend)

---

## Recently Completed

### UI

- ✅ **Wizard Navigation Fix** 🔴 `UI` - January 19-20, 2026
  - Fixed Sequence Plan Wizard and Shot Wizard navigation issues
  - Added proper state management and callbacks to ProductionWizardContainer
  - Navigation between wizard steps now works correctly
  - [View Completion Report](WIZARDS_NAVIGATION_FIX_FINAL.md)

- ✅ **Editor V3 Improvements** 🔴 `UI` - January 20, 2026
  - Removed duplicate menu bars in Video Editor
  - Fixed prompts loading from sequence data
  - Added TimelineTracks component for media editing (Video, Image, Audio, Text tracks)
  - Implemented prompt editing functionality
  - [View Completion Report](EDITOR_V3_IMPROVEMENTS_COMPLETE.md)

- ✅ **Editor Navigation Implementation** 🔴 `UI` - January 20, 2026
  - Implemented navigation from Dashboard to Video Editor
  - Created VideoEditorPage component with 3-column layout
  - Added project and sequence data loading
  - [View Completion Report](EDITOR_NAVIGATION_COMPLETE.md)

- ✅ **LLM Configuration Unification** 🔴 `UI` - January 20, 2026
  - Created unified LLM configuration service (llmConfigService.ts)
  - Implemented automatic migration from legacy storage systems
  - Fixed chatbox configuration synchronization with Settings
  - Corrected default model from 'local-model' to 'gemma2:2b'
  - Added React hook `useLLMConfig()` for easy integration
  - [View Completion Report](UNIFICATION_LLM_IMPLEMENTATION_COMPLETE.md)

### Planned Features

- 📋 **Auto-save Functionality** 🟡 `UI` - Q1 2026
  - Implement debounced auto-save for editor changes
  - Add save indicators and error handling
  - Integrate with Electron API for persistence

- 📋 **Grid Generation for Shots** 🟡 `UI` - Q1 2026
  - Add AI-powered image generation for sequence shots
  - Integrate with ComfyUI for grid-based generation
  - Support multiple prompts per sequence

- 📋 **Enhanced Drag & Drop** 🟡 `UI` - Q1 2026
  - Improve drag & drop functionality in timeline
  - Add snap-to-grid and visual feedback
  - Support multiple file types (video, audio, images)

- 📋 **Timeline Performance Optimization** 🟡 `UI` - Q1 2026
  - Implement virtual scrolling for large timelines
  - Add zoom controls and performance monitoring
  - Optimize rendering for 50+ shots

---

## Future Considerations

### Backend

- 🚧 **Requirements Document** 🔴 `Backend`
  [📋 View in Public Roadmap](../../ROADMAP.md#public-roadmap)
  [View Spec](.kiro/specs/public-roadmap)

- 🚧 **Requirements Document** 🔴 `Backend`
  [📋 View in Public Roadmap](../../ROADMAP.md#storycore-launcher-executable)
  [View Spec](.kiro/specs/storycore-launcher-executable)

- 📋 **Requirements Document: Microservices Migration with Service Mesh** 🔴 `Backend`
  [📋 View in Public Roadmap](../../ROADMAP.md#microservices-migration)
  [View Spec](.kiro/specs/microservices-migration)

- 🚧 **Video Engine Requirements Specification** 🟡 `Backend`
  [📋 View in Public Roadmap](../../ROADMAP.md#video-engine)
  [View Spec](.kiro/specs/video-engine)


### Documentation

- 📋 **Requirements Document** 🔴 `Documentation`
  [📋 View in Public Roadmap](../../ROADMAP.md#readme-revision-for-executable)
  [View Spec](.kiro/specs/readme-revision-for-executable)

- 🚧 **Requirements Document: Documentation Update** 🔴 `Documentation`
  [📋 View in Public Roadmap](../../ROADMAP.md#documentation-update)
  [View Spec](.kiro/specs/documentation-update)


### Migration

- 🚧 **Requirements Document** 🔴 `Migration`
  [📋 View in Public Roadmap](../../ROADMAP.md#project-structure-reorganization)
  [View Spec](.kiro/specs/project-structure-reorganization)


### Testing

- 🚧 **Document des Exigences - Optimisation des Formats de Grille** 🔴 `Testing`
  [📋 View in Public Roadmap](../../ROADMAP.md#grid-format-optimization)
  [View Spec](.kiro/specs/grid-format-optimization)

- 🚧 **Requirements Document** 🔴 `Testing`
  [📋 View in Public Roadmap](../../ROADMAP.md#professional-video-audio-quality)
  [View Spec](.kiro/specs/professional-video-audio-quality)

- 🚧 **Requirements Document** 🔴 `Testing`
  [📋 View in Public Roadmap](../../ROADMAP.md#technical-debt-remediation)
  [View Spec](.kiro/specs/technical-debt-remediation)

- 🚧 **Requirements Document - AI Enhancement Integration** 🔴 `Testing`
  [📋 View in Public Roadmap](../../ROADMAP.md#ai-enhancement)
  [View Spec](.kiro/specs/ai-enhancement)

- 🚧 **Test Suite Debugging - Requirements** 🔴 `Testing`
  [📋 View in Public Roadmap](../../ROADMAP.md#test-suite-debugging)
  [View Spec](.kiro/specs/test-suite-debugging)


### Tooling

- 🚧 **Document des Exigences - Améliorations Avancées de l'Éditeur de Grille** 🔴 `Tooling`
  [📋 View in Public Roadmap](../../ROADMAP.md#advanced-grid-editor-improvements)
  [View Spec](.kiro/specs/advanced-grid-editor-improvements)

- ✅ **Requirements Document** 🔴 `Tooling`
  [📋 View in Public Roadmap](../../ROADMAP.md#cli-modularization)
  [View Spec](.kiro/specs/cli-modularization)

- ✅ **Requirements Document** 🔴 `Tooling`
  [📋 View in Public Roadmap](../../ROADMAP.md#llm-chatbox-enhancement)
  [View Spec](.kiro/specs/llm-chatbox-enhancement)

- ✅ **Requirements Document** 🔴 `Tooling`
  [📋 View in Public Roadmap](../../ROADMAP.md#typescript-build-configuration)
  [View Spec](.kiro/specs/typescript-build-configuration)

- 🚧 **Requirements Document** 🔴 `Tooling`
  [📋 View in Public Roadmap](../../ROADMAP.md#typescript-build-errors-fix)
  [View Spec](.kiro/specs/typescript-build-errors-fix)

- 🚧 **Requirements Document: Advanced Grid Editor** 🔴 `Tooling`
  [📋 View in Public Roadmap](../../ROADMAP.md#advanced-grid-editor)
  [View Spec](.kiro/specs/advanced-grid-editor)

- 📋 **Requirements Document: Interactive Project Setup Wizard** 🔴 `Tooling`
  [📋 View in Public Roadmap](../../ROADMAP.md#interactive-project-setup)
  [View Spec](.kiro/specs/interactive-project-setup)


### UI

- 🚧 **Advanced ComfyUI Workflows Integration - Requirements** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#advanced-comfyui-workflows)
  [View Spec](.kiro/specs/advanced-comfyui-workflows)

- 📋 **Chatbox Internationalization Improvements** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#chatbox-i18n-improvements)
  [View Spec](.kiro/specs/chatbox-i18n-improvements)

- 🚧 **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#central-configuration-ui)
  [View Spec](.kiro/specs/central-configuration-ui)

- 🚧 **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#comfyui-installation-wizard)
  [View Spec](.kiro/specs/comfyui-installation-wizard)

- 🚧 **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#comfyui-integration)
  [View Spec](.kiro/specs/comfyui-integration)

- ✅ **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#creative-studio-ui)
  [View Spec](.kiro/specs/creative-studio-ui)

- ✅ **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#editor-wizard-integration)
  [View Spec](.kiro/specs/editor-wizard-integration)

- 🚧 **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#native-file-dialog-enforcement)
  [View Spec](.kiro/specs/native-file-dialog-enforcement)

- 🚧 **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#native-file-dialog-integration)
  [View Spec](.kiro/specs/native-file-dialog-integration)

- 🚧 **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#project-setup-wizard)
  [View Spec](.kiro/specs/project-setup-wizard)

- 🚧 **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#ui-configuration-wizards)
  [View Spec](.kiro/specs/ui-configuration-wizards)

- 🚧 **Requirements Document** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#ui-reconstruction)
  [View Spec](.kiro/specs/ui-reconstruction)

- 🚧 **Requirements Document: Character Setup Wizard** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#character-setup-wizard)
  [View Spec](.kiro/specs/character-setup-wizard)

- 📋 **Requirements Document: Production Wizards** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#production-wizards)
  [View Spec](.kiro/specs/production-wizards)

- 📋 **Requirements Document: TOS Dialog Internationalization** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#tos-dialog-i18n)
  [View Spec](.kiro/specs/tos-dialog-i18n)

- 🚧 **Requirements Document: Wizard Forms Integration** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#wizard-forms-integration)
  [View Spec](.kiro/specs/wizard-forms-integration)

- 📋 **Requirements: Sequence Plan & Shot Wizard Modal Integration** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#wizard-modal-integration)
  [View Spec](.kiro/specs/wizard-modal-integration)

- 🚧 **Wizard Prompt Library Integration - Requirements** 🔴 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#wizard-prompt-library-integration)
  [View Spec](.kiro/specs/wizard-prompt-library-integration)

- 🚧 **Requirements Document** 🟡 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#terms-of-service-dialog)
  [View Spec](.kiro/specs/terms-of-service-dialog)

- 📋 **Requirements Document** 🟡 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#tos-dialog-improvements)
  [View Spec](.kiro/specs/tos-dialog-improvements)

- 📋 **Requirements Document: Character Casting System** 🟡 `UI`
  [📋 View in Public Roadmap](../../ROADMAP.md#character-casting-system)
  [View Spec](.kiro/specs/character-casting-system)


---

## Legend

### Status Indicators

- ✅ **Completed**: Feature is fully implemented and tested
- 🚧 **In Progress**: Feature is currently being developed
- 📋 **Planned**: Feature is scheduled for development
- 💡 **Future Considerations**: Feature is under consideration for future releases

### Priority Levels

- 🔴 **High Priority**: Critical features for core functionality
- 🟡 **Medium Priority**: Important features for enhanced capabilities
- 🟢 **Low Priority**: Nice-to-have features and optimizations

### Categories

- `UI`: User interface and creative studio components
- `Backend`: Core engine and processing logic
- `Infrastructure`: System architecture and deployment
- `Documentation`: User guides and technical documentation
- `Testing`: Test suites and quality assurance
- `Tooling`: Development tools and CLI commands
- `Migration`: Code refactoring and modernization

---

## Additional Resources

- **[CHANGELOG.md](CHANGELOG.md)**: View completed features and release history
- **[Contributing Guidelines](CONTRIBUTING.md)**: Learn how to contribute to StoryCore-Engine
- **[Technical Specs](.kiro/specs/)**: Browse detailed internal specifications

---

*This roadmap is automatically generated from internal specifications and updated regularly. For questions or suggestions, please open an issue on GitHub.*
