/**
 * Property-Based Tests for UndoRedoStore Functionality
 * 
 * Task 2.4: Write property tests for undo/redo functionality
 * 
 * These tests verify:
 * - Property 19: Undo Operation Reversal
 * - Property 20: Redo Operation Reapplication
 * - Property 21: Undo Stack Invalidation
 * 
 * Validates: Requirements 9.2, 9.3, 9.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useUndoRedoStore, createOperation, type OperationType } from '../undoRedoStore';

describe('UndoRedoStore - Property-Based Tests', () => {
  beforeEach(() => {
    // Clear history before each test
    useUndoRedoStore.getState().clearHistory();
  });

  describe('Property 19: Undo Operation Reversal', () => {
    it('should reverse any operation when undone', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random operations
          fc.array(
            fc.record({
              type: fc.constantFrom<OperationType>(
                'transform',
                'crop',
                'layer_add',
                'layer_remove',
                'layer_reorder',
                'layer_modify',
                'annotation_add',
                'annotation_remove'
              ),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              panelId: fc.constantFrom(
                'panel-0-0', 'panel-0-1', 'panel-0-2',
                'panel-1-0', 'panel-1-1', 'panel-1-2',
                'panel-2-0', 'panel-2-1', 'panel-2-2'
              ),
              before: fc.anything(),
              after: fc.anything(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (operationData) => {
            // Reset before each property test iteration
            useUndoRedoStore.getState().clearHistory();
            
            // Create and push operations
            const operations = operationData.map((data) =>
              createOperation(
                data.type,
                data.description,
                data.panelId,
                data.before,
                data.after
              )
            );
            
            for (const operation of operations) {
              useUndoRedoStore.getState().pushOperation(operation);
            }
            
            // Undo all operations
            const undoneOperations = [];
            while (useUndoRedoStore.getState().canUndo()) {
              const undone = useUndoRedoStore.getState().undo();
              if (undone) {
                undoneOperations.push(undone);
              }
            }
            
            // Property: All operations should be undone in reverse order
            expect(undoneOperations).toHaveLength(operations.length);
            
            // Operations should be undone in LIFO order (last in, first out)
            for (let i = 0; i < operations.length; i++) {
              const expectedOp = operations[operations.length - 1 - i];
              const actualOp = undoneOperations[i];
              expect(actualOp.type).toBe(expectedOp.type);
              expect(actualOp.description).toBe(expectedOp.description);
              expect(actualOp.data.panelId).toBe(expectedOp.data.panelId);
            }
            
            // After undoing all, undo stack should be empty
            expect(useUndoRedoStore.getState().canUndo()).toBe(false);
            expect(useUndoRedoStore.getState().getUndoStack()).toHaveLength(0);
            
            // All operations should be in redo stack
            expect(useUndoRedoStore.getState().canRedo()).toBe(true);
            expect(useUndoRedoStore.getState().getRedoStack()).toHaveLength(operations.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain operation data integrity during undo', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            type: fc.constantFrom<OperationType>('transform', 'crop', 'layer_add'),
            description: fc.string({ minLength: 1, maxLength: 50 }),
            panelId: fc.constantFrom('panel-0-0', 'panel-1-1', 'panel-2-2'),
            before: fc.record({
              x: fc.integer({ min: -1000, max: 1000 }),
              y: fc.integer({ min: -1000, max: 1000 }),
            }),
            after: fc.record({
              x: fc.integer({ min: -1000, max: 1000 }),
              y: fc.integer({ min: -1000, max: 1000 }),
            }),
          }),
          async (operationData) => {
            // Reset before each property test iteration
            useUndoRedoStore.getState().clearHistory();
            
            const operation = createOperation(
              operationData.type,
              operationData.description,
              operationData.panelId,
              operationData.before,
              operationData.after
            );
            
            useUndoRedoStore.getState().pushOperation(operation);
            const undone = useUndoRedoStore.getState().undo();
            
            // Property: Undone operation should have identical data
            expect(undone).not.toBeNull();
            expect(undone?.type).toBe(operation.type);
            expect(undone?.description).toBe(operation.description);
            expect(undone?.data.panelId).toBe(operation.data.panelId);
            expect(undone?.data.before).toEqual(operation.data.before);
            expect(undone?.data.after).toEqual(operation.data.after);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Redo Operation Reapplication', () => {
    it('should reapply any undone operation when redone', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              type: fc.constantFrom<OperationType>(
                'transform',
                'crop',
                'layer_add',
                'layer_remove'
              ),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              panelId: fc.constantFrom(
                'panel-0-0', 'panel-0-1', 'panel-0-2',
                'panel-1-0', 'panel-1-1', 'panel-1-2',
                'panel-2-0', 'panel-2-1', 'panel-2-2'
              ),
              before: fc.anything(),
              after: fc.anything(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (operationData) => {
            // Reset before each property test iteration
            useUndoRedoStore.getState().clearHistory();
            
            // Create and push operations
            const operations = operationData.map((data) =>
              createOperation(
                data.type,
                data.description,
                data.panelId,
                data.before,
                data.after
              )
            );
            
            for (const operation of operations) {
              useUndoRedoStore.getState().pushOperation(operation);
            }
            
            // Undo all operations
            while (useUndoRedoStore.getState().canUndo()) {
              useUndoRedoStore.getState().undo();
            }
            
            // Redo all operations
            const redoneOperations = [];
            while (useUndoRedoStore.getState().canRedo()) {
              const redone = useUndoRedoStore.getState().redo();
              if (redone) {
                redoneOperations.push(redone);
              }
            }
            
            // Property: All operations should be redone in original order
            expect(redoneOperations).toHaveLength(operations.length);
            
            // Operations should be redone in FIFO order (first in, first out)
            for (let i = 0; i < operations.length; i++) {
              const expectedOp = operations[i];
              const actualOp = redoneOperations[i];
              expect(actualOp.type).toBe(expectedOp.type);
              expect(actualOp.description).toBe(expectedOp.description);
              expect(actualOp.data.panelId).toBe(expectedOp.data.panelId);
            }
            
            // After redoing all, redo stack should be empty
            expect(useUndoRedoStore.getState().canRedo()).toBe(false);
            expect(useUndoRedoStore.getState().getRedoStack()).toHaveLength(0);
            
            // All operations should be back in undo stack
            expect(useUndoRedoStore.getState().canUndo()).toBe(true);
            expect(useUndoRedoStore.getState().getUndoStack()).toHaveLength(operations.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain complete round-trip consistency (undo then redo)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              type: fc.constantFrom<OperationType>('transform', 'crop', 'layer_add'),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              panelId: fc.constantFrom('panel-0-0', 'panel-1-1', 'panel-2-2'),
              before: fc.anything(),
              after: fc.anything(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (operationData) => {
            // Reset before each property test iteration
            useUndoRedoStore.getState().clearHistory();
            
            // Create and push operations
            const operations = operationData.map((data) =>
              createOperation(
                data.type,
                data.description,
                data.panelId,
                data.before,
                data.after
              )
            );
            
            for (const operation of operations) {
              useUndoRedoStore.getState().pushOperation(operation);
            }
            
            // Capture initial state
            const initialUndoStack = useUndoRedoStore.getState().getUndoStack();
            const initialStackLength = initialUndoStack.length;
            
            // Undo all then redo all
            while (useUndoRedoStore.getState().canUndo()) {
              useUndoRedoStore.getState().undo();
            }
            while (useUndoRedoStore.getState().canRedo()) {
              useUndoRedoStore.getState().redo();
            }
            
            // Property: After undo-redo round trip, state should match initial state
            const finalUndoStack = useUndoRedoStore.getState().getUndoStack();
            expect(finalUndoStack).toHaveLength(initialStackLength);
            
            // Stack contents should match
            for (let i = 0; i < initialStackLength; i++) {
              expect(finalUndoStack[i].type).toBe(initialUndoStack[i].type);
              expect(finalUndoStack[i].description).toBe(initialUndoStack[i].description);
              expect(finalUndoStack[i].data.panelId).toBe(initialUndoStack[i].data.panelId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Undo Stack Invalidation', () => {
    it('should clear redo stack when new operation is pushed after undo', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial operations
          fc.array(
            fc.record({
              type: fc.constantFrom<OperationType>('transform', 'crop', 'layer_add'),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              panelId: fc.constantFrom('panel-0-0', 'panel-1-1', 'panel-2-2'),
              before: fc.anything(),
              after: fc.anything(),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          // Number of undos to perform
          fc.integer({ min: 1, max: 5 }),
          // New operation to push
          fc.record({
            type: fc.constantFrom<OperationType>('transform', 'crop', 'layer_add'),
            description: fc.string({ minLength: 1, maxLength: 50 }),
            panelId: fc.constantFrom('panel-0-0', 'panel-1-1', 'panel-2-2'),
            before: fc.anything(),
            after: fc.anything(),
          }),
          async (initialOps, undoCount, newOpData) => {
            // Reset before each property test iteration
            useUndoRedoStore.getState().clearHistory();
            
            // Push initial operations
            for (const data of initialOps) {
              const operation = createOperation(
                data.type,
                data.description,
                data.panelId,
                data.before,
                data.after
              );
              useUndoRedoStore.getState().pushOperation(operation);
            }
            
            // Undo some operations
            const actualUndoCount = Math.min(undoCount, initialOps.length);
            for (let i = 0; i < actualUndoCount; i++) {
              useUndoRedoStore.getState().undo();
            }
            
            // Verify redo stack has items
            expect(useUndoRedoStore.getState().canRedo()).toBe(true);
            const redoStackBefore = useUndoRedoStore.getState().getRedoStack();
            expect(redoStackBefore.length).toBeGreaterThan(0);
            
            // Push new operation
            const newOperation = createOperation(
              newOpData.type,
              newOpData.description,
              newOpData.panelId,
              newOpData.before,
              newOpData.after
            );
            useUndoRedoStore.getState().pushOperation(newOperation);
            
            // Property: Redo stack should be cleared
            expect(useUndoRedoStore.getState().canRedo()).toBe(false);
            expect(useUndoRedoStore.getState().getRedoStack()).toHaveLength(0);
            
            // Undo stack should have the remaining operations plus the new one
            const expectedUndoLength = initialOps.length - actualUndoCount + 1;
            expect(useUndoRedoStore.getState().getUndoStack()).toHaveLength(expectedUndoLength);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not allow redo after new operation is pushed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              type: fc.constantFrom<OperationType>('transform', 'crop'),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              panelId: fc.constantFrom('panel-0-0', 'panel-1-1'),
              before: fc.anything(),
              after: fc.anything(),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          async (operationData) => {
            // Reset before each property test iteration
            useUndoRedoStore.getState().clearHistory();
            
            // Push all but last operation
            for (let i = 0; i < operationData.length - 1; i++) {
              const data = operationData[i];
              const operation = createOperation(
                data.type,
                data.description,
                data.panelId,
                data.before,
                data.after
              );
              useUndoRedoStore.getState().pushOperation(operation);
            }
            
            // Undo one operation
            useUndoRedoStore.getState().undo();
            expect(useUndoRedoStore.getState().canRedo()).toBe(true);
            
            // Push new operation
            const lastData = operationData[operationData.length - 1];
            const newOperation = createOperation(
              lastData.type,
              lastData.description,
              lastData.panelId,
              lastData.before,
              lastData.after
            );
            useUndoRedoStore.getState().pushOperation(newOperation);
            
            // Property: Redo should not be possible
            expect(useUndoRedoStore.getState().canRedo()).toBe(false);
            
            // Attempting to redo should return null
            const redoResult = useUndoRedoStore.getState().redo();
            expect(redoResult).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain undo stack integrity after invalidation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              type: fc.constantFrom<OperationType>('transform', 'crop', 'layer_add'),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              panelId: fc.constantFrom('panel-0-0', 'panel-1-1', 'panel-2-2'),
              before: fc.anything(),
              after: fc.anything(),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          fc.integer({ min: 1, max: 3 }),
          async (operationData, undoCount) => {
            // Reset before each property test iteration
            useUndoRedoStore.getState().clearHistory();
            
            // Push operations
            const operations = operationData.map((data) =>
              createOperation(
                data.type,
                data.description,
                data.panelId,
                data.before,
                data.after
              )
            );
            
            for (const operation of operations) {
              useUndoRedoStore.getState().pushOperation(operation);
            }
            
            // Undo some operations
            const actualUndoCount = Math.min(undoCount, operations.length);
            for (let i = 0; i < actualUndoCount; i++) {
              useUndoRedoStore.getState().undo();
            }
            
            // Capture undo stack before new operation
            const undoStackBefore = useUndoRedoStore.getState().getUndoStack();
            const expectedLength = operations.length - actualUndoCount;
            expect(undoStackBefore).toHaveLength(expectedLength);
            
            // Push new operation
            const newOp = createOperation('transform', 'New op', 'panel-0-0', {}, {});
            useUndoRedoStore.getState().pushOperation(newOp);
            
            // Property: Undo stack should contain previous operations plus new one
            const undoStackAfter = useUndoRedoStore.getState().getUndoStack();
            expect(undoStackAfter).toHaveLength(expectedLength + 1);
            
            // Previous operations should still be in stack
            for (let i = 0; i < expectedLength; i++) {
              expect(undoStackAfter[i].type).toBe(undoStackBefore[i].type);
              expect(undoStackAfter[i].description).toBe(undoStackBefore[i].description);
            }
            
            // New operation should be at the end
            expect(undoStackAfter[expectedLength].description).toBe('New op');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Undo/Redo Edge Cases', () => {
    it('should handle rapid undo/redo sequences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              type: fc.constantFrom<OperationType>('transform', 'crop'),
              description: fc.string({ minLength: 1, maxLength: 50 }),
              panelId: fc.constantFrom('panel-0-0', 'panel-1-1'),
              before: fc.anything(),
              after: fc.anything(),
            }),
            { minLength: 5, maxLength: 10 }
          ),
          fc.array(fc.constantFrom('undo', 'redo'), { minLength: 10, maxLength: 30 }),
          async (operationData, actions) => {
            // Reset before each property test iteration
            useUndoRedoStore.getState().clearHistory();
            
            // Push operations
            for (const data of operationData) {
              const operation = createOperation(
                data.type,
                data.description,
                data.panelId,
                data.before,
                data.after
              );
              useUndoRedoStore.getState().pushOperation(operation);
            }
            
            // Perform rapid undo/redo sequence
            for (const action of actions) {
              if (action === 'undo' && useUndoRedoStore.getState().canUndo()) {
                useUndoRedoStore.getState().undo();
              } else if (action === 'redo' && useUndoRedoStore.getState().canRedo()) {
                useUndoRedoStore.getState().redo();
              }
            }
            
            // Property: Stack sizes should always be valid
            const undoStack = useUndoRedoStore.getState().getUndoStack();
            const redoStack = useUndoRedoStore.getState().getRedoStack();
            
            expect(undoStack.length).toBeGreaterThanOrEqual(0);
            expect(redoStack.length).toBeGreaterThanOrEqual(0);
            expect(undoStack.length + redoStack.length).toBeLessThanOrEqual(operationData.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
