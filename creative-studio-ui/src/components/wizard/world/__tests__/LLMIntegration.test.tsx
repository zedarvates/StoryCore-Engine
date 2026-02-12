/**
 * LLM Integration Tests for World Wizard
 * 
 * Tests the integration of LLM generation capabilities in world wizard steps.
 * Validates Requirements 1.2, 1.7, 1.8 from the UI Configuration Wizards spec.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardProvider } from '@/contexts/WizardContext';
import { Step2WorldRules } from '../Step2WorldRules';
import { Step3Locations } from '../Step3Locations';
import { Step4CulturalElements } from '../Step4CulturalElements';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock generateCompletion function reference for tests
const mockGenerateCompletion = vi.fn();

// Mock llmConfigService - this is what useLLMGeneration actually uses
vi.mock('@/services/llmConfigService', () => ({
  llmConfigService: {
    getService: () => ({
      generateCompletion: mockGenerateCompletion,
      generateStreamingCompletion: vi.fn(),
      cancelRequest: vi.fn(),
      getConfig: () => ({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
        parameters: {
          temperature: 0.7,
          maxTokens: 2000,
          topP: 1.0,
          frequencyPenalty: 0,
          presencePenalty: 0,
        },
        systemPrompts: {
          worldGeneration: 'Test prompt',
          characterGeneration: 'Test prompt',
          dialogueGeneration: 'Test prompt',
        },
        timeout: 30000,
        retryAttempts: 3,
        streamingEnabled: true,
      }),
      createRecoveryOptions: vi.fn(),
    }),
    getConfig: () => ({
      provider: 'openai',
      apiKey: 'test-key',
      model: 'gpt-4',
    }),
    isConfigured: () => true,
    subscribe: vi.fn(() => vi.fn()),
    initialize: vi.fn().mockResolvedValue(undefined),
    updateConfig: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock useLLMGeneration hook with proper async behavior
vi.mock('@/hooks/useLLMGeneration', () => ({
  useLLMGeneration: vi.fn(() => {
    const generate = async (request: any, options?: { onSuccess?: (result: any) => void }) => {
      // Call the mock LLM service and get its resolved value
      const mockResult = await mockGenerateCompletion(request);
      
      // Extract content from the mock result
      let content;
      let finish_reason = 'stop';
      
      if (mockResult && typeof mockResult === 'object') {
        // Use content from mock result (tests set this)
        if (mockResult.data && typeof mockResult.data === 'object') {
          content = mockResult.data.content;
          finish_reason = mockResult.data.finishReason || mockResult.data.finish_reason || 'stop';
        } else if ('content' in mockResult) {
          content = mockResult.content;
        }
      }
      
      // If no content from mock, generate default content based on prompt
      if (!content) {
        const prompt = request?.prompt?.toLowerCase() || '';
        
        if (prompt.includes('cultural')) {
          content = JSON.stringify({
            languages: ['Common Tongue', 'Ancient Elvish'],
            religions: ['Church of Light', 'Old Way'],
            traditions: ['Coming of age trials', 'Festival of Lights'],
            historicalEvents: ['The Great Schism', 'Great Awakening'],
            culturalConflicts: ['Magic vs Technology', 'North vs South'],
          });
        } else if (prompt.includes('location')) {
          content = JSON.stringify({
            locations: [
              { name: 'The Crystal Spire', description: 'A towering crystal structure.', type: 'landmark' },
              { name: 'Dark Forest', description: 'Ancient woods with dangerous creatures.', type: 'wilderness' },
            ],
          });
        } else {
          content = JSON.stringify([
            { category: 'magical', rule: 'Magic requires life force', implications: 'Powerful spells drain the caster.' },
            { category: 'physical', rule: 'Gravity is weaker', implications: 'Objects fall slower and higher jumps are possible.' },
          ]);
        }
      }
      
      if (options?.onSuccess && content) {
        options.onSuccess({
          content,
          finish_reason,
        });
      }
      
      return { content, finish_reason };
    };
    
    return {
      generate,
      isLoading: false,
      error: null,
      clearError: vi.fn(),
      generateStreaming: vi.fn(),
      retry: vi.fn(),
      cancel: vi.fn(),
      reset: vi.fn(),
      result: null,
    };
  }),
}));

// Mock service-warning hook
vi.mock('@/components/ui/service-warning', () => ({
  useServiceStatus: () => ({
    llmConfigured: true,
    llmChecking: false,
    comfyUIConfigured: false,
    comfyUIChecking: false,
  }),
  ServiceWarning: vi.fn(() => null),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const renderWithWizard = (component: React.ReactElement, initialData = {}) => {
  return render(
    <WizardProvider
      wizardType="world"
      totalSteps={5}
      onSubmit={vi.fn()}
      initialData={initialData}
    >
      {component}
    </WizardProvider>
  );
};

// ============================================================================
// Step 2: World Rules LLM Integration Tests
// ============================================================================

describe('Step2WorldRules - LLM Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should display Generate Rules button', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
      timePeriod: 'Medieval',
      tone: ['dark'],
    });

    expect(screen.getByRole('button', { name: /generate rules/i })).toBeInTheDocument();
  });

  it('should disable Generate Rules button when no genre is selected', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: [],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    expect(button).toBeDisabled();
  });

  it('should call LLM service when Generate Rules is clicked', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([
          {
            category: 'magical',
            rule: 'Magic requires life force',
            implications: 'Powerful spells are dangerous',
          },
        ]),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
      timePeriod: 'Medieval',
      tone: ['dark'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Generate 4-6 world rules'),
          systemPrompt: expect.stringContaining('world-building assistant'),
          temperature: 0.8,
          maxTokens: 1000,
        })
      );
    });
  });

  it('should add generated rules to the form', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([
          {
            category: 'magical',
            rule: 'Magic requires life force',
            implications: 'Powerful spells are dangerous',
          },
          {
            category: 'physical',
            rule: 'Gravity is weaker',
            implications: 'People can jump higher',
          },
        ]),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Magic requires life force')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Gravity is weaker')).toBeInTheDocument();
    });
  });

  it('should preserve user-edited rules when regenerating', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([
          {
            category: 'magical',
            rule: 'New generated rule',
            implications: 'New implications',
          },
        ]),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
      rules: [
        {
          id: 'existing-1',
          category: 'physical',
          rule: 'User created rule',
          implications: 'User implications',
        },
      ],
    });

    // Verify existing rule is present
    expect(screen.getByDisplayValue('User created rule')).toBeInTheDocument();

    // Generate new rules
    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    await waitFor(() => {
      // Both existing and new rules should be present
      expect(screen.getByDisplayValue('User created rule')).toBeInTheDocument();
      expect(screen.getByDisplayValue('New generated rule')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Step 3: Locations LLM Integration Tests
// ============================================================================

describe('Step3Locations - LLM Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should display Generate Locations button', () => {
    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByRole('button', { name: /generate locations/i })).toBeInTheDocument();
  });

  it('should disable Generate Locations button when no world name', () => {
    renderWithWizard(<Step3Locations />, {
      name: '',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate locations/i });
    expect(button).toBeDisabled();
  });

  it('should call LLM service when Generate Locations is clicked', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([
          {
            name: 'The Crystal Spire',
            description: 'A towering structure of crystal',
            significance: 'Seat of magical power',
            atmosphere: 'Awe-inspiring',
          },
        ]),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
      timePeriod: 'Medieval',
      tone: ['epic'],
    });

    const button = screen.getByRole('button', { name: /generate locations/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Generate 3-5 key locations'),
          systemPrompt: expect.stringContaining('world-building assistant'),
          temperature: 0.8,
          maxTokens: 1200,
        })
      );
    });
  });

  it('should add generated locations to the form', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([
          {
            name: 'The Crystal Spire',
            description: 'A towering structure',
            significance: 'Magical center',
            atmosphere: 'Mystical',
          },
          {
            name: 'Dark Forest',
            description: 'Ancient woods',
            significance: 'Home of spirits',
            atmosphere: 'Eerie',
          },
        ]),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate locations/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('The Crystal Spire')).toBeInTheDocument();
      expect(screen.getByText('Dark Forest')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// Step 4: Cultural Elements LLM Integration Tests
// ============================================================================

describe('Step4CulturalElements - LLM Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should display Generate Elements button', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByRole('button', { name: /generate elements/i })).toBeInTheDocument();
  });

  it('should call LLM service when Generate Elements is clicked', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          languages: ['Common Tongue', 'Ancient Elvish'],
          religions: ['Church of Light', 'Old Ways'],
          traditions: ['Coming of age trials', 'Harvest festival'],
          historicalEvents: ['The Great Schism', 'Discovery of magic'],
          culturalConflicts: ['Magic vs Technology', 'Religious divide'],
        }),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
      timePeriod: 'Medieval',
      tone: ['epic'],
    });

    const button = screen.getByRole('button', { name: /generate elements/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Generate cultural elements'),
          systemPrompt: expect.stringContaining('world-building assistant'),
          temperature: 0.8,
          maxTokens: 1500,
        })
      );
    });
  });

  it('should add generated cultural elements to the form', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          languages: ['Common Tongue', 'Ancient Elvish'],
          religions: ['Church of Light'],
          traditions: ['Coming of age trials'],
          historicalEvents: ['The Great Schism'],
          culturalConflicts: ['Magic vs Technology'],
        }),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate elements/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Common Tongue')).toBeInTheDocument();
      expect(screen.getByText('Ancient Elvish')).toBeInTheDocument();
    });
  });

  it('should include world context in LLM prompts', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          languages: ['Dwarven'],
          religions: ['Forge God'],
          traditions: ['Iron Festival'],
          historicalEvents: ['Great Mining'],
          culturalConflicts: ['Elves vs Dwarves'],
        }),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
      timePeriod: 'Medieval',
      tone: ['dark'],
    });

    const button = screen.getByRole('button', { name: /generate elements/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringMatching(/fantasy/),
        })
      );
    });
  });
});
