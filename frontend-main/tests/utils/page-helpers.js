const { expect } = require('@playwright/test');

class PageHelpers {
  constructor(page) {
    this.page = page;
  }

  // Generic form filling helper
  async fillForm(formData, fieldMappings = {}) {
    console.log('Filling form with data:', formData);
    
    for (const [key, value] of Object.entries(formData)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }

      // Get the actual field selector (use mapping or default to ID)
      const selector = fieldMappings[key] || `#${key}`;
      
      try {
        // Wait for the field to be available
        await this.page.waitForSelector(selector, { timeout: 5000 });
        
        // Determine field type and fill accordingly
        const element = this.page.locator(selector);
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        const type = await element.evaluate(el => el.type || '').catch(() => '');
        
        if (tagName === 'select') {
          await element.selectOption({ label: value.toString() });
        } else if (type === 'checkbox') {
          if (value) {
            await element.check();
          } else {
            await element.uncheck();
          }
        } else if (type === 'radio') {
          await element.check();
        } else {
          await element.clear();
          await element.fill(value.toString());
        }
        
        console.log(`Filled ${key}: ${value}`);
        
      } catch (error) {
        console.warn(`Failed to fill field ${key} with selector ${selector}:`, error.message);
      }
    }
  }

  // Wait for and click submit button
  async submitForm(submitSelector = 'button[type="submit"], .submit-btn, #submitBtn') {
    console.log('Submitting form...');
    
    const submitSelectors = Array.isArray(submitSelector) ? submitSelector : [submitSelector];
    
    for (const selector of submitSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        
        // Scroll to submit button if needed
        await this.page.locator(selector).scrollIntoViewIfNeeded();
        
        // Click submit button
        await this.page.click(selector);
        console.log('Form submitted successfully');
        return true;
        
      } catch (error) {
        console.warn(`Submit button not found with selector: ${selector}`);
        continue;
      }
    }
    
    throw new Error('No submit button found with any of the provided selectors');
  }

  // Wait for success/error messages
  async waitForNotification(timeout = 10000) {
    const notificationSelectors = [
      '.alert',
      '.notification',
      '.toast',
      '.success',
      '.error',
      '.alert-success',
      '.alert-danger',
      '.alert-info',
      '.alert-warning'
    ];
    
    try {
      const notification = await this.page.waitForSelector(
        notificationSelectors.join(', '), 
        { timeout }
      );
      
      const text = await notification.textContent();
      const className = await notification.getAttribute('class');
      
      const isSuccess = className.includes('success') || className.includes('alert-success');
      const isError = className.includes('error') || className.includes('danger') || className.includes('alert-danger');
      
      return {
        text: text.trim(),
        type: isSuccess ? 'success' : isError ? 'error' : 'info',
        element: notification
      };
      
    } catch (error) {
      console.warn('No notification found within timeout');
      return null;
    }
  }

  // Wait for page load and verify elements
  async waitForPageLoad(expectedElements = [], timeout = 10000) {
    await this.page.waitForLoadState('networkidle');
    
    if (expectedElements.length > 0) {
      for (const selector of expectedElements) {
        try {
          await this.page.waitForSelector(selector, { timeout: timeout / expectedElements.length });
        } catch (error) {
          console.warn(`Expected element not found: ${selector}`);
        }
      }
    }
    
    // Additional wait for any dynamic content
    await this.page.waitForTimeout(1000);
  }

  // Generic table operations
  async getTableData(tableSelector = 'table', headerRowIndex = 0) {
    await this.page.waitForSelector(tableSelector);
    
    const tableData = await this.page.evaluate(({ tableSelector, headerRowIndex }) => {
      const table = document.querySelector(tableSelector);
      if (!table) return null;
      
      const rows = Array.from(table.querySelectorAll('tr'));
      if (rows.length === 0) return null;
      
      const headers = Array.from(rows[headerRowIndex].querySelectorAll('th, td'))
        .map(cell => cell.textContent.trim());
      
      const data = rows.slice(headerRowIndex + 1).map(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const rowData = {};
        
        cells.forEach((cell, index) => {
          if (headers[index]) {
            rowData[headers[index]] = cell.textContent.trim();
          }
        });
        
        return rowData;
      });
      
      return { headers, data };
    }, { tableSelector, headerRowIndex });
    
    return tableData;
  }

  async findTableRowByText(tableSelector, searchText) {
    const tableData = await this.getTableData(tableSelector);
    if (!tableData) return null;
    
    const rowIndex = tableData.data.findIndex(row => 
      Object.values(row).some(value => 
        value.toLowerCase().includes(searchText.toLowerCase())
      )
    );
    
    if (rowIndex === -1) return null;
    
    return {
      index: rowIndex,
      data: tableData.data[rowIndex]
    };
  }

  async clickTableAction(tableSelector, searchText, actionText) {
    const row = await this.findTableRowByText(tableSelector, searchText);
    if (!row) {
      throw new Error(`Row with text "${searchText}" not found`);
    }
    
    // Find the action button in the row
    const rowSelector = `${tableSelector} tr:nth-child(${row.index + 2})`; // +2 because of header row
    const actionButton = await this.page.locator(`${rowSelector} button:has-text("${actionText}"), ${rowSelector} a:has-text("${actionText}")`);
    
    if (await actionButton.count() === 0) {
      throw new Error(`Action "${actionText}" not found in row`);
    }
    
    await actionButton.click();
    console.log(`Clicked "${actionText}" for row containing "${searchText}"`);
  }

  // Modal operations
  async waitForModal(modalSelector = '.modal', timeout = 10000) {
    await this.page.waitForSelector(modalSelector, { timeout });
    await this.page.waitForTimeout(500); // Wait for modal animation
  }

  async closeModal(closeSelector = '.modal .close, .modal-header .close') {
    try {
      await this.page.click(closeSelector);
      await this.page.waitForTimeout(500); // Wait for modal to close
    } catch (error) {
      console.warn('Failed to close modal:', error.message);
      // Try pressing Escape key as fallback
      await this.page.keyboard.press('Escape');
    }
  }

  // Navigation helpers
  async navigateAndWait(url, expectedSelectors = []) {
    await this.page.goto(url);
    await this.waitForPageLoad(expectedSelectors);
  }

  // Screenshot helper
  async takeScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${name}-${timestamp}.png`;
    
    await this.page.screenshot({ 
      path: `test-results/screenshots/${filename}`,
      fullPage: true 
    });
    
    console.log(`Screenshot saved: ${filename}`);
    return filename;
  }

  // Debugging helpers
  async logPageInfo() {
    const title = await this.page.title();
    const url = this.page.url();
    
    console.log(`Current page: ${title} (${url})`);
  }

  async logFormValues(formSelector = 'form') {
    const formData = await this.page.evaluate((selector) => {
      const form = document.querySelector(selector);
      if (!form) return null;
      
      const formData = new FormData(form);
      const data = {};
      
      for (let [key, value] of formData.entries()) {
        data[key] = value;
      }
      
      return data;
    }, formSelector);
    
    console.log('Current form values:', formData);
    return formData;
  }

  // Wait for specific API calls
  async waitForApiResponse(urlPattern, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`API response for pattern "${urlPattern}" not received within ${timeout}ms`));
      }, timeout);
      
      this.page.on('response', (response) => {
        if (response.url().includes(urlPattern) || response.url().match(new RegExp(urlPattern))) {
          clearTimeout(timer);
          resolve(response);
        }
      });
    });
  }

  // Generic retry mechanism
  async retry(fn, maxAttempts = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxAttempts) {
          throw error;
        }
        
        await this.page.waitForTimeout(delay);
      }
    }
  }
}

module.exports = PageHelpers;

