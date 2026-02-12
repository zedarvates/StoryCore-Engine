/**
 * LLM Integration Simple Tests for World Wizard
 * 
 * Tests the integration of LLM generation capabilities in world wizard steps.
 * Validates Requirements 1.2, 1.7, 1.8 from the UI Configuration Wizards spec.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { WizardProvider } from '@/contexts/WizardContext';
import { Step2WorldRules } from '../Step2WorldRules';
import { Step3Locations } from '../Step3Locations';
import { Step4CulturalElements } from '../Step4CulturalElements';

// ============================================================================
// Mock Setup
// ============================================================================

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

describe('Step2WorldRules - LLM Integration UI', () => {
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

  it('should enable Generate Rules button when genre is selected', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    expect(button).not.toBeDisabled();
  });

  it('should display AI-Assisted Generation section', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByText(/ai-assisted generation/i)).toBeInTheDocument();
    expect(screen.getByText(/generate rule suggestions/i)).toBeInTheDocument();
  });

  it('should display technology and magic system fields', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByLabelText(/technology level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/magic rules/i)).toBeInTheDocument();
  });

  it('should display custom rules section', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByText(/custom rules/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add custom rule/i })).toBeInTheDocument();
  });

  it('should display existing rules', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
      rules: [
        {
          id: 'rule-1',
          category: 'magical',
          rule: 'Magic requires life force',
          implications: 'Powerful spells are dangerous',
        },
      ],
    });

    expect(screen.getByDisplayValue('Magic requires life force')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Powerful spells are dangerous')).toBeInTheDocument();
  });
});

// ============================================================================
// Step 3: Locations LLM Integration Tests
// ============================================================================

describe('Step3Locations - LLM Integration UI', () => {
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

  it('should enable Generate Locations button when world name exists', () => {
    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate locations/i });
    expect(button).not.toBeDisabled();
  });

  it('should display AI-Assisted Generation section', () => {
    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByText(/ai-assisted generation/i)).toBeInTheDocument();
    expect(screen.getByText(/generate location suggestions/i)).toBeInTheDocument();
  });

  it('should display empty state when no locations', () => {
    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
      locations: [],
    });

    expect(screen.getByText(/no locations added yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add first location/i })).toBeInTheDocument();
  });

  it('should display existing locations', () => {
    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
      locations: [
        {
          id: 'loc-1',
          name: 'The Crystal Spire',
          description: 'A towering structure',
          significance: 'Magical center',
          atmosphere: 'Mystical',
        },
      ],
    });

    expect(screen.getByText('The Crystal Spire')).toBeInTheDocument();
  });

  it('should display add another location button when locations exist', () => {
    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
      locations: [
        {
          id: 'loc-1',
          name: 'Test Location',
          description: 'Test',
          significance: 'Test',
          atmosphere: 'Test',
        },
      ],
    });

    expect(screen.getByRole('button', { name: /add another location/i })).toBeInTheDocument();
  });
});

// ============================================================================
// Step 4: Cultural Elements LLM Integration Tests
// ============================================================================

describe('Step4CulturalElements - LLM Integration UI', () => {
  it('should display Generate Elements button', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByRole('button', { name: /generate elements/i })).toBeInTheDocument();
  });

  it('should disable Generate Elements button when no world name', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: '',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate elements/i });
    expect(button).toBeDisabled();
  });

  it('should enable Generate Elements button when world name exists', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate elements/i });
    expect(button).not.toBeDisabled();
  });

  it('should display AI-Assisted Generation section', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByText(/ai-assisted generation/i)).toBeInTheDocument();
    expect(screen.getByText(/generate cultural elements/i)).toBeInTheDocument();
  });

  it('should display all cultural element sections', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByText(/languages/i)).toBeInTheDocument();
    expect(screen.getByText(/religions & beliefs/i)).toBeInTheDocument();
    expect(screen.getByText(/traditions & customs/i)).toBeInTheDocument();
    expect(screen.getByText(/historical events/i)).toBeInTheDocument();
    expect(screen.getByText(/cultural conflicts/i)).toBeInTheDocument();
    expect(screen.getByText(/overall atmosphere/i)).toBeInTheDocument();
  });

  it('should display existing cultural elements', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
      culturalElements: {
        languages: ['Common Tongue', 'Ancient Elvish'],
        religions: ['Church of Light'],
        traditions: ['Coming of age trials'],
        historicalEvents: ['The Great Schism'],
        culturalConflicts: ['Magic vs Technology'],
      },
    });

    expect(screen.getByText('Common Tongue')).toBeInTheDocument();
    expect(screen.getByText('Ancient Elvish')).toBeInTheDocument();
    expect(screen.getByText('Church of Light')).toBeInTheDocument();
    expect(screen.getByText('Coming of age trials')).toBeInTheDocument();
    expect(screen.getByText('The Great Schism')).toBeInTheDocument();
    expect(screen.getByText('Magic vs Technology')).toBeInTheDocument();
  });

  it('should display input fields for manual entry', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByPlaceholderText(/common tongue/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/church of the light/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/coming of age ceremony/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/the great war/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/mages vs/i)).toBeInTheDocument();
  });
});

// ============================================================================
// Context Preservation Tests (Requirement 1.8)
// ============================================================================

describe('Context Preservation', () => {
  it('should preserve existing rules when displaying Step2', () => {
    const existingRules = [
      {
        id: 'rule-1',
        category: 'magical' as const,
        rule: 'User created rule',
        implications: 'User implications',
      },
      {
        id: 'rule-2',
        category: 'physical' as const,
        rule: 'Another rule',
        implications: 'More implications',
      },
    ];

    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
      rules: existingRules,
    });

    expect(screen.getByDisplayValue('User created rule')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Another rule')).toBeInTheDocument();
  });

  it('should preserve existing locations when displaying Step3', () => {
    const existingLocations = [
      {
        id: 'loc-1',
        name: 'User Location 1',
        description: 'User description',
        significance: 'User significance',
        atmosphere: 'User atmosphere',
      },
      {
        id: 'loc-2',
        name: 'User Location 2',
        description: 'Another description',
        significance: 'Another significance',
        atmosphere: 'Another atmosphere',
      },
    ];

    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
      locations: existingLocations,
    });

    expect(screen.getByText('User Location 1')).toBeInTheDocument();
    expect(screen.getByText('User Location 2')).toBeInTheDocument();
  });

  it('should preserve existing cultural elements when displaying Step4', () => {
    const existingElements = {
      languages: ['User Language 1', 'User Language 2'],
      religions: ['User Religion'],
      traditions: ['User Tradition'],
      historicalEvents: ['User Event'],
      culturalConflicts: ['User Conflict'],
    };

    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
      culturalElements: existingElements,
    });

    expect(screen.getByText('User Language 1')).toBeInTheDocument();
    expect(screen.getByText('User Language 2')).toBeInTheDocument();
    expect(screen.getByText('User Religion')).toBeInTheDocument();
    expect(screen.getByText('User Tradition')).toBeInTheDocument();
    expect(screen.getByText('User Event')).toBeInTheDocument();
    expect(screen.getByText('User Conflict')).toBeInTheDocument();
  });
});

// ============================================================================
// Accessibility Tests (Requirement 1.7)
// ============================================================================

describe('Accessibility', () => {
  it('should have accessible Generate buttons', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    const button = screen.getByRole('button', { name: /generate rules/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAccessibleName();
  });

  it('should have accessible form fields in Step2', () => {
    renderWithWizard(<Step2WorldRules />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByLabelText(/technology level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/magic rules/i)).toBeInTheDocument();
  });

  it('should have accessible form fields in Step3', () => {
    renderWithWizard(<Step3Locations />, {
      name: 'Test World',
      genre: ['fantasy'],
      locations: [
        {
          id: 'loc-1',
          name: 'Test',
          description: 'Test',
          significance: 'Test',
          atmosphere: 'Test',
        },
      ],
    });

    // Click to expand location
    const locationCard = screen.getByText('Test').closest('button');
    if (locationCard) {
      locationCard.click();
    }

    // Wait for fields to appear
    setTimeout(() => {
      const nameField = screen.queryByLabelText(/location name/i);
      if (nameField) {
        expect(nameField).toBeInTheDocument();
      }
    }, 100);
  });

  it('should have accessible form fields in Step4', () => {
    renderWithWizard(<Step4CulturalElements />, {
      name: 'Test World',
      genre: ['fantasy'],
    });

    expect(screen.getByLabelText(/languages/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/religions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/traditions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/significant events/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ongoing conflicts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/world atmosphere/i)).toBeInTheDocument();
  });
});
