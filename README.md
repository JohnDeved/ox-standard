# ox-standard

**Lightning-fast JavaScript Standard Style linting and formatting** ⚡

Drop-in replacement for ESLint/Prettier that's [50~100 times](https://voidzero.dev/posts/announcing-oxlint-1-stable#benchmark) faster. Enforces [JavaScript Standard Style](https://standardjs.com/) using Rust-based oxlint and oxfmt formatter for TypeScript/React projects.

<div align="center">
  <a href="https://standardjs.com/">
    <img src="https://github.com/user-attachments/assets/f2379480-28d3-453c-8c09-8bf7aaeede86" width="100px" />
  </a>
</div>

## 🚀 Quick Setup

Replace ESLint/Prettier in your project with one command:

```bash
npx JohnDeved/ox-standard
```

That's it! The setup automatically:
- ✅ Removes ESLint and Prettier packages and configs 
- ✅ Installs oxlint with Standard Style configuration
- ✅ Installs oxfmt formatter with Standard Style configuration
- ✅ Updates your package.json scripts
- ✅ Configures VSCode settings and extensions

## ✨ What You Get

### 🚀 100x Faster Performance
- **Rust-based oxlint**: Sub-second linting even on large codebases
- **oxfmt formatter**: Lightning-fast formatting from the oxc ecosystem
- **Single command**: `npm run lint` handles both linting and formatting

### 📏 JavaScript Standard Style Enforced
- No semicolons, single quotes, 2-space indentation
- Strict equality (`===`), modern ES6+ patterns
- React hooks best practices, TypeScript consistency

### 🎯 Zero Configuration
- Works out of the box for TypeScript and React
- Extensible configs you can customize
- VSCode integration with recommended extensions

## 🛠 Customization

Need to override rules? Easy:

```jsonc
// .oxlintrc.json
{
  "extends": ["./node_modules/ox-standard/.oxlintrc.json"],
  "rules": {
    "no-console": "warn"
  }
}
```

```jsonc
// .oxfmtrc.json  
{
  "singleQuote": true,
  "semi": false,
  "printWidth": 120,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## 🆚 Migrating from ESLint/Prettier?

The setup script handles everything automatically:
1. Detects existing ESLint/Prettier configs and packages
2. Prompts for removal confirmation  
3. Uninstalls old dependencies
4. Installs and configures ox-standard
5. Updates VSCode settings

## 📖 Manual Installation

Prefer manual setup?

```bash
npm install --save-dev github:JohnDeved/ox-standard

echo '{"extends": ["./node_modules/ox-standard/.oxlintrc.json"]}' > .oxlintrc.json
cp node_modules/ox-standard/.oxfmtrc.json .oxfmtrc.json

npm pkg set scripts.lint="oxlint --fix .; oxfmt ."
```

## 🔧 Complete Rule Reference

70+ carefully selected rules across:

### JavaScript Standard Style
- `eqeqeq` - Strict equality (`===`)
- `curly` - Consistent braces  
- `no-var` - Use `const`/`let`
- `space-infix-ops` - Proper spacing
- `yoda` - Readable comparisons

### Modern JavaScript  
- `prefer-template` - Template literals
- `prefer-destructuring` - Modern patterns
- `prefer-object-spread` - Clean objects
- `no-duplicate-imports` - Organized imports

### React Best Practices
- `rules-of-hooks` - Proper hooks usage
- `jsx-curly-brace-presence` - Clean JSX
- `self-closing-comp` - Concise components

### TypeScript Integration
- `consistent-type-imports` - Clean imports
- `array-type` - Consistent syntax  
- `prefer-as-const` - Type assertions

### Enhanced Patterns (Unicorn)
- `prefer-includes` - Better array methods
- `prefer-string-starts-ends-with` - Modern strings
- `throw-new-error` - Proper errors

## 🤝 Contributing

Found an issue or want to suggest improvements? [Open an issue](https://github.com/JohnDeved/ox-standard/issues) or submit a pull request.

## 📄 License

MIT © Johann Berger
