import React, { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface FiberSceneViewProps {
  puppetPath?: string;
  skyboxPath?: string;
  width: number;
  height: number;
  lighting?: 'bright' | 'dim' | 'dramatic' | 'natural';
  cameraProps?: { position: { x: number; y: number; z: number }; fov: number };
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

const PuppetModel = ({ url }: { url: string }) => {
  // Use atomUrl/file protocols depending on platform setup. 
  // Wait, in vite electron, usually you use the proxy or just file://. We'll use absolute path with file:///
  const gltfUrl = `sc-file:///${url.replace(/\\/g, '/')}`;
  const { scene } = useGLTF(gltfUrl);
  
  return <primitive object={scene} scale={[1, 1, 1]} position={[0, 0, 0]} />;
};

export const FiberSceneView: React.FC<FiberSceneViewProps> = ({ puppetPath, skyboxPath, width, height, lighting, cameraProps }) => {
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
    <div style={{ width, height, position: 'relative', background: '#111' }}>
      <Canvas 
        id="fiber-scene-canvas" 
        camera={{ position: camPos, fov: cameraProps?.fov || 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <ambientLight intensity={lightProps.ambient} />
        <directionalLight position={[10, 10, 5]} intensity={lightProps.dir} castShadow />
        
        <Suspense fallback={null}>
          {puppetPath && <PuppetModel url={puppetPath} />}
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
