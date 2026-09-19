# SKILLS.md — Builder Agent Operating Manual

> **Audience:** any coding agent (Claude Code, Antigravity, Cursor, Codex, etc.) and the human driving it.
> **Purpose:** the rules, competencies, recipes and known traps for building Ask-About-Me with minimal repetition and errors.
> **Companions:** `PROJECT_SCOPE.md` (what and why), `SPECS.md` (exact how).

---

## 0. Setup for the agent

Create thin pointer files at the repo root so every agent loads this context automatically.

`CLAUDE.md` (Claude Code) and `AGENTS.md` (most other agents), same content:

```markdown
# Ask-About-Me
Before doing anything, read in this order: docs/PROJECT_SCOPE.md, docs/SPECS.md, docs/SKILLS.md.
Follow the rules in docs/SKILLS.md §1 without exception.
Current slice is tracked in docs/plans/. Reference docs are in docs/reference/.
Commands: npm run dev | npm run typecheck | npm test | npm run eval | npm run deploy
```

Claude Code users can also use import syntax (`@docs/SKILLS.md`). If the agent supports "rules" or "memory" files, put §1 there.

---

## 1. Non-negotiable rules

| # | Rule |
|---|---|
| R1 | **Read first.** Read the three docs fully before writing code. Confirm which slice (`SPECS.md` §15) is current. |
| R2 | **Never guess an API.** Sources of truth in priority order: (1) installed package types in `node_modules` (`.d.ts`), (2) the starter's own code, (3) `docs/reference/`, (4) live Cloudflare docs. If none confirm a name or signature, say so and ask; do not invent. |
| R3 | **Plan, then build.** For each slice write a short plan to `docs/plans/S<nn>.md`: files to touch, approach, risks, verification. If the human is present, wait for approval. Only then edit code. |
| R4 | **One slice at a time.** A slice is runnable, verified and committed before the next starts. No half-finished slices left in the tree. |
| R5 | **Verify before claiming done.** Run the gate in §2. Report the actual command output, not a summary from memory. |
| R6 | **Scope discipline.** Implement only what `SPECS.md` says for the current slice. No P1/P2 work until every P0 acceptance test passes. New ideas go to `docs/BACKLOG.md`, not into code. |
| R7 | **Dependency allowlist.** Only what the starter ships plus `vitest`, `tsx`, `gray-matter`. Anything else needs a written reason in `PROMPTS.md` and human approval. |
| R8 | **Secrets.** Never commit `.dev.vars`, `.env`, tokens or account ids. Never echo secret values in logs, docs or prompts. |
| R9 | **Small diffs.** Do not reformat unrelated files, rename starter files, or upgrade packages unless the slice requires it. |
| R10 | **Two-strikes rule.** If the same fix fails twice, stop. Summarize what was tried, what the error says, and what you suspect. Re-read the relevant reference doc, then ask the human or propose a different approach. Do not loop. |
| R11 | **Honest docs.** README claims must match measured results and real behavior. Document limitations plainly. |
| R12 | **Log prompts.** Maintain `PROMPTS.md` per §7. This is a submission requirement. |

---

## 2. Verification gate

Run after every meaningful change and at the end of every slice:

```bash
npx wrangler types        # after ANY wrangler.jsonc change, then re-run typecheck
npm run typecheck         # tsc --noEmit; must be clean
npm test                  # vitest; must pass
npm run dev               # manual check in the browser for the slice's behavior
```

Additional gates:

- **Infra slices (S0, S4, S5, S10):** `npm run deploy`, then `curl https://<name>.<sub>.workers.dev/api/health` and a manual pass on the live URL.
- **Retrieval slices (S5–S8):** `npm run eval` and record numbers.
- **Before every commit:** `git status` shows no secret files; `git diff --stat` matches the intended change.

A slice is **verified** only when the gate passes *and* the slice's "Done when" in `SPECS.md` §15 is demonstrated.

---

## 3. Skill modules

Each module: what to know, the canonical pattern, pitfalls, and how to verify. Snippets are patterns, not paste-ready code; confirm names per R2.

