# 🎭 StoryCore Engine: Creative Studio

Welcome to the **Creative Studio**, the flagship professional interface for the StoryCore Engine. This studio provides a high-fidelity environment for cinematic storytelling, combining AI-assisted direction, 3D visualization, and professional sequence editing.

## 🚀 Key Features

### 🎬 AI Shot Wizard

- **Cinematic Vision**: Describe your scene in natural language, and let the AI propose framing, lighting, and composition.
- **Shot Duration Enforcement**: Minimum 4-second shots for consistent cinematic pacing.
- **Metadata-Rich**: Automatically tracks camera types (Extreme Wide to POV), lenses, and emotional intensity.

### 🧊 3D Production Preview

- **Real-time Visualization**: Preview your shots in a full 3D environment before rendering.
- **Camera Capturing**: Synchronize your 3D viewport with shot metadata for precise framing.
- **Adaptive Motion Paths**: AI-assisted speed mapping and dynamic action synchronization.

### 🎭 Character & World Orchestration

- **Casting Control**: Manage your digital actors with visual identity and personality profiles.
- **Location Management**: Organize your filming locations with atmospheric descriptors and visual prompts.
- **Moodboard Integration**: Keep your visual references synced across the entire production.

### 🎞️ Professional Sequence Editor

- **Multi-Track Timeline**: Edit video, audio, and text layers with frame-perfect precision.
- **Compact Director Mode**: Rapidly iterate on your sequence using a streamlined, glassmorphism-inspired interface.
- **Auto-Save & History**: Never lose progress with robust persistence and undo/redo support.

## 🛠️ Technical Stack

- **Frontend**: React 18+, TypeScript, Tailwind CSS
- **State Management**: Redux Toolkit (Timeline) & Zustand (Global Store)
- **3D Engine**: Three.js / WebGL
- **AI Integration**: Ollama (Local) & OpenAI (Remote)
- **Backend Bridge**: Electron for filesystem and system API access

## 🚦 Getting Started

1. **Prerequisites**:

   - Node.js 18+
   - [Ollama](https://ollama.com/) (for local AI features)

2. **Installation**:

   ```bash
   npm install
   ```

3. **Development**:

   ```bash
   npm run dev
   ```

## 💎 Recent Improvements (March 2026)

- **Shot Wizard Optimization**: Fixed TypeScript resolution for production shot types and metadata casting.
- **Safari Compatibility**: Added `-webkit-backdrop-filter` support across the entire glassmorphism UI.
- **Stability Fixes**: Resolved duplicate key issues in the Compact Director Panel and fixed project resume loading.
- **Data Integrity**: Enforced minimum shot durations and improved ID generation for new projects.

---

### Built with ❤️ by the StoryCore Team