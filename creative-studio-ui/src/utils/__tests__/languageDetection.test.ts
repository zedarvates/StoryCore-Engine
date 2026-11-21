import { beforeEach, describe, expect, it } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from '@/types/language';
import { detectSystemLanguage, getInitialLanguagePreference, saveLanguagePreference } from '../languageDetection';

describe('starting language preference', () => {
  beforeEach(() => localStorage.removeItem(LANGUAGE_STORAGE_KEY));

  it('starts in English for an installation without a saved choice', () => {
    expect(detectSystemLanguage()).toBe('en');
    expect(getInitialLanguagePreference()).toBe('en');
    expect(JSON.parse(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '{}')).toMatchObject({
      version: '1.0',
      userLanguage: null,
    });
  });

  it('preserves the language explicitly selected by the user', () => {
    saveLanguagePreference('fr', true);
    expect(getInitialLanguagePreference()).toBe('fr');
  });

  it('repairs an unreadable saved preference', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, '{ broken JSON');
    expect(getInitialLanguagePreference()).toBe('en');
    expect(JSON.parse(localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? '{}')).toMatchObject({ userLanguage: null });
  });
});
