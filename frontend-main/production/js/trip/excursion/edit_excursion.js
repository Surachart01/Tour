// Edit Excursion JavaScript functionality
// This file provides additional functionality for the edit excursion page

console.log('🔧 Edit Excursion JS loaded');

// Debug function to check if all required elements are present
function debugEditExcursionForm() {
  console.log('🔍 Debugging Edit Excursion Form...');
  
  const requiredElements = [
    'excursionName',
    'country', 
    'city',
    'code',
    'orderExcursion',
    'description',
    'SICPriceAdult',
    'SICPriceChild',
    'supplier',
    'submitExcursion'
  ];
  
  requiredElements.forEach(elementId => {
    const element = document.getElementById(elementId);
    if (element) {
      console.log(`✅ ${elementId}: Found`, element);
    } else {
      console.error(`❌ ${elementId}: NOT FOUND`);
    }
  });
  
  // Check if excursion ID is present in URL
  const excursionId = new URLSearchParams(window.location.search).get("id");
  console.log('🆔 Excursion ID from URL:', excursionId);
  
  // Check if token exists
  const token = localStorage.getItem("token");
  console.log('🔑 Auth Token:', token ? 'Present' : 'MISSING');
  
  // Check API endpoint
  console.log('🌐 API Endpoint:', typeof Endpoint !== 'undefined' ? Endpoint : 'UNDEFINED');
}

// Enhanced error handling for API calls
function enhancedFetch(url, options = {}) {
  console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
  
  return fetch(url, options)
    .then(response => {
      console.log(`📡 Response: ${response.status} ${response.statusText} for ${url}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('🚫 Unauthorized - redirecting to login');
          alert("Unauthorized. Please log in again.");
          window.location.href = "login.html";
          throw new Error('Unauthorized');
        } else if (response.status === 403) {
          console.error('🚫 Forbidden - insufficient permissions');
          alert("You don't have sufficient permissions to perform this action.");
          throw new Error('Forbidden');
        } else if (response.status === 404) {
          console.error('🚫 Not Found - resource does not exist');
          throw new Error('Resource not found');
        } else {
          console.error(`🚫 HTTP Error: ${response.status} ${response.statusText}`);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      
      return response.json();
    })
    .catch(error => {
      console.error('💥 API Error:', error);
      throw error;
    });
}

// Run debug when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('📄 DOM loaded - running debug checks...');
  debugEditExcursionForm();
});

// Export functions for use in inline scripts
window.debugEditExcursionForm = debugEditExcursionForm;
window.enhancedFetch = enhancedFetch;
