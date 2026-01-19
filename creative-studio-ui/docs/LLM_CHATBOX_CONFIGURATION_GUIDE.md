# LLM Chatbox Configuration Guide

## Overview

The LLM Chatbox Enhancement adds powerful AI capabilities to the StoryCore Creative Studio landing page. This guide explains how to configure and use the enhanced chatbox with various LLM providers.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Supported Providers](#supported-providers)
3. [Configuration Options](#configuration-options)
4. [Language Preferences](#language-preferences)
5. [API Key Security](#api-key-security)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Features](#advanced-features)

## Quick Start

### First-Time Setup

1. **Open the Creative Studio UI** in your browser
2. **Click the settings icon** (⚙️) next to the "en ligne" status indicator
3. **Select your LLM provider** from the dropdown
4. **Choose a model** compatible with your provider
5. **Enter your API key** (if required by the provider)
6. **Adjust parameters** (temperature, max tokens) as needed
7. **Click "Save Configuration"** to validate and save

The chatbox will automatically validate your connection and switch from fallback mode to live AI mode.

### Changing Language

1. **Click the globe icon** (🌐) next to the settings button
2. **Select your preferred language** from the dropdown
3. The assistant will immediately start responding in your chosen language

## Supported Providers

### OpenAI

**Models Available:**
- GPT-4 Turbo (128K context)
- GPT-4 (8K context)
- GPT-3.5 Turbo (16K context)

**Requirements:**
- API key from [OpenAI Platform](https://platform.openai.com/)
- Active account with available credits

**Configuration:**
```
Provider: OpenAI
Model: gpt-4-turbo-preview (recommended)
Temperature: 0.7 (default)
Max Tokens: 2000 (default)
Streaming: Enabled (recommended)
```

### Anthropic

**Models Available:**
- Claude 3 Opus (200K context)
- Claude 3 Sonnet (200K context)
- Claude 3 Haiku (200K context)

**Requirements:**
- API key from [Anthropic Console](https://console.anthropic.com/)
- Active account with available credits

**Configuration:**
```
Provider: Anthropic
Model: claude-3-sonnet-20240229 (recommended)
Temperature: 0.7 (default)
Max Tokens: 2000 (default)
Streaming: Enabled (recommended)
```

### Local (Ollama)

**Models Available:**
- Any model installed in your local Ollama instance
- Common: gemma3:1b (default), gemma3:4b, mistral, codellama

**Requirements:**
- [Ollama](https://ollama.com/) installed and running locally
- At least one model pulled (e.g., `ollama pull gemma3:1b`)

**Configuration:**
```
Provider: Local
Model: gemma3:1b (or your installed model)
Temperature: 0.7 (default)
Max Tokens: 2000 (default)
Streaming: Enabled (recommended)
API Key: Not required
```

### Custom

**Use Case:** Connect to custom LLM endpoints or self-hosted models

**Requirements:**
- Custom API endpoint URL
- Authentication credentials (if required)
- OpenAI-compatible API format

**Configuration:**
```
Provider: Custom
Model: Your custom model name
Temperature: 0.7 (adjust as needed)
Max Tokens: 2000 (adjust as needed)
Streaming: Depends on endpoint support
API Key: Your custom authentication token
```

## Configuration Options

### Temperature (0-2)

Controls the randomness of AI responses:

- **0.0-0.3**: Very focused and deterministic
  - Best for: Technical documentation, code generation
  - Responses: Consistent, predictable
  
- **0.4-0.7**: Balanced creativity and consistency (recommended)
  - Best for: General conversation, project assistance
  - Responses: Natural, helpful
  
- **0.8-1.2**: More creative and varied
  - Best for: Brainstorming, creative writing
  - Responses: Diverse, imaginative
  
- **1.3-2.0**: Highly creative and unpredictable
  - Best for: Experimental ideas, artistic content
  - Responses: Unique, sometimes unexpected

**Recommendation:** Start with 0.7 and adjust based on your needs.

### Max Tokens (100-4000)

Controls the maximum length of AI responses:

- **100-500**: Short, concise answers
  - Best for: Quick questions, simple tasks
  
- **500-1500**: Medium-length responses (recommended)
  - Best for: General assistance, explanations
  
- **1500-2500**: Detailed responses
  - Best for: Complex questions, tutorials
  
- **2500-4000**: Very detailed responses
  - Best for: In-depth analysis, comprehensive guides

**Recommendation:** Start with 2000 for balanced responses.

### Streaming

Controls how responses are displayed:

- **Enabled (recommended)**: Responses appear word-by-word as they're generated
  - Pros: Immediate feedback, engaging experience
  - Cons: Slightly higher resource usage
  
- **Disabled**: Complete response appears after generation finishes
  - Pros: Lower resource usage, complete thoughts
  - Cons: Longer wait time, no intermediate feedback

**Recommendation:** Keep streaming enabled for better user experience.

## Language Preferences

### Supported Languages

The chatbox supports 9 languages with native AI responses:

| Language | Code | Native Name | Flag |
|----------|------|-------------|------|
| French | `fr` | Français | 🇫🇷 |
| English | `en` | English | 🇬🇧 |
| Spanish | `es` | Español | 🇪🇸 |
| German | `de` | Deutsch | 🇩🇪 |
| Italian | `it` | Italiano | 🇮🇹 |
| Portuguese | `pt` | Português | 🇵🇹 |
| Japanese | `ja` | 日本語 | 🇯🇵 |
| Chinese | `zh` | 中文 | 🇨🇳 |
| Korean | `ko` | 한국어 | 🇰🇷 |

### Auto-Detection

On first load, the chatbox automatically detects your browser's language preference and sets it as the default. You can change this at any time using the language selector.

### Language Persistence

Your language preference is saved to localStorage and persists across sessions. The chatbox will remember your choice even after closing the browser.

## API Key Security

### How API Keys Are Protected

The chatbox implements multiple security layers to protect your API keys:

1. **Encryption at Rest**
   - API keys are encrypted using AES-GCM (256-bit) before storage
   - Encryption keys are session-specific and stored in sessionStorage
   - Keys are never stored in plain text

2. **Masked Display**
   - API keys are masked in the UI (e.g., `••••••••••••1234`)
   - Only the last 4 characters are visible for verification

3. **Secure Transmission**
   - API keys are only sent to their respective providers
   - All API calls use HTTPS encryption
   - Keys are never logged to console or error messages

4. **Session-Based Encryption**
   - Encryption keys are regenerated each session
   - Closing the browser clears encryption keys from memory
   - Re-opening requires re-decryption with new session key

### Security Best Practices

**DO:**
- ✅ Use API keys with minimal required permissions
- ✅ Rotate API keys regularly (monthly recommended)
- ✅ Monitor API usage for unexpected activity
- ✅ Use different API keys for development and production
- ✅ Clear browser data when using shared computers

**DON'T:**
- ❌ Share API keys with others
- ❌ Commit API keys to version control
- ❌ Use production API keys in public demos
- ❌ Store API keys in unencrypted notes or files
- ❌ Use the same API key across multiple applications

### Security Limitations

**Important:** While the chatbox implements encryption, localStorage is not a secure storage mechanism for highly sensitive data. Consider these limitations:

1. **Browser Access**: Anyone with physical access to your computer can potentially access localStorage
2. **XSS Vulnerabilities**: Cross-site scripting attacks could potentially access localStorage
3. **Browser Extensions**: Malicious extensions could read localStorage data
4. **Shared Computers**: Other users on the same computer might access your data

**Recommendation:** For production environments, consider implementing server-side API key management with secure token exchange.

### Revoking Access

If you believe your API key has been compromised:

1. **Immediately revoke the key** in your provider's dashboard:
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/settings/keys

2. **Generate a new API key** with appropriate permissions

3. **Update the chatbox configuration** with the new key

4. **Clear browser storage** to remove the old encrypted key:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

## Troubleshooting

### Connection Issues

**Problem:** "Connection validation failed" error

**Solutions:**
1. Verify your API key is correct and active
2. Check your internet connection
3. Ensure the provider's API is not experiencing outages
4. Verify your account has sufficient credits
5. Check for firewall or proxy blocking API requests

**Problem:** "Authentication failed" error

**Solutions:**
1. Double-check your API key (copy-paste to avoid typos)
2. Verify the API key has the correct permissions
3. Ensure your account is in good standing
4. Try generating a new API key

### Streaming Issues

**Problem:** Responses appear slowly or freeze mid-stream

**Solutions:**
1. Check your internet connection speed
2. Try disabling streaming in configuration
3. Reduce max tokens to decrease response size
4. Switch to a faster model (e.g., GPT-3.5 instead of GPT-4)

**Problem:** Stream interrupted by new message

**Expected Behavior:** This is intentional. Sending a new message cancels the current stream to prevent confusion. The partial response is preserved with an interruption indicator.

### Language Issues

**Problem:** Assistant responds in wrong language

**Solutions:**
1. Verify language selector shows correct language
2. Try changing language and changing back
3. Clear browser cache and reload
4. Check that your LLM provider supports the selected language

**Problem:** Language preference not persisting

**Solutions:**
1. Check browser localStorage is enabled
2. Verify you're not in private/incognito mode
3. Check browser storage quota is not exceeded
4. Try clearing localStorage and setting preference again

### Fallback Mode

**Problem:** Chatbox stuck in fallback mode

**Indicators:**
- Orange "Mode hors ligne" status
- Warning banner about pre-configured responses
- Responses are generic and not AI-generated

**Solutions:**
1. Click "Configure LLM" button in warning banner
2. Complete configuration with valid API key
3. Save configuration to trigger connection validation
4. Verify connection status changes to "En ligne" (green)

## Advanced Features

### Automatic Mode Recovery

The chatbox automatically switches from fallback mode to live mode when:
- A valid configuration is saved
- Connection validation succeeds
- API key is provided for providers that require it

You'll see a system message confirming the mode change.

### Error Recovery

When errors occur, the chatbox provides contextual recovery options:

- **Retry**: Resends the last message (for transient errors)
- **Configure**: Opens settings to fix configuration issues
- **Cancel**: Dismisses the error and continues

### Configuration Migration

If you previously used Ollama configuration, the chatbox automatically migrates your settings to the new format on first load. Your chat history is preserved during migration.

### Performance Optimization

The chatbox includes several performance optimizations:

- **Debouncing**: Configuration changes are debounced (500ms) to prevent excessive updates
- **Message History Limit**: Keeps only the last 100 messages to prevent memory issues
- **Component Memoization**: Expensive components are memoized to reduce re-renders
- **Cleanup on Unmount**: Streaming connections are properly cleaned up

### Keyboard Shortcuts

- **Enter**: Send message
- **Shift+Enter**: New line in message
- **Escape**: Close configuration dialog

### Accessibility

The chatbox is fully accessible with:

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader announcements for status changes
- Text alternatives for icons
- Proper focus management

## Getting Help

### Documentation

- **User Guide**: See main README.md
- **API Reference**: See docs/API_REFERENCE.md
- **Code Examples**: See docs/EXAMPLES.md

### Support Channels

- **GitHub Issues**: Report bugs or request features
- **Email**: support@storycore-engine.com
- **Community Forum**: https://forum.storycore-engine.com

### Useful Links

- **OpenAI Documentation**: https://platform.openai.com/docs
- **Anthropic Documentation**: https://docs.anthropic.com
- **Ollama Documentation**: https://ollama.com/docs
- **Web Crypto API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API

---

**Last Updated:** January 2026  
**Version:** 1.0.0
