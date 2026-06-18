// Operations Management JavaScript
let currentPage = 1;
let currentFilters = {};
let operationsData = [];
let currentSort = { field: 'due_date', direction: 'asc' };
let currentTab = 'daily';
let upcomingDays = 3;

// Updated operation status constants (removed pending, removed priority system)
const OPERATION_STATUS = {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    OVERDUE: 'overdue'
};

// Updated operation types according to API documentation
const OPERATION_TYPES = {
    // Hotel Operations
    HOTEL_CONFIRMATION: 'hotel_confirmation',
    HOTEL_CHECKOUT: 'hotel_checkout',
    
    // Transfer Operations
    TRANSFER_CONFIRMATION: 'transfer_confirmation',
    TRANSFER_PICKUP: 'transfer_pickup',
    
    // Excursion Operations
    EXCURSION_CONFIRMATION: 'excursion_confirmation',
    EXCURSION_REMINDER: 'excursion_reminder',
    
    // Tour Operations
    TOUR_CONFIRMATION: 'tour_confirmation',
    
    // Flight Operations
    FLIGHT_ASSISTANCE: 'flight_assistance',
    AIRPORT_PICKUP: 'airport_pickup',
    AIRPORT_DROPOFF: 'airport_dropoff',
    
    // General Operations
    CLIENT_FOLLOWUP: 'client_followup',
    DOCUMENT_COLLECTION: 'document_collection',
    SUPPLIER_CONFIRMATION: 'supplier_confirmation',
    PAYMENT_FOLLOWUP: 'payment_followup',
    ITINERARY_PREP: 'itinerary_prep',
    ARRIVAL_ASSISTANCE: 'arrival_assistance',
    CUSTOM: 'custom'
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    // Load user profile
    loadUserProfile();
    
    // Load summary data
    loadSummaryCards();
    
    // Load daily operations by default
    switchTab('daily');
    
    // Load assignees for filter
    loadAssignees();
    
    // Load locations for filter
    loadLocations();

    // Set up filter event listeners
    setupFilterListeners();

    // Set up client search event listeners
    setupClientSearch();
}

// Load user profile information
function loadUserProfile() {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    
    // First try to use the username from localStorage if available
    if (storedUsername) {
        updateProfileDisplay(storedUsername);
    }
    
    if (!token) {
        // If no token and no stored username, use fallback
        if (!storedUsername) {
            updateProfileDisplay('Guest');
        }
        return;
    }
    
    // Load actual profile data from API
    fetch(`${Endpoint}/api/v1/profile`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const username = data.username || data.name || storedUsername || 'User';
        updateProfileDisplay(username);
    })
    .catch(error => {
        console.error('Error loading profile:', error);
        // Fallback to stored username or Guest if API fails
        if (storedUsername) {
            updateProfileDisplay(storedUsername);
        } else {
            updateProfileDisplay('Guest');
        }
    });
}

function updateProfileDisplay(name) {
    const profileNameEl = document.getElementById('profileName');
    const navProfileNameEl = document.getElementById('navProfileName');
    
    if (profileNameEl) profileNameEl.textContent = name;
    if (navProfileNameEl) navProfileNameEl.textContent = name;
}

// Load summary cards (updated to remove Pending and Completion Rate, keep only In Progress and Completed)
function loadSummaryCards() {
    const token = localStorage.getItem('token');
    const apiUrl = `${Endpoint}/api/v1/operations`;
    
    fetch(apiUrl, {
        headers: token ? {
            'Authorization': `Bearer ${token}`
        } : {}
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const operations = Array.isArray(data) ? data : (data.operations || []);
        
        // Calculate simplified metrics (only In Progress and Completed)
        const inProgressCount = operations.filter(op => op.status === 'in_progress').length;
        const completedCount = operations.filter(op => op.status === 'completed').length;
        
        const summaryCardsHtml = `
            <div class="summary-card">
                <div class="summary-number" style="color: #007bff;">${inProgressCount}</div>
                <div class="summary-label">In Progress</div>
            </div>
            <div class="summary-card">
                <div class="summary-number" style="color: #28a745;">${completedCount}</div>
                <div class="summary-label">Completed</div>
            </div>
        `;
        
        document.getElementById('summaryCards').innerHTML = summaryCardsHtml;
    })
    .catch(error => {
        console.error('Error loading summary:', error);
        document.getElementById('summaryCards').innerHTML = `
            <div class="summary-card">
                <div class="summary-number" style="color: #dc3545;">--</div>
                <div class="summary-label">Error Loading</div>
            </div>
        `;
    });
}

// Switch between tabs
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab UI
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
    });
    
    document.getElementById(tabName + '-tab').classList.add('active');
    document.getElementById(tabName).classList.add('show', 'active');
    
    // Show/hide upcoming navigation controls
    const upcomingControls = document.querySelector('.upcoming-nav-controls');
    if (tabName === 'upcoming') {
        upcomingControls.style.display = 'inline-block';
    } else {
        upcomingControls.style.display = 'none';
    }
    
    // Load data for the selected tab
    switch(tabName) {
        case 'daily':
            loadDailyOperations();
            break;
        case 'upcoming':
            loadUpcomingOperations();
            break;
        case 'client':
            loadClientsList();
            break;
    }
}

// Load daily operations
function loadDailyOperations() {
    showLoading(true);
    
    const token = localStorage.getItem('token');
    const apiUrl = `${Endpoint}/api/v1/operations/today`;
    
    fetch(apiUrl, {
        headers: token ? {
            'Authorization': `Bearer ${token}`
        } : {}
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Daily operations response:', data);
        const operations = Array.isArray(data) ? data : (data.operations || []);
        operationsData = operations;
        renderOperationsInTable(operations, 'dailyOperationsTableBody');
        showLoading(false);
    })
    .catch(error => {
        console.error('Error loading daily operations:', error);
        showErrorMessage('Unable to load daily operations');
        showLoading(false);
    });
}

// Load upcoming operations
function loadUpcomingOperations() {
    showLoading(true);
    
    const token = localStorage.getItem('token');
    const apiUrl = `${Endpoint}/api/v1/operations/upcoming?days=${upcomingDays}`;
    
    fetch(apiUrl, {
        headers: token ? {
            'Authorization': `Bearer ${token}`
        } : {}
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Upcoming operations response:', data);
        const operations = Array.isArray(data) ? data : (data.operations || []);
        operationsData = operations;
        renderOperationsInTable(operations, 'upcomingOperationsTableBody');
        updateUpcomingDaysIndicator();
        showLoading(false);
    })
    .catch(error => {
        console.error('Error loading upcoming operations:', error);
        showErrorMessage('Unable to load upcoming operations');
        showLoading(false);
    });
}

