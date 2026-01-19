/**
 * Property-Based Tests for GridStore Selection Behavior
 * 
 * Task 2.2: Write property test for GridStore selection behavior
 * 
 * These tests verify:
 * - Property 2: Panel Selection Exclusivity
 * - Property 3: Multi-Selection Accumulation
 * 
 * Validates: Requirements 2.1, 2.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useGridStore } from '../gridEditorStore';

describe('GridStore Selection - Property-Based Tests', () => {
  beforeEach(() => {
    // Reset store to default state
    useGridStore.getState().resetConfiguration('test-project');
  });

  describe('Property 2: Panel Selection Exclusivity', () => {
    it('should ensure single selection without Shift modifier always results in exactly one selected panel', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of panel selections without Shift
          fc.array(
            fc.record({
              panelId: fc.constantFrom(
                'panel-0-0', 'panel-0-1', 'panel-0-2',
                'panel-1-0', 'panel-1-1', 'panel-1-2',
                'panel-2-0', 'panel-2-1', 'panel-2-2'
              ),
              addToSelection: fc.constant(false), // Never use Shift
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (selections) => {
            // Reset before each property test iteration
            useGridStore.getState().resetConfiguration('test-project');
            
            // Apply all selections
            for (const { panelId, addToSelection } of selections) {
              useGridStore.getState().selectPanel(panelId, addToSelection);
            }
            
            // Property: After any sequence of single selections,
            // exactly one panel should be selected
            const selectedPanelIds = useGridStore.getState().selectedPanelIds;
            expect(selectedPanelIds).toHaveLength(1);
            
            // The selected panel should be the last one clicked
            const lastSelection = selections[selections.length - 1];
            expect(selectedPanelIds[0]).toBe(lastSelection.panelId);
          }
        ),
        { numRuns: 100 } // Run 100 iterations
      );
    });

    it('should ensure selecting a new panel without Shift deselects all previously selected panels', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate initial multi-selection
          fc.array(
            fc.constantFrom(
              'panel-0-0', 'panel-0-1', 'panel-0-2',
              'panel-1-0', 'panel-1-1', 'panel-1-2',
              'panel-2-0', 'panel-2-1', 'panel-2-2'
            ),
            { minLength: 1, maxLength: 5 }
          ),
          // Generate final single selection
          fc.constantFrom(
            'panel-0-0', 'panel-0-1', 'panel-0-2',
            'panel-1-0', 'panel-1-1', 'panel-1-2',
            'panel-2-0', 'panel-2-1', 'panel-2-2'
          ),
          async (initialSelections, finalSelection) => {
            // Reset before each property test iteration
            useGridStore.getState().resetConfiguration('test-project');
            
            // Build up multi-selection with Shift
            for (const panelId of initialSelections) {
              useGridStore.getState().selectPanel(panelId, true);
            }
            
            // Verify we have multiple selections
            const beforeCount = useGridStore.getState().selectedPanelIds.length;
            expect(beforeCount).toBeGreaterThanOrEqual(1);
            
            // Select new panel without Shift
            useGridStore.getState().selectPanel(finalSelection, false);
            
            // Property: After single selection, only one panel should be selected
            const selectedPanelIds = useGridStore.getState().selectedPanelIds;
            expect(selectedPanelIds).toHaveLength(1);
            expect(selectedPanelIds[0]).toBe(finalSelection);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Multi-Selection Accumulation', () => {
    it('should accumulate selections when using Shift modifier', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of unique panel selections with Shift
          fc.uniqueArray(
            fc.constantFrom(
              'panel-0-0', 'panel-0-1', 'panel-0-2',
              'panel-1-0', 'panel-1-1', 'panel-1-2',
              'panel-2-0', 'panel-2-1', 'panel-2-2'
            ),
            { minLength: 1, maxLength: 9 }
          ),
          async (panelIds) => {
            // Reset before each property test iteration
            useGridStore.getState().resetConfiguration('test-project');
            
            // Apply all selections with Shift
            for (const panelId of panelIds) {
              useGridStore.getState().selectPanel(panelId, true);
            }
            
            // Property: All selected panels should be in the selection set
            const selectedPanelIds = useGridStore.getState().selectedPanelIds;
            expect(selectedPanelIds).toHaveLength(panelIds.length);
            
            // All panels should be present
            for (const panelId of panelIds) {
              expect(selectedPanelIds).toContain(panelId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not add duplicate panels to selection', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence that may contain duplicates
          fc.array(
            fc.constantFrom(
              'panel-0-0', 'panel-0-1', 'panel-0-2',
              'panel-1-0', 'panel-1-1', 'panel-1-2',
              'panel-2-0', 'panel-2-1', 'panel-2-2'
            ),
            { minLength: 1, maxLength: 20 }
          ),
          async (panelIds) => {
            // Reset before each property test iteration
            useGridStore.getState().resetConfiguration('test-project');
            
            // Apply all selections with Shift
            for (const panelId of panelIds) {
              useGridStore.getState().selectPanel(panelId, true);
            }
            
            // Property: Selection should contain unique panels only
            const selectedPanelIds = useGridStore.getState().selectedPanelIds;
            const uniquePanelIds = [...new Set(panelIds)];
            
            expect(selectedPanelIds).toHaveLength(uniquePanelIds.length);
            
            // No duplicates in selection
            const selectionSet = new Set(selectedPanelIds);
            expect(selectionSet.size).toBe(selectedPanelIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve selection order when accumulating', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of unique panel selections
          fc.uniqueArray(
            fc.constantFrom(
              'panel-0-0', 'panel-0-1', 'panel-0-2',
              'panel-1-0', 'panel-1-1', 'panel-1-2',
              'panel-2-0', 'panel-2-1', 'panel-2-2'
            ),
            { minLength: 2, maxLength: 9 }
          ),
          async (panelIds) => {
            // Reset before each property test iteration
            useGridStore.getState().resetConfiguration('test-project');
            
            // Apply all selections with Shift
            for (const panelId of panelIds) {
              useGridStore.getState().selectPanel(panelId, true);
            }
            
            // Property: Selection order should match click order
            const selectedPanelIds = useGridStore.getState().selectedPanelIds;
            
            // Each panel should appear in the same order as clicked
            for (let i = 0; i < panelIds.length; i++) {
              expect(selectedPanelIds[i]).toBe(panelIds[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle mixed selection modes correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence with mixed selection modes
          fc.array(
            fc.record({
              panelId: fc.constantFrom(
                'panel-0-0', 'panel-0-1', 'panel-0-2',
                'panel-1-0', 'panel-1-1', 'panel-1-2',
                'panel-2-0', 'panel-2-1', 'panel-2-2'
              ),
              addToSelection: fc.boolean(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (selections) => {
            // Reset before each property test iteration
            useGridStore.getState().resetConfiguration('test-project');
            
            // Track expected selection based on logic
            let expectedSelection: string[] = [];
            
            for (const { panelId, addToSelection } of selections) {
              if (addToSelection) {
                // Add to selection if not already present
                if (!expectedSelection.includes(panelId)) {
                  expectedSelection.push(panelId);
                }
              } else {
                // Replace selection
                expectedSelection = [panelId];
              }
              
              useGridStore.getState().selectPanel(panelId, addToSelection);
            }
            
            // Property: Actual selection should match expected selection
            const selectedPanelIds = useGridStore.getState().selectedPanelIds;
            expect(selectedPanelIds).toEqual(expectedSelection);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Selection Edge Cases', () => {
    it('should handle selecting the same panel repeatedly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'panel-0-0', 'panel-0-1', 'panel-0-2',
            'panel-1-0', 'panel-1-1', 'panel-1-2',
            'panel-2-0', 'panel-2-1', 'panel-2-2'
          ),
          fc.integer({ min: 1, max: 10 }),
          async (panelId, repeatCount) => {
            // Reset before each property test iteration
            useGridStore.getState().resetConfiguration('test-project');
            
            // Select the same panel multiple times without Shift
            for (let i = 0; i < repeatCount; i++) {
              useGridStore.getState().selectPanel(panelId, false);
            }
            
            // Property: Should still have exactly one panel selected
            const selectedPanelIds = useGridStore.getState().selectedPanelIds;
            expect(selectedPanelIds).toHaveLength(1);
            expect(selectedPanelIds[0]).toBe(panelId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle deselect after any selection sequence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              panelId: fc.constantFrom(
                'panel-0-0', 'panel-0-1', 'panel-0-2',
                'panel-1-0', 'panel-1-1', 'panel-1-2',
                'panel-2-0', 'panel-2-1', 'panel-2-2'
              ),
              addToSelection: fc.boolean(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (selections) => {
            // Reset before each property test iteration
            useGridStore.getState().resetConfiguration('test-project');
            
            // Apply all selections
            for (const { panelId, addToSelection } of selections) {
              useGridStore.getState().selectPanel(panelId, addToSelection);
            }
            
            // Deselect all
            useGridStore.getState().deselectAll();
            
            // Property: After deselect, no panels should be selected
            const selectedPanelIds = useGridStore.getState().selectedPanelIds;
            expect(selectedPanelIds).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
