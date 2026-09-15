/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Artifact & Specimen Architecture Service
 * 
 * CORE SYSTEM ARCHITECTURE:
 * - Artifact: The design, intellectual work, and symbolic concept (e.g. SUMUD).
 * - Specimen: The physical manifestation in a medium (e.g. SUMUD T-Shirt, SUMUD P-Cap).
 * - Artifact Set: The complete bundled collection of specimens for an artifact.
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  Artifact, 
  Specimen, 
  ArtifactWithSpecimens, 
  SpecimenMediumConfig, 
  Product,
  ArtifactStatus,
  SpecimenStatus
} from "../types";
import { PRESET_SYMBOL_KNOWLEDGE } from "./symbolKnowledge";
import capImage from "../assets/images/structured_twill_cap_1789233572064.jpg";
import vesselImage from "../assets/images/ceramic_stoneware_vessel_1789233585625.jpg";
import hoodieImage from "../assets/images/falasteen_kuffiyeh_hoodie_1789233545448.jpg";
import bagImage from "../assets/images/canvas_field_bag_1789233558525.jpg";
import heroImage from "../assets/images/store_hero_editorial_1788008309317.jpg";
import mugSymbolicImage from "../assets/images/mug_be_symbolic_1788008321905.jpg";
import mugClarityImage from "../assets/images/mug_find_clarity_1788008345150.jpg";
import mugWisdomImage from "../assets/images/mug_seek_wisdom_1788008333595.jpg";

export const ARTIFACTS_CACHE_KEY = "symbolic_artifacts_v1";
export const SPECIMENS_CACHE_KEY = "symbolic_specimens_v1";

// Configurable & extensible specimen mediums
export const CANONICAL_SPECIMEN_MEDIUMS: SpecimenMediumConfig[] = [
  {
    id: "t-shirt",
    name: "T-Shirt",
    category: "wear",
    description: "Heavyweight Boxy Drop-Shoulder combed jersey armor.",
    defaultGarmentTypes: ["Drop Shoulder", "Oversized Fit", "Regular Boxy Cut"],
    defaultSizes: ["S", "M", "L", "XL", "2XL"],
    defaultPrice: 4200
  },
  {
    id: "hoodie",
    name: "Hoodie",
    category: "wear",
    description: "Dense 450 GSM double-faced French Terry pullover with crossover hood.",
    defaultGarmentTypes: ["Heavyweight 450 GSM", "Double-Faced Fleece"],
    defaultSizes: ["S", "M", "L", "XL"],
    defaultPrice: 7500
  },
  {
    id: "full-sleeve",
    name: "Full Sleeve",
    category: "wear",
    description: "320 GSM interlock thermal long-sleeve with rib-knit cuffs.",
    defaultGarmentTypes: ["Boxy Ribbed Cuff", "Relaxed Crewneck"],
    defaultSizes: ["S", "M", "L", "XL"],
    defaultPrice: 5000
  },
  {
    id: "p-cap",
    name: "P-Cap",
    category: "headwear",
    description: "Structured 6-panel brushed cotton twill with tonal embroidery & brass clasp.",
    defaultGarmentTypes: ["Structured 6-Panel", "Unstructured Low-Profile"],
    defaultSizes: ["One Size // Adjustable Brass Clasp"],
    defaultPrice: 2500
  },
  {
    id: "mug",
    name: "Mug",
    category: "vessels",
    description: "380ml dense high-fired artisan stoneware with debossed insignia.",
    defaultGarmentTypes: ["Dense Artisan Stoneware", "Matte Ceramic Studio Cup"],
    defaultSizes: ["380ml / 13oz"],
    defaultPrice: 1800
  },
  {
    id: "tote-bag",
    name: "Tote Bag",
    category: "carry",
    description: "18 oz heavy industrial cotton canvas utility field carrier.",
    defaultGarmentTypes: ["18oz Heavy Cotton Canvas", "Structured Field Carrier"],
    defaultSizes: ["Standard Utility // 42cm x 38cm"],
    defaultPrice: 3200
  }
];

export function getMediumConfig(mediumName: string): SpecimenMediumConfig {
  const normalized = (mediumName || "").toLowerCase().trim().replace(/\s+/g, "-");
  const found = CANONICAL_SPECIMEN_MEDIUMS.find(m => 
    m.id === normalized || 
    m.name.toLowerCase() === (mediumName || "").toLowerCase() ||
    (mediumName || "").toLowerCase().includes(m.name.toLowerCase())
  );
  if (found) return found;

  return {
    id: normalized || "custom-medium",
    name: mediumName || "Custom Medium",
    category: "wear",
    defaultSizes: ["One Size"],
    defaultPrice: 2000
  };
}

