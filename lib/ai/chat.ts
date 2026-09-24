import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import type { ChatMessage, SequenceState } from "@/lib/types";
import {
  executeSequenceMcpTool,
  SEQUENCE_MCP_TOOLS,
  SYSTEM_PROMPT,
} from "@/lib/ai/sequence-mcp";

export type ChatRequestBody = {
  messages: ChatMessage[];
  sequence: SequenceState;
};

export type ChatResponseBody = {
  reply: string;
  sequence: SequenceState;
};

const MAX_TOOL_ROUNDS = 12;

function toOpenAiMessages(messages: ChatMessage[]): ChatCompletionMessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export async function runSequenceChat(
  body: ChatRequestBody,
): Promise<ChatResponseBody> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ChatConfigError(
      "OPENAI_API_KEY is not set. Add it to your .env file and restart the dev server.",
    );
  }

  if (!body.messages?.length) {
    throw new ChatRequestError("messages are required.");
  }
  if (!body.sequence?.rows?.length) {
    throw new ChatRequestError("sequence with at least one row is required.");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-6-luna";

  let sequence: SequenceState = structuredClone(body.sequence);
  const openaiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `Current sequence snapshot (also available via get_sequence):\n${JSON.stringify(
        {
          title: sequence.title,
          configId: sequence.configId,
          rows: sequence.rows.map((r, i) => ({
            index: i,
            id: r.id,
            activity: r.activity,
            duration: r.duration,
            anticipatedDifficulties: r.anticipatedDifficulties,
            supportStrategies: r.supportStrategies,
            activityType: r.activityType,
            startTime: r.startTime,
            endTime: r.endTime,
            startTimeManual: r.startTimeManual,
            aiComment: r.aiComment,
          })),
        },
        null,
        2,
      )}`,
    },
    ...toOpenAiMessages(body.messages),
  ];

  let reply = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await client.chat.completions.create({
      model,
      messages: openaiMessages,
      tools: SEQUENCE_MCP_TOOLS,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    if (!choice) {
      throw new ChatUpstreamError("Empty response from OpenAI.");
    }

    const message = choice.message;
    openaiMessages.push(message);

    const toolCalls = message.tool_calls;
    if (!toolCalls?.length) {
      reply = (message.content ?? "").trim();
      break;
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const { state: next, result } = executeSequenceMcpTool(
        sequence,
        call.function.name,
        call.function.arguments,
      );
      sequence = next;
      const toolMessage: ChatCompletionToolMessageParam = {
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      };
      openaiMessages.push(toolMessage);
    }

    if (choice.finish_reason === "stop" && message.content) {
      reply = message.content.trim();
      break;
    }
  }

  if (!reply) {
    reply = "Done. I updated the sequence with the tools available.";
  }

  return { reply, sequence };
}

export class ChatConfigError extends Error {
  status = 503;
}
export class ChatRequestError extends Error {
  status = 400;
}
export class ChatUpstreamError extends Error {
  status = 502;
}
