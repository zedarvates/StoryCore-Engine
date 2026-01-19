import { ProjectValidator, ProjectConfig } from './ProjectValidator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ProjectValidator', () => {
  let validator: ProjectValidator;
  let tempDir: string;

  beforeEach(() => {
    validator = new ProjectValidator();
    // Create a temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'storycore-test-'));
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validate', () => {
    it('should validate a valid project structure', async () => {
      // Create a valid project structure
      const projectJson: ProjectConfig = {
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'project.json'),
        JSON.stringify(projectJson, null, 2)
      );

      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.config).toBeDefined();
      expect(result.config?.project_name).toBe('Test Project');
    });

    it('should fail validation for non-existent directory', async () => {
      const nonExistentPath = path.join(tempDir, 'does-not-exist');
      const result = await validator.validate(nonExistentPath);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('missing_directory');
    });

    it('should fail validation for file instead of directory', async () => {
      const filePath = path.join(tempDir, 'not-a-dir.txt');
      fs.writeFileSync(filePath, 'test');

      const result = await validator.validate(filePath);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('invalid_config');
      expect(result.errors[0].message).toContain('not a directory');
    });

    it('should fail validation for missing project.json', async () => {
      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.path === 'project.json')).toBe(true);
    });

    it('should fail validation for invalid JSON in project.json', async () => {
      fs.writeFileSync(path.join(tempDir, 'project.json'), 'invalid json{');

      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('JSON syntax'))).toBe(true);
    });

    it('should fail validation for missing schema_version', async () => {
      const invalidConfig = {
        project_name: 'Test',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'project.json'),
        JSON.stringify(invalidConfig)
      );

      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('schema_version'))).toBe(true);
    });

    it('should fail validation for missing project_name', async () => {
      const invalidConfig = {
        schema_version: '1.0',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'project.json'),
        JSON.stringify(invalidConfig)
      );

      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('project_name'))).toBe(true);
    });

    it('should fail validation for missing capabilities', async () => {
      const invalidConfig = {
        schema_version: '1.0',
        project_name: 'Test',
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'project.json'),
        JSON.stringify(invalidConfig)
      );

      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('capabilities'))).toBe(true);
    });

    it('should fail validation for invalid generation_status', async () => {
      const invalidConfig = {
        schema_version: '1.0',
        project_name: 'Test',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'invalid_status',
          promotion: 'pending',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'project.json'),
        JSON.stringify(invalidConfig)
      );

      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('grid status'))).toBe(true);
    });

    it('should warn about version mismatch', async () => {
      const projectJson: ProjectConfig = {
        schema_version: '1.0',
        project_name: 'Test Project',
        storycore_version: '0.9.0',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'project.json'),
        JSON.stringify(projectJson, null, 2)
      );

      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === 'VERSION_MISMATCH')).toBe(true);
    });

    it('should warn about missing optional files', async () => {
      const projectJson: ProjectConfig = {
        schema_version: '1.0',
        project_name: 'Test Project',
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      fs.writeFileSync(
        path.join(tempDir, 'project.json'),
        JSON.stringify(projectJson, null, 2)
      );

      const result = await validator.validate(tempDir);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.code === 'OPTIONAL_FILE_MISSING')).toBe(true);
    });
  });

  describe('quickCheck', () => {
    it('should return true for valid project directory', async () => {
      fs.writeFileSync(path.join(tempDir, 'project.json'), '{}');

      const result = await validator.quickCheck(tempDir);

      expect(result).toBe(true);
    });

    it('should return false for non-existent directory', async () => {
      const result = await validator.quickCheck(path.join(tempDir, 'does-not-exist'));

      expect(result).toBe(false);
    });

    it('should return false for directory without project.json', async () => {
      const result = await validator.quickCheck(tempDir);

      expect(result).toBe(false);
    });

    it('should return false for file instead of directory', async () => {
      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, 'test');

      const result = await validator.quickCheck(filePath);

      expect(result).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('should return empty string for valid result', () => {
      const result = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      const message = validator.getErrorMessage(result);

      expect(message).toBe('');
    });

    it('should return message for missing files', () => {
      const result = {
        isValid: false,
        errors: [
          {
            type: 'missing_file' as const,
            path: 'project.json',
            message: 'Missing file',
          },
        ],
        warnings: [],
      };

      const message = validator.getErrorMessage(result);

      expect(message).toContain('Missing files');
      expect(message).toContain('project.json');
    });

    it('should return message for configuration errors', () => {
      const result = {
        isValid: false,
        errors: [
          {
            type: 'invalid_config' as const,
            path: 'project.json',
            message: 'Invalid config',
          },
        ],
        warnings: [],
      };

      const message = validator.getErrorMessage(result);

      expect(message).toContain('Configuration errors');
    });

    it('should return message for permission errors', () => {
      const result = {
        isValid: false,
        errors: [
          {
            type: 'permission' as const,
            path: '/path',
            message: 'Permission denied',
          },
        ],
        warnings: [],
      };

      const message = validator.getErrorMessage(result);

      expect(message).toContain('Permission denied');
    });

    it('should combine multiple error types', () => {
      const result = {
        isValid: false,
        errors: [
          {
            type: 'missing_file' as const,
            path: 'project.json',
            message: 'Missing file',
          },
          {
            type: 'invalid_config' as const,
            path: 'config',
            message: 'Invalid',
          },
        ],
        warnings: [],
      };

      const message = validator.getErrorMessage(result);

      expect(message).toContain('Missing files');
      expect(message).toContain('Configuration errors');
    });
  });
});
