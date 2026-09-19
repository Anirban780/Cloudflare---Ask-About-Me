# Ask-About-Me — Project Scope

> **Working title:** Ask-About-Me (an AI portfolio concierge)
> **One-line pitch:** A public chat agent, running entirely on Cloudflare, that answers recruiter and engineer questions about {{OWNER_NAME}}'s background using retrieval over their own resume, projects and writing, with cited sources, per-visitor memory, and zero external API keys.
>
> **Read order for builder agents:** `PROJECT_SCOPE.md` (what and why) → `SPECS.md` (exact how) → `SKILLS.md` (rules, recipes, gotchas).

---

## 1. Why this project exists

This is the optional assignment on Cloudflare's application form: build an AI-powered application on Cloudflare and share the GitHub repo. The form asks for four components. This project covers each one with a Cloudflare-native primitive:

| Form requirement | How this project satisfies it | Primitive |
|---|---|---|
| LLM (Llama 3.3 on Workers AI recommended) | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` via `workers-ai-provider` and the Vercel AI SDK | Workers AI (`env.AI` binding) |
| Workflow / coordination | One stateful agent per visitor coordinates chat, tools and memory. A durable pipeline ingests and embeds documents. | Agents SDK on Durable Objects, plus Cloudflare Workflows |
| User input via chat or voice | Streaming chat UI over WebSocket | React chat UI from the starter, served by the Worker |
| Memory or state | Per-visitor memory and chat history in the agent's SQLite. Knowledge memory in a vector index. | Durable Object SQLite + `setState`, Vectorize |

The form also says AI-assisted coding is encouraged **but prompt history must be submitted**. Prompt logging is therefore a first-class deliverable (see `SKILLS.md` §7).

## 2. What makes this submission stand out

Reviewers see many "chatbot with a system prompt" submissions. This one is designed to differ in five ways:

1. **Grounded with citations, and it refuses honestly.** It never invents facts about the owner. Answers carry `[n]` source references, and out-of-knowledge questions get a clear "I don't have that" plus an offer to pass on a message.
2. **Evaluated, not just demoed.** A golden retrieval set and a hallucination-bait set produce numbers that go in the README.
3. **Durable ingestion.** Adding knowledge is a Cloudflare Workflow (chunk → embed → upsert) with retries, not a one-off script that writes straight to the index.
4. **Real memory with privacy controls.** The agent remembers who the visitor is and what they are hiring for, shows that memory in the UI, and lets them clear it.
5. **Honest engineering write-up.** The README documents design decisions, limits, and what was tried and dropped.

## 3. Inputs the owner must provide before building

Builder agents must not invent these. Fill them in first (e.g. in `docs/PROJECT_INPUTS.md`).

| Placeholder | Meaning | Example |
|---|---|---|
| `{{OWNER_NAME}}` | Full name | "Jane Doe" |
| `{{OWNER_FIRST}}` | First name, used in the agent's third-person replies | "Jane" |
| `{{AGENT_NAME}}` | Display name of the agent | "Ask-About-Jane" |
| `{{GITHUB_USER}}` | GitHub handle (for the live-repo tool, P1) | "janedoe" |
| `{{TARGET_ROLES}}` | Roles the owner is targeting | "Solutions Engineer, Developer Advocate" |
| `{{REPO_URL}}` | Public repo URL | `https://github.com/janedoe/ask-about-me` |

**Knowledge documents (markdown, in `/knowledge`)**

- `resume.md`: full resume as prose and bullets, not a screenshot.
- `about.md`: a 200–400 word "who I am and what I'm looking for".
- `projects/*.md`: **3–5 project write-ups**, each ≥150 words covering problem, approach, stack, outcome, link.
- Optional: blog posts, talks, certifications.

**Data hygiene rule.** Only public-safe content goes in `/knowledge`. No phone number, home address, ID numbers, or anything the owner would not put on a public website. Email only if the owner wants it public.

**Minimum viable knowledge base for a meaningful demo:** ≥6 documents and ≥40 chunks after ingestion.

## 4. Users and stories

