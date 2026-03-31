"use client";

import { useState } from "react";
import type { EventRecommendation } from "@/lib/types";
import PersonRow from "./PersonRow";
import {
  Calendar,
  MapPin,
  Users,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function EventCard({
  recommendation,
}: {
  recommendation: EventRecommendation;
}) {
  const [expanded, setExpanded] = useState(false);
  const { event, why_go, relevance_score, people_to_meet } = recommendation;

  const scorePercent = Math.round(relevance_score * 100);

  return (
    <div className="rounded-xl border border-[#262626] bg-[#141414] overflow-hidden transition-all hover:border-[#363636]">
      {event.cover_url && (
        <div className="relative h-40 overflow-hidden">
          <img
            src={event.cover_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent" />
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center rounded-full bg-blue-600/90 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
              {scorePercent}% match
            </span>
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[#ededed] leading-tight">
              {event.title}
            </h3>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[#737373]">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {event.date}
              </span>
              {event.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.venue}
                  {event.city && `, ${event.city}`}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" />
                {event.attendee_count} attending
              </span>
            </div>
          </div>
          {!event.cover_url && (
            <span className="shrink-0 inline-flex items-center rounded-full bg-blue-600/90 px-2.5 py-1 text-xs font-semibold text-white">
              {scorePercent}% match
            </span>
          )}
        </div>

        {why_go && (
          <div className="mt-3 rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2">
            <p className="text-xs font-medium text-blue-400 mb-0.5">
              Why go
            </p>
            <p className="text-xs text-[#a3a3a3] leading-relaxed">{why_go}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          {people_to_meet.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1.5 text-xs text-[#a3a3a3] hover:text-[#ededed] transition-colors"
            >
              <Users className="h-3 w-3" />
              {people_to_meet.length} people to meet
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </button>
          )}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#262626] px-3 py-1.5 text-xs font-medium text-[#ededed] hover:bg-[#363636] transition-colors"
            >
              RSVP on Luma
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {expanded && people_to_meet.length > 0 && (
          <div className="mt-4 space-y-0">
            {people_to_meet.map((person) => (
              <PersonRow key={person.luma_id} person={person} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
