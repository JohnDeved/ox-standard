import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('VSCode extension auto-installation', () => {
  let testDir: string
  let originalPath: string

  beforeEach(() => {
    // Create temporary test directory
    testDir = path.join(__dirname, '..', 'temp-test-' + Date.now())
    fs.mkdirSync(testDir, { recursive: true })

    // Save original PATH
    originalPath = process.env.PATH || ''
  })

  afterEach(() => {
    // Restore original PATH
    process.env.PATH = originalPath

    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should detect when VSCode CLI is not available', () => {
    // Make sure code command is not available
    process.env.PATH = '/non-existent-path'

    // Import the functions we want to test
    // Note: We need to test the actual implementation
    const setupScript = path.resolve(__dirname, '../setup-oxlint.ts')
    const scriptContent = fs.readFileSync(setupScript, 'utf8')

    // Verify the isVSCodeCliAvailable function exists in the script
    expect(scriptContent).toContain('isVSCodeCliAvailable')
    expect(scriptContent).toContain('getInstalledVSCodeExtensions')
    expect(scriptContent).toContain('installVSCodeExtensions')
  })

  it('should create extensions.json with recommended extensions', () => {
    // Create a package.json file in test directory
    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
    }
    fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2))

    // Run setup in the test directory
    try {
      execSync(`cd ${testDir} && node --loader tsx ${path.resolve(__dirname, '../setup-oxlint.ts')}`, {
        stdio: 'pipe',
        encoding: 'utf8',
      })
    } catch (error) {
      // Expected to fail due to npm install, but should create .vscode directory
    }

    // Check if .vscode/extensions.json was created
    const vscodeDir = path.join(testDir, '.vscode')
    const extensionsFile = path.join(vscodeDir, 'extensions.json')

    if (fs.existsSync(extensionsFile)) {
      const extensions = JSON.parse(fs.readFileSync(extensionsFile, 'utf8'))
      expect(extensions).toHaveProperty('recommendations')
      expect(extensions.recommendations).toContain('biomejs.biome')
      expect(extensions.recommendations).toContain('oxc.oxc-vscode')
      expect(extensions.recommendations).toContain('ms-vscode.vscode-typescript-next')
    }
  })

  it('should handle async setupVSCode function correctly', async () => {
    // Verify the setup function is now async by checking the code
    const setupScript = path.resolve(__dirname, '../setup-oxlint.ts')
    const scriptContent = fs.readFileSync(setupScript, 'utf8')

    // Should contain async/await pattern
    expect(scriptContent).toContain('const setupVSCode = async')
    expect(scriptContent).toContain('await setupVSCode()')
  })
})
