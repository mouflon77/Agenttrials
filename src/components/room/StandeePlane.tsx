"use client";

import { useEffect, useState } from "react";
import {
  getCachedPixelTexture,
  loadTileTexture,
} from "@/lib/tile-textures";

interface StandeePlaneProps {
  textureUrl?: string;
  textureFormat?: "png" | "svg";
  pixelWidth?: number;
  pixelHeight?: number;
  width: number;
  height: number;
  color: string;
  selected?: boolean;
  opacity?: number;
}

export function StandeePlane({
  textureUrl,
  textureFormat,
  pixelWidth = 64,
  pixelHeight = 128,
  width,
  height,
  color,
  selected = false,
  opacity = 1,
}: StandeePlaneProps) {
  const loadOptions = {
    format: textureFormat,
    pixelWidth,
    pixelHeight,
  };
  const [texture, setTexture] = useState(
    textureUrl ? getCachedPixelTexture(textureUrl, loadOptions) : null,
  );

  useEffect(() => {
    if (!textureUrl) {
      setTexture(null);
      return;
    }
    const cached = getCachedPixelTexture(textureUrl, loadOptions);
    if (cached) {
      setTexture(cached);
      return;
    }
    let cancelled = false;
    void loadTileTexture(textureUrl, loadOptions).then((tex) => {
      if (!cancelled) setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [textureUrl, textureFormat, pixelWidth, pixelHeight]);

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
