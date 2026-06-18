// Cache for location data
let locationCache = {
  countries: null,
  profileCountry: null,
  citiesByCountry: {}
};

// Cache expiration times (in milliseconds)
const CACHE_EXPIRY = {
  countries: 24 * 60 * 60 * 1000, // 24 hours
  profileCountry: 60 * 60 * 1000, // 1 hour
  cities: 12 * 60 * 60 * 1000 // 12 hours
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
    };
    
    localStorage.setItem('locationCache', JSON.stringify(cacheData));
    console.log("Saved location cache to localStorage");
  } catch (error) {
    console.error("Error saving cache to localStorage:", error);
  }
}

// Get authentication token
function getAuthToken() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return null;
  }
  return token;
}

// Handle API errors
function handleApiError(response, defaultMessage) {
  if (response.status === 401) {
    alert("Unauthorized. Please log in again.");
    window.location.href = "login.html";
    return true;
  } else if (response.status === 403) {
    alert("You don't have sufficient permissions to perform this action.");
    return true;
  }
  return false;
}

// Load countries from API with caching
async function loadCountries() {
  const token = getAuthToken();
  if (!token) return;

  // Return cached data if available
  if (locationCache.countries) {
    console.log("Using cached countries data");
    return locationCache.countries;
  }

  try {
    console.log("Fetching countries from API...");
    const response = await fetch(`${Endpoint}/api/v1/locations/countries`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (handleApiError(response, "Failed to load countries")) return;
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
    alert("Failed to load countries. Please try again.");
    return [];
  }
}

// Detect country from profile with caching
async function detectCountryFromProfile() {
  const token = getAuthToken();
  if (!token) return null;

  // Return cached data if available
  if (locationCache.profileCountry) {
    console.log("Using cached profile country:", locationCache.profileCountry);
    return locationCache.profileCountry;
  }

  try {
    console.log("Detecting country from profile...");
    const profileData = {};

    const response = await fetch(`${Endpoint}/api/v1/locations/detect-country`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      if (handleApiError(response, "Failed to detect country")) return null;
      console.log("Country detection not available, using default");
      return null;
    }

    const data = await response.json();
    locationCache.profileCountry = data.detected_country || data.country_info?.code;
    console.log("Profile country detected from API and cached:", locationCache.profileCountry);
    
    // Save to localStorage
    saveCacheToStorage();
    
    return locationCache.profileCountry;
  } catch (error) {
    console.error("Error detecting country from profile:", error);
    return null;
  }
}

// Populate countries dropdown
async function populateCountriesDropdown() {
  const countryDropdown = document.getElementById("supplierCountry");
  const countries = await loadCountries();
  
  if (!countries || countries.length === 0) {
    countryDropdown.innerHTML = '<option value="" disabled>Failed to load countries</option>';
    return;
  }

  // Clear existing options
  countryDropdown.innerHTML = '<option value="" disabled>Select country</option>';

  // Add country options
  countries.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.code || country.country_code;
    option.textContent = country.name || country.country_name;
    countryDropdown.appendChild(option);
  });
}

// Ensure countries are loaded and return them
async function ensureCountriesLoaded() {
  if (!locationCache.countries) {
    await loadCountries();
  }
  return locationCache.countries;
}

// Find country code by country name
function findCountryCodeByName(countryName) {
  if (!locationCache.countries || !countryName) {
    return null;
  }
  
  const country = locationCache.countries.find(c => 
    (c.name || c.country_name) === countryName ||
    (c.code || c.country_code) === countryName
  );
  
  return country ? (country.code || country.country_code) : null;
}

// Find country name by country code
function findCountryNameByCode(countryCode) {
  if (!locationCache.countries || !countryCode) {
    return null;
  }
  
  const country = locationCache.countries.find(c => 
    (c.code || c.country_code) === countryCode
  );
  
  return country ? (country.name || country.country_name) : null;
}

