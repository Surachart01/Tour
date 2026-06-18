// Edit Lead Group JavaScript - Based on Add Lead Group with Edit Mode Support
// Global variables
let currentUser = {};
let leadOptions = [];
let maxLeadOptions = 5;
let selectedHotelData = {}; // Store hotel data for room types and promotions
let roomTypeIndex = 0;
let toursData = {}; // Store tour data for route and duration
let editMode = true;
let editGroupId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    
    // Check if we have an edit parameter
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('id');
    
    if (!editId) {
        // If no ID provided, redirect to leads page
        showNotification('No lead group ID provided', 'error');
        setTimeout(() => window.location.href = 'leads.html?tab=lead-groups', 2000);
        return;
    }
    
    editGroupId = editId;
    console.log('Editing lead group ID:', editId);
    
    // Initialize the form and load data
    setupEventListeners();
    setDefaultDates();
    populateCountriesDropdown();
    populateCitiesDropdown('.city-dropdown-transfer');
    populateCitiesDropdown('.city-dropdown-hotel');
    populateCitiesDropdown('.city-dropdown-excursion');
    populateCitiesDropdown('.city-dropdown-tour');
    setupCountryCityListeners();
    setupServiceModalListeners();
    
    // Load the lead group data
    loadLeadGroupForEdit(editId).catch(error => {
        console.error('Failed to load lead group for editing:', error);
        showNotification(`Failed to load lead group: ${error.message}`, 'error');
        setTimeout(() => {
            window.location.href = 'leads.html?tab=lead-groups';
        }, 3000);
    });
});

// Authentication and user profile
function initializeAuth() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    const agentname = localStorage.getItem('agentname');

    if (!token) {
        showNotification('Please log in to edit lead groups', 'error');
        setTimeout(() => window.location.href = '../login.html', 2000);
        return;
    }

    currentUser = {
        token: token,
        username: username || 'Unknown',
        role: role || 'agent',
        agentname: agentname || username || 'Unknown',
        isAdmin: role === 'admin',
        isAgent: role === 'agent' || role === 'admin'
    };
    
    // Update profile display
    const profileNameEl = document.getElementById('profileName');
    const navProfileNameEl = document.getElementById('navProfileName');
    if (profileNameEl) profileNameEl.textContent = currentUser.username;
    if (navProfileNameEl) navProfileNameEl.textContent = currentUser.username;
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bookingDateEl = document.getElementById('bookingDate');
    const startDateEl = document.getElementById('startDate');
    
    if (bookingDateEl) bookingDateEl.value = today.toISOString().split('T')[0];
    if (startDateEl) startDateEl.value = tomorrow.toISOString().split('T')[0];
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('editLeadGroupForm');
    if (form) {
        form.addEventListener('submit', handleLeadGroupSubmission);
    }
    
    const addLeadOptionBtn = document.getElementById('addLeadOptionBtn');
    if (addLeadOptionBtn) {
        addLeadOptionBtn.addEventListener('click', addLeadOption);
    }
    
    const previewGroupBtn = document.getElementById('previewGroupBtn');
    if (previewGroupBtn) {
        previewGroupBtn.addEventListener('click', previewLeadGroup);
    }
}

// Setup service modal listeners
function setupServiceModalListeners() {
    // Flight modal
    document.getElementById('saveFlight').addEventListener('click', () => saveService('flights'));
    
    // Transfer modal
    document.getElementById('saveTransfer').addEventListener('click', () => saveService('transfers'));
    document.getElementById('getTransferPriceBtn').addEventListener('click', calculateTransferPrice);
    
    // Hotel modal
    document.getElementById('saveHotelBooking').addEventListener('click', () => saveService('hotels'));
    document.getElementById('getHotelPriceBtn').addEventListener('click', calculateHotelPrice);
    document.getElementById('checkInDate').addEventListener('change', updateNumberOfNights);
    document.getElementById('checkOutDate').addEventListener('change', updateNumberOfNights);
    document.getElementById('addRoomTypeBtn').addEventListener('click', addRoomType);
    
    // Excursion modal
    document.getElementById('saveExcursion').addEventListener('click', () => saveService('excursions'));
    document.getElementById('getExcursionPriceBtn').addEventListener('click', calculateExcursionPrice);
    
    // Tour modal
    document.getElementById('saveTour').addEventListener('click', () => saveService('tours'));
    document.getElementById('getTourPriceBtn').addEventListener('click', calculateTourPrice);
    
    // Tour specific listeners
    document.getElementById('tourName').addEventListener('change', function() {
        const selectedTourId = this.value;
        console.log('=== TOUR SELECTION CHANGED ===');
        console.log('Selected tour ID:', selectedTourId);
        console.log('Available tours data:', toursData);
        console.log('Currently editing service index:', window.editingServiceIndex);
        
        if (selectedTourId) {
            // Always update route field when user selects a new tour
            const routeInput = document.getElementById('tourRoute');
            
            if (toursData[selectedTourId]) {
                routeInput.value = toursData[selectedTourId].route || '';
                console.log('Set route from toursData:', toursData[selectedTourId].route);
            } else {
                // Try to get route from option data attribute as fallback
                const selectedOption = this.options[this.selectedIndex];
                if (selectedOption) {
                    const routeFromAttr = selectedOption.getAttribute('data-route');
                    routeInput.value = routeFromAttr || '';
                    console.log('Set route from data attribute:', routeFromAttr);
                }
            }
            
            // Always calculate end date when user selects a new tour
            calculateTourEndDate();
        } else {
            // Clear fields when no tour is selected
            document.getElementById('tourRoute').value = '';
            const endDateInput = document.getElementById('tourEndDate');
            endDateInput.removeAttribute('readonly');
            endDateInput.value = '';
            endDateInput.setAttribute('readonly', 'readonly');
            console.log('Cleared route and end date fields');
        }
    });
    
    document.getElementById('tourStartDate').addEventListener('change', function() {
        console.log('=== TOUR START DATE CHANGED ===');
        console.log('New start date:', this.value);
        
        // Always recalculate end date when start date changes
        calculateTourEndDate();
    });
    
    // Room type checkboxes for tours
    document.getElementById('tourSingleRoom').addEventListener('change', function() {
        document.getElementById('tourSingleRoomCount').disabled = !this.checked;
        if (!this.checked) document.getElementById('tourSingleRoomCount').value = '';
    });
    
    document.getElementById('tourDoubleRoom').addEventListener('change', function() {
        document.getElementById('tourDoubleRoomCount').disabled = !this.checked;
        if (!this.checked) document.getElementById('tourDoubleRoomCount').value = '';
    });
    
    document.getElementById('tourTripleRoom').addEventListener('change', function() {
        document.getElementById('tourTripleRoomCount').disabled = !this.checked;
        if (!this.checked) document.getElementById('tourTripleRoomCount').value = '';
    });
    
    // Others modal
    document.getElementById('saveOther').addEventListener('click', () => saveService('others'));
    
    // Hotel selection change handler
    document.getElementById('hotelType').addEventListener('change', function() {
        const hotelId = this.value;
        if (hotelId && selectedHotelData[hotelId]) {
            // Update all room type dropdowns
            document.querySelectorAll('.roomtype-dropdown').forEach(dropdown => {
                populateRoomTypes(dropdown, selectedHotelData[hotelId].room_types);
            });
        }
    });
    
    // City change listeners
    setupCityChangeListeners();
}

// Setup city change listeners
function setupCityChangeListeners() {
    // Transfer city change
    document.querySelectorAll('.city-dropdown-transfer').forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            const transferDropdown = document.querySelector('.transfer-dropdown');
            if (transferDropdown) {
                searchTransfersByCity(this, transferDropdown);
            }
        });
    });
    
    // Hotel city change
    document.querySelectorAll('.city-dropdown-hotel').forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            const hotelDropdown = document.querySelector('.hotel-dropdown');
            if (hotelDropdown) {
                searchHotelByCity(this, hotelDropdown);
            }
        });
    });
    
    // Excursion city change
    document.querySelectorAll('.city-dropdown-excursion').forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            const excursionDropdown = document.querySelector('.excursion-dropdown');
            if (excursionDropdown) {
                searchExcursionByCity(this, excursionDropdown);
            }
        });
    });
    
    // Tour city change
    document.querySelectorAll('.city-dropdown-tour').forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            const tourDropdown = document.querySelector('.tour-dropdown');
            if (tourDropdown) {
                searchToursByCity(this, tourDropdown);
            }
        });
    });
}

// Populate cities dropdown
// populateCitiesDropdown function is now defined in the HTML file with profile country support

// Populate countries dropdown
function populateCountriesDropdown() {
    const token = localStorage.getItem('token');
    
    fetch(`${Endpoint}/api/v1/locations/countries`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch countries');
        }
        return response.json();
    })
    .then(data => {
        console.log('Countries API response:', data);
        const countries = data.countries || data;
        
        const countrySelectors = [
            '#transferCountry',
            '#hotelCountry', 
            '#excursionCountry',
            '#tourCountry'
        ];
        
        countrySelectors.forEach(selector => {
            const dropdown = document.querySelector(selector);
            if (dropdown && Array.isArray(countries)) {
                // Clear existing options except the first one
                while (dropdown.children.length > 1) {
                    dropdown.removeChild(dropdown.lastChild);
                }
                
                countries.forEach(country => {
                    const option = document.createElement('option');
                    // Handle different country formats
                    if (typeof country === 'string') {
                        option.value = country;
                        option.textContent = country;
                        // Set Thailand as default
                        if (country === 'Thailand') {
                            option.selected = true;
                        }
                    } else {
                        // For object format, try different combinations
                        const countryCode = country.code || country.country_code || country.iso_code;
                        const countryName = country.name || country.country_name || country.country;
                        
                        // Use name as value to match backend data
                        option.value = countryName || countryCode || country;
                        option.textContent = countryName || countryCode || country;
                        
                        // Set Thailand as default
                        if (countryName === 'Thailand' || countryCode === 'TH' || countryCode === 'th') {
                            option.selected = true;
                        }
                        
                        // Store both name and code for debugging
                        if (countryCode && countryName) {
                            option.setAttribute('data-code', countryCode);
                            option.setAttribute('data-name', countryName);
                        }
                    }
                    dropdown.appendChild(option);
                });
                
                console.log(`Loaded ${countries.length} countries into ${selector}`);
            }
        });
        
        // Trigger change events for dropdowns with Thailand selected to enable cities
        setTimeout(() => {
            countrySelectors.forEach(selector => {
                const dropdown = document.querySelector(selector);
                if (dropdown && dropdown.value === 'Thailand') {
                    dropdown.dispatchEvent(new Event('change'));
                }
            });
        }, 100);
    })
    .catch(error => {
        console.error('Error fetching countries:', error);
        showNotification('Failed to load countries', 'error');
    });
}

// Setup country-city interaction listeners
function setupCountryCityListeners() {
    // Transfer country-city interaction
    const transferCountry = document.getElementById('transferCountry');
    const transferCity = document.getElementById('transferCity');
    if (transferCountry && transferCity) {
        transferCountry.addEventListener('change', function() {
            if (this.value) {
                transferCity.disabled = false;
                transferCity.innerHTML = '<option value="" disabled selected>Select City</option>';
                // Re-populate cities (for now, show all cities - can be filtered by country later)
                populateCitiesDropdown('.city-dropdown-transfer');
            } else {
                transferCity.disabled = true;
                transferCity.innerHTML = '<option value="" disabled selected>Select country first</option>';
            }
        });
    }
    
    // Hotel country-city interaction
    const hotelCountry = document.getElementById('hotelCountry');
    const hotelCity = document.getElementById('hotelCity');
    if (hotelCountry && hotelCity) {
        hotelCountry.addEventListener('change', function() {
            if (this.value) {
                hotelCity.disabled = false;
                hotelCity.innerHTML = '<option value="" disabled selected>Select City</option>';
                populateCitiesDropdown('.city-dropdown-hotel');
            } else {
                hotelCity.disabled = true;
                hotelCity.innerHTML = '<option value="" disabled selected>Select country first</option>';
            }
        });
    }
    
    // Excursion country-city interaction
    const excursionCountry = document.getElementById('excursionCountry');
    const excursionCity = document.getElementById('excursionCity');
    if (excursionCountry && excursionCity) {
        excursionCountry.addEventListener('change', function() {
            if (this.value) {
                excursionCity.disabled = false;
                excursionCity.innerHTML = '<option value="" disabled selected>Select City</option>';
                populateCitiesDropdown('.city-dropdown-excursion');
            } else {
                excursionCity.disabled = true;
                excursionCity.innerHTML = '<option value="" disabled selected>Select country first</option>';
            }
        });
    }
    
    // Tour country-city interaction
    const tourCountry = document.getElementById('tourCountry');
    const tourCity = document.getElementById('tourCity');
    if (tourCountry && tourCity) {
        tourCountry.addEventListener('change', function() {
            if (this.value) {
                tourCity.disabled = false;
                tourCity.innerHTML = '<option value="" disabled selected>Select City</option>';
                populateCitiesDropdown('.city-dropdown-tour');
            } else {
                tourCity.disabled = true;
                tourCity.innerHTML = '<option value="" disabled selected>Select country first</option>';
            }
        });
    }
}

// Add lead option
function addLeadOption() {
    if (leadOptions.length >= maxLeadOptions) {
        showNotification(`Maximum ${maxLeadOptions} lead options allowed`, 'warning');
        return;
    }

    const optionIndex = leadOptions.length;
    const leadOption = {
        id: Date.now() + optionIndex,
        optionName: `Option ${optionIndex + 1}`,
        templateType: 'simple',
        markupPercentage: 15,
        services: {
            hotels: [],
            transfers: [],
            excursions: [],
            tours: [],
            flights: [],
            others: []
        }
    };

    leadOptions.push(leadOption);
    renderLeadOption(leadOption, optionIndex);
    updateGroupSummary();
    updateAddButtonState();
}

