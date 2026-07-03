"use client";

import { Billboard, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  DoubleSide,
  NearestFilter,
  ShaderMaterial,
  Texture,
  Vector2,
} from "three";
import {
  DEFAULT_PLAYER_SPRITE_SHEET,
  SPRITE_ANIM_FPS,
  SPRITE_SHEET_COLS,
  spriteUvOffset,
  spriteUvRepeat,
} from "@/lib/sprite-sheet";
import type { WorldPosition } from "@/lib/movement";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform vec2 frameOffset;
  uniform vec2 frameRepeat;
  uniform vec3 tintColor;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * frameRepeat + frameOffset;
    vec4 tex = texture2D(map, uv);
    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    if (lum < 0.12) discard;
    gl_FragColor = vec4(tex.rgb * tintColor, 1.0);
  }
`;

function createSpriteMaterial(texture: Texture, tint: string) {
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;

  return new ShaderMaterial({
    uniforms: {
      map: { value: texture },
      frameOffset: { value: new Vector2(0, 0) },
      frameRepeat: {
        value: new Vector2(spriteUvRepeat().x, spriteUvRepeat().y),
      },
      tintColor: { value: new Color(tint) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    side: DoubleSide,
    depthWrite: true,
  });
}

interface SpriteSheetCharacterProps {
  visualPosition: WorldPosition;
  bodyColor: string;
  spriteSheetUrl?: string;
  facingRow: number;
  isMoving: boolean;
  /** World-space height of one frame */
  height?: number;
}

export function SpriteSheetCharacter({
  visualPosition,
  bodyColor,
  spriteSheetUrl = DEFAULT_PLAYER_SPRITE_SHEET,
  facingRow,
  isMoving,
  height = 1.05,
}: SpriteSheetCharacterProps) {
  const texture = useTexture(spriteSheetUrl) as Texture;
  const material = useMemo(
    () => createSpriteMaterial(texture.clone(), bodyColor),
    [texture, bodyColor],
  );

  const animRef = useRef(0);
  const frameRef = useRef(0);
  const rowRef = useRef(facingRow);

  useEffect(() => {
    rowRef.current = facingRow;
    material.uniforms.tintColor.value.set(bodyColor);
  }, [facingRow, bodyColor, material]);

  useFrame((_, delta) => {
    const row = rowRef.current;
    if (isMoving) {
      animRef.current += delta * SPRITE_ANIM_FPS;
      frameRef.current = Math.floor(animRef.current) % SPRITE_SHEET_COLS;
    } else {
      animRef.current = 0;
      frameRef.current = 0;
    }
    const { x, y } = spriteUvOffset(frameRef.current, row);
    material.uniforms.frameOffset.value.set(x, y);
  });

  const width = height * 0.72;

  return (
    <Billboard
      position={[visualPosition.x, 0, visualPosition.z]}
      follow
      lockY
    >
      <mesh position={[0, height / 2, 0]} material={material}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color={bodyColor} transparent opacity={0.3} />
      </mesh>
    </Billboard>
  );
}