### S1. Agents SDK and Durable Objects

- **Know:** each agent instance is a Durable Object with its own SQLite storage, WebSocket handling and state sync. Instances are addressed by `(class, name)`; here the name is the visitor id. Agents hibernate when idle; in-memory fields are lost, persisted state and SQL survive.
- **Pattern:** subclass `AIChatAgent<Env, State>` from `@cloudflare/ai-chat`; export the class from the Worker entry; route with `routeAgentRequest(request, env)` before your own routes; declare the binding and a `new_sqlite_classes` migration in `wrangler.jsonc`.
- **Use state correctly:** `this.setState(next)` for small, client-visible state (persisted and synced). `this.sql` for tables, logs and counters that the client should not receive wholesale. Do not keep important data only in class fields.
- **Callable methods:** `@callable()` exposes typed RPC to the client (`agent.call("name")`).
- **Pitfalls:** missing export or missing migration causes deploy errors; renaming the class later needs a migration (avoid renaming); large objects in `setState` are broadcast to every client.
- **Verify:** send messages, hard refresh, confirm history remains; open a second tab with the same visitor id and confirm it syncs.

### S2. Workers AI and the AI SDK

- **Know:** the current pattern is `createWorkersAI({ binding: env.AI })` from `workers-ai-provider`, then `streamText` from `ai`, returning `result.toUIMessageStreamResponse()`. Convert stored messages with `convertToModelMessages`.
- **Model ids:** chat `@cf/meta/llama-3.3-70b-instruct-fp8-fast`; embeddings `@cf/baai/bge-base-en-v1.5` (768 dims). Keep the chat id in the `CHAT_MODEL` var; keep the embedding id in `config.ts`.
- **Do not** copy older snippets that call `env.AI.run(model, { messages, tools })` inside `onChatMessage` or import `AIChatAgent` from `agents/ai-chat-agent`. That style is outdated relative to the starter.
- **Local dev:** Workers AI has no local simulator; the starter uses `"ai": { "remote": true }`, so local runs need `wrangler login` or `CLOUDFLARE_API_TOKEN`.
- **Pitfalls:** context overflow (cap history and retrieved text, `SPECS.md` §5.4); very low output caps truncating answers; Llama occasionally skipping or malforming tool calls (see S3 and `RETRIEVAL_MODE`).
- **Verify:** streaming works; a deliberately long conversation does not error; temperature is 0.2.

### S3. Tool design

- **Three patterns** (from the starter): auto-execute (has `execute`), client-side (no `execute`, resolved in the browser), approval (`needsApproval` plus `execute`).
- **Schema key:** the starter uses `inputSchema` with zod. Do not use the older `parameters` key.
- **Descriptions are prompts.** Write them as imperative guidance to the model, say when to use the tool, and say what to put in each argument. Weak descriptions are the top cause of missed tool calls.
- **Return small, structured results.** Numbered results for citations; short strings; no raw API dumps.
- **Side effects need approval.** Anything that writes outside the visitor's own state (`leaveMessageForOwner`) uses `needsApproval`.
- **Pitfalls:** tools that throw raw errors confuse the model; return `{ error: "friendly message" }` shapes instead; huge tool outputs blow the context budget.
- **Verify:** for each tool, prompt the agent to trigger it, inspect the tool part in debug mode, then prompt something that should *not* trigger it.

### S4. Vectorize and embeddings

- **Index rules:** dimensions and metric are fixed at creation (768, cosine). Wrong dimensions cannot be fixed in place; delete and recreate.
- **Metadata indexes:** create the `sourceType` metadata index **before** inserting vectors. Vectors inserted earlier will not be filterable until re-inserted.
- **Embedding call:** `env.AI.run("@cf/baai/bge-base-en-v1.5", { text: string[] })` returns `{ data: number[][] }`. Batch to `EMBED_BATCH_SIZE`.
- **Query:** `env.VECTORIZE.query(vector, { topK, returnMetadata: "all", filter? })` returns `matches[] { id, score, metadata }`.
- **Eventual consistency:** inserts and deletes are asynchronous; wait a few seconds before testing after ingest.
- **Score handling:** cosine scores are relative to this model and corpus. `MIN_SCORE` is a starting guess; tune from the eval (S8), do not hard-code beliefs.
- **Pitfalls:** `topK` ceilings differ when metadata is returned; metadata size limits; querying with a vector from a different model.
- **Verify:** `/api/admin/search-debug?q=...` returns the expected docs with plausible scores.

