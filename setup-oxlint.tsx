#!/usr/bin/env tsx
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import React, { useState, useEffect } from 'react'
import { render, Box, Text } from 'ink'
import { ConfirmInput, Spinner } from '@inkjs/ui'

const LINT_CONFIG_FILES = ['.oxlintrc.json', 'oxlint.json', '.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.yaml', '.eslintrc.yml', 'eslint.config.js', 'eslint.json', 'biome.json', 'biome.jsonc', '.biome.json', '.biome.jsonc']

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
const FORMATTER_PACKAGES = ['prettier', '@prettier/plugin-tailwindcss', 'prettier-plugin-organize-imports', 'prettier-plugin-tailwindcss']

// Setup step types
type SetupStep = 'welcome' | 'config-check' | 'package-check' | 'install' | 'config-create' | 'vscode-setup' | 'complete'

interface SetupState {
  step: SetupStep
  foundConfigs: string[]
  installedPackages: string[]
  isComplete: boolean
  error: string | null
}

// Utility functions
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
  for (const extension of extensions) {
    try {
      execSync(`code --install-extension ${extension}`, { stdio: 'pipe' })
    } catch {
      // Ignore failures for now
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

// React components for setup UI
const WelcomeComponent: React.FC = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text color="cyan" bold>
      🚀 Setting up oxlint with JavaScript Standard Style and Biome formatter...
    </Text>
    <Text color="gray">Creating a fast, comprehensive TypeScript/React linting setup</Text>
  </Box>
)

const StepHeader: React.FC<{ title: string; step: number; total: number }> = ({ title, step, total }) => (
  <Box marginBottom={1}>
    <Text color="blue" bold>
      [{step}/{total}]{' '}
    </Text>
    <Text>{title}</Text>
  </Box>
)

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
  <Box>
    <Spinner type="dots" />
    <Text> {text}</Text>
  </Box>
)

const ErrorDisplay: React.FC<{ error: string }> = ({ error }) => (
  <Box>
    <Text color="red">❌ {error}</Text>
  </Box>
)

const SuccessMessage: React.FC<{ message: string }> = ({ message }) => (
  <Box>
    <Text color="green">✓ {message}</Text>
  </Box>
)

const ConfigCheckComponent: React.FC<{
  foundConfigs: string[]
  onRemove: () => void
  onSkip: () => void
}> = ({ foundConfigs, onRemove, onSkip }) => {
  if (foundConfigs.length === 0) return null

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="yellow">Found existing lint config files: {foundConfigs.join(', ')}</Text>
      <Box marginTop={1}>
        <Text>Remove them before continuing?</Text>
        <ConfirmInput onConfirm={onRemove} onCancel={onSkip} />
      </Box>
    </Box>
  )
}

const PackageCheckComponent: React.FC<{
  installedPackages: string[]
  onUninstall: () => void
  onSkip: () => void
}> = ({ installedPackages, onUninstall, onSkip }) => {
  if (installedPackages.length === 0) return null

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="yellow">Found installed ESLint/formatter packages: {installedPackages.join(', ')}</Text>
      <Box marginTop={1}>
        <Text>Uninstall them before continuing?</Text>
        <ConfirmInput onConfirm={onUninstall} onCancel={onSkip} />
      </Box>
    </Box>
  )
}

const VSCodeExtensionComponent: React.FC<{
  missingExtensions: string[]
  onInstall: () => void
  onSkip: () => void
}> = ({ missingExtensions, onInstall, onSkip }) => {
  if (missingExtensions.length === 0) return null

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color="cyan">Detected {missingExtensions.length} missing recommended VSCode extension(s):</Text>
      {missingExtensions.map(ext => (
        <Text key={ext} color="gray">
          {' '}
          - {ext}
        </Text>
      ))}
      <Box marginTop={1}>
        <Text>Would you like to install the missing extensions automatically?</Text>
        <ConfirmInput onConfirm={onInstall} onCancel={onSkip} />
      </Box>
    </Box>
  )
}

