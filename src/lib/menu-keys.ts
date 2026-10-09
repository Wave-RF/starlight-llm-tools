/**
 * Pure keyboard logic for the "Open with AI" menu button (WAI-ARIA APG "Menu
 * Button" pattern). No DOM access, so it is unit-testable under plain Node;
 * `components/LlmDropdown.astro` applies the results to the real elements.
 */

/** Which item to focus when a key opens the menu from the trigger button. */
export function triggerOpenTarget(key: string, itemCount: number): number | null {
  if (itemCount <= 0) return null;
  if (key === "ArrowDown") return 0;
  if (key === "ArrowUp") return itemCount - 1;
  return null;
}

/**
 * The index to focus after `key` is pressed while item `current` has focus, or
 * `null` when the key does not move focus (the caller then leaves it alone).
 * ArrowDown/ArrowUp wrap, Home/End jump to the ends, and a single printable
 * character jumps to the next item whose label starts with it (case-insensitive,
 * wrapping, starting after `current`).
 */
export function menuFocusTarget(
  key: string,
  current: number,
  labels: readonly string[]
): number | null {
  const count = labels.length;
  if (count === 0) return null;
  switch (key) {
    case "ArrowDown":
      return (current + 1) % count;
    case "ArrowUp":
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
  }
  if ([...key].length !== 1 || key.trim() === "") return null;
  const needle = key.toLocaleLowerCase();
  for (let step = 1; step <= count; step++) {
    const index = (current + step) % count;
    if (labels[index].trim().toLocaleLowerCase().startsWith(needle)) return index;
  }
  return null;
}
