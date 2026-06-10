"use client";

// ─────────────────────────────────────────────────────────────
// El mundo de los fracasos — globo 3D real (Three.js / R3F).
//
// La Tierra usa las texturas del proyecto (albedo, relieve, nubes y luces
// nocturnas) y cada marcador ámbar es la sede de una empresa real de la
// memoria externa que murió por un patrón que este agente detecta.
// Tocar un marcador abre su expediente. WebGL con respeto por el móvil:
// texturas optimizadas (22MB → 0.9MB) y geometría contenida.
// ─────────────────────────────────────────────────────────────

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export interface FailureMarker {
  company: string;
  city: string;
  lat: number;
  lon: number;
}

/** Sedes (aprox.) de empresas de la memoria externa de fracasos. */
export const MARKERS: FailureMarker[] = [
  { company: "Webvan", city: "Foster City, EE.UU.", lat: 37.55, lon: -122.27 },
  { company: "Pets.com", city: "San Francisco, EE.UU.", lat: 37.77, lon: -122.42 },
  { company: "Juicero", city: "San Francisco, EE.UU.", lat: 38.1, lon: -121.9 },
  { company: "Jawbone", city: "San Francisco, EE.UU.", lat: 37.3, lon: -123.0 },
  { company: "Theranos", city: "Palo Alto, EE.UU.", lat: 36.9, lon: -122.0 },
  { company: "Google+", city: "Mountain View, EE.UU.", lat: 37.42, lon: -121.3 },
  { company: "23andMe", city: "Sunnyvale, EE.UU.", lat: 36.4, lon: -122.6 },
  { company: "Quibi", city: "Los Ángeles, EE.UU.", lat: 34.05, lon: -118.24 },
  { company: "MoviePass", city: "Nueva York, EE.UU.", lat: 40.73, lon: -73.99 },
  { company: "Vine", city: "Nueva York, EE.UU.", lat: 41.4, lon: -73.4 },
  { company: "Kozmo.com", city: "Nueva York, EE.UU.", lat: 40.0, lon: -74.6 },
  { company: "Quirky", city: "Nueva York, EE.UU.", lat: 40.71, lon: -75.2 },
  { company: "Celsius Network", city: "Hoboken, EE.UU.", lat: 39.9, lon: -73.3 },
  { company: "IBM Watson Health", city: "Cambridge, EE.UU.", lat: 42.36, lon: -71.06 },
  { company: "Argo AI", city: "Pittsburgh, EE.UU.", lat: 40.44, lon: -79.99 },
  { company: "Builder.ai", city: "Londres, R.U.", lat: 51.51, lon: -0.13 },
  { company: "Babylon Health", city: "Londres, R.U.", lat: 50.8, lon: 0.9 },
  { company: "Powa Technologies", city: "Londres, R.U.", lat: 52.2, lon: -1.2 },
  { company: "Better Place", city: "Tel Aviv, Israel", lat: 32.07, lon: 34.79 },
  { company: "FTX", city: "Nassau, Bahamas", lat: 25.06, lon: -77.34 },
];

/** lat/lon → posición sobre la esfera (mapeo equirectangular estándar). */
function latLonToVec3(lat: number, lon: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function Marker({
  marker,
  selected,
  onSelect,
}: {
  marker: FailureMarker;
  selected: boolean;
  onSelect: (m: FailureMarker) => void;
}) {
  const pos = useMemo(() => latLonToVec3(marker.lat, marker.lon, 1.02), [marker]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    // pulso sutil; más fuerte si está seleccionado
    const s = 1 + Math.sin(clock.elapsedTime * 3) * (selected ? 0.35 : 0.12);
    ref.current.scale.setScalar(s);
  });
  return (
    <mesh
      ref={ref}
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(marker);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[selected ? 0.022 : 0.014, 12, 12]} />
      <meshBasicMaterial color={selected ? "#ffd35c" : "#f2b01e"} toneMapped={false} />
    </mesh>
  );
}

function Earth({
  selected,
  onSelect,
}: {
  selected: FailureMarker | null;
  onSelect: (m: FailureMarker) => void;
}) {
  const [albedo, night, bump, clouds] = useTexture([
    "/3d/earth-albedo.jpg",
    "/3d/earth-night.jpg",
    "/3d/earth-bump.jpg",
    "/3d/earth-clouds.png",
  ]);
  albedo.colorSpace = THREE.SRGBColorSpace;
  night.colorSpace = THREE.SRGBColorSpace;

  const globe = useRef<THREE.Group>(null);
  const cloudMesh = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    // rotación pausada; las nubes van un poco más rápido (deriva real)
    if (globe.current) globe.current.rotation.y += delta * 0.04;
    if (cloudMesh.current) cloudMesh.current.rotation.y += delta * 0.055;
  });

  return (
    <group>
      <group ref={globe}>
        <mesh>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            map={albedo}
            bumpMap={bump}
            bumpScale={0.04}
            emissiveMap={night}
            emissive={new THREE.Color("#ffc46b")}
            emissiveIntensity={0.85}
            roughness={0.9}
            metalness={0}
          />
        </mesh>
        {MARKERS.map((m) => (
          <Marker
            key={m.company}
            marker={m}
            selected={selected?.company === m.company}
            onSelect={onSelect}
          />
        ))}
      </group>
      <mesh ref={cloudMesh}>
        <sphereGeometry args={[1.012, 48, 48]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* atmósfera: halo azulado por la cara interna de una esfera mayor */}
      <mesh>
        <sphereGeometry args={[1.06, 48, 48]} />
        <meshBasicMaterial color="#3a6ea5" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

export default function World3D({
  selected,
  onSelect,
}: {
  selected: FailureMarker | null;
  onSelect: (m: FailureMarker) => void;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 2.6], fov: 45 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true }}
      style={{ touchAction: "none" }}
    >
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 2, 3]} intensity={2.2} />
      <Suspense fallback={null}>
        <Earth selected={selected} onSelect={onSelect} />
      </Suspense>
      <Stars radius={60} depth={30} count={2500} factor={3} saturation={0} fade speed={0.5} />
      <OrbitControls
        enablePan={false}
        minDistance={1.6}
        maxDistance={4.5}
        autoRotate
        autoRotateSpeed={0.25}
        enableDamping
      />
    </Canvas>
  );
}
