import type { ChatCompletionTool } from "openai/resources/chat/completions";
import type { ActivityType, FieldKey, SequenceState } from "@/lib/types";
import {
  clearManualStart,
  clearRowComment,
  deleteRow,
  insertRowWithData,
  moveRow,
  setRowComment,
  updateRowField,
} from "@/lib/sequence";
import { getConfig } from "@/lib/configs";

const FIELD_KEYS: FieldKey[] = [
  "activity",
  "duration",
  "anticipatedDifficulties",
  "supportStrategies",
  "activityType",
  "startTime",
  "endTime",
];

const ACTIVITY_TYPES: ActivityType[] = [
  "Student work",
  "Whole-class interaction",
  "Teacher presentation",
  "",
];

/** OpenAI tool definitions — sequence MCP surface for the lesson assistant. */
export const SEQUENCE_MCP_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_sequence",
      description:
        "Read the full lesson sequence: title, config, and every row with ids and fields.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "set_title",
      description: "Update the lesson title.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "New lesson title" },
        },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_row",
      description:
        "Update one or more fields on a row by id. Omit fields you do not want to change. endTime is computed automatically — do not set it.",
      parameters: {
        type: "object",
        properties: {
          rowId: { type: "string" },
          activity: { type: "string" },
          duration: {
            type: ["number", "null"],
            description: "Duration in minutes, or null to clear",
          },
          anticipatedDifficulties: { type: "string" },
          supportStrategies: { type: "string" },
          activityType: {
            type: "string",
            enum: [
              "Student work",
              "Whole-class interaction",
              "Teacher presentation",
              "",
            ],
          },
          startTime: {
            type: ["string", "null"],
            description: "HH:mm wall-clock start, or null to clear manual start",
          },
        },
        required: ["rowId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "insert_row",
      description:
        "Insert a new activity row at the given index (0 = first). Optional field values for the new row.",
      parameters: {
        type: "object",
        properties: {
          index: { type: "integer", minimum: 0 },
          activity: { type: "string" },
          duration: { type: ["number", "null"] },
          anticipatedDifficulties: { type: "string" },
          supportStrategies: { type: "string" },
          activityType: {
            type: "string",
            enum: [
              "Student work",
              "Whole-class interaction",
              "Teacher presentation",
              "",
            ],
          },
          startTime: { type: ["string", "null"] },
        },
        required: ["index"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_row",
      description: "Delete a row by id. Fails if it would leave the sequence empty.",
      parameters: {
        type: "object",
        properties: { rowId: { type: "string" } },
        required: ["rowId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "move_row",
      description: "Reorder a row from one index to another (0-based).",
      parameters: {
        type: "object",
        properties: {
          fromIndex: { type: "integer", minimum: 0 },
          toIndex: { type: "integer", minimum: 0 },
        },
        required: ["fromIndex", "toIndex"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_manual_start",
      description:
        "Clear a manual start-time override so the row chains from the previous activity again.",
      parameters: {
        type: "object",
        properties: { rowId: { type: "string" } },
        required: ["rowId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "comment_row",
      description:
        "Attach or replace an AI comment on a specific row. Use for coaching notes, risks, or questions for the teacher. Keep comments concise.",
      parameters: {
        type: "object",
        properties: {
          rowId: { type: "string" },
          comment: { type: "string", description: "Comment text shown to the teacher" },
        },
        required: ["rowId", "comment"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "clear_row_comment",
      description: "Remove the AI comment from a row.",
      parameters: {
        type: "object",
        properties: { rowId: { type: "string" } },
        required: ["rowId"],
        additionalProperties: false,
      },
    },
  },
];

export type McpToolResult = {
  ok: boolean;
  message: string;
  data?: unknown;
};

function serializeSequence(state: SequenceState) {
  const config = getConfig(state.configId);
  return {
    title: state.title,
    configId: state.configId,
    configLabel: config.label,
    visibleColumns: config.columns,
    rowCount: state.rows.length,
    rows: state.rows.map((row, index) => ({
      index,
      id: row.id,
      activity: row.activity,
      duration: row.duration,
      anticipatedDifficulties: row.anticipatedDifficulties,
      supportStrategies: row.supportStrategies,
      activityType: row.activityType,
      startTime: row.startTime,
      endTime: row.endTime,
      startTimeManual: row.startTimeManual,
      aiComment: row.aiComment,
    })),
  };
}

function findRow(state: SequenceState, rowId: string) {
  return state.rows.find((r) => r.id === rowId);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumberOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return undefined;
}

function asActivityType(value: unknown): ActivityType | undefined {
  if (typeof value !== "string") return undefined;
  return ACTIVITY_TYPES.includes(value as ActivityType)
    ? (value as ActivityType)
    : undefined;
}

export function executeSequenceMcpTool(
  state: SequenceState,
  name: string,
  rawArgs: string,
): { state: SequenceState; result: McpToolResult } {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return {
      state,
      result: { ok: false, message: "Invalid JSON arguments." },
    };
  }

  switch (name) {
    case "get_sequence":
      return {
        state,
        result: {
          ok: true,
          message: "Current sequence.",
          data: serializeSequence(state),
        },
      };

    case "set_title": {
      const title = asString(args.title)?.trim();
      if (!title) {
        return { state, result: { ok: false, message: "title is required." } };
      }
      const next = { ...state, title };
      return {
        state: next,
        result: { ok: true, message: `Title set to “${title}”.` },
      };
    }

    case "update_row": {
      const rowId = asString(args.rowId);
      if (!rowId || !findRow(state, rowId)) {
        return { state, result: { ok: false, message: "Unknown rowId." } };
      }
      let rows = state.rows;
      const updates: Partial<Record<FieldKey, string | number | null>> = {};

      if ("activity" in args) updates.activity = asString(args.activity) ?? "";
      if ("duration" in args) {
        const d = asNumberOrNull(args.duration);
        if (d === undefined && args.duration !== null) {
          return { state, result: { ok: false, message: "Invalid duration." } };
        }
        updates.duration = d ?? null;
      }
      if ("anticipatedDifficulties" in args) {
        updates.anticipatedDifficulties = asString(args.anticipatedDifficulties) ?? "";
      }
      if ("supportStrategies" in args) {
        updates.supportStrategies = asString(args.supportStrategies) ?? "";
      }
      if ("activityType" in args) {
        const t = asActivityType(args.activityType);
        if (t === undefined) {
          return { state, result: { ok: false, message: "Invalid activityType." } };
        }
        updates.activityType = t;
      }
      if ("startTime" in args) {
        if (args.startTime === null || args.startTime === "") {
          rows = clearManualStart(rows, rowId);
        } else {
          const start = asString(args.startTime);
          if (!start) {
            return { state, result: { ok: false, message: "Invalid startTime." } };
          }
          updates.startTime = start;
        }
      }

      for (const key of FIELD_KEYS) {
        if (key === "endTime") continue;
        if (key in updates) {
          rows = updateRowField(rows, rowId, key, updates[key]!);
        }
      }

      return {
        state: { ...state, rows },
        result: {
          ok: true,
          message: `Updated row ${rowId}.`,
          data: serializeSequence({ ...state, rows }).rows.find((r) => r.id === rowId),
        },
      };
    }

    case "insert_row": {
      const index = typeof args.index === "number" ? Math.floor(args.index) : NaN;
      if (!Number.isFinite(index) || index < 0) {
        return { state, result: { ok: false, message: "index must be a non-negative integer." } };
      }
      const partial: Parameters<typeof insertRowWithData>[2] = {};
      if ("activity" in args) partial.activity = asString(args.activity) ?? "";
      if ("duration" in args) {
        const d = asNumberOrNull(args.duration);
        if (d === undefined && args.duration !== null) {
          return { state, result: { ok: false, message: "Invalid duration." } };
        }
        partial.duration = d ?? null;
      }
      if ("anticipatedDifficulties" in args) {
        partial.anticipatedDifficulties = asString(args.anticipatedDifficulties) ?? "";
      }
      if ("supportStrategies" in args) {
        partial.supportStrategies = asString(args.supportStrategies) ?? "";
      }
      if ("activityType" in args) {
        const t = asActivityType(args.activityType);
        if (t === undefined) {
          return { state, result: { ok: false, message: "Invalid activityType." } };
        }
        partial.activityType = t;
      }
      if ("startTime" in args && args.startTime) {
        const start = asString(args.startTime);
        if (start) {
          partial.startTime = start;
          partial.startTimeManual = true;
        }
      }

      const rows = insertRowWithData(state.rows, index, partial);
      const inserted = rows[Math.min(index, rows.length - 1)];
      return {
        state: { ...state, rows },
        result: {
          ok: true,
          message: `Inserted row at index ${Math.min(index, rows.length - 1)}.`,
          data: { id: inserted?.id, index: Math.min(index, rows.length - 1) },
        },
      };
    }

    case "delete_row": {
      const rowId = asString(args.rowId);
      if (!rowId || !findRow(state, rowId)) {
        return { state, result: { ok: false, message: "Unknown rowId." } };
      }
      if (state.rows.length <= 1) {
        return {
          state,
          result: { ok: false, message: "Cannot delete the last remaining row." },
        };
      }
      return {
        state: { ...state, rows: deleteRow(state.rows, rowId) },
        result: { ok: true, message: `Deleted row ${rowId}.` },
      };
    }

    case "move_row": {
      const fromIndex =
        typeof args.fromIndex === "number" ? Math.floor(args.fromIndex) : NaN;
      const toIndex =
        typeof args.toIndex === "number" ? Math.floor(args.toIndex) : NaN;
      if (
        !Number.isFinite(fromIndex) ||
        !Number.isFinite(toIndex) ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.rows.length ||
        toIndex >= state.rows.length
      ) {
        return {
          state,
          result: { ok: false, message: "fromIndex/toIndex out of range." },
        };
      }
      return {
        state: { ...state, rows: moveRow(state.rows, fromIndex, toIndex) },
        result: {
          ok: true,
          message: `Moved row from ${fromIndex} to ${toIndex}.`,
        },
      };
    }

    case "clear_manual_start": {
      const rowId = asString(args.rowId);
      if (!rowId || !findRow(state, rowId)) {
        return { state, result: { ok: false, message: "Unknown rowId." } };
      }
      return {
        state: { ...state, rows: clearManualStart(state.rows, rowId) },
        result: { ok: true, message: `Cleared manual start on ${rowId}.` },
      };
    }

    case "comment_row": {
      const rowId = asString(args.rowId);
      const comment = asString(args.comment);
      if (!rowId || !findRow(state, rowId)) {
        return { state, result: { ok: false, message: "Unknown rowId." } };
      }
      if (!comment?.trim()) {
        return { state, result: { ok: false, message: "comment is required." } };
      }
      return {
        state: { ...state, rows: setRowComment(state.rows, rowId, comment) },
        result: { ok: true, message: `Commented on row ${rowId}.` },
      };
    }

    case "clear_row_comment": {
      const rowId = asString(args.rowId);
      if (!rowId || !findRow(state, rowId)) {
        return { state, result: { ok: false, message: "Unknown rowId." } };
      }
      return {
        state: { ...state, rows: clearRowComment(state.rows, rowId) },
        result: { ok: true, message: `Cleared comment on ${rowId}.` },
      };
    }

    default:
      return {
        state,
        result: { ok: false, message: `Unknown tool: ${name}` },
      };
  }
}

export const SYSTEM_PROMPT = `You are a teaching assistant helping educators plan lesson sequences in the Sequence app.

You have MCP tools to read and mutate the current lesson sequence: title, rows (activities), fields, order, timing, and per-row AI comments.

Guidelines:
- Prefer using tools over guessing. Call get_sequence when you need fresh context.
- When the teacher asks for review or feedback, use comment_row on specific activities rather than only chatting — comments appear as icons on those rows.
- Keep comments short, actionable, and specific to that activity.
- When asked to "solve" a comment, apply concrete sequence edits (update_row, insert_row, move_row, etc.), then clear_row_comment if the issue is resolved (or replace the comment if something remains).
- Respect durations in minutes and HH:mm times. endTime is derived — never invent edits for it.
- Do not delete every row; the sequence must keep at least one.
- After making changes, briefly summarize what you did in plain language for the teacher.
- Be concise. You are assisting lesson planning, not writing essays.`;
