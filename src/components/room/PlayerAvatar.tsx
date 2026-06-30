"use client";

import type { PlayerPosition } from "@/types/room";

interface PlayerAvatarProps {
  position: PlayerPosition;
}

export function PlayerAvatar({ position }: PlayerAvatarProps) {
  return (
    <group position={[position.x + 0.5, 0, position.z + 0.5]}>
      <mesh position={[0, 0.22, 0]}>
        <capsuleGeometry args={[0.18, 0.28, 4, 12]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.35} />
      </mesh>
    </group>
  );
}