// Canonical Pre-curated Flagship Artifacts and Specimens
export const SEED_SPECIMENS: Specimen[] = [
  // --- SUMUD SPECIMENS ---
  {
    id: "spec_sumud_tshirt",
    parentArtifactId: "art_sumud",
    medium: "T-Shirt",
    mediumCategory: "wear",
    type: "Drop Shoulder",
    garmentType: "Drop Shoulder",
    sku: "SYM-SMD-TSH",
    price: 4500,
    inventory: 50,
    availability: true,
    status: "available",
    images: [heroImage],
    color: "Charcoal Black",
    colorHex: "#181818",
    availableColors: [
      { id: "charcoal", name: "Charcoal Black", hex: "#181818" },
      { id: "ecru", name: "Raw Ecru", hex: "#F4F1EA" }
    ],
    availableSizes: ["S", "M", "L", "XL", "2XL"],
    material: "400 GSM 100% Combed Heavyweight Cotton",
    weight: "400 GSM",
    fit: "Boxy Drop Shoulder",
    printMethod: "High-Density Screen Matrix",
    edition: "050 SPECIMENS",
    artifactName: "SUMUD",
    artifactGraphic: heroImage,
    artifactInscription: "صُمُود"
  },
  {
    id: "spec_sumud_cap",
    parentArtifactId: "art_sumud",
    medium: "P-Cap",
    mediumCategory: "headwear",
    type: "Structured 6-Panel",
    garmentType: "Structured 6-Panel",
    sku: "SYM-SMD-CAP",
    price: 2500,
    inventory: 35,
    availability: true,
    status: "available",
    images: [capImage],
    color: "Washed Black Twill",
    colorHex: "#222222",
    availableColors: [
      { id: "washed-black", name: "Washed Black", hex: "#222222" },
      { id: "olive-sand", name: "Olive Sand", hex: "#555A4C" }
    ],
    availableSizes: ["One Size // Adjustable Brass Clasp"],
    material: "100% Heavy Brushed Cotton Twill",
    weight: "280 GSM",
    fit: "Structured Crown",
    printMethod: "Direct Needlework Tonal Deboss",
    edition: "050 SPECIMENS",
    artifactName: "SUMUD",
    artifactGraphic: heroImage,
    artifactInscription: "صُمُود"
  },
  {
    id: "spec_sumud_mug",
    parentArtifactId: "art_sumud",
    medium: "Mug",
    mediumCategory: "vessels",
    type: "Dense Artisan Stoneware",
    garmentType: "Dense Artisan Stoneware",
    sku: "SYM-SMD-MUG",
    price: 1800,
    inventory: 40,
    availability: true,
    status: "available",
    images: [vesselImage, mugSymbolicImage],
    color: "Matte Basalt Black",
    colorHex: "#121212",
    availableSizes: ["380ml / 13oz"],
    material: "High-Fired Dense Stoneware Clay",
    weight: "420g",
    capacity: "380ml (13oz)",
    dimensions: "92mm Height × 84mm Diameter",
    finish: "Matte Mineral Glaze with Raw Foot",
    edition: "050 SPECIMENS",
    artifactName: "SUMUD",
    artifactGraphic: heroImage,
    artifactInscription: "صُمُود"
  },
  {
    id: "spec_sumud_hoodie",
    parentArtifactId: "art_sumud",
    medium: "Hoodie",
    mediumCategory: "wear",
    type: "Heavyweight 450 GSM",
    garmentType: "Heavyweight 450 GSM",
    sku: "SYM-SMD-HOD",
    price: 7500,
    inventory: 20,
    availability: true,
    status: "available",
    images: [hoodieImage],
    color: "Washed Carbon",
    colorHex: "#1A1A1A",
    availableSizes: ["S", "M", "L", "XL"],
    material: "450 GSM Double-Faced French Terry",
    weight: "450 GSM",
    fit: "Relaxed Boxy Pullover",
    edition: "050 SPECIMENS",
    artifactName: "SUMUD",
    artifactGraphic: heroImage,
    artifactInscription: "صُمُود"
  },
  {
    id: "spec_sumud_fullsleeve",
    parentArtifactId: "art_sumud",
    medium: "Full Sleeve",
    mediumCategory: "wear",
    type: "Boxy Ribbed Cuff",
    garmentType: "Boxy Ribbed Cuff",
    sku: "SYM-SMD-FSL",
    price: 5000,
    inventory: 25,
    availability: true,
    status: "available",
    images: [heroImage],
    color: "Raw Natural Ecru",
    colorHex: "#F4F1EA",
    availableSizes: ["S", "M", "L", "XL"],
    material: "320 GSM Heavy Combed Interlock Cotton",
    weight: "320 GSM",
    fit: "Boxy Relaxed Sleeve",
    edition: "050 SPECIMENS",
    artifactName: "SUMUD",
    artifactGraphic: heroImage,
    artifactInscription: "صُمُود"
  },

  // --- STATUS: RESISTING SPECIMENS ---
  {
    id: "spec_resisting_tshirt",
    parentArtifactId: "art_resisting",
    medium: "T-Shirt",
    mediumCategory: "wear",
    type: "Drop Shoulder",
    garmentType: "Drop Shoulder",
    sku: "PLS-TSH-F-SRT",
    price: 4200,
    inventory: 30,
    availability: true,
    status: "available",
    images: [heroImage],
    color: "Deep Jet Black",
    colorHex: "#0D0D0D",
    availableSizes: ["S", "M", "L", "XL", "2XL"],
    material: "400 GSM Combed Jersey",
    weight: "400 GSM",
    fit: "Drop Shoulder Boxy",
    edition: "050 SPECIMENS",
    artifactName: "STATUS: RESISTING",
    artifactGraphic: heroImage,
    artifactInscription: "STATUS: RESISTING"
  },
  {
    id: "spec_resisting_hoodie",
    parentArtifactId: "art_resisting",
    medium: "Hoodie",
    mediumCategory: "wear",
    type: "Heavyweight 450 GSM",
    garmentType: "Heavyweight 450 GSM",
    sku: "PLS-HOD-F-SRT",
    price: 7200,
    inventory: 15,
    availability: true,
    status: "available",
    images: [hoodieImage],
    color: "Charcoal Basalt",
    colorHex: "#1E1E1E",
    availableSizes: ["S", "M", "L", "XL"],
    material: "450 GSM Dense Fleece",
    weight: "450 GSM",
    fit: "Relaxed Crossover Hood",
    edition: "050 SPECIMENS",
    artifactName: "STATUS: RESISTING",
    artifactGraphic: heroImage,
    artifactInscription: "STATUS: RESISTING"
  },

  // --- ALIF SPECIMENS ---
  {
    id: "spec_alif_tshirt",
    parentArtifactId: "art_alif",
    medium: "T-Shirt",
    mediumCategory: "wear",
    type: "Drop Shoulder",
    garmentType: "Drop Shoulder",
    sku: "SYM-ALF-TSH",
    price: 4200,
    inventory: 28,
    availability: true,
    status: "available",
    images: [heroImage],
    color: "Raw Washed Ecru",
    colorHex: "#F4F1EA",
    availableSizes: ["S", "M", "L", "XL"],
    material: "400 GSM Heavyweight Cotton",
    weight: "400 GSM",
    fit: "Boxy Upright Cut",
    edition: "050 SPECIMENS",
    artifactName: "ALIF",
    artifactGraphic: heroImage,
    artifactInscription: "أَلِف"
  },
  {
    id: "spec_alif_mug",
    parentArtifactId: "art_alif",
    medium: "Mug",
    mediumCategory: "vessels",
    type: "Dense Artisan Stoneware",
    garmentType: "Dense Artisan Stoneware",
    sku: "SYM-ALF-MUG",
    price: 1800,
    inventory: 35,
    availability: true,
    status: "available",
    images: [mugClarityImage, vesselImage],
    color: "Raw Mineral Ecru",
    colorHex: "#EAE6DC",
    availableSizes: ["380ml / 13oz"],
    material: "High-Fired Dense Stoneware Clay",
    capacity: "380ml (13oz)",
    edition: "050 SPECIMENS",
    artifactName: "ALIF",
    artifactGraphic: heroImage,
    artifactInscription: "أَلِف"
  },

  // --- ADAB SPECIMENS ---
  {
    id: "spec_adab_tshirt",
    parentArtifactId: "art_adab",
    medium: "T-Shirt",
    mediumCategory: "wear",
    type: "Drop Shoulder",
    garmentType: "Drop Shoulder",
    sku: "SYM-ADB-TSH",
    price: 4200,
    inventory: 32,
    availability: true,
    status: "available",
    images: [heroImage],
    color: "Olive Sand",
    colorHex: "#4C5243",
    availableSizes: ["S", "M", "L", "XL"],
    material: "400 GSM Heavyweight Cotton",
    edition: "050 SPECIMENS",
    artifactName: "ADAB",
    artifactGraphic: heroImage,
    artifactInscription: "أَدَب"
  },
  {
    id: "spec_adab_cap",
    parentArtifactId: "art_adab",
    medium: "P-Cap",
    mediumCategory: "headwear",
    type: "Structured 6-Panel",
    garmentType: "Structured 6-Panel",
    sku: "SYM-ADB-CAP",
    price: 2500,
    inventory: 24,
    availability: true,
    status: "available",
    images: [capImage],
    color: "Olive Sand Twill",
    colorHex: "#4C5243",
    availableSizes: ["One Size // Adjustable Brass Clasp"],
    material: "100% Brushed Cotton Twill",
    edition: "050 SPECIMENS",
    artifactName: "ADAB",
    artifactGraphic: heroImage,
    artifactInscription: "أَدَب"
  },

  // --- BASIRAH SPECIMENS ---
  {
    id: "spec_basirah_tshirt",
    parentArtifactId: "art_basirah",
    medium: "T-Shirt",
    mediumCategory: "wear",
    type: "Drop Shoulder",
    garmentType: "Drop Shoulder",
    sku: "SYM-BSR-TSH",
    price: 4200,
    inventory: 22,
    availability: true,
    status: "available",
    images: [heroImage],
    color: "Carbon Black",
    colorHex: "#141414",
    availableSizes: ["S", "M", "L", "XL"],
    material: "400 GSM Heavyweight Cotton",
    edition: "050 SPECIMENS",
    artifactName: "BASIRAH",
    artifactGraphic: heroImage,
    artifactInscription: "بَصِيرَة"
  },
  {
    id: "spec_basirah_mug",
    parentArtifactId: "art_basirah",
    medium: "Mug",
    mediumCategory: "vessels",
    type: "Dense Artisan Stoneware",
    garmentType: "Dense Artisan Stoneware",
    sku: "SYM-BSR-MUG",
    price: 1800,
    inventory: 30,
    availability: true,
    status: "available",
    images: [vesselImage, mugWisdomImage],
    color: "Basalt Charcoal",
    colorHex: "#191919",
    availableSizes: ["380ml / 13oz"],
    material: "High-Fired Dense Stoneware",
    capacity: "380ml (13oz)",
    edition: "050 SPECIMENS",
    artifactName: "BASIRAH",
    artifactGraphic: heroImage,
    artifactInscription: "بَصِيرَة"
  },

  // --- HIKMAH SPECIMENS ---
  {
    id: "spec_hikmah_tshirt",
    parentArtifactId: "art_hikmah",
    medium: "T-Shirt",
    mediumCategory: "wear",
    type: "Drop Shoulder",
    garmentType: "Drop Shoulder",
    sku: "SYM-HKM-TSH",
    price: 4200,
    inventory: 26,
    availability: true,
    status: "available",
    images: [heroImage],
    color: "Stone Slate Gray",
    colorHex: "#383838",
    availableSizes: ["S", "M", "L", "XL"],
    material: "400 GSM Heavyweight Cotton",
    edition: "050 SPECIMENS",
    artifactName: "HIKMAH",
    artifactGraphic: heroImage,
    artifactInscription: "حِكْمَة"
  },
  {
    id: "spec_hikmah_cap",
    parentArtifactId: "art_hikmah",
    medium: "P-Cap",
    mediumCategory: "headwear",
    type: "Structured 6-Panel",
    garmentType: "Structured 6-Panel",
    sku: "SYM-HKM-CAP",
    price: 2500,
    inventory: 20,
    availability: true,
    status: "available",
    images: [capImage],
    color: "Onyx Twill",
    colorHex: "#1A1A1A",
    availableSizes: ["One Size // Adjustable Brass Clasp"],
    material: "100% Brushed Cotton Twill",
    edition: "050 SPECIMENS",
    artifactName: "HIKMAH",
    artifactGraphic: heroImage,
    artifactInscription: "حِكْمَة"
  }
];

