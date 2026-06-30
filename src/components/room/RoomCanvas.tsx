"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ReactNode } from "react";

interface RoomCanvasProps {
  children: ReactNode;
  enableControls?: boolean;
}

export function RoomCanvas({ children, enableControls = true }: RoomCanvasProps) {
  return (
    <Canvas
      orthographic
      shadows
      className="h-full w-full"
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
      <ambientLight intensity={0.85} />
      <directionalLight position={[8, 14, 6]} intensity={1.1} castShadow />
      {children}
      {enableControls && (
        <OrbitControls
          enablePan
          enableZoom
          minZoom={30}
          maxZoom={80}
          target={[6, 0, 6]}
        />
      )}
    </Canvas>
  );
}
