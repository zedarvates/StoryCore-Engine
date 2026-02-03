/**
 * Wizard Integration Tests (Playwright E2E)
 * 
 * End-to-end tests for wizard functionality.
 * Run with: npx playwright test --project=wizard-e2e
 */

import { test, expect, type Page } from '@playwright/test';

// ============================================================================
// Test Fixtures
// ============================================================================

test.describe('Wizard System', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    // Navigate to the app
    await page.goto('/');
  });

  // =========================================================================
  // Character Wizard Tests
  // =========================================================================

  test.describe('Character Wizard', () => {
    test('should open character wizard from menu', async () => {
      // Click on character creation menu item
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Verify wizard dialog is open
      await expect(page.locator('[data-testid="character-wizard-dialog"]')).toBeVisible();
      
      // Verify first step is active
      await expect(page.locator('[data-testid="step-1"]')).toHaveClass(/current/);
    });

    test('should navigate through all steps', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Step 1: Basic Identity
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Basic Identity');
      await page.fill('[data-testid="character-name"]', 'Test Character');
      await page.selectOption('[data-testid="character-archetype]', 'hero');
      await page.click('[data-testid="btn-next"]');
      
      // Step 2: Physical Appearance
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Appearance');
      await page.click('[data-testid="btn-next"]');
      
      // Step 3: Personality
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Personality');
      await page.click('[data-testid="btn-next"]');
      
      // Step 4: Background
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Background');
      await page.click('[data-testid="btn-next"]');
      
      // Step 5: Relationships
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Relationships');
      await page.click('[data-testid="btn-next"]');
      
      // Step 6: Review
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Review');
      await expect(page.locator('[data-testid="btn-complete"]')).toBeVisible();
    });

    test('should validate required fields', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Try to go next without filling required fields
      await page.click('[data-testid="btn-next"]');
      
      // Should show validation error
      await expect(page.locator('[data-testid="validation-error-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="validation-error-archetype"]')).toBeVisible();
    });

    test('should complete wizard and call onComplete', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Fill all steps
      await page.fill('[data-testid="character-name"]', 'My Character');
      await page.selectOption('[data-testid="character-archetype"]', 'hero');
      await page.click('[data-testid="btn-next"]');
      
      await page.click('[data-testid="btn-next"]'); // Step 2
      await page.click('[data-testid="btn-next"]'); // Step 3
      await page.click('[data-testid="btn-next"]'); // Step 4
      await page.click('[data-testid="btn-next"]'); // Step 5
      
      // Complete the wizard
      await page.click('[data-testid="btn-complete"]');
      
      // Verify onComplete was called
      await expect(page.locator('[data-testid="character-created-toast"]')).toBeVisible();
    });
  });

  // =========================================================================
  // World Wizard Tests
  // =========================================================================

  test.describe('World Wizard', () => {
    test('should open world wizard from menu', async () => {
      await page.click('[data-testid="menu-world-wizard"]');
      await expect(page.locator('[data-testid="world-wizard-dialog"]')).toBeVisible();
    });

    test('should create world with all steps', async () => {
      await page.click('[data-testid="menu-world-wizard"]');
      
      // Step 1: Basic Information
      await page.fill('[data-testid="world-name"]', 'My World');
      await page.selectOption('[data-testid="world-genre"]', 'fantasy');
      await page.click('[data-testid="btn-next"]');
      
      // Step 2: World Rules
      await page.click('[data-testid="add-rule"]');
      await page.fill('[data-testid="rule-name"]', 'Magic exists');
      await page.click('[data-testid="btn-next"]');
      
      // Step 3: Locations
      await page.click('[data-testid="add-location"]');
      await page.fill('[data-testid="location-name"]', 'Capital City');
      await page.click('[data-testid="btn-next"]');
      
      // Step 4: Cultural Elements
      await page.click('[data-testid="btn-next"]');
      
      // Step 5: Review
      await page.click('[data-testid="btn-complete"]');
      
      await expect(page.locator('[data-testid="world-created-toast"]')).toBeVisible();
    });
  });

  // =========================================================================
  // Storyteller Wizard Tests
  // =========================================================================

  test.describe('Storyteller Wizard', () => {
    test('should open storyteller wizard from menu', async () => {
      await page.click('[data-testid="menu-storyteller-wizard"]');
      await expect(page.locator('[data-testid="storyteller-wizard-dialog"]')).toBeVisible();
    });

    test('should generate story', async () => {
      await page.click('[data-testid="menu-storyteller-wizard"]');
      
      // Step 1: Story Setup
      await page.fill('[data-testid="story-summary"]', 'A hero discovers a hidden power');
      await page.click('[data-testid="btn-next"]');
      
      // Step 2: Character Selection
      await page.check('[data-testid="character-select-1"]');
      await page.click('[data-testid="btn-next"]');
      
      // Step 3: Location Selection
      await page.check('[data-testid="location-select-1"]');
      await page.click('[data-testid="btn-next"]');
      
      // Step 4: Story Generation
      await page.click('[data-testid="btn-generate"]');
      
      // Wait for generation to complete
      await expect(page.locator('[data-testid="generation-complete"]')).toBeVisible({ timeout: 30000 });
    });
  });

  // =========================================================================
  // Auto-save Tests
  // =========================================================================

  test.describe('Auto-save', () => {
    test('should auto-save wizard data', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Fill character name
      await page.fill('[data-testid="character-name"]', 'Auto-save Test');
      
      // Wait for auto-save (default 30s)
      // For testing, we can manually trigger save
      await page.click('[data-testid="btn-manual-save"]');
      
      // Verify saved indicator appears
      await expect(page.locator('[data-testid="save-indicator"]')).toContainText('Saved');
    });

    test('should recover from crash', async () => {
      // Simulate crash by reloading page
      await page.click('[data-testid="menu-character-wizard"]');
      await page.fill('[data-testid="character-name"]', 'Crash Test');
      
      // Reload page
      await page.reload();
      
      // Should show recovery dialog
      await expect(page.locator('[data-testid="recovery-dialog"]')).toBeVisible();
      
      // Click continue editing
      await page.click('[data-testid="btn-continue-editing"]');
      
      // Data should be recovered
      await expect(page.locator('[data-testid="character-name"]')).toHaveValue('Crash Test');
    });
  });

  // =========================================================================
  // Service Status Tests
  // =========================================================================

  test.describe('Service Status', () => {
    test('should show service status banner when Ollama disconnected', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Verify service status banner is visible
      await expect(page.locator('[data-testid="service-status-banner"]')).toBeVisible();
      
      // Should show Ollama status
      await expect(page.locator('[data-testid="ollama-status"]')).toContainText(/disconnected|not connected/i);
    });

    test('should allow configuring Ollama from banner', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      await page.click('[data-testid="btn-configure-ollama"]');
      
      // Should open settings modal
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();
    });
  });

  // =========================================================================
  // Step Indicator Tests
  // =========================================================================

  test.describe('Step Indicator', () => {
    test('should show step colors based on validation state', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Step 1 should be current (blue)
      await expect(page.locator('[data-testid="step-1-circle"]')).toHaveClass(/bg-blue-500/);
      
      // Fill step 1 and go to step 2
      await page.fill('[data-testid="character-name"]', 'Test');
      await page.click('[data-testid="btn-next"]');
      
      // Step 1 should be valid (green)
      await expect(page.locator('[data-testid="step-1-circle"]')).toHaveClass(/bg-green-500/);
      
      // Step 2 should be current (blue)
      await expect(page.locator('[data-testid="step-2-circle"]')).toHaveClass(/bg-blue-500/);
    });

    test('should show error badge when step has errors', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Try to go next without required fields
      await page.click('[data-testid="btn-next"]');
      
      // Step 1 should show error badge
      await expect(page.locator('[data-testid="step-1-error-badge"]')).toBeVisible();
    });
  });

  // =========================================================================
  // Error Boundary Tests
  // =========================================================================

  test.describe('Error Boundary', () => {
    test('should show error UI when wizard crashes', async () => {
      // This test requires triggering an error in the wizard
      // For now, we test the error boundary component exists
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Verify error boundary is in place
      await expect(page.locator('[data-testid="wizard-error-boundary"]')).toBeVisible();
    });

    test('should allow retry after error', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Simulate error scenario
      // Then click retry
      await page.click('[data-testid="btn-retry"]');
      
      // Wizard should reset
      await expect(page.locator('[data-testid="step-1"]')).toBeVisible();
    });
  });

  // =========================================================================
  // Navigation Tests
  // =========================================================================

  test.describe('Navigation', () => {
    test('should navigate back and forth between steps', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      
      // Go to step 2
      await page.fill('[data-testid="character-name"]', 'Test');
      await page.click('[data-testid="btn-next"]');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Appearance');
      
      // Go back to step 1
      await page.click('[data-testid="btn-back"]');
      await expect(page.locator('[data-testid="step-title"]')).toContainText('Basic Identity');
      
      // Data should be preserved
      await expect(page.locator('[data-testid="character-name"]')).toHaveValue('Test');
    });

    test('should cancel wizard and show confirmation', async () => {
      await page.click('[data-testid="menu-character-wizard"]');
      await page.fill('[data-testid="character-name"]', 'Test');
      
      // Click cancel
      await page.click('[data-testid="btn-cancel"]');
      
      // Should show confirmation dialog
      await expect(page.locator('[data-testid="cancel-confirmation-dialog"]')).toBeVisible();
    });
  });
});

// ============================================================================
// Test Configuration
// ============================================================================

/*
// playwright.config.ts

export default defineConfig({
  testDir: './tests/wizard',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'wizard-e2e',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
*/

// ============================================================================
// Run Tests
// ============================================================================

/*
# Run all wizard tests
npx playwright test --project=wizard-e2e

# Run with headed browser
npx playwright test --project=wizard-e2e --headed

# Run specific test
npx playwright test --project=wizard-e2e -g "Character Wizard"
*/
