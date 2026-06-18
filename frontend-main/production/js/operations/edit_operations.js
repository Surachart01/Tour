// Edit Operations JavaScript
let currentOperationId = null;
let isEditMode = false;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    // Load user profile
    loadUserProfile();
    
    // Load dropdown data
    loadAssignees();
    loadAgents();
    loadLocations();

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const operationId = urlParams.get('id');
    const mode = urlParams.get('mode');
    
    if (operationId && operationId !== 'null') {
        currentOperationId = parseInt(operationId);
        isEditMode = true;
        loadOperation(currentOperationId);
        document.getElementById('pageTitle').textContent = 'Edit Operation';
        document.getElementById('deleteOperationBtn').style.display = 'inline-block';
    } else {
        isEditMode = false;
        document.getElementById('pageTitle').textContent = 'Create New Operation';
        setDefaultValues();
    }
    
    // Set up event listeners
    setupEventListeners();
}

// Load user profile information
function loadUserProfile() {
    const token = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    
    // First try to use the username from localStorage if available
    if (storedUsername) {
        updateProfileDisplay(storedUsername);
    } else {
        updateProfileDisplay('Guest'); // Set default fallback
    }
    
    if (!token) {
        return;
    }
    
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
        // Keep the already set username from localStorage or fallback
    });
}

function updateProfileDisplay(name) {
    const profileNameEl = document.getElementById('profileName');
    const navProfileNameEl = document.getElementById('navProfileName');
    
    if (profileNameEl) profileNameEl.textContent = name;
    if (navProfileNameEl) navProfileNameEl.textContent = name;
}

// Load assignees for dropdown
function loadAssignees() {
    const token = localStorage.getItem('token');
    const assigneeSelect = document.getElementById('assigneeSelect');
    
    if (!token) {
        // Add sample assignees
        assigneeSelect.innerHTML += `
            <option value="1">vtadmin</option>
            <option value="2">manager</option>
            <option value="3">staff</option>
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
        const users = Array.isArray(data) ? data : (data.users || []);
        users.forEach(user => {
            assigneeSelect.innerHTML += `<option value="${user.id}">${user.username || user.name}</option>`;
        });
    })
    .catch(error => {
        console.error('Error loading assignees:', error);
        // Keep sample data as fallback
    });
}

// Load agents for dropdown
function loadAgents() {
    const token = localStorage.getItem('token');
    const agentSelect = document.getElementById('agentSelect');
    
    if (!token) {
        // Add sample agents
        agentSelect.innerHTML += `
            <option value="1">Sample Agent 1</option>
            <option value="2">Wheels Apart</option>
            <option value="3">Sample Agent 3</option>
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
            agentSelect.innerHTML += `<option value="${agent.id}">${agent.name}</option>`;
        });
    })
    .catch(error => {
        console.error('Error loading agents:', error);
        // Keep sample data as fallback
    });
}

