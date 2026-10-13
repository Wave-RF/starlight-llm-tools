# Contributing

Thanks for contributing to `@wave-rf/starlight-llm-tools`.

## Setup

```sh
pnpm install      # install from the committed pnpm-lock.yaml
pnpm run setup    # one-time: install the git hooks (pre-commit + pre-push)
```

`pnpm-lock.yaml` is committed, and CI and the release install with `--frozen-lockfile`, so they build exactly the dependency tree that was tested. The lockfile doesn't affect consumers, who resolve with their own. A dependency PR that changes `package.json` must update the lockfile too. `pnpm-workspace.yaml` sets `minimumReleaseAge` (7 days): a freshly published version can't be installed until it has aged, except `@wave-rf/*` and `@wavehouse/*`.

Node ≥ 18 is the consumer floor (`package.json` `engines`); the toolchain itself
runs on Node 24 (pnpm 11 needs ≥ 22.13 — see `.nvmrc`). The package is pure ESM
and **ships its `src/` raw** — there is no build step. Consumers compile the
TypeScript through their own Astro/Vite pipeline.

## Develop

```sh
pnpm run typecheck   # tsc --noEmit (type safety against the local Astro/Starlight shims)
pnpm run check       # Biome lint + format check (what CI runs)
pnpm run format      # auto-fix formatting
pnpm run verify      # check + typecheck + tests + the release-config check (the local gate; what the hooks run)
```

Biome owns JS/TS/JSON style. `.astro` single-file components aren't parsed by
Biome (their embedded `<style>`/`<script>` are hand-tuned and out of scope); the
TypeScript in them is exercised by the consumer's build, not by `tsc --noEmit`
here. Tests are `node --test` over `test/` (the dropdown's keyboard logic and markup); `tsc --noEmit` plus review guard the rest. See
[AGENTS.md §Key Invariants](AGENTS.md#key-invariants) for what must stay true
(standalone-first / optional glossary, deterministic sidebar ordering, the MDX
transform contract, non-doc-slug exclusion, respecting consumer overrides).

## Pull requests

- **Title must be [Conventional Commits](https://www.conventionalcommits.org/):** `<type>(scope): subject`, ≤ 72 chars, lowercase subject, no trailing period. Types: `feat fix docs refactor test chore ci deps build perf revert style`. A breaking change uses `feat!:` (or a `BREAKING CHANGE:` body footer). The title becomes the squash-merge commit and **drives the version bump** — check it with `scripts/lint-pr-title.sh "<title>"`.
- Run `pnpm run verify` before pushing; the pre-push hook requires it.
- Update the public API's JSDoc + `README.md` when you change the public surface (the `starlightLlmTools` options, the `…/lib` helper exports, route/component contracts) — see [AGENTS.md §Documentation Sync](AGENTS.md#documentation-sync). **Don't** hand-edit `CHANGELOG.md` — it is frozen history; release notes are generated from commit messages into GitHub Releases.
- PRs merge via **squash**; required checks (`ci`, `pr-title`) must pass.

## Releases

Automated on merge — you don't bump versions or tag by hand. Your PR title decides whether merging it releases: `fix`/`perf`/`revert` → patch, `feat` → minor, `!`/`BREAKING CHANGE` → major, and `deps`/`ci`/`chore`/`docs`/`test`/`refactor`/`build`/`style` → no release. Maintainers: see [RELEASING.md](RELEASING.md).
