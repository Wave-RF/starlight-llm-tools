import type { CollectionEntry } from "astro:content";

export type DocEntry = CollectionEntry<"docs">;

// Special slugs that live in the docs collection but aren't user-facing
// doc content — error pages, etc. Excluded from per-page .md twins, the
// llms.txt family, and the Copy-Markdown / Open-with-AI buttons. (The
// `index` page has its own contextual handling in each consumer and is
// intentionally not in this set.)
const NON_DOC_SLUGS = new Set(["404"]);

/** Whether a docs-collection entry is real user-facing documentation
 *  that should appear in the LLM-friendly outputs. */
export function isLlmDoc(id: string): boolean {
  return !NON_DOC_SLUGS.has(id);
}

export function titleFromId(id: string): string {
  const last = id.split("/").pop() ?? id;
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function docTitle(doc: DocEntry): string {
  return doc.data.title ?? titleFromId(doc.id);
}

export function docUrl(docId: string, siteOrigin: string): string {
  return docId === "index" ? `${siteOrigin}/` : `${siteOrigin}/${docId}`;
}

export function docMdUrl(docId: string, siteOrigin: string): string {
  return `${siteOrigin}/${docId}.md`;
}

export function parentId(docId: string): string | null {
  if (docId === "index") return null;
  const parts = docId.split("/");
  if (parts.length === 1) return "index";
  return parts.slice(0, -1).join("/");
}

/** Sort docs by the order they appear in the provided sidebar slug list.
 *  Any docs not present fall through to the end, alphabetized, so output
 *  is deterministic even with sidebar coverage gaps. */
export function sortDocsBySidebar<T extends DocEntry>(docs: T[], order: string[]): T[] {
  const rank = new Map(order.map((slug, i) => [slug, i]));
  const known: T[] = [];
  const unknown: T[] = [];
  for (const doc of docs) {
    if (rank.has(doc.id)) known.push(doc);
    else unknown.push(doc);
  }
  known.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  unknown.sort((a, b) => a.id.localeCompare(b.id));
  return [...known, ...unknown];
}

/** A doc is an "overview" if other docs live under it in the hierarchy
 *  (i.e. some other doc.id starts with `<this.id>/`). The home page is
 *  always treated as an overview so it makes it into llms-small.txt. */
export function isOverviewPage(doc: DocEntry, allDocs: DocEntry[]): boolean {
  if (doc.id === "index") return true;
  const prefix = `${doc.id}/`;
  return allDocs.some((d) => d.id.startsWith(prefix));
}