// Policy preview update functions
function updatePolicyPreview() {
  const cancellationDays = parseInt(document.getElementById("cancellationAllowedBeforeDays").value) || 1;
  const paymentDays = parseInt(document.getElementById("paymentDeadlineBeforeDays").value) || 1;
  
  const cancellationPreview = document.getElementById("cancellationPreview");
  const paymentPreview = document.getElementById("paymentPreview");
  
  // Update cancellation preview
  if (cancellationDays === -1) {
    cancellationPreview.textContent = "No cancellation allowed";
  } else if (cancellationDays === 0) {
    cancellationPreview.textContent = "Cancellation allowed until travel date";
  } else if (cancellationDays === 1) {
    cancellationPreview.textContent = "Cancellation allowed until 1 day before travel";
  } else {
    cancellationPreview.textContent = `Cancellation allowed until ${cancellationDays} days before travel`;
  }
  
  // Update payment preview
  if (paymentDays === 0) {
    paymentPreview.textContent = "Payment due on travel date";
  } else if (paymentDays === 1) {
    paymentPreview.textContent = "Payment due 1 day before travel";
  } else {
    paymentPreview.textContent = `Payment due ${paymentDays} days before travel`;
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  // Load cache from localStorage first
  loadCacheFromStorage();
  
  // Load initial data
  populateCountriesDropdown();

  // Add event listeners for policy preview updates
  document.getElementById("cancellationAllowedBeforeDays").addEventListener("input", updatePolicyPreview);
  document.getElementById("paymentDeadlineBeforeDays").addEventListener("input", updatePolicyPreview);

  const params = new URLSearchParams(window.location.search);
  const supplierId = params.get("id");

  if (!supplierId) {
    alert("Invalid supplier ID");
    window.location.href = "suppliers.html";
    return;
  }

  // Fetch supplier data from the backend
  fetch(`${Endpoint}/api/v1/suppliers/${supplierId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
          window.location.href = "login.html";
        } else if (response.status === 403) {
          alert("You don't have sufficient permissions to perform this action.");
          return;
        } else {
          throw new Error("Failed to load supplier");
        }
      }
      return response.json();
    })
    .then(async (supplier) => {
      // Wait for countries to be loaded before populating form
      await ensureCountriesLoaded();
      
      // Populate form fields with supplier data
      populateSupplierForm(supplier);

      // Populate Excursions and Transfers
      populateExcursions(supplier.excursions);
      populateTransfers(supplier.transfers);
    })
    .catch((error) => {
      console.error("Error fetching supplier:", error);
      alert("Failed to load supplier. Please try again later.");
      window.location.href = "suppliers.html";
    });

  // Handle form submission
  document
    .getElementById("supplierForm")
    .addEventListener("submit", handleFormSubmit);
});

// Populate supplier form fields
function populateSupplierForm(supplier) {
  document.getElementById("supplierName").value = supplier.name;
  document.getElementById("supplierDescription").value = supplier.description;
  document.getElementById("supplierEmail").value = supplier.email;
  document.getElementById("supplierTelephone").value = supplier.telephone;
  document.getElementById("supplierLocation").value = supplier.location;

  // Set country if available - handle both country name and country code
  if (supplier.country) {
    const countryDropdown = document.getElementById("supplierCountry");
    
    // Try to set the country directly first (in case it's already a country code)
    countryDropdown.value = supplier.country;
    
    // If that didn't work (value wasn't set), try to find the country code by name
    if (!countryDropdown.value) {
      const countryCode = findCountryCodeByName(supplier.country);
      if (countryCode) {
        countryDropdown.value = countryCode;
      } else {
        console.warn(`Could not find country code for: ${supplier.country}`);
      }
    }
  }

  document.getElementById("supplierTransfers").checked =
    supplier.offers_transfers;
  document.getElementById("supplierExcursions").checked =
    supplier.offers_excursions;
  document.getElementById("supplierTours").checked = supplier.offers_tours;

  // Populate deadline fields
  document.getElementById("cancellationAllowedBeforeDays").value =
    supplier.cancellation_allowed_before_days !== undefined ? supplier.cancellation_allowed_before_days : 1;
  document.getElementById("paymentDeadlineBeforeDays").value =
    supplier.payment_deadline_before_days !== undefined ? supplier.payment_deadline_before_days : 1;

  // Initialize policy preview
  updatePolicyPreview();
}

// Populate excursions table
function populateExcursions(excursions) {
  const excursionsTableBody = document.getElementById("excursionsTableBody");
  excursionsTableBody.innerHTML = "";

  excursions.forEach((excursion) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${excursion.name}</td>
      <td>${excursion.city}</td>
      <td>${excursion.description}</td>
      <td>${excursion.sic_price_adult}</td>
      <td>${excursion.sic_price_child}</td>
      <td>
        <button
          class="btn btn-primary btn-sm"
          onclick="redirectToEditPage('excursion', ${excursion.id})"
        >
          Edit
        </button>
      </td>
    `;
    excursionsTableBody.appendChild(row);
  });
}


