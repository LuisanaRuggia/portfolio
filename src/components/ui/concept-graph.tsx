import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import type { ConceptGroup, ProjectConcepts } from '@/data/projects';

interface ConceptGraphProps {
  concepts: ProjectConcepts;
  projectTitle: string;
}

type NodeGroup = ConceptGroup | 'project';

interface SimNode {
  id: string;
  label: string;
  group: NodeGroup;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fixed: boolean;
  degree: number;
}

interface SimEdge {
  from: string;
  to: string;
  inter?: boolean;
}

const GROUP_COLORS: Record<NodeGroup, string> = {
  arch: '#A78BFA',
  data: '#34D399',
  ops: '#FB923C',
  ml: '#F472B6',
  project: '#F97316',
};

const VIEW_W = 640;
const VIEW_H = 540;
const CENTER_X = VIEW_W / 2;
const CENTER_Y = VIEW_H / 2;
const PROJECT_ID = '__project__';
const MARGIN = 70;

// Settle inicial (heavy)
const SETTLE_ITERATIONS = 350;
const REPULSION_INIT = 5500;
const LINK_LENGTH = 98;
const SPRING_K_INIT = 0.06;
const CENTER_PULL_INIT = 0.0018;
const DAMPING_INIT = 0.82;

// Live loop (levitation suave)
const REPULSION_LIVE = 1200;
const SPRING_K_LIVE = 0.012;
const CENTER_PULL_LIVE = 0.0006;
const DAMPING_LIVE = 0.94;
const NOISE_AMP = 0.08;
const MIN_DIST = 18;

