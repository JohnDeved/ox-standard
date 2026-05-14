import { describe, it, expect } from 'vitest'
import { parseCliOptions, parseTypeArg, parseReactMajor, CliArgError } from '../setup-oxlint'

describe('parseCliOptions', () => {
  it('returns defaults for no args', () => {
    expect(parseCliOptions([])).toEqual({ yes: false, noVscode: false })
  })

  it('parses --yes and -y', () => {
    expect(parseCliOptions(['--yes'])).toMatchObject({ yes: true })
    expect(parseCliOptions(['-y'])).toMatchObject({ yes: true })
  })

  it('parses --no-vscode', () => {
    expect(parseCliOptions(['--no-vscode'])).toMatchObject({ noVscode: true })
  })

  it('parses --help and -h', () => {
    expect(parseCliOptions(['--help'])).toMatchObject({ showHelp: true })
    expect(parseCliOptions(['-h'])).toMatchObject({ showHelp: true })
  })

  it('parses --type=node and --type=deno', () => {
    expect(parseCliOptions(['--type=node'])).toMatchObject({ typeOverride: 'node' })
    expect(parseCliOptions(['--type=deno'])).toMatchObject({ typeOverride: 'deno' })
  })

  it('parses -t node / --type deno (space-separated)', () => {
    expect(parseCliOptions(['-t', 'node'])).toMatchObject({ typeOverride: 'node' })
    expect(parseCliOptions(['--type', 'deno'])).toMatchObject({ typeOverride: 'deno' })
  })

  it('combines flags', () => {
    const opts = parseCliOptions(['--yes', '--type=deno', '--no-vscode'])
    expect(opts).toEqual({ yes: true, noVscode: true, typeOverride: 'deno' })
  })

  it('throws CliArgError on unknown flag', () => {
    expect(() => parseCliOptions(['--bogus'])).toThrow(CliArgError)
    expect(() => parseCliOptions(['--bogus'])).toThrow(/Unknown argument/)
  })

  it('throws CliArgError on invalid --type value', () => {
    expect(() => parseCliOptions(['--type=bun'])).toThrow(CliArgError)
    expect(() => parseCliOptions(['--type=bun'])).toThrow(/Expected "node" or "deno"/)
  })

  it('throws CliArgError when --type is missing a value', () => {
    expect(() => parseCliOptions(['--type'])).toThrow(CliArgError)
  })
})

describe('parseTypeArg', () => {
  it('accepts node and deno', () => {
    expect(parseTypeArg('node')).toBe('node')
    expect(parseTypeArg('deno')).toBe('deno')
  })

  it('rejects everything else', () => {
    expect(() => parseTypeArg('bun')).toThrow(CliArgError)
    expect(() => parseTypeArg('')).toThrow(CliArgError)
    expect(() => parseTypeArg(undefined)).toThrow(CliArgError)
  })
})

describe('parseReactMajor', () => {
  it('extracts major from semver-ish strings', () => {
    expect(parseReactMajor('18.2.0')).toBe('18')
    expect(parseReactMajor('^17.0.2')).toBe('17')
    expect(parseReactMajor('~16.14.0')).toBe('16')
    expect(parseReactMajor('19.0.0-rc.0')).toBe('19')
    expect(parseReactMajor('>=18 <19')).toBe('18')
  })

  it('returns undefined for missing/invalid input', () => {
    expect(parseReactMajor(undefined)).toBeUndefined()
    expect(parseReactMajor(null)).toBeUndefined()
    expect(parseReactMajor('')).toBeUndefined()
    expect(parseReactMajor('not-a-version')).toBeUndefined()
    expect(parseReactMajor(18)).toBeUndefined()
  })

  it('handles two-digit majors', () => {
    expect(parseReactMajor('22.0.0')).toBe('22')
  })
})
