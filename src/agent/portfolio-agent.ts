/** PortfolioAgent Durable Object: manages visitor session, chat history, and streaming AI responses. */

import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { createWorkersAI } from "workers-ai-provider";
import { streamText, convertToModelMessages, pruneMessages } from "ai";
import { buildSystemPrompt, type VisitorState } from "./system-prompt";

export class PortfolioAgent extends AIChatAgent<Env, VisitorState> {
  maxPersistedMessages = 100;
  chatRecovery = true;

  initialState: VisitorState = {
    visitor: { interests: [] },
    stats: {
      messagesSent: 0,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    },
  };

  async onChatMessage(_onFinish: unknown, options?: OnChatMessageOptions) {
    const workersai = createWorkersAI({ binding: this.env.AI });
    const modelName = this.env.CHAT_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

    // Track visitor activity in state
    if (this.state) {
      this.setState({
        ...this.state,
        stats: {
          ...this.state.stats,
          messagesSent: (this.state.stats?.messagesSent || 0) + 1,
          lastSeenAt: new Date().toISOString(),
        },
      });
    }

    const result = streamText({
      model: workersai(modelName),
      system: buildSystemPrompt(this.env, this.state),
      messages: pruneMessages({
        messages: await convertToModelMessages(this.messages),
        toolCalls: "before-last-2-messages",
        reasoning: "before-last-message",
      }),
      temperature: 0.2,
      maxOutputTokens: 600,
      abortSignal: options?.abortSignal,
    });

    return result.toUIMessageStreamResponse();
  }
}
