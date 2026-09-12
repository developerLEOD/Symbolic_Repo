/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SYMBOLIC MUSLIMS — Core Brand Ethos, Values, Aims & Strategic Framework
 * Under the Let's Establish Our Deen (LEOD) Mission
 * 
 * This file serves as the canonical source of truth for the studio's ideological,
 * conceptual, typographic, and architectural standards.
 */

export interface Axiom {
  code: string;
  title: string;
  subheading: string;
  thesis: string;
  imperative: string;
}

export interface SymbolClassification {
  code: "EPS" | "DIS" | "SPA" | "SOV";
  name: string;
  description: string;
  focus: string;
  exampleRef: string;
}

export interface CategoryPhilosophy {
  id: string;
  category: "WEAR" | "CARRY" | "HEADWEAR" | "VESSELS";
  role: string;
  materialStandard: string;
  symbolicAffinity: string;
  makerMarkRule: string;
}

export const BRAND_IDENTITY = {
  name: "SYMBOLIC MUSLIMS",
  shortName: "SYMBOLIC",
  parentMission: "Let's Establish Our Deen (LEOD)",
  provenance: "Atelier Archive // Ethical Production",
  tagline: "POSSESSION & IDENTITY STUDIO",
  creed: "CRAFTED WITH INTENT • WEAR WITH PURPOSE",
  colorSystem: {
    carbon: "#050505",
    parchment: "#F4F1EA",
    signalOrange: "#F95721",
    boneMute: "#E8E4DA"
  }
} as const;

export const CONCEPTUAL_HIERARCHY = {
  principle: "PERSON → SYMBOL → ARTEFACT → BRAND",
  layers: [
    {
      level: 1,
      subject: "THE PERSON / WEARER",
      role: "The sovereign individual. Character, physical posture, moral discipline, and deeds come first. The wearer is never marketing collateral.",
      prominence: "Primary Subject (70%)"
    },
    {
      level: 2,
      subject: "THE SYMBOL",
      role: "A visual distillation of an Islamic virtue, scriptural transmission, or theological conviction. Communicates truth to the public realm.",
      prominence: "Dominant Inscription (20%)"
    },
    {
      level: 3,
      subject: "THE ARTEFACT",
      role: "Heavy-gauge physical instrument (400 GSM fleece, 18 oz canvas, dense stoneware). Carries the symbol into daily worship, transit, and study.",
      prominence: "Functional Instrument (10%)"
    },
    {
      level: 4,
      subject: "THE BRAND / MAKER",
      role: "SYMBOLIC is merely the maker, not the identity being worn. Exiled to interior neck tapes, inner tags, and base debosses. Zero chest billboards.",
      prominence: "Inconspicuous Maker Mark (0% Exterior)"
    }
  ]
} as const;

export const INSTITUTIONAL_RELATIONSHIPS = {
  leod: {
    entity: "LEOD (Let's Establish Our Deen)",
    role: "The parent intellectual and spiritual movement. Focuses on theological literacy, spiritual revival, community fortitude, and moral revival. LEOD is the ideological root.",
    relationship: "Root Directive & Civilizational Compass"
  },
  symbolic: {
    entity: "SYMBOLIC MUSLIMS",
    role: "The physical design and possession studio. Translates LEOD's ethos into tactile, everyday objects. It is the applied engineering arm of the mission.",
    relationship: "Applied Physical Manifestation"
  }
} as const;

export const CORE_VALUES = [
  {
    value: "SOVEREIGN IDENTITY",
    statement: "Muslim identity is articulated with dignity, confidence, and distinctness rather than apologetic assimilation or corporate mimicry."
  },
  {
    value: "DELIBERATE POSSESSION",
    statement: "Possessions must reflect spiritual conviction and purposeful utility. We reject mindless accumulation and disposable consumerism."
  },
  {
    value: "TACTILE PERMANENCE",
    statement: "Longevity over seasonal trends. Heavyweight natural fibers, unyielding construction, and repairable hardware engineered to endure years of study and devotion."
  },
  {
    value: "ZERO BILLBOARD CULTURE",
    statement: "Refusal to pay corporations for the privilege of advertising their logos across our bodies. The human chest is reserved for personal conviction, not commercial equity."
  },
  {
    value: "RIGOROUS SCRIPTURAL INTEGRITY",
    statement: "Zero fabricated theological claims or superficial calligraphy tropes. Every symbol is historically grounded, mathematically calibrated, and intellectually honest."
  }
] as const;

