import type { HeadGender } from "@/types/avatar";

const textureCache = new Map<string, string>();

function cacheKey(gender: HeadGender, skinTone: string): string {
  return `${gender}:${skinTone}`;
}

/** Procedural face texture for preset heads (canvas data URL). */
export function createPresetHeadDataUrl(
  gender: HeadGender,
  skinTone: string,
  size = 128,
): string {
  const key = cacheKey(gender, skinTone);
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.46;

  ctx.fillStyle = skinTone;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const hairColor =
    gender === "male" ? "#2a1f18" : "#3d2817";

  if (gender === "male") {
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.35, r * 0.72, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.42, r * 0.8, Math.PI * 1.05, -0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.62, cy - r * 0.05, r * 0.22, r * 0.45, 0.2, 0, Math.PI * 2);
    ctx.ellipse(cx + r * 0.62, cy - r * 0.05, r * 0.22, r * 0.45, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const eyeY = cy - r * 0.08;
  const eyeOffset = r * 0.28;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(cx - eyeOffset, eyeY, r * 0.14, r * 0.1, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + eyeOffset, eyeY, r * 0.14, r * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1a1a1a";
  ctx.beginPath();
  ctx.arc(cx - eyeOffset, eyeY, r * 0.06, 0, Math.PI * 2);
  ctx.arc(cx + eyeOffset, eyeY, r * 0.06, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = gender === "male" ? "#5a3d2b" : "#c97b63";
  ctx.lineWidth = gender === "male" ? 3 : 2;
  ctx.beginPath();
  if (gender === "male") {
    ctx.moveTo(cx - r * 0.12, cy + r * 0.22);
    ctx.lineTo(cx + r * 0.12, cy + r * 0.22);
  } else {
    ctx.arc(cx, cy + r * 0.25, r * 0.1, 0.1, Math.PI - 0.1);
  }
  ctx.stroke();

  const url = canvas.toDataURL("image/png");
  textureCache.set(key, url);
  return url;
}

export function shouldUsePresetHead(
  headSource: string | undefined,
  photoURL?: string | null,
): boolean {
  if (headSource === "preset") return true;
  if (headSource === "photo") return false;
  return !photoURL?.trim();
}