// Load locations/cities for dropdown
function loadLocations() {
    const token = localStorage.getItem('token');
    const locationSelect = document.getElementById('operationLocation');

    // Clear existing options except the first default option
    const defaultOption = locationSelect.querySelector('option[value=""]');
    locationSelect.innerHTML = '';
    if (defaultOption) {
        locationSelect.appendChild(defaultOption);
    } else {
        locationSelect.innerHTML = '<option value="">Select location...</option>';
    }

    if (!token) {
        // Add sample locations as fallback
        locationSelect.innerHTML += `
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
            locationSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading locations:', error);
        // Keep sample data as fallback
        locationSelect.innerHTML += `
            <option value="Bangkok">Bangkok</option>
            <option value="Dubai">Dubai</option>
            <option value="Rome">Rome</option>
            <option value="Florence">Florence</option>
            <option value="Venice">Venice</option>
            <option value="Milan">Milan</option>
        `;
    });
}

// Load operation data for editing
function loadOperation(operationId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('No authentication token found. Please log in.');
        window.location.href = 'operations.html';
        return;
    }
    
    fetch(`${Endpoint}/api/v1/operations/${operationId}`, {
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
        console.log('Loaded operation data:', data); // Debug log
        populateForm(data);
        showMetadata(data);
    })
    .catch(error => {
        console.error('Error loading operation:', error);
        alert('Error loading operation. Please try again.');
        window.location.href = 'operations.html';
    });
}

// Populate form with operation data
function populateForm(operation) {
    // Basic fields
    document.getElementById('operationTitle').value = operation.title || '';
    document.getElementById('operationType').value = operation.type || '';
    document.getElementById('operationLocation').value = operation.location || '';
    document.getElementById('operationDescription').value = operation.description || '';
    document.getElementById('operationPriority').value = operation.priority || 'medium';
    document.getElementById('operationStatus').value = operation.status || 'pending';
    document.getElementById('estimatedHours').value = operation.estimated_hours || '';
    
    // Handle assignee - could be assignee_id or creator_id as fallback
    const assigneeId = operation.assignee_id || operation.creator_id || '';
    document.getElementById('assigneeSelect').value = assigneeId;
    
    // Handle trip ID
    document.getElementById('tripIdInput').value = operation.trip_id || '';
    
    // Handle agent - add to dropdown if not exists, then set value
    const agentSelect = document.getElementById('agentSelect');
    const agentId = operation.agent_id;
    const agentData = operation.agent;
    
    if (agentId && agentData) {
        // Check if agent option already exists
        const agentExists = Array.from(agentSelect.options).some(option => option.value == agentId);
        if (!agentExists) {
            // Add the agent option to dropdown
            const newOption = document.createElement('option');
            newOption.value = agentId;
            newOption.textContent = agentData.name || `Agent ${agentId}`;
            agentSelect.appendChild(newOption);
        }
        // Set the selected value
        agentSelect.value = agentId;
    }
    
    // Handle assignee - add to dropdown if not exists (in case of creator fallback)
    const assigneeSelect = document.getElementById('assigneeSelect');
    if (assigneeId) {
        const assigneeExists = Array.from(assigneeSelect.options).some(option => option.value == assigneeId);
        if (!assigneeExists) {
            // Try to get assignee name from the operation data
            let assigneeName = 'Unknown User';
            if (operation.assignee && operation.assignee.username) {
                assigneeName = operation.assignee.username;
            } else if (operation.creator && operation.creator.username) {
                assigneeName = operation.creator.username;
            } else if (operation.assignee && operation.assignee.name) {
                assigneeName = operation.assignee.name;
            } else if (operation.creator && operation.creator.name) {
                assigneeName = operation.creator.name;
            }
            
            const newOption = document.createElement('option');
            newOption.value = assigneeId;
            newOption.textContent = assigneeName;
            assigneeSelect.appendChild(newOption);
        }
        assigneeSelect.value = assigneeId;
    }
    
    // Format due date for datetime-local input
    if (operation.due_date) {
        const date = new Date(operation.due_date);
        // Convert to local time for the datetime-local input
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        const formattedDate = localDate.toISOString().slice(0, 16);
        document.getElementById('operationDueDate').value = formattedDate;
    }
    
    // Handle completion data
    if (operation.status === 'completed') {
        document.getElementById('completionSection').style.display = 'block';
        document.getElementById('actualHours').value = operation.actual_hours || '';
        document.getElementById('completionNotes').value = operation.notes || '';
    } else {
        document.getElementById('completionSection').style.display = 'none';
    }
    
    // Update location dropdown if it's not in the predefined list
    const locationSelect = document.getElementById('operationLocation');
    const locationExists = Array.from(locationSelect.options).some(option => option.value === operation.location);
    if (!locationExists && operation.location) {
        const newOption = document.createElement('option');
        newOption.value = operation.location;
        newOption.textContent = operation.location;
        newOption.selected = true;
        locationSelect.appendChild(newOption);
    }
    
    // Handle operation type - add if not in predefined list
    const typeSelect = document.getElementById('operationType');
    const typeExists = Array.from(typeSelect.options).some(option => option.value === operation.type);
    if (!typeExists && operation.type) {
        const newOption = document.createElement('option');
        newOption.value = operation.type;
        newOption.textContent = formatOperationType(operation.type);
        newOption.selected = true;
        typeSelect.appendChild(newOption);
    }
}

// Format operation type for display
function formatOperationType(type) {
    const typeMap = {
        'hotel_confirmation': 'Hotel Confirmation',
        'transfer_confirmation': 'Transfer Confirmation',
        'transfer_pickup': 'Transfer Pickup',
        'transfer_dropoff': 'Transfer Dropoff',
        'excursion_booking': 'Excursion Booking',
        'excursion_confirmation': 'Excursion Confirmation',
        'guide_assignment': 'Guide Assignment',
        'dining_reservation': 'Dining Reservation',
        'flight_assistance': 'Flight Assistance',
        'airport_pickup': 'Airport Pickup',
        'airport_dropoff': 'Airport Dropoff',
        'admin_task': 'Admin Task',
        'client_followup': 'Client Follow-up',
        'client_follow_up': 'Client Follow-up',
        'custom': 'Custom',
        'other': 'Other'
    };
    
    return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Show metadata section
function showMetadata(operation) {
    document.getElementById('metadataSection').style.display = 'block';
    document.getElementById('operationId').textContent = operation.id || '-';
    document.getElementById('createdDate').textContent = operation.created_at ? 
        new Date(operation.created_at).toLocaleString() : '-';
    document.getElementById('updatedDate').textContent = operation.updated_at ? 
        new Date(operation.updated_at).toLocaleString() : '-';
    
    // Create status badge
    const statusSpan = document.createElement('span');
    statusSpan.className = `status-badge status-${operation.status}`;
    statusSpan.textContent = operation.status ? operation.status.replace('_', ' ').toUpperCase() : '-';
    
    const currentStatusEl = document.getElementById('currentStatus');
    currentStatusEl.innerHTML = '';
    currentStatusEl.appendChild(statusSpan);
}

// Set default values for new operation
function setDefaultValues() {
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9 AM
    const formattedDate = tomorrow.toISOString().slice(0, 16);
    document.getElementById('operationDueDate').value = formattedDate;
}

// Set up event listeners
function setupEventListeners() {
    // Status change listener
    document.getElementById('operationStatus').addEventListener('change', function() {
        const status = this.value;
        const completionSection = document.getElementById('completionSection');
        
        if (status === 'completed') {
            completionSection.style.display = 'block';
        } else {
            completionSection.style.display = 'none';
        }
    });
    
    // Save button listener
    document.getElementById('saveOperationBtn').addEventListener('click', saveOperation);
    
    // Delete button listener
    document.getElementById('deleteOperationBtn').addEventListener('click', deleteOperation);
}

// Save operation
function saveOperation() {
    if (!validateForm()) {
        return;
    }
    
    const operationData = {
        title: document.getElementById('operationTitle').value.trim(),
        description: document.getElementById('operationDescription').value.trim(),
        type: document.getElementById('operationType').value,
        priority: document.getElementById('operationPriority').value,
        status: document.getElementById('operationStatus').value,
        due_date: document.getElementById('operationDueDate').value,
        location: document.getElementById('operationLocation').value,
        estimated_hours: parseFloat(document.getElementById('estimatedHours').value) || null,
        assignee_id: parseInt(document.getElementById('assigneeSelect').value) || null,
        trip_id: parseInt(document.getElementById('tripIdInput').value) || null,
        agent_id: parseInt(document.getElementById('agentSelect').value) || null
    };
    
    // Add completion data if status is completed
    if (operationData.status === 'completed') {
        operationData.actual_hours = parseFloat(document.getElementById('actualHours').value) || null;
        operationData.notes = document.getElementById('completionNotes').value.trim() || '';
    }
    
    // Convert due_date to proper format if needed
    if (operationData.due_date) {
        const date = new Date(operationData.due_date);
        operationData.due_date = date.toISOString();
    }
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('No authentication token found. Please log in.');
        return;
    }
    
    const url = isEditMode ? 
        `${Endpoint}/api/v1/operations/${currentOperationId}` : 
        `${Endpoint}/api/v1/operations`;
    const method = isEditMode ? 'PUT' : 'POST';
    
    // Disable save button to prevent double submission
    const saveBtn = document.getElementById('saveOperationBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
    
    fetch(url, {
        method: method,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(operationData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || `HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Save response:', data); // Debug log
        alert(isEditMode ? 'Operation updated successfully!' : 'Operation created successfully!');
        window.location.href = 'operations.html';
    })
    .catch(error => {
        console.error('Error saving operation:', error);
        alert('Error saving operation: ' + error.message);
        
        // Re-enable save button
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    });
}

