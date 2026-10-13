# AGENTS.md — AI agent instructions for `@wave-rf/starlight-llm-tools`

Context for AI coding agents (Claude Code, Copilot, Cursor, etc.) working on this repo. `CLAUDE.md` is a thin pointer here.

## Operating Rules

The non-negotiables, ordered by how often agents miss them. These override convenience: if a rule blocks you, satisfy it; don't work around it.

1. **Validate locally before every push** — `pnpm run verify` (Biome `check` + `tsc --noEmit` + `node --test` + the offline release-config check). Don't use CI as your first feedback loop ([§Local-First Validation](#local-first-validation)).
2. **A PR-branch push needs every pre-push reviewer satisfied** — run **`/prepush`**: it reads `scripts/pre-push-reviewers.sh`, runs the reviewers the change needs in parallel (fresh context), skips the rest *on the record*, and loops until each it ran returns `ship_it` ([§Agent PR Discipline](#agent-pr-discipline)).
3. **Every public-surface change updates its docs in the same PR** — a changed `starlightLlmTools` option / `…/lib` export / route or component contract must update its **JSDoc** **and** `README.md` ([§Documentation Sync](#documentation-sync)). Release notes are **generated into GitHub Releases** (`CHANGELOG.md` is frozen history) — don't hand-edit it; just use the right Conventional-Commit type, because it decides whether the merge releases ([§Release Process](#release-process)).
4. **Address and resolve every review finding** — fix it or track it in an issue; never silently drop one ([§Review Response](#review-response)).
5. **Drafts only; valid title** — `gh pr create --draft` (never `gh pr ready`/approve); the PR **title** must pass Conventional Commits — check with `scripts/lint-pr-title.sh "<title>"` before creating ([§Agent PR Discipline](#agent-pr-discipline)).
6. **Never force-push or rebase a PR branch** — to absorb upstream, `git merge origin/main` ([§Branch Maintenance](#branch-maintenance)).
7. **Never hand-write markers or `--no-verify`** — if you're tempted, the gate is wrong-shaped for your situation; fix that instead ([§Don't bypass the gates](#dont-bypass-the-gates)).

## Project Overview

A **Starlight plugin** (pure ESM) that adds LLM-friendly tooling to a docs site. It's a `StarlightPlugin` whose `config:setup` hook (a) injects a `PageTitle`/`PageSidebar` component override carrying the Copy-Markdown + Open-with-AI buttons, and (b) registers an Astro integration that injects four prerendered routes and publishes a `virtual:starlight-llm-tools/config` Vite module.

At the consumer's **build time** it emits:

- a per-page **`.md` twin** for every doc (`/[...slug].md`), prefixed with a navigation header (Section / Subpages / Related / HTML version);
- the **`llms.txt`** manifest plus **`llms-full.txt`** (every page) and **`llms-small.txt`** (overview pages only), per [llmstxt.org](https://llmstxt.org), ordered by the consumer's sidebar;
- **Copy-Markdown** + **Open-with-AI** UI in the page header.

There is **no build step**: the package **ships its `src/` raw** (the `files` allowlist is `src/`, `README.md`, `LICENSE`); the consumer's Astro/Vite pipeline compiles the TypeScript and `.astro` components. There is **no runtime server or auth surface** — every injected route is `prerender: true` (static output) — and the only build-time IO is Astro's `getImage()` and an optional read of `starlight-glossary`'s data.

The default export `starlightLlmTools(options)` returns the `StarlightPlugin`. A secondary entry, `@wave-rf/starlight-llm-tools/lib`, re-exports the building-block helpers (`sidebarSlugOrder`, `sortDocsBySidebar`, `isOverviewPage`, `docTitle`, `docMdUrl`, `pageContextHeader`, `transformMarkdown`, …) for consumers who want to assemble custom routes/components.

## Key Invariants

What must stay true. Preserve the named invariant when you touch its code. There is no automated test suite today — `tsc --noEmit` plus review is the guard, so a change near one of these needs extra scrutiny (and is a good candidate for the repo's first test).

1. **Standalone-first; `starlight-glossary` is an OPTIONAL peer.** `resolveGlossaryLinksIfPresent` (`src/lib/transforms.ts`) **dynamic-imports** `starlight-glossary/transform` inside a `try`, memoizes the result, and **no-ops** (returns the body unchanged) when the peer isn't installed or its `glossary.json` is missing. A missing optional peer must **never** throw or fail the consumer's build. Don't hoist that import to module top-level; don't promote the glossary to a hard dependency. (`peerDependenciesMeta.starlight-glossary.optional` must stay `true`.)
2. **MDX transforms are surgical and order-fixed.** `transformMarkdown` runs, in order: `transformMdxImages` → `stripMdxImports` → `resolveGlossaryLinksIfPresent`. `stripMdxImports` strips top-of-file MDX `import … from "…";` lines **but must leave imports inside fenced code blocks untouched** (it tracks ` ``` `/`~~~` fence state — a regression corrupts code samples like a Swift `import CryptoKit`). `transformMdxImages` resolves `<Image src={binding} alt="…"/>` to `![alt](url)` via Astro's `getImage()` so the URL matches the HTML page; an unresolvable binding falls back to `![alt]()`, never crashes.
3. **Output ordering is deterministic.** `sortDocsBySidebar` orders docs by the sidebar slug list; docs **not** in the sidebar fall through to the end **alphabetized** — so output is stable even with sidebar gaps. `sidebarSlugOrder` walks the sidebar tree in order and skips link-only (non-doc) items. Don't make ordering depend on collection/filesystem iteration order.
4. **Non-doc slugs are excluded everywhere.** `isLlmDoc` / `NON_DOC_SLUGS` (e.g. `404`) gate the `.md` twins, the whole `llms.txt` family, and the buttons (`PageTitle`/`PageSidebar` also skip `index` and non-LLM docs). Any new output path must apply the same filter, or error/utility pages leak into LLM artifacts.
5. **Hierarchy helpers are the spine.** `parentId` (with `index` as the implicit root) and `isOverviewPage` (home, plus any doc that has children) drive the per-page nav header (`pageContextHeader`) and `llms-small.txt`. Off-by-one in the `id` splitting mis-nests every header.
6. **Respect the consumer's component override.** `config:setup` injects the `PageTitle`/`PageSidebar` override **only if the user hasn't already set one** (otherwise it logs via `logger.info` and backs off). `injectInto: false` is a true no-op. Don't clobber a user override.
7. **Build-time, prerendered route contract.** All four injected routes set `prerender: true`. The `virtual:starlight-llm-tools/config` module carries the sidebar order + title + description so the routes don't re-import the user's config; the Vite plugin must keep this package's directory in `server.fs.allow` (the dev server reads files outside the project root). Title/description fall back to Starlight's `config.title`/`config.description`; a locale-keyed title object is flattened to its first value.
8. **Standalone type-checking via local shims.** `src/astro-shims.d.ts`, `src/starlight-types.d.ts`, and `src/virtual.d.ts` structurally declare the Astro/Starlight virtual modules that aren't resolvable under `tsc --noEmit`. Extend these **structurally** when you need a new bit of that surface — don't reach for `any`/`@ts-ignore`. The one sanctioned `@ts-expect-error` is the optional-peer glossary import.
9. **ESM + Node ≥ 18** (`package.json` `engines`, the consumer floor) — no CommonJS, no syntax/APIs newer than the floor. The package ships raw `src/`, so there's no build to mask an incompatibility.

## Build & Test Commands

```bash
pnpm install            # install from the committed pnpm-lock.yaml (CI uses --frozen-lockfile)
pnpm run setup          # one-time: install git hooks (git config core.hooksPath .githooks)
pnpm run typecheck      # tsc --noEmit — the type-safety gate
pnpm run check          # biome check . (lint + format check) — the CI gate
pnpm run format         # biome format --write . (auto-fix formatting)
pnpm run lint           # biome lint .
pnpm run verify         # biome check . && tsc --noEmit && pnpm run test && pnpm run check:release, then write the tree marker
pnpm run check:release  # offline: semantic-release analyzer + notes generator vs .releaserc.json
```

**Dependencies are locked and aged.** `pnpm-lock.yaml` is committed; CI and the release build use `pnpm install --frozen-lockfile`, so they get exactly the tree that was tested (the lockfile doesn't reach consumers, who resolve with their own). `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days, `@wave-rf/*` and `@wavehouse/*` exempt) and Dependabot has a matching 7-day `cooldown`. Third-party GitHub Actions are pinned by commit SHA with a `# vX.Y.Z` comment.

Biome owns JS/TS/JSON formatting + lint. `.astro` files aren't parsed by Biome (Astro single-file components are out of its scope), so their embedded `<style>`/`<script>` stay hand-tuned; their TypeScript is exercised by the consumer's build, not `tsc --noEmit` here. Run `pnpm run format` to fix formatting; the Claude format-on-save hook keeps edited JS/TS/JSON files clean automatically.

## Local-First Validation

**Validate locally before pushing.** `pnpm run verify` runs the same gates as CI (Biome `check` + `tsc --noEmit` + `node --test` + the offline release-config check). On success it writes the tree-keyed marker `tmp/verify-passed-tree-<TREE>` (`tmp/` is gitignored).

Enforced via git hooks (installed by `pnpm run setup`; apply to humans and agents alike):

- **`.githooks/pre-commit`** runs `pnpm run verify` unless the current tree's marker already exists (cached).
- **`.githooks/pre-push`** requires `tmp/verify-passed-tree-<TREE>` for each pushed commit's tree. Tree-keyed, so `verify → commit → push` needs no re-run when the tree is unchanged. Skipped on CI (`$CI` set).

Bypass (`--no-verify`) is for human WIP only; agents must not (§Don't bypass the gates).

## Release Process

**Releases happen on merge**, driven by [semantic-release](https://semantic-release.org) (`.releaserc.json`, run by `publish-npm.yml` on every push to `main`). There is no release PR, no version bump commit and no token: the git tag `vX.Y.Z` is the version's source of truth, and GitHub Releases hold the notes. **The squash-merge title (a Conventional Commit, already enforced by the required `pr-title` check) decides whether the merge releases:**

| Title type | Release |
| ---------- | ------- |
| `fix` `perf` `revert` | patch |
| `feat` | minor |
| `!` on any type, or a `BREAKING CHANGE:` footer | **major** (no 0.x shielding) |
| `deps` `ci` `chore` `docs` `test` `refactor` `build` `style` | none |

- Dependabot titles are `deps:` / `ci:`, so they never release. A **runtime** dependency bump that should ship must be retitled `fix(deps): ...` before merge.
- `package.json` `version` is the placeholder `0.0.0-development`; semantic-release sets the real version in the CI workspace only. **Never bump it, never create tags by hand, never hand-edit `CHANGELOG.md`** (frozen history up to 0.3.1; newer notes are GitHub Releases).
- The workflow runs `pnpm run verify` first, so a red `main` never releases. If a release fails, semantic-release opens a "release failed" issue; fix the cause and re-run the failed run. Caveat: semantic-release pushes the tag *before* publishing, so a failure after that point needs the tag deleted first (see RELEASING.md §Failures).
- Use **`/release`** to see what the next merge would release. **Full detail** (re-runs, forcing a patch, failure handling, first-publish and trusted-publisher setup) lives in [`RELEASING.md`](RELEASING.md).

## Review Response

Every review finding gets a substantive reply and is addressed — fixed, or tracked in an issue — before merge. Decide: accept, push back (with reasoning), or defer (open a tracking issue and link it). Never silently drop a finding, including ones outside the lane of whichever reviewer raised it. Bot reviewers (if configured) re-engage via their own trigger (e.g. `@coderabbitai review` in a PR comment — `gh pr comment` is allowed for agents).

## Branch Maintenance

To absorb upstream `main` into a PR branch — **merge, don't rebase**:

```bash
git fetch origin main
git merge origin/main --no-edit
```

Force-pushes (`--force`, `--force-with-lease`) are blocked by `.claude/settings.json` and by branch protection, and would lose inline review-thread anchors. Rebase requires a force-push, so it's wrong for the same reason. The `pre-push` hook will block until `pnpm run verify` re-runs after the merge (the merge commit's tree is new) — that's intended. If the merge conflicts, surface it to a human rather than auto-resolving.

## Agent PR Discipline

Agents follow the universal git hooks (pre-commit + pre-push in `.githooks/`). On top of that, PR-workflow rules with no human analog are checked by `.claude/hooks/agent-bash-gate.sh`. The gate is a guard rail against accidents, not adversarial enforcement.

### Drafts only

Create PRs with `gh pr create --draft`. Only humans flip draft → ready (`gh pr ready` is blocked) and only humans approve / request changes (`gh pr review --approve`/`--request-changes` are blocked). Adding/removing human reviewers is humans-only.

**PR title format** — the title becomes the squash-merge subject on `main` (which semantic-release parses to decide the release), and is gated by the required `pr-title` check. Conventional Commits: `<type>(optional-scope)(optional-!): <subject>`, **≤ 72 chars**, subject lowercase-first, no trailing period. Types: `feat fix docs refactor test chore ci deps build perf revert style`. Validate before creating: `scripts/lint-pr-title.sh "<title>"`. The same script backs the local gate and the CI check, so they never drift.

### Pre-push self-review is mandatory on PR branches

Before pushing a non-main branch, **every** reviewer in `scripts/pre-push-reviewers.sh` must have a marker for HEAD — earned by **running** it (fresh context; writes its marker on `VERDICT: ship_it`) or by a **logged skip** (`scripts/skip-pre-push-review.sh <name> "<reason>"`) when it's genuinely out of lane. The list is the single source of truth — read it; don't hardcode it. The one-command form is **`/prepush`**. Today the gating reviewers are:

- **`pre-push-reviewer`** (code) — the full diff vs `main`, the latest commit, open PR comments/reviews, CI status, linked issues.
- **`docs-reviewer`** (docs) — `README.md`/`CONTRIBUTING.md`/the public-API JSDoc for accuracy-vs-code, runnable examples, clarity, **plus** code↔docs sync (code that changed but whose docs didn't).

**`ship_it` requires zero findings at any severity** — a single `[MAY]` forces `iterate`. The orchestrator loops: address every finding, commit, re-invoke the reviewer(s) in fresh context, until all say `ship_it`. The push gate (`agent-bash-gate.sh`) lists any missing markers; `git push` succeeds only when every listed reviewer has one. On `block`, stop and surface it to the user.

### Adding a pre-push reviewer

The set is meant to grow (security is the obvious next). With **no** hook edits (they read the list at push time):

1. Write the subagent at `.claude/agents/<name>.md` (model it on `pre-push-reviewer.md`; end with the parseable `VERDICT: ship_it|iterate|block` line under the same strict rubric).
2. Add `<name>` to `scripts/pre-push-reviewers.sh` — *after* step 1 (a name with no agent file blocks every push until it exists).

The marker `tmp/<name>-passed-<HEAD>` is then required automatically, `review-marker.sh` writes it on `ship_it`, and `/prepush` launches it alongside the rest.

### Don't bypass the gates

- `--no-verify` is for human WIP; agents don't use it.
- Markers are written by tooling, never by hand: `tmp/verify-passed-tree-*` by `pnpm run verify`; `tmp/<reviewer>-passed-*` by the `review-marker.sh` SubagentStop hook on `ship_it`, or by `scripts/skip-pre-push-review.sh` for a deliberately-skipped reviewer (which logs the reason). Don't `touch`/`Write`/`Edit` a marker. To skip, use the skip command so it's recorded.

These are policy, not mechanically enforced — an agent can edit the gate itself. Trust beats whack-a-mole.

## Documentation Sync

Every change to the public surface updates its docs in the same PR:

| Change | Files to update |
| ------ | --------------- |
| Add/modify a `starlightLlmTools` option or its default | `src/index.ts` (the `StarlightLlmToolsOptions` type + JSDoc), `README.md` (Options + relevant section) |
| Add/modify a `…/lib` helper export | `src/lib/index.ts` + the helper's JSDoc, `README.md` (Helper exports) |
| Change what a route emits (`.md` twin header, `llms.txt` grouping, full/small) | `README.md` (How it works / nav-header example) |
| Change the package name / `exports` / `files` / `engines` / peer deps | `README.md` (Install + Compatibility), `package.json` |
| Any change | a Conventional-Commit PR title — it becomes the squash commit and decides the release (see `RELEASING.md`); release notes go to GitHub Releases |

Before finishing, grep the identifiers you touched (option names, helper names) across `README.md` / `src/` to catch staleness. Prose quality + code↔docs sync are gated by the `docs-reviewer`.

## Worktree workflow (`wt`)

This repo is set up for [Worktrunk](https://github.com/) (`wt`, config in `.config/wt.toml`): `wt switch --create <branch>` seeds `node_modules/` from main (per `.worktreeinclude`), runs `pnpm install`, and installs the git hooks (`pnpm run setup`). `.worktrees/` is gitignored. `wt` is an external tool (install it separately); without it, the manual equivalent is `git worktree add` + `pnpm install` + `pnpm run setup`.

## File Structure

```text
src/index.ts                  → the StarlightPlugin factory (options, config:setup, integration + virtual-config wiring)
src/lib/index.ts              → public helper re-exports (the `…/lib` entry point)
src/lib/docs.ts               → doc-collection helpers: isLlmDoc/NON_DOC_SLUGS, titles, URLs, parentId, sort, isOverviewPage
src/lib/sidebar.ts            → sidebarSlugOrder — walk the Starlight sidebar tree into a slug order
src/lib/header.ts             → pageContextHeader — the per-page .md nav block
src/lib/transforms.ts         → MDX <Image>/import transforms + optional-glossary resolution
src/routes/[...slug].md.ts    → per-page .md twin route (prerendered)
src/routes/llms{,-full,-small}.txt.ts → the llms.txt family (prerendered)
src/components/*.astro         → CopyMarkdown / LlmDropdown buttons + PageTitle / PageSidebar overrides
src/*.d.ts                     → local type shims (astro:content, astro:assets, Starlight plugin, the virtual config)
scripts/                       → shell + node tooling (PR-title lint, reviewer manifest, markers, release-config check, repo setup)
.githooks/                     → universal pre-commit + pre-push (installed via pnpm run setup)
.claude/                       → settings, review subagents, /prepush + /release commands, gate/marker/format hooks
.github/                       → CI, pr-title, publish (semantic-release + OIDC), dependabot; prompts/ review rubrics
.releaserc.json                → semantic-release config (release rules, plugins)
```

## CI / Automation

- **`ci.yml`** — Biome `check` + `tsc --noEmit` + `node --test` + the offline release-config check (`pnpm run check:release`) on every PR/push (Node 24; pnpm 11 needs ≥ 22.13, so CI doesn't run on the package's declared `engines` floor — that documents the consumer floor).
- **`pr-title.yml`** — Conventional-Commit title check (required; skipped for `dependabot[bot]`).
- **`publish-npm.yml`** — release on merge: every push to `main` runs `verify`, then semantic-release, which tags `vX.Y.Z`, publishes to npm via OIDC with provenance, and creates the GitHub Release — or does nothing if no commit warrants a release. ONE file (npm allows one trusted-publisher filename per package).
- **`dependabot.yml` + `dependabot-automerge.yml`** — weekly grouped dep/action bumps; patch/minor auto-merge after CI, major held for review.
- Third-party actions are pinned to commit SHAs with version comments where verified (`dependabot/fetch-metadata` is on a major tag pending a SHA pin).
