import assert from "node:assert/strict";
import { test } from "node:test";
import { menuFocusTarget, triggerOpenTarget } from "../src/lib/menu-keys.ts";

const labels = ["Claude", "ChatGPT", "Cursor", "View as Markdown"];

test("trigger: ArrowDown opens on first, ArrowUp on last, others ignored", () => {
  assert.equal(triggerOpenTarget("ArrowDown", 4), 0);
  assert.equal(triggerOpenTarget("ArrowUp", 4), 3);
  assert.equal(triggerOpenTarget("a", 4), null);
  assert.equal(triggerOpenTarget("ArrowDown", 0), null);
});

test("ArrowDown/ArrowUp move and wrap", () => {
  assert.equal(menuFocusTarget("ArrowDown", 0, labels), 1);
  assert.equal(menuFocusTarget("ArrowDown", 3, labels), 0);
  assert.equal(menuFocusTarget("ArrowUp", 2, labels), 1);
  assert.equal(menuFocusTarget("ArrowUp", 0, labels), 3);
});

test("Home/End jump to the ends", () => {
  assert.equal(menuFocusTarget("Home", 2, labels), 0);
  assert.equal(menuFocusTarget("End", 1, labels), 3);
});

test("typeahead: next item starting with the character, wrapping, case-insensitive", () => {
  assert.equal(menuFocusTarget("c", 0, labels), 1); // Claude -> ChatGPT
  assert.equal(menuFocusTarget("c", 1, labels), 2); // ChatGPT -> Cursor
  assert.equal(menuFocusTarget("c", 2, labels), 0); // Cursor -> wraps to Claude
  assert.equal(menuFocusTarget("V", 0, labels), 3);
  assert.equal(menuFocusTarget("v", 3, labels), 3); // only match is current
  assert.equal(menuFocusTarget("z", 0, labels), null);
});

test("non-navigation keys and empty menus do nothing", () => {
  assert.equal(menuFocusTarget("Enter", 0, labels), null);
  assert.equal(menuFocusTarget("Tab", 0, labels), null);
  assert.equal(menuFocusTarget(" ", 0, labels), null);
  assert.equal(menuFocusTarget("ArrowDown", -1, []), null);
});

test("focus order from no focused item (-1)", () => {
  assert.equal(menuFocusTarget("ArrowDown", -1, labels), 0);
  assert.equal(menuFocusTarget("ArrowUp", -1, labels), 3);
});
