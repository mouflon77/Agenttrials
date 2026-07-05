import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Texture,
} from "three";
import { isSvgTextureUrl } from "@/lib/texture-utils";

const textureCache = new Map<string, Texture>();
const textureLoads = new Map<string, Promise<Texture>>();

export interface LoadTileTextureOptions {
  format?: "png" | "svg";
  pixelWidth?: number;
  pixelHeight?: number;
}

function textureCacheKey(url: string, options?: LoadTileTextureOptions): string {
  const isSvg = options?.format === "svg" || isSvgTextureUrl(url);
  if (!isSvg) return url;
  const w = options?.pixelWidth ?? 256;
  const h = options?.pixelHeight ?? 256;
  return `svg:${url}:${w}x${h}`;
}

export function configurePixelTexture(texture: Texture) {
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
}

/** Smooth filtering for SVG vectors (and other non-pixel art textures). */
export function configureVectorTexture(texture: Texture) {
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
}

export function configureTileTexture(texture: Texture, url: string) {
  if (isSvgTextureUrl(url)) {
    configureVectorTexture(texture);
  } else {
    configurePixelTexture(texture);
  }
}

function loadRasterTexture(url: string): Promise<Texture> {
  const promise = new Promise<Texture>((resolve, reject) => {
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (loaded) => {
        configurePixelTexture(loaded);
        resolve(loaded);
      },
      undefined,
      (error) => reject(error),
    );
  });
  return promise;
}

/** Rasterize SVG to a canvas — TextureLoader cannot load vector files. */
function loadSvgTexture(
  url: string,
  pixelWidth = 256,
  pixelHeight = 256,
): Promise<Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, pixelWidth);
      canvas.height = Math.max(1, pixelHeight);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not rasterize SVG."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const texture = new CanvasTexture(canvas);
      configureVectorTexture(texture);
      resolve(texture);
    };
    img.onerror = () => reject(new Error("Could not load SVG texture."));
    img.src = url;
  });
}

export function loadTileTexture(
  url: string,
  options?: LoadTileTextureOptions,
): Promise<Texture> {
  const cacheKey = textureCacheKey(url, options);
  const cached = textureCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = textureLoads.get(cacheKey);
  if (pending) return pending;

  const isSvg = options?.format === "svg" || isSvgTextureUrl(url);
  const promise = (isSvg
    ? loadSvgTexture(url, options?.pixelWidth ?? 256, options?.pixelHeight ?? 256)
    : loadRasterTexture(url)
  )
    .then((texture) => {
      textureCache.set(cacheKey, texture);
      textureLoads.delete(cacheKey);
      return texture;
    })
    .catch((error) => {
      textureLoads.delete(cacheKey);
      throw error;
    });

  textureLoads.set(cacheKey, promise);
  return promise;
}

/** @deprecated Use loadTileTexture */
export function loadPixelTexture(
  url: string,
  options?: LoadTileTextureOptions,
): Promise<Texture> {
  return loadTileTexture(url, options);
}

export function getCachedPixelTexture(
  url: string,
  options?: LoadTileTextureOptions,
): Texture | undefined {
  return textureCache.get(textureCacheKey(url, options));
}

export function applyGridRepeat(texture: Texture, repeatX: number, repeatY: number) {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
}
