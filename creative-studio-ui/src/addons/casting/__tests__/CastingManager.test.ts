import { describe, it, expect, beforeEach } from 'vitest';
import { CastingManager } from '../CastingManager';
import type { Avatar } from '../types';

describe('CastingManager', () => {
  let manager: CastingManager;

  beforeEach(() => {
    manager = new CastingManager();
  });

  describe('Assignment Creation and Retrieval', () => {
    it('should assign actor to character', () => {
      const characterId = 'char1';
      const avatarId = 'avatar1';

      manager.assignActor(characterId, avatarId);

      const assignments = manager.getAssignments();
      expect(assignments).toHaveLength(1);
      expect(assignments[0]).toMatchObject({
        characterId,
        avatarId,
        assignedAt: expect.any(String),
      });
    });

    it('should retrieve assigned actor for character', () => {
      const characterId = 'char1';
      const avatarId = 'avatar1';
      const avatar: Avatar = {
        id: avatarId,
        name: 'Test Avatar',
        path: 'assets/avatar1.png',
        dimensions: { width: 512, height: 512 },
        createdDate: new Date().toISOString(),
        tags: [],
        format: 'png',
        size: 1024,
      };

      manager.addAvatar(avatar);
      manager.assignActor(characterId, avatarId);

      const retrievedAvatar = manager.getActorForCharacter(characterId);
      expect(retrievedAvatar).toEqual(avatar);
    });

    it('should return null for unassigned character', () => {
      const retrievedAvatar = manager.getActorForCharacter('nonexistent');
      expect(retrievedAvatar).toBeNull();
    });

    it('should replace existing assignment when assigning new actor', () => {
      const characterId = 'char1';
      const oldAvatarId = 'avatar1';
      const newAvatarId = 'avatar2';

      manager.assignActor(characterId, oldAvatarId);
      manager.assignActor(characterId, newAvatarId);

      const assignments = manager.getAssignments();
      expect(assignments).toHaveLength(1);
      expect(assignments[0].avatarId).toBe(newAvatarId);
    });

    it('should unassign actor from character', () => {
      const characterId = 'char1';
      const avatarId = 'avatar1';

      manager.assignActor(characterId, avatarId);
      expect(manager.getAssignments()).toHaveLength(1);

      manager.unassignActor(characterId);
      expect(manager.getAssignments()).toHaveLength(0);
      expect(manager.getActorForCharacter(characterId)).toBeNull();
    });

    it('should maintain multiple assignments for different characters', () => {
      const assignments: Array<{ characterId: string; avatarId: string }> = [
        { characterId: 'char1', avatarId: 'avatar1' },
        { characterId: 'char2', avatarId: 'avatar2' },
        { characterId: 'char3', avatarId: 'avatar1' }, // Same avatar for different character
      ];

      assignments.forEach(({ characterId, avatarId }) => {
        manager.assignActor(characterId, avatarId);
      });

      expect(manager.getAssignments()).toHaveLength(3);

      assignments.forEach(({ characterId, avatarId }) => {
        const assignment = manager.getAssignments().find(a => a.characterId === characterId);
        expect(assignment?.avatarId).toBe(avatarId);
      });
    });
  });

  describe('Serialization', () => {
    it('should serialize and deserialize state correctly', () => {
      const characterId = 'char1';
      const avatarId = 'avatar1';

      manager.assignActor(characterId, avatarId);
      const originalAssignments = manager.getAssignments();

      const serialized = manager.serialize();
      const newManager = new CastingManager();
      newManager.deserialize(serialized);

      const deserializedAssignments = newManager.getAssignments();
      expect(deserializedAssignments).toHaveLength(originalAssignments.length);
      expect(deserializedAssignments[0]).toMatchObject({
        characterId,
        avatarId,
        assignedAt: expect.any(String),
      });
    });
  });

  describe('Analytics', () => {
    it('should calculate analytics correctly', () => {
      // Add some test data
      const avatar1: Avatar = {
        id: 'avatar1',
        name: 'Avatar 1',
        path: 'assets/avatar1.png',
        dimensions: { width: 512, height: 512 },
        createdDate: new Date().toISOString(),
        tags: [],
        format: 'png',
        size: 1024,
      };

      manager.addAvatar(avatar1);
      manager.assignActor('char1', 'avatar1');
      manager.assignActor('char2', 'avatar1'); // Same avatar for multiple characters

      const analytics = manager.getAnalytics();

      expect(analytics.uniqueActorCount).toBe(1);
      expect(analytics.avatarUsageCounts['avatar1']).toBe(2);
    });
  });

  // Placeholder for property tests (to be implemented with fast-check)
  describe('Property Tests', () => {
    it('should handle any number of assignments', () => {
      // Basic property test placeholder
      for (let i = 0; i < 10; i++) {
        manager.assignActor(`char${i}`, `avatar${i % 3}`); // Reuse some avatars
      }

      const assignments = manager.getAssignments();
      expect(assignments).toHaveLength(10);

      // Each character should have exactly one assignment
      const characterIds = assignments.map(a => a.characterId);
      expect(new Set(characterIds)).toHaveLength(10);
    });
  });
});
