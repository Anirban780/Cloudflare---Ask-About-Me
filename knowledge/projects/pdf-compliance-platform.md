---
docId: project-pdf-compliance
title: "PDF Compliance Intelligence Platform"
sourceType: project
url: "https://github.com/Anirban780/PDF-Compliance-Intelligence-Platform"
---

# PDF Compliance Intelligence Platform

**GitHub:** https://github.com/Anirban780/PDF-Compliance-Intelligence-Platform  
**Period:** May 2026 – Jun 2026  
**Stack:** Python, LangGraph, AWS (SQS FIFO, Fargate, Bedrock, S3), Docker, pgvector, Amazon Titan Embeddings, Langfuse, CloudWatch  

---

## Project Overview

An enterprise document governance system that automates compliance review across large volumes of PDF documents. The system orchestrates multiple parallel AI agents across compliance domains, incorporating a human-in-the-loop review workflow for flagged decisions, and full distributed observability.

---

## Architecture & Key Design Decisions

### Multi-Agent LangGraph Orchestration
- Orchestrated **5 parallel AI agents** across distinct compliance domains using **LangGraph** multi-agent workflows.
- Each agent is responsible for a different compliance policy (e.g., data privacy, regulatory adherence, formatting standards).
- LangGraph provides deterministic state management across agent steps, enabling reliable retry and rollback.

### Human-in-the-Loop Review via AWS SQS FIFO
- Implemented a **human-in-the-loop (HITL) review workflow** using **AWS SQS FIFO queues** for fault-tolerant, ordered message processing.
- **AWS Fargate** containers process messages from the queue, flagging documents for human review when AI confidence is below threshold.
- FIFO ordering ensures decisions on multi-page documents are processed sequentially without race conditions.

### RAG Pipeline with PII Pre-Hashing
- Built a **RAG pipeline** using **pgvector** (PostgreSQL vector extension) and **Amazon Titan Embeddings** for semantic document retrieval.
- Applied **PII pre-hashing** before embedding — sensitive identifiers are hashed before entering the vector store, ensuring compliance data is never stored in plaintext.

### Distributed Observability
- Instrumented **distributed tracing** across all agent spans via **Langfuse**, providing per-agent latency, token usage, and decision audit logs.
- Integrated **AWS CloudWatch** for infrastructure-level monitoring (Fargate task health, SQS queue depth, error rates).

---

## Technologies & Patterns
- **AI Orchestration:** LangGraph, multi-agent workflows, HITL review
- **Cloud:** AWS Fargate, SQS FIFO, Amazon Bedrock, Amazon Titan Embeddings, S3
- **Vector Search:** pgvector (PostgreSQL), RAG pipeline
- **PII Handling:** Pre-hashing before embedding, zero plaintext sensitive data in vector store
- **Observability:** Langfuse distributed tracing, AWS CloudWatch
- **Infrastructure:** Docker, Python, FastAPI
