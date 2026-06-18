/**
 * Bank Information Security Module
 * Handles secure display and validation of bank information
 * 
 * Security features:
 * - Masked display of sensitive bank fields
 * - Client-side validation before submission
 * - Securely handles encrypted data from backend
 */

class BankSecurity {
  constructor() {
    this.sensitiveFields = [
      'bank_account_no',
      'bank_iban',
      'bank_branch_code'
    ];
    
    this.initialized = false;
  }

  /**
   * Initialize the bank security module
   */
  initialize() {
    this.setupMasking();
    this.setupValidation();
    this.initialized = true;
    return this;
  }

  /**
   * Setup input masking for sensitive bank fields
   */
  setupMasking() {
    this.sensitiveFields.forEach(field => {
      const element = document.getElementById(field);
      if (element) {
        // Add masked input behavior
        element.addEventListener('blur', (e) => this.maskSensitiveValue(e.target));
        element.addEventListener('focus', (e) => this.unmaskSensitiveValue(e.target));
        
        // Initial masking if value exists
        if (element.value && element.value.trim() !== '') {
          this.maskSensitiveValue(element);
        }
      }
    });
  }

  /**
   * Mask sensitive value in input field
   * @param {HTMLElement} element - Input element to mask
   */
  maskSensitiveValue(element) {
    const value = element.value;
    if (!value || value.trim() === '') return;
    
    // Skip if already masked
    if (value.includes('*')) return;
    
    // Create masked version (show first 2 and last 2 chars)
    const masked = this.createMaskedValue(value);
    
    // Store original value in data attribute
    element.dataset.originalValue = value;
    element.value = masked;
  }

  /**
   * Unmask sensitive value in input field
   * @param {HTMLElement} element - Input element to unmask
   */
  unmaskSensitiveValue(element) {
    if (element.dataset.originalValue) {
      element.value = element.dataset.originalValue;
    }
  }

  /**
   * Create masked version of sensitive value
   * @param {string} value - Value to mask
   * @returns {string} - Masked value
   */
  createMaskedValue(value) {
    if (!value || value.length < 4) return value;
    
    const firstChars = value.slice(0, 2);
    const lastChars = value.slice(-2);
    const maskedLength = value.length - 4;
    const maskedPart = '*'.repeat(Math.min(maskedLength, 8));
    
    return `${firstChars}${maskedPart}${lastChars}`;
  }

  /**
   * Setup validation for bank form
   */
  setupValidation() {
    const bankForm = document.getElementById('bankForm');
    if (!bankForm) return;
    
    bankForm.addEventListener('submit', (e) => {
      if (!this.validateBankForm()) {
        e.preventDefault();
        return false;
      }
      
      // Replace masked values with original values before submission
      this.restoreOriginalValues();
    });
  }

  /**
   * Validate bank form
   * @returns {boolean} - True if valid, false otherwise
   */
  validateBankForm() {
    // Implement specific validation rules for bank data
    const bankName = document.getElementById('bankName');
    const bankAccountName = document.getElementById('bankAccountName');
    const bankAccountNo = document.getElementById('bankAccountNo');
    
    if (!bankName || !bankName.value.trim()) {
      this.showValidationError(bankName, 'Bank name is required');
      return false;
    }
    
    if (!bankAccountName || !bankAccountName.value.trim()) {
      this.showValidationError(bankAccountName, 'Account name is required');
      return false;
    }
    
    if (!bankAccountNo || !bankAccountNo.value.trim()) {
      this.showValidationError(bankAccountNo, 'Account number is required');
      return false;
    }
    
    return true;
  }

  /**
   * Show validation error for a field
   * @param {HTMLElement} element - Field with error
   * @param {string} message - Error message
   */
  showValidationError(element, message) {
    element.classList.add('is-invalid');
    
    // Create error message element if it doesn't exist
    let errorElement = element.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains('invalid-feedback')) {
      errorElement = document.createElement('div');
      errorElement.className = 'invalid-feedback';
      element.parentNode.insertBefore(errorElement, element.nextSibling);
    }
    
    errorElement.textContent = message;
    
    // Focus the element
    element.focus();
  }

  /**
   * Restore original values for masked fields before form submission
   */
  restoreOriginalValues() {
    this.sensitiveFields.forEach(field => {
      const element = document.getElementById(field);
      if (element && element.dataset.originalValue) {
        element.value = element.dataset.originalValue;
      }
    });
  }

  /**
   * Format received bank data for display
   * @param {Object} bankData - Bank data from API
   * @returns {Object} - Formatted bank data
   */
  formatBankDataForDisplay(bankData) {
    const formattedData = { ...bankData };
    
    // Ensure encrypted fields are properly masked for display
    this.sensitiveFields.forEach(field => {
      if (formattedData[field] && formattedData[field].trim() !== '') {
        formattedData[`${field}_display`] = this.createMaskedValue(formattedData[field]);
      }
    });
    
    return formattedData;
  }
}

// Create global instance
window.BankSecurity = new BankSecurity(); 