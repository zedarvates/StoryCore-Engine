# 🌐 Project Translator API Reference

The Project Translator addon provides a local AI-powered translation engine for StoryCore projects. It uses Ollama for translation and Jina Embeddings for semantic consistency.

## Base URL
`/api/addons/project_translator`

## Endpoints

### 1. Start Translation
Starts a new translation task for a project.

- **URL**: `/translate`
- **Method**: `POST`
- **Payload**:
```json
{
  "project_id": "string",
  "project_data": {},
  "target_lang": "en | fr | es | de | ja | pt",
  "translation_model": "llama3 | mistral | gemma | llama3:70b"
}
```
- **Response**:
```json
{
  "success": true,
  "task_id": "uuid-string",
  "message": "Translation task started"
}
```

### 2. Get Task Status
Polls the status of a translation task.

- **URL**: `/task/{task_id}`
- **Method**: `GET`
- **Response**:
```json
{
  "task_id": "uuid-string",
  "status": "processing | completed | error",
  "progress": 0.0 - 1.0,
  "message": "Current status message",
  "result": {} // Translated project data (only if completed)
}
```

### 3. Engine Status
Checks if the local AI engine (Ollama) is ready.

- **URL**: `/status`
- **Method**: `GET`
- **Response**:
```json
{
  "ollama_ready": true,
  "available_models": ["llama3", "mistral", ...],
  "jina_ready": true
}
```

## Features
- **Semantic Coherence**: Uses Jina Embeddings v5 to ensure character names and locations are translated consistently throughout the script.
- **Local Processing**: 100% private. Your project data never leaves your machine.
- **Recursive Translation**: Automatically handles nested structures (Shots, Sequences, Metadata).
