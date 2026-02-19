// ============================================================================
// Story File I/O Utilities - LLM-Optimized Version
// ============================================================================
// This module provides functions for reading and writing story files
// optimized for LLM consumption with clear structure and metadata.
// 
// File Structure (all .md format):
//   story/
//   ├── story-index.md       # Index with metadata and links to parts
//   ├── story-intro.md       # Introduction with context
//   ├── story-chapter-01.md  # Numbered chapters
//   ├── story-chapter-02.md
//   ├── ...
//   ├── story-ending.md      # Conclusion
//   └── story-summary.md     # Rolling summary for LLM context
//
// Each file includes YAML frontmatter for LLM parsing
// ============================================================================

import type { Story, StoryPart } from '@/types/story';

// ============================================================================
// Constants
// ============================================================================

const STORY_DIR_NAME = 'story';
const FILE_NAMES = {
  index: 'story-index.md',
  intro: 'story-intro.md',
  chapter: (n: number) => `story-chapter-${String(n).padStart(2, '0')}.md`,
  ending: 'story-ending.md',
  summary: 'story-summary.md',
};

// ============================================================================
// YAML Frontmatter Helpers
// ============================================================================

interface FileMetadata {
  title: string;
  type: 'index' | 'intro' | 'chapter' | 'ending' | 'summary';
  order?: number;
  part_number?: number;
  total_parts?: number;
  genre?: string[];
  tone?: string[];
  characters?: string[];
  locations?: string[];
  previous_summary?: string;
  next_part?: string;
  prev_part?: string;
  generated_at?: string;
  review_score?: {
    tension: number;
    drama: number;
    sense: number;
    emotion: number;
    overall: number;
  };
}

function generateYAMLFrontmatter(metadata: FileMetadata): string {
  const lines = ['---'];

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      value.forEach(item => lines.push(`  - ${item}`));
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${key}:`);
      for (const [subKey, subValue] of Object.entries(value)) {
        lines.push(`  ${subKey}: ${subValue}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

function parseYAMLFrontmatter(content: string): { metadata: Partial<FileMetadata>; body: string } {
  const lines = content.split('\n');

  if (lines[0] !== '---') {
    return { metadata: {}, body: content };
  }

  const endIndex = lines.findIndex((line, i) => i > 0 && line === '---');
  if (endIndex === -1) {
    return { metadata: {}, body: content };
  }

  const yamlLines = lines.slice(1, endIndex);
  const body = lines.slice(endIndex + 1).join('\n').trim();

  const metadata: Partial<FileMetadata> = {};
  let currentKey = '';
  let currentArray: string[] = [];
  let isArray = false;

  for (const line of yamlLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if it's an array item
    if (trimmed.startsWith('- ')) {
      currentArray.push(trimmed.substring(2));
      isArray = true;
      continue;
    }

    // Save previous array if exists
    if (isArray && currentKey) {
      (metadata as any)[currentKey] = currentArray;
      currentArray = [];
      isArray = false;
    }

    // Parse key-value
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      currentKey = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value) {
        // Try to parse as number
        const numValue = Number(value);
        (metadata as any)[currentKey] = isNaN(numValue) ? value : numValue;
      }
    }
  }

  // Save final array if exists
  if (isArray && currentKey) {
    (metadata as any)[currentKey] = currentArray;
  }

  return { metadata, body };
}

// ============================================================================
// Story Part File Generation
// ============================================================================

export function generateStoryPartFile(part: StoryPart, context: {
  totalParts: number;
  genre: string[];
  tone: string[];
  characters: string[];
  locations: string[];
  prevPart?: string;
  nextPart?: string;
}): string {
  const metadata: FileMetadata = {
    title: part.title,
    type: part.type,
    order: part.order,
    part_number: part.type === 'chapter' ? part.order : undefined,
    total_parts: context.totalParts,
    genre: context.genre,
    tone: context.tone,
    characters: context.characters,
    locations: context.locations,
    generated_at: new Date().toISOString(),
    prev_part: context.prevPart,
    next_part: context.nextPart,
  };

  if (part.reviewScore) {
    metadata.review_score = part.reviewScore;
  }

  const lines: string[] = [
    generateYAMLFrontmatter(metadata),
    '',
    `# ${part.title}`,
    '',
    '## Content',
    '',
    part.content,
    '',
    '---',
    '',
    '## Summary for Next Part',
    '',
    part.summary,
    '',
    '---',
    '',
    '> **Note for LLM**: This file is part of a multi-part story. Use the "Summary for Next Part" section as context when generating subsequent parts.',
  ];

  return lines.join('\n');
}

