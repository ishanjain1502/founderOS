import type { CrustdataCompany } from "@ceo-sandbox/domain";

function readString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return undefined;
}

export function normalizeSearchRow(raw: unknown): CrustdataCompany | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const idRaw = row.crustdata_company_id;
  if (idRaw === undefined || idRaw === null || idRaw === "") {
    return null;
  }

  const basic =
    row.basic_info && typeof row.basic_info === "object"
      ? (row.basic_info as Record<string, unknown>)
      : undefined;
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : undefined;
  const taxonomy =
    row.taxonomy && typeof row.taxonomy === "object"
      ? (row.taxonomy as Record<string, unknown>)
      : undefined;

  const fieldPaths: string[] = [];
  const name = readString(basic?.name) ?? "";
  if (basic?.name !== undefined && basic.name !== null && basic.name !== "") {
    fieldPaths.push("basic_info.name");
  }

  const website = readString(basic?.website);
  if (website) {
    fieldPaths.push("basic_info.website");
  }

  const description = readString(basic?.description);
  if (description) {
    fieldPaths.push("basic_info.description");
  }

  const industry = readString(taxonomy?.professional_network_industry);
  if (industry) {
    fieldPaths.push("taxonomy.professional_network_industry");
  }

  const updatedAt = readString(metadata?.updated_at);
  if (updatedAt) {
    fieldPaths.push("metadata.updated_at");
  }

  const indexedAt = readString(metadata?.indexed_at);
  if (indexedAt) {
    fieldPaths.push("metadata.indexed_at");
  }

  fieldPaths.push("crustdata_company_id");

  return {
    crustdataCompanyId: String(idRaw),
    name,
    website,
    description,
    industry,
    updatedAt,
    indexedAt,
    fieldPaths,
    raw,
  };
}
