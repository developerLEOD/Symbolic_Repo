/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SymbolDossier {
  symbol: string;
  name: string;
  represents: string;
  whyChosen: string;
  communicates: string;
  wearerCarries: string;
}

export const PRESET_SYMBOL_KNOWLEDGE: Record<string, SymbolDossier> = {
  "أَلِف": {
    symbol: "أَلِف",
    name: "Alif (The Upright Stroke)",
    represents: "The primary vertical stroke of the Arabic alphabet—symbolizing Divine Oneness (Tawhid), unbending uprightness, and moral clarity that refuses to bow to compromise or falsehood.",
    whyChosen: "The human spine is engineered to stand vertical and steadfast. Alif was chosen as the inaugural symbol because upright moral character precedes all outer adornment.",
    communicates: "An unflinching refusal to compromise sacred principles for social approval. It tells the observer that the individual is anchored to truth.",
    wearerCarries: "An internal oath to maintain total honesty in speech, integrity in dealings, and steadfastness when solitary or public."
  },
  "صُمُود": {
    symbol: "صُمُود",
    name: "Sumud (Steadfast Resilience)",
    represents: "Sumud: the enduring Palestinian and Quranic discipline of steadfast rootedness, unyielding perseverance, and steadfast defiance against erasure.",
    whyChosen: "Solidarity with Falasteen is not a fleeting trend or seasonal hashtag; it is an enduring covenant. The symbol anchors this conviction in physical, tactile armor.",
    communicates: "Active, deliberate alignment with the resilient spirit of Palestine and the righteous resistance of an enduring people.",
    wearerCarries: "The solemn memory of ancestral land, the responsibility of bearing moral witness, and daily solidarity in prayers and actions."
  },
  "أَدَب": {
    symbol: "أَدَب",
    name: "Adab (Refined Manners & Reverence)",
    represents: "Adab: spiritual etiquette, refined restraint, intellectual humility, and the moral discipline that elevates bare knowledge into lived wisdom.",
    whyChosen: "True scholars and seekers have historically prioritized the cultivation of character before the accumulation of intellect. Adab is the vessel through which knowledge is received.",
    communicates: "Quiet intellectual reverence, respect for sacred teachers and tradition, and intentional restraint of speech and appetite.",
    wearerCarries: "The daily reminder that the seeker must first humble the ego before seeking to illuminate the mind."
  },
  "بَصِيرَة": {
    symbol: "بَصِيرَة",
    name: "Basirah (Spiritual Discernment)",
    represents: "Basirah: the interior perception and spiritual discernment that penetrates outward illusions to perceive the essential reality of things.",
    whyChosen: "In a consumer society drowned in superficial stimuli and noise, Basirah serves as an optical anchor to return the mind to essential, eternal truths.",
    communicates: "Prioritizing spiritual depth and character over external appearances and societal validation.",
    wearerCarries: "The intentional discipline of guarding the gaze, filtering mental input, and seeking divine guidance in discernment."
  },
  "أَمَانَة": {
    symbol: "أَمَانَة",
    name: "Amanah (The Sacred Trust)",
    represents: "Amanah: the sacred trust and custodial responsibility placed upon human beings as stewards rather than exploiters of creation.",
    whyChosen: "Everything we bear—our bodies, our intellect, our possessions, and our words—constitutes a sacred trust that will be accounted for.",
    communicates: "Careful custody, professional excellence, and ethical integrity in carrying out responsibilities.",
    wearerCarries: "The consciousness that privilege demands duty, and that all physical resources are entrusted for purposeful service."
  },
  "حِكْمَة": {
    symbol: "حِكْمَة",
    name: "Hikmah (Wisdom in Action)",
    represents: "Hikmah: the discernment to place everything in its rightful station, joining deep spiritual insight with proportionate, measured action.",
    whyChosen: "Knowledge without wisdom creates reckless noise. Hikmah anchors speech, craft, and conduct in purpose and balance.",
    communicates: "A measured, thoughtful approach to life's trials and deliberate restraint before reacting.",
    wearerCarries: "The solemn quest to seek deeper understanding before rendering judgment, and to speak only what benefits."
  }
};
