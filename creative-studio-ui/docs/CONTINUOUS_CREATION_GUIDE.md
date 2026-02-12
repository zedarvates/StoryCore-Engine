# Continuous Creation Feature Guide

Welcome to the comprehensive user documentation for the Continuous Creation feature in StoryCore Creative Studio. This guide will walk you through all aspects of the feature, from basic concepts to advanced techniques.

## Table of Contents

1. [Getting Started Guide](#1-getting-started-guide)
2. [Three-Level Reference System](#2-three-level-reference-system)
3. [Video Replication](#3-video-replication)
4. [Style Transfer](#4-style-transfer)
5. [Project Branching](#5-project-branching)
6. [Episode References](#6-episode-references)
7. [Cross-Shot References](#7-cross-shot-references)
8. [Visual Consistency Check](#8-visual-consistency-check)
9. [Tips and Best Practices](#9-tips-and-best-practices)
10. [Troubleshooting](#10-troubleshooting)
11. [Keyboard Shortcuts Reference](#11-keyboard-shortcuts-reference)

---

## 1. Getting Started Guide

### 1.1 Overview of Continuous Creation

The Continuous Creation feature is a powerful workflow enhancement designed to maintain visual consistency and creative coherence across your entire video project. It enables you to create, manage, and propagate reference materials through multiple levels of your project hierarchy, ensuring that characters, environments, and styles remain consistent from the first shot to the last.

This feature addresses one of the most challenging aspects of video production: maintaining visual continuity across long-form content. Whether you're creating a series of connected episodes, a documentary with multiple segments, or any project requiring consistent visual elements, Continuous Creation provides the tools you need to achieve professional results.

**Key Benefits:**
- **Visual Consistency**: Ensure characters, settings, and styles remain consistent throughout your project
- **Efficient Workflow**: Propagate reference materials across multiple shots with a single action
- **Creative Flexibility**: Experiment with branches without affecting your main project
- **Cross-Project Reusability**: Link to previous episodes and inherit their reference materials
- **Quality Assurance**: Built-in visual consistency checks to catch issues early

### 1.2 Menu Access

The Continuous Creation feature is accessible through the main menu bar in Creative Studio. Follow these steps to access the various components:

1. **Open Creative Studio** and load your project
2. **Navigate to the menu bar** at the top of the application window
3. **Click on "Continuous Creation"** to reveal the feature menu

```
┌─────────────────────────────────────────────────────────────────┐
│  File  Edit  View  Project  Window  Help                         │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ▶ Reference Sheets                                             │
│  ▶ Video Replication                                            │
│  ▶ Style Transfer                                               │
│  ▶ Project Branching                                            │
│  ▶ Episode References                                           │
│  ▶ Cross-Shot References                                        │
│  ▶ Visual Consistency Check                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Menu Options:**

| Menu Item | Description | Shortcut |
|-----------|-------------|----------|
| Reference Sheets | Manage Master, Sequence, and Shot reference sheets | `Ctrl+Shift+R` |
| Video Replication | Upload and process reference videos with Digital Human | `Ctrl+Shift+V` |
| Style Transfer | Apply visual styles from reference images | `Ctrl+Shift+S` |
| Project Branching | Create and manage project branches | `Ctrl+Shift+B` |
| Episode References | Link and inherit from previous episodes | `Ctrl+Shift+E` |
| Cross-Shot References | Browse and borrow from other shots | `Ctrl+Shift+C` |
| Visual Consistency Check | Run validation on visual elements | `Ctrl+Shift+K` |

### 1.3 Prerequisites

Before using the Continuous Creation feature, ensure your environment meets the following requirements:

**System Requirements:**
- Creative Studio version 2.0 or later
- Minimum 16GB RAM (32GB recommended for video processing)
- GPU with at least 4GB VRAM for style transfer operations
- Stable internet connection for cloud-based processing features
- Minimum 10GB free disk space for reference storage

**Project Setup Requirements:**
- Project must be in "Active" status
- User must have "Editor" or "Admin" permissions
- At least one sequence must exist in the project
- For Episode References: Previous episodes must be imported into the project

**Recommended Pre-Configuration:**
1. **Organize your reference materials** before starting (images, videos, style references)
2. **Plan your project hierarchy** (Master → Sequence → Shot structure)
3. **Ensure consistent naming conventions** for easy reference management
4. **Back up your project** before using Project Branching features

---

## 2. Three-Level Reference System

### 2.1 Introduction to the Three-Level System

The Three-Level Reference System is the foundation of Continuous Creation. It establishes a hierarchical structure that ensures visual consistency while allowing flexibility at each level. Understanding this system is crucial for effective use of all Continuous Creation features.

**The Hierarchy:**

```
┌─────────────────────────────────────────────────────────────┐
│                    MASTER REFERENCE                         │
│                    (Project Level)                          │
│    Defines global standards for entire project              │
│    - Character designs                                      │
│    - Environment styles                                     │
│    - Color palettes                                         │
│    - Lighting conventions                                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  SEQUENCE REFERENCE                          │
│                   (Sequence Level)                           │
│    Inherits from Master, adds sequence-specific elements     │
│    - Character poses unique to sequence                     │
│    - Sequence-specific environments                         │
│    - Props and objects                                      │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SHOT REFERENCE                            │
│                    (Shot Level)                              │
│    Inherits from Sequence, shot-specific details            │
│    - Specific camera angles                                 │
│    - Lighting setups                                        │
│    - Expression variations                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Master Reference Sheet

The Master Reference Sheet is the top-level reference document that defines the global visual standards for your entire project. All sequences and shots inherit from this sheet, making it the single source of truth for project-wide consistency.

#### 2.2.1 Creating a Master Reference Sheet

1. **Navigate to Continuous Creation → Reference Sheets**
2. **Click "Create New Master Sheet"**
3. **Fill in the required information:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Create Master Reference Sheet              │
├─────────────────────────────────────────────────────────────┤
│  Sheet Name: [____________________] (e.g., "Series Master")  │
│                                                              │
│  Description: [________________________________]             │
│  (Optional description of scope and purpose)                │
│                                                              │
│  Character References:                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Drag and drop character images here                     │ │
│  │ or click "Add Character Reference"                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Environment/World References:                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Drag and drop environment images here                    │ │
│  │ or click "Add Environment Reference"                     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Color Palette:                                              │
│  │ [Primary] [Secondary] [Accent] [Background]             │
│  │ Click to customize each color                            │
│                                                              │
│  Lighting Style:                                             │
│  │ ☑ Daylight  ☐ Night  ☐ Mixed  ☐ Custom                  │
│  │                                                            │
│  └─────────────────────────────────────────────────────────────┘
│                                                              │
│  [Cancel]                                    [Create Sheet] │
└─────────────────────────────────────────────────────────────┘
```

4. **Add character references** by dragging images into the designated area
5. **Add environment references** similarly
6. **Configure the color palette** by clicking on each color swatch
7. **Select lighting style** that matches your project's aesthetic
8. **Click "Create Sheet"** to save

#### 2.2.2 Editing Master Reference Sheets

To modify an existing Master Reference Sheet:

1. **Go to Continuous Creation → Reference Sheets**
2. **Select "Master Sheets"** from the tabs
3. **Click on the sheet you wish to edit**
4. **Make desired changes** using the editor interface
5. **Click "Save Changes"** when finished

**Editable Elements:**

| Element | Description | Best Practice |
|---------|-------------|---------------|
| Character Images | Primary character designs | Include front, side, and 3/4 views |
| Environment Images | Key locations and settings | Show multiple angles and lighting conditions |
| Color Palette | Project-wide color scheme | Use consistent color relationships |
| Lighting Notes | General lighting guidelines | Document time of day and mood preferences |
| Style Notes | Overall aesthetic direction | Reference artistic influences |

#### 2.2.3 Setting Global Style Standards

The Global Style section in your Master Reference Sheet establishes the overarching aesthetic direction. This section includes:

- **Art Style**: Choose between realistic, stylized, anime, or custom approaches
- **Aspect Ratio**: Set project-wide aspect ratio preferences
- **Color Grading**: Define the overall color treatment
- **Texture Style**: Establish texture approaches (smooth, rough, stylized)
- **Rendering Quality**: Set minimum quality standards

```
┌─────────────────────────────────────────────────────────────┐
│                      Global Style Standards                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Art Style:                                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │  Realistic  │ │  Stylized   │ │    Anime    │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
│                                                              │
│  Aspect Ratio: [16:9] ▼                                      │
│                                                              │
│  Color Grading:                                              │
│  │ ☑ Warm Tones  ☐ Cool Tones  ☐ Desaturated  ☐ Vibrant   │
│  │                                                            │
│  Texture Style: [Smooth] ▼                                   │
│                                                              │
│  Rendering Quality: [High] ▼                                 │
│                                                              │
│  [Save Global Standards]                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Sequence Reference Sheet

Sequence Reference Sheets inherit from the Master Reference Sheet while adding elements specific to individual sequences. This layer allows you to customize references for different parts of your project while maintaining overall consistency.

#### 2.3.1 Creating a Sequence Reference Sheet

1. **Ensure a Master Reference Sheet exists** for your project
2. **Navigate to Continuous Creation → Reference Sheets**
3. **Select "Sequence Sheets"** tab
4. **Click "Create New Sequence Sheet"**
5. **Complete the creation form:**

```
┌─────────────────────────────────────────────────────────────┐
│                   Create Sequence Reference Sheet            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Sequence Name: [____________________] (e.g., "Episode 1")  │
│                                                              │
│  Parent Master Sheet: [Series Master] ▼                      │
│  (Inherited elements shown below)                           │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Inherited from Master:                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ☑ 3 Character References                                │ │
│  │ ☑ 5 Environment References                              │ │
│  │ ☑ Color Palette (4 colors)                              │ │
│  │ ☑ Lighting Style: Daylight                              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Sequence-Specific Additions:                                │
│                                                              │
│  New Character Poses:                                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Drag and drop pose images here                           │ │
│  │ (These will be available for all shots in this sequence) │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Sequence Environments:                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Additional location images specific to this sequence     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Props & Objects:                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Add reference images for props unique to this sequence   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Lighting Notes:                                             │
│  │ [________________________________________________]       │
│  │ Specific lighting for this sequence's scenes             │
│                                                              │
│  [Cancel]                                    [Create Sheet]  │
└─────────────────────────────────────────────────────────────┘
```

6. **Review inherited elements** (they're automatically included)
7. **Add sequence-specific content** as needed
8. **Click "Create Sheet"** to save

#### 2.3.2 Inheritance Behavior

Understanding how inheritance works helps you use the system more effectively:

**What is Inherited Automatically:**
- All character references from the Master Sheet
- All environment references from the Master Sheet
- The complete color palette
- Lighting style guidelines
- Global style standards

**What You Can Override:**
- Add new character poses (supplements, doesn't replace)
- Add new environments (supplements, doesn't replace)
- Add sequence-specific props and objects
- Document sequence-specific lighting notes
- Add detailed style variations for the sequence

**Inheritance Visualization:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Inheritance Chain                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Master Sheet "Series Master"                              │
│   ┌─────────────────────────────────────────────────────┐    │
│   │ Character: Hero_Central.jpg                         │    │
│   │ Character: Hero_Profile.jpg                        │    │
│   │ Character: Villain_Main.jpg                        │    │
│   │ Environment: City_Overview.jpg                     │    │
│   │ Environment: Forest_Main.jpg                        │    │
│   │ Colors: [Red, Blue, Green, Yellow]                 │    │
│   └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            │ inherits                       │
                            ▼                                  │
│   Sequence Sheet "Episode 1"                                │
│   ┌─────────────────────────────────────────────────────┐    │
│   │ [INHERITED] Character: Hero_Central.jpg             │    │
│   │ [INHERITED] Character: Hero_Profile.jpg             │    │
│   │ [INHERITED] Character: Villain_Main.jpg              │    │
│   │ [INHERITED] Environment: City_Overview.jpg          │    │
│   │ [INHERITED] Environment: Forest_Main.jpg            │    │
│   │ [INHERITED] Colors: [Red, Blue, Green, Yellow]      │    │
│   │                                                     │    │
│   │ [NEW] Character: Hero_ActionPose.jpg               │    │
│   │ [NEW] Environment: Episode1_SecretBase.jpg         │    │
│   │ [NEW] Prop: Ancient_Scepter.jpg                     │    │
│   └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            │ inherits                       │
                            ▼                                  │
│   Shot Reference "Shot_001"                                 │
│   ┌─────────────────────────────────────────────────────┐    │
│   │ [INHERITED] All above references available          │    │
│   │                                                     │    │
│   │ [SHOT SPECIFIC] Camera angle: Low wide shot        │    │
│   │ [SHOT SPECIFIC] Lighting: Golden hour, warm         │    │
│   │ [SHOT SPECIFIC] Expression: Determined              │    │
│   └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 Shot Reference

Shot References are the most granular level of the hierarchy. They inherit from Sequence Reference Sheets and add shot-specific details like camera angles, precise lighting setups, and expression variations.

#### 2.4.1 Creating Shot References

1. **Open a sequence** in the Sequence Editor
2. **Select the shot** you want to create a reference for
3. **Open the Shot Reference panel** from the right sidebar
4. **Click "Create Shot Reference"**

```
┌─────────────────────────────────────────────────────────────┐
│                      Create Shot Reference                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Shot Name: [Shot_001_City_Park_Morning]                    │
│                                                              │
│  Parent Sequence: [Episode 1 - Sequence Reference] ▼        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Inherited References (from Sequence):                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ☑ All 3 Characters from Master                          │ │
│  │ ☑ All Environments from Master & Sequence               │ │
│  │ ☑ All Props from Sequence                               │ │
│  │ ☑ Color Palette                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Shot-Specific Details:                                      │
│                                                              │
│  Camera Setup:                                               │
│  │ Angle: [Low Angle] ▼                                    │
│  │ Distance: [Medium Close-Up] ▼                           │
│  │ Movement: [Static] ▼                                    │
│  │ Lens: [50mm]                                            │
│                                                              │
│  Lighting Setup:                                             │
│  │ Type: [Natural] ▼                                       │
│  │ Time of Day: [Morning - Golden Hour]                    │
│  │ Mood: [Warm, Hopeful]                                   │
│  │ Additional Lights: [None]                               │
│                                                              │
│  Expression/Action:                                          │
│  │ [Hero walking confidently through park]                  │
│  │                                                          │
│  │ Expression Reference Image:                              │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ [📁 Upload Image]                                    │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│                                                              │
│  Composition Notes:                                          │
│  │ [Hero on left 1/3, park bench right 2/3, depth of      │ │
│  │  field on character]                                    │ │
│                                                              │
│  [Cancel]                                     [Create Shot] │
└─────────────────────────────────────────────────────────────┘
```

5. **Fill in shot-specific details** as shown above
6. **Upload expression/action reference images** if applicable
7. **Add composition notes** for production guidance
8. **Click "Create Shot"** to save

#### 2.4.2 Managing Shot References

**Viewing Available References:**

When working on a shot, you can access all inherited references through the Shot Reference panel:

```
┌─────────────────────────────────────────────────────────────┐
│                        Shot Reference Panel                  │
├─────────────────────────────────────────────────────────────┤
│  Shot: Shot_001_City_Park_Morning                            │
│                                                              │
│  ┌─ INHERITED REFERENCES ─────────────────────────────────┐ │
│  │                                                           │ │
│  │ CHARACTERS (inherited from Master)                       │ │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐                      │ │
│  │ │  Hero   │ │ Villain │ │ Sidekick│                      │ │
│  │ │ [img]   │ │  [img]  │ │  [img]  │                      │ │
│  │ └─────────┘ └─────────┘ └─────────┘                      │ │
│  │                                                           │ │
│  │ ENVIRONMENTS (inherited from Master & Sequence)          │ │
│  │ ┌─────────┐ ┌─────────┐ ┌─────────┐                      │ │
│  │ │  City   │ │ Forest  │ │ Episode1│                      │ │
│  │ │ [img]   │ │  [img]  │ │  Base   │                      │ │
│  │ └─────────┘ └─────────┘ └─────────┘                      │ │
│  │                                                           │ │
│  │ PROPS (from Sequence)                                    │ │
│  │ ┌─────────┐                                              │ │
│  │ │Sceptre  │                                              │ │
│  │ │  [img]  │                                              │ │
│  │ └─────────┘                                              │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ SHOT SPECIFIC ─────────────────────────────────────────┐ │
│  │                                                           │ │
│  │ Expression: [Determined]                                 │ │
│  │ Camera: [Low Angle, Medium Close-Up]                     │ │
│  │ Lighting: [Golden Hour, Warm]                            │ │
│  │                                                          │ │
│  │ [📁 Add Shot-Specific Reference]                        │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Export References]  [Sync to AI]  [Visual Check]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.5 Inheritance Visualization

The system provides multiple ways to visualize and understand the inheritance chain:

#### 2.5.1 Visual Inheritance Diagram

1. **Open any reference sheet** (Master, Sequence, or Shot)
2. **Click the "Inheritance" tab** in the sheet viewer
3. **View the visual diagram** showing the complete inheritance chain

```
┌─────────────────────────────────────────────────────────────┐
│                    Inheritance Visualization                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│    [MASTER]                                                  │
│    ┌──────────┐                                              │
│    │  ★       │ Series Master                               │
│    └────┬─────┘                                              │
│         │                                                    │
│         │ inherits                                          │
│         ▼                                                    │
│    [SEQUENCE]                                                │
│    ┌──────────┐                                             │
│    │  ◆       │ Episode 1                                    │
│    │  Inherits │ 3 Characters, 5 Environments, 1 Prop       │
│    │   from ★  │                                             │
│    └────┬─────┘                                             │
│         │                                                   │
│         │ inherits                                           │
│         ▼                                                   │
│    [SHOT]                                                    │
│    ┌──────────┐                                             │
│    │  ●       │ Shot_001                                     │
│    │  Inherits │ All above + shot-specific details          │
│    │   from ◆  │                                             │
│    └──────────┘                                             │
│                                                              │
│  Legend:                                                     │
│  ★ = Master Reference Sheet                                  │
│  ◆ = Sequence Reference Sheet                                │
│  ● = Shot Reference                                          │
│                                                              │
│  [Zoom In] [Zoom Out] [Reset View] [Export Diagram]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### 2.5.2 Inheritance Summary Report

Access a detailed text-based report:

1. **Right-click any reference sheet**
2. **Select "View Inheritance Report"**
3. **Review the complete inheritance chain**

**Example Report:**

```
═══════════════════════════════════════════════════════════════
                    INHERITANCE SUMMARY REPORT
═══════════════════════════════════════════════════════════════

Shot: Shot_001_City_Park_Morning
Parent Sequence: Episode 1
Parent Master: Series Master

────────────────────────────
INHERITED ELEMENTS:
────────────────────────────

CHARACTERS (3 total)
├── Hero_Central.jpg (Master)
├── Hero_Profile.jpg (Master)
└── Villain_Main.jpg (Master)

ENVIRONMENTS (5 total)
├── City_Overview.jpg (Master)
├── Forest_Main.jpg (Master)
├── Episode1_SecretBase.jpg (Sequence - Added)
└── City_Park_Day.jpg (Sequence - Added)

PROPS (1 total)
└── Ancient_Scepter.jpg (Sequence)

COLOR PALETTE (4 colors)
├── Primary: #FF4444 (Red)
├── Secondary: #4444FF (Blue)
├── Accent: #44FF44 (Green)
└── Background: #FFFF44 (Yellow)

LIGHTING STYLE
└── Daylight (Master) + Golden Hour Override (Shot)

────────────────────────────
SHOT-SPECIFIC ELEMENTS:
────────────────────────────
├── Camera: Low Angle, Medium Close-Up
├── Lighting: Golden Hour, Warm
├── Expression: Determined
└── Composition: Rule of thirds, depth of field

═══════════════════════════════════════════════════════════════
```

---

## 3. Video Replication

### 3.1 Overview

Video Replication is a powerful feature that uses Digital Human technology to replicate movements, expressions, and gestures from reference videos onto your project's characters. This feature is invaluable for creating consistent character performances and complex motion sequences.

**Key Capabilities:**
- Extract and replicate human movement from reference footage
- Apply performances to different characters
- Preserve emotional nuance and timing
- Generate multiple takes from single reference
- Integrate with existing animation workflows

### 3.2 Uploading Reference Videos

1. **Access Video Replication**: Continuous Creation → Video Replication
2. **Click "Upload Reference Video"**
3. **Select your video file** from the file dialog

**Supported Formats:**

| Format | Codec | Max Resolution | Max Duration |
|--------|-------|----------------|---------------|
| MP4 | H.264, H.265 | 4K (3840x2160) | 60 minutes |
| MOV | ProRes, DNxHD | 4K (3840x2160) | 60 minutes |
| AVI | Uncompressed | 1080p | 30 minutes |
| WebM | VP9 | 1080p | 30 minutes |

**Upload Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│                      Video Replication                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Reference Videos                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │    ┌─────────────────────────────────────────────┐      │ │
│  │    │                                             │      │ │
│  │    │           [ DROP VIDEO HERE ]               │      │ │
│  │    │                                             │      │ │
│  │    │         or click to browse                  │      │ │
│  │    │                                             │      │ │
│  │    │  Supported: MP4, MOV, AVI, WebM            │      │ │
│  │    │  Max size: 2GB per file                     │      │ │
│  │    │                                             │      │ │
│  │    └─────────────────────────────────────────────┘      │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Uploaded Videos:                                            │
│  ┌─────────┬────────────────────┬─────────────┬──────────┐  │
│  │ Name    │ Duration          │ Resolution  │ Status   │  │
│  ├─────────┼────────────────────┼─────────────┼──────────┤  │
│  │ Walk_Ref│ 00:00:15           │ 1920x1080   │ ✓ Ready  │  │
│  │ Gesture_│ 00:00:08           │ 1920x1080   │ ✓ Ready  │  │
│  │ Expres_1│ 00:00:12           │ 1920x1080   │ ⏳ Proc. │  │
│  └─────────┴────────────────────┴─────────────┴──────────┘  │
│                                                              │
│  [Upload More]  [Manage Videos]  [Start Replication]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

4. **Wait for upload completion** (progress bar shown)
5. **Video status changes to "Ready"** when processing is complete

**Best Practices for Reference Videos:**
- Use good, even lighting on the reference subject
- Film at the same aspect ratio as your target output
- Include the full body for movement references
- Keep the camera steady or use a tripod
- Capture multiple angles for complex movements
- Record at 30fps or higher for smooth replication

### 3.3 Configuring Digital Human Settings

After uploading your reference video, configure the Digital Human settings for optimal replication:

1. **Click "Configure"** next to your uploaded video
2. **Adjust the following settings:**

```
┌─────────────────────────────────────────────────────────────┐
│                  Digital Human Configuration                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Reference Video: Walk_Ref.mp4                               │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  TARGET CHARACTER                                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Character: [Hero_Main] ▼                                │ │
│  │                                                          │ │
│  │ Note: Character must have rigging for best results      │ │
│  │ [View Character Setup]                                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  REPLICATION OPTIONS                                          │
│                                                              │
│  Motion Transfer:                                            │
│  │ ☑ Body Movements                                        │ │
│  │ ☑ Arm/Hand Gestures                                     │ │
│  │ ☑ Facial Expressions                                    │ │
│  │ ☐ Neck/Head Movement                                    │ │
│                                                              │
│  Expression Intensity:                                       │
│  │ 0% ─────●────────── 50% ─────●────────── 100%           │
│  │    Natural          Balanced          Exaggerated       │
│                                                              │
│  Style Matching:                                             │
│  │ ☑ Preserve character style                              │ │
│  │ ☐ Adapt to reference proportions                         │ │
│                                                              │
│  Smoothing:                                                  │
│  │ 0% ─────●────────── 50% ─────●────────── 100%          │
│  │    Raw            Medium            Heavy               │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  OUTPUT SETTINGS                                              │
│                                                              │
│  Resolution: [Match Source] ▼                                │
│  Framerate: [Match Source] ▼                                 │
│  Format: [MP4 with Alpha] ▼                                  │
│                                                              │
│  [Cancel]                                [Apply Settings]    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Configuration Options Explained:**

| Setting | Description | Recommended For |
|---------|-------------|-----------------|
| Body Movements | Replicate full body motion | Walking, running, dancing |
| Arm/Hand Gestures | Capture hand and arm motion | Dialogue scenes, interactions |
| Facial Expressions | Transfer facial performances | Emotional scenes, close-ups |
| Neck/Head Movement | Include head rotation and tilt | Over-the-shoulder shots |
| Expression Intensity | Controls emotional strength | Matching subtle vs dramatic |
| Style Matching | Preserves character proportions | Maintaining character identity |
| Smoothing | Reduces jitter and noise | Lower quality source footage |

### 3.4 Starting Replication

Once your video is uploaded and settings are configured, start the replication process:

1. **Select the reference video** from your uploaded list
2. **Verify configuration** settings are correct
3. **Click "Start Replication"**
4. **Confirm the action** in the dialog

```
┌─────────────────────────────────────────────────────────────┐
│                      Start Replication                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Reference Video: Walk_Ref.mp4 (15 seconds)                  │
│  Target Character: Hero_Main                                 │
│                                                              │
│  Estimated Processing Time: ~3 minutes                       │
│  Estimated Output Size: ~150 MB                              │
│                                                              │
│  ⚠ This will create a new animation asset in your project   │
│                                                              │
│  [Cancel]                          [Confirm & Start]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Monitoring Progress

Track the progress of your replication jobs:

```
┌─────────────────────────────────────────────────────────────┐
│                    Replication Progress                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Active Jobs                                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Job ID: REP-2024-001                                    │ │
│  │ Video: Walk_Ref.mp4 → Hero_Main                        │ │
│  │ Status: ████████████░░░░░░░ 67%                       │ │
│  │                                                         │ │
│  │ Stage: Facial Expression Transfer                      │ │
│  │ Elapsed: 00:01:45 / Estimated: 00:03:00                │ │
│  │                                                         │ │
│  │ [Cancel Job]  [View Details]                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Completed Jobs                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ✓ Gesture_Ref.mp4 → Hero_Main (completed 2 min ago)    │ │
│  │   [View Result]  [Apply to Shot]  [Download]            │ │
│  │                                                         │ │
│  │ ✓ Expres_1.mp4 → Hero_Main (completed 5 min ago)       │ │
│  │   [View Result]  [Apply to Shot]  [Download]            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Clear Completed]  [Export All Results]                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Progress Stages:**

1. **Initialization** (0-5%): Loading video and character assets
2. **Pose Extraction** (5-25%): Analyzing reference for key poses
3. **Motion Tracking** (25-50%): Following movement through frames
4. **Expression Analysis** (50-75%): Extracting facial data
5. **Transfer & Synthesis** (75-95%): Applying motion to character
6. **Final Rendering** (95-100%): Creating output video

---

## 4. Style Transfer

### 4.1 Overview

Style Transfer allows you to apply the visual characteristics of reference images to your shots, creating consistent artistic treatments across your project. This feature is perfect for establishing a unified visual style or experimenting with different artistic approaches.

**Use Cases:**
- Creating consistent color grading across episodes
- Applying specific art styles (watercolor, oil paint, comic)
- Matching the aesthetic of source material
- Creating stylistic variations for different sequences
- Establishing mood through color and texture

### 4.2 Uploading Style Reference Images

1. **Access Style Transfer**: Continuous Creation → Style Transfer
2. **Click "Add Style Reference"**
3. **Select your reference image(s)**

**Supported Formats:**

| Format | Max Resolution | Color Space |
|--------|----------------|-------------|
| JPG/JPEG | 8192x8192 | sRGB, Adobe RGB |
| PNG | 8192x8192 | sRGB, RGBA |
| TIFF | 8192x8192 | sRGB, CMYK |
| PSD | 8192x8192 | All Photoshop modes |
| WebP | 4096x4096 | sRGB |

**Upload Interface:**

```
┌─────────────────────────────────────────────────────────────┐
│                       Style Transfer                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Style References                                            │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │    ┌─────────────────────────────────────────────┐      │ │
│  │    │                                             │      │ │
│  │    │         [ DROP IMAGES HERE ]                │      │ │
│  │    │                                             │      │ │
│  │    │       or click to browse                    │      │ │
│  │    │                                             │      │ │
│  │    │  Supported: JPG, PNG, TIFF, PSD, WebP      │      │ │
│  │    │  Max size: 100MB per file                   │      │ │
│  │    │                                             │      │ │
│  │    └─────────────────────────────────────────────┘      │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Library of Style References                                 │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [img] Watercolor_Sky.jpg          [Delete] [Preview]   │ │
│  │     Style: Watercolor Painting                            │ │
│  │     Colors: Soft blues, purples                           │ │
│  │                                                          │ │
│  │ [img] Noir_City.png               [Delete] [Preview]     │ │
│  │     Style: Film Noir                                      │ │
│  │     Colors: High contrast B&W                             │ │
│  │                                                          │ │
│  │ [img] Comic_Bold.png              [Delete] [Preview]     │ │
│  │     Style: Comic Book                                     │ │
│  │     Colors: Bold primaries                                │ │
│  │                                                          │ │
│  │ [+ Add New Style]                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Applying Style to Target Shots

1. **Select a style reference** from your library
2. **Click "Apply to Shots"**
3. **Choose target shots** from your project

```
┌─────────────────────────────────────────────────────────────┐
│                      Apply Style Transfer                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Style Reference: Watercolor_Sky.jpg                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ [img preview of selected style]                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Select Target Shots:                                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ☑ Episode 1                                            │ │
│  │   ☑ Shot_001_City_Park_Morning                         │ │
│  │   ☑ Shot_002_City_Park_Noon                            │ │
│  │   ☑ Shot_003_City_Park_Evening                         │ │
│  │   ☐ Shot_004_City_Park_Night                           │ │
│  │                                                          │ │
│  │ ☑ Episode 2                                            │ │
│  │   ☐ All Shots in Episode 2                             │ │
│  │                                                          │ │
│  │ [Select All]  [Clear Selection]                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Transfer Strength:                                          │
│  │ 0% ─────●────────── 50% ─────●────────── 100%          │ │
│  │    Original        Balanced         Full Style          │
│  │                                                          │ │
│  Preserve Content:                                           │
│  │ ☑ Keep original composition                             │ │
│  │ ☑ Preserve character features                            │ │
│  │                                                          │ │
│  [Cancel]                              [Apply Style]         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Transfer Strength Options:**

| Strength | Effect | Use Case |
|----------|--------|----------|
| 0-25% | Subtle influence | Color grading tweaks |
| 25-50% | Balanced blend | Moderate style influence |
| 50-75% | Strong influence | Clear stylistic treatment |
| 75-100% | Dominant style | Complete artistic reinterpretation |

### 4.4 Previewing Results

Before applying a style to your final project, use the preview feature to see how it will affect your shots:

1. **Click "Preview"** on a style reference
2. **Select a shot** to preview on
3. **View comparison** between original and styled versions

```
┌─────────────────────────────────────────────────────────────┐
│                      Style Preview                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Style: Watercolor_Sky.jpg                                   │
│  Shot: Shot_001_City_Park_Morning                            │
│  Strength: 75%                                              │
│                                                              │
│  ┌──────────────────────┬──────────────────────┐            │
│  │      ORIGINAL        │      WITH STYLE       │            │
│  │                      │                       │            │
│  │   [render preview]   │   [render preview]    │            │
│  │                      │                       │            │
│  │                      │                       │            │
│  └──────────────────────┴──────────────────────┘            │
│                                                              │
│  Adjust Strength:                                            │
│  │ 0% ─────●────────── 50% ─────●────────── 100%            │
│                                                              │
│  [Apply to Shot]  [Apply to All Selected]  [Close]          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Preview Tips:**
- Always preview on multiple shots before applying
- Check how the style affects skin tones
- Verify character visibility is maintained
- Test different strength levels
- Preview with different time-of-day shots

---

## 5. Project Branching

### 5.1 Overview

Project Branching allows you to create parallel versions of your project, enabling experimentation without affecting your main work. This feature is essential for creative exploration, testing different directions, and managing production variations.

**Key Capabilities:**
- Create branches from any point in your project
- Switch between branches seamlessly
- Merge branches back into the main project
- Track branch history and changes
- Compare differences between branches

### 5.2 Creating New Branches

1. **Access Project Branching**: Continuous Creation → Project Branching
2. **Click "Create New Branch"**
3. **Configure branch settings**

```
┌─────────────────────────────────────────────────────────────┐
│                      Create New Branch                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Branch Name: [____________________]                         │
│  (e.g., "Exploration_Technique_Test" or "Episode_3_Alt")    │
│                                                              │
│  Description: [________________________________]            │
│  (Explain the purpose of this branch)                       │
│                                                              │
│  Source:                                                     │
│  │ ○ Current Point (latest state)                          │ │
│  │ ○ Specific Checkpoint: [Checkpoint_0023] ▼               │ │
│  │ ○ Specific Shot: [Shot_015_Final] ▼                     │ │
│  │ ○ Specific Date: [2024-01-15] ▼                         │ │
│  │                                                            │
│  Branch Type:                                                │
│  │ ○ Experiment (will not be merged back)                   │ │
│  │ ○ Variation (intended for merge comparison)             │ │
│  │ ○ Season/Series (major project fork)                     │ │
│  │                                                            │
│  Include Assets:                                             │
│  │ ☑ All reference sheets                                   │ │
│  │ ☑ Animation data                                         │ │
│  │ ☑ Render settings                                        │ │
│  │ ☑ Style transfer presets                                 │ │
│  │                                                            │
│  [Cancel]                                [Create Branch]     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

4. **Fill in branch name and description**
5. **Select source point** for the branch
6. **Choose branch type** based on your intended use
7. **Configure asset inclusion** options
8. **Click "Create Branch"**

**Branch Types Explained:**

| Type | Purpose | Merge Behavior |
|------|---------|----------------|
| Experiment | Try new techniques without commitment | Usually discarded after evaluation |
| Variation | Create alternative versions for comparison | Merge back for selection |
| Season/Series | Fork project for extended content | Independent development track |

### 5.3 Switching Between Branches

Switching branches allows you to work on different versions of your project:

1. **Open Project Branching panel**
2. **View available branches**

```
┌─────────────────────────────────────────────────────────────┐
│                      Project Branches                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Branch: ● main                                      │
│                                                              │
│  Available Branches                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │  ● main                                                 │ │
│  │    Latest production version (Shot 1-20 complete)      │ │
│  │    Last modified: Today at 2:30 PM                     │ │
│  │                                                         │ │
│  │  ◆ exploration_new_style                               │ │
│  │    Testing watercolor technique on Episode 3           │ │
│  │    Last modified: Yesterday at 4:15 PM                 │ │
│  │                                                         │ │
│  │  ◆ episode_4_draft                                      │ │
│  │    Initial draft of Episode 4 content                  │ │
│  │    Last modified: 3 days ago                           │ │
│  │                                                         │ │
│  │  ◆ collab_variations                                    │ │
│  │    Team member experiments                               │ │
│  │    Last modified: 1 week ago                           │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Create New Branch]  [Merge Branches]  [Delete Branch]     │
│                                                              │
│  Branch Actions:                                             │
│  │ [Switch to Branch]  [View History]  [Compare with Main]│ │
│  │                                                            │
└─────────────────────────────────────────────────────────────┘
```

3. **Click "Switch to Branch"** on your desired branch
4. **Confirm the switch** (unsaved changes will be提示)

**Switch Confirmation Dialog:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Switch Branch Confirmation                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  You are about to switch from "main" to "exploration_new_   │
│  style".                                                     │
│                                                              │
│  ⚠ Warning: Unsaved changes in current branch will be      │
│  lost. Please save your work before switching.              │
│                                                              │
│  ☑ I understand and want to proceed                          │
│                                                              │
│  [Cancel Switch]              [Switch & Lose Unsaved]        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Merging Branches

When you're ready to incorporate changes from a branch back into your main project:

1. **Select the branch** you want to merge
2. **Click "Merge Branches"**
3. **Configure merge options**

```
┌─────────────────────────────────────────────────────────────┐
│                        Merge Branches                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Source Branch: exploration_new_style                        │
│  Target Branch: main                                         │
│                                                              │
│  Merge Options:                                              │
│  │                                                            │
│  Strategy:                                                   │
│  │ ○ Auto-merge (combine compatible changes)                │ │
│  │ ○ Selective (choose what to merge)                        │ │
│  │ ○ Replace (overwrite target completely)                   │ │
│  │                                                            │
│  Include:                                                    │
│  │ ☑ Reference Sheets                                        │ │
│  │ ☐ Animation Data                                          │ │
│  │ ☑ Render Settings                                          │ │
│  │ ☑ Style Transfer Presets                                  │ │
│  │                                                            │
│  Conflict Resolution:                                        │
│  │ ○ Ask me about each conflict                              │ │
│  │ ○ Keep source changes                                      │ │
│  │ ○ Keep target changes                                      │ │
│  │                                                            │
│  [View Conflicts]  [Preview Merge]  [Start Merge]            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

4. **Resolve any conflicts** if detected
5. **Click "Start Merge"** to execute

**Merge Conflict Resolution:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Merge Conflicts Detected                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  The following conflicts were found during preview:          │
│                                                              │
│  Conflict 1: Character Reference Sheet                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Both branches modified the character sheet             │ │
│  │                                                          │ │
│  │ Source (exploration_new_style):                         │ │
│  │   Added: New watercolor character variant               │ │
│  │                                                          │ │
│  │ Target (main):                                          │ │
│  │   Added: Updated hero expression sheet                  │ │
│  │                                                          │ │
│  │ Resolution:                                             │ │
│  │ ○ Keep Source                                            │ │
│  │ ○ Keep Target                                            │ │
│  │ ○ Keep Both (merge both additions)                      │ │
│  │ ○ Manual Edit                                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Resolve All: Keep Target]  [Resolve All: Keep Source]      │
│  [Resolve All: Keep Both]                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Episode References

### 6.1 Overview

Episode References enable you to link your current project to previous episodes and inherit their reference materials. This feature is crucial for maintaining continuity across multi-episode productions.

**Key Benefits:**
- Maintain character consistency across episodes
- Reuse established environment references
- Propagate style decisions from previous episodes
- Ensure prop and set continuity
- Quick access to reference materials from all episodes

### 6.2 Linking Previous Episodes

1. **Access Episode References**: Continuous Creation → Episode References
2. **Click "Link Previous Episode"**
3. **Select the episode** to link

```
┌─────────────────────────────────────────────────────────────┐
│                      Episode References                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Project: My Series - Season 1                      │
│                                                              │
│  Available Episodes in Project:                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │ ☑ Episode 1 (COMPLETED)                                 │ │
│  │   Released: January 1, 2024                             │ │
│  │   24 shots, 5 reference sheets                          │ │
│  │                                                         │ │
│  │ ☑ Episode 2 (COMPLETED)                                │ │
│  │   Released: January 15, 2024                            │ │
│  │   28 shots, 6 reference sheets                          │ │
│  │                                                         │ │
│  │ ○ Episode 3 (IN PROGRESS) - Current                     │ │
│  │   12 of 30 shots completed                              │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  External Episodes:                                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │ [+ Import External Episode]                             │ │
│  │   Link episodes from other projects                    │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Link Selected Episodes]  [Manage Links]                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

4. **Select episodes** to link (checkbox selection)
5. **Click "Link Selected Episodes"**
6. **Configure import options**

### 6.3 Inheriting Character References

After linking episodes, you can inherit character references:

1. **Open Episode References panel**
2. **Navigate to "Characters" tab**
3. **Select characters** to inherit

```
┌─────────────────────────────────────────────────────────────┐
│                    Character Inheritance                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Linked Episodes: Episode 1, Episode 2                       │
│                                                              │
│  Available Characters                                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │ ☑ Hero_Protagonist                                      │ │
│  │   First Appearance: Episode 1                           │ │
│  │   Current Status: Active                                │ │
│  │   Last Updated: Episode 2                               │ │
│  │   [Inherit]  [Preview]  [View History]                   │ │
│  │                                                          │ │
│  │ ☑ Villain_Primary                                        │ │
│  │   First Appearance: Episode 1                          │ │
│  │   Current Status: Active                                │ │
│  │   Last Updated: Episode 2                               │ │
│  │   [Inherit]  [Preview]  [View History]                   │ │
│  │                                                          │ │
│  │ ☐ Sidekick_Support                                      │ │
│  │   First Appearance: Episode 2                          │ │
│  │   Current Status: Active                                │ │
│  │   Last Updated: Episode 2                               │ │
│  │   [Inherit]  [Preview]  [View History]                   │ │
│  │                                                          │ │
│  │ ☐ New_Character_Ep3                                     │ │
│  │   First Appearance: Episode 3 (Current)                 │ │
│  │   Current Status: New                                   │ │
│  │   [Add to Project]                                       │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Inheritance Options:                                        │
│  │ ☑ Include all reference images                          │ │
│  │ ☑ Include color variations                              │ │
│  │ ☑ Include expression sheet                              │ │
│  │ ☐ Include outdated references                           │ │
│  │                                                          │
│  [Inherit Selected]  [Inherit All]                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Inheritance Options Explained:**

| Option | Description | When to Use |
|--------|-------------|-------------|
| Include all reference images | Get every character image | Full continuity review |
| Include color variations | Include all color variants | Different lighting conditions |
| Include expression sheet | Get complete expression range | Animation and dialogue |
| Include outdated references | Include superseded references | Historical reference only |

### 6.4 Managing Sequels

For projects that are sequels to previous series:

1. **Navigate to "Sequel Settings"** tab
2. **Configure series relationships**

```
┌─────────────────────────────────────────────────────────────┐
│                      Sequel Settings                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Series Relationship:                                         │
│  ○ This is an original series                               │
│  ○ This is a sequel to another series                       │
│  ● This series will have sequels                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Previous Series: (if sequel)                                │
│  Series Name: [____________________]                        │
│  Last Season: [1] ▼                                          │
│  Import Settings: [Import All] ▼                             │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Forward References:                                          │
│  ☑ Mark elements as "canonical" for future episodes        │ │
│  ☑ Preserve deprecated elements for reference               │ │
│  ☑ Track changes for sequel development                     │ │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Canon Management:                                            │
│  [View Canon Database]  [Mark Elements Canon]               │
│  [Export Canon Summary]                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Cross-Shot References

### 7.1 Overview

Cross-Shot References allow you to browse and borrow reference materials from other shots in your project. This feature facilitates quick consistency checks and easy reuse of established visual elements.

### 7.2 Browsing Other Shots

1. **Open Cross-Shot References**: Continuous Creation → Cross-Shot References
2. **View all shots** in your project

```
┌─────────────────────────────────────────────────────────────┐
│                    Cross-Shot References                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Current Shot: Shot_015_City_Chase                           │
│                                                              │
│  Filter Shots:                                               │
│  │ [🔍 Search shots...]                                     │
│  │                                                          │ │
│  │ Sequence: [All] ▼  Status: [All] ▼  Type: [All] ▼       │ │
│  │                                                          │
│  ─────────────────────────────────────────────────────────  │
│  Shot Browser                                                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │ │
│  │ │ 012 │ │ 013 │ │ 014 │ │ 015 │ │ 016 │               │ │
│  │ │[img]│ │[img]│ │[img]│ │CUR ▼│ │[img]│               │ │
│  │ │Night│ │Dusk │ │Eve. │ │Chase│ │Morn.│               │ │
│  │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │ │
│  │                                                         │ │
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │ │
│  │ │ 017 │ │ 018 │ │ 019 │ │ 020 │ │ 021 │               │ │
│  │ │[img]│ │[img]│ │[img]│ │[img]│ │[img]│               │ │
│  │ │Morn.│ │Morn.│ │Noon │ │Noon │ │Eve. │               │ │
│  │ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

3. **Click on any shot thumbnail** to view its references
4. **Use filters** to find specific shots

**Filter Options:**

| Filter | Options |
|--------|---------|
| Sequence | All sequences or specific sequence |
| Status | All, In Progress, Complete, Review |
| Time of Day | All, Dawn, Day, Dusk, Night |
| Location | All locations or specific location |
| Character Focus | All or specific character |

### 7.3 Borrowing References

To borrow references from another shot:

1. **Select a shot** from the browser
2. **View its reference materials**
3. **Click "Borrow"** on specific references

```
┌─────────────────────────────────────────────────────────────┐
│                    Shot References: Shot_014                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Shot: Shot_014_Sunset_Bridge                                 │
│  Sequence: Episode 1, Scene 2                               │
│  Status: ✓ Complete                                          │
│                                                              │
│  Characters in this shot:                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │ [img] Hero_Protagonist                                  │ │
│  │     Borrowed: 0 times                                   │ │
│  │     [Borrow]  [Preview]  [View All]                     │ │
│  │                                                          │ │
│  │ [img] Villain_Primary                                   │ │
│  │     Borrowed: 0 times                                   │ │
│  │     [Borrow]  [Preview]  [View All]                      │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Environments:                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │ [img] Bridge_Overlook_Dusk                              │ │
│  │     [Borrow]  [Preview]                                  │ │
│  │                                                          │ │
│  │ [img] City_Silhouette_Sunset                            │ │
│  │     [Borrow]  [Preview]                                  │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Props:                                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │ [img] Hero_Cape_Flowing                                 │ │
│  │     [Borrow]  [Preview]                                  │ │
│  │                                                          │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Borrow All to Current Shot]  [Close]                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.4 Applying to Current Shot

After borrowing references:

1. **Go to your current shot** editor
2. **Open the Reference panel**
3. **View borrowed references** under "Cross-Shot Borrowed"

```
┌─────────────────────────────────────────────────────────────┐
│                    Current Shot References                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Shot: Shot_015_City_Chase (Current)                         │
│                                                              │
│  ┌─ INHERITED REFERENCES ─────────────────────────────────┐ │
│  │ (from Master and Sequence)                             │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ CROSS-SHOT BORROWED ──────────────────────────────────┐ │
│  │                                                           │ │
│  │ Borrowed from Shot_014_Sunset_Bridge:                    │ │
│  │ ┌─────────┐                                              │ │
│  │ │  Hero   │ Borrowed: Hero_Cape_Flowing.jpg             │ │
│  │ │  Cape   │ Applied: As dynamic element                  │ │
│  │ │ [img]   │                                              │ │
│  │ └─────────┘                                              │ │
│  │                                                           │ │
│  │ [Return Borrowed]  [Modify Application]                  │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ SHOT SPECIFIC ─────────────────────────────────────────┐ │
│  │                                                           │ │
│  │ [Add New Reference]                                      │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Visual Consistency Check

### 8.1 Overview

Visual Consistency Check is an automated quality assurance feature that analyzes your project for visual continuity issues. It helps identify problems before they become costly to fix.

**Checks Performed:**
- Character appearance consistency
- Environment/setting continuity
- Color palette adherence
- Lighting consistency
- Prop placement verification
- Scale and proportion validation

### 8.2 Running Consistency Validation

1. **Access Visual Consistency Check**: Continuous Creation → Visual Consistency Check
2. **Select validation scope**
3. **Start validation**

```
┌─────────────────────────────────────────────────────────────┐
│                  Visual Consistency Check                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Validation Scope:                                           │
│  ○ Current Shot Only                                        │
│  ○ Current Sequence                                         │
│  ● Entire Project                                            │
│  ○ Custom Selection: [Select Shots...]                      │
│                                                              │
│  Check Types:                                                │
│  ☑ Character Consistency                                     │
│  ☑ Environment Continuity                                    │
│  ☑ Color Palette Adherence                                   │
│  ☑ Lighting Consistency                                      │
│  ☑ Prop Placement                                            │
│  ☑ Scale & Proportion                                        │
│                                                              │
│  Sensitivity:                                               │
│  │ Low ─────●────────── Medium ─────●────────── High       │
│  │  Fewer alerts      Balanced         Strict alerts        │
│  │                                                            │
│  Advanced Options:                                           │
│  ☑ Generate comparison screenshots                          │
│  ☑ Include recommendations                                   │
│  ☐ Auto-fix minor issues                                    │
│                                                              │
│  [Cancel]                                [Run Validation]    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

4. **Wait for validation** to complete
5. **View results** when ready

### 8.3 Understanding Reports

After validation, review the detailed report:

```
┌─────────────────────────────────────────────────────────────┐
│                  Validation Report                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Validation Complete                                         │
│  Duration: 2 minutes 34 seconds                              │
│  Shots Analyzed: 24                                          │
│  Issues Found: 7                                             │
│                                                              │
│  Summary:                                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  ⚠ Issues by Category:                                 │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │  Character Consistency:  3 issues (2 high, 1 medium)   │ │
│  │  Environment Continuity:   2 issues (1 high, 1 low)    │ │
│  │  Color Palette:             1 issue  (1 low)             │ │
│  │  Lighting:                  1 issue  (1 medium)         │ │
│  │  Prop Placement:            0 issues                    │ │
│  │  Scale & Proportion:        0 issues                    │ │
│  │  ─────────────────────────────────────────────────────  │ │
│  │  Overall Score: 87/100 (Good)                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  Detailed Findings:                                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                                                         │ │
│  │ ⚠ HIGH PRIORITY                                         │ │
│  │   Shot_008: Character "Hero" face appears different     │ │
│  │   Severity: HIGH                                         │ │
│  │   Details: Eye shape differs from Master reference      │ │
│  │   Comparison: [Show Side-by-Side]                       │ │
│  │   Recommendation: Re-render with corrected model         │ │
│  │   [View Details]  [Mark for Fix]                        │ │
│  │                                                         │ │
│  │ ⚠ HIGH PRIORITY                                          │ │
│  │   Shot_012: Environment "City Park" missing bench       │ │
│  │   Severity: HIGH                                         │ │
│  │   Details: Bench present in all other shots              │ │
│  │   Comparison: [Show Reference]                          │ │
│  │   Recommendation: Add bench in post-production           │ │
│  │   [View Details]  [Mark for Fix]                        │ │
│  │                                                         │ │
│  │ ⚠ MEDIUM PRIORITY                                       │ │
│  │   Shot_015: Lighting temperature too cool                │ │
│  │   Severity: MEDIUM                                       │ │
│  │   Details: 5600K vs 4500K in other shots                │ │
│  │   Comparison: [Show Temperature Map]                   │ │
│  │   Recommendation: Adjust color grading                  │ │
│  │   [View Details]  [Mark for Fix]                        │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  [Export Report]  [Run Again]  [Fix Marked Issues]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Fixing Inconsistencies

**Manual Fix:**

1. **Click "View Details"** on any issue
2. **Review the comparison** showing the problem
3. **Make corrections** in your editing software
4. **Re-run validation** to confirm fix

**Auto-Fix (where supported):**

1. **Select issues** with auto-fix available
2. **Click "Auto-Fix Selected"**
3. **Review the changes** before accepting

```
┌─────────────────────────────────────────────────────────────┐
│                    Auto-Fix Preview                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Issue: Shot_015 - Lighting temperature adjustment          │
│                                                              │
│  ┌──────────────────────┬──────────────────────┐            │
│  │      BEFORE          │      AFTER            │            │
│  │                      │                       │            │
│  │   [preview]          │   [preview]           │            │
│  │   Temperature:      │   Temperature:       │            │
│  │   5600K (Too Cool)  │   4500K (Balanced)    │            │
│  │                      │                       │            │
│  └──────────────────────┴──────────────────────┘            │
│                                                              │
│  Changes Applied:                                            │
│  • Color temperature: 5600K → 4500K                          │
│  • Tint adjustment: +2 green → 0                            │
│  • Exposure: +0.3 EV → 0.0 EV                               │                                                              │
│  [Cancel]  [Apply Changes]                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. Tips and Best Practices

### 9.1 Reference Management

**Organize References from the Start:**
- Create your Master Reference Sheet before any other work
- Include multiple angles and expressions for each character
- Document lighting preferences in detail
- Use consistent naming conventions across all references

**Example Naming Convention:**
```
Characters/
  Hero/
    Hero_Main_Front.jpg
    Hero_Main_Profile.jpg
    Hero_Main_3Quarter.jpg
    Hero_Expression_Happy.jpg
    Hero_Expression_Serious.jpg
    Hero_Expression_Sad.jpg
    
Environments/
  City_Park/
    City_Park_Overview_Day.jpg
    City_Park_Bench_Location.jpg
    City_Park_Path_View.jpg
```

### 9.2 Inheritance Optimization

**Minimize Redundancy:**
- Only add references at the level where they first appear
- Don't duplicate references across multiple levels
- Use Sequence Sheets for episode-specific additions
- Reserve Shot References for camera and lighting only

**Recommended Structure:**
- **Master Sheet**: Core character designs, primary environments, color palette
- **Sequence Sheet**: Episode-specific poses, additional environments, unique props
- **Shot Reference**: Camera angle, lighting setup, specific expression

### 9.3 Video Replication Tips

**Optimal Reference Videos:**
- Use consistent framing throughout the reference
- Include brief pauses at key poses
- Film at the same frame rate as your target output
- Ensure good separation between limbs and body
- Avoid baggy clothing that obscures movement

**Quality Settings by Use Case:**

| Use Case | Expression Intensity | Smoothing | Style Matching |
|----------|----------------------|-----------|-----------------|
| Dialogue Scenes | 40-60% | 30-50% | On |
| Action Sequences | 60-80% | 20-40% | Off |
| Subtle Emotions | 20-40% | 40-60% | On |
| Exaggerated Comedy | 80-100% | 10-30% | Off |

### 9.4 Style Transfer Best Practices

**Choosing Reference Images:**
- Select images with clear stylistic elements
- Ensure high resolution for better transfer quality
- Include examples of your desired color treatment
- Consider the complexity of the style

**Testing Approach:**
1. Start with low strength (25-30%)
2. Preview on multiple shots
3. Gradually increase strength
4. Test on shots with different content

### 9.5 Project Branching Strategy

**When to Create Branches:**
- Before major stylistic changes
- When trying new techniques
- For client review of alternatives
- Before critical decision points

**Branch Naming:**
```
exploration_*
  exploration_watercolor_style
  exploration_noir_editing
  exploration_new_rendering
  
variant_*
  variant_episode3_opening
  variant_alternate_ending
  
release_*
  release_candidate_v1
  release_candidate_v2
```

---

## 10. Troubleshooting

### 10.1 Common Issues

#### Issue: References Not Inheriting Properly

**Symptoms:**
- References appear missing in child sheets
- Inheritance chain shows broken links
- References from Master don't appear in Shots

**Solutions:**
1. Verify parent sheet exists and is saved
2. Check that references are properly linked (not just uploaded)
3. Ensure no permission issues with reference files
4. Try re-saving the parent sheet
5. Clear cache: Settings → Advanced → Clear Reference Cache

#### Issue: Video Replication Fails

**Symptoms:**
- Job gets stuck at a specific percentage
- Error message about "Unable to process"
- Output video is corrupted or incomplete

**Solutions:**
1. Check video format compatibility
2. Verify sufficient system resources (RAM, GPU)
3. Try with a shorter reference clip
4. Restart the replication service
5. Check logs for specific error codes

**Error Codes:**

| Code | Meaning | Solution |
|------|---------|----------|
| VR-001 | Invalid video format | Convert to MP4 H.264 |
| VR-002 | Corrupted video file | Re-export source |
| VR-003 | Insufficient GPU memory | Reduce resolution |
| VR-004 | Character rigging mismatch | Update character rig |
| VR-005 | Network timeout (cloud) | Retry connection |

#### Issue: Style Transfer Quality Poor

**Symptoms:**
- Output looks washed out
- Style elements don't appear
- Unnatural color blending

**Solutions:**
1. Increase transfer strength
2. Use higher quality reference image
3. Check color space compatibility
4. Verify content image resolution
5. Try different style reference

#### Issue: Branch Merge Conflicts

**Symptoms:**
- Merge fails to complete
- Data appears lost after merge
- Inconsistent state after merge

**Solutions:**
1. Always preview merge before executing
2. Use selective merge for critical sections
3. Create backup before merging
4. Resolve conflicts one at a time
5. Consider manual merge for complex conflicts

#### Issue: Visual Check Finds False Positives

**Symptoms:**
- Too many low-priority alerts
- Valid shots flagged as inconsistent
- Sensitivity too high even on "Low" setting

**Solutions:**
1. Exclude certain elements from check
2. Add exceptions for intentional variations
3. Update Master reference if styles changed
4. Run check on smaller scope
5. Adjust specific category sensitivity

### 10.2 Performance Optimization

**Slow Reference Loading:**
- Reduce thumbnail sizes in settings
- Use external reference storage
- Clear unused references
- Upgrade to SSD storage

**High Memory Usage:**
- Limit concurrent video replication jobs
- Reduce preview quality for large projects
- Close unused reference panels
- Use 64-bit version of Creative Studio

### 10.3 Getting Additional Help

**Documentation Resources:**
- Creative Studio User Guide
- Video Replication Tutorial Series
- Style Transfer Workshop
- Community Forums

**Support Options:**
- Built-in help: F1 → Continuous Creation
- Report bugs: Help → Report Issue
- Feature requests: Feature Portal
- Direct support: support@storycore.io

---

## 11. Keyboard Shortcuts Reference

### 11.1 Continuous Creation Shortcuts

| Shortcut | Action | Location |
|----------|--------|----------|
| `Ctrl+Shift+R` | Open Reference Sheets | Global |
| `Ctrl+Shift+V` | Open Video Replication | Global |
| `Ctrl+Shift+S` | Open Style Transfer | Global |
| `Ctrl+Shift+B` | Open Project Branching | Global |
| `Ctrl+Shift+E` | Open Episode References | Global |
| `Ctrl+Shift+C` | Open Cross-Shot References | Global |
| `Ctrl+Shift+K` | Run Visual Consistency Check | Global |

### 11.2 Reference Sheet Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Create new reference sheet |
| `E` | Edit selected sheet |
| `D` | Delete selected sheet |
| `Ctrl+S` | Save current sheet |
| `I` | View inheritance |
| `P` | Preview selected reference |
| `B` | Borrow from another shot |

### 11.3 Video Replication Shortcuts

| Shortcut | Action |
|----------|--------|
| `U` | Upload reference video |
| `S` | Start replication |
| `P` | Pause current job |
| `C` | Cancel current job |
| `R` | Retry failed job |

### 11.4 Style Transfer Shortcuts

| Shortcut | Action |
|----------|--------|
| `A` | Add style reference |
| `T` | Apply style to selected shots |
| `/` | Toggle before/after preview |
| `[` | Decrease strength |
| `]` | Increase strength |
| `Enter` | Apply current settings |

### 11.5 Project Branching Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Create new branch |
| `S` | Switch to branch |
| `M` | Merge branches |
| `H` | View branch history |
| `D` | Delete branch |
| `Ctrl+B` | Toggle branch panel |

### 11.6 Visual Check Shortcuts

| Shortcut | Action |
|----------|--------|
| `R` | Run validation |
| `F` | Filter issues by severity |
| `J` | Jump to next issue |
| `K` | Jump to previous issue |
| `X` | Mark issue for fix |
| `Z` | Zoom comparison view |

---

## Document Information

| Field | Value |
|-------|-------|
| Document Version | 1.0 |
| Last Updated | February 2024 |
| Applicable Versions | Creative Studio 2.0+ |
| Author | StoryCore Documentation Team |

---

*For the latest updates and additional resources, visit the Creative Studio Help Center at help.storycore.io*
