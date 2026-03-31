import { Loader2 } from "lucide-react";

const stageMessages: Record<string, string> = {
  parsing: "Analyzing your profile...",
  searching: "Searching the event graph for matches...",
  ranking: "Ranking events and people by relevance...",
  ice_breakers: "Crafting personalized ice-breakers...",
};

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#262626] bg-[#141414] p-6 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-[#262626] mb-4" />
      <div className="h-3 w-1/2 rounded bg-[#262626] mb-3" />
      <div className="h-3 w-2/3 rounded bg-[#262626] mb-6" />
      <div className="flex gap-2">
        <div className="h-6 w-16 rounded-full bg-[#262626]" />
        <div className="h-6 w-20 rounded-full bg-[#262626]" />
        <div className="h-6 w-14 rounded-full bg-[#262626]" />
      </div>
    </div>
  );
}

export default function LoadingState({
  stage,
}: {
  stage: "parsing" | "searching" | "ranking" | "ice_breakers";
}) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        <p className="text-[#a3a3a3] text-sm font-medium">
          {stageMessages[stage]}
        </p>
      </div>
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
