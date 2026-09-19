import { describe, it, expect } from "vitest";
import { createSafeAIBinding } from "../src/agent/ai-binding";
import { createWorkersAI } from "workers-ai-provider";

describe("createSafeAIBinding (Streaming Tool Call Deduplication)", () => {
  function makeChunk(arg: string) {
    const obj = {
      response: "",
      tool_calls: [
        {
          index: 0,
          id: "ui8B7ELDJ7sI4K9L",
          function: { name: "searchKnowledgeBase", arguments: arg },
        },
      ],
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index: 0,
                id: "ui8B7ELDJ7sI4K9L",
                function: { name: "searchKnowledgeBase", arguments: arg },
              },
            ],
          },
        },
      ],
    };
    return `data: ${JSON.stringify(obj)}\n\n`;
  }

  it("prevents duplicate argument chunks when Cloudflare sends both native and OpenAI tool_calls", async () => {
    const sseStreamChunks = [
      makeChunk('{"query": "'),
      makeChunk("An"),
      makeChunk("ir"),
      makeChunk("ban"),
      makeChunk(" engineering"),
      makeChunk(" background"),
      makeChunk(' summary"'),
      makeChunk(', "sourceType": '),
      makeChunk('"about"}'),
      "data: [DONE]\n\n",
    ].join("");

    const mockRawBinding = {
      run: async () =>
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(sseStreamChunks));
            controller.close();
          },
        }),
    };

    const safeBinding = createSafeAIBinding(mockRawBinding as unknown as Ai);
    const provider = createWorkersAI({ binding: safeBinding });
    const model = provider("@cf/meta/llama-3.3-70b-instruct-fp8-fast");

    const result = await model.doStream({
      prompt: [{ role: "user", content: [{ type: "text", text: "Summarize" }] }],
    });

    let toolCallInput: string | null = null;
    const reader = result.stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === "tool-call") {
        toolCallInput = value.input;
      }
    }

    expect(toolCallInput).not.toBeNull();
    // Verify it is NOT doubled (i.e., not "AnAnirirbanban")
    expect(toolCallInput).not.toContain("AnAnirirbanban");
    expect(toolCallInput).not.toContain('{"query": "{"query": "');

    // Verify it is valid JSON with expected properties
    const parsed = JSON.parse(toolCallInput!);
    expect(parsed).toEqual({
      query: "Anirban engineering background summary",
      sourceType: "about",
    });
  });

  it("passes non-streaming or non-SSE responses through transparently", async () => {
    const mockRawBinding = {
      run: async () => ({
        response: "Non-stream response",
      }),
    };

    const safeBinding = createSafeAIBinding(mockRawBinding as unknown as Ai);
    const res = (await (safeBinding as unknown as { run: () => Promise<unknown> }).run()) as {
      response: string;
    };
    expect(res.response).toBe("Non-stream response");
  });
});
