# Project Inputs — Ask-About-Me

> **Notice:** Values provided by the project owner. Builder agents must use these exact values and not invent replacements.
> **Date:** 2026-09-19

---

## 1. Owner Placeholders

| Placeholder | Meaning | Value |
|---|---|---|
| `{{OWNER_NAME}}` | Full name | **Anirban Sarkar** |
| `{{OWNER_FIRST}}` | First name, used in agent's third-person replies | **Anirban** |
| `{{AGENT_NAME}}` | Display name of the agent | **Ask-About-Me** |
| `{{GITHUB_USER}}` | GitHub handle (for live-repo tool F-11) | **Anirban780** |
| `{{TARGET_ROLES}}` | Target roles | **Software Engineer, Data Engineer, Cloud Engineer, DevOps Engineer** |
| `{{REPO_URL}}` | Public repo URL | **https://github.com/Anirban780/Cloudflare---Ask-About-Me.git** |

---

## 2. Knowledge Documents Status

| Document | Target Location | Status / Source |
|---|---|---|
| `about.md` | `knowledge/about.md` | Owner to provide (from GitHub/LinkedIn profiles) |
| `resume.md` | `knowledge/resume.md` | Owner to provide |
| `projects/*.md` | `knowledge/projects/*.md` | Owner to provide / fetch from GitHub (`Anirban780`) |

---

## 3. Cloudflare Account Status

- Cloudflare Workers and Pages account: **Created and ready**
- Local dev authentication: will use `npx wrangler login` or `CLOUDFLARE_API_TOKEN`
