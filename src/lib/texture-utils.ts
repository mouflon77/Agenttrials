export const MAX_TEXTURE_PX = 256;

export type TextureFormat = "png" | "svg";

export function clampTexturePx(value: number): number {
  return Math.min(MAX_TEXTURE_PX, Math.max(1, Math.round(value)));
}

export function isSvgFile(file: File): boolean {
  return (
    file.type === "image/svg+xml" ||
    file.type === "image/svg" ||
    /\.svg$/i.test(file.name)
  );
}

export function isPngFile(file: File): boolean {
  return file.type === "image/png" || /\.png$/i.test(file.name);
}

export function isSupportedTextureFile(file: File): boolean {
  return isSvgFile(file) || isPngFile(file);
}

export function contentTypeForTexture(file: File): string {
  if (isSvgFile(file)) return "image/svg+xml";
  return "image/png";
}

export function formatForTexture(file: File): TextureFormat {
  return isSvgFile(file) ? "svg" : "png";
}

/** Scale dimensions to fit within MAX_TEXTURE_PX while preserving aspect ratio. */
export function fitTextureDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const max = Math.max(w, h);
  if (max <= MAX_TEXTURE_PX) {
    return { width: Math.round(w), height: Math.round(h) };
  }
  const scale = MAX_TEXTURE_PX / max;
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

function parseSvgLength(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = raw.trim().match(/^([\d.]+)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Read width/height from SVG markup (viewBox or width/height attrs). */
export function parseSvgDimensions(svgText: string): {
  width: number;
  height: number;
} {
  const viewBox = svgText.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBox) {
    const parts = viewBox[1]
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (
      parts.length === 4 &&
      parts.every((n) => Number.isFinite(n)) &&
      parts[2] > 0 &&
      parts[3] > 0
    ) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const widthAttr = svgText.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
  const heightAttr = svgText.match(/\bheight\s*=\s*["']([^"']+)["']/i);
  const width = parseSvgLength(widthAttr?.[1]);
  const height = parseSvgLength(heightAttr?.[1]);
  if (width && height) return { width, height };
  if (width) return { width, height: width };
  if (height) return { width: height, height };

  return { width: 64, height: 64 };
}

export function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}

export async function readTextureDimensions(file: File): Promise<{
  width: number;
  height: number;
  format: TextureFormat;
}> {
  if (!isSupportedTextureFile(file)) {
    throw new Error("Only PNG and SVG files are supported.");
  }

  if (isSvgFile(file)) {
    const text = await file.text();
    if (!/<svg[\s>]/i.test(text)) {
      throw new Error("File does not look like a valid SVG.");
    }
    const dims = parseSvgDimensions(text);
    return { ...fitTextureDimensions(dims.width, dims.height), format: "svg" };
  }

  const dims = await readImageDimensions(file);
  return { ...dims, format: "png" };
}

export function validateTextureDimensions(
  width: number,
  height: number,
): string | null {
  if (width < 1 || height < 1) {
    return "Width and height must be at least 1px.";
  }
  if (width > MAX_TEXTURE_PX || height > MAX_TEXTURE_PX) {
    return `Maximum display size is ${MAX_TEXTURE_PX}×${MAX_TEXTURE_PX}px (64px = 1 tile).`;
  }
  return null;
}

export function isSvgTextureUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes(".svg")) return true;
  try {
    return new URL(url).pathname.toLowerCase().includes(".svg");
  } catch {
    return false;
  }
}
