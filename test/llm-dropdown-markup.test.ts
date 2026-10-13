import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The component is shipped raw, so assert on its template source: strip the
// frontmatter, <script> and <style>, and neutralise `{expressions}`.
const source = readFileSync(
  new URL("../src/components/LlmDropdown.astro", import.meta.url),
  "utf8"
);
const markup = source
  .replace(/^---[\s\S]*?---/, "")
  .replace(/<script>[\s\S]*?<\/script>/, "")
  .replace(/<style>[\s\S]*?<\/style>/, "")
  .replace(/=\{`[^`]*`\}/g, '="https://example.test/"')
  .replace(/=\{[^}]*\}/g, '="/x.md"');

const tags = (re: RegExp) => [...markup.matchAll(re)].map((m) => m[0]);

test("trigger is a button with the menu-button attributes", () => {
  const [button] = tags(/<button[\s\S]*?>/g);
  assert.match(button, /type="button"/);
  assert.match(button, /aria-haspopup="menu"/);
  assert.match(button, /aria-expanded="false"/);
  assert.match(button, /aria-controls="sllm-menu"/);
  assert.match(button, /id="sllm-trigger"/);
});

test("menu has role=menu, is named by the button, and starts hidden", () => {
  const [ul] = tags(/<ul[\s\S]*?>/g);
  assert.match(ul, /role="menu"/);
  assert.match(ul, /id="sllm-menu"/);
  assert.match(ul, /aria-labelledby="sllm-trigger"/);
  assert.match(ul, /\shidden(\s|>)/);
});

test("every link is a roving-tabindex menuitem inside a role=none li", () => {
  const anchors = tags(/<a\b[\s\S]*?>/g);
  assert.equal(anchors.length, 4);
  for (const a of anchors) {
    assert.match(a, /role="menuitem"/);
    assert.match(a, /tabindex="-1"/);
  }
  assert.equal(tags(/<li role="none">/g).length, 4);
  assert.match(markup, /<li class="sllm-divider" role="separator">/);
});
