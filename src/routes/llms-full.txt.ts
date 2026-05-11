import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import {
  sidebarOrder,
  siteOriginFallback,
  title as configTitle,
} from "virtual:starlight-llm-tools/config";
import { docTitle, sortDocsBySidebar } from "../lib/docs.ts";
import { transformMarkdown } from "../lib/transforms.ts";

// Full documentation dump: every doc's source (with the standard
// transforms applied) concatenated in sidebar order with H1 + optional
// description per entry.

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const origin = site?.origin ?? siteOriginFallback;
  const docs = sortDocsBySidebar(await getCollection("docs"), sidebarOrder);

  const segments: string[] = [
    `<SYSTEM>Full developer documentation for ${configTitle}. Individual pages are also available at <path>.md for targeted access.</SYSTEM>`,
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
