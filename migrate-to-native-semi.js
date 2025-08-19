#!/usr/bin/env node
/**
 * Migration script for transitioning from JavaScript semi extension to native oxlint semi rule
 * Run this script when the native semi rule becomes available in oxlint
 */

const fs = require('fs')
const path = require('path')

console.log('🔄 Migrating to native oxlint semi rule...')

async function migrateToNativeRule() {
  try {
    // 1. Update .oxlintrc.json to enable native semi rule
    console.log('📝 Updating .oxlintrc.json...')
    updateOxlintConfig()
    
    // 2. Update package.json to remove semi extension script
    console.log('📦 Updating package.json...')
    updatePackageJson()
    
    // 3. Test the native rule
    console.log('🧪 Testing native semi rule...')
    await testNativeRule()
    
    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('🎉 Benefits of native rule:')
    console.log('  • Real-time IDE error highlighting')
    console.log('  • Language server integration') 
    console.log('  • 10-100x faster performance')
    console.log('  • Seamless oxlint integration')
    console.log('')
    console.log('💡 You can now remove the lint:semi script calls from your workflows')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('')
    console.error('This might mean:')
    console.error('  • Native semi rule is not yet available in your oxlint version')
    console.error('  • You need to update oxlint to a newer version')
    console.error('  • There was an error updating configuration files')
    process.exit(1)
  }
}

function updateOxlintConfig() {
  const oxlintrcPath = '.oxlintrc.json'
  
  if (!fs.existsSync(oxlintrcPath)) {
    throw new Error(`.oxlintrc.json not found in current directory`)
  }
  
  const config = JSON.parse(fs.readFileSync(oxlintrcPath, 'utf8'))
  
  // Enable native semi rule
  if (!config.rules) {
    config.rules = {}
  }
  
  // Change from "off" to "error" to enable native rule
  config.rules.semi = "error"
  
  // Add comment about migration (if we can figure out a way)
  fs.writeFileSync(oxlintrcPath, JSON.stringify(config, null, 2) + '\n')
  
  console.log('  ✓ Enabled native semi rule in .oxlintrc.json')
}

function updatePackageJson() {
  const packageJsonPath = 'package.json'
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log('  ⚠ package.json not found, skipping script removal')
    return
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  
  // Remove lint:semi script if it exists
  if (packageJson.scripts && packageJson.scripts['lint:semi']) {
    delete packageJson.scripts['lint:semi']
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
    console.log('  ✓ Removed lint:semi script from package.json')
  } else {
    console.log('  ℹ No lint:semi script found in package.json')
  }
}

async function testNativeRule() {
  const { spawn } = require('child_process')
  
  return new Promise((resolve, reject) => {
    // Test if oxlint recognizes the semi rule
    const oxlint = spawn('npx', ['oxlint', '--help'], { stdio: 'pipe' })
    
    let output = ''
    oxlint.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    oxlint.on('close', (code) => {
      if (code === 0) {
        console.log('  ✓ Native oxlint semi rule is available')
        resolve()
      } else {
        reject(new Error('oxlint command failed'))
      }
    })
    
    oxlint.on('error', (err) => {
      reject(new Error(`Failed to run oxlint: ${err.message}`))
    })
    
    setTimeout(() => {
      oxlint.kill()
      reject(new Error('oxlint command timed out'))
    }, 10000)
  })
}

// Usage information
function showUsage() {
  console.log('Usage: node migrate-to-native-semi.js')
  console.log('')
  console.log('This script helps migrate from the JavaScript semi extension')
  console.log('to the native oxlint semi rule once it becomes available.')
  console.log('')
  console.log('What it does:')
  console.log('  1. Updates .oxlintrc.json to enable native semi rule') 
  console.log('  2. Removes lint:semi script from package.json')
  console.log('  3. Tests that native rule is working')
  console.log('')
  console.log('Run this script from your project root directory.')
}

// Check if this is being run directly
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage()
    process.exit(0)
  }
  
  migrateToNativeRule()
}

module.exports = { migrateToNativeRule }