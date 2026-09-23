import type { ConfigId, FieldKey, TableConfig } from "./types";
import { getColumns } from "./columns";

/**
 * Table configurations. Add new configs here without changing row storage.
 */
export const TABLE_CONFIGS: Record<ConfigId, TableConfig> = {
  minimalistic: {
    id: "minimalistic",
    label: "Minimalistic",
    description: "Activity and duration only.",
    columns: ["activity", "duration"],
    hasTiming: false,
  },
  simple: {
    id: "simple",
    label: "Simple",
    description: "Core plan with difficulty anticipation.",
    columns: [
      "activity",
      "duration",
      "anticipatedDifficulties",
      "supportStrategies",
    ],
    hasTiming: false,
  },
  detailed: {
    id: "detailed",
    label: "Detailed",
    description: "Full plan with activity types and timed schedule.",
    columns: [
      "activity",
      "activityType",
      "duration",
      "startTime",
      "endTime",
      "anticipatedDifficulties",
      "supportStrategies",
    ],
    hasTiming: true,
  },
};

export const DEFAULT_CONFIG_ID: ConfigId = "simple";

export function getConfig(id: ConfigId): TableConfig {
  return TABLE_CONFIGS[id] ?? TABLE_CONFIGS[DEFAULT_CONFIG_ID];
}

export function listConfigs(): TableConfig[] {
  return Object.values(TABLE_CONFIGS);
}

export function configHasField(id: ConfigId, key: FieldKey): boolean {
  return getConfig(id).columns.includes(key);
}

export function getConfigColumnDefs(id: ConfigId) {
  return getColumns(getConfig(id).columns);
}
