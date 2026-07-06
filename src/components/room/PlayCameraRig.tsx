"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { MOUSE } from "three";
import {
  getIsometricOffset,
  ISO_CAMERA_DISTANCE,
  ISO_POLAR_ANGLE,
  ISO_POLAR_SLACK,
  setIsometricCameraPosition,
} from "@/lib/isometric-camera";

const DESIRED_TARGET = new THREE.Vector3();
const DESIRED_POSITION = new THREE.Vector3();
const ISO_OFFSET = getIsometricOffset(ISO_CAMERA_DISTANCE);

interface PlayCameraRigProps {
  follow: { x: number; z: number };
  minZoom?: number;
  maxZoom?: number;
}

export function PlayCameraRig({
  follow,
  minZoom = 38,
  maxZoom = 72,
}: PlayCameraRigProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useLayoutEffect(() => {
    setIsometricCameraPosition(camera, follow.x, follow.z);
    if (controlsRef.current) {
      controlsRef.current.target.set(follow.x, 0, follow.z);
      controlsRef.current.update();
    }
  }, [camera, follow.x, follow.z]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const t = 1 - Math.exp(-10 * delta);
    DESIRED_TARGET.set(follow.x, 0, follow.z);
    controls.target.lerp(DESIRED_TARGET, t);
    DESIRED_POSITION.copy(controls.target).add(ISO_OFFSET);
    camera.position.lerp(DESIRED_POSITION, t);
    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={false}
      enablePan={false}
      enableZoom
      minZoom={minZoom}
      maxZoom={maxZoom}
      minPolarAngle={ISO_POLAR_ANGLE - ISO_POLAR_SLACK}
      maxPolarAngle={ISO_POLAR_ANGLE + ISO_POLAR_SLACK}
    />
  );
}

interface IsometricEditorControlsProps {
  target?: { x: number; z: number };
  paintMode?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export function IsometricEditorControls({
  target = { x: 6, z: 6 },
  paintMode = false,
  minZoom = 30,
  maxZoom = 80,
}: IsometricEditorControlsProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);

  useLayoutEffect(() => {
    setIsometricCameraPosition(camera, target.x, target.z);
    if (controlsRef.current) {
      controlsRef.current.target.set(target.x, 0, target.z);
      controlsRef.current.update();
    }
  }, [camera, target.x, target.z]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={!paintMode}
      enableZoom
      minZoom={minZoom}
      maxZoom={maxZoom}
      target={[target.x, 0, target.z]}
      minPolarAngle={ISO_POLAR_ANGLE - ISO_POLAR_SLACK}
      maxPolarAngle={ISO_POLAR_ANGLE + ISO_POLAR_SLACK}
      mouseButtons={
        paintMode
          ? {
              MIDDLE: MOUSE.DOLLY,
              RIGHT: MOUSE.ROTATE,
            }
          : undefined
      }
    />
  );
}
