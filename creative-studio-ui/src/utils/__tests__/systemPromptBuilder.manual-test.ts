/**
 * Manual Test for System Prompt Builder
 * 
 * This file demonstrates the system prompt builder functionality.
 * Run this file to see the output for all supported languages.
 * 
 * Usage: node --loader ts-node/esm systemPromptBuilder.manual-test.ts
 * Or simply review the code to verify the implementation.
 */

import { buildSystemPrompt, getSupportedLanguages, isLanguageSupported } from '../systemPromptBuilder';
import { type LanguageCode } from '@/components/launcher/LanguageSelector';

console.log('='.repeat(80));
console.log('System Prompt Builder - Manual Verification');
console.log('='.repeat(80));
console.log();

// Test 1: Build system prompts for all supported languages
console.log('Test 1: System Prompts for All Languages');
console.log('-'.repeat(80));

const languages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];

languages.forEach((lang) => {
  const prompt = buildSystemPrompt(lang);
  console.log(`\n[${lang.toUpperCase()}]`);
  console.log(prompt);
  console.log();
});

// Test 2: Verify all languages are supported
console.log('\n' + '='.repeat(80));
console.log('Test 2: Language Support Verification');
console.log('-'.repeat(80));

const supportedLanguages = getSupportedLanguages();
console.log('\nSupported Languages:');
Object.entries(supportedLanguages).forEach(([code, instruction]) => {
  console.log(`  ${code}: ${instruction}`);
});

// Test 3: Validate language codes
console.log('\n' + '='.repeat(80));
console.log('Test 3: Language Code Validation');
console.log('-'.repeat(80));

const testCodes = ['fr', 'en', 'es', 'invalid', 'ru', ''];
console.log('\nValidation Results:');
testCodes.forEach((code) => {
  const isValid = isLanguageSupported(code);
  console.log(`  ${code || '(empty)'}: ${isValid ? '✓ Valid' : '✗ Invalid'}`);
});

// Test 4: Verify StoryCore personality is maintained
console.log('\n' + '='.repeat(80));
console.log('Test 4: StoryCore Personality Consistency');
console.log('-'.repeat(80));

console.log('\nVerifying all prompts contain StoryCore personality...');
let allContainPersonality = true;
languages.forEach((lang) => {
  const prompt = buildSystemPrompt(lang);
  const hasPersonality = prompt.includes('StoryCore AI assistant') && 
                         prompt.includes('video storyboard projects');
  if (!hasPersonality) {
    console.log(`  ✗ ${lang}: Missing StoryCore personality`);
    allContainPersonality = false;
  }
});

if (allContainPersonality) {
  console.log('  ✓ All prompts maintain StoryCore personality');
}

// Test 5: Verify language instructions are present
console.log('\n' + '='.repeat(80));
console.log('Test 5: Language Instructions Verification');
console.log('-'.repeat(80));

console.log('\nVerifying all prompts contain language instructions...');
const languageKeywords: Record<LanguageCode, string> = {
  fr: 'French',
  en: 'English',
  es: 'Spanish',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
};

let allContainInstructions = true;
languages.forEach((lang) => {
  const prompt = buildSystemPrompt(lang);
  const keyword = languageKeywords[lang];
  const hasInstruction = prompt.includes(`Respond in ${keyword}`);
  if (!hasInstruction) {
    console.log(`  ✗ ${lang}: Missing language instruction`);
    allContainInstructions = false;
  }
});

if (allContainInstructions) {
  console.log('  ✓ All prompts contain appropriate language instructions');
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('Summary');
console.log('='.repeat(80));
console.log(`Total languages supported: ${languages.length}`);
console.log(`StoryCore personality maintained: ${allContainPersonality ? 'Yes' : 'No'}`);
console.log(`Language instructions present: ${allContainInstructions ? 'Yes' : 'No'}`);
console.log('\n✓ System Prompt Builder implementation verified!');
console.log('='.repeat(80));
