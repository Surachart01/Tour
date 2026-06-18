document.addEventListener("DOMContentLoaded", function () {
  console.log("Profile.js loaded - DOMContentLoaded event fired");
  
  // Authentication and setup
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username") || "Guest";
  let userID = localStorage.getItem("userId") || localStorage.getItem("user_id"); // Try to get numeric ID first

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  if (!username || username === "Guest") {
    alert("Username not found. Please log in again.");
    window.location.href = "login.html";
    return;
  }

  // Set profile info in sidebar
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;

      // Control Panel visibility is now handled by common/role-permissions.js

  // Global variables
  let profileData = {};
  let subscriptionData = {};
  let usageData = {};
  let bankData = {};
  let countryRequirements = {};
  let currentUserData = {};

  // Initialize profile page
  initializeProfile();

  // Event listeners
  setupEventListeners();

  /**
   * Resolve the user ID from localStorage or the URL
   */
  async function resolveUserID() {
    // Try to get user ID from URL first
    const urlParams = new URLSearchParams(window.location.search);
    const idParam = urlParams.get('id');
    
    if (idParam) {
      userID = idParam;
      console.log("User ID resolved from URL:", userID);
      return userID;
    }
    
    // Try to get user ID from localStorage with multiple possible keys
    const possibleKeys = ["userId", "user_id", "id", "userID"];
    console.log("Searching for user ID in localStorage. Available keys:", Object.keys(localStorage));
    
    for (const key of possibleKeys) {
      const storedID = localStorage.getItem(key);
    if (storedID) {
      userID = storedID;
        console.log(`User ID resolved from localStorage (${key}):`, userID);
        return userID;
      }
    }

    // If we still don't have a user ID, try to get current user info
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      // Use the recommended /api/v1/users/me endpoint
      const response = await fetch(`${Endpoint}/api/v1/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch current user: ${response.status}`);
      }
      
      const userData = await response.json();
      console.log("API response for user data:", userData);
      
      // Try multiple possible user ID fields
      const possibleUserIdFields = ['id', 'user_id', 'userId', 'userID'];
      let foundUserId = null;
      
      for (const field of possibleUserIdFields) {
        if (userData && userData[field]) {
          foundUserId = userData[field];
          break;
        }
      }
      
      if (!foundUserId) {
        console.error("User ID not found in API response. Available fields:", Object.keys(userData || {}));
        throw new Error("User ID not found in response");
      }
      
      userID = foundUserId;
      console.log("User ID resolved from current user API:", userID);
      
      // Save for future use
      localStorage.setItem("userId", userID);
      
      return userID;
    } catch (error) {
      console.error("Error resolving user ID:", error);
      throw new Error("Could not determine user ID. Please try logging in again.");
    }
  }

  /**
   * Ensure userID is available - should already be resolved during initialization
   * This is a synchronous function since userID should be resolved at page load
   */
  function ensureUserID() {
    if (!userID) {
      // This should not happen if initialization worked correctly
      console.error("UserID is not available. This indicates an initialization problem.");
      throw new Error("User ID not available. Please refresh the page and try again.");
    }
    
    return userID;
  }

  /**
   * Initialize profile page with data
   */
  async function initializeProfile() {
    try {
      showLoadingState("Loading profile data...");
      
      // First, resolve the user ID (will use localStorage if available, otherwise API)
      await resolveUserID();
      console.log("User ID resolved and ready for API calls:", userID);
      
      // Use the recommended /api/v1/users/me endpoint to get both user and profile data
      const userData = await loadCurrentUserData();
      
      // Store user data globally for use in header and other functions
      currentUserData = userData;
      
      // Log organization ID for debugging
      console.log("User data from /me endpoint:", {
        user_id: userData.id,
        organization_id: userData.organization_id,
        profile_organization_id: userData.profile?.organization_id
      });
      
      if (!userData.organization_id && !userData.profile?.organization_id) {
        console.warn("No organization_id found in user data - organization features may not work");
      }
      
      // Extract profile data from the user response
      if (userData && userData.profile) {
        profileData = userData.profile;
        
        console.log("Profile data loaded from /me endpoint:", profileData);
        
        // Load additional data in parallel (usage data is already in currentUserData.usage_dashboard)
        const [subscriptionResult, bankResult, countryReqResult] = await Promise.allSettled([
          loadSubscriptionData(),
          loadBankData(),
          loadCountryRequirements()
        ]);
        
        // Process results
        if (subscriptionResult.status === 'fulfilled') {
          subscriptionData = subscriptionResult.value;
          console.log("Subscription data loaded:", subscriptionData);
        } else {
          console.error("Failed to load subscription data:", subscriptionResult.reason);
        }
        
        // Usage data is now available in currentUserData.usage_dashboard
        console.log("Usage data available in usage_dashboard:", currentUserData?.usage_dashboard);
        
        if (bankResult.status === 'fulfilled') {
          bankData = bankResult.value;
          console.log("Bank data loaded:", bankData);
        } else {
          console.error("Failed to load bank data:", bankResult.reason);
        }
        
        // Initialize user hierarchy if available
        if (window.UserHierarchy && typeof window.UserHierarchy.initialize === 'function') {
          try {
            await window.UserHierarchy.initialize(userData, profileData);
            await loadOrganizationUsers();
          } catch (error) {
            console.error("Error initializing user hierarchy:", error);
          }
        }
        
        // Initialize bank security if available
        if (window.BankSecurity && typeof window.BankSecurity.initialize === 'function') {
          try {
            window.BankSecurity.initialize();
          } catch (error) {
            console.error("Error initializing bank security:", error);
          }
        }
        
        // Update UI with all data
        updateProfileUI(profileData);
        configureUIForUserType();
        
        hideLoadingState();
      } else {
        // If profile not included in /me response, try to load it separately
        console.log("Profile data not found in /me response, loading separately");
        
        try {
          profileData = await loadProfileData();
          
          // Load additional data in parallel (usage data is already in currentUserData.usage_dashboard)
          const [subscriptionResult, bankResult, countryReqResult] = await Promise.allSettled([
            loadSubscriptionData(),
            loadBankData(),
            loadCountryRequirements()
          ]);
          
          // Update UI with all data
          updateProfileUI(profileData);
          configureUIForUserType();
          
          hideLoadingState();
        } catch (profileError) {
          console.error("Error loading profile data:", profileError);
          throw profileError;
        }
      }
    } catch (error) {
      console.error("Error initializing profile:", error);
      hideLoadingState();
      alert(`Failed to load profile data. Please refresh the page. (${error.message})`);
    }
  }
  
  /**
   * Load current user data with profile included
   * Uses the recommended /api/v1/users/me endpoint that returns both user and profile data
   */
  async function loadCurrentUserData() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      console.log("Loading current user data from /api/v1/users/me endpoint");
      
      const response = await fetch(`${Endpoint}/api/v1/users/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch current user: ${response.status}`);
      }
      
      const userData = await response.json();
      console.log("Current user data loaded:", userData);
      
      // Save user ID for future use if not already in localStorage
      if (userData.id && (!localStorage.getItem("userId") && !localStorage.getItem("user_id"))) {
        localStorage.setItem("userId", userData.id);
        userID = userData.id;
      }
      
      // If profile is not included in the response, we'll need to fetch it separately
      if (!userData.profile) {
        console.log("Profile not included in /me response, will fetch separately");
      } else {
        console.log("Profile data included in /me response");
      }
      
      return userData;
    } catch (error) {
      console.error("Error loading current user data:", error);
      throw error;
    }
  }

  /**
   * Load user geography settings including primary currency and accessible countries
   */
  async function loadUserGeography() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      console.log("Loading user geography settings for user ID:", resolvedUserID);
      
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}/geography`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user geography: ${response.status}`);
      }
      
      const geographyData = await response.json();
      console.log("User geography data loaded:", geographyData);
      
      return geographyData;
    } catch (error) {
      console.error("Error loading user geography:", error);
      return null; // Return null instead of throwing to avoid breaking profile load
    }
  }

  /**
   * Load organization's serviceable countries (Admin only)
   */
  async function loadOrganizationCountries(organizationId) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      console.log("Loading organization serviceable countries");
      
      const response = await fetch(`${Endpoint}/api/v1/organizations/${organizationId}/service-countries`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          console.log("User not authorized to view organization countries");
          return null;
        }
        throw new Error(`Failed to fetch organization countries: ${response.status}`);
      }
      
      const orgCountriesData = await response.json();
      console.log("Organization countries data loaded:", orgCountriesData);
      
      return orgCountriesData;
    } catch (error) {
      console.error("Error loading organization countries:", error);
      return null;
    }
  }

  /**
   * Load all available countries for selection (authentication required)
   * Falls back to popular countries list if API doesn't provide enough options
   */
  async function loadAvailableCountries() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      console.log("Loading available countries");
      
      const response = await fetch(`${Endpoint}/api/v1/locations/countries`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        console.log("API countries not available, using fallback list");
        return getPopularCountriesList();
      }
      
      const countriesData = await response.json();
      console.log("Available countries loaded:", countriesData);
      
      // If API returns limited countries (less than 10), supplement with popular countries
      const apiCountries = countriesData.countries || [];
      if (apiCountries.length < 10) {
        console.log(`API returned only ${apiCountries.length} countries, supplementing with popular countries`);
        return getPopularCountriesList();
      }
      
      return apiCountries;
    } catch (error) {
      console.error("Error loading available countries, using fallback list:", error);
      return getPopularCountriesList();
    }
  }

  /**
   * Get a comprehensive list of popular countries for travel operations
   * This ensures admins have plenty of options to choose from when setting up service countries
   */
  function getPopularCountriesList() {
    return [
      // Asian Countries (Popular for travel)
      { code: "TH", name: "Thailand", currency_code: "THB", region: "Asia", popular: true },
      { code: "SG", name: "Singapore", currency_code: "SGD", region: "Asia", popular: true },
      { code: "MY", name: "Malaysia", currency_code: "MYR", region: "Asia", popular: true },
      { code: "VN", name: "Vietnam", currency_code: "VND", region: "Asia", popular: true },
      { code: "IN", name: "India", currency_code: "INR", region: "Asia", popular: true },
      { code: "JP", name: "Japan", currency_code: "JPY", region: "Asia", popular: true },
      { code: "CN", name: "China", currency_code: "CNY", region: "Asia", popular: true },
      { code: "KR", name: "South Korea", currency_code: "KRW", region: "Asia", popular: true },
      { code: "ID", name: "Indonesia", currency_code: "IDR", region: "Asia", popular: true },
      { code: "PH", name: "Philippines", currency_code: "PHP", region: "Asia", popular: true },
      { code: "HK", name: "Hong Kong", currency_code: "HKD", region: "Asia", popular: true },
      { code: "TW", name: "Taiwan", currency_code: "TWD", region: "Asia", popular: true },
      
      // Western Countries
      { code: "US", name: "United States", currency_code: "USD", region: "North America", popular: true },
      { code: "GB", name: "United Kingdom", currency_code: "GBP", region: "Europe", popular: true },
      { code: "AU", name: "Australia", currency_code: "AUD", region: "Oceania", popular: true },
      { code: "CA", name: "Canada", currency_code: "CAD", region: "North America", popular: true },
      { code: "NZ", name: "New Zealand", currency_code: "NZD", region: "Oceania", popular: true },
      
      // European Countries
      { code: "DE", name: "Germany", currency_code: "EUR", region: "Europe", popular: true },
      { code: "FR", name: "France", currency_code: "EUR", region: "Europe", popular: true },
      { code: "IT", name: "Italy", currency_code: "EUR", region: "Europe", popular: true },
      { code: "ES", name: "Spain", currency_code: "EUR", region: "Europe", popular: true },
      { code: "CH", name: "Switzerland", currency_code: "CHF", region: "Europe", popular: true },
      { code: "NL", name: "Netherlands", currency_code: "EUR", region: "Europe", popular: true },
      { code: "AT", name: "Austria", currency_code: "EUR", region: "Europe", popular: true },
      { code: "BE", name: "Belgium", currency_code: "EUR", region: "Europe", popular: true },
      
      // Middle East & Others
      { code: "AE", name: "United Arab Emirates", currency_code: "AED", region: "Middle East", popular: true },
      { code: "SA", name: "Saudi Arabia", currency_code: "SAR", region: "Middle East", popular: true },
      { code: "QA", name: "Qatar", currency_code: "QAR", region: "Middle East", popular: true },
      
      // South America
      { code: "BR", name: "Brazil", currency_code: "BRL", region: "South America", popular: true },
      { code: "AR", name: "Argentina", currency_code: "ARS", region: "South America", popular: true },
      
      // Africa
      { code: "ZA", name: "South Africa", currency_code: "ZAR", region: "Africa", popular: true },
      { code: "EG", name: "Egypt", currency_code: "EGP", region: "Africa", popular: true }
    ];
  }

  /**
   * Update user's primary currency
   */
  async function updatePrimaryCurrency(currency) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      console.log("Updating primary currency to:", currency, "for user ID:", resolvedUserID);
      
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}/currency`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          primary_currency: currency
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update primary currency: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Primary currency updated:", result);
      
      return result;
    } catch (error) {
      console.error("Error updating primary currency:", error);
      throw error;
    }
  }

  /**
   * Update organization's serviceable countries (Admin only)
   */
  async function updateOrganizationCountries(organizationId, countries, primaryCountry) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      console.log("Updating organization serviceable countries:", { countries, primaryCountry });
      
      const response = await fetch(`${Endpoint}/api/v1/organizations/${organizationId}/service-countries`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countries: countries,
          primary_country: primaryCountry
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update organization countries: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("Organization countries updated:", result);
      
      return result;
    } catch (error) {
      console.error("Error updating organization countries:", error);
      throw error;
    }
  }

  /**
   * Get the organization ID from user data
   * @returns {number|null} The organization ID or null if not found
   */
  function getOrganizationId() {
    const orgId = currentUserData?.organization_id || profileData?.organization_id;
    
    if (!orgId) {
      console.error("Organization ID not found in user data:", {
        currentUserData: currentUserData,
        profileData: profileData
      });
      return null;
    }
    
    return orgId;
  }

  /**
   * Configure UI elements based on user type (SaaS vs Enterprise)
   */
  function configureUIForUserType() {
    // Check if we're dealing with an enterprise user or a SaaS user
    const isEnterprise = !subscriptionData || subscriptionData.subscription_tier === "enterprise" || !subscriptionData.subscription_tier;
    const isSaaSUser = !isEnterprise;
    
    console.log(`Configuring UI for user type: ${isEnterprise ? 'Enterprise' : 'SaaS'}`);
    
    // Get tab elements
    const subscriptionTab = document.getElementById("subscription-tab");
    const billingTab = document.getElementById("billing-tab");
    const organizationTab = document.getElementById("organization-tab");
    
    // Always show the subscription tab for all user types
    if (subscriptionTab) {
      subscriptionTab.style.display = "block"; // Always visible
      console.log("Showing subscription tab for all users");
    }
    
    // Show billing tab for all users (both SaaS and Enterprise need billing info)
    if (billingTab) {
      billingTab.style.display = "block";
      console.log("Showing billing tab for all users");
    }
    
    // Show/hide organization tab based on user role
    if (organizationTab) {
      const canManageUsers = isAdmin() || isSuperAdmin();
        
      organizationTab.style.display = canManageUsers ? "block" : "none";
      if (canManageUsers) {
        console.log("Showing organization tab for admin user");
      } else {
        console.log("Hiding organization tab for non-admin user");
      }
    }
    
    // Show appropriate alerts based on user type
    updateAlerts();
  }
  
  /**
   * Check if user is an admin
   * @returns {boolean} - True if admin
   */
  function isAdmin() {
    return profileData && 
          (profileData.user_type === "admin" || 
          (localStorage.getItem("role") === "admin"));
  }
  
  /**
   * Check if user is a super admin
   * @returns {boolean} - True if super admin
   */
  function isSuperAdmin() {
    return profileData && 
          (profileData.user_type === "super_admin" || 
          profileData.is_super_admin === true);
  }

  // API calls using new endpoints with auto-creation
  /**
   * Load user profile data
   * @returns {Object} - Profile data
   */
  async function loadProfileData() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      console.log("Loading profile data for user ID:", resolvedUserID);

      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Profile data not found. Please contact support.");
        }
        throw new Error(`Failed to fetch profile data: ${response.status}`);
      }

      const data = await response.json();
      console.log("Profile data loaded:", data);
      
      // Save data in global variable
      profileData = data;
      
      // Return profile data
      return data;
    } catch (error) {
      console.error("Error loading profile data:", error);
      throw new Error(`Failed to load profile data: ${error.message}`);
    }
  }

  // Find the loadSubscriptionData function and update it to handle empty data
  async function loadSubscriptionData() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}/subscription`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("Subscription endpoint not found, using default data");
          // Return default subscription data
          return {
            subscription_tier: "enterprise", // Default to enterprise for existing users
            subscription_status: "active",
            trial_end: null,
            next_billing_date: null,
            billing_cycle: "monthly",
            usage: {},
            limits: {},
            features: {
              api_access: true,
              custom_reports: true,
              export: true,
              integrations: true,
              priority_support: true,
              white_label: true
            }
          };
        }
        throw new Error(`Failed to fetch subscription data: ${response.status}`);
      }

      let data = await response.json();
      console.log("Raw subscription data from API:", data);
      
      // Handle duplicate subscription_tier field (backend bug)
      // The second one is likely supposed to be subscription_status
      if (data.hasOwnProperty('subscription_tier') && typeof data['subscription_tier'] === 'string' && 
          data.hasOwnProperty('subscription_status') === false) {
        // Look for duplicate subscription_tier which should be status
        const keys = Object.keys(data);
        const tierKeys = keys.filter(key => key === 'subscription_tier');
        
        if (tierKeys.length > 1) {
          console.warn("Backend returned duplicate subscription_tier field, treating second one as subscription_status");
          
          // Extract values for subscription_tier and what should be subscription_status
          const values = tierKeys.map(key => data[key]);
          
          // Clean up the object by removing the duplicate
          const tier = values[0];
          const status = values[1];
          
          // Fix the data object
          const fixedData = {...data};
          fixedData.subscription_tier = tier;
          fixedData.subscription_status = status;
          
          console.log("Fixed subscription data:", fixedData);
          data = fixedData;
        }
      }
      
      // Set default values for empty subscription data
      if (!data.subscription_tier || data.subscription_tier === "") {
        data.subscription_tier = "enterprise"; // Default to enterprise for existing users
      }
      
      if (!data.subscription_status || data.subscription_status === "") {
        data.subscription_status = "active";
      }
      
      if (!data.features) {
        data.features = {};
      }
      
      // Ensure features object has all expected properties
      const defaultFeatures = {
        api_access: true,
        custom_reports: true,
        export: true,
        integrations: true,
        priority_support: true,
        white_label: true
      };
      
      data.features = { ...defaultFeatures, ...data.features };
      
      // Ensure usage and limits objects exist
      if (!data.usage) data.usage = {};
      if (!data.limits) data.limits = {};
      
      return data;
    } catch (error) {
      console.error("Error loading subscription data:", error);
      // Return default subscription data
      return {
        subscription_tier: "enterprise", // Default to enterprise for existing users
        subscription_status: "active",
        trial_end: null,
        next_billing_date: null,
        billing_cycle: "monthly",
        usage: {},
        limits: {},
        features: {
          api_access: true,
          custom_reports: true,
          export: true,
          integrations: true,
          priority_support: true,
          white_label: true
        }
      };
    }
  }

  // DEPRECATED: loadUsageData function - now using usage_dashboard from /me endpoint
  // Keeping for backward compatibility but no longer called
  async function loadUsageData() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      
      // Try to fetch detailed usage with alerts first
      try {
        const alertsResponse = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}/usage-alerts`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        
        if (alertsResponse.ok) {
          const alerts = await alertsResponse.json();
          console.log("Detailed usage alerts loaded:", alerts);
          
          // Process the alerts to extract usage metrics
          if (alerts && alerts.length > 0) {
            // Convert alerts to usage metrics format
            const metrics = {};
            const warnings = [];
            
            alerts.forEach(alert => {
              // Add to metrics if not already present
              if (!metrics[alert.metric]) {
                // Handle -1 limits in the metrics
                const limit = alert.limit === -1 ? "Unlimited" : alert.limit;
                
                metrics[alert.metric] = {
                  current: alert.current,
                  limit: limit,
                  percentage: alert.percentage
                };
              }
              
              // Add to warnings
              warnings.push({
                type: alert.severity === 'critical' ? 'critical' : 'warning',
                message: alert.message,
                action: alert.recommendation,
                urgency: alert.severity
              });
            });
            
            return {
              current_period: new Date().toISOString().slice(0, 7),
              metrics: metrics,
              warnings: warnings,
              has_alerts: true
            };
          }
        }
      } catch (alertsError) {
        console.log("Usage alerts endpoint not available, falling back to basic usage endpoint", alertsError);
        // Continue to fallback endpoint
      }

      // Fall back to original usage endpoint
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}/usage`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("Usage endpoint not found, using default data");
          // Return default usage data
          return {
            current_period: new Date().toISOString().slice(0, 7),
            metrics: {
              bookings: { current: 0, limit: 1000 },
              quotations: { current: 0, limit: 1000 },
              users: { current: 1, limit: 10 },
              storage_gb: { current: 0.1, limit: 5 }
            },
            warnings: []
          };
        }
        throw new Error(`Failed to fetch usage data: ${response.status}`);
      }

      const data = await response.json();
      
      // Set default values for empty usage data
      if (!data.metrics) {
        data.metrics = {};
      }
      
      // Add default metrics if they don't exist
      const defaultMetrics = {
        bookings: { current: 0, limit: 1000 },
        quotations: { current: 0, limit: 1000 },
        users: { current: 1, limit: 10 },
        storage_gb: { current: 0.1, limit: 5 }
      };
      
      // Ensure all metrics exist with at least default values
      Object.keys(defaultMetrics).forEach(metric => {
        if (!data.metrics[metric]) {
          data.metrics[metric] = defaultMetrics[metric];
        } else if (!data.metrics[metric].limit) {
          // If limit is missing, add default limit
          data.metrics[metric].limit = defaultMetrics[metric].limit;
        } else if (data.metrics[metric].limit === -1) {
          // If limit is -1, set to "Unlimited"
          data.metrics[metric].limit = "Unlimited";
        }
      });
      
      if (!data.warnings) data.warnings = [];
      
      return data;
    } catch (error) {
      console.error("Error loading usage data:", error);
      // Return default usage data
      return {
        current_period: new Date().toISOString().slice(0, 7),
        metrics: {
          bookings: { current: 0, limit: 1000 },
          quotations: { current: 0, limit: 1000 },
          users: { current: 1, limit: 10 },
          storage_gb: { current: 0.1, limit: 5 }
        },
        warnings: []
      };
    }
  }

  async function loadBankData() {
    try {
      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      console.log("Loading bank data for user ID:", resolvedUserID);
      
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}/bank-info`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log("Bank data not found for user, starting with empty data");
          bankData = { has_bank_info: false };
          return bankData;
        }
        throw new Error(`Failed to fetch bank data: ${response.status} ${response.statusText}`);
      }

      bankData = await response.json();
      console.log("Bank data loaded successfully:", bankData);
      return bankData;
    } catch (error) {
      console.error("Error loading bank data:", error);
      // Fall back to empty bank data
      bankData = { has_bank_info: false };
    }
  }

  async function loadCountryRequirements() {
    try {
      // Skip if we don't have a country in the profile
      if (!profileData.country) {
        console.log("No country specified in profile, skipping country requirements");
        countryRequirements = {};
        return;
      }

      console.log(`Loading country requirements for: ${profileData.country}`);
      
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/countries/requirements?country=${profileData.country}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No requirements found for country: ${profileData.country}`);
          countryRequirements = {};
          return;
        }
        throw new Error(`Failed to fetch country requirements: ${response.status}`);
      }

      countryRequirements = await response.json();
      console.log("Country requirements loaded:", countryRequirements);
      return countryRequirements;
    } catch (error) {
      console.error("Error loading country requirements:", error);
      // This is not critical, so we'll continue without it
      countryRequirements = {};
    }
  }

  // User type detection functions
  function isEnterpriseUser(profile = profileData) {
    // Check profile data first
    if (profile.subscription_tier === 'enterprise') {
      return true;
    }
    
    // Fallback: check subscriptionData since that's where the backend puts subscription_tier
    if (subscriptionData && subscriptionData.subscription_tier === 'enterprise') {
      return true;
    }
    
    return false;
  }

  function isSaaSUser(profile = profileData) {
    console.log("isSaaSUser() called with profile:", profile);
    
    // All SaaS tiers (not enterprise)
    const saasTiers = ['starter', 'trial', 'free_agent', 'pro', 'business'];
    
    // Check profile data first
    if (profile && profile.subscription_tier) {
      const tier = profile.subscription_tier.toLowerCase();
      console.log("Checking profile tier:", tier);
      if (saasTiers.includes(tier)) {
        console.log("User is SaaS based on profile tier");
      return true;
      }
    }
    
    // Fallback: check subscriptionData
    if (subscriptionData && subscriptionData.subscription_tier) {
      const tier = subscriptionData.subscription_tier.toLowerCase();
      console.log("Checking subscription data tier:", tier);
      if (saasTiers.includes(tier)) {
        console.log("User is SaaS based on subscription data tier");
      return true;
      }
    }
    
    // Check currentUserData as another fallback
    if (currentUserData && currentUserData.subscription_tier) {
      const tier = currentUserData.subscription_tier.toLowerCase();
      console.log("Checking current user data tier:", tier);
      if (saasTiers.includes(tier)) {
        console.log("User is SaaS based on current user data tier");
        return true;
      }
    }
    
    console.log("User is not SaaS - defaulting to false");
    return false;
  }

  function isTrialUser(profile = profileData) {
    return profile.subscription_status === 'trial';
  }

  /**
   * Check if user has access to a specific feature
   * @param {string} featureName - Name of the feature to check
   * @returns {boolean} - Whether user has access to the feature
   */
  function checkFeatureAccess(featureName) {
    if (!profileData || !subscriptionData) return false;
    
    // Check if user is enterprise (has all features)
    if (isEnterpriseUser()) return true;
    
    // Check specific feature flags from subscription data
    if (subscriptionData.features && subscriptionData.features[featureName] !== undefined) {
      return subscriptionData.features[featureName];
    }
    
    // Fallback to legacy checks
    switch(featureName) {
      case 'api_access':
        return profileData.api_access_enabled || false;
      case 'custom_reports':
        return profileData.custom_reports_enabled || false;
      case 'white_label':
        return profileData.white_label_enabled || false;
      case 'priority_support':
        return profileData.priority_support || false;
      case 'integrations':
        return profileData.integrations_enabled || false;
      case 'export':
        return profileData.export_enabled || false;
      case 'auto_renew':
        return profileData.feature_flags?.auto_renew || false;
      default:
        return false;
    }
  }

  /**
   * Update profile header with user information
   */
  function updateProfileHeader() {
    if (!profileData) return;
    
    // Update name and username
    const profileName = document.getElementById("profileName");
    const navProfileName = document.getElementById("navProfileName");
    const profileDisplayName = document.getElementById("profileDisplayName");
    
    // Use actual username from localStorage as primary display name in header
    // This ensures we show the logged-in username rather than contact person
    const actualUsername = localStorage.getItem("username") || "Guest";
    
    // Set the display name (username) in the header elements
    if (profileName) profileName.textContent = actualUsername;
    if (navProfileName) navProfileName.textContent = actualUsername;
    
    // For the main profile display name, we can show more information
    // Add contact person name as a subtitle if available
    if (profileDisplayName) {
      profileDisplayName.textContent = actualUsername;
      
      // If contact person exists and is different from username, add it as description
      if (profileData.contact_person_name && profileData.contact_person_name !== actualUsername) {
        const subtitle = document.getElementById("profileSubtitle") || 
                        document.createElement("small");
        subtitle.id = "profileSubtitle";
        subtitle.className = "d-block text-light mt-1";
        subtitle.textContent = `Contact: ${profileData.contact_person_name}`;
        
        // Add the subtitle after the display name if it doesn't exist yet
        if (!document.getElementById("profileSubtitle")) {
          profileDisplayName.parentNode.insertBefore(subtitle, profileDisplayName.nextSibling);
        }
      }
    }
    
    // Update company name if available (separate from username)
    const companyNameDisplay = document.getElementById("headerCompanyName");
    if (companyNameDisplay && profileData.company_name) {
      companyNameDisplay.textContent = profileData.company_name;
    }
    
    // Update email
    const profileEmail = document.getElementById("profileEmail");
    if (profileEmail) {
      // Priority: actual user email from /users/me, then company email, then agent email
      profileEmail.textContent = currentUserData?.email || 
                              profileData.company_email || 
                                profileData.agent?.email || 
                                "No email provided";
    }
    
    // Update subscription badge
    const subscriptionBadge = document.getElementById("subscriptionBadge");
    if (subscriptionBadge) {
      const tier = subscriptionData?.subscription_tier || "enterprise";
      const formattedTier = tier.charAt(0).toUpperCase() + tier.slice(1);
      
      subscriptionBadge.textContent = formattedTier;
      subscriptionBadge.className = `subscription-badge subscription-${tier}`;
    }
    
    // Update member since date
    const memberSince = document.getElementById("memberSince");
    if (memberSince) {
      const createdAt = profileData.created_at;
      if (createdAt) {
        memberSince.textContent = new Date(createdAt).toLocaleDateString();
      } else {
        memberSince.textContent = "N/A";
      }
    }
  }

  function addTrialCountdown() {
    if (!isTrialUser() || !profileData.trial_end) return;

    const daysLeft = Math.ceil(
      (new Date(profileData.trial_end) - new Date()) / (1000 * 60 * 60 * 24)
    );

    if (daysLeft > 0) {
      const existingBanner = document.querySelector('.trial-banner');
      if (existingBanner) existingBanner.remove();

      const banner = document.createElement('div');
      banner.className = `trial-banner ${daysLeft <= 3 ? 'urgent' : ''}`;
      banner.innerHTML = `
        <div class="d-flex justify-content-between align-items-center p-3 mb-3 rounded" style="background-color: ${daysLeft <= 3 ? '#fff3cd' : '#d1ecf1'}; border: 1px solid ${daysLeft <= 3 ? '#ffeaa7' : '#bee5eb'};">
          <span><i class="fa fa-clock-o"></i> ${daysLeft} days left in trial</span>
          <button class="btn btn-sm ${daysLeft <= 3 ? 'btn-warning' : 'btn-info'}" onclick="showUpgradeModal()">
            Upgrade Now
          </button>
        </div>
      `;
      
      document.querySelector('.profile-header').appendChild(banner);
    }
  }

  /**
   * Calculate profile completeness based on filled fields
   * @returns {number} - Completeness percentage (0-100)
   */
  function calculateProfileCompleteness() {
    if (!profileData) return 0;
    
    // If the backend provides a completeness score, use it
    if (profileData.profile_completeness !== undefined) {
      // Ensure it's between 0-100
      return Math.min(100, Math.max(0, profileData.profile_completeness));
    }
    
    // Otherwise calculate it ourselves
    // Define required fields in different categories
    const requiredFields = {
      basic: ['company_name', 'contact_person_name', 'company_email', 'company_phone', 'address', 'city', 'country'],
      tax: ['tax_id', 'vat_number', 'business_reg_number'],
      bank: ['bank_name', 'bank_account_name', 'bank_account_no'],
      billing: ['billing_name', 'billing_email', 'billing_address']
    };
    
    // Count filled fields in each category
    const fieldsCount = {
      basic: 0,
      tax: 0,
      bank: 0,
      billing: 0
    };
    
    // Calculate filled fields in each category
    Object.keys(requiredFields).forEach(category => {
      requiredFields[category].forEach(field => {
        const value = category === 'bank' ? (bankData?.[field] || '') : (profileData?.[field] || '');
        if (value && value.toString().trim() !== '') {
          fieldsCount[category]++;
        }
      });
    });
    
    // Calculate category completion percentages
    const categoryCompleteness = {
      basic: (fieldsCount.basic / requiredFields.basic.length) * 100,
      tax: (fieldsCount.tax / requiredFields.tax.length) * 100,
      bank: (fieldsCount.bank / requiredFields.bank.length) * 100,
      billing: (fieldsCount.billing / requiredFields.billing.length) * 100
    };
    
    // Apply weights to each category (adjust as needed)
    const weights = {
      basic: 0.35,
      tax: 0.25,
      bank: 0.25,
      billing: 0.15
    };
    
    // Calculate weighted completeness
    const weightedCompleteness = 
      (categoryCompleteness.basic * weights.basic) + 
      (categoryCompleteness.tax * weights.tax) + 
      (categoryCompleteness.bank * weights.bank) + 
      (categoryCompleteness.billing * weights.billing);
    
    return Math.min(100, Math.max(0, weightedCompleteness));
  }

  /**
   * Update profile completeness UI
   * @param {Object} profileData - Profile data
   */
  function updateCompleteness(profileData) {
    if (!profileData) return;
    
    const completenessProgress = document.getElementById("completenessProgress");
    const completenessText = document.getElementById("completenessText");
    
    if (!completenessProgress || !completenessText) return;
    
    // Calculate completeness percentage
    let completeness = profileData.profile_completeness || calculateProfileCompleteness();
    
    // If completeness is provided as a decimal (0-1), convert to percentage
    if (completeness <= 1) {
      completeness = completeness * 100;
    }
    
    // Ensure it's between 0-100
    completeness = Math.max(0, Math.min(100, completeness));
    
    // Update UI
    completenessProgress.style.width = `${completeness}%`;
    completenessText.textContent = `${Math.round(completeness)}% Complete`;
    
    // Update color based on completeness
    if (completeness < 50) {
      completenessProgress.style.background = 'linear-gradient(90deg, #ef4444 0%, #f87171 100%)';
    } else if (completeness < 80) {
      completenessProgress.style.background = 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)';
    } else {
      completenessProgress.style.background = 'linear-gradient(90deg, #10b981 0%, #34d399 100%)';
    }
  }

  /**
   * Update overview tab with profile data and metrics
   */
  function updateOverviewTab() {
    if (!profileData) return;
    
    // Update profile completeness
    updateCompleteness(profileData);
    
    // Update features list
    updateFeaturesList();
    
    // Update profile steps
    updateProfileSteps();
    
    // Update overview metrics cards using usage_dashboard data
    updateOverviewMetrics();
    
    // Add usage statistics to overview
    updateUsageStatistics();
    
    // Load usage alerts (now uses usage_dashboard data instead of API call)
    loadUsageAlerts();
  }

  /**
   * Update the overview metrics cards using usage_dashboard data
   */
  function updateOverviewMetrics() {
    const usageDashboard = currentUserData?.usage_dashboard;
    if (!usageDashboard) {
      console.log("No usage dashboard data available for overview metrics");
      return;
    }

    const currentUsage = usageDashboard.current_usage || {};
    const limits = usageDashboard.subscription_limits || {};

    // Update trips/quotations count
    const tripsCountEl = document.getElementById("tripsCount");
    const tripsLimitEl = document.getElementById("tripsLimit");
    const tripsUsageEl = document.getElementById("tripsUsage");
    if (tripsCountEl && tripsLimitEl && tripsUsageEl) {
      const quotations = currentUsage.quotations || 0;
      const quotationsLimit = limits.quotations === -1 ? "Unlimited" : limits.quotations || "Unlimited";
      
      tripsCountEl.textContent = quotations;
      tripsLimitEl.textContent = `${quotations} / ${quotationsLimit} limit`;
      
      // Calculate percentage for progress bar
      if (quotationsLimit !== "Unlimited" && quotationsLimit > 0) {
        const percentage = Math.min((quotations / quotationsLimit) * 100, 100);
        if (tripsUsageEl) {
          tripsUsageEl.style.width = `${percentage}%`;
          updateUsageBar("tripsUsage", percentage);
        }
      } else {
        if (tripsUsageEl) {
          tripsUsageEl.style.width = "0%";
        }
      }
    }

    // Update users count
    const usersCountEl = document.getElementById("usersCount");
    const usersLimitEl = document.getElementById("usersLimit");
    const usersUsageEl = document.getElementById("usersUsage");
    if (usersCountEl && usersLimitEl && usersUsageEl) {
      const users = currentUsage.users || 0;
      const usersLimit = limits.users === -1 ? "Unlimited" : limits.users || "Unlimited";
      
      usersCountEl.textContent = users;
      usersLimitEl.textContent = `${users} / ${usersLimit} limit`;
      
      // Calculate percentage for progress bar
      if (usersLimit !== "Unlimited" && usersLimit > 0) {
        const percentage = Math.min((users / usersLimit) * 100, 100);
        if (usersUsageEl) {
          usersUsageEl.style.width = `${percentage}%`;
          updateUsageBar("usersUsage", percentage);
        }
      } else {
        if (usersUsageEl) {
          usersUsageEl.style.width = "0%";
        }
      }
    }

    // Update storage count
    const storageCountEl = document.getElementById("storageCount");
    const storageLimitEl = document.getElementById("storageLimit");
    const storageUsageEl = document.getElementById("storageUsage");
    if (storageCountEl && storageLimitEl && storageUsageEl) {
      const storageMB = currentUsage.storage_mb || 0;
      const storageLimitMB = limits.storage_mb === -1 ? "Unlimited" : limits.storage_mb || "Unlimited";
      
      storageCountEl.textContent = `${storageMB} MB`;
      storageLimitEl.textContent = storageLimitMB === "Unlimited" ? 
        `${storageMB} / Unlimited limit` : 
        `${storageMB} / ${storageLimitMB} MB limit`;
      
      // Calculate percentage for progress bar
      if (storageLimitMB !== "Unlimited" && storageLimitMB > 0) {
        const percentage = Math.min((storageMB / storageLimitMB) * 100, 100);
        if (storageUsageEl) {
          storageUsageEl.style.width = `${percentage}%`;
          updateUsageBar("storageUsage", percentage);
        }
      } else {
        if (storageUsageEl) {
          storageUsageEl.style.width = "0%";
        }
      }
    }

    console.log("Overview metrics updated with usage dashboard data:", {
      quotations: currentUsage.quotations,
      users: currentUsage.users,
      storage_mb: currentUsage.storage_mb
    });
  }

  /**
   * Update usage statistics on the overview tab
   */
  function updateUsageStatistics() {
    const usageContainer = document.getElementById("usageStatistics");
    if (!usageContainer) return;
    
    // Clear previous content
    usageContainer.innerHTML = "";
    
    // Use usage_dashboard data from the /me endpoint instead of separate API calls
    const usageDashboard = currentUserData?.usage_dashboard;
    if (!usageDashboard) {
      usageContainer.innerHTML = `<div class="alert alert-info">Usage statistics are not available.</div>`;
      return;
    }
    
    console.log("Using usage dashboard data:", usageDashboard);
    
    // Get current usage and limits from usage_dashboard
    const currentUsage = usageDashboard.current_usage || {};
    const limits = usageDashboard.subscription_limits || {};
    
    // Define metrics to display using usage_dashboard data
    const metrics = [
      { 
        key: 'users', 
        label: 'Users', 
        icon: 'users',
        current: formatLimitValue(currentUsage.users || 0),
        limit: formatLimitValue(limits.users || 'Unlimited')
      },
      { 
        key: 'quotations', 
        label: 'Quotations', 
        icon: 'file-text-o',
        current: formatLimitValue(currentUsage.quotations || 0),
        limit: formatLimitValue(limits.quotations || 'Unlimited')
      },
      { 
        key: 'bookings', 
        label: 'Bookings', 
        icon: 'calendar-check-o',
        current: formatLimitValue(currentUsage.bookings || 0),
        limit: formatLimitValue(limits.bookings || 'Unlimited')
      },
      { 
        key: 'storage_gb', 
        label: 'Storage', 
        icon: 'database',
        current: formatLimitValue((currentUsage.storage_mb || 0) / 1024), // Convert MB to GB
        limit: formatLimitValue((limits.storage_mb && limits.storage_mb !== -1) ? limits.storage_mb / 1024 : 'Unlimited'),
        unit: 'GB'
      }
    ];
    
    // Create HTML for usage metrics
    let html = `
      <div class="card mb-4">
        <div class="card-header">
          <h5 class="card-title mb-0"><i class="fa fa-chart-line"></i> Usage Statistics</h5>
        </div>
        <div class="card-body">
          <div class="row">
    `;
    
    // Add each metric
    metrics.forEach(metric => {
      // Calculate percentage if limit is a number
      let percentage = 0;
      let limitValue = metric.limit;
      
      // Convert back to number if it's not "Unlimited"
      if (limitValue !== "Unlimited") {
        limitValue = Number(limitValue);
      }
      
      if (typeof limitValue === 'number' && limitValue > 0) {
        percentage = Math.min(100, Math.round((metric.current / limitValue) * 100));
      } else {
        percentage = 0; // For unlimited, show empty bar
      }
      
      // Determine color based on percentage
      let colorClass = 'bg-success';
      if (percentage > 90) {
        colorClass = 'bg-danger';
      } else if (percentage > 70) {
        colorClass = 'bg-warning';
      } else if (percentage > 50) {
        colorClass = 'bg-info';
      }
      
      html += `
        <div class="col-md-6 mb-3">
          <div class="usage-metric">
            <div class="d-flex justify-content-between mb-1">
              <div><i class="fa fa-${metric.icon}"></i> ${metric.label}</div>
              <div>${metric.current} / ${metric.limit}${metric.unit ? ' ' + metric.unit : ''}</div>
            </div>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar ${colorClass}" role="progressbar" style="width: ${percentage}%"
                aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
          </div>
        </div>
      `;
    });
    
    html += `
          </div>
        </div>
      </div>
    `;
    
    usageContainer.innerHTML = html;
  }
  
  /**
   * Load usage alerts using data from usage_dashboard (no API call needed)
   */
  function loadUsageAlerts() {
    const alertsContainer = document.getElementById("usageAlerts");
    if (!alertsContainer) return;
    
    try {
      // Use usage_dashboard data instead of separate API call
      const usageDashboard = currentUserData?.usage_dashboard;
      if (!usageDashboard) {
        console.log("No usage dashboard data available for alerts");
        alertsContainer.innerHTML = '';
        return;
      }
      
      // Check for warnings in usage_dashboard
      const warnings = usageDashboard.warnings;
      if (!warnings || warnings.length === 0) {
        console.log("No usage warnings found in dashboard data");
        alertsContainer.innerHTML = '';
        return;
      }
      
      console.log("Usage warnings found:", warnings);
      
      // Sort alerts by severity (critical first)
      warnings.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
      
      // Generate HTML for alerts
      let html = '';
      
      warnings.forEach(alert => {
        const alertClass = alert.severity === 'critical' ? 'alert-danger' : 
                          (alert.severity === 'warning' ? 'alert-warning' : 'alert-info');
        
        const icon = alert.severity === 'critical' ? 'exclamation-triangle' : 
                    (alert.severity === 'warning' ? 'exclamation-circle' : 'info-circle');
        
        html += `
          <div class="alert ${alertClass} d-flex justify-content-between align-items-center">
            <div>
              <i class="fa fa-${icon}"></i> <strong>${alert.message || 'Usage Alert'}</strong>
              ${alert.percentage ? `<div class="small text-muted">${alert.percentage}% of your ${alert.metric || 'usage'} limit used</div>` : ''}
            </div>
            ${alert.recommendation ? `
              <button class="btn btn-sm btn-outline-${alert.severity === 'critical' ? 'danger' : 'primary'}" 
                      onclick="upgradePlan()">
                ${alert.recommendation}
              </button>
            ` : ''}
          </div>
        `;
      });
      
      alertsContainer.innerHTML = html;
      
    } catch (error) {
      console.error("Error loading usage alerts:", error);
      alertsContainer.innerHTML = '';
    }
  }

  /**
   * Update features list based on subscription
   */
  function updateFeaturesList() {
    const featuresList = document.getElementById("featuresList");
    if (!featuresList) return;
    
    // Define features to show based on subscription
    const features = [
      { name: "Create Quotations", key: "export", always: true },
      { name: "Manage Bookings", key: "export", always: true },
      { name: "Track Payments", key: "export", always: true },
      { name: "Custom Reports", key: "custom_reports", tier: "pro" },
      { name: "API Access", key: "api_access", tier: "pro" },
      { name: "Priority Support", key: "priority_support", tier: "pro" },
      { name: "White Label", key: "white_label", tier: "enterprise" },
    ];
    
    // Check if we have subscription data with features
    const hasFeatures = subscriptionData && subscriptionData.features;
    const currentTier = (subscriptionData && subscriptionData.subscription_tier) || "enterprise";
    
    // Create HTML for features list
    const featuresHTML = features.map(feature => {
      // Check if feature is enabled or always available
      const isEnabled = feature.always || 
        (hasFeatures && subscriptionData.features[feature.key]) || 
        // Check based on tier
        (feature.tier && getTierLevel(currentTier) >= getTierLevel(feature.tier));
      
      return `
        <li>
          <i class="fa ${isEnabled ? 'fa-check feature-enabled' : 'fa-times feature-disabled'}"></i>
          ${feature.name}
          ${!isEnabled ? `<span class="badge badge-light">Upgrade</span>` : ''}
        </li>
      `;
    }).join('');
    
    featuresList.innerHTML = featuresHTML;
  }
  
  /**
   * Get numeric level for subscription tier
   * @param {string} tier - Subscription tier
   * @returns {number} - Tier level
   */
  function getTierLevel(tier) {
    const tiers = {
      "starter": 1,
      "pro": 2,
      "business": 3,
      "enterprise": 4
    };
    
    return tiers[tier.toLowerCase()] || 1;
  }

  /**
   * Update profile steps based on completion
   */
  function updateProfileSteps() {
    const profileSteps = document.getElementById("profileSteps");
    if (!profileSteps) return;
    
    // Define the profile completion steps
    const steps = [
      { 
        id: "step-basic", 
        title: "Basic Information", 
        description: "Add your contact information and address",
        icon: "user",
        complete: hasRequiredBasicInfo()
      },
      { 
        id: "step-tax",
        title: "Tax Information",
        description: "Add your tax IDs and registration information",
        icon: "file-text",
        complete: hasRequiredTaxInfo()
      },
      { 
        id: "step-bank", 
        title: "Bank Details", 
        description: "Add your banking information for payments",
        icon: "bank",
        complete: hasRequiredBankInfo()
      },
      {
        id: "step-billing",
        title: "Billing Information",
        description: "Add your billing contact and address",
        icon: "credit-card",
        complete: hasRequiredBillingInfo()
      }
    ];
    
    // Find the first incomplete step (current step)
    const currentStepIndex = steps.findIndex(step => !step.complete);
    
    // Create HTML for steps
    const stepsHTML = steps.map((step, index) => {
      // Determine step status
      let status = "completed";
      if (index === currentStepIndex) {
        status = "current";
      } else if (index > currentStepIndex) {
        status = "pending";
      }
      
      return `
        <div class="progress-step ${status}">
          <div class="step-icon ${status}">
            ${step.complete ? '<i class="fa fa-check"></i>' : (index === currentStepIndex ? '<i class="fa fa-pencil"></i>' : (index + 1))}
          </div>
          <div class="step-content">
            <h6>${step.title}</h6>
            <p class="text-muted small mb-0">${step.description}</p>
            ${index === currentStepIndex ? 
              `<a href="#" class="btn btn-sm btn-primary mt-2" onclick="activateTab('${step.id}'); return false;">
                <i class="fa fa-${step.icon}"></i> Complete This Step
              </a>` : 
              ''
            }
          </div>
        </div>
      `;
    }).join('');
    
    profileSteps.innerHTML = stepsHTML;
  }

  /**
   * Check if user has required basic info
   * @returns {boolean} - True if basic info is complete
   */
  function hasRequiredBasicInfo() {
    return profileData && 
      profileData.company_name &&
      profileData.contact_person_name && 
      profileData.company_email && 
      profileData.company_phone && 
      profileData.address;
  }

  /**
   * Check if user has required tax info
   * @returns {boolean} - True if tax info is complete
   */
  function hasRequiredTaxInfo() {
    return profileData && 
      (profileData.tax_id || 
       profileData.vat_number || 
       profileData.business_reg_number || 
       profileData.company_number ||
       profileData.primary_tax_id);
  }

  /**
   * Check if user has required bank info
   * @returns {boolean} - True if bank info is complete
   */
  function hasRequiredBankInfo() {
    return bankData && 
      bankData.bank_name && 
      bankData.bank_account_name && 
      bankData.bank_account_no;
  }

  /**
   * Check if user has required billing info
   * @returns {boolean} - True if billing info is complete
   */
  function hasRequiredBillingInfo() {
    return profileData && 
      profileData.billing_name && 
      profileData.billing_email && 
      profileData.billing_address;
  }

  /**
   * Activate a tab based on step ID
   * @param {string} stepId - Step ID to activate corresponding tab
   */
  function activateTab(stepId) {
    let tabId;
    
    // Map step ID to tab ID
    switch(stepId) {
      case 'step-basic':
        tabId = 'basic-tab';
        break;
      case 'step-tax':
        tabId = 'tax-info-tab';
        break;
      case 'step-bank':
        tabId = 'bank-tab';
        break;
      case 'step-billing':
        tabId = 'billing-tab';
        break;
      default:
        tabId = 'overview-tab';
    }
    
    // Activate the tab
    const tab = document.getElementById(tabId);
    if (tab) {
      tab.click();
    }
  }

  function updateUsageBar(elementId, percentage) {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Usage bar element not found: ${elementId}`);
      return;
    }
    
    element.style.width = `${Math.min(percentage, 100)}%`;
    
    // Update color based on usage
    element.className = "usage-fill";
    if (percentage >= 90) {
      element.classList.add("danger");
    } else if (percentage >= 75) {
      element.classList.add("warning");
    }
  }

  function updateBasicInfoTab() {
    // Populate basic info form
    document.getElementById("companyName").value = profileData.company_name || "";
    document.getElementById("contactPersonName").value = profileData.contact_person_name || "";
    document.getElementById("companyEmail").value = profileData.company_email || profileData.email || "";
    document.getElementById("companyPhone").value = profileData.company_phone || "";
    document.getElementById("companyWebsite").value = profileData.company_website || "";
    document.getElementById("companyType").value = profileData.company_type || "";
    document.getElementById("businessType").value = profileData.business_type || "";
    document.getElementById("industryCode").value = profileData.company_code || "";
    document.getElementById("address").value = profileData.address || "";
    document.getElementById("city").value = profileData.city || "";
    document.getElementById("state").value = profileData.state || "";
    document.getElementById("postalCode").value = profileData.postal_code || "";
    document.getElementById("userType").value = profileData.user_type || role || "agent";
    document.getElementById("timezone").value = profileData.timezone || "Asia/Bangkok";
    
    // Update primary currency field (new field)
    const primaryCurrencySelect = document.getElementById("primaryCurrency");
    if (primaryCurrencySelect) {
      primaryCurrencySelect.value = profileData.primary_currency || "THB"; // Default to THB as per backend spec
    }
    
    // Set country value if available
    const countryField = document.getElementById("country");
    if (countryField && profileData.country) {
      countryField.value = profileData.country;
    }
  }

  function updateTaxInfoTab() {
    // Populate tax info form
    document.getElementById("taxId").value = profileData.tax_id || "";
    document.getElementById("vatNumber").value = profileData.vat_number || "";
    document.getElementById("businessRegNumber").value = profileData.business_reg_number || "";
    document.getElementById("companyNumber").value = profileData.company_number || "";
    document.getElementById("panNumber").value = profileData.pan_number || "";
    document.getElementById("gstin").value = profileData.gstin || "";
    document.getElementById("ein").value = profileData.ein || "";
    document.getElementById("abn").value = profileData.abn || "";
    document.getElementById("acn").value = profileData.acn || "";
    document.getElementById("duns").value = profileData.duns || "";
    document.getElementById("trn").value = profileData.trn || "";
    document.getElementById("eoriNumber").value = profileData.eori_number || "";
    document.getElementById("lei").value = profileData.lei || "";
    document.getElementById("taxExemptStatus").value = profileData.tax_exempt_status || "";
    
    // Show/hide country-specific tax fields based on the selected country
    updateTaxFieldsVisibility(profileData.country);
  }

  /**
   * Show/hide country-specific tax fields based on the selected country
   * @param {string} country - Country code
   */
  function updateTaxFieldsVisibility(countryCode) {
    // Hide all country-specific sections first
    document.querySelectorAll('.tax-country-fields').forEach(section => {
      section.style.display = 'none';
    });
    
    // Map country code to specific section or region
    let countryRegion = '';
    
    // Check for specific countries
    if (countryCode === 'IN') {
      countryRegion = 'IN'; // India
    } else if (countryCode === 'US') {
      countryRegion = 'US'; // United States
    } else if (countryCode === 'AU') {
      countryRegion = 'AU'; // Australia
    } else if (countryCode === 'AE') {
      countryRegion = 'AE'; // UAE
    } else if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'AT', 'DK', 'FI', 'IE', 'LU', 'PT', 'GR', 'CZ', 'HU'].includes(countryCode)) {
      countryRegion = 'EU'; // European Union countries
    }
    
    // Show the country-specific section if applicable
    if (countryRegion) {
      const sectionToShow = document.querySelector(`.tax-country-fields[data-country="${countryRegion}"]`);
      if (sectionToShow) {
        sectionToShow.style.display = 'block';
      }
    }
  }

  function updateBankTab() {
    // Populate bank info form with correct field names from backend response
    // Backend returns: BankName, BankAccountName, BankAccountType, etc.
    document.getElementById("bankName").value = bankData.bank_name || bankData.BankName || "";
    document.getElementById("bankAccountName").value = bankData.bank_account_name || bankData.BankAccountName || "";
    document.getElementById("bankAddress").value = bankData.bank_address || bankData.BankAddress || "";
    document.getElementById("bankAccountType").value = bankData.bank_account_type || bankData.BankAccountType || "";
    document.getElementById("bankAccountNo").value = bankData.bank_account_no || bankData.BankAccountNo || "";
    document.getElementById("bankBranchCode").value = bankData.bank_branch_code || bankData.BankBranchCode || "";
    document.getElementById("bankSWIFT").value = bankData.bank_swift || bankData.BankSWIFT || "";
    document.getElementById("bankIBAN").value = bankData.bank_iban || bankData.BankIBAN || "";

    // Show bank info status
    const hasBankInfo = bankData.has_bank_info || bankData.HasBankInfo || false;
    console.log("Bank info exists:", hasBankInfo);
    
    // You could add a status indicator to the form
    const bankForm = document.getElementById("bankForm");
    const existingStatus = bankForm.querySelector('.bank-status');
    if (existingStatus) {
      existingStatus.remove();
    }
    
    if (hasBankInfo) {
      const statusDiv = document.createElement('div');
      statusDiv.className = 'alert alert-success bank-status';
      statusDiv.innerHTML = '<i class="fa fa-check-circle"></i> Bank information is configured and ready for payments.';
      bankForm.insertBefore(statusDiv, bankForm.firstChild);
    }
  }

  function updateBillingTab() {
    // Populate billing info form
    document.getElementById("billingEmail").value = profileData.billing_email || profileData.email || "";
    document.getElementById("billingName").value = profileData.billing_name || profileData.company_name || "";
    document.getElementById("billingContact").value = profileData.billing_contact || "";
    document.getElementById("billingAddress").value = profileData.billing_address || profileData.address || "";
    document.getElementById("billingCity").value = profileData.billing_city || profileData.city || "";
    document.getElementById("billingState").value = profileData.billing_state || profileData.state || "";
    document.getElementById("billingCountry").value = profileData.billing_country || profileData.country || "";
    document.getElementById("billingPostalCode").value = profileData.billing_postal_code || profileData.postal_code || "";

    // Show payment methods based on user type
    loadPaymentMethods();
  }

  /**
   * Update subscription tab with usage metrics
   */
  function updateSubscriptionTab() {
    // Update subscription information
    const currentPlan = document.getElementById('currentPlan');
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    const nextBillingDate = document.getElementById('nextBillingDate');
    const billingCycle = document.getElementById('billingCycle');
    
    if (!subscriptionData) return;
    
    console.log("Updating subscription tab with data:", subscriptionData);
    
    // Format the subscription tier name
    const tier = subscriptionData.subscription_tier || 'enterprise';
    const formattedTier = tier.charAt(0).toUpperCase() + tier.slice(1);
    
    if (currentPlan) currentPlan.textContent = formattedTier;
    
    // Load available upgrade plans based on current tier
    loadAvailableUpgradePlans();
    
    if (subscriptionStatus) {
      // Check if subscription_status exists - if not, fall back to a default value
      const status = subscriptionData.subscription_status || 'active';
      subscriptionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
      
      // Add color based on status
      if (status === 'trial') {
        subscriptionStatus.className = 'text-warning';
      } else if (status === 'active') {
        subscriptionStatus.className = 'text-success';
      } else if (status === 'canceled' || status === 'expired') {
        subscriptionStatus.className = 'text-danger';
      }
    }
    
    if (nextBillingDate) {
      nextBillingDate.textContent = subscriptionData.next_billing_date 
        ? new Date(subscriptionData.next_billing_date).toLocaleDateString() 
        : 'N/A';
    }
    
    if (billingCycle) {
      const cycle = subscriptionData.billing_cycle || 'monthly';
      billingCycle.textContent = cycle.charAt(0).toUpperCase() + cycle.slice(1) || "N/A";
    }
    
    // If SubscriptionManagement is loaded, use it to render plans
    if (typeof window.SubscriptionManagement !== 'undefined' && 
        window.SubscriptionManagement.initialized &&
        document.getElementById('subscriptionPlans')) {
      window.SubscriptionManagement.renderSubscriptionPlans('subscriptionPlans');
      
      // Also update usage indicators
      window.SubscriptionManagement.showUsageIndicators({
        usersCount: 'usersCount',
        usersLimit: 'usersLimit',
        usersBar: 'usersUsage',
        quotationsCount: 'tripsCount',
        quotationsLimit: 'tripsLimit',
        quotationsBar: 'tripsUsage',
        storage_gbCount: 'storageCount',
        storage_gbLimit: 'storageLimit',
        storage_gbBar: 'storageUsage'
      });
      
      // Show trial countdown if applicable
      window.SubscriptionManagement.showTrialCountdown('alertsContainer');
    } else {
      // Basic fallback for plans if SubscriptionManagement is not available
      const plansContainer = document.getElementById('subscriptionPlans');
      if (plansContainer) {
        // Display subscription limits
        let limitsHTML = '';
        if (subscriptionData.limits) {
          const limits = subscriptionData.limits;
          limitsHTML = `
            <div class="row mt-3">
              <div class="col-md-12">
                <h6>Your Plan Limits</h6>
                <ul class="list-group">
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Users
                    <span class="badge badge-primary badge-pill">${limits.users || 'N/A'}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Quotations
                    <span class="badge badge-primary badge-pill">${limits.quotations || 'N/A'}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Bookings
                    <span class="badge badge-primary badge-pill">${limits.bookings || 'N/A'}</span>
                  </li>
                  <li class="list-group-item d-flex justify-content-between align-items-center">
                    Storage
                    <span class="badge badge-primary badge-pill">${limits.storage_gb || 'N/A'} GB</span>
                  </li>
                </ul>
              </div>
            </div>
          `;
        }
        
        plansContainer.innerHTML = `
          <div class="col-md-12">
            <div class="alert alert-info">
              <i class="fa fa-info-circle"></i> You are currently on the ${formattedTier} plan.
            </div>
            ${limitsHTML}
          </div>
        `;
      }
    }
  }

  /**
   * Update alerts container with relevant alerts
   */
  function updateAlerts() {
    const alertsContainer = document.getElementById("alertsContainer");
    if (!alertsContainer) return;
    
    alertsContainer.innerHTML = '';
    
    // Check if user is on an enterprise plan - no alerts needed
    const isEnterprise = subscriptionData && subscriptionData.subscription_tier === 'enterprise';
    if (isEnterprise) {
      return; // No alerts for enterprise users
    }
    
    // Check if user is on trial
    const isOnTrial = subscriptionData && subscriptionData.subscription_status === 'trial';
    
    if (isOnTrial && subscriptionData.trial_end) {
      const trialEnd = new Date(subscriptionData.trial_end);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft <= 0) {
        // Trial expired
        alertsContainer.innerHTML += `
          <div class="alert alert-danger alert-custom">
            <i class="fa fa-exclamation-triangle"></i>
            <strong>Trial Expired!</strong> Your trial has ended. Please upgrade to continue using all features.
            <button class="btn btn-danger btn-sm float-right" onclick="upgradePlan()">
              Upgrade Now
            </button>
          </div>
        `;
      } else if (daysLeft <= 3) {
        // Trial ending soon
        alertsContainer.innerHTML += `
          <div class="alert alert-warning alert-custom">
            <i class="fa fa-clock-o"></i>
            <strong>Trial Ending Soon!</strong> Your trial will end in ${daysLeft} day${daysLeft > 1 ? 's' : ''}.
            <button class="btn btn-warning btn-sm float-right" onclick="upgradePlan()">
              Upgrade Now
            </button>
          </div>
        `;
      } else {
        // Trial in progress
        alertsContainer.innerHTML += `
          <div class="alert alert-info alert-custom">
            <i class="fa fa-info-circle"></i>
            <strong>Trial in Progress!</strong> You have ${daysLeft} days left in your trial.
            <button class="btn btn-info btn-sm float-right" onclick="upgradePlan()">
              Upgrade Plan
            </button>
          </div>
        `;
      }
    }
    
    // Check for incomplete profile
    const completeness = profileData?.profile_completeness || 0;
    if (completeness < 70) {
      alertsContainer.innerHTML += `
        <div class="alert alert-info alert-custom">
          <i class="fa fa-user-circle"></i>
          <strong>Complete Your Profile!</strong> A complete profile helps us serve you better.
          <button class="btn btn-info btn-sm float-right" onclick="scrollToCompletionSteps()">
            Complete Now
          </button>
        </div>
      `;
    }
    
    // Check for missing bank info
    const hasBankInfo = bankData && bankData.has_bank_info;
    if (!hasBankInfo) {
      alertsContainer.innerHTML += `
        <div class="alert alert-info alert-custom">
          <i class="fa fa-bank"></i>
          <strong>Add Bank Details!</strong> Add your banking information for seamless payments.
          <button class="btn btn-info btn-sm float-right" onclick="activateTab('bank-tab')">
            Add Bank Details
          </button>
        </div>
      `;
    }
  }

  /**
   * Scroll to profile completion steps
   */
  function scrollToCompletionSteps() {
    const profileSteps = document.getElementById("profileSteps");
    if (profileSteps) {
      profileSteps.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Ensure overview tab is active
    activateTab('overview-tab');
  }

  /**
   * Trigger plan upgrade
   * @param {string} targetTier - Optional target tier to upgrade to
   */
  function upgradePlan(targetTier) {
    // Check if user is already on enterprise plan
    const isEnterprise = subscriptionData && subscriptionData.subscription_tier === 'enterprise';
    if (isEnterprise) {
      console.log("User already has enterprise subscription, no upgrade available");
      return;
    }
    
    // If no tier specified, determine next tier
    if (!targetTier) {
      const currentTier = subscriptionData?.subscription_tier || 'starter';
      
      if (currentTier === 'starter') {
        targetTier = 'pro';
      } else if (currentTier === 'pro') {
        targetTier = 'business';
      } else if (currentTier === 'business') {
        targetTier = 'enterprise';
      } else {
        targetTier = 'enterprise';
      }
    }
    
    if (targetTier === 'enterprise') {
      // For enterprise, just open email
      window.open('mailto:sales@example.com?subject=Enterprise Plan Inquiry', '_blank');
      return;
    }
    
    // Show upgrade confirmation modal
    showUpgradeModal(targetTier);
  }

  /**
   * Show upgrade confirmation modal
   * @param {string} targetTier - The tier to upgrade to
   */
  function showUpgradeModal(targetTier) {
    // Define plan details
    const plans = {
      'starter': { 
        name: 'Starter', 
        price: '$9.99', 
        period: 'month',
        limits: { users: 1, quotations: 100, bookings: 100, storage_gb: 1 }
      },
      'pro': { 
        name: 'Professional', 
        price: '$29.99', 
        period: 'month',
        limits: { users: 5, quotations: 5000, bookings: 5000, storage_gb: 5 }
      },
      'business': { 
        name: 'Business', 
        price: '$99.99', 
        period: 'month',
        limits: { users: 100, quotations: 250000, bookings: 250000, storage_gb: 20 }
      },
      'enterprise': { 
        name: 'Enterprise', 
        price: 'Custom', 
        period: 'pricing',
        limits: { users: 'Unlimited', quotations: 'Unlimited', bookings: 'Unlimited', storage_gb: 'Unlimited' }
      }
    };
    
    const plan = plans[targetTier] || plans.pro;
    
    // Create modal HTML
    const modalHTML = `
      <div class="modal fade" id="upgradeModal" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Upgrade to ${plan.name}</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <p>Upgrade to our ${plan.name} plan to unlock more features and increase your usage limits:</p>
              <ul>
                <li><strong>Users:</strong> ${plan.limits.users}</li>
                <li><strong>Quotations:</strong> ${typeof plan.limits.quotations === 'number' ? plan.limits.quotations.toLocaleString() : plan.limits.quotations}</li>
                <li><strong>Bookings:</strong> ${typeof plan.limits.bookings === 'number' ? plan.limits.bookings.toLocaleString() : plan.limits.bookings}</li>
                <li><strong>Storage:</strong> ${plan.limits.storage_gb}GB</li>
              </ul>
              <p>Price: ${plan.price} per ${plan.period}</p>
              <p class="text-muted small">You'll be redirected to our payment processor to complete your subscription.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" onclick="processUpgrade('${targetTier}')">
                Continue to Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Show modal
    $('#upgradeModal').modal('show');
    
    // Remove modal from DOM when hidden
    $('#upgradeModal').on('hidden.bs.modal', function() {
      document.body.removeChild(modalContainer);
    });
  }

  /**
   * Process upgrade to a specific plan
   * @param {string} planTier - The plan tier to upgrade to
   */
  async function processUpgrade(planTier) {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Not authenticated");

      const userId = localStorage.getItem("userId") || localStorage.getItem("user_id");
      if (!userId) throw new Error("User ID not found");

      // Show loading state
      const button = document.querySelector('#upgradeModal .btn-primary');
      button.disabled = true;
      button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Processing...';

      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${userId}/subscription/upgrade`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: planTier
        })
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Endpoint not implemented yet, show message
          alert("Subscription upgrade is coming soon. Please check back later.");
          $('#upgradeModal').modal('hide');
          return;
        }
        
        const error = await response.json();
        throw new Error(error.message || `Failed to upgrade: ${response.status}`);
      }

      const result = await response.json();
      
      // If result has a payment URL, redirect to it
      if (result.payment_url) {
        window.location.href = result.payment_url;
        return;
      }
      
      // Otherwise show success message
      alert(`Subscription upgraded to ${planTier}!`);
      $('#upgradeModal').modal('hide');
      
      // Reload the page to reflect changes
      window.location.reload();
      
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      alert(`Failed to upgrade subscription: ${error.message}`);
      
      // Reset button state
      const button = document.querySelector('#upgradeModal .btn-primary');
      button.disabled = false;
      button.innerHTML = 'Continue to Payment';
    }
  }

  function handleWarningAction(warning) {
    if (warning.type === 'trial_ending') {
      showUpgradeModal();
    } else if (warning.action === 'Add payment method') {
      addPaymentMethod();
    } else {
      // Generic upgrade flow
      showUpgradeModal();
    }
  }

  // Form handling with new specific endpoints
  function setupEventListeners() {
    console.log("setupEventListeners called - setting up form event listeners");
    
    // Basic profile form
    document.getElementById("basicProfileForm").addEventListener("submit", handleBasicProfileSubmit);
    
    // Tax info form
    document.getElementById("taxInfoForm").addEventListener("submit", handleTaxInfoSubmit);
    
    // Bank form
    const bankForm = document.getElementById("bankForm");
    if (bankForm) {
      console.log("Bank form found, adding submit event listener");
      bankForm.addEventListener("submit", handleBankSubmit);
    } else {
      console.error("Bank form not found! Cannot attach submit event listener");
    }
    
    // BACKUP: Also try to attach directly to the button
    const bankSubmitBtn = document.querySelector('#bankForm button[type="submit"]');
    if (bankSubmitBtn) {
      console.log("Found bank submit button, adding click listener as backup");
      bankSubmitBtn.addEventListener("click", function(e) {
        console.log("Bank submit button clicked directly");
        e.preventDefault();
        handleBankSubmit(e);
      });
    } else {
      console.error("Bank submit button not found!");
    }
    
    // Billing form
    document.getElementById("billingForm").addEventListener("submit", handleBillingSubmit);
    
    // Add country change event to update tax fields visibility
    const countrySelect = document.getElementById("country");
    if (countrySelect) {
      countrySelect.addEventListener("change", function() {
        updateTaxFieldsVisibility(this.value);
      });
    }

      // Organization users management is now handled through add_user.html
  }

  async function handleBasicProfileSubmit(e) {
    e.preventDefault();
    
    const formData = {
      company_name: document.getElementById("companyName").value,
      contact_person_name: document.getElementById("contactPersonName").value,
      company_email: document.getElementById("companyEmail").value,
      company_phone: document.getElementById("companyPhone").value,
      company_website: document.getElementById("companyWebsite").value,
      company_type: document.getElementById("companyType").value,
      business_type: document.getElementById("businessType").value,
      company_code: document.getElementById("industryCode").value,
      address: document.getElementById("address").value,
      city: document.getElementById("city").value,
      state: document.getElementById("state").value,
      postal_code: document.getElementById("postalCode").value,
      country: document.getElementById("country").value,
      timezone: document.getElementById("timezone").value,
      primary_currency: document.getElementById("primaryCurrency").value
      // User type is not included as it shouldn't be editable
    };

    await updateProfileSection('basic', formData, "Basic information updated successfully!");
    
    // Update tax fields visibility if country was changed
    updateTaxFieldsVisibility(formData.country);
  }
  
  async function handleTaxInfoSubmit(e) {
    e.preventDefault();
    
    const formData = {
      tax_id: document.getElementById("taxId").value,
      vat_number: document.getElementById("vatNumber").value,
      business_reg_number: document.getElementById("businessRegNumber").value,
      company_number: document.getElementById("companyNumber").value,
      tax_exempt_status: document.getElementById("taxExemptStatus").value,
      duns: document.getElementById("duns").value
    };
    
    // Add country-specific tax fields based on the selected country
    const countryCode = profileData.country || document.getElementById("country").value;
    
    // India-specific fields
    if (countryCode === 'IN') {
      formData.pan_number = document.getElementById("panNumber").value;
      formData.gstin = document.getElementById("gstin").value;
    }
    
    // US-specific fields
    if (countryCode === 'US') {
      formData.ein = document.getElementById("ein").value;
    }
    
    // Australia-specific fields
    if (countryCode === 'AU') {
      formData.abn = document.getElementById("abn").value;
      formData.acn = document.getElementById("acn").value;
    }
    
    // UAE-specific fields
    if (countryCode === 'AE') {
      formData.trn = document.getElementById("trn").value;
    }
    
    // EU-specific fields
    if (['GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'SE', 'AT', 'DK', 'FI', 'IE', 'LU', 'PT', 'GR', 'CZ', 'HU'].includes(countryCode)) {
      formData.eori_number = document.getElementById("eoriNumber").value;
      formData.lei = document.getElementById("lei").value;
    }

    // Include country if available from profile data (needed for tax validation)
    if (countryCode) {
      formData.country = countryCode;
    }

    // Use the tax-info endpoint
    await updateProfileSection('tax-info', formData, "Tax information updated successfully!");
  }

  async function handleBankSubmit(e) {
    console.log("handleBankSubmit called - form submission detected");
    e.preventDefault();
    
    try {
      const formData = {
        bank_name: document.getElementById("bankName").value,
        bank_account_name: document.getElementById("bankAccountName").value,
        bank_address: document.getElementById("bankAddress").value,
        bank_account_type: document.getElementById("bankAccountType").value,
        bank_account_no: document.getElementById("bankAccountNo").value,
        bank_branch_code: document.getElementById("bankBranchCode").value,
        bank_swift: document.getElementById("bankSWIFT").value,
        bank_iban: document.getElementById("bankIBAN").value
      };

      console.log("Form data collected:", formData);
      await updateBankInfo(formData, "Bank information updated successfully!");
    } catch (error) {
      console.error("Error in handleBankSubmit:", error);
      showErrorMessage("Failed to save bank information: " + error.message);
    }
  }

  async function updateBankInfo(updateData, successMessage) {
    console.log("updateBankInfo called with data:", updateData);
    try {
      showFormLoading('bankForm');
      
      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      console.log(`Updating bank information for user ID:`, resolvedUserID);
      console.log("Bank update data:", updateData);
      
      // Use resolved userID for consistency with other functions in this file
      const endpoint = `${Endpoint}/api/v1/user-profiles/${resolvedUserID}/bank-info`;
      console.log(`Using endpoint: ${endpoint}`);
      
      // Validate that we have all required fields for the backend
      const requiredFields = ['bank_name', 'bank_account_name', 'bank_account_type'];
      const missingFields = requiredFields.filter(field => !updateData[field] || updateData[field].trim() === '');
      if (missingFields.length > 0) {
        throw new Error(`Please fill in the required fields: ${missingFields.join(', ')}`);
      }
      
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        let errorMessage = `Failed to update bank information: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.text();
          if (errorData) {
            errorMessage += ` - ${errorData}`;
          }
        } catch (e) {
          // Ignore error parsing error message
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Bank information updated successfully:", result);
      
      // Update the global bankData with the response
      bankData = result;
      
      // Update the UI to reflect the changes
      updateBankUI(result);
      
      hideFormLoading('bankForm');
      showSuccessMessage(successMessage);
      
      return result;
    } catch (error) {
      console.error("Error updating bank information:", error);
      hideFormLoading('bankForm');
      showErrorMessage(`Failed to update bank information: ${error.message}`);
      throw error;
    }
  }

  async function handleBillingSubmit(e) {
    e.preventDefault();
    
    try {
      showFormLoading('billingForm');
      
      // 1. Update billing information via the billing API
      const billingData = {
        billing_email: document.getElementById("billingEmail").value,
        billing_name: document.getElementById("billingName").value,
        billing_contact: document.getElementById("billingContact").value,
        billing_address: document.getElementById("billingAddress").value,
        billing_city: document.getElementById("billingCity").value,
        billing_state: document.getElementById("billingState").value,
        billing_country: document.getElementById("billingCountry").value,
        billing_postal_code: document.getElementById("billingPostalCode").value
      };

      console.log("Updating billing information...");
      await updateBillingInfo(billingData);
      
      // 2. If there are any payment method updates, handle them
      // (Payment methods are managed separately via the add/remove payment method buttons)
      // The payment methods API calls are already handled by loadPaymentMethods(), 
      // addPaymentMethod(), and savePaymentMethod() functions
      
      // 3. Reload payment methods to ensure UI is up to date
      console.log("Refreshing payment methods...");
      await loadPaymentMethods();
      
      hideFormLoading('billingForm');
      showSuccessMessage("Billing information updated successfully!");
      
    } catch (error) {
      console.error("Error updating billing information:", error);
      hideFormLoading('billingForm');
      showErrorMessage(`Failed to update billing information: ${error.message}`);
    }
  }

  /**
   * Update billing information via the dedicated billing API endpoint
   * @param {Object} billingData - Billing information to update
   */
  async function updateBillingInfo(billingData) {
    try {
      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      console.log(`Updating billing info for user ID:`, resolvedUserID);
      console.log("Billing data:", billingData);
      
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}/billing`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(billingData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Billing API error:", response.status, errorText);
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Billing info updated successfully:", result);
      
      // Update the global profile data with the response
      if (result && typeof result === 'object') {
        Object.assign(profileData, result);
      }
      
      return result;
    } catch (error) {
      console.error("Error updating billing info:", error);
      throw error;
    }
  }

  async function updateProfileSection(section, updateData, successMessage) {
    try {
      const formId = section === 'tax-info' ? 'taxInfoForm' : `${section}ProfileForm`;
      showFormLoading(formId);
      
      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      console.log(`Updating profile section '${section}' for user ID:`, resolvedUserID);
      console.log("Update data:", updateData);
      
      // Map section to the correct API endpoint based on backend documentation
      let endpoint;
      switch(section) {
        case 'basic':
          endpoint = `${Endpoint}/api/v1/user-profiles/${resolvedUserID}/basic`;
          break;
        case 'tax-info':
          endpoint = `${Endpoint}/api/v1/user-profiles/${resolvedUserID}/tax-info`;
          break;
        case 'billing':
          endpoint = `${Endpoint}/api/v1/user-profiles/${resolvedUserID}/billing`;
          break;
        default:
          endpoint = `${Endpoint}/api/v1/user-profiles/${resolvedUserID}/${section}`;
      }
      
      console.log(`Using endpoint: ${endpoint}`);
      
      // Ensure country is included in the request if available
      if (!updateData.country && profileData.country) {
        updateData.country = profileData.country;
        console.log("Added country from profile data:", profileData.country);
      }
      
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData)
      });

      console.log(`Response status for ${section}:`, response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Profile section '${section}' not found - this may be due to using username instead of numeric ID`);
        }
        const errorText = await response.text();
        console.error(`Error response body for ${section}:`, errorText);
        throw new Error(`Failed to update ${section}: ${response.status} ${response.statusText}`);
      }

      // Handle successful response
      let result;
      const contentType = response.headers.get('content-type');
      console.log(`Response content-type for ${section}:`, contentType);

      if (contentType && contentType.includes('application/json')) {
        try {
          result = await response.json();
          console.log(`Parsed JSON result for ${section}:`, result);
        } catch (jsonError) {
          console.error(`Error parsing JSON response for ${section}:`, jsonError);
          // If we can't parse JSON but got 200 OK, treat as success with empty result
          result = {};
        }
      } else {
        // Non-JSON response, try to get text
        const textResult = await response.text();
        console.log(`Text response for ${section}:`, textResult);
        result = {}; // Treat as success with empty result
      }

      // Update profile data with result (if any)
      if (result && typeof result === 'object') {
        profileData = { ...profileData, ...result };
        console.log("Updated profile data:", profileData);
      }
      
      showSuccessMessage(successMessage);
      updateProfileHeader();
      updateProfileSteps();
      updateAlerts();
      
      // Refresh the profile data from the server
      await loadProfileData();
      
      // Refresh only the specific form tab that was updated
      if (section === 'basic') {
        updateBasicInfoTab();
      } else if (section === 'tax-info') {
        updateTaxInfoTab();
      } else if (section === 'billing') {
        updateBillingTab();
      }
      
    } catch (error) {
      console.error(`Error updating ${section}:`, error);
      console.error("Full error object:", error);
      showErrorMessage(`Failed to update ${section}. Please try again.`);
    } finally {
      const formId = section === 'tax-info' ? 'taxInfoForm' : `${section}ProfileForm`;
      hideFormLoading(formId);
    }
  }

  /**
   * Update profile UI elements with profile data
   * @param {Object} profileData - The profile data
   */
  function updateProfileUI(profileData) {
    if (!profileData) return;
    
    // Update profile header
    updateProfileHeader();
    
    // Update each tab
    updateOverviewTab();
    updateBasicInfoTab();
    updateTaxInfoTab();
    updateBankTab();
    updateBillingTab();
    updateSubscriptionTab();
    updateOrganizationTab(); // Add organization tab update
    updateAlerts();
  }

  /**
   * Update bank UI elements with bank data
   * @param {Object} bankData - The bank data
   */
  function updateBankUI(bankData) {
    if (!bankData) return;
    
    // Set bank form values if the elements exist
    const bankFields = [
      { id: 'bankName', field: 'bank_name' },
      { id: 'bankAccountName', field: 'bank_account_name' },
      { id: 'bankAccountType', field: 'bank_account_type' },
      { id: 'bankAccountNo', field: 'bank_account_no' },
      { id: 'bankAddress', field: 'bank_address' },
      { id: 'bankBranchCode', field: 'bank_branch_code' },
      { id: 'bankSWIFT', field: 'bank_swift' },
      { id: 'bankIBAN', field: 'bank_iban' }
    ];
    
    bankFields.forEach(({ id, field }) => {
      const element = document.getElementById(id);
      if (element && bankData[field]) {
        element.value = bankData[field];
      }
    });
    
    // If BankSecurity is available, mask sensitive fields
    if (typeof window.BankSecurity !== 'undefined' && window.BankSecurity.initialized) {
      // Apply masking to sensitive fields
      const sensitiveFields = ['bankAccountNo', 'bankIBAN', 'bankBranchCode'];
      sensitiveFields.forEach(id => {
        const element = document.getElementById(id);
        if (element && element.value) {
          window.BankSecurity.maskSensitiveValue(element);
        }
      });
    }
  }

  /**
   * Show loading state
   * @param {string} message - Optional loading message
   */
  function showLoadingState(message = "Loading...") {
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
    
    overlay.innerHTML = `
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <p class="mt-2">${message}</p>
    `;
    
    document.body.appendChild(overlay);
  }

  /**
   * Hide loading state
   */
  function hideLoadingState() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Show form loading state
   * @param {string} formId - The form element ID
   */
  function showFormLoading(formId) {
    const form = document.getElementById(formId);
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
      }
    }
  }

  /**
   * Hide form loading state
   * @param {string} formId - The form element ID
   */
  function hideFormLoading(formId) {
    const form = document.getElementById(formId);
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        // Restore original button text based on form type
        if (formId === 'bankForm') {
          submitBtn.innerHTML = '<i class="fa fa-save"></i> Save Bank Information';
        } else if (formId === 'basicProfileForm') {
          submitBtn.innerHTML = '<i class="fa fa-save"></i> Save Basic Info';
        } else if (formId === 'taxInfoForm') {
          submitBtn.innerHTML = '<i class="fa fa-save"></i> Save Tax Info';
        } else if (formId === 'billingForm') {
          submitBtn.innerHTML = '<i class="fa fa-save"></i> Save Billing Info';
        } else {
          submitBtn.innerHTML = '<i class="fa fa-save"></i> Save';
        }
      }
    }
  }

  /**
   * Show success message
   * @param {string} message - Success message to display
   */
  function showSuccessMessage(message) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert-success, .alert-danger');
    existingAlerts.forEach(alert => alert.remove());

    // Create success alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-success alert-dismissible fade show';
    alert.innerHTML = `
      <i class="fa fa-check-circle"></i> ${message}
      <button type="button" class="close" data-dismiss="alert">
        <span>&times;</span>
      </button>
    `;

    // Insert at the top of the main content
    const mainContent = document.querySelector('.x_content') || document.body;
    mainContent.insertBefore(alert, mainContent.firstChild);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 5000);
  }

  /**
   * Show error message
   * @param {string} message - Error message to display
   */
  function showErrorMessage(message) {
    // Remove any existing alerts
    const existingAlerts = document.querySelectorAll('.alert-success, .alert-danger');
    existingAlerts.forEach(alert => alert.remove());

    // Create error alert
    const alert = document.createElement('div');
    alert.className = 'alert alert-danger alert-dismissible fade show';
    alert.innerHTML = `
      <i class="fa fa-exclamation-circle"></i> ${message}
      <button type="button" class="close" data-dismiss="alert">
        <span>&times;</span>
      </button>
    `;

    // Insert at the top of the main content
    const mainContent = document.querySelector('.x_content') || document.body;
    mainContent.insertBefore(alert, mainContent.firstChild);

    // Auto-dismiss after 8 seconds (longer for errors)
    setTimeout(() => {
      if (alert.parentNode) {
        alert.remove();
      }
    }, 8000);
  }

  async function loadPaymentMethods() {
    console.log("=== loadPaymentMethods() called ===");
    
    const container = document.getElementById("paymentMethods");
    if (!container) {
      console.error("Payment methods container not found");
      return;
    }
    
    console.log("Payment methods container found");
    
    try {
      console.log("Loading payment methods for all users...");
      
      // Load payment methods for all users (both SaaS and Enterprise)
      // Check if we have access to the payment methods endpoint
      try {
          // Get user ID with proper error handling
          let currentUserID = null;
          try {
            currentUserID = await resolveUserID();
          } catch (error) {
            console.error('Error resolving user ID for payment methods:', error);
            currentUserID = localStorage.getItem('userId') || localStorage.getItem('user_id') || localStorage.getItem('id');
            if (!currentUserID) {
              throw new Error('User ID not found. Please log in again.');
            }
            console.log('Using fallback user ID for payment methods:', currentUserID);
          }
          
          // Get auth token
          const authToken = localStorage.getItem("token");
          if (!authToken) {
            throw new Error("Authentication token not found");
          }
          
          console.log(`Fetching payment methods for user ${currentUserID}...`);
          
          const response = await fetch(`${Endpoint}/api/v1/user-profiles/${currentUserID}/payment-methods`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          });
          
          console.log("Payment methods API response status:", response.status);
          
          if (response.ok) {
            const paymentMethods = await response.json();
            console.log("Payment methods received from API:", paymentMethods);
            
            // Backend returns array directly based on the Go code
            const methods = Array.isArray(paymentMethods) ? paymentMethods : [];
            
            // Store for use in upgrade modal
            savedPaymentMethods = methods;
            
            if (methods && methods.length > 0) {
              // Render payment methods with proper PaymentMethodResponse format
              container.innerHTML = methods.map(method => {
                // Use display_name as the main name and payment_type as subdescription
                const displayName = method.display_name || 'Payment Method';
                const paymentType = method.payment_type || 'Unknown';
                const icon = method.payment_type === 'upi' ? 'fa-mobile' : 'fa-credit-card';
                  
                return `
                  <div class="card mb-2" data-method-id="${method.id}">
          <div class="card-body">
                      <div class="row align-items-center">
                        <div class="col-md-6">
                          <div class="d-flex align-items-center">
                            <i class="fa ${icon} text-primary mr-2"></i>
                            <div>
                              <strong>${displayName}</strong>
                              ${method.is_default ? '<span class="badge badge-success ml-2">Default</span>' : ''}
                              <br>
                              <small class="text-muted">${paymentType}</small>
                            </div>
                          </div>
                        </div>
                        <div class="col-md-3">
                          <small class="text-muted">
                            ${method.created_at ? 'Added ' + new Date(method.created_at).toLocaleDateString() : 'Recently added'}
                          </small>
                        </div>
                        <div class="col-md-3 text-right">
                          <button class="btn btn-outline-danger btn-sm" onclick="removePaymentMethod('${method.id}')" title="Remove payment method">
                            <i class="fa fa-trash"></i>
            </button>
                        </div>
                      </div>
          </div>
        </div>
      `;
              }).join('');
              
              console.log(`Displayed ${methods.length} payment methods`);
            } else {
              // No payment methods yet - show enhanced UI
              container.innerHTML = `
                <div class="text-center py-4">
                  <i class="fa fa-credit-card fa-3x text-muted mb-3"></i>
                  <h6 class="text-muted">No Payment Methods</h6>
                  <p class="text-muted">Add a payment method to enable subscription upgrades</p>
                </div>
              `;
              
              console.log("No payment methods found for user");
            }
          } else if (response.status === 404) {
            // No payment methods found
            container.innerHTML = `
              <div class="text-center py-4">
                <i class="fa fa-credit-card fa-3x text-muted mb-3"></i>
                <h6 class="text-muted">No Payment Methods</h6>
                <p class="text-muted">Add a payment method to enable subscription upgrades</p>
              </div>
            `;
            
            savedPaymentMethods = [];
            console.log("No payment methods found (404 response)");
            
          } else {
            // API error
            const errorText = await response.text();
            console.error("Payment methods API error:", response.status, errorText);
            throw new Error(`API error: ${response.status}`);
          }
        } catch (error) {
          console.error("Error fetching payment methods:", error);
          
          // Show error state with retry option
          container.innerHTML = `
            <div class="alert alert-warning">
              <i class="fa fa-exclamation-triangle"></i>
              <strong>Unable to load payment methods</strong><br>
              <small>${error.message}</small>
              <br>
              <button class="btn btn-sm btn-outline-primary mt-2" onclick="loadPaymentMethods()">
                <i class="fa fa-refresh"></i> Retry
              </button>
            </div>
          `;
        }
    } catch (error) {
      console.error("Error loading payment methods:", error);
      // Fallback UI
      container.innerHTML = `
        <div class="alert alert-warning">
          <i class="fa fa-exclamation-triangle"></i> Unable to load payment methods. Please try again later.
        </div>
      `;
    } finally {
      hideLoadingState();
    }
  }

  async function addPaymentMethod(type = 'card') {
    // Show the enhanced payment method modal
    currentPaymentType = type;
    
    // Reset form
    const form = document.getElementById('paymentMethodForm');
    if (form) {
      form.reset();
    }
    
    // Set payment type in hidden field
    const paymentTypeField = document.getElementById('paymentType');
    if (paymentTypeField) {
      paymentTypeField.value = type;
    }
    
    // Show appropriate section and manage required attributes
    const cardSection = document.getElementById('cardPaymentSection');
    const upiSection = document.getElementById('upiPaymentSection');
    
    // Get form fields
    const cardFields = ['cardNumber', 'expiryDate', 'cvv', 'cardholderName'];
    const upiFields = ['upiId'];
    
    if (type === 'card') {
      if (cardSection) cardSection.style.display = 'block';
      if (upiSection) upiSection.style.display = 'none';
      
      // Set required attributes for card fields
      cardFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.required = true;
      });
      
      // Remove required attributes from UPI fields
      upiFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.required = false;
      });
      
    } else if (type === 'upi') {
      if (cardSection) cardSection.style.display = 'none';
      if (upiSection) upiSection.style.display = 'block';
      
      // Set required attributes for UPI fields
      upiFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.required = true;
      });
      
      // Remove required attributes from card fields
      cardFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.required = false;
      });
    }
    
    // Update modal title
    const modalLabel = document.getElementById('paymentMethodModalLabel');
    if (modalLabel) {
      const title = type === 'card' ? 'Add Credit/Debit Card' : 'Add UPI Payment Method';
      modalLabel.textContent = title;
    }
    
    // Show modal
    const modal = $('#paymentMethodModal');
    if (modal.length) {
      modal.modal('show');
    } else {
      alert("Payment method management interface is loading. Please try again in a moment.");
    }
  }

  async function removePaymentMethod(methodId) {
    if (!confirm("Are you sure you want to remove this payment method?")) {
      return;
    }

    try {
      // Show loading state
      const methodCard = document.querySelector(`[data-method-id="${methodId}"]`);
      if (methodCard) {
        const removeButton = methodCard.querySelector('.btn-outline-danger');
        if (removeButton) {
          removeButton.disabled = true;
          removeButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
        }
      }

      // Get user ID and auth token
      const userID = await resolveUserID();
      const token = localStorage.getItem("token");
      
      if (!token) {
        throw new Error("Authentication token not found");
      }

      console.log(`Deleting payment method ${methodId} for user ${userID}`);

      // Call the DELETE API endpoint
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${userID}/payment-methods/${methodId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete payment method: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Payment method deleted successfully:", result);

      // Show success message
      alert("Payment method removed successfully!");

      // Reload payment methods to refresh the UI
      await loadPaymentMethods();

    } catch (error) {
      console.error("Error removing payment method:", error);
      alert(`Failed to remove payment method: ${error.message}`);
      
      // Reset button state on error
      const methodCard = document.querySelector(`[data-method-id="${methodId}"]`);
      if (methodCard) {
        const removeButton = methodCard.querySelector('.btn-outline-danger');
        if (removeButton) {
          removeButton.disabled = false;
          removeButton.innerHTML = '<i class="fa fa-trash"></i>';
        }
      }
    }
  }

  // Enhanced payment method functionality
  let currentPaymentType = null;
  let savedPaymentMethods = [];

  // Save payment method function
  async function savePaymentMethod() {
    const form = document.getElementById('paymentMethodForm');
    const saveButton = document.getElementById('savePaymentMethod');
    
    if (!form || !form.checkValidity()) {
      if (form) form.reportValidity();
      return;
    }
    
    try {
      saveButton.disabled = true;
      saveButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
      
      // Get user ID with better error handling
      let userID = null;
      try {
        userID = await resolveUserID();
      } catch (error) {
        console.error('Error resolving user ID:', error);
        
        // Try one more time with a simple localStorage check
        userID = localStorage.getItem('userId') || localStorage.getItem('user_id') || localStorage.getItem('id');
        
        if (!userID) {
          throw new Error('User ID not found. Please log in again.');
        }
        
        console.log('Using fallback user ID from localStorage:', userID);
      }
      
      if (!userID) {
        throw new Error('User ID not found');
      }
      
      const paymentData = {
        gateway: 'razorpay', // Default gateway
        is_default: document.getElementById('setDefaultPayment')?.checked || false
      };
      
      if (currentPaymentType === 'card') {
        const cardNumber = document.getElementById('cardNumber')?.value.replace(/\s/g, '') || '';
        const expiryDate = document.getElementById('expiryDate')?.value || '';
        const [expMonth, expYear] = expiryDate.split('/');
        
        paymentData.card_number = cardNumber;
        paymentData.card_holder_name = document.getElementById('cardholderName')?.value || '';
        paymentData.card_exp_month = parseInt(expMonth);
        paymentData.card_exp_year = parseInt('20' + expYear); // Convert YY to YYYY
        paymentData.cvv = document.getElementById('cvv')?.value || '';
      } else if (currentPaymentType === 'upi') {
        paymentData.upi_id = document.getElementById('upiId')?.value || '';
      }
      
      // Ensure userID is available (should already be resolved during initialization)
      const resolvedUserID = ensureUserID();
      
      // Call backend API
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/${resolvedUserID}/payment-method`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      
      // Close modal first
      $('#paymentMethodModal').modal('hide');
      
      // Reset form
      form.reset();
      
      // Reset payment type
      currentPaymentType = null;
      const paymentTypeField = document.getElementById('paymentType');
      if (paymentTypeField) paymentTypeField.value = '';
      
      // Show success message
      alert('Payment method saved successfully!');
      
      // Reload payment methods to show the new one
      await loadPaymentMethods();
      
      // Check for pending upgrade
      const pendingUpgrade = localStorage.getItem('pendingUpgrade');
      if (pendingUpgrade) {
        localStorage.removeItem('pendingUpgrade');
        const upgrade = JSON.parse(pendingUpgrade);
        setTimeout(() => {
          initiateUpgrade(upgrade.tier, upgrade.cycle);
        }, 1000);
      }
      
    } catch (error) {
      console.error('Error saving payment method:', error);
      alert('Failed to save payment method: Please provide valid card details.');
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.innerHTML = '<i class="fa fa-save"></i> Save Payment Method';
      }
    }
  }

  // Simulate payment method save
  async function simulatePaymentMethodSave(paymentData) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMethod = {
          id: Date.now(),
          type: paymentData.type,
          display_name: paymentData.type === 'card' ? paymentData.masked_card : paymentData.upi_id,
          is_default: paymentData.is_default,
          created_at: new Date().toISOString()
        };
        
        savedPaymentMethods.push(newMethod);
        localStorage.setItem('savedPaymentMethods', JSON.stringify(savedPaymentMethods));
        
        resolve({ success: true, method: newMethod });
      }, 1000);
    });
  }

  // Subscription upgrade functionality
  const SUBSCRIPTION_PLANS = {
    starter: {
      name: 'Starter',
      monthly: 0,
      yearly: 0,
      features: ['5 users', '50 bookings/month', 'Basic support', 'Standard reporting']
    },
    trial: {
      name: 'Trial',
      monthly: 0,
      yearly: 0,
      features: ['5 users', '50 bookings/month', 'Basic support', 'Standard reporting', '30-day trial']
    },
    free_agent: {
      name: 'Free Agent',
      monthly: 0,
      yearly: 0,
      features: ['1 user', '10 bookings/month', 'Basic support']
    },
    pro: {
      name: 'Professional',
      monthly: 29.99,
      yearly: 299.99,
      features: ['15 users', '500 bookings/month', 'Priority support', 'Advanced reporting', 'API access']
    },
    business: {
      name: 'Business',
      monthly: 99.99,
      yearly: 999.99,
      features: ['50 users', '2000 bookings/month', 'Custom branding', 'Advanced integrations', 'Dedicated support']
    },
    enterprise: {
      name: 'Enterprise',
      monthly: 'Custom',
      yearly: 'Custom',
      features: ['Unlimited users', 'Unlimited bookings', 'White-label solution', '24/7 support', 'Custom features', 'Dedicated account manager']
    }
  };

  // Define upgrade paths based on current tier
  const UPGRADE_PATHS = {
    starter: ['pro', 'business'],
    trial: ['pro', 'business'],
    free_agent: ['pro', 'business'],
    pro: ['business'],
    business: ['enterprise'],
    enterprise: [] // No upgrades available
  };

  let currentUpgrade = { tier: null, cycle: null, amount: 0 };

  // Load available upgrade plans based on current tier
  function loadAvailableUpgradePlans() {
    const currentTier = getCurrentSubscriptionTier();
    const availableUpgrades = UPGRADE_PATHS[currentTier] || [];
    const plansContainer = document.getElementById('subscriptionPlans');
    const pricingNote = document.getElementById('pricingNote');
    
    if (!plansContainer) {
      console.warn('subscriptionPlans container not found');
      return;
    }
    
    console.log(`Loading upgrade plans for current tier: ${currentTier}`, {
      currentTier,
      availableUpgrades,
      UPGRADE_PATHS
    });
    
    // Show loading state initially
    plansContainer.innerHTML = `
      <div class="col-12">
        <div class="text-center py-4">
          <div class="spinner-border text-primary mb-3" role="status">
            <span class="sr-only">Loading...</span>
          </div>
          <p class="text-muted">Loading upgrade options...</p>
          </div>
        </div>
      `;
    
    // Simulate a small delay to show loading state
    setTimeout(() => {
      if (availableUpgrades.length === 0) {
        plansContainer.innerHTML = `
          <div class="col-12">
            <div class="alert alert-success text-center">
              <i class="fa fa-star fa-2x mb-3"></i>
              <h5>You're on the highest tier!</h5>
              <p class="mb-0">You're already enjoying all our premium features. Thank you for being a valued customer!</p>
              <small class="text-muted d-block mt-2">Current tier: ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</small>
        </div>
      </div>
    `;
        if (pricingNote) pricingNote.style.display = 'none';
        return;
      }
      
      // Load the actual upgrade plans
      loadUpgradePlansContent(currentTier, availableUpgrades, plansContainer, pricingNote);
    }, 500);
  }
  
  // Separate function to load upgrade plans content
  function loadUpgradePlansContent(currentTier, availableUpgrades, plansContainer, pricingNote) {
    
    // Show pricing note if available
    if (pricingNote) pricingNote.style.display = 'block';
    
    // Generate upgrade plan cards
    plansContainer.innerHTML = availableUpgrades.map(tier => {
      const plan = SUBSCRIPTION_PLANS[tier];
      const isEnterprise = tier === 'enterprise';
      const cardColor = tier === 'pro' ? 'primary' : tier === 'business' ? 'success' : 'warning';
      
      if (isEnterprise) {
        return `
          <div class="col-md-6 mb-3">
            <div class="card border-${cardColor} h-100">
              <div class="card-header bg-${cardColor} ${cardColor === 'warning' ? 'text-dark' : 'text-white'} text-center">
                <h6 class="mb-0">${plan.name}</h6>
                <small>For large organizations</small>
          </div>
              <div class="card-body text-center">
                <div class="mb-3">
                  <h3 class="text-${cardColor}">Custom Pricing</h3>
                  <small class="text-muted">Tailored to your needs</small>
                </div>
                <ul class="list-unstyled text-left">
                  ${plan.features.map(feature => `<li><i class="fa fa-check text-success"></i> ${feature}</li>`).join('')}
            </ul>
                <div class="mt-auto">
                  <button class="btn btn-${cardColor} btn-sm btn-block" onclick="contactEnterpriseSales()">
                    <i class="fa fa-phone"></i> Contact Sales
                  </button>
                  <small class="text-muted mt-2 d-block">Custom demo & pricing</small>
          </div>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="col-md-6 mb-3">
            <div class="card border-${cardColor} h-100">
              <div class="card-header bg-${cardColor} text-white text-center">
                <h6 class="mb-0">${plan.name}</h6>
                <small>${tier === 'pro' ? 'Perfect for growing teams' : 'For established companies'}</small>
              </div>
              <div class="card-body text-center">
                <div class="mb-3">
                  <h3 class="text-${cardColor}">$${plan.monthly}<small class="text-muted">/month</small></h3>
                  <p class="text-success mb-1">$${plan.yearly}/year <span class="badge badge-success">Save 17%</span></p>
                  <small class="text-muted">*Includes 2.5% payment processing fee</small>
                </div>
                <ul class="list-unstyled text-left">
                  ${plan.features.map(feature => `<li><i class="fa fa-check text-success"></i> ${feature}</li>`).join('')}
                </ul>
                <div class="mt-auto">
                  <button class="btn btn-${cardColor} btn-sm btn-block mb-2" onclick="initiateUpgrade('${tier}', 'monthly')">
                    <i class="fa fa-arrow-up"></i> Upgrade Monthly
                  </button>
                  <button class="btn btn-outline-${cardColor} btn-sm btn-block" onclick="initiateUpgrade('${tier}', 'yearly')">
                    <i class="fa fa-arrow-up"></i> Upgrade Yearly
            </button>
                </div>
          </div>
        </div>
      </div>
    `;
      }
    }).join('');
  }

  // Get current subscription tier from profile data
  function getCurrentSubscriptionTier() {
    // Try multiple sources for subscription tier
    let tier = null;
    
    // Check subscription data first
    if (subscriptionData?.subscription_tier) {
      tier = subscriptionData.subscription_tier;
    }
    // Check profile data
    else if (profileData?.subscription_tier) {
      tier = profileData.subscription_tier;
    }
    // Check current user data
    else if (currentUserData?.profile?.subscription_tier) {
      tier = currentUserData.profile.subscription_tier;
    }
    
    // Normalize the tier name and provide fallback
    if (tier) {
      const normalizedTier = tier.toLowerCase().trim();
      console.log('Current subscription tier detected:', normalizedTier);
      return normalizedTier;
    }
    
    console.log('No subscription tier found, defaulting to starter');
    return 'starter'; // Default fallback
  }

  // Contact enterprise sales
  function contactEnterpriseSales() {
    // Pre-populate form with existing user data
    const contactName = document.getElementById('contactName');
    const contactEmail = document.getElementById('contactEmail');
    const contactCompany = document.getElementById('contactCompany');
    
    if (contactName && currentUserData?.username) {
      contactName.value = currentUserData.username;
    }
    if (contactEmail && currentUserData?.email) {
      contactEmail.value = currentUserData.email;
    }
    if (contactCompany && profileData?.company_name) {
      contactCompany.value = profileData.company_name;
    }
    
    // Show enterprise contact modal
    const modal = $('#enterpriseContactModal');
    if (modal.length) {
      modal.modal('show');
    } else {
      alert('Enterprise contact form is loading. Please try again in a moment.');
    }
  }

  // Submit enterprise contact form
  async function submitEnterpriseContact() {
    const form = document.getElementById('enterpriseContactForm');
    const submitButton = document.getElementById('submitEnterpriseContact');
    
    if (!form || !form.checkValidity()) {
      if (form) form.reportValidity();
      return;
    }
    
    try {
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Submitting...';
      
      // Collect form data
      const formData = {
        name: document.getElementById('contactName')?.value || '',
        email: document.getElementById('contactEmail')?.value || '',
        phone: document.getElementById('contactPhone')?.value || '',
        company: document.getElementById('contactCompany')?.value || '',
        role: document.getElementById('contactRole')?.value || '',
        company_size: document.getElementById('contactCompanySize')?.value || '',
        use_case: document.getElementById('contactUseCase')?.value || '',
        expected_users: document.getElementById('contactCurrentUsers')?.value || '',
        expected_bookings: document.getElementById('contactBookingsVolume')?.value || '',
        timeline: document.getElementById('contactTimeline')?.value || '',
        budget: document.getElementById('contactBudget')?.value || '',
        requirements: document.getElementById('contactRequirements')?.value || '',
        consent: document.getElementById('contactConsent')?.checked || false,
        current_tier: getCurrentSubscriptionTier(),
        user_id: userID,
        organization_id: getOrganizationId()
      };
      
      console.log('Submitting enterprise contact form:', formData);
      
      // Submit to backend
      const response = await fetch(`${Endpoint}/api/v1/enterprise/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const result = await response.json();
        alert('Thank you for your interest! Our enterprise team will contact you within 24 hours.');
        $('#enterpriseContactModal').modal('hide');
        form.reset();
      } else {
        const error = await response.text();
        throw new Error(error || 'Failed to submit contact form');
      }
      
    } catch (error) {
      console.error('Error submitting enterprise contact:', error);
      alert('Failed to submit contact form. Please try again or contact us directly.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fa fa-send"></i> Submit Inquiry';
      }
    }
  }

  // Initiate subscription upgrade
  async function initiateUpgrade(tier, cycle) {
    try {
      const plan = SUBSCRIPTION_PLANS[tier];
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }
      
      console.log(`Initiating upgrade to ${tier} (${cycle})`);
      
      if (tier === 'enterprise') {
        contactEnterpriseSales();
        return;
      }
      
      const amount = plan[cycle];
      currentUpgrade = { tier, cycle, amount };
      
      // Check if user has payment methods first
      const hasPaymentMethods = savedPaymentMethods && savedPaymentMethods.length > 0;
      
      if (!hasPaymentMethods) {
        // Show payment method setup first
        const shouldAddPayment = confirm(
          `To upgrade to ${plan.name}, you need to add a payment method first.\n\nWould you like to add a payment method now?`
        );
        
        if (shouldAddPayment) {
          // Store the upgrade intent and show payment method modal
          localStorage.setItem('pendingUpgrade', JSON.stringify(currentUpgrade));
          addPaymentMethod('card');
          return;
        } else {
          return; // User cancelled
        }
      }
      
      // Update modal content
      const upgradeTitle = document.getElementById('upgradeTitle');
      const upgradeDescription = document.getElementById('upgradeDescription');
      const selectedPlan = document.getElementById('selectedPlan');
      const selectedCycle = document.getElementById('selectedCycle');
      const upgradeAmount = document.getElementById('upgradeAmount');
      
      if (upgradeTitle) upgradeTitle.textContent = `Upgrade to ${plan.name}`;
      if (upgradeDescription) upgradeDescription.textContent = `You're about to upgrade to the ${plan.name} plan (${cycle} billing)`;
      if (selectedPlan) selectedPlan.textContent = plan.name;
      if (selectedCycle) selectedCycle.textContent = cycle.charAt(0).toUpperCase() + cycle.slice(1);
      if (upgradeAmount) upgradeAmount.textContent = `$${amount.toFixed(2)}`;
      
      // Populate payment method dropdown
      updatePaymentMethodDropdown();
      
      // Reset modal state
      resetUpgradeModal();
      
      // Show modal
      const modal = $('#upgradeModal');
      if (modal.length) {
        modal.modal('show');
      } else {
        // Fallback for when modal is not available
        const confirmUpgrade = confirm(
          `Upgrade to ${plan.name} (${cycle}) for $${amount.toFixed(2)}?\n\nThis will redirect you to payment processing.`
        );
        if (confirmUpgrade) {
          processUpgradePayment();
        }
      }
      
    } catch (error) {
      console.error('Error initiating upgrade:', error);
      alert('Failed to initiate upgrade. Please try again.');
    }
  }
  
  // Update payment method dropdown for upgrade modal
  function updatePaymentMethodDropdown() {
    const dropdown = document.getElementById('upgradePaymentMethod');
    
    if (!dropdown) return;
    
    if (!savedPaymentMethods || savedPaymentMethods.length === 0) {
      dropdown.innerHTML = '<option value="">No payment methods available</option>';
      dropdown.disabled = true;
    } else {
      dropdown.disabled = false;
      dropdown.innerHTML = `
        <option value="">Choose payment method...</option>
        ${savedPaymentMethods.map(method => `
          <option value="${method.id}">${method.display_name} ${method.is_default ? '(Default)' : ''}</option>
        `).join('')}
      `;
    }
  }
  
  // Process upgrade payment
  async function processUpgradePayment() {
    const selectedPaymentMethodId = document.getElementById('upgradePaymentMethod')?.value;
    
    if (!selectedPaymentMethodId && savedPaymentMethods && savedPaymentMethods.length > 0) {
      alert('Please select a payment method');
        return;
      }
      
    try {
      console.log('Processing upgrade payment:', currentUpgrade);
      
      // Show processing state
      const confirmationDiv = document.getElementById('upgradeConfirmation');
      const processingDiv = document.getElementById('paymentProcessing');
      const footerDiv = document.getElementById('upgradeModalFooter');
      
      if (confirmationDiv) confirmationDiv.style.display = 'none';
      if (processingDiv) processingDiv.style.display = 'block';
      if (footerDiv) footerDiv.style.display = 'none';
      
      // Create payment intent
      const paymentIntent = await createPaymentIntent(currentUpgrade);
      
      if (!paymentIntent.success) {
        throw new Error(paymentIntent.message || 'Failed to create payment intent');
      }
      
      // Process payment (simulate for demo)
      const paymentResult = await processPayment(paymentIntent, selectedPaymentMethodId);
      
      if (paymentResult.success) {
        // Show success state
        const successDiv = document.getElementById('paymentSuccess');
        if (processingDiv) processingDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'block';
        
        // Update user profile data
        await refreshUserProfileAfterUpgrade();
        
      } else {
        throw new Error(paymentResult.message || 'Payment processing failed');
      }
      
    } catch (error) {
      console.error('Error processing upgrade payment:', error);
      
      // Show error state
      const processingDiv = document.getElementById('paymentProcessing');
      const errorDiv = document.getElementById('paymentError');
      const errorMessage = document.getElementById('paymentErrorMessage');
      
      if (processingDiv) processingDiv.style.display = 'none';
      if (errorDiv) errorDiv.style.display = 'block';
      if (errorMessage) errorMessage.textContent = error.message;
    }
  }
  
  // Create payment intent with backend
  async function createPaymentIntent(upgrade) {
    try {
      const response = await fetch(`${Endpoint}/api/v1/payments/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subscription_tier: upgrade.tier,
          billing_cycle: upgrade.cycle
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
      
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return { success: false, message: error.message };
    }
  }
  
  // Process payment (simplified version - in production this would integrate with Stripe/Razorpay)
  async function processPayment(paymentIntent, paymentMethodId) {
    return new Promise((resolve) => {
      // Simulate payment processing delay
      setTimeout(() => {
        // Simulate successful payment (90% success rate for demo)
        const isSuccess = Math.random() > 0.1;
        
        if (isSuccess) {
          resolve({
            success: true,
            payment_id: 'pay_' + Date.now(),
            transaction_id: 'txn_' + Date.now()
          });
        } else {
          resolve({
            success: false,
            message: 'Payment was declined by your bank. Please try a different payment method.'
          });
        }
      }, 3000); // 3 second delay to simulate processing
    });
  }
  
  // Refresh user profile after successful upgrade
  async function refreshUserProfileAfterUpgrade() {
    try {
      // Reload profile data to get updated subscription info
      await loadCurrentUserData();
      await loadProfileData();
      await loadSubscriptionData();
      
      // Update UI elements
      updateProfileHeader();
      updateSubscriptionTab();
      configureUIForUserType();
      
      console.log('Profile refreshed after successful upgrade');
      
    } catch (error) {
      console.error('Error refreshing profile after upgrade:', error);
    }
  }
  
  // Debug function to test with different tiers
  function debugUpgradePlans(testTier = 'starter') {
    console.log(`Testing upgrade plans for tier: ${testTier}`);
    
    // Temporarily override the tier detection
    const originalData = subscriptionData;
    subscriptionData = { subscription_tier: testTier };
    
    loadAvailableUpgradePlans();
    
    // Restore original data
    setTimeout(() => {
      subscriptionData = originalData;
    }, 1000);
  }
  
  // Debug function to check localStorage for user ID
  function debugUserID() {
    console.log("=== User ID Debug Information ===");
    console.log("All localStorage keys:", Object.keys(localStorage));
    
    const possibleKeys = ["userId", "user_id", "id", "userID", "user", "currentUser"];
    console.log("Checking possible user ID keys:");
    
    possibleKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`  ${key}:`, value);
    });
    
    console.log("Current global userID variable:", userID);
    console.log("Token exists:", !!localStorage.getItem("token"));
    console.log("Endpoint:", Endpoint);
    
    // Try to resolve user ID
    resolveUserID()
      .then(id => console.log("Resolved user ID:", id))
      .catch(error => console.error("Failed to resolve user ID:", error));
  }
  
  // Debug function to manually test payment methods loading
  function debugPaymentMethods() {
    console.log("=== Payment Methods Debug ===");
    console.log("Profile data:", profileData);
    console.log("Subscription data:", subscriptionData);
    console.log("Current user data:", currentUserData);
    console.log("Is SaaS user:", isSaaSUser());
    
    // Manually call loadPaymentMethods
    console.log("Manually calling loadPaymentMethods...");
    loadPaymentMethods();
  }

  // Reset upgrade modal
  function resetUpgradeModal() {
    const elements = [
      { id: 'upgradeConfirmation', display: 'block' },
      { id: 'paymentProcessing', display: 'none' },
      { id: 'paymentSuccess', display: 'none' },
      { id: 'paymentError', display: 'none' },
      { id: 'upgradeModalFooter', display: 'block' }
    ];
    
    elements.forEach(({ id, display }) => {
      const element = document.getElementById(id);
      if (element) element.style.display = display;
    });
  }

  // Input formatting functions
  function formatCardNumber(input) {
    let value = input.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    input.value = formattedValue;
  }

  function formatExpiryDate(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    input.value = value;
  }

  function formatCVV(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
  }

  // Initialize payment functionality event listeners
  function initializePaymentEventListeners() {
    // Add event listeners for payment method form inputs
    const cardNumberInput = document.getElementById('cardNumber');
    const expiryDateInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');
    
    if (cardNumberInput) {
      cardNumberInput.addEventListener('input', function() {
        formatCardNumber(this);
      });
    }
    
    if (expiryDateInput) {
      expiryDateInput.addEventListener('input', function() {
        formatExpiryDate(this);
      });
    }
    
    if (cvvInput) {
      cvvInput.addEventListener('input', function() {
        formatCVV(this);
      });
    }
    
    // Add event listener for save payment method button
    const savePaymentButton = document.getElementById('savePaymentMethod');
    if (savePaymentButton) {
      savePaymentButton.addEventListener('click', savePaymentMethod);
    }
    
    // Add event listener for confirm upgrade button
    const confirmUpgradeButton = document.getElementById('confirmUpgrade');
    if (confirmUpgradeButton) {
      confirmUpgradeButton.addEventListener('click', processUpgradePayment);
    }
  }

  // Initialize payment functionality when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePaymentEventListeners);
      } else {
    initializePaymentEventListeners();
  }

  // Scroll to upgrade plans section
  function scrollToUpgradePlans() {
    const subscriptionTab = document.getElementById('subscription-tab');
    if (subscriptionTab) {
      subscriptionTab.click();
      setTimeout(() => {
        const plansSection = document.getElementById('subscriptionPlans');
        if (plansSection) {
          plansSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }

  // Initialize enterprise contact event listeners
  function initializeEnterpriseContactEventListeners() {
    const submitButton = document.getElementById('submitEnterpriseContact');
    if (submitButton) {
      submitButton.addEventListener('click', submitEnterpriseContact);
    }
  }

  // Initialize subscription tab event listener
  function initializeSubscriptionTabEventListener() {
    const subscriptionTab = document.getElementById('subscription-tab');
    if (subscriptionTab) {
      subscriptionTab.addEventListener('shown.bs.tab', function() {
        console.log('Subscription tab activated, loading upgrade plans');
        setTimeout(loadAvailableUpgradePlans, 100);
      });
    }
  }
  
  // Initialize billing tab event listener
  function initializeBillingTabEventListener() {
    const billingTab = document.getElementById('billing-tab');
    if (billingTab) {
      billingTab.addEventListener('shown.bs.tab', function() {
        console.log('Billing tab activated, loading payment methods');
        setTimeout(loadPaymentMethods, 100);
      });
    }
  }

  // Initialize all event listeners when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initializePaymentEventListeners();
      initializeEnterpriseContactEventListeners();
      initializeSubscriptionTabEventListener();
      initializeBillingTabEventListener();
    });
  } else {
    initializePaymentEventListeners();
    initializeEnterpriseContactEventListeners();
    initializeSubscriptionTabEventListener();
    initializeBillingTabEventListener();
  }

  // Make essential functions available globally
  window.activateTab = activateTab;
  window.scrollToCompletionSteps = scrollToCompletionSteps;
  window.scrollToUpgradePlans = scrollToUpgradePlans;
  window.upgradePlan = upgradePlan;
  window.processUpgrade = processUpgrade;
  window.addPaymentMethod = addPaymentMethod;
  window.removePaymentMethod = removePaymentMethod;
  window.loadPaymentMethods = loadPaymentMethods;
  window.initiateUpgrade = initiateUpgrade;
  window.processUpgradePayment = processUpgradePayment;
  window.savePaymentMethod = savePaymentMethod;
  window.resetUpgradeModal = resetUpgradeModal;
  window.contactEnterpriseSales = contactEnterpriseSales;
  window.submitEnterpriseContact = submitEnterpriseContact;
  window.loadAvailableUpgradePlans = loadAvailableUpgradePlans;
  window.debugUpgradePlans = debugUpgradePlans;
  window.debugUserID = debugUserID;
  window.debugPaymentMethods = debugPaymentMethods;
  window.updateTaxFieldsVisibility = updateTaxFieldsVisibility;

  /**
   * Update organization tab with user statistics and management options
   */
  function updateOrganizationTab() {
    // Check if we have an organization tab
    const organizationTab = document.getElementById("organization");
    if (!organizationTab) return;
    
    // Check if user is an admin or super admin
    if (!isAdmin() && !isSuperAdmin()) return;
    
    // Check user limits via API before updating UI
    checkUserLimit().then(userLimitData => {
      // Update UI with the precise data from the API
      updateOrganizationUserStatsWithData(userLimitData);
    }).catch(error => {
      console.error("Error checking user limits:", error);
      // Fall back to basic stats if the API call fails
      updateOrganizationUserStats();
    });
    
    // Load organization users if not already loaded
    loadOrganizationUsers();
    
    // Check analytics access and show/hide analytics section
    updateAnalyticsAccess();
    
    // Load serviceable countries management for admins
    loadServiceableCountriesSection();
  }
  
  /**
   * Check organization user limits via API
   * @returns {Promise<Object>} User limit data
   */
  async function checkUserLimit() {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      // Get organization ID using helper function
      const organizationId = getOrganizationId();
      
      if (!organizationId) {
        throw new Error("Organization ID not found - cannot check user limits");
      }
      
      const response = await fetch(`${Endpoint}/api/v1/user-profiles/organization/${organizationId}/user-count`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user limits: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        current: data.current_users,
        limit: data.user_limit,
        canAddMore: data.current_users < data.user_limit,
        subscription_tier: data.subscription_tier
      };
    } catch (error) {
      console.warn("Error checking user limits, using local data:", error);
      
      // Fall back to local data
      const currentUsers = formatLimitValue(profileData.usage_stats?.users || 
                          subscriptionData?.usage?.users || 
                          usageData?.metrics?.users?.current || 1);
      
      const userLimitValue = subscriptionData?.limits?.users || 
                            usageData?.metrics?.users?.limit || 
                            "Unlimited";
                            
      return {
        current: currentUsers,
        limit: userLimitValue,
        canAddMore: typeof userLimitValue !== 'number' || currentUsers < userLimitValue,
        subscription_tier: subscriptionData?.subscription_tier || "enterprise"
      };
    }
  }

  /**
   * Format a limit value for display, converting -1 to "Unlimited"
   * @param {number|string} value - The limit value to format
   * @returns {string|number} - Formatted value
   */
  function formatLimitValue(value) {
    if (value === -1 || value === "-1") {
      return "Unlimited";
    }
    return value;
  }
  
  /**
   * Update organization user statistics with data from API
   * @param {Object} userLimitData - User limit data from API
   */
  function updateOrganizationUserStatsWithData(userLimitData) {
    const userCount = document.getElementById("orgUserCount");
    const userLimit = document.getElementById("orgUserLimit");
    const progressBar = document.getElementById("orgUserProgressBar");
    
    if (!userCount || !userLimit || !progressBar) return;
    
    // Format limit value, converting -1 to "Unlimited"
    const displayLimit = formatLimitValue(userLimitData.limit);
    
    // Update the display elements with API data
    userCount.textContent = formatLimitValue(userLimitData.current);
    userLimit.textContent = displayLimit;
    
    // Update progress bar
    if (userLimitData.limit === -1 || userLimitData.limit === "-1" || 
        typeof userLimitData.limit === 'string' && userLimitData.limit.toLowerCase() === 'unlimited') {
      // For unlimited users
      progressBar.style.width = "10%"; // Show minimal progress for unlimited
      progressBar.classList.add("bg-success");
    } else if (typeof userLimitData.limit === 'number' && userLimitData.limit > 0) {
      const percentage = Math.min(100, Math.round((userLimitData.current / userLimitData.limit) * 100));
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute("aria-valuenow", percentage);
      
      // Change color based on percentage
      progressBar.className = "progress-bar";
      if (percentage > 90) {
        progressBar.classList.add("bg-danger");
      } else if (percentage > 70) {
        progressBar.classList.add("bg-warning");
      } else {
        progressBar.classList.add("bg-info");
      }
    } else {
      // For unlimited users
      progressBar.style.width = "10%"; // Show minimal progress for unlimited
      progressBar.classList.add("bg-success");
    }
    
    // Update the button state if at limit - get the organization tab directly
    const organizationTabElement = document.getElementById("organization");
    if (!organizationTabElement) return;
    
    const addUserButton = organizationTabElement.querySelector("a.btn-primary[href='add_user.html']");
    if (addUserButton) {
      // Disable button if at user limit (except for unlimited plans)
      if (!userLimitData.canAddMore && userLimitData.limit !== -1 && userLimitData.limit !== "-1" &&
          !(typeof userLimitData.limit === 'string' && userLimitData.limit.toLowerCase() === 'unlimited')) {
        addUserButton.classList.replace("btn-primary", "btn-secondary");
        addUserButton.setAttribute("disabled", "disabled");
        addUserButton.setAttribute("title", "User limit reached. Upgrade your plan to add more users.");
        addUserButton.innerHTML = "<i class='fa fa-lock'></i> User Limit Reached";
        
        // Add an upgrade button
        if (!addUserButton.nextElementSibling || !addUserButton.nextElementSibling.classList.contains('btn-warning')) {
          const upgradeButton = document.createElement("a");
          upgradeButton.className = "btn btn-warning ml-2";
          upgradeButton.innerHTML = "<i class='fa fa-arrow-up'></i> Upgrade Plan";
          upgradeButton.onclick = function() { upgradePlan(); return false; };
          addUserButton.parentNode.appendChild(upgradeButton);
        }
      }
    }
  }

  /**
   * Check if user has analytics access and update UI
   */
  function updateAnalyticsAccess() {
    const analyticsSection = document.getElementById("analyticsSection");
    if (!analyticsSection) return;
    
    if (canViewAnalytics()) {
      analyticsSection.style.display = "block";
      // Additional analytics initialization could go here
        } else {
      analyticsSection.style.display = "none";
    }
  }
  
  /**
   * Check if the current user can view analytics
   * @returns {boolean} - Whether user can view analytics
   */
  function canViewAnalytics() {
    // Super admin can always view
    if (isSuperAdmin()) return true;
    
    // Primary admin can view their own analytics
    if (isAdmin() && profileData.is_primary_profile) return true;
    
    // Others cannot view
    return false;
  }
  
  /**
   * Load organization users from the API
   */
  async function loadOrganizationUsers() {
    const usersList = document.getElementById("organizationUsers");
    if (!usersList) return;
    
    // Check if user is authorized to view organization users
    if (!isAdmin() && !isSuperAdmin()) return;
    
    try {
      // Show loading state
      usersList.innerHTML = `<tr><td colspan="4" class="text-center"><i class="fa fa-spinner fa-spin"></i> Loading users...</td></tr>`;
      
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");
      
      // Get organization ID using helper function
      const organizationId = getOrganizationId();
      
      if (!organizationId) {
        console.error("No organization_id found - cannot load organization users");
        return; // Exit gracefully if no organization ID
      }
      
      const response = await fetch(`${Endpoint}/api/v1/users/organization/${organizationId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // Organization users endpoint not implemented yet
          usersList.innerHTML = `
            <tr>
              <td colspan="4" class="text-center">
            <div class="alert alert-info">
                  <i class="fa fa-info-circle"></i> Organization user management is coming soon.
            </div>
              </td>
        </tr>
        `;
        return;
        }
        throw new Error(`Failed to fetch organization users: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Debug: Log the actual API response structure
      console.log("Organization users API response:", data);
      if (data.users && data.users.length > 0) {
        console.log("Sample user object structure:", data.users[0]);
      }
      
      // Update user count and limit in the UI
      const userCount = document.getElementById("orgUserCount");
      const userLimit = document.getElementById("orgUserLimit");
          if (userCount && data.total_count !== undefined) userCount.textContent = formatLimitValue(data.total_count);
    if (userLimit && data.user_limit !== undefined) userLimit.textContent = formatLimitValue(data.user_limit);
      
      // If no users or empty array
      if (!data.users || data.users.length === 0) {
        usersList.innerHTML = `
          <tr>
            <td colspan="4" class="text-center">No users found in this organization</td>
          </tr>
        `;
        return;
      }
      
      // Generate HTML for users
      let html = '';
      data.users.forEach((user, index) => {
        html += `
          <tr>
            <td>${index + 1}</td>
            <td>
              ${user.username}
              ${user.is_primary_admin ? '<span class="badge badge-primary ml-1">Primary</span>' : ''}
        </td>
        <td>
              ${user.email || 'No email provided'}
        </td>
            <td>${formatUserType(user.user_type)}</td>
          </tr>
        `;
      });
      
      usersList.innerHTML = html;
      
    } catch (error) {
      console.error("Error loading organization users:", error);
      usersList.innerHTML = `
        <tr>
          <td colspan="4" class="text-center">
            <div class="alert alert-warning">
              <i class="fa fa-exclamation-triangle"></i> Failed to load users: ${error.message}
            </div>
          </td>
        </tr>
      `;
    }
  }

  /**
   * Format user type for display
   * @param {string} userType - User type from API
   * @returns {string} - Formatted user type
   */
  function formatUserType(userType) {
    if (!userType) return 'Agent';
    
    switch(userType.toLowerCase()) {
      case 'super_admin':
        return 'Super Admin';
      case 'primary_admin':
        return 'Primary Admin';
      case 'sub_admin':
        return 'Admin';
      case 'agent':
        return 'Agent';
      default:
        return userType.charAt(0).toUpperCase() + userType.slice(1);
    }
  }

  /**
   * Update organization user statistics based on subscription data
   */
  function updateOrganizationUserStats() {
    const userCount = document.getElementById("orgUserCount");
    const userLimit = document.getElementById("orgUserLimit");
    const progressBar = document.getElementById("orgUserProgressBar");
    
    if (!userCount || !userLimit || !progressBar) return;
    
    // Get user counts from subscription or usage data  
    const currentUsers = formatLimitValue(profileData.usage_stats?.users || 
                        subscriptionData?.usage?.users || 
                        usageData?.metrics?.users?.current || 1);
    
    let userLimitValue = subscriptionData?.limits?.users || 
                        usageData?.metrics?.users?.limit || 
                        "Unlimited";
    
    // Format limit value, converting -1 to "Unlimited"
    const displayLimit = formatLimitValue(userLimitValue);
    
    // Update the display elements
    userCount.textContent = currentUsers;
    userLimit.textContent = displayLimit;
    
    // Update progress bar
    if (userLimitValue === -1 || userLimitValue === "-1" || 
        typeof userLimitValue === 'string' && userLimitValue.toLowerCase() === 'unlimited') {
      // For unlimited users
      progressBar.style.width = "10%"; // Show minimal progress for unlimited
      progressBar.classList.add("bg-success");
    } else if (typeof userLimitValue === 'number' && userLimitValue > 0) {
      const percentage = Math.min(100, Math.round((currentUsers / userLimitValue) * 100));
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute("aria-valuenow", percentage);
      
      // Change color based on percentage
      progressBar.className = "progress-bar";
      if (percentage > 90) {
        progressBar.classList.add("bg-danger");
      } else if (percentage > 70) {
        progressBar.classList.add("bg-warning");
      } else {
        progressBar.classList.add("bg-info");
      }
    } else {
      // For unlimited users
      progressBar.style.width = "10%"; // Show minimal progress for unlimited
      progressBar.classList.add("bg-success");
    }
    
    // Update the button state if at limit - get the organization tab directly
    const organizationTabElement = document.getElementById("organization");
    if (!organizationTabElement) return;
    
    const addUserButton = organizationTabElement.querySelector("a.btn-primary[href='add_user.html']");
    if (addUserButton) {
      // Disable button if at user limit (except for unlimited plans)
      if (typeof userLimitValue === 'number' && userLimitValue > 0 && currentUsers >= userLimitValue) {
        addUserButton.classList.replace("btn-primary", "btn-secondary");
        addUserButton.setAttribute("disabled", "disabled");
        addUserButton.setAttribute("title", "User limit reached. Upgrade your plan to add more users.");
        addUserButton.innerHTML = "<i class='fa fa-lock'></i> User Limit Reached";
        
        // Add an upgrade button
        const upgradeButton = document.createElement("a");
        upgradeButton.className = "btn btn-warning ml-2";
        upgradeButton.innerHTML = "<i class='fa fa-arrow-up'></i> Upgrade Plan";
        upgradeButton.onclick = function() { upgradePlan(); return false; };
        addUserButton.parentNode.appendChild(upgradeButton);
      }
    }
  }

  /**
   * Load and display serviceable countries management section for admins
   */
  async function loadServiceableCountriesSection() {
    const serviceableSection = document.getElementById("serviceableCountriesSection");
    if (!serviceableSection) return;
    
    // Only show for admins and super admins
    if (!isAdmin() && !isSuperAdmin()) {
      serviceableSection.style.display = "none";
      return;
    }
    
    try {
      // Show the section
      serviceableSection.style.display = "block";
      
      // Get organization ID using helper function  
      const organizationId = getOrganizationId();
      
      if (!organizationId) {
        console.error("No organization_id found for serviceable countries");
        serviceableSection.style.display = "none";
        return;
      }
      
      // Load available countries and organization countries in parallel
      const [availableCountries, orgCountries] = await Promise.all([
        loadAvailableCountries(),
        loadOrganizationCountries(organizationId)
      ]);
      
      // Populate service countries select
      populateServiceCountriesSelect(availableCountries, orgCountries);
      
      // Display current service countries
      displayCurrentServiceCountries(orgCountries);
      
      console.log(`Serviceable countries section loaded with ${availableCountries.length} available countries`);
      if (orgCountries && orgCountries.service_countries) {
        console.log(`Current service countries:`, orgCountries.service_countries.map(c => c.country_name).join(", "));
      }
      
      // Set up form submission handler
      setupServiceableCountriesForm();
      
    } catch (error) {
      console.error("Error loading serviceable countries section:", error);
      serviceableSection.style.display = "none";
    }
  }

  /**
   * Populate the service countries multi-select dropdown
   */
  function populateServiceCountriesSelect(availableCountries, orgCountries) {
    const serviceCountriesSelect = document.getElementById("serviceCountries");
    const primaryCountrySelect = document.getElementById("primaryServiceCountry");
    
    if (!serviceCountriesSelect || !primaryCountrySelect) return;
    
    // Clear existing options
    serviceCountriesSelect.innerHTML = "";
    primaryCountrySelect.innerHTML = '<option value="">Select Primary Country</option>';
    
    // Get currently selected countries from organization data
    const currentServiceCountries = orgCountries ? orgCountries.service_countries.map(c => c.country_code) : [];
    const currentPrimaryCountry = orgCountries ? orgCountries.primary_country : "";
    
    // Populate service countries select with all available countries
    availableCountries.forEach(country => {
      const option = document.createElement("option");
      option.value = country.code;
      option.textContent = `${country.name} (${country.currency_code})`;
      option.selected = currentServiceCountries.includes(country.code);
      
      // Add a visual indicator for currently selected countries
      if (currentServiceCountries.includes(country.code)) {
        option.style.backgroundColor = "#e3f2fd";
        option.style.fontWeight = "bold";
      }
      
      serviceCountriesSelect.appendChild(option);
    });
    
    // Add a helpful header option to show how many countries are available
    const headerOption = document.createElement("option");
    headerOption.disabled = true;
    headerOption.style.fontWeight = "bold";
    headerOption.style.backgroundColor = "#f8f9fa";
    headerOption.textContent = `--- Available Countries (${availableCountries.length}) ---`;
    serviceCountriesSelect.insertBefore(headerOption, serviceCountriesSelect.firstChild);
    
    // Populate primary country select with currently selected service countries
    currentServiceCountries.forEach(countryCode => {
      const country = availableCountries.find(c => c.code === countryCode);
      if (country) {
        const option = document.createElement("option");
        option.value = country.code;
        option.textContent = country.name;
        option.selected = countryCode === currentPrimaryCountry;
        primaryCountrySelect.appendChild(option);
      }
    });
    
    // Set up event listener to update primary country options when service countries change
    serviceCountriesSelect.addEventListener("change", function() {
      updatePrimaryCountryOptions(availableCountries, this, primaryCountrySelect);
    });
  }

  /**
   * Update primary country dropdown options based on selected service countries
   */
  function updatePrimaryCountryOptions(availableCountries, serviceCountriesSelect, primaryCountrySelect) {
    const selectedCountries = Array.from(serviceCountriesSelect.selectedOptions).map(option => option.value);
    
    // Clear primary country options
    primaryCountrySelect.innerHTML = '<option value="">Select Primary Country</option>';
    
    // Add options for selected service countries
    selectedCountries.forEach(countryCode => {
      const country = availableCountries.find(c => c.code === countryCode);
      if (country) {
        const option = document.createElement("option");
        option.value = country.code;
        option.textContent = country.name;
        primaryCountrySelect.appendChild(option);
        }
      });
    }

  /**
   * Display current service countries information
   */
  function displayCurrentServiceCountries(orgCountries) {
    const serviceCountriesListElement = document.getElementById("serviceCountriesList");
    if (!serviceCountriesListElement) return;
    
    if (!orgCountries || !orgCountries.service_countries || orgCountries.service_countries.length === 0) {
      serviceCountriesListElement.textContent = "No service countries configured";
      return;
    }
    
    const countriesList = orgCountries.service_countries.map(country => {
      return country.is_primary ? 
        `${country.country_name} (Primary)` : 
        country.country_name;
    }).join(", ");
    
    serviceCountriesListElement.textContent = countriesList;
  }

  /**
   * Set up form submission handler for serviceable countries
   */
  function setupServiceableCountriesForm() {
    const form = document.getElementById("serviceableCountriesForm");
    if (!form) return;
    
    // Remove existing event listeners
    form.removeEventListener("submit", handleServiceableCountriesSubmit);
    
    // Add new event listener
    form.addEventListener("submit", handleServiceableCountriesSubmit);
  }

  /**
   * Handle serviceable countries form submission
   */
  async function handleServiceableCountriesSubmit(e) {
    e.preventDefault();
    
    const serviceCountriesSelect = document.getElementById("serviceCountries");
    const primaryCountrySelect = document.getElementById("primaryServiceCountry");
    const submitButton = e.target.querySelector('button[type="submit"]');
    
    if (!serviceCountriesSelect || !primaryCountrySelect) return;
    
    // Get selected countries
    const selectedCountries = Array.from(serviceCountriesSelect.selectedOptions).map(option => option.value);
    const primaryCountry = primaryCountrySelect.value;
    
    // Validation
    if (selectedCountries.length === 0) {
      alert("Please select at least one service country");
      return;
    }
    
    if (!primaryCountry) {
      alert("Please select a primary country");
      return;
    }
    
    if (!selectedCountries.includes(primaryCountry)) {
      alert("Primary country must be one of the selected service countries");
      return;
    }
    
    try {
      // Show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
      
      // Get organization ID using helper function
      const organizationId = getOrganizationId();
      
      if (!organizationId) {
        throw new Error("Organization ID not found - cannot update service countries");
      }
      
      const result = await updateOrganizationCountries(organizationId, selectedCountries, primaryCountry);
      
      // Show success message
      alert(`Service countries updated successfully! ${result.affected_users} users affected.`);
      
      // Reload the section to show updated data
      loadServiceableCountriesSection();
      
    } catch (error) {
      console.error("Error updating service countries:", error);
      alert("Failed to update service countries. Please try again.");
    } finally {
      // Reset button state
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fa fa-save"></i> Save Countries';
    }
  }
});