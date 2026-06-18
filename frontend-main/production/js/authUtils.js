/**
 * Authentication Utilities
 * Provides centralized authentication handling and error management
 * to prevent race conditions and stuck "Unauthorized" messages
 */

// Global authentication state
let authState = {
  isCheckingAuth: false,
  lastAuthCheck: 0,
  authRetryCount: 0,
  maxRetries: 3
};

/**
 * Enhanced token validation with comprehensive checks
 */
function validateAuthToken(token) {
  if (!token) {
    console.log("AuthUtils: No token provided for validation");
    return false;
  }
  
  // Check token format (JWT should have 3 parts separated by dots)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    console.warn("AuthUtils: Invalid token format");
    return false;
  }
  
  try {
    // Check if token is expired
    const payload = JSON.parse(atob(tokenParts[1]));
    const expired = Date.now() > payload.exp * 1000;
    
    if (expired) {
      console.warn("AuthUtils: Token is expired");
      return false;
    }
    
    console.log("AuthUtils: Token validation successful");
    return true;
  } catch (error) {
    console.error("AuthUtils: Error parsing token:", error);
    return false;
  }
}

/**
 * Get valid authentication token with caching
 */
function getValidAuthToken() {
  const token = localStorage.getItem("token");
  
  if (!validateAuthToken(token)) {
    // Clean up invalid token
    if (token) {
      console.log("AuthUtils: Removing invalid token");
      localStorage.removeItem("token");
    }
    return null;
  }
  
  return token;
}

/**
 * Enhanced API error handler with retry logic and better UX
 */
function handleAuthApiError(response, context = "API call", retryCount = 0) {
  const maxRetries = authState.maxRetries;
  
  console.log(`AuthUtils: Handling ${response.status} error for ${context} (retry ${retryCount}/${maxRetries})`);
  
  if (response.status === 401) {
    // Don't immediately redirect on first 401 - could be temporary
    if (retryCount < maxRetries) {
      console.log(`AuthUtils: 401 error, will retry ${context} (attempt ${retryCount + 1})`);
      return { shouldRetry: true, shouldRedirect: false };
    }
    
    // After max retries, check if token is actually invalid
    const token = localStorage.getItem("token");
    if (!validateAuthToken(token)) {
      console.error("AuthUtils: Token is invalid after retries, redirecting to login");
      cleanupAuthState();
      showAuthError("Your session has expired. Please log in again.");
      redirectToLogin();
      return { shouldRetry: false, shouldRedirect: true };
    }
    
    // Token seems valid but server keeps rejecting - might be server issue
    console.warn("AuthUtils: Valid token but server keeps returning 401 - possible server issue");
    showAuthError("Authentication issue detected. Please try refreshing the page.");
    return { shouldRetry: false, shouldRedirect: false };
  }
  
  if (response.status === 403) {
    console.warn("AuthUtils: Access forbidden (403)");
    showAuthError("You don't have sufficient permissions for this action.");
    return { shouldRetry: false, shouldRedirect: false };
  }
  
  if (response.status >= 500) {
    console.warn("AuthUtils: Server error (5xx)");
    if (retryCount < maxRetries) {
      return { shouldRetry: true, shouldRedirect: false };
    }
    showAuthError("Server error. Please try again later.");
    return { shouldRetry: false, shouldRedirect: false };
  }
  
  // Other errors
  console.warn(`AuthUtils: Unhandled error ${response.status} for ${context}`);
  return { shouldRetry: false, shouldRedirect: false };
}

/**
 * Make authenticated API request with retry logic
 */
