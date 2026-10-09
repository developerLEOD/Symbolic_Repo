import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { ThreeSpatialElementData } from "../types/threeGeometry";

interface ThreeArtifactViewerProps {
  data: ThreeSpatialElementData;
  viewMode?: "solid" | "wireframe" | "dual" | "exploded";
  isAutoRotate?: boolean;
  rotationSpeed?: number;
  explodeFactor?: number;
  wireframeOnly?: boolean;
  showLattice?: boolean;
  className?: string;
  onSnapshotReady?: (dataUrl: string) => void;
}

export default function ThreeArtifactViewer({
  data,
  viewMode = "dual",
  isAutoRotate = true,
  rotationSpeed = 1.0,
  explodeFactor = 0,
  showLattice = true,
  className = "w-full h-full min-h-[380px]",
  onSnapshotReady
}: ThreeArtifactViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const mainGroupRef = useRef<THREE.Group | null>(null);
  const satellitesGroupRef = useRef<THREE.Group | null>(null);
  const explodedMeshesRef = useRef<Array<{ mesh: THREE.Mesh; basePos: THREE.Vector3; normal: THREE.Vector3 }>>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Mouse / Touch Interaction State
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const sphericalRef = useRef(new THREE.Spherical(5.4, Math.PI / 2.3, Math.PI / 4));
  const targetSphericalRef = useRef(new THREE.Spherical(5.4, Math.PI / 2.3, Math.PI / 4));
  const [contextLost, setContextLost] = useState(false);

  // Take Snapshot function exposed via parent callback
  const captureSnapshot = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    if (onSnapshotReady) {
      onSnapshotReady(dataUrl);
    }
  }, [onSnapshotReady]);

  // Set up Three.js Scene, Camera, Renderer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100
    );
    cameraRef.current = camera;

    // Renderer
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      rendererRef.current = renderer;
    } catch (e) {
      console.warn("WebGL initialization note:", e);
      setContextLost(true);
      return;
    }

    // Context Lost & Restored
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

    // Three-point Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.9);
    fillLight.position.set(-5, -2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff4500, 1.4);
    rimLight.position.set(0, 5, -6);
    scene.add(rimLight);

    // Root Groups
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);
    mainGroupRef.current = mainGroup;

    const satellitesGroup = new THREE.Group();
    scene.add(satellitesGroup);
    satellitesGroupRef.current = satellitesGroup;

    // Subtle Ground Shadow Grid
    const gridHelper = new THREE.GridHelper(8, 16, 0xff4500, 0x27272a);
    gridHelper.position.y = -2.1;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    (gridHelper.material as THREE.Material).transparent = true;
    scene.add(gridHelper);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || !entries[0]) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // Mouse / Touch Controls
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      isDraggingRef.current = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      prevMousePosRef.current = { x: clientX, y: clientY };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevMousePosRef.current.x;
      const deltaY = clientY - prevMousePosRef.current.y;
      prevMousePosRef.current = { x: clientX, y: clientY };

      const rotateSpeed = 0.006;
      targetSphericalRef.current.theta -= deltaX * rotateSpeed;
      targetSphericalRef.current.phi -= deltaY * rotateSpeed;
      // Clamp elevation
      targetSphericalRef.current.phi = Math.max(0.15, Math.min(Math.PI - 0.15, targetSphericalRef.current.phi));
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.0025;
      targetSphericalRef.current.radius += e.deltaY * zoomSpeed;
      targetSphericalRef.current.radius = Math.max(2.6, Math.min(9.5, targetSphericalRef.current.radius));
    };

    canvas.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    canvas.addEventListener("touchstart", handlePointerDown, { passive: true });
    window.addEventListener("touchmove", handlePointerMove, { passive: true });
    window.addEventListener("touchend", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      const delta = clock.getDelta();

      // Auto rotation
      if (isAutoRotate && !isDraggingRef.current) {
        targetSphericalRef.current.theta += delta * 0.45 * rotationSpeed;
      }

      // Smooth damping / spherical lerp
      sphericalRef.current.radius += (targetSphericalRef.current.radius - sphericalRef.current.radius) * 0.1;
      sphericalRef.current.theta += (targetSphericalRef.current.theta - sphericalRef.current.theta) * 0.1;
      sphericalRef.current.phi += (targetSphericalRef.current.phi - sphericalRef.current.phi) * 0.1;

      camera.position.setFromSpherical(sphericalRef.current);
      camera.lookAt(0, 0, 0);

      // Rotate Satellites
      if (satellitesGroupRef.current) {
        satellitesGroupRef.current.rotation.y += delta * 0.6 * rotationSpeed;
        satellitesGroupRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.15;
      }

      // Floating bobbing effect for main specimen
      if (mainGroupRef.current) {
        mainGroupRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.2) * 0.08;
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      canvas.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      renderer.dispose();
    };
  }, [isAutoRotate, rotationSpeed]);

  // Construct Geometries & Materials whenever `data`, `viewMode`, or `explodeFactor` changes
  useEffect(() => {
    const mainGroup = mainGroupRef.current;
    const satellitesGroup = satellitesGroupRef.current;
    if (!mainGroup || !satellitesGroup) return;

    // Clear old children
    while (mainGroup.children.length > 0) {
      const child = mainGroup.children[0];
      mainGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material?.dispose();
        }
      }
    }

    while (satellitesGroup.children.length > 0) {
      const child = satellitesGroup.children[0];
      satellitesGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    }

    explodedMeshesRef.current = [];

    const {
      geometryArchetype,
      mathematicalParameters,
      materialPhysics,
      orbitalSatellites,
      lightingPreset
    } = data;

    // Update lighting based on preset
    if (sceneRef.current) {
      const lights = sceneRef.current.children.filter(c => c instanceof THREE.Light);
      if (lightingPreset === "warm_amber_sanctuary") {
        lights.forEach(l => {
          if (l instanceof THREE.DirectionalLight) l.color.setHex(0xf59e0b);
        });
      } else if (lightingPreset === "high_contrast_noir") {
        lights.forEach(l => {
          if (l instanceof THREE.DirectionalLight) l.color.setHex(0xffffff);
        });
      } else {
        lights.forEach(l => {
          if (l instanceof THREE.DirectionalLight) l.color.setHex(0xffffff);
        });
      }
    }

    // Colors & Finish
    const baseColor = new THREE.Color(materialPhysics.baseColor || "#18181b");
    const wireframeColor = new THREE.Color(materialPhysics.wireframeColor || "#ff4500");

    // Standard PBR Material
    const pbrMaterial = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: Math.max(0.1, Math.min(1.0, materialPhysics.roughness ?? 0.6)),
      metalness: Math.max(0.0, Math.min(1.0, materialPhysics.metalness ?? 0.3)),
      wireframe: viewMode === "wireframe",
      flatShading: geometryArchetype === "dodecahedron_talisman" || geometryArchetype === "monolithic_prism"
    });

    // Wireframe Lattice Cage Material
    const latticeMaterial = new THREE.MeshBasicMaterial({
      color: wireframeColor,
      wireframe: true,
      transparent: true,
      opacity: viewMode === "wireframe" ? 0.9 : 0.45
    });

    const scale = mathematicalParameters.scaleVector || [1.2, 1.2, 1.2];

    // Build Specific Procedural Geometry Archetypes
    switch (geometryArchetype) {
      case "octagonal_stellation": {
        // Compound 8-Point Islamic Star Polyhedron (Khatam Sulayman)
        const boxGeo1 = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        const boxMesh1 = new THREE.Mesh(boxGeo1, pbrMaterial);
        mainGroup.add(boxMesh1);

        const boxGeo2 = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        const boxMesh2 = new THREE.Mesh(boxGeo2, pbrMaterial);
        boxMesh2.rotation.y = Math.PI / 4;
        boxMesh2.rotation.z = Math.PI / 4;
        mainGroup.add(boxMesh2);

        if (viewMode === "dual" || showLattice) {
          const wireGeo = new THREE.OctahedronGeometry(1.65, 1);
          const wireMesh = new THREE.Mesh(wireGeo, latticeMaterial);
          mainGroup.add(wireMesh);
        }

        // Exploded parts setup
        explodedMeshesRef.current = [
          { mesh: boxMesh1, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, 1, 0) },
          { mesh: boxMesh2, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, -1, 0) }
        ];
        break;
      }

      case "monolithic_prism": {
        // Heavy Brutalist Octagonal Monolith
        const prismGeo = new THREE.CylinderGeometry(0.9, 1.1, 2.6, 8);
        const prismMesh = new THREE.Mesh(prismGeo, pbrMaterial);
        mainGroup.add(prismMesh);

        // Core Inscription Cutout Plate
        const plateGeo = new THREE.BoxGeometry(0.85, 1.4, 1.85);
        const plateMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color("#050505"),
          roughness: 0.95,
          metalness: 0.1
        });
        const plateMesh = new THREE.Mesh(plateGeo, plateMaterial);
        mainGroup.add(plateMesh);

        if (viewMode === "dual" || showLattice) {
          const cageGeo = new THREE.CylinderGeometry(1.15, 1.35, 2.8, 8);
          const cageMesh = new THREE.Mesh(cageGeo, latticeMaterial);
          mainGroup.add(cageMesh);
        }

        explodedMeshesRef.current = [
          { mesh: prismMesh, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, 0.8, 0) },
          { mesh: plateMesh, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, -0.8, 0) }
        ];
        break;
      }

      case "stoneware_vessel": {
        // Lathed 3D Contemplation Stoneware Urn / Vessel
        const points: THREE.Vector2[] = [];
        points.push(new THREE.Vector2(0.01, -1.3)); // base center
        points.push(new THREE.Vector2(0.7, -1.3));  // base foot ring
        points.push(new THREE.Vector2(0.95, -0.8)); // lower belly
        points.push(new THREE.Vector2(1.15, 0.0));  // wide belly
        points.push(new THREE.Vector2(0.75, 0.8));  // shoulder
        points.push(new THREE.Vector2(0.45, 1.1));  // neck
        points.push(new THREE.Vector2(0.55, 1.35)); // flared lip
        points.push(new THREE.Vector2(0.48, 1.35)); // interior lip
        points.push(new THREE.Vector2(0.38, 1.05)); // interior neck
        points.push(new THREE.Vector2(0.01, -1.15)); // interior floor

        const latheGeo = new THREE.LatheGeometry(points, mathematicalParameters.radialSegments || 36);
        const vesselMesh = new THREE.Mesh(latheGeo, pbrMaterial);
        mainGroup.add(vesselMesh);

        // Vessel Stand / Pedestal
        const pedestalGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.25, 8);
        const pedestalMesh = new THREE.Mesh(pedestalGeo, new THREE.MeshStandardMaterial({
          color: new THREE.Color("#111111"),
          roughness: 0.9,
          metalness: 0.2
        }));
        pedestalMesh.position.y = -1.45;
        mainGroup.add(pedestalMesh);

        if (viewMode === "dual" || showLattice) {
          const wireVesselGeo = new THREE.LatheGeometry(points, 12);
          const wireVesselMesh = new THREE.Mesh(wireVesselGeo, latticeMaterial);
          wireVesselMesh.scale.set(1.05, 1.05, 1.05);
          mainGroup.add(wireVesselMesh);
        }

        explodedMeshesRef.current = [
          { mesh: vesselMesh, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, 0.6, 0) },
          { mesh: pedestalMesh, basePos: new THREE.Vector3(0, -1.45, 0), normal: new THREE.Vector3(0, -1, 0) }
        ];
        break;
      }

      case "torus_infinity": {
        // Continuous Conviction Infinity Knot (Sacred Topology)
        const knotGeo = new THREE.TorusKnotGeometry(1.2, 0.38, 128, 32, 2, 3);
        const knotMesh = new THREE.Mesh(knotGeo, pbrMaterial);
        mainGroup.add(knotMesh);

        if (viewMode === "dual" || showLattice) {
          const wireKnotGeo = new THREE.TorusKnotGeometry(1.28, 0.42, 64, 16, 2, 3);
          const wireKnotMesh = new THREE.Mesh(wireKnotGeo, latticeMaterial);
          mainGroup.add(wireKnotMesh);
        }

        explodedMeshesRef.current = [
          { mesh: knotMesh, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, 0.5, 0) }
        ];
        break;
      }

      case "dodecahedron_talisman": {
        // 12-Sided Faceted Sacred Polyhedron
        const dGeo = new THREE.DodecahedronGeometry(1.4, 0);
        const dMesh = new THREE.Mesh(dGeo, pbrMaterial);
        mainGroup.add(dMesh);

        // Core Floating Crystal
        const innerGeo = new THREE.OctahedronGeometry(0.85, 0);
        const innerMat = new THREE.MeshStandardMaterial({
          color: wireframeColor,
          roughness: 0.2,
          metalness: 0.8
        });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        mainGroup.add(innerMesh);

        if (viewMode === "dual" || showLattice) {
          const cageGeo = new THREE.DodecahedronGeometry(1.65, 0);
          const cageMesh = new THREE.Mesh(cageGeo, latticeMaterial);
          mainGroup.add(cageMesh);
        }

        explodedMeshesRef.current = [
          { mesh: dMesh, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, 0.7, 0) },
          { mesh: innerMesh, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, -0.7, 0) }
        ];
        break;
      }

      case "mannequin_torso": {
        // Drop-Shoulder Heavyweight 480 GSM Armor Silhouette
        // Chest Block
        const chestGeo = new THREE.BoxGeometry(1.85, 1.6, 0.95);
        const chestMesh = new THREE.Mesh(chestGeo, pbrMaterial);
        chestMesh.position.y = 0.1;
        mainGroup.add(chestMesh);

        // Collar Ring
        const collarGeo = new THREE.TorusGeometry(0.42, 0.08, 16, 32);
        collarGeo.rotateX(Math.PI / 2);
        const collarMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#050505"), roughness: 0.9 });
        const collarMesh = new THREE.Mesh(collarGeo, collarMat);
        collarMesh.position.y = 0.95;
        mainGroup.add(collarMesh);

        // Drop Shoulders
        const leftArmGeo = new THREE.CylinderGeometry(0.38, 0.32, 1.1, 16);
        leftArmGeo.rotateZ(Math.PI / 8);
        const leftArmMesh = new THREE.Mesh(leftArmGeo, pbrMaterial);
        leftArmMesh.position.set(-1.15, 0.15, 0);
        mainGroup.add(leftArmMesh);

        const rightArmGeo = new THREE.CylinderGeometry(0.38, 0.32, 1.1, 16);
        rightArmGeo.rotateZ(-Math.PI / 8);
        const rightArmMesh = new THREE.Mesh(rightArmGeo, pbrMaterial);
        rightArmMesh.position.set(1.15, 0.15, 0);
        mainGroup.add(rightArmMesh);

        // Chest Graphic / Inscription Plate
        const graphicGeo = new THREE.PlaneGeometry(0.95, 0.75);
        const graphicMat = new THREE.MeshBasicMaterial({
          color: wireframeColor,
          wireframe: true,
          side: THREE.DoubleSide
        });
        const graphicMesh = new THREE.Mesh(graphicGeo, graphicMat);
        graphicMesh.position.set(0, 0.3, 0.49);
        mainGroup.add(graphicMesh);

        if (viewMode === "dual" || showLattice) {
          const wireChestGeo = new THREE.BoxGeometry(2.0, 1.8, 1.1);
          const wireChestMesh = new THREE.Mesh(wireChestGeo, latticeMaterial);
          wireChestMesh.position.y = 0.1;
          mainGroup.add(wireChestMesh);
        }

        explodedMeshesRef.current = [
          { mesh: chestMesh, basePos: new THREE.Vector3(0, 0.1, 0), normal: new THREE.Vector3(0, 0, 0.4) },
          { mesh: leftArmMesh, basePos: new THREE.Vector3(-1.15, 0.15, 0), normal: new THREE.Vector3(-0.8, 0, 0) },
          { mesh: rightArmMesh, basePos: new THREE.Vector3(1.15, 0.15, 0), normal: new THREE.Vector3(0.8, 0, 0) },
          { mesh: collarMesh, basePos: new THREE.Vector3(0, 0.95, 0), normal: new THREE.Vector3(0, 0.6, 0) }
        ];
        break;
      }

      case "geodesic_polyhedron":
      default: {
        // Geodesic Polyhedral Dome
        const geoGeo = new THREE.IcosahedronGeometry(1.4, 1);
        const geoMesh = new THREE.Mesh(geoGeo, pbrMaterial);
        mainGroup.add(geoMesh);

        if (viewMode === "dual" || showLattice) {
          const wireGeo = new THREE.IcosahedronGeometry(1.6, 1);
          const wireMesh = new THREE.Mesh(wireGeo, latticeMaterial);
          mainGroup.add(wireMesh);
        }

        explodedMeshesRef.current = [
          { mesh: geoMesh, basePos: new THREE.Vector3(0, 0, 0), normal: new THREE.Vector3(0, 0.5, 0) }
        ];
        break;
      }
    }

    // Apply scale vector
    mainGroup.scale.set(scale[0], scale[1], scale[2]);

    // Add Orbital Satellites
    if (orbitalSatellites && orbitalSatellites.length > 0) {
      orbitalSatellites.forEach((sat, i) => {
        let satGeo: THREE.BufferGeometry;
        switch (sat.shape) {
          case "octahedron":
            satGeo = new THREE.OctahedronGeometry(sat.size, 0);
            break;
          case "tetrahedron":
            satGeo = new THREE.TetrahedronGeometry(sat.size, 0);
            break;
          case "ring":
            satGeo = new THREE.TorusGeometry(sat.distance, sat.size, 8, 36);
            satGeo.rotateX(Math.PI / 2 + (i * 0.3));
            break;
          case "sphere":
          default:
            satGeo = new THREE.SphereGeometry(sat.size, 16, 16);
            break;
        }

        const satColor = new THREE.Color(sat.color || "#ff4500");
        const satMat = new THREE.MeshStandardMaterial({
          color: satColor,
          roughness: 0.3,
          metalness: 0.7,
          wireframe: sat.shape === "ring"
        });
        const satMesh = new THREE.Mesh(satGeo, satMat);

        if (sat.shape !== "ring") {
          const angle = (i / orbitalSatellites.length) * Math.PI * 2;
          satMesh.position.set(
            Math.cos(angle) * sat.distance,
            (i % 2 === 0 ? 0.4 : -0.4),
            Math.sin(angle) * sat.distance
          );
        }

        satellitesGroup.add(satMesh);
      });
    }

    // Apply Explode Separation Offset
    if (explodeFactor > 0 && explodedMeshesRef.current.length > 0) {
      explodedMeshesRef.current.forEach(({ mesh, basePos, normal }) => {
        mesh.position.copy(basePos).addScaledVector(normal, explodeFactor * 1.5);
      });
    }
  }, [data, viewMode, showLattice, explodeFactor]);

  // Update explode distance dynamically without rebuilding
  useEffect(() => {
    if (explodedMeshesRef.current.length > 0) {
      explodedMeshesRef.current.forEach(({ mesh, basePos, normal }) => {
        mesh.position.copy(basePos).addScaledVector(normal, explodeFactor * 1.5);
      });
    }
  }, [explodeFactor]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none bg-neutral-950/90 ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing outline-none"
      />

      {/* WebGL Fallback container if context fails */}
      {contextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-bg/95 p-6 text-center border-2 border-brand-accent">
          <span className="font-mono text-xs uppercase font-black text-brand-accent tracking-widest mb-1">
            // 3D SPATIAL ENGINE REINITIALIZING
          </span>
          <p className="font-mono text-[10px] text-brand-text/70 max-w-sm mb-3">
            Hardware WebGL context was reclaimed. Attempting automatic restoration of the spatial canvas.
          </p>
          <button
            onClick={() => setContextLost(false)}
            className="px-3 py-1.5 font-mono text-[10px] uppercase font-bold bg-brand-text text-brand-bg hover:bg-brand-accent hover:text-white"
          >
            RESTORE 3D CANVASES
          </button>
        </div>
      )}
    </div>
  );
}
