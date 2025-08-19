#!/usr/bin/env node
/**
 * Oxlint Semi Rule Extension
 * 
 * This script implements the "semi" rule for JavaScript Standard Style until
 * oxlint natively supports it. According to Standard Style, semicolons should
 * not be used except where required to avoid ASI (Automatic Semicolon Insertion) issues.
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

class SemiRuleExtension {
  constructor(options = {}) {
    this.severity = options.severity || 'error'
    this.patterns = options.patterns || ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx']
    this.ignore = options.ignore || ['node_modules/**', 'dist/**', 'build/**', '.git/**']
    this.results = []
  }

  /**
   * Check if a semicolon is required to avoid ASI issues
   * Based on JavaScript Standard Style rules
   */
  isRequiredSemicolon(line, nextLine) {
    // Semicolon is required before lines starting with (, [, `, +, -, /, *, %
    const asi_problematic = /^\s*[\(\[\`\+\-\/\*\%]/
    
    if (!nextLine) return false
    
    // If next line could cause ASI issues
    if (asi_problematic.test(nextLine)) {
      // But only if current line ends with something that needs protection
      const needs_protection = /[a-zA-Z0-9_$\)\]\}]$/
      return needs_protection.test(line.trim())
    }
    
    return false
  }

  /**
   * Check a single file for semicolon violations
   */
  checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lines = content.split('\n')
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const nextLine = lines[i + 1]
        
        // Skip comments and strings (basic check)
        if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
          continue
        }
        
        // Check for semicolons
        const semicolonMatch = line.match(/;(\s*)$/)
        if (semicolonMatch) {
          const isRequired = this.isRequiredSemicolon(line.replace(/;.*$/, ''), nextLine)
          
          if (!isRequired) {
            this.results.push({
              file: filePath,
              line: i + 1,
              column: line.lastIndexOf(';') + 1,
              severity: this.severity,
              message: 'Unnecessary semicolon.',
              rule: 'semi'
            })
          }
        }
        
        // Check for missing required semicolons
        if (nextLine && this.isRequiredSemicolon(line, nextLine)) {
          if (!line.endsWith(';')) {
            this.results.push({
              file: filePath,
              line: i + 1,
              column: line.length + 1,
              severity: this.severity,
              message: 'Missing semicolon to avoid ASI issues.',
              rule: 'semi'
            })
          }
        }
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message)
    }
  }

  /**
   * Lint files based on the patterns
   */
  async lint(targetPaths = ['.']) {
    this.results = []
    
    for (const targetPath of targetPaths) {
      if (fs.statSync(targetPath).isFile()) {
        this.checkFile(targetPath)
      } else {
        // Find files matching patterns
        const files = await glob(this.patterns, {
          cwd: targetPath,
          ignore: this.ignore,
          absolute: true
        })
        
        for (const file of files) {
          this.checkFile(file)
        }
      }
    }
    
    return this.results
  }

  /**
   * Format results similar to oxlint output
   */
  formatResults() {
    if (this.results.length === 0) {
      return ''
    }

    let output = ''
    const groupedByFile = this.results.reduce((acc, result) => {
      if (!acc[result.file]) acc[result.file] = []
      acc[result.file].push(result)
      return acc
    }, {})

    for (const [file, fileResults] of Object.entries(groupedByFile)) {
      for (const result of fileResults) {
        const symbol = result.severity === 'error' ? '×' : '⚠'
        output += `${symbol} eslint(${result.rule}): ${result.message}\n`
        output += `   ╭─[${path.relative(process.cwd(), file)}:${result.line}:${result.column}]\n`
        output += ` ${result.line} │ ${fs.readFileSync(file, 'utf8').split('\n')[result.line - 1]}\n`
        output += `   ╰────\n`
        output += `  help: JavaScript Standard Style: avoid unnecessary semicolons\n\n`
      }
    }

    const errorCount = this.results.filter(r => r.severity === 'error').length
    const warningCount = this.results.filter(r => r.severity === 'warn').length
    
    output += `Found ${warningCount} warnings and ${errorCount} errors.\n`
    
    return output
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2)
  const paths = args.length > 0 ? args : ['.']
  
  const extension = new SemiRuleExtension()
  const results = await extension.lint(paths)
  
  if (results.length > 0) {
    console.log(extension.formatResults())
    process.exit(1)
  } else {
    console.log('✓ No semicolon violations found')
    process.exit(0)
  }
}

// Export for use as a module
module.exports = { SemiRuleExtension }

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error)
}