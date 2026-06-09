<!--
PR title MUST be Conventional Commits (the required `pr-title` check, and the
squash-merge subject release-please parses for the version bump):
  <type>(optional-scope)(optional-!): <lowercase subject, no trailing period>   (<= 72 chars)
  types: feat fix docs refactor test chore ci deps build perf revert style
  breaking change: add `!` (e.g. `feat!: …`) or a `BREAKING CHANGE:` body footer.
-->

## Summary

<!-- What changed and why. -->

## Test plan

<!-- How you verified it. `pnpm run verify` (Biome + tsc --noEmit) at minimum. -->

## Checklist

- [ ] `pnpm run verify` passes locally (Biome `check` + `tsc --noEmit`)
- [ ] Public surface changes (plugin options, the `…/lib` helper exports, route/component contracts) are reflected in the JSDoc **and** `README.md`
- [ ] Changed behavior of the `.md` twin / `llms.txt` family / transform pipeline is noted in the README
- [ ] New shapes typecheck against the `src/*.d.ts` shims (no leaning on `any`)
