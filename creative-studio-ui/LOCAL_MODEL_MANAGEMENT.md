# Local Model Management Feature

## Overview

The Local Model Management feature allows users to select, download, and manage local LLM models directly from the LLM Configuration interface. This feature integrates with Ollama to provide a seamless experience for working with local models without requiring API keys.

## Features

### 1. Model Selection Interface
- **Visual Model Cards**: Each model is displayed with comprehensive information including:
  - Model name and display name
  - Size and RAM requirements
  - Capabilities (text generation, chat, reasoning, etc.)
  - Installation status
  - Download progress

### 2. Model Catalog
The system includes a curated catalog of popular local models:

#### Gemma 3 Family
- **Gemma 3 1B** (1.5GB): Lightweight, fast inference, good for basic tasks
- **Gemma 3 3B** (3.5GB): Balanced performance for most tasks
- **Gemma 3 7B** (7GB): High-quality for complex tasks

#### Llama 3 Family
- **Llama 3 8B** (4.7GB): Meta's powerful model for general tasks
- **Llama 3 70B** (40GB): State-of-the-art performance (requires GPU)

#### Mistral Family
- **Mistral 7B** (4.1GB): Fast and efficient for production use

#### Phi Family
- **Phi 3 Mini** (2.3GB): Microsoft's compact but capable model
- **Phi 3 Medium** (7.9GB): Balanced model with excellent quality

#### Qwen Family
- **Qwen 2 7B** (4.4GB): Alibaba's multilingual model

### 3. Smart Recommendations
- **System Detection**: Automatically detects available RAM and GPU
- **Model Recommendations**: Suggests models that fit your system capabilities
- **Performance Badges**: Highlights recommended models with visual indicators

### 4. Download Management
- **One-Click Download**: Download models directly from the interface
- **Progress Tracking**: Real-time download progress with percentage and size
- **Error Handling**: Clear error messages if downloads fail
- **Automatic Selection**: Downloaded models are automatically selected

### 5. Model Filtering
- **Family Filters**: Filter by model family (Gemma, Llama, Mistral, Phi, Qwen)
- **Installation Filter**: Show only installed models
- **Quick Access**: Easy navigation between different model categories

### 6. Model Management
- **Delete Models**: Remove models to free up disk space
- **Reinstall**: Download models again if needed
- **Status Indicators**: Clear visual feedback on installation status

## Usage

### Accessing the Feature

1. Open **Settings** in StoryCore-Engine
2. Navigate to the **LLM Configuration** tab
3. Select **Local** or **Custom** as the provider
4. The Local Model Selector will appear automatically

### Downloading a Model

1. Browse the available models
2. Click the **Download** button on your desired model
3. Wait for the download to complete (progress bar shows status)
4. The model will be automatically selected once downloaded

### Selecting a Model

1. Click on an installed model card
2. Or click the **Select** button
3. The selected model will be highlighted with a blue border
4. Save your settings to apply the selection

### Filtering Models

1. Use the family filter buttons at the top:
   - **All Models**: Show all available models
   - **Gemma**, **Llama**, **Mistral**, **Phi**, **Qwen**: Filter by family
2. Toggle **Installed Only** to show only downloaded models

### Deleting a Model

1. Click the trash icon on an installed model
2. Confirm the deletion
3. The model will be removed from your system

## Technical Architecture

### Components

#### LocalModelService (`src/services/localModelService.ts`)
- Manages communication with Ollama API
- Handles model downloads with progress tracking
- Provides system capability detection
- Offers model recommendations

#### LocalModelSelector (`src/components/settings/LocalModelSelector.tsx`)
- React component for the model selection UI
- Displays model cards with detailed information
- Handles user interactions (download, select, delete)
- Provides filtering and search capabilities

#### LLMSettingsPanel Integration
- Conditionally shows LocalModelSelector for local/custom providers
- Maintains backward compatibility with cloud providers
- Seamlessly integrates with existing settings workflow

### Data Flow

```
User Action → LocalModelSelector → LocalModelService → Ollama API
                     ↓                      ↓
              UI Updates ← Progress Tracking ← Streaming Response
```

### API Integration

The feature integrates with Ollama's REST API:

- **GET /api/tags**: List installed models
- **POST /api/pull**: Download a model (streaming)
- **DELETE /api/delete**: Remove a model

## Requirements

### System Requirements
- **Ollama**: Must be installed and running
  - Download from: https://ollama.ai
  - Default endpoint: http://localhost:11434
- **Disk Space**: Varies by model (1.5GB to 40GB+)
- **RAM**: Minimum 2GB, recommended varies by model
- **GPU**: Optional, required for largest models

