# Repository Guidelines

## Project Overview

A personal collection of standalone plugins and CSS themes for the **Typora** Markdown editor. Plugins target the [typora-community-plugin](https://github.com/typora-community-plugin/typora-community-plugin) ecosystem and are loaded directly by Typora's plugin host — there is no build step, no package manager, and no test infrastructure. The repository ships:

- **3 plugins** (each a self-contained directory): `document-nav/`, `readonly-mode/`, `mermaid-zoom/`
- **2 standalone Typora themes**: `claude-theme.css`, `mdmdt.css`

## Architecture & Data Flow

Each plugin is an ES module that exports a default class. The plugin host instantiates the class and calls `load()` / `unload()`, which delegate to `onload()` / `onunload()`:

```
typora-community-plugin host
    └── load() → new MyPlugin() → onload()
                                  ├── attach DOM nodes
                                  ├── register event listeners / MutationObservers
                                  └── schedule work via requestAnimationFrame

    └── unload() → onunload()
                    ├── disconnect observers
                    ├── remove event listeners
                    └── detach DOM nodes
```

Plugins interact with Typora **purely via DOM manipulation** — none import the Typora JS API. They detect rendered content with selectors, observe DOM mutations, and overlay their own UI elements.

**Cross-plugin compatibility** is handled ad-hoc:
- `readonly-mode/main.js` whitelists selectors for the other plugins' UI so its pointer-blocking pass-through does not break them.
- `mermaid-zoom` sets `pointer-events: none` on its host element so `readonly-mode` does not intercept clicks on the zoom button.

State is per-plugin (instance fields) or persisted in `localStorage` (`readonly-mode` toggle).

## Key Directories

| Path | Purpose |
| --- | --- |
| `document-nav/` | Floating top/bottom scroll buttons. Files: `manifest.json` (352B), `main.js` (6.1KB), `style.css` (2.5KB). v0.1.1. |
| `readonly-mode/` | Toggle that blocks pointer/input/keyboard events on the editor. Files: `manifest.json` (370B), `main.js` (8.6KB), `style.css` (2.3KB). v0.1.2. Includes localStorage persistence and Ctrl+Alt+R shortcut. |
| `mermaid-zoom/` | Hover-zoom button on Mermaid SVGs + lightbox with pan/zoom. Files: `manifest.json` (343B), `main.js` (12.6KB), `style.css` (5.5KB). v0.2.0. F-key shortcut. |
| `claude-theme.css` | Standalone Typora theme (89.7KB). Claude visual style, light/dark via `prefers-color-scheme`. **No license header.** |
| `mdmdt.css` | Standalone Typora theme (79.2KB). Fork of `cayxc/Mdmdt`. **Apache-2.0** (header present). |
| `README.md` | Sole documentation. Written in **Chinese**. |

## Development Commands

There is **no build, no test, no lint, no dev server**. The workflow is:

```bash
# Install a plugin (manual copy)
cp -r document-nav/ ~/.typora/community-plugins/plugins/

# Enable it
#   Typora → Settings → Community Plugins → enable "document-nav"

# Install a theme
cp claude-theme.css ~/.typora/themes/
#   Typora → Themes → select "claude-theme"
```

**Bun / Node / npm are NOT used.** The `.js` files are ES modules loaded directly by Typora's plugin host. Any package manager invocation is wrong.

## Code Conventions & Common Patterns

**Module shape** — every plugin follows the same skeleton:

```js
export default class FooPlugin {
    constructor() { /* bind handlers, init fields */ }
    onload() { /* attach DOM, observers, listeners */ }
    onload()  // typo guard — do not introduce
    onunload() { /* reverse of onload */ }
}
```

- All plugins are **ES modules** (`export default class …`). No CommonJS, no IIFE wrapper.
- **Naming**: file names `kebab-case` (`main.js`, `style.css`, `manifest.json`); class names `PascalCase` (`DocumentNavPlugin`); CSS classes prefixed `.typora-{plugin-id}-*` for nav/readonly, `.mermaid-zoom-*` for mermaid plugin.
- **State**: instance fields on the plugin class. `readonly-mode` additionally persists to `localStorage` (key: `typora-readonly-mode-enabled` or similar — check before changing).
- **DOM observation**: `MutationObserver` for dynamic Typora content; `requestAnimationFrame` to batch expensive work.
- **Event handling**: capture-phase listeners on `document` for global blocking (`readonly-mode`); delegated listeners per UI element otherwise.
- **Styling**: use Typora's CSS custom properties — `--bg-color`, `--text-color`, `--window-border`, `--item-hover-bg-color`, `--font-family` — never hardcode colors. Persistent overlays use `z-index: 2147483600` (highest practical integer; convention shared across all three plugins).
- **Keyboard shortcuts**: `Ctrl+Alt+R` (readonly toggle), `F` (mermaid lightbox) — both registered at the document level, capture phase.

**Error handling** is best-effort. Plugins swallow errors from optional DOM operations to avoid breaking Typora; do not introduce `throw` paths that can crash the host.

## Important Files

- `README.md` — install steps, plugin/theme overview (Chinese).
- `document-nav/main.js` — `DocumentNavPlugin`. Uses `MutationObserver` + a resize listener to find the scroll container.
- `readonly-mode/main.js` — `ReadonlyModePlugin`. Has a `PASS_THROUGH_SELECTOR` constant (line ~24) listing selectors that must NOT be blocked. **Update this if you add new plugin UIs.**
- `mermaid-zoom/main.js` — `MermaidZoomPlugin`. Heuristic SVG detection (selectors + DOM structure checks, not a hard import).
- `*.json` manifests — version + min-app/core constraints. Bump version on breaking changes.
- `*.css` plugin files — loaded automatically by the plugin host via convention (not referenced in `manifest.json`).

## Runtime/Tooling Preferences

- **Runtime**: browser ES modules inside Typora's renderer. No Node, no Bun, no transpiler.
- **Package manager**: none. Do not introduce `package.json`, `node_modules`, or lock files.
- **Lint/format**: none configured. Match the existing hand-written style; do not run a formatter that would churn whitespace.
- **Editorconfig / .gitignore / LICENSE**: **none present**. Repo hygiene is loose. If you add files, follow the existing per-plugin directory shape rather than introducing tooling.
- **No `.editorconfig`** — indentation is 4 spaces in JS, 4 spaces in CSS (verify by reading the file before editing).
- **License state**: `mdmdt.css` declares Apache-2.0 in-file. `claude-theme.css` and the plugin JS files have no license headers. Do not add a `LICENSE` file or relicense anything unless the user explicitly asks.

## Testing & QA

**There are no tests.** No test framework, no `__tests__/`, no CI, no coverage.

Manual verification is the only available QA path:
1. Copy the plugin into `~/.typora/community-plugins/plugins/`.
2. Restart Typora.
3. Enable the plugin in Settings → Community Plugins.
4. Exercise the affected UI (toggle, scroll, zoom, etc.).
5. Toggle `readonly-mode` and confirm the modified plugin's UI still works (if you changed it).
6. For CSS-only changes, switch theme in Typora → Themes and visually inspect.

If you add automated tests, isolate them under the affected plugin (e.g. `mermaid-zoom/__tests__/`) so the per-plugin structure stays intact. Do not add a repo-wide test runner.
