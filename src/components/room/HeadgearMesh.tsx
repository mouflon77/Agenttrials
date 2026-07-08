"use client";

import { DoubleSide } from "three";
import type { HeadgearId } from "@/types/avatar";

interface HeadgearMeshProps {
  headgearId: HeadgearId;
}

/**
 * 3D headgear in head-local units (parent scales by HEAD_RADIUS).
 * Origin = sphere center; y=0 is the equator, +y is the crown.
 */
export function HeadgearMesh({ headgearId }: HeadgearMeshProps) {
  if (headgearId === "none") return null;

  if (headgearId === "cap_red" || headgearId === "cap_blue") {
    const color = headgearId === "cap_red" ? "#c62828" : "#1565c0";
    const brimColor = headgearId === "cap_red" ? "#8b0000" : "#0d47a1";
    return (
      <group>
        {/* Upside-down bowl: top hemisphere snug on the head */}
        <mesh>
          <sphereGeometry args={[1.02, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color={color} roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Rectangular brim protruding forward (+Z) */}
        <mesh position={[0, -0.03, 0.48]}>
          <boxGeometry args={[1.7, 0.07, 0.72]} />
          <meshStandardMaterial color={brimColor} roughness={0.75} />
        </mesh>
      </group>
    );
  }

  if (headgearId === "crown") {
    const pointCount = 8;
    const bandRadius = 0.95;
    return (
      <group>
        {/* Gold band at equator */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[bandRadius, 0.1, 10, 36]} />
          <meshStandardMaterial
            color="#ffd54f"
            emissive="#b8860b"
            emissiveIntensity={0.25}
            metalness={0.85}
            roughness={0.22}
          />
        </mesh>
        {/* Hollow gold cylinder wall */}
        <mesh position={[0, 0.14, 0]}>
          <cylinderGeometry args={[bandRadius - 0.08, bandRadius, 0.28, 28, 1, true]} />
          <meshStandardMaterial
            color="#ffc107"
            metalness={0.82}
            roughness={0.26}
            side={DoubleSide}
          />
        </mesh>
        {/* Equal points around the rim */}
        {Array.from({ length: pointCount }).map((_, i) => {
          const angle = (i / pointCount) * Math.PI * 2;
          const x = Math.cos(angle) * bandRadius;
          const z = Math.sin(angle) * bandRadius;
          return (
            <mesh
              key={i}
              position={[x, 0.38, z]}
              rotation={[0, -angle + Math.PI / 2, 0]}
            >
              <coneGeometry args={[0.09, 0.32, 4]} />
              <meshStandardMaterial
                color="#ffeb3b"
                emissive="#daa520"
                emissiveIntensity={0.15}
                metalness={0.9}
                roughness={0.18}
              />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (headgearId === "horns") {
    const hornY = 0.02;
    const hornX = 1.0;
    return (
      <group>
        <mesh position={[-hornX, hornY, 0]} rotation={[0.1, 0, 0.72]}>
          <coneGeometry args={[0.12, 0.58, 10]} />
          <meshStandardMaterial color="#6d4c41" roughness={0.55} />
        </mesh>
        <mesh position={[hornX, hornY, 0]} rotation={[0.1, 0, -0.72]}>
          <coneGeometry args={[0.12, 0.58, 10]} />
          <meshStandardMaterial color="#6d4c41" roughness={0.55} />
        </mesh>
      </group>
    );
  }

  return null;
}
