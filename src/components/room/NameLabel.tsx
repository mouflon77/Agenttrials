"use client";

import { Billboard, Text } from "@react-three/drei";

interface NameLabelProps {
  name: string;
  /** World Y of the label (center of text). */
  y: number;
  /** Optional secondary line (e.g. role). */
  subtitle?: string;
  color?: string;
}

export function NameLabel({
  name,
  y,
  subtitle,
  color = "#fafafa",
}: NameLabelProps) {
  const label = name.trim();
  if (!label) return null;

  return (
    <Billboard position={[0, y, 0]} follow lockY>
      <Text
        position={[0, subtitle ? 0.12 : 0, 0]}
        fontSize={0.22}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.028}
        outlineColor="#09090b"
        outlineOpacity={0.95}
        maxWidth={2.4}
        textAlign="center"
        overflowWrap="break-word"
      >
        {label}
      </Text>
      {subtitle ? (
        <Text
          position={[0, -0.1, 0]}
          fontSize={0.14}
          color="#a1a1aa"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#09090b"
          outlineOpacity={0.9}
        >
          {subtitle}
        </Text>
      ) : null}
    </Billboard>
  );
}
