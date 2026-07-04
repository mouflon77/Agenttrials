"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Color,
  DoubleSide,
  LinearFilter,
  Mesh,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector3,
} from "three";
import { NameLabel } from "@/components/room/NameLabel";
import { StandeePlane } from "@/components/room/StandeePlane";
import type { AvatarConfig } from "@/types/avatar";
import type { WorldPosition } from "@/lib/movement";

const BODY_RADIUS = 0.3;
const BODY_HEIGHT = 0.72;
const HEAD_RADIUS = 0.22;
const HEADGEAR_W = 0.45;
const HEADGEAR_H = 0.3;

const photoTextureCache = new Map<string, Texture>();
const photoTextureLoads = new Map<string, Promise<Texture>>();

function loadPhotoTexture(url: string): Promise<Texture> {
  const cached = photoTextureCache.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = photoTextureLoads.get(url);
  if (pending) return pending;

  const promise = new Promise<Texture>((resolve, reject) => {
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (loaded) => {
        loaded.colorSpace = SRGBColorSpace;
        loaded.magFilter = LinearFilter;
        loaded.minFilter = LinearFilter;
        loaded.generateMipmaps = true;
        loaded.needsUpdate = true;
        photoTextureCache.set(url, loaded);
        photoTextureLoads.delete(url);
        resolve(loaded);
      },
      undefined,
      (error) => {
        photoTextureLoads.delete(url);
        reject(error);
      },
    );
  });

  photoTextureLoads.set(url, promise);
  return promise;
}

function usePhotoTexture(photoURL?: string | null) {
  const [texture, setTexture] = useState<Texture | null>(() =>
    photoURL ? (photoTextureCache.get(photoURL) ?? null) : null,
  );

  useEffect(() => {
    if (!photoURL) {
      setTexture(null);
      return;
    }
    const cached = photoTextureCache.get(photoURL);
    if (cached) {
      setTexture(cached);
      return;
    }
    let cancelled = false;
    void loadPhotoTexture(photoURL).then((tex) => {
      if (!cancelled) setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [photoURL]);

  return texture;
}

interface PlayerAvatarProps {
  visualPosition: WorldPosition;
  avatarConfig: AvatarConfig;
  photoURL?: string | null;
  headgearTextureUrl?: string;
  displayName?: string | null;
}

function GlassBody({ bodyColor }: { bodyColor: string }) {
  const glow = useMemo(() => new Color(bodyColor), [bodyColor]);

  return (
    <group position={[0, BODY_HEIGHT / 2, 0]}>
      {/* Soft colored core */}
      <mesh>
        <cylinderGeometry args={[BODY_RADIUS * 0.82, BODY_RADIUS * 0.88, BODY_HEIGHT * 0.92, 32]} />
        <meshBasicMaterial
          color={glow}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>

      {/* Glass shell */}
      <mesh>
        <cylinderGeometry args={[BODY_RADIUS, BODY_RADIUS * 1.05, BODY_HEIGHT, 32]} />
        <meshPhysicalMaterial
          color="#f8fafc"
          emissive={glow}
          emissiveIntensity={0.35}
          transparent
          opacity={0.28}
          roughness={0.08}
          metalness={0.05}
          transmission={0.7}
          thickness={0.45}
          ior={1.45}
          reflectivity={0.4}
          clearcoat={1}
          clearcoatRoughness={0.1}
          depthWrite={false}
        />
      </mesh>

      {/* Rim highlight */}
      <mesh>
        <cylinderGeometry
          args={[BODY_RADIUS * 1.02, BODY_RADIUS * 1.07, BODY_HEIGHT * 1.01, 32, 1, true]}
        />
        <meshBasicMaterial
          color={glow}
          transparent
          opacity={0.45}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <pointLight color={glow} intensity={1.1} distance={2.8} decay={2} />
    </group>
  );
}

function FaceSphere({
  photoURL,
  bodyColor,
}: {
  photoURL?: string | null;
  bodyColor: string;
}) {
  const meshRef = useRef<Mesh>(null);
  const worldPos = useRef(new Vector3());
  const texture = usePhotoTexture(photoURL);
  const headY = BODY_HEIGHT + HEAD_RADIUS * 0.85;

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.getWorldPosition(worldPos.current);
    const dx = camera.position.x - worldPos.current.x;
    const dz = camera.position.z - worldPos.current.z;
    mesh.rotation.y = Math.atan2(dx, dz);
  });

  return (
    <mesh ref={meshRef} position={[0, headY, 0]}>
      <sphereGeometry args={[HEAD_RADIUS, 32, 24]} />
      {texture ? (
        <meshStandardMaterial map={texture} roughness={0.55} metalness={0.05} />
      ) : (
        <meshStandardMaterial
          color={bodyColor}
          emissive={bodyColor}
          emissiveIntensity={0.25}
          roughness={0.4}
        />
      )}
    </mesh>
  );
}

export function PlayerAvatar({
  visualPosition,
  avatarConfig,
  photoURL,
  headgearTextureUrl,
  displayName,
}: PlayerAvatarProps) {
  const showHeadgear =
    avatarConfig.headgearId !== "none" && Boolean(headgearTextureUrl);
  const headY = BODY_HEIGHT + HEAD_RADIUS * 0.85;
  const gearTop = showHeadgear
    ? headY + HEAD_RADIUS * 0.85 + HEADGEAR_H * 0.5
    : headY + HEAD_RADIUS;
  const labelY = gearTop + 0.28;

  return (
    <group position={[visualPosition.x, 0, visualPosition.z]}>
      <GlassBody bodyColor={avatarConfig.bodyColor} />
      <FaceSphere photoURL={photoURL} bodyColor={avatarConfig.bodyColor} />
      {showHeadgear && (
        <Billboard position={[0, headY + HEAD_RADIUS * 0.85, 0]} follow lockY>
          <StandeePlane
            textureUrl={headgearTextureUrl}
            width={HEADGEAR_W}
            height={HEADGEAR_H}
            color="#ffffff"
          />
        </Billboard>
      )}
      {displayName ? <NameLabel name={displayName} y={labelY} /> : null}
    </group>
  );
}