export const SEED_ARTIFACTS: Artifact[] = [
  {
    id: "art_sumud",
    artifactId: "SYM-01",
    name: "SUMUD",
    shortDescription: "Steadfast resilience, unyielding rootedness, and defiance against erasure.",
    description: "Sumud: the enduring Palestinian and Quranic discipline of steadfast rootedness, unyielding perseverance, and steadfast defiance against erasure. It is an enduring covenant translated into physical, tactile instruments.",
    concept: "Solidarity with Falasteen is not a fleeting trend or seasonal hashtag; it is an enduring covenant. The symbol anchors this conviction in physical, tactile armor.",
    graphic: heroImage,
    images: [heroImage, capImage, vesselImage, hoodieImage],
    thumbnailImage: heroImage,
    inscription: "صُمُود",
    pillar1Represents: "Sumud: the enduring Palestinian and Quranic discipline of steadfast rootedness, unyielding perseverance, and steadfast defiance against erasure.",
    pillar2WhyChosen: "Solidarity with Falasteen is not a fleeting trend or seasonal hashtag; it is an enduring covenant. The symbol anchors this conviction in physical, tactile armor.",
    pillar3Communicates: "Active, deliberate alignment with the resilient spirit of Palestine and the righteous resistance of an enduring people.",
    pillar4WearerCarries: "The solemn memory of ancestral land, the responsibility of bearing moral witness, and daily solidarity in prayers and actions.",
    symbolicTagline: "STEADFAST RESILIENCE // PALESTINE COVENANT",
    collectionName: "Be Palestine",
    tags: ["Series 01", "Steadfast", "Signature", "Falasteen"],
    releaseInfo: "Inaugural Release // Archive Series 01",
    status: "published",
    specimenIds: [
      "spec_sumud_tshirt",
      "spec_sumud_cap",
      "spec_sumud_mug",
      "spec_sumud_hoodie",
      "spec_sumud_fullsleeve"
    ],
    setDiscountPercentage: 10,
    setPriceOverride: 18500, // Regular total: 4500 + 2500 + 1800 + 7500 + 5000 = 21,300. Set price saves 2,800 PKR!
    order: 1
  },
  {
    id: "art_resisting",
    artifactId: "SYM-02",
    name: "STATUS: RESISTING",
    shortDescription: "The unyielding psychological posture of ideological sovereignty.",
    description: "The unyielding psychological posture of ideological sovereignty. A refusal to assimilate into consumer compliance or apologize for conviction.",
    concept: "In an era of performative neutrality, deliberate resistance to moral compromise is the primary marker of Islamic character.",
    graphic: heroImage,
    images: [heroImage, hoodieImage],
    thumbnailImage: heroImage,
    inscription: "STATUS: RESISTING",
    pillar1Represents: "Ideological sovereignty, moral fortitude, and unyielding refusal to bow to tyrannical social pressure.",
    pillar2WhyChosen: "Every civilization in decline demands submission to its slogans. 'Resisting' proclaims allegiance only to the Divine.",
    pillar3Communicates: "An unflinching refusal to compromise sacred principles for social convenience.",
    pillar4WearerCarries: "The solemn daily commitment to preserve moral clarity in personal, business, and spiritual conduct.",
    symbolicTagline: "SOVEREIGN POSTURE // IDEOLOGICAL DEFIANCE",
    collectionName: "Be Palestine",
    tags: ["Series 01", "Resistance", "Sovereignty"],
    releaseInfo: "Archive Series 01",
    status: "published",
    specimenIds: [
      "spec_resisting_tshirt",
      "spec_resisting_hoodie"
    ],
    setDiscountPercentage: 10,
    setPriceOverride: 10200, // Individual sum: 4200 + 7200 = 11,400. Set: 10,200 (saves 1,200 PKR!)
    order: 2
  },
  {
    id: "art_alif",
    artifactId: "SYM-03",
    name: "ALIF",
    shortDescription: "The primary vertical stroke — Divine Oneness (Tawhid) and unbending integrity.",
    description: "The inaugural letter and the axis of the Arabic script. The primary vertical stroke symbolizes Divine Oneness (Tawhid), unbending uprightness, and moral clarity.",
    concept: "The human spine is engineered to stand vertical and steadfast. Alif was chosen as the inaugural symbol because upright moral character precedes all outer adornment.",
    graphic: heroImage,
    images: [heroImage, mugClarityImage, vesselImage],
    thumbnailImage: heroImage,
    inscription: "أَلِف",
    pillar1Represents: PRESET_SYMBOL_KNOWLEDGE["أَلِف"].represents,
    pillar2WhyChosen: PRESET_SYMBOL_KNOWLEDGE["أَلِف"].whyChosen,
    pillar3Communicates: PRESET_SYMBOL_KNOWLEDGE["أَلِف"].communicates,
    pillar4WearerCarries: PRESET_SYMBOL_KNOWLEDGE["أَلِف"].wearerCarries,
    symbolicTagline: "DIVINE ONENESS // UNBENDING INTEGRITY",
    collectionName: "Be Symbolic",
    tags: ["Series 01", "Tawhid", "Foundational"],
    releaseInfo: "Core Ethos Corpus",
    status: "published",
    specimenIds: [
      "spec_alif_tshirt",
      "spec_alif_mug"
    ],
    setDiscountPercentage: 10,
    setPriceOverride: 5400, // Individual sum: 4200 + 1800 = 6,000. Set: 5,400 (saves 600 PKR!)
    order: 3
  },
  {
    id: "art_adab",
    artifactId: "SYM-04",
    name: "ADAB",
    shortDescription: "Spiritual etiquette, refined restraint, and reverent intellectual discipline.",
    description: "Adab: spiritual etiquette, refined restraint, intellectual humility, and the moral discipline that elevates bare knowledge into lived wisdom.",
    concept: "True scholars and seekers have historically prioritized the cultivation of character before the accumulation of intellect.",
    graphic: heroImage,
    images: [heroImage, capImage],
    thumbnailImage: heroImage,
    inscription: "أَدَب",
    pillar1Represents: PRESET_SYMBOL_KNOWLEDGE["أَدَب"].represents,
    pillar2WhyChosen: PRESET_SYMBOL_KNOWLEDGE["أَدَب"].whyChosen,
    pillar3Communicates: PRESET_SYMBOL_KNOWLEDGE["أَدَب"].communicates,
    pillar4WearerCarries: PRESET_SYMBOL_KNOWLEDGE["أَدَب"].wearerCarries,
    symbolicTagline: "REFINED ETIQUETTE // INTELLECTUAL REVERENCE",
    collectionName: "Be Symbolic",
    tags: ["Series 01", "Character", "Intellect"],
    releaseInfo: "Core Ethos Corpus",
    status: "published",
    specimenIds: [
      "spec_adab_tshirt",
      "spec_adab_cap"
    ],
    setDiscountPercentage: 10,
    setPriceOverride: 6000, // Individual sum: 4200 + 2500 = 6,700. Set: 6,000 (saves 700 PKR!)
    order: 4
  },
  {
    id: "art_basirah",
    artifactId: "SYM-05",
    name: "BASIRAH",
    shortDescription: "Interior perception and spiritual discernment that penetrates outward illusions.",
    description: "Basirah: the interior perception and spiritual discernment that penetrates outward illusions to perceive the essential reality of things.",
    concept: "In a consumer society drowned in superficial stimuli, Basirah serves as an optical anchor to return the mind to eternal truths.",
    graphic: heroImage,
    images: [heroImage, mugWisdomImage, vesselImage],
    thumbnailImage: heroImage,
    inscription: "بَصِيرَة",
    pillar1Represents: PRESET_SYMBOL_KNOWLEDGE["بَصِيرَة"].represents,
    pillar2WhyChosen: PRESET_SYMBOL_KNOWLEDGE["بَصِيرَة"].whyChosen,
    pillar3Communicates: PRESET_SYMBOL_KNOWLEDGE["بَصِيرَة"].communicates,
    pillar4WearerCarries: PRESET_SYMBOL_KNOWLEDGE["بَصِيرَة"].wearerCarries,
    symbolicTagline: "SPIRITUAL DISCERNMENT // PENETRATING GAZE",
    collectionName: "Be Symbolic",
    tags: ["Series 01", "Discernment", "Vision"],
    releaseInfo: "Core Ethos Corpus",
    status: "published",
    specimenIds: [
      "spec_basirah_tshirt",
      "spec_basirah_mug"
    ],
    setDiscountPercentage: 10,
    setPriceOverride: 5400, // Individual sum: 4200 + 1800 = 6000. Set: 5,400 (saves 600 PKR!)
    order: 5
  },
  {
    id: "art_hikmah",
    artifactId: "SYM-06",
    name: "HIKMAH",
    shortDescription: "Wisdom in action — placing everything in its rightful station.",
    description: "Hikmah: the discernment to place everything in its rightful station, joining deep spiritual insight with proportionate, measured action.",
    concept: "Knowledge without wisdom creates reckless noise. Hikmah anchors speech, craft, and conduct in purpose and balance.",
    graphic: heroImage,
    images: [heroImage, capImage],
    thumbnailImage: heroImage,
    inscription: "حِكْمَة",
    pillar1Represents: PRESET_SYMBOL_KNOWLEDGE["حِكْمَة"].represents,
    pillar2WhyChosen: PRESET_SYMBOL_KNOWLEDGE["حِكْمَة"].whyChosen,
    pillar3Communicates: PRESET_SYMBOL_KNOWLEDGE["حِكْمَة"].communicates,
    pillar4WearerCarries: PRESET_SYMBOL_KNOWLEDGE["حِكْمَة"].wearerCarries,
    symbolicTagline: "MEASURED ACTION // RIGHTFUL PROPORTION",
    collectionName: "Be Symbolic",
    tags: ["Series 01", "Wisdom", "Equilibrium"],
    releaseInfo: "Core Ethos Corpus",
    status: "published",
    specimenIds: [
      "spec_hikmah_tshirt",
      "spec_hikmah_cap"
    ],
    setDiscountPercentage: 10,
    setPriceOverride: 6000, // Individual sum: 4200 + 2500 = 6,700. Set: 6,000 (saves 700 PKR!)
    order: 6
  }
];