// Change upcoming days and reload
function changeUpcomingDays(direction) {
    upcomingDays = Math.max(1, Math.min(14, upcomingDays + direction)); // Keep between 1-14 days
    updateUpcomingDaysIndicator();
    loadUpcomingOperations();
}

// Update the upcoming days indicator
function updateUpcomingDaysIndicator() {
    const indicator = document.getElementById('upcomingDaysIndicator');
    indicator.textContent = `Next ${upcomingDays} day${upcomingDays > 1 ? 's' : ''}`;
}

// Load clients list for client operations tab
function loadClientsList() {
    const token = localStorage.getItem('token');
    const clientSelect = document.getElementById('clientSelect');
    
    // Clear existing options except the first one
    clientSelect.innerHTML = '<option value="">Choose a client...</option>';
    
    if (!token) {
        // Add sample clients
        clientSelect.innerHTML += `
            <option value="1">Wheels Apart</option>
            <option value="2">Sample Client 2</option>
            <option value="3">Sample Client 3</option>
        `;
        return;
    }
    
    fetch(`${Endpoint}/api/v1/agents`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const agents = Array.isArray(data) ? data : (data.agents || []);
        agents.forEach(agent => {
            clientSelect.innerHTML += `<option value="${agent.id}">${agent.name}</option>`;
        });
    })
    .catch(error => {
        console.error('Error loading clients:', error);
        // Keep sample data as fallback
    });
}

// Load operations for selected client using new by-client endpoint
function loadClientOperations() {
    const clientId = document.getElementById('clientSelect').value;
    
    if (!clientId) {
        document.getElementById('clientOperationsTableBody').innerHTML = '';
        return;
    }
    
    showLoading(true);
    
    const token = localStorage.getItem('token');
    // Get the client name for the search
    const clientSelect = document.getElementById('clientSelect');
    const selectedOption = clientSelect.options[clientSelect.selectedIndex];
    const clientName = selectedOption.text;
    
    // Use the new by-client endpoint with client name
    const apiUrl = `${Endpoint}/api/v1/operations/by-client?client=${encodeURIComponent(clientName)}`;
    
    fetch(apiUrl, {
        headers: token ? {
            'Authorization': `Bearer ${token}`
        } : {}
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Client operations response:', data);
        const operations = Array.isArray(data) ? data : [];
        operationsData = operations;
        renderClientOperations(operations);
        showLoading(false);
    })
    .catch(error => {
        console.error('Error loading client operations:', error);
        showErrorMessage('Unable to load client operations');
        showLoading(false);
    });
}

// Enhanced search clients functionality using the by-client endpoint
let searchTimeout = null;
let lastSearchTerm = '';
let lastSearchFilters = '';
let currentClientPage = 1;
let clientPagination = {};

// Set up client search event listeners
function setupClientSearch() {
    const searchInput = document.getElementById('clientSearch');
    if (searchInput) {
        // Debounced search on input with longer delay for network
        searchInput.addEventListener('input', function() {
            debouncedClientSearch();
        });
        
        // Manual search on Enter key
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                performClientSearch();
            }
        });
    }
}

// Handle client filter changes
function handleClientFilterChange() {
    const searchTerm = document.getElementById('clientSearch').value.trim();
    if (searchTerm.length >= 2) {
        currentClientPage = 1; // Reset to first page
        performClientSearch();
    } else {
        // If no search term, just update the UI message
        updateSearchStatus('Enter 2+ characters to search');
        clearClientSearchResults();
    }
}

// Debounced search function with improved network handling
function debouncedClientSearch() {
    const searchTerm = document.getElementById('clientSearch').value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Update search status
    updateSearchStatus('Typing...');
    
    // Longer delay for network conditions and avoid rapid calls
    searchTimeout = setTimeout(() => {
        if (searchTerm.length >= 2) {
            currentClientPage = 1; // Reset to first page
            performClientSearch();
        } else if (searchTerm.length === 0) {
            clearClientSearchResults();
            updateSearchStatus('');
            updateSearchResults('');
        } else {
            updateSearchStatus('Enter 2+ characters to search');
            clearClientSearchResults();
        }
    }, 800); // Increased to 800ms for better network performance
}

