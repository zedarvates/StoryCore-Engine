/**
 * ScreenplayParser Service
 * Parses screenplay format text into structured scene data
 */

import type { ParsedScene, DialogueLine } from '@/types/wizard';

// ============================================================================
// Parser Configuration
// ============================================================================

const SCENE_HEADING_REGEX = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+(.+?)\s+-\s+(.+)$/i;
const CHARACTER_NAME_REGEX = /^[A-Z][A-Z\s.']+$/;
const PARENTHETICAL_REGEX = /^\(([^)]+)\)$/;
const TRANSITION_REGEX = /^(CUT TO:|FADE TO:|DISSOLVE TO:|FADE OUT\.|FADE IN:)$/i;

// Maximum character name length (to avoid false positives)
const MAX_CHARACTER_NAME_LENGTH = 30;

// ============================================================================
// Parser Class
// ============================================================================

export class ScreenplayParser {
  /**
   * Parse screenplay text into structured scenes
   */
  parse(content: string): ParsedScene[] {
    const lines = this.preprocessLines(content);
    const scenes: ParsedScene[] = [];
    
    let currentScene: Partial<ParsedScene> | null = null;
    let sceneNumber = 0;
    let currentDescription: string[] = [];
    let currentDialogue: DialogueLine[] = [];
    let currentCharacter = '';
    let lastLineWasCharacter = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        lastLineWasCharacter = false;
        continue;
      }
      
      // Check for scene heading
      const sceneHeadingMatch = trimmed.match(SCENE_HEADING_REGEX);
      if (sceneHeadingMatch) {
        // Save previous scene
        if (currentScene) {
          currentScene.description = this.cleanDescription(currentDescription);
          currentScene.dialogue = currentDialogue;
          scenes.push(currentScene as ParsedScene);
        }
        
        // Start new scene
        sceneNumber++;
        currentScene = {
          sceneNumber,
          heading: trimmed,
          description: '',
          dialogue: [],
          characters: [],
        };
        currentDescription = [];
        currentDialogue = [];
        currentCharacter = '';
        lastLineWasCharacter = false;
        continue;
      }
      
      // Skip if no scene started yet
      if (!currentScene) {
        continue;
      }
      
      // Check for transition (skip these)
      if (TRANSITION_REGEX.test(trimmed)) {
        lastLineWasCharacter = false;
        continue;
      }
      
      // Check for character name
      if (this.isCharacterName(trimmed)) {
        currentCharacter = this.cleanCharacterName(trimmed);
        if (!currentScene.characters?.includes(currentCharacter)) {
          currentScene.characters = [...(currentScene.characters || []), currentCharacter];
        }
        lastLineWasCharacter = true;
        continue;
      }
      
