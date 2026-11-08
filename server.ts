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
