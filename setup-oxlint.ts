#!/usr/bin/env tsx
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { execSync } from 'node:child_process'

type ProjectType = 'node' | 'deno' | 'bun'

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

const FORMATTER_CONFIG_FILES = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
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

const promptChoice = (question: string, choices: string[]): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise(resolve => {
    console.log(question)
    choices.forEach((choice, index) => {
      console.log(`  ${index + 1}. ${choice}`)
    })
    rl.question(`Enter your choice (1-${choices.length}): `, answer => {
      rl.close()
      const choice = parseInt(answer.trim())
      if (choice >= 1 && choice <= choices.length) {
        resolve(choices[choice - 1].toLowerCase().split(' ')[0])
      } else {
        console.log('Invalid choice, defaulting to Node.js')
        resolve('node')
      }
    })
  })
}

const detectProjectType = (): { type: ProjectType; needsConfirmation: boolean } => {
  if (fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
    return { type: 'node', needsConfirmation: false }
  }
  if (hasDenoConfigFile() || hasDenoEnabledInVSCode()) {
    return { type: 'deno', needsConfirmation: true }
  }
  return { type: 'node', needsConfirmation: true }
}

const hasDenoConfigFile = (): boolean =>
  fs.existsSync(path.resolve(process.cwd(), 'deno.json')) ||
  fs.existsSync(path.resolve(process.cwd(), 'deno.jsonc'))

const hasDenoEnabledInVSCode = (): boolean => {
  const vscodeSettingsPath = path.resolve(process.cwd(), '.vscode', 'settings.json')
  if (!fs.existsSync(vscodeSettingsPath)) return false
  try {
    const settings = JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8'))
    return settings['deno.enable'] === true
  } catch {
    return false
  }
}

const confirmProjectType = async (
  detectedType: ProjectType,
  needsConfirmation: boolean
): Promise<ProjectType> => {
  if (!needsConfirmation) {
    return detectedType
  }

  const typeLabel = detectedType === 'deno' ? 'Deno' : 'Node.js'
  console.log(`\nDetected project type: ${typeLabel}`)
  const isCorrect = await prompt('Is this correct?')

  if (isCorrect) {
    return detectedType
  }

  // Let user choose
  const choice = await promptChoice('\nPlease select your project type:', [
    'Node.js',
    'Deno',
    'Bun',
  ])

  if (choice === 'bun') {
    console.log('\n❌ Bun is not supported at this time.')
    console.log('Please choose another option.\n')
    return confirmProjectType(detectedType, true)
  }

  return choice as ProjectType
}