### S5. Chunking

- **Goal:** chunks that are self-contained enough to answer a question and small enough to keep context cheap.
- **Approach:** heading-aware sections → paragraph packing → sentence splitting for oversize paragraphs → same-section overlap → header-prefixed embed text (full algorithm in `SPECS.md` §6.3).
- **Keep it pure and tested.** `chunkMarkdown` has no I/O and is covered by the unit tests. Change chunking only with a matching test change and a re-run of the eval.
- **Pitfalls:** splitting mid-list so bullets lose their heading; overlapping across sections (leaks unrelated text); non-deterministic ids that break upserts.
- **Verify:** print chunks for `resume.md` and read them as a human. Would each stand alone?

### S6. Workflows

- **Know:** a workflow is a durable function. Each `step.do(name, opts?, fn)` result is persisted; on retry or replay, completed steps are not re-run. Code outside `step.do` re-runs on replay, so keep it deterministic.
- **Pattern:** `class IngestWorkflow extends WorkflowEntrypoint<Env, Params>` with `run(event, step)`; declare it under `workflows` in `wrangler.jsonc`; start instances from the Worker via `env.INGEST_WORKFLOW.create({ id, params })`; check status with `.get(id)` then `.status()`.
- **Idempotency:** deterministic vector ids plus `upsert`, so retries are safe.
- **Size limits:** step outputs and payloads are size-limited. Never return embeddings from a step; embed and upsert in the same step and return counts.
- **Pitfalls:** non-unique instance ids; putting `Date.now()` or random values outside steps and expecting stable replay; forgetting to export the class from the entry file.
- **Verify:** ingest twice; vector count does not double; kill nothing, but read the instance status output for each step.

### S7. Agent state and SQLite

- **Tables** are created in `onStart` with `CREATE TABLE IF NOT EXISTS`. Use parameterized queries only (the tagged-template API); never string-concatenate user text into SQL.
- **Retention** rules (`SPECS.md` §5.2) run on each accepted message.
- **State shape** is fixed by `VisitorState`; validate anything the model or visitor writes into it (length caps, no newlines in profile fields).
- **Verify:** restart `npm run dev`, confirm state and tables persist locally; confirm the same after a deploy.

### S8. Frontend (React chat)

- **Reuse the starter:** `useAgent`, `useAgentChat`, tool-part rendering, approval UI, theming. Extend, do not rewrite.
- **Visitor id** in `localStorage` (this is a normal web app; browser storage is fine here).
- **Citations:** parse `[n]`, look up the same message's `searchKnowledgeBase` tool output, render chips only for valid numbers.
- **Security:** no raw HTML from the model; safe link attributes.
- **Verify:** desktop and 360 px widths; keyboard-only send; screen-reader announcement of new messages; no layout jump while streaming.

### S9. Security and abuse

- Rate limit and caps per `SPECS.md` §11; friendly failures; no stack traces to users.
- Admin routes: bearer token, constant-time comparison, refuse when the secret is unset.
- Treat retrieved text and visitor profile fields as untrusted data; never place them where they read as instructions without labeling.
- **Verify:** run the bait suite (`SPECS.md` §12.3) and confirm the 31st message in an hour is refused.

### S10. Testing and evaluation

- **Pure logic gets unit tests** (`chunker`, `decideRate`, citation parser).
- **Retrieval gets a golden set** with expected `docId`s and prints hit@1 and hit@5.
- **Generation gets a bait set** with pass/fail criteria written before running it.
- **Tune with evidence:** when changing `MIN_SCORE`, chunk size or `TOP_K`, re-run the eval and record before/after in the decision log.
- **Verify:** `npm run eval` exits 0 at ≥85% hit@5; results written to `evals/results.md`.

