import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn, ZoomOut, RotateCcw, Target, GitBranch,
  Trash2, Edit3, Plus, MousePointer, Users,
} from 'lucide-react';
import { Connection } from '../types';
import { useStore } from '../store/useStore';
import { useForceSimulation, SimNode } from './useForceSimulation';
import { resolveConnectionLabel, getConnectionColor } from './connectionLabels';
import ConnectionTooltip from './ConnectionTooltip';
import { useTranslation } from '../i18n/t';

interface ConnectionsGraphProps {
  connections: Connection[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEditNode: (conn: Connection) => void;
  onDeleteNode: (conn: Connection) => void;
  onAddNode: (parentId: string | null) => void;
  onPositionsChange: (positions: { id: string; x: number; y: number }[]) => void;
  focusNodeId: string | null;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: Connection | null;
}

const NODE_RADIUS = 24;
const ME_RADIUS = 42;
const MIN_SCALE = 0.15;
const MAX_SCALE = 3.5;
const INITIAL_SCALE = 0.8;

const COLORS: Record<string, string> = {
  grid: 'rgba(159, 168, 218, 0.03)',
  edge: 'rgba(159, 168, 218, 0.22)',
  edgeDimmed: 'rgba(159, 168, 218, 0.06)',
  miniEdge: 'rgba(159, 168, 218, 0.35)',
  miniMe: 'rgba(240, 192, 64, 0.85)',
  miniViewport: 'rgba(64, 224, 208, 0.35)',
};

export default function ConnectionsGraph({
  connections,
  selectedIds,
  onSelectionChange,
  onEditNode,
  onDeleteNode,
  onAddNode,
  onPositionsChange,
  focusNodeId,
}: ConnectionsGraphProps) {
  const { t } = useTranslation();
  const { theme } = useStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const positionSaveRef = useRef<ReturnType<typeof setTimeout>>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  const sim = useForceSimulation(connections, dimensions);

  const [scale, setScale] = useState(INITIAL_SCALE);
  const [pan, setPan] = useState({ x: 400, y: 250 });
  const centeredRef = useRef(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; conn: Connection | null }>(
    { visible: false, x: 0, y: 0, conn: null }
  );
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
  }>({ start: null, end: null });
  const [renderTick, setRenderTick] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [touchDistance, setTouchDistance] = useState(0);

  const ctrlPressedRef = useRef(false);
  const shiftPressedRef = useRef(false);
  const nodesForRender = sim.getNodes();
  const edges = sim.getEdges();
  void renderTick;

