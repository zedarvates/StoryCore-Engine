/**
 * Neural Puppet Service
 * 
 * Provides advanced 3D rigging and bone-level animation data for cinematic puppetry.
 * Automatically maps directorial shot presets to precise skeletal configurations.
 * 
 * Task: 21.3 - Phase 1: Advanced 3D Rig Integration
 */

import type { Cinematography } from '@/types';

export interface JointPose {
  id: string;
  rotation: { x: number; y: number; z: number }; // In radians
  position?: { x: number; y: number; z: number };
}

export interface PuppetRig {
  id: string;
  poseName: string;
  intensity: number; // 0-100
  joints: JointPose[];
  facialExpression?: {
    happy: number;
    sad: number;
    angry: number;
    surprise: number;
    neutral: number;
  };
}

/**
 * Common cinematic rig presets
 */
const RIG_PRESETS: Record<string, JointPose[]> = {
  'neutral': [
    { id: 'hips', rotation: { x: 0, y: 0, z: 0 } },
    { id: 'spine', rotation: { x: 0, y: 0, z: 0 } },
  ],
  'leaning_forward': [
    { id: 'spine1', rotation: { x: 0.2, y: 0, z: 0 } },
    { id: 'spine2', rotation: { x: 0.3, y: 0, z: 0 } },
    { id: 'neck', rotation: { x: -0.1, y: 0, z: 0 } },
  ],
  'attention': [
    { id: 'head', rotation: { x: -0.2, y: 0, z: 0 } },
    { id: 'spine', rotation: { x: -0.1, y: 0, z: 0 } },
    { id: 'shoulders', rotation: { x: 0.1, y: 0, z: 0 } },
  ],
  'walking_cycle': [
     // Simplified walk cycle pose
     { id: 'leftUpLeg', rotation: { x: 0.3, y: 0, z: 0 } },
     { id: 'rightUpLeg', rotation: { x: -0.3, y: 0, z: 0 } },
     { id: 'leftArm', rotation: { x: -0.2, y: 0, z: 0 } },
     { id: 'rightArm', rotation: { x: 0.2, y: 0, z: 0 } },
  ],
  'dynamic_pose_v': [
     { id: 'hips', rotation: { x: 0.1, y: 0.4, z: 0.1 } },
     { id: 'spine2', rotation: { x: 0.2, y: -0.2, z: 0 } },
     { id: 'leftArm', rotation: { x: 0.8, y: 0.5, z: 0 } },
     { id: 'rightArm', rotation: { x: -0.3, y: -0.2, z: 0 } },
  ]
};

export class NeuralPuppetService {
  /**
   * Generates a bone-level rig configuration based on cinematic directorial presets
   */
  public getRigForCinematography(cinematography: Cinematography): PuppetRig {
    const { framing = 'MS' } = cinematography;
    
    let poseName = 'neutral';
    let intensity = 50;
    let joints: JointPose[] = [...RIG_PRESETS.neutral];

    // Framing-based pose refinement
    switch (framing) {
      case 'ECU':
      case 'CU':
        // Close-ups focus on head and neck alignment
        poseName = 'attention';
        joints = [...RIG_PRESETS.attention];
        intensity = 80;
        break;
      case 'MCU':
      case 'MS':
        // Medium shots focus on upper body posture
        poseName = 'leaning_forward';
        joints = [...RIG_PRESETS.leaning_forward];
        intensity = 60;
        break;
      case 'LS':
      case 'ELS':
        // Long shots focus on full body silhouette
        poseName = 'walking_cycle';
        joints = [...RIG_PRESETS.walking_cycle];
        intensity = 40;
        break;
      default:
        poseName = 'neutral';
    }

    // Camera angle refinements (e.g. looking up/down)
    if (cinematography.cameraAngle === 'High') {
      joints.push({ id: 'head', rotation: { x: -0.4, y: 0, z: 0 } });
    } else if (cinematography.cameraAngle === 'Low') {
      joints.push({ id: 'head', rotation: { x: 0.4, y: 0, z: 0 } });
    }

    return {
      id: `rig-${Date.now()}`,
      poseName,
      intensity,
      joints,
      facialExpression: this.getExpressionForMood(cinematography.lighting || 'Cinematic')
    };
  }

  /**
   * Maps lighting or mood to facial expressions
   */
  private getExpressionForMood(mood: string): PuppetRig['facialExpression'] {
    switch (mood) {
      case 'Dramatic':
      case 'Low Key':
        return { happy: 0, sad: 40, angry: 60, surprise: 20, neutral: 10 };
      case 'High Key':
      case 'Natural':
        return { happy: 70, sad: 0, angry: 0, surprise: 20, neutral: 30 };
      default:
        return { happy: 20, sad: 10, angry: 10, surprise: 10, neutral: 70 };
    }
  }

  /**
   * Interpolates between two rigs for smooth transitions
   */
  public interpolateRigs(rigA: PuppetRig, rigB: PuppetRig, t: number): JointPose[] {
    const result: JointPose[] = [];
    // Basic linear interpolation of rotations (could be expanded to Slerp)
    rigB.joints.forEach(poseB => {
      const poseA = rigA.joints.find(j => j.id === poseB.id) || { rotation: { x: 0, y: 0, z: 0 } };
      result.push({
        id: poseB.id,
        rotation: {
          x: poseA.rotation.x + (poseB.rotation.x - poseA.rotation.x) * t,
          y: poseA.rotation.y + (poseB.rotation.y - poseA.rotation.y) * t,
          z: poseA.rotation.z + (poseB.rotation.z - poseA.rotation.z) * t,
        }
      });
    });
    return result;
  }
}

export const neuralPuppetService = new NeuralPuppetService();
