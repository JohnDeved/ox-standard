#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execSync } from 'child_process'

type ProjectType = 'node' | 'deno'

const LINT_CONFIG_FILES = [
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

// List of formatter packages to check/uninstall
const FORMATTER_PACKAGES = [
  'prettier',
  '@prettier/plugin-tailwindcss',
  'prettier-plugin-organize-imports',
  'prettier-plugin-tailwindcss',
]

const prompt = (question: string): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise(resolve => {
    rl.question(`${question} (y/N): `, answer => {
      rl.close()
      resolve(/^y(es)?$/i.test(answer.trim()))
    })
  })
}

const detectProjectType = (): ProjectType => {
  // Check for Deno config files
  if (
    fs.existsSync(path.resolve(process.cwd(), 'deno.json')) ||
    fs.existsSync(path.resolve(process.cwd(), 'deno.jsonc'))
  ) {
    return 'deno'
  }

  // Check for Deno enabled in VSCode settings
  const vscodeSettingsPath = path.resolve(process.cwd(), '.vscode', 'settings.json')
  if (fs.existsSync(vscodeSettingsPath)) {
    try {
      const settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'))
      if (settings['deno.enable'] === true) {
        return 'deno'
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Check for package.json (Node.js)
  if (fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
    return 'node'
  }

  // Default to Node.js if no config found
  return 'node'
}

const isDenoAvailable = (): boolean => {
  try {
    execSync('deno --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Safely parse JSONC by removing comments while preserving string literals
const parseJsonc = (content: string): unknown => {
  // This is a simple but safe approach: remove comments outside of strings
  let inString = false
  let inSingleLineComment = false
  let inMultiLineComment = false
  let result = ''
  let escapeNext = false

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const nextChar = content[i + 1] || ''

    // Handle escape sequences in strings
    if (escapeNext) {
      if (inString) {
        result += char
      }
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      result += char
      escapeNext = true
      continue
    }

    // Toggle string state
    if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
      inString = !inString
      result += char
      continue
    }

    // Skip characters in comments
    if (inSingleLineComment) {
      if (char === '\n') {
        inSingleLineComment = false
        result += char
      }
      continue
    }

    if (inMultiLineComment) {
      if (char === '*' && nextChar === '/') {
        inMultiLineComment = false
        i++ // Skip the '/'
      }
      continue
    }

    // Detect comment starts (only outside strings)
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        inSingleLineComment = true
        i++ // Skip the second '/'
        continue
      }
      if (char === '/' && nextChar === '*') {
        inMultiLineComment = true
        i++ // Skip the '*'
        continue
      }
    }

    // Add character to result
    result += char
  }

  return JSON.parse(result)
}

const isVSCodeCliAvailable = (): boolean => {
  try {
    execSync('code --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const getInstalledVSCodeExtensions = (): string[] => {
  try {
    const output = execSync('code --list-extensions', { encoding: 'utf8' })
    return output.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

const installVSCodeExtensions = async (extensions: string[]): Promise<void> => {
  console.log('Installing VSCode extensions...')
  for (const extension of extensions) {
    try {
      console.log(`  Installing ${extension}...`)
      execSync(`code --install-extension ${extension}`, { stdio: 'inherit' })
      console.log(`  ✓ Installed ${extension}`)
    } catch {
      console.log(`  ⚠️  Failed to install ${extension}`)
    }
  }
}

const getTemplateVSCodeConfig = () => {
  // Read template files from this package's .vscode directory
  const packageRoot = path.dirname(__filename)
  const templateVSCodeDir = path.resolve(packageRoot, '.vscode')

  // Read template extensions.json
  const templateExtensionsPath = path.resolve(templateVSCodeDir, 'extensions.json')
  const templateExtensions = JSON.parse(fs.readFileSync(templateExtensionsPath, 'utf8'))

  // Read template settings.json
  const templateSettingsPath = path.resolve(templateVSCodeDir, 'settings.json')
  const templateSettings = JSON.parse(fs.readFileSync(templateSettingsPath, 'utf8'))

  return { templateExtensions, templateSettings }
}

const setupVSCode = async (): Promise<void> => {
  const vscodeDir = path.resolve(process.cwd(), '.vscode')
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir)
  }

  const { templateExtensions, templateSettings } = getTemplateVSCodeConfig()

  // Setup recommended extensions
  const extensionsPath = path.resolve(vscodeDir, 'extensions.json')
  fs.writeFileSync(extensionsPath, JSON.stringify(templateExtensions, undefined, 2))
  console.log('✓ Created .vscode/extensions.json with recommended extensions')

  // Check if VSCode CLI is available and offer to install extensions
  if (isVSCodeCliAvailable()) {
    const recommendedExtensions = templateExtensions.recommendations || []
    const installedExtensions = getInstalledVSCodeExtensions()
    const missingExtensions = recommendedExtensions.filter(
      (ext: string) => !installedExtensions.includes(ext)
    )

    if (missingExtensions.length > 0) {
      console.log(`\nDetected ${missingExtensions.length} missing recommended VSCode extension(s):`)
      missingExtensions.forEach((ext: string) => console.log(`  - ${ext}`))

      const shouldInstall = await prompt(
        '\nWould you like to install the missing extensions automatically?'
      )
      if (shouldInstall) {
        await installVSCodeExtensions(missingExtensions)
      } else {
        console.log('Skipping extension installation. You can install them manually later.')
      }
    } else {
      console.log('✓ All recommended VSCode extensions are already installed')
    }
  } else {
    console.log('⚠️  VSCode CLI not detected. Extensions will need to be installed manually.')
  }

  // Setup VSCode settings
  const settingsPath = path.resolve(vscodeDir, 'settings.json')
  let existingSettings = {}
  if (fs.existsSync(settingsPath)) {
    try {
      existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    } catch {}
  }

  const settings = {
    ...existingSettings,
    ...templateSettings,
  }

  // Remove any ESLint-specific and Prettier-specific settings
  delete settings['eslint.enable']
  delete settings['eslint.run']
  delete settings['prettier.enable']
  if (settings['editor.codeActionsOnSave']) {
    delete settings['editor.codeActionsOnSave']['source.fixAll.eslint']
  }

  fs.writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2))
  console.log('✓ Updated .vscode/settings.json with JavaScript Standard Style preferences')
}

const main = async (): Promise<void> => {
  const projectType = detectProjectType()

  if (projectType === 'deno') {
    console.log('🦕 Setting up oxlint for Deno project with JavaScript Standard Style...\n')
  } else {
    console.log('🚀 Setting up oxlint with JavaScript Standard Style and oxfmt formatter...\n')
  }

  // 1. Check for existing linting config files
  const foundConfigs = LINT_CONFIG_FILES.filter(f => fs.existsSync(path.resolve(process.cwd(), f)))
  if (foundConfigs.length) {
    console.log('Found existing lint config files:', foundConfigs.join(', '))
    const shouldRemove = await prompt('Remove them before continuing?')
    if (shouldRemove) {
      for (const f of foundConfigs) {
        fs.rmSync(path.resolve(process.cwd(), f))
        console.log('✓ Removed', f)
      }
    } else {
      console.log('❌ Aborting setup. Please remove existing config files first.')
      process.exit(1)
    }
  }

  if (projectType === 'node') {
    // Node.js specific setup
    // 2. Check for installed ESLint-related packages
    let installedPackages: string[] = []
    try {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')
      )
      const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
      installedPackages = [...ESLINT_PACKAGES, ...FORMATTER_PACKAGES].filter(pkg => allDeps?.[pkg])
    } catch {}

    if (installedPackages.length) {
      console.log('Found installed ESLint/formatter packages:', installedPackages.join(', '))
      const shouldUninstall = await prompt('Uninstall them before continuing?')
      if (shouldUninstall) {
        try {
          execSync(`npm uninstall ${installedPackages.join(' ')}`, {
            stdio: 'inherit',
          })
          console.log('✓ Uninstalled packages:', installedPackages.join(', '))
        } catch {
          console.error('❌ Failed to uninstall some packages. Please check manually.')
          process.exit(1)
        }
      } else {
        console.log('❌ Aborting setup. Please remove conflicting packages first.')
        process.exit(1)
      }
    }

    // 3. Install ox-standard from GitHub
    console.log('Installing ox-standard...')
    try {
      execSync('npm install --save-dev github:JohnDeved/ox-standard', {
        stdio: 'inherit',
      })
      console.log('✓ Installed ox-standard')
    } catch {
      console.error('❌ Failed to install ox-standard')
      process.exit(1)
    }
  } else {
    // Deno specific setup
    console.log('ℹ️  Deno project detected. Skipping npm package management.')

    if (!isDenoAvailable()) {
      console.error('❌ Deno is not available. Please install Deno first: https://deno.land/')
      process.exit(1)
    }

    console.log('✓ Deno runtime detected')
    console.log('ℹ️  For Deno projects, you will need to install oxlint and oxfmt manually:')
    console.log('  deno install -A -n oxlint https://esm.sh/oxlint')
    console.log('  deno install -A -n oxfmt https://esm.sh/oxfmt')
    console.log('  Or use npx: npx oxlint / npx oxfmt')
  }

  // 4. Create minimal .oxlintrc.json that extends from the package
  const oxlintrcPath = path.resolve(process.cwd(), '.oxlintrc.json')
  if (!fs.existsSync(oxlintrcPath)) {
    const config =
      projectType === 'node'
        ? {
            extends: ['./node_modules/ox-standard/.oxlintrc.json'],
            // Users can override rules here:
            // rules: {
            //   "no-console": "warn"
            // }
          }
        : {
            // Inline config for Deno since it doesn't have node_modules
            plugins: ['unicorn', 'typescript', 'oxc', 'react', 'react_perf'],
            categories: {
              correctness: 'error',
              suspicious: 'warn',
              style: 'off',
            },
            rules: {
              'space-infix-ops': 'error',
              eqeqeq: 'error',
              curly: 'allow',
              yoda: 'error',
              'prefer-object-spread': 'error',
              'prefer-template': 'warn',
              'prefer-rest-params': 'error',
              'prefer-destructuring': 'warn',
              'prefer-exponentiation-operator': 'error',
              'operator-assignment': 'warn',
              'new-cap': 'error',
              'no-multi-assign': 'error',
              'no-nested-ternary': 'warn',
              'no-duplicate-imports': 'error',
              'no-template-curly-in-string': 'error',
              'no-lone-blocks': 'error',
              'no-labels': 'error',
              'no-extra-label': 'error',
              'sort-imports': 'off',
              'unicorn/prefer-string-starts-ends-with': 'error',
              'unicorn/prefer-string-trim-start-end': 'error',
              'unicorn/prefer-spread': 'error',
              'unicorn/prefer-logical-operator-over-ternary': 'warn',
              'unicorn/prefer-includes': 'error',
              'unicorn/prefer-array-index-of': 'warn',
              'unicorn/prefer-object-from-entries': 'warn',
              'unicorn/prefer-optional-catch-binding': 'error',
              'unicorn/prefer-global-this': 'warn',
              'unicorn/no-nested-ternary': 'warn',
              'unicorn/no-console-spaces': 'error',
              'unicorn/empty-brace-spaces': 'error',
              'unicorn/throw-new-error': 'error',
              'unicorn/number-literal-case': 'error',
              'unicorn/no-zero-fractions': 'error',
              'unicorn/consistent-existence-index-check': 'warn',
              'no-var': 'error',
              'no-debugger': 'error',
              'typescript/consistent-type-definitions': 'error',
              'typescript/consistent-type-imports': 'error',
              'typescript/no-inferrable-types': 'error',
              'typescript/no-empty-interface': 'warn',
              'typescript/no-explicit-any': 'warn',
              'typescript/no-unnecessary-boolean-literal-compare': 'error',
              'typescript/no-unnecessary-type-arguments': 'error',
              'typescript/no-unnecessary-type-assertion': 'error',
              'typescript/no-unnecessary-type-constraint': 'error',
              'typescript/non-nullable-type-assertion-style': 'error',
              'typescript/prefer-as-const': 'error',
              'typescript/array-type': 'error',
              'typescript/ban-ts-comment': 'error',
              'typescript/consistent-indexed-object-style': 'error',
              'typescript/no-namespace': 'error',
              'typescript/prefer-function-type': 'error',
              'typescript/prefer-namespace-keyword': 'error',
              'typescript/prefer-for-of': 'warn',
              'typescript/no-confusing-void-expression': 'off',
              'typescript/no-floating-promises': 'off',
              'typescript/no-var-requires': 'off',
              'typescript/no-misused-promises': 'off',
              'typescript/explicit-function-return-type': 'off',
              'typescript/promise-function-async': 'off',
              'typescript/no-for-in-array': 'off',
              'typescript/return-await': 'off',
              'typescript/no-non-null-assertion': 'off',
              'react/self-closing-comp': 'error',
              'react/jsx-curly-brace-presence': 'error',
              'react/jsx-fragments': 'error',
              'react/jsx-no-useless-fragment': 'error',
              'react/jsx-boolean-value': 'error',
              'react/rules-of-hooks': 'error',
              'react/no-unknown-property': 'off',
              'react/react-in-jsx-scope': 'off',
              'react/jsx-key': 'warn',
              'import/no-duplicates': 'error',
              'import/first': 'error',
              'import/exports-last': 'off',
              'import/no-anonymous-default-export': 'warn',
            },
            settings: {
              'jsx-a11y': {
                polymorphicPropName: null,
                components: {},
                attributes: {},
              },
              next: {
                rootDir: [],
              },
              react: {
                formComponents: [],
                linkComponents: [],
                version: 'detect',
              },
              jsdoc: {
                ignorePrivate: false,
                ignoreInternal: false,
                ignoreReplacesDocs: true,
                overrideReplacesDocs: true,
                augmentsExtendsReplacesDocs: false,
                implementsReplacesDocs: false,
                exemptDestructuredRootsFromChecks: false,
                tagNamePreference: {},
              },
            },
            env: {
              builtin: true,
              browser: true,
              es2021: true,
              node: false,
              worker: true,
              mocha: false,
              jest: false,
              Deno: true,
            },
            globals: {
              Deno: 'readonly',
              Atomics: 'readonly',
              SharedArrayBuffer: 'readonly',
            },
            ignorePatterns: [
              'node_modules/**',
              'dist/**',
              'build/**',
              'coverage/**',
              '.next/**',
              'out/**',
            ],
          }
    fs.writeFileSync(oxlintrcPath, JSON.stringify(config, undefined, 2))
    console.log(
      `✓ Created .oxlintrc.json ${projectType === 'node' ? 'extending ox-standard config' : 'with Deno-specific configuration'}`
    )
  } else {
    console.log('⚠️  .oxlintrc.json already exists, skipping creation.')
  }

  // 5. Create .oxfmtrc.json configuration file
  const oxfmtPath = path.resolve(process.cwd(), '.oxfmtrc.json')
  if (!fs.existsSync(oxfmtPath)) {
    const oxfmtConfig = {
      singleQuote: true,
      semi: false,
      printWidth: 100,
      tabWidth: 2,
      trailingComma: 'es5',
      arrowParens: 'avoid',
    }
    fs.writeFileSync(oxfmtPath, JSON.stringify(oxfmtConfig, undefined, 2))
    console.log('✓ Created .oxfmtrc.json with JavaScript Standard Style config')
  } else {
    console.log('⚠️  .oxfmtrc.json already exists, skipping creation.')
  }

  // 6. Update package.json or deno.json with lint and format scripts
  if (projectType === 'node') {
    const packageJsonPath = path.resolve(process.cwd(), 'package.json')
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        if (!packageJson.scripts) {
          packageJson.scripts = {}
        }

        // Add/update lint script that does both linting with fixes and formatting
        packageJson.scripts.lint = 'oxlint --fix .; oxfmt .'

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, undefined, 2))
        console.log('✓ Added lint script to package.json')
      } catch {
        console.warn('⚠️  Could not update package.json scripts')
      }
    }
  } else {
    // Deno project - update deno.json or deno.jsonc
    const denoJsonPath = path.resolve(process.cwd(), 'deno.json')
    const denoJsoncPath = path.resolve(process.cwd(), 'deno.jsonc')
    let configPath = denoJsonPath
    if (fs.existsSync(denoJsonPath)) {
      configPath = denoJsonPath
    } else if (fs.existsSync(denoJsoncPath)) {
      configPath = denoJsoncPath
    }

    try {
      let denoConfig: Record<string, unknown> = {}
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8')
        // Use safe JSONC parser that preserves strings
        denoConfig = parseJsonc(content) as Record<string, unknown>
      }

      if (!denoConfig.tasks) {
        denoConfig.tasks = {}
      }

      // Add/update lint task
      ;(denoConfig.tasks as Record<string, string>).lint = 'npx oxlint --fix . && npx oxfmt .'

      fs.writeFileSync(configPath, JSON.stringify(denoConfig, undefined, 2))
      console.log(`✓ Added lint task to ${path.basename(configPath)}`)
    } catch (error) {
      console.warn(`⚠️  Could not update ${path.basename(configPath)} tasks:`, error)
    }
  }

  // 7. Setup VSCode integration
  await setupVSCode()

  console.log('\n✅ Setup complete!')
  console.log('\n📋 Next steps:')

  if (projectType === 'node') {
    console.log('  npm run lint       - Lint and format code automatically')
  } else {
    console.log('  deno task lint     - Lint and format code automatically')
    console.log('  or: npx oxlint --fix . && npx oxfmt .')
  }

  console.log('  npx oxlint --help  - View all oxlint options')
  console.log('  npx oxfmt --help   - View all oxfmt options')
  console.log('\n📖 Customize rules in .oxlintrc.json and .oxfmtrc.json if needed')
  console.log('🔧 JavaScript Standard Style is enforced for both linting and formatting')
}

main().catch(console.error)
