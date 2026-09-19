# Project Steps — Change Tracker

> Tracks every significant change made to the Ask-About-Me project.
> Updated after every commit or milestone completion.

---

## Change Log

### 2026-09-19 — Project Initialization

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created project directory structure | `ask-about-me/` (entire tree) | ✅ Done |
| 2 | Copied PROJECT_SCOPE.md, SPECS.md, SKILLS.md into `docs/` | `docs/PROJECT_SCOPE.md`, `docs/SPECS.md`, `docs/SKILLS.md` | ✅ Done |
| 3 | Created PROMPTS.md (prompt history index) | `PROMPTS.md` | ✅ Done |
| 4 | Created PROJECT_STEPS.md (this file) | `PROJECT_STEPS.md` | ✅ Done |
| 5 | Created high-level implementation plan | `docs/plans/IMPLEMENTATION_PLAN.md` | ✅ Done |
| 6 | Created package dependency manifest | `docs/plans/PACKAGES.md` | ✅ Done |
| 7 | Saved confirmed project inputs | `docs/PROJECT_INPUTS.md` | ✅ Done |

---

### 2026-09-19 — Slice S0: Baseline Scaffold

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created `.gitignore` and `.dev.vars.example` | `.gitignore`, `.dev.vars.example` | ✅ Done |
| 2 | Created Slice S0 execution plan | `docs/plans/S00.md` | ✅ Done |
| 3 | Created agent context pointers | `CLAUDE.md`, `AGENTS.md` | ✅ Done |
| 4 | Scaffolded `cloudflare/agents-starter` template | `package.json`, `wrangler.jsonc`, `vite.config.ts`, `src/` | ✅ Done |
| 5 | Installed dependencies (`npm install`) | `node_modules/` | ✅ Done |
| 6 | Generated Wrangler types (`npx wrangler types`) | `worker-configuration.d.ts` | ✅ Done |
| 7 | Recorded package versions | `docs/reference/VERSIONS.md` | ✅ Done |
| 8 | Documented verified SDK items (SPECS §16) | `docs/reference/VERIFIED.md` | ✅ Done |
| 9 | Verified TypeScript compilation clean (`npm run typecheck`) | `src/`, `package.json` | ✅ Done (0 errors) |
| 10 | Created comprehensive project README outline | `README.md` | ✅ Done |
| 11 | Committed baseline scaffold (`106697a`, `e828150`) | Git repository | ✅ Done |

---

### 2026-09-19 — Slice S2: Persona Agent & Llama 3.3

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created Slice S2 execution plan | `docs/plans/S02.md` | ✅ Done |
| 2 | Configured `wrangler.jsonc`: `CHAT_MODEL` (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), `PortfolioAgent` DO binding, owner vars | `wrangler.jsonc` | ✅ Done |
| 3 | Implemented `src/agent/system-prompt.ts`: Anirban Sarkar persona, grounding rules, dynamic visitor profile injection | `src/agent/system-prompt.ts` | ✅ Done |
| 4 | Implemented `src/agent/portfolio-agent.ts`: `PortfolioAgent` class with Llama 3.3 streaming, 0.2 temperature, no demo tools | `src/agent/portfolio-agent.ts` | ✅ Done |
| 5 | Cleaned `src/server.ts`: export `PortfolioAgent`, add `/api/health` endpoint, route agent WebSocket | `src/server.ts` | ✅ Done |
| 6 | Rebranded `src/app.tsx`: "Ask-About-Me" concierge UI, suggestion chips, persistent visitor ID, removed starter demo tools/MCP | `src/app.tsx` | ✅ Done |
| 7 | Regenerated Wrangler types | `worker-configuration.d.ts` | ✅ Done |
| 8 | Verified TypeScript compilation clean (`npm run typecheck`) | `src/`, `worker-configuration.d.ts` | ✅ Done (0 errors) |
| 9 | Committed Slice S2 (`7763605`) | Git repository | ✅ Done |

---

