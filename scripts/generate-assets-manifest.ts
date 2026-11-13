import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const graphics: any[] = [];
const imageRegex = /\.(png|jpe?g|webp|svg)$/i;

const scanDirectory = (dirPath: string, relativePrefix: string, layer: "mid" | "bg" | "fg" | "backdrop" | "auto", categoryPrefix: string) => {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs
    .readdirSync(dirPath, { withFileTypes: true })
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );

  let counter = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subLayer = entry.name === "avatar" ? "mid" : entry.name === "background" ? "bg" : entry.name === "foreground" ? "fg" : entry.name === "backdrop" ? "backdrop" : layer;
      const prefix = entry.name === "avatar" ? "AV" : entry.name === "background" ? "BG" : entry.name === "foreground" ? "FG" : entry.name === "backdrop" ? "BD" : categoryPrefix;
      scanDirectory(path.join(dirPath, entry.name), `${relativePrefix}/${entry.name}`, subLayer, prefix);
    } else if (imageRegex.test(entry.name)) {
      if (layer === "auto") continue;

      const ext = path.extname(entry.name);
      const rawName = path.basename(entry.name, ext);
      const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, " ").trim() || rawName;
      const serialNum = `SYM-${categoryPrefix}-${String(counter).padStart(2, "0")}`;
      counter++;

      const assetPath = `${relativePrefix}/${entry.name}`;
      const safeSlug = rawName.toLowerCase().replace(/[^a-z0-9]/g, "") || `item${counter}`;
      graphics.push({
        id: `gfx_${categoryPrefix.toLowerCase()}_${counter}_${safeSlug}`,
        serialNumber: serialNum,
        name: cleanName,
        assetPath,
        avatarUrl: assetPath,
        avatarAlt: cleanName,
        layer,
      });
    }
  }
};

const root = path.resolve(__dirname, '..');
const publicHeroDir = path.resolve(root, "public", "assets", "hero");
scanDirectory(publicHeroDir, "/assets/hero", "auto", "HERO");

// Manifest generated strictly from public assets

fs.writeFileSync(path.resolve(root, "public", "assets-manifest.json"), JSON.stringify({ success: true, count: graphics.length, graphics }, null, 2));
console.log(`Manifest generated with ${graphics.length} graphics.`);
