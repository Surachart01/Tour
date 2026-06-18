const { expect } = require('@playwright/test');

class AuthHelper {
  constructor(page) {
    this.page = page;
    this.baseURL = 'http://127.0.0.1:5501';
  }

  async login(credentials = { username: process.env.TEST_USERNAME || 'vtadmin', password: process.env.TEST_PASSWORD || 'testing@123' }) {
    console.log('Starting login process...');
    
    // Navigate to login page
    await this.page.goto(`${this.baseURL}/production/login.html`);
    await this.page.waitForLoadState('networkidle');
    
    // Fill login form
    await this.page.fill('#username', credentials.username);
    await this.page.fill('#password', credentials.password);
    
    // Click login button and wait for navigation
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle' }),
      this.page.click('button[type="submit"], .login-btn, #loginBtn')
    ]);
    
    // Verify login success by checking for dashboard or profile elements
    try {
      await this.page.waitForSelector('.sidebar, .navbar, #dashboard', { timeout: 10000 });
      console.log('Login successful');
      return true;
    } catch (error) {
      console.error('Login failed:', error.message);
      
      // Check if there's an error message on the page
      const errorMessage = await this.page.textContent('.error, .alert-danger, .login-error').catch(() => null);
      if (errorMessage) {
        console.error('Login error message:', errorMessage);
      }
      
      return false;
    }
  }

  async logout() {
    try {
      // Try to find and click logout button
      const logoutSelectors = [
        'a[href*="logout"]',
        '.logout-btn',
        '#logoutBtn',
        'button:has-text("Logout")',
        'a:has-text("Logout")'
      ];
      
      for (const selector of logoutSelectors) {
        try {
          await this.page.click(selector, { timeout: 2000 });
          console.log('Logout successful');
          return true;
        } catch (error) {
          continue;
        }
      }
      
      // If no logout button found, clear storage and navigate to login
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await this.page.goto(`${this.baseURL}/production/login.html`);
      console.log('Logout successful (via storage clear)');
      return true;
      
    } catch (error) {
      console.error('Logout failed:', error.message);
      return false;
    }
  }

  async isLoggedIn() {
    try {
      // Check for authentication token in localStorage
      const token = await this.page.evaluate(() => localStorage.getItem('token'));
      
      if (!token) {
        return false;
      }
      
      // Check for UI elements that indicate logged in state
      const isLoggedIn = await this.page.locator('.sidebar, .navbar, #dashboard').count() > 0;
      return isLoggedIn;
      
    } catch (error) {
      return false;
    }
  }

  async getAuthToken() {
    try {
      const token = await this.page.evaluate(() => localStorage.getItem('token'));
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error.message);
      return null;
    }
  }

  async setAuthToken(token) {
    try {
      await this.page.evaluate((token) => {
        localStorage.setItem('token', token);
      }, token);
      return true;
    } catch (error) {
      console.error('Failed to set auth token:', error.message);
      return false;
    }
  }

  async waitForLogin(timeout = 30000) {
    try {
      await this.page.waitForFunction(
        () => localStorage.getItem('token') !== null,
        { timeout }
      );
      return true;
    } catch (error) {
      console.error('Login timeout:', error.message);
      return false;
    }
  }

  async ensureLoggedIn(credentials) {
    const isLoggedIn = await this.isLoggedIn();
    
    if (!isLoggedIn) {
      console.log('Not logged in, attempting login...');
      const loginSuccess = await this.login(credentials);
      
      if (!loginSuccess) {
        throw new Error('Failed to login. Please check credentials and server status.');
      }
    } else {
      console.log('Already logged in');
    }
    
    return true;
  }

  async navigateToSection(section) {
    const sectionUrls = {
      hotels: '/production/hotels.html',
      'add-hotel': '/production/add_hotel.html',
      transfers: '/production/transfers.html',
      'add-transfer': '/production/add_transfer.html',
      excursions: '/production/excursions.html',
      'add-excursion': '/production/add_excursion.html',
      tours: '/production/tours.html',
      'add-tour': '/production/add_tours.html',
      leads: '/production/leads.html',
      'add-lead': '/production/add_lead.html',
      quotations: '/production/trip.html',
      'add-quotation': '/production/add_trip.html',
      profile: '/production/profile.html',
      dashboard: '/production/index.html'
    };

    const url = sectionUrls[section];
    if (!url) {
      throw new Error(`Unknown section: ${section}`);
    }

    console.log(`Navigating to ${section} section: ${url}`);
    await this.page.goto(`${this.baseURL}${url}`);
    await this.page.waitForLoadState('networkidle');
    
    // Wait for the page to be ready
    await this.page.waitForTimeout(1000);
    
    return true;
  }
}

module.exports = AuthHelper;
