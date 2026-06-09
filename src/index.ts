import path from "node:path";
import { fileURLToPath } from "node:url";
import { sidebarSlugOrder } from "./lib/sidebar.ts";
import type {
  StarlightIntegrationAstroConfigSetupCtx,
  StarlightPlugin,
  StarlightSidebarConfig,
} from "./starlight-types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

export interface StarlightLlmToolsOptions {
  /** Site name for the llms.txt H1 and the system prompts in
   *  llms-{full,small}.txt. Defaults to the Starlight `title`. */
  title?: string;
  /** Description for the llms.txt blockquote. Defaults to the Starlight
   *  `description`. */
  description?: string;
  /** Where to inject the Copy-Markdown + Open-with-AI buttons.
   *
   *  - `"PageTitle"` (default): horizontal row above the article title.
   *  - `"PageSidebar"`: stacked vertically at the top of the right TOC sidebar.
   *  - `false`: don't override anything; consumers can render the
   *    components themselves. */
  injectInto?: "PageTitle" | "PageSidebar" | false;
  /** Fallback origin used by routes when `Astro.site` isn't set. Mainly
   *  useful for dev / preview. Defaults to `"http://localhost:4321"`. */
  siteOriginFallback?: string;
}

function flattenStarlightTitle(raw: string | Record<string, string> | undefined): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  // Locale-keyed object — pick the first available value.
  const first = Object.values(raw)[0];
  return typeof first === "string" ? first : "";
}

export default function starlightLlmTools(options: StarlightLlmToolsOptions = {}): StarlightPlugin {
  const injectInto = options.injectInto ?? "PageTitle";
  const siteOriginFallback = options.siteOriginFallback ?? "http://localhost:4321";

  return {
    name: "starlight-llm-tools",
    hooks: {
      "config:setup"({ addIntegration, config, updateConfig, logger }) {
        // Inject the chosen page-area override so users get the
        // Copy-Markdown / Open-with-AI buttons for free. We respect any
        // existing override the user already set — they win.
        if (injectInto !== false) {
          const componentPath = path.join(here, `components/${injectInto}.astro`);
          const existing = config.components ?? {};
          if (!existing[injectInto]) {
            updateConfig({
              components: { ...existing, [injectInto]: componentPath },
            });
          } else {
            logger.info(
              `${injectInto} override already set by another plugin or your astro.config; not overriding. Render the components from starlight-llm-tools/components/* yourself if you want them in your custom override.`
            );
          }
        }

        const sidebar = config.sidebar as StarlightSidebarConfig | undefined;
        const order = sidebarSlugOrder(sidebar);
        const title = options.title ?? flattenStarlightTitle(config.title);
        const description = options.description ?? config.description ?? "";

        const virtualSource =
          `export const sidebarOrder = ${JSON.stringify(order)};\n` +
          `export const title = ${JSON.stringify(title || "Documentation")};\n` +
          `export const description = ${JSON.stringify(description)};\n` +
          `export const siteOriginFallback = ${JSON.stringify(siteOriginFallback)};\n`;

        addIntegration({
          name: "starlight-llm-tools/integration",
          hooks: {
            "astro:config:setup"(astroCtx: StarlightIntegrationAstroConfigSetupCtx) {
              const { injectRoute, updateConfig: updateAstroConfig } = astroCtx;

              updateAstroConfig({
                vite: {
                  plugins: [
                    {
                      name: "starlight-llm-tools:virtual-config",
                      // Allow Vite's dev server to read this package's
                      // files (sits outside the user's project root).
                      configResolved(viteConfig: { server?: { fs?: { allow?: string[] } } }) {
                        if (!viteConfig.server) return;
                        if (!viteConfig.server.fs) return;
                        const allow = viteConfig.server.fs.allow;
                        if (!Array.isArray(allow)) return;
                        if (!allow.includes(here)) allow.push(here);
                      },
                      resolveId(id: string): string | undefined {
                        if (id === "virtual:starlight-llm-tools/config")
                          return "\0virtual:starlight-llm-tools/config";
                      },
                      load(id: string): string | undefined {
                        if (id === "\0virtual:starlight-llm-tools/config") return virtualSource;
                      },
                    },
                  ],
                },
              });

              injectRoute({
                pattern: "/[...slug].md",
                entrypoint: path.join(here, "routes/[...slug].md.ts"),
                prerender: true,
              });
              injectRoute({
                pattern: "/llms.txt",
                entrypoint: path.join(here, "routes/llms.txt.ts"),
                prerender: true,
              });
              injectRoute({
                pattern: "/llms-full.txt",
                entrypoint: path.join(here, "routes/llms-full.txt.ts"),
                prerender: true,
              });
              injectRoute({
                pattern: "/llms-small.txt",
                entrypoint: path.join(here, "routes/llms-small.txt.ts"),
                prerender: true,
              });
            },
          },
        });
      },
    },
  };
}

export type { StarlightLlmToolsOptions as Options };
