"use client";

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
import { HeadgearMesh } from "@/components/room/HeadgearMesh";
import { NameLabel } from "@/components/room/NameLabel";
import { headgearYawForFacingRow } from "@/lib/headgear-assets";
import {
  createPresetHeadDataUrl,
  shouldUsePresetHead,
} from "@/lib/avatar-head-texture";
import {
  DEFAULT_SKIN_TONE,
  type AvatarConfig,
  type HeadgearId,
} from "@/types/avatar";
import type { WorldPosition } from "@/lib/movement";

export const BODY_RADIUS = 0.3;
export const BODY_HEIGHT = 0.72;
export const HEAD_RADIUS = 0.22;

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

function useTextureUrl(url?: string | null) {
  const [texture, setTexture] = useState<Texture | null>(() =>
    url ? (photoTextureCache.get(url) ?? null) : null,
  );

  useEffect(() => {
    if (!url) {
      setTexture(null);
      return;
    }
    const cached = photoTextureCache.get(url);
    if (cached) {
      setTexture(cached);
      return;
    }
    let cancelled = false;
    void loadPhotoTexture(url).then((tex) => {
      if (!cancelled) setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return texture;
}

interface PlayerAvatarProps {
  visualPosition: WorldPosition;
  avatarConfig: AvatarConfig;
  photoURL?: string | null;
  displayName?: string | null;
  facingRow?: number;
}

function GlassBody({ bodyColor }: { bodyColor: string }) {
  const glow = useMemo(() => new Color(bodyColor), [bodyColor]);

  return (
    <group position={[0, BODY_HEIGHT / 2, 0]}>
      <mesh>
        <cylinderGeometry args={[BODY_RADIUS * 0.82, BODY_RADIUS * 0.88, BODY_HEIGHT * 0.92, 32]} />
        <meshBasicMaterial
          color={glow}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>

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
  avatarConfig,
}: {
  photoURL?: string | null;
  avatarConfig: AvatarConfig;
}) {
  const meshRef = useRef<Mesh>(null);
  const worldPos = useRef(new Vector3());
  const headY = BODY_HEIGHT + HEAD_RADIUS * 0.85;
  const usePreset = shouldUsePresetHead(avatarConfig.headSource, photoURL);

  const presetDataUrl = useMemo(() => {
    if (!usePreset || typeof document === "undefined") return null;
    return createPresetHeadDataUrl(
      avatarConfig.headGender ?? "male",
      avatarConfig.skinTone ?? DEFAULT_SKIN_TONE,
    );
  }, [usePreset, avatarConfig.headGender, avatarConfig.skinTone]);

  const texture = useTextureUrl(usePreset ? presetDataUrl : photoURL);
  const fallbackColor = avatarConfig.skinTone ?? DEFAULT_SKIN_TONE;

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
          color={fallbackColor}
          emissive={fallbackColor}
          emissiveIntensity={0.12}
          roughness={0.45}
        />
      )}
    </mesh>
  );
}

function headgearIdFromConfig(headgearId: string): HeadgearId {
  if (
    headgearId === "cap_red" ||
    headgearId === "cap_blue" ||
    headgearId === "horns" ||
    headgearId === "crown" ||
    headgearId === "none"
  ) {
    return headgearId;
  }
  return "none";
}

export function PlayerAvatar({
  visualPosition,
  avatarConfig,
  photoURL,
  displayName,
  facingRow = 2,
}: PlayerAvatarProps) {
  const headY = BODY_HEIGHT + HEAD_RADIUS * 0.85;
  const gearYaw = headgearYawForFacingRow(facingRow);
  const headgearId = headgearIdFromConfig(avatarConfig.headgearId);
  const showHeadgear = headgearId !== "none";
  const labelY = headY + HEAD_RADIUS * 1.35 + (showHeadgear ? 0.12 : 0);

  return (
    <group position={[visualPosition.x, 0, visualPosition.z]}>
      <GlassBody bodyColor={avatarConfig.bodyColor} />
      <FaceSphere photoURL={photoURL} avatarConfig={avatarConfig} />
      {showHeadgear && (
        <group
          position={[0, headY, 0]}
          scale={HEAD_RADIUS}
          rotation={[0, gearYaw, 0]}
        >
          <HeadgearMesh headgearId={headgearId} />
        </group>
      )}
      {displayName ? <NameLabel name={displayName} y={labelY} /> : null}
    </group>
  );
}