// Render lead option
function renderLeadOption(leadOption, index) {
    const container = document.getElementById('leadOptionsContainer');
    const optionHtml = `
    <div class="lead-option" id="leadOption${leadOption.id}">
        <div class="lead-option-header" onclick="toggleLeadOption(${leadOption.id})">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h5 class="mb-0">
                        <i class="fa fa-chevron-down mr-2" id="chevron${leadOption.id}"></i>
                        ${leadOption.optionName}
                    </h5>
                </div>
                <div class="col-md-4 text-right">
                    <span class="badge badge-light mr-2" id="serviceBadge${leadOption.id}">0 services</span>
                    <span class="badge badge-success" id="costBadge${leadOption.id}">฿0.00</span>
                    <button type="button" class="btn btn-sm btn-outline-light ml-2" onclick="removeLeadOption(${leadOption.id}); event.stopPropagation();">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="lead-option-content" id="content${leadOption.id}">
            <div class="row">
                <div class="col-md-4 form-group">
                    <label>Option Name *</label>
                    <input type="text" class="form-control" value="${leadOption.optionName}" 
                           onchange="updateLeadOptionName(${leadOption.id}, this.value)">
                </div>
                <div class="col-md-4 form-group">
                    <label>Template Type *</label>
                    <select class="form-control" onchange="updateLeadOptionTemplate(${leadOption.id}, this.value)">
                        <option value="simple" ${leadOption.templateType === 'simple' ? 'selected' : ''}>Simple</option>
                        <option value="smart" ${leadOption.templateType === 'smart' ? 'selected' : ''}>Smart</option>
                        <option value="modern" ${leadOption.templateType === 'modern' ? 'selected' : ''}>Modern</option>
                    </select>
                </div>
                <div class="col-md-4 form-group">
                    <label>Markup Percentage *</label>
                    <input type="number" class="form-control" min="0" max="100" step="0.1" 
                           value="${leadOption.markupPercentage}" 
                           onchange="updateLeadOptionMarkup(${leadOption.id}, this.value)">
                </div>
            </div>
            
            <!-- Service Selection Buttons -->
            <div class="btn-group btn-group-sm d-flex justify-content-center mb-3">
                <button type="button" class="btn btn-primary" onclick="openServiceModal(${leadOption.id}, 'flights')">
                    <i class="fa fa-plane"></i> Flights
                </button>
                <button type="button" class="btn btn-info" onclick="openServiceModal(${leadOption.id}, 'transfers')">
                    <i class="fa fa-bus"></i> Transfers
                </button>
                <button type="button" class="btn btn-secondary" onclick="openServiceModal(${leadOption.id}, 'hotels')">
                    <i class="fa fa-hotel"></i> Hotels
                </button>
                <button type="button" class="btn btn-warning" onclick="openServiceModal(${leadOption.id}, 'excursions')">
                    <i class="fa fa-binoculars"></i> Excursions
                </button>
                <button type="button" class="btn btn-success" onclick="openServiceModal(${leadOption.id}, 'tours')">
                    <i class="fa fa-map-signs"></i> Tours
                </button>
                <button type="button" class="btn btn-dark" onclick="openServiceModal(${leadOption.id}, 'others')">
                    <i class="fa fa-plus"></i> Others
                </button>
            </div>

            <!-- Services Summary -->
            <div id="servicesSummary${leadOption.id}">
                <!-- Services will be displayed here -->
            </div>

            <!-- Pricing Summary -->
            <div class="pricing-summary">
                <div class="row">
                    <div class="col-md-4">
                        <label>Base Cost:</label>
                        <div class="total-cost" id="baseCost${leadOption.id}">฿0.00</div>
                    </div>
                    <div class="col-md-4">
                        <label>Markup (<span id="markupPercent${leadOption.id}">${leadOption.markupPercentage}</span>%):</label>
                        <div class="total-cost text-info" id="markupAmount${leadOption.id}">฿0.00</div>
                    </div>
                    <div class="col-md-4">
                        <label>Final Cost:</label>
                        <div class="total-cost text-success" id="finalCost${leadOption.id}">฿0.00</div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    container.insertAdjacentHTML('beforeend', optionHtml);
    updateLeadOptionPricing(leadOption.id);
}

// Toggle lead option visibility
function toggleLeadOption(optionId) {
    const content = document.getElementById(`content${optionId}`);
    const chevron = document.getElementById(`chevron${optionId}`);
    const option = document.getElementById(`leadOption${optionId}`);
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        chevron.className = 'fa fa-chevron-down mr-2';
        option.classList.add('active');
    } else {
        content.style.display = 'none';
        chevron.className = 'fa fa-chevron-right mr-2';
        option.classList.remove('active');
    }
}

// Update lead option properties
function updateLeadOptionName(optionId, name) {
    const option = leadOptions.find(opt => opt.id === optionId);
    if (option) {
        option.optionName = name;
        updateGroupSummary();
    }
}

function updateLeadOptionTemplate(optionId, template) {
    const option = leadOptions.find(opt => opt.id === optionId);
    if (option) {
        option.templateType = template;
        // Template types are now just for display purposes
        updateLeadOptionPricing(optionId);
        updateGroupSummary();
    }
}

function updateLeadOptionMarkup(optionId, markup) {
    const option = leadOptions.find(opt => opt.id === optionId);
    if (option) {
        option.markupPercentage = parseFloat(markup);
        updateLeadOptionPricing(optionId);
        updateGroupSummary();
    }
}

// Open service modal
function openServiceModal(optionId, serviceType) {
    // Store current option ID for modal
    window.currentOptionId = optionId;
    window.currentServiceType = serviceType;
    
    // Clear editing index when opening modal for new service
    window.editingServiceIndex = null;
    
    console.log(`Opening ${serviceType} modal for new service in option ${optionId}`);
    console.log('Cleared editing state for new service');
    
    // Reset form and show appropriate modal
    const modalId = serviceType === 'others' ? 'othersModal' : `${serviceType.slice(0, -1)}Modal`;
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
    
    // Clear room types wrapper for hotels when adding new
    if (serviceType === 'hotels') {
        document.getElementById('roomTypesWrapper').innerHTML = '';
    }
    
    // Set specific default dates based on service type
    setServiceDefaultDates(serviceType);
    
    $(`#${modalId}`).modal('show');
}

// Set default dates for services based on trip start date
function setServiceDefaultDates(serviceType) {
    const tripStartDate = document.getElementById('startDate').value;
    if (!tripStartDate) return;
    
    switch(serviceType) {
        case 'flights':
            const flightDateInput = document.getElementById('flightDate');
            if (flightDateInput) {
                flightDateInput.value = tripStartDate;
                flightDateInput.min = tripStartDate;
            }
            break;
            
        case 'transfers':
            const transferDateInput = document.getElementById('transferDate');
            if (transferDateInput) {
                transferDateInput.value = tripStartDate;
                transferDateInput.min = tripStartDate;
            }
            break;
            
        case 'hotels':
            const checkInDateInput = document.getElementById('checkInDate');
            if (checkInDateInput) {
                checkInDateInput.value = tripStartDate;
                checkInDateInput.min = tripStartDate;
            }
            // Set checkout to next day
            const checkOutDateInput = document.getElementById('checkOutDate');
            if (checkOutDateInput) {
                const nextDay = new Date(tripStartDate);
                nextDay.setDate(nextDay.getDate() + 1);
                checkOutDateInput.value = nextDay.toISOString().split('T')[0];
                checkOutDateInput.min = tripStartDate;
                // Update nights calculation
                updateNumberOfNights();
            }
            break;
            
        case 'excursions':
            const excursionDateInput = document.getElementById('excursionDate');
            if (excursionDateInput) {
                excursionDateInput.value = tripStartDate;
                excursionDateInput.min = tripStartDate;
            }
            break;
            
        case 'tours':
            const tourStartDateInput = document.getElementById('tourStartDate');
            if (tourStartDateInput) {
                tourStartDateInput.value = tripStartDate;
                tourStartDateInput.min = tripStartDate;
            }
            // Reset room checkboxes and counts
            document.getElementById('tourSingleRoom').checked = false;
            document.getElementById('tourDoubleRoom').checked = false;
            document.getElementById('tourTripleRoom').checked = false;
            document.getElementById('tourSingleRoomCount').disabled = true;
            document.getElementById('tourDoubleRoomCount').disabled = true;
            document.getElementById('tourTripleRoomCount').disabled = true;
            document.getElementById('tourSingleRoomCount').value = '';
            document.getElementById('tourDoubleRoomCount').value = '';
            document.getElementById('tourTripleRoomCount').value = '';
            break;
            
        case 'others':
            const otherDateInput = document.getElementById('otherDate');
            if (otherDateInput) {
                otherDateInput.value = tripStartDate;
                otherDateInput.min = tripStartDate;
            }
            break;
    }
}

// Save service to current lead option
function saveService(serviceType) {
    if (!window.currentOptionId) {
        showNotification('Please select a lead option first', 'error');
        return;
    }
    
    // Special validation for hotels - ensure room types are selected
    if (serviceType === 'hotels') {
        const roomTypeBlocks = document.querySelectorAll('#roomTypesWrapper .room-type-block');
        if (roomTypeBlocks.length === 0) {
            showNotification('Please add at least one room type before saving the hotel', 'error');
            return;
        }
        
        // Check if all room type blocks have valid room types selected
        let hasValidRoomType = false;
        roomTypeBlocks.forEach(block => {
            const roomTypeDropdown = block.querySelector('.roomtype-dropdown');
            if (roomTypeDropdown && roomTypeDropdown.value) {
                hasValidRoomType = true;
            }
        });

        if (!hasValidRoomType) {
            showNotification('Please select a room type for at least one room', 'error');
            return;
        }
    }

    const serviceData = collectServiceData(serviceType);
    if (!serviceData) {
        showNotification('Failed to collect service data', 'error');
        return;
    }

    const option = leadOptions.find(opt => opt.id === window.currentOptionId);
    if (!option) {
        showNotification('Lead option not found', 'error');
        return;
    }

    const serviceArrayName = getServiceArrayName(serviceType);
    if (!option.services[serviceArrayName]) {
        option.services[serviceArrayName] = [];
    }

    // Check if we're editing an existing service
    if (typeof window.editingServiceIndex !== 'undefined' && window.editingServiceIndex !== null && window.editingServiceIndex >= 0) {
        // Update existing service
        console.log(`Updating existing ${serviceType} at index ${window.editingServiceIndex}`);
        option.services[serviceArrayName][window.editingServiceIndex] = serviceData;
        showNotification(`${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} updated successfully`, 'success');
        // Clear editing index
        window.editingServiceIndex = null;
    } else {
        // Add new service
        console.log(`Adding new ${serviceType} service`);
        option.services[serviceArrayName].push(serviceData);
        showNotification(`${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} added successfully`, 'success');
    }

    updateLeadOptionDisplay(window.currentOptionId);
    updateGroupSummary();

    // Close modal and reset form
    const modalId = serviceType === 'others' ? 'othersModal' : `${serviceType.slice(0, -1)}Modal`;
    $(`#${modalId}`).modal('hide');
    const modalForm = document.querySelector(`#${modalId} form`);
    if (modalForm) {
        modalForm.reset();
    }
    
    // Clear room types wrapper for hotels only after successful save
    if (serviceType === 'hotels') {
        // Small delay to ensure modal is properly closed before clearing
        setTimeout(() => {
            document.getElementById('roomTypesWrapper').innerHTML = '';
        }, 100);
    }
}

