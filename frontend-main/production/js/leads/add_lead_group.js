// Add Lead Group JavaScript - Multiple Lead Options Creation with Backend Integration
// Global variables
let currentUser = {};
let leadOptions = [];
let maxLeadOptions = 5;
let selectedHotelData = {}; // Store hotel data for room types and promotions
let roomTypeIndex = 0;
let toursData = {}; // Store tour data for route and duration
let editMode = false;
let editGroupId = null;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializeAuth();
    setupEventListeners();
    setDefaultDates();
    
    // Check if we're in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    console.log('URL parameters:', window.location.search);
    console.log('Edit ID from URL:', editId);
    
    if (editId) {
        console.log('Entering edit mode for group ID:', editId);
        editMode = true;
        editGroupId = editId;
        loadLeadGroupForEdit(editId).catch(error => {
            console.error('Failed to load lead group for editing:', error);
            showNotification(`Failed to load lead group: ${error.message}`, 'error');
            // Redirect back to leads page after showing error
            setTimeout(() => {
                window.location.href = 'leads.html?tab=lead-groups';
            }, 3000);
        });
    } else {
        console.log('Creating new lead group');
        addInitialLeadOption();
    }
    
    populateCountriesDropdown();
    populateCitiesDropdown('.city-dropdown-transfer');
    populateCitiesDropdown('.city-dropdown-hotel');
    populateCitiesDropdown('.city-dropdown-excursion');
    populateCitiesDropdown('.city-dropdown-tour');
    setupCountryCityListeners();
    setupServiceModalListeners();
});

