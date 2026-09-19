/**
 * Unit tests for GitHub integration service (SPECS.md §8.3, §13 F-11).
 * Verifies repository fetching, fork filtering, topic matching, and rate-limit fallbacks.
 */

import { describe, it, expect, vi } from "vitest";
import { fetchGitHubRepos, type GitHubFetchResult } from "../src/agent/github";

describe("GitHub Projects Integration (F-11)", () => {
  const sampleRepos = [
    {
      name: "Cloudflare---Ask-About-Me",
      description: "AI-native portfolio concierge on Cloudflare Workers and Agents SDK",
      language: "TypeScript",
      fork: false,
      stargazers_count: 5,
      html_url: "https://github.com/Anirban780/Cloudflare---Ask-About-Me",
      pushed_at: "2026-09-19T10:00:00Z",
      topics: ["cloudflare", "agents", "rag", "vectorize"],
    },
    {
      name: "forked-demo-repo",
      description: "A fork from someone else",
      language: "JavaScript",
      fork: true,
      stargazers_count: 100,
      html_url: "https://github.com/Anirban780/forked-demo-repo",
      pushed_at: "2026-09-18T10:00:00Z",
      topics: ["demo"],
    },
    {
      name: "data-pipeline-etl",
      description: "Distributed telemetry data pipeline built with Python and Kafka",
      language: "Python",
      fork: false,
      stargazers_count: 12,
      html_url: "https://github.com/Anirban780/data-pipeline-etl",
      pushed_at: "2026-09-15T10:00:00Z",
      topics: ["data-engineering", "python", "kafka"],
    },
    {
      name: "k8s-gitops-infra",
      description: "Infrastructure as Code and GitOps deployments on Kubernetes",
      language: "HCL",
      fork: false,
      stargazers_count: 8,
      html_url: "https://github.com/Anirban780/k8s-gitops-infra",
      pushed_at: "2026-09-10T10:00:00Z",
      topics: ["devops", "kubernetes", "terraform"],
    },
  ];

  it("fetches non-fork repositories and formats output fields correctly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleRepos,
    } as unknown as Response);

    const result = await fetchGitHubRepos("Anirban780", { fetchFn: mockFetch });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.repos).toHaveLength(3); // 4 minus 1 fork
    expect(result.repos.some((r) => r.name === "forked-demo-repo")).toBe(false);
    expect(result.repos[0]).toEqual({
      name: "Cloudflare---Ask-About-Me",
      description: "AI-native portfolio concierge on Cloudflare Workers and Agents SDK",
      language: "TypeScript",
      stars: 5,
      url: "https://github.com/Anirban780/Cloudflare---Ask-About-Me",
      pushedAt: "2026-09-19T10:00:00Z",
    });
  });

  it("filters repositories by topic or technology keyword", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleRepos,
    } as unknown as Response);

    const result = await fetchGitHubRepos("Anirban780", {
      topic: "python",
      fetchFn: mockFetch,
    });

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].name).toBe("data-pipeline-etl");
  });

  it("filters repositories matching topic in repository name or description", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleRepos,
    } as unknown as Response);

    const result = await fetchGitHubRepos("Anirban780", {
      topic: "Cloudflare",
      fetchFn: mockFetch,
    });

    expect(result.repos).toHaveLength(1);
    expect(result.repos[0].name).toBe("Cloudflare---Ask-About-Me");
  });

  it("caps maximum returned repositories to 8 items", async () => {
    const manyRepos = Array.from({ length: 15 }, (_, i) => ({
      name: `project-${i + 1}`,
      description: `Project description ${i + 1}`,
      language: "TypeScript",
      fork: false,
      stargazers_count: i,
      html_url: `https://github.com/Anirban780/project-${i + 1}`,
      pushed_at: "2026-09-01T00:00:00Z",
      topics: ["test"],
    }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => manyRepos,
    } as unknown as Response);

    const result = await fetchGitHubRepos("Anirban780", { fetchFn: mockFetch });
    expect(result.repos).toHaveLength(8);
  });

  it("gracefully handles HTTP 403 / 429 rate limits without crashing", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "API rate limit exceeded" }),
    } as unknown as Response);

    const result = await fetchGitHubRepos("Anirban780", { fetchFn: mockFetch });

    expect(result.repos).toEqual([]);
    expect(result.error).toContain("rate limit exceeded");
    expect(result.url).toBe("https://github.com/Anirban780");
  });

  it("gracefully handles unexpected network exceptions", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network connection dropped"));

    const result = await fetchGitHubRepos("Anirban780", { fetchFn: mockFetch });

    expect(result.repos).toEqual([]);
    expect(result.error).toContain("Could not reach GitHub");
    expect(result.url).toBe("https://github.com/Anirban780");
  });
});