### 2026-09-19 — Slice S3: Markdown Chunker & Unit Tests

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created Slice S3 execution plan | `docs/plans/S03.md` | ✅ Done |
| 2 | Created `src/config.ts` with all constants per SPECS §5.4 | `src/config.ts` | ✅ Done |
| 3 | Implemented pure `chunkMarkdown` in `src/rag/chunker.ts` per SPECS §6.3 | `src/rag/chunker.ts` | ✅ Done |
| 4 | Installed `vitest` dev dependency per SKILLS R7 allowlist | `package.json` | ✅ Done |
| 5 | Created `vitest.config.ts` for clean node-based unit testing | `vitest.config.ts` | ✅ Done |
| 6 | Added `"test": "vitest run"` script to `package.json` | `package.json` | ✅ Done |
| 7 | Implemented unit tests for all 9 chunker properties | `test/chunker.test.ts` | ✅ Done |
| 8 | Executed `npm test` verifying 9/9 tests pass (100% green) | `test/chunker.test.ts` | ✅ Done |
| 9 | Verified TypeScript compilation clean (`npm run typecheck`) | Entire codebase | ✅ Done (0 errors) |
| 10 | Committed Slice S3 (`aa93e57`, `dfa17a7`) | Git repository | ✅ Done |

---

### 2026-09-19 — Slice S4: Infrastructure Bindings

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created Slice S4 execution plan | `docs/plans/S04.md` | ✅ Done |
| 2 | Scaffolded `src/workflows/ingest-workflow.ts` with `IngestWorkflow` class | `src/workflows/ingest-workflow.ts` | ✅ Done |
| 3 | Added Vectorize index binding (`ask-about-me-kb`) to `wrangler.jsonc` | `wrangler.jsonc` | ✅ Done |
| 4 | Added Workflows binding (`ingest-workflow`) to `wrangler.jsonc` | `wrangler.jsonc` | ✅ Done |
| 5 | Exported `IngestWorkflow` from `src/server.ts` | `src/server.ts` | ✅ Done |
| 6 | Updated `/api/health` to report Vectorize, Workflows, and AI binding readiness | `src/server.ts` | ✅ Done |
| 7 | Regenerated Wrangler types (`npx wrangler types`) | `worker-configuration.d.ts` | ✅ Done |
| 8 | Verified unit tests pass (`npm test`: 9/9 tests green) | `test/chunker.test.ts` | ✅ Done |
| 9 | Verified TypeScript compilation clean (`npm run typecheck`: 0 errors) | Entire codebase | ✅ Done |

---

### 2026-09-19 — Slice S5: Ingestion Pipeline & Knowledge Base

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Installed `tsx` and `gray-matter` dev dependencies per SKILLS R7 allowlist | `package.json`, `package-lock.json` | ✅ Done |
| 2 | Added `"ingest": "tsx scripts/ingest.ts"` script to `package.json` | `package.json` | ✅ Done |
| 3 | Implemented embedding helper `embedTexts` with `@cf/baai/bge-base-en-v1.5` | `src/rag/embed.ts` | ✅ Done |
| 4 | Implemented durable `IngestWorkflow` (validate, chunk, delete-stale, embed-upsert, finalize) | `src/workflows/ingest-workflow.ts` | ✅ Done |
| 5 | Added admin API routes (`POST /api/admin/ingest`, `GET /api/admin/ingest/:id`, `GET /api/admin/search-debug`) | `src/server.ts` | ✅ Done |
| 6 | Created CLI ingestion runner `scripts/ingest.ts` with frontmatter validation and status polling | `scripts/ingest.ts` | ✅ Done |
| 7 | Created full 8-document initial knowledge base (40 chunks total) | `knowledge/about.md`, `knowledge/resume.md`, `knowledge/blog-edge-state-architecture.md`, `knowledge/projects/*.md` | ✅ Done |
| 8 | Created Slice S5 plan document | `docs/plans/S05.md` | ✅ Done |
| 9 | Recorded prompt transcript | `prompt-history/2026-09-19-S05-antigravity.md` | ✅ Done |
| 10 | Verified test suite (`npm test`: 9/9 passed) and types (`npm run typecheck`: 0 errors) | Entire codebase | ✅ Done |

---

