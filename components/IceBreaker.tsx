"use client";

import { useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export default function IceBreaker({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  if (!text) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        <MessageSquare className="h-3 w-3" />
        <span>{open ? "Hide" : "View"} ice-breaker</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="mt-2 rounded-lg border-l-2 border-blue-500/40 bg-blue-500/5 px-3 py-2">
          <p className="text-xs text-[#a3a3a3] italic leading-relaxed">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}