// Manual search function with enhanced filtering
function performClientSearch(page = 1) {
    const searchTerm = document.getElementById('clientSearch').value.trim().toLowerCase();
    
    if (searchTerm.length < 2) {
        updateSearchStatus('Please enter at least 2 characters to search');
        clearClientSearchResults();
        return;
    }
    
    // Get filter values
    const statusFilter = document.getElementById('clientStatusFilter').value;
    const currentFilters = `${searchTerm}|${statusFilter}|${page}`;
    
    // Avoid duplicate searches for the same parameters
    if (currentFilters === lastSearchFilters) {
        return;
    }
    
    lastSearchTerm = searchTerm;
    lastSearchFilters = currentFilters;
    currentClientPage = page;
    updateSearchStatus('Searching...');
    
    showLoading(true);
    
    const token = localStorage.getItem('token');
    
    // Build query parameters
    const queryParams = new URLSearchParams({
        client: searchTerm,
        page: page.toString(),
        limit: '20'
    });
    
    // Handle status filtering logic
    if (statusFilter === 'active') {
        // For "active", we want in_progress and overdue
        // We'll filter this on the frontend since backend might not support multiple statuses
        // Let's get all and filter client-side, or make two calls
        queryParams.append('include_completed', 'false');
    } else if (statusFilter && statusFilter !== '') {
        // Specific status
        queryParams.append('status', statusFilter);
    }
    // If statusFilter is empty (''), get all operations (default backend behavior)
    
    const apiUrl = `${Endpoint}/api/v1/operations/by-client?${queryParams.toString()}`;
    
    fetch(apiUrl, {
        headers: token ? {
            'Authorization': `Bearer ${token}`
        } : {}
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Client search response:', data);
        
        // Handle both direct array response and paginated response
        let operations = Array.isArray(data) ? data : (data.operations || []);
        const pagination = data.pagination || {};
        
        // Client-side filtering for "active" status (in_progress + overdue)
        if (statusFilter === 'active') {
            operations = operations.filter(op => 
                op.status === 'in_progress' || op.status === 'overdue'
            );
        }
        
        // Update pagination info
        clientPagination = pagination;
        
        if (operations.length === 0) {
            updateSearchStatus(`No results for "${searchTerm}"`);
            updateSearchResults('');
            const tableBody = document.getElementById('clientOperationsTableBody');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="10" class="text-center" style="padding: 40px;">
                        <i class="fa fa-search fa-2x" style="color: #ddd; margin-bottom: 10px;"></i>
                        <div>No operations found for "${searchTerm}"</div>
                        <div class="text-muted" style="margin-top: 10px; font-size: 0.9em;">
                            Try changing the filter or search for a different client.
                        </div>
                    </td>
                </tr>
            `;
        } else {
            updateSearchStatus(`Found results for "${searchTerm}"`);
            
            // Update results count
            if (pagination.total) {
                updateSearchResults(
                    `Showing ${operations.length} of ${pagination.total} operations ` +
                    `(Page ${pagination.current_page || 1} of ${pagination.total_pages || 1})`
                );
            } else {
                updateSearchResults(`Found ${operations.length} operation(s)`);
            }
            
            // Render operations
            renderClientOperations(operations);
        }
        
        // Render pagination
        renderClientPagination();
        
        showLoading(false);
    })
    .catch(error => {
        console.error('Error searching clients:', error);
        updateSearchStatus('Search failed - please try again');
        updateSearchResults('');
        showErrorMessage('Unable to search clients - check your connection');
        showLoading(false);
        
        // Reset last search to allow retry
        lastSearchFilters = '';
    });
}

// Update search results display
function updateSearchResults(message) {
    const resultsEl = document.getElementById('searchResults');
    if (resultsEl) {
        resultsEl.textContent = message;
    }
}

// Render client pagination
function renderClientPagination() {
    const container = document.getElementById('clientPaginationContainer');
    
    if (!clientPagination.total_pages || clientPagination.total_pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const currentPage = clientPagination.current_page || 1;
    const totalPages = clientPagination.total_pages;
    const hasPrev = clientPagination.has_prev || currentPage > 1;
    const hasNext = clientPagination.has_next || currentPage < totalPages;
    
    let pagination = '<nav><ul class="pagination justify-content-center">';
    
    // Previous button
    if (hasPrev) {
        pagination += `<li class="page-item">
            <a class="page-link" href="#" onclick="performClientSearch(${currentPage - 1}); return false;">
                <i class="fa fa-chevron-left"></i> Previous
            </a>
        </li>`;
    } else {
        pagination += `<li class="page-item disabled">
            <span class="page-link"><i class="fa fa-chevron-left"></i> Previous</span>
        </li>`;
    }
    
    // Page numbers (show current and surrounding pages)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    if (startPage > 1) {
        pagination += `<li class="page-item">
            <a class="page-link" href="#" onclick="performClientSearch(1); return false;">1</a>
        </li>`;
        if (startPage > 2) {
            pagination += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage ? 'active' : '';
        pagination += `<li class="page-item ${active}">
            <a class="page-link" href="#" onclick="performClientSearch(${i}); return false;">${i}</a>
        </li>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
        pagination += `<li class="page-item">
            <a class="page-link" href="#" onclick="performClientSearch(${totalPages}); return false;">${totalPages}</a>
        </li>`;
    }
    
    // Next button
    if (hasNext) {
        pagination += `<li class="page-item">
            <a class="page-link" href="#" onclick="performClientSearch(${currentPage + 1}); return false;">
                Next <i class="fa fa-chevron-right"></i>
            </a>
        </li>`;
    } else {
        pagination += `<li class="page-item disabled">
            <span class="page-link">Next <i class="fa fa-chevron-right"></i></span>
        </li>`;
    }
    
    pagination += '</ul></nav>';
    container.innerHTML = pagination;
}

// Clear search function
function clearClientSearch() {
    document.getElementById('clientSearch').value = '';
    document.getElementById('clientStatusFilter').value = 'active'; // Reset to default
    lastSearchTerm = '';
    lastSearchFilters = '';
    currentClientPage = 1;
    clientPagination = {};
    clearClientSearchResults();
    updateSearchStatus('');
    updateSearchResults('');
    
    // Clear pagination
    document.getElementById('clientPaginationContainer').innerHTML = '';
    
    // Clear timeout if active
    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }
}

// Show error message
function showErrorMessage(message) {
    const activeTabPane = document.querySelector('.tab-pane.active .table-responsive');
    if (activeTabPane) {
        const tableBody = activeTabPane.querySelector('tbody');
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 40px;">
                    <i class="fa fa-exclamation-triangle fa-2x" style="color: #dc3545; margin-bottom: 10px;"></i>
                    <div>${message}</div>
                    <button class="btn btn-primary btn-sm" onclick="reloadCurrentTab()" style="margin-top: 10px;">
                        <i class="fa fa-refresh"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

// Reload current tab
function reloadCurrentTab() {
    switchTab(currentTab);
}

// Load assignees for filter dropdown
function loadAssignees() {
    const token = localStorage.getItem('token');
    const assigneeSelect = document.getElementById('assigneeFilter');
    
    if (!token) {
        // Add sample assignees
        assigneeSelect.innerHTML += `
            <option value="10">Sofia Florence</option>
            <option value="11">Marco Rome</option>
            <option value="12">Lisa Milan</option>
        `;
        return;
    }
    
    fetch(`${Endpoint}/api/v1/users`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const users = data.users || [];
        users.forEach(user => {
            assigneeSelect.innerHTML += `<option value="${user.id}">${user.username}</option>`;
        });
    })
    .catch(error => {
        console.error('Error loading assignees:', error);
    });
}

// Load locations/cities for filter dropdown
function loadLocations() {
    const token = localStorage.getItem('token');
    const locationFilter = document.getElementById('locationFilter');

    // Clear existing options except the first default option
    const defaultOption = locationFilter.querySelector('option[value=""]');
    locationFilter.innerHTML = '';
    if (defaultOption) {
        locationFilter.appendChild(defaultOption);
    } else {
        locationFilter.innerHTML = '<option value="">All Locations</option>';
    }

    if (!token) {
        // Add sample locations as fallback
        locationFilter.innerHTML += `
            <option value="Bangkok">Bangkok</option>
            <option value="Dubai">Dubai</option>
            <option value="Rome">Rome</option>
            <option value="Florence">Florence</option>
            <option value="Venice">Venice</option>
            <option value="Milan">Milan</option>
        `;
        return;
    }

    fetch(`${Endpoint}/api/v1/cities`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(cities => {
        cities.forEach(city => {
            const option = document.createElement('option');
            option.value = city;
            option.textContent = city;
            locationFilter.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading locations:', error);
        // Keep sample data as fallback
        locationFilter.innerHTML += `
            <option value="Bangkok">Bangkok</option>
            <option value="Dubai">Dubai</option>
            <option value="Rome">Rome</option>
            <option value="Florence">Florence</option>
            <option value="Venice">Venice</option>
            <option value="Milan">Milan</option>
        `;
    });
}

// Set up filter event listeners
function setupFilterListeners() {
    // Filter button
    const filterBtn = document.querySelector('.btn-primary[onclick="applyFilters()"]');
    if (filterBtn) {
        filterBtn.onclick = applyFilters;
    }
    
    // Clear button
    const clearBtn = document.querySelector('.btn-secondary[onclick="clearFilters()"]');
    if (clearBtn) {
        clearBtn.onclick = clearFilters;
    }
    
    // Enter key on filter inputs
    document.getElementById('statusFilter').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') applyFilters();
    });
    document.getElementById('locationFilter').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') applyFilters();
    });
    document.getElementById('assigneeFilter').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') applyFilters();
    });
}

