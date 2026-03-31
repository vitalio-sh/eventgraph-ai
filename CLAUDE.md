# CLAUDE.md

## Project Overview
**EventGraph AI** — Smart event networking agent that recommends Bay Area events and identifies high-value people to meet, with personalized ice-breakers. Powered by a Neo4j knowledge graph and Claude Opus 4.6 via GMI Cloud.

- **Type**: Hackathon project (HackBay)
- **Stack**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Services**: Neo4j Aura, GMI Cloud API, Vercel

## Project Structure
```
app/
  layout.tsx              # Root layout with dark theme
  page.tsx                # Main single-page app
  api/
    recommend/route.ts    # POST /api/recommend — main endpoint
    events/route.ts       # GET /api/events
    event/[slug]/route.ts # GET /api/event/:slug
    person/[lumaId]/route.ts # GET /api/person/:lumaId
components/
  ui/                     # shadcn/ui components
  ProfileInput.tsx        # Hero input section
  ProfileSummary.tsx      # Parsed profile card
  EventCard.tsx           # Event recommendation card
  PersonRow.tsx           # Person to meet row
  IceBreaker.tsx          # Collapsible ice-breaker
  SuperConnectors.tsx     # Hub people section
  SkillBadge.tsx          # Colored skill pill
  LoadingState.tsx        # Skeleton/streaming loader
lib/
  neo4j.ts                # Neo4j driver singleton + query functions
  llm.ts                  # GMI Cloud client wrapper (OpenAI SDK with custom base URL)
  agents/
    profileParser.ts      # Agent 1: parse raw text -> UserProfile
    graphQuery.ts         # Agent 2: UserProfile -> Cypher -> candidates
    ranker.ts             # Agent 3: candidates -> ranked recommendations
    iceBreaker.ts         # Agent 4: person pairs -> ice-breakers
  types.ts                # TypeScript types for all entities
```

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Neo4j Aura (graph database, already provisioned with 234 events + 1,785 attendees)
- **LLM**: Claude Opus 4.6 via GMI Cloud API (OpenAI-compatible endpoint)
- **Deployment**: Vercel

## Architecture

4-agent pipeline:
1. **Profile Parser** — LLM extracts structured JSON from raw text input
2. **Graph Query Engine** — Cypher queries find candidate events + people from Neo4j
3. **Ranking Agent** — LLM scores and sorts recommendations by relevance
4. **Ice-Breaker Agent** — LLM generates personalized conversation starters

Streaming UX via SSE: results appear progressively as each agent completes.

## API Endpoints
- `POST /api/recommend` — Main endpoint: raw profile text + date range -> full recommendations
- `GET /api/events?start=YYYY-MM-DD&end=YYYY-MM-DD` — List events in range
- `GET /api/event/:slug` — Full event detail with attendees
- `GET /api/person/:lumaId` — Full person profile

## Environment Variables
See `.env.example` — copy to `.env.local` and fill in GMI_API_KEY.

## Design
- **Theme**: Dark mode default, accent color electric blue (#3B82F6)
- **Typography**: Inter (sans) for UI, JetBrains Mono for data
- **Layout**: Single-page app with scroll sections

## Key Commands
```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npx shadcn@latest add <component>  # Add shadcn/ui components
```

## Neo4j Schema Reference
Full schema documented in `project-hackbay.md`. Key node types: Person, Event, Company, Skill, Experience, Education, Host, Organizer, City, Date. Key relationships: ATTENDS, HAS_SKILL, WORKS_AT, HAS_EXPERIENCE, AT_COMPANY, HOSTED_BY, IN_CITY, ON_DATE.

## Git & Commits
- **Commit frequently** — small, atomic commits after each meaningful change. Judges and reviewers will look at commit history.
- Commit after completing each feature, component, or fix — don't batch multiple changes.
- Use clear, descriptive commit messages.

## Conventions
- Use App Router (not Pages Router)
- Server Components by default, `"use client"` only when needed
- Use OpenAI SDK with custom `baseURL` for GMI Cloud calls
- Neo4j driver singleton in `lib/neo4j.ts`
