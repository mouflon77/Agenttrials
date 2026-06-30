export const MAX_TEXTURE_PX = 256;

export function clampTexturePx(value: number): number {
  return Math.min(MAX_TEXTURE_PX, Math.max(1, Math.round(value)));
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

export function validateTextureDimensions(
  width: number,
  height: number,
): string | null {
  if (width < 1 || height < 1) {
    return "Width and height must be at least 1px.";
  }
  if (width > MAX_TEXTURE_PX || height > MAX_TEXTURE_PX) {
    return `Maximum texture size is ${MAX_TEXTURE_PX}×${MAX_TEXTURE_PX}px.`;
  }
  return null;
}
