"use client";

import { useEffect, useState } from "react";
import {
  getCachedPixelTexture,
  loadPixelTexture,
} from "@/lib/tile-textures";

interface StandeePlaneProps {
  textureUrl?: string;
  width: number;
  height: number;
  color: string;
  selected?: boolean;
  opacity?: number;
}

export function StandeePlane({
  textureUrl,
  width,
  height,
  color,
  selected = false,
  opacity = 1,
}: StandeePlaneProps) {
  const [texture, setTexture] = useState(
    textureUrl ? getCachedPixelTexture(textureUrl) : null,
  );

  useEffect(() => {
    if (!textureUrl) {
      setTexture(null);
      return;
    }
    const cached = getCachedPixelTexture(textureUrl);
    if (cached) {
      setTexture(cached);
      return;
    }
    let cancelled = false;
    void loadPixelTexture(textureUrl).then((tex) => {
      if (!cancelled) setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [textureUrl]);

  return (
    <mesh position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      {texture ? (
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      ) : (
        <meshStandardMaterial
          color={color}
          emissive={selected ? "#4488ff" : "#000000"}
          emissiveIntensity={selected ? 0.35 : 0}
          flatShading
        />
      )}
    </mesh>
  );
}
