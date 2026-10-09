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

// Server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Gemini 3D Parametric Geometry & Spatial Architecture Endpoint
app.post("/api/3d/generate", async (req, res) => {
  try {
    const {
      prompt,
      artifactId,
      artifactName,
      medium,
      material,
      inscription,
      concept
    } = req.body || {};

    // Standard Curated Archetypes fallback dictionary
    const fallbackArchetypes: Record<string, any> = {
      default: {
        name: artifactName ? `${artifactName} // 3D Spatial Form` : "The Octagonal Stellation of Tawhid",
        classification: "Sacred Geometric Polyhedron // Khatam Sulayman",
        philosophicalMonograph: "A three-dimensional stereographic projection of the eight-pointed Islamic star (Khatam). Symmetrical interpenetration of twin cubes embodying celestial order, divine unity, and moral restraint in physical space.",
        geometryArchetype: medium?.toLowerCase().includes("vessel") 
          ? "stoneware_vessel" 
          : medium?.toLowerCase().includes("wear") || medium?.toLowerCase().includes("hoodie") || medium?.toLowerCase().includes("tee")
          ? "mannequin_torso"
          : "octagonal_stellation",
        mathematicalParameters: {
          proportions: "1 : 1.618 (Divine Golden Ratio)",
          symmetryGroup: "D8 Octagonal Dihedral Symmetries",
          tessellationOrder: 8,
          wireframeDensity: 24,
          scaleVector: [1.2, 1.2, 1.2],
          twistFactor: 0.15,
          bevelRadius: 0.08,
          radialSegments: 32
        },
        materialPhysics: {
          baseColor: "#141416",
          roughness: 0.65,
          metalness: 0.25,
          transmission: 0.05,
          wireframeColor: "#ff4500",
          ambientOcclusionIntensity: 0.8,
          finishType: "brutalist_concrete"
        },
        orbitalSatellites: [
          { name: "Orbital Axis Alpha", shape: "ring", distance: 2.4, speed: 0.8, size: 0.04, color: "#ff4500" },
          { name: "Tessellation Node 01", shape: "octahedron", distance: 2.1, speed: -0.6, size: 0.14, color: "#ffffff" },
          { name: "Tessellation Node 02", shape: "tetrahedron", distance: 2.7, speed: 0.4, size: 0.12, color: "#e2e8f0" }
        ],
        inscriptionEngraving: {
          arabicText: inscription || "كن ذا رمزية",
          transliteration: "Kun Dha Ramziyyah",
          englishTranslation: "BE SYMBOLIC // Wear conviction, not logos",
          coordinatePlacement: "equator"
        },
        lightingPreset: "atelier_neutral"
      }
    };

    if (process.env.GEMINI_API_KEY) {
      try {
        const systemPrompt = `You are an elite 3D Computational Architect, Master of Islamic Sacred Geometry, and Industrial Designer for the SYMBOLIC atelier.
Your task is to compute and synthesize exact 3D spatial geometry parameters, physics-based materials, and orbital coordinates for an interactive Three.js WebGL viewport.

Given an Artifact or user directive:
- Artifact: ${artifactName || "Sacred Symbolic Object"}
- Medium: ${medium || "Architectural Specimen"}
- Material: ${material || "480 GSM Cotton / Stoneware Ceramic / Brutalist Granite"}
- Inscription: ${inscription || "SYMBOLIC"}
- Concept: ${concept || "Spiritual and moral self-representation"}
- User Directive: ${prompt || "Synthesize authentic 3D spatial geometry"}

You must select the most fitting 'geometryArchetype' from:
1. "octagonal_stellation": 8-point Islamic star polyhedron (Khatam Sulayman)
2. "monolithic_prism": Heavy brutalist monolith with chamfered faces
3. "stoneware_vessel": Lathed contemplation ceramic urn with weighted base
4. "torus_infinity": Continuous topological knot of steadfast conviction
5. "dodecahedron_talisman": 12-sided faceted sacred polyhedron
6. "mannequin_torso": Sculptural drop-shoulder heavyweight garment silhouette
7. "geodesic_polyhedron": Spherical sacred geodesic dome

Return ONLY valid JSON matching this exact structure:
{
  "name": "string (Short poetic title in uppercase)",
  "classification": "string (Architectural classification)",
  "philosophicalMonograph": "string (1-2 sentences explaining the geometric and moral symbolism)",
  "geometryArchetype": "octagonal_stellation | monolithic_prism | stoneware_vessel | torus_infinity | dodecahedron_talisman | mannequin_torso | geodesic_polyhedron",
  "mathematicalParameters": {
    "proportions": "string",
    "symmetryGroup": "string",
    "tessellationOrder": number (4, 6, 8, or 12),
    "wireframeDensity": number (12 to 48),
    "scaleVector": [number, number, number],
    "twistFactor": number (0.0 to 1.0),
    "bevelRadius": number (0.01 to 0.2),
    "radialSegments": number (16 to 64)
  },
  "materialPhysics": {
    "baseColor": "string hex (e.g. #121214, #27272a, #d97706, #09090b)",
    "roughness": number (0.0 to 1.0),
    "metalness": number (0.0 to 1.0),
    "transmission": number (0.0 to 0.5),
    "wireframeColor": "string hex (e.g. #ff4500, #38bdf8, #f59e0b, #ffffff)",
    "ambientOcclusionIntensity": number (0.5 to 1.0),
    "finishType": "brutalist_concrete | obsidian_stone | unbleached_cotton | matte_ceramic | brushed_brass"
  },
  "orbitalSatellites": [
    {
      "name": "string",
      "shape": "sphere | tetrahedron | octahedron | ring",
      "distance": number (1.8 to 3.5),
      "speed": number (-1.5 to 1.5),
      "size": number (0.08 to 0.25),
      "color": "string hex"
    }
  ],
  "inscriptionEngraving": {
    "arabicText": "string",
    "transliteration": "string",
    "englishTranslation": "string",
    "coordinatePlacement": "zenith | equator | nadir"
  },
  "lightingPreset": "atelier_neutral | high_contrast_noir | warm_amber_sanctuary"
}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt || `Synthesize 3D geometry for ${artifactName || "Sacred Artifact"} (${medium || "Specimen"})`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          return res.json({
            success: true,
            source: "gemini-3.8-flash",
            data: parsed
          });
        }
      } catch (geminiError: any) {
        console.warn("Gemini 3D generation notice (using curated parametric fallback):", geminiError?.message);
      }
    }

    // Dynamic tailored fallback if Gemini is offline or rate-limited
    const dynamicFallback = { ...fallbackArchetypes.default };
    if (artifactName) dynamicFallback.name = `${artifactName.toUpperCase()} // 3D SPATIAL SPECIMEN`;
    if (inscription) dynamicFallback.inscriptionEngraving.arabicText = inscription;
    if (medium?.toLowerCase().includes("vessel") || artifactName?.toLowerCase().includes("vessel")) {
      dynamicFallback.geometryArchetype = "stoneware_vessel";
      dynamicFallback.classification = "1,280°C High-Fire Stoneware Vessel // Lathe Geometry";
      dynamicFallback.materialPhysics.finishType = "matte_ceramic";
      dynamicFallback.materialPhysics.baseColor = "#262626";
      dynamicFallback.materialPhysics.roughness = 0.85;
    } else if (medium?.toLowerCase().includes("wear") || medium?.toLowerCase().includes("hoodie") || medium?.toLowerCase().includes("tee")) {
      dynamicFallback.geometryArchetype = "mannequin_torso";
      dynamicFallback.classification = "480 GSM Heavyweight Garment Silhouette // Boxy Armor";
      dynamicFallback.materialPhysics.finishType = "unbleached_cotton";
      dynamicFallback.materialPhysics.baseColor = "#0f0f11";
      dynamicFallback.materialPhysics.roughness = 0.95;
    }

    return res.json({
      success: true,
      source: "curated_parametric_engine",
      data: dynamicFallback
    });
  } catch (err: any) {
    console.error("Error generating 3D element:", err);
    return res.status(500).json({ error: err?.message || "Failed to generate 3D element" });
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
