/**
 * Location Cache Module
 * Provides persistent caching for countries, cities, and profile country detection
 * Uses localStorage with expiration times for optimal performance
 * 
 * Cache Durations:
 * - Countries: 1 hour
 * - Profile Country: 30 minutes  
 * - Cities: 5 minutes (short duration for frequently changing data)
 * - All Cities: 5 minutes
 * 
 * Cache Invalidation Examples:
 * - LocationCache.invalidateCache('cities') - Clear cities cache
 * - LocationCache.refreshCache('cities') - Force reload cities from API
 * - LocationCache.addNewCity('Bangkok', 'TH') - Automatically invalidates cities cache
 * - LocationCache.clearLocationCache() - Clear all caches
 */

// Cache for location data with localStorage persistence
let locationCache = {
  countries: null,
  profileCountry: null,
  citiesByCountry: {},
  allCities: null // Cache for direct /api/v1/cities endpoint
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  countries: 60 * 60 * 1000, // 1 hour
  profileCountry: 30 * 60 * 1000, // 30 minutes
  cities: 5 * 60 * 1000, // 5 minutes
  allCities: 5 * 60 * 1000 // 5 minutes for direct cities API
};

// Load cache from localStorage
function loadCacheFromStorage() {
  try {
    const stored = localStorage.getItem('locationCache');
    if (stored) {
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      // Check if countries cache is still valid
      if (parsed.countries && parsed.countriesTimestamp && 
          (now - parsed.countriesTimestamp) < CACHE_EXPIRY.countries) {
        locationCache.countries = parsed.countries;
        console.log("Loaded countries from localStorage cache");
      }
      
      // Check if profile country cache is still valid
      if (parsed.profileCountry && parsed.profileCountryTimestamp && 
          (now - parsed.profileCountryTimestamp) < CACHE_EXPIRY.profileCountry) {
        locationCache.profileCountry = parsed.profileCountry;
        console.log("Loaded profile country from localStorage cache");
      }
      
      // Check cities cache
      if (parsed.citiesByCountry) {
        Object.keys(parsed.citiesByCountry).forEach(countryCode => {
          const cityData = parsed.citiesByCountry[countryCode];
          if (cityData && cityData.timestamp && 
              (now - cityData.timestamp) < CACHE_EXPIRY.cities) {
            locationCache.citiesByCountry[countryCode] = cityData.cities;
            console.log(`Loaded cities for ${countryCode} from localStorage cache`);
          }
        });
      }
      
      // Check all cities cache
      if (parsed.allCities && parsed.allCitiesTimestamp && 
          (now - parsed.allCitiesTimestamp) < CACHE_EXPIRY.allCities) {
        locationCache.allCities = parsed.allCities;
        console.log("Loaded all cities from localStorage cache");
      }
    }
  } catch (error) {
    console.error("Error loading cache from localStorage:", error);
    // Clear corrupted cache
    localStorage.removeItem('locationCache');
  }
}

// Save cache to localStorage
function saveCacheToStorage() {
  try {
    const now = Date.now();
    const cacheData = {
      countries: locationCache.countries,
      countriesTimestamp: locationCache.countries ? now : null,
      profileCountry: locationCache.profileCountry,
      profileCountryTimestamp: locationCache.profileCountry ? now : null,
      allCities: locationCache.allCities,
      allCitiesTimestamp: locationCache.allCities ? now : null,
      citiesByCountry: {}
    };
    
    // Save cities with timestamps
    Object.keys(locationCache.citiesByCountry).forEach(countryCode => {
      cacheData.citiesByCountry[countryCode] = {
        cities: locationCache.citiesByCountry[countryCode],
        timestamp: now
      };
    });
    
    localStorage.setItem('locationCache', JSON.stringify(cacheData));
    console.log("Saved location cache to localStorage");
  } catch (error) {
    console.error("Error saving cache to localStorage:", error);
  }
}

// Get authentication token with validation (using AuthUtils if available)
function getAuthToken() {
  if (typeof window.AuthUtils !== 'undefined') {
    return window.AuthUtils.getValidAuthToken();
  }
  
  // Fallback to local validation
  const token = localStorage.getItem("token");
  if (!token) {
    console.warn("LocationCache: No auth token found");
    return null;
  }
  
  // Check if token is expired
  if (isTokenExpired(token)) {
    console.warn("LocationCache: Token is expired");
    localStorage.removeItem("token");
    return null;
  }
  
  return token;
}

