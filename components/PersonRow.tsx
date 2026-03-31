import type { MatchedPerson } from "@/lib/types";
import IceBreaker from "./IceBreaker";
import { ExternalLink } from "lucide-react";

function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#262626] text-xs font-semibold text-[#a3a3a3]">
      {initials}
    </div>
  );
}

export default function PersonRow({ person }: { person: MatchedPerson }) {
  return (
    <div className="border-t border-[#262626] py-3 first:border-t-0 first:pt-0">
      <div className="flex items-start gap-3">
        {person.profile_pic ? (
          <img
            src={person.profile_pic}
            alt={person.name}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <Initials name={person.name} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[#ededed] truncate">
              {person.name}
            </p>
            {person.linkedin_url && (
              <a
                href={person.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#737373] hover:text-blue-400 transition-colors shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          <p className="text-xs text-[#737373] truncate">
            {person.headline || person.job_title}
          </p>

          {person.matching_skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {person.matching_skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {person.shared_companies.length > 0 && (
            <p className="text-[10px] text-[#737373] mt-1">
              Shared:{" "}
              {person.shared_companies.join(", ")}
            </p>
          )}

          {person.relevance_reason && (
            <p className="text-xs text-[#a3a3a3] mt-1">
              {person.relevance_reason}
            </p>
          )}

          <IceBreaker text={person.ice_breaker} />
        </div>
      </div>
    </div>
  );
}
