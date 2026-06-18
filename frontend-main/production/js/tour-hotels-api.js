/**
 * Tour Hotels API Module
 * Handles all API calls related to tour hotel management
 */

const TourHotelsAPI = {
  /**
   * Fetch hotels for a specific tour within a trip
   * @param {number} tripId - The trip ID (quotation or booking ID)
   * @param {number} tourItemId - The tour trip item ID
   * @returns {Promise<Object>} Tour hotels data
   */
  async getTourHotels(tripId, tourItemId) {
    try {
      const url = `${Endpoint}/api/v1/trips/${tripId}/tour-items/${tourItemId}/hotels`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (e) {
          // Ignore parse errors
        }
        
        const error = new Error(`Failed to fetch tour hotels (${response.status}): ${errorMessage}`);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update hotels for a specific tour (admin only)
   * @param {number} tripId - The trip ID
   * @param {number} tourItemId - The tour trip item ID
   * @param {Array} hotels - Array of hotel objects
   * @returns {Promise<Object>} Updated tour hotels data
   */
  async updateTourHotels(tripId, tourItemId, hotels) {
    try {
      const url = `${Endpoint}/api/v1/trips/${tripId}/tour-items/${tourItemId}/hotels`;
      
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ hotels }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update tour hotels: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Revert tour hotels to defaults
   * @param {number} tripId - The trip ID
   * @param {number} tourItemId - The tour trip item ID
   * @returns {Promise<Object>} Updated tour hotels data
   */
  async revertToDefaults(tripId, tourItemId) {
    return this.updateTourHotels(tripId, tourItemId, []);
  },
};

/**
 * Agent Assistance Fee API Module
 * Handles all API calls related to agent assistance fee configuration
 */
const AssistanceFeeAPI = {
  /**
   * Get agent details including assistance fee configuration
   * @param {number} agentId - The agent ID
   * @returns {Promise<Object>} Agent data with assistance fee config
   */
  async getAgentConfig(agentId) {
    try {
      const response = await fetch(`${Endpoint}/api/v1/agents/${agentId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching agent config:", error);
      throw error;
    }
  },

  /**
   * Update agent assistance fee configuration (admin only)
   * @param {number} agentId - The agent ID
   * @param {Object} config - Configuration object
   * @param {boolean} config.enable_assistance_fee - Enable/disable assistance fees
   * @param {number} config.default_assistance_fee - Default fee amount
   * @returns {Promise<Object>} Updated agent data
   */
  async updateAssistanceFeeConfig(agentId, config) {
    try {
      const response = await fetch(
        `${Endpoint}/api/v1/agents/${agentId}/assistance-fee-config`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(config),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating assistance fee config:", error);
      throw error;
    }
  },
};

/**
 * Service Filtering API Module
 * Handles API calls for tours, excursions, and transfers with date filtering
 */
const ServiceFilteringAPI = {
  /**
   * Get tours filtered by date and city
   * @param {Object} params - Query parameters
   * @param {string} params.city - City name
   * @param {string} params.from_date - Start date (YYYY-MM-DD)
   * @param {string} params.to_date - End date (YYYY-MM-DD)
   * @param {string} params.keyword - Search keyword (optional)
   * @returns {Promise<Array>} Filtered tours
   */
  async getTours(params) {
    try {
      const queryParams = new URLSearchParams({
        city: params.city || "",
        from_date: params.from_date || "",
        to_date: params.to_date || "",
        keyword: params.keyword || "",
      });

      const response = await fetch(
        `${Endpoint}/api/v1/tours?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching tours:", error);
      throw error;
    }
  },

  /**
   * Get excursions filtered by date and city
   * @param {Object} params - Query parameters
   * @param {string} params.city - City name
   * @param {string} params.from_date - Start date (YYYY-MM-DD)
   * @param {string} params.to_date - End date (YYYY-MM-DD)
   * @param {string} params.keyword - Search keyword (optional)
   * @returns {Promise<Array>} Filtered excursions
   */
  async getExcursions(params) {
    try {
      const queryParams = new URLSearchParams({
        city: params.city || "",
        from_date: params.from_date || "",
        to_date: params.to_date || "",
        keyword: params.keyword || "",
      });

      const response = await fetch(
        `${Endpoint}/api/v1/excursions?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching excursions:", error);
      throw error;
    }
  },

  /**
   * Get transfers filtered by date and city
   * @param {Object} params - Query parameters
   * @param {string} params.city - City name
   * @param {string} params.from_date - Start date (YYYY-MM-DD)
   * @param {string} params.to_date - End date (YYYY-MM-DD)
   * @param {string} params.keyword - Search keyword (optional)
   * @returns {Promise<Array>} Filtered transfers
   */
  async getTransfers(params) {
    try {
      const queryParams = new URLSearchParams({
        city: params.city || "",
        from_date: params.from_date || "",
        to_date: params.to_date || "",
        keyword: params.keyword || "",
      });

      const response = await fetch(
        `${Endpoint}/api/v1/transfers?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching transfers:", error);
      throw error;
    }
  },
};

/**
 * Blackout Dates API Module
 * Handles API calls for managing service blackout dates
 */
const BlackoutDatesAPI = {
  /**
   * Get blackout dates for a service
   * @param {string} serviceType - 'tour', 'excursion', or 'transfer'
   * @param {number} serviceId - The service ID
   * @returns {Promise<Array>} Blackout dates
   */
  async getBlackoutDates(serviceType, serviceId) {
    try {
      const response = await fetch(
        `${Endpoint}/api/v1/${serviceType}s/${serviceId}/blackout-dates`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching blackout dates:", error);
      throw error;
    }
  },

  /**
   * Add a blackout date (admin only)
   * @param {string} serviceType - 'tour', 'excursion', or 'transfer'
   * @param {number} serviceId - The service ID
   * @param {Object} blackoutDate - Blackout date object
   * @param {string} blackoutDate.start_date - Start date (YYYY-MM-DD)
   * @param {string} blackoutDate.end_date - End date (YYYY-MM-DD)
   * @param {string} blackoutDate.reason - Reason for blackout
   * @returns {Promise<Object>} Created blackout date
   */
  async addBlackoutDate(serviceType, serviceId, blackoutDate) {
    try {
      const response = await fetch(
        `${Endpoint}/api/v1/${serviceType}s/${serviceId}/blackout-dates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(blackoutDate),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error adding blackout date:", error);
      throw error;
    }
  },

  /**
   * Update a blackout date (admin only)
   * @param {string} serviceType - 'tour', 'excursion', or 'transfer'
   * @param {number} serviceId - The service ID
   * @param {number} blackoutId - The blackout date ID
   * @param {Object} blackoutDate - Updated blackout date object
   * @returns {Promise<Object>} Updated blackout date
   */
  async updateBlackoutDate(serviceType, serviceId, blackoutId, blackoutDate) {
    try {
      const response = await fetch(
        `${Endpoint}/api/v1/${serviceType}s/${serviceId}/blackout-dates/${blackoutId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(blackoutDate),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error updating blackout date:", error);
      throw error;
    }
  },

  /**
   * Delete a blackout date (admin only)
   * @param {string} serviceType - 'tour', 'excursion', or 'transfer'
   * @param {number} serviceId - The service ID
   * @param {number} blackoutId - The blackout date ID
   * @returns {Promise<void>}
   */
  async deleteBlackoutDate(serviceType, serviceId, blackoutId) {
    try {
      const response = await fetch(
        `${Endpoint}/api/v1/${serviceType}s/${serviceId}/blackout-dates/${blackoutId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error deleting blackout date:", error);
      throw error;
    }
  },
};

/**
 * Utility functions for formatting and validation
 */
const APIUtils = {
  /**
   * Format date to YYYY-MM-DD
   * @param {Date|string} date - Date object or string
   * @returns {string} Formatted date string
   */
  formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  },

  /**
   * Format date for display (DD/MM/YYYY)
   * @param {string} dateStr - Date string (YYYY-MM-DD)
   * @returns {string} Formatted date string
   */
  formatDateForDisplay(dateStr) {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  },

  /**
   * Check if user has admin role
   * @returns {boolean} True if user is admin
   */
  isAdmin() {
    const role = localStorage.getItem("role");
    return role === "admin";
  },

  /**
   * Show error notification
   * @param {string} message - Error message
   */
  showError(message) {
    if (typeof PNotify !== "undefined") {
      new PNotify({
        title: "Error",
        text: message,
        type: "error",
        styling: "bootstrap3",
      });
    } else {
      alert(message);
    }
  },

  /**
   * Show success notification
   * @param {string} message - Success message
   */
  showSuccess(message) {
    if (typeof PNotify !== "undefined") {
      new PNotify({
        title: "Success",
        text: message,
        type: "success",
        styling: "bootstrap3",
      });
    } else {
      alert(message);
    }
  },
};

