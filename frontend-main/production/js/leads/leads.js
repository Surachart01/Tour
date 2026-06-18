// Leads Management System - Frontend Integration
// 
// BACKEND INTEGRATION STATUS:
// ✅ COMPLETED:
// - Lead CRUD operations (Create, Read, Update, Delete)
// - Lead Group CRUD operations  
// - Lead statistics and analytics
// - Email sending functionality
// - PDF generation and download
// - Lead conversion to quotations
// - Template system integration
// - Proper error handling and validation
// - Authentication and authorization
//
// ⚠️  PARTIALLY IMPLEMENTED:
// - Service selection UI (hotels, transfers, excursions, tours, flights, others)
// - Lead preview modals (basic structure exists, needs full implementation)
// - Lead group preview functionality
//
// 🔄 TODO - REQUIRES ADDITIONAL UI COMPONENTS:
// - Service selection forms for creating leads with hotels, transfers, etc.
// - Enhanced lead creation/edit forms with all backend fields
// - Lead group management with individual lead addition/removal
// - Template selection UI
// - Advanced filtering and search
//
// 📋 BACKEND ENDPOINTS INTEGRATED:
// - GET /api/v1/proposals (with status filtering)
// - POST /api/v1/proposals (create individual lead)
// - PUT /api/v1/proposals/{id} (update lead)
// - DELETE /api/v1/proposals/{id} (delete lead)
// - GET /api/v1/proposals/{id}/preview (preview lead)
// - GET /api/v1/proposals/{id}/generate-pdf (generate PDF)
// - POST /api/v1/proposals/{id}/send-email (send email)
// - POST /api/v1/proposals/{id}/convert (convert to quotation)
// - GET /api/v1/group-proposals (list groups)
// - POST /api/v1/group-proposals (create group)
// - PUT /api/v1/group-proposals/{id} (update group)
// - DELETE /api/v1/group-proposals/{id} (delete group)
// - GET /api/v1/group-proposals/{id}/preview (preview group)
// - POST /api/v1/group-proposals/{id}/send-email (send group email)
// - GET /api/v1/proposals/stats (analytics)
// - GET /api/v1/proposals/templates (available templates)

// Leads Management System
document.addEventListener("DOMContentLoaded", function () {
  // Initialize authentication and user setup
  initializeAuth();
  
  // Initialize the leads system
  initializeLeadsSystem();
});

// Global variables
let currentUser = null;
let leads = [];
let leadGroups = [];
let stats = null;
let leadTemplates = [];
let filteredLeads = [];
let filteredLeadGroups = [];

// Authentication and initialization
function initializeAuth() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username") || "Guest";
  const agentname = localStorage.getItem("agentname") || "";

  console.log('Initializing auth with:', {
    hasToken: !!token,
    tokenLength: token ? token.length : 0,
    role: role,
    username: username,
    agentname: agentname
  });

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  // Set profile info in the UI
  const profileNameEl = document.getElementById("profileName");
  const navProfileNameEl = document.getElementById("navProfileName");
  
  if (profileNameEl) profileNameEl.innerText = username;
  if (navProfileNameEl) navProfileNameEl.innerText = username;

  // Hide Control Panel for non-admin users
  if (role !== "admin" && role !== "superadmin") {
    const controlPanelMenu = document.getElementById("controlPanelMenu");
    if (controlPanelMenu) {
      controlPanelMenu.style.display = "none";
    }
  }

  // Create comprehensive user profile object
  currentUser = { 
    username, 
    role, 
    token,
    agentname,
    isAdmin: role === "admin",
    isAgent: role === "agent" || role === "user"
  };

  console.log('User profile loaded:', {
    username: currentUser.username,
    role: currentUser.role,
    agentname: currentUser.agentname,
    isAdmin: currentUser.isAdmin,
    isAgent: currentUser.isAgent
  });
}

// Get current user profile information
function getUserProfile() {
  return {
    username: currentUser?.username || localStorage.getItem("username") || "Guest",
    role: currentUser?.role || localStorage.getItem("role") || "user",
    agentname: currentUser?.agentname || localStorage.getItem("agentname") || "",
    token: currentUser?.token || localStorage.getItem("token"),
    isAdmin: (currentUser?.role || localStorage.getItem("role")) === "admin",
    isAgent: ["agent", "user"].includes(currentUser?.role || localStorage.getItem("role"))
  };
}

// Refresh user profile information from localStorage
function refreshUserProfile() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username") || "Guest";
  const agentname = localStorage.getItem("agentname") || "";

  if (!token) {
    console.warn('No authentication token found during profile refresh');
    return false;
  }

  // Update currentUser object
  currentUser = { 
    username, 
    role, 
    token,
    agentname,
    isAdmin: role === "admin",
    isAgent: role === "agent" || role === "user"
  };

  // Update UI elements
  const profileNameEl = document.getElementById("profileName");
  const navProfileNameEl = document.getElementById("navProfileName");
  
  if (profileNameEl) profileNameEl.innerText = username;
  if (navProfileNameEl) navProfileNameEl.innerText = username;

  console.log('User profile refreshed:', {
    username: currentUser.username,
    role: currentUser.role,
    agentname: currentUser.agentname,
    isAdmin: currentUser.isAdmin,
    isAgent: currentUser.isAgent
  });

  return true;
}

// Check if user has permission for specific actions
function hasPermission(action) {
  const userProfile = getUserProfile();
  
  switch (action) {
    case 'create_lead':
    case 'create_lead_group':
    case 'send_email':
    case 'convert_lead':
      return userProfile.isAdmin || userProfile.isAgent;
    case 'delete_lead':
    case 'delete_lead_group':
      return userProfile.isAdmin; // Only admins can delete
    case 'view_analytics':
      return userProfile.isAdmin || userProfile.isAgent;
    default:
      return userProfile.isAdmin || userProfile.isAgent;
  }
}

// Initialize the leads system
function initializeLeadsSystem() {
  console.log('Initializing leads system...');
  
  // Set up event listeners first
  setupEventListeners();

  // Load data from backend API
  loadLeads();
  loadLeadGroups();
  loadStats();
  loadLeadTemplates(); // Load available templates instead of trips

  // Hide create buttons for users without permission
  if (!hasPermission('create_lead')) {
    const createButtons = document.querySelectorAll('#createLeadBtn, #createFirstLeadBtn');
    createButtons.forEach(btn => {
      if (btn) btn.style.display = 'none';
    });
  }

  if (!hasPermission('create_lead_group')) {
    const createGroupButtons = document.querySelectorAll('#createLeadGroupBtn, #createFirstLeadGroupBtn');
    createGroupButtons.forEach(btn => {
      if (btn) btn.style.display = 'none';
    });
  }

  // Hide analytics tab for users without permission
  if (!hasPermission('view_analytics')) {
    const analyticsTab = document.getElementById('analytics-tab');
    if (analyticsTab) {
      analyticsTab.parentElement.style.display = 'none';
    }
  }

  // Check URL parameters for tab switching
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam === 'lead-groups') {
    // Switch to Lead Groups tab
    const leadGroupsTab = document.getElementById('lead-groups-tab');
    if (leadGroupsTab) {
      // Use Bootstrap's tab method to show the tab
      $(leadGroupsTab).tab('show');
    }
  }
}