// Check if JWT token is expired (fallback function)
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expired = Date.now() > payload.exp * 1000;
    return expired;
  } catch (error) {
    console.error("LocationCache: Error parsing token:", error);
    return true;
  }
}

// Handle API errors with retry logic
function handleApiError(response, defaultMessage, retryCount = 0) {
  if (response.status === 401) {
    // Don't immediately redirect - could be a temporary issue
    console.warn("Received 401 error, retry count:", retryCount);
    
    // Only redirect after multiple failures or if token is clearly invalid
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token) || retryCount >= 2) {
      console.error("Authentication failed after retries, redirecting to login");
      alert("Your session has expired. Please log in again.");
      window.location.href = "login.html";
      return true;
    }
    
    // Return false to allow retry
    return false;
  } else if (response.status === 403) {
    console.warn("Access forbidden (403)");
    alert("You don't have sufficient permissions to perform this action.");
    return true;
  }
  return false;
}

// Load countries from API with caching and retry logic
async function loadCountries(retryCount = 0) {
  const token = getAuthToken();
  if (!token) {
    console.warn("No valid token for loading countries");
    return [];
  }

  // Return cached data if available
  if (locationCache.countries) {
    console.log("Using cached countries data");
    return locationCache.countries;
  }

  try {
    console.log("Fetching countries from API... (attempt", retryCount + 1, ")");
    
    // Use AuthUtils if available for better error handling
    if (typeof window.AuthUtils !== 'undefined') {
      const response = await window.AuthUtils.makeAuthenticatedRequest(
        `${Endpoint}/api/v1/locations/countries`,
        { method: "GET" },
        "load countries",
        retryCount
      );
      
      if (!response.ok) {
        console.warn("Countries API call failed with status:", response.status);
        return [];
      }
      
      const data = await response.json();
      locationCache.countries = data.countries || data;
      console.log("Countries loaded from API and cached:", locationCache.countries);
      saveCacheToStorage();
      return locationCache.countries;
    }
    
    // Fallback to direct fetch
    const response = await fetch(`${Endpoint}/api/v1/locations/countries`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401 && retryCount < 2) {
        console.log("Retrying countries API call due to 401...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return loadCountries(retryCount + 1);
      }
      
      if (handleApiError(response, "Failed to load countries", retryCount)) {
        return [];
      }
      throw new Error("Failed to load countries");
    }

    const data = await response.json();
    locationCache.countries = data.countries || data; // Handle different response formats
    console.log("Countries loaded from API and cached:", locationCache.countries);
    
    // Save to localStorage
    saveCacheToStorage();
    
    return locationCache.countries;
  } catch (error) {
    console.error("Error loading countries:", error);
    if (retryCount < 2) {
      console.log("Retrying countries API call due to error...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return loadCountries(retryCount + 1);
    }
    console.error("Failed to load countries after retries");
    return [];
  }
}

// Detect country from profile with caching
async function detectCountryFromProfile() {
  const token = getAuthToken();
  if (!token) {
    console.log("No auth token available for profile country detection");
    return null;
  }

  // Return cached data if available
  if (locationCache.profileCountry) {
    console.log("Using cached profile country:", locationCache.profileCountry);
    return locationCache.profileCountry;
  }

  try {
    console.log("Detecting country from profile...");
    
    // Get user ID from localStorage (same as profile.js)
    let userID = localStorage.getItem("userId") || localStorage.getItem("user_id");
    const username = localStorage.getItem("username") || "Guest";
    
    console.log("Raw userID from localStorage:", userID);
    console.log("Username from localStorage:", username);
    
    // If no numeric ID, use username as fallback
    if (!userID || userID === "Guest") {
      userID = username;
    }
    
    console.log("Final userID for API call:", userID);
    
    // Get user profile data to extract country
    const apiUrl = `${Endpoint}/api/v1/user-profiles/${userID}`;
    console.log("Making API call to:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("Profile API response status:", response.status);

    if (!response.ok) {
      if (handleApiError(response, "Failed to get profile data")) return null;
      console.log("Profile data not available, using default country");
      return null;
    }

    const profileData = await response.json();
    console.log("Full profile data received:", profileData);
    
    // Extract country from profile data
    const detectedCountry = profileData.country || profileData.billing_country;
    console.log("Extracted country from profile:", detectedCountry);
    console.log("Profile.country:", profileData.country);
    console.log("Profile.billing_country:", profileData.billing_country);
    
    if (detectedCountry) {
      locationCache.profileCountry = detectedCountry;
      console.log("Profile country detected and cached:", locationCache.profileCountry);
      
      // Save to localStorage
      saveCacheToStorage();
      
      return locationCache.profileCountry;
    } else {
      console.log("No country found in profile data");
      console.log("Available profile fields:", Object.keys(profileData));
      return null;
    }
  } catch (error) {
    console.error("Error detecting country from profile:", error);
    return null;
  }
}

// Load cities by country with caching
async function loadCitiesByCountry(countryCode) {
  const token = getAuthToken();
  if (!token) return [];

  // Return cached data if available
  if (locationCache.citiesByCountry[countryCode]) {
    console.log(`Using cached cities for ${countryCode}:`, locationCache.citiesByCountry[countryCode]);
    return locationCache.citiesByCountry[countryCode];
  }

  try {
    console.log(`Fetching cities for ${countryCode} from API...`);
    const response = await fetch(`${Endpoint}/api/v1/locations/countries/${countryCode}/cities`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (handleApiError(response, "Failed to load cities")) return [];
      throw new Error("Failed to load cities");
    }

    const data = await response.json();
    // Handle the correct response format: {"cities":[{"city":"Bangkok",...},{"city":"Phuket",...}]}
    const cities = data.cities || [];
    locationCache.citiesByCountry[countryCode] = cities;
    console.log(`Cities loaded from API and cached for ${countryCode}:`, cities);
    
    // Save to localStorage
    saveCacheToStorage();
    
    return cities;
  } catch (error) {
    console.error("Error loading cities:", error);
    alert("Failed to load cities. Please try again.");
    return [];
  }
}

// Add new city to backend and cache
async function addNewCity(cityName, countryCode) {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${Endpoint}/api/v1/locations/cities`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        city: cityName,
        country_code: countryCode,
      }),
    });

    if (!response.ok) {
      if (handleApiError(response, "Failed to add city")) return false;
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to add city");
    }

    const result = await response.json();
    
    // Add the new city to cache immediately instead of clearing
    if (!locationCache.citiesByCountry[countryCode]) {
      locationCache.citiesByCountry[countryCode] = [];
    }
    
    // Add the new city to the cache (assuming the API returns the city data)
    const newCityData = result.city || { city: cityName, name: cityName };
    locationCache.citiesByCountry[countryCode].push(newCityData);
    
    // IMPORTANT: Invalidate allCities cache since we added a new city
    console.log("Invalidating allCities cache due to new city addition");
    locationCache.allCities = null;
    
    // Update localStorage
    saveCacheToStorage();
    
    console.log(`New city "${cityName}" added successfully to ${countryCode} and cached`);
    console.log("⚠️  allCities cache invalidated - next call will fetch fresh data");
    return true;
  } catch (error) {
    console.error("Error adding city:", error);
    alert("Failed to add city: " + error.message);
    return false;
  }
}

// Populate countries dropdown
async function populateCountriesDropdown(dropdownId = "country") {
  const countryDropdown = document.getElementById(dropdownId);
  if (!countryDropdown) {
    console.warn(`Country dropdown with ID '${dropdownId}' not found`);
    return;
  }

  const countries = await loadCountries();
  
  if (!countries || countries.length === 0) {
    countryDropdown.innerHTML = '<option value="" disabled>Failed to load countries</option>';
    return;
  }

  // Clear existing options
  countryDropdown.innerHTML = '<option value="" disabled selected>Select country</option>';

  // Add country options
  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.code || country.country_code;
    option.textContent = country.name || country.country_name;
    countryDropdown.appendChild(option);
  });

  // Try to detect and select profile country
  const profileCountry = await detectCountryFromProfile();
  console.log("Profile country detected:", profileCountry);
  
  if (profileCountry) {
    // Try to find and select the country
    const countryOption = Array.from(countryDropdown.options).find(option => 
      option.value === profileCountry || 
      option.value === profileCountry.toUpperCase() ||
      option.textContent.toLowerCase() === profileCountry.toLowerCase()
    );
    
    if (countryOption) {
      countryDropdown.value = countryOption.value;
      console.log(`Selected profile country: ${countryOption.textContent} (${countryOption.value})`);
      
      // Trigger change event to load cities
      countryDropdown.dispatchEvent(new Event('change'));
    } else {
      console.warn(`Profile country "${profileCountry}" not found in countries list`);
      console.log("Available countries:", countries.map(c => `${c.name || c.country_name} (${c.code || c.country_code})`));
    }
  } else {
    console.log("No profile country detected, leaving dropdown at default");
  }
}

// Populate cities dropdown for a specific country
async function populateCitiesDropdown(countryCode, cityDropdownId = "city", addNewCityBtnId = "addNewCityBtn") {
  const cityDropdown = document.getElementById(cityDropdownId);
  const addNewCityBtn = document.getElementById(addNewCityBtnId);

  if (!cityDropdown) {
    console.warn(`City dropdown with ID '${cityDropdownId}' not found`);
    return Promise.resolve();
  }

  if (!countryCode) {
    cityDropdown.innerHTML = '<option value="" disabled selected>Select country first</option>';
    if (addNewCityBtn) addNewCityBtn.disabled = true;
    return Promise.resolve();
  }

  // Show loading state
  cityDropdown.innerHTML = '<option value="" disabled selected>Loading cities...</option>';
  if (addNewCityBtn) addNewCityBtn.disabled = true;

  try {
    const cities = await loadCitiesByCountry(countryCode);

    // Clear existing options
    cityDropdown.innerHTML = '<option value="" disabled>Select city</option>';

    // Add city options
    // Handle the correct response format: cities = [{"city":"Bangkok",...},{"city":"Phuket",...}]
    cities.forEach((cityObj) => {
      const option = document.createElement("option");
      const cityName = cityObj.city || cityObj.name || cityObj; // Handle different possible formats
      option.value = cityName;
      option.textContent = cityName;
      cityDropdown.appendChild(option);
    });

    // Enable add new city button
    if (addNewCityBtn) addNewCityBtn.disabled = false;
    cityDropdown.selectedIndex = 0;
    
    console.log(`Successfully populated ${cities.length} cities for ${countryCode} in dropdown ${cityDropdownId}`);
    return Promise.resolve();
  } catch (error) {
    console.error(`Error populating cities for ${countryCode}:`, error);
    cityDropdown.innerHTML = '<option value="" disabled>Error loading cities</option>';
    return Promise.reject(error);
  }
}

// Load all cities directly from /api/v1/cities endpoint with caching and retry logic
async function loadAllCitiesFromAPI(retryCount = 0) {
  const token = getAuthToken();
  if (!token) {
    console.warn("No valid token for loading cities");
    return [];
  }

  // Return cached data if available and not expired
  if (locationCache.allCities) {
    console.log("Using cached all cities data (expires in 5 minutes)");
    return locationCache.allCities;
  }

  try {
    console.log("Fetching all cities from API... (attempt", retryCount + 1, ")");
    
    // Use AuthUtils if available for better error handling
    if (typeof window.AuthUtils !== 'undefined') {
      const response = await window.AuthUtils.makeAuthenticatedRequest(
        `${Endpoint}/api/v1/cities`,
        { method: "GET" },
        "load cities",
        retryCount
      );
      
      if (!response.ok) {
        console.warn("Cities API call failed with status:", response.status);
        return [];
      }
      
      const data = await response.json();
      const cities = data.cities || data;
      const cityNames = cities.map(cityObj => {
        if (typeof cityObj === 'string') return cityObj;
        return cityObj.city || cityObj.name || cityObj;
      });

      locationCache.allCities = cityNames;
      console.log("All cities loaded from API and cached:", cityNames.length, "cities (cached for 5 minutes)");
      saveCacheToStorage();
      return locationCache.allCities;
    }
    
    // Fallback to direct fetch
    const response = await fetch(`${Endpoint}/api/v1/cities`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401 && retryCount < 2) {
        console.log("Retrying cities API call due to 401...");
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return loadAllCitiesFromAPI(retryCount + 1);
      }
      
      if (handleApiError(response, "Failed to load cities", retryCount)) {
        return [];
      }
      throw new Error("Failed to load cities");
    }

    const data = await response.json();
    
    // Handle different response formats
    const cities = data.cities || data;
    
    // Extract city names for dropdown usage
    const cityNames = cities.map(cityObj => {
      if (typeof cityObj === 'string') return cityObj;
      return cityObj.city || cityObj.name || cityObj;
    });

    locationCache.allCities = cityNames;
    console.log("All cities loaded from API and cached:", cityNames.length, "cities (cached for 5 minutes)");
    
    // Save to localStorage
    saveCacheToStorage();
    
    return locationCache.allCities;
  } catch (error) {
    console.error("Error loading all cities:", error);
    if (retryCount < 2) {
      console.log("Retrying cities API call due to error...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return loadAllCitiesFromAPI(retryCount + 1);
    }
    console.error("Failed to load cities after retries");
    return [];
  }
}

// Get all cities from all countries (useful for itinerary dropdowns) - LEGACY METHOD
async function getAllCities() {
  // Try the direct API first (more efficient)
  const directCities = await loadAllCitiesFromAPI();
  if (directCities && directCities.length > 0) {
    return directCities;
  }

  // Fallback to country-by-country approach
  console.log("Falling back to country-by-country city loading...");
  const countries = await loadCountries();
  if (!countries || countries.length === 0) {
    console.error("No countries available for city population");
    return [];
  }

  const allCities = [];
  for (const country of countries) {
    const countryCode = country.code || country.country_code;
    const cities = await loadCitiesByCountry(countryCode);
    cities.forEach((cityObj) => {
      const cityName = cityObj.city || cityObj.name || cityObj;
      if (!allCities.includes(cityName)) {
        allCities.push(cityName);
      }
    });
  }

  return allCities;
}

// Find which country a city belongs to
async function findCountryForCity(cityName) {
  if (!cityName) {
    console.warn("No city name provided to findCountryForCity");
    return null;
  }

  console.log(`Searching for country of city: ${cityName}`);

  // First check if we have the city in any cached countries
  for (const countryCode in locationCache.citiesByCountry) {
    const cities = locationCache.citiesByCountry[countryCode];
    if (cities && Array.isArray(cities)) {
      const foundCity = cities.find(cityObj => {
        const cachedCityName = cityObj.city || cityObj.name || cityObj;
        return cachedCityName.toLowerCase() === cityName.toLowerCase();
      });
      
      if (foundCity) {
        console.log(`Found city ${cityName} in cached country ${countryCode}`);
        return countryCode;
      }
    }
  }

  // If not found in cache, search through all countries
  const countries = await loadCountries();
  if (!countries || countries.length === 0) {
    console.error("No countries available for city search");
    return null;
  }

  for (const country of countries) {
    const countryCode = country.code || country.country_code;
    
    // Skip if we already checked this country's cache
    if (locationCache.citiesByCountry[countryCode]) {
      continue;
    }
    
    try {
      const cities = await loadCitiesByCountry(countryCode);
      const foundCity = cities.find(cityObj => {
        const apiCityName = cityObj.city || cityObj.name || cityObj;
        return apiCityName.toLowerCase() === cityName.toLowerCase();
      });
      
      if (foundCity) {
        console.log(`Found city ${cityName} in country ${countryCode} (${country.name || country.country_name})`);
        return countryCode;
      }
    } catch (error) {
      console.warn(`Error searching cities in ${countryCode}:`, error);
      continue;
    }
  }

  console.warn(`City ${cityName} not found in any country`);
  return null;
}

// Populate cities dropdown with all cities from all countries
async function populateAllCitiesDropdown(selector) {
  const allCities = await getAllCities();
  const cityDropdowns = document.querySelectorAll(selector);

  if (cityDropdowns.length === 0) {
    console.warn("No dropdowns found with the selector:", selector);
    return;
  }

  cityDropdowns.forEach((dropdown) => {
    // Clear existing options
    dropdown.innerHTML = '<option value="">Select City</option>';

    // Add city options
    allCities.forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      dropdown.appendChild(option);
    });
  });
}

// Populate a single city dropdown using cached data
async function populateCachedCityDropdown(dropdownId) {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) {
    console.warn(`Dropdown with ID ${dropdownId} not found`);
    return;
  }

  dropdown.innerHTML = "<option disabled selected>Loading cities...</option>";

  try {
    const cities = await loadAllCitiesFromAPI();
    
    dropdown.innerHTML = "<option disabled selected>Select a city</option>";
    
    cities.forEach((city) => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      dropdown.appendChild(option);
    });
    
    console.log(`Successfully populated ${cities.length} cities in dropdown ${dropdownId}`);
  } catch (error) {
    console.error(`Error populating cities in dropdown ${dropdownId}:`, error);
    dropdown.innerHTML = "<option disabled selected>Failed to load cities</option>";
  }
}

// Populate multiple city dropdowns at once using cached data
async function populateMultipleCachedCityDropdowns(dropdownIds) {
  try {
    // Load cities once
    const cities = await loadAllCitiesFromAPI();
    
    // Populate all dropdowns
    dropdownIds.forEach(dropdownId => {
      const dropdown = document.getElementById(dropdownId);
      if (!dropdown) {
        console.warn(`Dropdown with ID ${dropdownId} not found`);
        return;
      }

      dropdown.innerHTML = "<option disabled selected>Select a city</option>";
      
      cities.forEach((city) => {
        const option = document.createElement("option");
        option.value = city;
        option.textContent = city;
        dropdown.appendChild(option);
      });
    });
    
    console.log(`Successfully populated ${cities.length} cities in ${dropdownIds.length} dropdowns`);
  } catch (error) {
    console.error("Error populating multiple city dropdowns:", error);
    
    // Show error in all dropdowns
    dropdownIds.forEach(dropdownId => {
      const dropdown = document.getElementById(dropdownId);
      if (dropdown) {
        dropdown.innerHTML = "<option disabled selected>Failed to load cities</option>";
      }
    });
  }
}

// Initialize location cache (call this on page load)
function initializeLocationCache() {
  loadCacheFromStorage();
}

// Clear location cache (for debugging or manual refresh)
function clearLocationCache() {
  localStorage.removeItem('locationCache');
  locationCache = {
    countries: null,
    profileCountry: null,
    citiesByCountry: {},
    allCities: null
  };
  console.log("Location cache cleared");
  alert("Location cache cleared. Please refresh the page.");
}

// Invalidate specific cache types
function invalidateCache(cacheType) {
  switch (cacheType) {
    case 'cities':
    case 'allCities':
      locationCache.allCities = null;
      console.log("🗑️ AllCities cache invalidated");
      break;
    case 'countries':
      locationCache.countries = null;
      console.log("🗑️ Countries cache invalidated");
      break;
    case 'profile':
      locationCache.profileCountry = null;
      console.log("🗑️ Profile country cache invalidated");
      break;
    case 'citiesByCountry':
      locationCache.citiesByCountry = {};
      console.log("🗑️ Cities by country cache invalidated");
      break;
    case 'all':
      clearLocationCache();
      return;
    default:
      console.warn(`Unknown cache type: ${cacheType}`);
      return;
  }
  
  // Update localStorage after invalidation
  saveCacheToStorage();
}

// Force refresh cache data (invalidate and reload)
async function refreshCache(cacheType) {
  console.log(`🔄 Force refreshing ${cacheType} cache...`);
  
  switch (cacheType) {
    case 'cities':
    case 'allCities':
      invalidateCache('allCities');
      return await loadAllCitiesFromAPI();
    case 'countries':
      invalidateCache('countries');
      return await loadCountries();
    case 'profile':
      invalidateCache('profile');
      return await detectCountryFromProfile();
    case 'all':
      invalidateCache('all');
      await loadCountries();
      await loadAllCitiesFromAPI();
      await detectCountryFromProfile();
      console.log("✅ All caches refreshed");
      break;
    default:
      console.warn(`Cannot refresh unknown cache type: ${cacheType}`);
      return null;
  }
}

// Make functions available globally
window.LocationCache = {
  // Core functions
  initializeLocationCache,
  loadCountries,
  detectCountryFromProfile,
  loadCitiesByCountry,
  loadAllCitiesFromAPI,
  addNewCity,
  getAllCities,
  findCountryForCity,
  
  // UI helper functions
  populateCountriesDropdown,
  populateCitiesDropdown,
  populateAllCitiesDropdown,
  populateCachedCityDropdown,
  populateMultipleCachedCityDropdowns,
  
  // Cache management functions
  clearLocationCache,
  invalidateCache,
  refreshCache,
  
  // Direct access to cache (for advanced usage)
  getCache: () => locationCache,
  getCacheExpiry: () => CACHE_EXPIRY
};

// Auto-initialize on script load with delay to ensure authentication is ready
document.addEventListener("DOMContentLoaded", function() {
  initializeLocationCache();
  
  // Add a small delay before making API calls to ensure token is properly set
  setTimeout(() => {
    console.log("LocationCache: Ready to make API calls");
  }, 500);
}); 