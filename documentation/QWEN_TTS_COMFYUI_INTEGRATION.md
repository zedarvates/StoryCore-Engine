# Qwen TTS ComfyUI Integration

This document provides comprehensive documentation for the Qwen TTS ComfyUI integration module, which enables high-quality text-to-speech generation through ComfyUI workflows.

## Overview

The Qwen TTS ComfyUI integration provides a Python interface to interact with Qwen TTS nodes in ComfyUI for:

- **Voice Generation**: Generate speech using built-in speakers or custom fine-tuned models
- **Voice Cloning**: Clone voices from reference audio samples
- **Model Fine-tuning**: Train custom Qwen TTS models on your own audio datasets

## Installation

### Prerequisites

1. **ComfyUI**: Install ComfyUI following the [official documentation](https://docs.comfy.org/)
2. **ComfyUI-Qwen-TTS**: Install the Qwen TTS custom nodes from [GitHub](https://github.com/flybirdxx/ComfyUI-Qwen-TTS)
3. **Qwen TTS Models**: Download the required models (automatically handled by the custom nodes)

### Python Dependencies

```bash
pip install aiohttp
```

## Quick Start

### Basic Usage

```python
import asyncio
from qwen_tts_comfyui import QwenTTSComfyUIClient, QwenTTSConfig

async def main():
    # Initialize client
    config = QwenTTSConfig(comfyui_url="http://127.0.0.1:8188")
    client = QwenTTSComfyUIClient(config)
    
    # Generate voice
    result = await client.generate_voice(
        text="Hello, this is a test of Qwen TTS.",
        speaker="Ryan",
        language="English"
    )
    
    if result.success:
        # Save audio to file
        result.save("output.wav")
        print(f"Generated audio: {result.audio_path}")
        print(f"Duration: {result.duration:.2f}s")
    else:
        print(f"Error: {result.error_message}")
    
    # Close client
    await client.close()

asyncio.run(main())
```

### Synchronous Wrapper

For simpler use cases, use the synchronous wrapper:

```python
from qwen_tts_comfyui.client import QwenTTSComfyUIClientSync

client = QwenTTSComfyUIClientSync()
result = client.generate_voice(
    text="Hello, world!",
    speaker="Emily"
)

if result.success:
    result.save("output.wav")
```

## Configuration

### QwenTTSConfig

Main configuration class for the client:

```python
from qwen_tts_comfyui import QwenTTSConfig, QwenTTSModelConfig, QwenTTSGenerationConfig

config = QwenTTSConfig(
    comfyui_url="http://127.0.0.1:8188",  # ComfyUI server URL
    timeout=300,                           # Request timeout in seconds
    model=QwenTTSModelConfig(
        model_choice="1.7B",               # Model size: "0.6B" or "1.7B"
        device="cuda",                     # Device: "cpu", "cuda", or "auto"
        precision="bf16",                  # Precision: "fp32", "fp16", or "bf16"
        attention="auto",                  # Attention: "auto", "sdpa", "flash", "eager"
    ),
    generation=QwenTTSGenerationConfig(
        max_new_tokens=2048,               # Maximum tokens to generate
        top_p=0.8,                         # Top-p sampling
        top_k=20,                          # Top-k sampling
        temperature=1.0,                   # Sampling temperature
        repetition_penalty=1.05,           # Repetition penalty
        seed=0,                            # Random seed (0 for random)
    ),
    unload_model_after_generate=True,      # Unload model after generation
)
```

### Loading Configuration from File

```python
# Save configuration
config = QwenTTSConfig()
config.to_file("qwen_tts_config.json")

# Load configuration
config = QwenTTSConfig.from_file("qwen_tts_config.json")
```

## Voice Generation

### Built-in Speakers

Qwen TTS includes several built-in speakers:

| Speaker  | Language | Gender | Description |
|----------|----------|--------|-------------|
| Ryan     | English  | Male   | Clear male voice |
| Emily    | English  | Female | Warm female voice |
| Michael  | English  | Male   | Deep male voice |
| Sarah    | English  | Female | Professional female voice |
| David    | English  | Male   | Friendly male voice |
| Emma     | English  | Female | Young female voice |
| James    | English  | Male   | British male voice |
| Olivia   | English  | Female | Elegant female voice |

```python
# List available speakers
speakers = client.get_available_speakers()
print(speakers)  # ['Ryan', 'Emily', 'Michael', ...]
```

### Voice Instructions

Control voice characteristics using natural language instructions:

```python
result = await client.generate_voice(
    text="Welcome to our podcast!",
    speaker="Ryan",
    instruct="Speak with a warm, friendly tone. Be enthusiastic but not over the top."
)
```

Predefined instruction styles:

```python
# Get predefined instruction
instruct = client.get_voice_instruction("warm_friendly")

# Available styles:
# - warm_friendly: Warm and approachable tone
# - professional: Clear and authoritative
# - excited: Energetic and enthusiastic
# - calm: Soothing and peaceful
# - dramatic: Expressive with emphasis
# - storytelling: Varied pace and tone
# - news_anchor: Clear and even-paced
# - mature_sexy: Mature and confident (Chinese)
```

### Custom Fine-tuned Models

Generate speech using your fine-tuned models:

```python
result = await client.generate_custom_voice(
    text="This is my custom voice.",
    custom_model_path="D:\\checkpoints\\checkpoint-epoch-9",
    custom_speaker_name="my_voice",
    language="English"
)
```

## Voice Cloning

Clone a voice from a reference audio sample:

```python
result = await client.clone_voice(
    ref_audio_path="reference_audio.wav",
    target_text="This will sound like the reference voice.",
    ref_text="The text spoken in the reference audio",  # Optional but improves quality
    language="Auto",
    preset="balanced"  # fast, balanced, or quality
)
```

### Cloning Presets

| Preset   | Model | X-Vector Only | Description |
|----------|-------|---------------|-------------|
| fast     | 0.6B  | Yes           | Fast but lower quality |
| balanced | 0.6B  | No            | Good balance of speed and quality |
| quality  | 1.7B  | No            | Best quality but slower |

## Model Fine-tuning

Train a custom Qwen TTS model on your audio dataset:

### Preparing Your Dataset

1. Create a folder with audio files (WAV format recommended)
2. Each audio file should be clean speech, 10-30 seconds long
3. Recommended: 50-500 audio files for good results
4. Audio should be consistent (same speaker, similar recording conditions)

### Training

```python
result = await client.train_model(
    audio_folder="/path/to/audio/dataset",
    output_dir="/path/to/output/checkpoints",
    speaker_name="my_custom_voice",
    language="English",
    preset="standard"  # quick, standard, quality, or low_vram
)
```

### Training Presets

| Preset   | Model | Epochs | Learning Rate | Description |
|----------|-------|--------|---------------|-------------|
| quick    | 0.6B  | 5      | 3e-5          | Fast training for testing |
| standard | 1.7B  | 10     | 2e-5          | Balanced quality and time |
| quality  | 1.7B  | 20     | 1e-5          | Best quality, takes longer |
| low_vram | 0.6B  | 10     | 2e-5          | Optimized for 8-12GB VRAM |

### Estimating Training Time

```python
estimate = client.estimate_training_time(
    num_audio_files=100,
    avg_audio_duration=15.0,  # seconds
    preset="standard"
)

print(f"Estimated time: {estimate['estimated_minutes']:.1f} minutes")
```

## Backend Service Integration

The module includes a service class for integration with the video editor backend:

```python
from backend.qwen_tts_service import QwenTTSService, create_qwen_tts_service

# Create service
service = create_qwen_tts_service(
    comfyui_url="http://127.0.0.1:8188",
    model_choice="1.7B"
)

# Check connection
if await service.check_connection():
    print("Connected to ComfyUI")

# Register custom voice
service.register_custom_voice(
    voice_id="my_voice",
    name="My Custom Voice",
    custom_model_path="/path/to/checkpoint",
    custom_speaker_name="my_voice",
    language="en",
    gender="female",
    description="My trained voice"
)

# Generate speech
result = await service.text_to_speech(
    text="Hello from my custom voice!",
    voice="my_voice"
)

# Close service
await service.close()
```

## API Reference

### QwenTTSComfyUIClient

#### Methods

| Method | Description |
|--------|-------------|
| `check_connection()` | Check if ComfyUI server is accessible |
| `generate_voice(text, speaker, ...)` | Generate voice with built-in speaker |
| `generate_custom_voice(text, custom_model_path, custom_speaker_name, ...)` | Generate with custom model |
| `clone_voice(ref_audio_path, target_text, ...)` | Clone voice from reference |
| `train_model(audio_folder, output_dir, speaker_name, ...)` | Fine-tune model |
| `get_available_speakers()` | List built-in speakers |
| `get_voice_instruction(style)` | Get predefined voice instruction |
| `estimate_training_time(...)` | Estimate training duration |
| `close()` | Close the client and release resources |

### AudioResult

| Attribute | Type | Description |
|-----------|------|-------------|
| `success` | bool | Whether generation succeeded |
| `audio_path` | str | Path to saved audio file |
| `audio_data` | bytes | Raw audio data |
| `sample_rate` | int | Audio sample rate (Hz) |
| `duration` | float | Audio duration (seconds) |
| `text` | str | Text that was converted |
| `speaker` | str | Speaker name used |
| `error_message` | str | Error message if failed |

#### Methods

| Method | Description |
|--------|-------------|
| `save(output_path)` | Save audio to file |
| `get_base64()` | Get audio as base64 string |
| `get_info()` | Get audio information dict |

### TrainingResult

| Attribute | Type | Description |
|-----------|------|-------------|
| `success` | bool | Whether training succeeded |
| `checkpoint_path` | str | Path to final checkpoint |
| `output_dir` | str | Checkpoint directory |
| `speaker_name` | str | Name of trained speaker |
| `num_epochs` | int | Number of epochs trained |
| `checkpoints` | list | List of checkpoint paths |

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Ensure ComfyUI is running on the specified URL
   - Check firewall settings
   - Verify the ComfyUI-Qwen-TTS nodes are installed

2. **Out of Memory**
   - Use smaller model (0.6B instead of 1.7B)
   - Reduce batch size to 1
   - Increase gradient accumulation steps
   - Use `low_vram` training preset

3. **Poor Voice Quality**
   - Ensure audio dataset is clean and consistent
   - Use more training epochs
   - Provide reference text for voice cloning
   - Try different generation parameters

4. **Slow Generation**
   - Use CUDA if available
   - Use smaller model for faster inference
   - Enable model caching (don't unload after generation)

### Error Messages

| Error | Solution |
|-------|----------|
| `Failed to connect to ComfyUI` | Start ComfyUI server |
| `Missing required inputs` | Provide all required parameters |
| `Workflow execution timed out` | Increase timeout in config |
| `CUDA out of memory` | Use smaller model or CPU |

## Examples

### Complete Example Script

```python
#!/usr/bin/env python3
"""
Complete example of Qwen TTS ComfyUI integration.
"""

import asyncio
from pathlib import Path
from qwen_tts_comfyui import QwenTTSComfyUIClient, QwenTTSConfig

async def main():
    # Initialize
    config = QwenTTSConfig(
        comfyui_url="http://127.0.0.1:8188",
        model={"model_choice": "1.7B"}
    )
    
    async with QwenTTSComfyUIClient(config) as client:
        # Check connection
        if not await client.check_connection():
            print("❌ Cannot connect to ComfyUI")
            return
        
        print("✅ Connected to ComfyUI")
        
        # List speakers
        speakers = client.get_available_speakers()
        print(f"Available speakers: {speakers}")
        
        # Generate with instruction
        result = await client.generate_voice(
            text="Welcome to our show! Today we have a very special episode.",
            speaker="Ryan",
            instruct="Speak like a podcast host, warm and engaging",
            output_path="podcast_intro.wav"
        )
        
        if result.success:
            print(f"✅ Generated: {result.audio_path}")
            print(f"   Duration: {result.duration:.2f}s")
        else:
            print(f"❌ Failed: {result.error_message}")

if __name__ == "__main__":
    asyncio.run(main())
```

## License

This module is part of the StoryCore Engine project. See the main LICENSE file for details.

## References

- [ComfyUI-Qwen-TTS GitHub](https://github.com/flybirdxx/ComfyUI-Qwen-TTS)
- [Qwen TTS Documentation](https://github.com/QwenLM/Qwen3-TTS)
- [ComfyUI Documentation](https://docs.comfy.org/)
