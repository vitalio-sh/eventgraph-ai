"use client";

import { useState, useEffect, useRef } from "react";
import type { EventRecommendation, SuperConnector } from "@/lib/types";

interface GraphVisualizationProps {
  userProfile: { name: string };
  recommendations: EventRecommendation[];
  superConnectors: SuperConnector[];
}

interface GNode {
  id: string;
  label: string;
  type: "user" | "event" | "person";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  r: number;
  color: string;
  communityId?: number;
  pagerankScore?: number;
}

interface GEdge {
  from: string;
  to: string;
  label: string;
}

const COMMUNITY_COLORS = [
  "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

export default function GraphVisualization({
  userProfile,
  recommendations,
  superConnectors,
}: GraphVisualizationProps) {
  const [animated, setAnimated] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 700;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2;

  // Build nodes and edges
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const seen = new Set<string>();

  // User node at center
  nodes.push({
    id: "user",
    label: userProfile.name || "You",
    type: "user",
    x: cx, y: cy,
    targetX: cx, targetY: cy,
    r: 24,
    color: "#3B82F6",
  });
  seen.add("user");

  // Event nodes in second ring
  const eventNodes = recommendations.slice(0, 6);
  eventNodes.forEach((rec, i) => {
    const angle = (2 * Math.PI * i) / eventNodes.length - Math.PI / 2;
    const radius = 150;
    const id = `event_${rec.event.slug}`;
    if (seen.has(id)) return;
    seen.add(id);
    const tx = cx + Math.cos(angle) * radius;
    const ty = cy + Math.sin(angle) * radius;
    nodes.push({
      id,
      label: rec.event.title.length > 25 ? rec.event.title.slice(0, 22) + "..." : rec.event.title,
      type: "event",
      x: cx, y: cy,
      targetX: tx, targetY: ty,
      r: 16 + (rec.graph_score || 0) * 8,
      color: "#10B981",
    });
    edges.push({ from: "user", to: id, label: "INTERESTED" });

    // People nodes in third ring
    rec.people_to_meet.slice(0, 3).forEach((p, j) => {
      const pid = `person_${p.luma_id}`;
      if (seen.has(pid)) return;
      seen.add(pid);
      const pAngle = angle + ((j - 1) * 0.3);
      const pRadius = 250;
      const px = cx + Math.cos(pAngle) * pRadius;
      const py = cy + Math.sin(pAngle) * pRadius;
      const cid = p.community_id || 0;
      nodes.push({
        id: pid,
        label: p.name.length > 18 ? p.name.slice(0, 15) + "..." : p.name,
        type: "person",
        x: cx, y: cy,
        targetX: px, targetY: py,
        r: 8 + (p.pagerank_score || 0) * 12,
        color: COMMUNITY_COLORS[cid % COMMUNITY_COLORS.length],
        communityId: cid,
        pagerankScore: p.pagerank_score,
      });
      edges.push({ from: id, to: pid, label: "ATTENDS" });
    });
  });

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getNodePos = (id: string) => {
    const n = nodes.find((n) => n.id === id);
    if (!n) return { x: cx, y: cy };
    return animated ? { x: n.targetX, y: n.targetY } : { x: cx, y: cy };
  };

  const hoveredNode = hovered ? nodes.find((n) => n.id === hovered) : null;

  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-blue-500" />
        <h2 className="text-lg font-semibold text-[#ededed]">
          Network Graph
        </h2>
        <span className="text-xs text-[#737373]">
          Visualizing your event network
        </span>
      </div>

      <div className="rounded-xl border border-[#262626] bg-[#0a0a0a] overflow-hidden relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ maxHeight: 500 }}
        >
          {/* Background grid dots */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="15" cy="15" r="0.5" fill="#1a1a1a" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Edges */}
          {edges.map((e, i) => {
            const from = getNodePos(e.from);
            const to = getNodePos(e.to);
            const isHighlighted =
              hovered === e.from || hovered === e.to;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isHighlighted ? "#3B82F6" : "#262626"}
                strokeWidth={isHighlighted ? 1.5 : 0.8}
                style={{
                  transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const pos = getNodePos(n.id);
            const isHovered = hovered === n.id;
            return (
              <g
                key={n.id}
                style={{
                  transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  cursor: "pointer",
                }}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Glow */}
                {isHovered && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={n.r + 6}
                    fill="none"
                    stroke={n.color}
                    strokeWidth={2}
                    opacity={0.3}
                    style={{ transition: "all 0.3s ease" }}
                  />
                )}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isHovered ? n.r + 2 : n.r}
                  fill={n.color}
                  opacity={isHovered ? 1 : 0.85}
                  style={{ transition: "all 0.3s ease" }}
                />
                {n.type === "user" && (
                  <text
                    x={pos.x}
                    y={pos.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    YOU
                  </text>
                )}
                {/* Label below node */}
                <text
                  x={pos.x}
                  y={pos.y + n.r + 12}
                  textAnchor="middle"
                  fill={isHovered ? "#ededed" : "#525252"}
                  fontSize={n.type === "event" ? "9" : "8"}
                  style={{ transition: "fill 0.2s ease" }}
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip */}
        {hoveredNode && (
          <div className="absolute top-3 right-3 rounded-lg border border-[#262626] bg-[#141414] p-3 text-xs shadow-xl max-w-[200px]">
            <p className="font-medium text-[#ededed]">{hoveredNode.label}</p>
            <p className="text-[#737373] mt-0.5 capitalize">{hoveredNode.type}</p>
            {hoveredNode.pagerankScore !== undefined && (
              <p className="text-blue-400 mt-1">
                PageRank: {Math.round(hoveredNode.pagerankScore * 100)}%
              </p>
            )}
            {hoveredNode.communityId !== undefined && (
              <p className="text-purple-400">
                Community: {hoveredNode.communityId}
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 flex gap-3 text-[10px] text-[#525252]">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> You
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Events
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> People
          </span>
        </div>
      </div>
    </section>
  );
}
