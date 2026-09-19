---
docId: project-ask-about-me
title: "Ask-About-Me: AI Portfolio Concierge on Cloudflare"
sourceType: project
url: "https://github.com/Anirban780/Cloudflare---Ask-About-Me.git"
---

# Ask-About-Me: AI Portfolio Concierge

## Problem Statement

Traditional resume PDFs and static portfolio websites offer static, one-way presentation. Recruiters and engineering hiring managers spend valuable time sifting through documents to find specific technical competencies, project architectures, or matching skillsets.

## Architectural Approach

Ask-About-Me is a public, real-time AI portfolio concierge running 100% natively on Cloudflare with zero external API keys.

1. **Stateful Per-Visitor Agent:** Built using the Cloudflare Agents SDK on Durable Objects (`AIChatAgent`). Each visitor receives their own dedicated stateful agent instance with private SQLite storage, WebSocket streaming, and persistent visitor memory across sessions.
2. **Workers AI Native LLM:** Powered by Meta Llama 3.3 70B (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) through the Vercel AI SDK and `workers-ai-provider`.
3. **Durable Ingestion Pipeline:** Implemented as a Cloudflare Workflow (`IngestWorkflow`) that validates markdown frontmatter, chunks text using a pure heading-aware chunker, generates 768-dimensional embeddings via `@cf/baai/bge-base-en-v1.5`, and atomically upserts vectors to Vectorize.
4. **Grounded Retrieval & Citations:** The model operates under strict grounding rules, issuing citations (`[1]`, `[2]`) referencing source documents, refusing to hallucinate unknown facts, and handling rate limits gracefully.

## Tech Stack

- **Runtimes:** Cloudflare Workers, Durable Objects SQLite, Cloudflare Workflows
- **AI & Vector:** Workers AI (Llama 3.3 70B fp8, bge-base-en-v1.5), Vectorize
- **Frontend:** React 19, Vite, Tailwind CSS, Streamdown, Phosphor Icons
- **Testing & Tooling:** TypeScript, Vitest, Wrangler, tsx, gray-matter

## Outcome & Key Achievements

- Eliminated third-party LLM costs and external API key vulnerabilities.
- Sub-second streaming token latencies on Cloudflare's global edge network.
- Automated retrieval evaluation suite targeting ≥85% Hit@5 and zero hallucination bait failures.
