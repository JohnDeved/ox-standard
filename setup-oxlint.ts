#!/usr/bin/env tsx
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { execSync } from 'child_process'

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
  'biome.json',
  'biome.jsonc',
  '.biome.json',
  '.biome.jsonc',
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

const setupVSCode = () => {
  const vscodeDir = path.resolve(process.cwd(), '.vscode')
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir)
  }

  const { templateExtensions, templateSettings } = getTemplateVSCodeConfig()

  // Setup recommended extensions
  const extensionsPath = path.resolve(vscodeDir, 'extensions.json')
  fs.writeFileSync(extensionsPath, JSON.stringify(templateExtensions, undefined, 2))
  console.log('✓ Created .vscode/extensions.json with recommended extensions')

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
  console.log(
    '✓ Updated .vscode/settings.json with JavaScript Standard Style preferences'
  )
}

const main = async (): Promise<void> => {
  console.log(
    '🚀 Setting up oxlint with JavaScript Standard Style and Biome formatter...\n'
  )

  // 1. Check for existing linting config files
  const foundConfigs = LINT_CONFIG_FILES.filter(f =>
    fs.existsSync(path.resolve(process.cwd(), f))
  )
  if (foundConfigs.length) {
    console.log('Found existing lint config files:', foundConfigs.join(', '))
    const shouldRemove = await prompt('Remove them before continuing?')
    if (shouldRemove) {
      for (const f of foundConfigs) {
        fs.rmSync(path.resolve(process.cwd(), f))
        console.log('✓ Removed', f)
      }
    } else {
      console.log(
        '❌ Aborting setup. Please remove existing config files first.'
      )
      process.exit(1)
    }
  }

  // 2. Check for installed ESLint-related packages
  let installedPackages: string[] = []
  try {
    const pkgJson = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')
    )
    const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
    installedPackages = [...ESLINT_PACKAGES, ...FORMATTER_PACKAGES].filter(
      pkg => allDeps?.[pkg]
    )
  } catch {}

  if (installedPackages.length) {
    console.log(
      'Found installed ESLint/formatter packages:',
      installedPackages.join(', ')
    )
    const shouldUninstall = await prompt('Uninstall them before continuing?')
    if (shouldUninstall) {
      try {
        execSync(`npm uninstall ${installedPackages.join(' ')}`, {
          stdio: 'inherit',
        })
        console.log('✓ Uninstalled packages:', installedPackages.join(', '))
      } catch {
        console.error(
          '❌ Failed to uninstall some packages. Please check manually.'
        )
        process.exit(1)
      }
    } else {
      console.log(
        '❌ Aborting setup. Please remove conflicting packages first.'
      )
      process.exit(1)
    }
  }

  // 3. Install ox-standard from GitHub
  console.log('Installing ox-standard...')
  try {
    execSync(
      'npm install --save-dev github:JohnDeved/ox-standard',
      { stdio: 'inherit' }
    )
    console.log('✓ Installed ox-standard')
  } catch {
    console.error('❌ Failed to install ox-standard')
    process.exit(1)
  }

  // 4. Create minimal .oxlintrc.json that extends from the package
  const oxlintrcPath = path.resolve(process.cwd(), '.oxlintrc.json')
  if (!fs.existsSync(oxlintrcPath)) {
    const config = {
      extends: ['./node_modules/ox-standard/.oxlintrc.json'],
      // Users can override rules here:
      // rules: {
      //   "no-console": "warn"
      // }
    }
    fs.writeFileSync(oxlintrcPath, JSON.stringify(config, undefined, 2))
    console.log('✓ Created .oxlintrc.json extending ox-standard config')
  } else {
    console.log('⚠️  .oxlintrc.json already exists, skipping creation.')
  }

  // 5. Create biome.json configuration file
  const biomePath = path.resolve(process.cwd(), 'biome.json')
  if (!fs.existsSync(biomePath)) {
    const biomeConfig = {
      extends: ['./node_modules/ox-standard/biome.json'],
      // Users can override settings here
    }
    fs.writeFileSync(biomePath, JSON.stringify(biomeConfig, undefined, 2))
    console.log('✓ Created biome.json extending ox-standard config')
  } else {
    console.log('⚠️  biome.json already exists, skipping creation.')
  }

  // 6. Update package.json with lint and format scripts
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      if (!packageJson.scripts) {
        packageJson.scripts = {}
      }

      // Add/update lint script that does both linting with fixes and formatting
      packageJson.scripts.lint = 'oxlint --fix --ignore-pattern "node_modules/**" .; biome format --write .'

      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, undefined, 2)
      )
      console.log('✓ Added lint script to package.json')
    } catch {
      console.warn('⚠️  Could not update package.json scripts')
    }
  }

  // 7. Setup VSCode integration
  setupVSCode()

  console.log('\n✅ Setup complete!')
  console.log('\n📋 Next steps:')
  console.log('  npm run lint       - Lint and format code automatically')
  console.log('  npx oxlint --help  - View all oxlint options')
  console.log('  npx biome --help   - View all biome options')
  console.log('\n📖 Customize rules in .oxlintrc.json and biome.json if needed')
  console.log(
    '🔧 JavaScript Standard Style is enforced for both linting and formatting'
  )
}

main().catch(console.error)
