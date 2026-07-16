/**
 * Universal Cities Loader
 * 
 * This utility provides a standardized way to load cities from the API
 * and handle different response formats across all pages.
 * 
 * Usage:
 * 1. Include this script in your HTML: <script src="js/universal-cities-loader.js"></script>
 * 2. Call loadCitiesUniversal(dropdownId) to populate a dropdown
 * 3. Or use loadCitiesUniversalArray() to get an array of city names
 */

/**
 * Load cities from API and populate a dropdown
 * @param {string} dropdownId - ID of the select element to populate
 * @param {string} placeholderText - Optional placeholder text (default: "*City")
 * @returns {Promise<string[]>} Array of city names
 */
async function loadCitiesUniversal(dropdownId, placeholderText = "*City") {
  try {
    const cityNames = await loadCitiesUniversalArray();
    
    // Populate the dropdown
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
      console.error(`Dropdown element with ID "${dropdownId}" not found`);
      return cityNames;
    }

    // Clear existing options except the first one if it's a placeholder
    const firstOption = dropdown.firstElementChild;
    if (firstOption && (firstOption.disabled || firstOption.value === "")) {
      // Keep the placeholder, remove others
      while (dropdown.children.length > 1) {
        dropdown.removeChild(dropdown.lastChild);
      }
      // Update placeholder text
      firstOption.textContent = placeholderText;
    } else {
      // Clear all options
      dropdown.innerHTML = `<option value="" disabled selected>${placeholderText}</option>`;
    }

    // Add city options
    cityNames.forEach((cityName) => {
      const option = document.createElement("option");
      option.value = cityName;
      option.textContent = cityName;
      dropdown.appendChild(option);
    });

    console.log(`Successfully loaded ${cityNames.length} cities into dropdown "${dropdownId}"`);
    return cityNames;
    
  } catch (error) {
    console.error(`Error loading cities for dropdown "${dropdownId}":`, error);
    
    // Show error in dropdown
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      dropdown.innerHTML = `<option value="" disabled selected>Error loading cities</option>`;
    }
    
    alert(`Failed to load cities: ${error.message}`);
    return [];
  }
}

/**
 * Load cities from API and return as array
 * @returns {Promise<string[]>} Array of city names
 */
async function loadCitiesUniversalArray() {
  try {
    // Retrieve the token from localStorage
    const token = localStorage.getItem("token");

    // Check if token exists
    if (!token) {
      throw new Error("No authentication token found. Please log in first.");
    }

    console.log("Fetching cities from API...");
    
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
        throw new Error("Unauthorized");
      } else if (response.status === 403) {
        throw new Error("You don't have sufficient permissions to perform this action.");
      } else {
        const errorMessage = await response.text() || "Failed to load cities data";
        throw new Error(errorMessage);
      }
    }

    const data = await response.json();
    console.log("Cities API response:", data);
    
    const cities = window.ApiResponse.list(data, ["cities", "data", "items", "results"]);
    if (cities.length === 0 && data && typeof data === "object" && !Array.isArray(data)) {
      console.error("Unexpected API response format:", data);
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
    return cityNames;
    
  } catch (error) {
    console.error("Error fetching cities:", error);
    throw error;
  }
}

/**
 * Legacy compatibility function - replaces old populateCitiesDropdown calls
 * @param {string} dropdownId - ID of the select element (default: "city")
 */
function populateCitiesDropdown(dropdownId = "city") {
  return loadCitiesUniversal(dropdownId);
}

// Make functions globally available
window.loadCitiesUniversal = loadCitiesUniversal;
window.loadCitiesUniversalArray = loadCitiesUniversalArray;
window.populateCitiesDropdown = populateCitiesDropdown;
