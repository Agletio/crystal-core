/**
 * Mounts the generated UI fixtures as `--fix-<id>` custom properties, once at
 * boot — the stylesheet applies them as border-image 9-slices and backgrounds.
 * They are runtime properties on purpose: a data URI written into the
 * stylesheet would make `docs/index.html` a file two writers own, which this
 * repo has been burned by twice. `tools/theme-check.mjs` knows the prefix.
 */
import { UI_FIXTURES } from '../render/generated-ui';

export function mountFixtures(): void {
  const root = document.documentElement.style;
  for (const [id, art] of Object.entries(UI_FIXTURES)) {
    root.setProperty(`--fix-${id}`, `url("${art.png}")`);
  }
}
