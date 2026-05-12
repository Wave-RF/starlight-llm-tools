import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import { siteOriginFallback } from "virtual:starlight-llm-tools/config";
import { isLlmDoc } from "../lib/docs.ts";
import { pageContextHeader } from "../lib/header.ts";
import { transformMarkdown } from "../lib/transforms.ts";

// Per-page raw markdown twin. Prepended with a navigation header
// (parent / siblings / children pointers) and then run through the
// transform pipeline (MDX images / imports / glossary).

const allDocs = (await getCollection("docs")).filter((d) => isLlmDoc(d.id));

export const getStaticPaths: GetStaticPaths = () =>
  allDocs.map((doc) => ({ params: { slug: doc.id }, props: { doc } }));

export const GET: APIRoute = async ({ props, site }) => {
  const { doc } = props as { doc: (typeof allDocs)[number] };
  const origin = site?.origin ?? siteOriginFallback;
  const header = pageContextHeader(doc, allDocs, origin);
  const body = await transformMarkdown(doc.body ?? "", origin);
  return new Response(header + body, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
