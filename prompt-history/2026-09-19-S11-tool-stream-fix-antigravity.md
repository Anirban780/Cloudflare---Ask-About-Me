# Session Transcript: Slice S11 — Streaming Tool Call Argument Deduplication Fix

**Date:** 2026-09-19  
**Slice:** S11 — Streaming Tool Call Argument Deduplication Fix & Remote Readiness  
**Tool / Agent:** Google Antigravity (Gemini 3.8 Flash)  
**Human Request:**
> "Summarize Anirban's engineering background in 30 seconds"
> Output error reported:
> `rawInput: "{\"query\": \"{\"query\": \"AnAnirirbanban engineering engineering background background summary\" summary\", \"sourceType\": \", \"sourceType\": \"about\"}about\"}"`
> "(check what;'s wrong)"
> Follow-up: "ok i think everything is okay and is ready for demo, please push it on github after addressing this changes in appropraite md files and also committing them, and also telling about the use cases and all about this"

---

## 1. Root Cause Analysis

During user testing with the prompt *"Summarize Anirban's engineering background in 30 seconds"*, the assistant reported `state: "output-error"` with malformed doubled argument strings in `rawInput`:
- String: `"{\"query\": \"{\"query\": \"AnAnirirbanban engineering engineering background background summary\" summary\", \"sourceType\": \", \"sourceType\": \"about\"}about\"}"`
- Root Cause: Cloudflare Workers AI's streaming response sends SSE events containing both native top-level fields (`chunk.tool_calls`) and OpenAI format fields (`chunk.choices[0].delta.tool_calls`) in the same SSE payload.
- `workers-ai-provider` (v3.3.1) in `getMappedStream` processed both fields unconditionally per SSE event, causing `emitToolCallDeltas` to run twice and concatenate every argument token twice (`active.args += delta`).
- On stream completion, the AI SDK attempted `JSON.parse(input)` to validate against Zod schemas, which threw `SyntaxError`. The agent retried until hitting the `MAX_TOOL_STEPS` step count limit.

---

## 2. Implementation Summary

1. **Created `src/agent/ai-binding.ts` (`createSafeAIBinding`)**:
   - Intercepts `env.AI.run(...)` returning SSE `ReadableStream`.
   - Strips redundant top-level `tool_calls` and `response` fields when `choices[0].delta` is present.
   - Preserves native-only and OpenAI-only formats transparently.
   - Immune to `npm install` overwrites (unlike direct node_modules patching).

2. **Integrated into `PortfolioAgent`**:
   - In `src/agent/portfolio-agent.ts`, wrapped `this.env.AI` with `createSafeAIBinding`.

3. **Fixed Lint in `src/agent/github.ts`**:
   - Renamed unused error variable `catch (err)` to `catch (_err)`.

4. **Created Regression Test (`test/ai-binding.test.ts`)**:
   - Simulated exact hybrid SSE payload from Cloudflare Workers AI.
   - Asserted that `toolCallInput` decodes to clean JSON without token doubling.

5. **Updated Documentation & Decision Log**:
   - Added D13 to `docs/SPECS.md §17` and `README.md §4`.
   - Updated `PROJECT_STEPS.md` and `PROMPTS.md`.

---

## 3. Verification Results

- `npm test`: 7/7 test suites passed (51/51 tests green).
- `npx oxlint src/`: 0 warnings, 0 errors.
- `npx tsc --noEmit`: 0 errors.
- `npx vite build`: Clean client and worker bundle generated.
