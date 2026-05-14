# ox-standard

**Lightning-fast JavaScript Standard Style linting and formatting** ⚡

Drop-in replacement for ESLint/Prettier that's [50~100 times](https://voidzero.dev/posts/announcing-oxlint-1-stable#benchmark) faster. Enforces [JavaScript Standard Style](https://standardjs.com/) using Rust-based oxlint and oxfmt formatter for TypeScript/React projects.

<div align="center">
  <a href="https://standardjs.com/">
    <img src="https://github.com/user-attachments/assets/f2379480-28d3-453c-8c09-8bf7aaeede86" width="100px" />
  </a>
</div>

## 🚀 Quick Setup

### For Node.js Projects

Replace ESLint/Prettier in your project with one command:

```bash
npx ox-standard
```

That's it! The setup automatically:

- ✅ Removes ESLint and Prettier packages and configs
- ✅ Installs oxlint with Standard Style configuration
- ✅ Installs oxfmt formatter with Standard Style configuration
- ✅ Updates your package.json scripts
- ✅ Configures VSCode settings and extensions

### For Deno Projects

Run the setup in your Deno project directory:

```bash
npx ox-standard
```

### Non-interactive / CI usage

Pass `--yes` to auto-accept every prompt and `--type=` to skip detection. `--no-vscode` skips the VSCode integration step.

```bash
npx ox-standard --yes --type=node --no-vscode
npx ox-standard --yes --type=deno
npx ox-standard --help
```

The setup will:

- ✅ Detect your Deno project automatically
- ✅ Create .oxlintrc.json with Deno-specific configuration
- ✅ Create .oxfmtrc.json with Standard Style formatting
- ✅ Add lint task to your deno.json
- ✅ Configure VSCode settings and extensions

Then install oxlint and oxfmt:

```bash
# Using npx (recommended)
npx oxlint --fix .
npx oxfmt .

# Or install globally with Deno
deno install -A -n oxlint https://esm.sh/oxlint
deno install -A -n oxfmt https://esm.sh/oxfmt
```

## ✨ What You Get

### 🚀 100x Faster Performance

- **Rust-based oxlint**: Sub-second linting even on large codebases
- **oxfmt formatter**: Lightning-fast formatting from the oxc ecosystem
- **Single command**: `npm run lint` (Node.js) or `deno task lint` (Deno) handles both linting and formatting

### 📏 JavaScript Standard Style Enforced

- No semicolons, single quotes, 2-space indentation
- Strict equality (`===`), modern ES6+ patterns
- React hooks best practices, TypeScript consistency

### 🎯 Zero Configuration

- Works out of the box for TypeScript and React
- Supports both Node.js and Deno projects
- Extensible configs you can customize
- VSCode integration with recommended extensions

## 🛠 Customization

Need to override rules? Easy:

```jsonc
// .oxlintrc.json
{
  "extends": ["./node_modules/ox-standard/.oxlintrc.json"],
  "rules": {
    "no-console": "warn",
  },
}
```

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

## 💡 VSCode Integration

The setup automatically configures VSCode for the best experience:

- **Auto-formatting on save** with oxfmt via the oxc-vscode extension
- **Auto-fixing** linting issues on save
- **Recommended extensions** installation prompt

The `.vscode/settings.json` is configured to use oxc-vscode as the default formatter with experimental oxfmt support enabled. Just install the recommended `oxc.oxc-vscode` extension when prompted, and formatting will work out of the box!

## 🆚 Migrating from ESLint/Prettier?

The setup script handles everything automatically:

1. Detects existing ESLint/Prettier configs and packages
2. Prompts for removal confirmation
3. Uninstalls old dependencies
4. Installs and configures ox-standard
5. Updates VSCode settings

## 📖 Manual Installation

### Node.js Projects

Prefer manual setup?

```bash
npm install --save-dev ox-standard

echo '{"extends": ["./node_modules/ox-standard/.oxlintrc.json"]}' > .oxlintrc.json
cp node_modules/ox-standard/.oxfmtrc.json .oxfmtrc.json

npm pkg set scripts.lint="oxlint --fix .; oxfmt ."
```

### Deno Projects

For Deno projects, configuration is embedded directly:

```bash
# Run setup script
npx JohnDeved/ox-standard

# Or manually create configs
# The setup script will generate .oxlintrc.json with Deno-specific settings
# including Deno global environment and optimized ignore patterns

# Add to deno.json:
{
  "tasks": {
    "lint": "npx oxlint --fix . && npx oxfmt ."
  }
}

# Run linting
deno task lint
```

## 🔧 Complete Rule Reference

100+ carefully selected rules across:

### JavaScript Standard Style

- `eqeqeq` - Strict equality (`===`)
- `curly` - Consistent braces
- `no-var` - Use `const`/`let`
- `space-infix-ops` - Proper spacing
- `yoda` - Readable comparisons
- `no-constructor-return` - No return values from constructors
- `no-self-compare` - Flags `x === x` tautologies
- `no-else-return` - Removes redundant else after return

### Modern JavaScript

- `prefer-template` - Template literals
- `prefer-destructuring` - Modern patterns
- `prefer-object-spread` - Clean objects
- `no-duplicate-imports` - Organized imports

### React Best Practices

- `rules-of-hooks` - Proper hooks usage
- `jsx-curly-brace-presence` - Clean JSX
- `self-closing-comp` - Concise components
- `jsx-no-duplicate-props` - Catches duplicate prop bugs
- `void-dom-elements-no-children` - No children on `<img>`, `<br>` etc.
- `no-danger` _(warn)_ - Flags `dangerouslySetInnerHTML`
- `jsx-no-constructed-context-values` _(warn)_ - Prevents needless re-renders
- `react_perf/jsx-no-jsx-as-prop` _(warn)_ - JSX in props causes re-renders

### TypeScript Integration

- `consistent-type-imports` - Clean imports
- `array-type` - Consistent syntax
- `prefer-as-const` - Type assertions
- `prefer-optional-chain` - `a?.b` over `a && a.b`
- `prefer-nullish-coalescing` - `??` over `||` for null checks
- `no-unnecessary-qualifier` - Removes redundant namespace qualifiers
- `no-useless-empty-export` - Removes redundant `export {}`
- `no-duplicate-enum-values` / `no-mixed-enums` - Enum correctness guards
- `no-unsafe-declaration-merging` - Class+interface merge safety

### Enhanced Patterns (Unicorn)

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

### Performance (Oxc)

- `no-accumulating-spread` - Prevents O(n²) spread in loops
- `no-map-spread` _(warn)_ - Spread in map callbacks

### Import Safety

- `import/no-cycle` - Detects circular imports

## 🤝 Contributing

Found an issue or want to suggest improvements? [Open an issue](https://github.com/JohnDeved/ox-standard/issues) or submit a pull request.

## 📄 License

MIT © Johann Berger
