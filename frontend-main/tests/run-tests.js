#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printBanner() {
  colorLog('\n' + '='.repeat(60), 'cyan');
  colorLog('🚀 TRAVEL MANAGEMENT E2E TEST SUITE 🚀', 'bright');
  colorLog('='.repeat(60), 'cyan');
  colorLog('Automated testing for Hotels, Transfers, Excursions, Tours, Leads & Quotations\n', 'blue');
}

function printUsage() {
  colorLog('\nUsage:', 'bright');
  colorLog('  node run-tests.js [options] [test-suite]', 'yellow');
  colorLog('\nTest Suites:', 'bright');
  colorLog('  hotels      - Test hotel management (CRUD)', 'green');
  colorLog('  transfers   - Test transfer management (CRUD)', 'green');
  colorLog('  excursions  - Test excursion management (CRUD)', 'green');
  colorLog('  tours       - Test tour management (CRUD)', 'green');
  colorLog('  leads       - Test lead management (CRUD + conversion)', 'green');
  colorLog('  quotations  - Test quotation management (CRUD)', 'green');
  colorLog('  all         - Run all test suites (default)', 'green');
  colorLog('\nOptions:', 'bright');
  colorLog('  --headed    - Run tests in headed mode (visible browser)', 'yellow');
  colorLog('  --debug     - Run tests in debug mode', 'yellow');
  colorLog('  --ui        - Open Playwright UI mode', 'yellow');
  colorLog('  --report    - Show HTML report after tests', 'yellow');
  colorLog('  --browser   - Choose browser: chromium, firefox, webkit (default: all)', 'yellow');
  colorLog('  --help      - Show this help message', 'yellow');
  colorLog('\nExamples:', 'bright');
  colorLog('  node run-tests.js hotels --headed', 'cyan');
  colorLog('  node run-tests.js hotels --browser firefox --headed', 'cyan');
  colorLog('  node run-tests.js hotels --browser=chromium --headed', 'cyan');
  colorLog('  node run-tests.js all --report', 'cyan');
  colorLog('  node run-tests.js leads --debug', 'cyan');
  colorLog('');
}

function checkPrerequisites() {
  colorLog('🔍 Checking prerequisites...', 'yellow');
  
  // Check if package.json exists
  if (!fs.existsSync('package.json')) {
    colorLog('❌ package.json not found. Please run from the tests directory.', 'red');
    process.exit(1);
  }
  
  // Check if node_modules exists
  if (!fs.existsSync('node_modules')) {
    colorLog('❌ node_modules not found. Please run: npm install', 'red');
    process.exit(1);
  }
  
  colorLog('✅ Prerequisites check passed', 'green');
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    colorLog(`\n🔧 Running: ${command} ${args.join(' ')}`, 'blue');
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function installPlaywright() {
  try {
    colorLog('🎭 Installing Playwright browsers...', 'yellow');
    await runCommand('npx', ['playwright', 'install']);
    colorLog('✅ Playwright browsers installed', 'green');
  } catch (error) {
    colorLog('⚠️ Failed to install Playwright browsers. Continuing anyway...', 'yellow');
  }
}

async function runTests(testSuite, options) {
  const args = ['playwright', 'test'];
  
  // Add test suite specific file
  if (testSuite && testSuite !== 'all') {
    args.push(`tests/${testSuite}.spec.js`);
  }
  
  // Add options
  if (options.headed) {
    args.push('--headed');
  }
  
  if (options.debug) {
    args.push('--debug');
  }
  
  if (options.ui) {
    args.push('--ui');
  }
  
  // Add browser selection
  if (options.browser) {
    args.push(`--project=${options.browser}`);
  }
  
  // Always add reporter options
  args.push('--reporter=list,html');
  
  try {
    colorLog(`\n🧪 Running ${testSuite === 'all' ? 'all' : testSuite} tests...`, 'green');
    await runCommand('npx', args);
    colorLog(`\n✅ ${testSuite === 'all' ? 'All' : testSuite} tests completed successfully!`, 'green');
    
    if (options.report) {
      colorLog('\n📊 Opening test report...', 'blue');
      await runCommand('npx', ['playwright', 'show-report']);
    }
    
  } catch (error) {
    colorLog(`\n❌ Tests failed: ${error.message}`, 'red');
    
    colorLog('\n🔍 Troubleshooting tips:', 'yellow');
    colorLog('1. Make sure your application is running on http://127.0.0.1:8080', 'yellow');
    colorLog('2. Check if you can login with vtadmin/testing@123', 'yellow');
    colorLog('3. Verify your backend API is responding', 'yellow');
    colorLog('4. Check test-results/ directory for screenshots and videos', 'yellow');
    
    if (fs.existsSync('test-results/html-report/index.html')) {
      colorLog('\n📊 HTML report available at: test-results/html-report/index.html', 'cyan');
    }
    
    process.exit(1);
  }
}

async function showReport() {
  try {
    await runCommand('npx', ['playwright', 'show-report']);
  } catch (error) {
    colorLog('❌ Failed to show report:', 'red', error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    printBanner();
    printUsage();
    process.exit(0);
  }
  
  printBanner();
  
  // Parse arguments
  const testSuite = args.find(arg => !arg.startsWith('--')) || 'all';
  
  // Support both --browser=firefox and --browser firefox formats
  let browser = null;
  const browserEqualArg = args.find(arg => arg.startsWith('--browser='));
  if (browserEqualArg) {
    browser = browserEqualArg.split('=')[1];
  } else {
    const browserIndex = args.findIndex(arg => arg === '--browser');
    if (browserIndex !== -1 && args[browserIndex + 1] && !args[browserIndex + 1].startsWith('--')) {
      browser = args[browserIndex + 1];
    }
  }
  
  const options = {
    headed: args.includes('--headed'),
    debug: args.includes('--debug'),
    ui: args.includes('--ui'),
    report: args.includes('--report'),
    browser: browser
  };
  
  // Special case for UI mode
  if (options.ui) {
    try {
      await runCommand('npx', ['playwright', 'test', '--ui']);
    } catch (error) {
      colorLog('❌ Failed to start UI mode:', 'red', error.message);
    }
    return;
  }
  
  // Special case for report only
  if (args.includes('--report-only')) {
    await showReport();
    return;
  }
  
  colorLog(`📋 Test Configuration:`, 'bright');
  colorLog(`   Test Suite: ${testSuite}`, 'cyan');
  colorLog(`   Browser: ${options.browser || 'all browsers'}`, 'cyan');
  colorLog(`   Headed Mode: ${options.headed ? 'Yes' : 'No'}`, 'cyan');
  colorLog(`   Debug Mode: ${options.debug ? 'Yes' : 'No'}`, 'cyan');
  colorLog(`   Show Report: ${options.report ? 'Yes' : 'No'}`, 'cyan');
  
  try {
    checkPrerequisites();
    await installPlaywright();
    await runTests(testSuite, options);
    
    colorLog('\n🎉 All done! Happy testing!', 'green');
    
  } catch (error) {
    colorLog(`\n💥 Execution failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  colorLog('\n\n⏹️ Tests interrupted by user', 'yellow');
  process.exit(0);
});

// Run main function
main().catch((error) => {
  colorLog(`\n💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
