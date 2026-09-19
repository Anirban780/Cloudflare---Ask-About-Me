/** Worker entry point: exports agent and workflow classes, handles WebSocket routing, and provides HTTP API endpoints. */

import { routeAgentRequest } from "agents";
import { PortfolioAgent } from "./agent/portfolio-agent";
import { IngestWorkflow } from "./workflows/ingest-workflow";

// Export the Durable Object and Workflow classes so the Cloudflare runtime can instantiate them
export { PortfolioAgent, IngestWorkflow };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Route Agent WebSocket and HTTP requests (/agents/*)
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) {
      return agentResponse;
    }

    // 2. Health check route (/api/health) per SPECS.md §9
    if (url.pathname === "/api/health" && request.method === "GET") {
      return Response.json({
        ok: true,
        agent: "PortfolioAgent",
        model: env.CHAT_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
        retrievalMode: env.RETRIEVAL_MODE || "tool",
        owner: env.OWNER_NAME || "Anirban Sarkar",
        vectorize: env.VECTORIZE ? "ready" : "unbound",
        workflow: env.INGEST_WORKFLOW ? "ready" : "unbound",
        ai: env.AI ? "ready" : "unbound",
        timestamp: new Date().toISOString()
      }, {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json"
        }
      });
    }

    // 3. Fallback for unhandled API routes
    if (url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    // Unhandled requests fall through to static assets (handled by Cloudflare assets)
    return new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
