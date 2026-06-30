import {
  NearestFilter,
  RepeatWrapping,
  TextureLoader,
  type Texture,
} from "three";

const textureCache = new Map<string, Texture>();
const textureLoads = new Map<string, Promise<Texture>>();

export function configurePixelTexture(texture: Texture) {
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
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
        configurePixelTexture(loaded);
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
