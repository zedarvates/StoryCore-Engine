import React, { useEffect, useState } from 'react';
import { ThreeJsViewer } from '../../threejs/ThreeJsViewer';
import { ShotSceneLinker } from '../../../services/threejs/ShotSceneLinker';
import { ProductionShot } from '@/types/shot';
import { ModelConfig } from '../../../services/threejs/ThreeJsTypes';

interface ShotPreview3DProps {
    shot: ProductionShot;
    width?: number;
    height?: number;
    onCameraCaptured?: (config: {
        position: [number, number, number];
        target: [number, number, number];
        fov: number;
        referenceImage?: string;
    }) => void;
}

/**
 * ShotPreview3D Component
 * 
 * Integrates the Three.js viewer with the Shot system.
 * Automatically positions the camera based on shot framing and angle.
 */
export const ShotPreview3D: React.FC<ShotPreview3DProps> = ({
    shot,
    width = 800,
    height = 450,
    onCameraCaptured
}) => {
    const [models, setModels] = useState<ModelConfig[]>([]);

    // Map shot composition to 3D models
    useEffect(() => {
        const characterModels: ModelConfig[] = shot.composition.characterIds.map((id, index) => ({
            modelPath: `/assets/models/characters/${id}.glb`, // Assuming convention
            format: 'glb',
            castShadows: true,
            receiveShadows: true,
            scale: 1,
            position: [index * 2 - 1, 0, 0], // Basic spacing
            rotation: [0, 0, 0]
        }));

        setModels(characterModels);
    }, [shot.composition.characterIds]);

    // Determine initial camera config from shot metadata using the linker
    const initialCameraConfig = ShotSceneLinker.getRecommendedCameraConfig(shot.type);

    return (
        <div className="shot-preview-3d relative w-full h-full rounded-lg overflow-hidden border border-white/10 bg-black">
            <ThreeJsViewer
                sceneConfig={{
                    width,
                    height,
                    backgroundColor: '#0a0a0c',
                    antialias: true,
                    shadows: true,
                    pixelRatio: window.devicePixelRatio
                }}
                cameraConfig={{
                    ...initialCameraConfig,
                    near: 0.1,
                    far: 1000,
                    enableControls: true
                }}
                models={models}
                onCameraCapture={onCameraCaptured}
                continuous={true}
                className="w-full h-full"
            />

            {/* HUD Info */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-md px-3 py-2 rounded border border-white/5 text-[10px] text-white/60">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                        <span className="font-bold text-white uppercase tracking-wider">3D Preview Mode</span>
                    </div>
                    <div>Shot #{shot.number} • {shot.type.toUpperCase()}</div>
                    <div>Angle: {shot.camera.angle}</div>
                </div>
            </div>
        </div>
    );
};
