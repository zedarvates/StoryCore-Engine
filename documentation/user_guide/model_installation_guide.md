# User Guide: Installing Local LLM Models (Ollama)

> [!IMPORTANT]
> **Issue:** If you see `LLM Error: model 'gemma2:2b' not found`, it means the model is not installed on your machine.
> **Solution:** Follow this guide to install the required model in 2-5 minutes.

## Quick Solution (2-5 Minutes)

### Step 1: Open a Terminal
*   **Windows:** Press `Win+R`, type `cmd`, press Enter.
*   **Mac:** Press `Cmd+Space`, type `Terminal`, press Enter.
*   **Linux:** Press `Ctrl+Alt+T`.

### Step 2: Install the Model
Run the following command:
```bash
ollama pull gemma2:2b
```
*   **Download Size:** ~1.6 GB
*   **Estimated Time:** 2-5 minutes (depending on your connection)

### Step 3: Verify Installation
Run:
```bash
ollama list
```
You should see:
```text
NAME              ID              SIZE      MODIFIED
gemma2:2b         abc123def456    1.6 GB    2 minutes ago
```

### Step 4: Restart Application
1.  Close StoryCore.
2.  Relaunch StoryCore.
3.  Test the chatbox.

---

## Alternative: Using an Already Installed Model

If you already have other Ollama models installed:

1.  **Check available models:**
    ```bash
    ollama list
    ```

2.  **In StoryCore:**
    *   Click on ⚙️ (Settings) in the chatbox.
    *   Or go to: `Menu` -> `Settings` -> `LLM Configuration`.
    *   Change "Model" to one of your installed models.
    *   Click "Save".

---

## Recommended Models by Size

### ⚡ Ultra Lightweight (< 2 GB) - Very Fast
```bash
ollama pull llama3.2:1b    # 1.3 GB - Ultra fast
ollama pull gemma2:2b      # 1.6 GB - Very fast (RECOMMENDED)
ollama pull phi3:mini      # 2.3 GB - Performant
```

### ⚖️ Balanced (2-4 GB) - Good Compromise
```bash
ollama pull llama3.2:3b    # 2.0 GB - Good balance
ollama pull mistral:7b     # 4.1 GB - Very good
```

### 💪 Powerful (> 4 GB) - Best Quality
```bash
ollama pull llama3.1:8b    # 4.7 GB - High quality
ollama pull mixtral:8x7b   # 26 GB - Very high quality
```

---

## Diagnostic & Troubleshooting

### Test Direct Model Access
After installation, you can test if the model works directly in the terminal:
```bash
ollama run gemma2:2b "Hello, how are you?"
```
If you get a response, the model is working correctly! ✅

### Common Non-Critical Errors
These warnings can be safely ignored:
*   **Dialog Description Warning:** `Warning: Missing Description or aria-describedby`. (Cosmetic Radix UI issue)
*   **setTimeout Violation:** `[Violation] 'setTimeout' handler took 80ms`. (Acceptable loading performance)

### Full Diagnostic
Check if Ollama is running:
```bash
curl http://localhost:11434/api/tags
```
*   ✅ **JSON Response:** Ollama is running.
*   ❌ **Connection Error:** Start Ollama (Windows Start Menu / Applications / `systemctl start ollama`).

---

## Need Help?

If the problem persists:

1.  **Check Ollama logs:** `ollama logs`
2.  **Restart Ollama:**
    ```bash
    ollama stop
    ollama serve
    ```
3.  **Check StoryCore Configuration:**
    *   Provider: `Local (Ollama)`
    *   Endpoint: `http://localhost:11434`
    *   Model: `gemma2:2b`
