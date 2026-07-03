"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ReactNode } from "react";
import { MOUSE } from "three";
import { PlayCameraRig } from "@/components/room/PlayCameraRig";

interface RoomCanvasProps {
  children: ReactNode;
  enableControls?: boolean;
  /** Left-click paints tiles; right/middle orbit the camera. */
  paintMode?: boolean;
  /** Play mode: lock isometric view, follow this position, zoom only. */
  followPosition?: { x: number; z: number } | null;
}

const ROOM_CENTER = { x: 6, z: 6 };

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
          initialTarget.x + 6,
          12,
          initialTarget.z + 6,
        ],
        near: 0.1,
        far: 200,
      }}
      onCreated={({ camera }) => {
        camera.lookAt(initialTarget.x, 0, initialTarget.z);
      }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[8, 14, 6]} intensity={0.35} />
      {children}
      {enableControls &&
        (playMode ? (
          <PlayCameraRig follow={followPosition} />
        ) : (
          <OrbitControls
            enablePan={!paintMode}
            enableZoom
            minZoom={30}
            maxZoom={80}
            target={[ROOM_CENTER.x, 0, ROOM_CENTER.z]}
            mouseButtons={
              paintMode
                ? {
                    MIDDLE: MOUSE.DOLLY,
                    RIGHT: MOUSE.ROTATE,
                  }
                : undefined
            }
          />
        ))}
    </Canvas>
  );
}