// Collect service data
function collectServiceData(serviceType) {
    // Get the original service data if we're editing
    let originalService = null;
    if (typeof window.editingServiceIndex !== 'undefined' && window.editingServiceIndex !== null && window.editingServiceIndex >= 0) {
        const option = leadOptions.find(opt => opt.id === window.currentOptionId);
        if (option && option.services[serviceType] && option.services[serviceType][window.editingServiceIndex]) {
            originalService = option.services[serviceType][window.editingServiceIndex];
        }
    }
    
    switch(serviceType) {
        case 'flights':
            const flightData = {
                flight: document.getElementById('flight').value,
                number: document.getElementById('number').value,
                inOut: document.getElementById('flightInOut').value,
                route: document.getElementById('flightRoute').value,
                date: formatDateForBackend(document.getElementById('flightDate').value),
                departureTime: document.getElementById('departureTime').value,
                arrivalTime: document.getElementById('arrivalTime').value,
                issuedBy: document.getElementById('issuedBy').value,
                cost: parseFloat(document.getElementById('flightCost').value) || 0,
                remarks: document.getElementById('flightRemarks').value,
                name: document.getElementById('flight').value
            };
            // Only include ID if editing existing service
            if (originalService && originalService.id) {
                flightData.id = originalService.id;
            }
            return flightData;
            
        case 'transfers':
            const transferData = {
                city: document.getElementById('transferCity').value,
                transferId: document.getElementById('transferType').value,
                transferName: document.getElementById('transferType').selectedOptions[0]?.textContent || '',
                date: formatDateForBackend(document.getElementById('transferDate').value),
                from: document.getElementById('transferFrom').value,
                to: document.getElementById('transferTo').value,
                flight: document.getElementById('transferFlight').value,
                flightTime: document.getElementById('flightTime').value,
                tot: document.getElementById('transferToT').value,
                pickupTime: document.getElementById('transferPickupTime').value,
                backendPrice: parseFloat(document.getElementById('backendTransferPrice').value) || 0,
                remarks: document.getElementById('transferRemarks').value,
                name: `${document.getElementById('transferFrom').value} to ${document.getElementById('transferTo').value}`,
                cost: parseFloat(document.getElementById('backendTransferPrice').value) || 0
            };
            // Only include ID if editing existing service
            if (originalService && originalService.id) {
                transferData.id = originalService.id;
            }
            return transferData;
            
        case 'hotels':
            // Collect room types data from dynamic blocks
            const roomTypesData = [];
            document.querySelectorAll('#roomTypesWrapper .room-type-block').forEach((block) => {
                const roomTypeDropdown = block.querySelector('.roomtype-dropdown');
                const roomTypeId = parseInt(roomTypeDropdown.value, 10) || 0;
                const roomTypeName = roomTypeDropdown.options[roomTypeDropdown.selectedIndex]?.textContent || '';
                
                const adults = parseInt(block.querySelector('.adults')?.value, 10) || 0;
                const children = parseInt(block.querySelector('.children')?.value, 10) || 0;
                
                const complimentaryAbf = block.querySelector('.option-checkbox[data-type="complimentary_abf"]')?.checked || false;
                const extraAdultBed = block.querySelector('.option-checkbox[data-type="extra_adult_bed"]')?.checked || false;
                const extraChildBed = block.querySelector('.option-checkbox[data-type="extra_child_bed"]')?.checked || false;
                const sharingBed = block.querySelector('.option-checkbox[data-type="sharing_bed"]')?.checked || false;
                
                if (roomTypeId) {
                    const roomTypeData = {
                        room_type_id: roomTypeId,
                        room_type_name: roomTypeName,
                        adults: adults,
                        children: children,
                        complimentary_abf: complimentaryAbf,
                        extra_adult_bed: extraAdultBed,
                        extra_child_bed: extraChildBed,
                        sharing_bed: sharingBed
                    };
                    
                    // Check if this room type block has an original ID stored
                    const originalId = block.getAttribute('data-original-id');
                    if (originalId && !isNaN(parseInt(originalId))) {
                        roomTypeData.id = parseInt(originalId);
                    }
                    
                    roomTypesData.push(roomTypeData);
                }
            });
            
            const hotelData = {
                city: document.getElementById('hotelCity').value,
                hotelId: document.getElementById('hotelType').value,
                hotelName: document.getElementById('hotelType').selectedOptions[0]?.textContent || '',
                checkIn: formatDateForBackend(document.getElementById('checkInDate').value),
                checkOut: formatDateForBackend(document.getElementById('checkOutDate').value),
                nights: parseInt(document.getElementById('numberOfNights').value) || 1,
                singleRooms: parseInt(document.getElementById('singleRooms').value) || 0,
                doubleRooms: parseInt(document.getElementById('doubleRooms').value) || 1,
                earlyCheckIn: document.getElementById('earlyCheckIn').checked,
                lateCheckOut: document.getElementById('lateCheckOut').checked,
                roomTypes: roomTypesData, // Add room types data
                backendPrice: parseFloat(document.getElementById('backendHotelPrice').value) || 0,
                notes: document.getElementById('hotelNotes').value,
                name: document.getElementById('hotelType').selectedOptions[0]?.textContent || 'Hotel',
                cost: parseFloat(document.getElementById('backendHotelPrice').value) || 0
            };
            // Only include ID if editing existing service
            if (originalService && originalService.id) {
                hotelData.id = originalService.id;
            }
            return hotelData;
            
        case 'excursions':
            const excursionData = {
                city: document.getElementById('excursionCity').value,
                excursionId: document.getElementById('excursionName').value,
                excursionName: document.getElementById('excursionName').selectedOptions[0]?.textContent || '',
                date: formatDateForBackend(document.getElementById('excursionDate').value),
                hotel: document.getElementById('excursionHotel').value,
                pickupTime: document.getElementById('excursionPickupTime').value,
                type: document.getElementById('typeOfExcursion').value,
                backendPrice: parseFloat(document.getElementById('backendExcursionPrice').value) || 0,
                manualCost: null, // No manual cost input for excursions in this form
                remarks: document.getElementById('excursionRemarks').value,
                name: document.getElementById('excursionName').selectedOptions[0]?.textContent || 'Excursion',
                cost: parseFloat(document.getElementById('backendExcursionPrice').value) || 0
            };
            // Only include ID if editing existing service
            if (originalService && originalService.id) {
                excursionData.id = originalService.id;
            }
            return excursionData;
            
        case 'tours':
            console.log('=== COLLECTING TOUR DATA FROM FORM ===');
            console.log('Tour City:', document.getElementById('tourCity').value);
            console.log('Tour ID:', document.getElementById('tourName').value);
            console.log('Tour Name:', document.getElementById('tourName').selectedOptions[0]?.textContent);
            console.log('Tour Route:', document.getElementById('tourRoute').value);
            console.log('Start Date:', document.getElementById('tourStartDate').value);
            console.log('End Date:', document.getElementById('tourEndDate').value);
            console.log('Original Service:', originalService);
            
            const tourData = {
                city: document.getElementById('tourCity').value,
                tourId: document.getElementById('tourName').value,
                tourName: document.getElementById('tourName').selectedOptions[0]?.textContent || '',
                route: document.getElementById('tourRoute').value,
                startDate: formatDateForBackend(document.getElementById('tourStartDate').value),
                endDate: formatDateForBackend(document.getElementById('tourEndDate').value),
                tot: document.getElementById('tourToT').value,
                singleRooms: document.getElementById('tourSingleRoom').checked ? parseInt(document.getElementById('tourSingleRoomCount').value) || 0 : 0,
                doubleRooms: document.getElementById('tourDoubleRoom').checked ? parseInt(document.getElementById('tourDoubleRoomCount').value) || 0 : 0,
                tripleRooms: document.getElementById('tourTripleRoom').checked ? parseInt(document.getElementById('tourTripleRoomCount').value) || 0 : 0,
                backendPrice: parseFloat(document.getElementById('backendTourPrice').value) || 0,
                remarks: document.getElementById('tourRemarks').value,
                name: document.getElementById('tourName').selectedOptions[0]?.textContent || 'Tour',
                cost: parseFloat(document.getElementById('backendTourPrice').value) || 0
            };
            // Only include ID if editing existing service
            if (originalService && originalService.id) {
                tourData.id = originalService.id;
                console.log('Including original service ID:', originalService.id);
            }
            console.log('Final collected tour data:', tourData);
            return tourData;
            
        case 'others':
            const otherData = {
                description: document.getElementById('otherDescription').value,
                date: formatDateForBackend(document.getElementById('otherDate').value),
                cost: parseFloat(document.getElementById('otherCost').value) || 0,
                name: document.getElementById('otherDescription').value
            };
            // Only include ID if editing existing service
            if (originalService && originalService.id) {
                otherData.id = originalService.id;
            }
            return otherData;
            
        default:
            return null;
    }
}

// Get service array name
function getServiceArrayName(serviceType) {
    const mapping =
{
        flights: 'flights', transfers: 'transfers', hotels: 'hotels',
        excursions: 'excursions', tours: 'tours', others: 'others'
    };
    return mapping[serviceType];
}

// Update lead option display
function updateLeadOptionDisplay(optionId) {
    const option = leadOptions.find(opt => opt.id === optionId);
    if (!option) return;
    
    // Update services summary
    const summaryContainer = document.getElementById(`servicesSummary${optionId}`);
    let totalServices = 0;
    let summaryHtml = '';
    
    Object.entries(option.services).forEach(([serviceType, services]) => {
        if (services.length > 0) {
            totalServices += services.length;
            summaryHtml += createServiceTableHTML(serviceType, services, optionId);
        }
    });
    
    summaryContainer.innerHTML = summaryHtml || '<p class="text-muted">No services added yet</p>';
    
    // Update badges
    document.getElementById(`serviceBadge${optionId}`).textContent = `${totalServices} services`;
    
    // Update pricing
    updateLeadOptionPricing(optionId);
}

// Create service table HTML matching the leads format
function createServiceTableHTML(serviceType, services, optionId) {
    const serviceTypeCapitalized = serviceType.charAt(0).toUpperCase() + serviceType.slice(1);
    
    let tableHeaders = '';
    switch(serviceType) {
        case 'flights':
            tableHeaders = `
                <th>Flight</th>
                <th>Date</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Cost</th>
                <th>Actions</th>
            `;
            break;
        case 'transfers':
            tableHeaders = `
                <th>From</th>
                <th>To</th>
                <th>Date</th>
                <th>Pickup Time</th>
                <th>Cost</th>
                <th>Actions</th>
            `;
            break;
        case 'hotels':
            tableHeaders = `
                <th>Hotel</th>
                <th>City</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Nights</th>
                <th>Rooms</th>
                <th>Cost</th>
                <th>Actions</th>
            `;
            break;
        case 'excursions':
            tableHeaders = `
                <th>Excursion</th>
                <th>Date</th>
                <th>Pickup Time</th>
                <th>Hotel</th>
                <th>Cost</th>
                <th>Remarks</th>
                <th>Actions</th>
            `;
            break;
        case 'tours':
            tableHeaders = `
                <th>Tour</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Route</th>
                <th>Cost</th>
                <th>Remarks</th>
                <th>Actions</th>
            `;
            break;
        case 'others':
            tableHeaders = `
                <th>Description</th>
                <th>Date</th>
                <th>Cost</th>
                <th>Actions</th>
            `;
            break;
    }
    
    const tableRows = services.map((service, index) =>
        createServiceRowHTML(serviceType, service, index, optionId)
    ).join('');
    
    return `
        <div class="mb-4">
            <h6 class="text-primary mb-2">
                <i class="fa fa-${getServiceIcon(serviceType)} mr-2"></i>${serviceTypeCapitalized}
            </h6>
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead class="thead-light">
                        <tr>${tableHeaders}</tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// Create service row HTML matching the leads format
function createServiceRowHTML(serviceType, service, index, optionId) {
    const finalCost = service.finalCost || service.cost || 0;
    
    switch(serviceType) {
        case 'flights':
            return `
                <tr>
                    <td>${service.flight || service.name || 'N/A'}</td>
                    <td>${formatDateForDisplay(service.date) || 'N/A'}</td>
                    <td>${service.departureTime || 'N/A'}</td>
                    <td>${service.arrivalTime || 'N/A'}</td>
                    <td>฿${finalCost.toFixed(2)}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-warning" onclick="editServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        case 'transfers':
            return `
                <tr>
                    <td>${service.from || 'N/A'}</td>
                    <td>${service.to || 'N/A'}</td>
                    <td>${formatDateForDisplay(service.date) || 'N/A'}</td>
                    <td>${service.pickupTime || 'N/A'}</td>
                    <td>฿${finalCost.toFixed(2)}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-warning" onclick="editServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        case 'hotels':
            // Build detailed room display with both room names and S/D counts
            let roomsDisplay = '';
            const displayParts = [];
            
            // Add room type names if available
            if (service.roomTypes && service.roomTypes.length > 0) {
                const roomTypeCounts = {};
                service.roomTypes.forEach(rt => {
                    const roomName = rt.room_type_name || rt.room_type || 'Room';
                    roomTypeCounts[roomName] = (roomTypeCounts[roomName] || 0) + 1;
                });
                
                const roomTypeDisplayParts = Object.entries(roomTypeCounts).map(([name, count]) => {
                    return count > 1 ? `${count}x ${name}` : name;
                });
                displayParts.push(roomTypeDisplayParts.join(', '));
            }
            
            // Always add single/double room counts (show both even if 0)
            const singleRooms = service.singleRooms || 0;
            const doubleRooms = service.doubleRooms || 0;
            displayParts.push(`(${singleRooms}S, ${doubleRooms}D)`);
            
            roomsDisplay = displayParts.length > 0 ? displayParts.join(' ') : 'No rooms';
            
            return `
                <tr>
                    <td>${service.hotelName || service.name || 'N/A'}</td>
                    <td>${service.city || 'N/A'}</td>
                    <td>${formatDateForDisplay(service.checkIn) || 'N/A'}</td>
                    <td>${formatDateForDisplay(service.checkOut) || 'N/A'}</td>
                    <td>${service.nights || 'N/A'}</td>
                    <td>${roomsDisplay}</td>
                    <td>฿${finalCost.toFixed(2)}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-warning" onclick="editServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        case 'excursions':
            return `
                <tr>
                    <td>${service.excursionName || service.name || 'N/A'}</td>
                    <td>${formatDateForDisplay(service.date) || 'N/A'}</td>
                    <td>${service.pickupTime || 'N/A'}</td>
                    <td>${service.hotel || 'N/A'}</td>
                    <td>฿${finalCost.toFixed(2)}</td>
                    <td>${service.remarks || 'N/A'}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-warning" onclick="editServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        case 'tours':
            return `
                <tr>
                    <td>${service.tourName || service.name || 'N/A'}</td>
                    <td>${formatDateForDisplay(service.startDate) || 'N/A'}</td>
                    <td>${formatDateForDisplay(service.endDate) || 'N/A'}</td>
                    <td>${service.route || 'N/A'}</td>
                    <td>฿${finalCost.toFixed(2)}</td>
                    <td>${service.remarks || 'N/A'}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-warning" onclick="editServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        case 'others':
            return `
                <tr>
                    <td>${service.description || service.name || 'N/A'}</td>
                    <td>${formatDateForDisplay(service.date) || 'N/A'}</td>
                    <td>฿${finalCost.toFixed(2)}</td>
                    <td>
                        <button type="button" class="btn btn-sm btn-warning" onclick="editServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        default:
            return '<tr><td colspan="5" class="alert alert-warning">Unknown service type</td></tr>';
    }
}

// Get service icon for display
function getServiceIcon(serviceType) {
    const iconMap = {
        'flights': 'plane',
        'transfers': 'bus',
        'hotels': 'hotel',
        'excursions': 'binoculars',
        'tours': 'map-signs',
        'others': 'plus'
    };
    return iconMap[serviceType] || 'question';
}

// Get service details for display
function getServiceDetails(service, serviceType) {
    switch(serviceType) {
        case 'flights':
            return `${service.route || 'Route'} • ${service.date || 'Date'} • ${service.inOut || 'Flight In'}`;
        case 'transfers':
            return `${service.from || 'From'} → ${service.to || 'To'} • ${service.date || 'Date'} • ${service.tot || 'PVT'}`;
        case 'hotels':
            return `${service.city || 'City'} • ${service.checkIn || 'Check-in'} to ${service.checkOut || 'Check-out'} • ${service.nights || 1} nights`;
        case 'excursions':
            return `${service.city || 'City'} • ${service.date || 'Date'} • ${service.type || 'PVT'}`;
        case 'tours':
            return `${service.city || 'City'} • ${service.startDate || 'Start'} to ${service.endDate || 'End'} • ${service.tot || 'PVT'}`;
        case 'others':
            return `${service.date || 'Date'} • ${service.description || 'Description'}`;
        default:
            return '';
    }
}

// Edit service from option
function editServiceFromOption(optionId, serviceType, serviceIndex) {
    const option = leadOptions.find(opt => opt.id === optionId);
    if (!option || !option.services[serviceType] || !option.services[serviceType][serviceIndex]) {
        showNotification('Service not found', 'error');
        return;
    }
    
    const service = option.services[serviceType][serviceIndex];
    
    // Store current option ID and service info for modal
    window.currentOptionId = optionId;
    window.currentServiceType = serviceType;
    window.editingServiceIndex = serviceIndex;
    
    console.log(`Editing ${serviceType} service at index ${serviceIndex} for option ${optionId}`);
    
    // Open appropriate modal and populate with existing data
    const modalId = serviceType === 'others' ? 'othersModal' : `${serviceType.slice(0, -1)}Modal`;
    
    // Populate form with existing service data
    populateServiceForm(service, serviceType);
    
    // Show modal
    $(`#${modalId}`).modal('show');
}

