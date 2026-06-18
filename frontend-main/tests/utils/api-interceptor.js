class ApiInterceptor {
  constructor(page) {
    this.page = page;
    this.requests = [];
    this.responses = [];
    this.isIntercepting = false;
  }

  async startIntercepting() {
    if (this.isIntercepting) {
      return;
    }

    this.isIntercepting = true;
    this.requests = [];
    this.responses = [];

    // Intercept API requests only (not HTML pages, CSS, JS, images, etc.)
    await this.page.route('**/*', async (route, request) => {
      const url = request.url();
      const isApiRequest = url.includes('/api/') || 
                          url.includes('/v1/') || 
                          url.includes('/rest/') ||
                          url.includes('/graphql') ||
                          (request.method() !== 'GET' && !url.includes('.html') && !url.includes('.css') && !url.includes('.js') && !url.includes('.png') && !url.includes('.jpg') && !url.includes('.ico'));

      const requestData = {
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        postData: request.postData(),
        timestamp: new Date().toISOString(),
        isApiRequest: isApiRequest
      };

      this.requests.push(requestData);
      
      // Only intercept actual API requests, let everything else pass through
      if (isApiRequest) {
        console.log('Intercepting API request:', url);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ intercepted: true })
        }).catch(async () => {
          // If fulfill fails, just continue the request normally
          await route.continue();
        });
      } else {
        // Let non-API requests (HTML, CSS, JS, images) pass through normally
        await route.continue();
      }
    });

    // Intercept responses
    this.page.on('response', (response) => {
      const responseData = {
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: response.headers(),
        timestamp: new Date().toISOString()
      };

      this.responses.push(responseData);
    });

    console.log('API interception started');
  }

  async stopIntercepting() {
    if (!this.isIntercepting) {
      return;
    }

    await this.page.unroute('**/*');
    this.isIntercepting = false;
    console.log('API interception stopped');
  }

  getRequests() {
    return this.requests;
  }

  getResponses() {
    return this.responses;
  }

  getApiRequests() {
    return this.requests.filter(req => req.isApiRequest === true);
  }

  getApiResponses() {
    return this.responses.filter(res => 
      res.url.includes('/api/') || 
      res.url.includes('127.0.0.1:8080')
    );
  }

  getFailedRequests() {
    return this.responses.filter(res => res.status >= 400);
  }

  getSuccessfulRequests() {
    return this.responses.filter(res => res.status >= 200 && res.status < 300);
  }

  findRequestByUrl(urlPattern) {
    return this.requests.find(req => 
      req.url.includes(urlPattern) || 
      req.url.match(new RegExp(urlPattern))
    );
  }

  findResponseByUrl(urlPattern) {
    return this.responses.find(res => 
      res.url.includes(urlPattern) || 
      res.url.match(new RegExp(urlPattern))
    );
  }

  async waitForApiCall(urlPattern, timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const request = this.findRequestByUrl(urlPattern);
      const response = this.findResponseByUrl(urlPattern);
      
      if (request && response) {
        return { request, response };
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`API call matching pattern "${urlPattern}" not found within ${timeout}ms`);
  }

  generateReport() {
    const apiRequests = this.getApiRequests();
    const apiResponses = this.getApiResponses();
    const failedRequests = this.getFailedRequests();
    const successfulRequests = this.getSuccessfulRequests();

    return {
      summary: {
        totalRequests: this.requests.length,
        apiRequests: apiRequests.length,
        totalResponses: this.responses.length,
        apiResponses: apiResponses.length,
        successfulRequests: successfulRequests.length,
        failedRequests: failedRequests.length
      },
      requests: apiRequests,
      responses: apiResponses,
      failures: failedRequests,
      timestamp: new Date().toISOString()
    };
  }

  logSummary() {
    const report = this.generateReport();
    
    console.log('\n=== API INTERACTION SUMMARY ===');
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`API Requests: ${report.summary.apiRequests}`);
    console.log(`Successful Responses: ${report.summary.successfulRequests}`);
    console.log(`Failed Responses: ${report.summary.failedRequests}`);
    
    if (report.failures.length > 0) {
      console.log('\n=== FAILED REQUESTS ===');
      report.failures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.status} ${failure.statusText} - ${failure.url}`);
      });
    }
    
    console.log('================================\n');
    
    return report;
  }

  async saveReport(filename) {
    const report = this.generateReport();
    const fs = require('fs').promises;
    const path = require('path');
    
    const reportDir = path.join(__dirname, '..', 'test-results', 'api-reports');
    await fs.mkdir(reportDir, { recursive: true });
    
    const filepath = path.join(reportDir, filename || `api-report-${Date.now()}.json`);
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    console.log(`API report saved to: ${filepath}`);
    return filepath;
  }

  clear() {
    this.requests = [];
    this.responses = [];
    console.log('API interception data cleared');
  }
}

module.exports = ApiInterceptor;

