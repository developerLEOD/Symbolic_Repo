import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      const ext = path.extname(entry.name);
      const rawName = path.basename(entry.name, ext);
      const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, " ");
      const serialNum = `SYM-${categoryPrefix}-${String(counter).padStart(2, "0")}`;
      counter++;

      let targetLayer: "mid" | "bg" | "fg" | "backdrop" = layer === "auto" ? "mid" : layer;
      if (dirPath.includes("avatar")) targetLayer = "mid";
      else if (dirPath.includes("background")) targetLayer = "bg";
      else if (dirPath.includes("foreground")) targetLayer = "fg";
      else if (dirPath.includes("backdrop")) targetLayer = "backdrop";

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

const root = path.resolve(__dirname, '..');
const publicHeroDir = path.resolve(root, "public", "assets", "hero");
scanDirectory(publicHeroDir, "/assets/hero", "auto", "HERO");

const srcHeroDir = path.resolve(root, "src", "assets", "hero");
scanDirectory(srcHeroDir, "/src/assets/hero", "auto", "HERO");

const srcImagesDir = path.resolve(root, "src", "assets", "images");
scanDirectory(srcImagesDir, "/src/assets/images", "mid", "IMG");

fs.writeFileSync(path.resolve(root, "public", "assets-manifest.json"), JSON.stringify({ success: true, count: graphics.length, graphics }, null, 2));
console.log(`Manifest generated with ${graphics.length} graphics.`);
