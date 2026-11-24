import { BRIEF_KINDS, type BriefKind, searchReferences } from "@toros/tokens";

export interface SearchReferencesArgs {
  kind?: string | undefined;
  tone?: string[] | undefined;
  archetype?: string | undefined;
  text?: string | undefined;
  limit?: number | undefined;
}

export function searchReferencesTool(args: SearchReferencesArgs): string {
  if (args.kind && !(BRIEF_KINDS as readonly string[]).includes(args.kind)) {
    throw new Error(`Unknown kind "${args.kind}". Fix: use one of ${BRIEF_KINDS.join(", ")}.`);
  }
  const matches = searchReferences({
    ...(args.kind && { kind: args.kind as BriefKind }),
    ...(args.tone && { tone: args.tone }),
    ...(args.archetype && { archetype: args.archetype }),
    ...(args.text && { text: args.text }),
    ...(args.limit !== undefined && { limit: args.limit }),
  });
  return JSON.stringify(matches, null, 2);
}
