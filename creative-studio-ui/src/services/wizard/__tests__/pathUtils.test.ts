/**
 * Path Utilities Tests
 * 
 * Tests for cross-platform path handling utilities
 */

import { describe, it, expect } from 'vitest';
import {
  joinPath,
  normalizePath,
  toPlatformPath,
  getDirName,
  getBaseName,
  getExtension,
  getFileNameWithoutExt,
  isAbsolute,
  resolvePath,
  getRelativePath,
  sanitizeFilename,
  isSafePath,
  generateUniqueId,
  generateUniqueFilename,
  buildProjectFilePath,
  buildAssetFilePath,
  parseFilePath,
} from '../pathUtils';

describe('pathUtils', () => {
  describe('joinPath', () => {
    it('should join path segments with forward slashes', () => {
      expect(joinPath('a', 'b', 'c')).toBe('a/b/c');
      expect(joinPath('projects', 'my-project', 'assets')).toBe('projects/my-project/assets');
    });

    it('should handle empty segments', () => {
      expect(joinPath('a', '', 'b')).toBe('a/b');
      expect(joinPath('', 'a', 'b')).toBe('a/b');
    });

    it('should normalize multiple slashes', () => {
      expect(joinPath('a//b', 'c')).toBe('a/b/c');
    });
  });

  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizePath('a\\b\\c')).toBe('a/b/c');
      expect(normalizePath('C:\\Users\\test')).toBe('C:/Users/test');
    });

    it('should handle mixed separators', () => {
      expect(normalizePath('a/b\\c/d')).toBe('a/b/c/d');
    });

    it('should normalize multiple slashes', () => {
      expect(normalizePath('a//b///c')).toBe('a/b/c');
    });
  });

  describe('getDirName', () => {
    it('should return directory path', () => {
      expect(getDirName('a/b/c.txt')).toBe('a/b');
      expect(getDirName('projects/my-project/file.json')).toBe('projects/my-project');
    });

    it('should handle root paths', () => {
      expect(getDirName('/file.txt')).toBe('/');
      expect(getDirName('file.txt')).toBe('.');
    });
  });

  describe('getBaseName', () => {
    it('should return filename with extension', () => {
      expect(getBaseName('a/b/c.txt')).toBe('c.txt');
      expect(getBaseName('projects/file.json')).toBe('file.json');
    });

    it('should handle paths without directory', () => {
      expect(getBaseName('file.txt')).toBe('file.txt');
    });
  });

  describe('getExtension', () => {
    it('should return file extension with dot', () => {
      expect(getExtension('file.txt')).toBe('.txt');
      expect(getExtension('image.png')).toBe('.png');
      expect(getExtension('data.json')).toBe('.json');
    });

    it('should return empty string for files without extension', () => {
      expect(getExtension('file')).toBe('');
      expect(getExtension('README')).toBe('');
    });

    it('should handle hidden files', () => {
      expect(getExtension('.gitignore')).toBe('');
      expect(getExtension('.env.local')).toBe('.local');
    });
  });

  describe('getFileNameWithoutExt', () => {
    it('should return filename without extension', () => {
      expect(getFileNameWithoutExt('file.txt')).toBe('file');
      expect(getFileNameWithoutExt('a/b/image.png')).toBe('image');
    });

    it('should handle files without extension', () => {
      expect(getFileNameWithoutExt('README')).toBe('README');
    });
  });

  describe('isAbsolute', () => {
    it('should detect Unix absolute paths', () => {
      expect(isAbsolute('/home/user/file.txt')).toBe(true);
      expect(isAbsolute('/projects')).toBe(true);
    });

    it('should detect Windows absolute paths', () => {
      expect(isAbsolute('C:\\Users\\test')).toBe(true);
      expect(isAbsolute('D:/projects')).toBe(true);
    });

    it('should detect relative paths', () => {
      expect(isAbsolute('relative/path')).toBe(false);
      expect(isAbsolute('./file.txt')).toBe(false);
      expect(isAbsolute('../parent')).toBe(false);
    });
  });

  describe('resolvePath', () => {
    it('should resolve relative paths', () => {
      expect(resolvePath('/base', 'file.txt')).toBe('/base/file.txt');
      expect(resolvePath('projects', 'my-project')).toBe('projects/my-project');
    });

    it('should return absolute paths as-is', () => {
      expect(resolvePath('/base', '/absolute/path')).toBe('/absolute/path');
    });
  });

  describe('getRelativePath', () => {
    it('should calculate relative path', () => {
      expect(getRelativePath('a/b', 'a/b/c')).toBe('c');
      expect(getRelativePath('a/b/c', 'a/b')).toBe('..');
    });

    it('should handle paths with no common base', () => {
      const result = getRelativePath('a/b', 'c/d');
      expect(result).toContain('..');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('file<name>.txt')).toBe('filename.txt');
      expect(sanitizeFilename('file:name')).toBe('filename');
      expect(sanitizeFilename('file|name')).toBe('filename');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name.txt')).toBe('my_file_name.txt');
    });

    it('should handle slashes', () => {
      expect(sanitizeFilename('path/to/file')).toBe('path-to-file');
      expect(sanitizeFilename('path\\to\\file')).toBe('path-to-file');
    });
  });

  describe('isSafePath', () => {
    it('should allow safe paths', () => {
      expect(isSafePath('/base', 'file.txt')).toBe(true);
      expect(isSafePath('/base', 'subdir/file.txt')).toBe(true);
    });

    it('should reject directory traversal attempts', () => {
      expect(isSafePath('/base', '../outside')).toBe(false);
      expect(isSafePath('/base', '../../etc/passwd')).toBe(false);
    });
  });

  describe('generateUniqueId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateUniqueId('shot');
      const id2 = generateUniqueId('shot');
      
      expect(id1).toMatch(/^shot_\d+$/);
      expect(id2).toMatch(/^shot_\d+$/);
      expect(id1).not.toBe(id2);
    });

    it('should include index when provided', () => {
      const id = generateUniqueId('shot', 5);
      expect(id).toMatch(/^shot_\d+_5$/);
    });
  });

  describe('generateUniqueFilename', () => {
    it('should generate unique filenames', () => {
      const filename1 = generateUniqueFilename('asset', 'png');
      const filename2 = generateUniqueFilename('asset', 'png');
      
      expect(filename1).toMatch(/^asset_\d+\.png$/);
      expect(filename2).toMatch(/^asset_\d+\.png$/);
      expect(filename1).not.toBe(filename2);
    });
  });

  describe('buildProjectFilePath', () => {
    it('should build project file paths', () => {
      const path = buildProjectFilePath('/projects/my-project', 'characters', 'char_123.json');
      expect(path).toBe('/projects/my-project/characters/char_123.json');
    });
  });

  describe('buildAssetFilePath', () => {
    it('should build asset file paths', () => {
      const path = buildAssetFilePath('/projects/my-project', 'images', 'image.png');
      expect(path).toBe('/projects/my-project/assets/images/image.png');
    });
  });

  describe('parseFilePath', () => {
    it('should parse file path into components', () => {
      const parsed = parseFilePath('a/b/file.txt');
      
      expect(parsed.dir).toBe('a/b');
      expect(parsed.base).toBe('file.txt');
      expect(parsed.ext).toBe('.txt');
      expect(parsed.name).toBe('file');
    });
  });
});
