// Pure helpers for organization metadata key-value editing

export interface MetadataRow {
  id: string;
  key: string;
  value: string;
}

let rowSeq = 0;
export function newMetadataRow(key = "", value = ""): MetadataRow {
  return { id: `md_${++rowSeq}`, key, value };
}

/** Convert an arbitrary JSON object into editable rows (nested values JSON-stringified) */
export function metadataToRows(metadata: unknown): MetadataRow[] {
  if (!metadata || typeof metadata !== "object") return [];
  return Object.entries(metadata as Record<string, unknown>).map(([key, value]) =>
    newMetadataRow(
      key,
      typeof value === "object" && value !== null
        ? JSON.stringify(value)
        : String(value),
    ),
  );
}

/** Rows → plain record, skipping fully-empty rows */
export function rowsToMetadata(rows: MetadataRow[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  rows
    .filter((row) => row.key.trim() || row.value.trim())
    .forEach((row) => {
      record[row.key.trim()] = row.value.trim();
    });
  return record;
}
