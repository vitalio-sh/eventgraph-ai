# EventGraph AI

**Smart event networking agent** that recommends Bay Area tech events and identifies high-value people to meet, with personalized ice-breakers. Powered by Neo4j graph algorithms and Claude Opus 4.6 via GMI Cloud.

> Built for [HackBay](https://lu.ma/hackbay) hackathon, March 2026.

---

## What It Does

Paste your LinkedIn profile (or any bio text) and EventGraph AI will:

1. **Parse** your profile into structured skills, interests, and goals
2. **Query** a knowledge graph of 234 Bay Area events + 1,785 LinkedIn-enriched attendees
3. **Score** events and people using real graph algorithms (PageRank, Betweenness Centrality, Louvain Community Detection)
4. **Rank** recommendations using LLM reasoning informed by graph signals
5. **Generate** personalized ice-breaker conversation starters for each person
6. **Visualize** your position in the event network graph

Results stream progressively via SSE — you see each stage complete in real time.

## Graph-Powered Intelligence

This isn't just pattern matching. EventGraph AI runs **real graph algorithms** on the knowledge graph:

| Algorithm                  | What It Finds                                    | How It's Used                                           |
| -------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| **PageRank**               | Network influence — recursively important people | Prioritize well-connected attendees                     |
| **Betweenness Centrality** | Bridge connectors between communities            | Find people who can introduce you to new networks       |
| **Louvain Communities**    | Skill/event clusters                             | Recommend events with cross-community diversity         |
| **2nd-Degree Discovery**   | People connected through shared skill neighbors  | Surface non-obvious connections via multi-hop traversal |
| **Shortest Path**          | How you connect to each person                   | Show connection paths in the UI                         |
| **Jaccard Similarity**     | Skill overlap ratio                              | Quantify profile alignment                              |

### Graph Pre-Ranking

Before any LLM call, candidates are scored using a graph composite formula:

```
score = 0.30 * skill_overlap + 0.25 * pagerank + 0.20 * betweenness
       + 0.10 * multi_event_presence + 0.15 * company_and_discovery_bonus
```

The LLM receives pre-ranked candidates and writes the personalized "why" text — it doesn't do the heavy sorting.

## Architecture

```
User Input (profile text + date range)
        |
        v
[Agent 1: Profile Parser]     ── Haiku ──>  Structured UserProfile JSON
        |
        v
[Agent 2: Graph Query Engine]  ── Neo4j ──>  Events + Candidates + GDS Scores
        |                         (PageRank, Betweenness, Louvain, 2nd-degree)
        v
[Agent 3: Ranking Agent]       ── Opus ───>  Graph-informed ranked recommendations
        |
        v
[Agent 4: Ice-Breaker Agent]   ── Sonnet ─>  Per-person conversation starters
        |
        v
[SSE Stream]                   ── React ──>  Progressive card-based UI
```

**Model tiering** for speed: Haiku (parse, ~2s) → Opus (rank, ~30s) → Sonnet (ice-breakers, ~15s).

**GDS caching**: Graph algorithm scores are cached in-memory (10-min TTL) so subsequent requests skip the 75s GDS computation.

## Neo4j Knowledge Graph

The graph contains **33,833 nodes** and **57,101 relationships**:

```
Person (1,785) ──ATTENDS──> Event (234)
Person ──HAS_SKILL──> Skill (6,028)
Person ──WORKS_AT──> Company (8,882)
Person ──HAS_EXPERIENCE──> Experience (12,746) ──AT_COMPANY──> Company
Person ──HAS_EDUCATION──> Education (3,714)
Event ──HOSTED_BY──> Host (285)
Event ──IN_CITY──> City (21)
Event ──ON_DATE──> Date (7)
Event ──ORGANIZED_BY──> Organizer (131)
```

Events span March 30 – April 5, 2026, sourced from Luma with full LinkedIn-enriched attendee profiles.

## Tech Stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Framework | Next.js 15 (App Router) + TypeScript                                          |
| Styling   | Tailwind CSS + custom dark theme                                              |
| Database  | Neo4j Aura (graph database + GDS algorithms)                                  |
| LLM       | Claude Opus 4.6 / Sonnet 4.6 / Haiku 4.5 via [GMI Cloud](https://gmicloud.ai) |
| Streaming | Server-Sent Events (SSE)                                                      |
| Testing   | Playwright (12 E2E tests)                                                     |
| Port      | 3737 (nonstandard)                                                            |

## Quick Start

### Prerequisites

- Node.js 18+
- Neo4j Aura instance (with GDS enabled)
- GMI Cloud API key

### Setup

```bash
git clone https://github.com/vitalio-sh/eventgraph-ai.git
cd eventgraph-ai
npm install
```

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

GMI_API_KEY=your-gmi-api-key
GMI_BASE_URL=https://api.gmi-serving.com/v1
GMI_MODEL=anthropic/claude-opus-4.6

NEXT_PUBLIC_APP_URL=http://localhost:3737
```

### Run

```bash
npm run dev      # Start dev server on localhost:3737
npm run build    # Production build
npm run start    # Production server on port 3737
```

### Test

```bash
npx playwright install chromium
npx playwright test
```

## API Endpoints

| Method | Endpoint                                      | Description                                   |
| ------ | --------------------------------------------- | --------------------------------------------- |
| `POST` | `/api/recommend`                              | Main endpoint — SSE stream of recommendations |
| `GET`  | `/api/events?start=YYYY-MM-DD&end=YYYY-MM-DD` | List events in date range                     |
| `GET`  | `/api/event/:slug`                            | Full event detail with attendees              |
| `GET`  | `/api/person/:lumaId`                         | Full person profile with skills, experiences  |

### POST /api/recommend

```json
{
  "profile_text": "Paste your LinkedIn profile or bio here...",
  "start_date": "2026-03-30",
  "end_date": "2026-04-05",
  "max_events": 5,
  "max_people_per_event": 5
}
```

Returns an SSE stream with events: `profile_parsed`, `events_found`, `ranking_complete`, `ice_breakers_complete`, `graph_data`, `super_connectors`, `done`.

## Project Structure

```
app/
  layout.tsx                    # Root layout, dark theme
  page.tsx                      # Main SPA with SSE streaming
  api/
    recommend/route.ts          # POST — 4-agent pipeline, SSE
    events/route.ts             # GET — events in range
    event/[slug]/route.ts       # GET — event detail
    person/[lumaId]/route.ts    # GET — person profile
components/
  ProfileInput.tsx              # Hero input with date pickers
  ProfileSummary.tsx            # Parsed profile card
  EventCard.tsx                 # Expandable event recommendation
  PersonRow.tsx                 # Person with shared traits
  IceBreaker.tsx                # Collapsible conversation starter
  SuperConnectors.tsx           # Hub people section
  GraphInsights.tsx             # Graph algorithm stats
  GraphVisualization.tsx        # SVG network visualization
  SkillBadge.tsx                # Colored skill pill
  LoadingState.tsx              # Skeleton loader
lib/
  neo4j.ts                      # Driver singleton + Cypher + GDS (cached)
  llm.ts                        # GMI Cloud client, model tiering
  types.ts                      # All TypeScript interfaces
  agents/
    profileParser.ts            # Agent 1: text → profile (Haiku)
    graphQuery.ts               # Agent 2: Neo4j + GDS + pre-ranking
    ranker.ts                   # Agent 3: graph-informed ranking (Opus)
    iceBreaker.ts               # Agent 4: ice-breakers (Sonnet)
tests/
  e2e.spec.ts                   # 12 Playwright E2E tests
```

## Design

- **Theme**: Dark mode, background `#0a0a0a`, cards `#141414`
- **Accent**: Electric blue `#3B82F6`
- **Typography**: Inter (UI) + JetBrains Mono (data)
- **Layout**: Single-page app with progressive SSE rendering

## Performance

| Metric            | Cold (first request) | Warm (cached GDS) |
| ----------------- | -------------------- | ----------------- |
| Profile parse     | ~2s (Haiku)          | ~2s               |
| Graph query + GDS | ~80s                 | ~3s               |
| LLM ranking       | ~30s (Opus)          | ~30s              |
| Ice-breakers      | ~15s (Sonnet)        | ~15s              |
| **Total**         | **~2 min**           | **~49s**          |

GDS scores (PageRank, Betweenness, Louvain) are cached in-memory with a 10-minute TTL.

## License

MIT

## Author

**Vitalii Ionov** ([@vitalio](https://github.com/vitalio-sh)) — NerdTres Inc.

**Suyash Srivastava** ([@Suyash906](https://github.com/Suyash906)) — eBay.

Built at HackBay 2026, San Francisco.
