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

export interface FailureCluster {
  /** Zona geográfica (coordenadas REALES de la ciudad). */
  area: string;
  lat: number;
  lon: number;
  /** Empresas con sede en esa zona, con su ciudad exacta. */
  companies: { company: string; city: string }[];
}

/**
 * Sedes REALES de las 32 empresas de la memoria externa, agrupadas por zona
 * geográfica con las coordenadas reales de cada ciudad (sin desplazamientos
 * inventados): donde varias comparten metro, el marcador es el cluster y la
 * lista muestra la ciudad exacta de cada una.
 */
export const CLUSTERS: FailureCluster[] = [
  {
    area: "Área de la Bahía de San Francisco",
    lat: 37.7749,
    lon: -122.4194,
    companies: [
      { company: "Webvan", city: "Foster City, CA" },
      { company: "Pets.com", city: "San Francisco, CA" },
      { company: "Juicero", city: "San Francisco, CA" },
      { company: "Jawbone", city: "San Francisco, CA" },
      { company: "Munchery", city: "San Francisco, CA" },
      { company: "Sprig", city: "San Francisco, CA" },
      { company: "Brandless", city: "San Francisco, CA" },
      { company: "Sidecar", city: "San Francisco, CA" },
      { company: "Homejoy", city: "San Francisco, CA" },
      { company: "Shyp", city: "San Francisco, CA" },
      { company: "Anki", city: "San Francisco, CA" },
      { company: "Forward Health (CarePods)", city: "San Francisco, CA" },
      { company: "Theranos", city: "Palo Alto, CA" },
      { company: "Better Place", city: "Palo Alto, CA (operaciones en Israel)" },
      { company: "Google+", city: "Mountain View, CA" },
      { company: "Friendster", city: "Mountain View, CA" },
      { company: "Beepi", city: "Mountain View, CA" },
      { company: "23andMe", city: "Sunnyvale, CA" },
    ],
  },
  {
    area: "Los Ángeles",
    lat: 34.0522,
    lon: -118.2437,
    companies: [{ company: "Quibi", city: "Los Ángeles, CA" }],
  },
  {
    area: "Área de Nueva York",
    lat: 40.7128,
    lon: -74.006,
    companies: [
      { company: "MoviePass", city: "Nueva York, NY" },
      { company: "Vine", city: "Nueva York, NY" },
      { company: "Kozmo.com", city: "Nueva York, NY" },
      { company: "Quirky", city: "Nueva York, NY" },
      { company: "Casper", city: "Nueva York, NY" },
      { company: "Birchbox", city: "Nueva York, NY" },
      { company: "Celsius Network", city: "Hoboken, NJ" },
    ],
  },
  {
    area: "Cambridge, Massachusetts",
    lat: 42.3736,
    lon: -71.1097,
    companies: [{ company: "IBM Watson Health", city: "Cambridge, MA" }],
  },
  {
    area: "Pittsburgh",
    lat: 40.4406,
    lon: -79.9959,
    companies: [{ company: "Argo AI", city: "Pittsburgh, PA" }],
  },
  {
    area: "Londres",
    lat: 51.5074,
    lon: -0.1278,
    companies: [
      { company: "Builder.ai", city: "Londres, R.U." },
      { company: "Babylon Health", city: "Londres, R.U." },
      { company: "Powa Technologies", city: "Londres, R.U." },
    ],
  },
  {
    area: "Nassau",
    lat: 25.0443,
    lon: -77.3504,
    companies: [{ company: "FTX", city: "Nassau, Bahamas" }],
  },
];

export const TOTAL_COMPANIES = CLUSTERS.reduce((a, c) => a + c.companies.length, 0);

/** Zona (con coordenadas reales) donde tiene sede una empresa dada. */
export function clusterOf(company: string): FailureCluster | undefined {
  return CLUSTERS.find((c) => c.companies.some((e) => e.company === company));
}

/** Ciudad exacta de la sede de una empresa. */
export function cityOfCompany(company: string): string {
  for (const c of CLUSTERS) {
    const hit = c.companies.find((e) => e.company === company);
    if (hit) return hit.city;
  }
  return "";
}

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
  cluster,
  selected,
  highlighted,
  onSelect,
}: {
  cluster: FailureCluster;
  selected: boolean;
  /** la zona contiene empresas que el PRE-MORTEM ACTUAL marcó como parecidas */
  highlighted: boolean;
  onSelect: (c: FailureCluster) => void;
}) {
  const pos = useMemo(() => latLonToVec3(cluster.lat, cluster.lon, 1.02), [cluster]);
  const ref = useRef<THREE.Mesh>(null);
  // el tamaño crece con la cantidad de empresas muertas en la zona
  const base = 0.012 + Math.min(0.014, cluster.companies.length * 0.0016);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    // pulso sutil; más fuerte si está seleccionado o si el análisis actual apunta aquí
    const amp = selected ? 0.35 : highlighted ? 0.3 : 0.12;
    const s = 1 + Math.sin(clock.elapsedTime * 3) * amp;
    ref.current.scale.setScalar(s);
  });
  const color = selected ? "#ffd35c" : highlighted ? "#e0574e" : "#f2b01e";
  return (
    <mesh
      ref={ref}
      position={pos}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(cluster);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <sphereGeometry args={[selected || highlighted ? base * 1.5 : base, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Earth({
  selected,
  highlightCompanies,
  onSelect,
}: {
  selected: FailureCluster | null;
  highlightCompanies: string[];
  onSelect: (c: FailureCluster) => void;
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
        {CLUSTERS.map((c) => (
          <Marker
            key={c.area}
            cluster={c}
            selected={selected?.area === c.area}
            highlighted={c.companies.some((e) => highlightCompanies.includes(e.company))}
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
  highlightCompanies = [],
  onSelect,
}: {
  selected: FailureCluster | null;
  /** Empresas que el pre-mortem actual marcó como parecidas: sus zonas laten en rojo. */
  highlightCompanies?: string[];
  onSelect: (c: FailureCluster) => void;
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
        <Earth selected={selected} highlightCompanies={highlightCompanies} onSelect={onSelect} />
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