export const CORE_AIMS = [
  {
    id: "AIM-01",
    target: "TRANSFORM POSSESSION INTO CONSCIOUS WITNESS",
    detail: "Shift the relationship believers have with physical objects from passive consumption to intentional representation of Deen."
  },
  {
    id: "AIM-02",
    target: "CODIFY AN AUTHENTIC SYMBOL ARCHIVE",
    detail: "Develop an enduring, academic-grade symbolic registry documenting Islamic intellectual history, sacred geometry, and moral directives."
  },
  {
    id: "AIM-03",
    target: "RESTORE DIGNIFIED MUSLIMS TO PUBLIC SPACES",
    detail: "Provide garments and everyday gear that project moral fortitude, modesty, physical presence, and uncompromised identity."
  },
  {
    id: "AIM-04",
    target: "REPLACE DISPOSABLE CLOTHING WITH ENDURING INSTRUMENTS",
    detail: "Maturate an ethical domestic textile manufacturing pipeline in Pakistan utilizing heavyweight 400+ GSM natural yarns and non-toxic dyes."
  }
] as const;

export const FOUR_AXIOMS: Axiom[] = [
  {
    code: "01",
    title: "SOVEREIGNTY OVER BILLBOARD CULTURE",
    subheading: "REJECTION OF COMMERCIAL COMMODIFICATION",
    thesis: "Modern consumer culture compels the individual to purchase branded apparel, turning the human chest into free advertising space for conglomerates. We reject this commodification. What you wear in public should articulate your own Deen, your own discipline, and your own moral stance—not build market cap for a corporation.",
    imperative: "Own your surface. Do not lease your body to corporate trademarks."
  },
  {
    code: "02",
    title: "THE HIERARCHY OF PRESENCE",
    subheading: "PERSON → SYMBOL → ARTEFACT → MAKER",
    thesis: "In our hierarchy, the person is paramount. The symbol manifests their inner conviction. The artefact is the functional vessel that carries it through daily life. The maker remains discreetly tucked inside the collar. SYMBOLIC exists to empower the believer's public witness, never to eclipse it.",
    imperative: "Keep the maker secondary; keep the human conviction sovereign."
  },
  {
    code: "03",
    title: "DEEN IN THE PHYSICAL REALM",
    subheading: "AUTHENTIC MUSLIM IDENTITY IS NOT COSTUME",
    thesis: "Muslim identity is neither a passing subculture nor an aesthetic gimmick. It is a comprehensive civilizational commitment defined by modesty (Haya), intellectual rigor, justice, and unwavering moral fortitude. Our symbols are physical anchors reminding the wearer of their covenants with the Creator and creation.",
    imperative: "Wear what grounds your Deen; reject what dissolves your focus."
  },
  {
    code: "04",
    title: "TACTILE PERMANENCE OVER DISPOSABILITY",
    subheading: "ENDURING ARTEFACTS FOR DELIBERATE LIVES",
    thesis: "Fast fashion manufactures disposable identities. When garments fall apart after three washes, the psychological relationship to material possessions becomes hollow and reckless. We craft 400 GSM loopback cotton, 18 oz canvas, and kiln-fired stoneware engineered to survive decades of continuous use.",
    imperative: "Acquire fewer artefacts; ensure every artefact you possess stands firm."
  }
];

export const SYMBOL_CLASSIFICATIONS: SymbolClassification[] = [
  {
    code: "EPS",
    name: "EPISTEMIC & SCRIPTURAL",
    description: "Symbols rooted in the transmission of revealed knowledge, sacred texts, preservation of Isnad (lineage), and divine commandments.",
    focus: "Quranic manuscripts, the Pen, unbroken chains of transmission, authentic scholarship.",
    exampleRef: "SYM-01-TRN // The Transmission Corpus"
  },
  {
    code: "DIS",
    name: "MORAL & DISCIPLINAL",
    description: "Symbols focusing on the internal jihad against the lower self (Nafs), patience (Sabr), uprightness (Istiqamah), and ascetic vigilance (Zuhd).",
    focus: "Internal mastery, devotional discipline, spiritual fortitude, self-accounting (Muhasabah).",
    exampleRef: "SYM-02-SBR // The Fortitude Matrix"
  },
  {
    code: "SPA",
    name: "SPATIAL & ARCHITECTURAL",
    description: "Symbols marking sacred orientation (Qibla), communal sanctuaries, architectural boundaries, and spatial awareness.",
    focus: "The Kaaba axis, Mihrab geometries, astronomical navigation, boundary demarcation.",
    exampleRef: "SYM-03-QBL // The Meridian Vector"
  },
  {
    code: "SOV",
    name: "SOVEREIGN IDENTITY",
    description: "Symbols articulating the distinctness (Ghuraba) of the believer, resistance to cultural erasure, and unapologetic public presence.",
    focus: "Dignity of the Ummah, moral courage, anti-conformity, sovereign witness.",
    exampleRef: "SYM-04-GHR // The Unyielding Stranger"
  }
];

