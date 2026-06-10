"use client";

// El notebook low-poly del proyecto (OBJ → GLB), flotando como CTA:
// "describe tu proyecto". Modelo real cargado con useGLTF.

import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense } from "react";

function Notebook() {
  const { scene } = useGLTF("/3d/notebook.glb");
  return (
    <Float speed={1.6} rotationIntensity={0.5} floatIntensity={0.9}>
      <primitive object={scene} scale={0.34} position={[0, -0.25, 0]} rotation={[0.35, -0.7, 0]} />
    </Float>
  );
}

export default function Notebook3D() {
  return (
    <Canvas camera={{ position: [0, 0.4, 3.2], fov: 40 }} dpr={[1, 1.8]} style={{ touchAction: "pan-y" }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 2]} intensity={1.6} />
      <directionalLight position={[-3, -1, -2]} intensity={0.4} color="#f2b01e" />
      <Suspense fallback={null}>
        <Notebook />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={1.2} />
    </Canvas>
  );
}

useGLTF.preload("/3d/notebook.glb");
