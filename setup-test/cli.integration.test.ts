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
      expect(r.stdout).toContain('Usage: npx ox-standard')
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
  fs.mkdirSync(path.join(tmp, 'node_modules', 'ox-standard'), { recursive: true })
  fs.writeFileSync(
    path.join(tmp, 'node_modules', 'ox-standard', '.oxlintrc.json'),
    JSON.stringify({ env: { browser: true } })
  )
  fs.writeFileSync(
    path.join(tmp, 'node_modules', 'ox-standard', 'package.json'),
    JSON.stringify({ name: 'ox-standard', version: '0.3.0' })
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
      expect(oxlintConfig.extends).toEqual(['./node_modules/ox-standard/.oxlintrc.json'])

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
