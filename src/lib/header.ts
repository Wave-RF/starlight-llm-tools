import {
  docMdUrl,
  docTitle,
  docUrl,
  parentId,
  titleFromId,
  type DocEntry,
} from "./docs.js";

/** Per-page `.md` header: H1 title, then a blockquote with Section
 *  (parent), Subpages (children if any), Related (same-level siblings if
 *  any), and a pointer to the HTML version + the docs index. */
export function pageContextHeader(
  doc: DocEntry,
  allDocs: DocEntry[],
  siteOrigin: string,
  options: { manifestPath?: string } = {},
): string {
  const manifest = options.manifestPath ?? "/llms.txt";
  const pId = parentId(doc.id);
  const children = allDocs
    .filter((d) => d.id !== doc.id && parentId(d.id) === doc.id)
    .sort((a, b) => a.id.localeCompare(b.id));
  const siblings = allDocs
    .filter(
      (d) => d.id !== doc.id && d.id !== "index" && parentId(d.id) === pId,
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  const lines: string[] = [`# ${docTitle(doc)}`, ""];

  // Skip "Section" for top-level pages whose parent is the (implicit) home.
  if (pId !== null && pId !== "index") {
    const parent = allDocs.find((d) => d.id === pId);
    const title = parent ? docTitle(parent) : titleFromId(pId);
    lines.push(`> **Section:** [${title}](${docMdUrl(pId, siteOrigin)})`);
  }
  if (children.length > 0) {
    const items = children.map(
      (c) => `[${docTitle(c)}](${docMdUrl(c.id, siteOrigin)})`,
    );
    lines.push(`> **Subpages:** ${items.join(" · ")}`);
  }
  if (siblings.length > 0) {
    const items = siblings.map(
      (s) => `[${docTitle(s)}](${docMdUrl(s.id, siteOrigin)})`,
    );
    lines.push(`> **Related:** ${items.join(" · ")}`);
  }
  lines.push(
    `> **Also:** [HTML version](${docUrl(doc.id, siteOrigin)}) · [Docs index](${siteOrigin}${manifest})`,
  );
  lines.push("", "---", "");

  return lines.join("\n");
}
