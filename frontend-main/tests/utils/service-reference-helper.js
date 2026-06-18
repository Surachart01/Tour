const fs = require('fs');
const path = require('path');

class ServiceReferenceHelper {
  constructor() {
    this.referenceData = null;
    this.loadReferenceData();
  }

  loadReferenceData() {
    try {
      const referenceFilePath = path.join(__dirname, '../test-data/service-references.json');
      if (fs.existsSync(referenceFilePath)) {
        const rawData = fs.readFileSync(referenceFilePath, 'utf8');
        this.referenceData = JSON.parse(rawData);
        console.log('✅ Service reference data loaded successfully');
      } else {
        console.log('⚠️ Service reference file not found, using fallback logic');
        this.referenceData = null;
      }
    } catch (error) {
      console.log('⚠️ Error loading service reference data:', error.message);
      this.referenceData = null;
    }
  }

  /**
   * Get preferred hotel configuration
   * @param {number} index - Index of preferred hotel (0 for first, 1 for second, etc.)
   * @returns {object|null} Hotel configuration or null if not found
   */
  getPreferredHotel(index = 0) {
    if (!this.referenceData?.hotels?.preferred) return null;
    return this.referenceData.hotels.preferred[index] || null;
  }

  /**
   * Get preferred tour configuration
   * @param {number} index - Index of preferred tour (0 for first, 1 for second, etc.)
   * @returns {object|null} Tour configuration or null if not found
   */
  getPreferredTour(index = 0) {
    if (!this.referenceData?.tours?.preferred) return null;
    return this.referenceData.tours.preferred[index] || null;
  }

  /**
   * Get preferred excursion configuration
   * @param {number} index - Index of preferred excursion (0 for first, 1 for second, etc.)
   * @returns {object|null} Excursion configuration or null if not found
   */
  getPreferredExcursion(index = 0) {
    if (!this.referenceData?.excursions?.preferred) return null;
    return this.referenceData.excursions.preferred[index] || null;
  }

  /**
   * Get preferred transfer configuration
   * @param {number} index - Index of preferred transfer (0 for first, 1 for second, etc.)
   * @returns {object|null} Transfer configuration or null if not found
   */
  getPreferredTransfer(index = 0) {
    if (!this.referenceData?.transfers?.preferred) return null;
    return this.referenceData.transfers.preferred[index] || null;
  }

  /**
   * Get quotation defaults
   * @returns {object|null} Quotation default configuration or null if not found
   */
  getQuotationDefaults() {
    if (!this.referenceData?.quotation?.defaults) return null;
    return this.referenceData.quotation.defaults;
  }

  /**
   * Generate unique name by adding suffix to base name
   * @param {string} baseName - Base name from reference data
   * @param {string} prefix - Optional prefix (default: 'Test')
   * @returns {string} Unique name with timestamp and random suffix
   */
  generateUniqueName(baseName, prefix = 'Test') {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${prefix} ${baseName} ${timestamp}_${randomSuffix}`;
  }

  /**
   * Check if reference data is available
   * @returns {boolean} True if reference data is loaded
   */
  hasReferenceData() {
    return this.referenceData !== null;
  }

  /**
   * Get all available hotels count
   * @returns {number} Number of preferred hotels available
   */
  getAvailableHotelsCount() {
    return this.referenceData?.hotels?.preferred?.length || 0;
  }

  /**
   * Get all available tours count
   * @returns {number} Number of preferred tours available
   */
  getAvailableToursCount() {
    return this.referenceData?.tours?.preferred?.length || 0;
  }

  /**
   * Get all available excursions count
   * @returns {number} Number of preferred excursions available
   */
  getAvailableExcursionsCount() {
    return this.referenceData?.excursions?.preferred?.length || 0;
  }

  /**
   * Get all available transfers count
   * @returns {number} Number of preferred transfers available
   */
  getAvailableTransfersCount() {
    return this.referenceData?.transfers?.preferred?.length || 0;
  }
}

module.exports = ServiceReferenceHelper;
