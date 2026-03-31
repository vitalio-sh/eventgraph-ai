import { cn } from "@/lib/utils";

const variantStyles = {
  skill: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  interest: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  looking_for: "bg-green-500/15 text-green-400 border-green-500/20",
};

export default function SkillBadge({
  name,
  variant = "skill",
}: {
  name: string;
  variant?: "skill" | "interest" | "looking_for";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        variantStyles[variant]
      )}
    >
      {name}
    </span>
  );
}