function applyForces(
  nodes: SimNode[],
  edges: SimEdge[],
  repulsion: number,
  springK: number,
  centerPull: number,
  damping: number,
  time: number,
  applyNoise: boolean,
) {
  const map = new Map(nodes.map((n) => [n.id, n] as const));

  // Repulsión por pares
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_DIST) dist = MIN_DIST;
      const force = repulsion / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (!a.fixed) {
        a.vx -= fx;
        a.vy -= fy;
      }
      if (!b.fixed) {
        b.vx += fx;
        b.vy += fy;
      }
    }
  }

  // Springs por aristas
  for (const e of edges) {
    const a = map.get(e.from);
    const b = map.get(e.to);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
    const diff = dist - LINK_LENGTH;
    const force = diff * springK;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    if (!a.fixed) {
      a.vx += fx;
      a.vy += fy;
    }
    if (!b.fixed) {
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  // Centering + ruido + damping + integración
  for (let idx = 0; idx < nodes.length; idx++) {
    const n = nodes[idx];
    if (n.fixed) continue;
    n.vx += (CENTER_X - n.x) * centerPull;
    n.vy += (CENTER_Y - n.y) * centerPull;
    if (applyNoise) {
      n.vx += Math.sin(time * 0.0009 + idx * 1.7) * NOISE_AMP;
      n.vy += Math.cos(time * 0.0007 + idx * 0.9) * NOISE_AMP;
    }
    n.vx *= damping;
    n.vy *= damping;
    n.x += n.vx;
    n.y += n.vy;
    n.x = Math.max(MARGIN, Math.min(VIEW_W - MARGIN, n.x));
    n.y = Math.max(MARGIN, Math.min(VIEW_H - MARGIN, n.y));
  }
}

function buildSim(
  concepts: ProjectConcepts,
  projectTitle: string,
  localize: (v: { es: string; en: string } | string | undefined) => string,
) {
  const degreeMap = new Map<string, number>();
  concepts.nodes.forEach((c) => degreeMap.set(c.id, 1));
  concepts.edges.forEach((e) => {
    degreeMap.set(e.from, (degreeMap.get(e.from) ?? 0) + 1);
    degreeMap.set(e.to, (degreeMap.get(e.to) ?? 0) + 1);
  });

  const project: SimNode = {
    id: PROJECT_ID,
    label: projectTitle,
    group: 'project',
    x: CENTER_X,
    y: CENTER_Y,
    vx: 0,
    vy: 0,
    fixed: true,
    degree: concepts.nodes.length,
  };

  const conceptNodes: SimNode[] = concepts.nodes.map((c, i) => {
    const angle = (i / concepts.nodes.length) * Math.PI * 2;
    return {
      id: c.id,
      label: localize(c.label),
      group: c.group,
      x: CENTER_X + Math.cos(angle) * 60,
      y: CENTER_Y + Math.sin(angle) * 60,
      vx: 0,
      vy: 0,
      fixed: false,
      degree: degreeMap.get(c.id) ?? 1,
    };
  });

  const allNodes = [project, ...conceptNodes];
  const allEdges: SimEdge[] = [
    ...concepts.nodes.map((n) => ({ from: PROJECT_ID, to: n.id, inter: false })),
    ...concepts.edges.map((e) => ({ from: e.from, to: e.to, inter: true })),
  ];

  for (let i = 0; i < SETTLE_ITERATIONS; i++) {
    applyForces(
      allNodes,
      allEdges,
      REPULSION_INIT,
      SPRING_K_INIT,
      CENTER_PULL_INIT,
      DAMPING_INIT,
      0,
      false,
    );
  }

  // Después del settle inicial liberamos el nodo del proyecto:
  // se mantiene cerca del centro por springs + center pull, pero ya se puede arrastrar.
  project.fixed = false;

  return { nodes: allNodes, edges: allEdges };
}

export const ConceptGraph: React.FC<ConceptGraphProps> = ({ concepts, projectTitle }) => {
  const { localize, t } = useTranslation();
  const [, setTick] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ConceptGroup | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string | null; offsetX: number; offsetY: number }>({
    id: null,
    offsetX: 0,
    offsetY: 0,
  });

  const sim = useMemo(
    () => buildSim(concepts, projectTitle, localize),
    [concepts, projectTitle, localize],
  );

  // Grupos efectivamente presentes en este proyecto (para la leyenda)
  const presentGroups = useMemo(() => {
    const set = new Set<ConceptGroup>();
    concepts.nodes.forEach((n) => set.add(n.group));
    return (['arch', 'data', 'ops', 'ml'] as ConceptGroup[]).filter((g) => set.has(g));
  }, [concepts]);
  const nodesRef = useRef(sim.nodes);
  const edgesRef = useRef(sim.edges);

  useEffect(() => {
    nodesRef.current = sim.nodes;
    edgesRef.current = sim.edges;
  }, [sim]);

  // Loop continuo de levitación
  useEffect(() => {
    let raf = 0;
    const step = (now: number) => {
      applyForces(
        nodesRef.current,
        edgesRef.current,
        REPULSION_LIVE,
        SPRING_K_LIVE,
        CENTER_PULL_LIVE,
        DAMPING_LIVE,
        now,
        true,
      );
      setTick((v) => v + 1);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Pointer move / up globales para drag fluido aunque salgas del SVG
  useEffect(() => {
    const clientToSvg = (cx: number, cy: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = svg.createSVGPoint();
      pt.x = cx;
      pt.y = cy;
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      const tx = pt.matrixTransform(ctm.inverse());
      return { x: tx.x, y: tx.y };
    };

    const handleMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.id) return;
      const node = nodesRef.current.find((n) => n.id === drag.id);
      if (!node) return;
      const pt = clientToSvg(e.clientX, e.clientY);
      node.x = pt.x - drag.offsetX;
      node.y = pt.y - drag.offsetY;
      node.vx = 0;
      node.vy = 0;
    };

    const handleUp = () => {
      const drag = dragRef.current;
      if (drag.id) {
        const node = nodesRef.current.find((n) => n.id === drag.id);
        if (node) node.fixed = false;
      }
      dragRef.current = { id: null, offsetX: 0, offsetY: 0 };
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent, nodeId: string) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const tx = pt.matrixTransform(ctm.inverse());
    dragRef.current = {
      id: nodeId,
      offsetX: tx.x - node.x,
      offsetY: tx.y - node.y,
    };
    node.fixed = true;
    e.stopPropagation();
  };

  // Vecinos del nodo en hover
  const neighbors = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set<string>([hoveredId]);
    edgesRef.current.forEach((e) => {
      if (e.from === hoveredId) set.add(e.to);
      if (e.to === hoveredId) set.add(e.from);
    });
    return set;
  }, [hoveredId]);

  const isNodeDim = (n: SimNode) => {
    if (neighbors !== null) return !neighbors.has(n.id);
    if (selectedGroup !== null) return n.group !== selectedGroup && n.group !== 'project';
    return false;
  };
  const isEdgeDim = (e: SimEdge) => {
    if (neighbors !== null) return !(neighbors.has(e.from) && neighbors.has(e.to));
    if (selectedGroup !== null) return true;
    return false;
  };

  const nodeRadius = (n: SimNode) => {
    if (n.group === 'project') return 13;
    return Math.min(10, 5.5 + n.degree * 0.7);
  };

  const labelFor = (n: SimNode) => {
    const r = nodeRadius(n);
    const dx = n.x - CENTER_X;
    const dy = n.y - CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const offset = r + 10;
    const lx = n.x + (dx / dist) * offset;
    const ly = n.y + (dy / dist) * offset + 5;
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    if (dx / dist > 0.25) anchor = 'start';
    else if (dx / dist < -0.25) anchor = 'end';
    return { lx, ly, anchor };
  };

  return (
    <div className="flex flex-row gap-4 items-start w-full">
      {/* SVG */}
      <div className="flex-1 min-w-0">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto select-none overflow-visible touch-none"
          role="img"
          aria-label={`Concept map of ${projectTitle}`}
        >
          {/* Aristas */}
          <g>
            {edgesRef.current.map((e, i) => {
              const a = nodesRef.current.find((n) => n.id === e.from);
              const b = nodesRef.current.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const dim = isEdgeDim(e);
              const baseOpacity = e.inter ? 0.5 : 0.22;
              return (
                <line
                  key={`edge-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="currentColor"
                  strokeWidth={e.inter ? 1.2 : 0.9}
                  className="text-muted-foreground transition-opacity duration-300"
                  style={{ opacity: dim ? 0.05 : baseOpacity }}
                />
              );
            })}
          </g>

          {/* Aristas de grupo (clique entre conceptos del mismo grupo seleccionado) */}
          {selectedGroup !== null && (
            <g>
              {(() => {
                const groupMembers = nodesRef.current.filter((n) => n.group === selectedGroup);
                const lines: React.ReactNode[] = [];
                for (let i = 0; i < groupMembers.length; i++) {
                  for (let j = i + 1; j < groupMembers.length; j++) {
                    const a = groupMembers[i];
                    const b = groupMembers[j];
                    lines.push(
                      <line
                        key={`group-${a.id}-${b.id}`}
                        x1={a.x}
                        y1={a.y}
                        x2={b.x}
                        y2={b.y}
                        stroke={GROUP_COLORS[selectedGroup]}
                        strokeWidth={1.4}
                        strokeDasharray="4 3"
                        opacity={0.75}
                      />,
                    );
                  }
                }
                return lines;
              })()}
            </g>
          )}

          {/* Nodos */}
          {nodesRef.current.map((n) => {
            const r = nodeRadius(n);
            const color = GROUP_COLORS[n.group];
            const dim = isNodeDim(n);
            const isHovered = hoveredId === n.id;
            const { lx, ly, anchor } = labelFor(n);
            const isProject = n.group === 'project';

            return (
              <g
                key={n.id}
                onPointerDown={(e) => handlePointerDown(e, n.id)}
                onPointerEnter={() => setHoveredId(n.id)}
                onPointerLeave={() => {
                  if (hoveredId === n.id) setHoveredId(null);
                }}
                className={`cursor-grab active:cursor-grabbing transition-opacity duration-200 ${
                  dim ? 'opacity-30' : 'opacity-100'
                }`}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isHovered ? r + 2 : r}
                  fill={color}
                  style={{ transition: 'r 150ms ease-out' }}
                />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={anchor}
                  fontSize={isProject ? 17 : isHovered ? 13.5 : 12.5}
                  className={`fill-foreground ${
                    isProject
                      ? 'font-black uppercase tracking-tight'
                      : isHovered
                        ? 'font-bold'
                        : 'font-medium'
                  }`}
                  style={{ pointerEvents: 'none', transition: 'font-size 150ms ease-out' }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Leyenda vertical a la derecha (clickeable: filtra por grupo) — solo grupos presentes */}
      <div className="flex-shrink-0 flex flex-col gap-1 pt-1">
        {presentGroups.map((g) => (
          <LegendButton
            key={g}
            color={GROUP_COLORS[g]}
            label={t(`concept.group.${g}`)}
            active={selectedGroup === g}
            onClick={() => setSelectedGroup((cur) => (cur === g ? null : g))}
          />
        ))}
      </div>
    </div>
  );
};

const LegendButton: React.FC<{
  color: string;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ color, label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${
      active
        ? 'bg-foreground/10 text-foreground'
        : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
    }`}
  >
    <span
      className="w-2 h-2 rounded-full flex-shrink-0"
      style={{
        background: color,
        boxShadow: active ? `0 0 6px ${color}` : undefined,
      }}
    />
    {label}
  </button>
);
