# Changelog

All notable changes to `@wave-rf/starlight-llm-tools` are documented here. From
the next release onward this file is maintained automatically by
[release-please](https://github.com/googleapis/release-please) from
[Conventional Commit](https://www.conventionalcommits.org/) messages — don't
hand-edit it.

The entries below predate automated releases (they map to the `0.1.0`–`0.3.0`
git history, which was cut before release automation and carries no `vX.Y.Z`
tags).

## 0.3.0

- **feat:** exclude non-doc slugs (e.g. `404`) from the per-page `.md` twins, the `llms.txt` family, and the Copy-Markdown / Open-with-AI buttons.

## 0.2.0

- **refactor:** drop the virtual-module dependency and make the `starlight-glossary` integration truly optional — the plugin works standalone, resolving glossary links only when the peer is installed.

## 0.1.0

- Initial release: a Starlight plugin that emits per-page `.md` twins with navigation headers, `llms.txt` / `llms-full.txt` / `llms-small.txt` routes (ordered by your sidebar), and Copy-Markdown + Open-with-AI buttons in the page header, with an MDX-aware transform pipeline.
