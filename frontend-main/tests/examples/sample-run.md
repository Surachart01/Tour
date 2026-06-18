# Sample Test Run Examples

This document shows example outputs and usage patterns for the E2E testing suite.

## Basic Test Runs

### Run All Tests
```bash
$ node run-tests.js

============================================================
🚀 TRAVEL MANAGEMENT E2E TEST SUITE 🚀
============================================================
Automated testing for Hotels, Transfers, Excursions, Tours, Leads & Quotations

📋 Test Configuration:
   Test Suite: all
   Headed Mode: No
   Debug Mode: No
   Show Report: No

🔍 Checking prerequisites...
✅ Prerequisites check passed

🎭 Installing Playwright browsers...
✅ Playwright browsers installed

🧪 Running all tests...

Running 25 tests using 1 worker

  ✓ Hotels Management Tests › should create a new hotel successfully (15s)
  ✓ Hotels Management Tests › should list and view hotels (8s)
  ✓ Hotels Management Tests › should edit an existing hotel (12s)
  ✓ Hotels Management Tests › should delete a hotel (10s)
  ✓ Hotels Management Tests › should handle hotel form validation (5s)

  ✓ Transfers Management Tests › should create a new transfer successfully (13s)
  ✓ Transfers Management Tests › should list and view transfers (7s)
  ✓ Transfers Management Tests › should edit an existing transfer (11s)
  ✓ Transfers Management Tests › should delete a transfer (9s)
  ✓ Transfers Management Tests › should handle transfer form validation (4s)

  ✓ Leads Management Tests › should create a new lead successfully (14s)
  ✓ Leads Management Tests › should list and view leads (6s)
  ✓ Leads Management Tests › should edit an existing lead (10s)
  ✓ Leads Management Tests › should change lead status (8s)
  ✓ Leads Management Tests › should convert lead to quotation (16s)

  25 passed (3m 45s)

✅ All tests completed successfully!

🎉 All done! Happy testing!
```

### Run Specific Test Suite
```bash
$ node run-tests.js hotels --headed

============================================================
🚀 TRAVEL MANAGEMENT E2E TEST SUITE 🚀
============================================================

📋 Test Configuration:
   Test Suite: hotels
   Headed Mode: Yes
   Debug Mode: No
   Show Report: No

🧪 Running hotels tests...

Running 5 tests using 1 worker

🏨 Testing hotel creation...
✅ Hotel created successfully: Hotel data saved successfully!

📋 Testing hotel listing...
✅ Found 3 hotels in the list
First hotel: Grand Hotel Bangkok | Bangkok | Thailand
✅ Successfully opened hotel details

✏️ Testing hotel editing...
✅ Opened hotel edit page
✅ Hotel updated successfully: Hotel updated successfully!

🗑️ Testing hotel deletion...
Found hotel to delete: ToDelete Test Hotel test_1703123456_abc123def
✅ Hotel deleted successfully

✅ Testing hotel form validation...
✅ Form validation working: Hotel name is required, City is required

  5 passed (1m 23s)

✅ hotels tests completed successfully!
```

## Test Output Examples

### Successful Hotel Creation
```
🏨 Testing hotel creation...
Filling form with data: {
  hotelName: 'Test Hotel test_1703123456_abc123def',
  country: 'Thailand',
  city: 'Bangkok',
  description: 'Automated test hotel created on 2023-12-21 10:30:45',
  address: '123 Test Street',
  phone: '+66-2-123-4567',
  email: 'testhotel@example.com',
  starRating: 4
}

Filled hotelName: Test Hotel test_1703123456_abc123def
Filled country: Thailand
Filled city: Bangkok
Filled description: Automated test hotel created on 2023-12-21 10:30:45
Filled address: 123 Test Street
Filled phone: +66-2-123-4567
Filled email: testhotel@example.com
Filled starRating: 4

Submitting form...
Form submitted successfully
✅ Hotel created successfully: Hotel data saved successfully!

=== API INTERACTION SUMMARY ===
Total Requests: 15
API Requests: 3
Successful Responses: 3
Failed Responses: 0
================================
```

### Lead to Quotation Conversion
```
🔄 Testing lead to quotation conversion...
Found lead to convert
Conversion confirmation: Are you sure you want to approve this lead? This will convert it to a quotation.
✅ Lead converted to quotation successfully: Lead approved and will be converted to quotation! Quotation reference: QUO-2023-001234

=== API INTERACTION SUMMARY ===
Total Requests: 8
API Requests: 4
Successful Responses: 4
Failed Responses: 0

API calls made: 4 lead-related requests
```

