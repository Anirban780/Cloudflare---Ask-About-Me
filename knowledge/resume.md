---
docId: resume
title: "Resume of Anirban Sarkar"
sourceType: resume
url: "https://github.com/Anirban780"
---

# Anirban Sarkar — Curriculum Vitae

**Target Roles:** Software Engineer | Data Engineer | Cloud Engineer | DevOps Engineer  
**GitHub:** https://github.com/Anirban780  
**Location:** India  

## Executive Summary

Versatile engineer with strong capabilities across the modern software engineering spectrum — encompassing distributed application development, data engineering pipelines, cloud infrastructure orchestration, and automated CI/CD workflows. Experienced with TypeScript, JavaScript, Python, SQL, Linux systems, Cloudflare Developer Platform, containerization, and cloud infrastructure management.

## Technical Skills & Tooling

### Programming Languages & Runtimes
- **Primary:** TypeScript, JavaScript (Node.js 20/22, modern ES modules), Python, SQL (PostgreSQL, SQLite), Bash / Shell scripting.
- **Runtimes & Frameworks:** Node.js, Cloudflare Workers Runtime (`workerd`), React 19, Vite, Tailwind CSS.

### Cloud Platforms & Edge Infrastructure
- **Cloudflare Platform:** Cloudflare Workers, Durable Objects, Workers AI, Vectorize, Cloudflare Workflows, D1 (serverless SQL), KV, Pages.
- **Containerization & Compute:** Docker container creation, multi-stage Docker builds, container orchestration fundamentals, Linux system administration.
- **Cloud Concepts:** Edge computing, serverless compute, event-driven architectures, WebSocket streaming, low-latency API design.

### Data Engineering & Retrieval Systems
- **Databases & Stores:** PostgreSQL, SQLite (embedded & edge), Cloudflare D1, Cloudflare Vectorize (vector search index).
- **Pipelines & ETL:** Batch and streaming ingestion pipelines, schema migration, idempotency design, data deduplication, YAML/JSON data validation with Zod.
- **AI & RAG:** Retrieval-Augmented Generation (RAG), vector similarity search (cosine metric, 768 dimensions), bge-base-en-v1.5 embedding models, Meta Llama 3.3 70B, Vercel AI SDK integration, hit@k evaluation metrics, hallucination prevention.

### DevOps, CI/CD & Reliability
- **Version Control & Automation:** Git, GitHub, GitHub Actions CI/CD workflows, automated testing gates (Vitest, Jest).
- **Security & Hygiene:** Secret scanning, zero hardcoded credentials, `.dev.vars` / `.env` isolation, constant-time authentication comparison, rate limiting.
- **Observability & QA:** Health check endpoints (`/api/health`), structured logging, automated smoke tests, TypeScript strict type safety.

## Professional Experience & Role Highlights

### Software Engineering Focus
- Engineered full-stack applications with clean separation of concerns, strict type safety, and modular component architectures.
- Developed real-time streaming WebSocket clients and servers using Cloudflare Agents SDK and React hooks (`useAgent`, `useAgentChat`).
- Designed resilient stateful backends utilizing Durable Objects SQLite with automatic reconnection and chat session recovery.

### Data Engineering Focus
- Designed durable multi-step ingestion pipelines using Cloudflare Workflows with automatic retries, exponential backoff, and step idempotency.
- Built custom heading-aware text chunking algorithms with paragraph packing, sentence splitting without cutting words, and intra-section overlap.
- Configured Vectorize vector indexes with metadata indexing for fast filtered similarity queries.

### Cloud & Edge Infrastructure Focus
- Architected zero-cold-start edge applications distributed globally across hundreds of edge locations.
- Configured declarative Worker bindings (`wrangler.jsonc`) linking AI, Vectorize, Durable Objects, and Workflows seamlessly.
- Enforced strict edge security including sliding-window rate limiting, input length caps, and payload size guardrails.

### DevOps & Automation Focus
- Designed automated GitHub Actions CI/CD workflows executing automated linting, formatting, typechecking, and unit tests on every pull request.
- Implemented automated evaluation harnesses to measure information retrieval accuracy and verify resistance to prompt injection.
- Standardized local development environments ensuring parity between local development and edge production deployments.

## Education & Certifications

- **Degree:** Bachelor of Technology / Science in Engineering / Computer Science.
- **Focus Areas:** Distributed systems, database management systems, data structures and algorithms, operating systems, and computer networks.
- **Continuous Learning:** Active hands-on development with modern AI agent architectures, edge platforms, and cloud infrastructure best practices.
