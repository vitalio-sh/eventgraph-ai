"use client";

import type { EventRecommendation } from "@/lib/types";
import { Activity, GitBranch, Network, Waypoints } from "lucide-react";

interface GraphInsightsProps {
  graphStats: { nodeCount: number; relCount: number; communityCount: number };
  recommendations: EventRecommendation[];
  connectionPaths: { personName: string; hops: number; via: string[] }[];
}

export default function GraphInsights({
  graphStats,
  recommendations,
  connectionPaths,
}: GraphInsightsProps) {
  return (
    <section className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Network className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-[#ededed]">
          Graph Intelligence
        </h2>
      </div>

      {/* Graph Stats Bar */}
      <div className="rounded-xl border border-[#262626] bg-[#141414] p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-xs font-medium text-blue-400">
            Knowledge Graph Analysis
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#ededed] font-mono">
              {graphStats.nodeCount.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#737373] mt-0.5">Nodes analyzed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#ededed] font-mono">
              {graphStats.relCount.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#737373] mt-0.5">Relationships</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#ededed] font-mono">
              {graphStats.communityCount}
            </p>
            <p className="text-[10px] text-[#737373] mt-0.5">Communities detected</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-[10px] text-[#525252]">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            PageRank
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
            Betweenness
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Louvain
          </span>
        </div>
      </div>

      {/* Per-Event Graph Scoring */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.event.slug}
              className="rounded-xl border border-[#262626] bg-[#141414] p-4"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#ededed] truncate">
                    {rec.event.title}
                  </p>
                </div>
                {rec.graph_score !== undefined && (
                  <span className="shrink-0 ml-3 inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
                    <Activity className="h-2.5 w-2.5" />
                    Graph: {Math.round((rec.graph_score || 0) * 100)}%
                  </span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {(rec.bridge_connectors || 0) > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400">
                    <GitBranch className="h-2.5 w-2.5" />
                    {rec.bridge_connectors} bridge connector{rec.bridge_connectors! > 1 ? "s" : ""}
                  </span>
                )}
                {rec.people_to_meet
                  .filter((p) => (p.pagerank_score || 0) > 0.5)
                  .slice(0, 2)
                  .map((p) => (
                    <span
                      key={p.luma_id}
                      className="inline-flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400"
                    >
                      <Activity className="h-2.5 w-2.5" />
                      {p.name} (PR: {Math.round((p.pagerank_score || 0) * 100)}%)
                    </span>
                  ))}
              </div>

              {/* Connection paths for people at this event */}
              {connectionPaths
                .filter((cp) =>
                  rec.people_to_meet.some((p) => p.name === cp.personName)
                )
                .slice(0, 2)
                .map((cp, i) => (
                  <div
                    key={i}
                    className="mt-2 flex items-center gap-1.5 text-[10px] text-[#525252]"
                  >
                    <Waypoints className="h-3 w-3 text-[#525252]" />
                    <span>
                      Connected to{" "}
                      <span className="text-[#a3a3a3]">{cp.personName}</span>{" "}
                      via {cp.hops}-hop path
                      {cp.via.length > 0 && (
                        <span className="text-[#525252]">
                          {" "}
                          through {cp.via.slice(1, -1).join(" -> ")}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
