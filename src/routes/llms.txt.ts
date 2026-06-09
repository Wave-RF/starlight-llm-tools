import type { CollectionEntry } from "astro:content";
import { getCollection } from "astro:content";
import {
  description as configDescription,
  title as configTitle,
  sidebarOrder,
  siteOriginFallback,
} from "virtual:starlight-llm-tools/config";
import type { APIRoute } from "astro";
import { docMdUrl, docTitle, isLlmDoc, sortDocsBySidebar } from "../lib/docs.ts";

// llms.txt manifest (https://llmstxt.org): H1 title, blockquote
// description, H2 sections per top-level group with per-page .md links
// so agents can fetch only the pages they need.

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? siteOriginFallback;
  const allDocs = sortDocsBySidebar(
    (await getCollection("docs")).filter((d) => isLlmDoc(d.id)),
    sidebarOrder
  );

  const groups = new Map<string, CollectionEntry<"docs">[]>();
  for (const doc of allDocs) {
    if (doc.id === "index") continue;
    const top = doc.id.split("/")[0] as string;
    const list = groups.get(top) ?? [];
    list.push(doc);
    groups.set(top, list);
  }

  const lines: string[] = [];
  lines.push(`# ${configTitle}`, "");
  if (configDescription) lines.push(`> ${configDescription}`, "");

  lines.push("## Documentation sets", "");
  lines.push(
    `- [Full documentation](${origin}/llms-full.txt): every page concatenated, source-faithful (mermaid, math, asides, components preserved as text).`
  );
  lines.push(
    `- [Abridged documentation](${origin}/llms-small.txt): only top-level pages and section overviews.`
  );
  lines.push("");

  for (const [top, docs] of groups) {
    const overview = allDocs.find((d) => d.id === top);
    const heading = overview ? docTitle(overview) : top;
    lines.push(`## ${heading}`, "");
    for (const doc of docs) {
      const desc = doc.data.description ? `: ${doc.data.description}` : "";
      lines.push(`- [${docTitle(doc)}](${docMdUrl(doc.id, origin)})${desc}`);
    }
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
