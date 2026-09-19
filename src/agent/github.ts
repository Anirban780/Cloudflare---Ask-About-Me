/**
 * GitHub integration service for Ask-About-Me.
 * Fetches public repositories, filters by topics/keywords, excludes forks,
 * and handles rate limiting and connection errors gracefully.
 * Defined per SPECS.md §8.3 and §13 (F-11).
 */

export interface GitHubRepoItem {
  name: string;
  description: string;
  language: string;
  stars: number;
  url: string;
  pushedAt: string;
}

export interface GitHubFetchResult {
  repos: GitHubRepoItem[];
  error?: string;
  url?: string;
}

export interface FetchGitHubOptions {
  /** Optional topic, language, or keyword to filter repositories. */
  topic?: string;
  /** Custom fetch implementation for testing or mocking. */
  fetchFn?: typeof fetch;
}

/**
 * Fetches public repositories for a specified GitHub user, filtering out forks
 * and applying optional topic / keyword filtering.
 *
 * @param username GitHub username to query (e.g. "Anirban780").
 * @param options Optional topic filter and fetch function override.
 * @returns Filtered repository list or friendly error message.
 */
export async function fetchGitHubRepos(
  username: string,
  options?: FetchGitHubOptions
): Promise<GitHubFetchResult> {
  const safeUser = encodeURIComponent(username.trim());
  const profileUrl = `https://github.com/${safeUser}`;
  const apiUrl = `https://api.github.com/users/${safeUser}/repos?sort=pushed&per_page=30`;
  const fetchImpl = options?.fetchFn || globalThis.fetch;

  try {
    const fetchInit: RequestInit & { cf?: Record<string, unknown> } = {
      method: "GET",
      headers: {
        "User-Agent": "ask-about-me",
        Accept: "application/vnd.github+json",
      },
    };

    // Include Cloudflare cache options when running in Workers runtime
    if (typeof (globalThis as unknown as { WebSocketPair?: unknown }).WebSocketPair !== "undefined") {
      fetchInit.cf = {
        cacheTtl: 3600,
        cacheEverything: true,
      };
    }

    const response = await fetchImpl(apiUrl, fetchInit);

    // Handle GitHub API rate limits (HTTP 403 / 429) gracefully per SPECS.md §8.3
    if (response.status === 403 || response.status === 429) {
      return {
        repos: [],
        error: `GitHub API rate limit exceeded. Please visit ${profileUrl} directly to view projects.`,
        url: profileUrl,
      };
    }

    if (!response.ok) {
      return {
        repos: [],
        error: `GitHub request failed with status ${response.status}. Please visit ${profileUrl} directly.`,
        url: profileUrl,
      };
    }

    const rawData = await response.json();
    if (!Array.isArray(rawData)) {
      return {
        repos: [],
        error: `Unexpected GitHub response format. Please visit ${profileUrl}.`,
        url: profileUrl,
      };
    }

    // Filter out forks (SPECS.md §8.3: "Skip forks")
    let filtered = rawData.filter(
      (repo: { fork?: boolean }) => repo && repo.fork !== true
    );

    // Apply optional topic or keyword filter
    if (options?.topic && options.topic.trim().length > 0) {
      const q = options.topic.trim().toLowerCase();
      filtered = filtered.filter((repo: {
        name?: string;
        description?: string | null;
        language?: string | null;
        topics?: string[];
      }) => {
        const nameMatch = repo.name?.toLowerCase().includes(q);
        const descMatch = repo.description?.toLowerCase().includes(q);
        const langMatch = repo.language?.toLowerCase().includes(q);
        const topicMatch =
          Array.isArray(repo.topics) &&
          repo.topics.some((t: string) => typeof t === "string" && t.toLowerCase().includes(q));

        return Boolean(nameMatch || descMatch || langMatch || topicMatch);
      });
    }

    // Limit to top 8 most recently pushed non-fork repositories
    const repos: GitHubRepoItem[] = filtered.slice(0, 8).map(
      (r: {
        name?: string;
        description?: string | null;
        language?: string | null;
        stargazers_count?: number;
        html_url?: string;
        pushed_at?: string;
      }) => ({
        name: r.name || "unnamed-repo",
        description: r.description || "No description provided",
        language: r.language || "Unknown",
        stars: typeof r.stargazers_count === "number" ? r.stargazers_count : 0,
        url: r.html_url || `${profileUrl}/${r.name || ""}`,
        pushedAt: r.pushed_at || "",
      })
    );

    return { repos, url: profileUrl };
  } catch (_err) {
    return {
      repos: [],
      error: `Could not reach GitHub at this moment. Please visit ${profileUrl}.`,
      url: profileUrl,
    };
  }
}
