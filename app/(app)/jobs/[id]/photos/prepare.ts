// Browser-only: shrinks a picked photo before it is uploaded.

import { PHOTO_EXT } from "@/lib/photos";

/** Longest edge after downscaling, and the JPEG quality used. */
export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.85;
/** If the browser cannot decode a file, it is uploaded as-is only up to this size. */
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024;

export type PreparedPhoto = { blob: Blob; contentType: string; ext: string };

function loadImage(file: Blob): Promise<{ img: HTMLImageElement; release: () => void }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const release = () => URL.revokeObjectURL(url);
    const img = new Image();
    img.onload = () => resolve({ img, release });
    img.onerror = () => {
      release();
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", JPEG_QUALITY),
  );
}

/**
 * Redraws the image on a canvas at most MAX_EDGE px on its long side and
 * re-encodes it as JPEG. Browsers apply the EXIF rotation when drawing an
 * <img>, so the result is upright; re-encoding also drops EXIF (GPS included).
 * If the browser cannot read the file (e.g. HEIC on a Windows PC), a JPG /
 * PNG / WebP / GIF under 10 MB goes up unchanged; anything else is refused.
 */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  try {
    const { img, release } = await loadImage(file);
    try {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) throw new Error("empty image");
      const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      // JPEG has no transparency: paint white first so PNG cut-outs do not turn black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await toJpeg(canvas);
      return { blob, contentType: "image/jpeg", ext: "jpg" };
    } finally {
      release();
    }
  } catch {
    const ext = PHOTO_EXT[file.type];
    if (ext && file.size <= MAX_ORIGINAL_BYTES) return { blob: file, contentType: file.type, ext };
    throw new Error(
      ext
        ? "This picture is too big to upload unshrunk (over 10 MB) and this browser could not shrink it."
        : "This picture could not be read here. Use a JPG or PNG, or take the photo on your phone.",
    );
  }
}
