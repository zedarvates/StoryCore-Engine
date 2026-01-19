# UI Configuration Wizards - User Guide

## Overview

The StoryCore-Engine Creative Studio includes powerful configuration wizards that guide you through creating rich story worlds, detailed characters, and configuring backend integrations. These wizards leverage AI assistance to help you build consistent, professional-quality content.

## Table of Contents

1. [World Creation Wizard](#world-creation-wizard)
2. [Character Creation Wizard](#character-creation-wizard)
3. [LLM Configuration Settings](#llm-configuration-settings)
4. [ComfyUI Connection Settings](#comfyui-connection-settings)
5. [Tips and Best Practices](#tips-and-best-practices)
6. [Troubleshooting](#troubleshooting)

---

## World Creation Wizard

### Purpose
Create detailed story worlds that define the universe, locations, rules, and atmosphere for your narrative projects.

### How to Access
- Click **"Create World"** button in the main menu bar
- Or use the welcome screen shortcut

### Wizard Steps

#### Step 1: Basic Information (1/5)
Define the foundation of your world:
- **World Name** (required): Give your world a unique name
- **Genre**: Select one or more genres (fantasy, sci-fi, historical, contemporary, etc.)
- **Time Period**: Specify when your story takes place
- **Tone**: Choose the mood (dark, light, gritty, whimsical, etc.)

**AI Assistance**: Click "Generate Suggestions" to get AI-powered recommendations based on your selections.

#### Step 2: World Rules (2/5)
Establish the laws that govern your world:
- **Physical Laws**: Gravity, physics variations
- **Social Structures**: Government, hierarchy, customs
- **Magic/Technology Systems**: How supernatural or advanced tech works

**AI Assistance**: The LLM generates rule suggestions based on your genre and tone selections.

#### Step 3: Locations (3/5)
Add key locations in your world:
- **Name**: Location identifier
- **Description**: What the location looks like
- **Significance**: Why it matters to your story
- **Atmosphere**: The feeling of the place

**AI Assistance**: Get location suggestions that fit your world context.

#### Step 4: Cultural Elements (4/5)
Define the cultural fabric:
- **Languages**: Spoken languages in your world
- **Religions**: Belief systems
- **Traditions**: Cultural practices
- **Historical Events**: Key moments that shaped the world
- **Cultural Conflicts**: Tensions between groups

**AI Assistance**: Generate culturally coherent elements that match your world's genre and tone.

#### Step 5: Review and Finalize (5/5)
- Review all world details
- Edit any section by clicking on it
- Click **"Create World"** to save

### Features

**Auto-Save**: Your progress is automatically saved every 2 seconds. You can safely close the wizard and resume later.

**Edit Preservation**: When regenerating AI suggestions, your manual edits are preserved.

**Validation**: Required fields are clearly marked, and you'll receive helpful error messages if something is missing.

---

## Character Creation Wizard

### Purpose
Create detailed characters with consistent traits, appearance, personality, and backstory.

### How to Access
- Click **"Create Character"** button in the main menu bar
- Or use the welcome screen shortcut

### Wizard Steps

#### Step 1: Basic Identity (1/6)
Define who your character is:
- **Name** (required): Character's name
- **Role/Archetype**: Protagonist, antagonist, mentor, etc.
- **Age Range**: Approximate age
- **Gender/Pronouns**: Identity information

**AI Assistance**: Get name suggestions based on your world context.

#### Step 2: Physical Appearance (2/6)
Describe how your character looks:
- **Hair**: Color, style, length
- **Eyes**: Color, shape
- **Skin Tone**: Complexion
- **Build and Height**: Physical stature
- **Distinctive Features**: Scars, tattoos, unique traits
- **Clothing Style**: Fashion preferences
- **Color Palette**: Preferred colors

**AI Assistance**: Generate coherent visual descriptions that match personality.

#### Step 3: Personality (3/6)
Define your character's inner world:
- **Core Traits**: 5-7 defining characteristics
- **Values and Beliefs**: What they stand for
- **Fears and Desires**: What drives them
- **Strengths and Flaws**: Balanced character traits
- **Communication Style**: How they interact

**AI Assistance**: Ensure personality consistency across all attributes.

#### Step 4: Background (4/6)
Establish your character's history:
- **Origin**: Where they're from
- **Occupation**: What they do
- **Education**: Learning background
- **Family**: Family structure
- **Significant Events**: Life-changing moments
- **Current Situation**: Where they are now

**AI Assistance**: Generate backstory aligned with personality traits.

#### Step 5: Relationships (5/6)
Define connections with other characters:
- **Character**: Select from existing characters
- **Relationship Type**: Friend, enemy, family, etc.
- **Description**: Nature of the relationship
- **Dynamic**: How they interact

**Validation**: The system ensures referenced characters exist in your project.

#### Step 6: Review and Finalize (6/6)
- Review complete character sheet
- Edit any section
- Generate character summary
- Click **"Create Character"** to save

### Features

**World Context**: If you've created a world, character suggestions will be tailored to fit that world.

**Consistency Checking**: AI ensures appearance, personality, and backstory are internally consistent.

**Character Integration**: Saved characters automatically appear in shot editing dropdowns.

---

## LLM Configuration Settings

### Purpose
Configure AI language model integration for generating suggestions and content.

### How to Access
- Click **"Settings"** in the main menu
- Select **"LLM Configuration"**

### Configuration Sections

#### 1. Provider Selection
Choose your AI provider:
- **OpenAI**: GPT-4, GPT-3.5-turbo
- **Anthropic**: Claude models
- **Local**: Self-hosted models
- **Custom**: Your own endpoint

**Provider-Specific Fields**: The UI automatically shows only relevant fields for your selected provider.

#### 2. Authentication
- **API Key**: Enter your API key (masked after entry)
- **Custom Endpoint**: For local/custom providers
- **Test Connection**: Verify your credentials work

**Security**: API keys are encrypted before storage using Web Crypto API.

#### 3. Generation Parameters
Fine-tune AI behavior:
- **Temperature** (0-2): Creativity level (higher = more creative)
- **Max Tokens**: Maximum response length
- **Top P** (0-1): Nucleus sampling parameter
- **Frequency Penalty** (-2 to 2): Reduce repetition
- **Presence Penalty** (-2 to 2): Encourage topic diversity

**Tooltips**: Hover over any parameter for detailed explanations.

#### 4. System Prompts
Customize AI behavior for different tasks:
- **World Generation**: Prompt for world creation
- **Character Generation**: Prompt for character creation
- **Dialogue Generation**: Prompt for dialogue

**Templates**: Use built-in templates or create your own.

#### 5. Advanced Settings
- **Timeout**: Request timeout in milliseconds
- **Retry Attempts**: How many times to retry failed requests
- **Streaming**: Enable real-time response streaming
- **Rate Limiting**: Control request frequency

### Features

**Connection Testing**: Test your configuration before saving.

**Credential Security**: All sensitive data is encrypted and never exposed in logs.

**Export Settings**: Export configuration (excluding credentials) for sharing.

---

## ComfyUI Connection Settings

### Purpose
Configure connection to your ComfyUI server for image and video generation.

### How to Access
- Click **"Settings"** in the main menu
- Select **"ComfyUI Configuration"**

### Configuration Sections

#### 1. Connection Configuration
- **Server URL**: Your ComfyUI server address
- **Protocol**: HTTP or HTTPS
- **Port**: Server port number
- **Test Connection**: Verify server is reachable

**Status Display**: Real-time connection status with detailed diagnostics.

#### 2. Authentication
Choose authentication method:
- **None**: No authentication required
- **Basic**: Username and password
- **Token**: API token

**Secure Storage**: Credentials are encrypted before storage.

#### 3. Workflow Selection
Select workflows for different tasks:
- **Image Generation**: Workflow for creating images
- **Video Generation**: Workflow for creating videos
- **Upscaling**: Workflow for enhancing resolution
- **Inpainting**: Workflow for image editing

**Workflow Info**: View description and required inputs for each workflow.

#### 4. Model Preferences
Choose your preferred models:
- **Checkpoint Model**: Base generation model
- **VAE Model**: Variational autoencoder
- **LoRA Models**: Fine-tuning models (multi-select)

**Model Info**: See model size and loaded status.

#### 5. Performance Settings
Optimize generation:
- **Batch Size**: Number of images per batch
- **Timeout**: Maximum wait time
- **Concurrent Jobs**: Parallel generation limit
- **Queue Priority**: Job prioritization

#### 6. Server Status
Monitor your server:
- **Connection Status**: Real-time status
- **Server Version**: ComfyUI version
- **GPU Info**: Graphics card and VRAM
- **Active Jobs**: Current queue size
- **Health Check History**: Past connection tests

### Features

**Health Checks**: Automatic server health monitoring.

**Workflow Discovery**: Automatically detect available workflows.

**Model Management**: View and manage installed models.

---

## Tips and Best Practices

### World Creation
1. **Start Broad, Then Specific**: Begin with genre and tone, then add details
2. **Use AI Suggestions**: Let AI generate initial ideas, then refine them
3. **Maintain Consistency**: Ensure rules and cultural elements align with your genre
4. **Save Often**: While auto-save is enabled, manually save at key milestones

### Character Creation
1. **Define Core First**: Start with name, role, and basic traits
2. **Let AI Help**: Use AI for appearance and backstory suggestions
3. **Check Consistency**: Review that appearance matches personality
4. **Build Relationships**: Connect characters to create a rich cast
5. **Use World Context**: Create characters after defining your world

### LLM Configuration
1. **Test Before Saving**: Always test connection before saving settings
2. **Start Conservative**: Begin with lower temperature (0.7) and adjust
3. **Monitor Costs**: Be aware of token usage with your provider
4. **Customize Prompts**: Tailor system prompts to your specific needs
5. **Keep Credentials Safe**: Never share your API keys

### ComfyUI Configuration
1. **Verify Server First**: Ensure ComfyUI is running before configuring
2. **Choose Appropriate Workflows**: Match workflows to your needs
3. **Monitor Performance**: Watch VRAM usage and adjust batch size
4. **Test Workflows**: Run test generations to verify setup
5. **Keep Models Updated**: Regularly update your model library

---

## Troubleshooting

### World/Character Wizard Issues

**Problem**: Wizard won't advance to next step
- **Solution**: Check for validation errors (highlighted in red)
- **Solution**: Ensure all required fields are filled

**Problem**: AI suggestions not generating
- **Solution**: Verify LLM configuration is set up correctly
- **Solution**: Check your API key is valid and has credits
- **Solution**: Try manual entry mode if AI is unavailable

**Problem**: Lost progress after closing wizard
- **Solution**: Check localStorage is enabled in your browser
- **Solution**: Look for auto-saved state when reopening wizard
- **Solution**: Use "Export Data" button to save progress manually

**Problem**: Can't edit AI-generated content
- **Solution**: All AI suggestions are editable - click on any field to modify
- **Solution**: Use "Reset to Generated" to restore original AI suggestion

### LLM Configuration Issues

**Problem**: Connection test fails
- **Solution**: Verify API key is correct
- **Solution**: Check internet connection
- **Solution**: Ensure provider service is not down
- **Solution**: Try a different endpoint if using custom provider

**Problem**: API key not saving
- **Solution**: Ensure browser supports Web Crypto API
- **Solution**: Check localStorage is not full
- **Solution**: Try clearing browser cache

**Problem**: Slow AI responses
- **Solution**: Reduce max tokens parameter
- **Solution**: Check provider status for outages
- **Solution**: Consider switching to faster model

### ComfyUI Configuration Issues

**Problem**: Can't connect to server
- **Solution**: Verify ComfyUI is running
- **Solution**: Check server URL and port are correct
- **Solution**: Ensure firewall allows connection
- **Solution**: Try HTTP instead of HTTPS for local servers

**Problem**: Workflows not appearing
- **Solution**: Refresh workflows list
- **Solution**: Verify workflows are installed in ComfyUI
- **Solution**: Check ComfyUI version compatibility

**Problem**: Generation fails
- **Solution**: Verify selected models are loaded
- **Solution**: Check VRAM is sufficient
- **Solution**: Reduce batch size
- **Solution**: Review ComfyUI logs for errors

### General Issues

**Problem**: Wizard UI not responding
- **Solution**: Check browser console for errors
- **Solution**: Try refreshing the page
- **Solution**: Clear browser cache and reload
- **Solution**: Ensure JavaScript is enabled

**Problem**: Data not persisting
- **Solution**: Check localStorage is enabled
- **Solution**: Verify you're not in private/incognito mode
- **Solution**: Check available storage space
- **Solution**: Try exporting data manually

**Problem**: Accessibility issues
- **Solution**: Use Tab key for keyboard navigation
- **Solution**: Enable screen reader if needed
- **Solution**: Check ARIA labels are present
- **Solution**: Report specific accessibility issues

---

## Keyboard Shortcuts

### Navigation
- **Tab**: Move to next field
- **Shift+Tab**: Move to previous field
- **Enter**: Advance to next step (when valid)
- **Escape**: Cancel wizard

### Editing
- **Ctrl+S** (Cmd+S on Mac): Save progress
- **Ctrl+Z** (Cmd+Z on Mac): Undo changes
- **Ctrl+Y** (Cmd+Y on Mac): Redo changes

---

## Getting Help

If you encounter issues not covered in this guide:

1. **Check Documentation**: Review the technical documentation in `/docs`
2. **Review Logs**: Check browser console for error messages
3. **Export Data**: Use "Export Data" button to save your work
4. **Report Issues**: Contact support with error details and steps to reproduce

---

## Version Information

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Compatible With**: StoryCore-Engine Creative Studio v1.0+

---

*For technical documentation and API references, see the developer documentation in the `/docs` directory.*
