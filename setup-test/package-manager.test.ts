import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { detectPackageManager, PACKAGE_MANAGERS } from '../setup-oxlint'

let scratch: string
let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ox-pm-'))
  originalEnv = { ...process.env }
  delete process.env.npm_config_user_agent
})

afterEach(() => {
  process.env = originalEnv
  if (scratch && fs.existsSync(scratch)) fs.rmSync(scratch, { recursive: true, force: true })
})

describe('detectPackageManager', () => {
  it('defaults to npm in an empty directory', () => {
    expect(detectPackageManager(scratch)).toBe('npm')
  })

  it('detects pnpm via pnpm-lock.yaml', () => {
    fs.writeFileSync(path.join(scratch, 'pnpm-lock.yaml'), '')
    expect(detectPackageManager(scratch)).toBe('pnpm')
  })

  it('detects yarn via yarn.lock', () => {
    fs.writeFileSync(path.join(scratch, 'yarn.lock'), '')
    expect(detectPackageManager(scratch)).toBe('yarn')
  })

  it('detects bun via bun.lockb', () => {
    fs.writeFileSync(path.join(scratch, 'bun.lockb'), '')
    expect(detectPackageManager(scratch)).toBe('bun')
  })

  it('detects bun via bun.lock (text format)', () => {
    fs.writeFileSync(path.join(scratch, 'bun.lock'), '')
    expect(detectPackageManager(scratch)).toBe('bun')
  })

  it('detects npm via package-lock.json', () => {
    fs.writeFileSync(path.join(scratch, 'package-lock.json'), '{}')
    expect(detectPackageManager(scratch)).toBe('npm')
  })

  it('prefers bun over pnpm when both lockfiles exist', () => {
    fs.writeFileSync(path.join(scratch, 'pnpm-lock.yaml'), '')
    fs.writeFileSync(path.join(scratch, 'bun.lockb'), '')
    expect(detectPackageManager(scratch)).toBe('bun')
  })

  it('detects pnpm via npm_config_user_agent when no lockfile present', () => {
    process.env.npm_config_user_agent = 'pnpm/9.0.0 npm/? node/v20'
    expect(detectPackageManager(scratch)).toBe('pnpm')
  })

  it('detects yarn via npm_config_user_agent', () => {
    process.env.npm_config_user_agent = 'yarn/1.22.0'
    expect(detectPackageManager(scratch)).toBe('yarn')
  })

  it('detects bun via npm_config_user_agent', () => {
    process.env.npm_config_user_agent = 'bun/1.0.0'
    expect(detectPackageManager(scratch)).toBe('bun')
  })

  it('detects pnpm via packageManager field in package.json', () => {
    fs.writeFileSync(
      path.join(scratch, 'package.json'),
      JSON.stringify({ packageManager: 'pnpm@9.0.0' })
    )
    expect(detectPackageManager(scratch)).toBe('pnpm')
  })

  it('detects yarn via packageManager field', () => {
    fs.writeFileSync(
      path.join(scratch, 'package.json'),
      JSON.stringify({ packageManager: 'yarn@4.0.0' })
    )
    expect(detectPackageManager(scratch)).toBe('yarn')
  })

  it('lockfile beats user agent beats packageManager field', () => {
    process.env.npm_config_user_agent = 'pnpm/9'
    fs.writeFileSync(
      path.join(scratch, 'package.json'),
      JSON.stringify({ packageManager: 'yarn@4' })
    )
    fs.writeFileSync(path.join(scratch, 'bun.lockb'), '')
    expect(detectPackageManager(scratch)).toBe('bun')
  })

  it('falls back to npm on malformed package.json', () => {
    fs.writeFileSync(path.join(scratch, 'package.json'), '{ malformed')
    expect(detectPackageManager(scratch)).toBe('npm')
  })
})

describe('PACKAGE_MANAGERS commands', () => {
  it('produces correct install commands for each manager', () => {
    expect(PACKAGE_MANAGERS.npm.installDevSaved(['foo', 'bar'])).toBe(
      'npm install --save-dev foo bar'
    )
    expect(PACKAGE_MANAGERS.yarn.installDevSaved(['foo'])).toBe('yarn add --dev foo')
    expect(PACKAGE_MANAGERS.pnpm.installDevSaved(['foo'])).toBe('pnpm add --save-dev foo')
    expect(PACKAGE_MANAGERS.bun.installDevSaved(['foo'])).toBe('bun add --dev foo')
  })

  it('produces correct uninstall commands', () => {
    expect(PACKAGE_MANAGERS.npm.uninstall(['foo'])).toBe('npm uninstall foo')
    expect(PACKAGE_MANAGERS.yarn.uninstall(['foo'])).toBe('yarn remove foo')
    expect(PACKAGE_MANAGERS.pnpm.uninstall(['foo'])).toBe('pnpm remove foo')
    expect(PACKAGE_MANAGERS.bun.uninstall(['foo'])).toBe('bun remove foo')
  })

  it('produces correct runLint commands', () => {
    expect(PACKAGE_MANAGERS.npm.runLint).toBe('npm run lint')
    expect(PACKAGE_MANAGERS.yarn.runLint).toBe('yarn lint')
    expect(PACKAGE_MANAGERS.pnpm.runLint).toBe('pnpm lint')
    expect(PACKAGE_MANAGERS.bun.runLint).toBe('bun run lint')
  })
})
