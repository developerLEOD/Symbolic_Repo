import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Server-side Gemini client (lazily initialized if key is provided)
export const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

import fs from "fs";

// Ensure separate directory for uploaded hero graphics exists
const heroUploadsDir = path.resolve(__dirname, "public", "uploads", "hero");
if (!fs.existsSync(heroUploadsDir)) {
  fs.mkdirSync(heroUploadsDir, { recursive: true });
}

// Serve /uploads statically in all environments
app.use("/uploads", express.static(path.resolve(__dirname, "public", "uploads")));

// Upload Hero Graphic to dedicated directory /public/uploads/hero
app.post("/api/upload-hero-graphic", (req, res) => {
  try {
    const { dataUrl, filename, name } = req.body;
    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ error: "Missing dataUrl" });
    }

    // Extract base64
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = "webp";

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes("png")) ext = "png";
      else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
      else if (mime.includes("webp")) ext = "webp";
      buffer = Buffer.from(matches[2], "base64");
    } else {
      buffer = Buffer.from(dataUrl, "base64");
    }

    const cleanName = (name || filename || "graphic")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, 32);
    const uniqueFilename = `hero_${Date.now()}_${cleanName}.${ext}`;
    const targetFilePath = path.join(heroUploadsDir, uniqueFilename);

    fs.writeFileSync(targetFilePath, buffer);

    // Sync to dist/uploads/hero if dist exists
    const distHeroDir = path.resolve(__dirname, "dist", "uploads", "hero");
    try {
      if (!fs.existsSync(distHeroDir)) {
        fs.mkdirSync(distHeroDir, { recursive: true });
      }
      fs.writeFileSync(path.join(distHeroDir, uniqueFilename), buffer);
    } catch {}

    const fileUrl = `/uploads/hero/${uniqueFilename}`;
    return res.json({
      success: true,
      url: fileUrl,
      filename: uniqueFilename,
      name: name || cleanName,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: err?.message || "Upload failed" });
  }
});

// Scan all repository hero graphics (code assets)
app.get("/api/scan-hero-graphics", (_req, res) => {
  try {
    const manifestPath = path.resolve(__dirname, "public", "assets-manifest.json");
    if (fs.existsSync(manifestPath)) {
      const manifest = fs.readFileSync(manifestPath, "utf-8");
      return res.setHeader("Content-Type", "application/json").send(manifest);
    }

    // Fallback to scanning for dev environment
    const graphics: any[] = [];
    const imageRegex = /\.(png|jpe?g|webp|svg)$/i;
    const scanDirectory = (dirPath: string, relativePrefix: string, layer: "mid" | "bg" | "fg" | "backdrop" | "auto", categoryPrefix: string) => {
      if (!fs.existsSync(dirPath)) return;
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      let counter = 0;
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subLayer = entry.name === "avatar" ? "mid" : entry.name === "background" ? "bg" : entry.name === "foreground" ? "fg" : entry.name === "backdrop" ? "backdrop" : layer;
          const prefix = entry.name === "avatar" ? "AV" : entry.name === "background" ? "BG" : entry.name === "foreground" ? "FG" : entry.name === "backdrop" ? "BD" : categoryPrefix;
          scanDirectory(path.join(dirPath, entry.name), `${relativePrefix}/${entry.name}`, subLayer, prefix);
        } else if (imageRegex.test(entry.name)) {
          // STRICT RULE: Only add files if they are in a known subfolder (layer !== "auto")
          // This prevents loose root images from being added as "fake" avatars.
          if (layer === "auto") continue;

          const ext = path.extname(entry.name);
          const rawName = path.basename(entry.name, ext);
          const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, " ");
          const serialNum = `SYM-${categoryPrefix}-${String(counter).padStart(2, "0")}`;
          counter++;
          
          let targetLayer: "mid" | "bg" | "fg" | "backdrop" = layer;
          const assetPath = `${relativePrefix}/${entry.name}`;
          
          graphics.push({
            id: `gfx_${categoryPrefix.toLowerCase()}_${counter}_${rawName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            serialNumber: serialNum,
            name: cleanName,
            assetPath,
            avatarUrl: assetPath,
            avatarAlt: cleanName,
            layer: targetLayer,
          });
        }
      }
    };

    const publicHeroDir = path.resolve(__dirname, "public", "assets", "hero");
    // Pass "auto" as initial layer to force subfolder scanning
    scanDirectory(publicHeroDir, "/assets/hero", "auto", "HERO");

    return res.json({ success: true, count: graphics.length, graphics });
  } catch (err: any) {
    console.error("Scan graphics error:", err);
    return res.status(500).json({ error: err?.message || "Failed to scan graphics" });
  }
});

// Hero JSON Metadata Endpoints (Zero-Firestore, fully decoupled)
app.get("/api/hero-config", (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const publicPath = path.resolve(__dirname, "public", "hero-config.json");
    const distPath = path.resolve(__dirname, "dist", "hero-config.json");
    const filePath = fs.existsSync(publicPath) ? publicPath : (fs.existsSync(distPath) ? distPath : null);

    if (filePath && fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return res.setHeader("Content-Type", "application/json").send(content);
    }
    return res.status(404).json({ error: "hero-config.json not found" });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to read hero config" });
  }
});

app.post("/api/hero-config", (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid hero config payload" });
    }

    const publicPath = path.resolve(__dirname, "public", "hero-config.json");
    let existing: any = {};
    if (fs.existsSync(publicPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(publicPath, "utf-8"));
      } catch {}
    }

    const payloadWithTimestamp = {
      ...existing,
      ...payload,
      updatedAt: Date.now(),
    };

    const jsonString = JSON.stringify(payloadWithTimestamp, null, 2);

    // Save to public/hero-config.json
    fs.writeFileSync(publicPath, jsonString, "utf-8");

    // In production or if dist exists, sync to dist
    const distPath = path.resolve(__dirname, "dist", "hero-config.json");
    try {
      if (fs.existsSync(path.dirname(distPath))) {
        fs.writeFileSync(distPath, jsonString, "utf-8");
      }
    } catch {}

    res.setHeader("Cache-Control", "no-store");
    return res.json({ success: true, config: payloadWithTimestamp });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to save hero config" });
  }
});

// Vite Middleware integration for development
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
