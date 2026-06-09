import { getCollection } from "astro:content";
import {
  title as configTitle,
  sidebarOrder,
  siteOriginFallback,
} from "virtual:starlight-llm-tools/config";
import type { APIRoute } from "astro";
import { docTitle, isLlmDoc, isOverviewPage, sortDocsBySidebar } from "../lib/docs.ts";
import { transformMarkdown } from "../lib/transforms.ts";

// Abridged documentation: home page + any doc that has children in the
// hierarchy. Small enough to fit a smaller context window while still
// conveying the shape of the docs.

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? siteOriginFallback;
  // Drop non-doc slugs (e.g. 404) before deriving overviews so an error
  // page nested under one can't be treated as a section or leak into the
  // abridged output — matching the rest of the llms.txt family.
  const allDocs = (await getCollection("docs")).filter((doc) => isLlmDoc(doc.id));
  const docs = sortDocsBySidebar(
    allDocs.filter((doc) => isOverviewPage(doc, allDocs)),
    sidebarOrder
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
