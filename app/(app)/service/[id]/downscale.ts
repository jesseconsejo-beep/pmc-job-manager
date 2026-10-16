// Client-side photo shrinking before upload: a phone photo (4000px, 3-6 MB)
// becomes a JPEG no larger than 1600px on its long edge (~300-600 KB).
// Re-encoding through a canvas also drops EXIF, including GPS location.

export const MAX_EDGE = 1600;
const QUALITY = 0.82;
const FALLBACK_MAX_BYTES = 8 * 1024 * 1024;
const FALLBACK_EXT: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type Prepared = { blob: Blob; ext: "jpg" | "png" | "webp"; contentType: string };

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" applies the camera's EXIF rotation.
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close() };
    } catch {
      // Older Safari: fall through to an <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export async function prepareImage(file: File): Promise<Prepared> {
  try {
    const img = await decode(file);
    try {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.fillStyle = "#fff"; // transparent PNGs get a white, not black, background
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img.source, 0, 0, w, h);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
      if (blob) return { blob, ext: "jpg", contentType: "image/jpeg" };
    } finally {
      img.release();
    }
  } catch {
    // Could not decode or encode here; try the original below.
  }
  const ext = FALLBACK_EXT[file.type];
  if (ext && file.size <= FALLBACK_MAX_BYTES) return { blob: file, ext, contentType: file.type };
  throw new Error(`Could not read ${file.name || "that image"}. Try a JPG or PNG photo.`);
}
