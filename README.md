# oxc-standard

**Lightning-fast [JavaScript Standard Style](https://standardjs.com/) linting and formatting** ⚡

[![npm version](https://img.shields.io/npm/v/oxc-standard.svg)](https://www.npmjs.com/package/oxc-standard)
[![npm downloads](https://img.shields.io/npm/dm/oxc-standard.svg)](https://www.npmjs.com/package/oxc-standard)
[![CI](https://github.com/JohnDeved/ox-standard/actions/workflows/ci.yml/badge.svg)](https://github.com/JohnDeved/ox-standard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](#-license)

A drop-in replacement for ESLint + Prettier built on the Rust-based [oxc](https://oxc.rs/) toolchain. Roughly [50–100×](https://voidzero.dev/posts/announcing-oxlint-1-stable#benchmark) faster than the JavaScript equivalents, with a curated 113-rule preset for TypeScript and React.

<div align="center">
  <a href="https://standardjs.com/">
    <img src="https://github.com/user-attachments/assets/f2379480-28d3-453c-8c09-8bf7aaeede86" width="100px" />
  </a>
</div>

---

## Contents

- [Quick Setup](#-quick-setup)
- [For AI Agents](#for-ai-agents)
- [CLI Reference](#-cli-reference)
- [What You Get](#-what-you-get)
- [Customization](#-customization)
- [VSCode Integration](#-vscode-integration)
- [Migrating from ESLint/Prettier](#-migrating-from-eslintprettier)
- [Manual Installation](#-manual-installation)
- [Rule Reference](#-rule-reference)
- [Contributing](#-contributing)

---

## 🚀 Quick Setup

> **Requirements:** Node.js (a recent LTS — oxlint and oxfmt need at least Node 18). For Deno projects, you also need Node alongside Deno because `oxlint` and `oxfmt` are invoked through `npx`. The CLI itself runs from any package manager's `dlx`-style runner.

### Node.js Projects

Replace ESLint/Prettier in your project with one command — works with **npm, pnpm, yarn, and bun**:

```bash
npx oxc-standard          # npm
pnpm dlx oxc-standard     # pnpm
yarn dlx oxc-standard     # yarn (berry)
bunx oxc-standard         # bun
```

The setup auto-detects your package manager (via lockfile, then `npm_config_user_agent`, then the `packageManager` field in `package.json`) and uses the right install/uninstall commands. It then:

- ✅ Removes ESLint, Prettier, and related packages and configs
- ✅ Installs `oxlint` and `oxfmt` pinned to known-good versions
- ✅ Writes `.oxlintrc.json` and `.oxfmtrc.json`
- ✅ Adds a `lint` script to `package.json` — run with `npm run lint` / `pnpm lint` / `yarn lint` / `bun run lint`
- ✅ Configures `.vscode/settings.json` and `.vscode/extensions.json` for the [oxc-vscode](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode) extension

### Deno Projects

Deno doesn't ship a `dlx`-style runner, so use `npx` (Node must be installed alongside Deno):

```bash
npx oxc-standard --type=deno
```

The setup will:

- ✅ Detect your Deno project (via `deno.json[c]` or `.vscode/settings.json` `deno.enable`)
- ✅ Write `.oxlintrc.json` with Deno-specific globals and ignore patterns
- ✅ Write `.oxfmtrc.json` with Standard Style formatting
- ✅ Add a `lint` task to `deno.json`
- ✅ Configure VSCode integration

Then run:

```bash
deno task lint
```

### For AI Agents

Paste this into any coding-agent chat (Copilot, Claude Code, Cursor, opencode, etc.) when you want it to migrate the current repository:

```
Set up oxc-standard in this project by following https://raw.githubusercontent.com/JohnDeved/ox-standard/main/README.md — auto-detect the package manager and project type, run the CLI non-interactively, then verify the lint script works.
```

Or, for agents that prefer running a single shell command, point them at the deterministic non-interactive form:

```bash
# Node project (auto-detects npm/pnpm/yarn/bun)
npx -y oxc-standard --yes --no-vscode

# Deno project
npx -y oxc-standard --yes --type=deno --no-vscode
```

The `--yes` flag auto-accepts every prompt (required for non-interactive shells) and `--no-vscode` skips writing `.vscode/` files. Drop `--no-vscode` if you do want VSCode integration.

---

## 📋 CLI Reference

```
npx oxc-standard [options]
```

| Flag                        | Description                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `-y`, `--yes`               | Skip every confirmation prompt (CI / scripted use).                                                                   |
| `-t`, `--type=<node\|deno>` | Skip auto-detection and force the project type.                                                                       |
| `-n`, `--dry-run`           | Preview every destructive action (file writes, deletes, package installs) without touching anything. Implies `--yes`. |
| `--no-vscode`               | Skip the `.vscode/` integration step.                                                                                 |
| `-h`, `--help`              | Print the help text and exit.                                                                                         |

Examples:

```bash
# Fully non-interactive Node setup (e.g. inside a CI job)
npx oxc-standard --yes --type=node --no-vscode

# Non-interactive Deno setup
npx oxc-standard --yes --type=deno

# Preview what setup would do without changing anything
npx oxc-standard --dry-run --type=node
```

---

## ✨ What You Get

- **Sub-second linting and formatting** — `oxlint` and `oxfmt` are native Rust binaries shipped via npm.
- **One command for both** — the generated lint script runs `oxlint --fix .` followed by `oxfmt .` (semicolon, not `&&`, so formatting still runs even if lint reports an unfixable issue).
- **Standard Style enforced** — no semicolons, single quotes, 2-space indent, strict equality, modern ES6+, React-hooks correctness, TypeScript consistency.
- **Pinned tool versions** — `oxc-standard` declares the supported `oxlint` and `oxfmt` versions in both `dependencies` and `peerDependencies`, so the toolchain stays in sync with the rule set.
- **VSCode integration on by default** — auto-fix and format-on-save via the official `oxc.oxc-vscode` extension.

---

## 🛠 Customization

Override individual rules by extending the bundled config:

```jsonc
// .oxlintrc.json
{
  "extends": ["./node_modules/oxc-standard/.oxlintrc.json"],
  "rules": {
    "no-console": "warn",
  },
}
```

Tweak formatting:

```jsonc
// .oxfmtrc.json
{
  "singleQuote": true,
  "semi": false,
  "printWidth": 120,
  "tabWidth": 2,
  "trailingComma": "es5",
}
```

---

## 💡 VSCode Integration

The setup writes:

- **`.vscode/settings.json`** — sets `oxc-vscode` as the default formatter, enables format-on-save, enables auto-fix-on-save, and turns on the experimental oxfmt support.
- **`.vscode/extensions.json`** — recommends `oxc.oxc-vscode` (and `typescriptteam.native-preview`).

When you open the project, VSCode will offer to install the recommended extensions. Accept, and lint + format on save just works.

Skip this step entirely with `--no-vscode`.

---

## 🆚 Migrating from ESLint/Prettier

Run `npx oxc-standard` and confirm the prompts. The script will:

1. Detect existing ESLint/Prettier configs (`.eslintrc*`, `eslint.config.*`, `.prettierrc*`, `prettier.config.*`) and packages (`eslint`, `prettier`, common plugins/configs).
2. Ask before deleting configs.
3. Uninstall the legacy packages with your package manager.
4. Install and configure `oxc-standard`.
5. Update `.vscode/` (unless `--no-vscode`).

A typical `package.json` diff after migration:

```diff
  "scripts": {
-   "lint": "eslint . --fix",
+   "lint": "oxlint --fix .; oxfmt ."
  },
  "devDependencies": {
-   "eslint": "^9.0.0",
-   "eslint-config-standard": "^17.0.0",
-   "prettier": "^3.0.0",
+   "oxc-standard": "^1",
+   "oxfmt": "^0.48.0",
+   "oxlint": "^1.63.0"
  }
```

> The script only touches `scripts.lint`. If you have a separate `scripts.format` calling `prettier --write`, you'll want to remove it manually — `oxfmt` already runs as part of `lint`.

---

## 📖 Manual Installation

Prefer to skip the script? Pick the install command for your package manager:

```bash
npm  install --save-dev oxc-standard
pnpm add     --save-dev oxc-standard
yarn add     --dev      oxc-standard
bun  add     --dev      oxc-standard
```

### Node.js

```bash
echo '{"extends": ["./node_modules/oxc-standard/.oxlintrc.json"]}' > .oxlintrc.json
cp node_modules/oxc-standard/.oxfmtrc.json .oxfmtrc.json
npm pkg set scripts.lint="oxlint --fix .; oxfmt ."
```

### Deno

Add a task to `deno.json`:

```jsonc
{
  "tasks": {
    "lint": "npx oxlint --fix . && npx oxfmt .",
  },
}
```

Then run `deno task lint`.

---

## 🔧 Rule Reference

113 carefully selected rules across 5 oxlint plugins (`unicorn`, `typescript`, `oxc`, `react`, `react_perf`). The full list lives in [`.oxlintrc.json`](./.oxlintrc.json); the highlights are below.

<details>
<summary><b>JavaScript Standard Style</b></summary>

- `eqeqeq` - Strict equality (`===`)
- `curly` - Consistent braces
- `no-var` - Use `const`/`let`
- `space-infix-ops` - Proper spacing
- `yoda` - Readable comparisons
- `no-constructor-return` - No return values from constructors
- `no-self-compare` - Flags `x === x` tautologies
- `no-else-return` - Removes redundant else after return

</details>

<details>
<summary><b>Modern JavaScript</b></summary>

- `prefer-template` - Template literals
- `prefer-destructuring` - Modern patterns
- `prefer-object-spread` - Clean objects
- `no-duplicate-imports` - Organized imports

</details>

<details>
<summary><b>React Best Practices</b></summary>

- `rules-of-hooks` - Proper hooks usage
- `jsx-curly-brace-presence` - Clean JSX
- `self-closing-comp` - Concise components
- `jsx-no-duplicate-props` - Catches duplicate prop bugs
- `void-dom-elements-no-children` - No children on `<img>`, `<br>` etc.
- `no-danger` _(warn)_ - Flags `dangerouslySetInnerHTML`
- `jsx-no-constructed-context-values` _(warn)_ - Prevents needless re-renders
- `react_perf/jsx-no-jsx-as-prop` _(warn)_ - JSX in props causes re-renders

</details>

<details>
<summary><b>TypeScript Integration</b></summary>

- `consistent-type-imports` - Clean imports
- `array-type` - Consistent syntax
- `prefer-as-const` - Type assertions
- `prefer-optional-chain` - `a?.b` over `a && a.b`
- `prefer-nullish-coalescing` - `??` over `||` for null checks
- `no-unnecessary-qualifier` - Removes redundant namespace qualifiers
- `no-useless-empty-export` - Removes redundant `export {}`
- `no-duplicate-enum-values` / `no-mixed-enums` - Enum correctness guards
- `no-unsafe-declaration-merging` - Class+interface merge safety

</details>

<details>
<summary><b>Enhanced Patterns (Unicorn)</b></summary>

- `prefer-includes` - Better array methods
- `prefer-string-starts-ends-with` - Modern strings
- `throw-new-error` - Proper errors
- `prefer-string-slice` - `.slice()` over `.substring()`
- `prefer-node-protocol` - `'node:fs'` over `'fs'`
- `prefer-negative-index` - `arr.at(-1)` over `arr[arr.length - 1]`
- `prefer-structured-clone` - `structuredClone()` over JSON round-trip
- `no-negated-condition` - Flips negated if/ternary for readability
- `no-typeof-undefined` - `x === undefined` over `typeof x`
- `no-lonely-if` - Hoists lone `if` out of `else`
- `no-useless-promise-resolve-reject` - Removes redundant wrappers
- `no-instanceof-array` - `Array.isArray()` over `instanceof Array`
- `no-negation-in-equality-check` - `!!x === y` instead of `!x === y`
- `require-array-join-separator` - Explicit separator in `.join()`

</details>

<details>
<summary><b>Performance (Oxc) &amp; Import Safety</b></summary>

- `no-accumulating-spread` - Prevents O(n²) spread in loops
- `no-map-spread` _(warn)_ - Spread in map callbacks
- `import/no-cycle` - Detects circular imports

</details>

---

## 🤝 Contributing

Found an issue or want to suggest improvements? [Open an issue](https://github.com/JohnDeved/ox-standard/issues) or submit a pull request.

Local development:

```bash
npm install
npm run build       # tsc → dist/
npm test            # vitest
npm run lint        # dogfood: lint this repo with oxlint+oxfmt
```

CI runs the full test suite on Node 20 and 22 across Linux and macOS, plus a smoke test of the setup CLI against npm, pnpm, yarn, bun, and Deno.

---

## 📄 License

MIT © Johann Berger
