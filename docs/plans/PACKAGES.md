# Package Dependency Manifest — Ask-About-Me

> Tracks all dependencies, their purpose, which slice introduces them, and how to cleanly remove them.

---

## Production Dependencies (from `cloudflare/agents-starter`)

These ship with the starter template and should **not** be upgraded mid-project unless a slice requires it.

| Package | Purpose | Introduced | Remove Path |
|---------|---------|-----------|-------------|
| `agents` | Agents SDK — Durable Object agent framework | Starter (S0) | `npm uninstall agents` |
| `@cloudflare/ai-chat` | `AIChatAgent` base class for chat agents | Starter (S0) | `npm uninstall @cloudflare/ai-chat` |
| `ai` | Vercel AI SDK — `streamText`, `tool`, `convertToModelMessages` | Starter (S0) | `npm uninstall ai` |
| `workers-ai-provider` | Vercel AI SDK provider for Workers AI (`createWorkersAI`) | Starter (S0) | `npm uninstall workers-ai-provider` |
| `zod` | Schema validation (used by AI SDK tools for `inputSchema`) | Starter (S0) | `npm uninstall zod` |
| `react` | UI framework | Starter (S0) | `npm uninstall react` |
| `react-dom` | React DOM rendering | Starter (S0) | `npm uninstall react-dom` |

> **Note:** The starter may include additional packages (markdown renderers, UI components like Kumo, etc.). Keep whatever it ships. Do NOT add React libraries beyond what the starter provides.

---

## Dev Dependencies (from starter)

| Package | Purpose | Introduced | Remove Path |
|---------|---------|-----------|-------------|
| `wrangler` | Cloudflare CLI (dev, deploy, types) | Starter (S0) | `npm uninstall -D wrangler` |
| `typescript` | TypeScript compiler | Starter (S0) | `npm uninstall -D typescript` |
| `vite` | Build tool | Starter (S0) | `npm uninstall -D vite` |
| `@cloudflare/vite-plugin` | Vite plugin for Workers | Starter (S0) | `npm uninstall -D @cloudflare/vite-plugin` |
| `@types/react` | React type definitions | Starter (S0) | `npm uninstall -D @types/react` |
| `@types/react-dom` | React DOM type definitions | Starter (S0) | `npm uninstall -D @types/react-dom` |

---

## Added Dependencies (beyond the starter — allowlisted per SKILLS §R7)

| Package | Purpose | Type | Introduced | Justification | Remove Path |
|---------|---------|------|-----------|---------------|-------------|
| `vitest` | Unit testing framework | dev | S3 | Required for chunker, guards, and citation tests per SPECS §12.1 | `npm uninstall -D vitest` |
| `tsx` | TypeScript runner for scripts | dev | S5 | Required for `scripts/ingest.ts` and `evals/run-retrieval-eval.ts` | `npm uninstall -D tsx` |
| `gray-matter` | YAML frontmatter parser | dev | S5 | Required for parsing knowledge document frontmatter per SPECS §6.1 | `npm uninstall -D gray-matter` |

> **Allowlist rule (SKILLS §R7):** Only the starter's packages plus `vitest`, `tsx`, and `gray-matter` are permitted. Adding anything else requires a written reason in `PROMPTS.md` and human approval.

---

## Complete Cleanup Path

To remove all project dependencies and infrastructure resources:

### 1. Remove Cloudflare Resources

```bash
# Delete the Worker (includes Durable Objects)
npx wrangler delete ask-about-me

# Delete Vectorize index (and its metadata index)
npx wrangler vectorize delete ask-about-me-kb

# Delete D1 database (if P1 F-12 was built)
npx wrangler d1 delete ask-about-me-db

# Delete secrets
npx wrangler secret delete ADMIN_TOKEN
```

### 2. Remove npm Packages

```bash
# Remove added dev dependencies
npm uninstall -D vitest tsx gray-matter

# Or to remove everything:
rm -rf node_modules package-lock.json
```

### 3. Remove Project

```bash
# Remove the entire project directory
rm -rf ask-about-me/
```

---

## Version Pinning Strategy

- **Lock file:** `package-lock.json` is committed and respected
- **No mid-project upgrades** unless a slice explicitly requires it
- **`VERSIONS.md`** records exact versions at S0 start: `npm ls agents @cloudflare/ai-chat ai workers-ai-provider wrangler zod`
- If a version conflict arises, document it in `PROMPTS.md` and get human approval before changing versions

---

## npm Scripts (added to `package.json`)

| Script | Command | Added In |
|--------|---------|----------|
| `typecheck` | `tsc --noEmit` | S0 or S1 |
| `test` | `vitest run` | S3 |
| `ingest` | `tsx scripts/ingest.ts` | S5 |
| `eval` | `tsx evals/run-retrieval-eval.ts` | S8 |
| `dev` | (from starter) | S0 |
| `deploy` | (from starter, usually `wrangler deploy`) | S0 |
