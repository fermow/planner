import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useCursor, Html } from '@react-three/drei';
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

interface WillowStrand {
  pts: THREE.Vector3[];
}

interface WillowData {
  strands: WillowStrand[];
  canopy: Foliage3D[];
}

interface Tree3D {
  trunkHeight: number;
  trunkBaseR: number;
  trunkTopR: number;
  trunkColor: THREE.Color;
  branches: Branch3D[];
  leaves: Leaf3D[];
  willow: WillowData;
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
      radius: 0.026 + ratio * 0.026,
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

  // Weeping-willow crown (decorative, separate from the life nodes)
  const wR = mulberry32((seed ^ 0x5f3759df) >>> 0);
  const willowaGreen: RGB = [117, 178, 96];
  const apexY = trunkHeight * 0.92;
  const strands: WillowStrand[] = [];
  for (let i = 0; i < 26; i++) {
    const az = (i / 26) * Math.PI * 2 + wR() * 0.3;
    const cos = Math.cos(az);
    const sin = Math.sin(az);
    const anchorR = 0.05 + wR() * 0.2;
    const outR = 0.45 + wR() * 0.85;
    const drop = 0.4 + wR() * 0.7;
    const lift = 0.05 + wR() * 0.18;
    const p0 = new THREE.Vector3(cos * anchorR, apexY - lift, sin * anchorR);
    const p1 = new THREE.Vector3(cos * (anchorR + outR * 0.3), apexY + 0.1, sin * (anchorR + outR * 0.3));
    const p2 = new THREE.Vector3(cos * (anchorR + outR * 0.72), apexY - drop * 0.28, sin * (anchorR + outR * 0.72));
    const p3 = new THREE.Vector3(cos * (anchorR + outR), apexY - drop, sin * (anchorR + outR));
    strands.push({ pts: [p0, p1, p2, p3] });
  }
  const canopy: Foliage3D[] = [];
  for (let i = 0; i < 24; i++) {
    canopy.push({
      pos: new THREE.Vector3((wR() - 0.5) * 0.75, apexY - 0.08 + wR() * 0.42, (wR() - 0.5) * 0.75),
      r: 0.14 + wR() * 0.18,
      color: willowaGreen,
    });
  }
  strands.forEach((s) => {
    canopy.push({ pos: s.pts[3].clone(), r: 0.05 + wR() * 0.05, color: willowaGreen });
  });

  const particles: THREE.Vector3[] = Array.from({ length: 90 }, () => {
    const a = rand() * Math.PI * 2;
    const r = 0.9 + rand() * 1.9;
    return new THREE.Vector3(Math.cos(a) * r, rand() * 2.6, Math.sin(a) * r);
  });

  return { trunkHeight, trunkBaseR, trunkTopR, trunkColor, branches, leaves, willow: { strands, canopy }, particles };
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
    const g = new THREE.CylinderGeometry(data.trunkTopR, data.trunkBaseR, data.trunkHeight, 20, 1);
    g.translate(0, data.trunkHeight / 2, 0);
    return g;
  }, [data]);
  return (
    <group scale={[1, easeOutCubic(growth), 1]}>
      <mesh geometry={geom} castShadow>
        <meshStandardMaterial color={data.trunkColor} roughness={0.95} metalness={0.02} />
      </mesh>
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
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={branch.color} roughness={0.5} metalness={0.08} />
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
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial
          color="#22c55e"
          emissive="#22c55e"
          emissiveIntensity={active ? 1.1 : 0.45}
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
      <icosahedronGeometry args={[0.05, 1]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function WillowStrand({ strand, growth }: { strand: WillowStrand; growth: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(strand.pts, false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, 18, 0.007, 5, false);
  }, [strand]);
  if (growth < 0.5) return null;
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#6f9a52" roughness={0.9} metalness={0} />
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
      const s = easeOutCubic(clamp((growth - 0.45 - i * 0.05) / 0.4, 0, 1));
      dummy.position.copy(it.pos);
      dummy.scale.setScalar(Math.max(0.0001, s * it.r));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (blobs.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blobs.length]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 2]} />
      <meshStandardMaterial transparent opacity={0.34} depthWrite={false} />
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
          distanceFactor={6.5}
          zIndexRange={[5, 0]}
          style={{ pointerEvents: 'none', opacity: branchOpacity }}
        >
          <span
            className="whitespace-nowrap rounded-full px-2 py-0.5 font-semibold"
            style={{
              fontSize: 11,
              color: '#17324a',
              background: 'rgba(255,255,255,0.78)',
              border: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 1px 5px rgba(20,70,50,0.22)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
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
          distanceFactor={6.5}
          zIndexRange={[5, 0]}
          style={{ pointerEvents: 'none', opacity: goalOpacity }}
        >
          <span
            className="whitespace-nowrap font-semibold"
            style={{
              fontSize: 10,
              color: l.done ? '#1d7a3f' : '#3c6b7a',
              textShadow: '0 0 3px rgba(255,255,255,0.7)',
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

function Rig() {
  return (
    <>
      <fog attach="fog" args={['#c9ecfb', 7, 14]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={[toColor([135, 206, 235]), toColor([154, 224, 139]), 0.55]} />
      <directionalLight position={[4, 6, 3]} intensity={1.15} color="#ffffff" />
      <pointLight position={[-3, 2.6, -3]} intensity={0.5} color={toColor([240, 192, 64])} />
      <pointLight position={[3, 1.4, 4]} intensity={0.35} color={toColor([64, 224, 208])} />
    </>
  );
}

function Scene3D({
  data,
  onHover,
  onToggleBranch,
  onToggleGoal,
}: {
  data: Tree3D;
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
      <Rig />
      <Trunk data={data} growth={growth} />
      {data.willow.strands.map((s, i) => (
        <WillowStrand key={i} strand={s} growth={growth} />
      ))}
      <Canopy blobs={data.willow.canopy} growth={growth} />
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
        <Bloom intensity={0.75} luminanceThreshold={0.18} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.22} darkness={0.5} />
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

  const above = (hover?.y ?? 0) > 46;

  return (
    <div className="relative h-[540px] md:h-[720px] overflow-hidden rounded-xl">
      {/* Sky → grass backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, #6cb8ef 0%, #a9dcf7 38%, #ddf4d8 66%, #a8e08d 100%)' }}
      />

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
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-black/5" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/5 to-transparent" />

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
