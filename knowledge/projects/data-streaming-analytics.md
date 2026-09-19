---
docId: project-data-streaming-analytics
title: "Real-Time Event Ingestion and Streaming Analytics"
sourceType: project
url: "https://github.com/Anirban780"
---

# Real-Time Event Ingestion and Streaming Analytics

## Executive Overview

Anirban designed an event ingestion and analytics architecture capable of streaming, processing, and aggregating time-series metrics from distributed edge clients with sub-second analytical reporting.

## Technical Architecture

The architecture was structured into four distinct, decoupled stages:

1. **Edge Collection Layer:** Lightweight telemetry collectors running at network ingress capture incoming event payloads, validate schemas using strict Zod types, and attach epoch timestamps.
2. **Buffering & Stream Distribution:** Events are published into partitioned topic streams, allowing multiple consumer worker groups to process events concurrently without contention.
3. **Continuous Metric Aggregation:** Stream consumers perform windowed aggregations (1-minute, 5-minute, and 1-hour tumbling windows) computing rate limits, traffic percentiles, and error ratios.
4. **Columnar Datastore & Query Engine:** Compacted analytical aggregations are loaded into columnar tables, enabling instant dashboard visualization and historical trend analysis.

## Key Engineering Highlights

- **Idempotent Ingestion:** Implemented deterministic event hash keys to prevent duplicate counting during consumer restarts or network retries.
- **Backpressure Handling:** Designed adaptive batching where consumers dynamically resize processing batches based on queue lag and worker memory pressure.
- **Zero-Downtime Schema Evolution:** Established forward-compatible data serialization schemas allowing new metric dimensions to be introduced without breaking downstream consumers.

## Tech Stack

- **Technologies:** Python, TypeScript, PostgreSQL, SQLite, Linux, Docker
- **Concepts:** Stream processing, tumbling windows, backpressure mitigation, high-throughput batching
