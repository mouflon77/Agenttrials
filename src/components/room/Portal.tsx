"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import type { PortalItem } from "@/types/room";

interface PortalMeshProps {
  portal: PortalItem;
  unlocked: boolean;
  playerOnTile?: boolean;
  pickable?: boolean;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onEnter?: (portalId: string) => void;
}

export function PortalMesh({
  portal,
  unlocked,
  playerOnTile = false,
  pickable = false,
  selected = false,
  onSelect,
  onEnter,
}: PortalMeshProps) {
  const ringRef = useRef<Mesh>(null);
  const color = unlocked ? "#22c55e" : "#ef4444";
  const emissive = unlocked ? "#16a34a" : "#b91c1c";

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * (unlocked ? 1.2 : 0.4);
    }
  });

  return (
    <group
      position={[portal.x + 0.5, 0, portal.z + 0.5]}
      onPointerDown={(event) => {
        if (pickable && event.button === 0) {
          event.stopPropagation();
          onSelect?.(portal.id);
          return;
        }
        if (!unlocked || !playerOnTile || event.button !== 0) return;
        event.stopPropagation();
        onEnter?.(portal.id);
      }}
    >
      <mesh ref={ringRef} position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.12, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={unlocked ? 0.85 : 0.55}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.08, 0.7, 0.08]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[-0.22, 0.35, 0]}>
        <boxGeometry args={[0.06, 0.7, 0.06]} />
        <meshStandardMaterial color="#52525b" />
      </mesh>
      <mesh position={[0.22, 0.35, 0]}>
        <boxGeometry args={[0.06, 0.7, 0.06]} />
        <meshStandardMaterial color="#52525b" />
      </mesh>
      <mesh position={[0, 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.03, 8, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.7}
        />
      </mesh>
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.45, 0.52, 32]} />
          <meshBasicMaterial color="#60a5fa" transparent opacity={0.5} />
        </mesh>
      )}
      {playerOnTile && unlocked && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.38, 32]} />
          <meshBasicMaterial color="#86efac" transparent opacity={0.55} />
        </mesh>
      )}
    </group>
  );
}
