// Re-exports for consumers who want to assemble custom routes/components
// using the package's helpers without going through the auto-injected
// plugin route layer.

export {
  type DocEntry,
  docMdUrl,
  docTitle,
  docUrl,
  isOverviewPage,
  parentId,
  sortDocsBySidebar,
  titleFromId,
} from "./docs.ts";
export { pageContextHeader } from "./header.ts";
export { sidebarSlugOrder } from "./sidebar.ts";
export {
  resolveGlossaryLinksIfPresent,
  stripMdxImports,
  transformMarkdown,
  transformMdxImages,
} from "./transforms.ts";
