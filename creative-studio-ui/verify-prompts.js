/**
 * Quick verification script to check all 93 prompts are accessible
 * Run with: node verify-prompts.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the index.json from the library
const indexPath = path.join(__dirname, '..', 'library', 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

console.log('='.repeat(60));
console.log('PROMPT LIBRARY VERIFICATION');
console.log('='.repeat(60));
console.log();

console.log(`Library Version: ${index.version}`);
console.log(`Last Updated: ${index.lastUpdated}`);
console.log(`Total Prompts: ${index.totalPrompts}`);
console.log();

console.log('Category Breakdown:');
console.log('-'.repeat(60));

let totalCount = 0;
const expectedCounts = {
  'master-coherence': 3,
  'genres': 15,
  'shot-types': 7,
  'lighting': 4,
  'scene-elements': 4,
  'visual-styles': 11,
  'camera-angles': 6,
  'camera-movements': 8,
  'mood-atmosphere': 10,
  'time-of-day': 6,
  'transitions': 5,
  'color-palettes': 6,
  'universe-types': 5,
  'character-archetypes': 3,
};

for (const [categoryId, category] of Object.entries(index.categories)) {
  const count = category.prompts.length;
  totalCount += count;
  const expected = expectedCounts[categoryId];
  const status = count === expected ? '✅' : '❌';
  
  console.log(`${status} ${category.name.padEnd(30)} ${count.toString().padStart(2)} prompts`);
}

console.log('-'.repeat(60));
console.log(`Total: ${totalCount} prompts`);
console.log();

// Verify total
if (totalCount === 93) {
  console.log('✅ SUCCESS: All 93 prompts are accessible!');
} else {
  console.log(`❌ ERROR: Expected 93 prompts, found ${totalCount}`);
}

console.log();
console.log('='.repeat(60));
console.log('WIZARD INTEGRATION METHODS AVAILABLE:');
console.log('='.repeat(60));
console.log();

const methods = [
  'getTimeOfDayPrompts()           // 6 prompts',
  'getMoodPrompts()                // 10 prompts',
  'getShotTypePrompts()            // 7 prompts',
  'getCameraAnglePrompts()         // 6 prompts',
  'getCameraMovementPrompts()      // 8 prompts',
  'getTransitionPrompts()          // 5 prompts',
  'getLightingPrompts()            // 4 prompts',
  'getGenrePrompts()               // 15 prompts',
  'getVisualStylePrompts()         // 11 prompts',
  'getColorPalettePrompts()        // 6 prompts',
  'getUniverseTypePrompts()        // 5 prompts',
  'getCharacterArchetypePrompts()  // 3 prompts',
  'getMasterCoherencePrompts()     // 3 prompts',
  'getSceneElementPrompts()        // 4 prompts',
];

methods.forEach(method => console.log(`  ${method}`));

console.log();
console.log('='.repeat(60));
console.log('VERIFICATION COMPLETE');
console.log('='.repeat(60));
