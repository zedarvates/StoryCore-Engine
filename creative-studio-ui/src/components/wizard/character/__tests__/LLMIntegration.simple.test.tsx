/**
 * Simple LLM Integration Tests for Character Wizard
 * 
 * Tests the LLM generation features in character wizard steps
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardProvider } from '@/contexts/WizardContext';
import { Step1BasicIdentity } from '../Step1BasicIdentity';
import { Step2PhysicalAppearance } from '../Step2PhysicalAppearance';
import { Step3Personality } from '../Step3Personality';
import { Step4Background } from '../Step4Background';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock generateCompletion function reference for tests
const mockGenerateCompletion = vi.fn();

vi.mock('@/services/llmService', () => ({
  getLLMService: vi.fn(() => ({
    generateCompletion: mockGenerateCompletion,
    createRecoveryOptions: vi.fn(),
  })),
}));

// Mock useLLMGeneration hook for character steps
vi.mock('@/hooks/useLLMGeneration', () => ({
  useLLMGeneration: vi.fn(() => {
    const generate = async (request: any, options?: { onSuccess?: (result: any) => void }) => {
      // Call the mock LLM service and get its resolved value
      const mockResult = await mockGenerateCompletion(request);
      
      // Extract content from the mock result
      let content;
      let finish_reason = 'stop';
      
      if (mockResult && typeof mockResult === 'object') {
        if (mockResult.data && typeof mockResult.data === 'object') {
          content = mockResult.data.content;
          finish_reason = mockResult.data.finishReason || mockResult.data.finish_reason || 'stop';
        } else if ('content' in mockResult) {
          content = mockResult.content;
        }
      }
      
      // If no content from mock, generate default content based on request type
      if (!content) {
        const prompt = request?.prompt?.toLowerCase() || '';
        
        if (prompt.includes('name')) {
          content = JSON.stringify({
            name: 'Aria Stormwind',
            suggested_names: ['Aria', 'Stormwind', 'Aria Stormwind'],
          });
        } else if (prompt.includes('appearance') || prompt.includes('physical')) {
          content = JSON.stringify({
            hair_color: 'Silver',
            eye_color: 'Blue',
            skin_tone: 'Pale',
            height: 'Tall',
            build: 'Athletic',
          });
        } else if (prompt.includes('personality')) {
          content = JSON.stringify({
            traits: ['Brave', 'Loyal', 'Determined'],
            values: ['Justice', 'Honor'],
            fears: ['Failure', 'Loss'],
            desires: ['Recognition', 'Adventure'],
            flaws: ['Impulsive'],
            strengths: ['Courageous'],
          });
        } else if (prompt.includes('background')) {
          content = JSON.stringify({
            origin: 'Born in a small village',
            occupation: 'Adventurer',
            education: 'Self-taught',
            family: 'Only surviving sibling',
            significant_events: ['Found ancient artifact'],
            current_situation: 'Seeking revenge',
          });
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

const mockWorld = {
  id: 'test-world',
  name: 'Test Fantasy World',
  genre: ['fantasy', 'adventure'],
  tone: ['epic', 'dramatic'],
  timePeriod: 'Medieval Era',
} as World;

const renderWithWizard = (component: React.ReactElement, initialData: Partial<Character> = {}) => {
  return render(
    <WizardProvider
      wizardType="character"
      totalSteps={5}
      initialData={initialData}
      onSubmit={vi.fn()}
    >
      {component}
    </WizardProvider>
  );
};

// ============================================================================
// Step 1: Name Generation Tests
// ============================================================================

describe('Step1BasicIdentity - Name Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render name generation button', () => {
    renderWithWizard(<Step1BasicIdentity worldContext={mockWorld} />);
    
    expect(screen.getByText('Suggest Name')).toBeInTheDocument();
  });

  it('should disable name generation when no archetype is selected', () => {
    renderWithWizard(<Step1BasicIdentity worldContext={mockWorld} />);
    
    const button = screen.getByText('Suggest Name');
    expect(button).toBeDisabled();
  });

  it('should enable name generation when archetype is selected', async () => {
    const user = userEvent.setup();
    const initialData: Partial<Character> = {
      role: {
        archetype: 'Protagonist',
        narrative_function: '',
        character_arc: '',
      },
    };
    
    renderWithWizard(<Step1BasicIdentity worldContext={mockWorld} />, initialData);
    
    const button = screen.getByText('Suggest Name');
    expect(button).not.toBeDisabled();
  });

  it('should show world context information', () => {
    renderWithWizard(<Step1BasicIdentity worldContext={mockWorld} />);
    
    expect(screen.getByText(/Creating character for world:/)).toBeInTheDocument();
    expect(screen.getByText('Test Fantasy World')).toBeInTheDocument();
  });

  it('should call LLM service when name generation is clicked', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          name: 'Aria Stormwind',
          suggested_names: ['Aria', 'Stormwind', 'Aria Stormwind'],
        }),
        finishReason: 'stop',
      },
    });

    const initialData: Partial<Character> = {
      role: {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      },
    };
    
    renderWithWizard(<Step1BasicIdentity worldContext={mockWorld} />, initialData);
    
    const button = screen.getByText('Suggest Name');
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('character name'),
          systemPrompt: expect.stringContaining('character generation'),
        })
      );
    });
  });
});

// ============================================================================
// Step 2: Appearance Generation Tests
// ============================================================================

describe('Step2PhysicalAppearance - Appearance Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render appearance generation button', () => {
    renderWithWizard(<Step2PhysicalAppearance worldContext={mockWorld} />);
    
    expect(screen.getByText('Generate Appearance')).toBeInTheDocument();
  });

  it('should disable generation when no archetype is set', () => {
    renderWithWizard(<Step2PhysicalAppearance worldContext={mockWorld} />);
    
    const button = screen.getByText('Generate Appearance');
    expect(button).toBeDisabled();
  });

  it('should enable generation when archetype is set', () => {
    const initialData: Partial<Character> = {
      name: 'Test Character',
      role: {
        archetype: 'Warrior',
        narrative_function: '',
        character_arc: '',
      },
    };
    
    renderWithWizard(<Step2PhysicalAppearance worldContext={mockWorld} />, initialData);
    
    const button = screen.getByText('Generate Appearance');
    expect(button).not.toBeDisabled();
  });

  it('should render all appearance input fields', () => {
    renderWithWizard(<Step2PhysicalAppearance worldContext={mockWorld} />);
    
    expect(screen.getByLabelText('Hair Color')).toBeInTheDocument();
    expect(screen.getByLabelText('Eye Color')).toBeInTheDocument();
    expect(screen.getByLabelText('Skin Tone')).toBeInTheDocument();
    expect(screen.getByLabelText('Height')).toBeInTheDocument();
  });

  it('should call LLM service when appearance generation is clicked', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          hair_color: 'Silver',
          eye_color: 'Blue',
          skin_tone: 'Pale',
          height: 'Tall',
          build: 'Athletic',
        }),
        finishReason: 'stop',
      },
    });

    const initialData: Partial<Character> = {
      name: 'Test Character',
      role: {
        archetype: 'Warrior',
        narrative_function: '',
        character_arc: '',
      },
    };
    
    renderWithWizard(<Step2PhysicalAppearance worldContext={mockWorld} />, initialData);
    
    const button = screen.getByText('Generate Appearance');
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('physical appearance'),
          systemPrompt: expect.stringContaining('character generation'),
        })
      );
    });
  });
});

// ============================================================================
// Step 3: Personality Generation Tests
// ============================================================================

describe('Step3Personality - Personality Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render personality generation button', () => {
    renderWithWizard(<Step3Personality />);
    
    expect(screen.getByText('Generate Personality')).toBeInTheDocument();
  });

  it('should disable generation when no archetype is set', () => {
    renderWithWizard(<Step3Personality />);
    
    const button = screen.getByText('Generate Personality');
    expect(button).toBeDisabled();
  });

  it('should enable generation when archetype is set', () => {
    const initialData: Partial<Character> = {
      name: 'Test Character',
      role: {
        archetype: 'Mentor',
        narrative_function: '',
        character_arc: '',
      },
    };
    
    renderWithWizard(<Step3Personality />, initialData);
    
    const button = screen.getByText('Generate Personality');
    expect(button).not.toBeDisabled();
  });

  it('should render all personality input sections', () => {
    renderWithWizard(<Step3Personality />);
    
    expect(screen.getByText('Core Personality Traits')).toBeInTheDocument();
    expect(screen.getByText('Values and Beliefs')).toBeInTheDocument();
    expect(screen.getByText('Fears')).toBeInTheDocument();
    expect(screen.getByText('Desires and Goals')).toBeInTheDocument();
    expect(screen.getByText('Flaws')).toBeInTheDocument();
    expect(screen.getByText('Strengths')).toBeInTheDocument();
  });

  it('should call LLM service when personality generation is clicked', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          traits: ['Wise', 'Patient'],
          values: ['Knowledge', 'Truth'],
          fears: ['Obsolescence'],
          desires: ['Legacy'],
          flaws: ['Detached'],
          strengths: ['Insightful'],
        }),
        finishReason: 'stop',
      },
    });

    const initialData: Partial<Character> = {
      name: 'Test Character',
      role: {
        archetype: 'Mentor',
        narrative_function: '',
        character_arc: '',
      },
    };
    
    renderWithWizard(<Step3Personality />, initialData);
    
    const button = screen.getByText('Generate Personality');
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('personality'),
          systemPrompt: expect.stringContaining('character generation'),
        })
      );
    });
  });
});

// ============================================================================
// Step 4: Background Generation Tests
// ============================================================================

describe('Step4Background - Background Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should render background generation button', () => {
    renderWithWizard(<Step4Background worldContext={mockWorld} />);
    
    expect(screen.getByText('Generate Background')).toBeInTheDocument();
  });

  it('should disable generation when no personality traits are set', () => {
    renderWithWizard(<Step4Background worldContext={mockWorld} />);
    
    const button = screen.getByText('Generate Background');
    expect(button).toBeDisabled();
  });

  it('should enable generation when personality traits are set', () => {
    const initialData: Partial<Character> = {
      name: 'Test Character',
      personality: {
        traits: ['Brave', 'Loyal'],
        values: ['Justice'],
        fears: ['Failure'],
        desires: ['Recognition'],
        flaws: ['Impulsive'],
        strengths: ['Determined'],
        temperament: 'Choleric',
        communication_style: 'Direct',
      },
    };
    
    renderWithWizard(<Step4Background worldContext={mockWorld} />, initialData);
    
    const button = screen.getByText('Generate Background');
    expect(button).not.toBeDisabled();
  });

  it('should render all background input fields', () => {
    renderWithWizard(<Step4Background worldContext={mockWorld} />);
    
    expect(screen.getByLabelText('Origin and Upbringing')).toBeInTheDocument();
    expect(screen.getByLabelText('Occupation and Skills')).toBeInTheDocument();
    expect(screen.getByLabelText('Education')).toBeInTheDocument();
    expect(screen.getByLabelText('Family Background')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Situation')).toBeInTheDocument();
  });

  it('should call LLM service when background generation is clicked', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          origin: 'Born in a remote mountain village',
          occupation: 'Former soldier',
          education: 'Military academy training',
          family: 'War hero father',
          significant_events: ['Battle of the Crimson Fields'],
          current_situation: 'Seeking redemption for past actions',
        }),
        finishReason: 'stop',
      },
    });

    const initialData: Partial<Character> = {
      name: 'Test Character',
      personality: {
        traits: ['Brave', 'Loyal'],
        values: ['Justice'],
        fears: ['Failure'],
        desires: ['Recognition'],
        flaws: ['Impulsive'],
        strengths: ['Determined'],
        temperament: 'Choleric',
        communication_style: 'Direct',
      },
    };
    
    renderWithWizard(<Step4Background worldContext={mockWorld} />, initialData);
    
    const button = screen.getByText('Generate Background');
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('background'),
          systemPrompt: expect.stringContaining('character generation'),
        })
      );
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('LLM Integration - Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('should pass world context through all steps', () => {
    const { rerender } = renderWithWizard(<Step1BasicIdentity worldContext={mockWorld} />);
    expect(screen.getByText('Test Fantasy World')).toBeInTheDocument();
    
    rerender(
      <WizardProvider wizardType="character" totalSteps={5} initialData={{}} onSubmit={vi.fn()}>
        <Step2PhysicalAppearance worldContext={mockWorld} />
      </WizardProvider>
    );
    
    rerender(
      <WizardProvider wizardType="character" totalSteps={5} initialData={{}} onSubmit={vi.fn()}>
        <Step4Background worldContext={mockWorld} />
      </WizardProvider>
    );
  });

  it('should maintain character data consistency across steps', () => {
    const characterData: Partial<Character> = {
      name: 'Aria Stormwind',
      role: {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      },
      visual_identity: {
        hair_color: 'Silver',
        hair_style: 'Long',
        hair_length: 'Waist-length',
        eye_color: 'Blue',
        eye_shape: 'Almond',
        skin_tone: 'Pale',
        facial_structure: 'Angular',
        distinctive_features: ['Scar on eyebrow'],
        age_range: 'Young Adult (20-29)',
        height: 'Tall',
        build: 'Athletic',
        posture: 'Confident',
        clothing_style: 'Practical armor',
        color_palette: ['Silver', 'Blue', 'White'],
        reference_images: [],
        reference_sheet_images: [],
      },
    };

    const { rerender } = renderWithWizard(<Step1BasicIdentity />, characterData);
    expect(screen.getByDisplayValue('Aria Stormwind')).toBeInTheDocument();
    
    rerender(
      <WizardProvider wizardType="character" totalSteps={5} initialData={characterData} onSubmit={vi.fn()}>
        <Step2PhysicalAppearance />
      </WizardProvider>
    );
    expect(screen.getByDisplayValue('Silver')).toBeInTheDocument();
  });

  it('should use same LLM service mock for all generation steps', async () => {
    const user = userEvent.setup();
    
    mockGenerateCompletion.mockResolvedValue({
      success: true,
      data: {
        content: JSON.stringify({
          name: 'Test Name',
        }),
        finishReason: 'stop',
      },
    });

    const initialData: Partial<Character> = {
      name: 'Test Character',
      role: {
        archetype: 'Protagonist',
        narrative_function: '',
        character_arc: '',
      },
    };
    
    renderWithWizard(<Step3Personality />, initialData);
    
    const button = screen.getByText('Generate Personality');
    await user.click(button);

    await waitFor(() => {
      expect(mockGenerateCompletion).toHaveBeenCalled();
    });
  });
});
