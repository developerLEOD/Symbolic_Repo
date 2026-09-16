import { Specimen } from "../types";

export interface SpecimenAngleSequenceItem {
  id: string;
  specimenId: string;
  medium: string;
  sku: string;
  price: number;
  material?: string;
  angleIndex: number;
  totalAnglesForSpecimen: number;
  angleLabel: string;
  image: string;
  globalIndex: number;
  totalGlobalAngles: number;
}

/**
 * Builds an exhaustive sequential list of all angle images across all specimens attached to an artifact
 */
export function buildSpecimenAngleSequence(
  specimens: Specimen[],
  fallbackGraphic?: string
): SpecimenAngleSequenceItem[] {
  const rawList: Omit<SpecimenAngleSequenceItem, "globalIndex" | "totalGlobalAngles">[] = [];

  specimens.forEach((spec) => {
    const rawImages = (spec.images && spec.images.length > 0)
      ? spec.images.filter(Boolean)
      : [spec.thumbnailImage || fallbackGraphic || "/Logo_NoName.jpg"].filter(Boolean);

    const totalAngles = rawImages.length;
    rawImages.forEach((img, aIdx) => {
      let angleLabel = "FRONT ANGLE";
      if (aIdx === 1) angleLabel = "PROFILE / PERSPECTIVE";
      else if (aIdx === 2) angleLabel = "DETAIL / MACRO";
      else if (aIdx === 3) angleLabel = "SPECIMEN FLAT";
      else if (aIdx > 3) angleLabel = `VIEW 0${aIdx + 1}`;

      rawList.push({
        id: `${spec.id}_ang_${aIdx}`,
        specimenId: spec.id,
        medium: spec.medium,
        sku: spec.sku,
        price: spec.price,
        material: spec.material,
        angleIndex: aIdx,
        totalAnglesForSpecimen: totalAngles,
        angleLabel,
        image: img
      });
    });
  });

  const totalGlobal = rawList.length;
  return rawList.map((item, idx) => ({
    ...item,
    globalIndex: idx,
    totalGlobalAngles: totalGlobal
  }));
}