### S11. Docs and prompt history

- Keep `README.md` claims tied to `evals/results.md` numbers.
- Update `docs/reference/VERIFIED.md` whenever a verify-list item (`SPECS.md` §16) is resolved.
- Append to `PROMPTS.md` at the end of every session (§7).

---

## 4. Gotcha catalog

| Symptom | Likely cause | Fix |
|---|---|---|
| `npm run dev` hangs or errors on the AI binding | Workers AI has no local simulator; starter uses remote mode | `npx wrangler login` or set `CLOUDFLARE_API_TOKEN`; keep `"ai": { "remote": true }` |
| Deploy fails: class not found / migration error | Durable Object class not exported from the entry file, or missing `migrations` entry | Export from the `main` file; add `new_sqlite_classes` migration; one binding per class |
| `Property 'VECTORIZE' does not exist on type 'Env'` | Types stale | `npx wrangler types`, then re-run typecheck |
| Vectorize upsert error mentioning dimensions | Index dims ≠ embedding dims | Index must be 768 for bge-base; recreate the index if wrong |
| Metadata filter returns nothing | Metadata index created after vectors were inserted | Create index first, then re-ingest |
| Query returns nothing right after ingest | Vectorize writes are asynchronous | Wait several seconds; re-query; check health |
| Workflow step fails with size errors | Returning embeddings or large arrays from a step | Embed+upsert in one step; return counts only |
| Duplicate or stale vectors | Non-deterministic ids or missing stale cleanup | Ids `docId:index`; run `delete-stale` step; upsert |
| Model never calls `searchKnowledgeBase` | Weak tool description, prompt not explicit, model quirk | Improve description and system rule 1; verify `stopWhen`; consider `RETRIEVAL_MODE=always` |
| TS error about `parameters` on a tool | Older API style | Use `inputSchema` with zod as in the starter |
| GitHub tool returns 403 | Missing `User-Agent` header or unauthenticated rate limit | Send `User-Agent`; keep `cf.cacheTtl` caching; fail gracefully |
| Works locally, breaks on the live URL | Production missing index, secret or binding | Create resources in the account; `wrangler secret put`; check `wrangler tail` |
| Old conversation biases new prompt tests | Persistent visitor history | New visitor id (clear `localStorage`) or use Forget me |
| Answers get worse in long chats | History plus context overflow | Enforce `MAX_HISTORY_MESSAGES`, `MAX_CONTEXT_CHARS` |
| Model output shows odd HTML or scripts | Rendering raw model HTML | Markdown renderer without raw HTML |
| `.dev.vars` shows up in `git status` | Not ignored | Add to `.gitignore` before the first commit; if committed, rotate the secret and purge history |

---

## 5. Prompt library (for the human to paste into the agent)

**Kickoff (start of every session)**
```
Read docs/PROJECT_SCOPE.md, docs/SPECS.md and docs/SKILLS.md in full, then docs/plans/ and docs/reference/.
Confirm back: (1) the rules in SKILLS §1 you will follow, (2) the current slice, (3) anything in the
verify list (SPECS §16) that this slice touches. Do not write code yet.
```

**Plan**
```
We are on slice S<nn>. Write docs/plans/S<nn>.md: files to change, approach, risks, verification steps,
and any API you need to confirm. Check the installed types or docs/reference for every API you plan to use.
Do not edit source files until I approve.
```

**Implement**
```
Implement docs/plans/S<nn>.md exactly. Stay within SPECS §<x>. After each logical change run typecheck.
At the end run the full gate in SKILLS §2, show me the output, then propose a commit message.
```

**Debug**
```
Here is the error and the file it points to: <trimmed error + file>. State your hypothesis first, name
the doc or type that supports it, then make the smallest fix. If this is the second failed attempt, stop
and follow rule R10.
```

