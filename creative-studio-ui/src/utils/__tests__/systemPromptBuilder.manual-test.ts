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


// Test 1: Build system prompts for all supported languages

const languages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];

languages.forEach((lang) => {
  const prompt = buildSystemPrompt(lang);
});

// Test 2: Verify all languages are supported

const supportedLanguages = getSupportedLanguages();
Object.entries(supportedLanguages).forEach(([code, instruction]) => {
});

// Test 3: Validate language codes

const testCodes = ['fr', 'en', 'es', 'invalid', 'ru', ''];
testCodes.forEach((code) => {
  const isValid = isLanguageSupported(code);
});

// Test 4: Verify StoryCore personality is maintained

let allContainPersonality = true;
languages.forEach((lang) => {
  const prompt = buildSystemPrompt(lang);
  const hasPersonality = prompt.includes('StoryCore AI assistant') && 
                         prompt.includes('video storyboard projects');
  if (!hasPersonality) {
    allContainPersonality = false;
  }
});

if (allContainPersonality) {
}

// Test 5: Verify language instructions are present

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
    allContainInstructions = false;
  }
});

if (allContainInstructions) {
}

// Summary
