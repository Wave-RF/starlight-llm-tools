import type {
  StarlightSidebarConfig,
  StarlightSidebarItem,
} from "../starlight-types.js";

/** Walk a Starlight sidebar config tree and return the slugs of every
 *  doc reference in the order they appear. Items with only a `link`
 *  (external URLs / non-doc routes) are skipped. */
export function sidebarSlugOrder(
  sidebar: StarlightSidebarConfig | undefined,
): string[] {
  const out: string[] = [];
  if (!sidebar) return out;
  const walk = (items: StarlightSidebarItem[]): void => {
    for (const item of items) {
      if (typeof item.slug === "string") out.push(item.slug);
      if (Array.isArray(item.items)) walk(item.items);
    }
  };
  walk(sidebar);
  return out;
}