| ID | Persona | Story |
|---|---|---|
| U1 | Recruiter | "In under 30 seconds I want to see whether this person fits my role." |
| U2 | Hiring manager | "I want to ask about one project's architecture and get a sourced answer." |
| U3 | Engineer | "Which Cloudflare products has this person actually used?" |
| U4 | Returning visitor | "I told it I'm hiring for a Solutions Engineer. It should remember that." |
| U5 | Visitor with an unanswerable question | "If it doesn't know, it should say so and let me leave a message." |
| U6 | Owner | "I update my markdown files and run one command to refresh the agent's knowledge." |
| U7 | Application reviewer | "I want to see Cloudflare primitives used idiomatically, with clear docs." |

## 5. Scope

### P0: must ship (the submission fails without these)

| ID | Feature | Notes |
|---|---|---|
| F-01 | Streaming chat UI | Start from the `agents-starter` UI; rebrand it |
| F-02 | Llama 3.3 on Workers AI | Model id in a `CHAT_MODEL` var so it can be swapped fast |
| F-03 | Knowledge ingestion pipeline | Cloudflare Workflow: chunk → embed → upsert to Vectorize; admin endpoint plus CLI script |
| F-04 | `searchKnowledgeBase` tool | The model decides when to retrieve. Results carry source metadata. |
| F-05 | Grounding and refusal policy | No invented facts. Citations `[n]`. Honest "I don't know". |
| F-06 | Per-visitor persistent memory | One Durable Object per visitor. History and profile survive refresh and restart. |
| F-07 | Visitor personalization | `rememberVisitorContext` tool. Agent tailors emphasis using saved context. |
| F-08 | Deployed and documented | Live `workers.dev` URL, public repo, README with architecture, `PROMPTS.md` |
| F-09 | Abuse protection | Per-visitor rate limit, input length cap, output token cap, graceful quota errors |
| F-10 | Tests and retrieval eval | Chunker unit tests plus a golden retrieval eval that prints hit@k |

### P1: should ship (do only after every P0 feature is green; pick at least two)

| ID | Feature | Notes |
|---|---|---|
| F-11 | `getGitHubProjects` tool | Live repo data from the GitHub REST API, edge-cached |
| F-12 | `leaveMessageForOwner` tool | Human-in-the-loop approval (`needsApproval`), writes to D1 inbox, admin read endpoint |
| F-13 | Source filter | Optional `sourceType` filter on retrieval (resume / project / blog) |
| F-14 | "Forget me" | Visitor can clear memory and history; privacy note in UI |
| F-15 | UI polish | Suggested-question chips, citation chips with snippet expand, memory chip |
| F-16 | Answer-level eval | Admin `/api/admin/ask` non-streaming endpoint plus scripted bait prompts |

### P2: stretch (only with spare time; never at the cost of P0/P1 quality)

Voice input via Realtime; email forwarding via Email Routing; expose an MCP server (`search_portfolio`); Cron Trigger that re-syncs GitHub READMEs into the KB; simple analytics view of top questions.

## 6. Non-goals

- Not multi-tenant: one owner, one knowledge base.
- No visitor accounts or login.
- No visitor file uploads.
- No fine-tuning or training.
- The agent does **not** impersonate the owner. It is an AI assistant that speaks about the owner in third person.
- No storing of visitor PII beyond what they voluntarily state, and only fields listed in `SPECS.md` §5.
- No third-party LLM or embedding APIs (no external keys).

## 7. Success criteria (measurable)

| # | Criterion | Target |
|---|---|---|
| 1 | Live URL works in an incognito window on a fresh session | Yes |
| 2 | Retrieval golden set, hit@5 | ≥ 85% on ≥ 20 questions |
| 3 | Hallucination-bait prompts that produce invented facts | 0 of 8 |
| 4 | Memory persists across refresh, new tab, and next day | Yes |
| 5 | Ingest a ~3,000-word document end to end | < 2 minutes |
| 6 | Median time to first streamed token on the deployed app | < 4 s (soft target) |
| 7 | Clean clone to running locally following the README | < 10 minutes |
| 8 | Rate limit and input cap trigger friendly messages, not crashes | Yes |
| 9 | No secrets in repo or git history | Yes |
| 10 | README contains pitch, live link, diagram, setup, decisions, eval numbers, limitations | Yes |

## 8. Constraints and assumptions