// Apply filters
function applyFilters() {
    const filters = {
        status: document.getElementById('statusFilter').value,
        location: document.getElementById('locationFilter').value,
        assignee: document.getElementById('assigneeFilter').value
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) {
            delete filters[key];
        }
    });
    
    currentFilters = filters;
    
    // Reload current tab with filters
    switch(currentTab) {
        case 'daily':
            loadDailyOperations();
            break;
        case 'upcoming':
            loadUpcomingOperations();
            break;
        case 'client':
            loadClientOperations();
            break;
    }
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('assigneeFilter').value = '';
    
    currentFilters = {};
    
    // Reload current tab without filters
    reloadCurrentTab();
}

// Show/hide loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const table = document.querySelector('.table-responsive');
    
    if (show) {
        spinner.style.display = 'flex';
        if (table) table.style.display = 'none';
    } else {
        spinner.style.display = 'none';
        if (table) table.style.display = 'block';
    }
}

// Format due date for display
function formatDueDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;
    const hours = Math.round(diff / (1000 * 60 * 60));
    
    if (hours < 0) {
        return `<span style="color: #dc3545;">Overdue by ${Math.abs(hours)}h</span>`;
    } else if (hours < 24) {
        return `<span style="color: #fd7e14;">Due in ${hours}h</span>`;
    } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

