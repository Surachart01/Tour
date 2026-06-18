// Global setup for Playwright tests
const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Starting global test setup...');
  
  // Create test results directories
  const testResultsDir = path.join(__dirname, '..', 'test-results');
  const dirs = [
    testResultsDir,
    path.join(testResultsDir, 'screenshots'),
    path.join(testResultsDir, 'videos'),
    path.join(testResultsDir, 'api-reports'),
    path.join(testResultsDir, 'html-report')
  ];
  
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
  
  // Launch browser for authentication state setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check if the application is accessible
    console.log('Checking application accessibility...');
    
    await page.goto('http://127.0.0.1:8080/production/login.html', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Application is accessible');
    
    // Optionally, you can set up authentication state here
    // This would allow tests to skip login for better performance
    
    // Example: Login and save authentication state
    /*
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'testpass123');
    await page.click('button[type="submit"]');
    
    // Wait for login success
    await page.waitForSelector('.sidebar, .navbar', { timeout: 10000 });
    
    // Save authentication state
    await context.storageState({ path: 'test-results/auth-state.json' });
    console.log('✅ Authentication state saved');
    */
    
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    console.error('Make sure your application is running on http://127.0.0.1:8080');
    
    // Don't fail the entire test suite, just warn
    console.warn('⚠️  Some tests may fail due to application not being accessible');
  } finally {
    await browser.close();
  }
  
  // Log test environment info
  console.log('📊 Test Environment Information:');
  console.log(`   Base URL: ${config.use?.baseURL || 'http://127.0.0.1:8080'}`);
  console.log(`   Browser: ${config.projects?.[0]?.name || 'chromium'}`);
  console.log(`   Test Directory: ${config.testDir}`);
  console.log(`   Workers: ${config.workers}`);
  console.log(`   Retries: ${config.retries}`);
  console.log('');
  
  console.log('✅ Global setup completed successfully');
  
  return {
    setupTime: new Date().toISOString(),
    baseURL: config.use?.baseURL || 'http://127.0.0.1:8080'
  };
}

module.exports = globalSetup;

