# Plan: Add Story-Chapter Files Generation

## Overview
Add story-chapter files generation to the existing story documentation system. This will create a complete story structure with chapter files alongside the existing documentation files.

## Current State
The system currently creates:
```
story/
├── 00_master_outline.md
├── 01_plot_core.md
├── 02_lore_worldbuilding.md
├── 03_conspiracy_hidden_truth.md
├── 04_character_bibles/
│   └── *.md
├── 05_timelines.md
└── 06_style_guide.md
```

## Target State
The system will create BOTH structures:
```
story/
├── 00_master_outline.md
├── 01_plot_core.md
├── 02_lore_worldbuilding.md
├── 03_conspiracy_hidden_truth.md
├── 04_character_bibles/
│   └── *.md
├── 05_timelines.md
├── 06_style_guide.md
├── story-index.md          # NEW: Index & metadata
├── story-intro.md          # NEW: Introduction
├── story-chapter-01.md     # NEW: Chapter 1
├── story-chapter-02.md     # NEW: Chapter 2
├── story-chapter-03.md     # NEW: Chapter 3
├── story-chapter-04.md     # NEW: Chapter 4
├── story-chapter-05.md     # NEW: Chapter 5
├── story-ending.md         # NEW: Conclusion
└── story-summary.md        # NEW: Rolling summary
```

## Implementation Steps

### Step 1: Add StoryChapterGenerator Class
Create a new class in `src/wizard/story_documentation.py`:
- `StoryChapterGenerator` class
- Methods to generate each chapter file
- Integration with existing `StoryDocumentationGenerator`

### Step 2: Define Chapter Content Structure
Each chapter file should contain:
- **story-index.md**: Project metadata, chapter list, reading guide
- **story-intro.md**: Setting, initial situation, hook
- **story-chapter-XX.md**: Chapter content with scenes, dialogue, action
- **story-ending.md**: Resolution, aftermath, closing thoughts
- **story-summary.md**: Rolling summary of all chapters

### Step 3: Integrate with Wizard State
- Extract chapter information from `wizard_state.generated_story`
- Generate chapters based on act structure
- Fill with placeholder content if no story data available

### Step 4: Update generate_all_files Method
- Add story-chapter file generation
- Ensure proper ordering and content

### Step 5: Test the Implementation
- Create test for story-chapter file generation
- Verify all files are created correctly
- Verify content is properly filled

## File Changes Required

### src/wizard/story_documentation.py
1. Add `StoryChapterGenerator` class
2. Add methods:
   - `_generate_story_index()`
   - `_generate_story_intro()`
   - `_generate_story_chapter(chapter_num)`
   - `_generate_story_ending()`
   - `_generate_story_summary()`
3. Update `generate_all_files()` to include chapter files

## Content Templates

### story-index.md
```markdown
# Story Index: {project_title}

## Metadata
- **Title**: {project_title}
- **Genre**: {genre}
- **Chapters**: {chapter_count}
- **Status**: In Progress

## Chapter List
1. [Introduction](story-intro.md)
2. [Chapter 1](story-chapter-01.md) - {chapter_1_title}
...

## Reading Guide
{reading_guide}
```

### story-chapter-XX.md
```markdown
# Chapter {number}: {title}

## Summary
{chapter_summary}

## Scenes
### Scene 1: {scene_title}
{scene_description}

### Scene 2: {scene_title}
{scene_description}

## Characters
- {character_1}
- {character_2}

## Notes
{chapter_notes}
```

## Dependencies
- Existing `StoryDocumentationGenerator` class
- `wizard_state` with story data
- `CharacterProfile` for character references

## Risks
- Content may be empty if no story data is provided
- Need to handle missing data gracefully

## Success Criteria
- All 9 story-chapter files are created
- Files contain meaningful content from wizard state
- No errors during generation
- Files are properly formatted Markdown
