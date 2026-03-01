import React, { useMemo } from 'react';
import * as THREE from 'three';

export interface ProceduralHouseProps {
  position?: [number, number, number];
  width?: number;
  depth?: number;
  floors?: number;
  roofType?: 'flat' | '45deg';
  roofColor?: string;
  wallColor?: string;
}

export function ProceduralHouse({
  position = [0, 0, 0],
  width = 10, // 10m
  depth = 8,  // 8m
  floors = 1,
  roofType = '45deg',
  roofColor = '#8b0000', // Dark red tile
  wallColor = '#f5f5dc', // Beige wall
}: ProceduralHouseProps) {
  const floorHeight = 2.5; // 2.50m per floor
  const totalWallHeight = floors * floorHeight;
  const roofHeight = 2.5;
  
  // Custom geometry for a triangular roof
  const roofGeometry = useMemo(() => {
    if (roofType === '45deg') {
      const shape = new THREE.Shape();
      // Draw a triangle
      shape.moveTo(0, 0);
      shape.lineTo(width, 0);
      shape.lineTo(width / 2, roofHeight);
      shape.lineTo(0, 0);
      
      const extrudeSettings = {
        depth: depth,
        bevelEnabled: false,
      };
      
      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      // The extrusion goes into the Z axis, but ExtrudeGeometry builds it along Z, 
      // we need to center it properly.
      geom.computeBoundingBox();
      const box = geom.boundingBox;
      if (box) {
        const center = new THREE.Vector3();
        box.getCenter(center);
        geom.translate(-center.x, -center.y, -center.z);
      }
      return geom;
    }
    return new THREE.BoxGeometry(width, 0.2, depth);
  }, [width, depth, roofType, roofHeight]);

  return (
    <group position={position}>
      {/* Walls */}
      <mesh position={[0, totalWallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, totalWallHeight, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>
      
      {/* Roof */}
      <mesh 
        position={[0, totalWallHeight + (roofType === 'flat' ? 0.1 : roofHeight / 2), 0]} 
        geometry={roofGeometry}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={roofColor} roughness={0.9} />
      </mesh>
    </group>
  );
}
