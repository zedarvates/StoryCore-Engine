// Integration module for StoryCore services

const hookManager = require('../../src/addon_hooks');
const eventBus = require('../../src/addon_events');
const permissionManager = require('../../src/addon_permissions');

class IntegrationManager {
  constructor(addon) {
    this.addon = addon;
    this.hooksRegistered = false;
    this.eventsSubscribed = false;
  }

  async initialize() {
    await this.registerHooks();
    await this.subscribeToEvents();
    await this.setupPermissions();
    console.log('Content Sensitivity Addon - Integration initialized');
  }

  async registerHooks() {
    try {
      // Register content filter hook
      hookManager.register_hook(
        this.addon.name,
        'content_filter',
        this.onContentFilter.bind(this),
        { priority: 50 }
      );

      // Register security check hook
      hookManager.register_hook(
        this.addon.name,
        'security_check',
        this.onSecurityCheck.bind(this),
        { priority: 75 }
      );

      // Register pre_generation hook
      hookManager.register_hook(
        this.addon.name,
        'pre_generation',
        this.onPreGeneration.bind(this),
        { priority: 25 }
      );

      // Register post_generation hook
      hookManager.register_hook(
        this.addon.name,
        'post_generation',
        this.onPostGeneration.bind(this),
        { priority: 50 }
      );

      this.hooksRegistered = true;
      console.log('Hooks registered successfully');
    } catch (error) {
      console.error('Failed to register hooks:', error);
    }
  }

  async subscribeToEvents() {
    try {
      // Subscribe to project creation events
      eventBus.subscribe(
        this.addon.name,
        'project.created',
        this.onProjectCreated.bind(this)
      );

      // Subscribe to content generation events
      eventBus.subscribe(
        this.addon.name,
        'content.generated',
        this.onContentGenerated.bind(this)
      );

      // Subscribe to validation events
      eventBus.subscribe(
        this.addon.name,
        'validation.completed',
        this.onValidationCompleted.bind(this)
      );

      this.eventsSubscribed = true;
      console.log('Events subscribed successfully');
    } catch (error) {
      console.error('Failed to subscribe to events:', error);
    }
  }

  async setupPermissions() {
    try {
      // Request necessary permissions
      const permissions = [
        'content_access',
        'project_access',
        'user_notification'
      ];

      for (const permission of permissions) {
        const result = await permissionManager.request_permission(
          this.addon.name,
          permission,
          `Required for ${this.addon.description}`
        );

        if (!result.granted) {
          console.warn(`Permission ${permission} not granted`);
        }
      }
    } catch (error) {
      console.error('Failed to setup permissions:', error);
    }
  }

  // Hook implementations
  async onContentFilter(content, context) {
    try {
      const analysis = await this.addon.analyzeContent(content);
      
      if (analysis.level === 'high') {
        const censored = await this.addon.applyCensorship(content, 'high');
        return {
          modified: true,
          content: censored.censoredContent,
          analysis: analysis
        };
      }
      
      return {
        modified: false,
        content: content,
        analysis: analysis
      };
    } catch (error) {
      console.error('Content filter hook error:', error);
      return { modified: false, content: content, error: error.message };
    }
  }

  async onSecurityCheck(projectData) {
    try {
      const analysis = await this.addon.analyzeProject(projectData);
      
      return {
        passed: analysis.overall_score < 80,
        score: analysis.overall_score,
        details: analysis
      };
    } catch (error) {
      console.error('Security check hook error:', error);
      return { passed: false, error: error.message };
    }
  }

  async onPreGeneration(generationContext) {
    // Analyze content before generation
    if (generationContext.prompt) {
      const analysis = await this.addon.analyzeDialogue(generationContext.prompt);
      generationContext.sensitivity_analysis = analysis;
    }
    return generationContext;
  }

  async onPostGeneration(generatedContent) {
    // Analyze generated content
    const analysis = await this.addon.analyzeContent(generatedContent);
    
    // Emit event for monitoring
    eventBus.publish_addon_event(
      this.addon.name,
      'content.analyzed',
      {
        content_id: generatedContent.id,
        analysis: analysis
      },
      'project'
    );

    return generatedContent;
  }

  // Event handlers
  async onProjectCreated(event) {
    console.log(`New project created: ${event.project_id}`);
    // Could initialize sensitivity tracking for new project
  }

  async onContentGenerated(event) {
    // Analyze content as it's generated
    if (event.content) {
      const analysis = await this.addon.analyzeContent(event.content);
      
      // Store analysis results
      await this.storeAnalysis(event.project_id, analysis);
    }
  }

  async onValidationCompleted(event) {
    // Cross-reference with other validation results
    if (event.validation_results) {
      const combinedAnalysis = this.combineAnalyses(event.validation_results);
      // Update project sensitivity status
    }
  }

  async storeAnalysis(projectId, analysis) {
    // Store in database or file system
    // Implementation depends on your storage system
    try {
      const storage = require('../../backend/storage');
      await storage.saveSensitivityAnalysis(projectId, analysis);
    } catch (error) {
      console.error('Failed to store analysis:', error);
    }
  }

  combineAnalyses(validationResults) {
    // Combine with other validation results
    return {
      ...validationResults,
      sensitivity_checked: true,
      timestamp: new Date().toISOString()
    };
  }

  // Cleanup
  async cleanup() {
    if (this.hooksRegistered) {
      await hookManager.unregister_hooks(this.addon.name);
    }
    if (this.eventsSubscribed) {
      eventBus.unsubscribe_all(this.addon.name);
    }
  }
}

module.exports = IntegrationManager;