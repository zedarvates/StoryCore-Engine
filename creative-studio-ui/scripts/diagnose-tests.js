#!/usr/bin/env node

/**
 * Script de diagnostic pour identifier les tests problématiques
 * Exécute les tests par groupes et identifie ceux qui timeout ou échouent
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const TEST_TIMEOUT = 60000; // 60 secondes par groupe de tests
const srcDir = join(process.cwd(), 'src');

// Fonction pour trouver tous les fichiers de test
function findTestFiles(dir, fileList = []) {
  const files = readdirSync(dir);
  
  files.forEach(file => {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    
    if (stat.isDirectory()) {
      findTestFiles(filePath, fileList);
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Fonction pour exécuter un test et mesurer le temps
function runTest(testFile) {
  const relativePath = relative(process.cwd(), testFile);
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${relativePath}`);
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  let status = 'PASS';
  let error = null;
  
  try {
    execSync(`npm test -- ${testFile}`, {
      stdio: 'inherit',
      timeout: TEST_TIMEOUT,
      encoding: 'utf-8'
    });
  } catch (err) {
    status = err.killed ? 'TIMEOUT' : 'FAIL';
    error = err.message;
  }
  
  const duration = Date.now() - startTime;
  
  return {
    file: relativePath,
    status,
    duration,
    error
  };
}

// Main
console.log('🔍 Diagnostic de la suite de tests\n');
console.log('Recherche des fichiers de test...');

const testFiles = findTestFiles(srcDir);
console.log(`\n✓ ${testFiles.length} fichiers de test trouvés\n`);

const results = [];

for (const testFile of testFiles) {
  const result = runTest(testFile);
  results.push(result);
}

// Rapport final
console.log('\n\n' + '='.repeat(80));
console.log('RAPPORT DE DIAGNOSTIC');
console.log('='.repeat(80) + '\n');

const passed = results.filter(r => r.status === 'PASS');
const failed = results.filter(r => r.status === 'FAIL');
const timeout = results.filter(r => r.status === 'TIMEOUT');

console.log(`✓ Tests réussis: ${passed.length}`);
console.log(`✗ Tests échoués: ${failed.length}`);
console.log(`⏱ Tests timeout: ${timeout.length}`);
console.log(`📊 Total: ${results.length}\n`);

if (failed.length > 0) {
  console.log('Tests échoués:');
  failed.forEach(r => {
    console.log(`  ✗ ${r.file} (${r.duration}ms)`);
  });
  console.log('');
}

if (timeout.length > 0) {
  console.log('Tests timeout:');
  timeout.forEach(r => {
    console.log(`  ⏱ ${r.file} (>${TEST_TIMEOUT}ms)`);
  });
  console.log('');
}

// Tests les plus lents
const slowest = [...results]
  .filter(r => r.status === 'PASS')
  .sort((a, b) => b.duration - a.duration)
  .slice(0, 5);

if (slowest.length > 0) {
  console.log('Tests les plus lents:');
  slowest.forEach(r => {
    console.log(`  🐌 ${r.file} (${r.duration}ms)`);
  });
  console.log('');
}

// Sauvegarder le rapport
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: results.length,
    passed: passed.length,
    failed: failed.length,
    timeout: timeout.length
  },
  results
};

import { writeFileSync } from 'fs';
writeFileSync(
  'test-diagnostic-report.json',
  JSON.stringify(report, null, 2)
);

console.log('✓ Rapport sauvegardé dans test-diagnostic-report.json\n');

// Code de sortie
process.exit(failed.length + timeout.length > 0 ? 1 : 0);
