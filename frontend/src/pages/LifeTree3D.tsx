import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useCursor, Html, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import type { LifeTreeEntry } from '../types';
import { t } from '../i18n/t';

interface LifeTree3DProps {
  tree: LifeTreeEntry;
  theme: 'default' | 'kawaii';
  onToggleBranch: (branchId: string) => void;
  onToggleGoal: (branchId: string, goalId: string) => void;
}

type RGB = readonly [number, number, number];

interface Palette {
  cyan: RGB;
  gold: RGB;
  green: RGB;
  violet: RGB;
  rose: RGB;
  trunkA: RGB;
  trunkB: RGB;
  sky: RGB;
  ground: RGB;
  text: string;
  textDim: string;
  chipBg: string;
  chipBorder: string;
}

const PALETTES: Record<'default' | 'kawaii', Palette> = {
  default: {
    cyan: [64, 224, 208],
    gold: [240, 192, 64],
    green: [74, 222, 128],
    violet: [128, 64, 224],
    rose: [224, 64, 160],
    trunkA: [104, 74, 38],
    trunkB: [30, 20, 10],
    sky: [24, 24, 58],
    ground: [10, 10, 26],
    text: '#dbe7ff',
    textDim: 'rgba(219,231,255,0.72)',
    chipBg: 'rgba(8,10,30,0.55)',
    chipBorder: 'rgba(255,255,255,0.14)',
  },
  kawaii: {
    cyan: [255, 45, 85],
    gold: [255, 96, 136],
    green: [255, 112, 150],
    violet: [192, 96, 160],
    rose: [212, 0, 50],
    trunkA: [140, 66, 102],
    trunkB: [64, 14, 38],
    sky: [255, 212, 224],
    ground: [255, 226, 236],
    text: '#3d0a22',
    textDim: 'rgba(61,10,34,0.66)',
    chipBg: 'rgba(255,255,255,0.6)',
    chipBorder: 'rgba(61,10,34,0.14)',
  },
};

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mixColor(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

function progressColor(ratio: number, p: Palette): RGB {
  if (ratio <= 0.5) return mixColor(p.gold, p.cyan, ratio * 2);
  return mixColor(p.cyan, p.green, (ratio - 0.5) * 2);
}

function toColor(rgb: RGB) {
  return new THREE.Color().setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, THREE.SRGBColorSpace);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

interface Goal3D {
  id: string;
  title: string;
  description: string;
  done: boolean;
  pos: THREE.Vector3;
  branchId: string;
}

interface Branch3D {
  id: string;
  title: string;
  description: string;
  done: boolean;
  ratio: number;
  color: THREE.Color;
  radius: number;
  attach: THREE.Vector3;
  tip: THREE.Vector3;
  curve: THREE.Vector3[];
  curveLocal: THREE.Vector3[];
  goals: Goal3D[];
}

interface Leaf3D {
  id: string;
  branchId: string;
  title: string;
  done: boolean;
  pos: THREE.Vector3;
  color: RGB;
}

interface Foliage3D {
  pos: THREE.Vector3;
  r: number;
  color: RGB;
}

interface NaturalLimb {
  pts: THREE.Vector3[];
  radius: number;
  color: RGB;
}

interface NaturalCrown {
  roots: NaturalLimb[];
  twigs: NaturalLimb[];
  canopy: Foliage3D[];
}

interface Tree3D {
  trunkHeight: number;
  trunkBaseR: number;
  trunkTopR: number;
  trunkColor: THREE.Color;
  branches: Branch3D[];
  leaves: Leaf3D[];
  crown: NaturalCrown;
  particles: THREE.Vector3[];
}

function buildTreeData(tree: LifeTreeEntry, theme: 'default' | 'kawaii'): Tree3D {
  const p = PALETTES[theme];
  const seed =
    [...tree.id].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) ^ (tree.branches.length * 7919);
  const rand = mulberry32(seed);
  const n = tree.branches.length;

  const trunkHeight = 2.3;
  const trunkBaseR = 0.1;
  const trunkTopR = 0.05;
  const trunkColor = toColor([146, 84, 50]);

  const branches: Branch3D[] = tree.branches.map((b, i) => {
    const tt = n <= 1 ? 0.5 : i / (n - 1);
    const az = (i / Math.max(1, n)) * Math.PI * 2 + 0.85 + (rand() - 0.5) * 0.28;
    const cos = Math.cos(az);
    const sin = Math.sin(az);

    const attachH = 0.55 + tt * 1.2;
    const len = 1.15 + (1 - tt) * 0.5 + rand() * 0.16;
    const rise = 0.44 + (1 - tt) * 0.1;
    const droop = 0.22 + tt * 0.16;

    const p0 = new THREE.Vector3(cos * 0.15, attachH, sin * 0.15);
    const p1 = new THREE.Vector3(cos * len * 0.62, attachH + rise, sin * len * 0.62);
    const p2 = new THREE.Vector3(cos * len, attachH + rise - droop, sin * len);

    const kids = b.children.length;
    const doneCount = (b.done ? 1 : 0) + b.children.filter((c) => c.done).length;
    const ratio = kids + 1 > 0 ? doneCount / (kids + 1) : 0;

    const worldCurve = new THREE.CatmullRomCurve3([p0, p1, p2], false, 'centripetal', 0.5);

    const goals: Goal3D[] = b.children.map((c, ci) => {
      const f = kids <= 1 ? 0.6 : 0.42 + 0.52 * (ci / (kids - 1));
      const pos = worldCurve.getPoint(f);
      pos.x += cos * 0.06 + (rand() - 0.5) * 0.06;
      pos.z += sin * 0.06 + (rand() - 0.5) * 0.06;
      pos.y += 0.03 + rand() * 0.05;
      return { id: c.id, title: c.title, description: c.description, done: c.done, pos, branchId: b.id };
    });

    return {
      id: b.id,
      title: b.title,
      description: b.description,
      done: b.done,
      ratio,
      color: toColor(progressColor(ratio, p)),
      radius: 0.043 + ratio * 0.026,
      attach: p0,
      tip: p2,
      curve: [p0, p1, p2],
      curveLocal: [new THREE.Vector3(), p1.clone().sub(p0), p2.clone().sub(p0)],
      goals,
    };
  });

  const leaves: Leaf3D[] = branches.flatMap((br) =>
    br.goals.map((g) => ({
      id: g.id,
      branchId: g.branchId,
      title: g.title,
      done: g.done,
      pos: g.pos,
      color: progressColor(g.done ? 1 : 0, p),
    })),
  );

  // Natural broadleaf crown: roots, secondary limbs and dense foliage.
  // These are decorative, while the primary branches above remain the interactive life-map nodes.
  const wR = mulberry32((seed ^ 0x5f3759df) >>> 0);
  const barkLight: RGB = theme === 'kawaii' ? [125, 52, 83] : [99, 59, 34];
  const barkDark: RGB = theme === 'kawaii' ? [73, 20, 48] : [48, 28, 14];
  const leafPalette: RGB[] = theme === 'kawaii'
    ? [[255, 110, 155], [240, 75, 128], [255, 152, 184], [194, 53, 108]]
    : [[53, 112, 67], [67, 138, 76], [41, 88, 56], [102, 158, 82], [81, 126, 65]];
  const roots: NaturalLimb[] = [];
  for (let i = 0; i < 9; i++) {
    const az = (i / 9) * Math.PI * 2 + wR() * 0.38;
    const cos = Math.cos(az);
    const sin = Math.sin(az);
    const len = 0.58 + wR() * 0.55;
    roots.push({
      pts: [
        new THREE.Vector3(cos * 0.06, 0.06, sin * 0.06),
        new THREE.Vector3(cos * len * 0.42, 0.035 + wR() * 0.06, sin * len * 0.42),
        new THREE.Vector3(cos * len, 0.018, sin * len),
      ],
      radius: 0.035 + wR() * 0.022,
      color: wR() > 0.45 ? barkLight : barkDark,
    });
  }

  const twigs: NaturalLimb[] = [];
  const canopy: Foliage3D[] = [];
  branches.forEach((branch, branchIndex) => {
    const curve = new THREE.CatmullRomCurve3(branch.curve, false, 'centripetal', 0.5);
    const count = 4 + Math.floor(wR() * 3);
    for (let i = 0; i < count; i++) {
      const at = 0.3 + (i / Math.max(1, count - 1)) * 0.62;
      const start = curve.getPoint(at);
      const direction = branch.tip.clone().sub(branch.attach).normalize();
      const sideways = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
      const side = (i % 2 === 0 ? 1 : -1) * (0.22 + wR() * 0.22);
      const length = 0.38 + wR() * 0.42;
      const middle = start.clone().addScaledVector(direction, length * 0.48).addScaledVector(sideways, side * 0.48);
      middle.y += 0.14 + wR() * 0.16;
      const end = start.clone().addScaledVector(direction, length).addScaledVector(sideways, side);
      end.y += 0.16 + wR() * 0.32;
      twigs.push({
        pts: [start, middle, end],
        radius: 0.012 + wR() * 0.012,
        color: wR() > 0.55 ? barkLight : barkDark,
      });

      for (let leaf = 0; leaf < 8; leaf++) {
        const a = wR() * Math.PI * 2;
        const spread = 0.12 + wR() * 0.34;
        canopy.push({
          pos: end.clone().add(new THREE.Vector3(
            Math.cos(a) * spread,
            (wR() - 0.38) * 0.36,
            Math.sin(a) * spread,
          )),
          r: 0.09 + wR() * 0.12,
          color: leafPalette[(branchIndex + leaf + Math.floor(wR() * leafPalette.length)) % leafPalette.length],
        });
      }
    }
  });

  const apexY = trunkHeight * 0.9;
  for (let i = 0; i < 86; i++) {
    const az = wR() * Math.PI * 2;
    const radial = Math.pow(wR(), 0.62) * 1.42;
    const y = apexY + (wR() - 0.2) * 1.15 - radial * 0.12;
    canopy.push({
      pos: new THREE.Vector3(Math.cos(az) * radial, y, Math.sin(az) * radial * 0.78),
      r: 0.1 + wR() * 0.18,
      color: leafPalette[Math.floor(wR() * leafPalette.length)],
    });
  }

  for (let i = 0; i < 11; i++) {
    const az = (i / 11) * Math.PI * 2 + wR() * 0.2;
    const cos = Math.cos(az);
    const sin = Math.sin(az);
    const len = 0.78 + wR() * 0.52;
    twigs.push({
      pts: [
        new THREE.Vector3(0, apexY - 0.3, 0),
        new THREE.Vector3(cos * len * 0.46, apexY + 0.28 + wR() * 0.25, sin * len * 0.46),
        new THREE.Vector3(cos * len, apexY + 0.12 + wR() * 0.34, sin * len),
      ],
      radius: 0.018 + wR() * 0.01,
      color: barkLight,
    });
  }

  const particles: THREE.Vector3[] = Array.from({ length: 90 }, () => {
    const a = rand() * Math.PI * 2;
    const r = 0.9 + rand() * 1.9;
    return new THREE.Vector3(Math.cos(a) * r, rand() * 2.6, Math.sin(a) * r);
  });

  return { trunkHeight, trunkBaseR, trunkTopR, trunkColor, branches, leaves, crown: { roots, twigs, canopy }, particles };
}