async function makeAuthenticatedRequest(url, options = {}, context = "API call", retryCount = 0) {
  const token = getValidAuthToken();
  
  if (!token) {
    console.error("AuthUtils: No valid token for authenticated request");
    redirectToLogin();
    throw new Error("No valid authentication token");
  }
  
  // Prepare request with authentication
  const requestOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  try {
    console.log(`AuthUtils: Making authenticated request to ${url} (attempt ${retryCount + 1})`);
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorResult = handleAuthApiError(response, context, retryCount);
      
      if (errorResult.shouldRetry && retryCount < authState.maxRetries) {
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`AuthUtils: Retrying ${context} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeAuthenticatedRequest(url, options, context, retryCount + 1);
      }
      
      if (errorResult.shouldRedirect) {
        throw new Error("Authentication failed");
      }
      
      // Don't throw for other errors - let caller handle
      console.warn(`AuthUtils: Request failed but not throwing: ${response.status}`);
      return response;
    }
    
    // Success - reset retry count
    authState.authRetryCount = 0;
    console.log(`AuthUtils: Authenticated request successful for ${context}`);
    return response;
    
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error
      if (retryCount < authState.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
        console.log(`AuthUtils: Network error, retrying ${context} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return makeAuthenticatedRequest(url, options, context, retryCount + 1);
      }
      showAuthError("Network error. Please check your connection and try again.");
    }
    
    console.error(`AuthUtils: Request failed for ${context}:`, error);
    throw error;
  }
}

/**
 * Clean up authentication state
 */
function cleanupAuthState() {
  localStorage.removeItem("token");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_info");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  localStorage.removeItem("email");
  localStorage.removeItem("userType");
  
  // Reset auth state
  authState.isCheckingAuth = false;
  authState.lastAuthCheck = 0;
  authState.authRetryCount = 0;
  
  console.log("AuthUtils: Authentication state cleaned up");
}

/**
 * Show user-friendly authentication error
 */
function showAuthError(message) {
  // Prevent multiple alerts
  if (authState.isCheckingAuth) {
    return;
  }
  
  console.error("AuthUtils: " + message);
  
  // Use a more user-friendly notification if possible
  if (typeof window !== 'undefined' && window.alert) {
    alert(message);
  }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
  if (authState.isCheckingAuth) {
    return; // Prevent multiple redirects
  }
  
  authState.isCheckingAuth = true;
  console.log("AuthUtils: Redirecting to login page");
  
  // Small delay to prevent race conditions
  setTimeout(() => {
    window.location.href = "login.html";
  }, 100);
}

/**
 * Check authentication status without making API calls
 */
function checkAuthStatus() {
  const token = getValidAuthToken();
  const username = localStorage.getItem("username");
  const role = localStorage.getItem("role");
  
  return {
    isAuthenticated: !!token,
    hasUserData: !!(username && role),
    token: token,
    username: username,
    role: role
  };
}

/**
 * Initialize authentication check for page load
 */
function initializeAuth() {
  console.log("AuthUtils: Initializing authentication check");
  
  const authStatus = checkAuthStatus();
  
  if (!authStatus.isAuthenticated) {
    console.log("AuthUtils: No valid authentication found");
    return false;
  }
  
  if (!authStatus.hasUserData) {
    console.warn("AuthUtils: Token valid but missing user data");
    // Could try to fetch user data here, but for now just proceed
  }
  
  console.log("AuthUtils: Authentication check passed");
  return true;
}

/**
 * Debounced authentication check to prevent multiple simultaneous checks
 */
let authCheckTimeout;
function debouncedAuthCheck(callback, delay = 500) {
  clearTimeout(authCheckTimeout);
  authCheckTimeout = setTimeout(() => {
    const isAuth = initializeAuth();
    if (callback) callback(isAuth);
  }, delay);
}

// Export functions for global use
window.AuthUtils = {
  validateAuthToken,
  getValidAuthToken,
  makeAuthenticatedRequest,
  handleAuthApiError,
  cleanupAuthState,
  checkAuthStatus,
  initializeAuth,
  debouncedAuthCheck,
  redirectToLogin,
  showAuthError
};

// Auto-initialize on script load
document.addEventListener("DOMContentLoaded", function() {
  console.log("AuthUtils: Script loaded and ready");
});