// Main setup component
const SetupComponent: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const [state, setState] = useState<SetupState>({
    step: 'welcome',
    foundConfigs: [],
    installedPackages: [],
    isComplete: false,
    error: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')

  useEffect(() => {
    // Check for existing configs and packages on mount
    const foundConfigs = LINT_CONFIG_FILES.filter(f => fs.existsSync(path.resolve(process.cwd(), f)))

    let installedPackages: string[] = []
    try {
      const pkgJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'))
      const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies }
      installedPackages = [...ESLINT_PACKAGES, ...FORMATTER_PACKAGES].filter(pkg => allDeps?.[pkg])
    } catch {}

    setState(prev => ({
      ...prev,
      foundConfigs,
      installedPackages,
      step: foundConfigs.length > 0 ? 'config-check' : installedPackages.length > 0 ? 'package-check' : 'install',
    }))
  }, [])

  const handleConfigRemoval = async () => {
    setIsLoading(true)
    setLoadingText('Removing config files...')

    try {
      for (const f of state.foundConfigs) {
        fs.rmSync(path.resolve(process.cwd(), f))
      }
      setState(prev => ({
        ...prev,
        foundConfigs: [],
        step: prev.installedPackages.length > 0 ? 'package-check' : 'install',
      }))
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to remove config files' }))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePackageUninstall = async () => {
    setIsLoading(true)
    setLoadingText('Uninstalling packages...')

    try {
      execSync(`npm uninstall ${state.installedPackages.join(' ')}`, { stdio: 'pipe' })
      setState(prev => ({
        ...prev,
        installedPackages: [],
        step: 'install',
      }))
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Failed to uninstall packages' }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleInstallation = async () => {
    setIsLoading(true)
    setState(prev => ({ ...prev, step: 'install' }))

    try {
      // Install ox-standard
      setLoadingText('Installing ox-standard...')
      execSync('npm install --save-dev github:JohnDeved/ox-standard', { stdio: 'pipe' })

      // Create configs
      setLoadingText('Creating configuration files...')
      setState(prev => ({ ...prev, step: 'config-create' }))

      // Create .oxlintrc.json
      const oxlintrcPath = path.resolve(process.cwd(), '.oxlintrc.json')
      if (!fs.existsSync(oxlintrcPath)) {
        const config = {
          extends: ['./node_modules/ox-standard/.oxlintrc.json'],
        }
        fs.writeFileSync(oxlintrcPath, JSON.stringify(config, undefined, 2))
      }

      // Create biome.json
      const biomePath = path.resolve(process.cwd(), 'biome.json')
      if (!fs.existsSync(biomePath)) {
        const biomeConfig = {
          extends: ['./node_modules/ox-standard/biome.json'],
        }
        fs.writeFileSync(biomePath, JSON.stringify(biomeConfig, undefined, 2))
      }

      // Update package.json
      const packageJsonPath = path.resolve(process.cwd(), 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
        if (!packageJson.scripts) {
          packageJson.scripts = {}
        }
        packageJson.scripts.lint = 'oxlint --fix .; biome format --write .'
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, undefined, 2))
      }

      setState(prev => ({ ...prev, step: 'vscode-setup' }))
      await setupVSCodeFlow()
    } catch (error) {
      setState(prev => ({ ...prev, error: 'Installation failed' }))
    } finally {
      setIsLoading(false)
    }
  }

  const setupVSCodeFlow = async () => {
    setLoadingText('Setting up VSCode integration...')

    const vscodeDir = path.resolve(process.cwd(), '.vscode')
    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir)
    }

    const { templateExtensions, templateSettings } = getTemplateVSCodeConfig()

    // Setup recommended extensions
    const extensionsPath = path.resolve(vscodeDir, 'extensions.json')
    fs.writeFileSync(extensionsPath, JSON.stringify(templateExtensions, undefined, 2))

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

    setState(prev => ({ ...prev, step: 'complete', isComplete: true }))

    // Auto-exit after showing completion message
    setTimeout(() => {
      onComplete?.()
    }, 3000)
  }

  const handleSkip = () => {
    if (state.step === 'config-check') {
      setState(prev => ({
        ...prev,
        step: prev.installedPackages.length > 0 ? 'package-check' : 'install',
      }))
    } else if (state.step === 'package-check') {
      setState(prev => ({ ...prev, step: 'install' }))
    } else {
      setState(prev => ({ ...prev, error: 'Setup aborted. Please resolve conflicts manually.' }))
      process.exit(1)
    }
  }

  if (state.error) {
    return <ErrorDisplay error={state.error} />
  }

  return (
    <Box flexDirection="column">
      <WelcomeComponent />

      {isLoading && <LoadingSpinner text={loadingText} />}

      {state.step === 'config-check' && (
        <>
          <StepHeader title="Configuration Check" step={1} total={6} />
          <ConfigCheckComponent
            foundConfigs={state.foundConfigs}
            onRemove={handleConfigRemoval}
            onSkip={() =>
              setState(prev => ({
                ...prev,
                step: prev.installedPackages.length > 0 ? 'package-check' : 'install',
              }))
            }
          />
        </>
      )}

      {state.step === 'package-check' && (
        <>
          <StepHeader title="Package Check" step={2} total={6} />
          <PackageCheckComponent installedPackages={state.installedPackages} onUninstall={handlePackageUninstall} onSkip={() => setState(prev => ({ ...prev, step: 'install' }))} />
        </>
      )}

      {state.step === 'install' && !isLoading && (
        <>
          <StepHeader title="Installation" step={3} total={6} />
          <Box marginBottom={1}>
            <Text>Ready to install ox-standard and configure your project.</Text>
          </Box>
          <Text>Continue with installation?</Text>
          <ConfirmInput onConfirm={handleInstallation} onCancel={() => process.exit(0)} />
        </>
      )}

      {state.step === 'complete' && (
        <Box flexDirection="column">
          <SuccessMessage message="Setup complete!" />
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan" bold>
              📋 Next steps:
            </Text>
            <Text> npm run lint - Lint and format code automatically</Text>
            <Text> npx oxlint --help - View all oxlint options</Text>
            <Text> npx biome --help - View all biome options</Text>
            <Text></Text>
            <Text color="gray">📖 Customize rules in .oxlintrc.json and biome.json if needed</Text>
            <Text color="gray">🔧 JavaScript Standard Style is enforced for both linting and formatting</Text>
          </Box>
        </Box>
      )}
    </Box>
  )
}

// App component that handles exit
const App: React.FC = () => {
  const [shouldExit, setShouldExit] = useState(false)

  useEffect(() => {
    if (shouldExit) {
      process.exit(0)
    }
  }, [shouldExit])

  return <SetupComponent onComplete={() => setShouldExit(true)} />
}

// Main function to start the Ink app
const main = async (): Promise<void> => {
  const { waitUntilExit } = render(<App />)
  await waitUntilExit()
}

main().catch(console.error)
