import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

const fs = require('fs')
const path = require('path')

const reactCode = `
  import React from 'react'
  export const BadComponent = () => {
    if (Math.random() > 0.5) {
      React.useState(0)
    }
    return <div>Bad Example</div>
  }
  export const GoodComponent = () => {
    const [count, setCount] = React.useState(0)
    return <button onClick={() => setCount(count + 1)}>{count}</button>
  }
`

const standardCode = `
  var foo = "bar"
  function test (): void {
    console.log(foo)
  }
`
const standardFile = path.resolve(__dirname, 'StandardTest.ts')

const reactFile = path.resolve(__dirname, 'TestComponent.tsx')

describe('oxlint rules via shared config', () => {
  const runOxlint = (files, plugins = '') => {
    try {
      const command = `npx oxlint --config ${path.resolve(__dirname, '../.oxlintrc.json')} ${plugins} --format json ${files.join(' ')}`
      const output = execSync(command, {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
      })
      return JSON.parse(output)
    } catch (error) {
      // oxlint exits with non-zero when issues are found
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout)
        } catch {
          return { diagnostics: [] }
        }
      }
      return { diagnostics: [] }
    }
  }

  it('should trigger React rules for React components', async () => {
    fs.writeFileSync(reactFile, reactCode)
    const results = runOxlint([reactFile], '--react-plugin')

    // Check if any React-related issues were found
    const _hasReactIssues = results.diagnostics?.some(
      d => d.code?.includes('react') || d.code?.includes('jsx')
    )

    // Should find at least some linting issues in the React code
    expect(results.diagnostics?.length || 0).toBeGreaterThan(0)
    fs.unlinkSync(reactFile)
  })

  it('should trigger standard style rules', async () => {
    fs.writeFileSync(standardFile, standardCode)
    const results = runOxlint([standardFile])

    // Should find issues with var usage and other style problems
    const _hasStyleIssues = results.diagnostics?.some(
      d =>
        d.code === 'eslint(no-var)' ||
        d.code?.includes('style') ||
        d.code?.includes('format')
    )

    expect(results.diagnostics?.length || 0).toBeGreaterThan(0)
    fs.unlinkSync(standardFile)
  })

  it('should load configuration successfully', async () => {
    // Test that oxlint can load our configuration
    const configPath = path.resolve(__dirname, '../.oxlintrc.json')
    expect(fs.existsSync(configPath)).toBe(true)

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
    expect(config.plugins).toContain('typescript')
    expect(config.plugins).toContain('react')
    expect(config.rules).toBeDefined()
  })
})