// Event listeners setup
function setupEventListeners() {
  // Create buttons - redirect to new pages instead of opening modals
  const createLeadBtn = document.getElementById("createLeadBtn");
  const createLeadGroupBtn = document.getElementById("createLeadGroupBtn");
  const createFirstLeadBtn = document.getElementById("createFirstLeadBtn");
  const createFirstLeadGroupBtn = document.getElementById("createFirstLeadGroupBtn");
  
  if (createLeadBtn) {
    createLeadBtn.addEventListener("click", () => {
      window.location.href = 'add_lead.html';
    });
  }
  if (createLeadGroupBtn) {
    createLeadGroupBtn.addEventListener("click", () => {
      window.location.href = 'add_lead_group.html';
    });
  }
  if (createFirstLeadBtn) {
    createFirstLeadBtn.addEventListener("click", () => {
      window.location.href = 'add_lead.html';
    });
  }
  if (createFirstLeadGroupBtn) {
    createFirstLeadGroupBtn.addEventListener("click", () => {
      window.location.href = 'add_lead_group.html';
    });
  }

  // Modal save buttons (keep for backward compatibility if modals are still used elsewhere)
  const saveLeadBtn = document.getElementById("saveLeadBtn");
  const saveLeadGroupBtn = document.getElementById("saveLeadGroupBtn");
  
  if (saveLeadBtn) {
    // Remove the static event listener since we'll use dynamic onclick
    // saveLeadBtn.addEventListener("click", createLead);
    // The onclick will be set dynamically in editLead() or resetCreateLeadModal()
  }
  if (saveLeadGroupBtn) {
    saveLeadGroupBtn.addEventListener("click", createLeadGroup);
  }

  // Search and filter inputs
  const leadsSearchInput = document.getElementById("leadsSearchInput");
  const statusFilter = document.getElementById("statusFilter");
  const leadGroupsSearchInput = document.getElementById("leadGroupsSearchInput");
  const groupStatusFilter = document.getElementById("groupStatusFilter");
  const filterLeadsBtn = document.getElementById("filterLeadsBtn");
  const filterLeadGroupsBtn = document.getElementById("filterLeadGroupsBtn");
  
  if (leadsSearchInput) leadsSearchInput.addEventListener("input", filterLeads);
  if (statusFilter) statusFilter.addEventListener("change", filterLeads);
  if (leadGroupsSearchInput) leadGroupsSearchInput.addEventListener("input", filterLeadGroups);
  if (groupStatusFilter) groupStatusFilter.addEventListener("change", filterLeadGroups);
  if (filterLeadsBtn) filterLeadsBtn.addEventListener("click", filterLeads);
  if (filterLeadGroupsBtn) filterLeadGroupsBtn.addEventListener("click", filterLeadGroups);

  // Tab change events
  const analyticsTab = document.getElementById("analytics-tab");
  if (analyticsTab) {
    analyticsTab.addEventListener("click", function() {
      setTimeout(loadStats, 100); // Reload stats when analytics tab is opened
    });
  }

  // Modal close events - reset modals when closed
  $('#createLeadModal').on('hidden.bs.modal', function() {
    resetCreateLeadModal();
  });

  // Initialize modal in create mode
  resetCreateLeadModal();
}

// API Helper Functions - Simplified approach matching hotels.js
async function apiCall(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  const config = {
    method: method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${Endpoint}/api/v1${endpoint}`, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        alert("Unauthorized. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("agentname");
        window.location.href = "login.html";
        return;
      } else if (response.status === 403) {
        alert("You don't have sufficient permissions to perform this action.");
        return;
      } else if (response.status === 404) {
        throw new Error(`API endpoint not found: ${endpoint}`);
      } else {
        const errorMessage = await response.text();
        throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
      }
    }

    // Handle different response types
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Load Functions
async function loadLeads() {
  const token = localStorage.getItem("token");
  
  if (!token) {
    console.warn('No token available for loading leads');
    showEmptyState('leadsContainer', 'lock', 'Authentication Required', 'Please log in to view leads');
    return;
  }

  try {
    showLoading('leadsLoading');
    console.log('Loading leads from backend API...');
    
    const response = await fetch(`${Endpoint}/api/v1/proposals`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log('Leads API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Unauthorized. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("agentname");
        window.location.href = "login.html";
        return;
      } else if (response.status === 403) {
        hideLoading('leadsLoading');
        showEmptyState('leadsContainer', 'ban', 'Access Denied', 'You don\'t have sufficient permissions to access leads');
        return;
      } else if (response.status === 404) {
        hideLoading('leadsLoading');
        showEmptyState('leadsContainer', 'exclamation-triangle', 'Backend Not Available', 'Leads API endpoint not found. Please contact your administrator.');
        return;
      } else {
        const errorMessage = await response.text();
        throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('Leads data received:', Array.isArray(data) ? `${data.length} leads` : 'Invalid data format');
    
    leads = Array.isArray(data) ? data : [];
    filteredLeads = [...leads];
    renderLeads();
    hideLoading('leadsLoading');
    
    if (leads.length === 0) {
      console.log('No leads found in backend');
    }
  } catch (error) {
    console.error('Failed to load leads:', error);
    hideLoading('leadsLoading');
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      showEmptyState('leadsContainer', 'wifi', 'Backend Unavailable', 'Cannot connect to the backend server. Please check your connection or contact support.');
    } else {
      showEmptyState('leadsContainer', 'exclamation-circle', 'Error Loading Leads', error.message || 'An unexpected error occurred while loading leads');
    }
  }
}

async function loadLeadGroups() {
  const token = localStorage.getItem("token");
  
  if (!token) {
    console.warn('No token available for loading lead groups');
    showEmptyState('leadGroupsContainer', 'lock', 'Authentication Required', 'Please log in to view lead groups');
    return;
  }

  try {
    showLoading('leadGroupsLoading');
    console.log('Loading lead groups from backend API...');

    const response = await fetch(`${Endpoint}/api/v1/group-proposals`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log('Lead groups API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Unauthorized. Please log in again.");
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("agentname");
        window.location.href = "login.html";
        return;
      } else if (response.status === 403) {
        hideLoading('leadGroupsLoading');
        showEmptyState('leadGroupsContainer', 'ban', 'Access Denied', 'You don\'t have sufficient permissions to access lead groups');
        return;
      } else if (response.status === 404) {
        hideLoading('leadGroupsLoading');
        showEmptyState('leadGroupsContainer', 'exclamation-triangle', 'Backend Not Available', 'Lead groups API endpoint not found. Please contact your administrator.');
        return;
      } else {
        const errorMessage = await response.text();
        throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('Lead groups data received:', Array.isArray(data) ? `${data.length} lead groups` : 'Invalid data format');
    
    leadGroups = Array.isArray(data) ? data : [];
    filteredLeadGroups = [...leadGroups];
    renderLeadGroups();
    hideLoading('leadGroupsLoading');
    
    if (leadGroups.length === 0) {
      console.log('No lead groups found in backend');
    }
  } catch (error) {
    console.error('Failed to load lead groups:', error);
    hideLoading('leadGroupsLoading');
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      showEmptyState('leadGroupsContainer', 'wifi', 'Backend Unavailable', 'Cannot connect to the backend server. Please check your connection or contact support.');
    } else {
      showEmptyState('leadGroupsContainer', 'exclamation-circle', 'Error Loading Lead Groups', error.message || 'An unexpected error occurred while loading lead groups');
    }
  }
}

async function loadStats() {
  const token = localStorage.getItem("token");
  
  if (!token) {
    console.warn('No token available for loading stats');
    return;
  }

  try {
    console.log('Loading stats from backend API...');
    
    const response = await fetch(`${Endpoint}/api/v1/proposals/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log('Stats API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('Unauthorized access to stats');
        return;
      } else if (response.status === 403) {
        console.warn('Insufficient permissions for stats');
        return;
      } else if (response.status === 404) {
        console.warn('Stats API endpoint not found');
        renderEmptyStats();
        return;
      } else {
        const errorMessage = await response.text();
        throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
      }
    }

    const data = await response.json();
    console.log('Stats data received:', data);
    
    stats = data;
    renderStats();
  } catch (error) {
    console.error('Failed to load stats:', error);
    
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      console.warn('Backend unavailable for stats');
      renderEmptyStats();
    } else {
      console.error('Error loading stats:', error.message);
      renderEmptyStats();
    }
  }
}