### Form Validation Testing
```
✅ Testing quotation form validation...
Form validation working: [
  'Client name is required',
  'Client email is required', 
  'Number of adults must be at least 1',
  'Start date is required'
]

Partial form submission result: Please fill in all required fields
```

## Error Handling Examples

### Failed Test with Screenshot
```
❌ Testing hotel creation...
Error message: Failed to save hotel data: Validation error
Screenshot saved: hotel-creation-failed-2023-12-21T10-30-45-123Z.png

=== API INTERACTION SUMMARY ===
Total Requests: 5
API Requests: 1
Successful Responses: 0
Failed Responses: 1

=== FAILED REQUESTS ===
1. 400 Bad Request - http://127.0.0.1:8080/api/v1/hotels
================================
```

### Application Not Running
```
❌ Global setup failed: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8080/production/login.html
Make sure your application is running on http://127.0.0.1:8080

⚠️ Some tests may fail due to application not being accessible

🔍 Troubleshooting tips:
1. Make sure your application is running on http://127.0.0.1:8080
2. Check if you can login with vtadmin/testing@123
3. Verify your backend API is responding
4. Check test-results/ directory for screenshots and videos
```

## Report Examples

### HTML Report Structure
```
test-results/
├── html-report/
│   ├── index.html              # Main report page
│   ├── data/
│   │   ├── test-results.json   # Raw test data
│   │   └── attachments/        # Screenshots, videos
│   └── assets/                 # Report styling
├── screenshots/
│   ├── hotel-creation-failed-2023-12-21T10-30-45.png
│   └── lead-conversion-success-2023-12-21T10-31-15.png
├── videos/
│   └── hotels-test-chromium-2023-12-21T10-30-00.webm
└── api-reports/
    ├── hotels-test-1703123456789.json
    └── leads-test-1703123457890.json
```

### API Report Sample
```json
{
  "summary": {
    "totalRequests": 12,
    "apiRequests": 4,
    "totalResponses": 12,
    "apiResponses": 4,
    "successfulRequests": 3,
    "failedRequests": 1
  },
  "requests": [
    {
      "url": "http://127.0.0.1:8080/api/v1/hotels",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
        "Content-Type": "application/json"
      },
      "postData": "{\"hotelName\":\"Test Hotel test_1703123456_abc123def\",\"country\":\"Thailand\"}",
      "timestamp": "2023-12-21T10:30:45.123Z"
    }
  ],
  "responses": [
    {
      "url": "http://127.0.0.1:8080/api/v1/hotels",
      "status": 201,
      "statusText": "Created",
      "timestamp": "2023-12-21T10:30:45.456Z"
    }
  ],
  "failures": [],
  "timestamp": "2023-12-21T10:30:50.789Z"
}
```

## Command Line Options

### Debug Mode
```bash
$ node run-tests.js leads --debug
# Opens browser in debug mode, pauses at each step
# Allows manual inspection and step-through
```

### UI Mode
```bash
$ node run-tests.js --ui
# Opens Playwright Test UI for interactive test running
# Great for test development and debugging
```

### With Report
```bash
$ node run-tests.js all --report
# Runs all tests and automatically opens HTML report
# Shows detailed results, screenshots, and videos
```

## Performance Metrics

### Typical Test Duration
- **Hotel Tests**: ~1-2 minutes (5 tests)
- **Transfer Tests**: ~1-2 minutes (5 tests)
- **Excursion Tests**: ~1-2 minutes (5 tests)
- **Tour Tests**: ~1-2 minutes (5 tests)
- **Lead Tests**: ~2-3 minutes (7 tests)
- **Quotation Tests**: ~2-3 minutes (8 tests)
- **Full Suite**: ~8-12 minutes (33 tests)

### Resource Usage
- **Memory**: ~200-500MB during test execution
- **CPU**: Moderate usage during browser automation
- **Storage**: ~50-100MB for test results per run
- **Network**: API calls to your application backend

## Best Practices

### Running Tests Regularly
```bash
# Daily regression testing
node run-tests.js all --report

# Before releases
node run-tests.js all --headed --report

# During development
node run-tests.js hotels --debug
```

### CI/CD Integration
```bash
# In CI environment
npm install
npm run test
# Uploads test-results/ as artifacts
```

### Debugging Failed Tests
```bash
# Step 1: Run with visible browser
node run-tests.js hotels --headed

# Step 2: Use debug mode
node run-tests.js hotels --debug

# Step 3: Check screenshots
ls test-results/screenshots/

# Step 4: Review API reports
cat test-results/api-reports/hotels-test-*.json
```


