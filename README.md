# @wave-rf/starlight-llm-tools

A [Starlight](https://starlight.astro.build/) plugin that adds LLM-friendly tooling to your docs site. Drop it into your `astro.config.mjs` and you get:

- **Per-page `.md` twin** — every doc is also served as raw markdown at `<path>.md`, with a navigation header (Section / Subpages / Related / HTML version).
- **`llms.txt` manifest** + **`llms-full.txt`** + **`llms-small.txt`** — built per the [llmstxt.org](https://llmstxt.org) spec, ordered by your sidebar.
- **Copy-Markdown button** + **Open-with-AI dropdown** (Claude / ChatGPT / Cursor) — auto-injected into every page's `PageTitle` slot.
- **MDX-aware transforms** — strips MDX `import` lines and resolves `<Image src={Binding} />` references to real built asset URLs in the markdown output.
- **Optional [starlight-glossary](https://github.com/Wave-RF/starlight-glossary) integration** — when present, `[label](glossary:slug)` references in the markdown output are resolved to real Wikipedia / glossary URLs.

Pair it with [`cloudflare-md-router`](https://github.com/Wave-RF/cloudflare-md-router) on Cloudflare Workers and the same URL serves the HTML page to humans and the `.md` twin to LLM crawlers, transparently.

## Install

```sh
pnpm add @wave-rf/starlight-llm-tools
```

`starlight-glossary` is an optional peer — install it too if you want
`[label](glossary:slug)` links resolved (the plugin no-ops without it):

```sh
pnpm add starlight-glossary
```

## Use

```js
// astro.config.mjs
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmTools from "@wave-rf/starlight-llm-tools";

export default defineConfig({
  site: "https://docs.example.com",
  integrations: [
    starlight({
      title: "My Docs",
      description: "Optional — used for the llms.txt blockquote.",
      sidebar: [
        // your sidebar config — used to order docs in llms.txt and friends
      ],
      plugins: [starlightLlmTools()],
    }),
  ],
});
```

That's it. Build the site and you'll have:

- `<host>/<path>.md` for every doc page
- `<host>/llms.txt` — manifest with grouped section links
- `<host>/llms-full.txt` — every page concatenated (sidebar order)
- `<host>/llms-small.txt` — overview pages only (home + any doc with children)
- Copy-Markdown + Open-with-AI buttons in every page's title area

## Options

```ts
starlightLlmTools({
  // Site name for llms.txt H1 / system prompts.
  // Default: Starlight's `title`.
  title: "My Docs",

  // Description for the llms.txt blockquote.
  // Default: Starlight's `description`.
  description: "Internal documentation for FooCorp",

  // Where to inject the Copy-Markdown / Open-with-AI buttons.
  //   "PageTitle" (default) → horizontal row above the article title.
  //   "PageSidebar"         → stacked vertically at the top of the right TOC sidebar.
  //   false                 → don't inject anything; render the components yourself.
  injectInto: "PageTitle",

  // Fallback origin used by routes when Astro.site isn't set
  // (only matters in dev/preview). Default: "http://localhost:4321".
  siteOriginFallback: "http://localhost:4321",
});
```

If another plugin (or your own astro config) has already set the same component override, the plugin logs a message and leaves your override untouched. To still get the buttons, render `CopyMarkdown.astro` and `LlmDropdown.astro` from `@wave-rf/starlight-llm-tools/components/` inside your override.

## How it works

The plugin registers an Astro integration that:

1. Injects four prerendered routes — `/[...slug].md`, `/llms.txt`, `/llms-full.txt`, `/llms-small.txt`.
2. Publishes a `virtual:starlight-llm-tools/config` Vite module containing your sidebar slug order, title, and description so the routes don't need to re-import your config.
3. Sets a Starlight `PageTitle` (or `PageSidebar`) override that renders the Copy-Markdown button + Open-with-AI dropdown above the page title.

Source-level transforms run on every `.md` output:

| Transform           | What it does |
| ------------------- | ------------ |
| MDX `<Image>`       | Resolves `<Image src={binding} alt="..." />` to `![alt](url)` using Astro's `getImage()`, matching the URL the HTML page emits. |
| MDX `import` lines  | Strips top-of-file MDX scaffolding imports (code-block contents are preserved by tracking fence state). |
| Glossary references | If `starlight-glossary` is installed, `[label](glossary:slug)` becomes a real link via the plugin's `transform` export (which reads `glossary.json` from the project root). No-op otherwise. |

## Page navigation header

Each `.md` twin starts with a short navigation block so an LLM landing on a single page knows where to look next:

```md
# Routing Logic

> **Section:** [System 2: Router](https://docs.example.com/wavenet/router.md)
> **Related:** [Identity](https://docs.example.com/wavenet/router/identity.md) · [Packet Structure](https://docs.example.com/wavenet/router/packet-structure.md) · [Reliability](https://docs.example.com/wavenet/router/reliability.md)
> **Also:** [HTML version](https://docs.example.com/wavenet/router/routing-logic) · [Docs index](https://docs.example.com/llms.txt)

---

<page body>
```

## Helper exports

For consumers who want to assemble custom routes or components without going through the plugin layer:

```ts
import {
  sidebarSlugOrder,
  sortDocsBySidebar,
  isOverviewPage,
  docTitle,
  docMdUrl,
  docUrl,
  pageContextHeader,
  transformMarkdown,
  stripMdxImports,
  transformMdxImages,
  resolveGlossaryLinksIfPresent,
} from "@wave-rf/starlight-llm-tools/lib";
```

## Compatibility

- Astro `>=5.0`
- Starlight `>=0.36`
- Optional: `starlight-glossary` (any 1.x)

## License

MIT — see [LICENSE](./LICENSE).