export function generateStoryIndexFile(story: Story): string {
  const metadata: FileMetadata = {
    title: story.title,
    type: 'index',
    genre: story.genre,
    tone: story.tone,
    characters: story.charactersUsed.map(c => c.name),
    locations: story.locationsUsed.map(l => l.name),
    generated_at: new Date().toISOString(),
  };

  const partsList = story.parts?.map((part, index) => {
    const fileName = part.type === 'intro'
      ? FILE_NAMES.intro
      : part.type === 'ending'
        ? FILE_NAMES.ending
        : FILE_NAMES.chapter(part.order - 1);

    return `- [${part.title}](./${fileName}) - Order: ${part.order}`;
  }).join('\n') || '';

  const lines: string[] = [
    generateYAMLFrontmatter(metadata),
    '',
    `# ${story.title}`,
    '',
    '## Story Information',
    '',
    `- **Genre**: ${story.genre.join(', ')}`,
    `- **Tone**: ${story.tone.join(', ')}`,
    `- **Length**: ${story.length}`,
    `- **Created**: ${new Date(story.createdAt).toLocaleDateString()}`,
    `- **Updated**: ${new Date(story.updatedAt).toLocaleDateString()}`,
    '',
    '## Summary',
    '',
    story.summary,
    '',
    '## Parts',
    '',
    partsList,
    '',
    '## Characters',
    '',
    ...story.charactersUsed.map(c => `- **${c.name}**: ${c.role}`),
    '',
    '## Locations',
    '',
    ...story.locationsUsed.map(l => `- **${l.name}**: ${l.significance}`),
    '',
    '---',
    '',
    '*This index file is automatically maintained by StoryCore-Engine.*',
  ];

  return lines.join('\n');
}

export function generateRollingSummaryFile(parts: StoryPart[]): string {
  const lastPart = parts[parts.length - 1];

  const metadata: FileMetadata = {
    title: 'Rolling Summary',
    type: 'summary',
    order: parts.length,
    total_parts: parts.length,
    generated_at: new Date().toISOString(),
  };

  const cumulativeSummary = parts.map(p =>
    `### ${p.title}\n${p.summary}`
  ).join('\n\n');

  const lines: string[] = [
    generateYAMLFrontmatter(metadata),
    '',
    '# Rolling Summary',
    '',
    '> This file contains the cumulative summary of all story parts for LLM context.',
    '',
    '## Current Context (Last Part)',
    '',
    lastPart?.summary || '',
    '',
    '## Full Story Arc',
    '',
    cumulativeSummary,
    '',
    '---',
    '',
    '> **LLM Instruction**: Use "Current Context" for generating the next part. Use "Full Story Arc" for understanding the complete narrative.',
  ];

  return lines.join('\n');
}

// ============================================================================
// Legacy Markdown Conversion (for backward compatibility)
// ============================================================================

/**
 * Converts a Story object to markdown format (legacy combined format)
 */
