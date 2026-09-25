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

/**
 * Pick the table view that best matches imported column keys:
 * the smallest config that includes every provided field, or the
 * closest overlap if none fully covers them.
 */
export function inferConfigFromColumns(keys: FieldKey[]): ConfigId {
  const provided = [...new Set(keys)];
  if (provided.length === 0) return DEFAULT_CONFIG_ID;

  const configs = listConfigs();

  const covering = configs.filter((config) =>
    provided.every((key) => config.columns.includes(key)),
  );
  if (covering.length > 0) {
    return covering.reduce((best, config) =>
      config.columns.length < best.columns.length ? config : best,
    ).id;
  }

  let best = configs[0] ?? TABLE_CONFIGS[DEFAULT_CONFIG_ID];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const config of configs) {
    const overlap = provided.filter((key) => config.columns.includes(key)).length;
    const extra = config.columns.filter((key) => !provided.includes(key)).length;
    const score = overlap * 100 - extra;
    if (score > bestScore) {
      bestScore = score;
      best = config;
    }
  }
  return best.id;
}
