import { z } from "zod";

export const KNOWLEDGE_KINDS = ["note", "lesson"] as const;

export const knowledgeSchema = z.strictObject({
  id: z.string().regex(/^[a-z][a-z0-9-]{1,60}$/),
  kind: z.enum(KNOWLEDGE_KINDS),
  title: z.string().min(1).max(100),
  tags: z
    .array(z.string().regex(/^[a-z][a-z0-9-]*$/))
    .min(1)
    .max(10),
  seen: z.number().int().min(1).max(9999).optional(),
  body: z.string().min(20).max(4000),
  source: z.enum(["bundled", "project"]),
});

export type Knowledge = z.output<typeof knowledgeSchema>;
