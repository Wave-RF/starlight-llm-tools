// Shim Astro's virtual modules so the package typechecks standalone.
// Consumers run inside a real Astro build where the actual modules are
// generated, so the structural types here are only for `tsc --noEmit`
// in this repo's CI.

declare module "astro:content" {
  export interface CollectionEntry<_T extends string> {
    id: string;
    body?: string;
    data: { title?: string; description?: string } & Record<string, unknown>;
  }
  export function getCollection<T extends string>(name: T): Promise<CollectionEntry<T>[]>;
}

declare module "astro:assets" {
  import type { ImageMetadata } from "astro";
  export function getImage(opts: { src: ImageMetadata }): Promise<{ src: string }>;
}

interface ImportMeta {
  glob<T = unknown>(pattern: string, options?: { eager?: boolean }): Record<string, T>;
}