### Browser Requirements
- Modern browser with WebGL support (for GPU detection)
- JavaScript enabled
- LocalStorage available

## Configuration

### Endpoint Configuration
The default Ollama endpoint is `http://localhost:11434`. To use a different endpoint:

1. Select **Local** or **Custom** provider
2. Enter your custom endpoint in the **API Endpoint** field
3. The LocalModelSelector will use this endpoint for all operations

### Model Recommendations
The system automatically recommends models based on:
- Available RAM (detected via Navigator API)
- GPU availability (detected via WebGL)
- Model requirements (min/recommended RAM, GPU requirement)

## Error Handling

### Ollama Not Running
- **Detection**: Automatic check on component mount
- **Message**: Clear warning with installation link
- **Action**: Retry button to check again

### Download Failures
- **Progress Tracking**: Shows error state with message
- **Retry**: User can retry download
- **Cleanup**: Failed downloads don't leave partial data

### Model Selection Issues
- **Validation**: Ensures model is installed before selection
- **Feedback**: Visual indicators for installation status
- **Guidance**: Clear instructions for next steps

## Best Practices

### For Users
1. **Start Small**: Begin with smaller models (1B-3B) to test
2. **Check Requirements**: Verify RAM requirements before downloading
3. **Monitor Space**: Keep track of disk space usage
4. **Test Connection**: Use the connection test before saving settings

### For Developers
1. **Error Handling**: Always handle Ollama connection failures gracefully
2. **Progress Feedback**: Provide real-time feedback during downloads
3. **State Management**: Keep model states synchronized with Ollama
4. **Performance**: Lazy load model information to avoid blocking UI

## Future Enhancements

### Planned Features
- **Model Search**: Search models by name or capability
- **Custom Models**: Support for user-uploaded models
- **Model Comparison**: Side-by-side comparison of model specs
- **Performance Metrics**: Show inference speed and quality metrics
- **Batch Operations**: Download/delete multiple models at once
- **Model Updates**: Notify when model updates are available

### Integration Opportunities
- **Wizard Integration**: Use local models in wizard workflows
- **Chatbox Integration**: Seamless switching between local and cloud models
- **Performance Monitoring**: Track model performance and resource usage
- **Model Benchmarking**: Built-in benchmarks for model comparison

## Troubleshooting

### Ollama Not Detected
**Problem**: "Ollama is not running" message appears

**Solutions**:
1. Verify Ollama is installed: `ollama --version`
2. Start Ollama service: `ollama serve`
3. Check endpoint URL is correct
4. Verify no firewall blocking port 11434

### Download Stuck
**Problem**: Download progress stops or doesn't start

**Solutions**:
1. Check internet connection
2. Verify disk space is available
3. Restart Ollama service
4. Try downloading via CLI: `ollama pull <model-name>`

### Model Not Appearing
**Problem**: Downloaded model doesn't show as installed

**Solutions**:
1. Refresh the page
2. Click "Retry Connection" button
3. Verify model in CLI: `ollama list`
4. Check model name matches exactly

### Performance Issues
**Problem**: Model runs slowly or crashes

**Solutions**:
1. Choose a smaller model for your system
2. Close other applications to free RAM
3. Check system meets minimum requirements
4. Consider using GPU acceleration if available

## API Reference

### LocalModelService

```typescript
class LocalModelService {
  // Check if Ollama is running
  async isOllamaRunning(): Promise<boolean>
  
  // Get list of installed models
  async getInstalledModels(): Promise<string[]>
  
  // Check if specific model is installed
  async isModelInstalled(modelId: string): Promise<boolean>
  
  // Download a model with progress tracking
  async downloadModel(
    modelId: string,
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<boolean>
  
  // Delete a model
  async deleteModel(modelId: string): Promise<boolean>
  
  // Get system capabilities
  async getSystemCapabilities(): Promise<SystemCapabilities>
  
  // Get recommended models for system
  async getRecommendedModels(): Promise<LocalModel[]>
  
  // Get best model for system
  async getBestModel(): Promise<LocalModel | null>
}
```

### LocalModelSelector Props

```typescript
interface LocalModelSelectorProps {
  selectedModel?: string;           // Currently selected model ID
  onModelSelect: (modelId: string) => void;  // Callback when model is selected
  endpoint?: string;                 // Ollama endpoint URL
  className?: string;                // Additional CSS classes
}
```

## Conclusion

The Local Model Management feature provides a comprehensive solution for working with local LLMs in StoryCore-Engine. It combines ease of use with powerful functionality, making it simple for users to leverage local models without technical complexity.

For questions or issues, please refer to the troubleshooting section or contact support.
