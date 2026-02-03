/**
 * Unit tests for project validation utilities
 * 
 * These tests verify that the frontend validation matches the backend validation
 * rules from src/project_manager.py
 */

import { describe, it, expect } from 'vitest';
import {
  validateProjectName,
  validateProjectPath,
  checkDuplicateProject,
  validateProjectCreation,
} from '../projectValidation';

describe('validateProjectName', () => {
  describe('empty and whitespace validation', () => {
    it('should reject empty project name', () => {
      const result = validateProjectName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject whitespace-only project name', () => {
      const result = validateProjectName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('whitespace');
    });

    it('should reject project name with leading whitespace', () => {
      const result = validateProjectName('  my-project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('leading or trailing whitespace');
    });

    it('should reject project name with trailing whitespace', () => {
      const result = validateProjectName('my-project  ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('leading or trailing whitespace');
    });
  });

  describe('path traversal validation', () => {
    it('should reject project name with parent directory reference', () => {
      const result = validateProjectName('../my-project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('..');
    });

    it('should reject project name with path separator at start', () => {
      const result = validateProjectName('/my-project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('path separators');
    });

    it('should reject project name with backslash at start', () => {
      const result = validateProjectName('\\my-project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('path separators');
    });

    it('should reject project name with drive letter', () => {
      const result = validateProjectName('C:my-project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('drive letters');
    });
  });

  describe('invalid character validation', () => {
    it('should reject project name with forward slash', () => {
      const result = validateProjectName('my/project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject project name with backslash', () => {
      const result = validateProjectName('my\\project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject project name with colon', () => {
      const result = validateProjectName('my:project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject project name with asterisk', () => {
      const result = validateProjectName('my*project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject project name with question mark', () => {
      const result = validateProjectName('my?project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject project name with double quote', () => {
      const result = validateProjectName('my"project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject project name with less than', () => {
      const result = validateProjectName('my<project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject project name with greater than', () => {
      const result = validateProjectName('my>project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject project name with pipe', () => {
      const result = validateProjectName('my|project');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });
  });

  describe('Windows reserved names validation', () => {
    it('should reject CON', () => {
      const result = validateProjectName('CON');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved system name');
    });

    it('should reject PRN', () => {
      const result = validateProjectName('PRN');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved system name');
    });

    it('should reject AUX', () => {
      const result = validateProjectName('AUX');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved system name');
    });

    it('should reject NUL', () => {
      const result = validateProjectName('NUL');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved system name');
    });

    it('should reject COM1', () => {
      const result = validateProjectName('COM1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved system name');
    });

    it('should reject LPT1', () => {
      const result = validateProjectName('LPT1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved system name');
    });

    it('should reject reserved names case-insensitively', () => {
      const result = validateProjectName('con');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved system name');
    });

    it('should reject reserved names with extension', () => {
      const result = validateProjectName('CON.txt');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('reserved system name');
    });
  });

  describe('period validation', () => {
    it('should reject project name ending with period', () => {
      const result = validateProjectName('my-project.');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('period');
    });

    it('should allow project name with period in middle', () => {
      const result = validateProjectName('my.project');
      expect(result.isValid).toBe(true);
    });
  });

  describe('valid project names', () => {
    it('should accept simple alphanumeric name', () => {
      const result = validateProjectName('myproject');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept name with hyphens', () => {
      const result = validateProjectName('my-project');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with underscores', () => {
      const result = validateProjectName('my_project');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with spaces', () => {
      const result = validateProjectName('My Project');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with numbers', () => {
      const result = validateProjectName('project123');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with mixed case', () => {
      const result = validateProjectName('MyAwesomeProject');
      expect(result.isValid).toBe(true);
    });

    it('should accept name with period in middle', () => {
      const result = validateProjectName('project.v2');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('validateProjectPath', () => {
  it('should reject empty path', () => {
    const result = validateProjectPath('');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject whitespace-only path', () => {
    const result = validateProjectPath('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should accept valid path', () => {
    const result = validateProjectPath('C:/Users/Documents/Projects');
    expect(result.isValid).toBe(true);
  });

  it('should accept Unix-style path', () => {
    const result = validateProjectPath('/home/user/projects');
    expect(result.isValid).toBe(true);
  });
});

describe('checkDuplicateProject', () => {
  it('should detect duplicate project name', () => {
    const existingProjects = [
      'C:/Projects/my-project',
      'C:/Projects/another-project',
    ];
    const result = checkDuplicateProject('my-project', 'C:/Projects', existingProjects);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('should detect duplicate case-insensitively', () => {
    const existingProjects = ['C:/Projects/My-Project'];
    const result = checkDuplicateProject('my-project', 'C:/Projects', existingProjects);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('already exists');
  });

  it('should allow unique project name', () => {
    const existingProjects = [
      'C:/Projects/project1',
      'C:/Projects/project2',
    ];
    const result = checkDuplicateProject('project3', 'C:/Projects', existingProjects);
    expect(result.isValid).toBe(true);
  });

  it('should handle project names without paths', () => {
    const existingProjects = ['project1', 'project2'];
    const result = checkDuplicateProject('project3', 'C:/Projects', existingProjects);
    expect(result.isValid).toBe(true);
  });

  it('should handle empty existing projects list', () => {
    const result = checkDuplicateProject('my-project', 'C:/Projects', []);
    expect(result.isValid).toBe(true);
  });
});

describe('validateProjectCreation', () => {
  it('should validate both name and path', () => {
    const result = validateProjectCreation('my-project', 'C:/Projects');
    expect(result.isValid).toBe(true);
    expect(result.projectName).toBeUndefined();
    expect(result.projectPath).toBeUndefined();
  });

  it('should return errors for invalid name', () => {
    const result = validateProjectCreation('', 'C:/Projects');
    expect(result.isValid).toBe(false);
    expect(result.projectName).toBeDefined();
  });

  it('should return errors for invalid path', () => {
    const result = validateProjectCreation('my-project', '');
    expect(result.isValid).toBe(false);
    expect(result.projectPath).toBeDefined();
  });

  it('should return errors for both invalid name and path', () => {
    const result = validateProjectCreation('', '');
    expect(result.isValid).toBe(false);
    expect(result.projectName).toBeDefined();
    expect(result.projectPath).toBeDefined();
  });

  it('should check for duplicates', () => {
    const existingProjects = ['C:/Projects/my-project'];
    const result = validateProjectCreation('my-project', 'C:/Projects', existingProjects);
    expect(result.isValid).toBe(false);
    expect(result.projectName).toContain('already exists');
  });

  it('should reject invalid characters', () => {
    const result = validateProjectCreation('my/project', 'C:/Projects');
    expect(result.isValid).toBe(false);
    expect(result.projectName).toContain('invalid characters');
  });

  it('should reject Windows reserved names', () => {
    const result = validateProjectCreation('CON', 'C:/Projects');
    expect(result.isValid).toBe(false);
    expect(result.projectName).toContain('reserved system name');
  });
});
