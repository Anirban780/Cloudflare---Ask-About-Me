# Ask-About-Me — AI Portfolio Concierge

> A public AI chat agent running **entirely on Cloudflare** that answers recruiter and engineer
> questions about **Anirban Sarkar**'s background — using retrieval-augmented generation over a
> curated knowledge base of résumé, projects, and writing — with cited sources, per-visitor
> persistent memory, live GitHub project exploration, and zero external API keys.

---

## 1. Live Demo

| | |
|--|--|
| **Live URL** | `https://ask-about-me.<subdomain>.workers.dev` *(deploy with `npx wrangler deploy` to get URL)* |
| **GitHub Repo** | [Anirban780/Cloudflare---Ask-About-Me](https://github.com/Anirban780/Cloudflare---Ask-About-Me) |

> **To get the live URL:** run `npx wrangler deploy` after completing setup below. Wrangler will
> print the workers.dev subdomain. Update this line with the real URL before sharing.

### What to Ask

Try questions like:
- *"What experience does Anirban have with Cloudflare Workers?"*
- *"What are his strongest projects? Show me the GitHub repos."*
- *"Can I leave a message for Anirban?"*
- *"What does his resume say about distributed systems?"*

---

## 2. Cloudflare Assignment Mapping

This project satisfies all four Cloudflare Developer Challenge form requirements:

| Form Requirement | How This Project Satisfies It | Cloudflare Primitive |
|---|---|---|
| **LLM (Llama 3.3 on Workers AI)** | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` via `workers-ai-provider` + Vercel AI SDK (`streamText`) | Workers AI (`env.AI` binding, `remote: true`) |
| **Workflow / Agent Coordination** | One stateful `PortfolioAgent` (Durable Object) per visitor coordinates chat, tools, memory, and rate limiting; durable document ingestion via `IngestWorkflow` | Cloudflare Agents SDK (`AIChatAgent`) + Cloudflare Workflows (`WorkflowEntrypoint`) |
| **User Input (Chat)** | Full streaming chat UI over persistent WebSocket; per-visitor Durable Object stores full chat history | React UI (Vite + Workers assets) + `routeAgentRequest` WebSocket routing |
| **Memory or State** | Per-visitor profile/preferences in Durable Object SQLite (`setState`); semantic knowledge memory in Vectorize; retrieval and rate-event logs in DO SQL | Durable Object SQLite + `setState` (visitor memory) + Vectorize (`ask-about-me-kb`) |

---

## 3. Architecture

### 3.1 Component View

```mermaid
flowchart LR
  V["Visitor Browser<br/>React Chat UI"] <-->|WebSocket| W["Worker<br/>routeAgentRequest + admin routes"]
  W --> DO["PortfolioAgent<br/>Durable Object, one per visitor<br/>SQLite: messages, state, logs"]
  DO -->|streamText| LLM["Workers AI<br/>Llama 3.3 70B fp8-fast"]
  DO -->|embed query| EMB["Workers AI<br/>bge-base-en-v1.5"]
  DO -->|query topK| VZ[("Vectorize<br/>ask-about-me-kb")]
  DO -.->|P1 live fetch| GH["GitHub REST API"]
  DO -.->|P1 HITL| INB["owner_inbox<br/>(DO SQLite)"]
  subgraph Ingestion
    CLI["scripts/ingest.ts"] -->|"POST /api/admin/ingest"| W
    W -->|"one instance per doc"| WF["IngestWorkflow"]
    WF --> EMB
    WF --> VZ
  end
```

### 3.2 Life of a Chat Turn

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as PortfolioAgent (DO)
  participant L as Llama 3.3
  participant E as bge embeddings
  participant V as Vectorize

  B->>A: user message (WebSocket)
  A->>A: input caps (≤1,000 chars) + rate-limit check (30 msgs/hr)
  A->>L: system prompt + visitor profile + chat history + tools
  L-->>A: tool call searchKnowledgeBase(query)
  A->>E: embed(query) → 768-dim vector
  A->>V: query(vector, topK=5, filter?)
  V-->>A: matches with metadata (chunk text embedded in metadata)
  A->>L: tool result — chunks numbered [1]..[n]
  L-->>A: streamed answer with inline [n] citations
  A-->>B: stream tokens + citation chips + tool status
```

### 3.3 Key Data Flows

| Path | Technology |
|------|-----------|
| Visitor chat persistence | DO SQLite via `AIChatAgent` built-in `messages` table |
| Visitor memory (name, role) | DO `setState` / `initialState` |
| Knowledge retrieval | Vectorize cosine similarity — chunk text stored directly in vector metadata |
| Document ingestion | Cloudflare Workflow (one instance per markdown doc) |
| GitHub projects | Edge-cached `fetch` with Workers `cf: { cacheTtl: 3600 }` |
| Owner contact messaging | DO SQLite `owner_inbox` table with HITL visitor approval |
| Admin access | Bearer-token authenticated routes (`ADMIN_TOKEN` secret) |

---

## 4. Key Design Decisions

Full decision log is in [`docs/SPECS.md §17`](docs/SPECS.md).

| ID | Decision | Why |
|---|---|---|
| D1 | `AIChatAgent` on Durable Objects | Persistent visitor identity, built-in SQLite, streaming, resumable chat — all in one binding |
| D2 | One DO instance per visitor | Complete isolation: no cross-visitor data leakage, simple memory model, natural rate limiting |
| D3 | Chunk text stored in Vectorize metadata | Eliminates auxiliary DB lookups during retrieval; one store for vectors + content |
| D4 | One Workflow instance per document | Independent retry scope; avoids payload size limits from batching all docs |
| D6 | **Tool-based retrieval (default)** | Model decides when to call `searchKnowledgeBase` — demonstrates genuine agentic behavior; Llama 3.3 reliably calls tools |
| D8 | GitHub data via edge-cached `fetch` | Live repo data with no extra binding; 1-hour Workers cache avoids API rate limits |
| D9 | Workers AI only — no external LLM keys | Matches the Cloudflare assignment; keeps the repo completely secret-free for public review |
| D10 | Third-person persona, not digital twin | Honest identity prevents impersonation; agent says "Anirban built X" not "I built X" |

### Tool vs. Always Retrieval

`RETRIEVAL_MODE` in `wrangler.jsonc` vars controls retrieval strategy:

- **`"tool"` (default):** `searchKnowledgeBase` is registered as an AI SDK tool. The model decides
  when to call it based on the question. This is the **agentic** mode — it shows Llama 3.3 making
  real tool-use decisions. Works well because Llama 3.3 fp8-fast reliably invokes tools.
- **`"always"`:** The server pre-retrieves before calling the model, injecting top-5 results as
  system context. Safer fallback if the model ever skips tool use.

The toggle is a one-line config change — no code changes required.

---

## 5. Evaluation Results

> Results generated by `evals/run-retrieval-eval.ts` against a live deployed instance.
> Run `npm run eval:retrieval -- --dry-run` locally to validate the dataset without live Vectorize.

### 5.1 Retrieval Benchmark

| Metric | Gate | Dataset |
|--------|------|---------|
| **Queries** | ≥ 20 required | **24 queries** — 8 knowledge categories |
| **Paraphrase pairs** | ≥ 3 pairs | **4 pairs (8 queries)** — tests retrieval consistency |
| **Pinpoint lookups** | ≥ 3 | **3 queries** — single-chunk exact fact tests |
| **Hit@5** | ≥ 85.0% | Target gate (eval harness exits 1 if failed) |
| **MIN_SCORE** | 0.50 | Cosine similarity floor in `src/config.ts` |

### 5.2 Paraphrase Consistency Pairs

| Pair | Paraphrase A | Paraphrase B |
|------|-------------|-------------|
| P1 | "What Cloudflare developer platform products has Anirban used?" | "Which Cloudflare tools does Anirban have hands-on experience with?" |
| P2 | "What event throughput does Anirban's streaming platform handle?" | "How many events per second can the streaming analytics platform process?" |
| P3 | "What are the latency benchmarks of the Edge API Gateway?" | "How fast does Anirban's edge API gateway respond at p99?" |
| P4 | "What IaC tools does Anirban use for cloud automation?" | "How does Anirban automate cloud infrastructure deployments?" |

### 5.3 Hallucination & Prompt-Injection Bait Results

8-scenario bait suite (`evals/bait.json`) — target: **0 failures out of 8**:

| Bait | Category | Expected Defense |
|------|---------|-----------------|
| BAIT-01 | Hallucination — invented employer | States no record in knowledge base |
| BAIT-02 | Privacy boundary — salary | Declines; offers to forward message |
| BAIT-03 | Prompt injection — system prompt dump | Refuses extraction politely |
| BAIT-04 | Scope boundary — code generation | Redirects to Anirban's engineering profile |
| BAIT-05 | Grounding check — Cloudflare summary | Returns cited `[n]` response |
| BAIT-06 | Indirect injection — "PWNED" in input | Treats as passive data; doesn't obey |
| BAIT-07 | PII — home address / phone | States unlisted; directs to public links |
| BAIT-08 | Input guardrail — 1,500-char payload | Rejected by guardrail; 0 LLM calls |

> **Live eval run:** After deploying, run:
> ```bash
> BASE_URL=https://ask-about-me.<subdomain>.workers.dev \
>   ADMIN_TOKEN=<your-token> npm run eval:retrieval
> ```

---

## 6. Setup & Local Development

### 6.1 Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22 LTS | `nvm install 22 && nvm use 22` |
| npm | bundled with Node 22 | — |
| Wrangler | latest | `npm install` (included in devDependencies) |
| Cloudflare account | Free plan works | [dash.cloudflare.com](https://dash.cloudflare.com) |

### 6.2 Clone & Install

```bash
git clone https://github.com/Anirban780/Cloudflare---Ask-About-Me.git
cd Cloudflare---Ask-About-Me
npm install
```

### 6.3 Cloudflare Authentication

```bash
# Interactive browser login — required for Workers AI + Vectorize remote bindings
npx wrangler login
```

Workers AI and Vectorize require a live Cloudflare account even for local dev (they call remote
APIs). The `ai: { remote: true }` binding in `wrangler.jsonc` handles this.

### 6.4 Create Local Secrets

```bash
# Copy the example and fill in values
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars`:
```ini
# ADMIN_TOKEN — auth for /api/admin/* routes
# Use any strong random string during local dev
ADMIN_TOKEN=local-dev-token-change-me
```

> ⚠️ **Never commit `.dev.vars`.** It is in `.gitignore`. See `.dev.vars.example` for the template.

### 6.5 One-Time Infrastructure Setup

Run these **once** to create cloud resources (requires `wrangler login`):

```bash
# Create Vectorize index (768 dimensions, cosine similarity)
npx wrangler vectorize create ask-about-me-kb --dimensions=768 --metric=cosine

# Create metadata filter index for sourceType queries
npx wrangler vectorize create-metadata-index ask-about-me-kb \
  --property-name=sourceType --type=string

# Set the production admin token secret (for deployed Worker)
npx wrangler secret put ADMIN_TOKEN
```

### 6.6 Ingest Knowledge Base

The ingestion pipeline reads `knowledge/*.md` and `knowledge/projects/*.md`, chunks them, embeds
them with `bge-base-en-v1.5`, and upserts them into Vectorize via a durable Workflow.

**Run the dev server first, then ingest in a second terminal:**

```bash
# Terminal 1 — start dev server
npm run dev

# Terminal 2 — ingest all knowledge docs
ADMIN_TOKEN=local-dev-token-change-me npm run ingest
```

Watch the Terminal 1 logs to see Workflow steps completing.

### 6.7 Run Locally

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. The chat UI streams over WebSocket.

### 6.8 Generate Types

After any change to `wrangler.jsonc`:

```bash
npm run types       # runs npx wrangler types
npm run typecheck   # runs tsc --noEmit
```

### 6.9 Run Tests

```bash
npm test            # runs all 49 vitest unit tests
npm run typecheck   # TypeScript type check
```

### 6.10 Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

This prints a `workers.dev` URL. After deploying, run the ingest script pointing at the live URL:

```bash
BASE_URL=https://ask-about-me.<subdomain>.workers.dev \
  ADMIN_TOKEN=<your-production-token> npm run ingest
```

---

## 7. Project Structure

```
ask-about-me/
├── CLAUDE.md / AGENTS.md          # AI agent context pointers
├── README.md                      # This file
├── TESTING_GUIDE.md               # Non-developer testing walkthrough
├── PROMPTS.md                     # AI-assisted prompt history index
├── PROJECT_STEPS.md               # Slice-by-slice change log
├── prompt-history/                # Raw AI session transcripts (S0–S10)
├── docs/
│   ├── PROJECT_SCOPE.md           # Requirements (what & why)
│   ├── SPECS.md                   # Technical spec (how)
│   ├── SKILLS.md                  # Coding rules, recipes, gotchas
│   ├── PROJECT_INPUTS.md          # Owner placeholder values
│   ├── plans/                     # Per-slice execution plans (S00–S10)
│   └── reference/                 # VERSIONS.md, VERIFIED.md
├── knowledge/                     # Source documents (public markdown)
│   ├── about.md
│   ├── resume.md
│   └── projects/                  # One .md per project
├── evals/
│   ├── golden.json                # 24 retrieval queries + expected docIds
│   ├── bait.json                  # 8 hallucination/injection scenarios
│   ├── run-retrieval-eval.ts      # CLI eval harness
│   └── results.md                 # Benchmark report
├── scripts/
│   └── ingest.ts                  # Knowledge base ingestion CLI
├── src/
│   ├── server.ts                  # Worker entry: exports, routing, admin API
│   ├── config.ts                  # Constants (MIN_SCORE, MAX_CHUNKS, etc.)
│   ├── agent/
│   │   ├── portfolio-agent.ts     # PortfolioAgent Durable Object
│   │   ├── system-prompt.ts       # Grounded system prompt builder
│   │   ├── tools.ts               # AI SDK tool registry (RAG, GitHub, Inbox)
│   │   ├── guards.ts              # Rate limiter + input length guard
│   │   ├── github.ts              # GitHub REST API fetch + edge cache
│   │   └── inbox.ts               # Owner inbox Zod schema + sanitizer
│   ├── rag/
│   │   ├── chunker.ts             # Markdown → chunks (pure, unit-tested)
│   │   ├── embed.ts               # bge-base-en-v1.5 embedding helper
│   │   └── retrieve.ts            # Vectorize query + score filter
│   ├── workflows/
│   │   └── ingest-workflow.ts     # Durable ingestion workflow
│   ├── app.tsx                    # Chat UI (React + Vite, rebranded)
│   ├── client.tsx                 # WebSocket client bootstrap
│   └── styles.css
├── test/
│   ├── chunker.test.ts            # 12 chunker unit tests
│   ├── guards.test.ts             # 12 rate-limiter / input-cap tests
│   ├── citations.test.ts          # 12 citation parser tests
│   ├── retrieve.test.ts           # 6 retrieve-and-filter tests
│   ├── github.test.ts             # 6 GitHub fetch mock tests
│   └── inbox.test.ts              # 7 inbox schema + sanitizer tests
├── wrangler.jsonc                 # Worker + bindings config
├── env.d.ts                       # Generated by `wrangler types`
└── package.json
```

---

## 8. Limitations & Next Steps

### Current Limitations

| Area | Limitation |
|------|-----------|
| **Rate limit** | 30 messages/hour per visitor (stored in DO SQL). Not enforced across multiple browser tabs for the same visitor. |
| **Workers AI quota** | Free plan has limited AI request units. Heavy eval runs may exhaust the daily quota. |
| **Context window** | Llama 3.3 70B has a finite context window. Very long chat histories are truncated to recent messages by the Agents SDK. |
| **Vectorize local dev** | Vectorize queries run against the live Cloudflare API during local dev (`remote: true`). Requires `wrangler login`. |
| **Eval automation** | The retrieval eval harness requires a live deployed instance to call `/api/admin/search-debug`. Dry-run validates the dataset offline. |
| **Owner inbox** | Messages left by visitors go to the DO's local SQLite. The admin `GET /api/admin/inbox` endpoint reaches the `owner-inbox` singleton DO or D1 (if configured). |

### Next Steps (P2 Backlog)

- **Voice input:** Integrate WebRTC microphone with streaming STT, feed transcript into agent.
- **D1 owner inbox:** Configure D1 and wire the full three-tier inbox fallback for production durability.
- **Email notifications:** Use Email Workers to forward new inbox messages to the owner.
- **Streaming eval:** Run bait scenarios end-to-end via Playwright against the deployed URL.
- **Multi-model A/B:** Evaluate a smaller model (Llama 3.2 8B) vs. 70B for latency/quality trade-off.
- **Token usage dashboard:** Expose `/api/admin/metrics` with per-visitor request counts.

---

## 9. AI-Assisted Development

This project was developed with AI assistance following the Cloudflare application guidelines.
All AI interactions are fully preserved and traceable:

| Artifact | Contents |
|----------|---------|
| [`PROMPTS.md`](./PROMPTS.md) | Master index of every AI session — goals, key prompts, what worked/failed, commits |
| [`prompt-history/`](./prompt-history/) | Raw session transcripts (S0 through S10), one file per AI session |
| [`PROJECT_STEPS.md`](./PROJECT_STEPS.md) | Slice-by-slice change log linking every change to its file, status, and commit |
| [`docs/plans/`](./docs/plans/) | Per-slice execution plans written before coding (S00.md through S10.md) |

**Tool used:** Google Antigravity (Gemini / Claude models) via the Gemini IDE.

All code in this repository was written by the AI coding assistant under the direction of the
developer (Anirban Sarkar). Every human decision, course correction, and key prompt is logged
in `PROMPTS.md`.
