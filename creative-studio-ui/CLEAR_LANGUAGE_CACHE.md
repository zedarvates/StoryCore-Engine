# Clear Language Cache

## Problem
The menu is showing French text or duplicate text (French + English) because the browser has cached the French language preference.

## Solution

### Option 1: Clear localStorage via Browser Console
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Run this command:
```javascript
localStorage.removeItem('storycore-language');
localStorage.removeItem('language-preference');
location.reload();
```

### Option 2: Clear All Application Data
1. Open Developer Tools (F12)
2. Go to the Application tab (Chrome) or Storage tab (Firefox)
3. Find "Local Storage" in the left sidebar
4. Click on your application's domain
5. Delete the keys:
   - `storycore-language`
   - `language-preference`
6. Refresh the page (F5)

### Option 3: Use Incognito/Private Mode
Open the application in an incognito/private browsing window to test with a clean slate.

## Changes Made
The following files were updated to default to English instead of French:

1. **creative-studio-ui/src/utils/i18n.tsx**
   - Changed `defaultLanguage = 'fr'` to `defaultLanguage = 'en'`
   - Changed `enableAutoDetect = true` to `enableAutoDetect = false`

2. **creative-studio-ui/src/utils/languageDetection.ts**
   - Modified `detectSystemLanguage()` to always return 'en' instead of detecting browser language

3. **creative-studio-ui/src/utils/wizardTranslations.ts**
   - Changed default parameter from `'fr'` to `'en'`

4. **creative-studio-ui/src/services/PromptSuggestionService.ts**
   - Changed default parameters from `'fr'` to `'en'` in `getDefaultSuggestions()` and `getRefreshedSuggestions()`

## After Clearing Cache
After clearing the cache and refreshing, the application should:
- Display all menus in English by default
- Show "File", "Edit", "View", "Project", "Tools", "Help" instead of French equivalents
- No longer show duplicate text

## Changing Language
Users can still change the language through the application settings if they prefer French or another language.
