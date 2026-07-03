"use client";

import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

/** World-space offset from follow target to camera (fixed isometric angle). */
const ISO_OFFSET = new THREE.Vector3(6, 12, 6);

const DESIRED_TARGET = new THREE.Vector3();
const DESIRED_POSITION = new THREE.Vector3();

/** Lock elevation within ±10° of the nominal isometric polar angle. */
const ISO_POLAR_ANGLE = Math.acos(
  ISO_OFFSET.y / ISO_OFFSET.length(),
);
const POLAR_SLACK = THREE.MathUtils.degToRad(10);

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
    DESIRED_TARGET.set(follow.x, 0, follow.z);
    DESIRED_POSITION.copy(DESIRED_TARGET).add(ISO_OFFSET);
    camera.position.copy(DESIRED_POSITION);
    camera.lookAt(DESIRED_TARGET);
    if (controlsRef.current) {
      controlsRef.current.target.copy(DESIRED_TARGET);
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
      minPolarAngle={ISO_POLAR_ANGLE - POLAR_SLACK}
      maxPolarAngle={ISO_POLAR_ANGLE + POLAR_SLACK}
    />
  );
}