// Memory Caches
let memoryArtifacts: Artifact[] | null = null;
let memorySpecimens: Specimen[] | null = null;

export function getCachedArtifacts(): Artifact[] {
  if (memoryArtifacts !== null) return memoryArtifacts;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem(ARTIFACTS_CACHE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          memoryArtifacts = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return SEED_ARTIFACTS;
}

export function getCachedSpecimens(): Specimen[] {
  if (memorySpecimens !== null) return memorySpecimens;
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = localStorage.getItem(SPECIMENS_CACHE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          memorySpecimens = parsed;
          return parsed;
        }
      }
    } catch {}
  }
  return SEED_SPECIMENS;
}

export function saveArtifactsToCache(artifacts: Artifact[]) {
  memoryArtifacts = Array.isArray(artifacts) ? artifacts : [];
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(ARTIFACTS_CACHE_KEY, JSON.stringify(memoryArtifacts));
    } catch {}
  }
}

export function saveSpecimensToCache(specimens: Specimen[]) {
  memorySpecimens = Array.isArray(specimens) ? specimens : [];
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      localStorage.setItem(SPECIMENS_CACHE_KEY, JSON.stringify(memorySpecimens));
    } catch {}
  }
}

/**
 * Clean undefined values before writing to Firestore
 */
function cleanUndefined(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce((acc: any, [key, value]) => {
      if (value !== undefined) {
        acc[key] = cleanUndefined(value);
      }
      return acc;
    }, {});
  }
  return obj;
}

