"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ReactNode } from "react";
import { MOUSE } from "three";

interface RoomCanvasProps {
  children: ReactNode;
  enableControls?: boolean;
  /** Left-click paints tiles; right/middle orbit the camera. */
  paintMode?: boolean;
}

export function RoomCanvas({
  children,
  enableControls = true,
  paintMode = false,
}: RoomCanvasProps) {
  return (
    <Canvas
      orthographic
      className="h-full w-full"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false }}
      camera={{
        zoom: 42,
        position: [12, 12, 12],
        near: 0.1,
        far: 200,
      }}
      onCreated={({ camera }) => {
        camera.lookAt(6, 0, 6);
      }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[8, 14, 6]} intensity={0.35} />
      {children}
      {enableControls && (
        <OrbitControls
          enablePan={!paintMode}
          enableZoom
          minZoom={30}
          maxZoom={80}
          target={[6, 0, 6]}
          mouseButtons={
            paintMode
              ? {
                  MIDDLE: MOUSE.DOLLY,
                  RIGHT: MOUSE.ROTATE,
                }
              : undefined
          }
        />
      )}
    </Canvas>
  );
}