export function storyToMarkdown(story: Story): string {
  const lines: string[] = [];

  // Title
  lines.push(`# ${story.title || 'Untitled Story'}`);
  lines.push('');

  // Story Information
  lines.push('## Story Information');
  lines.push('');
  lines.push(`**Genre**: ${story.genre.join(', ') || '[Not specified]'}`);
  lines.push(`**Tone**: ${story.tone.join(', ') || '[Not specified]'}`);
  lines.push(`**Length**: ${story.length || 'medium'}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(story.summary || '[Write a brief summary of your story here - 2-3 sentences describing the main plot and characters]');
  lines.push('');

  // Parts (if available)
  if (story.parts && story.parts.length > 0) {
    lines.push('## Parts');
    lines.push('');

    for (const part of story.parts) {
      lines.push(`### ${part.title}`);
      lines.push('');
      lines.push(part.content);
      lines.push('');
      lines.push(`*Summary: ${part.summary}*`);
      lines.push('');
    }
  } else {
    // Main Content (legacy)
    lines.push('## Main Content');
    lines.push('');
    lines.push(story.content || '[Your story content begins here. The storyteller wizard will help you generate and refine this content.]');
    lines.push('');
  }

  // Characters Used
  if (story.charactersUsed && story.charactersUsed.length > 0) {
    lines.push('## Characters');
    lines.push('');
    story.charactersUsed.forEach((char) => {
      lines.push(`- **${char.name}**: ${char.role}`);
    });
    lines.push('');
  }

  // Locations Used
  if (story.locationsUsed && story.locationsUsed.length > 0) {
    lines.push('## Locations');
    lines.push('');
    story.locationsUsed.forEach((loc) => {
      lines.push(`- **${loc.name}**: ${loc.significance}`);
    });
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push('*This file is automatically read and updated by the StoryCore-Engine Storyteller Wizard.*');
  lines.push('*You can also edit it manually using any text editor.*');

  return lines.join('\n');
}

/**
 * Parses markdown content into a Story object
 */
export function markdownToStory(markdown: string, existingStory?: Partial<Story>): Story {
  const { metadata, body } = parseYAMLFrontmatter(markdown);
  const lines = body.split('\n');

  // Initialize story with defaults or existing values
  const story: Story = {
    id: existingStory?.id || crypto.randomUUID(),
    title: metadata.title || '',
    content: '',
    summary: '',
    genre: metadata.genre || existingStory?.genre || [],
    tone: metadata.tone || existingStory?.tone || [],
    length: existingStory?.length || 'medium',
    charactersUsed: existingStory?.charactersUsed || [],
    locationsUsed: existingStory?.locationsUsed || [],
    autoGeneratedElements: existingStory?.autoGeneratedElements || [],
    createdAt: existingStory?.createdAt || Date.now(),
    updatedAt: Date.now(),
    version: (existingStory?.version || 0) + 1,
    worldId: existingStory?.worldId,
  };

  let currentSection = '';
  let contentBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Parse title (# Title)
    if (line.startsWith('# ') && !story.title) {
      story.title = line.substring(2).trim();
      continue;
    }

    // Parse section headers (## Section)
    if (line.startsWith('## ')) {
      // Save previous section content
      if (currentSection === 'Main Content' || currentSection === 'Content') {
        story.content = contentBuffer.join('\n').trim();
        contentBuffer = [];
      } else if (currentSection === 'Summary') {
        story.summary = contentBuffer.join('\n').trim();
        contentBuffer = [];
      }

      currentSection = line.substring(3).trim();
      continue;
    }

    // Parse metadata fields
    if (line.startsWith('**Genre**:')) {
      const genreText = line.substring(10).trim();
      story.genre = genreText
        .split(',')
        .map((g) => g.trim())
        .filter((g) => g && g !== '[Not specified]');
      continue;
    }

    if (line.startsWith('**Tone**:')) {
      const toneText = line.substring(9).trim();
      story.tone = toneText
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t && t !== '[Not specified]');
      continue;
    }

    if (line.startsWith('**Length**:')) {
      const lengthText = line.substring(11).trim().toLowerCase();
      if (['short', 'medium', 'long', 'scene', 'short_story', 'novella', 'novel', 'epic_novel'].includes(lengthText)) {
        story.length = lengthText as any;
      }
      continue;
    }

    // Collect content for current section
    if (currentSection === 'Main Content' || currentSection === 'Content' || currentSection === 'Summary') {
      contentBuffer.push(line);
    }
  }

  // Save any remaining content
  if (currentSection === 'Main Content' || currentSection === 'Content') {
    story.content = contentBuffer.join('\n').trim();
  } else if (currentSection === 'Summary') {
    story.summary = contentBuffer.join('\n').trim();
  }

  return story;
}

