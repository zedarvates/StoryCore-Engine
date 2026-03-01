import React from 'react';

export interface ProceduralTreeProps {
  position?: [number, number, number];
  height?: number; // Total height
  trunkColor?: string;
  leavesColor?: string;
}

export function ProceduralTree({
  position = [0, 0, 0],
  height = 6,
  trunkColor = '#3e2723', // Dark brown
  leavesColor = '#2e7d32', // Pine green
}: ProceduralTreeProps) {
  const trunkHeight = height * 0.3; // 30% trunk
  const leavesHeight = height * 0.7;
  const trunkRadius = height * 0.05;

  return (
    <group position={position}>
      {/* Trunk (Hexagon cylinder) */}
      <mesh position={[0, trunkHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[trunkRadius * 0.8, trunkRadius * 1.5, trunkHeight, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      
      {/* Roots (just a base spread for now) */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <coneGeometry args={[trunkRadius * 3, 0.4, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>

      {/* Leaves / Needles (stacked cones) */}
      {[0, 1, 2].map((tier) => {
        const tierHeight = leavesHeight * 0.6;
        const tierY = trunkHeight + (leavesHeight * tier) / 3;
        const radius = (trunkRadius * 8) - (tier * trunkRadius * 2);

        return (
          <mesh key={tier} position={[0, tierY + tierHeight / 2 - 0.5, 0]} castShadow receiveShadow>
            <coneGeometry args={[radius, tierHeight, 6]} />
            <meshStandardMaterial color={leavesColor} roughness={0.8} />
          </mesh>
        );
      })}
    </group>
  );
}
