# Troubleshooting: Quick Reset for LLM Wizards

> [!TIP]
> **Purpose:** Use this guide to quickly reset your LLM configuration if you encounter issues with wizards not loading or connecting correctly.

## Quick Fix (3 Steps)

### Step 1: Open Browser Console
1.  Open StoryCore application in your browser.
2.  Press `F12` (or Right Click → Inspect → Console).
3.  Click on the "Console" tab.

### Step 2: Run Reset Command
Copy and paste the following code block entirely into the console and press **ENTER**:

```javascript
localStorage.removeItem('storycore-llm-config');
localStorage.setItem('storycore-llm-config', JSON.stringify({
    provider: 'local',
    model: 'qwen3-vl:4b',
    apiKey: '',
    apiEndpoint: 'http://localhost:11434',
    streamingEnabled: true,
    parameters: {
        temperature: 0.7,
        maxTokens: 2000,
        topP: 0.9,
        frequencyPenalty: 0,
        presencePenalty: 0
    },
    systemPrompts: {
        worldGeneration: 'You are a creative world-building assistant...',
        characterGeneration: 'You are a character development expert...',
        dialogueGeneration: 'You are a dialogue writing specialist...'
    },
    timeout: 30000,
    retryAttempts: 3
}));
console.log('✅ Configuration reset with qwen3-vl:4b');
setTimeout(() => location.reload(), 1000);
```

The page will reload automatically.

### Step 3: Test
1.  Open a Wizard (e.g., World Building).
2.  Verify the yellow warning banner is gone.
3.  Click any AI generation button.
4.  ✅ It should work!

---

## Verification

### Browser Console Check
Run this command to check the current configuration:
```javascript
console.log(JSON.parse(localStorage.getItem('storycore-llm-config')));
```
**Expected Result:**
```json
{
  "provider": "local",
  "model": "qwen3-vl:4b",
  "apiEndpoint": "http://localhost:11434",
  "streamingEnabled": true
}
```

### PowerShell / Terminal Check
Verify Ollama models:
```bash
ollama list
```
**Expected Result:** You should see `qwen3-vl:4b` (or your chosen model) in the list.

---

## Common Issues

### Problem 1: Model does not exist
**Solution:** Download the model via terminal:
```bash
ollama pull qwen3-vl:4b
```

### Problem 2: Ollama is not responding
**Solution:** Check if port 11434 is active:
```bash
netstat -an | findstr "11434"
```
If empty, restart Ollama: `ollama serve`.

### Problem 3: Still getting 404 Error
**Solution:**
1.  Clear browser cache (`Ctrl+Shift+Delete`).
2.  Close browser completely.
3.  Re-open and repeat Step 2.

### Problem 4: localStorage blocked
**Solution:** Ensure your browser settings allow cookies and local storage, and you are not in Incognito mode.

---

## Using Other Models
To use a different model (e.g., `gemma3:1b`), modify the command in Step 2 by replacing `'qwen3-vl:4b'` with `'gemma3:1b'`.
