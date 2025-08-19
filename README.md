# undefined-lint (oxlint)

**Fast, comprehensive TypeScript/React linting with JavaScript Standard Style philosophy**

Migrated from ESLint to oxlint for **10x faster** linting performance while maintaining comprehensive rule coverage.

## 🎯 JavaScript Standard Style Focus

This configuration follows the [JavaScript Standard Style](https://standardjs.com/) philosophy with enhanced TypeScript and React support:

- **No semicolons** - Rely on automatic semicolon insertion  
- **Strict equality** - Always use `===` instead of `==`
- **Consistent spacing** - Proper spacing around operators and keywords
- **Modern JavaScript** - Prefer `const`/`let`, template literals, destructuring
- **Clean code patterns** - No unused variables, proper error handling
- **React best practices** - Hooks rules, JSX formatting, component patterns
- **TypeScript consistency** - Type imports, array syntax, interface style

## Quick Setup (one-liner)

You can set up oxlint in your project with a single command:

```
npx github:JohnDeved/undefined-lint
```

---

Manual steps (if you prefer):

1. Make sure you don't already have eslint or oxlint installed in your project (uninstall them first if you do)
2. Make sure you have a `tsconfig.json` in your project root.
3. Install the package:
   ```sh
   npm i JohnDeved/undefined-lint
   ```
4. Create `.oxlintrc.json` file in your project root:
   ```json
   {
     "extends": [
       "./node_modules/@undefined/lint/.oxlintrc.json"
     ]
   }
   ```
5. Add scripts to your `package.json`:
   ```json
   {
     "scripts": {
       "lint": "oxlint --react-plugin",
       "lint:fix": "oxlint --react-plugin --fix"
     }
   }
   ```
6. (Recommended) Add workspace settings `.vscode/settings.json` (the script does this for you, but you can also add manually):
   ```json
   {
      "editor.tabSize": 2,
      "editor.codeActionsOnSave": {
        "source.fixAll": "explicit"
      }
   }
   ```