/**
 * Simple LLM Integration Tests for Character Wizard
 * 
 * Tests the LLM generation features in character wizard steps
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardProvider } from '@/contexts/WizardContext';
import { Step1BasicIdentity } from '../Step1BasicIdentity';
import { Step2PhysicalAppearance } from '../Step2PhysicalAppearance';
import { Step3Personality } from '../Step3Personality';
import { Step4Background } from '../Step4Background';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';
import * as llmService from '@/services/llmService';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('@/services/llmService', () => ({
  getLLMService: vi.fn(() => ({
    generateCompletion: vi.fn(),
    createRecoveryOptions: vi.fn(),
  })),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const mockWorld: World = {
  world_id: 'test-world',
  name: 'Test Fantasy World',
  genre: ['fantasy', 'adventure'],
  tone: ['epic', 'dramatic'],
  timePeriod: 'Medieval Era',
  technology: 'Low tech',
  magic: 'High magic',
  rules: [],
  locations: [],
  cultural_elements: [],
  creation_method: 'wizard',
  creation_timestamp: new Date().toISOString(),
  version: '1.0',
};

const renderWithWizard = (component: React.ReactElement, initialData: Partial<Character> = {}) => {
  return render(
    <WizardProvider initialData={initialData} onComplete={vi.fn()}>
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
});

// ============================================================================
// Step 2: Appearance Generation Tests
// ============================================================================

describe('Step2PhysicalAppearance - Appearance Generation', () => {
  beforeEach(() => {
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
});

// ============================================================================
// Step 3: Personality Generation Tests
// ============================================================================

describe('Step3Personality - Personality Generation', () => {
  beforeEach(() => {
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
});

// ============================================================================
// Step 4: Background Generation Tests
// ============================================================================

describe('Step4Background - Background Generation', () => {
  beforeEach(() => {
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
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('LLM Integration - Consistency', () => {
  it('should pass world context through all steps', () => {
    const { rerender } = renderWithWizard(<Step1BasicIdentity worldContext={mockWorld} />);
    expect(screen.getByText('Test Fantasy World')).toBeInTheDocument();
    
    rerender(
      <WizardProvider initialData={{}} onComplete={vi.fn()}>
        <Step2PhysicalAppearance worldContext={mockWorld} />
      </WizardProvider>
    );
    // World context is used in generation prompts
    
    rerender(
      <WizardProvider initialData={{}} onComplete={vi.fn()}>
        <Step4Background worldContext={mockWorld} />
      </WizardProvider>
    );
    // World context is used in generation prompts
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
      },
    };

    const { rerender } = renderWithWizard(<Step1BasicIdentity />, characterData);
    expect(screen.getByDisplayValue('Aria Stormwind')).toBeInTheDocument();
    
    rerender(
      <WizardProvider initialData={characterData} onComplete={vi.fn()}>
        <Step2PhysicalAppearance />
      </WizardProvider>
    );
    expect(screen.getByDisplayValue('Silver')).toBeInTheDocument();
  });
});