// Populate service form with existing data
function populateServiceForm(service, serviceType) {
    switch(serviceType) {
        case 'flights':
            document.getElementById('flight').value = service.flight || '';
            document.getElementById('number').value = service.number || '';
            document.getElementById('flightInOut').value = service.inOut || 'Flight In';
            document.getElementById('flightRoute').value = service.route || '';
            document.getElementById('flightDate').value = formatDateForInput(service.date) || '';
            document.getElementById('departureTime').value = service.departureTime || '09:00';
            document.getElementById('arrivalTime').value = service.arrivalTime || '12:00';
            document.getElementById('issuedBy').value = service.issuedBy || '';
            document.getElementById('flightCost').value = service.cost || 0;
            document.getElementById('flightRemarks').value = service.remarks || '';
            break;
            
        case 'transfers':
            document.getElementById('transferCity').value = service.city || '';
            document.getElementById('transferDate').value = formatDateForInput(service.date) || '';
            document.getElementById('transferFrom').value = service.from || '';
            document.getElementById('transferTo').value = service.to || '';
            document.getElementById('transferFlight').value = service.flight || '';
            document.getElementById('flightTime').value = service.flightTime || '';
            document.getElementById('transferToT').value = service.tot || 'PVT';
            document.getElementById('transferPickupTime').value = service.pickupTime || '';
            document.getElementById('backendTransferPrice').value = service.backendPrice || service.cost || 0;
            document.getElementById('transferRemarks').value = service.remarks || '';
            
            // Populate transfer dropdown for the selected city and then set the value
            if (service.city) {
                const cityDropdown = document.getElementById('transferCity');
                const transferDropdown = document.getElementById('transferType');
                searchTransfersByCity(cityDropdown, transferDropdown).then(() => {
                    // Set the transfer value after dropdown is populated
                    if (service.transferId) {
                        transferDropdown.value = service.transferId;
                    }
                });
            }
            break;
            
        case 'hotels':
            console.log('Populating hotel form with service data:', service);
            
            // Basic hotel information
            document.getElementById('hotelCity').value = service.city || '';
            document.getElementById('checkInDate').value = formatDateForInput(service.checkIn) || '';
            document.getElementById('checkOutDate').value = formatDateForInput(service.checkOut) || '';
            document.getElementById('numberOfNights').value = service.nights || 1;
            document.getElementById('singleRooms').value = service.singleRooms || 0;
            document.getElementById('doubleRooms').value = service.doubleRooms || 1;
            document.getElementById('earlyCheckIn').checked = service.earlyCheckIn || false;
            document.getElementById('lateCheckOut').checked = service.lateCheckOut || false;
            document.getElementById('backendHotelPrice').value = service.backendPrice || service.cost || 0;
            document.getElementById('hotelNotes').value = service.notes || '';
            
            // Handle city selection and hotel dropdown population
            const hotelCityDropdown = document.getElementById('hotelCity');
            const hotelDropdown = document.getElementById('hotelType');
            
            if (service.city) {
                console.log('Setting city to:', service.city);
                hotelCityDropdown.value = service.city;
                
                // Populate hotels for the selected city
                const checkInDate = document.getElementById('checkInDate').value;
                const checkOutDate = document.getElementById('checkOutDate').value;
                
                if (checkInDate && checkOutDate) {
                    console.log('Loading hotels for city:', service.city);
                    loadHotelsForCityAndPopulate(service.city, checkInDate, checkOutDate, service.hotelId, service.hotelName)
                        .then(() => {
                            console.log('Hotels loaded, now handling room types');
                            // Handle room types after hotels are loaded
                            handleRoomTypesForEdit(service);
                        })
                        .catch(error => {
                            console.error('Error loading hotels:', error);
                            // Still try to handle room types even if hotel loading fails
                            handleRoomTypesForEdit(service);
                        });
                } else {
                    console.log('No check-in/out dates, creating fallback hotel option');
                    // Create a fallback option if we can't load hotels
                    if (service.hotelId && service.hotelName) {
                        const option = document.createElement('option');
                        option.value = service.hotelId;
                        option.textContent = service.hotelName;
                        hotelDropdown.appendChild(option);
                        hotelDropdown.value = service.hotelId;
                    }
                    handleRoomTypesForEdit(service);
                }
            } else {
                console.log('No city specified, handling room types directly');
                handleRoomTypesForEdit(service);
            }
            break;
            
        case 'excursions':
            document.getElementById('excursionCity').value = service.city || '';
            document.getElementById('excursionDate').value = formatDateForInput(service.date) || '';
            document.getElementById('excursionHotel').value = service.hotel || '';
            document.getElementById('excursionPickupTime').value = service.pickupTime || '';
            document.getElementById('typeOfExcursion').value = service.type || 'PVT';
            document.getElementById('backendExcursionPrice').value = service.backendPrice || service.cost || 0;
            document.getElementById('excursionRemarks').value = service.remarks || '';
            
            // Populate excursion dropdown for the selected city and then set the value
            if (service.city) {
                const cityDropdown = document.getElementById('excursionCity');
                const excursionDropdown = document.getElementById('excursionName');
                searchExcursionByCity(cityDropdown, excursionDropdown).then(() => {
                    // Set the excursion value after dropdown is populated
                    if (service.excursionId) {
                        excursionDropdown.value = service.excursionId;
                    }
                });
            }
            break;
            
        case 'tours':
            console.log('Populating tour form with service data:', service);
            
            // Set basic tour fields first
            document.getElementById('tourRoute').value = service.route || '';
            document.getElementById('tourStartDate').value = formatDateForInput(service.startDate) || '';
            document.getElementById('tourEndDate').value = formatDateForInput(service.endDate) || '';
            document.getElementById('tourToT').value = service.tot || 'PVT';
            
            // Handle room checkboxes and counts
            document.getElementById('tourSingleRoom').checked = service.singleRooms > 0;
            document.getElementById('tourDoubleRoom').checked = service.doubleRooms > 0;
            document.getElementById('tourTripleRoom').checked = service.tripleRooms > 0;
            
            document.getElementById('tourSingleRoomCount').value = service.singleRooms || '';
            document.getElementById('tourDoubleRoomCount').value = service.doubleRooms || '';
            document.getElementById('tourTripleRoomCount').value = service.tripleRooms || '';
            
            document.getElementById('tourSingleRoomCount').disabled = service.singleRooms <= 0;
            document.getElementById('tourDoubleRoomCount').disabled = service.doubleRooms <= 0;
            document.getElementById('tourTripleRoomCount').disabled = service.tripleRooms <= 0;
            
            document.getElementById('backendTourPrice').value = service.backendPrice || service.cost || 0;
            document.getElementById('tourRemarks').value = service.remarks || '';
            
            // Handle city and tour dropdown population
            const tourCityDropdown = document.getElementById('tourCity');
            const tourDropdown = document.getElementById('tourName');
            
            console.log('Service city:', service.city);
            console.log('Service tourId:', service.tourId);
            console.log('Service tourName:', service.tourName);
            
            // Store the original service data to prevent loss during dropdown changes
            const originalTourData = {
                tourId: service.tourId,
                tourName: service.tourName,
                route: service.route,
                startDate: service.startDate,
                endDate: service.endDate,
                city: service.city
            };
            
            // Always create fallback tour option first
            if (service.tourId && service.tourName) {
                console.log('Creating fallback tour option for:', service.tourName);
                tourDropdown.innerHTML = '<option value="">Select Tour</option>';
                const fallbackOption = document.createElement('option');
                fallbackOption.value = service.tourId;
                fallbackOption.textContent = service.tourName;
                fallbackOption.setAttribute('data-route', service.route || '');
                fallbackOption.setAttribute('data-duration', '1'); // Default duration
                tourDropdown.appendChild(fallbackOption);
                tourDropdown.value = service.tourId;
                
                // Store tour data for end date calculation - preserve original data
                toursData[service.tourId] = {
                    id: service.tourId,
                    name: service.tourName,
                    route: service.route || '',
                    duration: calculateDurationFromDates(service.startDate, service.endDate) || 1,
                    city: service.city || ''
                };
                
                console.log('Fallback tour option created and selected:', service.tourName);
                console.log('Stored tour data:', toursData[service.tourId]);
            }
            
            // Handle city dropdown
            if (service.city && service.city.trim() !== '') {
                console.log('Setting city dropdown to:', service.city);
                
                // Check if city exists in dropdown options
                let cityExists = false;
                for (let i = 0; i < tourCityDropdown.options.length; i++) {
                    if (tourCityDropdown.options[i].value === service.city) {
                        cityExists = true;
                        break;
                    }
                }
                
                if (!cityExists) {
                    console.log('City not found in dropdown, adding it:', service.city);
                    // Add the city as an option if it doesn't exist
                    const cityOption = document.createElement('option');
                    cityOption.value = service.city;
                    cityOption.textContent = service.city;
                    tourCityDropdown.appendChild(cityOption);
                }
                
                // Set the city value
                tourCityDropdown.value = service.city;
                console.log('City dropdown value set to:', tourCityDropdown.value);
                
                // Try to load tours for the city but preserve existing selection
                searchToursByCity(tourCityDropdown, tourDropdown).then(() => {
                    console.log('Tours loaded from API, preserving existing selection');
                    // Ensure our tour is still selected after API load
                    if (service.tourId) {
                        const existingOption = tourDropdown.querySelector(`option[value="${service.tourId}"]`);
                        if (existingOption) {
                            tourDropdown.value = service.tourId;
                            console.log('Tour found in API response and re-selected');
                        } else {
                            // Re-create fallback option if not found in API
                            const fallbackOption = document.createElement('option');
                            fallbackOption.value = service.tourId;
                            fallbackOption.textContent = service.tourName;
                            fallbackOption.setAttribute('data-route', service.route || '');
                            tourDropdown.appendChild(fallbackOption);
                            tourDropdown.value = service.tourId;
                            console.log('Tour not in API, re-created fallback option');
                        }
                    }
                }).catch(error => {
                    console.error('Error loading tours from API, using fallback:', error);
                    // Fallback option is already created above
                });
            } else {
                console.log('No city provided, using empty city dropdown');
                tourCityDropdown.value = '';
            }
            
            // Don't trigger change event automatically to prevent overwriting existing data
            console.log('Tour form populated successfully without triggering change events');
            break;
            
        case 'others':
            document.getElementById('otherDescription').value = service.description || '';
            document.getElementById('otherDate').value = formatDateForInput(service.date) || '';
            document.getElementById('otherCost').value = service.cost || 0;
            break;
    }
}

// Remove service from option
function removeServiceFromOption(optionId, serviceType, serviceIndex) {
    if (confirm('Are you sure you want to remove this service?')) {
        const option = leadOptions.find(opt => opt.id === optionId);
        if (option && option.services[serviceType]) {
            option.services[serviceType].splice(serviceIndex, 1);
            updateLeadOptionDisplay(optionId);
            updateGroupSummary();
            showNotification('Service removed successfully', 'success');
        }
    }
}

// Update lead option pricing
function updateLeadOptionPricing(optionId) {
    const option = leadOptions.find(opt => opt.id === optionId);
    if (!option) return;
    
    // Calculate base cost from backend prices
    let baseCost = 0;
    Object.values(option.services).forEach(serviceArray => {
        serviceArray.forEach(service => {
            baseCost += service.backendPrice || service.cost || 0;
        });
    });
    
    const markupAmount = baseCost * (option.markupPercentage / 100);
    const finalCost = baseCost + markupAmount;
    
    // Update display
    document.getElementById(`baseCost${optionId}`).textContent = `฿${baseCost.toFixed(2)}`;
    document.getElementById(`markupAmount${optionId}`).textContent = `฿${markupAmount.toFixed(2)}`;
    document.getElementById(`finalCost${optionId}`).textContent = `฿${finalCost.toFixed(2)}`;
    document.getElementById(`markupPercent${optionId}`).textContent = option.markupPercentage.toFixed(1);
    document.getElementById(`costBadge${optionId}`).textContent = `฿${finalCost.toFixed(2)}`;
}

// Remove lead option
function removeLeadOption(optionId) {
    if (leadOptions.length <= 1) {
        showNotification('At least one lead option is required', 'warning');
        return;
    }
    
    if (confirm('Are you sure you want to remove this lead option?')) {
        leadOptions = leadOptions.filter(opt => opt.id !== optionId);
        document.getElementById(`leadOption${optionId}`).remove();
        updateGroupSummary();
        updateAddButtonState();
        showNotification('Lead option removed successfully', 'success');
    }
}

// Update group summary
function updateGroupSummary() {
    const summary = document.getElementById('groupSummary');
    
    if (leadOptions.length === 0) {
        summary.style.display = 'none';
        return;
    }
    
    summary.style.display = 'block';
    
    // Calculate summary data
    const costs = leadOptions.map(option => {
        let baseCost = 0;
        Object.values(option.services).forEach(serviceArray => {
            serviceArray.forEach(service => {
                if (service.backendPrice && !service.manualCost) {
                    baseCost += service.backendPrice;
                } else {
                    baseCost += service.cost || service.finalCost || 0;
                }
            });
        });
        return baseCost * (1 + option.markupPercentage / 100);
    });
    
    const minCost = costs.length > 0 ? Math.min(...costs) : 0;
    const maxCost = costs.length > 0 ? Math.max(...costs) : 0;
    const avgMarkup = leadOptions.reduce((sum, opt) => sum + opt.markupPercentage, 0) / leadOptions.length;
    
    document.getElementById('totalOptions').textContent = leadOptions.length;
    document.getElementById('priceRange').textContent = `฿${minCost.toFixed(2)} - ฿${maxCost.toFixed(2)}`;
    document.getElementById('avgMarkup').textContent = `${avgMarkup.toFixed(1)}%`;
}

