---
docId: project-edge-api-gateway
title: "Serverless Edge API Gateway & Rate Limiter"
sourceType: project
url: "https://github.com/Anirban780"
---

# Serverless Edge API Gateway & Rate Limiter

## Problem Statement

Centralized API gateways often introduce geographic latency and single points of failure when protecting origin services from traffic surges, abuse, and denial-of-service attacks.

## Approach & Architecture

Anirban engineered a serverless API gateway running on global edge locations using Cloudflare Workers:

1. **Global Edge Routing:** Incoming API requests are intercepted at the nearest Cloudflare point of presence, eliminating multi-region roundtrips.
2. **Dynamic Sliding-Window Rate Limiting:** Utilized edge storage and local timestamps to enforce per-client hourly and burst rate limits, returning clean HTTP 429 status codes with `Retry-After` headers.
3. **Response Caching & Optimization:** Configured smart edge caching policies (`cf.cacheTtl` and Cache API) for idempotent GET queries, reducing load on backend databases by over 80%.
4. **Security Filters & Header Sanitization:** Enforced strict CORS validation, timing-safe authorization token verification, and payload size restrictions.

## Tech Stack

- **Platforms:** Cloudflare Workers, Cloudflare Cache API, Cloudflare KV
- **Languages:** TypeScript, JavaScript
- **Patterns:** Edge computing, token bucket / sliding window rate limiting, edge caching

## Outcome

- Reduced p95 API response times to under 30ms globally.
- Shielded origin services from high-volume traffic bursts and malicious automated scanning.
