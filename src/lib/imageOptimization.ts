/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Image Optimization & Payload Sanitization
 * 
 * Ensures all image assets (Base64 data URLs, uploaded files, and graphics)
 * are cleanly compressed and bounded to prevent Firestore document size overflow (> 1MB limit).
 */

import { Artifact, Specimen, Product } from "../types";

/**
 * Resizes and compresses an image data URL using an offscreen canvas.
 * Produces crisp, lightweight JPEG/WebP representations (typically 30KB - 80KB).
 */
export async function compressDataUrl(
  dataUrl: string,
  maxDimension = 720,
  quality = 0.72
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== "string") return dataUrl;
  
  // Non-data URLs (such as static asset paths or remote URLs) don't consume Firestore document size
  if (!dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }

  // Vector graphics or already small data URLs (< 35KB) don't need re-compression
  if (dataUrl.startsWith("data:image/svg+xml") || dataUrl.length < 35000) {
    return dataUrl;
  }

  if (typeof document === "undefined") {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width <= 0 || height <= 0) {
          resolve(dataUrl);
          return;
        }

        // Scale down to fit maxDimension while preserving aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Fill background with white for transparency safety
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let compressed = canvas.toDataURL("image/jpeg", quality);

        // If still larger than 250KB, step down further
        if (compressed.length > 250000) {
          const smallerCanvas = document.createElement("canvas");
          const smallerWidth = Math.round(width * 0.75);
          const smallerHeight = Math.round(height * 0.75);
          smallerCanvas.width = smallerWidth;
          smallerCanvas.height = smallerHeight;
          const sCtx = smallerCanvas.getContext("2d");
          if (sCtx) {
            sCtx.fillStyle = "#FFFFFF";
            sCtx.fillRect(0, 0, smallerWidth, smallerHeight);
            sCtx.drawImage(img, 0, 0, smallerWidth, smallerHeight);
            compressed = smallerCanvas.toDataURL("image/jpeg", 0.65);
          }
        }

        // Return the smaller of original or compressed
        if (compressed.length < dataUrl.length) {
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      } catch (e) {
        console.warn("Canvas image compression failed, using original:", e);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Reads an uploaded file and returns an optimized, compressed Base64 data URL.
 */
export async function processFileToCompressedDataUrl(
  file: File,
  maxDimension = 720,
  quality = 0.72
): Promise<string> {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Provided file is not a valid image");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === "string") {
        try {
          const compressed = await compressDataUrl(reader.result, maxDimension, quality);
          resolve(compressed);
        } catch {
          resolve(reader.result);
        }
      } else {
        reject(new Error("Failed to read image data"));
      }
    };
    reader.onerror = () => reject(new Error("Error reading image file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Sanitizes and compresses an Artifact payload before writing to Firestore.
 * Enforces strict document budget to stay well below the 1MB Firestore limit.
 */
export async function sanitizeArtifactForFirestore(artifact: Artifact): Promise<Artifact> {
  const result: Artifact = { ...artifact };

  // Compress graphic if it's a data URL
  if (result.graphic && result.graphic.startsWith("data:image/")) {
    result.graphic = await compressDataUrl(result.graphic, 720, 0.72);
  }

  // Compress thumbnailImage if it's a data URL
  if (result.thumbnailImage && result.thumbnailImage.startsWith("data:image/")) {
    if (result.thumbnailImage === artifact.graphic && result.graphic) {
      result.thumbnailImage = result.graphic;
    } else {
      result.thumbnailImage = await compressDataUrl(result.thumbnailImage, 400, 0.70);
    }
  }

  // Compress images array
  if (Array.isArray(result.images) && result.images.length > 0) {
    const optimizedImages: string[] = [];
    // Limit to max 6 images per artifact to guarantee small document size
    const imageCandidates = result.images.slice(0, 6);
    
    for (const img of imageCandidates) {
      if (!img) continue;
      if (img === artifact.graphic && result.graphic) {
        optimizedImages.push(result.graphic);
      } else if (img.startsWith("data:image/")) {
        const compressed = await compressDataUrl(img, 720, 0.72);
        optimizedImages.push(compressed);
      } else {
        optimizedImages.push(img);
      }
    }
    // Deduplicate
    result.images = Array.from(new Set(optimizedImages));
  }

  // Emergency safety check: verify estimated document size
  try {
    const rawPayload = JSON.stringify(result);
    if (rawPayload.length > 700000) {
      // Document is approaching 700KB, perform ultra-compression
      if (result.graphic && result.graphic.startsWith("data:image/")) {
        result.graphic = await compressDataUrl(result.graphic, 480, 0.55);
      }
      if (result.thumbnailImage && result.thumbnailImage.startsWith("data:image/")) {
        result.thumbnailImage = await compressDataUrl(result.thumbnailImage, 300, 0.50);
      }
      if (Array.isArray(result.images) && result.images.length > 2) {
        result.images = result.images.slice(0, 2);
      }
    }
  } catch (e) {
    // Ignore stringify error
  }

  return result;
}

/**
 * Sanitizes and compresses a Specimen payload before writing to Firestore.
 */
export async function sanitizeSpecimenForFirestore(specimen: Specimen): Promise<Specimen> {
  const result: Specimen = { ...specimen };

  if (result.thumbnailImage && result.thumbnailImage.startsWith("data:image/")) {
    result.thumbnailImage = await compressDataUrl(result.thumbnailImage, 400, 0.70);
  }

  if (Array.isArray(result.images) && result.images.length > 0) {
    const optimizedImages: string[] = [];
    const imageCandidates = result.images.slice(0, 5);
    
    for (const img of imageCandidates) {
      if (!img) continue;
      if (img.startsWith("data:image/")) {
        const compressed = await compressDataUrl(img, 720, 0.72);
        optimizedImages.push(compressed);
      } else {
        optimizedImages.push(img);
      }
    }
    result.images = Array.from(new Set(optimizedImages));
  }

  return result;
}

/**
 * Sanitizes and compresses a Product payload before writing to Firestore.
 */
export async function sanitizeProductForFirestore(product: Product): Promise<Product> {
  const result: Product = { ...product };

  if (result.thumbnailImage && result.thumbnailImage.startsWith("data:image/")) {
    result.thumbnailImage = await compressDataUrl(result.thumbnailImage, 400, 0.70);
  }

  if (Array.isArray(result.images) && result.images.length > 0) {
    const optimizedImages: string[] = [];
    const imageCandidates = result.images.slice(0, 6);
    
    for (const img of imageCandidates) {
      if (!img) continue;
      if (img.startsWith("data:image/")) {
        const compressed = await compressDataUrl(img, 720, 0.72);
        optimizedImages.push(compressed);
      } else {
        optimizedImages.push(img);
      }
    }
    result.images = Array.from(new Set(optimizedImages));
  }

  return result;
}