// Update add button state
function updateAddButtonState() {
    const addBtn = document.getElementById('addLeadOptionBtn');
    if (leadOptions.length >= maxLeadOptions) {
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fa fa-ban mr-2"></i>Maximum Options Reached';
    } else {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fa fa-plus mr-2"></i>Add Lead Option';
    }
}

// Preview lead group
function previewLeadGroup() {
    showNotification('Lead group preview functionality coming soon', 'info');
}

// Handle lead group submission
async function handleLeadGroupSubmission(event) {
    event.preventDefault();
    
    if (leadOptions.length < 1) {
        showNotification('Please add at least 1 lead option', 'warning');
        return;
    }
    
    const leadGroupData = collectLeadGroupFormData();
    if (!leadGroupData) return;
    
    try {
        showButtonLoading('submitLeadGroup');
        
        // Debug: Log the data being sent
        console.log('Sending lead group data:', JSON.stringify(leadGroupData, null, 2));
        
        const url = `${Endpoint}/api/v1/group-proposals/${editGroupId}`;
        const method = 'PUT';
        
        console.log('Request URL:', url);
        console.log('Request method:', method);
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(leadGroupData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            const responseText = await response.text();
            console.error('Error response body:', responseText);
            
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                errorMessage = responseText || errorMessage;
            }
            
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('Success response:', result);
        
        const successMessage = 'Lead group updated successfully!';
        
        showNotification(successMessage, 'success');
        // Redirect to leads page with lead groups tab active after 2 seconds
        setTimeout(() => window.location.href = 'leads.html?tab=lead-groups', 300000);
        
    } catch (error) {
        console.error('Lead group update error:', error);
        showNotification(`Failed to update lead group: ${error.message}`, 'error');
    } finally {
        hideButtonLoading('submitLeadGroup');
    }
}

// Collect lead group form data
function collectLeadGroupFormData() {
    const form = document.getElementById('editLeadGroupForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return null;
    }
    
    // Validate required fields
    const groupName = document.getElementById('groupName').value.trim();
    const clientName = document.getElementById('clientName').value.trim();
    const clientEmail = document.getElementById('clientEmail').value.trim();
    
    if (!groupName) {
        showNotification('Group name is required', 'error');
        return null;
    }
    
    if (!clientName) {
        showNotification('Client name is required', 'error');
        return null;
    }
    
    if (!clientEmail) {
        showNotification('Client email is required', 'error');
        return null;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
        showNotification('Please enter a valid email address', 'error');
        return null;
    }
    
    // Get shared trip information
    const numberOfAdults = parseInt(document.getElementById('numberOfAdults').value) || 2;
    const numberOfKids = parseInt(document.getElementById('numberOfKids').value) || 0;
    const startDate = formatDateForBackend(document.getElementById('startDate').value);
    const bookingDate = formatDateForBackend(document.getElementById('bookingDate').value);
    
    // Process all lead options into leads array
    const validLeads = leadOptions.map((option, index) => {
        // Calculate pricing
        let baseCost = 0;
        Object.values(option.services).forEach(serviceArray => {
            serviceArray.forEach(service => {
                baseCost += service.backendPrice || service.cost || 0;
            });
        });
        
        const markupAmount = baseCost * (option.markupPercentage / 100);
        const finalCost = baseCost + markupAmount;
        
        // Map services to backend format with proper integer IDs and preserve original IDs
        const processedServices = {
            transfers: option.services.transfers.map(s => {
                const transfer = {
                    transfer_id: parseInt(s.transferId, 10) || 0,
                    transfer_description: s.transferName || s.name || '',
                    city: s.city || '',
                    from_location: s.from || '',
                    to_location: s.to || '',
                    date: formatDateForBackend(s.date),
                    flight_number: s.flight || '',
                    flight_time: s.flightTime || '',
                    pickup_time: s.pickupTime || '',
                    tot: s.tot || 'PVT',
                    remarks: s.remarks || '',
                    total_cost: s.backendPrice || s.cost || 0,
                    discount: 0,
                    final_cost: s.backendPrice || s.cost || 0,
                    lead_id: option.leadId || null
                };
                // Include original ID if it exists (for existing services)
                if (s.id && typeof s.id === 'number') {
                    transfer.id = s.id;
                }
                return transfer;
            }),
            hotels: option.services.hotels.map(s => {
                const hotel = {
                    hotel_id: parseInt(s.hotelId, 10) || 0,
                    hotel_name: s.hotelName || s.name || '',
                    city: s.city || '',
                    from_date: formatDateForBackend(s.checkIn),
                    to_date: formatDateForBackend(s.checkOut),
                    nights: parseInt(s.nights, 10) || 1,
                    single_room_days: parseInt(s.singleRooms, 10) || 0,
                    double_room_days: parseInt(s.doubleRooms, 10) || 1,
                    triple_rooms: 0,
                    early_checkin: s.earlyCheckIn || false,
                    late_checkout: s.lateCheckOut || false,
                    room_types: (s.roomTypes || []).map(rt => {
                        const roomType = {
                            room_type_id: parseInt(rt.room_type_id, 10) || 0,
                            adults: parseInt(rt.adults, 10) || 2,
                            children: parseInt(rt.children, 10) || 0,
                            complimentary_abf: rt.complimentary_abf || false,
                            extra_adult_bed: rt.extra_adult_bed || false,
                            extra_child_bed: rt.extra_child_bed || false,
                            sharing_bed: rt.sharing_bed || false
                        };
                        // Include original room type ID if it exists
                        if (rt.id && typeof rt.id === 'number') {
                            roomType.id = rt.id;
                        }
                        return roomType;
                    }),
                    notes: s.notes || '',
                    total_cost: s.backendPrice || s.cost || 0,
                    discount: 0,
                    final_cost: s.backendPrice || s.cost || 0,
                    lead_id: option.leadId || null
                };
                // Include original ID if it exists (for existing services)
                if (s.id && typeof s.id === 'number') {
                    hotel.id = s.id;
                }
                return hotel;
            }),
            excursions: option.services.excursions.map(s => {
                const excursion = {
                    excursion_id: parseInt(s.excursionId, 10) || 0,
                    city: s.city || '',
                    date: formatDateForBackend(s.date),
                    hotel: s.hotel || '',
                    event_time: s.pickupTime || '',
                    toe: s.type || 'PVT',
                    remarks: s.remarks || '',
                    total_cost: s.backendPrice || s.cost || 0,
                    discount: 0,
                    final_cost: s.backendPrice || s.cost || 0,
                    lead_id: option.leadId || null
                };
                // Include original ID if it exists (for existing services)
                if (s.id && typeof s.id === 'number') {
                    excursion.id = s.id;
                }
                return excursion;
            }),
            tours: option.services.tours.map(s => {
                console.log('Processing tour service for submission:', s);
                
                // Ensure we're sending the correct tour_id as integer
                const tourId = parseInt(s.tourId, 10);
                if (!tourId || tourId === 0) {
                    console.error('Invalid tour_id detected:', s.tourId, 'from service:', s);
                }
                
                const tour = {
                    tour_id: tourId || 0,
                    tour_name: s.tourName || s.name || '',
                    from_location: s.city || '',
                    route: s.route || '',
                    from_date: formatDateForBackend(s.startDate),
                    to_date: formatDateForBackend(s.endDate),
                    tot: s.tot || 'PVT',
                    single_rooms: parseInt(s.singleRooms, 10) || 0,
                    double_rooms: parseInt(s.doubleRooms, 10) || 0,
                    triple_rooms: parseInt(s.tripleRooms, 10) || 0,
                    remarks: s.remarks || '',
                    total_cost: s.backendPrice || s.cost || 0,
                    discount: 0,
                    final_cost: s.backendPrice || s.cost || 0,
                    lead_id: option.leadId || null
                };
                
                // Include original ID if it exists (for existing services)
                if (s.id && typeof s.id === 'number') {
                    tour.id = s.id;
                    console.log('Including original tour service ID for update:', s.id);
                } else {
                    console.log('No original ID found, this will be treated as new tour');
                }
                
                console.log('Final tour data for submission:', tour);
                console.log('Tour ID being sent:', tour.tour_id, 'Type:', typeof tour.tour_id);
                return tour;
            }),
            flights: option.services.flights.map(s => {
                const flight = {
                    flight_name: s.flight || s.name || '',
                    flight_number: s.number || '',
                    in_or_out: s.inOut || 'Flight In',
                    route: s.route || '',
                    flight_date: formatDateForBackend(s.date),
                    departure_time: s.departureTime || '09:00',
                    arrival_time: s.arrivalTime || '12:00',
                    issued_by: s.issuedBy || '',
                    total_cost: s.cost || 0,
                    discount: 0,
                    final_cost: s.cost || 0,
                    remarks: s.remarks || '',
                    lead_id: option.leadId || null
                };
                // Include original ID if it exists (for existing services)
                if (s.id && typeof s.id === 'number') {
                    flight.id = s.id;
                }
                return flight;
            }),
            others: option.services.others.map(s => {
                const other = {
                    description: s.description || '',
                    date: formatDateForBackend(s.date),
                    total_price: s.cost || 0,
                    discount: 0,
                    final_cost: s.cost || 0,
                    lead_id: option.leadId || null
                };
                // Include original ID if it exists (for existing services)
                if (s.id && typeof s.id === 'number') {
                    other.id = s.id;
                }
                return other;
            })
        };
        
        const leadData = {
            option_name: option.optionName || `Option ${index + 1}`,
            option_order: index + 1,
            template_type: option.templateType || 'simple',
            urgency: 'low',
            number_of_adults: numberOfAdults,
            number_of_kids: numberOfKids,
            start_date: startDate,
            booking_date: bookingDate,
            markup_percentage: option.markupPercentage || 15,
            total_cost: baseCost,
            markup_amount: markupAmount,
            final_cost: finalCost,
            discount: 0,
            client_booking_reference: '',
            remarks: '',
            internal_notes: document.getElementById('internalNotes').value || '',
            client_notes: document.getElementById('clientNotes').value || '',
            ...processedServices
        };
        
        // Include original lead ID if it exists (for existing leads)
        if (option.leadId && typeof option.leadId === 'number') {
            leadData.id = option.leadId;
        }
        
        return leadData;
    });
    
    return {
        // Group metadata
        group_name: groupName,
        description: document.getElementById('groupDescription').value || '',
        expiry_days: parseInt(document.getElementById('expiryDays').value) || 3,
        internal_notes: document.getElementById('internalNotes').value || '',
        client_notes: document.getElementById('clientNotes').value || '',
        
        // Shared client information
        client_name: clientName,
        client_email: clientEmail,
        client_phone: document.getElementById('clientPhone').value || '',
        
        // Include all lead options with their services
        leads: validLeads
    };
}

// Format date from backend for HTML input (converts various formats to YYYY-MM-DD)
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    // If it's already in YYYY-MM-DD format, return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }
    
    // If it's in ISO format (2025-06-20T07:00:00+07:00), extract the date part
    if (dateString.includes('T')) {
        return dateString.split('T')[0];
    }
    
    // Try to parse and convert to YYYY-MM-DD
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return dateString; // Return as-is if can't parse
}

// Format date for display (converts various formats to DD-MM-YYYY)
function formatDateForDisplay(dateString) {
    if (!dateString) return '';
    
    // If it's already in DD-MM-YYYY format, return as is
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
        return dateString;
    }
    
    // If it's in YYYY-MM-DD format, convert to DD-MM-YYYY
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        return `${day}-${month}-${year}`;
    }
    
    // If it's in ISO format (2025-06-20T07:00:00+07:00), extract and convert
    if (dateString.includes('T')) {
        const datePart = dateString.split('T')[0];
        if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = datePart.split('-');
            return `${day}-${month}-${year}`;
        }
    }
    
    // Try to parse and convert to DD-MM-YYYY
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }
    
    return dateString; // Return as-is if can't parse
}

// Format date for backend (YYYY-MM-DD format that Go can parse easily)
function formatDateForBackend(dateString) {
    if (!dateString) return '';
    
    // If it's already in YYYY-MM-DD format from HTML date input, return as is
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
    }
    
    // If it's in DD-MM-YYYY format, convert to YYYY-MM-DD
    if (dateString.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [day, month, year] = dateString.split('-');
        return `${year}-${month}-${day}`;
    }
    
    // Otherwise, try to parse and convert to YYYY-MM-DD
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
    }
    
    return dateString; // Return as-is if can't parse
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert">
            <span>&times;</span>
        </button>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

function showButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = true;
        const originalText = button.innerHTML;
        button.dataset.originalText = originalText;
        button.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i>Loading...';
    }
}

function hideButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button && button.dataset.originalText) {
        button.disabled = false;
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
    }
}

// Search transfers by city
function searchTransfersByCity(cityDropdown, transferDropdown) {
    const selectedCity = cityDropdown.value;
    const token = localStorage.getItem('token');
    
    if (!selectedCity) return Promise.resolve();
    
    const url = new URL(`${Endpoint}/api/v1/transfers`);
    url.searchParams.append('city', selectedCity);
    
    return fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch transfers');
        return response.json();
    })
    .then(transfers => {
        transferDropdown.innerHTML = '<option value="">Select Transfer</option>';
        // Sort transfers by score in descending order (highest score first)
        transfers.sort((a, b) => (b.order || 0) - (a.order || 0));
        transfers.forEach(transfer => {
            const option = document.createElement('option');
            option.value = transfer.id;
            option.textContent = transfer.description;
            transferDropdown.appendChild(option);
        });
        return transfers;
    })
    .catch(error => {
        console.error('Error fetching transfers:', error);
        showNotification('Failed to load transfers', 'error');
        return [];
    });
}

