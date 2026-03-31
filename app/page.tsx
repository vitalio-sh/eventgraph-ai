"use client";

import { useState, useCallback } from "react";
import type {
  UserProfile,
  EventRecommendation,
  SuperConnector,
  GraphData,
} from "@/lib/types";
import ProfileInput from "@/components/ProfileInput";
import ProfileSummary from "@/components/ProfileSummary";
import EventCard from "@/components/EventCard";
import SuperConnectors from "@/components/SuperConnectors";
import GraphInsights from "@/components/GraphInsights";
import GraphVisualization from "@/components/GraphVisualization";
import LoadingState from "@/components/LoadingState";
import { Sparkles, RotateCcw } from "lucide-react";

type Stage =
  | "idle"
  | "parsing"
  | "searching"
  | "ranking"
  | "ice_breakers"
  | "done"
  | "error";

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recommendations, setRecommendations] = useState<
    EventRecommendation[]
  >([]);
  const [superConnectors, setSuperConnectors] = useState<SuperConnector[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (data: {
      profile_text: string;
      start_date: string;
      end_date: string;
    }) => {
      setStage("parsing");
      setProfile(null);
      setRecommendations([]);
      setSuperConnectors([]);
      setGraphData(null);
      setError(null);

      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              switch (event.type) {
                case "profile_parsed":
                  setProfile(event.data as UserProfile);
                  setStage("searching");
                  break;
                case "events_found":
                  setStage("ranking");
                  break;
                case "ranking_complete":
                  setRecommendations(
                    event.data as EventRecommendation[]
                  );
                  setStage("ice_breakers");
                  break;
                case "ice_breakers_complete":
                  setRecommendations(
                    event.data as EventRecommendation[]
                  );
                  setStage("done");
                  break;
                case "graph_data":
                  setGraphData(event.data as GraphData);
                  break;
                case "super_connectors":
                  setSuperConnectors(event.data as SuperConnector[]);
                  break;
                case "done":
                  setStage("done");
                  break;
                case "error":
                  setError(
                    (event.data as { message: string }).message ||
                      "An error occurred"
                  );
                  setStage("error");
                  break;
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setStage("error");
      }
    },
    []
  );

  const handleReset = () => {
    setStage("idle");
    setProfile(null);
    setRecommendations([]);
    setSuperConnectors([]);
    setGraphData(null);
    setError(null);
  };

  const isLoading =
    stage !== "idle" && stage !== "done" && stage !== "error";

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#262626] bg-gradient-to-r from-[#0a0a0a] via-[#0f1729] to-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#ededed] tracking-tight">
                EventGraph AI
              </h1>
              <p className="text-[10px] text-[#737373]">
                Smart event networking for Bay Area tech
              </p>
            </div>
          </div>
          {stage !== "idle" && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#262626] px-3 py-1.5 text-xs text-[#a3a3a3] hover:text-[#ededed] hover:border-[#363636] transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Start over
            </button>
          )}
        </div>
      </header>

      {/* Hero / Input */}
      {(stage === "idle" || stage === "error") && (
        <section className="py-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#ededed] tracking-tight mb-3">
              Find the right events.{" "}
              <span className="text-blue-500">Meet the right people.</span>
            </h2>
            <p className="text-sm text-[#737373] max-w-lg mx-auto">
              Paste your profile and we&apos;ll search our knowledge graph of
              Bay Area events to find personalized recommendations and
              high-value connections.
            </p>
          </div>
          {error && (
            <div className="max-w-2xl mx-auto px-4 mb-6">
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </div>
          )}
          <ProfileInput onSubmit={handleSubmit} isLoading={isLoading} />
        </section>
      )}

      {/* Loading State */}
      {isLoading && (
        <LoadingState
          stage={stage as "parsing" | "searching" | "ranking" | "ice_breakers"}
        />
      )}

      {/* Profile Summary */}
      {profile && <ProfileSummary profile={profile} />}

      {/* Graph Insights */}
      {graphData && recommendations.length > 0 && (
        <GraphInsights
          graphStats={{
            nodeCount: graphData.nodeCount,
            relCount: graphData.relCount,
            communityCount: graphData.communityCount,
          }}
          recommendations={recommendations}
          connectionPaths={graphData.connectionPaths || []}
        />
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <section className="w-full max-w-3xl mx-auto px-4 py-6">
          <h2 className="text-lg font-semibold text-[#ededed] mb-4">
            Recommended Events
          </h2>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <EventCard key={rec.event.slug} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      {/* Super Connectors */}
      {superConnectors.length > 0 && (
        <SuperConnectors connectors={superConnectors} />
      )}

      {/* Graph Visualization */}
      {profile && recommendations.length > 0 && (
        <GraphVisualization
          userProfile={{ name: profile.name }}
          recommendations={recommendations}
          superConnectors={superConnectors}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#262626] mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-[#737373]">
            Powered by Neo4j + Claude Opus 4.6 via GMI Cloud
          </p>
        </div>
      </footer>
    </main>
  );
}