  // Resize + mobile detection
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
      setIsMobile(window.innerWidth < 768);
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      ctrlPressedRef.current = e.ctrlKey || e.metaKey;
      shiftPressedRef.current = e.shiftKey;
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (contextMenu) setContextMenu(null);
        else if (selectionBox.start) setSelectionBox({ start: null, end: null });
        else onSelectionChange(new Set());
      }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSelectionChange(
          new Set(nodesForRender.filter((n) => n.type === 'connection').map((n) => n.id))
        );
      }
      if (e.key === '=' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale((s) => Math.min(MAX_SCALE, s * 1.25));
      }
      if (e.key === '-' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale((s) => Math.max(MIN_SCALE, s / 1.25));
      }
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setScale(INITIAL_SCALE);
        setPan({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [contextMenu, selectionBox, onSelectionChange, nodesForRender]);

  // Close context menu on outside click
  useEffect(() => {
    if (contextMenu) {
      const handler = () => setContextMenu(null);
      const tm = setTimeout(() => window.addEventListener('click', handler), 0);
      return () => {
        clearTimeout(tm);
        window.removeEventListener('click', handler);
      };
    }
  }, [contextMenu]);

  // Center on focusNodeId (triggered by search selection)
  const handledFocusRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusNodeId) {
      handledFocusRef.current = null;
      return;
    }
    if (handledFocusRef.current === focusNodeId) return;
    handledFocusRef.current = focusNodeId;
    const node = sim.getNode(focusNodeId);
    if (!node) return;
    setPan({
      x: dimensions.width / 2 - node.x * scale,
      y: dimensions.height / 2 - node.y * scale,
    });
    onSelectionChange(new Set([focusNodeId]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNodeId]);

  // Coordinate conversion
  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({ x: (sx - pan.x) / scale, y: (sy - pan.y) / scale }),
    [pan, scale]
  );

  // Debounced position save
  const savePositions = useCallback(() => {
    if (positionSaveRef.current) clearTimeout(positionSaveRef.current);
    positionSaveRef.current = setTimeout(() => {
      const positions = nodesForRender
        .filter((n) => n.type === 'connection' && n.pinned)
        .map((n) => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y) }));
      if (positions.length > 0) onPositionsChange(positions);
    }, 1500);
  }, [nodesForRender, onPositionsChange]);

  const forceRender = useCallback(() => setRenderTick((t) => t + 1), []);

  // --- Mouse handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      const delta = -e.deltaY * 0.001;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * (1 + delta)));
      const wx = (cx - pan.x) / scale;
      const wy = (cy - pan.y) / scale;
      setPan({ x: cx - wx * newScale, y: cy - wy * newScale });
      setScale(newScale);
    } else {
      setPan((p) => ({ x: p.x - e.deltaX * 0.6, y: p.y - e.deltaY * 0.6 }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target.closest('g.node') || target.closest('.graph-control')) return;

    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (shiftPressedRef.current) {
      setSelectionBox({ start: { x: mx, y: my }, end: { x: mx, y: my } });
      return;
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }
    if (selectionBox.start) {
      const rect = svgRef.current!.getBoundingClientRect();
      setSelectionBox({
        start: selectionBox.start,
        end: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      });
      return;
    }
    if (draggedNodeId) {
      const rect = svgRef.current!.getBoundingClientRect();
      const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      sim.setNodePosition(draggedNodeId, worldPos.x, worldPos.y);
      forceRender();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);

    if (selectionBox.start && selectionBox.end) {
      const box = selectionBox;
      const ws = screenToWorld(box.start!.x, box.start!.y);
      const we = screenToWorld(box.end!.x, box.end!.y);
      const minX = Math.min(ws.x, we.x);
      const maxX = Math.max(ws.x, we.x);
      const minY = Math.min(ws.y, we.y);
      const maxY = Math.max(ws.y, we.y);
      const newlySelected = new Set<string>();
      for (const n of nodesForRender) {
        if (n.type !== 'connection') continue;
        if (n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY) newlySelected.add(n.id);
      }
      if (ctrlPressedRef.current) onSelectionChange(new Set([...selectedIds, ...newlySelected]));
      else onSelectionChange(newlySelected);
      setSelectionBox({ start: null, end: null });
      return;
    }

    if (draggedNodeId) {
      setDraggedNodeId(null);
      savePositions();
    }
  };

  // --- Node handlers ---
  const handleNodeMouseDown = (e: React.MouseEvent, node: SimNode) => {
    e.stopPropagation();
    if (node.type !== 'connection') return;

    if (ctrlPressedRef.current) {
      const newSet = new Set(selectedIds);
      if (newSet.has(node.id)) newSet.delete(node.id);
      else newSet.add(node.id);
      onSelectionChange(newSet);
    } else if (!selectedIds.has(node.id)) {
      onSelectionChange(new Set([node.id]));
    }
    setDraggedNodeId(node.id);
  };

  const handleNodeMouseEnter = (node: SimNode) => {
    if (node.type === 'connection') {
      setHoveredNode(node.id);
      setTooltip({ visible: true, x: 0, y: 0, conn: connections.find((c) => c.id === node.id) ?? null });
    }
  };

  const handleNodeMouseMove = (e: React.MouseEvent, node: SimNode) => {
    if (node.type === 'connection') {
      setTooltip((prev) => ({ ...prev, x: e.clientX + 16, y: e.clientY + 16 }));
    }
  };

  const handleNodeMouseLeave = () => {
    setHoveredNode(null);
    setTooltip({ visible: false, x: 0, y: 0, conn: null });
  };

  const handleNodeClick = (e: React.MouseEvent, node: SimNode) => {
    e.stopPropagation();
    if (node.type === 'me') {
      onSelectionChange(new Set());
      return;
    }
    if (!ctrlPressedRef.current) onSelectionChange(new Set([node.id]));
  };

  const handleNodeDoubleClick = (node: SimNode) => {
    if (node.type === 'connection') {
      const conn = connections.find((c) => c.id === node.id);
      if (conn) onEditNode(conn);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: SimNode | null) => {
    e.preventDefault();
    let targetConn: Connection | null = null;
    if (node && node.type === 'connection') targetConn = connections.find((c) => c.id === node.id) ?? null;
    setContextMenu({ x: e.clientX, y: e.clientY, node: targetConn });
  };

  // --- Focus mode helpers ---
  const connectedNodeIds = useMemo(() => {
    if (!focusMode) return null;
    const set = new Set<string>(['me']);
    const targets = new Set<string>();
    if (hoveredNode) targets.add(hoveredNode);
    selectedIds.forEach((id) => targets.add(id));
    for (const id of targets) {
      set.add(id);
      for (const edge of edges) {
        if (edge.source === id) set.add(edge.target);
        if (edge.target === id) set.add(edge.source);
      }
    }
    return set;
  }, [focusMode, hoveredNode, selectedIds, edges]);

  const isNodeDimmed = (id: string): boolean => {
    if (!focusMode || !connectedNodeIds) return false;
    return !connectedNodeIds.has(id);
  };

  const isEdgeDimmed = (s: string, t: string): boolean => {
    if (!focusMode || !connectedNodeIds) return false;
    return !(connectedNodeIds.has(s) && connectedNodeIds.has(t));
  };

  // --- Controls ---
  const handleZoomIn = () => setScale((s) => Math.min(MAX_SCALE, s * 1.25));
  const handleZoomOut = () => setScale((s) => Math.max(MIN_SCALE, s / 1.25));
  const handleResetView = () => { setScale(INITIAL_SCALE); setPan({ x: 0, y: 0 }); };

  const handleCenterSelected = () => {
    if (selectedIds.size === 0) return;
    let sx = 0, sy = 0, c = 0;
    for (const n of nodesForRender) {
      if (selectedIds.has(n.id)) { sx += n.x; sy += n.y; c++; }
    }
    if (c > 0) {
      setPan({ x: dimensions.width / 2 - (sx / c) * scale, y: dimensions.height / 2 - (sy / c) * scale });
    }
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;
    const { node } = contextMenu;
    switch (action) {
      case 'edit': if (node) onEditNode(node); break;
      case 'delete': if (node) onDeleteNode(node); break;
      case 'addChild': if (node) onAddNode(node.id); else onAddNode(null); break;
      case 'addNode': onAddNode(null); break;
      case 'selectAll': onSelectionChange(new Set(nodesForRender.filter((n) => n.type === 'connection').map((n) => n.id))); break;
      case 'clearSelection': onSelectionChange(new Set()); break;
      case 'toggleFocus': setFocusMode((f) => !f); break;
      case 'layout': sim.restart(); break;
    }
    setContextMenu(null);
  };

  const handleMinimapClick = (e: React.MouseEvent) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const ms = 0.08;
    const wx = (mx - 85) / ms;
    const wy = (my - 65) / ms;
    setPan({ x: dimensions.width / 2 - wx * scale, y: dimensions.height / 2 - wy * scale });
  };

  const getEdgePath = (s: SimNode, t: SimNode): string => {
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const curve = Math.min(dist * 0.15, 50);
    const nx = -dy / dist;
    const ny = dx / dist;
    const mx = (s.x + t.x) / 2 + nx * curve;
    const my = (s.y + t.y) / 2 + ny * curve;
    return `M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`;
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target?.closest('g.node')) return;
      setIsPanning(true);
      setPanStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      setPan({ x: e.touches[0].clientX - panStart.x, y: e.touches[0].clientY - panStart.y });
    } else if (e.touches.length === 2 && !isPanning) {
      e.preventDefault();
      const dist = Math.sqrt(
        (e.touches[1].clientX - e.touches[0].clientX) ** 2 +
        (e.touches[1].clientY - e.touches[0].clientY) ** 2
      );
      if (touchDistance > 0) {
        const delta = dist / touchDistance;
        setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * delta)));
      }
      setTouchDistance(dist);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) setTouchDistance(0);
    if (e.touches.length === 0) setIsPanning(false);
  };

  const viewportWorldX = (0 - pan.x) / scale;
  const viewportWorldY = (0 - pan.y) / scale;
  const viewportWorldW = dimensions.width / scale;
  const viewportWorldH = dimensions.height / scale;
  const miniScale = 0.08;

  return (
    <div ref={containerRef} className="relative w-full h-[60vh] md:h-[70vh] select-none">
      {/* Controls overlay */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-xs">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-white/10 text-navy-300 hover:text-white transition-all"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] font-mono text-navy-300/60 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-white/10 text-navy-300 hover:text-white transition-all"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button
            onClick={handleResetView}
            className="p-1.5 rounded-lg hover:bg-white/10 text-navy-300 hover:text-white transition-all"
            aria-label="Reset view"
            title="Ctrl+0"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={handleCenterSelected}
            className="p-1.5 rounded-lg hover:bg-white/10 text-navy-300 hover:text-cosmic-cyan disabled:opacity-30 transition-all"
            aria-label="Center on selection"
            disabled={selectedIds.size === 0}
          >
            <Target size={14} />
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`p-1.5 rounded-lg transition-all ${
              focusMode
                ? 'bg-cosmic-cyan/20 text-cosmic-cyan ring-1 ring-cosmic-cyan/40'
                : 'hover:bg-white/10 text-navy-300 hover:text-white'
            }`}
            aria-label="Toggle focus mode"
            title="Focus mode"
          >
            <GitBranch size={14} />
          </button>
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`p-1.5 rounded-lg transition-all ${
              showMinimap
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/10 text-navy-300 hover:text-white'
            }`}
            aria-label="Toggle minimap"
            title="Toggle minimap"
          >
            <MousePointer size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-0.5 text-[9px] text-navy-300/40">
          <div>
            <kbd className="px-1 py-0.5 bg-white/5 rounded">Ctrl+K</kbd> {t('connections.searchHint')}
          </div>
          <div>{t('connections.hintPan')}</div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-20 text-[9px] text-navy-300/30">
        <div>{t('connections.hintKeys')}</div>
        {isMobile && <div>{t('connections.hintTouch')}</div>}
      </div>

      {/* Main SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none', userSelect: 'none' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => handleContextMenu(e, null)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
          <radialGradient id="meGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#40e0d0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#40e0d0" stopOpacity="0" />
          </radialGradient>

          <filter id="softGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="strongGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke={COLORS.grid} strokeWidth="0.5" />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
          {/* Grid background */}
          <rect
            x={-(dimensions.width * 2)}
            y={-(dimensions.height * 2)}
            width={dimensions.width * 4}
            height={dimensions.height * 4}
            fill="url(#gridPattern)"
            opacity={0.6}
          />

          {/* Connection lines */}
          {edges.map((edge, i) => {
            const source = nodesForRender.find((n) => n.id === edge.source);
            const target = nodesForRender.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const path = getEdgePath(source, target);
            const sourceConn = connections.find((c) => c.id === source.connectionId);
            const connColor = sourceConn ? getConnectionColor(sourceConn) : '#40e0d0';
            const isConnected =
              hoveredNode === source.id || hoveredNode === target.id ||
              selectedIds.has(source.id) || selectedIds.has(target.id);
            const dimmed = isEdgeDimmed(source.id, target.id);

            return (
              <path
                key={`edge-${i}`}
                d={path}
                fill="none"
                stroke={dimmed ? COLORS.edgeDimmed : isConnected ? connColor : COLORS.edge}
                strokeWidth={isConnected ? 3 : 1.5}
                strokeOpacity={dimmed ? 0.2 : isConnected ? 0.65 : 0.35}
                strokeLinecap="round"
                style={{ transition: 'all 0.25s ease', filter: isConnected ? 'url(#softGlow)' : 'none' }}
              />
            );
          })}

          {/* Nodes */}
          {nodesForRender.map((node) => {
            const conn = connections.find((c) => c.id === node.connectionId);
            const color = conn ? getConnectionColor(conn) : '#40e0d0';
            const label = conn
              ? resolveConnectionLabel(conn)
              : { label: 'YOU', color: '#40e0d0', icon: '⭐', value: 'me', description: '' };
            const isSelected = selectedIds.has(node.id);
            const isHovered = hoveredNode === node.id;
            const dimmed = isNodeDimmed(node.id);
            const isMe = node.type === 'me';
            const radius = isMe ? ME_RADIUS : NODE_RADIUS;
            const icon = conn ? (conn.icon || conn.emoji || '👤') : '⭐';

            return (
              <g
                key={node.id}
                className="node"
                transform={`translate(${node.x}, ${node.y})`}
                style={{
                  opacity: dimmed ? 0.2 : 1,
                  transition: 'opacity 0.3s ease',
                  cursor: isMe ? 'default' : 'pointer',
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onClick={(e) => handleNodeClick(e, node)}
                onDoubleClick={() => handleNodeDoubleClick(node)}
                onMouseEnter={() => handleNodeMouseEnter(node)}
                onMouseMove={(e) => handleNodeMouseMove(e, node)}
                onMouseLeave={handleNodeMouseLeave}
                onContextMenu={(e) => handleContextMenu(e, node)}
              >
                {(isHovered || (isSelected && !isMe)) && (
                  <circle
                    r={radius + 14}
                    fill="transparent"
                    stroke={color}
                    strokeWidth={3}
                    strokeOpacity={0.25}
                    style={{ animation: 'pulse 2s ease-in-out infinite' }}
                  />
                )}

                {isMe && (
                  <circle
                    r={ME_RADIUS + 20}
                    fill="url(#meGlow)"
                    style={{ animation: 'pulse 3s ease-in-out infinite' }}
                  />
                )}

                <defs>
                  <radialGradient id={`grad-${node.id}`}>
                    <stop offset="0%" stopColor={color} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.15" />
                  </radialGradient>
                </defs>

                <circle
                  r={radius}
                  fill={isMe ? 'rgba(18,18,42,0.9)' : `url(#grad-${node.id})`}
                  stroke={color}
                  strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                  style={{
                    transition: 'all 0.2s ease',
                    filter: isHovered && !isMe ? 'url(#softGlow)' : isSelected && !isMe ? 'url(#strongGlow)' : 'none',
                  }}
                />

                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isMe ? 24 : 18}
                  y={0}
                  style={{ pointerEvents: 'none', userSelect: 'none', lineHeight: 1 }}
                >
                  {icon}
                </text>

                {!isMe && (
                  <>
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      y={radius + 16}
                      fontSize={9}
                      fontWeight={isSelected || isHovered ? '600' : '400'}
                      fill={isSelected || isHovered ? color : 'rgba(232,234,246,0.5)'}
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {conn!.name.length > 14 ? conn!.name.slice(0, 13) + '…' : conn!.name}
                    </text>
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      y={radius + 26}
                      fontSize={7}
                      fill="rgba(159,168,218,0.35)"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {label.label}
                    </text>
                  </>
                )}

                {isMe && (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    y={radius + 20}
                    fontSize={9}
                    fontWeight={600}
                    fill={theme === 'kawaii' ? '#ff2d55' : '#40e0d0'}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {t('connections.you')}
                  </text>
                )}

                {isSelected && !isMe && (
                  <circle
                    r={radius + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    strokeOpacity={0.6}
                    style={{ animation: 'spin 8s linear infinite' }}
                  />
                )}
              </g>
            );
          })}
        </g>

        {/* Selection box */}
        {selectionBox.start && selectionBox.end && (
          <rect
            x={Math.min(selectionBox.start!.x, selectionBox.end!.x)}
            y={Math.min(selectionBox.start!.y, selectionBox.end!.y)}
            width={Math.abs(selectionBox.end!.x - selectionBox.start!.x)}
            height={Math.abs(selectionBox.end!.y - selectionBox.start!.y)}
            fill="rgba(64, 224, 208, 0.08)"
            stroke="rgba(64, 224, 208, 0.5)"
            strokeWidth={1}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
      </svg>

      {/* Tooltip */}
      {tooltip.visible && tooltip.conn && (
        <div className="fixed z-[200] pointer-events-none" style={{ left: tooltip.x, top: tooltip.y }}>
          <ConnectionTooltip connection={tooltip.conn} position={null} isVisible={true} />
        </div>
      )}

      {/* Minimap */}
      <AnimatePresence>
        {showMinimap && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-3 right-3 z-20 glass-card p-1 shadow-2xl"
            style={{ width: 170, height: 130 }}
            onClick={handleMinimapClick}
          >
            <svg width={170} height={130} className="cursor-pointer" style={{ touchAction: 'none' }}>
              <rect x={0} y={0} width={170} height={130} fill="rgba(18,18,42,0.95)" rx={8} />
              <g transform="translate(85, 65) scale(0.08)">
                {edges.map((edge, i) => {
                  const source = nodesForRender.find((n) => n.id === edge.source);
                  const target = nodesForRender.find((n) => n.id === edge.target);
                  if (!source || !target) return null;
                  return (
                    <line key={`mini-e-${i}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                      stroke={COLORS.miniEdge} strokeWidth={1.5} />
                  );
                })}
                {nodesForRender.map((node) => {
                  const conn = connections.find((c) => c.id === node.connectionId);
                  const color = conn ? getConnectionColor(conn) : COLORS.miniMe;
                  const isMe = node.type === 'me';
                  return (
                    <circle key={`mini-n-${node.id}`} cx={node.x} cy={node.y}
                      r={isMe ? 6 : 3} fill={isMe ? COLORS.miniMe : color}
                      stroke="rgba(18,18,42,0.95)" strokeWidth={1} />
                  );
                })}
              </g>
              <g transform={`translate(${(viewportWorldX * miniScale + 85)}, ${(viewportWorldY * miniScale + 65)}) scale(${miniScale})`}>
                <rect x={0} y={0} width={viewportWorldW} height={viewportWorldH}
                  fill="none" stroke={COLORS.miniViewport} strokeWidth={1.5} strokeDasharray="3 2" />
              </g>
              <text x={85} y={122} textAnchor="middle" fontSize={8} fill="rgba(159,168,218,0.5)">
                {nodesForRender.length - 1} {t('connections.nodes')}
              </text>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed z-[200] glass-card py-1.5 min-w-[190px] shadow-2xl"
            style={{ left: contextMenu.x, top: contextMenu.y, borderRadius: '12px' }}
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="py-1 text-xs">
              {contextMenu.node ? (
                <>
                  <button
                    onClick={() => handleContextMenuAction('edit')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-navy-100 hover:text-white transition-colors"
                  >
                    <Edit3 size={10} className="text-navy-300" />
                    {t('connections.editNode')}
                  </button>
                  <button
                    onClick={() => handleContextMenuAction('addChild')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-navy-100 hover:text-white transition-colors"
                  >
                    <Plus size={10} className="text-navy-300" />
                    {t('connections.addChild')}
                  </button>
                  <div className="h-px bg-white/5 my-1 mx-3" />
                  <button
                    onClick={() => handleContextMenuAction('delete')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-cosmic-rose/10 text-left text-navy-100 hover:text-cosmic-rose transition-colors"
                  >
                    <Trash2 size={10} className="text-navy-300" />
                    {t('connections.deleteNode')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleContextMenuAction('addNode')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-navy-100 hover:text-white transition-colors"
                  >
                    <Plus size={10} className="text-navy-300" />
                    {t('connections.addNode')}
                  </button>
                  <button
                    onClick={() => handleContextMenuAction('selectAll')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-navy-100 hover:text-white transition-colors"
                  >
                    <MousePointer size={10} className="text-navy-300" />
                    {t('connections.selectAll')}
                  </button>
                  <div className="h-px bg-white/5 my-1 mx-3" />
                  <button
                    onClick={() => handleContextMenuAction('toggleFocus')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-navy-100 hover:text-white transition-colors"
                  >
                    <GitBranch size={10} className="text-navy-300" />
                    {t('connections.focusMode')}
                  </button>
                  <button
                    onClick={() => handleContextMenuAction('layout')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-left text-navy-100 hover:text-white transition-colors"
                  >
                    <RotateCcw size={10} className="text-navy-300" />
                    {t('connections.relayout')}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {connections.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Users size={56} className="mx-auto text-navy-300/15 mb-4" />
            <h3 className="text-sm font-display text-navy-200/60 mb-1">
              {t('connections.graphEmpty')}
            </h3>
            <p className="text-xs text-navy-300/40 max-w-sm">
              {t('connections.graphEmptyDesc')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