### 2026-09-19 — Slice S6: RAG Tool & Citations

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created citation parsing and matching utilities | `src/rag/citations.ts` | ✅ Done |
| 2 | Created unit tests for citations covering 10 edge cases | `test/citations.test.ts` | ✅ Done (10/10 passed) |
| 3 | Implemented pure 7-step retrieval algorithm with filtering, deduplication, and budget caps | `src/rag/retrieve.ts` | ✅ Done |
| 4 | Created unit tests for retrieval algorithm covering 7 properties | `test/retrieve.test.ts` | ✅ Done (7/7 passed) |
| 5 | Created `buildTools` with `searchKnowledgeBase` and SQLite `retrieval_log` insertion | `src/agent/tools.ts` | ✅ Done |
| 6 | Refined grounding rules in system prompt to enforce tool calling on factual queries | `src/agent/system-prompt.ts` | ✅ Done |
| 7 | Updated `PortfolioAgent` with `onStart()` SQLite table init, tools integration, and `RETRIEVAL_MODE="always"` fallback | `src/agent/portfolio-agent.ts` | ✅ Done |
| 8 | Created interactive expandable `SourceChips` UI component | `src/components/SourceChips.tsx` | ✅ Done |
| 9 | Updated `src/app.tsx` with dynamic tool running indicators and message citation chip rendering | `src/app.tsx` | ✅ Done |
| 10 | Created Slice S6 execution plan and prompt history | `docs/plans/S06.md`, `prompt-history/2026-09-19-S06-antigravity.md` | ✅ Done |
| 11 | Verified all tests (`npm test`: 26/26 passed) and types (`npm run typecheck`: 0 errors) | Entire codebase | ✅ Done |

---

### 2026-09-19 — Slice S7: Visitor Memory & Guardrails

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Implemented pure guardrail functions (`decideRate`, `checkInputLength`, `createStaticUIMessageResponse`) | `src/agent/guards.ts` | ✅ Done |
| 2 | Created unit tests for guards covering 10 boundary conditions | `test/guards.test.ts` | ✅ Done (10/10 passed) |
| 3 | Implemented `rememberVisitorContext` tool with Zod schema and state persistence | `src/agent/tools.ts` | ✅ Done |
| 4 | Implemented `@callable() forgetVisitor()` RPC for privacy compliance | `src/agent/portfolio-agent.ts` | ✅ Done |
| 5 | Integrated rate limiting, input length caps, and 30-day retention into `PortfolioAgent` | `src/agent/portfolio-agent.ts` | ✅ Done |
| 6 | Added dynamic `Remembered` memory chip banner, "Forget me" button, and privacy indicator | `src/app.tsx` | ✅ Done |
| 7 | Created Slice S7 execution plan and prompt history | `docs/plans/S07.md`, `prompt-history/2026-09-19-S07-antigravity.md` | ✅ Done |
| 8 | Verified all tests (`npm test`: 36/36 passed) and types (`npm run typecheck`: 0 errors) | Entire codebase | ✅ Done |

---

### 2026-09-19 — Slice S8: Evals & Golden Suite

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created golden evaluation suite with 24 queries, 4 paraphrase pairs, and 3 pinpoint queries | `evals/golden.json` | ✅ Done |
| 2 | Created comprehensive 8-scenario hallucination and injection bait suite | `evals/bait.json` | ✅ Done |
| 3 | Implemented automated retrieval eval harness with Hit@1, Hit@5, and mean score computation | `evals/run-retrieval-eval.ts` | ✅ Done |
| 4 | Added `"eval:retrieval": "tsx evals/run-retrieval-eval.ts"` script to `package.json` | `package.json` | ✅ Done |
| 5 | Created evaluation baseline report and benchmark documentation | `evals/results.md` | ✅ Done |
| 6 | Verified dry-run execution validating dataset coverage across all 8 knowledge docs | `evals/run-retrieval-eval.ts` | ✅ Done |
| 7 | Created Slice S8 execution plan and prompt history | `docs/plans/S08.md`, `prompt-history/2026-09-19-S08-antigravity.md` | ✅ Done |
| 8 | Verified all tests (`npm test`: 36/36 passed) and types (`npm run typecheck`: 0 errors) | Entire codebase | ✅ Done |

---

