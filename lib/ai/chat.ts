import OpenAI from "openai";
import { toResponseInputItems } from "openai/lib/responses/ResponseInputItems";
import type { ResponseInputItem } from "openai/resources/responses/responses";
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

  const snapshot = {
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
  };

  const instructions = `${SYSTEM_PROMPT}

Current sequence snapshot (also available via get_sequence):
${JSON.stringify(snapshot, null, 2)}`;

  const input: ResponseInputItem[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let reply = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.responses.create({
      model,
      instructions,
      input,
      tools: SEQUENCE_MCP_TOOLS,
      tool_choice: "auto",
    });

    input.push(...toResponseInputItems(response.output));

    const functionCalls = response.output.filter(
      (item) => item.type === "function_call",
    );

    if (!functionCalls.length) {
      reply = (response.output_text ?? "").trim();
      break;
    }

    for (const call of functionCalls) {
      const { state: next, result } = executeSequenceMcpTool(
        sequence,
        call.name,
        call.arguments,
      );
      sequence = next;
      input.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: JSON.stringify(result),
      });
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