function renderEmptyStats() {
  // Show empty/zero stats when backend is not available
  stats = {
    total_leads: 0,
    converted_leads: 0,
    conversion_rate: 0,
    average_markup: 0,
    leads_by_status: {},
    conversion_by_template: {},
    monthly_trends: []
  };
  renderStats();
}

async function loadLeadTemplates() {
  try {
    console.log('Loading lead templates from backend API...');
    const templates = await apiCall('/proposals/templates');
    console.log('Templates loaded:', templates);
    return templates;
  } catch (error) {
    console.error('Failed to load lead templates:', error);
    // Return default templates if backend is not available
    return [
      { id: 1, type: 'standard', name: 'Standard Template', description: 'Clean, professional design', is_active: true },
      { id: 2, type: 'premium', name: 'Premium Template', description: 'Elegant, sophisticated design', is_active: true },
      { id: 3, type: 'modern', name: 'Modern Template', description: 'Contemporary, colorful design', is_active: true }
    ];
  }
}

// Render Functions
function renderLeads() {
  const tableBody = document.getElementById('leadsTableBody');
  
  if (!tableBody) {
    console.error('leadsTableBody element not found');
    return;
  }
  
  if (filteredLeads.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4">
          <i class="fa fa-rocket fa-3x text-muted mb-3"></i>
          <h4>No leads found</h4>
          <p class="text-muted">Create your first lead to get started with client proposals</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filteredLeads.forEach(lead => {
    html += createLeadTableRow(lead);
  });

  tableBody.innerHTML = html;
  attachLeadEventListeners();
}

function renderLeadGroups() {
  const tableBody = document.getElementById('leadGroupsTableBody');
  
  if (!tableBody) {
    console.error('leadGroupsTableBody element not found');
    return;
  }
  
  if (filteredLeadGroups.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4">
          <i class="fa fa-layer-group fa-3x text-muted mb-3"></i>
          <h4>No lead groups found</h4>
          <p class="text-muted">Create your first lead group to send multiple options to clients</p>
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filteredLeadGroups.forEach(group => {
    html += createLeadGroupTableRow(group);
  });

  tableBody.innerHTML = html;
  attachLeadGroupEventListeners();
}

function renderStats() {
  if (!stats) return;

  // Update stat cards
  document.getElementById('totalLeadsCount').textContent = stats.total_leads || 0;
  document.getElementById('convertedLeadsCount').textContent = stats.converted_leads || 0;
  document.getElementById('conversionRate').textContent = (stats.conversion_rate || 0).toFixed(1) + '%';
  document.getElementById('averageMarkup').textContent = (stats.average_markup || 0).toFixed(1) + '%';

  // Render charts
  renderTemplateConversionChart();
  renderStatusDistributionChart();
  renderMonthlyTrendsChart();
}

// Helper function to get priority display
function getPriorityDisplay(priority) {
  const priorityMap = {
    'low': '<span class="badge badge-secondary">Low Priority</span>',
    'medium': '<span class="badge badge-warning">Medium Priority</span>',
    'high': '<span class="badge badge-danger">High Priority</span>'
  };
  
  return priorityMap[priority] || priorityMap['medium'];
}

// Table Row Creation Functions
function createLeadTableRow(lead) {
  const statusClass = `status-${lead.status || 'pending'}`;
  const expiryDate = new Date(lead.expiry_date).toLocaleDateString();
  const createdDate = new Date(lead.created_at).toLocaleDateString();
  
  // Get priority display - backend sends 'urgency' field
  const priorityDisplay = getPriorityDisplay(lead.urgency || 'medium');
  
  // Format status display
  const statusDisplay = (lead.status || 'pending').charAt(0).toUpperCase() + (lead.status || 'pending').slice(1);
  
  // Check if lead is approved/converted and cannot be changed
  const isApprovedOrConverted = lead.status === 'approved' || lead.status === 'converted' || lead.converted_to_quotation;
  
  // Add row colors based on status: green for approved/converted, yellow for ignore, red for cancelled
  let rowClass = '';
  if (lead.status === 'approved' || lead.status === 'converted' || lead.converted_to_quotation) {
    rowClass = 'table-success'; // Green
  } else if (lead.status === 'ignore') {
    rowClass = 'table-warning'; // Yellow
  } else if (lead.status === 'cancelled' || lead.status === 'cancel') {
    rowClass = 'table-danger'; // Red
  }
  
  // Create status badge - make it non-clickable for approved/converted leads
  const statusBadgeClass = isApprovedOrConverted ? statusClass : `${statusClass} lead-status-badge`;
  const statusTitle = isApprovedOrConverted ? 'Status cannot be changed (approved/converted)' : 'Click to change status';
  const statusCursor = isApprovedOrConverted ? 'cursor: default;' : 'cursor: pointer;';
  
  return `
    <tr data-lead-id="${lead.id}" class="${rowClass}">
      <td>
        <strong>${lead.lead_reference}</strong>
        ${lead.agent?.name ? `
          <br><small class="text-muted">by ${lead.agent.name}</small>
        ` : ''}
      </td>
      <td>
        <strong>${lead.option_name}</strong>
        ${lead.internal_notes ? `<br><small class="text-muted">${lead.internal_notes.substring(0, 50)}${lead.internal_notes.length > 50 ? '...' : ''}</small>` : ''}
      </td>
      <td>
        <strong>${lead.client_name}</strong>
        <br><small class="text-muted">${lead.client_email}</small>
        ${lead.client_phone ? `<br><small class="text-muted">${lead.client_phone}</small>` : ''}
      </td>
      <td>${priorityDisplay}</td>
      <td>
        <span class="${statusBadgeClass}"
              data-lead-id="${lead.id}"
              data-current-status="${lead.status || 'pending'}"
              data-is-locked="${isApprovedOrConverted}"
              title="${statusTitle}"
              style="${statusCursor}">
          ${statusDisplay}
          ${isApprovedOrConverted ? ' <i class="fa fa-lock" style="font-size: 10px; margin-left: 3px;"></i>' : ''}
        </span>
      </td>
      <td>${lead.template_type.charAt(0).toUpperCase() + lead.template_type.slice(1)}</td>
      <td>
        ${lead.markup_percentage}%
        ${lead.final_cost ? `<br><small class="text-success">฿${lead.final_cost.toFixed(2)}</small>` : ''}
      </td>
      <td>
        ${createdDate}
        <br><small class="text-muted">Expires: ${expiryDate}</small>
      </td>
      <td>
        ${getLeadActionButtons(lead)}
      </td>
    </tr>
  `;
}

function createLeadGroupTableRow(group) {
  const statusClass = `status-${group.status || 'pending'}`;
  const createdDate = new Date(group.created_at).toLocaleDateString();
  
  // Format status display
  const statusDisplay = (group.status || 'pending').replace('_', ' ').split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  
  // Check if group is approved/converted and cannot be changed
  const isApprovedOrConverted = group.status === 'approved' || group.status === 'converted';
  
  // Add row colors based on status: green for approved/converted, yellow for ignore, red for cancelled
  let rowClass = '';
  if (group.status === 'approved' || group.status === 'converted') {
    rowClass = 'table-success'; // Green
  } else if (group.status === 'ignore') {
    rowClass = 'table-warning'; // Yellow
  } else if (group.status === 'cancelled' || group.status === 'cancel') {
    rowClass = 'table-danger'; // Red
  }
  
  // Create status badge - make it non-clickable for approved/converted groups
  const statusBadgeClass = isApprovedOrConverted ? statusClass : `${statusClass} group-status-badge`;
  const statusTitle = isApprovedOrConverted ? 'Status cannot be changed (approved/converted)' : 'Click to change status';
  const statusCursor = isApprovedOrConverted ? 'cursor: default;' : 'cursor: pointer;';
  
  return `
    <tr data-group-id="${group.id}" class="${rowClass}">
      <td>
        <strong>${group.group_name}</strong>
        <br><small class="text-muted">${group.group_reference}</small>
        ${group.description ? `<br><small class="text-muted">${group.description.substring(0, 50)}${group.description.length > 50 ? '...' : ''}</small>` : ''}
      </td>
      <td>
        ${group.client_name}
        ${group.client_phone ? `<br><small class="text-muted">${group.client_phone}</small>` : ''}
      </td>
      <td>${group.client_email}</td>
      <td>
        <span class="${statusBadgeClass}"
              data-group-id="${group.id}"
              data-current-status="${group.status || 'pending'}"
              data-is-locked="${isApprovedOrConverted}"
              title="${statusTitle}"
              style="${statusCursor}">
          ${statusDisplay}
          ${isApprovedOrConverted ? ' <i class="fa fa-lock" style="font-size: 10px; margin-left: 3px;"></i>' : ''}
        </span>
      </td>
      <td>
        ${group.leads_count || 0} total
        <br><small class="text-success">${group.converted_leads_count || 0} converted (${(group.conversion_rate || 0).toFixed(1)}%)</small>
      </td>
      <td>
        ${createdDate}
        <br><small class="text-muted">Expires: ${new Date(group.expiry_date).toLocaleDateString()}</small>
      </td>
      <td>
        ${getLeadGroupActionButtons(group)}
      </td>
    </tr>
  `;
}

// Action Buttons
function getLeadActionButtons(lead) {
  let buttons = `
    <button class="btn btn-info btn-sm preview-lead-btn" data-id="${lead.id}" title="Preview/View PDF">
      <i class="fa fa-eye"></i>
    </button>
    <button class="btn btn-warning btn-sm edit-lead-btn" data-id="${lead.id}" title="Edit">
      <i class="fa fa-edit"></i>
    </button>
    <button class="btn btn-primary btn-sm send-lead-btn" data-id="${lead.id}" title="${lead.email_sent ? 'Resend Email' : 'Send Email'}">
      <i class="fa fa-envelope"></i>
    </button>
  `;

  // Convert button removed - conversion now happens automatically when status is changed to "approved"

  // Add delete button for admins (but not for approved or converted leads)
  if (hasPermission('delete_lead') && lead.status !== 'approved' && lead.status !== 'converted' && !lead.converted_to_quotation) {
    buttons += `
      <button class="btn btn-danger btn-sm delete-lead-btn" data-id="${lead.id}" title="Delete">
        <i class="fa fa-trash"></i>
      </button>
    `;
  }

  return buttons;
}

function getLeadGroupActionButtons(group) {
  let buttons = `
    <button class="btn btn-info btn-sm preview-group-btn" data-id="${group.id}" title="Preview">
      <i class="fa fa-eye"></i>
    </button>
    <button class="btn btn-warning btn-sm edit-group-btn" data-id="${group.id}" title="Edit">
      <i class="fa fa-edit"></i>
    </button>
    <button class="btn btn-primary btn-sm send-group-btn" data-id="${group.id}" title="${group.email_sent ? 'Resend Email' : 'Send Email'}">
      <i class="fa fa-envelope"></i>
    </button>
  `;

  // Add delete button for admins (but not for approved or converted groups)
  if (hasPermission('delete_lead_group') && group.status !== 'approved' && group.status !== 'converted') {
    buttons += `
      <button class="btn btn-danger btn-sm delete-group-btn" data-id="${group.id}" title="Delete">
        <i class="fa fa-trash"></i>
      </button>
    `;
  }

  return buttons;
}

// Event Listeners for Action Buttons
function attachLeadEventListeners() {
  // Preview buttons - now handles PDF generation and viewing
  document.querySelectorAll('.preview-lead-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      previewLead(this.dataset.id);
    });
  });

  // Edit buttons
  document.querySelectorAll('.edit-lead-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      editLead(this.dataset.id);
    });
  });

  // Send email buttons
  document.querySelectorAll('.send-lead-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      sendLeadEmail(this.dataset.id);
    });
  });

  // Convert button event listeners removed - conversion now happens via status change

  // Delete buttons
  document.querySelectorAll('.delete-lead-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      deleteLead(this.dataset.id);
    });
  });

  // Status badges - clickable to change status (only if not locked)
  document.querySelectorAll('.lead-status-badge').forEach(badge => {
    badge.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // Check if status is locked (approved/converted)
      const isLocked = this.dataset.isLocked === 'true';
      if (isLocked) {
        showNotification('Cannot change status of approved or converted leads', 'error');
        return;
      }
      
      const leadId = this.dataset.leadId;
      const currentStatus = this.dataset.currentStatus;
      showInlineStatusDropdown(this, leadId, currentStatus, 'lead');
    });
  });
}