/**
 * Normalizes an Artifact record
 */
export function normalizeArtifact(rawArt: any): Artifact {
  const art = rawArt && typeof rawArt === "object" ? rawArt : {};
  return {
    id: art.id || `art_${Date.now()}`,
    artifactId: art.artifactId || art.id || "SYM-ART",
    name: art.name || "UNTITLED ARTIFACT",
    shortDescription: art.shortDescription || art.description?.slice(0, 120) || "",
    description: art.description || "",
    concept: art.concept || art.thesis || art.statement || "",
    graphic: art.graphic || art.images?.[0] || heroImage,
    images: Array.isArray(art.images) && art.images.length > 0 ? art.images : [art.graphic || heroImage],
    thumbnailImage: art.thumbnailImage || art.graphic || art.images?.[0] || heroImage,
    inscription: art.inscription || art.symbol || "",
    pillar1Represents: art.pillar1Represents || art.statementMeaning || "",
    pillar2WhyChosen: art.pillar2WhyChosen || art.representation || "",
    pillar3Communicates: art.pillar3Communicates || art.wearingCommunicates || "",
    pillar4WearerCarries: art.pillar4WearerCarries || art.statement || "",
    symbolicTagline: art.symbolicTagline || "",
    collectionName: art.collectionName || "Be Symbolic",
    tags: Array.isArray(art.tags) ? art.tags : [],
    releaseInfo: art.releaseInfo || "",
    internalNotes: art.internalNotes || "",
    status: (art.status as ArtifactStatus) || "published",
    specimenIds: Array.isArray(art.specimenIds) ? art.specimenIds : [],
    setPriceOverride: typeof art.setPriceOverride === "number" ? art.setPriceOverride : null,
    setDiscountPercentage: typeof art.setDiscountPercentage === "number" ? art.setDiscountPercentage : 10,
    completeSetDiscountPercent: typeof art.completeSetDiscountPercent === "number" ? art.completeSetDiscountPercent : (typeof art.setDiscountPercentage === "number" ? art.setDiscountPercentage : 10),
    order: typeof art.order === "number" ? art.order : 999,
    createdAt: art.createdAt || Date.now(),
    updatedAt: art.updatedAt || Date.now()
  };
}

/**
 * Normalizes a Specimen record
 */
