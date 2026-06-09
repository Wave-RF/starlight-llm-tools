// Local shim for Starlight's plugin interface. The real
// `@astrojs/starlight/types` export transitively imports Astro-internal
// virtual modules that aren't resolvable outside an Astro build context,
// so typechecking this package against them fails under `tsc --noEmit`.
//
// This shim is structural: the runtime shape is still defined by Starlight
// — if the real interface changes, we'll find out at build or runtime in
// the consumer project.

export interface StarlightSidebarItem {
  label?: string;
  slug?: string;
  link?: string;
  collapsed?: boolean;
  items?: StarlightSidebarItem[];
}

export type StarlightSidebarConfig = StarlightSidebarItem[];

export interface StarlightIntegrationAstroConfigSetupCtx {
  injectRoute: (opts: { pattern: string; entrypoint: string; prerender?: boolean }) => void;
  injectScript: (stage: "page" | "before-hydration", content: string) => void;
  updateConfig: (patch: Record<string, unknown>) => void;
  config: {
    root: URL;
  } & Record<string, unknown>;
}

export interface StarlightPlugin {
  name: string;
  hooks: {
    "config:setup": (ctx: {
      addIntegration: (integration: unknown) => void;
      logger: {
        info: (msg: string) => void;
        warn: (msg: string) => void;
        error?: (msg: string) => void;
      };
      config: {
        sidebar?: StarlightSidebarConfig;
        components?: Record<string, string>;
        title?: string | Record<string, string>;
        description?: string;
      } & Record<string, unknown>;
      updateConfig: (
        patch: { components?: Record<string, string> } & Record<string, unknown>
      ) => void;
    }) => void | Promise<void>;
  };
}