// Search hotels by city
function searchHotelByCity(cityDropdown, hotelDropdown) {
    const selectedCity = cityDropdown.value;
    const checkInDate = document.getElementById('checkInDate').value;
    const checkOutDate = document.getElementById('checkOutDate').value;
    const token = localStorage.getItem('token');
    
    if (!selectedCity || !checkInDate || !checkOutDate) {
        showNotification('Please select city and dates first', 'warning');
        return;
    }
    
    const url = new URL(`${Endpoint}/api/v1/hotels`);
    url.searchParams.append('city', selectedCity);
    url.searchParams.append('from_date', checkInDate);
    url.searchParams.append('to_date', checkOutDate);
    url.searchParams.append('keyword', '');
    
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch hotels');
        return response.json();
    })
    .then(hotels => {
        hotelDropdown.innerHTML = '<option value="">Select Hotel</option>';
        Object.keys(selectedHotelData).forEach(key => delete selectedHotelData[key]);
        
        hotels.forEach(hotel => {
            const option = document.createElement('option');
            option.value = hotel.id;
            option.textContent = hotel.name;
            
            // Store hotel data
            selectedHotelData[hotel.id] = {
                meta: hotel.fees || {},
                room_types: hotel.room_types || [],
                promotions: hotel.promotions || []
            };
            
            hotelDropdown.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error fetching hotels:', error);
        showNotification('Failed to load hotels', 'error');
    });
}

// Search excursions by city
function searchExcursionByCity(cityDropdown, excursionDropdown) {
    const selectedCity = cityDropdown.value;
    const token = localStorage.getItem('token');
    
    if (!selectedCity) return Promise.resolve();
    
    const url = new URL(`${Endpoint}/api/v1/excursions`);
    url.searchParams.append('city', selectedCity);
    
    return fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch excursions');
        return response.json();
    })
    .then(excursions => {
        excursionDropdown.innerHTML = '<option value="">Select Excursion</option>';
        // Sort excursions by score in descending order (highest score first)
        excursions.sort((a, b) => (b.order || 0) - (a.order || 0));
        excursions.forEach(excursion => {
            const option = document.createElement('option');
            option.value = excursion.id;
            option.textContent = excursion.name;
            excursionDropdown.appendChild(option);
        });
        return excursions;
    })
    .catch(error => {
        console.error('Error fetching excursions:', error);
        showNotification('Failed to load excursions', 'error');
        return [];
    });
}

// Search tours by city
function searchToursByCity(cityDropdown, tourDropdown) {
    const selectedCity = cityDropdown.value;
    const token = localStorage.getItem('token');
    
    if (!selectedCity) return Promise.resolve();
    
    console.log('Searching tours for city:', selectedCity);
    
    const url = new URL(`${Endpoint}/api/v1/tours`);
    url.searchParams.append('city', selectedCity);
    
    return fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch tours');
        return response.json();
    })
    .then(tours => {
        console.log('Received tours data:', tours);
        
        tourDropdown.innerHTML = '<option value="">Select Tour</option>';
        // Don't reset all toursData, just add new ones
        
        tours.forEach(tour => {
            if (!tour.id) {
                console.warn('Warning: Tour object missing ID:', tour);
                return;
            }
            
            // Store tour data with all necessary fields
            toursData[tour.id] = {
                id: tour.id,
                name: tour.name,
                route: tour.route || '',
                duration: tour.duration || 1, // Default to 1 day if no duration
                city: tour.city || selectedCity
            };
            
            console.log(`Stored tour data for ID ${tour.id}:`, toursData[tour.id]);
            
            const option = document.createElement('option');
            option.value = tour.id;
            option.textContent = tour.name;
            option.setAttribute('data-route', tour.route || '');
            option.setAttribute('data-duration', tour.duration || '1');
            tourDropdown.appendChild(option);
        });
        
        console.log('Updated toursData:', toursData);
        return tours;
    })
    .catch(error => {
        console.error('Error fetching tours:', error);
        showNotification('Failed to load tours', 'error');
        return [];
    });
}

// Calculate duration from start and end dates
function calculateDurationFromDates(startDate, endDate) {
    if (!startDate || !endDate) return 1;
    
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
        
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 0 ? diffDays : 1;
    } catch (error) {
        console.error('Error calculating duration:', error);
        return 1;
    }
}

// Calculate tour end date based on start date and duration
function calculateTourEndDate() {
    const startDateInput = document.getElementById('tourStartDate');
    const endDateInput = document.getElementById('tourEndDate');
    const tourId = document.getElementById('tourName').value;
    
    console.log('=== CALCULATING TOUR END DATE ===');
    console.log('Tour ID selected:', tourId);
    console.log('Start date input value:', startDateInput.value);
    console.log('Current toursData object:', toursData);
    
    if (!tourId || !toursData[tourId]) {
        console.warn('⚠️ Tour not selected or data missing. Cannot calculate end date.');
        return;
    }
    
    const duration = toursData[tourId]?.duration;
    const startDateValue = startDateInput.value;
    
    console.log('Tour duration:', duration, 'Start date:', startDateValue);
    
    if (!startDateValue || !duration) {
        console.warn('⚠️ Start Date or Duration is missing.');
        return;
    }
    
    const startDate = new Date(startDateValue);
    startDate.setDate(startDate.getDate() + duration); // Add full duration to start date (like working version)
    
    const formattedEndDate = startDate.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
    
    // Use setTimeout like the working version to ensure proper value setting
    setTimeout(() => {
        endDateInput.value = formattedEndDate;
        console.log('✅ End Date Updated in UI:', endDateInput.value);
    }, 50);
}

// Calculate transfer price
function calculateTransferPrice() {
    const token = localStorage.getItem('token');
    const agentName = localStorage.getItem('agentname') || 'Agent';
    
    const transferCity = document.getElementById('transferCity').value;
    const transferType = document.getElementById('transferType').value;
    const transferToT = document.getElementById('transferToT').value;
    const numberOfAdults = parseInt(document.getElementById('numberOfAdults').value) || 2;
    const numberOfKids = parseInt(document.getElementById('numberOfKids').value) || 0;
    const travelDate = document.getElementById('transferDate').value;
    const pickupTime = document.getElementById('transferPickupTime').value;
    
    if (!transferCity || !transferType || !transferToT || !travelDate) {
        showNotification('Please fill all required fields first', 'warning');
        return;
    }
    
    const requestData = {
        agent_name: agentName,
        city: transferCity,
        transfer_id: parseInt(transferType, 10),
        tot: transferToT,
        number_of_kids: numberOfKids,
        number_of_adults: numberOfAdults,
        travel_date: travelDate,
        pickup_time: pickupTime || null
    };
    
    fetch(`${Endpoint}/api/v1/transfers/calculate-cost`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to calculate transfer price');
        return response.json();
    })
    .then(data => {
        document.getElementById('backendTransferPrice').value = data.final_cost.toFixed(2);
        showNotification('Transfer price calculated successfully', 'success');
    })
    .catch(error => {
        console.error('Error calculating transfer price:', error);
        showNotification('Failed to calculate transfer price', 'error');
        document.getElementById('backendTransferPrice').value = '0.00';
    });
}

// Calculate hotel price
function calculateHotelPrice() {
    const token = localStorage.getItem('token');
    const agentName = localStorage.getItem('agentname') || 'Agent';
    
    const hotelCity = document.getElementById('hotelCity').value;
    const hotelType = document.getElementById('hotelType').value;
    const checkInDate = document.getElementById('checkInDate').value;
    const checkOutDate = document.getElementById('checkOutDate').value;
    const numberOfAdults = parseInt(document.getElementById('numberOfAdults').value) || 2;
    const numberOfKids = parseInt(document.getElementById('numberOfKids').value) || 0;
    const singleRooms = parseInt(document.getElementById('singleRooms').value) || 0;
    const doubleRooms = parseInt(document.getElementById('doubleRooms').value) || 1;
    const numberOfNights = parseInt(document.getElementById('numberOfNights').value) || 1;
    
    if (!hotelCity || !hotelType || !checkInDate || !checkOutDate) {
        showNotification('Please fill all required fields first', 'warning');
        return;
    }
    
    // Collect room types data from dynamic blocks
    const roomTypesData = [];
    document.querySelectorAll('#roomTypesWrapper .room-type-block').forEach((block) => {
        const roomTypeDropdown = block.querySelector('.roomtype-dropdown');
        const roomTypeId = parseInt(roomTypeDropdown.value, 10) || 0;
        const roomTypeName = roomTypeDropdown.options[roomTypeDropdown.selectedIndex]?.textContent || '';
        
        const adults = parseInt(block.querySelector('.adults')?.value, 10) || 0;
        const children = parseInt(block.querySelector('.children')?.value, 10) || 0;
        
        const complimentaryAbf = block.querySelector('.option-checkbox[data-type="complimentary_abf"]')?.checked || false;
        const extraAdultBed = block.querySelector('.option-checkbox[data-type="extra_adult_bed"]')?.checked || false;
        const extraChildBed = block.querySelector('.option-checkbox[data-type="extra_child_bed"]')?.checked || false;
        const sharingBed = block.querySelector('.option-checkbox[data-type="sharing_bed"]')?.checked || false;
        
        if (roomTypeId) {
            roomTypesData.push({
                room_type_id: roomTypeId,
                room_type_name: roomTypeName,
                adults: adults,
                children: children,
                complimentary_abf: complimentaryAbf,
                extra_adult_bed: extraAdultBed,
                extra_child_bed: extraChildBed,
                sharing_bed: sharingBed
            });
        }
    });
    
    const requestData = {
        agent_name: agentName,
        city: hotelCity,
        hotel_id: parseInt(hotelType, 10),
        number_of_kids: numberOfKids,
        number_of_adults: numberOfAdults,
        number_of_single_rooms: singleRooms,
        number_of_double_rooms: doubleRooms,
        booking_date: document.getElementById('bookingDate').value,
        booking_start_date: checkInDate,
        booking_end_date: checkOutDate,
        number_of_nights: numberOfNights,
        room_types: roomTypesData // Include room types data
    };
    
    fetch(`${Endpoint}/api/v1/hotels/calculate-cost`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to calculate hotel price');
        return response.json();
    })
    .then(data => {
        document.getElementById('backendHotelPrice').value = data.final_cost.toFixed(2);
        showNotification('Hotel price calculated successfully', 'success');
    })
    .catch(error => {
        console.error('Error calculating hotel price:', error);
        showNotification('Failed to calculate hotel price', 'error');
        document.getElementById('backendHotelPrice').value = '0.00';
    });
}

// Calculate excursion price
function calculateExcursionPrice() {
    const token = localStorage.getItem('token');
    const agentName = localStorage.getItem('agentname') || 'Agent';
    
    const excursionCity = document.getElementById('excursionCity').value;
    const excursionName = document.getElementById('excursionName').value;
    const typeOfExcursion = document.getElementById('typeOfExcursion').value;
    const excursionDate = document.getElementById('excursionDate').value
;
    const numberOfAdults = parseInt(document.getElementById('numberOfAdults').value) || 2;
    const numberOfKids = parseInt(document.getElementById('numberOfKids').value) || 0;
    
    if (!excursionCity || !excursionName || !typeOfExcursion || !excursionDate) {
        showNotification('Please fill all required fields first', 'warning');
        return;
    }
    
    const requestData = {
        agent_name: agentName,
        city: excursionCity,
        excursion_id: parseInt(excursionName, 10),
        toe: typeOfExcursion,
        number_of_kids: numberOfKids,
        number_of_adults: numberOfAdults,
        travel_date: excursionDate
    };
    
    fetch(`${Endpoint}/api/v1/excursions/calculate-cost`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to calculate excursion price');
        return response.json();
    })
    .then(data => {
        document.getElementById('backendExcursionPrice').value = data.final_cost.toFixed(2);
        showNotification('Excursion price calculated successfully', 'success');
    })
    .catch(error => {
        console.error('Error calculating excursion price:', error);
        showNotification('Failed to calculate excursion price', 'error');
        document.getElementById('backendExcursionPrice').value = '0.00';
    });
}

