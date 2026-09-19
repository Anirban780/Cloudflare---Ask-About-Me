---
docId: project-ask-about-me
title: "Cloudflare Ask-About-Me — AI Portfolio Agent"
sourceType: project
url: "https://github.com/Anirban780/Cloudflare---Ask-About-Me"
---

# Cloudflare Ask-About-Me — AI Portfolio Agent

**GitHub:** https://github.com/Anirban780/Cloudflare---Ask-About-Me  
**Stack:** TypeScript, Cloudflare Workers, Durable Objects, Vectorize, Workers AI (Llama 3.3 70B), Hono, Vitest  

---

## Project Overview

An autonomous AI portfolio concierge built on the **Cloudflare Serverless AI stack**. Visitors can ask natural language questions about Anirban Sarkar — his experience, skills, projects, and background — and receive accurate, RAG-grounded answers from an AI agent powered by Meta Llama 3.3 70B.

This is the project you are currently talking to.

---

## Architecture

### Edge-Native AI Agent
- **Cloudflare Workers + Durable Objects:** The `PortfolioAgent` Durable Object (extending `AIChatAgent`) manages per-visitor state, rate limiting, and chat history in SQLite at the edge — globally distributed with zero cold starts.
- **Hono Router:** Handles HTTP routing in the Worker, bridging REST and WebSocket connections to the Durable Object.

### Retrieval-Augmented Generation (RAG)
- Knowledge base files (this project's markdown files) are chunked, embedded via `@cf/baai/bge-base-en-v1.5`, and stored in **Cloudflare Vectorize** (cosine similarity).
- At query time, the `searchKnowledgeBase` tool embeds the visitor's question and retrieves the top-k relevant chunks to ground the AI response.
- Ingestion uses **Cloudflare Workflows** for durable multi-step pipeline execution with automatic retries.

### Streaming Tool Calling Fix (S11)
- Identified and fixed a critical SSE deduplication bug in `workers-ai-provider` v3.3.1 where both `chunk.tool_calls` (native format) and `choices[0].delta.tool_calls` (OpenAI format) were processed from each SSE event, duplicating every token.
- Implemented `createSafeAIBinding()` — a Proxy wrapper that strips the duplicate field before it reaches `workers-ai-provider`.

### Visitor Memory & Contact System
- Per-visitor memory stored in Durable Object SQLite (`visitor_context` JSON column).
- Visitors can leave messages for Anirban via the `leaveMessageForOwner` tool, stored in `owner_inbox` table.
- Rate limiting (sliding window) protects against abuse.

### Live GitHub Integration
- `getGitHubProjects` tool fetches Anirban's live public repositories from the GitHub API in real time.

---

## Key Technical Decisions
- **Workers AI over OpenAI:** Keeps all compute on Cloudflare — lower latency, no egress costs.
- **Vectorize metadata-only storage:** Full chunk text stored in vector metadata (no separate D1 DB needed for RAG).
- **`createSafeAIBinding` proxy:** Minimal targeted fix for SSE duplication without forking the upstream provider.

---

## Testing & Quality
- **51 unit tests** across 7 test suites (Vitest), all passing.
- **oxlint** and **TypeScript strict** checks pass with 0 errors/warnings.
- Clean Vite build for frontend assets.
