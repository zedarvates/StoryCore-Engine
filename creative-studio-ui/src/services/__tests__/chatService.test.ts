import { describe, it, expect, beforeEach } from 'vitest';
import { ChatService } from '../chatService';
import type { ChatContext } from '../chatService';

describe('ChatService', () => {
  let chatService: ChatService;
  let mockContext: ChatContext;

  beforeEach(() => {
    mockContext = {
      project: {
        schema_version: '1.0',
        project_name: 'Test Project',
        shots: [],
        assets: [],
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      },
      shots: [],
      assets: [],
      selectedShotId: null,
    };

    chatService = new ChatService(mockContext);
  });

  describe('Context Management', () => {
    it('initializes with provided context', () => {
      expect(chatService).toBeDefined();
    });

    it('updates context', () => {
      const newShot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'Test',
        duration: 5,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      };

      chatService.updateContext({ shots: [newShot] });

      // Context should be updated (verified through behavior)
      expect(chatService).toBeDefined();
    });
  });

  describe('Conversation History', () => {
    it('adds messages to history', () => {
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      chatService.addToHistory(message);

      const history = chatService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(message);
    });

    it('maintains conversation history', () => {
      const message1 = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'First message',
        timestamp: new Date(),
      };

      const message2 = {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'Response',
        timestamp: new Date(),
      };

      chatService.addToHistory(message1);
      chatService.addToHistory(message2);

      const history = chatService.getHistory();
      expect(history).toHaveLength(2);
    });

    it('clears conversation history', () => {
      const message = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Test',
        timestamp: new Date(),
      };

      chatService.addToHistory(message);
      chatService.clearHistory();

      const history = chatService.getHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Intent Analysis', () => {
    it('recognizes shot creation intent', async () => {
      const response = await chatService.processMessage('Create 3 shots about sunrise');

      expect(response.message).toContain('created');
      expect(response.actions).toBeDefined();
      expect(response.actions?.length).toBe(3);
    });

    it('recognizes transition intent', async () => {
      const response = await chatService.processMessage('Add a fade transition');

      expect(response.message).toContain('transition');
      expect(response.message).toContain('fade');
    });

    it('recognizes audio intent', async () => {
      const response = await chatService.processMessage('Suggest audio for action scene');

      expect(response.message).toContain('audio');
      expect(response.message).toContain('action');
    });

    it('recognizes text intent', async () => {
      const response = await chatService.processMessage('Add text overlay');

      expect(response.message).toContain('text');
    });

    it('recognizes project info intent', async () => {
      const response = await chatService.processMessage('How many shots do I have?');

      expect(response.message).toContain('project');
    });
  });

  describe('Shot Creation', () => {
    it('creates single shot', async () => {
      const response = await chatService.processMessage('Create a shot about sunset');

      expect(response.actions).toBeDefined();
      expect(response.actions?.length).toBe(1);
      expect(response.actions?.[0].type).toBe('addShot');
      expect(response.actions?.[0].payload.title).toContain('sunset');
    });

    it('creates multiple shots', async () => {
      const response = await chatService.processMessage('Create 5 shots about nature');

      expect(response.actions).toBeDefined();
      expect(response.actions?.length).toBe(5);
      expect(response.message).toContain('5 shots');
    });

    it('extracts theme from input', async () => {
      const response = await chatService.processMessage('Add 2 action shots');

      expect(response.actions?.[0].payload.title).toContain('action');
    });

    it('provides suggestions after creating shots', async () => {
      const response = await chatService.processMessage('Create a shot');

      expect(response.suggestions).toBeDefined();
      expect(response.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe('Shot Modification', () => {
    it('requires shot selection for modification', async () => {
      const response = await chatService.processMessage('Change the shot duration');

      expect(response.message).toContain('select a shot');
    });

    it('provides modification guidance when shot is selected', async () => {
      const shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'Test',
        duration: 5,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      };

      chatService.updateContext({ shots: [shot], selectedShotId: 'shot-1' });

      const response = await chatService.processMessage('Modify this shot');

      expect(response.message).toContain('Test Shot');
      expect(response.suggestions).toBeDefined();
    });
  });

  describe('Transition Suggestions', () => {
    it('requires multiple shots for transitions', async () => {
      const response = await chatService.processMessage('Add transitions');

      expect(response.message).toContain('at least 2 shots');
    });

    it('suggests appropriate transitions', async () => {
      const shots = [
        {
          id: 'shot-1',
          title: 'Shot 1',
          description: 'Test',
          duration: 5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
        {
          id: 'shot-2',
          title: 'Shot 2',
          description: 'Test',
          duration: 5,
          position: 1,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];

      chatService.updateContext({ shots });

      const response = await chatService.processMessage('Add fade transitions');

      expect(response.message).toContain('fade');
      expect(response.suggestions).toBeDefined();
    });

    it('recognizes different transition types', async () => {
      const shots = [
        {
          id: 'shot-1',
          title: 'Shot 1',
          description: 'Test',
          duration: 5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
        {
          id: 'shot-2',
          title: 'Shot 2',
          description: 'Test',
          duration: 5,
          position: 1,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];

      chatService.updateContext({ shots });

      const fadeResponse = await chatService.processMessage('Use fade transition');
      expect(fadeResponse.message).toContain('fade');

      const wipeResponse = await chatService.processMessage('Use wipe transition');
      expect(wipeResponse.message).toContain('wipe');
    });
  });

  describe('Audio Suggestions', () => {
    it('provides audio recommendations for action scenes', async () => {
      const response = await chatService.processMessage('Audio for action scene');

      expect(response.message).toContain('action');
      expect(response.message).toContain('orchestral');
    });

    it('provides audio recommendations for dialogue scenes', async () => {
      const response = await chatService.processMessage('Audio for dialogue scene');

      expect(response.message).toContain('dialogue');
      expect(response.message).toContain('center-channel');
    });

    it('provides audio recommendations for ambient scenes', async () => {
      const response = await chatService.processMessage('Add ambient sound');

      expect(response.message).toContain('ambient');
    });

    it('suggests voiceover generation', async () => {
      const response = await chatService.processMessage('Add voiceover');

      expect(response.message).toContain('voiceover');
      expect(response.suggestions).toBeDefined();
    });
  });

  describe('Text Overlay Suggestions', () => {
    it('requires shot selection for text', async () => {
      const response = await chatService.processMessage('Add text');

      expect(response.message).toContain('select a shot');
    });

    it('provides text guidance when shot is selected', async () => {
      const shot = {
        id: 'shot-1',
        title: 'Test Shot',
        description: 'Test',
        duration: 5,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      };

      chatService.updateContext({ shots: [shot], selectedShotId: 'shot-1' });

      const response = await chatService.processMessage('Add title');

      expect(response.message).toContain('text');
      expect(response.suggestions).toBeDefined();
    });
  });

  describe('Asset Suggestions', () => {
    it('notifies when no assets exist', async () => {
      const response = await chatService.processMessage('Suggest assets');

      expect(response.message).toContain("don't have any assets");
    });

    it('provides asset information when assets exist', async () => {
      const assets = [
        {
          id: 'asset-1',
          name: 'Image 1',
          type: 'image' as const,
          url: '/image1.jpg',
        },
      ];

      chatService.updateContext({ assets });

      const response = await chatService.processMessage('Show assets');

      expect(response.message).toContain('1 asset');
    });
  });

  describe('Project Information', () => {
    it('provides empty project information', async () => {
      const response = await chatService.processMessage('What is in my project?');

      expect(response.message).toContain('empty');
    });

    it('provides project statistics', async () => {
      const shots = [
        {
          id: 'shot-1',
          title: 'Shot 1',
          description: 'Test',
          duration: 5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
        {
          id: 'shot-2',
          title: 'Shot 2',
          description: 'Test',
          duration: 10,
          position: 1,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];

      chatService.updateContext({ shots });

      const response = await chatService.processMessage('How many shots?');

      expect(response.message).toContain('2 shots');
      expect(response.message).toContain('15 seconds');
    });
  });

  describe('General Queries', () => {
    it('provides helpful response for unclear input', async () => {
      const response = await chatService.processMessage('Help me');

      expect(response.message).toBeDefined();
      expect(response.suggestions).toBeDefined();
    });

    it('always provides suggestions', async () => {
      const response = await chatService.processMessage('Random text');

      expect(response.suggestions).toBeDefined();
      expect(response.suggestions?.length).toBeGreaterThan(0);
    });
  });
});