// Sort operations data (removed priority, enhanced time-based sorting)
function sortOperationsData(operations) {
    return [...operations].sort((a, b) => {
        let aValue, bValue;
        
        switch (currentSort.field) {
            case 'title':
                aValue = a.title?.toLowerCase() || '';
                bValue = b.title?.toLowerCase() || '';
                break;
            case 'location':
                aValue = a.location?.toLowerCase() || '';
                bValue = b.location?.toLowerCase() || '';
                break;
            case 'due_date':
                aValue = new Date(a.due_date || 0);
                bValue = new Date(b.due_date || 0);
                break;
            case 'status':
                // Sort by status priority: in_progress > overdue > completed > cancelled
                const statusOrder = { 
                    'in_progress': 1, 
                    'overdue': 2, 
                    'completed': 3, 
                    'cancelled': 4 
                };
                aValue = statusOrder[a.status] || 5;
                bValue = statusOrder[b.status] || 5;
                break;
            case 'time':
                // Sort by multiple time fields in order of preference
                aValue = getOperationSortTime(a);
                bValue = getOperationSortTime(b);
                break;
            default:
                return 0;
        }
        
        if (currentSort.direction === 'asc') {
            return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
    });
}

// Enhanced time-based sorting utility
function getOperationSortTime(operation) {
    // Priority order for time fields:
    // 1. event_date + scheduled_time (for specific events)
    // 2. pickup_time (for transfers)  
    // 3. flight_time (for flight operations)
    // 4. checkin_time/checkout_time (for hotels)
    // 5. due_date (fallback)
    
    if (operation.event_date) {
        const eventDate = new Date(operation.event_date);
        if (operation.scheduled_time) {
            const [hours, minutes] = operation.scheduled_time.split(':');
            eventDate.setHours(parseInt(hours), parseInt(minutes));
        }
        return eventDate;
    }
    
    if (operation.pickup_time) {
        const today = new Date();
        const [hours, minutes] = operation.pickup_time.split(':');
        today.setHours(parseInt(hours), parseInt(minutes));
        return today;
    }
    
    if (operation.flight_time) {
        const today = new Date();
        const [hours, minutes] = operation.flight_time.split(':');
        today.setHours(parseInt(hours), parseInt(minutes));
        return today;
    }
    
    if (operation.checkin_time) {
        const today = new Date();
        const [hours, minutes] = operation.checkin_time.split(':');
        today.setHours(parseInt(hours), parseInt(minutes));
        return today;
    }
    
    return new Date(operation.due_date || 0);
}

// Utility to sort operations by time for better UX (as per API documentation)
function sortOperationsByTime(operations) {
    return operations.sort((a, b) => {
        // First sort by event_date if available
        if (a.event_date && b.event_date) {
            const dateCompare = new Date(a.event_date) - new Date(b.event_date);
            if (dateCompare !== 0) return dateCompare;
        }
        
        // Then by scheduled_time
        if (a.scheduled_time && b.scheduled_time) {
            return a.scheduled_time.localeCompare(b.scheduled_time);
        }
        
        // Finally by due_date
        return new Date(a.due_date || 0) - new Date(b.due_date || 0);
    });
}

// Format due date with CSS class
function formatDueDateWithClass(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date - now;
    const hours = Math.round(diff / (1000 * 60 * 60));
    
    if (hours < 0) {
        return {
            date: `Overdue by ${Math.abs(hours)}h`,
            class: 'due-overdue'
        };
    } else if (hours < 24) {
        return {
            date: `Due in ${hours}h`,
            class: 'due-urgent'
        };
    } else {
        return {
            date: date.toLocaleDateString(),
            class: 'due-normal'
        };
    }
}

// Format operation type for display
function formatOperationType(type) {
    const typeMap = {
        'hotel_confirmation': 'Hotel',
        'transfer_pickup': 'Transfer',
        'transfer_confirmation': 'Transfer',
        'transfer_dropoff': 'Transfer',
        'airport_pickup': 'Airport',
        'airport_dropoff': 'Airport',
        'excursion_confirmation': 'Excursion',
        'tour_confirmation': 'Tour',
        'dining_reservation': 'Dining',
        'guide_assignment': 'Guide',
        'flight_assistance': 'Flight',
        'admin_task': 'Admin',
        'client_followup': 'Follow-up',
        'client_follow_up': 'Follow-up',
        'custom': 'Custom'
    };
    
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Get status action button based on current status (updated for new status system)
function getStatusActionButton(operation) {
    switch(operation.status) {
        case 'in_progress':
            return `<button class="btn btn-sm btn-outline-success" onclick="completeOperation(${operation.id})" title="Complete Operation">
                        <i class="fa fa-check"></i>
                    </button>`;
        case 'completed':
            return `<button class="btn btn-sm btn-outline-info" onclick="viewOperation(${operation.id})" title="View Completed">
                        <i class="fa fa-check-circle"></i>
                    </button>`;
        case 'cancelled':
            return `<button class="btn btn-sm btn-outline-secondary" onclick="viewOperation(${operation.id})" title="View Cancelled">
                        <i class="fa fa-ban"></i>
                    </button>`;
        case 'overdue':
            return `<button class="btn btn-sm btn-outline-danger" onclick="completeOperation(${operation.id})" title="Complete Overdue">
                        <i class="fa fa-exclamation-triangle"></i>
                    </button>`;
        default:
            return `<button class="btn btn-sm btn-outline-primary" onclick="viewOperation(${operation.id})" title="View Details">
                        <i class="fa fa-info-circle"></i>
                    </button>`;
    }
}

// Sort operations by column
function sortOperations(field) {
    if (currentSort.field === field) {
        // Toggle direction if same field
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // New field, default to ascending
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    // Re-render with current data
    if (operationsData.length > 0) {
        renderOperations({ operations: operationsData });
    }
}

// Render pagination
function renderPagination(data) {
    const container = document.getElementById('paginationContainer');
    const totalPages = data.total_pages || 1;
    const currentPage = data.page || 1;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let pagination = '<nav><ul class="pagination">';
    
    // Previous button
    if (currentPage > 1) {
        pagination += `<li><a href="#" onclick="loadOperations(${currentPage - 1}, currentFilters)">&laquo; Previous</a></li>`;
    }
    
    // Page numbers
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const active = i === currentPage ? 'class="active"' : '';
        pagination += `<li ${active}><a href="#" onclick="loadOperations(${i}, currentFilters)">${i}</a></li>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        pagination += `<li><a href="#" onclick="loadOperations(${currentPage + 1}, currentFilters)">Next &raquo;</a></li>`;
    }
    
    pagination += '</ul></nav>';
    container.innerHTML = pagination;
}

// Operation actions
function viewOperation(operationId) {
    window.location.href = `edit_operations.html?id=${operationId}`;
}

function editOperation(operationId) {
    window.location.href = `edit_operations.html?id=${operationId}&mode=edit`;
}

function createNewOperation() {
    window.location.href = `edit_operations.html?mode=create`;
}

function startOperation(operationId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('This is sample data. In a real scenario, this would start the operation.');
        return;
    }
    
    if (confirm('Start this operation?')) {
        fetch(`${Endpoint}/api/v1/operations/${operationId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if the operation was successfully started
            // Backend returns the operation object directly
            if (data.status === 'in_progress' || data.id) {
                alert('Operation started successfully!');
                reloadCurrentTab(); // Refresh current tab data
                loadSummaryCards(); // Refresh summary
            } else {
                alert('Error starting operation: Operation status not updated');
            }
        })
        .catch(error => {
            console.error('Error starting operation:', error);
            alert('Error starting operation: ' + error.message);
        });
    }
}

function completeOperation(operationId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('This is sample data. In a real scenario, this would complete the operation.');
        return;
    }
    
    if (confirm('Mark this operation as completed?')) {
        fetch(`${Endpoint}/api/v1/operations/${operationId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                // Let backend auto-calculate duration and handle completion
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Check if the operation was successfully completed
            // Backend returns the operation object directly with status="completed"
            if (data.status === 'completed' || data.id) {
                alert('Operation completed successfully!');
                reloadCurrentTab(); // Refresh current tab data
                loadSummaryCards(); // Refresh summary
            } else {
                alert('Error completing operation: Operation status not updated');
            }
        })
        .catch(error => {
            console.error('Error completing operation:', error);
            alert('Error completing operation: ' + error.message);
        });
    }
}

// Sample data for fallback (updated for new status system)
function getSampleSummary() {
    return {
        by_status: {
            in_progress: 17,
            completed: 28,
            cancelled: 2,
            overdue: 3
        }
    };
}

function getSampleOperations() {
    return {
        operations: [
            {
                id: 1,
                title: "Test Client Follow-up",
                description: "Follow up with client about special dietary requirements for restaurant bookings",
                type: "client_followup",
                status: "in_progress",
                due_date: "2024-02-16T10:00:00Z",
                scheduled_time: "11:00",
                location: "Dubai",
                agent_id: 2,
                assignee_id: 10,
                trip_id: 123,
                estimated_hours: 0.5,
                is_auto_generated: true,
                agent: {
                    id: 2,
                    name: "Wheels Apart"
                },
                creator: {
                    id: 1,
                    name: "System Admin"
                },
                assignee: {
                    id: 10,
                    username: "sofia_florence"
                },
                trip: {
                    id: 123,
                    destination: "Dubai",
                    client_name: "Johnson Family"
                }
            },
            {
                id: 2,
                title: "Airport Transfer Coordination",
                description: "Arrange VIP transfer service for Emirates arrival - 6 passengers with luggage",
                type: "transfer_pickup",
                status: "in_progress",
                due_date: "2024-02-15T10:30:00Z",
                scheduled_time: "14:30",
                pickup_time: "14:00",
                location: "Florence",
                agent_id: 3,
                assignee_id: 11,
                trip_id: 456,
                estimated_hours: 1,
                is_auto_generated: true,
                assignee: {
                    id: 11,
                    username: "marco_rome"
                },
                trip: {
                    id: 456,
                    destination: "Florence",
                    client_name: "Chen Group"
                }
            },
            {
                id: 3,
                title: "Uffizi Gallery Skip-the-Line",
                description: "Secure priority access tickets for 8 guests - morning slot preferred",
                type: "excursion_confirmation",
                status: "in_progress",
                due_date: "2024-02-16T09:00:00Z",
                scheduled_time: "10:00",
                event_date: "2024-02-18T00:00:00Z",
                event_time: "10:00",
                location: "Florence",
                agent_id: 7,
                assignee_id: 10,
                trip_id: 789,
                estimated_hours: 1.5,
                assignee: {
                    id: 10,
                    username: "sofia_florence"
                },
                trip: {
                    id: 789,
                    destination: "Florence",
                    client_name: "Williams Wedding Group"
                }
            },
            {
                id: 4,
                title: "Private Guide Assignment",
                description: "Match expert art historian guide for Vatican Museums private tour",
                type: "guide_assignment",
                status: "completed",
                due_date: "2024-02-14T16:00:00Z",
                scheduled_time: "09:00",
                location: "Rome",
                agent_id: 5,
                assignee_id: 11,
                trip_id: 234,
                estimated_hours: 2,
                actual_hours: 1.5,
                completed_at: "2024-02-14T15:30:00Z",
                assignee: {
                    id: 11,
                    username: "marco_rome"
                },
                trip: {
                    id: 234,
                    destination: "Rome",
                    client_name: "Anderson Anniversary"
                }
            },
            {
                id: 5,
                title: "Restaurant Reservation",
                description: "Book dinner at Michelin starred restaurant for 10 guests - dietary restrictions noted",
                type: "dining_reservation",
                status: "in_progress",
                due_date: "2024-02-17T18:00:00Z",
                scheduled_time: "20:00",
                location: "Milan",
                agent_id: 9,
                assignee_id: 12,
                trip_id: 567,
                estimated_hours: 0.5,
                assignee: {
                    id: 12,
                    username: "lisa_milan"
                },
                trip: {
                    id: 567,
                    destination: "Milan",
                    client_name: "Roberts Business Trip"
                }
            },
            {
                id: 6,
                title: "Hotel Check-in Confirmation",
                description: "Confirm early check-in for VIP suite at Hotel Danieli Venice",
                type: "hotel_confirmation",
                status: "in_progress",
                due_date: "2024-02-16T17:00:00Z",
                scheduled_time: "09:00",
                checkin_time: "15:00",
                checkout_time: "11:00",
                location: "Venice",
                agent_id: 2,
                assignee_id: 10,
                estimated_hours: 1,
                is_auto_generated: true,
                assignee: {
                    id: 10,
                    username: "sofia_florence"
                },
                trip: {
                    id: 999,
                    destination: "Venice",
                    client_name: "Royal Anniversary"
                }
            },
            {
                id: 7,
                title: "Flight Assistance - Terminal 1",
                description: "Meet and assist VIP client with special assistance needs at airport arrival",
                type: "flight_assistance",
                status: "overdue",
                due_date: "2024-02-15T06:00:00Z",
                scheduled_time: "08:30",
                flight_time: "08:45",
                location: "Rome",
                agent_id: 3,
                assignee_id: 11,
                trip_id: 890,
                estimated_hours: 2,
                assignee: {
                    id: 11,
                    username: "marco_rome"
                },
                trip: {
                    id: 890,
                    destination: "Rome",
                    client_name: "Peterson VIP"
                }
            },
            {
                id: 8,
                title: "Tour Confirmation - Tuscany Wine",
                description: "Confirm 3-day Tuscany wine tour for 12 guests with premium vineyard visits",
                type: "tour_confirmation",
                status: "completed",
                due_date: "2024-02-13T12:00:00Z",
                scheduled_time: "10:00",
                location: "Florence",
                agent_id: 7,
                assignee_id: 10,
                trip_id: 345,
                estimated_hours: 1.5,
                actual_hours: 2,
                completed_at: "2024-02-13T14:00:00Z",
                assignee: {
                    id: 10,
                    username: "sofia_florence"
                },
                trip: {
                    id: 345,
                    destination: "Tuscany",
                    client_name: "Smith Wine Club"
                }
            }
        ],
        total: 8,
        page: 1,
        total_pages: 1
    };
}

// Render operations in a specific table
function renderOperationsInTable(operations, tableBodyId) {
    const tableBody = document.getElementById(tableBodyId);
    
    if (operations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center" style="padding: 40px;">
                    <i class="fa fa-tasks fa-2x" style="color: #ddd; margin-bottom: 10px;"></i>
                    <div>No operations found</div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort operations
    const sortedOperations = sortOperationsData(operations);
    
    tableBody.innerHTML = sortedOperations.map(operation => {
        const statusClass = `status-${operation.status}`;
        
        // Handle time formatting - use due_date if scheduled_time not available
        const dueDateObj = new Date(operation.due_date);
        const scheduledTime = operation.scheduled_time || dueDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const scheduledDate = dueDateObj.toLocaleDateString();
        
        // Handle assignee info - could be in assignee object or creator for fallback
        const assigneeInfo = operation.assignee || operation.creator || {};
        const assigneeName = assigneeInfo.name || assigneeInfo.username || 'Unassigned';
        
        // Handle client info - could be in trip object or agent for fallback
        const clientInfo = operation.trip || operation.agent || {};
        const clientName = clientInfo.client_name || clientInfo.name || 'N/A';
        const destination = clientInfo.destination || operation.location || '';
        
        // Handle trip ID
        const tripId = operation.trip_id || (operation.trip && operation.trip.id) || 'N/A';
        
        // Format operation type
        const operationType = formatOperationType(operation.type);
        
        // Auto-generation badge
        const autoGenBadge = operation.is_auto_generated ? 
            '<span class="auto-badge">🤖 Auto</span>' : '';
        
        return `
            <tr data-id="${operation.id}">
                <td>
                    <div class="operation-title">${operation.title}</div>
                    <div class="operation-description">${operation.description || ''}</div>
                    ${autoGenBadge}
                </td>
                <td>
                    <div class="location-info">
                        <i class="fa fa-map-marker" style="color: #dc3545; margin-right: 5px;"></i>
                        <span style="color: #28a745; font-weight: 500;">${operation.location}</span>
                    </div>
                </td>
                <td>
                    <div class="scheduled-time" style="font-weight: 600; font-size: 1.1em; color: #333;">${scheduledTime}</div>
                    <div class="scheduled-date" style="font-size: 0.85em; color: #666;">${scheduledDate}</div>
                    ${operation.pickup_time ? `<div style="font-size: 0.8em; color: #fd7e14;"><i class="fa fa-car"></i> Pickup: ${operation.pickup_time}</div>` : ''}
                    ${operation.flight_time ? `<div style="font-size: 0.8em; color: #6f42c1;"><i class="fa fa-plane"></i> Flight: ${operation.flight_time}</div>` : ''}
                    ${operation.checkin_time ? `<div style="font-size: 0.8em; color: #28a745;"><i class="fa fa-sign-in"></i> Check-in: ${operation.checkin_time}</div>` : ''}
                </td>
                <td>
                    <div class="client-info">
                        <div class="client-name">${clientName}</div>
                        ${clientInfo.client_email ? `<div class="client-email">${clientInfo.client_email}</div>` : ''}
                        ${clientInfo.client_phone || clientInfo.mobile ? `<div class="client-contact"><i class="fa fa-phone"></i>${clientInfo.client_phone || clientInfo.mobile}</div>` : ''}
                        ${destination ? `<div style="font-size: 0.8em; color: #666; margin-top: 3px;"><i class="fa fa-arrow-right" style="margin-right: 3px;"></i>${destination}</div>` : ''}
                    </div>
                </td>
                <td>
                    <span class="type-badge ${operation.type}">${operationType}</span>
                </td>
                <td>
                    <div class="assignee-info">
                        <i class="fa fa-user" style="color: #6f42c1; margin-right: 5px;"></i>
                        <span style="color: #6f42c1; font-weight: 500;">${assigneeName}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${operation.status.replace('_', ' ')}</span>
                </td>
                <td>
                    ${operation.trip_id ? `<a href="edit_booking.html?id=${operation.trip_id}" class="trip-badge" style="text-decoration: none;">#${operation.trip_id}</a>` : '-'}
                </td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewOperation(${operation.id})" title="View Details">
                            <i class="fa fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="editOperation(${operation.id})" title="Edit">
                            <i class="fa fa-edit"></i>
                        </button>
                        ${getStatusActionButton(operation)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render client operations with completion tracking
function renderClientOperations(operations) {
    const tableBody = document.getElementById('clientOperationsTableBody');
    
    if (operations.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 40px;">
                    <i class="fa fa-users fa-2x" style="color: #ddd; margin-bottom: 10px;"></i>
                    <div>No operations found for this client</div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort operations by status and date, then limit to top 10
    const sortedOperations = operations.sort((a, b) => {
        const statusOrder = { 'in_progress': 1, 'overdue': 2, 'completed': 3, 'cancelled': 4 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.due_date) - new Date(a.due_date);
    }).slice(0, 10); // Limit to top 10 operations
    
    tableBody.innerHTML = sortedOperations.map(operation => {
        const statusClass = `status-${operation.status}`;
        
        // Handle time formatting
        const dueDateObj = new Date(operation.due_date);
        const scheduledTime = operation.scheduled_time || dueDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const scheduledDate = dueDateObj.toLocaleDateString();
        
        // Handle client info from trip
        const clientInfo = operation.trip ? 
            `<div class="client-info">
                <div class="client-name">${operation.trip.client_name || 'Unknown Client'}</div>
                ${operation.trip.client_email ? `<div class="client-email">${operation.trip.client_email}</div>` : ''}
                ${operation.trip.client_mobile || operation.trip.mobile ? `<div class="client-contact"><i class="fa fa-phone"></i>${operation.trip.client_mobile || operation.trip.mobile}</div>` : ''}
            </div>` : 
            '<div class="client-info">No Client</div>';
        
        // Handle assignee info
        const assigneeInfo = operation.assignee || operation.creator || {};
        const assigneeName = assigneeInfo.name || assigneeInfo.username || 'Unassigned';
        
        // Handle trip ID
        const tripId = operation.trip_id || (operation.trip && operation.trip.id) || 'N/A';
        
        // Format operation type
        const operationType = formatOperationType(operation.type);
        
        // Completion info
        let completionInfo = '';
        if (operation.status === 'completed') {
            const completedDate = operation.completed_at ? new Date(operation.completed_at).toLocaleDateString() : 'N/A';
            const actualHours = operation.actual_hours || 'N/A';
            completionInfo = `
                <div style="font-size: 0.8em;">
                    <div style="color: #28a745;"><i class="fa fa-check-circle"></i> ${completedDate}</div>
                    <div style="color: #666;">Hours: ${actualHours}</div>
                </div>
            `;
        } else if (operation.status === 'in_progress') {
            const startedDate = operation.started_at ? new Date(operation.started_at).toLocaleDateString() : 'N/A';
            completionInfo = `
                <div style="font-size: 0.8em; color: #007bff;">
                    <i class="fa fa-play-circle"></i> Started: ${startedDate}
                </div>
            `;
        } else if (operation.status === 'overdue') {
            completionInfo = `
                <div style="font-size: 0.8em; color: #dc3545;">
                    <i class="fa fa-exclamation-triangle"></i> Overdue
                </div>
            `;
        } else {
            completionInfo = `
                <div style="font-size: 0.8em; color: #666;">
                    <i class="fa fa-clock-o"></i> Waiting
                </div>
            `;
        }
        
        return `
            <tr data-id="${operation.id}">
                <td>
                    <div class="operation-title">${operation.title}</div>
                    <div class="operation-description">${operation.description || ''}</div>
                    ${operation.is_auto_generated ? '<span class="auto-badge">🤖 Auto</span>' : ''}
                </td>
                <td>
                    <div class="location-info">
                        <i class="fa fa-map-marker" style="color: #dc3545; margin-right: 5px;"></i>
                        <span style="color: #28a745; font-weight: 500;">${operation.location || 'N/A'}</span>
                    </div>
                </td>
                <td>
                    <div class="scheduled-time" style="font-weight: 600; font-size: 1.1em; color: #333;">${scheduledTime}</div>
                    <div class="scheduled-date" style="font-size: 0.85em; color: #666;">${scheduledDate}</div>
                </td>
                <td>
                    ${clientInfo}
                </td>
                <td>
                    <span class="type-badge ${operation.type}">${operationType}</span>
                </td>
                <td>
                    <div class="assignee-info">
                        <i class="fa fa-user" style="color: #6f42c1; margin-right: 5px;"></i>
                        <span style="color: #6f42c1; font-weight: 500;">${assigneeName}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${operation.status.replace('_', ' ')}</span>
                </td>
                <td>
                    ${operation.trip_id ? `<a href="edit_booking.html?id=${operation.trip_id}" class="trip-badge" style="text-decoration: none;">#${operation.trip_id}</a>` : '-'}
                </td>
                <td>
                    ${completionInfo}
                </td>
                <td class="text-center">
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewOperation(${operation.id})" title="View Details">
                            <i class="fa fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="editOperation(${operation.id})" title="Edit">
                            <i class="fa fa-edit"></i>
                        </button>
                        ${getStatusActionButton(operation)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Show message if results were limited
    if (operations.length > 10) {
        updateSearchStatus(`Showing top 10 of ${operations.length} operations`);
    }
}

// Create table row for operation (updated to remove priority, add timing fields and auto-generation metadata)
function createOperationRow(operation) {
    const dueDate = formatDueDate(operation.due_date);
    const statusClass = `status-${operation.status || 'in_progress'}`;
    
    // Format timing information with new fields
    const timingInfo = formatTimingInfo(operation);
    
    // Handle auto-generation badge
    const autoGenBadge = operation.is_auto_generated ? 
        '<span class="auto-badge" style="background: #17a2b8; color: white; padding: 2px 6px; border-radius: 8px; font-size: 0.7rem;">🤖 Auto</span>' : '';
    
    // Get agent/assignee names safely
    const agentName = operation.agent?.name || operation.agent_name || 'Unknown Agent';
    const assigneeName = operation.assignee?.name || operation.assignee_name || 'Unassigned';
    
    // Get client info from trip
    const clientInfo = operation.trip ? 
        `<div class="client-info">
            <div class="client-name">${operation.trip.client_name || 'Unknown Client'}</div>
            ${operation.trip.client_email ? `<div class="client-email">${operation.trip.client_email}</div>` : ''}
            ${operation.trip.client_mobile || operation.trip.mobile ? `<div class="client-contact"><i class="fa fa-phone"></i>${operation.trip.client_mobile || operation.trip.mobile}</div>` : ''}
        </div>` : 
        '<div class="client-info">No Client</div>';
    
    // Operation type display
    const typeDisplay = formatOperationType(operation.type);
    
    return `
        <tr class="operation-row" data-id="${operation.id}">
            <td>
                <div class="operation-info">
                    <div class="operation-title">${operation.title || 'Untitled Operation'}</div>
                    ${operation.description ? `<div class="operation-description">${operation.description}</div>` : ''}
                    ${autoGenBadge}
                </div>
            </td>
            <td>
                <div class="location-info">
                    <i class="fa fa-map-marker"></i> ${operation.location || 'No Location'}
                </div>
            </td>
            <td>
                <div class="timing-display">
                    ${timingInfo}
                    <div class="due-date ${dueDate.class}">${dueDate.text}</div>
                </div>
            </td>
            <td>${clientInfo}</td>
            <td>
                <span class="type-badge">${typeDisplay}</span>
            </td>
            <td>
                <div class="assignee-info">
                    <i class="fa fa-user"></i> ${assigneeName}
                </div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${formatStatus(operation.status)}</span>
            </td>
            <td>
                ${operation.trip_id ? `<a href="edit_booking.html?id=${operation.trip_id}" class="trip-badge" style="text-decoration: none;">#${operation.trip_id}</a>` : '-'}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="editOperation(${operation.id})" title="Edit">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="markCompleted(${operation.id})" title="Mark Complete">
                        <i class="fa fa-check"></i>
                    </button>
                </div>
            </td>
        </tr>
    `;
}

// Format timing information with new fields
function formatTimingInfo(operation) {
    const timingParts = [];
    
    // Scheduled time (most important)
    if (operation.scheduled_time) {
        timingParts.push(`<div class="scheduled-time"><i class="fa fa-clock-o"></i> ${operation.scheduled_time}</div>`);
    }
    
    // Pickup time for transfers
    if (operation.pickup_time) {
        timingParts.push(`<div class="pickup-time"><i class="fa fa-car"></i> Pickup: ${operation.pickup_time}</div>`);
    }
    
    // Flight time for flight operations
    if (operation.flight_time) {
        timingParts.push(`<div class="flight-time"><i class="fa fa-plane"></i> Flight: ${operation.flight_time}</div>`);
    }
    
    // Check-in/out times for hotels
    if (operation.checkin_time) {
        timingParts.push(`<div class="checkin-time"><i class="fa fa-sign-in"></i> Check-in: ${operation.checkin_time}</div>`);
    }
    
    if (operation.checkout_time) {
        timingParts.push(`<div class="checkout-time"><i class="fa fa-sign-out"></i> Check-out: ${operation.checkout_time}</div>`);
    }
    
    // Event time for excursions
    if (operation.event_time) {
        timingParts.push(`<div class="event-time"><i class="fa fa-calendar"></i> Event: ${operation.event_time}</div>`);
    }
    
    // Duration if available
    if (operation.duration_minutes) {
        const hours = Math.floor(operation.duration_minutes / 60);
        const minutes = operation.duration_minutes % 60;
        const durationText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        timingParts.push(`<div class="duration"><i class="fa fa-hourglass-half"></i> ${durationText}</div>`);
    }
    
    return timingParts.length > 0 ? timingParts.join('') : '<div class="no-timing">No specific timing</div>';
}

// Format status for display (updated status list)
function formatStatus(status) {
    const statusMap = {
        'in_progress': 'In Progress',
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'overdue': 'Overdue'
    };
    return statusMap[status] || 'Unknown';
}

// Update search status indicator
function updateSearchStatus(message) {
    const statusEl = document.getElementById('searchStatus');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// Clear search results
function clearClientSearchResults() {
    document.getElementById('clientOperationsTableBody').innerHTML = `
        <tr>
            <td colspan="10" class="text-center" style="padding: 40px;">
                <i class="fa fa-search fa-2x" style="color: #ddd; margin-bottom: 10px;"></i>
                <div style="font-size: 1.1em; margin-bottom: 10px;">Enter a client name to search operations</div>
                <div class="text-muted" style="font-size: 0.9em;">
                    <strong>Default:</strong> Shows active operations only (In Progress + Overdue)<br>
                    <strong>Filter:</strong> Use dropdown to show specific status or all operations
                </div>
            </td>
        </tr>
    `;
}

// Legacy function - now calls the new debounced search
function searchClients() {
    // This function is kept for backward compatibility
    // but now uses the improved debounced search
    debouncedClientSearch();
}

// Load clients list for client operations tab (kept for compatibility)
function loadClientsList() {
    // This function is kept for potential future use
    // Current implementation uses search-based approach
    clearClientSearchResults();
}

// Load operations for selected client (kept for compatibility)
function loadClientOperations() {
    // This function is kept for potential future use
    // Current implementation uses search-based approach
    const searchTerm = document.getElementById('clientSearch').value.trim();
    if (searchTerm.length >= 2) {
        performClientSearch();
    }
} 