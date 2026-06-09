// Prints the content-addressed dev version used by the `@dev` dist-tag publish
// in .github/workflows/publish-npm.yml:
//
//   0.0.0-dev.h<sha256(published src/ tree + package.json sans version)[:12]>
//
// `0.0.0-dev.*` always sorts below any real `0.x` release and lives on its own
// dist-tag, so a `^0.3.0` consumer can never resolve to it. The hash is over the
// shipped CONTENT — every file under src/ (the `files` allowlist ships `src/`
// raw, with no build step) plus package.json with `version` removed — so an
// unchanged tree maps to an already-published version and the workflow skips it.
//
// We walk src/ recursively rather than hardcoding a file list, so a newly added
// source file (route, component, lib helper) is hashed automatically. README.md
// and LICENSE are in `files` too but are docs/legal, not shipped code that
// changes consumer behavior — the `@dev` channel tracks code, mirroring the
// content-addressing intent (matches the package's actual consumable surface,
// src/, which is what `tsc`/Vite compile in the consumer).
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const SRC_DIR = "src";

// Deterministic depth-first walk: sort entries at every level so the hash is
// stable across filesystems/platforms (readdir order is not guaranteed).
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  )) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const h = createHash("sha256");
// Use POSIX-style relative paths in the hash input so the key is identical on
// Windows and *nix (path.join uses the platform separator).
for (const file of walk(SRC_DIR)) {
  const rel = file.split(path.sep).join("/");
  h.update(`${rel}\0`);
  h.update(readFileSync(file));
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
delete pkg.version;
h.update("package.json\0");
h.update(JSON.stringify(pkg));

process.stdout.write(`0.0.0-dev.h${h.digest("hex").slice(0, 12)}`);
