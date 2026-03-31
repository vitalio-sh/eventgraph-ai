# Session Knowledge: EventGraph AI Full Build
*Captured: 2026-03-30*
*Areas: API integrations, Infrastructure / config, Data processing, Browser automation*

## Summary
Built EventGraph AI from scratch — a Next.js 15 hackathon app that recommends Bay Area events and people to meet using a 4-agent LLM pipeline backed by a Neo4j knowledge graph (7,800+ nodes, 53,000+ relationships). Solved critical GMI Cloud API connectivity issues, added real Neo4j GDS graph algorithms (PageRank, Betweenness, Louvain), and optimized pipeline from 3-4 min down to ~49s.

## Decisions

- **4-agent LLM pipeline over single-call**: Profile Parser -> Graph Query -> Ranker -> Ice-Breaker. Enables SSE streaming so UI shows progressive results. Each agent has a focused prompt and clear I/O contract.
- **Model tiering (Haiku/Sonnet/Opus)**: Profile parsing uses Haiku (fast, simple extraction), ice-breakers use Sonnet (creative but not complex), ranking uses Opus (complex graph reasoning). Cuts total LLM time ~40%.
- **GDS score caching in-memory**: PageRank/Betweenness/Louvain scores don't change between requests (same graph data). 10-min TTL cache eliminates ~75s of GDS computation on subsequent requests.
- **Graph pre-ranking before LLM**: Compute composite score per candidate using graph signals (30% skill overlap + 25% PageRank + 20% betweenness + 10% multi-event + 15% company/discovery bonus). LLM receives pre-ranked, slim payload — writes text justification, doesn't do heavy sorting.
- **2nd-degree graph discovery**: Added real multi-hop Cypher traversal to find people connected through shared skill neighbors, not just direct skill matches. This is genuine graph power vs SQL-equivalent JOINs.
- **Nonstandard port 3737**: User requirement — configured in package.json scripts and NEXT_PUBLIC_APP_URL.

## Discoveries

- **GMI Cloud API**: The documented endpoint `api.gmicloud.ai` has NO DNS A record — it literally doesn't resolve. The actual working endpoint is `api.gmi-serving.com`. Found by navigating to the GMI Cloud console playground page and reading the code examples.
- **GMI Model names**: Must use `anthropic/claude-opus-4.6` (with slash and dot), NOT `claude-opus-4-6` (with hyphens). Available models include `anthropic/claude-sonnet-4.6`, `anthropic/claude-haiku-4.5`, and various OpenAI/Google models.
- **Neo4j GDS on Aura**: Requires `memory: '2GB'` parameter (minimum) in graph projection. Valid values: 2GB, 4GB, 8GB... 512GB. Cypher projection syntax (NOT `gds.graph.project()` procedure):
  ```cypher
  MATCH (source)-[r:ATTENDS|HAS_SKILL]->(target)
  WITH gds.graph.project('name', source, target,
    {sourceNodeLabels: labels(source), targetNodeLabels: labels(target), relationshipType: type(r)},
    {undirectedRelationshipTypes: ['*'], memory: '2GB'}) AS g
  RETURN g.graphName, g.nodeCount, g.relationshipCount
  ```
- **GDS algorithm timing on this dataset** (7,878 nodes, 53,044 rels): Projection ~46s, PageRank ~2.3s, Betweenness ~26s, Louvain ~4.5s. Betweenness is the slowest by far.
- **MCP server config isolation**: MCPs configured at `/workspace` project key are NOT inherited by `/workspace/eventgraph-ai`. Must explicitly copy mcpServers to each project key in `/home/node/.claude/.claude.json`. The `projects` object is keyed by workspace path.
- **Playwright MCP**: Connected via SSE at `host.docker.internal:3100`. Screenshots fail due to CWD mismatch but snapshots work perfectly for testing.

## Troubleshooting

### GMI Cloud API returns "Connection error"
**Cause:** `api.gmicloud.ai` has no DNS A record on Cloudflare — NXDOMAIN from all DNS resolvers including Google (8.8.8.8) and Cloudflare (1.1.1.1). The domain exists on Cloudflare but points nowhere.
**Solution:** Change `GMI_BASE_URL` from `https://api.gmicloud.ai/v1` to `https://api.gmi-serving.com/v1`. Also change `GMI_MODEL` from `claude-opus-4-6` to `anthropic/claude-opus-4.6`.

### GDS graph.project fails with "sessionId or memory must be specified"
**Cause:** Neo4j Aura GDS requires explicit memory allocation for graph projections — it doesn't auto-allocate.
**Solution:** Add `memory: '2GB'` to the projection options. Must be one of the allowed values (2GB, 4GB, 8GB...).

### GDS graph.project fails with "no procedure registered"
**Cause:** On Aura, the Cypher projection syntax must be used (inline with MATCH), not the standalone procedure call `CALL gds.graph.project(...)`.
**Solution:** Use the Cypher aggregation syntax shown in Discoveries above.

### Playwright MCP tools not found in session
**Cause:** MCP servers were configured under `/workspace` project key but session was running in `/workspace/eventgraph-ai`. Claude Code derives MCP config from the workspace path.
**Solution:** Copy `mcpServers` from `projects["/workspace"]` to `projects["/workspace/eventgraph-ai"]` in `/home/node/.claude/.claude.json`.

### Pipeline takes 3-4 minutes
**Cause:** Cold GDS computation (~75s), all LLM calls using Opus (~30s each x3), large ranker payload (50 candidates), sequential ice-breakers + connection paths.
**Solution:** (1) Cache GDS scores in-memory with 10-min TTL, (2) Use Haiku for parsing, Sonnet for ice-breakers, (3) Graph pre-rank candidates to shrink LLM payload, (4) Parallelize ice-breakers + connection paths. Result: ~49s cached.

## Gotchas
- **Always drop GDS projections in a `finally` block** — orphaned projections consume memory on Aura and block new ones with the same name. Use random suffixes like `eg_${Date.now()}`.
- **Neo4j Integer objects**: Neo4j driver returns `Integer` objects, not JS numbers. Always use a `toNumber()` helper that checks for `.toNumber()` method.
- **GDS betweenness is SLOW** (~26s on this graph). If you need faster cold starts, consider dropping betweenness or running it separately/lazily.
- **Cypher `shortestPath` is native**, not GDS — use it directly without a projection. GDS shortest path requires a projection.
- **Simple Cypher pattern matching is NOT graph power** — `MATCH (p)-[:HAS_SKILL]->(s) WHERE s.name IN [...]` is equivalent to a SQL JOIN. Real graph: multi-hop traversals, shortestPath, variable-length paths, GDS algorithms.

## Related Files
- `lib/neo4j.ts` — Neo4j driver singleton, all Cypher queries, GDS functions with caching
- `lib/llm.ts` — GMI Cloud client with model tiering (fast/balanced/powerful)
- `lib/agents/profileParser.ts` — Agent 1: raw text -> UserProfile (Haiku)
- `lib/agents/graphQuery.ts` — Agent 2: graph queries + GDS + pre-ranking
- `lib/agents/ranker.ts` — Agent 3: graph-powered LLM ranking (Opus)
- `lib/agents/iceBreaker.ts` — Agent 4: conversation starters (Sonnet)
- `app/api/recommend/route.ts` — Main SSE streaming endpoint
- `components/GraphVisualization.tsx` — SVG force-graph visualization
- `components/GraphInsights.tsx` — Graph algorithm stats display
- `.env.local` — Credentials (NEO4J_*, GMI_*)
- `tests/e2e.spec.ts` — 12 Playwright E2E tests
