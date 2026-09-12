import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { TaxonomyCatalog, Medium, ArtifactClassification, CustomArtifactTag } from "../types";
import { handleFirestoreError, OperationType } from "./firestoreErrors";

export const DEFAULT_CLASSIFICATIONS: Medium[] = [
  {
    id: "class-wear",
    name: "WEAR",
    description: "Apparel armor and body-worn silhouettes",
    order: 1,
    types: [
      { id: "type-t-shirts", name: "T-Shirts", description: "Heavyweight and standard cut tees", order: 1 },
      { id: "type-hoodies", name: "Hoodies", description: "French terry and thermal fleece hoodies", order: 2 },
      { id: "type-full-sleeves", name: "Full Sleeves", description: "Long sleeve structured tees", order: 3 },
      { id: "type-sweatshirts", name: "Sweatshirts", description: "Crewneck thermal pullovers", order: 4 },
      { id: "type-jackets", name: "Jackets", description: "Outerwear and layered field jackets", order: 5 },
      { id: "type-overshirts", name: "Overshirts", description: "Heavyweight twill and overshirts", order: 6 }
    ]
  },
  {
    id: "class-carry",
    name: "CARRY",
    description: "Instruments of transit, transit bags and field holders",
    order: 2,
    types: [
      { id: "type-bags", name: "Bags", description: "Duffels and field carry apparatus", order: 1 },
      { id: "type-totes", name: "Totes", description: "Heavyweight duck canvas utility totes", order: 2 },
      { id: "type-wallets", name: "Wallets", description: "Leather and canvas folio card holders", order: 3 },
      { id: "type-field-organizers", name: "Field Organizers", description: "Zip folios and study sleeves", order: 4 },
      { id: "type-pouches", name: "Pouches", description: "Modular zip catchalls and pockets", order: 5 }
    ]
  },
  {
    id: "class-headwear",
    name: "HEADWEAR",
    description: "Crown of focus and gaze-restrained headwear",
    order: 3,
    types: [
      { id: "type-caps", name: "Caps", description: "Structured & unstructured 6-panel twill caps", order: 1 },
      { id: "type-beanies", name: "Beanies", description: "Ribbed knit and wool watch caps", order: 2 },
      { id: "type-low-profile", name: "Low-Profile Headwear", description: "Low-crown unstructured silhouettes", order: 3 }
    ]
  },
  {
    id: "class-vessels",
    name: "VESSELS",
    description: "Ceramics, stoneware, and contemplative drinkware",
    order: 4,
    types: [
      { id: "type-mugs", name: "Mugs", description: "Artisan stoneware & ceramic mugs", order: 1 },
      { id: "type-cups", name: "Cups", description: "Handle-less sensory tasting cups", order: 2 },
      { id: "type-bottles", name: "Bottles", description: "Insulated thermal field bottles", order: 3 },
      { id: "type-stoneware-vessels", name: "Stoneware Vessels", description: "High-fired grand vessels & jars", order: 4 }
    ]
  }
];

export const DEFAULT_MEDIUMS = DEFAULT_CLASSIFICATIONS;

export const DEFAULT_TAGS: CustomArtifactTag[] = [
  { id: "tag-heavyweight", name: "Heavyweight", description: "280 GSM to 450 GSM substantial fabrication", color: "#0c0c0c", createdAt: Date.now() },
  { id: "tag-drop-shoulder", name: "Drop Shoulder", description: "Relaxed dropped sleeve architectural drape", color: "#262626", createdAt: Date.now() },
  { id: "tag-oversized", name: "Oversized", description: "Generous proportional silhouette", color: "#3b4334", createdAt: Date.now() },
  { id: "tag-boxy-fit", name: "Boxy Fit", description: "Square cut body drape", color: "#44403c", createdAt: Date.now() },
  { id: "tag-series-01", name: "Series 01", description: "Foundational Studio Series 01", color: "#7d3f32", createdAt: Date.now() },
  { id: "tag-series-02", name: "Series 02", description: "Second Studio Release Collection", color: "#92400e", createdAt: Date.now() },
  { id: "tag-archival", name: "Archival", description: "Permanent studio heritage lineage", color: "#1e3a5f", createdAt: Date.now() },
  { id: "tag-organic-cotton", name: "Organic Cotton", description: "100% GOTS certified combed organic cotton", color: "#14532d", createdAt: Date.now() },
  { id: "tag-artisan-stoneware", name: "Artisan Stoneware", description: "Dense kiln-fired earthenware", color: "#78350f", createdAt: Date.now() },
  { id: "tag-duck-canvas", name: "18 oz Duck Canvas", description: "Heavyweight unbleached industrial canvas", color: "#57534e", createdAt: Date.now() },
  { id: "tag-steadfast-heritage", name: "Steadfast Heritage", description: "Cultural solidarity and rooted symbols", color: "#991b1b", createdAt: Date.now() },
  { id: "tag-limited-edition", name: "Limited Edition", description: "Numbered or restricted artefact run", color: "#4c1d95", createdAt: Date.now() }
];

export const INITIAL_TAXONOMY_CATALOG: TaxonomyCatalog = {
  classifications: DEFAULT_CLASSIFICATIONS,
  mediums: DEFAULT_CLASSIFICATIONS,
  tags: DEFAULT_TAGS,
  updatedAt: Date.now(),
  updatedBy: "owner"
};

let cachedTaxonomyCatalog: TaxonomyCatalog | null = null;

function cleanUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = cleanUndefined(value);
    }
  }
  return cleaned as T;
}

export async function fetchTaxonomyCatalog(): Promise<TaxonomyCatalog> {
  const path = "settings/taxonomy";
  try {
    const docRef = doc(db, "settings", "taxonomy");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as TaxonomyCatalog;
      // Ensure arrays exist
      const catalog: TaxonomyCatalog = {
        classifications: Array.isArray(data.classifications) && data.classifications.length > 0
          ? data.classifications
          : DEFAULT_CLASSIFICATIONS,
        tags: Array.isArray(data.tags) && data.tags.length > 0
          ? data.tags
          : DEFAULT_TAGS,
        updatedAt: data.updatedAt || Date.now(),
        updatedBy: data.updatedBy
      };
      cachedTaxonomyCatalog = catalog;
      return catalog;
    } else {
      // Initialize with defaults in Firestore
      await setDoc(docRef, cleanUndefined(INITIAL_TAXONOMY_CATALOG), { merge: true });
      cachedTaxonomyCatalog = INITIAL_TAXONOMY_CATALOG;
      return INITIAL_TAXONOMY_CATALOG;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return cachedTaxonomyCatalog || INITIAL_TAXONOMY_CATALOG;
  }
}

export async function saveTaxonomyCatalog(catalog: TaxonomyCatalog): Promise<TaxonomyCatalog> {
  const path = "settings/taxonomy";
  try {
    const updated: TaxonomyCatalog = {
      ...catalog,
      updatedAt: Date.now(),
      updatedBy: "owner"
    };
    const cleaned = cleanUndefined(updated);
    const docRef = doc(db, "settings", "taxonomy");
    await setDoc(docRef, cleaned, { merge: true });
    cachedTaxonomyCatalog = updated;
    return updated;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
