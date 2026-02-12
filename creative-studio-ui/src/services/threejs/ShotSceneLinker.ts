/**
 * Shot-Scene Linker Service
 * 
 * Provides utilities to synchronize Three.js camera states with Shot metadata.
 * Enables automatic camera positioning based on shot types (Wide, Close-up, etc.)
 * and capturing current 3D views into shot configurations.
 */

import { ProductionShot, ShotType, CameraMovement } from '@/types/shot';
import { CameraConfig, CameraKeyframe, EasingType } from './ThreeJsTypes';

export class ShotSceneLinker {
    /**
     * Maps a ShotType to a recommended camera distance and FOV.
     * Assumes the target subject is at the origin (0,0,0).
     */
    static getRecommendedCameraConfig(shotType: ShotType): Partial<CameraConfig> {
        switch (shotType) {
            case 'extreme-wide':
                return { position: [0, 5, 20], lookAt: [0, 0, 0], fov: 40 };
            case 'wide':
                return { position: [0, 2, 12], lookAt: [0, 1, 0], fov: 45 };
            case 'medium':
                return { position: [0, 1.5, 5], lookAt: [0, 1.2, 0], fov: 50 };
            case 'close-up':
                return { position: [0, 1.6, 2], lookAt: [0, 1.6, 0], fov: 55 };
            case 'extreme-close-up':
                return { position: [0, 1.6, 0.8], lookAt: [0, 1.6, 0], fov: 60 };
            case 'over-the-shoulder':
                return { position: [0.5, 1.7, 1.5], lookAt: [-0.5, 1.5, -1], fov: 45 };
            case 'pov':
                return { position: [0, 1.7, 0.1], lookAt: [0, 1.7, -5], fov: 90 };
            default:
                return { position: [0, 2, 8], lookAt: [0, 1, 0], fov: 50 };
        }
    }

    /**
     * Captures the current Three.js camera state into a Shot camera configuration.
     */
    static captureToShot(
        cameraPosition: [number, number, number],
        cameraTarget: [number, number, number],
        fov: number
    ): Partial<ProductionShot['camera']> {
        return {
            framing: this.inferFraming(cameraPosition, cameraTarget),
            angle: this.inferAngle(cameraPosition, cameraTarget),
            movement: {
                type: 'static',
            }
        };
    }

    /**
     * Infers the framing type based on distance to target.
     */
    private static inferFraming(pos: [number, number, number], target: [number, number, number]): unknown {
        const distance = Math.sqrt(
            Math.pow(pos[0] - target[0], 2) +
            Math.pow(pos[1] - target[1], 2) +
            Math.pow(pos[2] - target[2], 2)
        );

        if (distance < 1) return 'extreme-close-up';
        if (distance < 2.5) return 'close-up';
        if (distance < 6) return 'medium';
        if (distance < 15) return 'wide';
        return 'extreme-wide';
    }

    /**
     * Infers the camera angle based on relative height to target.
     */
    private static inferAngle(pos: [number, number, number], target: [number, number, number]): unknown {
        const heightDiff = pos[1] - target[1];

        if (heightDiff > 2) return 'high';
        if (heightDiff < -0.5) return 'low';

        // Check for Dutch angle (requires roll, but simple pos/target doesn't provide it)
        // For now, assume eye-level if close to target height
        return 'eye-level';
    }

    /**
     * Creates Three.js camera keyframes from a CameraMovement definition.
     */
    static movementToKeyframes(
        movement: CameraMovement,
        startPos: [number, number, number],
        target: [number, number, number],
        duration: number
    ): CameraKeyframe[] {
        const keyframes: CameraKeyframe[] = [
            { time: 0, position: startPos, target: target, easing: 'easeInOut' as EasingType }
        ];

        if (movement.type === 'static') return keyframes;

        const endPos: [number, number, number] = [...startPos];
        const speedMultiplier = movement.speed === 'fast' ? 2 : movement.speed === 'slow' ? 0.5 : 1;
        const distance = 2 * speedMultiplier;

        switch (movement.type) {
            case 'pan':
                if (movement.direction === 'left') endPos[0] -= distance;
                else endPos[0] += distance;
                break;
            case 'dolly':
                if (movement.direction === 'in') endPos[2] -= distance;
                else endPos[2] += distance;
                break;
            // ... other movement types
        }

        keyframes.push({
            time: duration,
            position: endPos,
            target: target,
            easing: (movement.easing?.replace('-', '') as EasingType) || 'easeInOut'
        });

        return keyframes;
    }
}