interface TipInfo {
  kind: 'branch' | 'goal';
  id: string;
  title: string;
  description: string;
  done: boolean;
  ratio: number;
  childCount: number;
  x: number;
  y: number;
}

// ─── Scene pieces ───

function Trunk({ data, growth }: { data: Tree3D; growth: number }) {
  const geom = useMemo(() => {
    const g = new THREE.CylinderGeometry(data.trunkTopR, data.trunkBaseR * 1.35, data.trunkHeight, 28, 9);
    g.translate(0, data.trunkHeight / 2, 0);
    return g;
  }, [data]);
  const barkRidges = useMemo(() => Array.from({ length: 9 }, (_, index) => {
    const angle = (index / 9) * Math.PI * 2;
    const radius = data.trunkBaseR * 1.04;
    return {
      position: [Math.cos(angle) * radius, data.trunkHeight * 0.5, Math.sin(angle) * radius] as [number, number, number],
      rotation: [Math.sin(angle) * 0.06, 0, Math.cos(angle) * 0.06] as [number, number, number],
    };
  }), [data]);
  return (
    <group scale={[1, easeOutCubic(growth), 1]}>
      <mesh geometry={geom} castShadow>
        <meshStandardMaterial color={data.trunkColor} roughness={1} metalness={0} />
      </mesh>
      {barkRidges.map((ridge, index) => (
        <mesh key={index} position={ridge.position} rotation={ridge.rotation} castShadow>
          <cylinderGeometry args={[0.009, 0.015, data.trunkHeight * 0.92, 6, 3]} />
          <meshStandardMaterial color="#432714" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function BranchMesh({ branch, growth, index }: { branch: Branch3D; growth: number; index: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(branch.curveLocal, false, 'centripetal', 0.5);
    return new THREE.TubeGeometry(curve, 28, branch.radius, 7, false);
  }, [branch]);
  const bGrowth = easeOutCubic(clamp((growth - 0.1 - index * 0.08) / 0.5, 0, 1));
  return (
    <group position={branch.attach} scale={bGrowth}>
      <mesh geometry={geometry} scale={1.65}>
        <meshBasicMaterial color={branch.color} transparent opacity={0.13} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color={branch.color}
          emissive={branch.color}
          emissiveIntensity={0.27}
          roughness={0.38}
          metalness={0.12}
        />
      </mesh>
    </group>
  );
}

function CategoryOrb({
  branch,
  onHover,
  onHoverOut,
  onToggle,
}: {
  branch: Branch3D;
  onHover: (branch: Branch3D) => void;
  onHoverOut: () => void;
  onToggle: (branchId: string) => void;
}) {
  const [active, setActive] = useState(false);
  useCursor(active);
  return (
    <group position={branch.tip}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.115, 0.009, 10, 28]} />
        <meshBasicMaterial color={branch.color} transparent opacity={0.72} />
      </mesh>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setActive(true);
          onHover(branch);
        }}
        onPointerOut={() => {
          setActive(false);
          onHoverOut();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(branch.id);
        }}
      >
        <sphereGeometry args={[0.095, 24, 24]} />
        <meshStandardMaterial
          color={branch.color}
          emissive={branch.color}
          emissiveIntensity={active ? 1.5 : 0.78}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function Leaves({
  leaves,
  growth,
  onHover,
  onHoverOut,
  onToggle,
}: {
  leaves: Leaf3D[];
  growth: number;
  onHover: (leaf: Leaf3D) => void;
  onHoverOut: () => void;
  onToggle: (leaf: Leaf3D) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const [hovered, setHovered] = useState<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const baseColor = useMemo(() => new THREE.Color(), []);
  const white = useMemo(() => new THREE.Color(0xffffff), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    leaves.forEach((l, i) => {
      baseColor.setRGB(l.color[0] / 255, l.color[1] / 255, l.color[2] / 255, THREE.SRGBColorSpace);
      mesh.setColorAt(i, i === hovered ? baseColor.clone().lerp(white, 0.55) : baseColor);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [leaves, hovered, baseColor, white]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const time = clock.getElapsedTime();
    leaves.forEach((l, i) => {
      const pop = easeOutBack(clamp((growth - 0.42 - i * 0.022) / 0.45, 0, 1));
      const float = Math.sin(time * 1.3 + i * 0.7) * 0.014;
      dummy.position.set(l.pos.x, l.pos.y + float, l.pos.z);
      dummy.scale.setScalar(Math.max(0.0001, pop * (i === hovered ? 1.45 : 1)));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (leaves.length === 0) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, leaves.length]}
      castShadow
      onPointerOver={(e) => {
        if (e.instanceId != null) {
          e.stopPropagation();
          setHovered(e.instanceId);
          onHover(leaves[e.instanceId]);
        }
      }}
      onPointerOut={() => {
        setHovered(null);
        onHoverOut();
      }}
      onClick={(e) => {
        if (e.instanceId != null) {
          e.stopPropagation();
          onToggle(leaves[e.instanceId]);
        }
      }}
    >
      <icosahedronGeometry args={[0.068, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function NaturalLimbMesh({ limb, growth }: { limb: NaturalLimb; growth: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(limb.pts, false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, 16, limb.radius, 6, false);
  }, [limb]);
  if (growth < 0.28) return null;
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial color={toColor(limb.color)} roughness={1} metalness={0} />
    </mesh>
  );
}

function Canopy({ blobs, growth }: { blobs: Foliage3D[]; growth: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    blobs.forEach((it, i) => {
      c.setRGB(it.color[0] / 255, it.color[1] / 255, it.color[2] / 255, THREE.SRGBColorSpace);
      mesh.setColorAt(i, c);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blobs, c]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    blobs.forEach((it, i) => {
      const s = easeOutCubic(clamp((growth - 0.3 - i * 0.003) / 0.52, 0, 1));
      dummy.position.copy(it.pos);
      dummy.scale.set(it.r * s * 1.05, it.r * s * (0.8 + (i % 3) * 0.12), it.r * s);
      dummy.rotation.set((i % 5) * 0.32, (i % 7) * 0.48, (i % 3) * 0.2);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (blobs.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blobs.length]} frustumCulled={false}>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={0.82} metalness={0.02} />
    </instancedMesh>
  );
}

function NodeLabels({
  branches,
  leaves,
  growth,
}: {
  branches: Branch3D[];
  leaves: Leaf3D[];
  growth: number;
}) {
  const branchOpacity = clamp((growth - 0.45) / 0.4, 0, 1);
  const goalOpacity = clamp((growth - 0.55) / 0.4, 0, 1);
  return (
    <>
      {branches.map((br) => (
        <Html
          key={`bl:${br.id}`}
          position={[br.tip.x, br.tip.y + 0.24, br.tip.z]}
          center
          distanceFactor={5.8}
          zIndexRange={[12, 0]}
          style={{ pointerEvents: 'none', opacity: branchOpacity }}
        >
          <span
            className="whitespace-nowrap rounded-full px-2 py-0.5 font-semibold"
            style={{
              fontSize: 12,
              color: '#eaffff',
              background: 'rgba(5,13,28,0.82)',
              border: '1px solid rgba(64,224,208,0.62)',
              boxShadow: '0 0 14px rgba(64,224,208,0.28)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              maxWidth: 180,
            }}
          >
            {br.title}
          </span>
        </Html>
      ))}
      {leaves.map((l) => (
        <Html
          key={`gl:${l.id}`}
          position={[l.pos.x, l.pos.y - 0.09, l.pos.z]}
          center
          distanceFactor={5.8}
          zIndexRange={[12, 0]}
          style={{ pointerEvents: 'none', opacity: goalOpacity }}
        >
          <span
            className="whitespace-nowrap font-semibold"
            style={{
              fontSize: 10,
              color: l.done ? '#9af7b3' : '#e2ffff',
              textShadow: '0 0 7px rgba(64,224,208,0.9), 0 1px 2px rgba(0,0,0,0.8)',
              maxWidth: 140,
              display: 'inline-block',
            }}
          >
            {l.title}
          </span>
        </Html>
      ))}
    </>
  );
}

function GlowParticles({ points }: { points: THREE.Vector3[] }) {
  const ref = useRef<THREE.Points>(null!);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap((p) => [p.x, p.y, p.z]), 3));
    return g;
  }, [points]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.04;
  });
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial
        size={0.02}
        color="#ffffff"
        transparent
        opacity={0.3}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

function Rig({ theme }: { theme: 'default' | 'kawaii' }) {
  const isKawaii = theme === 'kawaii';
  return (
    <>
      <fog attach="fog" args={[isKawaii ? '#3d0a22' : '#071126', 6, 15]} />
      <ambientLight intensity={0.36} />
      <hemisphereLight
        args={[
          isKawaii ? toColor([255, 138, 178]) : toColor([74, 122, 205]),
          isKawaii ? toColor([88, 15, 48]) : toColor([7, 18, 34]),
          0.6,
        ]}
      />
      <directionalLight position={[4, 6, 3]} intensity={1.35} color={isKawaii ? '#ffe2ee' : '#cfe8ff'} />
      <pointLight position={[-3, 2.6, -3]} intensity={0.85} color={toColor([240, 192, 64])} />
      <pointLight position={[3, 1.4, 4]} intensity={0.58} color={toColor(isKawaii ? [255, 45, 85] : [64, 224, 208])} />
    </>
  );
}

function Scene3D({
  data,
  theme,
  onHover,
  onToggleBranch,
  onToggleGoal,
}: {
  data: Tree3D;
  theme: 'default' | 'kawaii';
  onHover: (info: TipInfo | null) => void;
  onToggleBranch: (branchId: string) => void;
  onToggleGoal: (branchId: string, goalId: string) => void;
}) {
  const camera = useThree((s) => s.camera);
  const growthRef = useRef(0);
  const [growth, setGrowth] = useState(0);

  useFrame((_, delta) => {
    if (growthRef.current >= 1) return;
    growthRef.current = Math.min(1, growthRef.current + delta / 2.1);
    setGrowth(easeOutCubic(growthRef.current));
  });

  const project = (point: THREE.Vector3) => {
    const v = point.clone().project(camera);
    return {
      x: clamp((v.x * 0.5 + 0.5) * 100, 8, 92),
      y: clamp((1 - (v.y * 0.5 + 0.5)) * 100, 8, 92),
    };
  };

  const hoverBranch = (br: Branch3D) => {
    const s = project(br.tip);
    onHover({
      kind: 'branch',
      id: br.id,
      title: br.title,
      description: br.description,
      done: br.done,
      ratio: br.ratio,
      childCount: br.goals.length,
      x: s.x,
      y: s.y,
    });
  };

  const hoverLeaf = (leaf: Leaf3D) => {
    const s = project(leaf.pos);
    const br = data.branches.find((b) => b.id === leaf.branchId);
    const goal = br?.goals.find((g) => g.id === leaf.id);
    onHover({
      kind: 'goal',
      id: leaf.id,
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      done: goal?.done ?? false,
      ratio: goal?.done ? 1 : 0,
      childCount: 0,
      x: s.x,
      y: s.y,
    });
  };

  return (
    <>
      <Stars
        radius={28}
        depth={12}
        count={theme === 'kawaii' ? 900 : 1500}
        factor={2.2}
        saturation={0.35}
        fade
        speed={0.35}
      />
      <Rig theme={theme} />
      <Trunk data={data} growth={growth} />
      {data.crown.roots.map((root, i) => (
        <NaturalLimbMesh key={`root:${i}`} limb={root} growth={growth} />
      ))}
      {data.crown.twigs.map((twig, i) => (
        <NaturalLimbMesh key={`twig:${i}`} limb={twig} growth={growth} />
      ))}
      <Canopy blobs={data.crown.canopy} growth={growth} />
      {data.branches.map((br, i) => (
        <BranchMesh key={br.id} branch={br} growth={growth} index={i} />
      ))}
      {data.branches.map((br) => (
        <CategoryOrb
          key={br.id}
          branch={br}
          onHover={hoverBranch}
          onHoverOut={() => onHover(null)}
          onToggle={onToggleBranch}
        />
      ))}
      <Leaves
        leaves={data.leaves}
        growth={growth}
        onHover={hoverLeaf}
        onHoverOut={() => onHover(null)}
        onToggle={(leaf) => onToggleGoal(leaf.branchId, leaf.id)}
      />
      <NodeLabels branches={data.branches} leaves={data.leaves} growth={growth} />
      <GlowParticles points={data.particles} />
      <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={8} blur={2.4} far={3.2} color="#000000" />
      <OrbitControls
        makeDefault
        target={[0, 1.05, 0]}
        enablePan={false}
        minDistance={2.2}
        maxDistance={9}
        maxPolarAngle={Math.PI / 2.12}
        minPolarAngle={0.3}
        autoRotate
        autoRotateSpeed={0.9}
      />
      <EffectComposer>
        <Bloom intensity={0.95} luminanceThreshold={0.22} luminanceSmoothing={0.35} mipmapBlur />
        <Vignette eskil={false} offset={0.18} darkness={0.68} />
      </EffectComposer>
    </>
  );
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

// ─── Public component ───

export default function LifeTree3D({
  tree,
  theme,
  onToggleBranch,
  onToggleGoal,
}: LifeTree3DProps) {
  const [hover, setHover] = useState<TipInfo | null>(null);
  const data = useMemo(() => buildTreeData(tree, theme), [tree, theme]);
  const [gl] = useState(() => webglAvailable());
  const completedGoals = data.leaves.filter((leaf) => leaf.done).length;
  const totalGoals = data.leaves.length;
  const overallProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const above = (hover?.y ?? 0) > 46;

  return (
    <div className="relative h-[540px] md:h-[720px] overflow-hidden rounded-2xl border border-white/10 bg-[#071126]">
      {/* Cinematic sky backdrop */}
      <div
        className="absolute inset-0"
        style={{
          background: theme === 'kawaii'
            ? 'radial-gradient(circle at 72% 18%, rgba(255,142,184,0.44), transparent 22%), radial-gradient(circle at 20% 85%, rgba(211,63,127,0.22), transparent 28%), linear-gradient(160deg, #2b0820 0%, #100516 58%, #06030b 100%)'
            : 'radial-gradient(circle at 70% 16%, rgba(64,224,208,0.18), transparent 22%), radial-gradient(circle at 18% 88%, rgba(92,107,192,0.22), transparent 32%), linear-gradient(160deg, #102a53 0%, #0a1731 50%, #040915 100%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-40 bg-gradient-to-b from-black/35 to-transparent" />

      {gl ? (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [3.6, 2.8, 5.4], fov: 42 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <Suspense fallback={null}>
            <Scene3D
              data={data}
              theme={theme}
              onHover={setHover}
              onToggleBranch={onToggleBranch}
              onToggleGoal={onToggleGoal}
            />
          </Suspense>
        </Canvas>
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-xs text-slate-700/70 px-6 text-center">
            WebGL is not supported by this browser, so the 3D Life Tree can't render. The branch cards below still work.
          </p>
        </div>
      )}

      {/* Soft vignette over the scene */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#020611]/65 to-transparent" />

      {/* Scene HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 md:p-5">
        <div className="rounded-xl border border-white/10 bg-[#050816]/55 px-3 py-2 backdrop-blur-md">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cosmic-cyan">Living map</p>
          <p className="mt-0.5 text-xs font-medium text-white">{tree.title}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#050816]/55 px-3 py-2 text-right backdrop-blur-md">
          <p className="text-lg font-semibold leading-none text-white tabular-nums">{overallProgress}%</p>
          <p className="mt-1 text-[9px] uppercase tracking-wider text-navy-200/70">growth</p>
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-xl border border-white/10 bg-[#050816]/55 px-3 py-2 backdrop-blur-md md:bottom-5 md:left-5">
        <p className="text-[10px] text-navy-100/85"><span className="text-cosmic-cyan">Bright branches</span> are life paths · <span className="text-cosmic-gold">click</span> a node to complete</p>
      </div>

      {/* Hover card */}
      <AnimatePresence>
        {hover && (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: `${hover.x}%`,
              top: `${hover.y}%`,
              transform: `translate(-50%, ${above ? 'calc(-100% - 18px)' : '18px'})`,
            }}
          >
            <motion.div
              key={hover.id}
              initial={{ opacity: 0, scale: 0.92, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.16 }}
              className="glass-card w-72 max-w-[78vw] p-3.5"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: PALETTES[theme].textDim }}>
                  {hover.childCount > 0 ? t('lifeTree.branch') : t('lifeTree.goal')}
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    color: hover.done ? '#ffffff' : PALETTES[theme].text,
                    background: hover.done ? `rgba(74,222,128,0.85)` : `rgba(64,224,208,0.16)`,
                  }}
                >
                  {hover.done ? t('lifeTree.complete') : t('lifeTree.inProgress')}
                </span>
              </div>
              <p className="text-sm font-semibold leading-snug" style={{ color: PALETTES[theme].text }}>
                {hover.title || '...'}
              </p>
              {hover.description && (
                <p className="text-xs leading-snug mt-1 line-clamp-3" style={{ color: PALETTES[theme].textDim }}>
                  {hover.description}
                </p>
              )}
              {hover.childCount > 0 && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[10px] mb-1" style={{ color: PALETTES[theme].textDim }}>
                    <span>{hover.childCount} {t('lifeTree.goals')}</span>
                    <span style={{ color: `rgb(${progressColor(hover.ratio, PALETTES[theme]).join(',')})` }}>
                      {Math.round(hover.ratio * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(64,224,208,0.14)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(hover.ratio * 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, rgba(240,192,64,0.9), rgb(${progressColor(0.5, PALETTES[theme]).join(',')}))` }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