// Calculate tour price
function calculateTourPrice() {
    const token = localStorage.getItem('token');
    const agentName = localStorage.getItem('agentname') || 'Agent';
    
    const tourCity = document.getElementById('tourCity').value;
    const tourName = document.getElementById('tourName').value;
    const tourToT = document.getElementById('tourToT').value;
    const tourStartDate = document.getElementById('tourStartDate').value;
    const tourEndDate = document.getElementById('tourEndDate').value;
    const numberOfAdults = parseInt(document.getElementById('numberOfAdults').value) || 2;
    const numberOfKids = parseInt(document.getElementById('numberOfKids').value) || 0;
    
    // Get room counts
    const singleRooms = document.getElementById('tourSingleRoom').checked ?
        parseInt(document.getElementById('tourSingleRoomCount').value) || 0 : 0;
    const doubleRooms = document.getElementById('tourDoubleRoom').checked ?
        parseInt(document.getElementById('tourDoubleRoomCount').value) || 0 : 0;
    const tripleRooms = document.getElementById('tourTripleRoom').checked ?
        parseInt(document.getElementById('tourTripleRoomCount').value) || 0 : 0;
    
    console.log('Calculating tour price with data:', {
        tourCity, tourName, tourToT, tourStartDate, tourEndDate,
        numberOfAdults, numberOfKids, singleRooms, doubleRooms, tripleRooms
    });
    
    if (!tourCity || !tourName || !tourToT || !tourStartDate) {
        showNotification('Please fill all required fields first', 'warning');
        return;
    }
    
    // Validate that at least one room type is selected if rooms are required
    const totalRooms = singleRooms + doubleRooms + tripleRooms;
    if (totalRooms === 0) {
        showNotification('Please select at least one room type', 'warning');
        return;
    }
    
    const requestData = {
        agent_name: agentName,
        city: tourCity,
        tour_id: parseInt(tourName, 10),
        tot: tourToT,
        number_of_kids: numberOfKids,
        number_of_adults: numberOfAdults,
        travel_date: tourStartDate,
        from_date: tourStartDate,
        to_date: tourEndDate || tourStartDate,
        single_rooms: singleRooms,
        double_rooms: doubleRooms,
        triple_rooms: tripleRooms
    };
    
    console.log('Sending tour price calculation request:', requestData);
    
    fetch(`${Endpoint}/api/v1/tours/calculate-cost`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Tour price calculation failed:', text);
                throw new Error(`Failed to calculate tour price: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Tour price calculation response:', data);
        document.getElementById('backendTourPrice').value = data.final_cost.toFixed(2);
        showNotification('Tour price calculated successfully', 'success');
    })
    .catch(error => {
        console.error('Error calculating tour price:', error);
        showNotification(`Failed to calculate tour price: ${error.message}`, 'error');
        document.getElementById('backendTourPrice').value = '0.00';
    });
}

// Update number of nights
function updateNumberOfNights() {
    const checkInDate = document.getElementById('checkInDate').value;
    const checkOutDate = document.getElementById('checkOutDate').value;
    
    if (checkInDate && checkOutDate) {
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        
        if (checkOut > checkIn) {
            const diffTime = Math.abs(checkOut - checkIn);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            document.getElementById('numberOfNights').value = diffDays;
        }
    }
}

// Load lead group for editing
async function loadLeadGroupForEdit(groupId) {
    try {
        console.log('Loading lead group for edit:', groupId);
        console.log('Current user:', currentUser);
        
        // Ensure we have a valid token
        if (!currentUser || !currentUser.token) {
            throw new Error('Authentication required. Please log in again.');
        }
        
        showButtonLoading('submitLeadGroup');
        
        const response = await fetch(`${Endpoint}/api/v1/group-proposals/${groupId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`Failed to load lead group: ${response.status} - ${errorText}`);
        }
        
        const leadGroup = await response.json();
        console.log('Lead group data loaded:', leadGroup);
        
        // Update page title and button text for edit mode
        const pageTitle = document.querySelector('.lead-group-header h2');
        if (pageTitle) {
            pageTitle.innerHTML = '<i class="fa fa-edit mr-3"></i>Edit Lead Group';
        }
        document.getElementById('submitLeadGroup').innerHTML = '<i class="fa fa-save mr-2"></i>Update Lead Group';
        
        // Populate form fields
        document.getElementById('groupName').value = leadGroup.group_name || '';
        document.getElementById('groupDescription').value = leadGroup.description || '';
        document.getElementById('clientName').value = leadGroup.client_name || '';
        document.getElementById('clientEmail').value = leadGroup.client_email || '';
        document.getElementById('clientPhone').value = leadGroup.client_phone || '';
        document.getElementById('expiryDays').value = leadGroup.expiry_days || 7;
        document.getElementById('internalNotes').value = leadGroup.internal_notes || '';
        document.getElementById('clientNotes').value = leadGroup.client_notes || '';
        
        // Set number of adults/kids from first lead if available
        if (leadGroup.leads && leadGroup.leads.length > 0) {
            document.getElementById('numberOfAdults').value = leadGroup.leads[0].number_of_adults || 2;
            document.getElementById('numberOfKids').value = leadGroup.leads[0].number_of_kids || 0;
            document.getElementById('startDate').value = formatDateForInput(leadGroup.leads[0].start_date);
            document.getElementById('bookingDate').value = formatDateForInput(leadGroup.leads[0].booking_date);
        }
        
        // Clear existing lead options
        leadOptions = [];
        document.getElementById('leadOptionsContainer').innerHTML = '';
        
        // Load each lead as a lead option
        if (leadGroup.leads && leadGroup.leads.length > 0) {
            console.log('Processing leads from group:', leadGroup.leads);
            for (const lead of leadGroup.leads) {
                const optionIndex = leadOptions.length;
                console.log(`Processing lead ${optionIndex + 1}:`, lead);
                
                const leadOption = {
                    id: Date.now() + optionIndex,
                    leadId: lead.id, // Store original lead ID for updates
                    optionName: lead.option_name || `Option ${optionIndex + 1}`,
                    templateType: lead.template_type || 'simple',
                    markupPercentage: lead.markup_percentage || 15,
                    services: {
                        hotels: Array.isArray(lead.hotels) ? lead.hotels.map(hotel => {
                            console.log('Processing hotel from backend:', hotel);
                            
                            // Extract room types data from the complex backend structure
                            let roomTypesData = [];
                            if (hotel.room_types && Array.isArray(hotel.room_types)) {
                                roomTypesData = hotel.room_types.map(rt => ({
                                    id: rt.id, // Store original room type record ID
                                    room_type_id: rt.room_type_id || 0,
                                    room_type: rt.room_type || '',
                                    adults: rt.adults || 2,
                                    children: rt.children || 0,
                                    complimentary_abf: rt.complimentary_abf || false,
                                    extra_adult_bed: rt.extra_adult_bed || false,
                                    extra_child_bed: rt.extra_child_bed || false,
                                    sharing_bed: rt.sharing_bed || false
                                }));
                                console.log('Extracted room types:', roomTypesData);
                            }
                            
                            return {
                                id: hotel.id || Date.now(),
                                name: hotel.hotel_name || 'Hotel',
                                city: hotel.city || '',
                                hotelId: hotel.hotel_id || null,
                                hotelName: hotel.hotel_name || '',
                                checkIn: hotel.from_date || hotel.check_in_date || hotel.date || '',
                                checkOut: hotel.to_date || hotel.check_out_date || '',
                                nights: hotel.nights || 1,
                                singleRooms: hotel.single_room_days || hotel.single_rooms || 0,
                                doubleRooms: hotel.double_room_days || hotel.double_rooms || 1,
                                earlyCheckIn: hotel.early_checkin || hotel.early_check_in || false,
                                lateCheckOut: hotel.late_checkout || hotel.late_check_out || false,
                                backendPrice: hotel.total_cost || hotel.final_cost || 0,
                                cost: hotel.total_cost || hotel.final_cost || 0,
                                notes: hotel.notes || hotel.remarks || '',
                                roomTypes: roomTypesData // Include the extracted room types
                            };
                        }) : [],
                        transfers: Array.isArray(lead.transfers) ? lead.transfers.map(transfer => {
                            let transferName = 'Transfer';
                            if (transfer.transfer_description) {
                                transferName = transfer.transfer_description;
                            } else if (transfer.from_location && transfer.to_location) {
                                transferName = `${transfer.from_location} to ${transfer.to_location}`;
                            } else if (transfer.city) {
                                transferName = `${transfer.city} Transfer`;
                            }
                            
                            return {
                                id: transfer.id || Date.now(),
                                name: transferName,
                                city: transfer.city || '',
                                transferId: transfer.transfer_id || null,
                                transferName: transfer.transfer_description || '',
                                date: transfer.date || '',
                                from: transfer.from_location || '',
                                to: transfer.to_location || '',
                                flight: transfer.flight_number || '',
                                flightTime: transfer.flight_time || '',
                                tot: transfer.tot || 'PVT',
                                pickupTime: transfer.pickup_time || '',
                                backendPrice: transfer.total_cost || transfer.final_cost || 0,
                                cost: transfer.total_cost || transfer.final_cost || 0,
                                remarks: transfer.remarks || ''
                            };
                        }) : [],
                        excursions: Array.isArray(lead.excursions) ? lead.excursions.map(excursion => {
                            let excursionName = 'Excursion';
                            if (excursion.excursion_name) {
                                excursionName = excursion.excursion_name;
                            } else if (excursion.city) {
                                excursionName = `${excursion.city} Excursion`;
                            }
                            
                            return {
                                id: excursion.id || Date.now(),
                                name: excursionName,
                                city: excursion.city || '',
                                excursionId: excursion.excursion_id || null,
                                excursionName: excursion.excursion_name || '',
                                date: excursion.date || '',
                                hotel: excursion.hotel || '',
                                pickupTime: excursion.event_time || '',
                                type: excursion.toe || 'PVT',
                                backendPrice: excursion.total_cost || excursion.final_cost || 0,
                                cost: excursion.total_cost || excursion.final_cost || 0,
                                remarks: excursion.remarks || ''
                            };
                        }) : [],
                        tours: Array.isArray(lead.tours) ? lead.tours.map(tour => ({
                            id: tour.id || Date.now(),
                            name: tour.tour_name || 'Tour',
                            city: tour.from_location || tour.city || '',
                            tourId: tour.tour_id || null,
                            tourName: tour.tour_name || '',
                            route: tour.route || '',
                            startDate: tour.from_date || tour.start_date || tour.date || '',
                            endDate: tour.to_date || tour.end_date || tour.date || '',
                            tot: tour.tot || 'PVT',
                            singleRooms: tour.single_rooms || 0,
                            doubleRooms: tour.double_rooms || 0,
                            tripleRooms: tour.triple_rooms || 0,
                            backendPrice: tour.total_cost || tour.final_cost || 0,
                            cost: tour.total_cost || tour.final_cost || 0,
                            remarks: tour.remarks || ''
                        })) : [],
                        flights: Array.isArray(lead.flights) ? lead.flights.map(flight => ({
                            id: flight.id || Date.now(),
                            name: flight.flight_name || flight.flight || flight.flight_number || 'Flight',
                            flight: flight.flight_name || flight.flight || flight.flight_number || '',
                            number: flight.flight_number || flight.number || '',
                            inOut: flight.in_or_out || flight.inOut || flight.in_out || 'Flight In',
                            route: flight.route || '',
                            date: flight.flight_date || flight.date || '',
                            departureTime: flight.departure_time || '09:00',
                            arrivalTime: flight.arrival_time || '12:00',
                            issuedBy: flight.issued_by || '',
                            cost: flight.total_cost || flight.final_cost || 0,
                            remarks: flight.remarks || ''
                        })) : [],
                        others: Array.isArray(lead.others) ? lead.others.map(other => ({
                            id: other.id || Date.now(),
                            name: other.description || 'Other Service',
                            description: other.description || '',
                            date: other.date || '',
                            cost: other.total_price || other.total_cost || other.final_cost || 0
                        })) : []
                    }
                };
                
                console.log('Created lead option:', leadOption);
                leadOptions.push(leadOption);
                renderLeadOption(leadOption, optionIndex);
                // Update the display to show loaded services
                updateLeadOptionDisplay(leadOption.id);
            }
        } else {
            console.log('No leads found in group, adding initial option');
            // Add at least one empty option if no leads exist
            addLeadOption();
        }
        
        updateGroupSummary();
        updateAddButtonState();
        
        console.log('Lead group loaded successfully - dropdowns will populate on city selection');
        
    } catch (error) {
        console.error('Error loading lead group:', error);
        showNotification(`Failed to load lead group: ${error.message}`, 'error');
        // Redirect back to leads page on error
        setTimeout(() => window.location.href = 'leads.html?tab=lead-groups', 2000);
    } finally {
        hideButtonLoading('submitLeadGroup');
    }
}

// Populate dropdowns for a specific city (removed - functionality moved to existing city change handlers)
// This function was causing the issue where all transfers/excursions were loaded initially
// The existing searchTransfersByCity, searchExcursionByCity, etc. functions handle this properly

// Load hotels for city and populate dropdown for editing
async function loadHotelsForCityAndPopulate(city, checkInDate, checkOutDate, hotelId, hotelName) {
    const token = localStorage.getItem('token');
    
    try {
        console.log(`Loading hotels for city: ${city}, dates: ${checkInDate} to ${checkOutDate}`);
        
        const url = new URL(`${Endpoint}/api/v1/hotels`);
        url.searchParams.append('city', city);
        url.searchParams.append('from_date', checkInDate);
        url.searchParams.append('to_date', checkOutDate);
        url.searchParams.append('keyword', '');
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch hotels');
        }
        
        const hotels = await response.json();
        console.log(`Loaded ${hotels.length} hotels for city: ${city}`);
        
        const hotelDropdown = document.getElementById('hotelType');
        hotelDropdown.innerHTML = '<option value="">Select Hotel</option>';
        
        // Clear existing hotel data
        Object.keys(selectedHotelData).forEach(key => delete selectedHotelData[key]);
        
        let hotelFound = false;
        hotels.forEach(hotel => {
            // Store hotel data for room types
            selectedHotelData[hotel.id] = {
                meta: hotel.fees || {},
                room_types: hotel.room_types || [],
                promotions: hotel.promotions || []
            };
            
            const option = document.createElement('option');
            option.value = hotel.id;
            option.textContent = hotel.name;
            hotelDropdown.appendChild(option);
            
            // Check if this is the hotel we're looking for
            if (hotel.id == hotelId || hotel.name === hotelName) {
                hotelFound = true;
                console.log(`Found matching hotel: ${hotel.name} (ID: ${hotel.id})`);
            }
        });
        
        // Set the hotel selection
        if (hotelId && hotelFound) {
            hotelDropdown.value = hotelId;
            console.log(`Selected hotel with ID: ${hotelId}`);
        } else if (hotelId && hotelName) {
            // Create a custom option if hotel not found in API response
            console.log(`Hotel not found in API, creating custom option: ${hotelName}`);
            const customOption = document.createElement('option');
            customOption.value = hotelId;
            customOption.textContent = hotelName;
            hotelDropdown.appendChild(customOption);
            hotelDropdown.value = hotelId;
        }
        
        return true;
        
    } catch (error) {
        console.error('Error loading hotels for city:', error);
        
        // Create fallback option if API fails
        if (hotelId && hotelName) {
            console.log('API failed, creating fallback hotel option');
            const hotelDropdown = document.getElementById('hotelType');
            const fallbackOption = document.createElement('option');
            fallbackOption.value = hotelId;
            fallbackOption.textContent = hotelName;
            hotelDropdown.appendChild(fallbackOption);
            hotelDropdown.value = hotelId;
        }
        
        throw error;
    }
}

