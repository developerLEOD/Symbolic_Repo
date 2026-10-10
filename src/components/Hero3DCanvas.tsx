import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface Hero3DCanvasProps {
  onOpenStudio?: () => void;
  className?: string;
}

export default function Hero3DCanvas({ onOpenStudio, className = "w-full h-full" }: Hero3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, container.clientWidth / Math.max(container.clientHeight, 1), 0.1, 50);
    camera.position.z = 5.2;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(container.clientWidth, container.clientHeight);
    } catch {
      return;
    }

    // Three-point Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xff4500, 1.8);
    dirLight1.position.set(3, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight2.position.set(-3, -2, -2);
    scene.add(dirLight2);

    // Main 3D Sacred Geometry Compound (Khatam Sulayman)
    const group = new THREE.Group();
    scene.add(group);

    // Box 1
    const pbrMat = new THREE.MeshStandardMaterial({
      color: 0x141416,
      roughness: 0.55,
      metalness: 0.35
    });
    const box1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), pbrMat);
    group.add(box1);

    // Box 2 (Rotated 45 deg)
    const box2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), pbrMat);
    box2.rotation.y = Math.PI / 4;
    box2.rotation.z = Math.PI / 4;
    group.add(box2);

    // Outer Glowing Wireframe Lattice
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });
    const wireMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.55, 1), wireMat);
    group.add(wireMesh);

    // Orbiting Satellite Ring
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.8,
      wireframe: true
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.03, 8, 36), ringMat);
    ring.rotation.x = Math.PI / 2.5;
    scene.add(ring);

    // Mouse Tracking for Parallax
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mousePosRef.current = { x, y };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries?.[0]) return;
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Continuous Turntable Rotation
      group.rotation.y += delta * 0.45;
      group.rotation.x = Math.sin(time * 0.4) * 0.2 + mousePosRef.current.y * 0.35;
      group.rotation.z = mousePosRef.current.x * 0.35;

      ring.rotation.z += delta * 0.25;

      // Bobbing
      group.position.y = Math.sin(time * 1.5) * 0.08;

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={onOpenStudio}
      data-specimen-preview="true"
      data-preview-canvas="true"
      className={`relative cursor-pointer select-none group ${className}`}
      title="Open 3D Spatial Geometry Atelier"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Floating 3D Badge Indicator */}
      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 backdrop-blur-sm border border-white/20 font-mono text-[8px] font-black uppercase text-white/90 tracking-widest flex items-center gap-1 group-hover:bg-brand-accent group-hover:border-brand-accent transition-colors">
        <span className="w-1.5 h-1.5 bg-brand-accent group-hover:bg-white rounded-none animate-pulse" />
        <span>3D SPATIAL // GEMINI</span>
      </div>
    </div>
  );
}
