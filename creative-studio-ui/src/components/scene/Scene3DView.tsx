/**
 * Scene3DView Component
 * 
 * Main 3D canvas with Three.js integration for rendering scene locations.
 * Displays cube meshes with texture mapping and orbit controls.
 * Supports camera presets and lighting presets.
 * 
 * File: creative-studio-ui/src/components/scene/Scene3DView.tsx
 */

import React, { useRef, useEffect, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import type { Location, SceneLocation, Transform3D } from '@/types/location';
import { LightingPresets, LIGHTING_PRESETS } from './LightingPresets';
import './Scene3DView.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the Scene3DView component
 */
export interface Scene3DViewProps {
  /** Available locations */
  locations: Location[];
  
  /** Scene locations placed in the scene */
  sceneLocations: SceneLocation[];
  
  /** Currently selected scene location */
  selectedInstanceId: string | null;
  
  /** Handler for scene location selection */
  onSelectSceneLocation: (instanceId: string | null) => void;
  
  /** Handler for transform changes */
  onTransformChange: (instanceId: string, transform: Partial<Transform3D>) => void;
  
  /** View mode */
  viewMode?: 'perspective' | 'top' | 'front' | 'side';
}

// ============================================================================
// Components
// ============================================================================

/**
 * Location Cube Component
 */
interface LocationCubeProps {
  location: Location;
  transform: Transform3D;
  isSelected: boolean;
  onSelect: () => void;
}

function LocationCube({ location, transform, isSelected, onSelect }: LocationCubeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Load textures for cube faces
  const textures = useRef<Record<string, THREE.Texture>>({});
  
  useEffect(() => {
    // Load textures for each face
    Object.entries(location.cube_textures).forEach(([face, faceTexture]) => {
      if (faceTexture?.image_path) {
        const loader = new THREE.TextureLoader();
        loader.load(faceTexture.image_path, (texture) => {
          textures.current[face] = texture;
        });
      }
    });
  }, [location.cube_textures]);
  
  const material = useRef<THREE.MeshStandardMaterial>(null);
  
  return (
    <mesh
      ref={meshRef}
      position={[transform.position.x, transform.position.y, transform.position.z]}
      rotation={[
        THREE.MathUtils.degToRad(transform.rotation.x),
        THREE.MathUtils.degToRad(transform.rotation.y),
        THREE.MathUtils.degToRad(transform.rotation.z),
      ]}
      scale={[transform.scale.x, transform.scale.y, transform.scale.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        ref={material}
        color={isSelected ? '#6366f1' : '#ffffff'}
        wireframe={false}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

/**
 * Procedural Item Type
 */
export interface ProceduralItem {
  id: string;
  type: 'house' | 'tree';
  position: [number, number, number];
  params?: Record<string, unknown>;
}

/**
 * Scene Content Component
 */
interface SceneContentProps {
  locations: Location[];
  sceneLocations: SceneLocation[];
  selectedInstanceId: string | null;
  onSelectSceneLocation: (instanceId: string | null) => void;
  lightingPreset?: string;
  proceduralItems?: ProceduralItem[];
}

import { ProceduralHouse } from './procedural/ProceduralHouse';
import { ProceduralTree } from './procedural/ProceduralTree';

function SceneContent({
  locations,
  sceneLocations,
  selectedInstanceId,
  onSelectSceneLocation,
  lightingPreset,
  proceduralItems = [],
}: SceneContentProps) {
  // Get lighting configuration from preset
  const preset = LIGHTING_PRESETS.find(p => p.id === lightingPreset);
  const ambientIntensity = preset?.lights.ambient.intensity || 0.5;
  const ambientColor = preset?.lights.ambient.color || '#ffffff';
  const directionalIntensity = preset?.lights.directional?.intensity || 1;
  const directionalColor = preset?.lights.directional?.color || '#ffffff';
  const directionalPosition = preset?.lights.directional?.position || [10, 10, 5];
  const pointIntensity = preset?.lights.point?.intensity || 0;
  const pointColor = preset?.lights.point?.color || '#ffffff';
  const pointPosition = preset?.lights.point?.position || [0, 0, 0];
  const skyColor = preset?.skyColor || '#1a1a1a';
  
  return (
    <>
      {/* Sky color from preset */}
      <color attach="background" args={[skyColor]} />
      
      {/* Ambient Light */}
      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      
      {/* Directional Light */}
      <directionalLight 
        position={directionalPosition as [number, number, number]} 
        intensity={directionalIntensity} 
        color={directionalColor} 
        castShadow
      />
      
      {/* Point Light (if specified) */}
      {pointIntensity > 0 && (
        <pointLight 
          position={pointPosition as [number, number, number]} 
          intensity={pointIntensity} 
          color={pointColor} 
        />
      )}
      
      {/* Grid */}
      <gridHelper args={[40, 40, '#444', '#333']} />
      
      {/* Procedural Items */}
      {proceduralItems.map((item) => (
        <React.Fragment key={item.id}>
          {item.type === 'house' && <ProceduralHouse position={item.position} {...item.params} />}
          {item.type === 'tree' && <ProceduralTree position={item.position} {...item.params} />}
        </React.Fragment>
      ))}

      {/* Location Cubes */}
      {sceneLocations.map((sceneLoc) => {
        const location = locations.find((l) => l.location_id === sceneLoc.location_id);
        if (!location) return null;
        
        return (
          <LocationCube
            key={sceneLoc.instance_id}
            location={location}
            transform={sceneLoc.transform}
            isSelected={selectedInstanceId === sceneLoc.instance_id}
            onSelect={() => onSelectSceneLocation(sceneLoc.instance_id)}
          />
        );
      })}
      
      {/* Orbit Controls */}
      <OrbitControls makeDefault />
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Scene3DView({
  locations,
  sceneLocations,
  selectedInstanceId,
  onSelectSceneLocation,
  // Next two kept in props for parent compatibility:
  // onTransformChange,
  // viewMode = 'perspective',
}: Scene3DViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State for lighting presets
  const [activeLightingPreset, setActiveLightingPreset] = useState<string>('bright-daylight');
  
  // State for Procedural R&D
  const [proceduralItems, setProceduralItems] = useState<ProceduralItem[]>([]);

  const addProceduralHouse = () => {
    const x = Math.floor(Math.random() * 20) - 10;
    const z = Math.floor(Math.random() * 20) - 10;
    const isManoir = Math.random() > 0.8;
    setProceduralItems(prev => [
      ...prev,
      {
        id: `house-${Date.now()}`,
        type: 'house',
        position: [x, 0, z],
        params: isManoir 
          ? { floors: 2, wallColor: '#d3d3d3', roofColor: '#333333', roofType: '45deg', width: 12, depth: 10 } 
          : { floors: 1, wallColor: '#f5f5dc', roofColor: '#8b0000', roofType: '45deg' }
      }
    ]);
  };

  const addProceduralTree = () => {
    const x = Math.floor(Math.random() * 30) - 15;
    const z = Math.floor(Math.random() * 30) - 15;
    const height = 4 + Math.random() * 6;
    setProceduralItems(prev => [
      ...prev,
      {
        id: `tree-${Date.now()}`,
        type: 'tree',
        position: [x, 0, z],
        params: { height }
      }
    ]);
  };
  
  return (
    <div className="scene-3d-view">
      <Canvas
        ref={canvasRef}
        camera={{ position: [15, 10, 15], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: LIGHTING_PRESETS.find(p => p.id === activeLightingPreset)?.skyColor || '#1a1a1a' }}
        shadows
      >
        <SceneContent
          locations={locations}
          sceneLocations={sceneLocations}
          selectedInstanceId={selectedInstanceId}
          onSelectSceneLocation={onSelectSceneLocation}
          lightingPreset={activeLightingPreset}
          proceduralItems={proceduralItems}
        />
      </Canvas>
      
      {/* Top Controls Bar */}
      <div className="scene-3d-view__controls-top">
        {/* Lighting Presets */}
        <LightingPresets
          currentPreset={activeLightingPreset}
          onPresetSelect={(preset) => setActiveLightingPreset(preset.id)}
        />
        
        {/* Procedural R&D Tools */}
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', padding: '0 8px' }}>
          <button 
            onClick={addProceduralHouse}
            style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            + Maison (Générée)
          </button>
          <button 
            onClick={addProceduralTree}
            style={{ padding: '6px 12px', background: '#22c55e', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            + Sapin (Généré)
          </button>
        </div>
      </div>
      
      {/* Info */}
      <div className="scene-3d-view__info">
        <span>{sceneLocations.length} location(s) in scene</span>
        <span>|</span>
        <span>{locations.length} available</span>
        <span>|</span>
        <span className="scene-3d-view__lighting-label">
          {LIGHTING_PRESETS.find(p => p.id === activeLightingPreset)?.name || 'Custom'}
        </span>
        <span>|</span>
        <span style={{ color: '#a855f7' }}>{proceduralItems.length} Procedural Objects (R&D)</span>
      </div>
    </div>
  );
}

export default Scene3DView;
