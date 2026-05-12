import type { ImageMetadata } from "astro";
import { getImage } from "astro:assets";

// MDX import stripping + MDX `<Image>` binding resolution. Both are
// applied unconditionally to .md twin output so consumers don't see
// raw MDX scaffolding when fetching the markdown version of an .mdx
// page.
//
// Glossary link resolution lives in resolveGlossaryLinksIfPresent —
// it dynamic-imports starlight-glossary and no-ops if it isn't
// installed, so this package can be used standalone.

// Eagerly import every image under the consumer's src/assets/. The path
// is absolute (rooted at the user's project) so Vite resolves it from
// the consumer project, not from this package.
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/**/*.{png,jpg,jpeg,webp,svg,gif}",
  { eager: true },
);
const imagesByFilename = new Map<string, ImageMetadata>();
for (const [path, mod] of Object.entries(imageModules)) {
  const filename = path.split("/").pop();
  if (filename) imagesByFilename.set(filename, mod.default);
}

const imageUrlCache = new Map<string, string>();
async function builtImageUrl(
  meta: ImageMetadata,
  key: string,
): Promise<string> {
  const cached = imageUrlCache.get(key);
  if (cached) return cached;
  const { src } = await getImage({ src: meta });
  imageUrlCache.set(key, src);
  return src;
}

/** Replace MDX `<Image src={Binding} alt="..."/>` components with markdown
 *  image syntax `![alt](url)`. Resolves the binding to the processed
 *  asset URL via Astro's getImage(), matching the URL Starlight's HTML
 *  emits for the same image. Falls back to `![alt]()` if the binding
 *  can't be resolved. */
export async function transformMdxImages(
  body: string,
  siteOrigin: string,
): Promise<string> {
  const bindingToFilename = new Map<string, string>();
  const importRe =
    /^\s*import\s+(\w+)\s+from\s+['"]([^'"]+\.(?:png|jpg|jpeg|webp|svg|gif))['"]\s*;?/gm;
  for (const match of body.matchAll(importRe)) {
    const binding = match[1] as string;
    const path = match[2] as string;
    const filename = path.split("/").pop();
    if (filename) bindingToFilename.set(binding, filename);
  }

  const imageRe =
    /<Image\b[^>]*\bsrc\s*=\s*\{(\w+)\}[^>]*\balt\s*=\s*["']([^"']*)["'][^>]*\/?>/g;
  const tasks: Array<{ full: string; to: string | Promise<string> }> = [];
  for (const match of body.matchAll(imageRe)) {
    const [full, binding, alt] = match as unknown as [string, string, string];
    const filename = bindingToFilename.get(binding);
    const meta = filename ? imagesByFilename.get(filename) : undefined;
    if (!meta || !filename) {
      tasks.push({ full, to: `![${alt}]()` });
      continue;
    }
    const urlPromise = builtImageUrl(meta, filename).then((src) => {
      const absolute = src.startsWith("http") ? src : siteOrigin + src;
      return `![${alt}](${absolute})`;
    });
    tasks.push({ full, to: urlPromise });
  }

  let out = body;
  for (const task of tasks) {
    const to = await task.to;
    out = out.replace(task.full, to);
  }
  return out;
}

/** Strip MDX `import ... from '...';` statements. Code-block contents
 *  (e.g. Swift `import CryptoKit`) are left untouched by tracking fence
 *  state. */
export function stripMdxImports(body: string): string {
  const lines = body.split("\n");
  const out: string[] = [];
  let fence: string | null = null;
  const mdxImport = /^import\s+.+\s+from\s+['"][^'"]+['"];?\s*$/;
  for (const line of lines) {
    const fenceMatch = line.match(/^(```+|~~~+)/);
    if (fenceMatch) {
      if (fence === null) fence = fenceMatch[1] as string;
      else if (line.trim().startsWith(fence)) fence = null;
      out.push(line);
      continue;
    }
    if (fence === null && mdxImport.test(line.trim())) continue;
    out.push(line);
  }
  return out.join("\n");
}

interface GlossaryModule {
  loadGlossaryMap: () => Promise<
    Map<string, { term: string; wikipedia: string | null }>
  >;
  resolveGlossaryLinks: (
    body: string,
    glossary: Map<string, { term: string; wikipedia: string | null }>,
    options: { siteOrigin: string },
  ) => string;
}

let glossary: {
  resolveGlossaryLinks: GlossaryModule["resolveGlossaryLinks"];
  map: Awaited<ReturnType<GlossaryModule["loadGlossaryMap"]>>;
} | null | undefined;

async function loadGlossaryOnce() {
  if (glossary !== undefined) return glossary;
  try {
    // Optional peer — resolved at runtime. If starlight-glossary isn't
    // installed (or glossary.json isn't on disk), the import or the
    // subsequent file read throws and we cache a null no-op result.
    // @ts-expect-error optional peer dependency
    const mod = (await import("starlight-glossary/transform")) as
      | GlossaryModule
      | undefined;
    if (!mod?.loadGlossaryMap || !mod?.resolveGlossaryLinks) {
      glossary = null;
      return null;
    }
    const map = await mod.loadGlossaryMap();
    glossary = { resolveGlossaryLinks: mod.resolveGlossaryLinks, map };
    return glossary;
  } catch {
    glossary = null;
    return null;
  }
}

/** Resolve `[label](glossary:slug)` references to real URLs (Wikipedia
 *  where available, otherwise the local /glossary anchor). No-op if
 *  starlight-glossary is not installed or its glossary.json is missing. */
export async function resolveGlossaryLinksIfPresent(
  body: string,
  siteOrigin: string,
): Promise<string> {
  const g = await loadGlossaryOnce();
  if (!g) return body;
  return g.resolveGlossaryLinks(body, g.map, { siteOrigin });
}

/** Apply the full transform pipeline used by `.md` twin / llms-*.txt
 *  routes: MDX `<Image>` → markdown, MDX `import` lines stripped,
 *  glossary references resolved (if starlight-glossary is present). */
export async function transformMarkdown(
  body: string,
  siteOrigin: string,
): Promise<string> {
  let out = body;
  out = await transformMdxImages(out, siteOrigin);
  out = stripMdxImports(out);
  out = await resolveGlossaryLinksIfPresent(out, siteOrigin);
  return out;
}
