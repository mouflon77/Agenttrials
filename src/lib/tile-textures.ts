import {
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

export function loadPixelTexture(url: string): Promise<Texture> {
  const cached = textureCache.get(url);
  if (cached) return Promise.resolve(cached);

  const pending = textureLoads.get(url);
  if (pending) return pending;

  const promise = new Promise<Texture>((resolve, reject) => {
    const loader = new TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (loaded) => {
        configureTileTexture(loaded, url);
        textureCache.set(url, loaded);
        textureLoads.delete(url);
        resolve(loaded);
      },
      undefined,
      (error) => {
        textureLoads.delete(url);
        reject(error);
      },
    );
  });

  textureLoads.set(url, promise);
  return promise;
}

export function getCachedPixelTexture(url: string): Texture | undefined {
  return textureCache.get(url);
}

export function applyGridRepeat(texture: Texture, repeatX: number, repeatY: number) {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.needsUpdate = true;
}