function attachLeadGroupEventListeners() {
  // Preview buttons
  document.querySelectorAll('.preview-group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      previewLeadGroup(this.dataset.id);
    });
  });

  // Edit buttons
  document.querySelectorAll('.edit-group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      editLeadGroup(this.dataset.id);
    });
  });

  // Send email buttons
  document.querySelectorAll('.send-group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      sendLeadGroupEmail(this.dataset.id);
    });
  });

  // Delete buttons
  document.querySelectorAll('.delete-group-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      deleteLeadGroup(this.dataset.id);
    });
  });

  // Status badges - clickable to change status (only if not locked)
  document.querySelectorAll('.group-status-badge').forEach(badge => {
    badge.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // Check if status is locked (approved/converted)
      const isLocked = this.dataset.isLocked === 'true';
      if (isLocked) {
        showNotification('Cannot change status of approved or converted lead groups', 'error');
        return;
      }
      
      const groupId = this.dataset.groupId;
      const currentStatus = this.dataset.currentStatus;
      showInlineStatusDropdown(this, groupId, currentStatus, 'group');
    });
  });
}

// Modal Functions
function openCreateLeadModal() {
  document.getElementById('createLeadForm').reset();
  
  // Set default values
  const leadNumberOfAdults = document.getElementById('leadNumberOfAdults');
  const leadNumberOfKids = document.getElementById('leadNumberOfKids');
  const leadMarkupPercentage = document.getElementById('leadMarkupPercentage');
  const leadTemplateType = document.getElementById('leadTemplateType');
  const leadBookingDate = document.getElementById('leadBookingDate');
  
  if (leadNumberOfAdults) leadNumberOfAdults.value = 2;
  if (leadNumberOfKids) leadNumberOfKids.value = 0;
  if (leadMarkupPercentage) leadMarkupPercentage.value = 15;
  if (leadTemplateType) leadTemplateType.value = 'standard';
  if (leadBookingDate) leadBookingDate.value = new Date().toISOString().split('T')[0];
  
  $('#createLeadModal').modal('show');
}

function openCreateLeadGroupModal() {
  document.getElementById('createLeadGroupForm').reset();
  $('#createLeadGroupModal').modal('show');
}

