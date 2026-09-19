/** Worker entry point: exports agent and workflow classes, handles WebSocket routing, and provides HTTP API endpoints. */

import { routeAgentRequest } from "agents";
import { PortfolioAgent } from "./agent/portfolio-agent";
import { IngestWorkflow, type IngestParams } from "./workflows/ingest-workflow";
import { embedTexts } from "./rag/embed";

// Export the Durable Object and Workflow classes so the Cloudflare runtime can instantiate them
export { PortfolioAgent, IngestWorkflow };

type EnvWithSecrets = Env & {
  ADMIN_TOKEN?: string;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

/**
 * Constant-time comparison between two strings to mitigate timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validates Bearer token in the Authorization header against env.ADMIN_TOKEN.
 */
function authenticateAdmin(request: Request, adminToken?: string): boolean {
  if (!adminToken) return false;
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  return constantTimeCompare(token, adminToken);
}

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
      return Response.json(
        {
          ok: true,
          agent: "PortfolioAgent",
          model: env.CHAT_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          retrievalMode: env.RETRIEVAL_MODE || "tool",
          owner: env.OWNER_NAME || "Anirban Sarkar",
          vectorize: env.VECTORIZE ? "ready" : "unbound",
          workflow: env.INGEST_WORKFLOW ? "ready" : "unbound",
          ai: env.AI ? "ready" : "unbound",
          timestamp: new Date().toISOString(),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    // 3. Admin Ingest trigger (POST /api/admin/ingest) per SPECS.md §9
    if (url.pathname === "/api/admin/ingest" && request.method === "POST") {
      if (!authenticateAdmin(request, (env as EnvWithSecrets).ADMIN_TOKEN)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: NO_STORE_HEADERS,
        });
      }

      const contentLength = Number(request.headers.get("Content-Length") || "0");
      if (contentLength > 1024 * 1024) {
        return new Response(JSON.stringify({ error: "Payload exceeds 1 MB limit" }), {
          status: 400,
          headers: NO_STORE_HEADERS,
        });
      }

      try {
        const body = (await request.json()) as { docs?: IngestParams[] };
        if (!body.docs || !Array.isArray(body.docs) || body.docs.length === 0) {
          return new Response(JSON.stringify({ error: "Missing or empty 'docs' array" }), {
            status: 400,
            headers: NO_STORE_HEADERS,
          });
        }

        const instances: { docId: string; instanceId: string }[] = [];
        for (const doc of body.docs) {
          const instanceId = `ingest-${doc.docId}-${Date.now()}`;
          await env.INGEST_WORKFLOW.create({
            id: instanceId,
            params: doc,
          });
          instances.push({ docId: doc.docId, instanceId });
        }

        return Response.json({ instances }, { headers: NO_STORE_HEADERS });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : "Invalid JSON" }),
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
    }

    // 4. Admin Workflow status polling (GET /api/admin/ingest/:instanceId)
    if (url.pathname.startsWith("/api/admin/ingest/") && request.method === "GET") {
      if (!authenticateAdmin(request, (env as EnvWithSecrets).ADMIN_TOKEN)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: NO_STORE_HEADERS,
        });
      }

      const instanceId = url.pathname.slice("/api/admin/ingest/".length);
      if (!instanceId) {
        return new Response(JSON.stringify({ error: "Missing instanceId" }), {
          status: 400,
          headers: NO_STORE_HEADERS,
        });
      }

      try {
        const instance = await env.INGEST_WORKFLOW.get(instanceId);
        const status = await instance.status();
        return Response.json(status, { headers: NO_STORE_HEADERS });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : "Instance error" }),
          { status: 404, headers: NO_STORE_HEADERS }
        );
      }
    }

    // 5. Admin Search Debug route (GET /api/admin/search-debug)
    if (url.pathname === "/api/admin/search-debug" && request.method === "GET") {
      if (!authenticateAdmin(request, (env as EnvWithSecrets).ADMIN_TOKEN)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: NO_STORE_HEADERS,
        });
      }

      const query = url.searchParams.get("q");
      const sourceType = url.searchParams.get("sourceType");

      if (!query || query.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Missing query parameter 'q'" }), {
          status: 400,
          headers: NO_STORE_HEADERS,
        });
      }

      try {
        const vectors = await embedTexts(env.AI, [query.trim()]);
        const vector = vectors[0];

        const queryOpts: VectorizeQueryOptions = {
          topK: 10,
          returnMetadata: "all",
        };

        if (sourceType) {
          queryOpts.filter = { sourceType };
        }

        const matches = await env.VECTORIZE.query(vector, queryOpts);
        return Response.json(matches, { headers: NO_STORE_HEADERS });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : "Search failed" }),
          { status: 500, headers: NO_STORE_HEADERS }
        );
      }
    }

    // 6. Fallback for unhandled API routes
    if (url.pathname.startsWith("/api/")) {
      return new Response("Not found", { status: 404 });
    }

    // Unhandled requests fall through to static assets (handled by Cloudflare assets)
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