// Delete operation
function deleteOperation() {
    if (!currentOperationId) {
        return;
    }
    
    if (!confirm('Are you sure you want to delete this operation? This action cannot be undone.')) {
        return;
    }
    
    const token = localStorage.getItem('token');
    
    if (!token) {
        alert('No authentication token found. Please log in.');
        return;
    }
    
    // Disable delete button
    const deleteBtn = document.getElementById('deleteOperationBtn');
    const originalText = deleteBtn.innerHTML;
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Deleting...';
    
    fetch(`${Endpoint}/api/v1/operations/${currentOperationId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.message || `HTTP error! status: ${response.status}`);
            });
        }
        alert('Operation deleted successfully!');
        window.location.href = 'operations.html';
    })
    .catch(error => {
        console.error('Error deleting operation:', error);
        alert('Error deleting operation: ' + error.message);
        
        // Re-enable delete button
        deleteBtn.disabled = false;
        deleteBtn.innerHTML = originalText;
    });
}

// Validate form
function validateForm() {
    const title = document.getElementById('operationTitle').value.trim();
    const description = document.getElementById('operationDescription').value.trim();
    const dueDate = document.getElementById('operationDueDate').value;
    const type = document.getElementById('operationType').value;
    const location = document.getElementById('operationLocation').value;
    
    if (!title) {
        alert('Please enter an operation title.');
        document.getElementById('operationTitle').focus();
        return false;
    }
    
    if (title.length < 3) {
        alert('Operation title must be at least 3 characters long.');
        document.getElementById('operationTitle').focus();
        return false;
    }
    
    if (!description) {
        alert('Please enter an operation description.');
        document.getElementById('operationDescription').focus();
        return false;
    }
    
    if (description.length < 10) {
        alert('Operation description must be at least 10 characters long.');
        document.getElementById('operationDescription').focus();
        return false;
    }
    
    if (!type) {
        alert('Please select an operation type.');
        document.getElementById('operationType').focus();
        return false;
    }
    
    if (!location) {
        alert('Please select or enter a location.');
        document.getElementById('operationLocation').focus();
        return false;
    }
    
    if (!dueDate) {
        alert('Please select a due date.');
        document.getElementById('operationDueDate').focus();
        return false;
    }
    
    // Check if due date is in the past (optional warning)
    const selectedDate = new Date(dueDate);
    const now = new Date();
    if (selectedDate < now) {
        if (!confirm('The due date is in the past. Do you want to continue?')) {
            return false;
        }
    }
    
    // Validate estimated hours if provided
    const estimatedHours = document.getElementById('estimatedHours').value;
    if (estimatedHours && (isNaN(estimatedHours) || parseFloat(estimatedHours) < 0)) {
        alert('Estimated hours must be a positive number.');
        document.getElementById('estimatedHours').focus();
        return false;
    }
    
    // Validate completion data if status is completed
    const status = document.getElementById('operationStatus').value;
    if (status === 'completed') {
        const actualHours = document.getElementById('actualHours').value;
        if (actualHours && (isNaN(actualHours) || parseFloat(actualHours) < 0)) {
            alert('Actual hours must be a positive number.');
            document.getElementById('actualHours').focus();
            return false;
        }
    }
    
    return true;
}

// Sample operations data for fallback
function getSampleOperations() {
    return [
        {
            id: 1,
            title: "Confirm Hotel Artemide Rome",
            description: "Confirm reservation for Johnson Family - 4 guests, 2 nights in suite",
            type: "hotel_confirmation",
            status: "pending",
            priority: "high",
            due_date: "2024-02-15T14:00:00Z",
            location: "Rome",
            agent_id: 5,
            assignee_id: 10,
            trip_id: 123,
            estimated_hours: 2,
            created_at: "2024-02-10T09:00:00Z",
            updated_at: "2024-02-10T09:00:00Z"
        },
        {
            id: 2,
            title: "Airport Transfer Coordination",
            description: "Arrange VIP transfer service for Emirates arrival - 6 passengers with luggage",
            type: "transfer_confirmation",
            status: "in_progress",
            priority: "urgent",
            due_date: "2024-02-15T10:30:00Z",
            location: "Florence",
            agent_id: 3,
            assignee_id: 11,
            trip_id: 456,
            estimated_hours: 1,
            created_at: "2024-02-09T15:30:00Z",
            updated_at: "2024-02-10T08:15:00Z"
        },
        {
            id: 3,
            title: "Uffizi Gallery Skip-the-Line",
            description: "Secure priority access tickets for 8 guests - morning slot preferred",
            type: "excursion_booking",
            status: "pending",
            priority: "medium",
            due_date: "2024-02-16T09:00:00Z",
            location: "Florence",
            agent_id: 7,
            assignee_id: 10,
            trip_id: 789,
            estimated_hours: 1.5,
            created_at: "2024-02-08T11:20:00Z",
            updated_at: "2024-02-08T11:20:00Z"
        },
        {
            id: 4,
            title: "Private Guide Assignment",
            description: "Match expert art historian guide for Vatican Museums private tour",
            type: "guide_assignment",
            status: "completed",
            priority: "high",
            due_date: "2024-02-14T16:00:00Z",
            location: "Rome",
            agent_id: 5,
            assignee_id: 11,
            trip_id: 234,
            estimated_hours: 2,
            actual_hours: 1.5,
            notes: "Successfully matched with Dr. Maria Rossi - excellent art history background",
            created_at: "2024-02-12T10:00:00Z",
            updated_at: "2024-02-14T16:30:00Z"
        },
        {
            id: 5,
            title: "Restaurant Reservation",
            description: "Book dinner at Michelin starred restaurant for 10 guests - dietary restrictions noted",
            type: "dining_reservation",
            status: "pending",
            priority: "low",
            due_date: "2024-02-17T18:00:00Z",
            location: "Milan",
            agent_id: 9,
            assignee_id: 12,
            trip_id: 567,
            estimated_hours: 0.5,
            created_at: "2024-02-10T14:45:00Z",
            updated_at: "2024-02-10T14:45:00Z"
        },
        {
            id: 6,
            title: "Emergency Contact Update",
            description: "Update emergency contact information for all Venice service providers",
            type: "admin_task",
            status: "in_progress",
            priority: "medium",
            due_date: "2024-02-16T17:00:00Z",
            location: "Venice",
            agent_id: 2,
            assignee_id: 10,
            estimated_hours: 3,
            created_at: "2024-02-09T09:30:00Z",
            updated_at: "2024-02-10T10:15:00Z"
        }
    ];
} 