export function normalizeSpecimen(rawSpec: any): Specimen {
  const spec = rawSpec && typeof rawSpec === "object" ? rawSpec : {};
  const medConfig = getMediumConfig(spec.medium || "T-Shirt");
  return {
    id: spec.id || `spec_${Date.now()}_${Math.floor(Math.random()*1000)}`,
    parentArtifactId: spec.parentArtifactId || "",
    artifactName: spec.artifactName || "",
    artifactGraphic: spec.artifactGraphic || "",
    artifactInscription: spec.artifactInscription || "",
    medium: spec.medium || medConfig.name,
    mediumCategory: spec.mediumCategory || medConfig.category,
    type: spec.type || spec.garmentType || medConfig.defaultGarmentTypes?.[0] || "Standard",
    garmentType: spec.garmentType || spec.type || medConfig.defaultGarmentTypes?.[0] || "Standard",
    sku: spec.sku || `SYM-${Date.now()}`,
    price: typeof spec.price === "number" ? spec.price : (medConfig.defaultPrice || 2500),
    inventory: typeof spec.inventory === "number" ? spec.inventory : 50,
    availability: spec.availability !== false,
    status: (spec.status as SpecimenStatus) || (spec.inventory <= 0 ? "sold_out" : "available"),
    images: Array.isArray(spec.images) && spec.images.length > 0 ? spec.images : [heroImage],
    thumbnailImage: spec.thumbnailImage || spec.images?.[0] || heroImage,
    color: spec.color || "Standard Finish",
    colorHex: spec.colorHex || "#1C1C1C",
    availableColors: spec.availableColors || [],
    availableSizes: spec.availableSizes || medConfig.defaultSizes || ["S", "M", "L", "XL"],
    material: spec.material || "",
    weight: spec.weight || "",
    fit: spec.fit || "",
    printMethod: spec.printMethod || "",
    edition: spec.edition || "050 SPECIMENS",
    careInstructions: spec.careInstructions || "",
    finish: spec.finish || "",
    dimensions: spec.dimensions || "",
    capacity: spec.capacity || "",
    createdAt: spec.createdAt || Date.now(),
    updatedAt: spec.updatedAt || Date.now()
  };
}

/**
 * Fetch all Artifacts from Firestore, falling back to cache & seeds
 */
export async function fetchArtifacts(): Promise<Artifact[]> {
  try {
    const snap = await getDocs(collection(db, "artifacts"));
    if (!snap.empty && snap.docs.length > 0) {
      const live = snap.docs.map(d => normalizeArtifact({ id: d.id, ...d.data() }));
      live.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      saveArtifactsToCache(live);
      return live;
    } else if (snap.empty) {
      // Valid empty collection from Firestore
      saveArtifactsToCache([]);
      return [];
    }
  } catch (err) {
    console.warn("Could not fetch artifacts from Firestore:", err);
  }

  // Fallback to cache or seeds if offline / network error
  return getCachedArtifacts();
}

/**
 * Fetch all Specimens from Firestore, falling back to cache & seeds
 */
export async function fetchSpecimens(parentArtifactId?: string): Promise<Specimen[]> {
  try {
    let snap;
    if (parentArtifactId) {
      const q = query(collection(db, "specimens"), where("parentArtifactId", "==", parentArtifactId));
      snap = await getDocs(q);
    } else {
      snap = await getDocs(collection(db, "specimens"));
    }

    if (!snap.empty && snap.docs.length > 0) {
      const live = snap.docs.map(d => normalizeSpecimen({ id: d.id, ...d.data() }));
      if (!parentArtifactId) {
        saveSpecimensToCache(live);
      }
      return live;
    } else if (snap.empty) {
      if (!parentArtifactId) {
        saveSpecimensToCache([]);
      }
      return [];
    }
  } catch (err) {
    console.warn("Could not fetch specimens from Firestore:", err);
  }

  const all = getCachedSpecimens();
  if (parentArtifactId) {
    return all.filter(s => s.parentArtifactId === parentArtifactId);
  }
  return all;
}

/**
 * Fetch a single Artifact together with all its child Specimens
 */
export async function fetchArtifactWithSpecimens(artifactId: string): Promise<ArtifactWithSpecimens | null> {
  const artifacts = await fetchArtifacts();
  const allSpecimens = await fetchSpecimens();

  const artifact = artifacts.find(a => a.id === artifactId || a.artifactId === artifactId);
  if (!artifact) return null;

  const childSpecimens = allSpecimens.filter(s => 
    s.parentArtifactId === artifact.id || 
    artifact.specimenIds?.includes(s.id)
  );

  return {
    ...artifact,
    specimens: childSpecimens
  };
}

/**
 * Save an Artifact to Firestore and update cache
 */
export async function saveArtifact(artifact: Artifact): Promise<Artifact> {
  const normalized = normalizeArtifact({ ...artifact, updatedAt: Date.now() });
  const cleaned = cleanUndefined(normalized);

  try {
    await setDoc(doc(db, "artifacts", normalized.id), cleaned, { merge: true });
  } catch (err) {
    console.error("Error saving artifact to Firestore:", err);
  }

  // Update in-memory and local storage
  const current = getCachedArtifacts();
  const index = current.findIndex(a => a.id === normalized.id);
  const updated = index >= 0 
    ? [...current.slice(0, index), normalized, ...current.slice(index + 1)]
    : [...current, normalized];
  saveArtifactsToCache(updated);

  return normalized;
}

/**
 * Delete an Artifact and optionally cascade delete its child Specimens
 */
