Interactively capture reusable knowledge from the current chat conversation and save it to `.claude/reference/` for future sessions.

You are running an interactive knowledge capture workflow. Your goal is to review what happened in THIS conversation (the full chat history above), ask the user guided questions, and generate a structured reference file.

## Phase 1: Conversation Review

Before asking questions, silently review the **full conversation history above this command invocation**. You have access to every message exchanged in this chat. Analyze it for:

1. **What was discussed and done** — tasks completed, features built, configs changed, problems solved
2. **What was learned** — API behaviors, tool quirks, workarounds discovered, error messages and their fixes
3. **Decisions made** — why one approach was chosen over another, architecture choices, trade-offs discussed
4. **Commands and code that worked** — useful snippets, curl calls, scripts, tool invocations worth remembering
5. **Things that failed or were tricky** — gotchas, dead ends, surprising behavior

This is the PRIMARY source of knowledge. The conversation contains everything — use it.

## Phase 2: Guided Questions

### Step 1: Work Areas

Use AskUserQuestion with multiSelect to ask:
1. "What areas did you work on this session?" with header "Areas" and options:
   - "API integrations" — working with external service APIs
   - "Browser automation" — Playwright scrapers, portal interactions
   - "Data processing" — Python scripts, data transformation, file generation
   - "Infrastructure / config" — container setup, firewall, environment, tooling

### Step 2: Knowledge Type

Use AskUserQuestion with multiSelect to ask:
1. "What should be captured from this session?" with header "Capture" and options:
   - "Troubleshooting solutions" — problems encountered and how they were fixed
   - "API discoveries" — endpoints, quirks, auth flows, rate limits learned
   - "Useful commands" — commands or scripts that proved valuable
   - "Architecture decisions" — design choices and their rationale

### Step 3: Topic & Notes

Use AskUserQuestion to ask:
1. "What's the topic/title for this knowledge entry?" with header "Topic" and options:
   - Suggest 2-3 topic names based on what you observed in the conversation above (e.g., "google-sheets-setup", "playwright-billing-scraper", "skill-audit-patterns"). Pick names that reflect the actual conversation topics.
   - User will likely use "Other" to type their own

2. "Any specific notes, gotchas, or things to remember?" with header "Notes" and options:
   - "No, extract from session context" — you infer from the session
   - "Yes, let me add notes" — user types additional context via "Other"

## Phase 3: Generate Knowledge File

Based on the session review and user answers, generate a structured markdown file.

**File path:** `.claude/reference/{YYYY-MM-DD}-{topic-in-kebab-case}.md`

Use today's date. Topic should be kebab-case from the user's answer.

**File format — include ONLY sections the user selected in Step 2:**

```markdown
# Session Knowledge: {Topic Title}
*Captured: {YYYY-MM-DD}*
*Areas: {comma-separated areas from Step 1}*

## Summary
{1-3 sentences: what was done and why, based on session context}

## Decisions
{Only if "Architecture decisions" was selected}
- **{Decision}**: {Rationale}

## Discoveries
{Only if "API discoveries" was selected}
- **{Service/API}**: {What was learned — endpoints, auth quirks, rate limits, data formats}

## Troubleshooting
{Only if "Troubleshooting solutions" was selected}

### {Problem description}
**Cause:** {Why it happened}
**Solution:** {What fixed it}

## Useful Commands
{Only if "Useful commands" was selected}

```bash
# {Description of what this does}
{command}
```

## Gotchas
{Always include if there are any warnings or "watch out for this" items}
- {Thing to watch out for next time}

## Related Files
{List key files that were created or modified, for easy reference}
- `{file_path}` — {brief description}
```

**Rules for content generation:**
- Extract concrete facts from the conversation history above — don't write generic advice
- Pull actual command examples, API endpoints, error messages, file paths directly from the chat — not placeholders
- If something was tried and failed in the conversation, capture that as troubleshooting
- If a decision was debated or explained, capture the rationale
- Keep it scannable: bullet points over paragraphs
- If the user provided additional notes, integrate them into the relevant sections
- Omit empty sections entirely

## Phase 4: Preview and Confirm

Show the user the generated content by printing it in full. Then use AskUserQuestion:
1. "Save this knowledge file?" with header "Save" and options:
   - "Save as-is" — write the file
   - "Let me add more notes" — user provides additions, then save
   - "Discard" — don't save, end the workflow

If saved, also check if `.claude/reference/index.md` exists:
- If yes: append an entry to the index
- If no: create the index with a header and the first entry

**Index format:**

```markdown
# Knowledge Index

| Date | Topic | File |
|------|-------|------|
| {YYYY-MM-DD} | {Topic} | `{filename}.md` |
```

## Phase 5: Done

After saving, print a confirmation:

```
Saved: .claude/reference/{filename}.md
```

If the index was updated, also note that.