// ============================================================================
// File I/O Functions
// ============================================================================

/**
 * Saves a complete story with all parts as separate .md files
 * Optimized for LLM consumption with YAML frontmatter
 */
export async function saveStoryToDisk(projectPath: string, story: Story): Promise<void> {
  if (!window.electronAPI?.fs) {
    throw new Error('Electron API not available');
  }

  const storyDir = `${projectPath}/${STORY_DIR_NAME}`;

  try {
    // Ensure directory exists with recursive option
    await window.electronAPI.fs.mkdir(storyDir, { recursive: true });

    // Save index file
    const indexContent = generateStoryIndexFile(story);
    await window.electronAPI.fs.writeFile(`${storyDir}/${FILE_NAMES.index}`, indexContent);

    // Save individual parts
    if (story.parts && story.parts.length > 0) {
      const characterNames = story.charactersUsed.map(c => c.name);
      const locationNames = story.locationsUsed.map(l => l.name);

      for (let i = 0; i < story.parts.length; i++) {
        const part = story.parts[i];
        const prevPart = i > 0 ? story.parts[i - 1] : undefined;
        const nextPart = i < story.parts.length - 1 ? story.parts[i + 1] : undefined;

        const fileName = part.type === 'intro'
          ? FILE_NAMES.intro
          : part.type === 'ending'
            ? FILE_NAMES.ending
            : FILE_NAMES.chapter(part.order - 1);

        const content = generateStoryPartFile(part, {
          totalParts: story.parts.length,
          genre: story.genre,
          tone: story.tone,
          characters: characterNames,
          locations: locationNames,
          prevPart: prevPart?.title,
          nextPart: nextPart?.title,
        });

        await window.electronAPI.fs.writeFile(`${storyDir}/${fileName}`, content);
      }

      // Save rolling summary
      const summaryContent = generateRollingSummaryFile(story.parts);
      await window.electronAPI.fs.writeFile(`${storyDir}/${FILE_NAMES.summary}`, summaryContent);
    }

    // Also save legacy combined markdown for compatibility
    const legacyMarkdown = storyToMarkdown(story);
    await window.electronAPI.fs.writeFile(`${projectPath}/story.md`, legacyMarkdown);

  } catch (error) {
    console.error('[StoryFileIO] Failed to save story:', error);
    throw error;
  }
}

/**
 * Loads story parts from the story directory
 */
