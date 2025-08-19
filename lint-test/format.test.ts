import { describe, it, expect, afterEach } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface BiomeConfig {
  javascript?: {
    formatter?: {
      quoteStyle?: string
      semicolons?: string
    }
  }
  formatter?: {
    indentWidth?: number
    indentStyle?: string
  }
}

describe('Biome formatting with JavaScript Standard Style', () => {
  let testFiles: string[] = []

  const createTestFile = (filename: string, content: string): string => {
    const filePath = path.resolve(__dirname, filename)
    fs.writeFileSync(filePath, content)
    testFiles.push(filePath)
    return filePath
  }

  afterEach(() => {
    // Clean up test files
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file)
      }
    })
    testFiles = []
  })

  const runBiomeFormatWrite = (files: string[]): void => {
    try {
      const command = `npx biome format --write --config-path ${path.resolve(__dirname, '../biome.json')} ${files.join(' ')}`
      execSync(command, {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
      })
    } catch (error: unknown) {
      // biome format --write may exit with non-zero, that's expected
      if (
        error &&
        typeof error === 'object' &&
        'stdout' in error &&
        'stderr' in error
      ) {
        const execError = error as { stdout?: string; stderr?: string }
        if (!execError.stdout && !execError.stderr) {
          throw error
        }
      }
    }
  }

  it('should remove unnecessary semicolons', () => {
    const code = `const message = "Hello World";
const arr = [1, 2, 3];
function test() {
  return "test";
}
export default test;`

    const testFile = createTestFile('test-semicolons.js', code)
    runBiomeFormatWrite([testFile])
    const formatted = fs.readFileSync(testFile, 'utf8')

    // Should remove semicolons and convert to single quotes
    expect(formatted).toMatch(/const message = 'Hello World'/)
    expect(formatted).toMatch(/const arr = \[1, 2, 3\]/)
    expect(formatted).toMatch(/return 'test'/)
    expect(formatted).toMatch(/export default test/)
    // Should not have trailing semicolons on these lines
    expect(formatted).not.toMatch(/const message = 'Hello World';/)
  })

  it('should convert double quotes to single quotes', () => {
    const code = `const message = "Hello World"
const template = "This is a \\"quoted\\" string"
const obj = { "key": "value" }`

    const testFile = createTestFile('test-quotes.js', code)
    runBiomeFormatWrite([testFile])
    const formatted = fs.readFileSync(testFile, 'utf8')

    expect(formatted).toMatch(/const message = 'Hello World'/)
    expect(formatted).toMatch(/const template = 'This is a "quoted" string'/)
    expect(formatted).toMatch(/const obj = \{ key: 'value' \}/)
  })

  it('should use 2 spaces for indentation', () => {
    const code = `function test() {
    if (true) {
        const nested = {
            key: "value",
            array: [
                1,
                2,
                3
            ]
        }
        return nested
    }
}`

    const testFile = createTestFile('test-indentation.js', code)
    runBiomeFormatWrite([testFile])
    const formatted = fs.readFileSync(testFile, 'utf8')

    // Check for 2-space indentation
    const lines = formatted.split('\n')
    const indentedLines = lines.filter(line => line.match(/^\s+\S/))

    indentedLines.forEach(line => {
      const indentMatch = line.match(/^(\s+)/)
      if (indentMatch) {
        const [, indent] = indentMatch
        // Should use spaces, not tabs
        expect(indent).not.toMatch(/\t/)
        // Indent should be multiples of 2
        expect(indent.length % 2).toBe(0)
      }
    })
  })

  it('should handle arrow functions correctly', () => {
    const code = `const fn1 = (x) => x * 2;
const fn2 = x => x * 2;
const fn3 = (x, y) => {
    return x + y;
};`

    const testFile = createTestFile('test-arrows.js', code)
    runBiomeFormatWrite([testFile])
    const formatted = fs.readFileSync(testFile, 'utf8')

    // Should use parentheses only when needed (biome may differ from standard on this)
    expect(formatted).toMatch(/const fn1 = .* => .* \* 2/)
    expect(formatted).toMatch(/const fn2 = .* => .* \* 2/)
    expect(formatted).toMatch(/const fn3 = \(.*, .*\) => \{/)
    expect(formatted).toMatch(/return .* \+ .*/)
  })

  it('should check if biome configuration is valid', () => {
    const configPath = path.resolve(__dirname, '../biome.json')
    expect(fs.existsSync(configPath)).toBe(true)

    const config: BiomeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    // Verify key formatting settings
    expect(config.javascript?.formatter?.quoteStyle).toBe('single')
    expect(config.javascript?.formatter?.semicolons).toBe('asNeeded')
    expect(config.formatter?.indentWidth).toBe(2)
    expect(config.formatter?.indentStyle).toBe('space')
  })

  it('can format a complex example with all rules', () => {
    const code = `const message = "Hello World";
var oldStyle = "not recommended";
function testFunction( x,y ) {
    var result = x=="test"?x+y:x*y;
    return result;
}
export { testFunction,message };`

    const testFile = createTestFile('test-complex.js', code)
    runBiomeFormatWrite([testFile])
    const formatted = fs.readFileSync(testFile, 'utf8')

    // Should use single quotes
    expect(formatted).toMatch(/const message = 'Hello World'/)
    expect(formatted).toMatch(/'not recommended'/)

    // Should have proper spacing
    expect(formatted).toMatch(/function testFunction\(x, y\)/)

    // Should handle complex expressions with spacing
    expect(formatted).toMatch(/x == 'test'/) // Note: == to === conversion is a linting rule, not formatting

    // Check that it's generally well formatted
    expect(formatted.length).toBeGreaterThan(50) // Sanity check
  })
})