- **Platform:** Cloudflare only (Workers, Durable Objects, Workers AI, Vectorize, Workflows; D1 for P1). No external LLM keys.
- **Local dev:** Workers AI has no local simulator, so `npm run dev` needs a Cloudflare login (`wrangler login` or `CLOUDFLARE_API_TOKEN`). Document this in the README.
- **Model context:** treat the Llama 3.3 70B fp8-fast context window as ~24K tokens (third-party listing; verify on Cloudflare's model page). Budget prompts accordingly (see `SPECS.md` §7).
- **Free-tier quota:** Workers AI usage is metered. A public link can be exhausted by traffic, so the rate limits and graceful errors in F-09 are required, not optional.
- **Stack starting point:** `cloudflare/agents-starter` (React + Vite + Agents SDK + Workers AI). Do not rebuild what the starter provides.
- **Timebox:** ~14–20 focused hours total.

## 9. Milestones

Each milestone maps to slices in `SPECS.md` §15 and ends with a commit and a passing verification gate.

| Milestone | Outcome | Slices | Time | Exit criteria |
|---|---|---|---|---|
| M0 Baseline | Untouched starter deployed | S0–S1 | 1 h | Live URL from the starter; versions recorded; docs and `CLAUDE.md`/`AGENTS.md` in place |
| M1 Persona | Llama 3.3 plus owner-specific persona, demo tools removed | S2 | 1–2 h | Chat streams with the new persona; no demo tools remain |
| M2 Knowledge pipeline | Docs chunked, embedded, stored | S3–S5 | 3–4 h | `search-debug` returns sensible matches for sample questions |
| M3 RAG | Tool-based retrieval with citations and refusals | S6 | 2–3 h | F-04/F-05 acceptance tests pass |
| M4 Memory and safety | Visitor memory, rate limit, caps | S7 | 2 h | F-06/F-07/F-09 acceptance tests pass |
| M5 Evals | Golden set and bait tests; thresholds tuned | S8 | 1–2 h | Success criteria 2 and 3 met; numbers recorded |
| M6 P1 features | At least two P1 features | S9 | 2–3 h | Acceptance tests pass |
| M7 Ship | Polish, README, final QA, submit | S10 | 2–3 h | Submission checklist complete |

## 10. Risks and mitigations

| ID | Risk | Mitigation |
|---|---|---|
| R1 | Outdated or hallucinated SDK syntax from the coding agent | Reference docs in `docs/reference/`, "verify" list in `SPECS.md` §16, typecheck after every change, rule "never guess an API" |
| R2 | Llama 3.3 tool calling is flaky | `RETRIEVAL_MODE=always` fallback that retrieves server-side before generation |
| R3 | Workers AI quota exhausted by visitors | Rate limit, output cap, `CHAT_MODEL` var, friendly error path |
| R4 | Agent invents facts about the owner | Grounding rules, refusal policy, bait test set, low temperature |
| R5 | Prompt injection via visitor text or KB content | Retrieved text is data, no dangerous tools, approval gate on side-effect tools |
| R6 | Vectorize is eventually consistent, so tests look broken right after ingest | Wait a few seconds after ingest; health route reports index status |
| R7 | Scope creep | P0 freeze; P1 only after P0 is green; new ideas go to `docs/BACKLOG.md` |
| R8 | PII leak | Public-safe KB only; state minimization; forget-me |
| R9 | Prompt history not captured | Start `PROMPTS.md` in S1; log at the end of every session |
| R10 | Works locally, fails deployed | Smoke test the deployed URL at every infra slice; use `wrangler tail` |

## 11. Definition of Done (whole project)

- [ ] All P0 features meet their acceptance criteria (`SPECS.md` §13)
- [ ] At least two P1 features done and tested
- [ ] `npm run typecheck`, `npm test`, and `npm run eval` pass on a clean clone
- [ ] Deployed URL verified in incognito on desktop and mobile widths
- [ ] Bait tests re-run against the deployed URL after final deploy
- [ ] README complete (see `SPECS.md` §15.1)
- [ ] `PROMPTS.md` plus `/prompt-history` committed (nothing sanitized into fiction)
- [ ] `git log -p | grep -iE "(api[_-]?key|secret|token)"` shows no real secrets
- [ ] Repo is public and the URL is ready to paste into the application form

## 12. Submission checklist (Greenhouse form)

- [ ] GitHub repo URL pasted into "Optional Assignment: Please share GitHub repo URL"
- [ ] Live demo URL is at the top of the README (the form has one field, so the README must carry it)
- [ ] Prompt history is in the repo and linked from the README
- [ ] Repo description and topics set (`cloudflare`, `agents`, `rag`, `workers-ai`, `durable-objects`, `vectorize`)
- [ ] Final incognito test of the live URL within an hour of submitting
