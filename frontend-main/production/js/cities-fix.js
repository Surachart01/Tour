/**
 * Cities Loading Fix
 * 
 * This script provides a quick fix for the cities.forEach error
 * by overriding the global populateCitiesDropdown function
 * with proper error handling for different API response formats.
 * 
 * Include this script AFTER config.js and BEFORE any other scripts
 * that use populateCitiesDropdown.
 */

(function() {
  'use strict';
  
  // Store original function if it exists
  const originalPopulateCitiesDropdown = window.populateCitiesDropdown;
  
  /**
   * Universal cities dropdown population with error handling
   * @param {string} selector - CSS selector or element ID for dropdown(s)
   */
  window.populateCitiesDropdown = async function(selector = "city") {
    try {
      // Retrieve the token from localStorage
      const token = localStorage.getItem("token");

      // Check if token exists
      if (!token) {
        alert("You are not authorized. Please log in first.");
        window.location.href = "login.html";
        return;
      }

      console.log("Fetching cities from API (universal fix)...");
      
      // Fetch the list of cities from the API
      const response = await fetch(`${Endpoint}/api/v1/cities`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
          window.location.href = "login.html";
          return;
        } else if (response.status === 403) {
          alert("You don't have sufficient permissions to perform this action.");
          return;
        } else {
          const errorMessage = await response.text() || "Failed to load cities data";
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();
      console.log("Cities API response:", data);
      
      // Handle different response formats
      let cities = [];
      if (Array.isArray(data)) {
        // Direct array response
        cities = data;
      } else if (data.cities && Array.isArray(data.cities)) {
        // Response with cities property
        cities = data.cities;
      } else if (data.data && Array.isArray(data.data)) {
        // Response with data property
        cities = data.data;
      } else {
        console.error("Unexpected API response format:", data);
        throw new Error("Invalid cities data format received from server");
      }

      // Extract city names from objects or use strings directly
      const cityNames = cities.map(cityItem => {
        if (typeof cityItem === 'string') {
          return cityItem;
        } else if (cityItem.city) {
          return cityItem.city;
        } else if (cityItem.name) {
          return cityItem.name;
        } else if (cityItem.city_name) {
          return cityItem.city_name;
        } else {
          console.warn("Unknown city format:", cityItem);
          return cityItem.toString();
        }
      }).filter(name => name && name.trim() !== ''); // Filter out empty names

      console.log("Processed city names:", cityNames.length, "cities");

      // Find dropdown elements
      let dropdowns = [];
      if (selector.startsWith('#')) {
        // Single element by ID
        const dropdown = document.getElementById(selector.substring(1));
        if (dropdown) dropdowns = [dropdown];
      } else if (selector.startsWith('.')) {
        // Elements by class
        dropdowns = Array.from(document.querySelectorAll(selector));
      } else {
        // Try as ID first, then as selector
        const byId = document.getElementById(selector);
        if (byId) {
          dropdowns = [byId];
        } else {
          dropdowns = Array.from(document.querySelectorAll(selector));
        }
      }

      if (dropdowns.length === 0) {
        console.error(`No dropdown elements found with selector "${selector}"`);
        return;
      }

      // Populate each dropdown
      dropdowns.forEach(dropdown => {
        // Clear existing options except the first one if it's a placeholder
        const firstOption = dropdown.firstElementChild;
        if (firstOption && (firstOption.disabled || firstOption.value === "")) {
          // Keep the placeholder, remove others
          while (dropdown.children.length > 1) {
            dropdown.removeChild(dropdown.lastChild);
          }
        } else {
          // Clear all options and add placeholder
          dropdown.innerHTML = '<option value="" disabled selected>Select City</option>';
        }

        // Add city options
        cityNames.forEach((cityName) => {
          const option = document.createElement("option");
          option.value = cityName;
          option.textContent = cityName;
          dropdown.appendChild(option);
        });
      });

      console.log(`Successfully loaded ${cityNames.length} cities into ${dropdowns.length} dropdown(s)`);
      
    } catch (error) {
      console.error("Error fetching cities:", error);
      alert(`Failed to load cities: ${error.message}`);
    }
  };
  
  console.log("Cities loading fix applied successfully");
})();
