/**
 * Knowledge base ingestion CLI script.
 * Scans `/knowledge` for markdown files, validates YAML frontmatter,
 * dispatches durable IngestWorkflow instances via admin API, and tracks progress.
 * Defined per SPECS.md §6.2.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

/** Frontmatter schema for knowledge documents. */
const FrontmatterSchema = z.object({
  docId: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{1,80}$/, "docId must be kebab-case lowercase"),
  title: z.string().min(1, "title is required"),
  sourceType: z.enum(["resume", "project", "blog", "about", "github"]),
  url: z.string().url().optional(),
});

export type IngestPayload = z.infer<typeof FrontmatterSchema> & {
  content: string;
};

/**
 * Recursively discovers all markdown files within a target directory.
 */
function findMarkdownFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Main CLI ingestion routine.
 */
async function main() {
  const baseUrl = (process.env.BASE_URL || "http://localhost:5173").replace(/\/+$/, "");
  const adminToken = process.env.ADMIN_TOKEN;

  if (!adminToken) {
    console.error("❌ Error: Missing ADMIN_TOKEN environment variable.");
    console.error("Usage: BASE_URL=http://localhost:5173 ADMIN_TOKEN=your-token npm run ingest");
    process.exit(1);
  }

  const knowledgeDir = path.resolve(process.cwd(), "knowledge");
  const files = findMarkdownFiles(knowledgeDir);

  if (files.length === 0) {
    console.warn(`⚠️ Warning: No markdown files found in "${knowledgeDir}".`);
    process.exit(0);
  }

  console.log(`\n📚 Discovered ${files.length} knowledge document(s) in ${knowledgeDir}:\n`);

  const docsToIngest: IngestPayload[] = [];
  const seenDocIds = new Set<string>();

  for (const file of files) {
    const relativePath = path.relative(knowledgeDir, file);
    const rawContent = fs.readFileSync(file, "utf-8");
    const parsed = matter(rawContent);

    const validation = FrontmatterSchema.safeParse(parsed.data);
    if (!validation.success) {
      console.error(`❌ Validation failed in "${relativePath}":`);
      for (const err of validation.error.issues) {
        console.error(`   - [${err.path.join(".")}] ${err.message}`);
      }
      process.exit(1);
    }

    const { docId, title, sourceType, url } = validation.data;
    if (seenDocIds.has(docId)) {
      console.error(`❌ Duplicate docId "${docId}" found in "${relativePath}". docIds must be unique.`);
      process.exit(1);
    }
    seenDocIds.add(docId);

    const bodyContent = parsed.content.trim();
    if (!bodyContent) {
      console.error(`❌ Empty document content in "${relativePath}".`);
      process.exit(1);
    }

    docsToIngest.push({
      docId,
      title,
      sourceType,
      url,
      content: bodyContent,
    });

    console.log(`  ✓ Validated: [${docId}] "${title}" (${sourceType})`);
  }

  // Submit documents to admin ingest endpoint
  console.log(`\n🚀 Submitting ${docsToIngest.length} document(s) to ${baseUrl}/api/admin/ingest ...`);

  const response = await fetch(`${baseUrl}/api/admin/ingest`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ docs: docsToIngest }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Ingestion request failed (${response.status}): ${errorText}`);
    process.exit(1);
  }

  const { instances } = (await response.json()) as {
    instances: { docId: string; instanceId: string }[];
  };

  console.log(`✅ Started ${instances.length} durable workflow instance(s). Tracking progress...\n`);

  // Poll each instance status
  let hasErrors = false;
  const results: { docId: string; instanceId: string; status: string; chunks: number; durationSeconds: number }[] = [];

  for (const item of instances) {
    const startTime = Date.now();
    let currentStatus = "queued";
    let chunks = 0;

    while (currentStatus === "queued" || currentStatus === "running") {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const statusRes = await fetch(`${baseUrl}/api/admin/ingest/${item.instanceId}`, {
        headers: { "Authorization": `Bearer ${adminToken}` },
      });

      if (!statusRes.ok) {
        currentStatus = `HTTP_${statusRes.status}`;
        break;
      }

      const statusData = (await statusRes.json()) as {
        status?: string;
        output?: { chunks?: number };
        error?: unknown;
      };

      currentStatus = statusData.status || "unknown";
      if (statusData.output?.chunks) {
        chunks = statusData.output.chunks;
      }

      if (currentStatus === "errored" || currentStatus === "terminated") {
        console.error(`❌ Document "${item.docId}" failed:`, statusData.error || "Workflow terminated");
        hasErrors = true;
        break;
      }
    }

    const durationSeconds = Math.round((Date.now() - startTime) / 100) / 10;
    results.push({
      docId: item.docId,
      instanceId: item.instanceId,
      status: currentStatus,
      chunks,
      durationSeconds,
    });
  }

  // Print summary table
  console.log("\n📊 Ingestion Results Summary:");
  console.table(
    results.map((r) => ({
      "Document ID": r.docId,
      "Status": r.status === "complete" ? "✅ Complete" : `❌ ${r.status}`,
      "Chunks": r.chunks,
      "Time (s)": `${r.durationSeconds}s`,
    }))
  );

  if (hasErrors) {
    console.error("\n❌ Ingestion finished with errors.");
    process.exit(1);
  }

  console.log("\n🎉 All knowledge base documents successfully ingested!");
}

main().catch((err) => {
  console.error("Fatal ingestion script error:", err);
  process.exit(1);
});
