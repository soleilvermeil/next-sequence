import {
  ChatConfigError,
  ChatRequestError,
  ChatUpstreamError,
  runSequenceChat,
  type ChatRequestBody,
} from "@/lib/ai/chat";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const result = await runSequenceChat(body);
    return Response.json(result);
  } catch (err) {
    if (
      err instanceof ChatConfigError ||
      err instanceof ChatRequestError ||
      err instanceof ChatUpstreamError
    ) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    const message =
      err instanceof Error ? err.message : "Unexpected error talking to the AI.";
    console.error("[api/chat]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
