/**
 * Preload a list of image paths and emit aggregate progress (0-100).
 * Errors are treated as complete so one broken asset does not block startup.
 */
export async function preloadImages(
  paths: string[],
  onProgress?: (progress: number) => void,
): Promise<void> {
  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const total = uniquePaths.length;

  if (total === 0) {
    onProgress?.(100);
    return;
  }

  let completed = 0;
  const emitProgress = () => onProgress?.((completed / total) * 100);

  await Promise.all(
    uniquePaths.map(
      (path) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          const finalize = () => {
            completed += 1;
            emitProgress();
            resolve();
          };

          img.onload = finalize;
          img.onerror = finalize;
          img.src = path;
        }),
    ),
  );
}