export async function loadStoryPartsFromDisk(projectPath: string): Promise<StoryPart[] | null> {
  if (!window.electronAPI?.fs) {
    return null;
  }

  const storyDir = `${projectPath}/${STORY_DIR_NAME}`;

  try {
    // Check if directory exists
    const exists = await window.electronAPI.fs.exists(storyDir);
    if (!exists) {
      return null;
    }

    // List files in directory
    const files = await window.electronAPI.fs.readdir(storyDir);
    const partFiles = files.filter((f: string) =>
      f.startsWith('story-') && f.endsWith('.md') && f !== 'story-index.md' && f !== 'story-summary.md'
    );

    const parts: StoryPart[] = [];

    for (const fileName of partFiles.sort()) {
      const filePath = `${storyDir}/${fileName}`;
      const content = await window.electronAPI.fs.readFile(filePath);
      const { metadata, body } = parseYAMLFrontmatter(content.toString());

      // Parse body to extract content and summary
      const contentMatch = body.match(/## Content\n\n([\s\S]*?)(?=\n\n---|$)/);
      const summaryMatch = body.match(/## Summary for Next Part\n\n([\s\S]*?)(?=\n\n---|$)/);

      parts.push({
        id: crypto.randomUUID(),
        type: metadata.type as any,
        title: metadata.title || fileName,
        content: contentMatch ? contentMatch[1].trim() : body,
        summary: summaryMatch ? summaryMatch[1].trim() : '',
        order: metadata.order || 0,
        reviewScore: metadata.review_score,
      });
    }

    // Sort by order
    return parts.sort((a, b) => a.order - b.order);

  } catch (error) {
    console.warn('[StoryFileIO] Failed to load story parts:', error);
    return null;
  }
}

/**
 * Loads story content from a story.md file (legacy)
 */
export async function loadStoryFromFile(projectPath: string | File): Promise<Story | null> {
  try {
    let file: File;

    if (projectPath instanceof File) {
      file = projectPath;
    } else {
      throw new Error(
        'Browser file system access requires user interaction. ' +
        'Please use the file picker to select the story.md file.'
      );
    }

    const content = await file.text();
    return markdownToStory(content);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null;
    }
    throw error;
  }
}

/**
 * Saves story content using browser APIs (download or file picker)
 */
export async function saveStoryToFile(projectPath: string, story: Story): Promise<void> {
  try {
    const markdown = storyToMarkdown(story);

    if ('showSaveFilePicker' in window) {
      const options = {
        suggestedName: 'story.md',
        types: [
          {
            description: 'Markdown Files',
            accept: {
              'text/markdown': ['.md'],
            },
          },
        ],
      };

      const handle = await (window as any).showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(markdown);
      await writable.close();
    } else {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'story.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to save story file: ${error.message}`);
    }
    throw new Error('Failed to save story file: Unknown error');
  }
}

/**
 * Creates a new story.md file with default template content
 */
export function createDefaultStory(projectName: string): Story {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: projectName,
    content: '[Your story content begins here. The storyteller wizard will help you generate and refine this content.]',
    summary: '[Write a brief summary of your story here - 2-3 sentences describing the main plot and characters]',
    genre: [],
    tone: [],
    length: 'medium',
    charactersUsed: [],
    locationsUsed: [],
    autoGeneratedElements: [],
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
}

/**
 * Loads story from file with fallback to default story
 */
export async function loadStoryOrDefault(
  projectPath: string | File,
  projectName: string
): Promise<Story> {
  try {
    const story = await loadStoryFromFile(projectPath);
    if (story) {
      return story;
    }
  } catch (error) {
    console.warn('Failed to load story file, using default:', error);
  }

  return createDefaultStory(projectName);
}

// ============================================================================
// File Picker Helpers
// ============================================================================

export async function pickStoryFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,text/markdown';

    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      resolve(file || null);
    };

    input.oncancel = () => {
      resolve(null);
    };

    input.click();
  });
}

export async function loadStoryWithPicker(): Promise<Story | null> {
  try {
    const file = await pickStoryFile();
    if (!file) {
      return null;
    }

    return await loadStoryFromFile(file);
  } catch (error) {
    console.error('Failed to load story with picker:', error);
    return null;
  }
}

// ============================================================================
// Export Types
// ============================================================================

export type { FileMetadata };

// ============================================================================
// Update Story Part Content
// ============================================================================

/**
 * Updates a single story part's content on disk
 */
export async function updateStoryPartContent(
  projectPath: string,
  part: StoryPart,
  newContent: string
): Promise<void> {
  if (!window.electronAPI?.fs) {
    throw new Error('Electron API not available');
  }

  const storyDir = `${projectPath}/${STORY_DIR_NAME}`;

  try {
    // Ensure directory exists with recursive option
    await window.electronAPI.fs.mkdir(storyDir, { recursive: true });

    // Determine file name based on part type
    const fileName = part.type === 'intro'
      ? FILE_NAMES.intro
      : part.type === 'ending'
        ? FILE_NAMES.ending
        : FILE_NAMES.chapter(part.order - 1);

    const filePath = `${storyDir}/${fileName}`;

    // Read existing file to preserve metadata
    const existingContent = await window.electronAPI.fs.readFile(filePath);
    const { metadata } = parseYAMLFrontmatter(existingContent.toString());

    // Generate updated file content
    const updatedFileContent = generateUpdatedPartFile(part, newContent, metadata);

    // Write updated content
    await window.electronAPI.fs.writeFile(filePath, updatedFileContent);

    console.log(`[StoryFileIO] Updated story part: ${fileName}`);
  } catch (error) {
    console.error('[StoryFileIO] Failed to update story part:', error);
    throw error;
  }
}

