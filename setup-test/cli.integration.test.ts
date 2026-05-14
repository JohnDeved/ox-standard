import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CLI = path.resolve(__dirname, '..', 'dist', 'setup-oxlint.js')

const runCli = (
  args: string[],
  cwd: string
): { code: number | null; stdout: string; stderr: string } => {
  const result = spawnSync('node', [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: '1' },
  })
  return { code: result.status, stdout: result.stdout || '', stderr: result.stderr || '' }
}

const withTmp = (prefix: string, fn: (tmp: string) => void): void => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
  try {
    fn(tmp)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

beforeAll(() => {
  if (!fs.existsSync(CLI)) {
    throw new Error(
      `Compiled CLI not found at ${CLI}. Run "npm run build" first (or vitest's prepublishOnly).`
    )
  }
})

describe('CLI: --help', () => {
  it('prints help and exits 0', () => {
    withTmp('ox-cli-', tmp => {
      const r = runCli(['--help'], tmp)
      expect(r.code).toBe(0)
      expect(r.stdout).toContain('Usage: npx oxc-standard')
      expect(r.stdout).toContain('--yes')
      expect(r.stdout).toContain('--type')
    })
  })
})

describe('CLI: argument validation', () => {
  it('exits 1 on unknown flag', () => {
    withTmp('ox-cli-', tmp => {
      const r = runCli(['--bogus'], tmp)
      expect(r.code).toBe(1)
      expect(r.stderr).toMatch(/Unknown argument/)
    })
  })

  it('exits 1 on invalid --type value', () => {
    withTmp('ox-cli-', tmp => {
      const r = runCli(['--type=bun'], tmp)
      expect(r.code).toBe(1)
      expect(r.stderr).toMatch(/Expected "node" or "deno"/)
    })
  })

  it('exits 1 in non-TTY without --yes when confirmation is required', () => {
    // No package.json, no deno files → needsConfirmation=true → prompt fails in non-TTY
    withTmp('ox-cli-', tmp => {
      const r = runCli([], tmp)
      expect(r.code).toBe(1)
      expect(r.stderr + r.stdout).toMatch(/not a TTY|cannot answer/i)
    })
  })
})

const stageFakeOxStandard = (tmp: string): void => {
  fs.mkdirSync(path.join(tmp, 'node_modules', 'oxc-standard'), { recursive: true })
  fs.writeFileSync(
    path.join(tmp, 'node_modules', 'oxc-standard', '.oxlintrc.json'),
    JSON.stringify({ env: { browser: true } })
  )
  fs.writeFileSync(
    path.join(tmp, 'node_modules', 'oxc-standard', 'package.json'),
    JSON.stringify({ name: 'oxc-standard', version: '0.3.0' })
  )
}

describe('CLI: full non-interactive node setup', () => {
  it('creates .oxlintrc.json, .oxfmtrc.json, and adds lint script', () => {
    withTmp('ox-cli-node-', tmp => {
      fs.writeFileSync(
        path.join(tmp, 'package.json'),
        JSON.stringify({ name: 'integration-fixture', version: '0.0.0' })
      )
      stageFakeOxStandard(tmp)

      const r = runCli(['--yes', '--no-vscode', '--type=node'], tmp)

      if (r.code !== 0) {
        console.error('CLI stdout:', r.stdout)
        console.error('CLI stderr:', r.stderr)
      }
      expect(r.code).toBe(0)
      expect(fs.existsSync(path.join(tmp, '.oxlintrc.json'))).toBe(true)
      expect(fs.existsSync(path.join(tmp, '.oxfmtrc.json'))).toBe(true)

      const oxlintConfig = JSON.parse(fs.readFileSync(path.join(tmp, '.oxlintrc.json'), 'utf8'))
      expect(oxlintConfig.extends).toEqual(['./node_modules/oxc-standard/.oxlintrc.json'])

      const oxfmtConfig = JSON.parse(fs.readFileSync(path.join(tmp, '.oxfmtrc.json'), 'utf8'))
      expect(oxfmtConfig).toMatchObject({
        singleQuote: true,
        semi: false,
        printWidth: 100,
        tabWidth: 2,
      })

      const pkg = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8'))
      expect(pkg.scripts.lint).toContain('oxlint')
      expect(pkg.scripts.lint).toContain('oxfmt')

      expect(r.stdout).toContain('Skipping VSCode setup')
    })
  }, 60000)
})

describe('CLI: --no-vscode actually skips .vscode', () => {
  it('does not create .vscode directory', () => {
    withTmp('ox-cli-novsc-', tmp => {
      fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'x' }))
      stageFakeOxStandard(tmp)

      const r = runCli(['--yes', '--no-vscode', '--type=node'], tmp)
      expect(r.code).toBe(0)
      expect(fs.existsSync(path.join(tmp, '.vscode'))).toBe(false)
    })
  }, 60000)
})

describe('CLI: --dry-run', () => {
  it('previews actions but writes no files and runs no commands', () => {
    withTmp('ox-cli-dry-', tmp => {
      const initialPkg = JSON.stringify({ name: 'dry-fixture', version: '0.0.0' })
      fs.writeFileSync(path.join(tmp, 'package.json'), initialPkg)
      // pre-stage so detectPackageManager picks npm deterministically
      fs.writeFileSync(path.join(tmp, 'package-lock.json'), '')
      stageFakeOxStandard(tmp)

      const r = runCli(['--dry-run', '--type=node', '--no-vscode'], tmp)

      expect(r.code).toBe(0)
      expect(r.stdout).toContain('Dry-run mode')
      expect(r.stdout).toContain('[dry-run] would write .oxlintrc.json')
      expect(r.stdout).toContain('[dry-run] would write .oxfmtrc.json')
      expect(r.stdout).toContain('[dry-run] would run: npm install')
      // 1.4.0 fix: oxlint and oxfmt are installed as direct devDeps too,
      // not just transitively, to guarantee node_modules/.bin/ contains them.
      expect(r.stdout).toMatch(/\[dry-run\] would run: npm install --save-dev .*oxc-standard@\^1.* oxlint@.* oxfmt@/)
      expect(r.stdout).toContain('[dry-run] would run: npm pkg set scripts.lint')

      // Nothing actually written
      expect(fs.existsSync(path.join(tmp, '.oxlintrc.json'))).toBe(false)
      expect(fs.existsSync(path.join(tmp, '.oxfmtrc.json'))).toBe(false)
      expect(fs.existsSync(path.join(tmp, '.vscode'))).toBe(false)
      // package.json untouched
      expect(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8')).toBe(initialPkg)
    })
  }, 60000)

  it('reads .vscode/ template assets from package root, not dist/ (regression)', () => {
    // Regression for a bug where getTemplateVSCodeConfig assumed assets sat
    // next to the script; in the published layout they sit one level up
    // because the script lives in dist/ and assets at the package root.
    withTmp('ox-cli-vsc-', tmp => {
      fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ name: 'x' }))
      fs.writeFileSync(path.join(tmp, 'package-lock.json'), '')
      stageFakeOxStandard(tmp)

      // No --no-vscode: this exercises getTemplateVSCodeConfig() which is
      // what previously crashed with ENOENT against dist/.vscode/...
      const r = runCli(['--dry-run', '--type=node'], tmp)

      expect(r.code).toBe(0)
      expect(r.stdout).not.toMatch(/ENOENT|no such file/i)
      expect(r.stdout).toContain('[dry-run] would write .vscode/extensions.json')
      expect(r.stdout).toContain('[dry-run] would write .vscode/settings.json')
    })
  }, 60000)
})
