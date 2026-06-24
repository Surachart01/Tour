const { test, expect } = require('@playwright/test');
const AuthHelper = require('../utils/auth-helper');

test.describe('Transfers Bulk Actions Tests', () => {
  let authHelper;
  let page;
  let dialogMessages = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    authHelper = new AuthHelper(page);

    // Setup global dialog handler to automatically accept dialogs and record their messages
    page.on('dialog', async dialog => {
      const msg = dialog.message();
      console.log(`[Browser Dialog]: ${msg}`);
      dialogMessages.push(msg);
      await dialog.accept();
    });

    // Capture console messages from the browser page
    page.on('console', msg => {
      console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    const username = process.env.TEST_USERNAME || 'superadmin';
    const password = process.env.TEST_PASSWORD || 'admin123';
    console.log(`Attempting login for tests as user: ${username}`);
    await authHelper.ensureLoggedIn({ username, password });
    console.log('Logged in successfully');
  });

  test.beforeEach(() => {
    dialogMessages = []; // Clear messages before each test run
  });

  test('should perform bulk clone, batch edit, and bulk delete successfully', async () => {
    // ===== Navigate to Transfers List =====
    console.log('🔄 Step 1: Navigating to transfers page...');
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseUrl}/production/transfers.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for list to load completely

    // Verify checkbox columns exist
    const checkboxes = page.locator('.transfer-select');
    const countBefore = await checkboxes.count();
    console.log(`Found ${countBefore} transfers on the current page`);
    expect(countBefore).toBeGreaterThan(0);

    // ===== Bulk Clone =====
    console.log('👥 Step 2: Selecting first 2 transfers for bulk cloning...');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Check count displays updated selection count
    const editSelectedCount = await page.locator('#btnBulkEdit .selected-count').first().textContent();
    console.log(`UI indicates selected count: ${editSelectedCount}`);
    expect(editSelectedCount).toBe('2');

    console.log('⚡ Clicking Clone Selected...');
    await page.click('#btnBulkClone');

    // Wait for the clone progress overlay to finish
    console.log('⏳ Waiting for bulk clone progress overlay to disappear...');
    await page.waitForSelector('#progressOverlay', { state: 'hidden', timeout: 30000 });

    // Wait for reload
    await page.waitForTimeout(3000);
    console.log('✅ Bulk clone request finished');

    // Assert cloning alerts were captured
    expect(dialogMessages.some(m => m.includes('Are you sure you want to clone'))).toBe(true);
    expect(dialogMessages.some(m => m.includes('Successfully cloned 2 transfers'))).toBe(true);
    console.log('✅ Bulk clone verified successfully');

    // ===== Batch Edit =====
    console.log('✏️ Step 3: Initiating Batch Edit on 2 items...');
    dialogMessages = []; // Clear for batch edit asserts
    
    // Select the first 2 checkboxes (these will be edited)
    await page.locator('.transfer-select').nth(0).check();
    await page.locator('.transfer-select').nth(1).check();
    
    console.log('⚡ Clicking Edit Selected...');
    await page.click('#btnBulkEdit');

    // Wait for redirect to edit_transfer.html
    await page.waitForURL(/edit_transfer.html/, { timeout: 15000 });
    console.log(`✅ Redirected to: ${page.url()}`);
    expect(page.url()).toContain('batch=true');

    // Verify banner is shown
    const banner = page.locator('#batchEditBanner');
    await expect(banner).toBeVisible();
    
    const progressText = await page.locator('#batchCurrentIndex').textContent();
    console.log(`Progress index shows: ${progressText}`);
    expect(progressText).toBe('1');

    // CRITICAL: Wait for form to populate async from API including the setTimeout dropdown populates
    console.log('⏳ Waiting for form fields (departure, city, supplier) to load and populate from API...');
    await page.waitForFunction(() => {
      const departure = document.getElementById('departure');
      const city = document.getElementById('city');
      const supplier = document.getElementById('supplier');
      return departure && departure.value !== '' && 
             city && city.value !== '' && 
             supplier && supplier.value !== '';
    }, { timeout: 15000 });
    console.log('✅ Form fields populated successfully');

    // Modify description on transfer 1
    const initialDesc = await page.inputValue('#description');
    const updatedDesc = `${initialDesc} (Batch Edit Test)`;
    await page.fill('#description', updatedDesc);

    console.log('⚡ Saving first transfer...');
    await page.click('#submitTransfer');

    // Wait for second transfer to load (redirect should happen)
    console.log('⏳ Waiting for redirect to second item...');
    await page.waitForFunction(() => {
      const idx = document.getElementById('batchCurrentIndex');
      return idx && idx.textContent === '2';
    }, { timeout: 15000 });

    const progressText2 = await page.locator('#batchCurrentIndex').textContent();
    console.log(`Progress index on second item shows: ${progressText2}`);
    expect(progressText2).toBe('2');

    // Verify Previous button is visible and active on the second item
    const btnPrev = page.locator('#btnBatchPrev');
    await expect(btnPrev).toBeVisible();
    console.log('⚡ Clicking Previous button to navigate back to first transfer...');
    await btnPrev.click();

    // Wait for redirect back to first transfer
    console.log('⏳ Waiting for redirect to first item...');
    await page.waitForFunction(() => {
      const idx = document.getElementById('batchCurrentIndex');
      return idx && idx.textContent === '1';
    }, { timeout: 15000 });

    const progressText1Again = await page.locator('#batchCurrentIndex').textContent();
    console.log(`Progress index after going back shows: ${progressText1Again}`);
    expect(progressText1Again).toBe('1');

    // Skip the first transfer (which is already saved) to go to second transfer again
    console.log('⚡ Clicking Skip / Next on first transfer to go to second transfer...');
    await page.click('#btnBatchSkip');

    // Wait for redirect back to second transfer
    console.log('⏳ Waiting for redirect to second item again...');
    await page.waitForFunction(() => {
      const idx = document.getElementById('batchCurrentIndex');
      return idx && idx.textContent === '2';
    }, { timeout: 15000 });

    // Skip the second transfer to complete batch edit
    console.log('⚡ Skipping second transfer...');
    await page.click('#btnBatchSkip');

    // Wait for redirect back to transfers.html
    await page.waitForURL(/transfers.html/, { timeout: 15000 });
    console.log(`✅ Redirected back to: ${page.url()}`);

    // Assert batch edit dialogs
    expect(dialogMessages.some(m => m.includes('Transfer updated successfully'))).toBe(true);
    expect(dialogMessages.some(m => m.includes('Reached the end of the batch') || m.includes('Batch edit completed'))).toBe(true);
    console.log('✅ Batch edit flow verified successfully');

    // ===== Bulk Delete =====
    console.log('🗑️ Step 4: Deleting selected transfers to clean up...');
    dialogMessages = []; // Clear for delete asserts
    await page.waitForTimeout(2000);
    
    // Select the first two rows
    await page.locator('.transfer-select').nth(0).check();
    await page.locator('.transfer-select').nth(1).check();

    console.log('⚡ Clicking Delete Selected...');
    await page.click('#btnBulkDelete');

    // Wait for delete progress
    await page.waitForSelector('#progressOverlay', { state: 'hidden', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Assert delete dialogs
    expect(dialogMessages.some(m => m.includes('delete'))).toBe(true);
    expect(dialogMessages.some(m => m.includes('Successfully deleted 2 transfers'))).toBe(true);
    console.log('✅ Bulk delete and cleanup completed successfully!');
  });
});
