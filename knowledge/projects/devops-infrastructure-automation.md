---
docId: project-devops-infrastructure-automation
title: "GitOps and Cloud Infrastructure Automation"
sourceType: project
url: "https://github.com/Anirban780"
---

# GitOps and Cloud Infrastructure Automation

## Problem Statement

Manual deployments, divergent environment configurations, and fragile build scripts lead to deployment friction, drift, and downtime.

## Approach & Architecture

Anirban designed and implemented an end-to-end automated deployment and infrastructure automation framework:

1. **Declarative Infrastructure:** Configured declarative configuration manifests and environment specifications managed directly in Git.
2. **CI/CD Pipelines:** Built multi-stage GitHub Actions workflows executing automated linting, typechecking, unit tests, security audits, and automated preview deployments.
3. **Environment Isolation & Secrets Security:** Implemented secret scanning, automated rotation policies, and strict `.gitignore` guardrails preventing credentials from leaking into source control.
4. **Monitoring & Health Verification:** Implemented automated smoke tests and health check verification routes (`/api/health`) verifying critical backend bindings before traffic switchover.

## Tech Stack

- **Tooling:** Git, GitHub Actions, Linux, Bash, Docker, Cloudflare Wrangler CLI
- **Practices:** GitOps, CI/CD, secret management, automated testing gates

## Outcome

- Reduced deployment cycle times from hours to minutes with automated verification.
- Completely eliminated configuration drift between local development and production environments.