// Handle room types for editing
function handleRoomTypesForEdit(service) {
    console.log('Handling room types for edit:', service);
    
    const wrapper = document.getElementById('roomTypesWrapper');
    
    // Only clear if we're not already in the middle of editing
    if (!window.editingServiceIndex && window.editingServiceIndex !== 0) {
        wrapper.innerHTML = ''; // Clear existing room type blocks only for new services
    }
    
    // Check if we have room types data from the backend
    if (service.roomTypes && service.roomTypes.length > 0) {
        console.log(`Found ${service.roomTypes.length} room types in service data`);
        
        // Clear wrapper for editing to avoid duplication
        wrapper.innerHTML = '';
        
        service.roomTypes.forEach((roomType, index) => {
            console.log(`Processing room type ${index + 1}:`, roomType);
            
            // Add a new room type block
            addRoomType();
            
            // Get the newly added block
            const blocks = wrapper.querySelectorAll('.room-type-block');
            const currentBlock = blocks[blocks.length - 1];
            
            if (currentBlock) {
                // Store the original room type record ID as a data attribute
                if (roomType.id) {
                    currentBlock.setAttribute('data-original-id', roomType.id);
                }
                
                // Populate the room type dropdown and other fields
                const roomTypeDropdown = currentBlock.querySelector('.roomtype-dropdown');
                const adultsInput = currentBlock.querySelector('.adults');
                const childrenInput = currentBlock.querySelector('.children');
                
                // Set basic values
                if (adultsInput) adultsInput.value = roomType.adults || 2;
                if (childrenInput) childrenInput.value = roomType.children || 0;
                
                // Set checkboxes
                const abfCheckbox = currentBlock.querySelector('.option-checkbox[data-type="complimentary_abf"]');
                const adultBedCheckbox = currentBlock.querySelector('.option-checkbox[data-type="extra_adult_bed"]');
                const childBedCheckbox = currentBlock.querySelector('.option-checkbox[data-type="extra_child_bed"]');
                const sharingBedCheckbox = currentBlock.querySelector('.option-checkbox[data-type="sharing_bed"]');
                
                if (abfCheckbox) abfCheckbox.checked = roomType.complimentary_abf || false;
                if (adultBedCheckbox) adultBedCheckbox.checked = roomType.extra_adult_bed || false;
                if (childBedCheckbox) childBedCheckbox.checked = roomType.extra_child_bed || false;
                if (sharingBedCheckbox) sharingBedCheckbox.checked = roomType.sharing_bed || false;
                
                // Handle room type dropdown
                if (roomTypeDropdown) {
                    // First, try to populate room types from selected hotel data
                    const hotelId = document.getElementById('hotelType').value;
                    if (hotelId && selectedHotelData[hotelId] && selectedHotelData[hotelId].room_types) {
                        console.log(`Populating room types from hotel ${hotelId}`);
                        populateRoomTypes(roomTypeDropdown, selectedHotelData[hotelId].room_types);
                        
                        // Try to select the correct room type
                        if (roomType.room_type_id) {
                            roomTypeDropdown.value = roomType.room_type_id;
                            console.log(`Selected room type ID: ${roomType.room_type_id}`);
                        }
                    } else {
                        // Create a custom option if we don't have room types data
                        console.log('No room types data available, creating custom option');
                        if (roomType.room_type_id && (roomType.room_type || roomType.room_type_name)) {
                            const customOption = document.createElement('option');
                            customOption.value = roomType.room_type_id;
                            customOption.textContent = roomType.room_type || roomType.room_type_name;
                            roomTypeDropdown.appendChild(customOption);
                            roomTypeDropdown.value = roomType.room_type_id;
                        }
                    }
                }
            }
        });
        
        console.log(`Successfully created ${service.roomTypes.length} room type blocks`);
    } else {
        console.log('No room types found in service data, adding default room type block');
        // Add at least one room type block if none exist and wrapper is empty
        if (wrapper.children.length === 0) {
            addRoomType();
        }
    }
}

// Add room type block for hotels with advanced validation and constraints
function addRoomType() {
    const singleRooms = parseInt(document.getElementById('singleRooms').value) || 0;
    const doubleRooms = parseInt(document.getElementById('doubleRooms').value) || 0;
    const totalAllowedRooms = singleRooms + doubleRooms;
    
    // Check current number of room type blocks
    const wrapper = document.getElementById('roomTypesWrapper');
    const currentRoomTypeBlocks = wrapper.querySelectorAll('.room-type-block').length;
    
    // Validation: Check if rooms are specified
    if (totalAllowedRooms === 0) {
        showNotification('Please specify the number of single or double rooms first', 'warning');
        return;
    }
    
    // Validation: Check room type limit
    if (currentRoomTypeBlocks >= totalAllowedRooms) {
        showNotification(
            `You can only add ${totalAllowedRooms} room type(s) based on your room configuration (${singleRooms} Single + ${doubleRooms} Double)`,
            'warning'
        );
        return;
    }
    
    const blockId = `roomType_${Date.now()}`;
    const roomTypeBlock = document.createElement('div');
    roomTypeBlock.className = 'room-type-block border p-3 mb-2';
    roomTypeBlock.id = blockId;
    
    roomTypeBlock.innerHTML = `
        <div class="form-row">
            <div class="form-group col-md-3">
                <label for="roomType_${blockId}">Room Type *</label>
                <select class="form-control roomtype-dropdown" id="roomType_${blockId}" required>
                    <option value="">Select Room Type</option>
                </select>
            </div>
            <div class="form-group col-md-2">
                <label for="adults_${blockId}">Adults</label>
                <input type="number" class="form-control adults" id="adults_${blockId}" min="0" value="2" />
            </div>
            <div class="form-group col-md-2">
                <label for="children_${blockId}">Children</label>
                <input type="number" class="form-control children" id="children_${blockId}" min="0" value="0" />
            </div>
            <div class="form-group col-md-4">
                <label>Options</label><br />
                <div class="form-check form-check-inline">
                    <input class="form-check-input option-checkbox" type="checkbox" data-type="complimentary_abf" id="complimentary_abf_${blockId}" />
                    <label class="form-check-label" for="complimentary_abf_${blockId}">Complimentary ABF</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input option-checkbox" type="checkbox" data-type="extra_adult_bed" id="extra_adult_bed_${blockId}" />
                    <label class="form-check-label" for="extra_adult_bed_${blockId}">Extra Adult Bed</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input option-checkbox" type="checkbox" data-type="extra_child_bed" id="extra_child_bed_${blockId}" />
                    <label class="form-check-label" for="extra_child_bed_${blockId}">Extra Child Bed</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input option-checkbox" type="checkbox" data-type="sharing_bed" id="sharing_bed_${blockId}" />
                    <label class="form-check-label" for="sharing_bed_${blockId}">Sharing Bed</label>
                </div>
            </div>
            <div class="form-group col-md-1 text-right">
                <button type="button" class="btn btn-danger btn-sm remove-room-row" onclick="removeRoomType('${blockId}')">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    wrapper.appendChild(roomTypeBlock);
    
    // Set up room type dropdown change handler for advanced checkbox management
    const roomTypeDropdown = roomTypeBlock.querySelector('.roomtype-dropdown');
    roomTypeDropdown.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (!selectedOption || !selectedOption.value) return;
        
        // Parse meal data from the selected room type
        const meals = JSON.parse(selectedOption.getAttribute('data-meals') || '{}');
        const roomTypeName = selectedOption.textContent.toLowerCase();
        
        // Get checkbox elements
        const abfCheckbox = roomTypeBlock.querySelector('.option-checkbox[data-type="complimentary_abf"]');
        const extraAdultCheckbox = roomTypeBlock.querySelector('.option-checkbox[data-type="extra_adult_bed"]');
        const extraChildCheckbox = roomTypeBlock.querySelector('.option-checkbox[data-type="extra_child_bed"]');
        const sharingBedCheckbox = roomTypeBlock.querySelector('.option-checkbox[data-type="sharing_bed"]');
        
        // Handle Complimentary ABF based on room type name
        if (abfCheckbox) {
            const enableAbf = roomTypeName.includes('abf') || roomTypeName.includes('breakfast');
            abfCheckbox.checked = enableAbf;
            abfCheckbox.disabled = !enableAbf;
        }
        
        // Handle Extra Adult Bed based on meal data
        if (extraAdultCheckbox) {
            extraAdultCheckbox.disabled = (meals.extra_bed_adult || 0) <= 0;
            extraAdultCheckbox.checked = false;
        }
        
        // Handle Extra Child Bed based on meal data
        if (extraChildCheckbox) {
            extraChildCheckbox.disabled = (meals.extra_bed_child || 0) <= 0;
            extraChildCheckbox.checked = false;
        }
        
        // Handle Sharing Bed based on meal data
        if (sharingBedCheckbox) {
            sharingBedCheckbox.disabled = (meals.extra_bed_shared || 0) <= 0;
            sharingBedCheckbox.checked = false;
        }
    });
    
    // Add event listeners for number inputs to update button state
    roomTypeBlock.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', updateAddRoomTypeButtonState);
    });
    
    // Populate room types if hotel is selected
    const hotelId = document.getElementById('hotelType').value;
    if (hotelId && selectedHotelData[hotelId]) {
        populateRoomTypesWithMealData(roomTypeDropdown, selectedHotelData[hotelId].room_types);
    }
    
    // Update button state after adding room type
    updateAddRoomTypeButtonState();
}

// Remove room type block
function removeRoomType(blockId) {
    const block = document.getElementById(blockId);
    if (block) {
        block.remove();
    }
}

// Populate room types dropdown with meal data for advanced checkbox handling
function populateRoomTypesWithMealData(dropdown, roomTypes) {
    dropdown.innerHTML = '<option value="">Select Room Type</option>';
    if (roomTypes && roomTypes.length > 0) {
        roomTypes.forEach(roomType => {
            const option = document.createElement('option');
            option.value = roomType.id;
            option.textContent = roomType.name;
            
            // Add meal data attributes for advanced checkbox handling
            option.setAttribute('data-meals', JSON.stringify({
                food_adult_abf: roomType.food_adult_abf || 0,
                food_adult_lunch: roomType.food_adult_lunch || 0,
                food_adult_dinner: roomType.food_adult_dinner || 0,
                food_adult_all_inclusive: roomType.food_adult_all_inclusive || 0,
                extra_bed_adult: roomType.extra_bed_adult || 0,
                extra_bed_child: roomType.extra_bed_child || 0,
                extra_bed_shared: roomType.extra_bed_shared || 0
            }));
            
            dropdown.appendChild(option);
        });
    }
}

// Populate room types dropdown (legacy function for backward compatibility)
function populateRoomTypes(dropdown, roomTypes) {
    populateRoomTypesWithMealData(dropdown, roomTypes);
}

// Function to check and update the Add Room Type button state
function updateAddRoomTypeButtonState() {
    const addRoomTypeBtn = document.getElementById('addRoomTypeBtn');
    
    if (!addRoomTypeBtn) return;
    
    const singleRooms = parseInt(document.getElementById('singleRooms').value, 10) || 0;
    const doubleRooms = parseInt(document.getElementById('doubleRooms').value, 10) || 0;
    const totalAllowedRooms = singleRooms + doubleRooms;
    
    const currentRoomTypes = document.querySelectorAll('#roomTypesWrapper .room-type-block').length;
    
    if (totalAllowedRooms === 0) {
        addRoomTypeBtn.disabled = true;
        addRoomTypeBtn.title = 'Please specify the number of single or double rooms first';
        addRoomTypeBtn.innerHTML = '<i class="fa fa-plus"></i> Add Room Type (Specify rooms first)';
        addRoomTypeBtn.classList.remove('btn-success');
        addRoomTypeBtn.classList.add('btn-secondary');
    } else if (currentRoomTypes >= totalAllowedRooms) {
        addRoomTypeBtn.disabled = true;
        addRoomTypeBtn.title = `Maximum ${totalAllowedRooms} room type(s) allowed`;
        addRoomTypeBtn.innerHTML = `<i class="fa fa-plus"></i> Add Room Type (${currentRoomTypes}/${totalAllowedRooms})`;
        addRoomTypeBtn.classList.remove('btn-success');
        addRoomTypeBtn.classList.add('btn-secondary');
    } else {
        addRoomTypeBtn.disabled = false;
        addRoomTypeBtn.title = 'Add a new room type';
        addRoomTypeBtn.innerHTML = `<i class="fa fa-plus"></i> Add Room Type (${currentRoomTypes}/${totalAllowedRooms})`;
        addRoomTypeBtn.classList.add('btn-success');
        addRoomTypeBtn.classList.remove('btn-secondary');
    }
}

// Set up advanced room type management system
function setupAdvancedRoomTypeManagement() {
    // Set up mutation observer to detect when new room types are added
    const roomTypesWrapper = document.getElementById('roomTypesWrapper');
    if (roomTypesWrapper) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Add event listeners to new number inputs
                    mutation.addedNodes.forEach((node) => {
                        if (node.querySelectorAll) {
                            const newInputs = node.querySelectorAll('input[type="number"]');
                            newInputs.forEach((input) => {
                                input.addEventListener('input', updateAddRoomTypeButtonState);
                            });
                        }
                    });
                    
                    // Update button state after adding a new room
                    updateAddRoomTypeButtonState();
                }
            });
        });
        
        // Start observing
        observer.observe(roomTypesWrapper, { childList: true });
    }
    
    // Listen to Single/Double Room Changes
    ['singleRooms', 'doubleRooms'].forEach((id) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function() {
                updateAddRoomTypeButtonState();
            });
        }
    });
    
    // Initial button state update
    updateAddRoomTypeButtonState();
}

// Initialize advanced room type management when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Delay setup to ensure all elements are loaded
    setTimeout(setupAdvancedRoomTypeManagement, 100);
});

// Make functions global for onclick handlers
window.toggleLeadOption = toggleLeadOption;
window.updateLeadOptionName = updateLeadOptionName;
window.updateLeadOptionTemplate = updateLeadOptionTemplate;
window.updateLeadOptionMarkup = updateLeadOptionMarkup;
window.editServiceFromOption = editServiceFromOption;
window.openServiceModal = openServiceModal;
window.removeLeadOption = removeLeadOption;
window.removeServiceFromOption = removeServiceFromOption;
window.addRoomType = addRoomType;
window.removeRoomType = removeRoomType;
window.updateAddRoomTypeButtonState = updateAddRoomTypeButtonState;
