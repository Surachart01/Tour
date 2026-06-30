/**
 * Common role-based permissions helpers
 * Include this file in all pages to standardize role-based access control
 */

document.addEventListener("DOMContentLoaded", function() {
  // Get current user role from localStorage
  const role = localStorage.getItem("role");
  
  // Configure UI based on role
  configureUIForRole(role);

  // Apply module-specific permissions
  applyModulePermissions();
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
}

/**
 * Apply module-specific permissions to sidebar links and block direct access
 */
function applyModulePermissions() {
  const role = localStorage.getItem("role");
  if (role === "superadmin") return; // Superadmin always has access

  const permissionsStr = localStorage.getItem("permissions");
  if (!permissionsStr) return;

  let permissions = {};
  try {
    permissions = JSON.parse(permissionsStr);
  } catch (e) {
    console.error("Failed to parse permissions", e);
    return;
  }

  // Map the filename/href to the permission keys
  const mapping = {
    "tours.html": "tours",
    "tour_description.html": "tours",
    "add_tours.html": "tours",
    "edit_tours.html": "tours",
    "hotels.html": "hotels",
    "add_hotel.html": "hotels",
    "edit_hotel.html": "hotels",
    "transfers.html": "transfers",
    "add_transfer.html": "transfers",
    "edit_transfer.html": "transfers",
    "excursions.html": "excursions",
    "excursion_description.html": "excursions",
    "add_excursion.html": "excursions",
    "edit_excursion.html": "excursions",
    "booking.html": "bookings",
    "edit_booking.html": "bookings",
    "activities.html": "activities",
    "agents.html": "agents",
    "addagent.html": "agents",
    "editagent.html": "agents",
    "markup.html": "markups",
    "add_markup.html": "markups",
    "edit_markup.html": "markups",
    "suppliers.html": "suppliers",
    "add_supplier.html": "suppliers",
    "edit_supplier.html": "suppliers",
    "users.html": "users",
    "add_user.html": "users",
    "edit_user.html": "users",
    "special_packages.html": "special_packages",
    "edit_special_package.html": "special_packages",
    "analytics.html": "analytics",
    "city_info.html": "city_info",
    "stop_sale.html": "stop_sale",
    "tools.html": "tools",
    "othercharges.html": "other_charges",
    "add_othercharges.html": "other_charges",
    "edit_othercharges.html": "other_charges",
    "invoice_management.html": "proforma_invoices",
    "edit_invoices.html": "proforma_invoices",
    "tax_invoices.html": "tax_invoices",
    "test_tax_invoices.html": "tax_invoices"
  };

  // Find all links in child menus or sidebars
  const sidebarLinks = document.querySelectorAll("#sidebar-menu a");
  sidebarLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;
    
    // Extract base filename (e.g. "hotels.html")
    const filename = href.substring(href.lastIndexOf("/") + 1);
    const permKey = mapping[filename];
    
    if (permKey && permissions[permKey] === false) {
      const li = link.closest("li");
      if (li) {
        li.style.display = "none";
      }
    }
  });

  // If a role is admin, let them keep controlPanelMenu even if some submenus are hidden,
  // but for agent role, if they are granted any control panel permissions, show controlPanelMenu
  const controlPanelMenu = document.getElementById("controlPanelMenu");
  if (controlPanelMenu) {
    const visibleLinks = controlPanelMenu.querySelectorAll("ul.child_menu li:not([style*='display: none'])");
    if (role === "admin") {
      controlPanelMenu.style.display = "block";
    } else {
      // If agent has permissions to some Control Panel modules, show it
      if (visibleLinks.length > 0) {
        controlPanelMenu.style.display = "block";
      } else {
        controlPanelMenu.style.display = "none";
      }
    }
  }

  // Handle special packages visibility based on permissions
  if (permissions["special_packages"] === false) {
    // Hide specialPackageSelect group on quotation/edit pages
    const spSelect = document.getElementById("specialPackageSelect");
    if (spSelect) {
      const group = spSelect.closest(".form-group");
      if (group) group.style.display = "none";
    }
    
    // Hide card-special-packages on index.html
    const spCard = document.querySelector(".card-special-packages");
    if (spCard) {
      const wrapper = spCard.closest(".service-card-wrapper");
      if (wrapper) wrapper.style.display = "none";
    }
    
    // Hide btn-search-special-packages on index.html
    const spSearchBtn = document.getElementById("btn-search-special-packages");
    if (spSearchBtn) {
      spSearchBtn.style.display = "none";
    }
    
    // Hide specialPackagesSection on index.html
    const spSection = document.getElementById("specialPackagesSection");
    if (spSection) {
      spSection.style.display = "none";
    }

    // Hide btnSpecialPackages tab button on quotation pages
    const spTabBtn = document.getElementById("btnSpecialPackages");
    if (spTabBtn) {
      spTabBtn.style.display = "none";
    }
  }

  // Protect against direct URL access
  const currentPage = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1);
  const currentKey = mapping[currentPage];
  if (currentKey && permissions[currentKey] === false) {
    alert("You do not have permission to access this page.");
    window.location.href = "index.html";
  }
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