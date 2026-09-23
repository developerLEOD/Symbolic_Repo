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
 * Resizes and optimizes an image data URL using an offscreen canvas with high visual fidelity.
 * Preserves crisp textures, typography, and calligraphy without aggressive compression artifacts.
 */
export async function compressDataUrl(
  dataUrl: string,
  maxDimension = 1600,
  quality = 0.88
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== "string") return dataUrl;
  
  // Non-data URLs (such as static asset paths or remote URLs) don't consume Firestore document size
  if (!dataUrl.startsWith("data:image/")) {
    return dataUrl;
  }

  // Vector graphics (SVG) or already reasonable data URLs (< 80KB) don't need re-compression
  if (dataUrl.startsWith("data:image/svg+xml") || dataUrl.length < 80000) {
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

        // If image already fits comfortably within dimensions and is not gigantic in bytes, keep pristine
        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 350000) {
          resolve(dataUrl);
          return;
        }

        // Scale down gracefully to maxDimension while preserving aspect ratio
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

        // Enable high-quality image smoothing for crisp downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const isPng = dataUrl.startsWith("data:image/png");
        
        // If not PNG or if exporting to JPEG, provide neutral clean canvas
        if (!isPng) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first for optimal clarity-to-size ratio, fallback to JPEG
        let optimized = "";
        try {
          optimized = canvas.toDataURL("image/webp", quality);
          if (!optimized.startsWith("data:image/webp")) {
            // Browser doesn't support WebP export, use JPEG
            optimized = canvas.toDataURL("image/jpeg", quality);
          }
        } catch {
          optimized = canvas.toDataURL("image/jpeg", quality);
        }

        // Only apply a secondary pass if image exceeds safe single-field budget (> 450KB)
        if (optimized.length > 450000) {
          const secondaryCanvas = document.createElement("canvas");
          const sWidth = Math.round(width * 0.85);
          const sHeight = Math.round(height * 0.85);
          secondaryCanvas.width = sWidth;
          secondaryCanvas.height = sHeight;
          const sCtx = secondaryCanvas.getContext("2d");
          if (sCtx) {
            sCtx.imageSmoothingEnabled = true;
            sCtx.imageSmoothingQuality = "high";
            if (!isPng) {
              sCtx.fillStyle = "#FFFFFF";
              sCtx.fillRect(0, 0, sWidth, sHeight);
            }
            sCtx.drawImage(img, 0, 0, sWidth, sHeight);
            optimized = secondaryCanvas.toDataURL("image/jpeg", 0.82);
          }
        }

        // Return the smaller of original or optimized
        if (optimized.length < dataUrl.length) {
          resolve(optimized);
        } else {
          resolve(dataUrl);
        }
      } catch (e) {
        console.warn("Canvas image optimization failed, using original:", e);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Reads an uploaded file and returns an optimized, high-fidelity Base64 data URL.
 */
export async function processFileToCompressedDataUrl(
  file: File,
  maxDimension = 1600,
  quality = 0.88
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
 * Stamps a permanent, sophisticated brutalist archival watermark directly onto
 * the pixel canvas of an Artifact graphic image.
 * Ensures the image is protected even if downloaded, screenshotted, or shared outside the app.
 */
export async function applyArchivalWatermarkToCanvas(
  dataUrl: string,
  artifactName?: string,
  artifactId?: string
): Promise<string> {
  if (!dataUrl || typeof dataUrl !== "string") return dataUrl;
  if (dataUrl.startsWith("data:image/svg+xml")) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve(dataUrl);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        // Draw original graphic
        ctx.drawImage(img, 0, 0, width, height);

        const displayName = (artifactName || "CANONICAL ARTIFACT").toUpperCase();
        const displayId = (artifactId || "SYM-ART").toUpperCase();

        // 1. Technical Corner Reticles
        const cornerMargin = Math.max(16, Math.round(width * 0.03));
        const crossSize = Math.max(12, Math.round(width * 0.02));
        ctx.strokeStyle = "rgba(120, 120, 120, 0.4)";
        ctx.lineWidth = Math.max(1.5, Math.round(width * 0.002));

        const drawCross = (cx: number, cy: number) => {
          ctx.beginPath();
          ctx.moveTo(cx - crossSize / 2, cy);
          ctx.lineTo(cx + crossSize / 2, cy);
          ctx.moveTo(cx, cy - crossSize / 2);
          ctx.lineTo(cx, cy + crossSize / 2);
          ctx.stroke();
        };

        drawCross(cornerMargin, cornerMargin);
        drawCross(width - cornerMargin, cornerMargin);
        drawCross(cornerMargin, height - cornerMargin);
        drawCross(width - cornerMargin, height - cornerMargin);

        // 2. Diagonal Repeating Watermark Ribbon
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((-28 * Math.PI) / 180);

        const baseFontSize = Math.max(14, Math.round(width * 0.028));
        ctx.font = `900 ${baseFontSize}px monospace, ui-monospace, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Center primary watermark bar
        const mainText = `• SYMBOLIC MUSLIMS // ${displayName} // ${displayId} •`;
        ctx.fillStyle = "rgba(100, 100, 100, 0.28)";
        ctx.fillText(mainText, 0, 0);

        // Sub text streams above and below
        const subFontSize = Math.max(10, Math.round(baseFontSize * 0.72));
        ctx.font = `800 ${subFontSize}px monospace, ui-monospace, sans-serif`;
        ctx.fillStyle = "rgba(100, 100, 100, 0.2)";
        const spacingY = baseFontSize * 1.8;

        const subText1 = "SYMBOLIC MUSLIMS • CANONICAL ARTIFACT • ARCHIVAL REGISTER • DO NOT REPRODUCE";
        const subText2 = "AUTHENTIC DESIGN SPECIFICATION • SYMBOLIC ARCHIVE • PROPERTY OF SYMBOLIC";
        ctx.fillText(subText1, 0, -spacingY);
        ctx.fillText(subText2, 0, spacingY);

        ctx.restore();

        // 3. Archival Seal Box in Bottom Right
        const badgeWidth = Math.max(180, Math.round(width * 0.32));
        const badgeHeight = Math.max(28, Math.round(height * 0.055));
        const badgeX = width - cornerMargin - badgeWidth;
        const badgeY = height - cornerMargin - badgeHeight;

        ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
        ctx.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
        ctx.strokeStyle = "rgba(5, 5, 5, 0.65)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);

        // Badge Red accent block
        const accentSize = Math.max(6, Math.round(badgeHeight * 0.28));
        ctx.fillStyle = "#FF4500";
        ctx.fillRect(badgeX + 8, badgeY + (badgeHeight - accentSize) / 2, accentSize, accentSize);

        // Badge Text
        const badgeFontSize = Math.max(8, Math.round(badgeHeight * 0.36));
        ctx.font = `900 ${badgeFontSize}px monospace, ui-monospace, sans-serif`;
        ctx.fillStyle = "#050505";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(
          `SYMBOLIC // ARCHIVE PROOF`,
          badgeX + 10 + accentSize + 6,
          badgeY + badgeHeight / 2
        );

        // Export high-quality image with watermark baked in
        let watermarkedUrl = "";
        try {
          watermarkedUrl = canvas.toDataURL("image/webp", 0.9);
          if (!watermarkedUrl.startsWith("data:image/webp")) {
            watermarkedUrl = canvas.toDataURL("image/jpeg", 0.9);
          }
        } catch {
          watermarkedUrl = canvas.toDataURL("image/jpeg", 0.9);
        }

        resolve(watermarkedUrl || dataUrl);
      } catch (err) {
        console.warn("Watermarking canvas failed, falling back:", err);
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

/**
 * Sanitizes and optimizes an Artifact payload before writing to Firestore.
 * Preserves high quality while staying within the 1MB Firestore document budget.
 */
export async function sanitizeArtifactForFirestore(artifact: Artifact): Promise<Artifact> {
  const result: Artifact = { ...artifact };

  // Optimize graphic if it's a data URL (High-definition 1600px @ 88% quality)
  if (result.graphic && result.graphic.startsWith("data:image/")) {
    result.graphic = await compressDataUrl(result.graphic, 1600, 0.88);
  }

  // Optimize thumbnailImage if it's a data URL (Crisp 640px @ 85% quality)
  if (result.thumbnailImage && result.thumbnailImage.startsWith("data:image/")) {
    if (result.thumbnailImage === artifact.graphic && result.graphic) {
      result.thumbnailImage = result.graphic;
    } else {
      result.thumbnailImage = await compressDataUrl(result.thumbnailImage, 640, 0.85);
    }
  }

  // Optimize images array
  if (Array.isArray(result.images) && result.images.length > 0) {
    const optimizedImages: string[] = [];
    const imageCandidates = result.images.slice(0, 6);
    
    for (const img of imageCandidates) {
      if (!img) continue;
      if (img === artifact.graphic && result.graphic) {
        optimizedImages.push(result.graphic);
      } else if (img.startsWith("data:image/")) {
        const compressed = await compressDataUrl(img, 1600, 0.88);
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
    if (rawPayload.length > 850000) {
      // Document is approaching 850KB, apply targeted reduction
      if (result.graphic && result.graphic.startsWith("data:image/")) {
        result.graphic = await compressDataUrl(result.graphic, 1200, 0.80);
      }
      if (result.thumbnailImage && result.thumbnailImage.startsWith("data:image/")) {
        result.thumbnailImage = await compressDataUrl(result.thumbnailImage, 500, 0.78);
      }
      if (Array.isArray(result.images) && result.images.length > 3) {
        result.images = result.images.slice(0, 3);
      }
    }
  } catch (e) {
    // Ignore stringify error
  }

  return result;
}

/**
 * Sanitizes and optimizes a Specimen payload before writing to Firestore.
 */
export async function sanitizeSpecimenForFirestore(specimen: Specimen): Promise<Specimen> {
  const result: Specimen = { ...specimen };

  if (result.thumbnailImage && result.thumbnailImage.startsWith("data:image/")) {
    result.thumbnailImage = await compressDataUrl(result.thumbnailImage, 640, 0.85);
  }

  if (Array.isArray(result.images) && result.images.length > 0) {
    const optimizedImages: string[] = [];
    const imageCandidates = result.images.slice(0, 5);
    
    for (const img of imageCandidates) {
      if (!img) continue;
      if (img.startsWith("data:image/")) {
        const compressed = await compressDataUrl(img, 1600, 0.88);
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
 * Sanitizes and optimizes a Product payload before writing to Firestore.
 */
export async function sanitizeProductForFirestore(product: Product): Promise<Product> {
  const result: Product = { ...product };

  if (result.thumbnailImage && result.thumbnailImage.startsWith("data:image/")) {
    result.thumbnailImage = await compressDataUrl(result.thumbnailImage, 640, 0.85);
  }

  if (Array.isArray(result.images) && result.images.length > 0) {
    const optimizedImages: string[] = [];
    const imageCandidates = result.images.slice(0, 6);
    
    for (const img of imageCandidates) {
      if (!img) continue;
      if (img.startsWith("data:image/")) {
        const compressed = await compressDataUrl(img, 1600, 0.88);
        optimizedImages.push(compressed);
      } else {
        optimizedImages.push(img);
      }
    }
    result.images = Array.from(new Set(optimizedImages));
  }

  return result;
}
