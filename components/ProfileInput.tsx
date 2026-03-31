"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface ProfileInputProps {
  onSubmit: (data: {
    profile_text: string;
    start_date: string;
    end_date: string;
  }) => void;
  isLoading: boolean;
}

export default function ProfileInput({
  onSubmit,
  isLoading,
}: ProfileInputProps) {
  const [profileText, setProfileText] = useState("");
  const [startDate, setStartDate] = useState("2026-03-30");
  const [endDate, setEndDate] = useState("2026-04-05");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileText.trim()) return;
    onSubmit({
      profile_text: profileText,
      start_date: startDate,
      end_date: endDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto px-4">
      <textarea
        value={profileText}
        onChange={(e) => setProfileText(e.target.value)}
        placeholder="Paste your LinkedIn profile, bio, or describe yourself..."
        rows={5}
        className="w-full rounded-xl border border-[#262626] bg-[#141414] px-4 py-3 text-sm text-[#ededed] placeholder:text-[#737373] focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 resize-none transition-all"
      />
      <div className="flex items-center gap-3 mt-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#737373]">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-[#262626] bg-[#141414] px-3 py-2 text-xs text-[#ededed] focus:outline-none focus:ring-2 focus:ring-blue-500/40 [color-scheme:dark]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#737373]">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-[#262626] bg-[#141414] px-3 py-2 text-xs text-[#ededed] focus:outline-none focus:ring-2 focus:ring-blue-500/40 [color-scheme:dark]"
          />
        </div>
        <div className="flex-1" />
        <button
          type="submit"
          disabled={isLoading || !profileText.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-blue-500/20"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isLoading ? "Analyzing..." : "Find My Events & People"}
        </button>
      </div>
    </form>
  );
}
