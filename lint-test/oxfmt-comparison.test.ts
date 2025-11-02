import { describe, it, expect, afterEach } from 'vitest'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface FormatResult {
  formatted: string
  success: boolean
  error?: string
}

describe('oxfmt vs Biome formatting comparison', () => {
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

  const runBiomeFormat = (file: string): FormatResult => {
    try {
      const command = `npx biome format --write --config-path ${path.resolve(__dirname, '../biome.json')} ${file}`
      execSync(command, {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
      })
      return {
        formatted: fs.readFileSync(file, 'utf8'),
        success: true,
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'stdout' in error) {
        const execError = error as { stdout?: string; stderr?: string }
        return {
          formatted: fs.readFileSync(file, 'utf8'),
          success: false,
          error: execError.stdout || execError.stderr,
        }
      }
      throw error
    }
  }

  const runOxfmt = (file: string): FormatResult => {
    try {
      // Create temporary .oxfmtrc.json with Standard Style settings
      const configPath = path.resolve(__dirname, '.oxfmtrc.json')
      const config = {
        singleQuote: true,
        semi: false,
        printWidth: 100,
        tabWidth: 2,
        trailingComma: 'es5',
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
      testFiles.push(configPath)

      const command = `npx oxfmt ${file}`
      execSync(command, {
        cwd: path.resolve(__dirname),
        encoding: 'utf8',
      })
      return {
        formatted: fs.readFileSync(file, 'utf8'),
        success: true,
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'stdout' in error) {
        const execError = error as { stdout?: string; stderr?: string }
        return {
          formatted: fs.readFileSync(file, 'utf8'),
          success: false,
          error: execError.stdout || execError.stderr,
        }
      }
      throw error
    }
  }

  it('both formatters should remove unnecessary semicolons', () => {
    const code = `const message = "Hello World";
const arr = [1, 2, 3];
function test() {
  return "test";
}
export default test;`

    const biomeFile = createTestFile('test-biome-semicolons.js', code)
    const oxfmtFile = createTestFile('test-oxfmt-semicolons.js', code)

    const biomeResult = runBiomeFormat(biomeFile)
    const oxfmtResult = runOxfmt(oxfmtFile)

    expect(biomeResult.success).toBe(true)
    expect(oxfmtResult.success).toBe(true)

    // Both should remove semicolons
    expect(biomeResult.formatted).not.toMatch(/const message = '.*';/)
    expect(oxfmtResult.formatted).not.toMatch(/const message = '.*';/)

    // Both should convert to single quotes
    expect(biomeResult.formatted).toMatch(/const message = 'Hello World'/)
    expect(oxfmtResult.formatted).toMatch(/const message = 'Hello World'/)
  })

  it('both formatters should convert double quotes to single quotes', () => {
    const code = `const message = "Hello World"
const template = "This is a \\"quoted\\" string"
const obj = { "key": "value" }`

    const biomeFile = createTestFile('test-biome-quotes.js', code)
    const oxfmtFile = createTestFile('test-oxfmt-quotes.js', code)

    const biomeResult = runBiomeFormat(biomeFile)
    const oxfmtResult = runOxfmt(oxfmtFile)

    expect(biomeResult.success).toBe(true)
    expect(oxfmtResult.success).toBe(true)

    expect(biomeResult.formatted).toMatch(/const message = 'Hello World'/)
    expect(oxfmtResult.formatted).toMatch(/const message = 'Hello World'/)
  })

  it('both formatters should use 2 spaces for indentation', () => {
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

    const biomeFile = createTestFile('test-biome-indentation.js', code)
    const oxfmtFile = createTestFile('test-oxfmt-indentation.js', code)

    const biomeResult = runBiomeFormat(biomeFile)
    const oxfmtResult = runOxfmt(oxfmtFile)

    expect(biomeResult.success).toBe(true)
    expect(oxfmtResult.success).toBe(true)

    // Check for 2-space indentation in both
    const checkIndentation = (formatted: string) => {
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
    }

    checkIndentation(biomeResult.formatted)
    checkIndentation(oxfmtResult.formatted)
  })

  it('both formatters should handle complex TypeScript code', () => {
    const code = `interface User {
  name: string;
  age: number;
}

const getUser = async (id: number): Promise<User> => {
  const response = await fetch(\`/api/users/\${id}\`);
  return response.json();
};

export { getUser };`

    const biomeFile = createTestFile('test-biome-typescript.ts', code)
    const oxfmtFile = createTestFile('test-oxfmt-typescript.ts', code)

    const biomeResult = runBiomeFormat(biomeFile)
    const oxfmtResult = runOxfmt(oxfmtFile)

    expect(biomeResult.success).toBe(true)
    expect(oxfmtResult.success).toBe(true)

    // Both should handle TypeScript syntax
    expect(biomeResult.formatted).toMatch(/interface User/)
    expect(oxfmtResult.formatted).toMatch(/interface User/)
  })

  it('both formatters should handle JSX/TSX code', () => {
    const code = `import React from "react";

const MyComponent = ({ name }: { name: string }) => {
  return (
    <div className="container">
      <h1>Hello, {name}!</h1>
      <button onClick={() => console.log("clicked")}>
        Click me
      </button>
    </div>
  );
};

export default MyComponent;`

    const biomeFile = createTestFile('test-biome-jsx.tsx', code)
    const oxfmtFile = createTestFile('test-oxfmt-jsx.tsx', code)

    const biomeResult = runBiomeFormat(biomeFile)
    const oxfmtResult = runOxfmt(oxfmtFile)

    expect(biomeResult.success).toBe(true)
    expect(oxfmtResult.success).toBe(true)

    // Both should handle JSX syntax
    expect(biomeResult.formatted).toMatch(/<div/)
    expect(oxfmtResult.formatted).toMatch(/<div/)
  })

  it('both formatters should handle trailing commas', () => {
    const code = `const obj = {
  a: 1,
  b: 2,
  c: 3,
};

const arr = [
  1,
  2,
  3,
];`

    const biomeFile = createTestFile('test-biome-trailing-comma.js', code)
    const oxfmtFile = createTestFile('test-oxfmt-trailing-comma.js', code)

    const biomeResult = runBiomeFormat(biomeFile)
    const oxfmtResult = runOxfmt(oxfmtFile)

    expect(biomeResult.success).toBe(true)
    expect(oxfmtResult.success).toBe(true)

    // Both should handle trailing commas (ES5 style - keep in objects/arrays)
    expect(biomeResult.formatted).toMatch(/c: 3,/)
    expect(oxfmtResult.formatted).toMatch(/c: 3,/)
  })

  it('comparison: format output similarity', () => {
    const code = `const message = "Hello World";
var oldStyle = "not recommended";
function testFunction( x,y ) {
    var result = x=="test"?x+y:x*y;
    return result;
}
export { testFunction,message };`

    const biomeFile = createTestFile('test-biome-compare.js', code)
    const oxfmtFile = createTestFile('test-oxfmt-compare.js', code)

    const biomeResult = runBiomeFormat(biomeFile)
    const oxfmtResult = runOxfmt(oxfmtFile)

    expect(biomeResult.success).toBe(true)
    expect(oxfmtResult.success).toBe(true)

    // Compare key formatting aspects
    const biomeHasSingleQuotes = biomeResult.formatted.match(/'Hello World'/)
    const oxfmtHasSingleQuotes = oxfmtResult.formatted.match(/'Hello World'/)
    
    const biomeHasNoSemicolons = !biomeResult.formatted.match(/const message = '.*';/)
    const oxfmtHasNoSemicolons = !oxfmtResult.formatted.match(/const message = '.*';/)

    expect(biomeHasSingleQuotes).toBeTruthy()
    expect(oxfmtHasSingleQuotes).toBeTruthy()
    expect(biomeHasNoSemicolons).toBe(true)
    expect(oxfmtHasNoSemicolons).toBe(true)

    console.log('\n=== Biome formatted output ===')
    console.log(biomeResult.formatted)
    console.log('\n=== oxfmt formatted output ===')
    console.log(oxfmtResult.formatted)
  })
})
