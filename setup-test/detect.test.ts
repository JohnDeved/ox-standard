import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  detectProjectType,
  hasDenoConfigFile,
  hasDenoEnabledInVSCode,
  generateDenoConfig,
  resolveDenoConfigPath,
  findInstalledLegacyPackages,
} from '../setup-oxlint'

let scratch: string
let originalCwd: string

beforeAll(() => {
  originalCwd = process.cwd()
})

beforeEach(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ox-detect-'))
  process.chdir(scratch)
})

afterAll(() => {
  process.chdir(originalCwd)
})

const cleanup = (): void => {
  process.chdir(originalCwd)
  if (scratch && fs.existsSync(scratch)) fs.rmSync(scratch, { recursive: true, force: true })
}

describe('detectProjectType', () => {
  it('returns node without confirmation when package.json exists', () => {
    fs.writeFileSync('package.json', '{"name":"x"}')
    expect(detectProjectType()).toEqual({ type: 'node', needsConfirmation: false })
    cleanup()
  })

  it('returns deno needing confirmation when deno.json exists', () => {
    fs.writeFileSync('deno.json', '{}')
    expect(detectProjectType()).toEqual({ type: 'deno', needsConfirmation: true })
    cleanup()
  })

  it('returns deno needing confirmation when deno.jsonc exists', () => {
    fs.writeFileSync('deno.jsonc', '{}')
    expect(detectProjectType()).toEqual({ type: 'deno', needsConfirmation: true })
    cleanup()
  })

  it('returns deno needing confirmation when .vscode/settings.json has deno.enable=true', () => {
    fs.mkdirSync('.vscode')
    fs.writeFileSync('.vscode/settings.json', JSON.stringify({ 'deno.enable': true }))
    expect(detectProjectType()).toEqual({ type: 'deno', needsConfirmation: true })
    cleanup()
  })

  it('returns node needing confirmation when nothing matches', () => {
    expect(detectProjectType()).toEqual({ type: 'node', needsConfirmation: true })
    cleanup()
  })

  it('prefers node over deno when both package.json and deno.json exist', () => {
    fs.writeFileSync('package.json', '{}')
    fs.writeFileSync('deno.json', '{}')
    expect(detectProjectType()).toEqual({ type: 'node', needsConfirmation: false })
    cleanup()
  })
})

describe('hasDenoConfigFile / hasDenoEnabledInVSCode', () => {
  it('returns false in empty dir', () => {
    expect(hasDenoConfigFile()).toBe(false)
    expect(hasDenoEnabledInVSCode()).toBe(false)
    cleanup()
  })

  it('detects deno.jsonc', () => {
    fs.writeFileSync('deno.jsonc', '{}')
    expect(hasDenoConfigFile()).toBe(true)
    cleanup()
  })

  it('returns false when vscode settings is invalid JSON', () => {
    fs.mkdirSync('.vscode')
    fs.writeFileSync('.vscode/settings.json', '{ not valid json }')
    expect(hasDenoEnabledInVSCode()).toBe(false)
    cleanup()
  })

  it('returns false when deno.enable is missing or not true', () => {
    fs.mkdirSync('.vscode')
    fs.writeFileSync('.vscode/settings.json', JSON.stringify({ 'deno.enable': false }))
    expect(hasDenoEnabledInVSCode()).toBe(false)
    cleanup()
  })
})

describe('generateDenoConfig', () => {
  it('strips node/mocha/jest envs and forces Deno', () => {
    const basePath = path.join(scratch, 'base.json')
    fs.writeFileSync(
      basePath,
      JSON.stringify({
        env: { node: true, mocha: true, jest: true, browser: true },
        globals: { foo: 'readonly' },
        rules: { 'no-var': 'error' },
      })
    )
    const result = generateDenoConfig(basePath)
    expect(result.env).toEqual({ node: false, mocha: false, jest: false, browser: true, Deno: true })
    expect(result.globals).toEqual({ foo: 'readonly', Deno: 'readonly' })
    expect(result.rules).toEqual({ 'no-var': 'error' })
    cleanup()
  })
})

describe('resolveDenoConfigPath', () => {
  const realScratch = (): string => fs.realpathSync(scratch)

  it('prefers deno.json when both exist', () => {
    fs.writeFileSync('deno.json', '{}')
    fs.writeFileSync('deno.jsonc', '{}')
    expect(resolveDenoConfigPath()).toBe(path.join(realScratch(), 'deno.json'))
    cleanup()
  })

  it('falls back to deno.jsonc when only it exists', () => {
    fs.writeFileSync('deno.jsonc', '{}')
    expect(resolveDenoConfigPath()).toBe(path.join(realScratch(), 'deno.jsonc'))
    cleanup()
  })

  it('returns deno.json path even when neither exists (default)', () => {
    expect(resolveDenoConfigPath()).toBe(path.join(realScratch(), 'deno.json'))
    cleanup()
  })
})

describe('findInstalledLegacyPackages', () => {
  it('returns empty when no deps match', () => {
    fs.writeFileSync('package.json', JSON.stringify({ dependencies: { lodash: '^4' } }))
    expect(findInstalledLegacyPackages(path.resolve('package.json'))).toEqual([])
    cleanup()
  })

  it('finds eslint and prettier across dependencies/devDependencies', () => {
    fs.writeFileSync(
      'package.json',
      JSON.stringify({
        dependencies: { eslint: '^9' },
        devDependencies: { prettier: '^3', '@typescript-eslint/parser': '^7' },
      })
    )
    const found = findInstalledLegacyPackages(path.resolve('package.json'))
    expect(found).toContain('eslint')
    expect(found).toContain('prettier')
    expect(found).toContain('@typescript-eslint/parser')
    cleanup()
  })

  it('returns empty on malformed JSON', () => {
    fs.writeFileSync('package.json', '{ bad json')
    expect(findInstalledLegacyPackages(path.resolve('package.json'))).toEqual([])
    cleanup()
  })
})
