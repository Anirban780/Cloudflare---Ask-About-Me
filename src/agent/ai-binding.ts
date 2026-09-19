/**
 * Safe wrapper for Cloudflare Workers AI binding.
 * Resolves tool call argument duplication in streaming mode.
 *
 * Problem:
 * Cloudflare Workers AI SSE streams return events containing BOTH native format fields
 * (`chunk.tool_calls`, `chunk.response`) and OpenAI format fields (`chunk.choices[0].delta`).
 * `workers-ai-provider` (v3.3.x) processes both fields unconditionally without mutual exclusion,
 * causing every tool argument delta chunk to be appended twice per SSE event.
 * (e.g. `{"query": "{"query": "AnAnirirbanban..."}`).
 * This produces invalid JSON, which throws on `JSON.parse` and causes the tool call to fail
 * with `state: "output-error"` and `rawInput` containing duplicated characters.
 *
 * Solution:
 * This wrapper intercepts the SSE ReadableStream from `env.AI.run(...)` and deletes redundant
 * top-level fields (`tool_calls` and `response`) when `choices[0].delta` is already present.
 */

export function createSafeAIBinding(ai: Ai): Ai {
  return new Proxy(ai, {
    get(target, prop, receiver) {
      if (prop === "run") {
        return async function (model: string, inputs: unknown, options?: unknown) {
          const res = await (
            target as unknown as {
              run: (...args: unknown[]) => Promise<unknown>;
            }
          ).run(model, inputs, options);

          if (!(res instanceof ReadableStream)) {
            return res;
          }

          const textDecoder = new TextDecoder();
          const textEncoder = new TextEncoder();
          let lineBuffer = "";

          const transformStream = new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk: Uint8Array, controller) {
              lineBuffer += textDecoder.decode(chunk, { stream: true });
              const lines = lineBuffer.split("\n");
              lineBuffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ") && line !== "data: [DONE]") {
                  try {
                    const parsed = JSON.parse(line.slice(6));
                    // If choices.delta.tool_calls is present, drop redundant top-level tool_calls
                    if (
                      parsed.choices?.[0]?.delta?.tool_calls &&
                      Array.isArray(parsed.tool_calls)
                    ) {
                      delete parsed.tool_calls;
                    }
                    // If choices.delta.content is present, drop redundant top-level response
                    if (
                      parsed.choices?.[0]?.delta?.content &&
                      parsed.response != null
                    ) {
                      delete parsed.response;
                    }
                    controller.enqueue(
                      textEncoder.encode(`data: ${JSON.stringify(parsed)}\n`)
                    );
                  } catch {
                    controller.enqueue(textEncoder.encode(line + "\n"));
                  }
                } else {
                  controller.enqueue(textEncoder.encode(line + "\n"));
                }
              }
            },
            flush(controller) {
              if (lineBuffer) {
                controller.enqueue(textEncoder.encode(lineBuffer));
              }
            },
          });

          return res.pipeThrough(transformStream);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}
