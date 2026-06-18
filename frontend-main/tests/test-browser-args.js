// Test browser argument parsing
const args = process.argv.slice(2);
console.log('Raw args:', args);

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

console.log('Parsed results:');
console.log('  Test Suite:', testSuite);
console.log('  Browser:', browser || 'all browsers');
console.log('  Should use Firefox:', browser === 'firefox');


