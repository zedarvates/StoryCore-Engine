/**
 * Test de l'addon content_sensitivity — Pixelisation et censure
 * Exécuter avec : node addons/content_sensitivity/tests/test_censorship.js
 */

'use strict';

const path   = require('path');
const fs     = require('fs');
const assert = require('assert');

// ──────────────────────────────────────────────────────────────────────────────
// Utilitaires de test
// ──────────────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === 'function') {
      return result
        .then(() => { console.log(`  ✅ ${name}`); passed++; })
        .catch(err => { console.error(`  ❌ ${name}\n     ${err.message}`); failed++; });
    }
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}\n     ${err.message}`);
    failed++;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests du module de censure textuelle
// ──────────────────────────────────────────────────────────────────────────────

const { censorText, applyCensorship, PIXELATION_OPTIONS } = require('../src/censorship_mechanisms');

async function runTests() {
  console.log('\n🔍 Tests — CensorshipMechanisms\n');

  test('censorText — niveau low : détecte "religion"', () => {
    const result = censorText('Il parle de religion ici.', 'low');
    assert.ok(result.censored.includes('[CENSURÉ]'), 'Le mot "religion" doit être censuré');
    assert.strictEqual(result.replacedCount, 1);
  });

  test('censorText — niveau high : détecte plusieurs termes', () => {
    const result = censorText('Il y a violence et du drugs dans ce dialogue.', 'high');
    assert.ok(result.replacedCount >= 2, `Attendu >= 2 remplacements, obtenu ${result.replacedCount}`);
  });

  test('censorText — texte sans terme sensible : aucun remplacement', () => {
    const result = censorText('C\'est une belle journée ensoleillée.', 'high');
    assert.strictEqual(result.replacedCount, 0);
    assert.strictEqual(result.censored, 'C\'est une belle journée ensoleillée.');
  });

  test('censorText — texte null : retourne chaîne vide sans erreur', () => {
    const result = censorText(null, 'medium');
    assert.strictEqual(result.censored, '');
    assert.strictEqual(result.replacedCount, 0);
  });

  test('PIXELATION_OPTIONS — les 3 niveaux sont définis', () => {
    assert.ok(PIXELATION_OPTIONS.low,    'Niveau low manquant');
    assert.ok(PIXELATION_OPTIONS.medium, 'Niveau medium manquant');
    assert.ok(PIXELATION_OPTIONS.high,   'Niveau high manquant');
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Tests du PixelationEngine (Node / sharp)
  // ──────────────────────────────────────────────────────────────────────────────

  console.log('\n🎨 Tests — PixelationEngine (Sharp)\n');

  const pixelationEngine = require('../src/pixelation_engine');
  const { BLOCK_SIZES, detectSensitiveRegions } = pixelationEngine;

  test('BLOCK_SIZES — valeurs correctes', () => {
    assert.strictEqual(BLOCK_SIZES.low,    8);
    assert.strictEqual(BLOCK_SIZES.medium, 16);
    assert.strictEqual(BLOCK_SIZES.high,   32);
  });

  test('detectSensitiveRegions — strategy "full"', () => {
    const regions = detectSensitiveRegions(200, 300, 'full');
    assert.strictEqual(regions.length, 1);
    assert.strictEqual(regions[0].x,      0);
    assert.strictEqual(regions[0].y,      0);
    assert.strictEqual(regions[0].width,  200);
    assert.strictEqual(regions[0].height, 300);
  });

  test('detectSensitiveRegions — strategy "auto"', () => {
    const regions = detectSensitiveRegions(200, 300, 'auto');
    assert.strictEqual(regions.length, 1);
    assert.ok(regions[0].x > 0,      'La zone auto ne doit pas toucher le bord gauche');
    assert.ok(regions[0].y > 0,      'La zone auto ne doit pas toucher le haut');
    assert.ok(regions[0].width > 0,  'Largeur doit être > 0');
    assert.ok(regions[0].height > 0, 'Hauteur doit être > 0');
  });

  // Test de pixelisation réelle avec Sharp (si une image test existe)
  await test('pixelateToDataURL — image synthétique 100x100', async () => {
    // Créer une image PNG minimale via sharp
    let sharp;
    try {
      sharp = require('sharp');
    } catch {
      console.log('    ⚠️  sharp non disponible, test ignoré.');
      return;
    }

    // Image de test : carré rouge 100×100
    const testBuffer = await sharp({
      create: {
        width:      100,
        height:     100,
        channels:   3,
        background: { r: 255, g: 0, b: 0 },
      },
    }).png().toBuffer();

    const dataUrl = await pixelationEngine.pixelateToDataURL(testBuffer, {
      level: 'medium',
      zone:  'full',
    });

    assert.ok(dataUrl.startsWith('data:image/png;base64,'), 'Le résultat doit être une data-URL PNG');
    assert.ok(dataUrl.length > 100, 'La data-URL doit avoir du contenu');
    console.log(`    → data-URL générée (${Math.round(dataUrl.length / 1024)} Ko)`);
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Test applyCensorship complet
  // ──────────────────────────────────────────────────────────────────────────────

  console.log('\n🛡️  Tests — applyCensorship (intégration)\n');

  await test('applyCensorship — texte seul, niveau medium', async () => {
    const result = await applyCensorship(
      { text: 'Il parle de religion et de raciste comportement.' },
      'medium',
      { censorImage: false, censorClothing: false }
    );
    assert.ok(result.success, 'Le résultat doit être un succès');
    assert.ok(result.censoredContent.text.includes('[CENSURÉ]'), 'Le texte doit être censuré');
    assert.ok(result.modifications.length > 0, 'Des modifications doivent être enregistrées');
  });

  await test('applyCensorship — sans contenu : retourne success sans crash', async () => {
    const result = await applyCensorship({}, 'high');
    assert.ok(result.success, 'Doit réussir même sans contenu');
    assert.strictEqual(result.modifications.length, 0, 'Aucune modification sans contenu');
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Résumé
  // ──────────────────────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Résultats : ${passed} ✅ réussis  |  ${failed} ❌ échoués`);
  console.log(`${'─'.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Erreur inattendue :', err);
  process.exit(1);
});
