import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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

// Hero JSON Metadata Endpoints (Zero-Firestore, fully decoupled)
app.get("/api/hero-config", (_req, res) => {
  try {
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

    const payloadWithTimestamp = {
      ...payload,
      updatedAt: Date.now(),
    };

    const jsonString = JSON.stringify(payloadWithTimestamp, null, 2);

    // Save to public/hero-config.json
    const publicPath = path.resolve(__dirname, "public", "hero-config.json");
    fs.writeFileSync(publicPath, jsonString, "utf-8");

    // Also sync to src/data/heroConfig.json if directory exists
    const srcDataPath = path.resolve(__dirname, "src", "data", "heroConfig.json");
    try {
      if (fs.existsSync(path.dirname(srcDataPath))) {
        fs.writeFileSync(srcDataPath, jsonString, "utf-8");
      }
    } catch {}

    // In production, also sync to dist if present
    const distPath = path.resolve(__dirname, "dist", "hero-config.json");
    try {
      if (fs.existsSync(path.dirname(distPath))) {
        fs.writeFileSync(distPath, jsonString, "utf-8");
      }
    } catch {}

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
