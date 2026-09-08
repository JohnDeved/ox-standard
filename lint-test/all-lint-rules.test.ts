import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const oxlint = path.join(root, 'node_modules/oxlint/bin/oxlint')
const preset = path.join(root, '.oxlintrc.json')

interface Diagnostic {
  code: string
  severity: string
}

interface RuleFixture {
  rule: string
  severity: 'error' | 'warning'
  invalid: string
  valid: string
}

// Use the installed binary, not npx: a missing/broken tool must fail the test,
// never install another version or masquerade as an empty diagnostic list.
const runOxlint = (args: string[]): string => {
  const result = spawnSync(process.execPath, [oxlint, ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 15000,
  })
  if (result.error) throw result.error
  if (result.signal || (result.status !== 0 && result.status !== 1)) {
    throw new Error(`Oxlint failed: ${result.signal ?? result.status}: ${result.stderr}`)
  }
  // JSON parsing at each call site deliberately surfaces configuration failures.
  return result.stdout
}

const fixtures: RuleFixture[] = [
  {
    rule: 'eslint(no-var)',
    severity: 'error',
    invalid: 'export var answer = 42',
    valid: 'export const answer = 42',
  },
  {
    rule: 'react-hooks(rules-of-hooks)',
    severity: 'error',
    invalid: `import { useState } from 'react'
      export function Component({ enabled }) {
        if (enabled) useState(0)
        return <div />
      }`,
    valid: `import { useState } from 'react'
      export function Component() {
        const [count] = useState(0)
        return <div>{count}</div>
      }`,
  },
  {
    rule: 'eslint(one-var)',
    severity: 'error',
    invalid: 'export const first = 1, second = 2',
    valid: 'export const first = 1; export const second = 2',
  },
  {
    rule: 'eslint(no-implied-eval)',
    severity: 'error',
    invalid: `setTimeout('console.log(1)', 0)`,
    valid: 'setTimeout(() => console.log(1), 0)',
  },
  {
    rule: 'eslint(prefer-arrow-callback)',
    severity: 'warning',
    invalid: 'export const doubled = [1, 2].map(function (value) { return value * 2 })',
    valid: 'export const doubled = [1, 2].map(value => value * 2)',
  },
  {
    rule: 'eslint(prefer-regex-literals)',
    severity: 'error',
    invalid: `export const pattern = new RegExp('abc', 'u')`,
    valid: 'export const pattern = /abc/u',
  },
  {
    rule: 'eslint(prefer-regex-literals)',
    severity: 'error',
    invalid: 'export const pattern = new RegExp(/abc/u)',
    valid: `export const patternFor = (source: string) => new RegExp(source, 'u')`,
  },
  {
    rule: 'unicorn(explicit-timer-delay)',
    severity: 'warning',
    invalid: 'setTimeout(() => console.log(1))',
    valid: 'setTimeout(() => console.log(1), 0)',
  },
  {
    rule: 'unicorn(prefer-export-from)',
    severity: 'warning',
    invalid: `import { value } from './value'; export { value }`,
    valid: `export { value } from './value'`,
  },
  {
    rule: 'unicorn(prefer-single-call)',
    severity: 'warning',
    invalid: 'export function append(values: number[]) { values.push(1); values.push(2) }',
    valid: 'export function append(values: number[]) { values.push(1, 2) }',
  },
  {
    rule: 'unicorn(no-array-fill-with-reference-type)',
    severity: 'error',
    invalid: 'export const items = Array(3).fill({})',
    valid: 'export const items = Array.from({ length: 3 }, () => ({}))',
  },
  {
    rule: 'typescript(no-empty-object-type)',
    severity: 'warning',
    invalid: 'export interface Empty {}',
    valid: 'export interface Item { value: string }',
  },
  {
    rule: 'typescript(no-empty-object-type)',
    severity: 'warning',
    invalid: 'export type Empty = {}',
    valid: 'export type Anything = unknown',
  },
  {
    rule: 'react(no-object-type-as-default-prop)',
    severity: 'warning',
    invalid: 'export function Component({ items = [] }) { return <div>{items.length}</div> }',
    valid: `const defaultItems = []
      export function Component({ items = defaultItems }) { return <div>{items.length}</div> }`,
  },
  {
    rule: 'react(no-unstable-nested-components)',
    severity: 'warning',
    invalid: `export function Outer() {
      function Inner() { return <span /> }
      return <Inner />
    }`,
    valid: `function Inner() { return <span /> }
      export function Outer() { return <Inner /> }`,
  },
  {
    rule: 'oxc(bad-match-all-arg)',
    severity: 'error',
    invalid: `export const matches = 'abc'.matchAll(/a/)`,
    valid: `export const matches = 'abc'.matchAll(/a/g)`,
  },
  {
    rule: 'react(purity)',
    severity: 'error',
    invalid: 'export function Clock() { return <div>{Date.now()}</div> }',
    valid: 'export function Clock({ now }) { return <div>{now}</div> }',
  },
  {
    rule: 'import(first)',
    severity: 'error',
    invalid: `console.log('start'); import { value } from './value'; console.log(value)`,
    valid: `import { value } from './value'; console.log('start', value)`,
  },
  {
    rule: 'import(no-duplicates)',
    severity: 'error',
    invalid: `import { value } from './value'; import { other } from './value'; console.log(value, other)`,
    valid: `import { value, other } from './value'; console.log(value, other)`,
  },
]