// Authentication and user profile
function initializeAuth() {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    const agentname = localStorage.getItem('agentname');

    if (!token) {
        showNotification('Please log in to create lead groups', 'error');
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
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('bookingDate').value = today.toISOString().split('T')[0];
    document.getElementById('startDate').value = tomorrow.toISOString().split('T')[0];
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addLeadGroupForm').addEventListener('submit', handleLeadGroupSubmission);
    document.getElementById('addLeadOptionBtn').addEventListener('click', addLeadOption);
    document.getElementById('previewGroupBtn').addEventListener('click', previewLeadGroup);
}

// Setup service modal listeners
function setupServiceModalListeners() {
    // Flight modal
    document.getElementById('saveFlight').addEventListener('click', () => saveService('flights'));
    
    // Transfer modal
    document.getElementById('saveTransfer').addEventListener('click', () => saveService('transfers'));
    document.getElementById('getTransferPriceBtn').addEventListener('click', calculateTransferPrice);
    
    // Auto-populate From/To when transfer changes
    const transferTypeSelect = document.getElementById('transferType');
    if (transferTypeSelect) {
        transferTypeSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            if (selectedOption && this.value !== '') {
                const text = selectedOption.textContent.trim();
                if (text.includes('-')) {
                    const parts = text.split('-');
                    if (parts.length === 2) {
                        const fromVal = parts[0].trim();
                        const toVal = parts[1].trim();
                        const transferFromInput = document.getElementById('transferFrom');
                        const transferToInput = document.getElementById('transferTo');
                        if (transferFromInput) transferFromInput.value = fromVal;
                        if (transferToInput) transferToInput.value = toVal;
                    }
                }
            }
        });
    }
    
    // Hotel modal
    document.getElementById('saveHotelBooking').addEventListener('click', () => saveService('hotels'));
    document.getElementById('getHotelPriceBtn').addEventListener('click', calculateHotelPrice);
    document.getElementById('checkInDate').addEventListener('change', updateNumberOfNights);
    document.getElementById('checkOutDate').addEventListener('change', updateNumberOfNights);
    
    // Excursion modal
    document.getElementById('saveExcursion').addEventListener('click', () => saveService('excursions'));
    document.getElementById('getExcursionPriceBtn').addEventListener('click', calculateExcursionPrice);
    
    // Tour modal
    document.getElementById('saveTour').addEventListener('click', () => saveService('tours'));
    document.getElementById('getTourPriceBtn').addEventListener('click', calculateTourPrice);
    
    // Tour specific listeners
    document.getElementById('tourName').addEventListener('change', function() {
        const selectedTourId = this.value;
        if (selectedTourId && toursData[selectedTourId]) {
            // Update route field
            document.getElementById('tourRoute').value = toursData[selectedTourId].route || '';
            
            // Calculate end date based on duration
            calculateTourEndDate();
        } else {
            document.getElementById('tourRoute').value = '';
        }
    });
    
    document.getElementById('tourStartDate').addEventListener('change', calculateTourEndDate);
    
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

    // Transfer route type change
    document.querySelectorAll('.transfer-route-type').forEach(dropdown => {
        dropdown.addEventListener('change', function() {
            const cityDropdown = document.querySelector('.city-dropdown-transfer');
            const transferDropdown = document.querySelector('.transfer-dropdown');
            if (cityDropdown && cityDropdown.value && transferDropdown) {
                searchTransfersByCity(cityDropdown, transferDropdown);
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
function populateCitiesDropdown(selector) {
    const token = localStorage.getItem('token');
    
    fetch(`${Endpoint}/api/v1/cities`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch cities');
        }
        return response.json();
    })
    .then(data => {
        console.log('Cities API response for', selector, ':', data);
        
        // Handle different response formats
        let cities;
        if (Array.isArray(data)) {
            // Direct array of strings
            cities = data;
        } else if (data && Array.isArray(data.cities)) {
            // Object with cities array - extract city names from objects
            cities = data.cities.map(cityObj => {
                if (typeof cityObj === 'string') {
                    return cityObj;
                } else if (cityObj && cityObj.city) {
                    return cityObj.city;
                }
                return cityObj;
            });
        } else if (data && typeof data === 'object') {
            // Handle other object formats
            cities = Object.values(data).filter(item => 
                typeof item === 'string' || (item && item.city)
            ).map(item => typeof item === 'string' ? item : item.city);
        } else {
            console.error("Unexpected cities data format:", data);
            cities = [];
        }
        
        console.log('Processed city names for', selector, ':', cities.length, 'cities');
        
        if (!Array.isArray(cities)) {
            throw new Error("Invalid cities data format after processing.");
        }
        
        const cityDropdowns = document.querySelectorAll(selector);
        cityDropdowns.forEach(dropdown => {
            dropdown.innerHTML = '<option value="">Select City</option>';
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                dropdown.appendChild(option);
            });
        });
        
        console.log(`Successfully loaded ${cities.length} cities into ${cityDropdowns.length} dropdown(s) with selector: ${selector}`);
    })
    .catch(error => {
        console.error('Error fetching cities:', error);
        showNotification('Failed to load cities', 'error');
    });
}

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

// Add initial lead option
function addInitialLeadOption() {
    addLeadOption();
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
                        <label>Total Cost:</label>
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
    
    // Reset form and show appropriate modal
    const modalId = serviceType === 'others' ? 'othersModal' : `${serviceType.slice(0, -1)}Modal`;
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
    
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
    if (window.currentServiceIndex !== undefined && window.currentServiceIndex >= 0) {
        // Update existing service
        option.services[serviceArrayName][window.currentServiceIndex] = serviceData;
        // Clear editing context
        window.currentServiceIndex = undefined;
        showNotification(`${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} updated successfully`, 'success');
    } else {
        // Add new service
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
    
    // Clear room types wrapper for hotels
    if (serviceType === 'hotels') {
        document.getElementById('roomTypesWrapper').innerHTML = '';
    }
    
}

// Collect service data
function collectServiceData(serviceType) {
    switch(serviceType) {
        case 'flights':
            return {
                id: Date.now(),
                flight: document.getElementById('flight').value,
                number: document.getElementById('number').value,
                inOut: document.getElementById('flightInOut').value,
                route: (document.getElementById('flightFrom') && document.getElementById('flightTo')) ? `${document.getElementById('flightFrom').value.trim()}-${document.getElementById('flightTo').value.trim()}` : '',
                date: formatDateForBackend(document.getElementById('flightDate').value),
                departureTime: document.getElementById('departureTime').value,
                arrivalTime: document.getElementById('arrivalTime').value,
                issuedBy: document.getElementById('issuedBy').value,
                cost: parseFloat(document.getElementById('flightCost').value) || 0,
                remarks: document.getElementById('flightRemarks').value,
                name: document.getElementById('flight').value,
                city: document.getElementById('flightCity')?.value || ''
            };
            
        case 'transfers':
            return {
                id: Date.now(),
                city: document.getElementById('transferCity').value,
                transferId: document.getElementById('transferType').value,
                transferType: document.getElementById('transferToT').value,
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
            
            return {
                id: Date.now(),
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
            
        case 'excursions':
            return {
                id: Date.now(),
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
            
        case 'tours':
            return {
                id: Date.now(),
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
            
        case 'others':
            return {
                id: Date.now(),
                description: document.getElementById('otherDescription').value,
                date: formatDateForBackend(document.getElementById('otherDate').value),
                cost: parseFloat(document.getElementById('otherCost').value) || 0,
                name: document.getElementById('otherDescription').value
            };
            
        default:
            return null;
    }
}

// Get service array name
function getServiceArrayName(serviceType) {
    const mapping = {
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
                <th>Arrival Time</th>
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
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-warning ml-1" onclick="editService(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
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
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-warning ml-1" onclick="editService(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        case 'hotels':
            // Build room display with room type names and single/double format
            let roomsDisplay = `${service.singleRooms || 0}S, ${service.doubleRooms || 0}D`;
            
            // Add room type names if available
            if (service.roomTypes && Array.isArray(service.roomTypes) && service.roomTypes.length > 0) {
                const roomTypeNames = service.roomTypes.map(rt => rt.room_type_name || rt.name).filter(name => name);
                if (roomTypeNames.length > 0) {
                    roomsDisplay = `${roomTypeNames.join(', ')} (${roomsDisplay})`;
                }
            }
            
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
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-warning ml-1" onclick="editService(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
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
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-warning ml-1" onclick="editService(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
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
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-warning ml-1" onclick="editService(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
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
                        <button type="button" class="btn btn-sm btn-danger" onclick="removeServiceFromOption(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-trash"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-warning ml-1" onclick="editService(${optionId}, '${serviceType}', ${index})">
                            <i class="fa fa-edit"></i>
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
    
    if (leadOptions.length < 2 && !editMode) {
        showNotification('Please add at least 2 lead options', 'warning');
        return;
    }
    
    const leadGroupData = collectLeadGroupFormData();
    if (!leadGroupData) return;
    
    // Add comprehensive debug logging
    console.log('=== LEAD GROUP SUBMISSION DEBUG ===');
    console.log('Edit Mode:', editMode);
    console.log('Lead Group Data Structure Check:');
    console.log('- group_name:', leadGroupData.group_name);
    console.log('- client_name:', leadGroupData.client_name);
    console.log('- client_email:', leadGroupData.client_email);
    console.log('- leads array length:', leadGroupData.leads?.length || 0);
    
    // Check each lead structure
    if (leadGroupData.leads) {
        leadGroupData.leads.forEach((lead, index) => {
            console.log(`Lead ${index + 1} structure:`, {
                option_name: lead.option_name,
                number_of_adults: lead.number_of_adults,
                start_date: lead.start_date,
                booking_date: lead.booking_date,
                services_count: {
                    flights: lead.flights?.length || 0,
                    transfers: lead.transfers?.length || 0,
                    hotels: lead.hotels?.length || 0,
                    excursions: lead.excursions?.length || 0,
                    tours: lead.tours?.length || 0,
                    others: lead.others?.length || 0
                }
            });
        });
    }
    
    console.log('Full Lead Group Data:', JSON.stringify(leadGroupData, null, 2));
    console.log('Number of leads:', leadGroupData.leads?.length || 0);
    
    // Validate each lead's services
    if (leadGroupData.leads) {
        leadGroupData.leads.forEach((lead, index) => {
            console.log(`Lead ${index + 1} services:`, {
                hotels: lead.hotels?.length || 0,
                transfers: lead.transfers?.length || 0,
                excursions: lead.excursions?.length || 0,
                tours: lead.tours?.length || 0,
                flights: lead.flights?.length || 0,
                others: lead.others?.length || 0
            });
            
            // Log any services with potential validation issues
            if (lead.hotels) {
                lead.hotels.forEach((hotel, hIndex) => {
                    if (!hotel.hotel_id || hotel.hotel_id <= 0) {
                        console.warn(`Lead ${index + 1}, Hotel ${hIndex + 1}: Invalid hotel_id (${hotel.hotel_id})`);
                    }
                    if (!hotel.hotel_name) {
                        console.warn(`Lead ${index + 1}, Hotel ${hIndex + 1}: Missing hotel_name`);
                    }
                    if (!hotel.from_date || !hotel.to_date) {
                        console.warn(`Lead ${index + 1}, Hotel ${hIndex + 1}: Missing dates`);
                    }
                });
            }
            
            if (lead.excursions) {
                lead.excursions.forEach((excursion, eIndex) => {
                    if (!excursion.excursion_id || excursion.excursion_id <= 0) {
                        console.warn(`Lead ${index + 1}, Excursion ${eIndex + 1}: Invalid excursion_id (${excursion.excursion_id})`);
                    }
                    if (!excursion.date) {
                        console.warn(`Lead ${index + 1}, Excursion ${eIndex + 1}: Missing date`);
                    }
                });
            }
            
            if (lead.tours) {
                lead.tours.forEach((tour, tIndex) => {
                    if (!tour.tour_id || tour.tour_id <= 0) {
                        console.warn(`Lead ${index + 1}, Tour ${tIndex + 1}: Invalid tour_id (${tour.tour_id})`);
                    }
                    if (!tour.tour_name) {
                        console.warn(`Lead ${index + 1}, Tour ${tIndex + 1}: Missing tour_name`);
                    }
                    if (!tour.from_date || !tour.to_date) {
                        console.warn(`Lead ${index + 1}, Tour ${tIndex + 1}: Missing dates`);
                    }
                });
            }
        });
    }
    
    try {
        showButtonLoading('submitLeadGroup');
        
        const url = editMode
            ? `${Endpoint}/api/v1/group-proposals/${editGroupId}`
            : `${Endpoint}/api/v1/group-proposals`;
        
        const method = editMode ? 'PUT' : 'POST';
        
        console.log('Making request to:', url);
        console.log('Method:', method);
        console.log('Headers:', {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token ? '[TOKEN_PRESENT]' : '[NO_TOKEN]'}`
        });
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(leadGroupData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (parseError) {
                console.error('Failed to parse error response as JSON:', parseError);
                errorMessage = errorText || errorMessage;
            }
            
            throw new Error(errorMessage);
        }
        
        const responseData = await response.json();
        console.log('Success response:', responseData);
        
        const successMessage = editMode
            ? 'Lead group updated successfully!'
            : 'Lead group created successfully!';
        
        showNotification(successMessage, 'success');
        // Redirect to leads page with lead groups tab active after 60 seconds
        setTimeout(() => window.location.href = 'leads.html?tab=lead-groups', 300);
        
    } catch (error) {
        console.error(`=== LEAD GROUP ${editMode ? 'UPDATE' : 'CREATION'} ERROR ===`);
        console.error('Error details:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        showNotification(`Failed to ${editMode ? 'update' : 'create'} lead group: ${error.message}`, 'error');
    } finally {
        hideButtonLoading('submitLeadGroup');
        console.log('=== END LEAD GROUP SUBMISSION DEBUG ===');
    }
}

// Collect lead group form data
function collectLeadGroupFormData() {
    const form = document.getElementById('addLeadGroupForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return null;
    }
    
    // Validate required form fields
    const groupName = document.getElementById('groupName').value.trim();
    const clientName = document.getElementById('clientName').value.trim();
    const clientEmail = document.getElementById('clientEmail').value.trim();
    const numberOfAdults = parseInt(document.getElementById('numberOfAdults').value) || 0;
    const startDate = document.getElementById('startDate').value;
    const bookingDate = document.getElementById('bookingDate').value;
    
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
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
        showNotification('Please enter a valid email address', 'error');
        return null;
    }
    
    if (numberOfAdults < 1) {
        showNotification('Number of adults must be at least 1', 'error');
        return null;
    }
    
    if (!startDate) {
        showNotification('Start date is required', 'error');
        return null;
    }
    
    if (!bookingDate) {
        showNotification('Booking date is required', 'error');
        return null;
    }
    
    // Validate that all options have services
    const optionsWithoutServices = leadOptions.filter(option => {
        const totalServices = Object.values(option.services).reduce((sum, arr) => sum + arr.length, 0);
        return totalServices === 0;
    });
    
    if (optionsWithoutServices.length > 0) {
        showNotification('All lead options must have at least one service', 'warning');
        return null;
    }
    
    // Convert lead options to API format
    const leads = leadOptions.map(option => {
        let baseCost = 0;
        Object.values(option.services).forEach(serviceArray => {
            serviceArray.forEach(service => {
                baseCost += service.backendPrice || service.cost || 0;
            });
        });
        
        const markupAmount = baseCost * (option.markupPercentage / 100);
        const finalCost = baseCost + markupAmount;
        
        // Filter and prepare services - only include valid services
        const validFlights = option.services.flights.filter(s => s.flight || s.name);
        const validTransfers = option.services.transfers.filter(s => {
            const transferId = parseInt(s.transferId, 10);
            return transferId && transferId > 0;
        });
        const validHotels = option.services.hotels.filter(s => {
            const hotelId = parseInt(s.hotelId, 10);
            return hotelId && hotelId > 0;
        });
        const validExcursions = option.services.excursions.filter(s => {
            const excursionId = parseInt(s.excursionId, 10);
            return excursionId && excursionId > 0;
        });
        const validTours = option.services.tours.filter(s => {
            const tourId = parseInt(s.tourId, 10);
            return tourId && tourId > 0;
        });
        const validOthers = option.services.others.filter(s => s.description || s.name);
        
        // Create a minimal lead structure that matches CreateLeadRequest exactly
        const leadData = {
            // Required fields from CreateLeadRequest
            client_name: clientName,
            client_email: clientEmail,
            client_phone: document.getElementById('clientPhone').value || '',
            number_of_adults: numberOfAdults,
            number_of_kids: parseInt(document.getElementById('numberOfKids').value) || 0,
            start_date: startDate,
            booking_date: bookingDate,
            client_booking_reference: '',
            remarks: '',
            urgency: '',
            
            // Lead-specific settings
            markup_percentage: option.markupPercentage || 0,
            template_type: option.templateType || 'simple',
            option_name: option.optionName || 'Option 1',
            expiry_days: parseInt(document.getElementById('expiryDays').value) || 3,
            internal_notes: document.getElementById('internalNotes').value || '',
            client_notes: document.getElementById('clientNotes').value || '',
            
            // Additional fields
            base_cost: baseCost,
            markup_amount: markupAmount,
            final_cost: finalCost,
            
            // Convert services to API format matching backend JSON field names
            // Only include services that have valid data to avoid validation errors
            flights: validFlights.map(s => ({
                flight_name: s.flight || s.name || 'Flight',
                flight_number: s.number || s.flight || '',
                in_or_out: s.inOut || 'Flight In',
                route: s.route || '',
                flight_date: formatDateForBackend(s.date) || formatDateForBackend(document.getElementById('startDate').value),
                departure_time: s.departureTime || '09:00',
                arrival_time: s.arrivalTime || '12:00',
                issued_by: s.issuedBy || '',
                total_cost: Math.max(0, s.finalCost || s.cost || 0),
                discount: 0,
                final_cost: Math.max(0, s.finalCost || s.cost || 0),
                city: s.city || '',
                remarks: s.remarks || ''
            })),
            transfers: validTransfers.map(s => ({
                transfer_id: parseInt(s.transferId, 10) || 0,
                transfer_type: s.transferType || 'Private',
                transfer_name: s.transferName || s.name || 'Transfer',
                transfer_description: s.transferName || s.name || 'Transfer',
                city: s.city || '',
                from_location: s.from || 'From',
                to_location: s.to || 'To',
                date: formatDateForBackend(s.date) || formatDateForBackend(document.getElementById('startDate').value),
                flight_time: s.flightTime || '',
                flight: s.flight || '',
                pickup_time: s.pickupTime || '09:00',
                flight_number: s.flight || '',
                tot: s.tot || 'PVT',
                remarks: s.remarks || '',
                backend_price: s.backendPrice || s.cost || 0,
                manual_cost: null,
                total_cost: Math.max(0, s.finalCost || s.cost || 0),
                discount: 0,
                final_cost: Math.max(0, s.finalCost || s.cost || 0)
            })),
            hotels: validHotels.map(s => ({
                hotel_id: parseInt(s.hotelId, 10) || 0,
                room_id: parseInt(s.roomId, 10) || 1, // Use actual room ID or default to 1
                from_date: formatDateForBackend(s.checkIn || s.date) || formatDateForBackend(document.getElementById('startDate').value),
                to_date: formatDateForBackend(s.checkOut || s.date) || formatDateForBackend(document.getElementById('startDate').value),
                city: s.city || 'City',
                hotel_name: s.hotelName || s.name || 'Hotel',
                nights: Math.max(1, s.nights || 1),
                single_room_days: s.singleRooms || 0,
                double_room_days: s.doubleRooms || 1,
                abf_notes: '',
                lunch_notes: '',
                dinner_notes: '',
                all_inclusive_notes: '',
                days_abf: 0,
                days_lunch: 0,
                days_dinner: 0,
                days_all_inclusive: 0,
                all_inclusive: false,
                abf_include: false,
                lunch_include: false,
                dinner_include: false,
                early_checkin: s.earlyCheckIn || false,
                late_checkout: s.lateCheckOut || false,
                day_use: false,
                christmas_dinner: false,
                newyear_dinner: false,
                promotion: '',
                free_nights: 0,
                discount_percentage: 0,
                flight_in: '',
                flight_out: '',
                flight_info: '',
                notes: s.notes || '',
                total_cost: Math.max(0, s.finalCost || s.cost || 0),
                discount: 0,
                final_cost: Math.max(0, s.finalCost || s.cost || 0),
                room_types: (s.roomTypes || []).map(rt => ({
                    room_type_id: parseInt(rt.room_type_id, 10) || 0,
                    room_type: rt.room_type_name || '',
                    adults: parseInt(rt.adults, 10) || 0,
                    children: parseInt(rt.children, 10) || 0,
                    complimentary_abf: rt.complimentary_abf || false,
                    extra_adult_bed: rt.extra_adult_bed || false,
                    extra_child_bed: rt.extra_child_bed || false,
                    sharing_bed: rt.sharing_bed || false
                }))
            })),
            excursions: validExcursions.map(s => ({
                excursion_id: parseInt(s.excursionId, 10) || 0,
                excursion_name: s.excursionName || s.name || 'Excursion',
                city: s.city || '',
                toe: s.type || 'PVT',
                date: formatDateForBackend(s.date) || formatDateForBackend(document.getElementById('startDate').value),
                event_time: s.pickupTime || '09:00',
                hotel: s.hotel || 'Hotel',
                remarks: s.remarks || '',
                total_cost: Math.max(0, s.finalCost || s.cost || 0),
                discount: 0,
                final_cost: Math.max(0, s.finalCost || s.cost || 0)
            })),
            tours: validTours.map(s => ({
                tour_id: parseInt(s.tourId, 10) || 0,
                tour_name: s.tourName || s.name || 'Tour',
                tot: s.tot || 'PVT',
                from_location: s.city || '',
                from_date: formatDateForBackend(s.startDate || s.date) || formatDateForBackend(document.getElementById('startDate').value),
                to_date: formatDateForBackend(s.endDate || s.date) || formatDateForBackend(document.getElementById('startDate').value),
                route: s.route || 'Route',
                departure_time: '09:00',
                arrival_time: '18:00',
                flight_in: '',
                flight_out: '',
                remarks: s.remarks || '',
                single_rooms: parseInt(s.singleRooms, 10) || 0,
                double_rooms: parseInt(s.doubleRooms, 10) || 0,
                triple_rooms: parseInt(s.tripleRooms, 10) || 0,
                total_cost: Math.max(0, s.finalCost || s.cost || 0),
                discount: 0,
                final_cost: Math.max(0, s.finalCost || s.cost || 0)
            })),
            others: validOthers.map(s => ({
                description: s.description || s.name || 'Other Service',
                date: formatDateForBackend(s.date) || formatDateForBackend(document.getElementById('startDate').value),
                total_price: Math.max(0, s.finalCost || s.cost || 0),
                remarks: s.remarks || ''
            }))
        };
        
        return leadData;
    });
    
    // Filter out leads that have no valid services after filtering
    const validLeads = leads.filter(lead => {
        const totalServices = lead.flights.length + lead.transfers.length + lead.hotels.length +
                             lead.excursions.length + lead.tours.length + lead.others.length;
        return totalServices > 0;
    });
    
    if (validLeads.length === 0) {
        showNotification('At least one lead option must have valid services', 'error');
        return null;
    }
    
    // Return the complete lead group data with all lead options
    const leadGroupData = {
        group_name: groupName,
        description: document.getElementById('groupDescription').value || '',
        client_name: clientName,
        client_email: clientEmail,
        client_phone: document.getElementById('clientPhone').value || '',
        expiry_days: parseInt(document.getElementById('expiryDays').value) || 3,
        internal_notes: document.getElementById('internalNotes').value || '',
        client_notes: document.getElementById('clientNotes').value || '',
        leads: validLeads
    };
    
    console.log('=== FINAL LEAD GROUP DATA ===');
    console.log('Lead group structure:', JSON.stringify(leadGroupData, null, 2));
    console.log('Number of leads being sent:', leadGroupData.leads.length);
    
    return leadGroupData;
}

function formatTimeToHHMM(timeStr) {
  if (!timeStr) return "";
  const normalized = String(timeStr).trim().toLowerCase();
  if (normalized === "undefined" || normalized === "null" || normalized === "n/a" || normalized === "-" || normalized === "nan" || normalized === "--:--") {
    return "";
  }
  let t = timeStr;
  if (t.includes("T")) {
    const parts = t.split("T");
    if (parts.length === 2) {
      t = parts[1];
    }
  } else if (t.includes(" ")) {
    const parts = t.split(" ");
    if (parts.length === 2) {
      t = parts[1];
    }
  }
  if (t.includes("+")) {
    t = t.split("+")[0];
  }
  if (t.includes("-")) {
    t = t.split("-")[0];
  }
  if (t.endsWith("Z") || t.endsWith("z")) {
    t = t.substring(0, t.length - 1);
  }
  const timeParts = t.split(":");
  if (timeParts.length >= 2) {
    return `${timeParts[0].padStart(2, '0').trim()}:${timeParts[1].padStart(2, '0').trim()}`;
  }
  if (/^\d{4}$/.test(t)) {
    return `${t.substring(0, 2)}:${t.substring(2, 4)}`;
  }
  return timeStr;
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
    
    try {
        // Handle different input formats
        let date;
        
        // If it's in YYYY-MM-DD format
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateString + 'T00:00:00');
        }
        // If it's in ISO format (2025-06-20T07:00:00+07:00), extract the date part
        else if (dateString.includes('T')) {
            date = new Date(dateString.split('T')[0] + 'T00:00:00');
        }
        // Try to parse as-is
        else {
            date = new Date(dateString);
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return dateString; // Return as-is if can't parse
        }
        
        // Format as DD-MM-YYYY
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}-${month}-${year}`;
    } catch (error) {
        console.error('Error formatting date for display:', error);
        return dateString; // Return as-is if there's an error
    }
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
    const transferRouteType = document.getElementById("transferRouteType")?.value;
    const token = localStorage.getItem('token');
    
    if (!selectedCity) return;
    
    const url = new URL(`${Endpoint}/api/v1/transfers`);
    url.searchParams.append('city', selectedCity);
    if (transferRouteType) {
        url.searchParams.append('transfer_type', transferRouteType);
    }
    
    fetch(url, {
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
    })
    .catch(error => {
        console.error('Error fetching transfers:', error);
        showNotification('Failed to load transfers', 'error');
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
        return Promise.reject('Missing city or dates');
    }
    
    const url = new URL(`${Endpoint}/api/v1/hotels`);
    url.searchParams.append('city', selectedCity);
    url.searchParams.append('from_date', checkInDate);
    url.searchParams.append('to_date', checkOutDate);
    url.searchParams.append('keyword', '');
    
    return fetch(url, {
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
            
            // Display hotel name with room type information
            const roomTypeInfo = hotel.room_types && hotel.room_types.length > 0
                ? ` (${hotel.room_types.map(rt => rt.name).join(', ')})`
                : '';
            option.textContent = hotel.name + roomTypeInfo;
            
            // Store hotel data
            selectedHotelData[hotel.id] = {
                meta: hotel.fees || {},
                room_types: hotel.room_types || [],
                promotions: hotel.promotions || []
            };
            
            hotelDropdown.appendChild(option);
        });
        
        // Update hotel room info display
        updateHotelRoomInfo();
        
        return hotels; // Return hotels for chaining
    })
    .catch(error => {
        console.error('Error fetching hotels:', error);
        showNotification('Failed to load hotels', 'error');
        throw error;
    });
}

// Search excursions by city
function searchExcursionByCity(cityDropdown, excursionDropdown) {
    const selectedCity = cityDropdown.value;
    const token = localStorage.getItem('token');
    
    if (!selectedCity) return;
    
    const url = new URL(`${Endpoint}/api/v1/excursions`);
    url.searchParams.append('city', selectedCity);
    
    fetch(url, {
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
    })
    .catch(error => {
        console.error('Error fetching excursions:', error);
        showNotification('Failed to load excursions', 'error');
    });
}

// Search tours by city
function searchToursByCity(cityDropdown, tourDropdown) {
    const selectedCity = cityDropdown.value;
    const token = localStorage.getItem('token');
    
    if (!selectedCity) return;
    
    const url = new URL(`${Endpoint}/api/v1/tours`);
    url.searchParams.append('city', selectedCity);
    
    fetch(url, {
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
        tourDropdown.innerHTML = '<option value="">Select Tour</option>';
        toursData = {}; // Reset stored tours
        
        tours.forEach(tour => {
            if (!tour.id) {
                console.warn('Warning: Tour object missing ID:', tour);
                return;
            }
            
            // Store tour data
            toursData[tour.id] = tour;
            
            const option = document.createElement('option');
            option.value = tour.id;
            option.textContent = tour.name;
            option.setAttribute('data-route', tour.route || '');
            option.setAttribute('data-duration', tour.duration || '');
            tourDropdown.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error fetching tours:', error);
        showNotification('Failed to load tours', 'error');
    });
}

// Calculate tour end date based on start date and duration
function calculateTourEndDate() {
    const tourName = document.getElementById('tourName').value;
    const tourStartDate = document.getElementById('tourStartDate').value;
    
    if (!tourName || !tourStartDate) {
        console.warn("⚠️ Tour not selected or start date missing. Cannot calculate end date.");
        return;
    }
    
    const tourData = toursData[tourName];
    if (!tourData || !tourData.duration) {
        console.warn("⚠️ Tour data or duration missing for tour ID:", tourName);
        console.log("Available tours data:", toursData);
        return;
    }
    
    console.log(`✅ Calculating end date for tour: ${tourData.name}, Duration: ${tourData.duration} days`);
    
    const startDate = new Date(tourStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + tourData.duration); // Add duration to start date
    
    const formattedEndDate = endDate.toISOString().split("T")[0]; // Convert to YYYY-MM-DD
    
    setTimeout(() => {
        document.getElementById('tourEndDate').value = formattedEndDate;
        console.log("✅ End Date Updated in UI:", formattedEndDate);
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
    const excursionDate = document.getElementById('excursionDate').value;
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
    
    if (!tourCity || !tourName || !tourToT || !tourStartDate) {
        showNotification('Please fill all required fields first', 'warning');
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
    
    fetch(`${Endpoint}/api/v1/tours/calculate-cost`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to calculate tour price');
        return response.json();
    })
    .then(data => {
        document.getElementById('backendTourPrice').value = data.final_cost.toFixed(2);
        showNotification('Tour price calculated successfully', 'success');
    })
    .catch(error => {
        console.error('Error calculating tour price:', error);
        showNotification('Failed to calculate tour price', 'error');
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
                    optionName: lead.option_name || `Option ${optionIndex + 1}`,
                    templateType: lead.template_type || 'simple',
                    markupPercentage: lead.markup_percentage || 15,
                    services: {
                        hotels: Array.isArray(lead.hotels) ? lead.hotels.map(hotel => ({
                            id: hotel.id || Date.now(),
                            name: hotel.hotel_name || 'Hotel',
                            city: hotel.city || '',
                            hotelId: hotel.hotel_id || null,
                            hotelName: hotel.hotel_name || '',
                            checkIn: hotel.check_in_date || hotel.date || '',
                            checkOut: hotel.check_out_date || '',
                            nights: hotel.nights || 1,
                            singleRooms: hotel.single_rooms || 0,
                            doubleRooms: hotel.double_rooms || 1,
                            earlyCheckIn: hotel.early_check_in || false,
                            lateCheckOut: hotel.late_check_out || false,
                            backendPrice: hotel.total_cost || hotel.final_cost || 0,
                            cost: hotel.total_cost || hotel.final_cost || 0,
                            notes: hotel.remarks || ''
                        })) : [],
                        transfers: Array.isArray(lead.transfers) ? lead.transfers.map(transfer => ({
                            id: transfer.id || Date.now(),
                            name: transfer.transfer_description || `${transfer.from_location || 'From'} to ${transfer.to_location || 'To'}`,
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
                        })) : [],
                        excursions: Array.isArray(lead.excursions) ? lead.excursions.map(excursion => ({
                            id: excursion.id || Date.now(),
                            name: excursion.excursion_name || 'Excursion',
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
                        })) : [],
                        tours: Array.isArray(lead.tours) ? lead.tours.map(tour => ({
                            id: tour.id || Date.now(),
                            name: tour.tour_name || 'Tour',
                            city: tour.city || '',
                            tourId: tour.tour_id || null,
                            tourName: tour.tour_name || '',
                            route: tour.route || '',
                            startDate: tour.start_date || tour.date || '',
                            endDate: tour.end_date || tour.date || '',
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
                            name: flight.flight || flight.flight_number || 'Flight',
                            flight: flight.flight || flight.flight_number || '',
                            number: flight.number || flight.flight_number || '',
                            inOut: flight.inOut || flight.in_out || 'Flight In',
                            route: flight.route || '',
                            date: flight.date || '',
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
                            cost: other.total_cost || other.final_cost || 0,
                            remarks: other.remarks || ''
                        })) : []
                    }
                };
                
                console.log('Created lead option:', leadOption);
                leadOptions.push(leadOption);
                renderLeadOption(leadOption, optionIndex);
            }
        } else {
            console.log('No leads found in group, adding initial option');
            // Add at least one empty option if no leads exist
            addInitialLeadOption();
        }
        
        updateGroupSummary();
        updateAddButtonState();
        
    } catch (error) {
        console.error('Error loading lead group:', error);
        showNotification(`Failed to load lead group: ${error.message}`, 'error');
        // Redirect back to leads page on error
        setTimeout(() => window.location.href = 'leads.html?tab=lead-groups', 2000);
    } finally {
        hideButtonLoading('submitLeadGroup');
    }
}

// Add room type block for hotels
function addRoomType() {
    const wrapper = document.getElementById('roomTypesWrapper');
    const blockId = `roomType_${Date.now()}`;
    
    const roomTypeBlock = document.createElement('div');
    roomTypeBlock.className = 'room-type-block border p-3 mb-2'; // Always use proper styling classes
    roomTypeBlock.id = blockId;
    roomTypeBlock.innerHTML = `
        <div class="form-row">
            <div class="form-group col-md-4">
                <label>Room Type</label>
                <select class="form-control roomtype-dropdown" required>
                    <option value="">Select Room Type</option>
                </select>
            </div>
            <div class="form-group col-md-2">
                <label>Adults</label>
                <input type="number" class="form-control adults" value="2" min="1" required>
            </div>
            <div class="form-group col-md-2">
                <label>Children</label>
                <input type="number" class="form-control children" value="0" min="0">
            </div>
            <div class="form-group col-md-3">
                <label>&nbsp;</label>
                <button type="button" class="btn btn-danger btn-sm btn-block btn-remove" onclick="removeRoomType('${blockId}')">
                    <i class="fa fa-trash"></i> Remove
                </button>
            </div>
        </div>
        <div class="form-row mt-2">
            <div class="col-md-12">
                <div class="form-check form-check-inline option-checkbox">
                    <input type="checkbox" class="form-check-input" id="${blockId}_abf" data-type="complimentary_abf">
                    <label class="form-check-label" for="${blockId}_abf">Complimentary ABF</label>
                </div>
                <div class="form-check form-check-inline option-checkbox">
                    <input type="checkbox" class="form-check-input" id="${blockId}_adult_bed" data-type="extra_adult_bed">
                    <label class="form-check-label" for="${blockId}_adult_bed">Extra Adult Bed</label>
                </div>
                <div class="form-check form-check-inline option-checkbox">
                    <input type="checkbox" class="form-check-input" id="${blockId}_child_bed" data-type="extra_child_bed">
                    <label class="form-check-label" for="${blockId}_child_bed">Extra Child Bed</label>
                </div>
                <div class="form-check form-check-inline option-checkbox">
                    <input type="checkbox" class="form-check-input" id="${blockId}_sharing" data-type="sharing_bed">
                    <label class="form-check-label" for="${blockId}_sharing">Sharing Bed</label>
                </div>
            </div>
        </div>
    `;
    
    wrapper.appendChild(roomTypeBlock);
    
    // Populate room types if hotel is selected
    const hotelId = document.getElementById('hotelType').value;
    if (hotelId && selectedHotelData[hotelId]) {
        populateRoomTypes(roomTypeBlock.querySelector('.roomtype-dropdown'), selectedHotelData[hotelId].room_types);
    }
}

// Remove room type block
function removeRoomType(blockId) {
    const block = document.getElementById(blockId);
    if (block) {
        block.remove();
    }
}

// Populate room types dropdown
function populateRoomTypes(dropdown, roomTypes) {
    dropdown.innerHTML = '<option value="">Select Room Type</option>';
    if (roomTypes && roomTypes.length > 0) {
        roomTypes.forEach(roomType => {
            const option = document.createElement('option');
            option.value = roomType.id;
            option.textContent = roomType.name;
            dropdown.appendChild(option);
        });
    }
}

// Make functions global for onclick handlers
window.toggleLeadOption = toggleLeadOption;
window.updateLeadOptionName = updateLeadOptionName;
window.updateLeadOptionTemplate = updateLeadOptionTemplate;
window.updateLeadOptionMarkup = updateLeadOptionMarkup;
window.openServiceModal = openServiceModal;
window.removeLeadOption = removeLeadOption;
window.removeServiceFromOption = removeServiceFromOption;
window.addRoomType = addRoomType;
window.removeRoomType = removeRoomType;

// Edit individual fields function
function editIndividualFields(optionId) {
    showNotification('Individual field editing functionality will be implemented soon', 'info');
}

// Edit service function (new format)
function editService(optionId, serviceType, serviceIndex) {
    const option = leadOptions.find(opt => opt.id === optionId);
    if (!option || !option.services[serviceType] || !option.services[serviceType][serviceIndex]) {
        showNotification('Service not found', 'error');
        return;
    }
    
    const service = option.services[serviceType][serviceIndex];
    
    // Store current editing context
    window.currentOptionId = optionId;
    window.currentServiceType = serviceType;
    window.currentServiceIndex = serviceIndex;
    
    // Populate modal with existing service data
    populateServiceModal(serviceType, service);
    
    // Open the appropriate modal
    const modalId = serviceType === 'others' ? 'othersModal' : `${serviceType.slice(0, -1)}Modal`;
    $(`#${modalId}`).modal('show');
}

// Edit service fields function (legacy support)
function editServiceFields(optionId, serviceType, serviceIndex) {
    const option = leadOptions.find(opt => opt.id === optionId);
    if (!option || !option.services[serviceType] || !option.services[serviceType][serviceIndex]) {
        showNotification('Service not found', 'error');
        return;
    }
    
    const service = option.services[serviceType][serviceIndex];
    
    // Store current editing context
    window.currentOptionId = optionId;
    window.currentServiceType = serviceType;
    window.currentServiceIndex = serviceIndex;
    
    // Populate modal with existing service data
    populateServiceModal(serviceType, service);
    
    // Open the appropriate modal
    const modalId = serviceType === 'others' ? 'othersModal' : `${serviceType.slice(0, -1)}Modal`;
    $(`#${modalId}`).modal('show');
}

// Populate service modal with existing data
function populateServiceModal(serviceType, service) {
    switch(serviceType) {
        case 'flights':
            document.getElementById('flight').value = service.flight || '';
            document.getElementById('number').value = service.number || '';
            document.getElementById('flightInOut').value = service.inOut || '';
            const routeVal = service.route || '';
            let fromVal = '';
            let toVal = '';
            if (routeVal.includes('-')) {
                const parts = routeVal.split('-');
                fromVal = parts[0] ? parts[0].trim() : '';
                toVal = parts[1] ? parts[1].trim() : '';
            } else {
                fromVal = routeVal;
            }
            if (document.getElementById('flightFrom')) {
                document.getElementById('flightFrom').value = fromVal;
            }
            if (document.getElementById('flightTo')) {
                document.getElementById('flightTo').value = toVal;
            }
            document.getElementById('flightDate').value = formatDateForInput(service.date) || '';
            document.getElementById('departureTime').value = formatTimeToHHMM(service.departureTime);
            document.getElementById('arrivalTime').value = formatTimeToHHMM(service.arrivalTime);
            document.getElementById('issuedBy').value = service.issuedBy || '';
            document.getElementById('flightCost').value = service.cost || 0;
            document.getElementById('flightRemarks').value = service.remarks || '';
            break;
            
        case 'transfers':
            document.getElementById('transferCity').value = service.city || '';
            document.getElementById('transferType').value = service.transferId || '';
            document.getElementById('transferDate').value = formatDateForInput(service.date) || '';
            document.getElementById('transferFrom').value = service.from || '';
            document.getElementById('transferTo').value = service.to || '';
            document.getElementById('transferFlight').value = service.flight || '';
            document.getElementById('flightTime').value = formatTimeToHHMM(service.flightTime);
            document.getElementById('transferToT').value = service.tot || '';
            document.getElementById('transferPickupTime').value = formatTimeToHHMM(service.pickupTime);
            document.getElementById('backendTransferPrice').value = service.backendPrice || 0;
            document.getElementById('transferRemarks').value = service.remarks || '';
            break;
            
        case 'hotels':
            // Set basic hotel fields first
            document.getElementById('checkInDate').value = formatDateForInput(service.checkIn) || '';
            document.getElementById('checkOutDate').value = formatDateForInput(service.checkOut) || '';
            document.getElementById('numberOfNights').value = service.nights || '';
            document.getElementById('singleRooms').value = service.singleRooms || 0;
            document.getElementById('doubleRooms').value = service.doubleRooms || 1;
            document.getElementById('earlyCheckIn').checked = service.earlyCheckIn || false;
            document.getElementById('lateCheckOut').checked = service.lateCheckOut || false;
            document.getElementById('backendHotelPrice').value = service.backendPrice || 0;
            document.getElementById('hotelNotes').value = service.notes || '';
            
            // Follow the same flow as adding new hotel: city -> hotels -> room types
            if (service.city && service.hotelId) {
                // Set city first
                document.getElementById('hotelCity').value = service.city;
                
                // Then load hotels for that city and select the hotel (this will trigger room types loading)
                setTimeout(() => {
                    const cityDropdown = document.getElementById('hotelCity');
                    const hotelDropdown = document.getElementById('hotelType');
                    
                    // Trigger hotel search by city (same as new hotel flow)
                    searchHotelByCity(cityDropdown, hotelDropdown).then(() => {
                        // After hotels are loaded, select the saved hotel
                        hotelDropdown.value = service.hotelId;
                        
                        // Store the room types data for later use
                        const savedRoomTypes = service.roomTypes || [];
                        
                        // Trigger hotel selection change to load room types
                        const changeEvent = new Event('change');
                        hotelDropdown.dispatchEvent(changeEvent);
                        
                        // After room types are loaded, populate them with saved data
                        setTimeout(() => {
                            // Clear any existing room type blocks first
                            document.getElementById('roomTypesWrapper').innerHTML = '';
                            
                            // If we have saved room types, create blocks for each one
                            if (savedRoomTypes.length > 0) {
                                savedRoomTypes.forEach(roomType => {
                                    addRoomType();
                                    
                                    // Get the last added room type block
                                    const roomTypeBlocks = document.querySelectorAll('#roomTypesWrapper .room-type-block');
                                    const lastBlock = roomTypeBlocks[roomTypeBlocks.length - 1];
                                    
                                    if (lastBlock) {
                                        // Set the selected room type
                                        const roomTypeDropdown = lastBlock.querySelector('.roomtype-dropdown');
                                        if (roomTypeDropdown) {
                                            roomTypeDropdown.value = roomType.room_type_id || '';
                                        }
                                        
                                        // Set adults and children
                                        const adultsInput = lastBlock.querySelector('.adults');
                                        const childrenInput = lastBlock.querySelector('.children');
                                        if (adultsInput) adultsInput.value = roomType.adults || 2;
                                        if (childrenInput) childrenInput.value = roomType.children || 0;
                                        
                                        // Set checkboxes
                                        const abfCheckbox = lastBlock.querySelector('.option-checkbox[data-type="complimentary_abf"]');
                                        const adultBedCheckbox = lastBlock.querySelector('.option-checkbox[data-type="extra_adult_bed"]');
                                        const childBedCheckbox = lastBlock.querySelector('.option-checkbox[data-type="extra_child_bed"]');
                                        const sharingBedCheckbox = lastBlock.querySelector('.option-checkbox[data-type="sharing_bed"]');
                                        
                                        if (abfCheckbox) abfCheckbox.checked = roomType.complimentary_abf || false;
                                        if (adultBedCheckbox) adultBedCheckbox.checked = roomType.extra_adult_bed || false;
                                        if (childBedCheckbox) childBedCheckbox.checked = roomType.extra_child_bed || false;
                                        if (sharingBedCheckbox) sharingBedCheckbox.checked = roomType.sharing_bed || false;
                                    }
                                });
                            } else {
                                // Add at least one empty room type block if no saved room types
                                addRoomType();
                            }
                        }, 500);
                    }).catch(error => {
                        console.error('Error loading hotels for editing:', error);
                        // Still add an empty room type block if hotel loading fails
                        addRoomType();
                    });
                }, 100);
            }
            break;
            
        case 'excursions':
            document.getElementById('excursionCity').value = service.city || '';
            document.getElementById('excursionName').value = service.excursionId || '';
            document.getElementById('excursionDate').value = formatDateForInput(service.date) || '';
            document.getElementById('excursionHotel').value = service.hotel || '';
            document.getElementById('excursionPickupTime').value = formatTimeToHHMM(service.pickupTime);
            document.getElementById('typeOfExcursion').value = service.type || '';
            document.getElementById('backendExcursionPrice').value = service.backendPrice || 0;
            document.getElementById('excursionRemarks').value = service.remarks || '';
            break;
            
        case 'tours':
            document.getElementById('tourCity').value = service.city || '';
            document.getElementById('tourName').value = service.tourId || '';
            document.getElementById('tourRoute').value = service.route || '';
            document.getElementById('tourStartDate').value = formatDateForInput(service.startDate) || '';
            document.getElementById('tourEndDate').value = formatDateForInput(service.endDate) || '';
            document.getElementById('tourToT').value = service.tot || '';
            document.getElementById('tourSingleRoom').checked = service.singleRooms > 0;
            document.getElementById('tourDoubleRoom').checked = service.doubleRooms > 0;
            document.getElementById('tourTripleRoom').checked = service.tripleRooms > 0;
            document.getElementById('tourSingleRoomCount').value = service.singleRooms || 0;
            document.getElementById('tourDoubleRoomCount').value = service.doubleRooms || 0;
            document.getElementById('tourTripleRoomCount').value = service.tripleRooms || 0;
            document.getElementById('tourSingleRoomCount').disabled = service.singleRooms <= 0;
            document.getElementById('tourDoubleRoomCount').disabled = service.doubleRooms <= 0;
            document.getElementById('tourTripleRoomCount').disabled = service.tripleRooms <= 0;
            document.getElementById('backendTourPrice').value = service.backendPrice || 0;
            document.getElementById('tourRemarks').value = service.remarks || '';
            break;
            
        case 'others':
            document.getElementById('otherDescription').value = service.description || '';
            document.getElementById('otherDate').value = formatDateForInput(service.date) || '';
            document.getElementById('otherCost').value = service.cost || 0;
            break;
    }
}

// Update hotel room info display
function updateHotelRoomInfo() {
    const hotelDropdown = document.getElementById('hotelType');
    const hotelRoomInfo = document.getElementById('hotelRoomInfo');
    
    if (!hotelDropdown || !hotelRoomInfo) return;
    
    const selectedHotelId = hotelDropdown.value;
    if (!selectedHotelId || !selectedHotelData[selectedHotelId]) {
        hotelRoomInfo.textContent = '';
        return;
    }
    
    const roomTypes = selectedHotelData[selectedHotelId].room_types || [];
    if (roomTypes.length > 0) {
        const singleRoomTypes = roomTypes.filter(rt => rt.name.toLowerCase().includes('single')).map(rt => rt.name);
        const doubleRoomTypes = roomTypes.filter(rt => rt.name.toLowerCase().includes('double')).map(rt => rt.name);
        
        let infoText = '';
        if (singleRoomTypes.length > 0) {
            infoText += `Single: ${singleRoomTypes.join(', ')}`;
        }
        if (doubleRoomTypes.length > 0) {
            if (infoText) infoText += ' | ';
            infoText += `Double: ${doubleRoomTypes.join(', ')}`;
        }
        
        hotelRoomInfo.textContent = infoText;
    } else {
        hotelRoomInfo.textContent = '';
    }
}

// Load hotels for city and populate room types for editing
async function loadHotelsForCityAndPopulateRoomTypes(city, hotelId, existingRoomTypes) {
    const token = localStorage.getItem('token');
    const checkInDate = document.getElementById('checkInDate').value;
    const checkOutDate = document.getElementById('checkOutDate').value;
    
    if (!city || !checkInDate || !checkOutDate) {
        console.warn('Missing city or dates for loading hotels');
        return;
    }
    
    try {
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
        
        // Find the specific hotel and store its data
        const selectedHotel = hotels.find(hotel => hotel.id == hotelId);
        if (selectedHotel) {
            selectedHotelData[hotelId] = {
                meta: selectedHotel.fees || {},
                room_types: selectedHotel.room_types || [],
                promotions: selectedHotel.promotions || []
            };
            
            // Clear existing room type blocks
            document.getElementById('roomTypesWrapper').innerHTML = '';
            
            // Create room type blocks for existing room types
            if (existingRoomTypes && existingRoomTypes.length > 0) {
                existingRoomTypes.forEach(roomType => {
                    addRoomType();
                    
                    // Get the last added room type block
                    const roomTypeBlocks = document.querySelectorAll('#roomTypesWrapper .room-type-block');
                    const lastBlock = roomTypeBlocks[roomTypeBlocks.length - 1];
                    
                    if (lastBlock) {
                        // Populate room type dropdown
                        const roomTypeDropdown = lastBlock.querySelector('.roomtype-dropdown');
                        populateRoomTypes(roomTypeDropdown, selectedHotel.room_types || []);
                        
                        // Set the selected room type
                        roomTypeDropdown.value = roomType.room_type_id || '';
                        
                        // Set adults and children
                        const adultsInput = lastBlock.querySelector('.adults');
                        const childrenInput = lastBlock.querySelector('.children');
                        if (adultsInput) adultsInput.value = roomType.adults || 2;
                        if (childrenInput) childrenInput.value = roomType.children || 0;
                        
                        // Set checkboxes
                        const abfCheckbox = lastBlock.querySelector('.option-checkbox[data-type="complimentary_abf"]');
                        const adultBedCheckbox = lastBlock.querySelector('.option-checkbox[data-type="extra_adult_bed"]');
                        const childBedCheckbox = lastBlock.querySelector('.option-checkbox[data-type="extra_child_bed"]');
                        const sharingBedCheckbox = lastBlock.querySelector('.option-checkbox[data-type="sharing_bed"]');
                        
                        if (abfCheckbox) abfCheckbox.checked = roomType.complimentary_abf || false;
                        if (adultBedCheckbox) adultBedCheckbox.checked = roomType.extra_adult_bed || false;
                        if (childBedCheckbox) childBedCheckbox.checked = roomType.extra_child_bed || false;
                        if (sharingBedCheckbox) sharingBedCheckbox.checked = roomType.sharing_bed || false;
                    }
                });
            } else {
                // Add at least one empty room type block
                addRoomType();
                const roomTypeBlocks = document.querySelectorAll('#roomTypesWrapper .room-type-block');
                const lastBlock = roomTypeBlocks[roomTypeBlocks.length - 1];
                if (lastBlock) {
                    const roomTypeDropdown = lastBlock.querySelector('.roomtype-dropdown');
                    populateRoomTypes(roomTypeDropdown, selectedHotel.room_types || []);
                }
            }
        }
        
    } catch (error) {
        console.error('Error loading hotels for editing:', error);
        showNotification('Failed to load hotel room types', 'error');
    }
}

// Populate existing room types when editing hotel
function populateExistingRoomTypes(existingRoomTypes) {
    // Clear existing room type blocks first
    document.getElementById('roomTypesWrapper').innerHTML = '';
    
    if (existingRoomTypes && existingRoomTypes.length > 0) {
        existingRoomTypes.forEach((roomType, index) => {
            // Create room type block with proper styling (same as HTML structure)
            const wrapper = document.getElementById('roomTypesWrapper');
            const blockId = `roomType_edit_${Date.now()}_${index}`;
            
            const roomTypeBlock = document.createElement('div');
            roomTypeBlock.className = 'room-type-block border p-3 mb-2'; // Add proper styling classes
            roomTypeBlock.id = blockId;
            roomTypeBlock.innerHTML = `
                <div class="form-row">
                    <div class="form-group col-md-4">
                        <label>Room Type</label>
                        <select class="form-control roomtype-dropdown" required>
                            <option value="">Select Room Type</option>
                        </select>
                    </div>
                    <div class="form-group col-md-2">
                        <label>Adults</label>
                        <input type="number" class="form-control adults" value="2" min="1" required>
                    </div>
                    <div class="form-group col-md-2">
                        <label>Children</label>
                        <input type="number" class="form-control children" value="0" min="0">
                    </div>
                    <div class="form-group col-md-3">
                        <label>&nbsp;</label>
                        <button type="button" class="btn btn-danger btn-sm btn-block btn-remove" onclick="removeRoomType('${blockId}')">
                            <i class="fa fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
                <div class="form-row mt-2">
                    <div class="col-md-12">
                        <div class="form-check form-check-inline option-checkbox">
                            <input type="checkbox" class="form-check-input" id="${blockId}_abf" data-type="complimentary_abf">
                            <label class="form-check-label" for="${blockId}_abf">Complimentary ABF</label>
                        </div>
                        <div class="form-check form-check-inline option-checkbox">
                            <input type="checkbox" class="form-check-input" id="${blockId}_adult_bed" data-type="extra_adult_bed">
                            <label class="form-check-label" for="${blockId}_adult_bed">Extra Adult Bed</label>
                        </div>
                        <div class="form-check form-check-inline option-checkbox">
                            <input type="checkbox" class="form-check-input" id="${blockId}_child_bed" data-type="extra_child_bed">
                            <label class="form-check-label" for="${blockId}_child_bed">Extra Child Bed</label>
                        </div>
                        <div class="form-check form-check-inline option-checkbox">
                            <input type="checkbox" class="form-check-input" id="${blockId}_sharing" data-type="sharing_bed">
                            <label class="form-check-label" for="${blockId}_sharing">Sharing Bed</label>
                        </div>
                    </div>
                </div>
            `;
            
            wrapper.appendChild(roomTypeBlock);
            
            // Populate room types dropdown with available room types for the selected hotel
            const hotelId = document.getElementById('hotelType').value;
            if (hotelId && selectedHotelData[hotelId]) {
                const roomTypeDropdown = roomTypeBlock.querySelector('.roomtype-dropdown');
                populateRoomTypes(roomTypeDropdown, selectedHotelData[hotelId].room_types);
                
                // Set the selected room type
                roomTypeDropdown.value = roomType.room_type_id || '';
            }
            
            // Set adults and children
            const adultsInput = roomTypeBlock.querySelector('.adults');
            const childrenInput = roomTypeBlock.querySelector('.children');
            if (adultsInput) adultsInput.value = roomType.adults || 2;
            if (childrenInput) childrenInput.value = roomType.children || 0;
            
            // Set checkboxes
            const abfCheckbox = roomTypeBlock.querySelector('.option-checkbox[data-type="complimentary_abf"]');
            const adultBedCheckbox = roomTypeBlock.querySelector('.option-checkbox[data-type="extra_adult_bed"]');
            const childBedCheckbox = roomTypeBlock.querySelector('.option-checkbox[data-type="extra_child_bed"]');
            const sharingBedCheckbox = roomTypeBlock.querySelector('.option-checkbox[data-type="sharing_bed"]');
            
            if (abfCheckbox) abfCheckbox.checked = roomType.complimentary_abf || false;
            if (adultBedCheckbox) adultBedCheckbox.checked = roomType.extra_adult_bed || false;
            if (childBedCheckbox) childBedCheckbox.checked = roomType.extra_child_bed || false;
            if (sharingBedCheckbox) sharingBedCheckbox.checked = roomType.sharing_bed || false;
        });
    } else {
        // Add at least one empty room type block if no existing room types
        addRoomType();
    }
}

// Make functions global for onclick handlers
window.editIndividualFields = editIndividualFields;
window.editServiceFields = editServiceFields;
window.editService = editService;
window.loadHotelsForCityAndPopulateRoomTypes = loadHotelsForCityAndPopulateRoomTypes;
window.populateExistingRoomTypes = populateExistingRoomTypes;
