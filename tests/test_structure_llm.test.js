// Tests pour valider la structure du projet StoryCore-Engine pour une recherche efficace par les LLM.
// Ce script vérifie la hiérarchie des fichiers, les conventions de nommage et les métadonnées.

import fs from 'fs';
import path from 'path';

describe('Structure du projet pour une recherche efficace par les LLM', () => {
  const basePath = path.resolve('c:/storycore-engine');
  const corePath = path.join(basePath, 'core');
  const assetsPath = path.join(basePath, 'assets');
  const modulesPath = path.join(basePath, 'modules');
  const scriptsPath = path.join(basePath, 'scripts');
  const configPath = path.join(basePath, 'config');
  const docsPath = path.join(basePath, 'docs');
  const testsPath = path.join(basePath, 'tests');

  test('Vérification de la hiérarchie globale', () => {
    const requiredDirs = [
      corePath,
      assetsPath,
      modulesPath,
      scriptsPath,
      configPath,
      docsPath,
      testsPath
    ];

    requiredDirs.forEach(dirPath => {
      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });

  test('Conventions de nommage des dossiers (snake_case)', () => {
    if (fs.existsSync(assetsPath)) {
      const items = fs.readdirSync(assetsPath, { withFileTypes: true });
      items.forEach(item => {
        if (item.isDirectory()) {
          const isSnakeCase = /^[a-z]+(_[a-z]+)*$/.test(item.name);
          expect(isSnakeCase).toBe(true);
        }
      });
    }
  });

  test('Conventions de nommage des fichiers (snake_case)', () => {
    const enginePath = path.join(corePath, 'engine');
    if (fs.existsSync(enginePath)) {
      const items = fs.readdirSync(enginePath, { withFileTypes: true });
      items.forEach(item => {
        if (item.isFile()) {
          const fileName = path.parse(item.name).name;
          const isSnakeCase = /^[a-z]+(_[a-z]+)*$/.test(fileName);
          expect(isSnakeCase).toBe(true);
        }
      });
    }
  });

  test('Métadonnées des prompts', () => {
    const promptsPath = path.join(assetsPath, 'prompts');
    if (fs.existsSync(promptsPath)) {
      const findJsonFiles = (dir) => {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat && stat.isDirectory()) {
            results = results.concat(findJsonFiles(filePath));
          } else if (file.endsWith('.json')) {
            results.push(filePath);
          }
        });
        return results;
      };

      const jsonFiles = findJsonFiles(promptsPath);
      jsonFiles.forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const requiredFields = [
          'id', 'name', 'description', 'category', 'subcategory',
          'tags', 'version', 'created_at', 'updated_at', 'author',
          'usage', 'examples', 'variables'
        ];

        requiredFields.forEach(field => {
          expect(data).toHaveProperty(field);
        });
      });
    }
  });

  test('Métadonnées des templates', () => {
    const templatesPath = path.join(assetsPath, 'templates');
    if (fs.existsSync(templatesPath)) {
      const findJsonFiles = (dir) => {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat && stat.isDirectory()) {
            results = results.concat(findJsonFiles(filePath));
          } else if (file.endsWith('.json')) {
            results.push(filePath);
          }
        });
        return results;
      };

      const jsonFiles = findJsonFiles(templatesPath);
      jsonFiles.forEach(filePath => {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const requiredFields = [
          'id', 'name', 'description', 'category', 'subcategory',
          'tags', 'version', 'created_at', 'updated_at', 'author',
          'usage', 'examples', 'fields'
        ];

        requiredFields.forEach(field => {
          expect(data).toHaveProperty(field);
        });
      });
    }
  });

  test('Structure modulaire', () => {
    const videoEnginePath = path.join(modulesPath, 'video_engine');
    const analyticsPath = path.join(modulesPath, 'analytics');

    if (fs.existsSync(modulesPath)) {
      expect(fs.existsSync(videoEnginePath)).toBe(true);
      expect(fs.existsSync(analyticsPath)).toBe(true);
    }
  });

  test('Séparation des préoccupations', () => {
    expect(fs.existsSync(corePath)).toBe(true);
    expect(fs.existsSync(assetsPath)).toBe(true);
    expect(fs.existsSync(modulesPath)).toBe(true);
  });

  test('Scalabilité', () => {
    const newModulePath = path.join(modulesPath, 'new_module');
    if (!fs.existsSync(newModulePath)) {
      fs.mkdirSync(newModulePath);
      expect(fs.existsSync(newModulePath)).toBe(true);
      fs.rmdirSync(newModulePath);
    }
  });

  test('Intuitivité', () => {
    const promptsPath = path.join(assetsPath, 'prompts');
    const templatesPath = path.join(assetsPath, 'templates');

    expect(fs.existsSync(promptsPath)).toBe(true);
    expect(fs.existsSync(templatesPath)).toBe(true);
  });
});