export const CATEGORY_FRAMEWORK: CategoryPhilosophy[] = [
  {
    id: "wear",
    category: "WEAR",
    role: "Daily armor of modesty and dignified public posture. Heavyweight drape ensures the garment falls cleanly without clinging, reinforcing modest silhouettes.",
    materialStandard: "400 GSM combed organic cotton fleece; 280 GSM dry-touch compact jersey; pre-shrunk unbrushed loopback; double-needle 1/4\" topstitch.",
    symbolicAffinity: "Major Class I (Epistemic) and Class IV (Sovereignty) symbols positioned across upper shoulder span or back canvas.",
    makerMarkRule: "Discreet high-density woven label at inner neck seam. Zero external brand logos on chest."
  },
  {
    id: "carry",
    category: "CARRY",
    role: "Instruments of transit and stewardship. Purpose-built to securely transport sacred texts, computational tools, and field necessities.",
    materialStandard: "18 oz heavy duck cotton canvas; reinforced 1000D Cordura base; mil-spec nylon webbing; blackened steel D-rings and YKK weather-sealed zippers.",
    symbolicAffinity: "Class II (Disciplinal) technical badges debossed onto leather pull tabs or stitched into side webbing.",
    makerMarkRule: "Interior contrast identification patch with serial registration number."
  },
  {
    id: "headwear",
    category: "HEADWEAR",
    role: "Crown of focus and gaze-restraint. Acts as an immediate eye-level marker of intentionality and distinct identity in public space.",
    materialStandard: "6-panel unstructured high-density brushed cotton twill; brass slide buckle closure; moisture-wicking sweatband; reinforced buckram-free crown.",
    symbolicAffinity: "Compact geometric Class III & IV insignias embroidered tonally on front or side crown.",
    makerMarkRule: "Tonal internal tape binding; exterior is strictly reserved for the symbol."
  },
  {
    id: "vessels",
    category: "VESSELS",
    role: "Rituals of sustenance and contemplation. Enhances moments of morning contemplation, hydration, and hospitality with mindful remembrance (Dhikr).",
    materialStandard: "High-fire dense stoneware ceramic; matte raw-slip exterior; food-safe lead-free glazed interior; heat-retaining double-wall mass; unglazed footring.",
    symbolicAffinity: "Class I & II scriptural inscriptions debossed into exterior wall or thumb-rest notch.",
    makerMarkRule: "Studio stamp pressed into bottom unglazed base ring."
  }
];

export const LONG_TERM_SCALABILITY = {
  seriesLogic: "Each SERIES represents a comprehensive, multi-artefact thematic investigation lasting 12 to 24 months (e.g. Series 01: The Transmission Corpus).",
  symbolSyntax: "SYM-[SERIES_NO]-[CLASSIFICATION_ABBR]-[INDEX_NO] (e.g. SYM-01-EPS-01)",
  artefactSyntax: "ART-[MEDIUM_CODE]-[SERIES_NO]-[ARTEFACT_NO] (e.g. ART-W-01-01 for Wear Artefact 01)",
  permanentArtefacts: [
    "Core 400 GSM Black Drop-Shoulder Hooded Sweatshirt",
    "Core 280 GSM Bone Boxy Heavyweight Tee",
    "Core 6-Panel Low-Crown Brushed Twill Cap",
    "Core 450ml High-Fire Stoneware Studio Mug"
  ],
  editionRules: "Permanent artefacts remain indefinitely in inventory. Thematic Series symbols are cataloged forever in the Codex even when physical production runs conclude."
} as const;