**Review (adversarial, before commit)**
```
Review the current diff against SPECS §<x>, the acceptance criteria for <F-xx>, and the checklist in
SKILLS §8. List violations and risks. Do not fix anything yet.
```

**Docs**
```
Update README sections <list> using only facts that exist in the repo and numbers from evals/results.md.
Flag any claim you cannot back with evidence.
```

**Session close**
```
Append a PROMPTS.md entry for this session using the template in SKILLS §7.
```

---

## 6. Reference documents to download into `docs/reference/` (slice S1)

Save each as markdown or text so the agent can read them offline. Record the date fetched.

- Agents SDK overview: https://developers.cloudflare.com/agents/
- Build a chat agent: https://developers.cloudflare.com/agents/getting-started/build-a-chat-agent/
- Chat agents API reference: https://developers.cloudflare.com/agents/api-reference/chat-agents/
- Store and sync state: https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/
- Callable methods: https://developers.cloudflare.com/agents/api-reference/callable-methods/
- Workers AI models catalog: https://developers.cloudflare.com/workers-ai/models/
- Vectorize: https://developers.cloudflare.com/vectorize/
- Workflows: https://developers.cloudflare.com/workflows/
- D1: https://developers.cloudflare.com/d1/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
- Starter README and source: https://github.com/cloudflare/agents-starter
- Vercel AI SDK docs (tools, `streamText`): https://ai-sdk.dev/docs

Also create `docs/reference/VERSIONS.md` (output of `npm ls agents @cloudflare/ai-chat ai workers-ai-provider wrangler zod`) and `docs/reference/VERIFIED.md` (answers to `SPECS.md` §16).

---

## 7. Prompt-history protocol (submission requirement)

The application form requires prompt history. Do this from the first session and never reconstruct it later.

**Files**

- `PROMPTS.md`: index with one entry per session.
- `prompt-history/`: raw exports or copy-pasted transcripts, one file per session, named `YYYY-MM-DD-S<nn>-<tool>.md`.

**Do not** rewrite transcripts to look cleaner. Mistakes, dead ends and corrections are evidence of real work. Redact only secrets and personal contact data.

**`PROMPTS.md` template**

```markdown
# Prompt History

## 2026-MM-DD — Session 3 — Slice S5 (ingestion workflow) — Tool: <agent/IDE>
- **Goal:**
- **Key prompts:** (link to prompt-history/2026-MM-DD-S05-<tool>.md)
- **What worked:**
- **What failed / was corrected:**
- **Human decisions made:**
- **Commits:** <hashes>
- **Open questions:**
```

Also log the tools used (agent/IDE names and models) once at the top of `PROMPTS.md`.

---

## 8. Self-review checklists

**Before every commit**

- [ ] Gate in §2 passed; output actually observed
- [ ] Diff contains only what the slice calls for; no stray formatting churn
- [ ] No secrets, tokens or account ids in the diff
- [ ] No leftover demo code, `console.log` of visitor content, or commented-out blocks
- [ ] New pure logic has tests; new behavior has an acceptance check from `SPECS.md` §13
- [ ] `PROMPTS.md` has an entry if this closes a session

**Before submitting the project**

- [ ] Every item in `PROJECT_SCOPE.md` §11 (Definition of Done)
- [ ] Bait suite re-run against the deployed URL; results recorded
- [ ] README numbers match `evals/results.md`
- [ ] Fresh clone: `npm install` → `npm run dev` works following only the README
- [ ] Repo public; live URL and prompt-history links work

---

## 9. Ask the human when

Stop and ask (do not decide alone) if:

- an API or behavior cannot be confirmed by types, starter code or reference docs (R2)
- a change would alter the data model, add a dependency, or expand scope
- the same fix has failed twice (R10)
- a command would touch production resources (deleting an index, rotating a secret, deploying) and the slice does not explicitly call for it
- knowledge documents seem to contain private data (phone, address, IDs) that should not be public
- eval results fall below the success criteria and the fix requires a design change
