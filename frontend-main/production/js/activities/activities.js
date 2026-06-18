// Activities tracking JavaScript
let currentActivitiesPage = 1;
let currentActivitiesLimit = 100;
let currentActivityFilters = {};

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeActivitiesPage();
});

function initializeActivitiesPage() {
    // Load initial data
    loadActivityStats();
    loadOverviewData();
    
    // Set up tab event listeners
    setupTabEventListeners();
    
    // Set default date filters (last 7 days)
    setDefaultDateFilters();
}

// Set up tab event listeners
function setupTabEventListeners() {
    $('#activityTabs a').on('click', function (e) {
        e.preventDefault();
        const tabId = $(this).attr('href').substring(1);
        
        // Load data based on tab - always load fresh data
        switch(tabId) {
            case 'overview':
                loadOverviewData();
                break;
            case 'activities':
                // Only auto-load if table is empty for activities tab to avoid unnecessary requests
                if ($('#activitiesTableBody').is(':empty')) {
                    loadActivities();
                }
                break;
            case 'users':
                // Always load fresh user stats when tab is clicked
                loadUserStats();
                break;
            case 'entities':
                // Always load fresh popular entities when tab is clicked
                loadPopularEntities();
                break;
        }
        
        $(this).tab('show');
    });
}

// Set default date filters
function setDefaultDateFilters() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    document.getElementById('toDateFilter').value = today.toISOString().split('T')[0];
    document.getElementById('fromDateFilter').value = weekAgo.toISOString().split('T')[0];
}

