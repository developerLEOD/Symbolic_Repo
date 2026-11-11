# SYMBOLIC MUSLIMS — Artifact & Specimen Architecture (Code Repository)

Welcome to the Code-Based Artifact Repository. Artifacts and specimens are defined directly in code here instead of relying on the Firestore database, ensuring zero quota limits, instant loads, and complete version control.

---

## Directory Hierarchy

```text
Artifacts/
├── README.md
├── [artifact_folder_name]/              (e.g., sumud, status-resisting, alif)
│   ├── artifact.json                   (Defines artifact identity, philosophy, pillars)
│   ├── preview.png                     (Main graphic/cover image for the artifact)
│   │
│   ├── hoodie/                         (Specimen folder)
│   │   ├── specimen.json               (Universal specimen format)
│   │   └── preview.png                 (Physical specimen mockup/photo)
│   │
│   ├── t-shirt/
│   │   ├── specimen.json
│   │   └── preview.png
│   │
│   ├── full-sleeve/
│   │   ├── specimen.json
│   │   └── preview.png
│   │
│   ├── p-caps/
│   │   ├── specimen.json
│   │   └── preview.png
│   │
│   └── [any-other-specimen-medium]/
│       ├── specimen.json
│       └── preview.png
```

---

## 1. Universal Specimen JSON Format (`specimen.json`)

Every specimen uses this exact format. You can fill out or adjust the fields for any medium (hoodie, t-shirt, full sleeve, p-caps, mugs, tote bags, or any custom medium):

```json
{
  "id": "spec_sumud_hoodie",
  "medium": "Hoodie",
  "mediumCategory": "wear",
  "type": "Heavyweight 450 GSM",
  "sku": "SYM-SMD-HD-01",
  "price": 7500,
  "inventory": 50,
  "availability": true,
  "status": "available",
  "color": "Charcoal Black",
  "colorHex": "#1C1C1C",
  "availableColors": [
    { "id": "charcoal", "name": "Charcoal Black", "hex": "#1C1C1C" },
    { "id": "raw-ecru", "name": "Raw Ecru", "hex": "#F4F1EA" }
  ],
  "availableSizes": ["S", "M", "L", "XL", "2XL"],
  "material": "450 GSM Double-Faced French Terry Cotton",
  "weight": "450 GSM Heavyweight Fleece",
  "fabricGsm": "450",
  "fit": "Boxy Drop-Shoulder Relaxed Fit",
  "printMethod": "High-Density Puff & Screen Print",
  "edition": "050 SPECIMENS // SERIES 01",
  "editionDetails": "Archival Studio Allocation",
  "careInstructions": "Machine wash cold inside out // Air dry",
  "finish": "Enzyme Washed Heavyweight Fleece",
  "dimensions": "",
  "capacity": "",
  "previewImage": "preview.png",
  "images": ["preview.png"]
}
```

### Specimen Field Guide
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique identifier (e.g. `spec_sumud_hoodie`) |
| `medium` | string | Specimen medium name (e.g. `Hoodie`, `T-Shirt`, `Full Sleeve`, `P-Cap`, `Mug`, `Tote Bag`) |
| `mediumCategory` | string | Category: `"wear"` \| `"headwear"` \| `"vessels"` \| `"carry"` |
| `type` | string | Subtype / cut (e.g. `Drop Shoulder`, `Heavyweight 450 GSM`, `Structured 6-Panel`) |
| `sku` | string | Inventory SKU code (e.g. `SYM-SMD-HD-01`) |
| `price` | number | Price in local currency units (e.g. `7500`) |
| `inventory` | number | Stock units count |
| `availability` | boolean | `true` for public visibility, `false` to hide |
| `status` | string | `"available"` \| `"sold_out"` \| `"draft"` |
| `color` | string | Default color name |
| `colorHex` | string | Hex code for color swatch (e.g. `"#1C1C1C"`) |
| `availableColors` | array | List of `{ "id", "name", "hex" }` color choices |
| `availableSizes` | array | List of size strings, e.g. `["S", "M", "L", "XL"]` or `["One Size"]` |
| `material` | string | Fabric/construction description |
| `weight` | string | Fabric or product weight |
| `fabricGsm` | string | GSM numeric string (e.g. `"450"`) |
| `fit` | string | Cut and silhouette description |
| `printMethod` | string | Technique (embroidery, puff print, screen print, etc.) |
| `edition` | string | Edition badge (e.g. `"050 SPECIMENS // SERIES 01"`) |
| `editionDetails` | string | Allocation or release notes |
| `careInstructions`| string | Washing or care rules |
| `finish` | string | Material texture/finish |
| `dimensions` | string | Physical dimensions for non-wearables (e.g. bags: `"42cm x 38cm"`) |
| `capacity` | string | Liquid volume for vessels (e.g. mugs: `"380ml / 13oz"`) |
| `previewImage` | string | Filename in the folder (e.g. `"preview.png"`) |
| `images` | array | Array of image filenames in the same folder |

---

## 2. Artifact JSON Format (`artifact.json`)

Placed at the root of each artifact folder to define the philosophical concept and the 4 Pillars of Symbolic Representation:

```json
{
  "id": "art_sumud",
  "artifactId": "SYM-01",
  "name": "SUMUD",
  "shortDescription": "Steadfastness, rooted endurance, and unyielding ideological posture under pressure.",
  "description": "SUMUD represents unshakeable perseverance. Crafted with pure high-density typography and rooted geometric symmetry, this artifact serves as an emblem of enduring dignity and public witness.",
  "concept": "Steadfastness, rooted endurance, and unyielding posture",
  "inscription": "صُمُود",
  "pillar1Represents": "Rooted perseverance, patience (Sabr), and unyielding dignity under hardship.",
  "pillar2WhyChosen": "Chosen to embody the spirit of Palestinian steadfastness and timeless Islamic resistance.",
  "pillar3Communicates": "Communicates a silent, dignified declaration of resilience to the observer.",
  "pillar4WearerCarries": "The wearer carries the spiritual weight of steadfastness in daily public witness.",
  "symbolicTagline": "A symbol of rooted resilience and steadfast posture.",
  "collectionName": "Be Palestine",
  "tags": ["Series 01", "Steadfastness", "Heavyweight"],
  "status": "published",
  "order": 1,
  "setDiscountPercentage": 10
}
```

---

## 3. How Preview Images Work

- Place your preview image directly in the specimen folder, named `preview.png` (or `.jpg`, `.jpeg`, `.webp`).
- The application automatically bundles and maps it to the specimen!
- If multiple images are added to the folder, you can list them in the `images` array in `specimen.json`:
  ```json
  "images": ["preview.png", "back.png", "detail.png"]
  ```
- Similarly, placing `preview.png` in the artifact folder sets the primary graphic for the artifact.

---

## 4. How to Add a New Artifact

1. Create a new folder inside `Artifacts/` (e.g. `Artifacts/sabrun-jameel/`).
2. Add `artifact.json` and `preview.png`.
3. Create subfolders for each specimen type you want (e.g. `hoodie/`, `t-shirt/`, `full-sleeve/`, `p-caps/`).
4. In each subfolder, place `specimen.json` and `preview.png`.
5. That's it! The system automatically detects and compiles them into the live store catalog without requiring database writes.