describe('oxlint rules via shared config', () => {
  let directory: string
  let config: string

  beforeEach(() => {
    // Canonical paths keep macOS /var -> /private/var imports in the same module graph.
    directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'oxc-standard-rules-')))
    config = path.join(directory, '.oxlintrc.json')
    // Exercise extension of the published preset, not CLI plugin flags.
    const { env, globals } = JSON.parse(fs.readFileSync(preset, 'utf8'))
    fs.writeFileSync(config, JSON.stringify({ extends: [preset], env, globals }))
    fs.writeFileSync(
      path.join(directory, 'value.ts'),
      'export const value = 1; export const other = 2'
    )
  })

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true })
  })

  const lint = (code: string): Diagnostic[] => {
    const file = path.join(directory, 'fixture.tsx')
    fs.writeFileSync(file, code)
    const result = JSON.parse(
      runOxlint(['--config', config, '--format', 'json', '--no-ignore', directory])
    )
    expect(Array.isArray(result.diagnostics)).toBe(true)
    expect(result.number_of_files).toBeGreaterThan(0)
    return result.diagnostics
  }

  it.each(fixtures)('reports $rule at $severity and accepts the corrected pattern', fixture => {
    expect(lint(fixture.invalid)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: fixture.rule, severity: fixture.severity }),
      ])
    )
    expect(lint(fixture.valid).filter(diagnostic => diagnostic.code === fixture.rule)).toEqual([])
  })

  it('detects circular imports without an extra --import-plugin flag', () => {
    fs.writeFileSync(
      path.join(directory, 'dependency.ts'),
      `import { value } from './fixture'
      export const readValue = () => value`
    )
    const code = `import { readValue } from './dependency'
      export const value = 1
      export const read = () => readValue()`
    expect(lint(code)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'import(no-cycle)', severity: 'error' }),
      ])
    )
    fs.writeFileSync(path.join(directory, 'dependency.ts'), 'export const readValue = () => 1')
    expect(lint(code).filter(diagnostic => diagnostic.code === 'import(no-cycle)')).toEqual([])
  })

  it('loads the configured plugins and resolves the new rule severities', () => {
    const effective = JSON.parse(runOxlint(['--config', config, '--print-config']))
    expect(effective.plugins).toEqual(expect.arrayContaining(['typescript', 'react', 'import']))
    expect(effective.env).toMatchObject({ browser: true, node: true })
    expect(effective.rules).toMatchObject({
      'import/no-cycle': 'deny',
      'typescript/no-empty-object-type': 'warn',
      'unicorn/no-array-fill-with-reference-type': 'deny',
      'react/no-object-type-as-default-prop': 'warn',
      'react/purity': 'deny',
    })
  })

  it('does not silently discard an unknown configured rule', () => {
    fs.writeFileSync(config, JSON.stringify({ rules: { 'eslint/nonexistent-rule': 'error' } }))
    expect(() => lint('export const value = 1')).toThrow()
  })

  it('keeps dependency and peer-dependency versions synchronized', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
    for (const tool of ['oxlint', 'oxfmt']) {
      expect(pkg.dependencies[tool]).toBe(pkg.peerDependencies[tool])
    }
  })
})
