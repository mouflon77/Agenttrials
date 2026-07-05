"use client";

import { useEffect, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import {
  getCachedPixelTexture,
  loadTileTexture,
  type LoadTileTextureOptions,
} from "@/lib/tile-textures";
import { planeSizeFromPixels } from "@/types/room";

interface TileProps {
  textureUrl?: string;
  textureFormat?: "png" | "svg";
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  pixelWidth?: number;
  pixelHeight?: number;
  planeWidth?: number;
  planeHeight?: number;
  highlighted?: boolean;
  previewTextureUrl?: string;
  pickable?: boolean;
  onPaint?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  opacity?: number;
}

function handlePointer(
  event: ThreeEvent<PointerEvent>,
  pickable: boolean,
  handler?: () => void,
) {
  if (!pickable) return;
  event.stopPropagation();
  handler?.();
}

function paintOnPointerDown(
  event: ThreeEvent<PointerEvent>,
  pickable: boolean,
  onPaint?: () => void,
) {
  if (!pickable || event.button !== 0) return;
  event.stopPropagation();
  onPaint?.();
}

function ColoredPlane({
  color,
  position,
  rotation = [0, 0, 0],
  width,
  height,
  highlighted = false,
  pickable = true,
  onPaint,
  onPointerOver,
  onPointerOut,
  opacity = 1,
}: {
  color: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  highlighted?: boolean;
  pickable?: boolean;
  onPaint?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  opacity?: number;
}) {
  const displayColor = highlighted ? "#e8f4ff" : color;
  const displayOpacity = highlighted ? Math.max(opacity, 0.55) : opacity;

  return (
    <mesh
      position={position}
      rotation={rotation}
      raycast={pickable ? undefined : () => null}
      onPointerDown={(event) => paintOnPointerDown(event, pickable, onPaint)}
      onPointerOver={(event) => handlePointer(event, pickable, onPointerOver)}
      onPointerOut={(event) => handlePointer(event, pickable, onPointerOut)}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        color={displayColor}
        transparent={displayOpacity < 1}
        opacity={displayOpacity}
      />
    </mesh>
  );
}

function TexturedPlane({
  textureUrl,
  textureFormat,
  pixelWidth = 64,
  pixelHeight = 64,
  position,
  rotation = [0, 0, 0],
  width,
  height,
  highlighted = false,
  previewTextureUrl,
  pickable = true,
  onPaint,
  onPointerOver,
  onPointerOut,
  opacity = 1,
}: {
  textureUrl: string;
  textureFormat?: "png" | "svg";
  pixelWidth?: number;
  pixelHeight?: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  width: number;
  height: number;
  highlighted?: boolean;
  previewTextureUrl?: string;
  pickable?: boolean;
  onPaint?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
  opacity?: number;
}) {
  const displayUrl =
    highlighted && previewTextureUrl ? previewTextureUrl : textureUrl;
  const loadOptions: LoadTileTextureOptions = {
    format: textureFormat,
    pixelWidth,
    pixelHeight,
  };
  const [texture, setTexture] = useState(
    () => getCachedPixelTexture(displayUrl, loadOptions) ?? null,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);

    const cached = getCachedPixelTexture(displayUrl, loadOptions);
    if (cached) {
      setTexture(cached);
      return;
    }

    setTexture(null);
    void loadTileTexture(displayUrl, loadOptions)
      .then((loaded) => {
        if (!cancelled) setTexture(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [displayUrl, textureFormat, pixelWidth, pixelHeight]);

  const displayOpacity =
    highlighted && previewTextureUrl ? 0.75 : opacity;

  if (failed || !texture) {
    return (
      <ColoredPlane
        color="#888888"
        position={position}
        rotation={rotation}
        width={width}
        height={height}
        highlighted={highlighted}
        pickable={pickable}
        onPaint={onPaint}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        opacity={displayOpacity}
      />
    );
  }

  return (
    <mesh
      position={position}
      rotation={rotation}
      raycast={pickable ? undefined : () => null}
      onPointerDown={(event) => paintOnPointerDown(event, pickable, onPaint)}
      onPointerOver={(event) => handlePointer(event, pickable, onPointerOver)}
      onPointerOut={(event) => handlePointer(event, pickable, onPointerOut)}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        color={highlighted ? "#d9ecff" : "#ffffff"}
        transparent={displayOpacity < 1}
        opacity={displayOpacity}
      />
    </mesh>
  );
}

export function Tile({
  textureUrl,
  textureFormat,
  color,
  position,
  rotation = [0, 0, 0],
  pixelWidth = 64,
  pixelHeight = 64,
  planeWidth,
  planeHeight,
  highlighted = false,
  previewTextureUrl,
  pickable = true,
  onPaint,
  onPointerOver,
  onPointerOut,
  opacity = 1,
}: TileProps) {
  const pixelSize = planeSizeFromPixels(pixelWidth, pixelHeight);
  const width = planeWidth ?? pixelSize.width;
  const height = planeHeight ?? pixelSize.height;

  if (textureUrl) {
    return (
      <TexturedPlane
        textureUrl={textureUrl}
        textureFormat={textureFormat}
        pixelWidth={pixelWidth}
        pixelHeight={pixelHeight}
        position={position}
        rotation={rotation}
        width={width}
        height={height}
        highlighted={highlighted}
        previewTextureUrl={previewTextureUrl}
        pickable={pickable}
        onPaint={onPaint}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        opacity={opacity}
      />
    );
  }

  if (highlighted && previewTextureUrl) {
    return (
      <TexturedPlane
        textureUrl={previewTextureUrl}
        textureFormat={textureFormat}
        pixelWidth={pixelWidth}
        pixelHeight={pixelHeight}
        position={position}
        rotation={rotation}
        width={width}
        height={height}
        highlighted
        pickable={pickable}
        onPaint={onPaint}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        opacity={0.75}
      />
    );
  }

  return (
    <ColoredPlane
      color={color}
      position={position}
      rotation={rotation}
      width={width}
      height={height}
      highlighted={highlighted}
      pickable={pickable}
      onPaint={onPaint}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      opacity={opacity}
    />
  );
}