      // Check for parenthetical (only valid after character name)
      if (lastLineWasCharacter && PARENTHETICAL_REGEX.test(trimmed)) {
        // Store parenthetical for next dialogue line
        const parentheticalMatch = trimmed.match(PARENTHETICAL_REGEX);
        if (parentheticalMatch && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine) {
            currentDialogue.push({
              character: currentCharacter,
              line: nextLine,
              parenthetical: parentheticalMatch[1],
            });
            i++; // Skip next line since we processed it
          }
        }
        lastLineWasCharacter = false;
        continue;
      }
      
      // Check for dialogue (follows character name)
      if (lastLineWasCharacter && currentCharacter) {
        currentDialogue.push({
          character: currentCharacter,
          line: trimmed,
        });
        lastLineWasCharacter = false;
        continue;
      }
      
      // Otherwise, it's action/description
      currentDescription.push(trimmed);
      lastLineWasCharacter = false;
    }
    
    // Save last scene
    if (currentScene) {
      currentScene.description = this.cleanDescription(currentDescription);
      currentScene.dialogue = currentDialogue;
      scenes.push(currentScene as ParsedScene);
    }
    
    return scenes;
  }
  
  /**
   * Extract scene boundaries from screenplay
   */
  extractSceneBoundaries(content: string): Array<{ sceneNumber: number; heading: string; startLine: number }> {
    const lines = content.split('\n');
    const boundaries: Array<{ sceneNumber: number; heading: string; startLine: number }> = [];
    let sceneNumber = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      const sceneHeadingMatch = trimmed.match(SCENE_HEADING_REGEX);
      
      if (sceneHeadingMatch) {
        sceneNumber++;
        boundaries.push({
          sceneNumber,
          heading: trimmed,
          startLine: i,
        });
      }
    }
    
    return boundaries;
  }
  
  /**
   * Extract all character names from screenplay
   */
  extractCharacterNames(content: string): string[] {
    const lines = this.preprocessLines(content);
    const characters = new Set<string>();
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (this.isCharacterName(trimmed)) {
        characters.add(this.cleanCharacterName(trimmed));
      }
    }
    
    return Array.from(characters).sort();
  }
  
  /**
   * Extract all dialogue lines for a specific character
   */
  extractCharacterDialogue(content: string, characterName: string): DialogueLine[] {
    const scenes = this.parse(content);
    const dialogue: DialogueLine[] = [];
    
    for (const scene of scenes) {
      for (const line of scene.dialogue) {
        if (line.character.toLowerCase() === characterName.toLowerCase()) {
          dialogue.push(line);
        }
      }
    }
    
    return dialogue;
  }
  
  /**
   * Validate screenplay format
   */
  validate(content: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if content is empty
    if (!content.trim()) {
      errors.push('Screenplay content is empty');
      return { isValid: false, errors, warnings };
    }
    
    // Check for at least one scene heading
    const scenes = this.extractSceneBoundaries(content);
    if (scenes.length === 0) {
      errors.push('No scene headings found. Scene headings should start with INT., EXT., or INT/EXT.');
    }
    
    // Check for characters
    const characters = this.extractCharacterNames(content);
    if (characters.length === 0) {
      warnings.push('No character names detected. Character names should be in ALL CAPS.');
    }
    
    // Check for dialogue
    const parsedScenes = this.parse(content);
    const totalDialogue = parsedScenes.reduce((sum, scene) => sum + scene.dialogue.length, 0);
    if (totalDialogue === 0) {
      warnings.push('No dialogue detected in screenplay.');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  // ============================================================================
  // Private Helper Methods
  // ============================================================================
  
  /**
   * Preprocess lines: normalize whitespace and line endings
   */
  private preprocessLines(content: string): string[] {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n')
      .split('\n')
      .map(line => line.trimEnd()); // Remove trailing whitespace but keep leading
  }
  
  /**
   * Check if a line is a character name
   */
  private isCharacterName(line: string): boolean {
    // Must be all uppercase
    if (line !== line.toUpperCase()) {
      return false;
    }
    
    // Must not be too long
    if (line.length > MAX_CHARACTER_NAME_LENGTH) {
      return false;
    }
    
    // Must match character name pattern
    if (!CHARACTER_NAME_REGEX.test(line)) {
      return false;
    }
    
    // Must not be a scene heading
    if (SCENE_HEADING_REGEX.test(line)) {
      return false;
    }
    
    // Must not be a transition
    if (TRANSITION_REGEX.test(line)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Clean character name (remove extensions like (V.O.), (O.S.), etc.)
   */
  private cleanCharacterName(name: string): string {
    return name
      .replace(/\s*\(V\.O\.\)\s*$/i, '')
      .replace(/\s*\(O\.S\.\)\s*$/i, '')
      .replace(/\s*\(O\.C\.\)\s*$/i, '')
      .replace(/\s*\(CONT'D\)\s*$/i, '')
      .trim();
  }
  
  /**
   * Clean and join description lines
   */
  private cleanDescription(lines: string[]): string {
    return lines
      .filter(line => line.trim())
      .join(' ')
      .trim();
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const screenplayParser = new ScreenplayParser();
