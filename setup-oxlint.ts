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
  // If package.json exists, always assume Node.js
  if (fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
    return 'node'
  }

  // No package.json - check for Deno config files
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

  // Default to Node.js if no config found (will create package.json)
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
    const packageJsonPath = path.resolve(process.cwd(), 'package.json')

    // Create package.json if it doesn't exist
    if (!fs.existsSync(packageJsonPath)) {
      console.log('No package.json found. Initializing npm project...')
      try {
        execSync('npm init -y', { stdio: 'inherit' })
        console.log('✓ Created package.json')
      } catch {
        console.error('❌ Failed to create package.json')
        process.exit(1)
      }
    }

    // 2. Check for installed ESLint-related packages
    let installedPackages: string[] = []
    try {
      const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
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
    if (projectType === 'node') {
      // For Node.js projects, extend from the package config
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
      // For Deno projects, copy the Deno-specific config
      const packageRoot = path.dirname(__filename)
      const denoConfigPath = path.resolve(packageRoot, '.oxlintrc.deno.json')

      if (fs.existsSync(denoConfigPath)) {
        fs.copyFileSync(denoConfigPath, oxlintrcPath)
        console.log('✓ Created .oxlintrc.json with Deno-specific configuration')
      } else {
        console.warn('⚠️  Could not find Deno config template. Creating basic config.')
        const basicConfig = {
          extends: ['./node_modules/ox-standard/.oxlintrc.json'],
          env: { Deno: true, node: false },
          globals: { Deno: 'readonly' },
        }
        fs.writeFileSync(oxlintrcPath, JSON.stringify(basicConfig, undefined, 2))
      }
    }
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
    // Use npm pkg set to update package.json
    try {
      execSync('npm pkg set scripts.lint="oxlint --fix .; oxfmt ."', { stdio: 'inherit' })
      console.log('✓ Added lint script to package.json')
    } catch {
      console.warn('⚠️  Could not update package.json scripts')
    }
  } else {
    // For Deno projects, use deno task command
    console.log('ℹ️  To add lint task to deno.json, run:')
    console.log('  deno task add lint "npx oxlint --fix . && npx oxfmt ."')
    console.log('  Or manually add to deno.json:')
    console.log('  "tasks": { "lint": "npx oxlint --fix . && npx oxfmt ." }')
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
