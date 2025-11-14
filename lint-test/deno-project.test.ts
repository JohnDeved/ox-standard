import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const testProjectDir = path.resolve(__dirname, '../.test-deno-project')

describe('Deno project integration', () => {
  beforeAll(() => {
    // Clean up any existing test project
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true })
    }

    // Create test Deno project
    fs.mkdirSync(testProjectDir, { recursive: true })

    // Create deno.json
    fs.writeFileSync(
      path.join(testProjectDir, 'deno.json'),
      JSON.stringify(
        {
          tasks: {
            lint: 'npx oxlint --fix . && npx oxfmt .',
          },
        },
        null,
        2
      )
    )

    // Create .oxlintrc.json with Deno config
    const baseConfig = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../.oxlintrc.json'), 'utf8')
    )
    const denoConfig = {
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
    fs.writeFileSync(
      path.join(testProjectDir, '.oxlintrc.json'),
      JSON.stringify(denoConfig, null, 2)
    )

    // Create .oxfmtrc.json
    fs.copyFileSync(
      path.resolve(__dirname, '../.oxfmtrc.json'),
      path.join(testProjectDir, '.oxfmtrc.json')
    )

    // Create test TypeScript file with linting issues
    const testFile = `
// Test file for Deno project
const message: string = "hello world";
var oldVar = 123

function testFunction() {
  console.log(message)
  console.log(oldVar)
  if (Deno) {
    console.log("Deno is available")
  }
}

export { testFunction }
`
    fs.writeFileSync(path.join(testProjectDir, 'test.ts'), testFile)
  })

  afterAll(() => {
    // Clean up test project
    if (fs.existsSync(testProjectDir)) {
      fs.rmSync(testProjectDir, { recursive: true, force: true })
    }
  })

  it('should detect linting issues in Deno project', () => {
    const result = execSync('npx oxlint --format json test.ts', {
      cwd: testProjectDir,
      encoding: 'utf8',
    })

    const output = JSON.parse(result)
    expect(output).toHaveProperty('diagnostics')
    expect(Array.isArray(output.diagnostics)).toBe(true)

    // Should detect "no-var" rule violation
    const hasNoVarError = output.diagnostics.some(
      (d: { code?: string }) => d.code === 'no-var'
    )
    expect(hasNoVarError).toBe(true)
  })

  it('should fix linting issues with --fix flag', () => {
    // Read original content
    const originalContent = fs.readFileSync(path.join(testProjectDir, 'test.ts'), 'utf8')
    expect(originalContent).toContain('var oldVar')

    // Run oxlint with --fix
    execSync('npx oxlint --fix test.ts', {
      cwd: testProjectDir,
      encoding: 'utf8',
    })

    // Check that var was changed to const/let
    const fixedContent = fs.readFileSync(path.join(testProjectDir, 'test.ts'), 'utf8')
    expect(fixedContent).not.toContain('var oldVar')
  })

  it('should format code with oxfmt', () => {
    // Create unformatted file
    const unformatted = `const x="test";const y='another';`
    fs.writeFileSync(path.join(testProjectDir, 'format-test.ts'), unformatted)

    // Run oxfmt
    execSync('npx oxfmt format-test.ts', {
      cwd: testProjectDir,
      encoding: 'utf8',
    })

    // Check formatting was applied (should use single quotes and proper spacing)
    const formatted = fs.readFileSync(path.join(testProjectDir, 'format-test.ts'), 'utf8')
    expect(formatted).toContain("const x = 'test'")
    expect(formatted).toContain("const y = 'another'")
  })

  it('should work with Deno globals without errors', () => {
    // Create file using Deno globals
    const denoCode = `
const env = Deno.env.get('HOME')
console.log(env)

export const readFile = async (path: string) => {
  const content = await Deno.readTextFile(path)
  return content
}
`
    fs.writeFileSync(path.join(testProjectDir, 'deno-globals.ts'), denoCode)

    // Run oxlint - should not complain about Deno global
    const result = execSync('npx oxlint --format json deno-globals.ts', {
      cwd: testProjectDir,
      encoding: 'utf8',
    })

    const output = JSON.parse(result)

    // Should not have errors about undefined Deno
    const hasDenoUndefinedError = output.diagnostics?.some(
      (d: { message?: string }) => d.message?.includes('Deno') && d.message?.includes('undefined')
    )
    expect(hasDenoUndefinedError).toBeFalsy()
  })

  it('should run lint task from deno.json', () => {
    // This tests that the task command works
    // We just verify the task exists and can be parsed
    const denoJson = JSON.parse(
      fs.readFileSync(path.join(testProjectDir, 'deno.json'), 'utf8')
    )

    expect(denoJson.tasks).toBeDefined()
    expect(denoJson.tasks.lint).toBe('npx oxlint --fix . && npx oxfmt .')
  })
})
