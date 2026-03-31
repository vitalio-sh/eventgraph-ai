import type { UserProfile } from "@/lib/types";
import SkillBadge from "./SkillBadge";
import { User } from "lucide-react";

export default function ProfileSummary({
  profile,
}: {
  profile: UserProfile;
}) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="rounded-xl border border-[#262626] bg-[#141414] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-400">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-[#ededed]">
              {profile.name}
            </h3>
            <p className="text-sm text-[#a3a3a3]">
              {profile.current_role}
              {profile.company && ` at ${profile.company}`}
            </p>
            {profile.location && (
              <p className="text-xs text-[#737373] mt-0.5">
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {profile.skills.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <SkillBadge key={s} name={s} variant="skill" />
              ))}
            </div>
          </div>
        )}

        {profile.interests.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
              Interests
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((i) => (
                <SkillBadge key={i} name={i} variant="interest" />
              ))}
            </div>
          </div>
        )}

        {profile.looking_for.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
              Looking for
            </p>
            <div className="flex flex-wrap gap-1.5">
              {profile.looking_for.map((l) => (
                <SkillBadge key={l} name={l} variant="looking_for" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
