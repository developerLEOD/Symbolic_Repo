export interface ThreeMathematicalParams {
  proportions: string;
  symmetryGroup: string;
  tessellationOrder: number;
  wireframeDensity: number;
  scaleVector: [number, number, number];
  twistFactor: number;
  bevelRadius: number;
  radialSegments: number;
}

export interface ThreeMaterialPhysics {
  baseColor: string;
  roughness: number;
  metalness: number;
  transmission: number;
  wireframeColor: string;
  ambientOcclusionIntensity: number;
  finishType: "brutalist_concrete" | "obsidian_stone" | "unbleached_cotton" | "matte_ceramic" | "brushed_brass";
}

export interface ThreeOrbitalSatellite {
  name: string;
  shape: "sphere" | "tetrahedron" | "octahedron" | "ring";
  distance: number;
  speed: number;
  size: number;
  color: string;
}

export interface ThreeInscriptionEngraving {
  arabicText: string;
  transliteration: string;
  englishTranslation: string;
  coordinatePlacement: "zenith" | "equator" | "nadir";
}

export interface ThreeSpatialElementData {
  name: string;
  classification: string;
  philosophicalMonograph: string;
  geometryArchetype: 
    | "octagonal_stellation" 
    | "monolithic_prism" 
    | "stoneware_vessel" 
    | "torus_infinity" 
    | "dodecahedron_talisman" 
    | "mannequin_torso" 
    | "geodesic_polyhedron";
  mathematicalParameters: ThreeMathematicalParams;
  materialPhysics: ThreeMaterialPhysics;
  orbitalSatellites: ThreeOrbitalSatellite[];
  inscriptionEngraving: ThreeInscriptionEngraving;
  lightingPreset: "atelier_neutral" | "high_contrast_noir" | "warm_amber_sanctuary";
}
