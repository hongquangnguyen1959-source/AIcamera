/**
 * Fast client-side image compression & resizing utility.
 * Shrinks camera frames and uploaded images to optimal dimensions (max 960px)
 * reducing base64 payload size from ~5MB to ~80KB for ultra-fast Gemini OCR latency.
 */
export async function compressImageForOCR(
  dataUrl: string,
  maxDimension = 960,
  quality = 0.72
): Promise<string> {
  // If dataUrl is small already (< 400KB) and not SVG, return immediately without redundant canvas decode
  if (dataUrl.length < 400000 && !dataUrl.startsWith('data:image/svg')) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    // 3-second safety watchdog so promise never hangs
    const safetyTimer = setTimeout(() => {
      resolve(dataUrl);
    }, 3000);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(safetyTimer);
      try {
        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        if (!origW || !origH) {
          resolve(dataUrl);
          return;
        }

        const scale = Math.min(1, maxDimension / Math.max(origW, origH));
        const targetW = Math.max(1, Math.round(origW * scale));
        const targetH = Math.max(1, Math.round(origH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (e) {
        console.warn('Image compression fallback:', e);
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      clearTimeout(safetyTimer);
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}
