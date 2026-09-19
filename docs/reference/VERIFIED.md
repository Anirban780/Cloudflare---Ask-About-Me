# Verified Before Use — Technical Answers (SPECS.md §16)

> Record of verified signatures, APIs, and platform behaviors inspected directly from the installed package code and types.
> Updated as each item in SPECS.md §16 is verified.

---

| ID | Topic | Question | Verified Finding / Answer | Source |
|---|---|---|---|---|
| **V1** | Agent API | Exact `AIChatAgent` import path, `onChatMessage` signature, `onFinish`/`options` | `import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat"`; signature: `async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions)`; returns `result.toUIMessageStreamResponse()`. | Starter `src/server.ts` |
| **V2** | SQLite / State | `this.sql` tagged template API, `onStart` lifecycle, `initialState`/`setState` | `onStart()` is an async/sync method on `AIChatAgent`. `this.sql` is provided by the Durable Object SQLite binding. `setState` updates client-synced state. | `@cloudflare/ai-chat` / `agents` |
| **V3** | Vectorize | Local dev support, `remote: true`, metadata limits, max `topK` | Index dims fixed at 768 (`bge-base-en-v1.5`). Use `"remote": true` or remote execution for local dev. Vector metadata stores chunk text. | Cloudflare Vectorize docs |
| **V4** | Workflows | Step limits, retry options, instance ID rules | `step.do(name, { retries: { limit, delay, backoff }, timeout }, fn)`. Unique instance IDs required: `ingest-${docId}-${Date.now()}`. Embed and upsert in one step to avoid payload size limit. | `cloudflare:workers` WorkflowEntrypoint |
| **V5** | Tool Calling | Multi-step API, Llama 3.3 via `workers-ai-provider`, context window | `stopWhen: stepCountIs(MAX_TOOL_STEPS)` from `ai` package. `createWorkersAI({ binding: env.AI })` from `workers-ai-provider`. | Starter `src/server.ts` |
| **V6** | Clear History | How to clear persisted chat messages | Frontend: `clearHistory()` provided by `useAgentChat` hook. Backend: agent callable method `@callable() forgetVisitor()`. | Starter `src/app.tsx` |
| **V7** | Guard Message | Plain text vs stream response for guards | Guard can return a friendly stream or text response without invoking LLM. | SPECS.md §8.1 / §11 |
| **V8** | Tool Approvals | `needsApproval` behavior and UI pattern | Supported via `needsApproval` predicate in tool definition. Handled in UI via `addToolApprovalResponse` from `useAgentChat`. | Starter `src/server.ts` & `src/app.tsx` |
| **V9** | Quota / Limits | Workers AI limits, bindings | Metered usage on Workers AI. Rate limiting (30 msg/hr) and character caps (1,000 chars) enforced at agent level. | SPECS.md §5.4 |
