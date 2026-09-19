# Installed Package Versions (Slice S0 Baseline)

> Generated: 2026-09-19
> Output of: `npm ls agents @cloudflare/ai-chat ai workers-ai-provider wrangler zod`

```
agent-starter@1.0.0 /home/anirban/Documents/Projects/ask-about-me
+-- @cloudflare/ai-chat@0.9.3
| +-- @ai-sdk/react@3.0.235
| | `-- ai@6.0.233 deduped
| +-- agents@0.17.4 deduped
| +-- ai@6.0.233 deduped
| `-- zod@4.4.3 deduped
+-- @cloudflare/kumo@2.8.0
| `-- zod@4.4.3 deduped
+-- @cloudflare/vite-plugin@1.46.0
| `-- wrangler@4.113.0 deduped
+-- agents@0.17.4
| +-- @cloudflare/codemode@0.4.3
| | +-- ai@6.0.233 deduped
| | `-- zod@4.4.3 deduped
| +-- @modelcontextprotocol/sdk@1.29.0
| | +-- zod-to-json-schema@3.25.2
| | | `-- zod@4.4.3 deduped
| | `-- zod@4.4.3 deduped
| +-- ai@6.0.233 deduped
| `-- zod@4.4.3 deduped
+-- ai@6.0.233
| +-- @ai-sdk/gateway@3.0.155
| | `-- zod@4.4.3 deduped
| +-- @ai-sdk/provider-utils@4.0.40
| | `-- zod@4.4.3 deduped
| `-- zod@4.4.3 deduped
+-- workers-ai-provider@3.3.1
| `-- ai@6.0.233 deduped
+-- wrangler@4.113.0
`-- zod@4.4.3
```

## Summary of Core Dependencies

| Package | Installed Version | Role |
|---|---|---|
| `agents` | `0.17.4` | Agents SDK (Durable Object runtime, state sync, scheduling) |
| `@cloudflare/ai-chat` | `0.9.3` | `AIChatAgent` base class |
| `ai` | `6.0.233` | Vercel AI SDK (`streamText`, `tool`, `convertToModelMessages`, `pruneMessages`, `stepCountIs`) |
| `workers-ai-provider` | `3.3.1` | Cloudflare Workers AI provider adapter for AI SDK |
| `wrangler` | `4.113.0` | Cloudflare CLI & type generation |
| `zod` | `4.4.3` | Schema validation |
| `react` | `19.2.7` | UI library |
| `vite` | `8.1.0` | Build and dev server |
