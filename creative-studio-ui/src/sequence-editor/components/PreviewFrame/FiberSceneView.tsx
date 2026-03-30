import React, { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface PuppetInstance {
  id: string;
  path: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  pose?: string;
}

interface FiberSceneViewProps {
  puppets?: PuppetInstance[];
  skyboxPath?: string;
  width: number;
  height: number;
  lighting?: 'bright' | 'dim' | 'dramatic' | 'natural';
  cameraProps?: { position: { x: number; y: number; z: number }; fov: number };
  activeDialogue?: { metadata?: { speaker?: string }; startTime?: number; duration?: number } | null;
}

const setLdrEnv = (scene: THREE.Scene, texture: THREE.Texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  scene.background = texture;
  scene.environment = texture;
};

const clearLdrEnv = (scene: THREE.Scene) => {
  scene.background = null;
  scene.environment = null;
};

const LdrEnvironment = ({ url }: { url: string }) => {
  const texture = useTexture(url);
  const { scene } = useThree();

  useEffect(() => {
    setLdrEnv(scene, texture);

    return () => {
      clearLdrEnv(scene);
    };
  }, [texture, scene]);

  return null;
};

const SkyboxEnvironment = ({ path }: { path: string }) => {
  const fileUrl = `sc-file:///${path.replace(/\\/g, '/')}`;
  const lowerUrl = fileUrl.toLowerCase();
  
  if (lowerUrl.endsWith('.png') || lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg')) {
    return <LdrEnvironment url={fileUrl} />;
  }
  
  return <Environment background files={fileUrl} />;
};

const PuppetModelItems = ({ url, position, rotation, isTalking }: { url: string; position: [number, number, number]; rotation: [number, number, number]; isTalking?: boolean }) => {
  const gltfUrl = `sc-file:///${url.replace(/\\/g, '/')}`;
  const { scene } = useGLTF(gltfUrl);
  
  // Clone the scene for multiple instances
  const clonedScene = React.useMemo(() => scene.clone(), [scene]);
  const groupRef = React.useRef<THREE.Group>(null);
  
  // Real-time procedural lip-sync oscillation
  const [wiggle, setWiggle] = React.useState(0);
  
  React.useEffect(() => {
    if (!isTalking) {
      setWiggle(0);
      return;
    }
    
    let frameId: number;
    const animate = () => {
      setWiggle(Math.sin(Date.now() * 0.02) * 0.1);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isTalking]);

  useEffect(() => {
     if (groupRef.current && isTalking) {
       // Simple jaw-like movement simulation on the whole mesh if no bones found
       groupRef.current.position.y = position[1] + (wiggle * 0.05);
     } else if (groupRef.current) {
       groupRef.current.position.y = position[1];
     }
  }, [wiggle, isTalking, position]);
  
  return <primitive ref={groupRef} object={clonedScene} scale={[1, 1, 1]} position={position} rotation={rotation} />;
};

export const FiberSceneView: React.FC<FiberSceneViewProps> = ({ puppets = [], skyboxPath, width: _width, height: _height, lighting, cameraProps, activeDialogue }) => {
  const getLightProps = (lightingType?: string) => {
    switch (lightingType) {
      case 'dim':
        return { ambient: 0.1, dir: 0.3 };
      case 'dramatic':
        return { ambient: 0.2, dir: 1.5 };
      case 'natural':
        return { ambient: 0.6, dir: 0.8 };
      case 'bright':
      default:
        return { ambient: 0.8, dir: 1.0 };
    }
  };
  
  const lightProps = getLightProps(lighting);
  const camPos = cameraProps 
    ? [cameraProps.position.x, cameraProps.position.y, cameraProps.position.z] as [number, number, number] 
    : [0, 1.5, 5] as [number, number, number];

  return (
    <div className="fiber-scene-view">
      <Canvas 
        id="fiber-scene-canvas" 
        camera={{ position: camPos, fov: cameraProps?.fov || 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={lightProps.ambient} />
        <directionalLight position={[10, 10, 5]} intensity={lightProps.dir} castShadow />
        
        <Suspense fallback={null}>
          {puppets.map((puppet) => (
            <PuppetModelItems 
              key={puppet.id} 
              url={puppet.path} 
              position={[puppet.position.x, puppet.position.y, puppet.position.z]}
              rotation={[puppet.rotation.x, puppet.rotation.y, puppet.rotation.z]}
              isTalking={!!activeDialogue}
            />
          ))}
        </Suspense>

        <Suspense fallback={null}>
          {skyboxPath ? (
            <SkyboxEnvironment path={skyboxPath} />
          ) : null}
        </Suspense>

        <OrbitControls makeDefault target={[0, 1, 0]} />
        <gridHelper args={[20, 20, '#444444', '#222222']} position={[0, 0, 0]} />
      </Canvas>
    </div>
  );
};

export default FiberSceneView;