// Load activity statistics for summary cards
function loadActivityStats() {
    const token = localStorage.getItem('token');
    
    showStatsLoading();
    
    fetch(`${Endpoint}/api/v1/admin/activity-stats?days=7`, {
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
    .then(data => {
        renderStatsCards(data);
    })
    .catch(error => {
        console.error('Error loading activity stats:', error);
        showStatsError();
    });
}

// Load overview data (activity stats for overview tab)
function loadOverviewData() {
    const token = localStorage.getItem('token');
    
    fetch(`${Endpoint}/api/v1/admin/activity-stats?days=7`, {
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
    .then(data => {
        renderOverviewTable(data);
        renderCharts(data);
    })
    .catch(error => {
        console.error('Error loading overview data:', error);
        showOverviewError();
    });
}

// Load activities with filtering
function loadActivities(page = 1) {
    const token = localStorage.getItem('token');
    
    // Build query parameters
    const params = new URLSearchParams();
    
    // Add filters
    const userSearch = document.getElementById('userIdFilter').value.trim();
    const entityType = document.getElementById('entityTypeFilter').value;
    const actionType = document.getElementById('actionTypeFilter').value;
    const fromDate = document.getElementById('fromDateFilter').value;
    const toDate = document.getElementById('toDateFilter').value;
    
    // Handle user search - check if it's a number (user_id) or text (username)
    if (userSearch) {
        // If it's a number, treat as user_id
        if (!isNaN(userSearch) && Number.isInteger(Number(userSearch))) {
            params.append('user_id', userSearch);
        } else {
            // If it's text, we'll need to handle this differently
            // For now, let's try user_id anyway and see what the API supports
            // In the future, we might need a separate username parameter
            console.log('Searching for username:', userSearch);
            // We might need to add support for username filtering in the backend
            // For now, let's still use user_id and let the backend team know about this requirement
            params.append('user_id', userSearch);
        }
    }
    
    if (entityType) params.append('entity_type', entityType);
    if (actionType) params.append('action_type', actionType);
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    
    // Add pagination
    params.append('limit', currentActivitiesLimit.toString());
    params.append('offset', ((page - 1) * currentActivitiesLimit).toString());
    
    currentActivitiesPage = page;
    
    showActivitiesLoading();
    
    console.log('Loading activities with params:', params.toString());
    
    fetch(`${Endpoint}/api/v1/admin/activities?${params.toString()}`, {
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
    .then(data => {
        console.log('Activities API response:', data);
        renderActivitiesTable(data);
        renderActivitiesPagination(data);
    })
    .catch(error => {
        console.error('Error loading activities:', error);
        showActivitiesError();
    });
}

// Load user statistics
function loadUserStats() {
    const token = localStorage.getItem('token');
    const days = document.getElementById('userStatsDays').value || 7;
    
    showUserStatsLoading();
    
    fetch(`${Endpoint}/api/v1/admin/user-stats?days=${days}&limit=50`, {
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
    .then(data => {
        renderUserStatsTable(data);
    })
    .catch(error => {
        console.error('Error loading user stats:', error);
        showUserStatsError();
    });
}

// Load popular entities
function loadPopularEntities() {
    const token = localStorage.getItem('token');
    const entityType = document.getElementById('popularEntityType').value;
    const days = document.getElementById('popularEntityDays').value || 7;
    
    const params = new URLSearchParams();
    params.append('days', days);
    params.append('limit', '50');
    if (entityType) params.append('entity_type', entityType);
    
    showPopularEntitiesLoading();
    
    fetch(`${Endpoint}/api/v1/admin/popular-entities?${params.toString()}`, {
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
    .then(data => {
        renderPopularEntitiesTable(data);
    })
    .catch(error => {
        console.error('Error loading popular entities:', error);
        showPopularEntitiesError();
    });
}

// Render statistics cards
function renderStatsCards(data) {
    const statsContainer = document.getElementById('statsCards');
    
    if (!data || data.length === 0) {
        statsContainer.innerHTML = `
            <div class="stats-card">
                <h3>No Data</h3>
                <div class="stats-number">0</div>
                <div class="stats-subtitle">No activity data available</div>
            </div>
        `;
        return;
    }
    
    // Calculate totals
    const totalActions = data.reduce((sum, item) => sum + item.count, 0);
    const totalUsers = new Set(data.map(item => item.unique_users)).size;
    const topEntity = data.sort((a, b) => b.count - a.count)[0];
    const recentActivity = data.sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity))[0];
    
    statsContainer.innerHTML = `
        <div class="stats-card">
            <h3>Total Actions</h3>
            <div class="stats-number">${totalActions.toLocaleString()}</div>
            <div class="stats-subtitle">Last 7 days</div>
        </div>
        <div class="stats-card" style="border-left-color: #28a745;">
            <h3>Active Users</h3>
            <div class="stats-number" style="color: #28a745;">${data.reduce((sum, item) => sum + item.unique_users, 0)}</div>
            <div class="stats-subtitle">Users with activity</div>
        </div>
        <div class="stats-card" style="border-left-color: #ffc107;">
            <h3>Top Entity</h3>
            <div class="stats-number" style="color: #ffc107; font-size: 1.5rem;">${topEntity.entity_type.toUpperCase()}</div>
            <div class="stats-subtitle">${topEntity.count} ${topEntity.action_type} actions</div>
        </div>
        <div class="stats-card" style="border-left-color: #17a2b8;">
            <h3>Latest Activity</h3>
            <div class="stats-number" style="color: #17a2b8; font-size: 1.2rem;">${recentActivity.entity_type}</div>
            <div class="stats-subtitle">${formatTimeAgo(recentActivity.last_activity)}</div>
        </div>
    `;
}

// Render overview table
function renderOverviewTable(data) {
    const tableBody = document.getElementById('overviewTableBody');
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state">
                        <i class="fa fa-chart-line"></i>
                        <div>No activity data available</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort by count descending
    const sortedData = data.sort((a, b) => b.count - a.count);
    
    tableBody.innerHTML = sortedData.map(item => `
        <tr>
            <td>
                <span class="entity-badge entity-${item.entity_type}">${item.entity_type}</span>
            </td>
            <td>
                <span class="action-badge action-${item.action_type}">${item.action_type}</span>
            </td>
            <td><strong>${item.count.toLocaleString()}</strong></td>
            <td>${item.unique_users}</td>
            <td>${formatDateTime(item.last_activity)}</td>
        </tr>
    `).join('');
}

// Render activities table
function renderActivitiesTable(data) {
    const tableBody = document.getElementById('activitiesTableBody');
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <i class="fa fa-list"></i>
                        <div>No activities found</div>
                        <p>Try adjusting your filters or date range</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Debug: Log the first activity to see what fields are available
    if (data.length > 0) {
        console.log('Sample activity data:', data[0]);
        console.log('Available fields:', Object.keys(data[0]));
    }
    
    tableBody.innerHTML = data.map(activity => {
        // Better handling of user and agent names
        const userName = activity.user_name || activity.username || `User ID: ${activity.user_id}` || 'N/A';
        const agentName = activity.agent_name || activity.agent?.name || `Agent ID: ${activity.agent_id}` || 'N/A';
        
        // Better handling of entity names - try entity_name first, then fallback to entity_id
        const entityName = activity.entity_name || activity.entity?.name || `${activity.entity_type} ID: ${activity.entity_id}` || 'N/A';
        
        return `
            <tr>
                <td>${activity.id}</td>
                <td>${userName}</td>
                <td>${agentName}</td>
                <td>
                    <span class="entity-badge entity-${activity.entity_type}">${activity.entity_type}</span>
                </td>
                <td>${entityName}</td>
                <td>
                    <span class="action-badge action-${activity.action_type}">${activity.action_type}</span>
                </td>
                <td>${formatDateTime(activity.accessed_at)}</td>
            </tr>
        `;
    }).join('');
}

// Render user stats table
function renderUserStatsTable(data) {
    const tableBody = document.getElementById('userStatsTableBody');
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <i class="fa fa-users"></i>
                        <div>No user statistics available</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Debug: Log the first user stat to see what fields are available
    if (data.length > 0) {
        console.log('Sample user stats data:', data[0]);
        console.log('Available user stats fields:', Object.keys(data[0]));
    }
    
    tableBody.innerHTML = data.map(user => {
        // Better handling of user and agent names
        const userName = user.user_name || user.username || `User ID: ${user.user_id}` || 'N/A';
        const agentName = user.agent_name || user.agent?.name || `Agent ID: ${user.agent_id}` || 'N/A';
        
        return `
            <tr>
                <td><strong>${userName}</strong></td>
                <td>${agentName}</td>
                <td><strong>${user.total_actions.toLocaleString()}</strong></td>
                <td>${user.unique_entities}</td>
                <td>
                    <span class="entity-badge entity-${user.top_entity_type}">${user.top_entity_type}</span>
                </td>
                <td>
                    <span class="action-badge action-${user.top_action_type}">${user.top_action_type}</span>
                </td>
                <td>${formatDateTime(user.last_activity)}</td>
            </tr>
        `;
    }).join('');
}

// Render popular entities table
function renderPopularEntitiesTable(data) {
    const tableBody = document.getElementById('popularEntitiesTableBody');
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="empty-state">
                        <i class="fa fa-star"></i>
                        <div>No popular entities found</div>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Debug: Log the first entity to see what fields are available
    if (data.length > 0) {
        console.log('Sample popular entity data:', data[0]);
        console.log('Available popular entity fields:', Object.keys(data[0]));
    }
    
    tableBody.innerHTML = data.map((entity, index) => {
        // Better handling of entity names - try entity_name first, then fallback to entity_id
        const entityName = entity.entity_name || entity.name || `${entity.entity_type} ID: ${entity.entity_id}` || 'N/A';
        
        return `
            <tr>
                <td>
                    <span class="entity-badge entity-${entity.entity_type}">${entity.entity_type}</span>
                    ${index < 3 ? `<span style="margin-left: 10px;"> ${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>` : ''}
                </td>
                <td><strong>${entityName}</strong></td>
                <td><strong>${entity.access_count.toLocaleString()}</strong></td>
                <td>${entity.unique_users}</td>
                <td>${formatDateTime(entity.last_accessed)}</td>
            </tr>
        `;
    }).join('');
}

// Render simple charts (using text-based representation)
function renderCharts(data) {
    renderEntityChart(data);
    renderActionChart(data);
}

function renderEntityChart(data) {
    const container = document.getElementById('entityChart');
    
    // Group by entity type
    const entityStats = {};
    data.forEach(item => {
        if (!entityStats[item.entity_type]) {
            entityStats[item.entity_type] = 0;
        }
        entityStats[item.entity_type] += item.count;
    });
    
    const sortedEntities = Object.entries(entityStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    if (sortedEntities.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-chart-bar"></i><div>No data available</div></div>';
        return;
    }
    
    const maxCount = Math.max(...sortedEntities.map(([, count]) => count));
    
    container.innerHTML = `
        <div style="padding: 20px;">
            ${sortedEntities.map(([entity, count]) => {
                const percentage = (count / maxCount) * 100;
                return `
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span class="entity-badge entity-${entity}">${entity}</span>
                            <strong>${count.toLocaleString()}</strong>
                        </div>
                        <div style="background: #f0f0f0; height: 8px; border-radius: 4px;">
                            <div style="background: #007bff; height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderActionChart(data) {
    const container = document.getElementById('actionChart');
    
    // Group by action type
    const actionStats = {};
    data.forEach(item => {
        if (!actionStats[item.action_type]) {
            actionStats[item.action_type] = 0;
        }
        actionStats[item.action_type] += item.count;
    });
    
    const sortedActions = Object.entries(actionStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8);
    
    if (sortedActions.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fa fa-chart-pie"></i><div>No data available</div></div>';
        return;
    }
    
    const maxCount = Math.max(...sortedActions.map(([, count]) => count));
    
    container.innerHTML = `
        <div style="padding: 20px;">
            ${sortedActions.map(([action, count]) => {
                const percentage = (count / maxCount) * 100;
                return `
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span class="action-badge action-${action}">${action}</span>
                            <strong>${count.toLocaleString()}</strong>
                        </div>
                        <div style="background: #f0f0f0; height: 8px; border-radius: 4px;">
                            <div style="background: #28a745; height: 100%; width: ${percentage}%; border-radius: 4px; transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Render activities pagination
function renderActivitiesPagination(data) {
    const container = document.getElementById('activitiesPagination');
    
    // For now, simple pagination based on returned data length
    if (!data || data.length < currentActivitiesLimit) {
        container.innerHTML = '';
        return;
    }
    
    const hasNext = data.length === currentActivitiesLimit;
    const hasPrev = currentActivitiesPage > 1;
    
    let pagination = '<nav><ul class="pagination">';
    
    if (hasPrev) {
        pagination += `<li class="page-item">
            <a class="page-link" href="#" onclick="loadActivities(${currentActivitiesPage - 1}); return false;">
                <i class="fa fa-chevron-left"></i> Previous
            </a>
        </li>`;
    }
    
    pagination += `<li class="page-item active">
        <span class="page-link">Page ${currentActivitiesPage}</span>
    </li>`;
    
    if (hasNext) {
        pagination += `<li class="page-item">
            <a class="page-link" href="#" onclick="loadActivities(${currentActivitiesPage + 1}); return false;">
                Next <i class="fa fa-chevron-right"></i>
            </a>
        </li>`;
    }
    
    pagination += '</ul></nav>';
    container.innerHTML = pagination;
}

// Clear activity filters
function clearActivityFilters() {
    document.getElementById('userIdFilter').value = '';
    document.getElementById('entityTypeFilter').value = '';
    document.getElementById('actionTypeFilter').value = '';
    document.getElementById('fromDateFilter').value = '';
    document.getElementById('toDateFilter').value = '';
    
    // Reset to default date filters (last 7 days)
    setDefaultDateFilters();
    
    currentActivitiesPage = 1;
    loadActivities();
}

// Utility functions for date formatting
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = (now - date) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
        const diffMinutes = Math.floor((now - date) / (1000 * 60));
        return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        return `${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 168) { // 7 days
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
}

function formatTimeAgo(dateString) {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

// Loading states
function showStatsLoading() {
    document.getElementById('statsCards').innerHTML = `
        <div class="stats-card">
            <div class="loading-spinner">
                <i class="fa fa-spinner fa-spin fa-2x"></i>
            </div>
        </div>
    `;
}

function showActivitiesLoading() {
    document.getElementById('activitiesTableBody').innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="loading-spinner">
                    <i class="fa fa-spinner fa-spin fa-2x"></i>
                    <div>Loading activities...</div>
                </div>
            </td>
        </tr>
    `;
}

function showUserStatsLoading() {
    document.getElementById('userStatsTableBody').innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="loading-spinner">
                    <i class="fa fa-spinner fa-spin fa-2x"></i>
                    <div>Loading user statistics...</div>
                </div>
            </td>
        </tr>
    `;
}

function showPopularEntitiesLoading() {
    document.getElementById('popularEntitiesTableBody').innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="loading-spinner">
                    <i class="fa fa-spinner fa-spin fa-2x"></i>
                    <div>Loading popular entities...</div>
                </div>
            </td>
        </tr>
    `;
}

// Error states
function showStatsError() {
    document.getElementById('statsCards').innerHTML = `
        <div class="stats-card" style="border-left-color: #dc3545;">
            <h3>Error</h3>
            <div class="stats-number" style="color: #dc3545;">!</div>
            <div class="stats-subtitle">Failed to load statistics</div>
        </div>
    `;
}

function showOverviewError() {
    document.getElementById('overviewTableBody').innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="empty-state" style="color: #dc3545;">
                    <i class="fa fa-exclamation-triangle"></i>
                    <div>Failed to load overview data</div>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadOverviewData()" style="margin-top: 10px;">
                        <i class="fa fa-refresh"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function showActivitiesError() {
    document.getElementById('activitiesTableBody').innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="empty-state" style="color: #dc3545;">
                    <i class="fa fa-exclamation-triangle"></i>
                    <div>Failed to load activities</div>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadActivities()" style="margin-top: 10px;">
                        <i class="fa fa-refresh"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function showUserStatsError() {
    document.getElementById('userStatsTableBody').innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="empty-state" style="color: #dc3545;">
                    <i class="fa fa-exclamation-triangle"></i>
                    <div>Failed to load user statistics</div>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadUserStats()" style="margin-top: 10px;">
                        <i class="fa fa-refresh"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function showPopularEntitiesError() {
    document.getElementById('popularEntitiesTableBody').innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="empty-state" style="color: #dc3545;">
                    <i class="fa fa-exclamation-triangle"></i>
                    <div>Failed to load popular entities</div>
                    <button class="btn btn-outline-primary btn-sm" onclick="loadPopularEntities()" style="margin-top: 10px;">
                        <i class="fa fa-refresh"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
} 