export async function deleteArtifact(artifactId: string, cascadeDeleteSpecimens = true): Promise<void> {
  try {
    await deleteDoc(doc(db, "artifacts", artifactId));
    if (cascadeDeleteSpecimens) {
      const childSpecimens = await fetchSpecimens(artifactId);
      for (const spec of childSpecimens) {
        await deleteDoc(doc(db, "specimens", spec.id)).catch(() => {});
        await deleteDoc(doc(db, "artifacts", artifactId, "specimens", spec.id)).catch(() => {});
      }
      
      const allSpecs = getCachedSpecimens();
      const matchedSpecs = allSpecs.filter(s => s.parentArtifactId === artifactId);
      for (const spec of matchedSpecs) {
        await deleteDoc(doc(db, "specimens", spec.id)).catch(() => {});
        await deleteDoc(doc(db, "artifacts", artifactId, "specimens", spec.id)).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Error deleting artifact from Firestore:", err);
  }

  const currentArts = getCachedArtifacts();
  const updatedArtifacts = currentArts.filter(a => a.id !== artifactId && a.artifactId !== artifactId);
  saveArtifactsToCache(updatedArtifacts);

  if (cascadeDeleteSpecimens) {
    const currentSpecs = getCachedSpecimens();
    const updatedSpecimens = currentSpecs.filter(s => s.parentArtifactId !== artifactId);
    saveSpecimensToCache(updatedSpecimens);
  }
}

/**
 * Save a Specimen to Firestore and link it to its parent Artifact
 */
export async function saveSpecimen(specimen: Specimen): Promise<Specimen> {
  const normalized = normalizeSpecimen({ ...specimen, updatedAt: Date.now() });
  const cleaned = cleanUndefined(normalized);

  try {
    await setDoc(doc(db, "specimens", normalized.id), cleaned, { merge: true });
    
    // Also save under nested subcollection /artifacts/{artifactId}/specimens/{specimenId}
    if (normalized.parentArtifactId) {
      await setDoc(
        doc(db, "artifacts", normalized.parentArtifactId, "specimens", normalized.id),
        cleaned,
        { merge: true }
      ).catch(() => {});
    }
  } catch (err) {
    console.error("Error saving specimen to Firestore:", err);
  }

  // Update specimen cache
  const currentSpecimens = getCachedSpecimens();
  const specIndex = currentSpecimens.findIndex(s => s.id === normalized.id);
  const updatedSpecimens = specIndex >= 0
    ? [...currentSpecimens.slice(0, specIndex), normalized, ...currentSpecimens.slice(specIndex + 1)]
    : [...currentSpecimens, normalized];
  saveSpecimensToCache(updatedSpecimens);

  // Update parent Artifact's specimenIds list if not present
  if (normalized.parentArtifactId) {
    const currentArtifacts = getCachedArtifacts();
    const parent = currentArtifacts.find(a => a.id === normalized.parentArtifactId);
    if (parent && !parent.specimenIds.includes(normalized.id)) {
      const updatedParent: Artifact = {
        ...parent,
        specimenIds: [...parent.specimenIds, normalized.id],
        updatedAt: Date.now()
      };
      await saveArtifact(updatedParent);
    }
  }

  return normalized;
}

/**
 * Delete a Specimen from Firestore
 */
export async function deleteSpecimen(specimenId: string): Promise<void> {
  const spec = getCachedSpecimens().find(s => s.id === specimenId);
  try {
    await deleteDoc(doc(db, "specimens", specimenId));
    if (spec?.parentArtifactId) {
      await deleteDoc(doc(db, "artifacts", spec.parentArtifactId, "specimens", specimenId)).catch(() => {});
    }
  } catch (err) {
    console.error("Error deleting specimen from Firestore:", err);
  }

  const updatedSpecimens = getCachedSpecimens().filter(s => s.id !== specimenId);
  saveSpecimensToCache(updatedSpecimens);

  // Remove from parent artifact's specimenIds
  if (spec?.parentArtifactId) {
    const currentArtifacts = getCachedArtifacts();
    const parent = currentArtifacts.find(a => a.id === spec.parentArtifactId);
    if (parent && parent.specimenIds.includes(specimenId)) {
      const updatedParent: Artifact = {
        ...parent,
        specimenIds: parent.specimenIds.filter(id => id !== specimenId),
        updatedAt: Date.now()
      };
      await saveArtifact(updatedParent);
    }
  }
}

/**
 * Toggle Specimen availability (e.g. quick in-stock / sold out toggle)
 */
export async function toggleSpecimenAvailability(specimenId: string, availability: boolean): Promise<void> {
  const spec = getCachedSpecimens().find(s => s.id === specimenId);
  if (!spec) return;

  const updated: Specimen = {
    ...spec,
    availability,
    status: availability ? "available" : "sold_out",
    updatedAt: Date.now()
  };
  await saveSpecimen(updated);
}

/**
 * Calculates complete Artifact Set acquisition pricing:
 * 1. Sums the individual prices of available specimens
 * 2. Applies artifact.setPriceOverride if defined
 * 3. Or applies artifact.setDiscountPercentage (e.g. 10%)
 */
export function calculateArtifactSetPrice(artifact?: Artifact | null, specimens: Specimen[] = []) {
  if (!artifact) {
    return {
      individualTotal: 0,
      setPrice: 0,
      savings: 0,
      hasDiscount: false,
      discountPercent: 0,
      specimenCount: 0,
      availableSpecimens: []
    };
  }

  const safeSpecimens = Array.isArray(specimens) ? specimens : [];
  const availableSpecimens = safeSpecimens.filter(s => s && s.availability !== false && s.status !== "sold_out");
  const individualTotal = availableSpecimens.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  let setPrice = individualTotal;
  let savings = 0;
  let hasDiscount = false;
  let discountPercent = 0;

  const setPriceOverride = artifact.setPriceOverride;
  const setDiscountPercentage = artifact.setDiscountPercentage ?? artifact.completeSetDiscountPercent;

  if (typeof setPriceOverride === "number" && setPriceOverride > 0) {
    setPrice = setPriceOverride;
    savings = Math.max(0, individualTotal - setPrice);
    hasDiscount = savings > 0;
    discountPercent = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;
  } else if (typeof setDiscountPercentage === "number" && setDiscountPercentage > 0) {
    discountPercent = setDiscountPercentage;
    savings = Math.round((individualTotal * discountPercent) / 100);
    setPrice = Math.max(0, individualTotal - savings);
    hasDiscount = savings > 0;
  }

  return {
    individualTotal,
    setPrice,
    savings,
    hasDiscount,
    discountPercent,
    specimenCount: availableSpecimens.length,
    availableSpecimens
  };
}

/**
 * Projects a Specimen + its parent Artifact into a backward-compatible Product model
 * so existing legacy views, routes, and checkout continue working without breaking.
 */
export function projectSpecimenToProduct(specimen: Specimen, parentArtifact?: Artifact | null): Product {
  const medConfig = getMediumConfig(specimen.medium);
  return {
    id: specimen.id,
    productId: specimen.sku,
    name: parentArtifact ? `${parentArtifact.name} — ${specimen.medium}` : (specimen.artifactName ? `${specimen.artifactName} — ${specimen.medium}` : specimen.medium),
    description: parentArtifact?.description || "",
    price: specimen.price,
    categoryId: specimen.mediumCategory || medConfig.category,
    sku: specimen.sku,
    images: specimen.images?.length > 0 ? specimen.images : (parentArtifact?.images || [heroImage]),
    thumbnailImage: specimen.thumbnailImage || specimen.images?.[0] || parentArtifact?.thumbnailImage || heroImage,
    parentArtifactId: specimen.parentArtifactId,
    medium: specimen.medium,
    artifactType: specimen.medium,
    artifactClassification: specimen.mediumCategory || medConfig.category,
    artifactTags: parentArtifact?.tags || [],
    inventory: specimen.inventory,
    availability: specimen.availability,
    status: specimen.status,
    collectionName: parentArtifact?.collectionName || "Be Symbolic",
    symbolicTagline: parentArtifact?.symbolicTagline || "",
    inscription: parentArtifact?.inscription || specimen.artifactInscription || "",
    pillar1Represents: parentArtifact?.pillar1Represents || "",
    pillar2WhyChosen: parentArtifact?.pillar2WhyChosen || "",
    pillar3Communicates: parentArtifact?.pillar3Communicates || "",
    pillar4WearerCarries: parentArtifact?.pillar4WearerCarries || "",
    color: specimen.color,
    availableColors: specimen.availableColors,
    availableSizes: specimen.availableSizes,
    material: specimen.material,
    weight: specimen.weight,
    fit: specimen.fit,
    printMethod: specimen.printMethod,
    edition: specimen.edition || "050 SPECIMENS",
    careInstructions: specimen.careInstructions,
    finish: specimen.finish,
    dimensions: specimen.dimensions,
    capacity: specimen.capacity
  };
}

/**
 * Projects an Artifact (with all its child specimens) into a flagship Product model
 */
export function projectArtifactToProduct(artifact: Artifact, specimens: Specimen[]): Product {
  const minPrice = specimens.length > 0 
    ? Math.min(...specimens.map(s => s.price))
    : 4200;

  return {
    id: artifact.id,
    productId: artifact.artifactId,
    name: artifact.name,
    description: artifact.description,
    price: minPrice,
    categoryId: "wear",
    sku: artifact.artifactId,
    images: artifact.images.length > 0 ? artifact.images : [heroImage],
    thumbnailImage: artifact.thumbnailImage || artifact.images[0] || heroImage,
    isArtifactMaster: true,
    specimenIds: artifact.specimenIds,
    specimens: specimens,
    graphic: artifact.graphic,
    collectionName: artifact.collectionName,
    symbolicTagline: artifact.symbolicTagline,
    inscription: artifact.inscription,
    pillar1Represents: artifact.pillar1Represents,
    pillar2WhyChosen: artifact.pillar2WhyChosen,
    pillar3Communicates: artifact.pillar3Communicates,
    pillar4WearerCarries: artifact.pillar4WearerCarries,
    inventory: specimens.reduce((sum, s) => sum + s.inventory, 0),
    availability: specimens.some(s => s.availability),
    status: artifact.status === "published" ? "available" : artifact.status,
    artifactTags: artifact.tags
  };
}

/**
 * Automatic Migration & Initialization:
 * 1. Checks if Firestore has artifacts.
 * 2. If empty, seeds the canonical artifacts & specimens (including SUMUD, STATUS: RESISTING, etc.).
 * 3. Scans any legacy products and converts them into artifacts & specimens.
 */
export async function initializeAndMigrateArtifacts(): Promise<{
  artifacts: Artifact[];
  specimens: Specimen[];
}> {
  try {
    const existingArtifactsSnap = await getDocs(collection(db, "artifacts"));
    
    if (existingArtifactsSnap.empty || existingArtifactsSnap.docs.length === 0) {
      console.log("Seeding canonical artifacts & specimens to Firestore...");
      // Seed default artifacts
      for (const art of SEED_ARTIFACTS) {
        await setDoc(doc(db, "artifacts", art.id), cleanUndefined(art), { merge: true }).catch(() => {});
      }
      // Seed default specimens
      for (const spec of SEED_SPECIMENS) {
        await setDoc(doc(db, "specimens", spec.id), cleanUndefined(spec), { merge: true }).catch(() => {});
      }
      saveArtifactsToCache(SEED_ARTIFACTS);
      saveSpecimensToCache(SEED_SPECIMENS);
      return { artifacts: SEED_ARTIFACTS, specimens: SEED_SPECIMENS };
    }

    // Load from Firestore
    const artifacts = existingArtifactsSnap.docs.map(d => normalizeArtifact({ id: d.id, ...d.data() }));
    const specimensSnap = await getDocs(collection(db, "specimens"));
    let specimens: Specimen[] = [];
    if (!specimensSnap.empty) {
      specimens = specimensSnap.docs.map(d => normalizeSpecimen({ id: d.id, ...d.data() }));
    } else {
      // Seed specimens if missing
      for (const spec of SEED_SPECIMENS) {
        await setDoc(doc(db, "specimens", spec.id), cleanUndefined(spec), { merge: true }).catch(() => {});
      }
      specimens = SEED_SPECIMENS;
    }

    saveArtifactsToCache(artifacts);
    saveSpecimensToCache(specimens);
    return { artifacts, specimens };
  } catch (err) {
    console.warn("Using cached/seed artifacts and specimens due to connection state:", err);
    return {
      artifacts: getCachedArtifacts(),
      specimens: getCachedSpecimens()
    };
  }
}

/**
 * Fetch a single Artifact by ID
 */
export async function fetchArtifactById(artifactId: string): Promise<Artifact | null> {
  const all = await fetchArtifacts();
  return all.find(a => a.id === artifactId || a.artifactId === artifactId) || null;
}

/**
 * Fetch specimens belonging to a parent artifact
 */
export async function fetchSpecimensByArtifactId(artifactId: string): Promise<Specimen[]> {
  return fetchSpecimens(artifactId);
}

/**
 * Fetch all artifacts paired with their specimens
 */
export async function fetchArtifactsWithSpecimens(): Promise<ArtifactWithSpecimens[]> {
  const artifacts = await fetchArtifacts();
  const specimens = await fetchSpecimens();
  
  return artifacts.map(art => ({
    ...art,
    specimens: specimens.filter(s => s.parentArtifactId === art.id || art.specimenIds?.includes(s.id))
  }));
}

/**
 * Delete artifact and cascade delete its specimens
 */
export async function deleteArtifactCascade(artifactId: string): Promise<void> {
  return deleteArtifact(artifactId, true);
}

/**
 * Delete specimen and clean up references
 */
export async function deleteSpecimenCascade(specimenId: string, parentArtifactId?: string): Promise<void> {
  return deleteSpecimen(specimenId);
}

