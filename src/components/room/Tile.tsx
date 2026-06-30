"use client";

import { useEffect, useState } from "react";
import { useLoader } from "@react-three/fiber";
import { NearestFilter, TextureLoader, type Texture } from "three";
import { planeSizeFromPixels } from "@/types/room";

interface TileProps {
  textureUrl?: string;
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  pixelWidth?: number;
  pixelHeight?: number;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  opacity?: number;
}

function configurePixelTexture(texture: Texture) {
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;
}

function TexturedTile({
  textureUrl,
  color,
  position,
  rotation = [0, 0, 0],
  pixelWidth = 64,
  pixelHeight = 64,
  onClick,
  onPointerOver,
  onPointerOut,
  opacity = 1,
}: TileProps & { textureUrl: string }) {
  const texture = useLoader(TextureLoader, textureUrl);
  const { width, height } = planeSizeFromPixels(pixelWidth, pixelHeight);

  useEffect(() => {
    configurePixelTexture(texture);
  }, [texture]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver?.();
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut?.();
      }}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}

export function Tile({
  textureUrl,
  color,
  position,
  rotation = [0, 0, 0],
  pixelWidth = 64,
  pixelHeight = 64,
  onClick,
  onPointerOver,
  onPointerOut,
  opacity = 1,
}: TileProps) {
  const { width, height } = planeSizeFromPixels(pixelWidth, pixelHeight);

  if (textureUrl) {
    return (
      <TexturedTile
        textureUrl={textureUrl}
        color={color}
        position={position}
        rotation={rotation}
        pixelWidth={pixelWidth}
        pixelHeight={pixelHeight}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        opacity={opacity}
      />
    );
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        onPointerOver?.();
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onPointerOut?.();
      }}
    >
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        color={color}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
