"use client";

import Image from "next/image";
import { useMemo } from "react";
import { HeadgearPreviewIcon } from "@/components/profile/HeadgearPreviewIcon";
import {
  createPresetHeadDataUrl,
  shouldUsePresetHead,
} from "@/lib/avatar-head-texture";
import { DEFAULT_SKIN_TONE, type AvatarConfig } from "@/types/avatar";

interface AvatarPreview2DProps {
  config: AvatarConfig;
  photoURL?: string | null;
  size?: "xs" | "sm" | "lg";
}

export function AvatarPreview2D({
  config,
  photoURL,
  size = "lg",
}: AvatarPreview2DProps) {
  const showHeadgear = config.headgearId !== "none";

  const frame = (() => {
    if (size === "lg") return showHeadgear ? "h-52 w-36" : "h-48 w-36";
    if (size === "xs") return showHeadgear ? "h-[4.75rem] w-14" : "h-16 w-12";
    return showHeadgear ? "h-28 w-20" : "h-24 w-20";
  })();

  const body =
    size === "lg" ? "h-28 w-16" : size === "xs" ? "h-8 w-5" : "h-14 w-8";
  const face =
    size === "lg" ? "h-16 w-16" : size === "xs" ? "h-7 w-7" : "h-8 w-8";

  const usePreset = shouldUsePresetHead(config.headSource, photoURL);
  const presetSrc = useMemo(() => {
    if (!usePreset || typeof document === "undefined") return null;
    return createPresetHeadDataUrl(
      config.headGender ?? "male",
      config.skinTone ?? DEFAULT_SKIN_TONE,
    );
  }, [usePreset, config.headGender, config.skinTone]);

  return (
    <div
      className={`relative flex ${frame} flex-col items-center justify-end overflow-visible rounded-xl border border-zinc-700 bg-zinc-950/80 px-1 pb-3 pt-1 shadow-inner`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_70%,transparent_20%,rgba(0,0,0,0.45)_100%)]" />

      <div className="relative z-10 flex w-full flex-col items-center">
        {showHeadgear && (
          <div className="relative z-20 mb-0.5 w-full shrink-0">
            <HeadgearPreviewIcon headgearId={config.headgearId} size={size} />
          </div>
        )}

        <div
          className={`${face} relative shrink-0 overflow-hidden rounded-full border border-white/25 shadow-[0_0_18px_var(--glow)]`}
          style={{
            backgroundColor: config.skinTone ?? DEFAULT_SKIN_TONE,
            ["--glow" as string]: `${config.bodyColor}99`,
          }}
        >
          {usePreset && presetSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={presetSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : photoURL ? (
            <Image
              src={photoURL}
              alt=""
              width={64}
              height={64}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-xs text-zinc-600"
              style={{ backgroundColor: config.skinTone ?? DEFAULT_SKIN_TONE }}
            >
              ?
            </div>
          )}
        </div>

        <div
          className={`${body} -mt-1 shrink-0 rounded-full border border-white/20 shadow-[0_0_24px_var(--glow)]`}
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
