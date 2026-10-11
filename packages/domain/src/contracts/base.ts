import { z } from "zod";

export const CONTRACT_VERSION = 1;

export enum EntitySource {
  System = "system",
  User = "user",
  Agent = "agent",
  Import = "import",
}

export const entitySourceSchema = z.nativeEnum(EntitySource);

export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  contractVersion: z.literal(CONTRACT_VERSION),
  createdAt: z.string().datetime(),
  source: entitySourceSchema,
});

export type BaseEntity = z.infer<typeof baseEntitySchema>;

export function newId(): string {
  return crypto.randomUUID();
}
