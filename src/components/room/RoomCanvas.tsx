"use client";

import { Canvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import {
  IsometricEditorControls,
  PlayCameraRig,
} from "@/components/room/PlayCameraRig";
import {
  getIsometricOffset,
  ISO_CAMERA_DISTANCE,
  setIsometricCameraPosition,
} from "@/lib/isometric-camera";

interface RoomCanvasProps {
  children: ReactNode;
  enableControls?: boolean;
  /** Left-click paints tiles; right/middle orbit the camera. */
  paintMode?: boolean;
  /** Play mode: lock isometric view, follow this position, zoom only. */
  followPosition?: { x: number; z: number } | null;
}

const ROOM_CENTER = { x: 6, z: 6 };
const ISO_OFFSET = getIsometricOffset(ISO_CAMERA_DISTANCE);

export function RoomCanvas({
  children,
  enableControls = true,
  paintMode = false,
  followPosition = null,
}: RoomCanvasProps) {
  const playMode = followPosition != null;
  const initialTarget = followPosition ?? ROOM_CENTER;

  return (
    <Canvas
      orthographic
      className="h-full w-full"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      camera={{
        zoom: playMode ? 48 : 42,
        position: [
          initialTarget.x + ISO_OFFSET.x,
          ISO_OFFSET.y,
          initialTarget.z + ISO_OFFSET.z,
        ],
        near: 0.1,
        far: 200,
      }}
      onCreated={({ camera }) => {
        setIsometricCameraPosition(
          camera,
          initialTarget.x,
          initialTarget.z,
        );
      }}
    >
      <ambientLight intensity={1} />
      <directionalLight
        position={[
          ISO_OFFSET.x * 0.7,
          ISO_OFFSET.y * 0.9,
          ISO_OFFSET.z * 0.7,
        ]}
        intensity={0.35}
      />
      {children}
      {enableControls &&
        (playMode ? (
          <PlayCameraRig follow={followPosition} />
        ) : (
          <IsometricEditorControls paintMode={paintMode} />
        ))}
    </Canvas>
  );
}
