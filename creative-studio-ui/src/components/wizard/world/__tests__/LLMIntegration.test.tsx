/**
 * LLM Integration Tests for World Wizard
 * 
 * Tests the integration of LLM generation capabilities in world wizard steps.
 * Validates Requirements 1.2, 1.7, 1.8 from the UI Configuration Wizards spec.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardProvider } from '@/contexts/WizardContext';
import { Step2WorldRules } from '../Step2WorldRules';
import { Step3Locations } from '../Step3Locations';
import { Step4CulturalElements } from '../Step4CulturalElements';

// ============================================================================
// Mock Setup
// ============================================================================

const mockGenerate = vi.fn();
const mockCancelRequest = vi.fn();

vi.mock('@/services/llmService', async () => {
  const actual = await vi.importActual('@/services/llmService');
  return {
    ...actual,
    getLLMService: () => ({
      generateCompletion: mockGenerate,
      cancelRequest: mockCancelRequest,
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
    }),
  };
});

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
    
    mockGenerate.mockResolvedValue({
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
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Generate 4-6 world rules'),
          systemPrompt: expect.stringContaining('world-building assistant'),
          temperature: 0.8,
          maxTokens: 1000,
        }),
        expect.any(String)
      );
    });
  });

  it('should display loading state during generation', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    expect(screen.getByText(/generating world rules/i)).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should add generated rules to the form', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
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

  it('should display error when LLM generation fails', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
      success: false,
      error: 'API key invalid',
      code: 'invalid_api_key',
    });

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/ai generation failed/i)).toBeInTheDocument();
    });
  });

  it('should preserve user-edited rules when regenerating', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
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
    
    mockGenerate.mockResolvedValue({
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
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Generate 3-5 key locations'),
          systemPrompt: expect.stringContaining('world-building assistant'),
          temperature: 0.8,
          maxTokens: 1200,
        }),
        expect.any(String)
      );
    });
  });

  it('should add generated locations to the form', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
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

  it('should handle malformed JSON response gracefully', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
      success: true,
      data: {
        content: 'This is not valid JSON',
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate locations/i });
    await user.click(button);

    // Should not crash, just not add any locations
    await waitFor(() => {
      expect(screen.queryByText(/no locations added yet/i)).toBeInTheDocument();
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

  it('should display Generate Elements button', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByRole('button', { name: /generate elements/i })).toBeInTheDocument();
  });

  it('should call LLM service when Generate Elements is clicked', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
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
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Generate cultural elements'),
          systemPrompt: expect.stringContaining('world-building assistant'),
          temperature: 0.8,
          maxTokens: 1500,
        }),
        expect.any(String)
      );
    });
  });

  it('should add generated cultural elements to the form', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
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
      expect(screen.getByText('Church of Light')).toBeInTheDocument();
      expect(screen.getByText('Coming of age trials')).toBeInTheDocument();
      expect(screen.getByText('The Great Schism')).toBeInTheDocument();
      expect(screen.getByText('Magic vs Technology')).toBeInTheDocument();
    });
  });

  it('should preserve existing cultural elements when regenerating', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          languages: ['New Language'],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        }),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
      culturalElements: {
        languages: ['Existing Language'],
        religions: [],
        traditions: [],
        historicalEvents: [],
        culturalConflicts: [],
      },
    });

    // Verify existing element is present
    expect(screen.getByText('Existing Language')).toBeInTheDocument();

    // Generate new elements
    const button = screen.getByRole('button', { name: /generate elements/i });
    await user.click(button);

    await waitFor(() => {
      // Both existing and new elements should be present
      expect(screen.getByText('Existing Language')).toBeInTheDocument();
      expect(screen.getByText('New Language')).toBeInTheDocument();
    });
  });

  it('should allow manual entry after LLM failure', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded',
      code: 'rate_limit',
    });

    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const generateButton = screen.getByRole('button', { name: /generate elements/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/ai generation failed/i)).toBeInTheDocument();
    });

    // User should still be able to add elements manually
    const languageInput = screen.getByPlaceholderText(/common tongue/i);
    await user.type(languageInput, 'Manual Language');
    
    const addButton = screen.getAllByRole('button', { name: /add/i })[0];
    await user.click(addButton);

    expect(screen.getByText('Manual Language')).toBeInTheDocument();
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('LLM Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display retry button for retryable errors', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValueOnce({
      success: false,
      error: 'Timeout',
      code: 'timeout',
    });

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('should retry generation when retry button is clicked', async () => {
    const user = userEvent.setup();
    
    // First call fails
    mockGenerate.mockResolvedValueOnce({
      success: false,
      error: 'Timeout',
      code: 'timeout',
    });

    // Second call succeeds
    mockGenerate.mockResolvedValueOnce({
      success: true,
      data: {
        content: JSON.stringify([
          {
            category: 'magical',
            rule: 'Retry success',
            implications: 'It worked',
          },
        ]),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const generateButton = screen.getByRole('button', { name: /generate rules/i });
    await user.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/ai generation failed/i)).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Retry success')).toBeInTheDocument();
    });
  });

  it('should allow dismissing error messages', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
      success: false,
      error: 'API error',
      code: 'api_error',
    });

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/ai generation failed/i)).toBeInTheDocument();
    });

    const dismissButton = screen.getByLabelText(/dismiss error/i);
    await user.click(dismissButton);

    expect(screen.queryByText(/ai generation failed/i)).not.toBeInTheDocument();
  });
});

// ============================================================================
// Context Preservation Tests (Requirement 1.8)
// ============================================================================

describe('Context Preservation on Regeneration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include world context in LLM prompts', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([]),
        finishReason: 'stop',
      },
    });

    renderWithWizard(<Step2WorldRules />, {
      name: 'Eldoria',
      genre: ['fantasy', 'epic'],
      timePeriod: 'Medieval with magic',
      tone: ['dark', 'gritty'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringMatching(/fantasy.*epic/),
        }),
        expect.any(String)
      );
      
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Medieval with magic'),
        }),
        expect.any(String)
      );
      
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringMatching(/dark.*gritty/),
        }),
        expect.any(String)
      );
    });
  });

  it('should not overwrite user-edited fields on regeneration', async () => {
    const user = userEvent.setup();
    
    mockGenerate.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify([
          {
            category: 'magical',
            rule: 'Generated rule',
            implications: 'Generated implications',
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
          id: 'user-1',
          category: 'physical',
          rule: 'User edited rule',
          implications: 'User edited implications',
        },
      ],
    });

    // Verify user rule exists
    expect(screen.getByDisplayValue('User edited rule')).toBeInTheDocument();

    // Generate new rules
    const button = screen.getByRole('button', { name: /generate rules/i });
    await user.click(button);

    await waitFor(() => {
      // User rule should still exist
      expect(screen.getByDisplayValue('User edited rule')).toBeInTheDocument();
      // New rule should be added
      expect(screen.getByDisplayValue('Generated rule')).toBeInTheDocument();
    });
  });
});