// CRUD Operations
async function createLead() {
  try {
    const userProfile = getUserProfile();
    
    // Safely get form values with fallbacks
    const getElementValue = (id, fallback = '') => {
      const element = document.getElementById(id);
      return element ? element.value : fallback;
    };
    
    const formData = {
      // Client Information
      client_name: getElementValue('leadClientName'),
      client_email: getElementValue('leadClientEmail'),
      client_phone: getElementValue('leadClientPhone'),
      number_of_adults: parseInt(getElementValue('leadNumberOfAdults', '2')) || 2,
      number_of_kids: parseInt(getElementValue('leadNumberOfKids', '0')) || 0,
      start_date: getElementValue('leadStartDate'),
      booking_date: getElementValue('leadBookingDate') || new Date().toISOString().split('T')[0],
      client_booking_reference: getElementValue('leadClientBookingReference'),
      
      // Lead Configuration
      option_name: getElementValue('leadOptionName'),
      markup_percentage: parseFloat(getElementValue('leadMarkupPercentage', '15')) || 15,
      template_type: getElementValue('leadTemplateType', 'standard') || 'standard',
      priority: getElementValue('leadPriority', 'medium') || 'medium',
      
      // Notes
      internal_notes: getElementValue('leadInternalNotes'),
      client_notes: getElementValue('leadClientNotes'),
      remarks: getElementValue('leadRemarks'),
      
      // Services (will be empty arrays for now - to be implemented in service selection UI)
      hotels: [],
      transfers: [],
      excursions: [],
      tours: [],
      flights: [],
      others: []
    };

    // Validate required fields
    if (!formData.client_name || !formData.client_email || !formData.option_name || !formData.start_date) {
      showNotification('Please fill in all required fields: Client Name, Email, Option Name, and Start Date', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.client_email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    // Validate markup percentage
    if (formData.markup_percentage < 0 || formData.markup_percentage > 100) {
      showNotification('Markup percentage must be between 0 and 100', 'error');
      return;
    }

    console.log('Creating lead with data:', formData);

    showButtonLoading('saveLeadBtn');
    const newLead = await apiCall('/proposals', 'POST', formData);
    hideButtonLoading('saveLeadBtn');

    $('#createLeadModal').modal('hide');
    showNotification('Lead created successfully!', 'success');
    loadLeads(); // Refresh the leads list
  } catch (error) {
    hideButtonLoading('saveLeadBtn');
    console.error('Failed to create lead:', error);
    showNotification(error.message || 'Failed to create lead', 'error');
  }
}

async function createLeadGroup() {
  try {
    const userProfile = getUserProfile();
    
    // Safely get form values with fallbacks
    const getElementValue = (id, fallback = '') => {
      const element = document.getElementById(id);
      return element ? element.value : fallback;
    };
    
    const formData = {
      // Group Details
      group_name: getElementValue('groupName'),
      description: getElementValue('groupDescription'),
      
      // Client Information
      client_name: getElementValue('groupClientName'),
      client_email: getElementValue('groupClientEmail'),
      client_phone: getElementValue('groupClientPhone'),
      
      // Notes
      internal_notes: getElementValue('groupInternalNotes'),
      client_notes: getElementValue('groupClientNotes')
    };

    // Validate required fields
    if (!formData.group_name || !formData.client_name || !formData.client_email) {
      showNotification('Please fill in all required fields: Group Name, Client Name, and Client Email', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.client_email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    console.log('Creating lead group with data:', formData);

    showButtonLoading('saveLeadGroupBtn');
    const newLeadGroup = await apiCall('/group-proposals', 'POST', formData);
    hideButtonLoading('saveLeadGroupBtn');

    $('#createLeadGroupModal').modal('hide');
    showNotification('Lead group created successfully! You can now add individual leads to this group.', 'success');
    loadLeadGroups(); // Refresh the lead groups list
  } catch (error) {
    hideButtonLoading('saveLeadGroupBtn');
    console.error('Failed to create lead group:', error);
    showNotification(error.message || 'Failed to create lead group', 'error');
  }
}

// Action Functions
async function previewLead(leadId) {
  try {
    console.log(`Generating and viewing PDF for lead ${leadId}`);
    
    // Get the lead to determine template type
    const lead = leads.find(l => l.id == leadId);
    const templateType = lead?.template_type || 'standard';
    
    // Generate and download/view the PDF directly
    const response = await fetch(`${Endpoint}/api/v1/proposals/${leadId}/generate-pdf?template_type=${templateType}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Create blob and open in new tab for viewing
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Open PDF in new tab for viewing
    window.open(url, '_blank');
    
    // Clean up the URL after a delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
    
    showNotification('PDF generated and opened for viewing!', 'success');
  } catch (error) {
    console.error('Failed to generate/view PDF:', error);
    showNotification(error.message || 'Failed to generate PDF', 'error');
  }
}

async function previewLeadGroup(groupId) {
  try {
    console.log(`Previewing lead group ${groupId}`);
    const preview = await apiCall(`/group-proposals/${groupId}/preview`);
    showLeadGroupPreviewModal(preview);
  } catch (error) {
    console.error('Failed to preview lead group:', error);
    showNotification(error.message || 'Failed to preview lead group', 'error');
  }
}

async function sendLeadEmail(leadId) {
  if (!confirm('Are you sure you want to send this lead email to the client?')) {
    return;
  }

  try {
    console.log(`Sending email for lead ${leadId}`);
    const lead = leads.find(l => l.id == leadId);
    const templateType = lead?.template_type || 'standard';
    
    await apiCall(`/proposals/${leadId}/send-email`, 'POST', {
      template_type: templateType
    });
    showNotification('Lead email sent successfully!', 'success');
    loadLeads(); // Refresh to update status
  } catch (error) {
    console.error('Failed to send lead email:', error);
    showNotification(error.message || 'Failed to send lead email', 'error');
  }
}

async function sendLeadGroupEmail(groupId) {
  if (!confirm('Are you sure you want to send this lead group email to the client?')) {
    return;
  }

  try {
    console.log(`Sending email for lead group ${groupId}`);
    await apiCall(`/group-proposals/${groupId}/send-email`, 'POST', {
      template_type: 'standard' // Default template for groups
    });
    showNotification('Lead group email sent successfully!', 'success');
    loadLeadGroups(); // Refresh to update status
  } catch (error) {
    console.error('Failed to send lead group email:', error);
    showNotification(error.message || 'Failed to send lead group email', 'error');
  }
}

async function convertLead(leadId) {
  if (!confirm('Are you sure you want to convert this lead to a quotation?')) {
    return;
  }

  try {
    console.log(`Converting lead ${leadId} to quotation`);
    
    const response = await fetch(`${Endpoint}/api/v1/proposals/${leadId}/convert`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (parseError) {
        // If response is not JSON, try to get text
        try {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        } catch (textError) {
          // Keep the default error message
        }
      }
      throw new Error(errorMessage);
    }

    const quotation = await response.json();
    console.log('Lead converted successfully:', quotation);
    
    showNotification(`Lead converted to quotation successfully! Quotation reference: ${quotation.quotation_reference}`, 'success');
    loadLeads(); // Refresh to update status
    loadStats(); // Update stats
    
    // Optionally redirect to the new quotation
    if (confirm('Would you like to view the new quotation?')) {
      window.location.href = `edit_trip.html?id=${quotation.quotation_id}`;
    }
  } catch (error) {
    console.error('Failed to convert lead:', error);
    showNotification(error.message || 'Failed to convert lead', 'error');
  }
}

async function deleteLead(leadId) {
  // Check if lead is approved or converted
  const lead = leads.find(l => l.id == leadId);
  if (lead && (lead.status === 'approved' || lead.status === 'converted' || lead.converted_to_quotation)) {
    showNotification('Cannot delete approved or converted leads', 'error');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
    return;
  }

  try {
    console.log(`Deleting lead ${leadId}`);
    await apiCall(`/proposals/${leadId}`, 'DELETE');
    showNotification('Lead deleted successfully!', 'success');
    loadLeads(); // Refresh the list
    loadStats(); // Update stats
  } catch (error) {
    console.error('Failed to delete lead:', error);
    showNotification(error.message || 'Failed to delete lead', 'error');
  }
}

async function deleteLeadGroup(groupId) {
  // Check if group is approved or converted
  const group = leadGroups.find(g => g.id == groupId);
  if (group && (group.status === 'approved' || group.status === 'converted')) {
    showNotification('Cannot delete approved or converted lead groups', 'error');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this lead group? This action cannot be undone.')) {
    return;
  }

  try {
    console.log(`Deleting lead group ${groupId}`);
    await apiCall(`/group-proposals/${groupId}`, 'DELETE');
    showNotification('Lead group deleted successfully!', 'success');
    loadLeadGroups(); // Refresh the list
    loadStats(); // Update stats
  } catch (error) {
    console.error('Failed to delete lead group:', error);
    showNotification(error.message || 'Failed to delete lead group', 'error');
  }
}

// Edit Functions
async function editLead(leadId) {
  try {
    // Find the lead to edit
    const lead = leads.find(l => l.id == leadId);
    if (!lead) {
      showNotification('Lead not found', 'error');
      return;
    }

    // Redirect to edit page with lead ID
    window.location.href = `edit_lead.html?id=${leadId}`;
  } catch (error) {
    console.error('Failed to edit lead:', error);
    showNotification('Failed to edit lead', 'error');
  }
}

async function editLeadGroup(groupId) {
  try {
    // Find the lead group to edit
    const group = leadGroups.find(g => g.id == groupId);
    if (!group) {
      showNotification('Lead group not found', 'error');
      return;
    }

    // Redirect to edit_lead_group.html with group ID
    window.location.href = `edit_lead_group.html?id=${groupId}`;
  } catch (error) {
    console.error('Failed to edit lead group:', error);
    showNotification('Failed to edit lead group', 'error');
  }
}

function resetCreateLeadModal() {
  // Reset modal title and button for create mode
  document.querySelector('#createLeadModal .modal-title').innerHTML = '<i class="fa fa-rocket mr-2"></i>Create New Lead';
  document.getElementById('saveLeadBtn').innerHTML = '<i class="fa fa-save mr-2"></i>Create Lead';
  document.getElementById('saveLeadBtn').onclick = createLead;
  
  // Clear the form
  document.getElementById('createLeadForm').reset();
}

// Filter Functions
function filterLeads() {
  const searchTerm = document.getElementById('leadsSearchInput').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;

  filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      lead.lead_reference.toLowerCase().includes(searchTerm) ||
      lead.option_name.toLowerCase().includes(searchTerm) ||
      lead.client_email.toLowerCase().includes(searchTerm);
    
    const matchesStatus = !statusFilter || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  renderLeads();
}

function filterLeadGroups() {
  const searchTerm = document.getElementById('leadGroupsSearchInput').value.toLowerCase();
  const statusFilter = document.getElementById('groupStatusFilter').value;

  filteredLeadGroups = leadGroups.filter(group => {
    const matchesSearch = !searchTerm || 
      group.group_reference.toLowerCase().includes(searchTerm) ||
      group.group_name.toLowerCase().includes(searchTerm) ||
      group.client_name.toLowerCase().includes(searchTerm) ||
      group.client_email.toLowerCase().includes(searchTerm);
    
    const matchesStatus = !statusFilter || group.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  renderLeadGroups();
}

// Chart Rendering Functions
function renderTemplateConversionChart() {
  const container = document.getElementById('templateConversionChart');
  
  if (!stats || !stats.conversion_by_template || Object.keys(stats.conversion_by_template).length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-chart-bar"></i>
        <p>No conversion data available</p>
      </div>
    `;
    return;
  }

  let html = '';
  Object.entries(stats.conversion_by_template).forEach(([template, rate]) => {
    const percentage = rate.toFixed(1);
    html += `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span class="font-weight-500 text-capitalize">${template}</span>
        <div class="d-flex align-items-center">
          <div class="progress mr-3" style="width: 100px; height: 8px;">
            <div class="progress-bar bg-primary" style="width: ${percentage}%"></div>
          </div>
          <span class="font-weight-600">${percentage}%</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderStatusDistributionChart() {
  const container = document.getElementById('statusDistributionChart');
  
  if (!stats || !stats.leads_by_status || Object.keys(stats.leads_by_status).length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-pie-chart"></i>
        <p>No status data available</p>
      </div>
    `;
    return;
  }

  let html = '<div class="row">';
  Object.entries(stats.leads_by_status).forEach(([status, count]) => {
    const statusClass = `status-${status}`;
    html += `
      <div class="col-md-4 mb-3">
        <div class="text-center p-3 border rounded">
          <div class="h4 mb-1">${count}</div>
          <div class="status-badge ${statusClass}">${status.replace('_', ' ')}</div>
        </div>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}

function renderMonthlyTrendsChart() {
  const container = document.getElementById('monthlyTrendsChart');
  
  if (!stats || !stats.monthly_trends || stats.monthly_trends.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa fa-chart-line"></i>
        <p>No trend data available</p>
      </div>
    `;
    return;
  }

  let html = '';
  stats.monthly_trends.forEach(trend => {
    const monthName = new Date(trend.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    html += `
      <div class="d-flex justify-content-between align-items-center mb-3 p-3 border rounded">
        <div>
          <div class="font-weight-600">${monthName}</div>
          <small class="text-muted">${trend.leads_created} leads created</small>
        </div>
        <div class="text-right">
          <div class="font-weight-600 text-success">${trend.leads_converted || 0} converted</div>
          <small class="text-muted">${(trend.conversion_rate || 0).toFixed(1)}% rate</small>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Utility Functions
function showLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'block';
  }
}

function hideLoading(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.style.display = 'none';
  }
}

function showButtonLoading(buttonId) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.disabled = true;
    button.innerHTML = '<div class="loading-spinner"></div> Creating...';
  }
}

function hideButtonLoading(buttonId) {
  const button = document.getElementById(buttonId);
  if (button) {
    button.disabled = false;
    // Reset button text based on button ID
    if (buttonId === 'saveLeadBtn') {
      button.innerHTML = '<i class="fa fa-save mr-2"></i>Create Lead';
    } else if (buttonId === 'saveLeadGroupBtn') {
      button.innerHTML = '<i class="fa fa-save mr-2"></i>Create Lead Group';
    }
  }
}

function showEmptyState(containerId, icon, title, message) {
  let targetElement;
  
  // Map container IDs to their actual table body elements
  if (containerId === 'leadsContainer') {
    targetElement = document.getElementById('leadsTableBody');
  } else if (containerId === 'leadGroupsContainer') {
    targetElement = document.getElementById('leadGroupsTableBody');
  } else {
    targetElement = document.getElementById(containerId);
  }
  
  if (targetElement) {
    // For table bodies, show as a table row
    if (containerId === 'leadsContainer' || containerId === 'leadGroupsContainer') {
      const colspan = containerId === 'leadsContainer' ? '9' : '7';
      targetElement.innerHTML = `
        <tr>
          <td colspan="${colspan}" class="text-center py-5">
            <i class="fa fa-${icon} fa-3x text-muted mb-3"></i>
            <h4>${title}</h4>
            <p class="text-muted">${message}</p>
          </td>
        </tr>
      `;
    } else {
      // For other containers, show as a div
      targetElement.innerHTML = `
        <div class="empty-state text-center py-5">
          <i class="fa fa-${icon} fa-3x text-muted mb-3"></i>
          <h4>${title}</h4>
          <p class="text-muted">${message}</p>
        </div>
      `;
    }
  } else {
    console.error(`Element not found for container ID: ${containerId}`);
  }
}

function showNotification(message, type = 'info') {
  // Create a simple notification system
  const notification = document.createElement('div');
  notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.minWidth = '300px';
  
  notification.innerHTML = `
    ${message}
    <button type="button" class="close" data-dismiss="alert">
      <span>&times;</span>
    </button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

// Preview Modal Functions (to be implemented)
function showLeadPreviewModal(preview) {
  // TODO: Implement lead preview modal
  console.log('Lead preview:', preview);
  alert('Lead preview functionality will be implemented in the next phase');
}

function showLeadGroupPreviewModal(preview) {
  // TODO: Implement lead group preview modal
  console.log('Lead group preview:', preview);
  alert('Lead group preview functionality will be implemented in the next phase');
}

// Status change functionality with inline dropdown
function showInlineStatusDropdown(badgeElement, id, currentStatus, type) {
  // Check if the status is locked (approved/converted) - additional safety check
  const isLocked = badgeElement.dataset.isLocked === 'true';
  if (isLocked) {
    showNotification(`Cannot change status of approved or converted ${type === 'lead' ? 'leads' : 'lead groups'}`, 'error');
    return;
  }
  
  // Additional check for approved/converted status
  if (currentStatus === 'approved' || currentStatus === 'converted') {
    showNotification(`Cannot change status of ${type === 'lead' ? 'leads' : 'lead groups'} that are already approved or converted`, 'error');
    return;
  }
  
  // Remove any existing dropdowns
  removeAllStatusDropdowns();
  
  // Create dropdown HTML
  const dropdownHtml = `
    <div class="status-dropdown-container" id="statusDropdown">
      <select class="form-control form-control-sm status-dropdown-select" id="statusSelect">
        <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
        <option value="cancelled" ${currentStatus === 'cancelled' || currentStatus === 'cancel' ? 'selected' : ''}>Cancelled</option>
        <option value="ignore" ${currentStatus === 'ignore' ? 'selected' : ''}>Ignore</option>
        <option value="approved" ${currentStatus === 'approved' ? 'selected' : ''}>Approved</option>
      </select>
    </div
  `;
  
  // Replace the badge with dropdown
  const originalHtml = badgeElement.outerHTML;
  badgeElement.outerHTML = dropdownHtml;
  
  const dropdown = document.getElementById('statusDropdown');
  const select = document.getElementById('statusSelect');
  
  // Focus on the select and open it
  select.focus();
  
  // Handle change event
  select.addEventListener('change', async function() {
    const newStatus = this.value;
    
    if (newStatus === currentStatus) {
      // Restore original badge if no change
      dropdown.outerHTML = originalHtml;
      attachStatusBadgeListener();
      return;
    }
    
    // Special handling for "approved" status
    if (newStatus === 'approved') {
      if (type === 'lead') {
        // For individual leads - confirm and convert to quotation
        const confirmMessage = 'Are you sure you want to approve this lead? This will convert it to a quotation.';
        if (!confirm(confirmMessage)) {
          // User cancelled - restore original badge
          dropdown.outerHTML = originalHtml;
          attachStatusBadgeListener();
          return;
        }
        
        try {
          // Show loading state
          select.disabled = true;
          
          // First, update the status to "Approved"
          const statusUpdateData = { status: 'Approved' };
          console.log('Sending status update request:', {
            url: `${Endpoint}/api/v1/proposals/${id}/status`,
            method: 'PUT',
            data: statusUpdateData
          });

          const statusResponse = await fetch(`${Endpoint}/api/v1/proposals/${id}/status`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(statusUpdateData)
          });

          console.log('Status update response:', {
            status: statusResponse.status,
            statusText: statusResponse.statusText,
            ok: statusResponse.ok
          });

          if (!statusResponse.ok) {
            let errorMessage = `Failed to update status: ${statusResponse.status}`;
            try {
              const errorData = await statusResponse.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
              try {
                const errorText = await statusResponse.text();
                errorMessage = errorText || errorMessage;
              } catch (textError) {
                // Keep default message
              }
            }
            throw new Error(errorMessage);
          }

          console.log('Status updated to Approved successfully');

          // Add a longer delay to ensure backend has processed the status change
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Verify the status was actually updated by fetching the lead
          try {
            const verifyResponse = await fetch(`${Endpoint}/api/v1/proposals/${id}`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            });

            if (verifyResponse.ok) {
              const leadData = await verifyResponse.json();
              console.log('Lead status verification:', {
                leadId: id,
                currentStatus: leadData.status,
                expectedStatus: 'Approved'
              });

              if (leadData.status !== 'Approved' && leadData.status !== 'approved') {
                throw new Error(`Status update failed. Expected: Approved, Current: ${leadData.status}`);
              }
            } else {
              console.warn('Could not verify lead status after update');
            }
          } catch (verifyError) {
            console.error('Status verification failed:', verifyError);
            throw new Error(`Status verification failed: ${verifyError.message}`);
          }

          // Then, call the convert API endpoint
          const convertResponse = await fetch(`${Endpoint}/api/v1/proposals/${id}/convert`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          });

          console.log('Convert API response:', {
            status: convertResponse.status,
            statusText: convertResponse.statusText,
            ok: convertResponse.ok
          });

          if (!convertResponse.ok) {
            let errorMessage = `Failed to convert lead: ${convertResponse.status}`;
            let errorDetails = '';
            
            try {
              const errorData = await convertResponse.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
              errorDetails = JSON.stringify(errorData);
              console.error('Convert API error data:', errorData);
            } catch (parseError) {
              try {
                const errorText = await convertResponse.text();
                errorMessage = errorText || errorMessage;
                errorDetails = errorText;
                console.error('Convert API error text:', errorText);
              } catch (textError) {
                console.error('Could not parse error response');
              }
            }
            
            console.error('Full convert error details:', {
              status: convertResponse.status,
              statusText: convertResponse.statusText,
              errorMessage,
              errorDetails
            });
            
            throw new Error(errorMessage);
          }

          const result = await convertResponse.json();
          console.log('Lead converted successfully:', result);
          
          showNotification(`Lead converted to quotation successfully! Quotation reference: ${result.quotation_reference}`, 'success');
          
          // Refresh the list after a short delay to allow backend processing
          setTimeout(() => {
            loadLeads();
            loadStats();
          }, 1000);
          
        } catch (error) {
          console.error('Failed to approve and convert lead:', error);
          showNotification(error.message || 'Failed to approve and convert lead. Please try again.', 'error');
          
          // Restore original badge on error
          dropdown.outerHTML = originalHtml;
          attachStatusBadgeListener();
        }
      } else {
        // For lead groups - show option selection
        dropdown.outerHTML = originalHtml;
        attachStatusBadgeListener();
        showLeadGroupApprovalModal(id);
      }
      return;
    }
    
    // For other status changes, show regular confirmation
    const confirmMessage = `Are you sure you want to change the status from "${currentStatus}" to "${newStatus}"?`;
    if (!confirm(confirmMessage)) {
      // User cancelled - restore original badge
      dropdown.outerHTML = originalHtml;
      attachStatusBadgeListener();
      return;
    }
    
    try {
      // Show loading state
      select.disabled = true;
      
      // Update status via API using the status endpoint
      const endpoint = type === 'lead' ? `/proposals/${id}/status` : `/group-proposals/${id}/status`;
      // Capitalize the status value to match backend expectations
      const capitalizedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      const updateData = { status: capitalizedStatus };
      
      const response = await fetch(`${Endpoint}/api/v1${endpoint}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Status updated successfully:', result);
      
      showNotification(`Status changed to ${newStatus} successfully!`, 'success');
      
      // Reload the appropriate list
      if (type === 'lead') {
        loadLeads();
      } else {
        loadLeadGroups();
      }
      loadStats(); // Update stats as well
    } catch (error) {
      console.error('Failed to update status:', error);
      showNotification(error.message || 'Failed to update status. Please try again.', 'error');
      
      // Restore original badge on error
      dropdown.outerHTML = originalHtml;
      attachStatusBadgeListener();
    }
  });
  
  // Handle blur event to restore badge if no change
  select.addEventListener('blur', function() {
    setTimeout(() => {
      if (document.getElementById('statusDropdown')) {
        dropdown.outerHTML = originalHtml;
        attachStatusBadgeListener();
      }
    }, 200);
  });
  
  // Handle escape key
  select.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      dropdown.outerHTML = originalHtml;
      attachStatusBadgeListener();
    }
  });
}

// Remove all status dropdowns
function removeAllStatusDropdowns() {
  const existingDropdown = document.getElementById('statusDropdown');
  if (existingDropdown) {
    const badge = existingDropdown.previousElementSibling || existingDropdown.nextElementSibling;
    if (badge && badge.classList.contains('lead-status-badge')) {
      existingDropdown.outerHTML = badge.outerHTML;
    }
  }
}

// Re-attach status badge listeners after DOM manipulation
function attachStatusBadgeListener() {
  // For leads
  document.querySelectorAll('.lead-status-badge').forEach(badge => {
    // Remove existing listeners to avoid duplicates
    const newBadge = badge.cloneNode(true);
    badge.parentNode.replaceChild(newBadge, badge);
    
    newBadge.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // Check if status is locked (approved/converted)
      const isLocked = this.dataset.isLocked === 'true';
      if (isLocked) {
        showNotification('Cannot change status of approved or converted leads', 'error');
        return;
      }
      
      const leadId = this.dataset.leadId;
      const currentStatus = this.dataset.currentStatus;
      showInlineStatusDropdown(this, leadId, currentStatus, 'lead');
    });
  });
  
  // For lead groups
  document.querySelectorAll('.group-status-badge').forEach(badge => {
    // Remove existing listeners to avoid duplicates
    const newBadge = badge.cloneNode(true);
    badge.parentNode.replaceChild(newBadge, badge);
    
    newBadge.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // Check if status is locked (approved/converted)
      const isLocked = this.dataset.isLocked === 'true';
      if (isLocked) {
        showNotification('Cannot change status of approved or converted lead groups', 'error');
        return;
      }
      
      const groupId = this.dataset.groupId;
      const currentStatus = this.dataset.currentStatus;
      showInlineStatusDropdown(this, groupId, currentStatus, 'group');
    });
  });
}

// Add global click handler to close dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.status-dropdown-container') && !e.target.closest('.lead-status-badge') && !e.target.closest('.group-status-badge')) {
    removeAllStatusDropdowns();
  }
});

// Show lead group approval modal with option selection
async function showLeadGroupApprovalModal(groupId) {
  try {
    // Find the lead group
    const group = leadGroups.find(g => g.id == groupId);
    if (!group) {
      showNotification('Lead group not found', 'error');
      return;
    }
    
    // Fetch the lead group details with all leads
    const groupDetails = await apiCall(`/group-proposals/${groupId}`);
    
    if (!groupDetails.leads || groupDetails.leads.length === 0) {
      showNotification('No lead options found in this group', 'error');
      return;
    }
    
    // Create modal HTML
    const modalHtml = `
      <div class="modal fade" id="leadGroupApprovalModal" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Select Lead Option to Approve</h5>
              <button type="button" class="close" data-dismiss="modal">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <p class="mb-3">Select which lead option from "${group.group_name}" you want to approve and convert to quotation:</p>
              <div class="list-group">
                ${groupDetails.leads.map(lead => `
                  <a href="#" class="list-group-item list-group-item-action lead-option-select"
                     data-lead-id="${lead.id}"
                     data-group-id="${groupId}">
                    <div class="d-flex w-100 justify-content-between">
                      <h5 class="mb-1">${lead.option_name}</h5>
                      <small class="text-muted">
                        ${lead.final_cost ? `฿${lead.final_cost.toFixed(2)}` : 'No cost'}
                      </small>
                    </div>
                    <p class="mb-1">${lead.internal_notes || 'No description'}</p>
                    <small>
                      Template: ${lead.template_type} |
                      Markup: ${lead.markup_percentage}% |
                      Status: ${lead.status || 'pending'}
                    </small>
                  </a>
                `).join('')}
              </div>
              <div class="alert alert-warning mt-3">
                <i class="fa fa-exclamation-triangle"></i>
                <strong>Important:</strong> Approving a lead option will:
                <ul class="mb-0 mt-2">
                  <li>Convert the selected option to a quotation</li>
                  <li>Mark all other options in this group as inactive</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelled</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('leadGroupApprovalModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    $('#leadGroupApprovalModal').modal('show');
    
    // Handle lead option selection
    document.querySelectorAll('.lead-option-select').forEach(option => {
      option.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const selectedLeadId = this.dataset.leadId;
        const leadName = this.querySelector('h5').textContent;
        
        // Confirm selection
        if (!confirm(`Are you sure you want to approve "${leadName}" and convert it to a quotation? All other options will be marked as inactive.`)) {
          return;
        }
        
        try {
          // First update the group status to approved
          const groupResponse = await fetch(`${Endpoint}/api/v1/group-proposals/${groupId}/status`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: 'Approved' })
          });

          if (!groupResponse.ok) {
            let errorMessage = `Failed to update group status: ${groupResponse.status}`;
            try {
              const errorData = await groupResponse.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
              try {
                const errorText = await groupResponse.text();
                errorMessage = errorText || errorMessage;
              } catch (textError) {
                // Keep default message
              }
            }
            throw new Error(errorMessage);
          }
          
          // Then update the selected lead status to approved
          const leadStatusResponse = await fetch(`${Endpoint}/api/v1/proposals/${selectedLeadId}/status`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ status: 'Approved' })
          });

          if (!leadStatusResponse.ok) {
            let errorMessage = `Failed to update lead status: ${leadStatusResponse.status}`;
            try {
              const errorData = await leadStatusResponse.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
              try {
                const errorText = await leadStatusResponse.text();
                errorMessage = errorText || errorMessage;
              } catch (textError) {
                // Keep default message
              }
            }
            throw new Error(errorMessage);
          }

          // Add a delay and verify the lead status was updated
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Verify the status was actually updated by fetching the lead
          try {
            const verifyResponse = await fetch(`${Endpoint}/api/v1/proposals/${selectedLeadId}`, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json",
              },
            });

            if (verifyResponse.ok) {
              const leadData = await verifyResponse.json();
              console.log('Lead status verification for group approval:', {
                leadId: selectedLeadId,
                currentStatus: leadData.status,
                expectedStatus: 'Approved'
              });

              if (leadData.status !== 'Approved' && leadData.status !== 'approved') {
                throw new Error(`Status update failed for lead ${selectedLeadId}. Expected: Approved, Current: ${leadData.status}`);
              }
            } else {
              console.warn('Could not verify lead status after update');
            }
          } catch (verifyError) {
            console.error('Status verification failed:', verifyError);
            throw new Error(`Status verification failed: ${verifyError.message}`);
          }
          
          // Finally convert the selected lead to quotation using the convert endpoint
          const convertResponse = await fetch(`${Endpoint}/api/v1/proposals/${selectedLeadId}/convert`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
            },
          });

          if (!convertResponse.ok) {
            let errorMessage = `Failed to convert lead: ${convertResponse.status}`;
            try {
              const errorData = await convertResponse.json();
              errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (parseError) {
              try {
                const errorText = await convertResponse.text();
                errorMessage = errorText || errorMessage;
              } catch (textError) {
                // Keep default message
              }
            }
            throw new Error(errorMessage);
          }

          const result = await convertResponse.json();
          console.log('Lead converted successfully:', result);
          
          // Update other leads in the group to 'ignore' status
          for (const lead of groupDetails.leads) {
            if (lead.id != selectedLeadId) {
              try {
                const response = await fetch(`${Endpoint}/api/v1/proposals/${lead.id}/status`, {
                  method: 'PUT',
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ status: 'Ignore' })
                });

                if (!response.ok) {
                  console.warn(`Failed to update status for lead ${lead.id}: ${response.status}`);
                } else {
                  console.log(`Successfully updated lead ${lead.id} to ignore status`);
                }
              } catch (error) {
                console.warn(`Error updating status for lead ${lead.id}:`, error);
              }
            }
          }
          
          $('#leadGroupApprovalModal').modal('hide');
          showNotification('Lead option approved and will be converted to quotation!', 'success');
          
          // Reload both lists after a short delay to allow backend processing
          setTimeout(() => {
            loadLeads();
            loadLeadGroups();
            loadStats();
          }, 1000);
        } catch (error) {
          console.error('Failed to approve lead option:', error);
          showNotification('Failed to approve lead option. Please try again.', 'error');
        }
      });
    });
    
    // Clean up modal on hide
    $('#leadGroupApprovalModal').on('hidden.bs.modal', function() {
      this.remove();
    });
    
  } catch (error) {
    console.error('Failed to show lead group approval modal:', error);
    showNotification('Failed to load lead options. Please try again.', 'error');
  }
}