/**
 * Common role-based permissions helpers
 * Include this file in all pages to standardize role-based access control
 */

document.addEventListener("DOMContentLoaded", function() {
  // Get current user role from localStorage
  const role = localStorage.getItem("role");
  
  // Configure UI based on role
  configureUIForRole(role);
});

/**
 * Configure UI elements based on user role
 * @param {string} role - The user role
 */
function configureUIForRole(role) {
  // Handle Control Panel visibility - show for admin and superadmin only
  if (role !== "admin" && role !== "superadmin") {
    const controlPanelMenu = document.getElementById("controlPanelMenu");
    if (controlPanelMenu) {
      controlPanelMenu.style.display = "none";
    }
  } else {
    const controlPanelMenu = document.getElementById("controlPanelMenu");
    if (controlPanelMenu) {
      controlPanelMenu.style.display = "block";
    }
  }

  // Handle Email Footer tab visibility - show for admin and superadmin only
  const emailFooterTabNav = document.getElementById("emailFooterTabNav");
  if (emailFooterTabNav) {
    if (role === "admin" || role === "superadmin") {
      emailFooterTabNav.style.display = "block";
    } else {
      emailFooterTabNav.style.display = "none";
    }
  }

  // Add other role-specific UI configurations here
}

/**
 * Check if user has admin access (admin or superadmin)
 * @returns {boolean} - True if user has admin access
 */
function hasAdminAccess() {
  const role = localStorage.getItem("role");
  return role === "admin" || role === "superadmin";
}

/**
 * Check if element should be visible for current user
 * @param {string} elementId - The element ID to check
 * @param {Array} allowedRoles - Roles allowed to see this element
 */
function configureElementVisibility(elementId, allowedRoles) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const role = localStorage.getItem("role");
  
  if (allowedRoles.includes(role)) {
    element.style.display = "block";
  } else {
    element.style.display = "none";
  }
} 