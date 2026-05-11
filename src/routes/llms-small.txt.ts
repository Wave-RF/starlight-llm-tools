import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import {
  sidebarOrder,
  siteOriginFallback,
  title as configTitle,
} from "virtual:starlight-llm-tools/config";
import { docTitle, isOverviewPage, sortDocsBySidebar } from "../lib/docs.ts";
import { transformMarkdown } from "../lib/transforms.ts";

// Abridged documentation: home page + any doc that has children in the
// hierarchy. Small enough to fit a smaller context window while still
// conveying the shape of the docs.

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? siteOriginFallback;
  const allDocs = await getCollection("docs");
  const docs = sortDocsBySidebar(
    allDocs.filter((doc) => isOverviewPage(doc, allDocs)),
    sidebarOrder,
  );

  const segments: string[] = [
    `<SYSTEM>Abridged developer documentation for ${configTitle} — only overview pages. For full content see llms-full.txt or the individual <path>.md files.</SYSTEM>`,
  ];

  for (const doc of docs) {
    const chunks: string[] = [`# ${docTitle(doc)}`];
    if (doc.data.description) chunks.push(`> ${doc.data.description}`);
    chunks.push(await transformMarkdown(doc.body ?? "", origin));
    segments.push(chunks.join("\n\n"));
  }

  return new Response(segments.join("\n\n---\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
