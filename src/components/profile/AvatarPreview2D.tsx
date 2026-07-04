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
  const frame = size === "lg" ? "h-48 w-36" : "h-24 w-20";
  const body = size === "lg" ? "h-28 w-16" : "h-14 w-8";
  const face = size === "lg" ? "h-16 w-16" : "h-8 w-8";
  const gear = size === "lg" ? "h-10" : "h-6";

  return (
    <div
      className={`relative flex ${frame} flex-col items-center justify-end overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950/80 pb-3 shadow-inner`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_70%,transparent_20%,rgba(0,0,0,0.45)_100%)]" />

      <div className="relative z-10 flex flex-col items-center">
        {headgear?.textureUrl && config.headgearId !== "none" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={headgear.textureUrl}
            alt=""
            className={`${gear} mb-[-0.35rem] w-auto object-contain`}
          />
        ) : null}

        <div
          className={`${face} overflow-hidden rounded-full border border-white/25 bg-zinc-300 shadow-[0_0_18px_var(--glow)]`}
          style={{ ["--glow" as string]: `${config.bodyColor}99` }}
        >
          {photoURL ? (
            <Image
              src={photoURL}
              alt=""
              width={64}
              height={64}
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
          className={`${body} -mt-1 rounded-full border border-white/20 shadow-[0_0_24px_var(--glow)]`}
          style={{
            background: `linear-gradient(180deg, ${config.bodyColor}55 0%, ${config.bodyColor}22 45%, ${config.bodyColor}66 100%)`,
            ["--glow" as string]: `${config.bodyColor}88`,
            backdropFilter: "blur(2px)",
          }}
        />
      </div>
    </div>
  );
}
