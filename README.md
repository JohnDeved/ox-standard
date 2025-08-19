# ox-standard

**Lightning-fast JavaScript Standard Style linting with oxlint** ⚡

A comprehensive TypeScript/React linting configuration that follows [JavaScript Standard Style](https://standardjs.com/) philosophy, powered by the blazing-fast Rust-based oxlint engine.

## ✨ Why Choose This?

- **🚀 10x Faster**: Rust-based oxlint delivers sub-second linting
- **📏 Standard Style**: Enforces JavaScript Standard Style without configuration
- **🎯 Zero Config**: Works out of the box for TypeScript and React projects
- **🧹 Clean Setup**: Automatically removes ESLint clutter from your project
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
1. Remove ESLint packages and configs 
2. Install oxlint with Standard Style configuration
3. Update your package.json scripts
4. Configure VSCode settings and extensions
5. Create an extensible `.oxlintrc.json`

## 📦 What You Get

### Optimized Package.json
```json
{
  "scripts": {
    "lint": "oxlint .",
    "lint:fix": "oxlint . --fix"
  },
  "devDependencies": {
    "ox-standard": "github:JohnDeved/ox-standard"
  }
}
```

### Minimal, Extensible Config
```json
{
  "extends": ["./node_modules/ox-standard/.oxlintrc.json"]
}
```

### VSCode Integration
- Automatic code formatting on save
- 2-space indentation
- Recommended extensions for TypeScript/React development
- Standard Style formatting preferences

## 🛠 Customization

Override any rules in your `.oxlintrc.json`:

```json
{
  "extends": ["./node_modules/ox-standard/.oxlintrc.json"],
  "rules": {
    "no-console": "warn",
    "prefer-const": "off"
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
- `semi` - No unnecessary semicolons (via extension)

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

## 🚫 Semicolon Rule Implementation

JavaScript Standard Style's "no semicolons" philosophy is enforced through two approaches:

### Current: JavaScript Extension (CLI support)
For immediate compatibility while native support is being developed:

```bash
# Check for semicolon violations
npm run lint:semi

# Run all linting (oxlint + semicolon check)
npm run lint && npm run lint:semi
```

### Future: Native oxlint Rule (IDE support)
We've created a native Rust implementation for oxc that provides:
- ✅ **Real-time IDE feedback** - Error highlighting in VS Code, WebStorm, etc.
- ✅ **Language server integration** - Works with oxc language server
- ✅ **Performance benefits** - 10-100x faster than JavaScript extension
- ✅ **Seamless integration** - Same output format as other oxlint rules

**Both implementations provide:**
- 🔍 **Smart ASI detection** - Identifies when semicolons are needed to avoid automatic semicolon insertion issues
- 🔧 **Auto-fixing** - Can remove unnecessary and add required semicolons
- 📏 **Standard Style compliance** - Follows JavaScript Standard Style guidelines exactly

**Example Standard Style enforcement:**
```javascript
// ❌ Unnecessary semicolons (flagged)
const message = 'Hello';
console.log(message);

// ✅ Proper Standard Style
const message = 'Hello'
console.log(message)

// ✅ Required semicolon (allowed)
const a = 1
;(function() { console.log('needed') })()
```

The native implementation is ready for contribution to oxc-project/oxc. Once merged, ox-standard will automatically use the native rule for full IDE support. See `oxc-contrib/` directory for implementation details.

## 🧪 Testing Your Setup

Create a test file to verify everything works:

```javascript
// test.js
var message = "Hello World"
if (message == "Hello World") {
  console.log(message)
}
```

Run the linter:
```bash
npm run lint:fix
```

You should see it automatically fix to:
```javascript
// test.js  
const message = 'Hello World'
if (message === 'Hello World') {
  console.log(message)
}
```

## 🆚 Migration from ESLint

The setup script handles migration automatically:

1. **Detects** existing ESLint configs and packages
2. **Prompts** for removal confirmation  
3. **Uninstalls** ESLint-related dependencies
4. **Installs** oxlint with Standard Style config
5. **Updates** scripts and VSCode settings
6. **Preserves** your existing code style preferences where possible

## 📖 Manual Installation

If you prefer manual setup:

```bash
# Install the package from GitHub
npm install --save-dev github:JohnDeved/ox-standard

# Create config file
echo '{"extends": ["./node_modules/ox-standard/.oxlintrc.json"]}' > .oxlintrc.json

# Add scripts to package.json
npm pkg set scripts.lint="oxlint ."
npm pkg set scripts.lint:fix="oxlint . --fix"
```

## 🤝 Contributing

Found an issue or want to suggest improvements? [Open an issue](https://github.com/JohnDeved/ox-standard/issues) or submit a pull request.

## 📄 License

MIT © Johann Berger