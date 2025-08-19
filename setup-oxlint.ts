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

const setupVSCode = () => {
  const vscodeDir = path.resolve(process.cwd(), '.vscode')
  if (!fs.existsSync(vscodeDir)) {
    fs.mkdirSync(vscodeDir)
  }

  // Setup recommended extensions
  const extensionsPath = path.resolve(vscodeDir, 'extensions.json')
  const extensions = {
    recommendations: [
      'bradlc.vscode-tailwindcss',
      'ms-vscode.vscode-typescript-next',
      'esbenp.prettier-vscode'
    ]
  }
  fs.writeFileSync(extensionsPath, JSON.stringify(extensions, undefined, 2))
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
    'editor.tabSize': 2,
    'editor.insertSpaces': true,
    'editor.detectIndentation': false,
    'editor.codeActionsOnSave': {
      'source.fixAll': 'explicit'
    },
    'editor.formatOnSave': true,
    'files.eol': '\n'
  }
  
  // Remove any ESLint-specific settings
  delete settings['eslint.enable']
  delete settings['eslint.run']
  if (settings['editor.codeActionsOnSave']) {
    delete settings['editor.codeActionsOnSave']['source.fixAll.eslint']
  }
  
  fs.writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2))
  console.log('✓ Updated .vscode/settings.json with JavaScript Standard Style preferences')
}

const main = async (): Promise<void> => {
  console.log('🚀 Setting up oxlint with JavaScript Standard Style...\n')

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
        console.log('✓ Uninstalled ESLint packages:', installedPackages.join(', '))
      } catch {
        console.error('❌ Failed to uninstall some packages. Please check manually.')
        process.exit(1)
      }
    } else {
      console.log('❌ Aborting setup. Please remove ESLint packages first.')
      process.exit(1)
    }
  }

  // 3. Install ox-standard from GitHub (which includes oxlint as dependency)
  console.log('Installing ox-standard from GitHub...')
  try {
    execSync('npm install --save-dev github:JohnDeved/ox-standard', { stdio: 'inherit' })
    console.log('✓ Installed ox-standard from GitHub with oxlint')
  } catch {
    console.error('❌ Failed to install ox-standard from GitHub')
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

  // 5. Update package.json with lint scripts
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      if (!packageJson.scripts) {
        packageJson.scripts = {}
      }
      
      // Add/update lint scripts
      packageJson.scripts.lint = 'oxlint .'
      packageJson.scripts['lint:fix'] = 'oxlint . --fix'
      packageJson.scripts['lint:semi'] = 'node ./node_modules/ox-standard/semi-rule-extension.js .'
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, undefined, 2))
      console.log('✓ Added lint scripts to package.json')
    } catch {
      console.warn('⚠️  Could not update package.json scripts')
    }
  }

  // 6. Setup VSCode integration
  setupVSCode()

  console.log('\n✅ Setup complete!')
  console.log('\n📋 Next steps:')
  console.log('  npm run lint       - Check for linting issues')
  console.log('  npm run lint:fix   - Auto-fix linting issues')
  console.log('  npm run lint:semi  - Check semicolon usage (JavaScript Standard Style)')
  console.log('  npx oxlint --help  - View all oxlint options')
  console.log('\n📖 Customize rules in .oxlintrc.json if needed')
  console.log('🔧 JavaScript Standard Style is enforced by default')
  console.log('🚫 Semicolon rule extension included for complete Standard Style compliance')
}

main().catch(console.error)