// Populate transfers table
function populateTransfers(transfers) {
  const transfersTableBody = document.getElementById("transfersTableBody");
  transfersTableBody.innerHTML = "";

  transfers.forEach((transfer) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${transfer.transfer_type}</td>
      <td>${transfer.city}</td>
      <td>${transfer.description}</td>
      <td>${transfer.departure}</td>
      <td>${transfer.arrival}</td>
      <td>
        <button
          class="btn btn-primary btn-sm"
          onclick="redirectToEditPage('transfer', ${transfer.id})"
        >
          Edit
        </button>
      </td>
    `;
    transfersTableBody.appendChild(row);
  });
}

// Redirect to the edit page for excursions or transfers
function redirectToEditPage(type, id) {
  let editPageUrl = "";

  if (type === "excursion") {
    editPageUrl = `edit_excursion.html?id=${id}`;
  } else if (type === "transfer") {
    editPageUrl = `edit_transfer.html?id=${id}`;
  }

  // Redirect to the edit page
  window.location.href = editPageUrl;
}


// Handle supplier form submission
function handleFormSubmit(event) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Session expired. Please log in again.");
    window.location.href = "login.html";
    return;
  }
  event.preventDefault();

  // Validate form and at least one checkbox
  const isSupplyChecked = [
    document.getElementById("supplierTransfers").checked,
    document.getElementById("supplierExcursions").checked,
    document.getElementById("supplierTours").checked,
  ].some(Boolean);

  if (!isSupplyChecked) {
    document.getElementById("checkboxError").style.display = "block";
    return;
  } else {
    document.getElementById("checkboxError").style.display = "none";
  }

  // Get the selected country code and convert it to country name for backend compatibility
  const selectedCountryCode = document.getElementById("supplierCountry").value;
  const countryName = findCountryNameByCode(selectedCountryCode) || selectedCountryCode;

  const updatedSupplier = {
    name: document.getElementById("supplierName").value,
    description: document.getElementById("supplierDescription").value,
    email: document.getElementById("supplierEmail").value,
    telephone: document.getElementById("supplierTelephone").value,
    country: countryName,
    location: document.getElementById("supplierLocation").value,
    offers_transfers: document.getElementById("supplierTransfers").checked,
    offers_excursions: document.getElementById("supplierExcursions").checked,
    offers_tours: document.getElementById("supplierTours").checked,
    cancellation_allowed_before_days: parseInt(document.getElementById("cancellationAllowedBeforeDays").value),
    payment_deadline_before_days: parseInt(document.getElementById("paymentDeadlineBeforeDays").value),
  };

  const supplierId = new URLSearchParams(window.location.search).get("id");

  // Send the updated supplier data to the backend
  fetch(`${Endpoint}/api/v1/suppliers/${supplierId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updatedSupplier),
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          alert("Unauthorized. Please log in again.");
          window.location.href = "login.html";
        } else if (response.status === 403) {
          alert(
            "You don't have sufficient permissions to perform this action."
          );
          return;
        } else {
          throw new Error("Failed to update supplier");
        }
      }
      alert("Supplier updated successfully!");
      window.location.href = "suppliers.html";
    })
    .catch((error) => {
      console.error("Error updating supplier:", error);
      alert("Failed to update supplier. Please try again later.");
    });
}
