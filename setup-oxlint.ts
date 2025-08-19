#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execSync } from 'child_process'

const OXLINT_CONFIG_FILES = [
  '.oxlintrc.json',
  'oxlint.json',
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.json',
]

// List of ESLint-related packages to check/uninstall
const ESLINT_PACKAGES = [
  'eslint',
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  'eslint-config-standard-with-typescript',
  'eslint-plugin-import',
  'eslint-plugin-node',
  'eslint-plugin-promise',
  'eslint-plugin-react',
  'eslint-plugin-react-hooks',
  'eslint-plugin-tailwindcss',
  '@eslint/js',
  'eslint-plugin-react-refresh',
  'typescript-eslint',
]

const prompt = (question: string): Promise<boolean> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, answer => {
      rl.close()
      resolve(/^y(es)?$/i.test(answer.trim()))
    })
  })
}

const main = async (): Promise<void> => {
  // 1. Check for existing linting config files
  const foundConfigs = OXLINT_CONFIG_FILES.filter(f => fs.existsSync(path.resolve(process.cwd(), f)))
  if (foundConfigs.length) {
    console.log('Found existing lint config files:', foundConfigs.join(', '))
    const shouldRemove = await prompt('Remove them before continuing?')
    if (shouldRemove) {
      for (const f of foundConfigs) {
        fs.rmSync(path.resolve(process.cwd(), f))
        console.log('Removed', f)
      }
    } else {
      console.log('Aborting setup.')
      process.exit(1)
    }
  }

  // 2. Check for installed ESLint-related packages
  let installedPackages: string[] = []
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'))
    const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
    installedPackages = ESLINT_PACKAGES.filter(pkg => allDeps?.[pkg])
  } catch {}

  if (installedPackages.length) {
    console.log('Found installed ESLint-related packages:', installedPackages.join(', '))
    const shouldUninstall = await prompt('Uninstall them before continuing?')
    if (shouldUninstall) {
      try {
        execSync(`npm uninstall ${installedPackages.join(' ')}`, { stdio: 'inherit' })
        console.log('Uninstalled:', installedPackages.join(', '))
      } catch {
        console.error('Failed to uninstall some packages. Please check manually.')
        process.exit(1)
      }
    } else {
      console.log('Aborting setup.')
      process.exit(1)
    }
  }

  // 3. Install undefined-lint
  console.log('Installing JohnDeved/undefined-lint...')
  execSync('npm i JohnDeved/undefined-lint', { stdio: 'inherit' })

  // 3.1. Install oxlint locally
  console.log('Installing oxlint...')
  execSync('npm i oxlint', { stdio: 'inherit' })

  // 4. Create .oxlintrc.json if not present
  const oxlintrcPath = path.resolve(process.cwd(), '.oxlintrc.json')
  if (!fs.existsSync(oxlintrcPath)) {
    fs.writeFileSync(
      oxlintrcPath,
      JSON.stringify({
        plugins: [
          "unicorn",
          "typescript", 
          "oxc",
          "react",
          "react_perf"
        ],
        categories: {
          correctness: "error",
          suspicious: "warn",
          style: "off"
        },
        rules: {
          "space-infix-ops": "error",
          "eqeqeq": "error",
          "curly": "error",
          "yoda": "error",
          "prefer-object-spread": "error",
          "prefer-template": "warn",
          "prefer-rest-params": "error",
          "prefer-destructuring": "warn",
          "prefer-exponentiation-operator": "error",
          "operator-assignment": "warn",
          "new-cap": "error",
          "no-multi-assign": "error",
          "no-nested-ternary": "warn",
          "no-duplicate-imports": "error",
          "no-template-curly-in-string": "error",
          "no-lone-blocks": "error",
          "no-labels": "error",
          "no-extra-label": "error",
          "sort-imports": "off",
          
          "unicorn/prefer-string-starts-ends-with": "error",
          "unicorn/prefer-string-trim-start-end": "error",
          "unicorn/prefer-spread": "error",
          "unicorn/prefer-logical-operator-over-ternary": "warn",
          "unicorn/prefer-includes": "error",
          "unicorn/prefer-array-index-of": "warn",
          "unicorn/prefer-object-from-entries": "warn",
          "unicorn/prefer-optional-catch-binding": "error",
          "unicorn/no-nested-ternary": "warn",
          "unicorn/no-console-spaces": "error",
          "unicorn/empty-brace-spaces": "error",
          "unicorn/throw-new-error": "error",
          "unicorn/number-literal-case": "error",
          "unicorn/no-zero-fractions": "error",
          "unicorn/consistent-existence-index-check": "warn",
          
          "no-var": "error",
          "no-debugger": "error",
          
          "typescript/consistent-type-definitions": "error",
          "typescript/consistent-type-imports": "error", 
          "typescript/no-inferrable-types": "error",
          "typescript/no-empty-interface": "warn",
          "typescript/no-explicit-any": "warn",
          "typescript/no-unnecessary-boolean-literal-compare": "error",
          "typescript/no-unnecessary-type-arguments": "error",
          "typescript/no-unnecessary-type-assertion": "error", 
          "typescript/no-unnecessary-type-constraint": "error",
          "typescript/non-nullable-type-assertion-style": "error",
          "typescript/prefer-as-const": "error",
          "typescript/array-type": "error",
          "typescript/ban-ts-comment": "error",
          "typescript/consistent-indexed-object-style": "error",
          "typescript/no-namespace": "error",
          "typescript/prefer-function-type": "error",
          "typescript/prefer-namespace-keyword": "error",
          "typescript/prefer-for-of": "warn",
          "typescript/no-confusing-void-expression": "off",
          "typescript/no-floating-promises": "off",
          "typescript/no-var-requires": "off",
          "typescript/no-misused-promises": "off",
          "typescript/explicit-function-return-type": "off",
          "typescript/promise-function-async": "off",
          "typescript/no-for-in-array": "off",
          "typescript/return-await": "off",
          "typescript/no-non-null-assertion": "off",
          
          "react/self-closing-comp": "error",
          "react/jsx-curly-brace-presence": "error",
          "react/jsx-fragments": "error", 
          "react/jsx-no-useless-fragment": "error",
          "react/jsx-boolean-value": "error",
          "react/rules-of-hooks": "error",
          "react/no-unknown-property": "off",
          "react/react-in-jsx-scope": "off",
          
          "import/no-duplicates": "error",
          "import/first": "error",
          "import/exports-last": "off",
          "import/no-anonymous-default-export": "warn"
        },
        settings: {
          "jsx-a11y": {
            polymorphicPropName: null,
            components: {},
            attributes: {}
          },
          next: {
            rootDir: []
          },
          react: {
            formComponents: [],
            linkComponents: [],
            version: "detect"
          },
          jsdoc: {
            ignorePrivate: false,
            ignoreInternal: false,
            ignoreReplacesDocs: true,
            overrideReplacesDocs: true,
            augmentsExtendsReplacesDocs: false,
            implementsReplacesDocs: false,
            exemptDestructuredRootsFromChecks: false,
            tagNamePreference: {}
          }
        },
        env: {
          builtin: true,
          browser: true,
          es2021: true,
          node: true,
          worker: true,
          mocha: true,
          jest: true
        },
        globals: {
          Atomics: "readonly",
          SharedArrayBuffer: "readonly"
        },
        ignorePatterns: []
      }, undefined, 2),
    )
    console.log('Created .oxlintrc.json')
  } else {
    console.log('.oxlintrc.json already exists, skipping creation.')
  }

  // 5. Add package.json scripts if not present
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      if (!packageJson.scripts) {
        packageJson.scripts = {}
      }
      
      // Add lint script if not present
      if (!packageJson.scripts.lint) {
        packageJson.scripts.lint = 'oxlint --react-plugin'
        console.log('Added lint script to package.json')
      }
      
      // Add lint:fix script if not present
      if (!packageJson.scripts['lint:fix']) {
        packageJson.scripts['lint:fix'] = 'oxlint --react-plugin --fix'
        console.log('Added lint:fix script to package.json')
      }
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, undefined, 2))
    } catch {
      console.log('Could not update package.json scripts')
    }
  }

  // 6. Create .vscode/settings.json for better IDE integration
  const vscodeDir = path.resolve(process.cwd(), '.vscode')
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir)
  }

  const settingsPath = path.resolve(vscodeDir, 'settings.json')
  let settings = {}
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    } catch {}
  }
  
  // Update settings for oxlint (remove eslint settings, add general editor settings)
  settings = {
    ...settings,
    'editor.tabSize': 2,
    'editor.codeActionsOnSave': {
      'source.fixAll': 'explicit',
    },
  }
  
  fs.writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2))
  console.log('Updated .vscode/settings.json')

  // 7. Create .vscode/extensions.json
  const extensionsPath = path.resolve(vscodeDir, 'extensions.json')
  let extensions = { recommendations: [] }
  if (fs.existsSync(extensionsPath)) {
    try {
      extensions = JSON.parse(fs.readFileSync(extensionsPath, 'utf8'))
    } catch {}
  }
  
  if (!extensions.recommendations) {
    extensions.recommendations = []
  }
  
  // Remove ESLint extension and add useful extensions
  extensions.recommendations = extensions.recommendations.filter((ext: string) => ext !== 'dbaeumer.vscode-eslint')
  
  const recommendedExtensions = [
    'bradlc.vscode-tailwindcss',
    'ms-vscode.vscode-typescript-next',
  ]
  
  for (const ext of recommendedExtensions) {
    if (!extensions.recommendations.includes(ext)) {
      extensions.recommendations.push(ext)
    }
  }
  
  fs.writeFileSync(extensionsPath, JSON.stringify(extensions, undefined, 2))
  console.log('Updated .vscode/extensions.json')

  console.log('\n✅ Setup complete!')
  console.log('You can now run:')
  console.log('  npm run lint       - to check for issues')
  console.log('  npm run lint:fix   - to auto-fix issues')
  console.log('  npx oxlint --help  - for more options')
}

main()