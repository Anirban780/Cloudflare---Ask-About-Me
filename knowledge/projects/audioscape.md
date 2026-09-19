---
docId: project-audioscape
title: "AudioScape — Music Streaming Platform"
sourceType: project
url: "https://github.com/Anirban780/AudioScape"
---

# AudioScape — Music Streaming Platform

**GitHub:** https://github.com/Anirban780/AudioScape  
**Period:** Jun 2026 – Aug 2026  
**Stack:** React 19, NestJS, Prisma, PostgreSQL, TypeScript, SWR, Zustand, @dnd-kit, Google OAuth 2.0  

---

## Project Overview

AudioScape is a full-featured music streaming platform where users can search for songs from YouTube and listen to them. Anirban architected both the backend and frontend, delivering a production-quality experience with intelligent caching, a recommendation engine, and a polished drag-and-drop audio player.

---

## Key Technical Achievements

### 3-Tier Search Caching Pipeline
Anirban designed a **3-tier caching strategy** that dramatically reduced costs and improved latency:
1. **In-memory cache** — Instant response for recently searched terms.
2. **Database cache** — Persistent cached results in PostgreSQL via Prisma.
3. **pg_trgm full-text search** — PostgreSQL trigram-based fuzzy search as the final fallback.

This pipeline cut YouTube API quota consumption by **90%+** and reduced cached search latency from **~850ms to under 15ms**.

### Zero-Cost Recommendation Engine
Built a **database-first recommendation engine** using TF-IDF vector modeling and recency-weighted user taste profiles. This approach generates personalized daily mixes entirely from existing user interaction data — with **no external API calls or third-party recommendation services**.

### High-Performance Frontend
- **React 19 + Vite** frontend with SWR data fetching for instant page renders.
- **Custom audio player** built with Zustand for state management and @dnd-kit for drag-and-drop playlist reordering.
- **Secure Google OAuth 2.0** authentication with HttpOnly cookie-based token rotation.

---

## Technologies & Patterns
- **Backend:** NestJS, Prisma ORM, PostgreSQL, REST API design
- **Frontend:** React 19, Vite, SWR, Zustand, @dnd-kit, Tailwind CSS
- **Search:** pg_trgm full-text search, multi-tier caching
- **Auth:** Google OAuth 2.0, HttpOnly tokens, secure cookie rotation
- **Database:** PostgreSQL with Prisma schema management