/**
 * Generates updated story part file with new content while preserving metadata
 */
function generateUpdatedPartFile(
  part: StoryPart,
  newContent: string,
  metadata: Partial<FileMetadata>
): string {
  const updatedPart = {
    ...part,
    content: newContent,
  };

  return generateStoryPartFile(updatedPart, {
    totalParts: metadata.total_parts || 1,
    genre: metadata.genre || [],
    tone: metadata.tone || [],
    characters: metadata.characters || [],
    locations: metadata.locations || [],
    prevPart: metadata.prev_part,
    nextPart: metadata.next_part,
  });
}

/**
 * Saves a single story part to a new file
 */
export async function saveStoryPartToDisk(
  projectPath: string,
  part: StoryPart,
  context: {
    totalParts: number;
    genre: string[];
    tone: string[];
    characters: string[];
    locations: string[];
  }
): Promise<void> {
  if (!window.electronAPI?.fs) {
    throw new Error('Electron API not available');
  }

  const storyDir = `${projectPath}/${STORY_DIR_NAME}`;

  try {
    // Ensure directory exists with recursive option
    await window.electronAPI.fs.mkdir(storyDir, { recursive: true });

    // Determine file name based on part type
    const fileName = part.type === 'intro'
      ? FILE_NAMES.intro
      : part.type === 'ending'
        ? FILE_NAMES.ending
        : FILE_NAMES.chapter(part.order - 1);

    const filePath = `${storyDir}/${fileName}`;

    // Generate file content
    const content = generateStoryPartFile(part, context);

    // Write file
    await window.electronAPI.fs.writeFile(filePath, content);

    console.log(`[StoryFileIO] Saved story part: ${fileName}`);
  } catch (error) {
    console.error('[StoryFileIO] Failed to save story part:', error);
    throw error;
  }
}

// ============================================================================
// Scenario File Generation (for video/film production)
// ============================================================================

/**
 * Generate scenario.md file content in standard screenplay format
 */
export function generateScenarioContent(story: Story): string {
  const lines: string[] = [];

  // Title page
  lines.push('# SCENARIO');
  lines.push('');
  lines.push(`**${story.title.toUpperCase()}**`);
  lines.push('');
  lines.push(`Genre: ${story.genre.join(', ')}`);
  lines.push(`Ton: ${story.tone.join(', ')}`);
  lines.push(`Durée estimée: ${getEstimatedDuration(story.length)}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Characters section
  if (story.charactersUsed.length > 0) {
    lines.push('## PERSONNAGES');
    lines.push('');
    story.charactersUsed.forEach((char) => {
      lines.push(`**${char.name}** - ${char.role}`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Locations section
  if (story.locationsUsed.length > 0) {
    lines.push('## LIEUX');
    lines.push('');
    story.locationsUsed.forEach((loc) => {
      lines.push(`**${loc.name}** - ${loc.significance}`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Synopsis
  lines.push('## SYNOPSIS');
  lines.push('');
  lines.push(story.summary);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Story content formatted as scenario
  lines.push('## SCÉNARIO');
  lines.push('');

  // Parse story content into scenes
  const scenes = parseStoryToScenes(story.content, story.parts);

  scenes.forEach((scene, index) => {
    lines.push(`### SCÈNE ${index + 1}`);
    lines.push('');
    lines.push(`**LIEU:** ${scene.location}`);
    lines.push(`**TEMPS:** ${scene.timeOfDay}`);
    lines.push('');

    // Scene description
    lines.push('*' + scene.description + '*');
    lines.push('');

    // Dialogues
    scene.dialogues.forEach((dialogue) => {
      lines.push(`**${dialogue.character}:**`);
      lines.push(dialogue.text);
      lines.push('');
    });

    lines.push('---');
    lines.push('');
  });

  // Footer
  lines.push('*Généré automatiquement par StoryCore-Engine*');

  return lines.join('\n');
}

/**
 * Parse story content into scenes
 */
