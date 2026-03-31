# Product Requirements: EventGraph AI

## Problem
Attending Bay Area tech events is overwhelming — hundreds of events per week, no way to know which ones are relevant or who's worth meeting. People waste time at low-value events and miss high-value connections.

## Goal
Build an AI agent that takes a user's profile (pasted LinkedIn or free text), queries a knowledge graph of 234 Bay Area events and 1,785 LinkedIn-enriched attendees, and returns personalized event recommendations with specific people to meet and ice-breaker conversation starters.

## Requirements
- [ ] User can paste raw LinkedIn profile or free-text bio
- [ ] System parses input into structured profile via LLM
- [ ] System queries Neo4j graph for matching events and people
- [ ] LLM ranks events by relevance to user's skills/interests/goals
- [ ] LLM generates per-person ice-breakers based on shared context
- [ ] Results display in clean, card-based dark UI
- [ ] Streaming UX shows progressive results as agents work
- [ ] Super-connectors section highlights people attending 3+ events

## Technical Approach
See `project-hackbay.md` for full architecture and Neo4j schema.
