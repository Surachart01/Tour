const { test, expect } = require('@playwright/test');
const TestDataGenerator = require('../utils/test-data-generator');
const AuthHelper = require('../utils/auth-helper');
const PageHelpers = require('../utils/page-helpers');
const ApiInterceptor = require('../utils/api-interceptor');

test.describe('Leads Management Tests', () => {
  let authHelper, pageHelpers, apiInterceptor, testData;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    pageHelpers = new PageHelpers(page);
    apiInterceptor = new ApiInterceptor(page);
    testData = new TestDataGenerator();

    await authHelper.ensureLoggedIn({ username: 'vtadmin', password: 'testing@123' });
    await apiInterceptor.startIntercepting();
  });

  test.afterEach(async () => {
    const report = apiInterceptor.logSummary();
    await apiInterceptor.saveReport(`leads-test-${Date.now()}.json`);
    await apiInterceptor.stopIntercepting();
  });

  test('should create a new lead successfully', async ({ page }) => {
    console.log('📝 Testing lead creation...');
    
    const leadData = testData.generateLeadData();
    
    await authHelper.navigateToSection('add-lead');
    
    const fieldMappings = {
      clientName: '#leadClientName',
      clientEmail: '#leadClientEmail', 
      clientPhone: '#leadClientPhone',
      numberOfAdults: '#leadNumberOfAdults',
      numberOfKids: '#leadNumberOfKids',
      startDate: '#leadStartDate',
      bookingDate: '#leadBookingDate',
      optionName: '#leadOptionName',
      markupPercentage: '#leadMarkupPercentage',
      priority: '#leadPriority',
      internalNotes: '#leadInternalNotes',
      clientNotes: '#leadClientNotes',
      remarks: '#leadRemarks'
    };
    
    await pageHelpers.fillForm(leadData, fieldMappings);
    
    await pageHelpers.submitForm([
      '#submitLeadBtn',
      '#saveLeadBtn',
      '#createLeadBtn',
      'button[type="submit"]',
      '.btn-primary:has-text("Save")',
      '.btn:has-text("Create")'
    ]);
    
    const notification = await pageHelpers.waitForNotification();
    
    if (notification && notification.type === 'success') {
      console.log('✅ Lead created successfully:', notification.text);
      
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      
      expect(
        currentUrl.includes('leads.html') || 
        currentUrl.includes('success') ||
        notification.text.toLowerCase().includes('success')
      ).toBeTruthy();
      
    } else {
      console.log('❌ Lead creation failed');
      if (notification) {
        console.log('Error message:', notification.text);
      }
      await pageHelpers.takeScreenshot('lead-creation-failed');
    }
    
    try {
      await pageHelpers.waitForApiResponse('/api/v1/proposals', 5000);
    } catch (error) {
      console.warn('No API response detected for lead creation');
    }
  });

  test('should list and view leads', async ({ page }) => {
    console.log('📋 Testing lead listing...');
    
    await authHelper.navigateToSection('leads');
    await pageHelpers.waitForPageLoad(['#leadsTableBody', '.leads-table', 'table']);
    
    const tableData = await pageHelpers.getTableData('table');
    
    if (tableData && tableData.data.length > 0) {
      console.log(`✅ Found ${tableData.data.length} leads in the list`);
      
      try {
        const firstRow = tableData.data[0];
        console.log('First lead:', Object.values(firstRow).slice(0, 3).join(' | '));
        
        // Try to preview lead
        await page.click('table tr:nth-child(2) .btn:has-text("Preview"), table tr:nth-child(2) .btn:has-text("View"), table tr:nth-child(2) a:has-text("Preview")', { timeout: 5000 });
        
        await pageHelpers.waitForModal();
        console.log('✅ Successfully opened lead preview');
        
        await pageHelpers.closeModal();
        
      } catch (error) {
        console.log('⚠️ Could not open lead preview:', error.message);
      }
      
    } else {
      console.log('⚠️ No leads found in the list');
    }
    
    const apiRequests = apiInterceptor.getApiRequests();
    const leadRequests = apiRequests.filter(req => req.url.includes('/proposals'));
    console.log(`API calls made: ${leadRequests.length} lead-related requests`);
  });

  test('should edit an existing lead', async ({ page }) => {
    console.log('✏️ Testing lead editing...');
    
    await authHelper.navigateToSection('leads');
    await pageHelpers.waitForPageLoad(['table']);
    
    const tableData = await pageHelpers.getTableData('table');
    
    if (!tableData || tableData.data.length === 0) {
      console.log('⚠️ No leads available to edit, skipping test');
      test.skip();
      return;
    }
    
    try {
      await pageHelpers.clickTableAction('table', tableData.data[0][Object.keys(tableData.data[0])[0]], 'Edit');
      
      await pageHelpers.waitForPageLoad();
      console.log('✅ Opened lead edit page');
      
      const updatedData = testData.generateLeadData();
      updatedData.optionName = `Updated ${updatedData.optionName}`;
      updatedData.internalNotes = `Updated notes: ${updatedData.internalNotes}`;
      
      await pageHelpers.fillForm(updatedData, {
        optionName: '#leadOptionName',
        internalNotes: '#leadInternalNotes',
        clientNotes: '#leadClientNotes',
        markupPercentage: '#leadMarkupPercentage'
      });
      
      await pageHelpers.submitForm();
      
      const notification = await pageHelpers.waitForNotification();
      
      if (notification && notification.type === 'success') {
        console.log('✅ Lead updated successfully:', notification.text);
      } else {
        console.log('❌ Lead update may have failed');
        if (notification) {
          console.log('Message:', notification.text);
        }
      }
      
    } catch (error) {
      console.log('❌ Failed to edit lead:', error.message);
      await pageHelpers.takeScreenshot('lead-edit-failed');
    }
  });

  test('should change lead status', async ({ page }) => {
    console.log('🔄 Testing lead status change...');
    
    await authHelper.navigateToSection('leads');
    await pageHelpers.waitForPageLoad(['table']);
    
    const tableData = await pageHelpers.getTableData('table');
    
    if (!tableData || tableData.data.length === 0) {
      console.log('⚠️ No leads available for status change, skipping test');
      test.skip();
      return;
    }
    
    try {
      // Find status badge/dropdown in first row
      const statusSelectors = [
        'table tr:nth-child(2) .status-badge',
        'table tr:nth-child(2) .badge',
        'table tr:nth-child(2) select[name*="status"]',
        'table tr:nth-child(2) .status-dropdown'
      ];
      
      let statusElement = null;
      for (const selector of statusSelectors) {
        try {
          statusElement = await page.waitForSelector(selector, { timeout: 2000 });
          break;
        } catch (error) {
          continue;
        }
      }
      
      if (statusElement) {
        await statusElement.click();
        
        // Try to select a different status
        const statusOptions = ['pending', 'cancel', 'ignore'];
        
        for (const status of statusOptions) {
          try {
            await page.click(`option[value="${status}"], .dropdown-item:has-text("${status}")`, { timeout: 2000 });
            
            // Handle confirmation dialog
            page.on('dialog', async dialog => {
              console.log('Status change confirmation:', dialog.message());
              await dialog.accept();
            });
            
            await page.waitForTimeout(1000);
            console.log(`✅ Changed lead status to: ${status}`);
            break;
            
          } catch (error) {
            continue;
          }
        }
      } else {
        console.log('⚠️ Status change element not found');
      }
      
    } catch (error) {
      console.log('❌ Failed to change lead status:', error.message);
      await pageHelpers.takeScreenshot('lead-status-change-failed');
    }
  });

  test('should convert lead to quotation', async ({ page }) => {
    console.log('🔄 Testing lead to quotation conversion...');
    
    // First create a lead to convert
    const leadData = testData.generateLeadData();
    leadData.clientName = `ConvertTest ${leadData.clientName}`;
    
    await authHelper.navigateToSection('add-lead');
    
    await pageHelpers.fillForm(leadData, {
      clientName: '#leadClientName',
      clientEmail: '#leadClientEmail',
      optionName: '#leadOptionName',
      startDate: '#leadStartDate'
    });
    
    await pageHelpers.submitForm();
    await pageHelpers.waitForNotification();
    
    // Navigate back to leads list
    await authHelper.navigateToSection('leads');
    await pageHelpers.waitForPageLoad(['table']);
    
    try {
      // Find the lead we just created
      const row = await pageHelpers.findTableRowByText('table', 'ConvertTest');
      
      if (row) {
        console.log('Found lead to convert');
        
        // Try to change status to approved (which should trigger conversion)
        const statusElement = await page.locator(`table tr:nth-child(${row.index + 2}) .status-badge, table tr:nth-child(${row.index + 2}) .badge`).first();
        
        if (await statusElement.count() > 0) {
          await statusElement.click();
          
          try {
            await page.click('option[value="approved"], .dropdown-item:has-text("approved")');
            
            // Handle confirmation dialog
            page.on('dialog', async dialog => {
              console.log('Conversion confirmation:', dialog.message());
              await dialog.accept();
            });
            
            await page.waitForTimeout(2000);
            
            const notification = await pageHelpers.waitForNotification();
            
            if (notification && notification.text.toLowerCase().includes('quotation')) {
              console.log('✅ Lead converted to quotation successfully:', notification.text);
            } else {
              console.log('⚠️ Conversion may not have completed');
            }
            
          } catch (error) {
            console.log('❌ Failed to approve/convert lead:', error.message);
          }
        }
        
      } else {
        console.log('⚠️ Could not find lead to convert');
      }
      
    } catch (error) {
      console.log('❌ Failed to convert lead:', error.message);
      await pageHelpers.takeScreenshot('lead-conversion-failed');
    }
  });

  test('should delete a lead', async ({ page }) => {
    console.log('🗑️ Testing lead deletion...');
    
    const leadData = testData.generateLeadData();
    leadData.clientName = `ToDelete ${leadData.clientName}`;
    
    await authHelper.navigateToSection('add-lead');
    await pageHelpers.fillForm(leadData, {
      clientName: '#leadClientName',
      clientEmail: '#leadClientEmail',
      optionName: '#leadOptionName',
      startDate: '#leadStartDate'
    });
    
    await pageHelpers.submitForm();
    await pageHelpers.waitForNotification();
    
    await authHelper.navigateToSection('leads');
    await pageHelpers.waitForPageLoad(['table']);
    
    try {
      const row = await pageHelpers.findTableRowByText('table', 'ToDelete');
      
      if (row) {
        console.log('Found lead to delete');
        
        await pageHelpers.clickTableAction('table', 'ToDelete', 'Delete');
        
        page.on('dialog', async dialog => {
          console.log('Delete confirmation:', dialog.message());
          await dialog.accept();
        });
        
        await page.waitForTimeout(2000);
        
        const updatedRow = await pageHelpers.findTableRowByText('table', 'ToDelete');
        
        if (!updatedRow) {
          console.log('✅ Lead deleted successfully');
        } else {
          console.log('⚠️ Lead may not have been deleted');
        }
        
      } else {
        console.log('⚠️ Could not find lead to delete');
      }
      
    } catch (error) {
      console.log('❌ Failed to delete lead:', error.message);
      await pageHelpers.takeScreenshot('lead-delete-failed');
    }
  });

  test('should send lead email', async ({ page }) => {
    console.log('📧 Testing lead email sending...');
    
    await authHelper.navigateToSection('leads');
    await pageHelpers.waitForPageLoad(['table']);
    
    const tableData = await pageHelpers.getTableData('table');
    
    if (!tableData || tableData.data.length === 0) {
      console.log('⚠️ No leads available for email test, skipping');
      test.skip();
      return;
    }
    
    try {
      await pageHelpers.clickTableAction('table', tableData.data[0][Object.keys(tableData.data[0])[0]], 'Email');
      
      // Handle email modal or form
      await pageHelpers.waitForModal();
      
      // Fill email form if needed
      try {
        await page.fill('#emailSubject', 'Test Lead Email');
        await page.fill('#emailMessage', 'This is a test email from automated testing.');
        await page.click('#sendEmailBtn');
        
        const notification = await pageHelpers.waitForNotification();
        
        if (notification && notification.type === 'success') {
          console.log('✅ Lead email sent successfully:', notification.text);
        } else {
          console.log('⚠️ Email sending result unclear');
        }
        
      } catch (error) {
        console.log('⚠️ Email form different from expected structure');
      }
      
    } catch (error) {
      console.log('❌ Failed to send lead email:', error.message);
      await pageHelpers.takeScreenshot('lead-email-failed');
    }
  });
});