function parseStoryToScenes(content: string, parts?: StoryPart[]): Scene[] {
  const scenes: Scene[] = [];

  if (parts && parts.length > 0) {
    // Use parts if available
    parts.forEach((part, index) => {
      scenes.push({
        location: 'À déterminer',
        timeOfDay: 'Jour',
        description: part.summary || part.content.substring(0, 200),
        dialogues: extractDialogues(part.content),
      });
    });
  } else {
    // Parse content into scenes
    const paragraphs = content.split(/\n\n+/);
    let currentScene: Scene = {
      location: 'À déterminer',
      timeOfDay: 'Jour',
      description: '',
      dialogues: [],
    };

    paragraphs.forEach((para) => {
      const trimmed = para.trim();
      if (!trimmed) return;

      // Check for scene header
      if (trimmed.match(/^(INT\.|EXT\.|CHAPITRE|SCÈNE)/i)) {
        if (currentScene.description || currentScene.dialogues.length > 0) {
          scenes.push(currentScene);
        }
        currentScene = {
          location: extractLocation(trimmed),
          timeOfDay: 'Jour',
          description: '',
          dialogues: [],
        };
      } else if (trimmed.includes(':') && trimmed.length < 500) {
        // Likely dialogue
        const colonIndex = trimmed.indexOf(':');
        currentScene.dialogues.push({
          character: trimmed.substring(0, colonIndex).trim(),
          text: trimmed.substring(colonIndex + 1).trim(),
        });
      } else {
        currentScene.description += (currentScene.description ? ' ' : '') + trimmed;
      }
    });

    if (currentScene.description || currentScene.dialogues.length > 0) {
      scenes.push(currentScene);
    }
  }

  return scenes.length > 0 ? scenes : [{
    location: 'À déterminer',
    timeOfDay: 'Jour',
    description: content.substring(0, 500),
    dialogues: [],
  }];
}

interface Scene {
  location: string;
  timeOfDay: string;
  description: string;
  dialogues: Array<{ character: string; text: string }>;
}

function extractDialogues(content: string): Array<{ character: string; text: string }> {
  const dialogues: Array<{ character: string; text: string }> = [];
  const lines = content.split('\n');

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.includes(':') && trimmed.length < 300) {
      const colonIndex = trimmed.indexOf(':');
      const beforeColon = trimmed.substring(0, colonIndex).trim();
      // Check if it looks like a character name (short, starts with capital)
      if (beforeColon.length < 30 && /^[A-ZÉÈÊËÀÂÄÙÛÜÔÖÎÏÇ]/.test(beforeColon)) {
        dialogues.push({
          character: beforeColon,
          text: trimmed.substring(colonIndex + 1).trim(),
        });
      }
    }
  });

  return dialogues;
}

function extractLocation(header: string): string {
  const match = header.match(/(?:INT\.|EXT\.)\s*[:-]?\s*(.+)/i);
  return match ? match[1].trim() : 'À déterminer';
}

function getEstimatedDuration(length: Story['length']): string {
  const durations: Record<string, string> = {
    scene: '1-2 minutes',
    short: '2-5 minutes',
    short_story: '5-10 minutes',
    medium: '10-20 minutes',
    novella: '20-40 minutes',
    long: '40-60 minutes',
    novel: '60-90 minutes',
    epic_novel: '90-120 minutes',
  };
  return durations[length] || '15-30 minutes';
}

/**
 * Save scenario.md file to project
 */
export async function saveScenarioToDisk(projectPath: string, story: Story): Promise<void> {
  if (!window.electronAPI?.fs) {
    throw new Error('Electron API not available');
  }

  try {
    // Generate scenario content
    const scenarioContent = generateScenarioContent(story);

    // Write scenario.md at project root
    const scenarioPath = `${projectPath}/scenario.md`;
    await window.electronAPI.fs.writeFile(scenarioPath, scenarioContent);

    console.log(`[StoryFileIO] Scenario saved: ${scenarioPath}`);
  } catch (error) {
    console.error('[StoryFileIO] Failed to save scenario:', error);
    throw error;
  }
}
