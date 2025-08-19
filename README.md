# ox-standard

**Lightning-fast JavaScript Standard Style linting and formatting** ⚡

A comprehensive TypeScript/React linting and formatting configuration that follows [JavaScript Standard Style](https://standardjs.com/) philosophy, powered by the blazing-fast Rust-based oxlint engine and Biome formatter.

## ✨ Why Choose This?

- **🚀 10x Faster**: Rust-based oxlint delivers sub-second linting
- **⚡ Instant Formatting**: Biome formatter with lightning-fast formatting
- **📏 Standard Style**: Enforces JavaScript Standard Style for both linting and formatting
- **🎯 Zero Config**: Works out of the box for TypeScript and React projects
- **🧹 Clean Setup**: Automatically removes ESLint and Prettier clutter from your project
- **⚙️ Extensible**: Easy to customize while maintaining Standard Style base

## 🎯 JavaScript Standard Style Enforced

This configuration implements the complete [JavaScript Standard Style](https://standardjs.com/) philosophy:

- ✅ **No semicolons** - Let JavaScript handle automatic insertion
- ✅ **Single quotes** for strings
- ✅ **2 spaces** for indentation
- ✅ **Strict equality** - Always use `===` instead of `==`
- ✅ **Modern ES6+** - `const`/`let`, template literals, destructuring
- ✅ **Clean patterns** - No unused variables, proper spacing
- ✅ **React hooks** - Proper hooks usage patterns
- ✅ **TypeScript** - Consistent type imports and modern syntax

## 🚀 Quick Setup

Replace ESLint in your project with one command:

```bash
npx github:JohnDeved/ox-standard
```

That's it! The setup script will:
1. Remove ESLint and Prettier packages and configs 
2. Install oxlint with Standard Style configuration
3. Install Biome formatter with Standard Style configuration
4. Update your package.json scripts
5. Configure VSCode settings and extensions
6. Create extensible `.oxlintrc.json` and `biome.json`

## 📦 What You Get

### Optimized Package.json
```json
{
  "scripts": {
    "lint": "oxlint .",
    "lint:fix": "oxlint . --fix",
    "format": "biome format --write .",
    "format:check": "biome format ."
  },
  "devDependencies": {
    "ox-standard": "github:JohnDeved/ox-standard",
    "@biomejs/biome": "^2.2.0"
  }
}
```

### Minimal, Extensible Configs
```json
// .oxlintrc.json
{
  "extends": ["./node_modules/ox-standard/.oxlintrc.json"]
}
```

```json
// biome.json
{
  "extends": ["./node_modules/ox-standard/biome.json"]
}
```

### VSCode Integration
- Automatic code formatting on save with Biome
- 2-space indentation
- Recommended extensions for TypeScript/React development
- Standard Style formatting preferences
- Biome formatter as default

## 🛠 Customization

Override any rules in your configurations:

### Linting Rules (.oxlintrc.json)
```json
{
  "extends": ["./node_modules/ox-standard/.oxlintrc.json"],
  "rules": {
    "no-console": "warn",
    "prefer-const": "off"
  }
}
```

### Formatting Options (biome.json)
```json
{
  "extends": ["./node_modules/ox-standard/biome.json"],
  "javascript": {
    "formatter": {
      "lineWidth": 100
    }
  }
}
  }
}
```

## 🔧 Rules Included

Our configuration includes 70+ carefully selected rules across:

### Core JavaScript Standard Style
- `eqeqeq` - Strict equality enforcement
- `curly` - Consistent brace style  
- `no-var` - Modern variable declarations
- `space-infix-ops` - Proper operator spacing
- `yoda` - Readable comparisons

### Modern JavaScript
- `prefer-template` - Template literal preference
- `prefer-destructuring` - Modern assignment patterns
- `prefer-object-spread` - Clean object composition
- `no-duplicate-imports` - Import organization

### React Best Practices  
- `rules-of-hooks` - Proper hooks usage
- `jsx-curly-brace-presence` - Clean JSX syntax
- `self-closing-comp` - Concise components

### TypeScript Integration
- `consistent-type-imports` - Clean type imports
- `array-type` - Consistent array syntax
- `prefer-as-const` - Type assertion best practices

### Enhanced Patterns (Unicorn)
- `prefer-includes` - Better array methods
- `prefer-string-starts-ends-with` - Modern string methods
- `throw-new-error` - Proper error handling

## 🧪 Testing Your Setup

Create a test file to verify everything works:

```javascript
// test.js
var message = "Hello World";
if (message == "Hello World") {
  console.log(message);
}
```

Run the linter and formatter:
```bash
npm run lint:fix
npm run format
```

You should see it automatically transform to:
```javascript
// test.js  
const message = 'Hello World'
if (message === 'Hello World') {
  console.log(message)
}
```

The linter handles:
- `var` → `const` conversion
- `==` → `===` strict equality
- Code quality improvements

The formatter handles:
- Semicolon removal
- Double → single quote conversion
- Proper spacing and indentation

## 🆚 Migration from ESLint/Prettier

The setup script handles migration automatically:

1. **Detects** existing ESLint and Prettier configs and packages
2. **Prompts** for removal confirmation  
3. **Uninstalls** ESLint and Prettier-related dependencies
4. **Installs** oxlint with Standard Style config
5. **Installs** Biome formatter with Standard Style config
6. **Updates** scripts and VSCode settings
7. **Preserves** your existing code style preferences where possible

## 📖 Manual Installation

If you prefer manual setup:

```bash
# Install the package from GitHub
npm install --save-dev github:JohnDeved/ox-standard @biomejs/biome

# Create config files
echo '{"extends": ["./node_modules/ox-standard/.oxlintrc.json"]}' > .oxlintrc.json
echo '{"extends": ["./node_modules/ox-standard/biome.json"]}' > biome.json

# Add scripts to package.json
npm pkg set scripts.lint="oxlint ."
npm pkg set scripts.lint:fix="oxlint . --fix"
npm pkg set scripts.format="biome format --write ."
npm pkg set scripts.format:check="biome format ."
```

## 🤝 Contributing

Found an issue or want to suggest improvements? [Open an issue](https://github.com/JohnDeved/ox-standard/issues) or submit a pull request.

## 📄 License

MIT © Johann Berger