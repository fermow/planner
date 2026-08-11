import { useRef, useState, useCallback, useEffect } from 'react';
import type { Connection } from '../types';

export interface SimNode {
  id: string;
  type: 'connection' | 'me';
  connectionId: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  fixed: boolean;
  pinned: boolean;
  radius: number;
}

export interface SimEdge {
  source: string;
  target: string;
  distance: number;
  strength: number;
}

const REPULSION_STRENGTH = 100;
const SPRING_STRENGTH = 0.1;
const CENTER_STRENGTH = 0.002;
const DAMPING = 0.85;
const BOUNDARY_STRENGTH = 0.2;
const ALPHA_DECAY = 0.97;
const ALPHA_MIN = 0.005;
const NODE_RADIUS = 24;
const ME_RADIUS = 34;
// A saved position this close to the "me" node is treated as a collapsed
// (invalid) position, so the node is left free to be re-laid-out instead of
// being pinned on top of the profile. The me node has radius 34.
const MIN_SAVED_DIST = 100;

export interface SimulationHandle {
  getNodes: () => SimNode[];
  getEdges: () => SimEdge[];
  restart: () => void;
  getNode: (id: string) => SimNode | undefined;
  setNodePosition: (id: string, x: number, y: number) => void;
  tick: number;
}

export function useForceSimulation(
  connections: Connection[],
  bounds: { width: number; height: number },
): SimulationHandle {
  const nodesRef = useRef<Map<string, SimNode>>(new Map());
  const edgesRef = useRef<SimEdge[]>([]);
  const alphaRef = useRef(0);
  const frameRef = useRef<number>(0);
  const dimensionsRef = useRef(bounds);
  const [tick, setTick] = useState(0);

  // Keep dimensions ref current
  dimensionsRef.current = bounds;

  const build = useCallback(() => {
    const map = new Map<string, SimNode>();
    const newEdges: SimEdge[] = [];

    // Preserve or create ME node
    const existingMe = nodesRef.current.get('me');
    map.set('me', existingMe ?? {
      id: 'me', type: 'me', connectionId: null, x: 0, y: 0, vx: 0, vy: 0,
      fx: 0, fy: 0, fixed: true, pinned: true, radius: ME_RADIUS,
    });

    connections.forEach((conn, i) => {
      const existing = nodesRef.current.get(conn.id);
      let node: SimNode;
      if (existing) {
        node = { ...existing, connectionId: conn.id };
      } else {
        const cx = conn.x;
        const cy = conn.y;
        let x: number, y: number;
        let pinned: boolean;
        if (cx != null && cy != null) {
          x = cx;
          y = cy;
          pinned = Math.hypot(cx, cy) >= MIN_SAVED_DIST;
        } else {
          const count = Math.max(connections.length, 1);
          const angle = (2 * Math.PI * i) / count + i * 0.5;
          const r = 180 + Math.random() * 40;
          x = Math.cos(angle) * r + (Math.random() - 0.5) * 30;
          y = Math.sin(angle) * r + (Math.random() - 0.5) * 30;
          pinned = false;
        }
        node = {
          id: conn.id,
          type: 'connection',
          connectionId: conn.id,
          x, y, vx: 0, vy: 0, fx: 0, fy: 0,
          fixed: false,
          pinned,
          radius: NODE_RADIUS,
        };
      }
      map.set(conn.id, node);

      newEdges.push({
        source: conn.id,
        target: conn.parent_id || 'me',
        distance: 140,
        strength: 0.12,
      });
    });

    nodesRef.current = map;
    edgesRef.current = newEdges;
    alphaRef.current = 1.0;
  }, [connections]);

  const step = useCallback((): boolean => {
    const alpha = alphaRef.current;
    if (alpha < ALPHA_MIN) return false;

    const nodes = Array.from(nodesRef.current.values());
    const { width, height } = dimensionsRef.current;

    // Reset forces
    for (const n of nodes) { n.fx = 0; n.fy = 0; }

    // Repulsive forces (all pairs)
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 1) continue;
        const dist = Math.sqrt(distSq);
        const minDist = a.radius + b.radius + 24;
        let force = (REPULSION_STRENGTH / 100) * alpha / distSq;
        if (dist < minDist) {
          force = (REPULSION_STRENGTH / 100) * alpha / (minDist * minDist) * (minDist / dist);
        }
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.fx -= fx; a.fy -= fy;
        b.fx += fx; b.fy += fy;
      }
    }

    // Spring attraction
    for (const edge of edgesRef.current) {
      const a = nodesRef.current.get(edge.source);
      const b = nodesRef.current.get(edge.target);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = SPRING_STRENGTH * (dist - edge.distance) * edge.strength * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.fx += fx; a.fy += fy;
      b.fx -= fx; b.fy -= fy;
    }

    // Centering
    for (const n of nodes) {
      n.fx += -n.x * CENTER_STRENGTH * alpha;
      n.fy += -n.y * CENTER_STRENGTH * alpha;
    }

    // Boundary
    const boundary = (width + height) * 0.6;
    for (const n of nodes) {
      const d = Math.sqrt(n.x * n.x + n.y * n.y);
      if (d > boundary) {
        const ratio = boundary / d;
        n.fx += (n.x * ratio - n.x) * BOUNDARY_STRENGTH * alpha;
        n.fy += (n.y * ratio - n.y) * BOUNDARY_STRENGTH * alpha;
      }
    }

    // Update positions
    for (const n of nodes) {
      if (n.fixed || n.pinned) continue;
      n.vx += n.fx * alpha;
      n.vy += n.fy * alpha;
      n.vx *= (1 - (1 - DAMPING));
      n.vy *= (1 - (1 - DAMPING));
      n.x += n.vx;
      n.y += n.vy;
    }

    alphaRef.current = alpha * ALPHA_DECAY;
    return true;
  }, []); // Stable - reads from refs

  // Animation loop
  const startLoop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    let active = true;

    const loop = () => {
      if (!active) return;
      const cont = step();
      setTick((t) => t + 1);
      if (cont && alphaRef.current > ALPHA_MIN) {
        frameRef.current = requestAnimationFrame(loop);
      }
    };

    frameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, [step]);

  // Build simulation when connections change
  useEffect(() => {
    build();
    const cleanup = startLoop();
    return () => cleanup();
  }, [build, startLoop]);

  // Restart animation
  const restart = useCallback(() => {
    alphaRef.current = 1.0;
    const cleanup = startLoop();
    setTimeout(() => cleanup(), 3000);
  }, [startLoop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };
  }, []);

  const getNode = useCallback((id: string): SimNode | undefined => {
    return nodesRef.current.get(id);
  }, []);

  const setNodePosition = useCallback((id: string, x: number, y: number) => {
    const node = nodesRef.current.get(id);
    if (node) {
      node.x = x;
      node.y = y;
      node.vx = 0;
      node.vy = 0;
      node.pinned = true;
    }
  }, []);

  const getNodes = useCallback((): SimNode[] => Array.from(nodesRef.current.values()), []);
  const getEdges = useCallback((): SimEdge[] => edgesRef.current, []);

  return {
    getNodes,
    getEdges,
    restart,
    getNode,
    setNodePosition,
    tick,
  };
}