### 2026-09-19 — Slice S9: P1 Features (GitHub Projects & Owner Messaging)

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created GitHub integration module `fetchGitHubRepos` with topic filter, fork removal, and rate-limit fallbacks | `src/agent/github.ts` | ✅ Done |
| 2 | Created Owner Inbox helper module with Zod validation schema and input sanitization | `src/agent/inbox.ts` | ✅ Done |
| 3 | Added `getGitHubProjects` and `leaveMessageForOwner` (with `needsApproval: true`) tools to agent registry | `src/agent/tools.ts` | ✅ Done |
| 4 | Added `owner_inbox` SQLite table and `@callable()` methods in `PortfolioAgent` for cross-DO messaging | `src/agent/portfolio-agent.ts` | ✅ Done |
| 5 | Updated system prompt with GitHub repository search and owner contact messaging instructions | `src/agent/system-prompt.ts` | ✅ Done |
| 6 | Implemented authenticated admin routes `GET /api/admin/inbox` and `POST /api/admin/ask` (F-16) | `src/server.ts` | ✅ Done |
| 7 | Enhanced UI `ToolPartView` with custom approval card for messaging and live tool indicators | `src/app.tsx` | ✅ Done |
| 8 | Created unit tests for GitHub integration covering 6 scenarios | `test/github.test.ts` | ✅ Done (6/6 passed) |
| 9 | Created unit tests for Owner Inbox validation and sanitization covering 7 scenarios | `test/inbox.test.ts` | ✅ Done (7/7 passed) |
| 10 | Created Slice S9 execution plan and prompt history | `docs/plans/S09.md`, `prompt-history/2026-09-19-S09-antigravity.md` | ✅ Done |
| 11 | Verified all tests (`npm test`: 49/49 passed), types (`npm run typecheck`: 0 errors), and build (`npx vite build`) | Entire codebase | ✅ Done |

---

### 2026-09-19 — Slice S10: Polish, Documentation & Submission Readiness

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Created Slice S10 execution plan | `docs/plans/S10.md` | ✅ Done |
| 2 | Rewrote comprehensive `README.md` following SPECS §15.1 (9 sections: pitch, demo, assignment mapping, architecture diagrams, design decisions, eval results, setup, project structure, limitations, AI attribution) | `README.md` | ✅ Done |
| 3 | Created `TESTING_GUIDE.md` — 14-section non-developer testing walkthrough (prerequisites, account setup, infra creation, ingest, UI verification, admin routes via curl, eval suite, unit tests, deploy, troubleshooting) | `TESTING_GUIDE.md` | ✅ Done |
| 4 | Appended D11 (HITL `needsApproval` rationale) and D12 (owner_inbox storage strategy) to `docs/SPECS.md §17` decision log | `docs/SPECS.md` | ✅ Done |
| 5 | Final verification: all 49/49 unit tests pass (`npm test`), TypeScript compiles clean (`npm run typecheck` — 0 errors) | Entire codebase | ✅ Done |
| 6 | Updated `PROJECT_STEPS.md` with S10 row | `PROJECT_STEPS.md` | ✅ Done |
| 7 | Updated `PROMPTS.md` with Session 11 entry | `PROMPTS.md` | ✅ Done |
| 8 | Created prompt history for S10 session | `prompt-history/2026-09-19-S10-antigravity.md` | ✅ Done |
| 9 | Committed all S10 changes with message `docs: final readme and architecture` | Git repository | ✅ Done |

---

### 2026-09-19 — Slice S11: Streaming Deduplication Fix & Remote Readiness

| # | Change | Files Affected | Status |
|---|--------|---------------|--------|
| 1 | Diagnosed streaming tool call corruption: `workers-ai-provider` v3.3.1 processed both `chunk.tool_calls` and `choices[0].delta.tool_calls` per SSE event, causing doubled argument fragments (`AnAnirirbanban...`) and JSON parse errors | `src/agent/portfolio-agent.ts` | ✅ Done |
| 2 | Created `createSafeAIBinding` stream proxy wrapper in `src/agent/ai-binding.ts` to drop duplicate top-level fields when `choices[0].delta` exists | `src/agent/ai-binding.ts` | ✅ Done |
| 3 | Integrated `createSafeAIBinding` into `PortfolioAgent` Durable Object | `src/agent/portfolio-agent.ts` | ✅ Done |
| 4 | Fixed unused error variable lint error in `src/agent/github.ts` | `src/agent/github.ts` | ✅ Done |
| 5 | Created automated regression test verifying exact tool call argument deduplication | `test/ai-binding.test.ts` | ✅ Done (2/2 passed) |
| 6 | Verified all test suites (`npm test`: 51/51 passed across 7 files) | Entire test suite | ✅ Done |
| 7 | Verified type safety and lint (`oxlint src/`, `tsc --noEmit`: 0 errors) and build (`vite build`: 0 errors) | Entire codebase | ✅ Done |
| 8 | Configured GitHub remote repository and pushed codebase to `origin/master` | Git repository | ✅ Done |

---

> **Note:** This file is updated slice-by-slice as the project progresses.






