import type { SuperConnector } from "@/lib/types";
import { ExternalLink, Zap } from "lucide-react";

function ConnectorCard({ connector }: { connector: SuperConnector }) {
  return (
    <div className="min-w-[280px] max-w-[320px] shrink-0 rounded-xl border border-[#262626] bg-[#141414] p-5 hover:border-[#363636] transition-colors">
      <div className="flex items-start gap-3">
        {connector.profile_pic ? (
          <img
            src={connector.profile_pic}
            alt={connector.name}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#262626] text-xs font-semibold text-[#a3a3a3]">
            {connector.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#ededed] truncate">
              {connector.name}
            </p>
            {connector.linkedin_url && (
              <a
                href={connector.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#737373] hover:text-blue-400 transition-colors shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-[#737373] truncate">
            {connector.headline}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          <Zap className="h-2.5 w-2.5" />
          Attending {connector.event_count} events
        </span>
      </div>

      {connector.why_connect && (
        <p className="text-xs text-[#a3a3a3] mt-2 leading-relaxed line-clamp-2">
          {connector.why_connect}
        </p>
      )}

      {connector.events.length > 0 && (
        <div className="mt-2">
          <p className="text-[10px] text-[#737373]">
            {connector.events.slice(0, 3).join(" / ")}
            {connector.events.length > 3 &&
              ` +${connector.events.length - 3} more`}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SuperConnectors({
  connectors,
}: {
  connectors: SuperConnector[];
}) {
  if (connectors.length === 0) return null;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-amber-400" />
        <h2 className="text-lg font-semibold text-[#ededed]">
          Super Connectors
        </h2>
        <span className="text-xs text-[#737373]">
          People attending multiple recommended events
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
        {connectors.map((c) => (
          <ConnectorCard key={c.name} connector={c} />
        ))}
      </div>
    </section>
  );
}
