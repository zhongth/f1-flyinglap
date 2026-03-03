import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

// Global model cache — persists across component mounts/unmounts
const modelCache = new Map<string, GLTF>();
const loader = new GLTFLoader();

/**
 * Clone a cached GLTF scene for use in the 3D viewport.
 * Materials are cloned so each instance can be independently
 * modified (opacity, transparency) and disposed without affecting the cache.
 */
export function cloneCachedScene(path: string): THREE.Group | null {
  const cached = modelCache.get(path);
  if (!cached) return null;

  const clone = cached.scene.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !child.material) return;
    if (Array.isArray(child.material)) {
      child.material = child.material.map((m: THREE.Material) => m.clone());
    } else {
      child.material = child.material.clone();
    }
  });

  return clone;
}

/**
 * Check whether a model path is already cached.
 */
export function isModelCached(path: string): boolean {
  return modelCache.has(path);
}

/**
 * Preload an array of GLB model paths.
 * Reports smooth per-byte progress across all files (0–100).
 */
export async function preloadAllModels(
  paths: string[],
  onProgress?: (progress: number) => void,
): Promise<void> {
  const uniquePaths = [...new Set(paths)];
  const total = uniquePaths.length;
  if (total === 0) return;

  // Per-model progress tracker (0–1 each)
  const perModel = new Float32Array(total);

  function emitProgress() {
    let sum = 0;
    for (let i = 0; i < total; i++) sum += perModel[i];
    onProgress?.((sum / total) * 100);
  }

  const promises = uniquePaths.map(
    (path, idx) =>
      new Promise<void>((resolve) => {
        // Already cached from a previous session / hot reload
        if (modelCache.has(path)) {
          perModel[idx] = 1;
          emitProgress();
          resolve();
          return;
        }

        loader.load(
          path,
          (gltf) => {
            modelCache.set(path, gltf);
            perModel[idx] = 1;
            emitProgress();
            resolve();
          },
          (event) => {
            if (event.lengthComputable) {
              perModel[idx] = event.loaded / event.total;
            } else {
              // Rough estimate (~45 MB average per model)
              perModel[idx] = Math.min(
                event.loaded / (45 * 1024 * 1024),
                0.95,
              );
            }
            emitProgress();
          },
          (error) => {
            console.warn(`[modelPreloader] failed to load: ${path}`, error);
            perModel[idx] = 1; // don't block the rest
            emitProgress();
            resolve();
          },
        );
      }),
  );

  await Promise.all(promises);
}
