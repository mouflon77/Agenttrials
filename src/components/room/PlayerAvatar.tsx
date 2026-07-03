"use client";

import { Billboard } from "@react-three/drei";
import { useEffect, useState } from "react";
import { StandeePlane } from "@/components/room/StandeePlane";
import { SpriteSheetCharacter } from "@/components/room/SpriteSheetCharacter";
import {
  getCachedPixelTexture,
  loadPixelTexture,
} from "@/lib/tile-textures";
import { DEFAULT_PLAYER_SPRITE_SHEET } from "@/lib/sprite-sheet";
import type { AvatarConfig } from "@/types/avatar";
import type { WorldPosition } from "@/lib/movement";

const FACE_SIZE = 0.28;
const HEADGEAR_W = 0.45;
const HEADGEAR_H = 0.3;
const SPRITE_HEIGHT = 1.05;

interface PlayerAvatarProps {
  visualPosition: WorldPosition;
  avatarConfig: AvatarConfig;
  photoURL?: string | null;
  headgearTextureUrl?: string;
  isMoving: boolean;
  facingRow: number;
}

function FaceBadge({ photoURL }: { photoURL?: string | null }) {
  const [texture, setTexture] = useState(
    photoURL ? getCachedPixelTexture(photoURL) : null,
  );

  useEffect(() => {
    if (!photoURL) {
      setTexture(null);
      return;
    }
    const cached = getCachedPixelTexture(photoURL);
    if (cached) {
      setTexture(cached);
      return;
    }
    let cancelled = false;
    void loadPixelTexture(photoURL).then((tex) => {
      if (!cancelled) setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [photoURL]);

  if (!photoURL && !texture) return null;

  return (
    <Billboard position={[0, SPRITE_HEIGHT * 0.88, 0]} follow lockY>
      <mesh>
        <planeGeometry args={[FACE_SIZE, FACE_SIZE]} />
        {texture ? (
          <meshBasicMaterial map={texture} toneMapped={false} transparent />
        ) : (
          <meshBasicMaterial color="#e4e4e7" />
        )}
      </mesh>
    </Billboard>
  );
}

export function PlayerAvatar({
  visualPosition,
  avatarConfig,
  photoURL,
  headgearTextureUrl,
  isMoving,
  facingRow,
}: PlayerAvatarProps) {
  const showHeadgear =
    avatarConfig.headgearId !== "none" && Boolean(headgearTextureUrl);
  const spriteUrl =
    avatarConfig.spriteSheetUrl?.trim() || DEFAULT_PLAYER_SPRITE_SHEET;

  return (
    <group>
      <SpriteSheetCharacter
        visualPosition={visualPosition}
        bodyColor={avatarConfig.bodyColor}
        spriteSheetUrl={spriteUrl}
        facingRow={facingRow}
        isMoving={isMoving}
        height={SPRITE_HEIGHT}
      />
      <group position={[visualPosition.x, 0, visualPosition.z]}>
        {photoURL && <FaceBadge photoURL={photoURL} />}
        {showHeadgear && (
          <Billboard
            position={[0, SPRITE_HEIGHT * 0.98, 0]}
            follow
            lockY
          >
            <StandeePlane
              textureUrl={headgearTextureUrl}
              width={HEADGEAR_W}
              height={HEADGEAR_H}
              color="#ffffff"
            />
          </Billboard>
        )}
      </group>
    </group>
  );
}