const isDenoAvailable = (): boolean => {
  try {
    execSync('deno --version', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const parseReactMajor = (raw: unknown): string | undefined => {
  if (typeof raw !== 'string' || !raw) return undefined
  const match = raw.match(/(\d{1,2})/)
  if (!match) return undefined
  const major = Number.parseInt(match[1], 10)
  return Number.isNaN(major) || major < 1 ? undefined : String(major)
}

const detectReactMajorVersion = (packageJsonPath: string): string | undefined => {
  try {
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    const allDeps = {
      ...pkgJson.dependencies,
      ...pkgJson.devDependencies,
      ...pkgJson.peerDependencies,
    }
    return parseReactMajor(allDeps?.react)
  } catch {
    return undefined
  }
}

const generateDenoConfig = (baseConfigPath: string): Record<string, unknown> => {
  // Read the base config
  const baseConfig = JSON.parse(fs.readFileSync(baseConfigPath, 'utf8'))

  // Modify for Deno
  return {
    ...baseConfig,
    env: {
      ...baseConfig.env,
      node: false,
      mocha: false,
      jest: false,
      Deno: true,
    },
    globals: {
      ...baseConfig.globals,
      Deno: 'readonly',
    },
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

const installMissingVSCodeExtensions = async (recommendations: string[]): Promise<void> => {
  if (!isVSCodeCliAvailable()) {
    console.log('⚠️  VSCode CLI not detected. Extensions will need to be installed manually.')
    return
  }
  const installed = getInstalledVSCodeExtensions()
  const missing = recommendations.filter(ext => !installed.includes(ext))
  if (missing.length === 0) {
    console.log('✓ All recommended VSCode extensions are already installed')
    return
  }
  console.log(`\nDetected ${missing.length} missing recommended VSCode extension(s):`)
  missing.forEach(ext => console.log(`  - ${ext}`))
  const shouldInstall = await prompt(
    '\nWould you like to install the missing extensions automatically?'
  )
  if (shouldInstall) await installVSCodeExtensions(missing)
  else console.log('Skipping extension installation. You can install them manually later.')
}

const writeVSCodeSettings = (
  vscodeDir: string,
  templateSettings: Record<string, unknown>
): void => {
  const settingsPath = path.resolve(vscodeDir, 'settings.json')
  let existingSettings: Record<string, unknown> = {}
  if (fs.existsSync(settingsPath)) {
    try {
      existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
    } catch {}
  }
  const settings: Record<string, unknown> = { ...existingSettings, ...templateSettings }
  delete settings['eslint.enable']
  delete settings['eslint.run']
  delete settings['prettier.enable']
  const codeActions = settings['editor.codeActionsOnSave'] as Record<string, unknown> | undefined
  if (codeActions) delete codeActions['source.fixAll.eslint']

  fs.writeFileSync(settingsPath, JSON.stringify(settings, undefined, 2))
  console.log('✓ Updated .vscode/settings.json with JavaScript Standard Style preferences')
}

const setupVSCode = async (): Promise<void> => {
  const vscodeDir = path.resolve(process.cwd(), '.vscode')
  if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir)

  const { templateExtensions, templateSettings } = getTemplateVSCodeConfig()

  fs.writeFileSync(
    path.resolve(vscodeDir, 'extensions.json'),
    JSON.stringify(templateExtensions, undefined, 2)
  )
  console.log('✓ Created .vscode/extensions.json with recommended extensions')

  await installMissingVSCodeExtensions(templateExtensions.recommendations || [])
  writeVSCodeSettings(vscodeDir, templateSettings)
}

const removeExistingConfigFilesOrAbort = async (): Promise<void> => {
  const found = [...LINT_CONFIG_FILES, ...FORMATTER_CONFIG_FILES].filter(f =>
    fs.existsSync(path.resolve(process.cwd(), f))
  )
  if (found.length === 0) return

  console.log('Found existing lint/formatter config files:', found.join(', '))
  const shouldRemove = await prompt('Remove them before continuing?')
  if (!shouldRemove) {
    console.log('❌ Aborting setup. Please remove existing config files first.')
    process.exit(1)
  }
  for (const f of found) {
    fs.rmSync(path.resolve(process.cwd(), f))
    console.log('✓ Removed', f)
  }
}

const ensurePackageJson = (packageJsonPath: string): void => {
  if (fs.existsSync(packageJsonPath)) return
  console.log('No package.json found. Initializing npm project...')
  try {
    execSync('npm init -y', { stdio: 'inherit' })
    console.log('✓ Created package.json')
  } catch {
    console.error('❌ Failed to create package.json')
    process.exit(1)
  }
}

const findInstalledLegacyPackages = (packageJsonPath: string): string[] => {
  try {
    const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
    return [...ESLINT_PACKAGES, ...FORMATTER_PACKAGES].filter(pkg => allDeps?.[pkg])
  } catch {
    return []
  }
}

const uninstallLegacyPackagesOrAbort = async (packageJsonPath: string): Promise<void> => {
  const installed = findInstalledLegacyPackages(packageJsonPath)
  if (installed.length === 0) return

  console.log('Found installed ESLint/formatter packages:', installed.join(', '))
  const shouldUninstall = await prompt('Uninstall them before continuing?')
  if (!shouldUninstall) {
    console.log('❌ Aborting setup. Please remove conflicting packages first.')
    process.exit(1)
  }
  try {
    execSync(`npm uninstall ${installed.join(' ')}`, { stdio: 'inherit' })
    console.log('✓ Uninstalled packages:', installed.join(', '))
  } catch {
    console.error('❌ Failed to uninstall some packages. Please check manually.')
    process.exit(1)
  }
}

const installOxStandard = (): void => {
  console.log('Installing ox-standard...')
  try {
    execSync('npm install --save-dev github:JohnDeved/ox-standard', { stdio: 'inherit' })
    console.log('✓ Installed ox-standard')
  } catch {
    console.error('❌ Failed to install ox-standard')
    process.exit(1)
  }
}

const setupNodeProject = async (): Promise<void> => {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json')
  ensurePackageJson(packageJsonPath)
  await uninstallLegacyPackagesOrAbort(packageJsonPath)
  installOxStandard()
}

const setupDenoProject = (): void => {
  if (!isDenoAvailable()) {
    console.error('❌ Deno is not available. Please install Deno first: https://deno.land/')
    process.exit(1)
  }
  console.log('✓ Deno project detected - will use npx for oxlint and oxfmt')
}

const buildNodeOxlintConfig = (): Record<string, unknown> => {
  const reactMajor = detectReactMajorVersion(path.resolve(process.cwd(), 'package.json'))
  return {
    extends: ['./node_modules/ox-standard/.oxlintrc.json'],
    ...(reactMajor ? { settings: { react: { version: reactMajor } } } : {}),
  }
}

const buildDenoOxlintConfig = (): Record<string, unknown> => {
  const baseConfigPath = path.resolve(path.dirname(__filename), '.oxlintrc.json')
  if (fs.existsSync(baseConfigPath)) return generateDenoConfig(baseConfigPath)
  console.warn('⚠️  Could not find base config. Creating basic Deno config.')
  return {
    env: { Deno: true, node: false, builtin: true, browser: true, es2021: true },
    globals: { Deno: 'readonly' },
  }
}

const createOxlintConfig = (projectType: ProjectType): void => {
  const oxlintrcPath = path.resolve(process.cwd(), '.oxlintrc.json')
  if (fs.existsSync(oxlintrcPath)) {
    console.log('⚠️  .oxlintrc.json already exists, skipping creation.')
    return
  }
  const config = projectType === 'node' ? buildNodeOxlintConfig() : buildDenoOxlintConfig()
  fs.writeFileSync(oxlintrcPath, JSON.stringify(config, undefined, 2))
  const label =
    projectType === 'node'
      ? 'extending ox-standard config'
      : 'with auto-generated Deno-specific configuration'
  console.log(`✓ Created .oxlintrc.json ${label}`)
}

const createOxfmtConfig = (): void => {
  const oxfmtPath = path.resolve(process.cwd(), '.oxfmtrc.json')
  if (fs.existsSync(oxfmtPath)) {
    console.log('⚠️  .oxfmtrc.json already exists, skipping creation.')
    return
  }
  fs.writeFileSync(
    oxfmtPath,
    JSON.stringify(
      {
        singleQuote: true,
        semi: false,
        printWidth: 100,
        tabWidth: 2,
        trailingComma: 'es5',
        arrowParens: 'avoid',
      },
      undefined,
      2
    )
  )
  console.log('✓ Created .oxfmtrc.json with JavaScript Standard Style config')
}

const addNodeLintScript = (): void => {
  try {
    execSync('npm pkg set scripts.lint="oxlint --fix .; oxfmt ."', { stdio: 'inherit' })
    console.log('✓ Added lint script to package.json')
  } catch {
    console.warn('⚠️  Could not update package.json scripts')
  }
}

const resolveDenoConfigPath = (): string => {
  const denoJsoncPath = path.resolve(process.cwd(), 'deno.jsonc')
  const denoJsonPath = path.resolve(process.cwd(), 'deno.json')
  if (!fs.existsSync(denoJsonPath) && fs.existsSync(denoJsoncPath)) return denoJsoncPath
  return denoJsonPath
}

const addDenoLintTask = (): void => {
  const configPath = resolveDenoConfigPath()
  try {
    let denoConfig: Record<string, unknown> = {}
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8')
      try {
        denoConfig = JSON.parse(content)
      } catch {
        console.warn('⚠️  Could not parse existing deno config, creating new one')
      }
    }
    if (!denoConfig.tasks) denoConfig.tasks = {}
    ;(denoConfig.tasks as Record<string, string>).lint = 'npx oxlint --fix . && npx oxfmt .'
    fs.writeFileSync(configPath, JSON.stringify(denoConfig, null, 2))
    console.log(`✓ Added lint task to ${path.basename(configPath)}`)
  } catch (error) {
    console.warn('⚠️  Could not update deno config:', error)
  }
}

const addLintScript = (projectType: ProjectType): void => {
  if (projectType === 'node') addNodeLintScript()
  else addDenoLintTask()
}

const printNextSteps = (projectType: ProjectType): void => {
  console.log('\n✅ Setup complete!')
  console.log('\n📋 Next steps:')
  if (projectType === 'node')
    console.log('  npm run lint       - Lint and format code automatically')
  else console.log('  deno task lint     - Lint and format code automatically')
  console.log('\n📖 Customize rules in .oxlintrc.json and .oxfmtrc.json if needed')
  console.log('🔧 JavaScript Standard Style is enforced for both linting and formatting')
}

const printIntro = (projectType: ProjectType): void => {
  if (projectType === 'deno') {
    console.log('\n🦕 Setting up oxlint for Deno project with JavaScript Standard Style...\n')
  } else {
    console.log('\n🚀 Setting up oxlint with JavaScript Standard Style and oxfmt formatter...\n')
  }
}

const main = async (): Promise<void> => {
  const detection = detectProjectType()
  const projectType = await confirmProjectType(detection.type, detection.needsConfirmation)

  printIntro(projectType)
  await removeExistingConfigFilesOrAbort()

  if (projectType === 'node') await setupNodeProject()
  else setupDenoProject()

  createOxlintConfig(projectType)
  createOxfmtConfig()
  addLintScript(projectType)

  await setupVSCode()
  printNextSteps(projectType)
}

main().catch(console.error)
