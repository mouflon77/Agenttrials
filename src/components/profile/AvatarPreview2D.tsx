"use client";

import Image from "next/image";
import type { AvatarConfig } from "@/types/avatar";
import type { HeadgearItem } from "@/types/avatar";

interface AvatarPreview2DProps {
  config: AvatarConfig;
  photoURL?: string | null;
  headgear?: HeadgearItem;
  size?: "sm" | "lg";
}

export function AvatarPreview2D({
  config,
  photoURL,
  headgear,
  size = "lg",
}: AvatarPreview2DProps) {
  const dim = size === "lg" ? "h-48 w-32" : "h-24 w-16";
  const faceDim = size === "lg" ? "h-14 w-14" : "h-8 w-8";

  return (
    <div
      className={`relative ${dim} overflow-hidden rounded-lg border border-zinc-700 shadow-inner`}
      style={{ backgroundColor: config.bodyColor }}
    >
      <div className="absolute inset-x-0 bottom-0 top-[18%] opacity-90" />
      <div className="absolute left-1/2 top-[12%] -translate-x-1/2">
        {headgear?.textureUrl && config.headgearId !== "none" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={headgear.textureUrl}
            alt=""
            className={`${size === "lg" ? "h-12" : "h-7"} w-auto object-contain`}
            style={{ imageRendering: "pixelated" }}
          />
        ) : null}
      </div>
      <div className={`absolute left-1/2 top-[28%] ${faceDim} -translate-x-1/2 overflow-hidden rounded-full border-2 border-white/30 bg-zinc-200`}>
        {photoURL ? (
          <Image
            src={photoURL}
            alt=""
            width={56}
            height={56}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            ?
          </div>
        )}
      </div>
      <div
        className="absolute inset-x-2 bottom-2 top-[42%] rounded-md opacity-80"
        style={{ backgroundColor: config.bodyColor }}
      />
    </div>
  );
}
