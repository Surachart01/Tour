// Lead Creation with Backend Integration
// Global variables
let leadData = {
    flights: [],
    transfers: [],
    hotels: [],
    excursions: [],
    tours: [],
    others: []
};

let selectedHotelData = {}; // Store hotel data for room types and promotions
let roomTypeIndex = 0;
let toursData = {}; // Store tour data for duration and route information

// Global editing state
let currentEditingService = null; // { type: 'transfers', index: 0 }

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Clear any existing lead data on page load
    leadData = {
        flights: [],
        transfers: [],
        hotels: [],
        excursions: [],
        tours: [],
        others: []
    };
    
    initializeAuth();
    setDefaultDates();
    setupEventListeners();
    populateCountriesDropdown();
    populateCitiesDropdown('.city-dropdown-transfer');
    populateCitiesDropdown('.city-dropdown-hotel');
    populateCitiesDropdown('.city-dropdown-excursion');
    populateCitiesDropdown('.city-dropdown-tour');
    setupCountryCityListeners();
    setupTemplateTypeChange();
    setupServiceModalListeners();
    setupDateConstraints();
});

// Authentication check
function initializeAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You are not authorized. Please log in first.');
        window.location.href = 'login.html';
        return;
    }
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    document.getElementById('bookingDate').value = today.toISOString().split('T')[0];
    document.getElementById('startDate').value = tomorrow.toISOString().split('T')[0];
}

// Setup event listeners
function setupEventListeners() {
    // Template type change
    document.getElementById('templateType').addEventListener('change', handleTemplateTypeChange);
    
    // Service buttons
    document.getElementById('btnFlights').addEventListener('click', () => openServiceModal('flights'));
    document.getElementById('btnTransfers').addEventListener('click', () => openServiceModal('transfers'));
    document.getElementById('btnHotels').addEventListener('click', () => openServiceModal('hotels'));
    document.getElementById('btnExcursions').addEventListener('click', () => openServiceModal('excursions'));
    document.getElementById('btnTours').addEventListener('click', () => openServiceModal('tours'));
    document.getElementById('btnOthers').addEventListener('click', () => openServiceModal('others'));
    
    // Add service buttons
    document.getElementById('addFlightBtn').addEventListener('click', () => openServiceModal('flights'));
    document.getElementById('addTransferBtn').addEventListener('click', () => openServiceModal('transfers'));
    document.getElementById('addHotelBtn').addEventListener('click', () => openServiceModal('hotels'));
    document.getElementById('addExcursionBtn').addEventListener('click', () => openServiceModal('excursions'));
    document.getElementById('addTourBtn').addEventListener('click', () => openServiceModal('tours'));
    document.getElementById('addOtherBtn').addEventListener('click', () => openServiceModal('others'));
    
    // Markup percentage change
    document.getElementById('markupPercentage').addEventListener('input', updatePricingSummary);
    
    // Preview and submit
    document.getElementById('previewLeadBtn').addEventListener('click', previewLead);
    document.getElementById('addLeadForm').addEventListener('submit', handleLeadSubmission);
}

// Handle template type change
function handleTemplateTypeChange() {
    const templateType = document.getElementById('templateType').value;
    // Template types are now just for display purposes
    // Markup percentage is independent and can be set manually
    updatePricingSummary();
}

// Setup template type change
function setupTemplateTypeChange() {
    document.getElementById('templateType').addEventListener('change', handleTemplateTypeChange);
}

// Enhanced open service modal function
function openServiceModal(serviceType) {
    // Reset form if not editing
    if (!currentEditingService) {
        resetServiceForm(serviceType);
        updateModalTitle(serviceType, false);
        // Set default dates to trip start date
        setServiceDefaultDates(serviceType);
    }
    
    const modalMap = {
        'flights': '#flightModal',
        'transfers': '#transferModal',
        'hotels': '#hotelModal',
        'excursions': '#excursionModal',
        'tours': '#tourModal',
        'others': '#othersModal'
    };
    
    $(modalMap[serviceType]).modal('show');
}

// Set default dates for services based on trip start date
function setServiceDefaultDates(serviceType) {
    const tripStartDate = document.getElementById('startDate').value;
    if (!tripStartDate) return;
    
    switch(serviceType) {
        case 'flights':
            const flightDateInput = document.getElementById('flightDate');
            if (flightDateInput && !flightDateInput.value) {
                console.log('Setting default flight date to:', tripStartDate);
                flightDateInput.value = tripStartDate;
                console.log('Flight date input value after setting:', flightDateInput.value);
            }
            break;
            
        case 'transfers':
            const transferDateInput = document.getElementById('transferDate');
            if (transferDateInput && !transferDateInput.value) {
                transferDateInput.value = tripStartDate;
            }
            break;
            
        case 'hotels':
            const checkInDateInput = document.getElementById('checkInDate');
            if (checkInDateInput && !checkInDateInput.value) {
                checkInDateInput.value = tripStartDate;
            }
            // Set checkout to next day if not set
            const checkOutDateInput = document.getElementById('checkOutDate');
            if (checkOutDateInput && !checkOutDateInput.value) {
                const nextDay = new Date(tripStartDate);
                nextDay.setDate(nextDay.getDate() + 1);
                checkOutDateInput.value = nextDay.toISOString().split('T')[0];
                // Update nights calculation
                updateNumberOfNights();
            }
            // Update Add Room Type button state
            setTimeout(() => {
                updateAddRoomTypeButtonState();
            }, 100);
            break;
            
        case 'excursions':
            const excursionDateInput = document.getElementById('excursionDate');
            if (excursionDateInput && !excursionDateInput.value) {
                excursionDateInput.value = tripStartDate;
            }
            break;
            
        case 'tours':
            const tourStartDateInput = document.getElementById('tourStartDate');
            if (tourStartDateInput && !tourStartDateInput.value) {
                tourStartDateInput.value = tripStartDate;
            }
            break;
            
        case 'others':
            const otherDateInput = document.getElementById('otherDate');
            if (otherDateInput && !otherDateInput.value) {
                otherDateInput.value = tripStartDate;
            }
            break;
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
    
    // Add event listeners for room count changes
    document.getElementById('singleRooms').addEventListener('input', updateAddRoomTypeButtonState);
    document.getElementById('doubleRooms').addEventListener('input', updateAddRoomTypeButtonState);
    
    // Excursion modal
    document.getElementById('saveExcursion').addEventListener('click', () => saveService('excursions'));
    document.getElementById('getExcursionPriceBtn').addEventListener('click', calculateExcursionPrice);
    
    // Tour modal
    document.getElementById('saveTour').addEventListener('click', () => saveService('tours'));
    document.getElementById('getTourPriceBtn').addEventListener('click', calculateTourPrice);
    
    // Tour event listeners
    document.getElementById('tourName').addEventListener('change', function() {
        const selectedTourId = this.value;
        
        console.log("✅ Tour Selected:", selectedTourId);
        if (selectedTourId && toursData[selectedTourId]) {
            // Update route field
            document.getElementById('tourRoute').value = toursData[selectedTourId]?.route || "Route Not Available";
            
            // Calculate end date based on duration
            calculateTourEndDate();
            
            console.log("✅ Updated route and calculated end date for tour:", toursData[selectedTourId]);
        } else {
            console.warn("⚠️ Tour data not available for ID:", selectedTourId);
            console.log("Available tours data:", toursData);
        }
    });
    
    document.getElementById('tourStartDate').addEventListener('change', calculateTourEndDate);
    
    // Tour room type checkboxes
    document.getElementById('tourSingleRoom').addEventListener('change', function() {
        document.getElementById('tourSingleRoomCount').disabled = !this.checked;
        if (!this.checked) {
            document.getElementById('tourSingleRoomCount').value = '';
        }
    });
    
    document.getElementById('tourDoubleRoom').addEventListener('change', function() {
        document.getElementById('tourDoubleRoomCount').disabled = !this.checked;
        if (!this.checked) {
            document.getElementById('tourDoubleRoomCount').value = '';
        }
    });
    
    document.getElementById('tourTripleRoom').addEventListener('change', function() {
        document.getElementById('tourTripleRoomCount').disabled = !this.checked;
        if (!this.checked) {
            document.getElementById('tourTripleRoomCount').value = '';
        }
    });
    
    // Others modal
    document.getElementById('saveOther').addEventListener('click', () => saveService('others'));
    
    // Add modal close event listeners to reset editing state
    const modals = ['#flightModal', '#transferModal', '#hotelModal', '#excursionModal', '#tourModal', '#othersModal'];
    modals.forEach(modalSelector => {
        $(modalSelector).on('hidden.bs.modal', function() {
            // Reset editing state when modal is closed
            if (currentEditingService) {
                console.log('Modal closed, resetting editing state');
                currentEditingService = null;
            }
        });
    });
    
    // Hotel selection change handler - populate room types when hotel is selected
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

// Search transfers by city
function searchTransfersByCity(cityDropdown, transferDropdown) {
    const selectedCity = cityDropdown.value;
    const token = localStorage.getItem('token');
    
    if (!selectedCity) return;
    
    const url = new URL(`${Endpoint}/api/v1/transfers`);
    url.searchParams.append('city', selectedCity);
    
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
        // Clear tours data
        toursData = {};
        
        tours.forEach(tour => {
            const option = document.createElement('option');
            option.value = tour.id;
            option.textContent = tour.name;
            option.setAttribute('data-route', tour.route || '');
            option.setAttribute('data-duration', tour.duration || '');
            tourDropdown.appendChild(option);
            
            // Store tour data for later use
            toursData[tour.id] = {
                name: tour.name,
                route: tour.route || '',
                duration: tour.duration || 0
            };
        });
    })
    .catch(error => {
        console.error('Error fetching tours:', error);
        showNotification('Failed to load tours', 'error');
    });
}

// Calculate tour end date based on duration
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
        
        const adults = parseInt(block.querySelector('.adults-input')?.value, 10) || 0;
        const children = parseInt(block.querySelector('.children-input')?.value, 10) || 0;
        
        const blockIndex = block.id.split('_')[1];
        const complimentaryAbf = block.querySelector(`#abf_${blockIndex}`)?.checked || false;
        const extraAdultBed = block.querySelector(`#extraAdultBed_${blockIndex}`)?.checked || false;
        const extraChildBed = block.querySelector(`#extraChildBed_${blockIndex}`)?.checked || false;
        const sharingBed = block.querySelector(`#sharingBed_${blockIndex}`)?.checked || false;
        
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
    
    // If no room types are added via dynamic blocks, create a default room type
    if (roomTypesData.length === 0) {
        // Check if we have basic room counts
        if (singleRooms > 0 || doubleRooms > 0) {
            // Create default room types based on single/double room counts
            if (singleRooms > 0) {
                roomTypesData.push({
                    room_type_id: 1, // Assuming 1 is single room type ID
                    room_type_name: 'Single Room',
                    adults: 1,
                    children: 0,
                    complimentary_abf: false,
                    extra_bed: false
                });
            }
            if (doubleRooms > 0) {
                roomTypesData.push({
                    room_type_id: 2, // Assuming 2 is double room type ID
                    room_type_name: 'Double Room',
                    adults: 2,
                    children: 0,
                    complimentary_abf: false,
                    extra_bed: false
                });
            }
        } else {
            showNotification('Please add at least one room type or specify room counts', 'warning');
            return;
        }
    }
    
    // Collect global extra bed options (fallback for backward compatibility)
    const globalExtraAdultBed = document.getElementById('extraAdultBed')?.checked || false;
    const globalExtraChildBed = document.getElementById('extraChildBed')?.checked || false;
    const globalSharingBed = document.getElementById('sharingBed')?.checked || false;
    
    const requestData = {
        agent_name: agentName,
        city: hotelCity,
        hotel_id: parseInt(hotelType, 10),
        number_of_kids: numberOfKids,
        number_of_adults: numberOfAdults,
        number_of_single_rooms: singleRooms,
        number_of_double_rooms: doubleRooms,
        booking_date: document.getElementById('bookingDate').value,
        from_date: checkInDate,
        to_date: checkOutDate,
        booking_start_date: checkInDate, // Keep for backward compatibility
        booking_end_date: checkOutDate, // Keep for backward compatibility
        number_of_nights: numberOfNights,
        extra_adult_bed: globalExtraAdultBed,
        extra_child_bed: globalExtraChildBed,
        sharing_bed: globalSharingBed,
        room_types: roomTypesData
    };
    
    console.log('Sending hotel price calculation request:', requestData);
    
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
    const singleRoomCount = document.getElementById('tourSingleRoom').checked ?
        parseInt(document.getElementById('tourSingleRoomCount').value) || 0 : 0;
    const doubleRoomCount = document.getElementById('tourDoubleRoom').checked ?
        parseInt(document.getElementById('tourDoubleRoomCount').value) || 0 : 0;
    const tripleRoomCount = document.getElementById('tourTripleRoom').checked ?
        parseInt(document.getElementById('tourTripleRoomCount').value) || 0 : 0;
    
    if (!tourCity || !tourName || !tourToT || !tourStartDate) {
        showNotification('Please fill all required fields first', 'warning');
        return;
    }
    
    // Validate inputs before API request
    if (numberOfAdults + numberOfKids === 0) {
        showNotification('Please ensure number of adults and kids is specified', 'warning');
        return;
    }
    
    const requestData = {
        agent_name: agentName,
        city: tourCity,
        tour_id: parseInt(tourName, 10),
        tot: tourToT,
        number_of_kids: numberOfKids,
        number_of_adults: numberOfAdults,
        travel_date: tourStartDate, // Use travel_date instead of from_date for consistency with working version
        single_rooms: singleRoomCount,
        double_rooms: doubleRoomCount,
        triple_rooms: tripleRoomCount
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
    .then(async (response) => {
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        return response.json();
    })
    .then(data => {
        if (data.final_cost) {
            document.getElementById('backendTourPrice').value = `${data.final_cost}`;
            showNotification('Tour price calculated successfully', 'success');
        } else {
            throw new Error('Failed to retrieve the price. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error calculating tour price:', error);
        showNotification(`Error: ${error.message}`, 'error');
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

// Add room type functionality
let roomTypeCounter = 0;

function addRoomType() {
    const singleRooms = parseInt(document.getElementById('singleRooms').value) || 0;
    const doubleRooms = parseInt(document.getElementById('doubleRooms').value) || 0;
    const totalAllowedRooms = singleRooms + doubleRooms;
    
    // Check current number of room type blocks
    const currentRoomTypeBlocks = document.querySelectorAll('#roomTypesWrapper .room-type-block').length;
    
    if (totalAllowedRooms === 0) {
        showNotification('Please specify the number of single or double rooms first', 'warning');
        return;
    }
    
    if (currentRoomTypeBlocks >= totalAllowedRooms) {
        showNotification(`You can only add ${totalAllowedRooms} room type(s) based on your room configuration (${singleRooms} Single + ${doubleRooms} Double)`, 'warning');
        return;
    }
    
    const roomTypesWrapper = document.getElementById('roomTypesWrapper');
    const roomTypeDiv = document.createElement('div');
    roomTypeDiv.className = 'room-type-block border rounded p-3 mb-3';
    roomTypeDiv.id = `roomType_${roomTypeCounter}`;
    
    roomTypeDiv.innerHTML = `
        <div class="row">
            <div class="col-md-3">
                <label>Room Type *</label>
                <select class="form-control roomtype-dropdown" required>
                    <option value="">Select Room Type</option>
                </select>
            </div>
            <div class="col-md-2">
                <label>Adults</label>
                <input type="number" class="form-control adults-input" min="0" value="2" />
            </div>
            <div class="col-md-2">
                <label>Children</label>
                <input type="number" class="form-control children-input" min="0" value="0" />
            </div>
            <div class="col-md-4">
                <label>Options</label><br>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="abf_${roomTypeCounter}">
                    <label class="form-check-label" for="abf_${roomTypeCounter}">Complimentary ABF</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="extraAdultBed_${roomTypeCounter}">
                    <label class="form-check-label" for="extraAdultBed_${roomTypeCounter}">Extra Adult Bed</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="extraChildBed_${roomTypeCounter}">
                    <label class="form-check-label" for="extraChildBed_${roomTypeCounter}">Extra Child Bed</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="checkbox" id="sharingBed_${roomTypeCounter}">
                    <label class="form-check-label" for="sharingBed_${roomTypeCounter}">Sharing Bed</label>
                </div>
            </div>
            <div class="col-md-1">
                <label>&nbsp;</label><br>
                <button type="button" class="btn btn-danger btn-sm remove-room-type">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    roomTypesWrapper.appendChild(roomTypeDiv);
    
    // Add remove functionality
    roomTypeDiv.querySelector('.remove-room-type').addEventListener('click', function() {
        roomTypesWrapper.removeChild(roomTypeDiv);
        // Update button state after removing a room type
        updateAddRoomTypeButtonState();
    });
    
    // Populate room types if hotel is selected
    const hotelDropdown = document.getElementById('hotelType');
    const roomTypeDropdown = roomTypeDiv.querySelector('.roomtype-dropdown');
    if (hotelDropdown.value && selectedHotelData[hotelDropdown.value]) {
        const roomTypes = selectedHotelData[hotelDropdown.value].room_types || [];
        roomTypes.forEach(roomType => {
            const option = document.createElement('option');
            option.value = roomType.id;
            option.textContent = roomType.name;
            roomTypeDropdown.appendChild(option);
        });
    }
    
    // Add ABF auto-check functionality
    addAbfAutoCheckListener(roomTypeDropdown, roomTypeDiv, roomTypeCounter);
    
    roomTypeCounter++;
    
    // Update button state after adding a room type
    updateAddRoomTypeButtonState();
}

// Helper function to check if room type name contains ABF and auto-check the checkbox
function checkAndAutoSelectAbf(roomTypeDropdown, roomTypeDiv, counterIndex) {
    const selectedOption = roomTypeDropdown.options[roomTypeDropdown.selectedIndex];
    const abfCheckbox = roomTypeDiv.querySelector(`#abf_${counterIndex}`);
    
    if (selectedOption && selectedOption.textContent && abfCheckbox) {
        const roomTypeName = selectedOption.textContent.toLowerCase();
        if (roomTypeName.includes('abf')) {
            abfCheckbox.checked = true;
            console.log('Auto-checked ABF for room type:', selectedOption.textContent);
        }
    }
}

// Helper function to add ABF auto-check functionality to room type dropdown
function addAbfAutoCheckListener(roomTypeDropdown, roomTypeDiv, counterIndex) {
    roomTypeDropdown.addEventListener('change', function() {
        checkAndAutoSelectAbf(this, roomTypeDiv, counterIndex);
    });
}

// Helper function to build room types string with room type names, adults, and children
function buildRoomTypesString(roomTypeDetails, singleRooms, doubleRooms) {
    if (roomTypeDetails && roomTypeDetails.length > 0) {
        // Build string from actual room type details with adults and children info
        const roomTypeStrings = roomTypeDetails.map(rt => {
            if (rt.roomTypeName) {
                const adultsText = rt.adults ? `${rt.adults}A` : '0A';
                const childrenText = rt.children ? `${rt.children}C` : '0C';
                return `${rt.roomTypeName} (${adultsText}, ${childrenText})`;
            }
            return null;
        }).filter(str => str);
        
        if (roomTypeStrings.length > 0) {
            return roomTypeStrings.join(', ');
        }
    }
    
    // Fallback to single/double room format if no room type details
    const parts = [];
    if (singleRooms > 0) parts.push(`${singleRooms}S`);
    if (doubleRooms > 0) parts.push(`${doubleRooms}D`);
    return parts.join(', ') || 'No rooms specified';
}

// Update Add Room Type button state based on room limits
function updateAddRoomTypeButtonState() {
    const singleRooms = parseInt(document.getElementById('singleRooms').value) || 0;
    const doubleRooms = parseInt(document.getElementById('doubleRooms').value) || 0;
    const totalAllowedRooms = singleRooms + doubleRooms;
    const currentRoomTypeBlocks = document.querySelectorAll('#roomTypesWrapper .room-type-block').length;
    
    const addRoomTypeBtn = document.getElementById('addRoomTypeBtn');
    
    if (totalAllowedRooms === 0) {
        addRoomTypeBtn.disabled = true;
        addRoomTypeBtn.title = 'Please specify the number of single or double rooms first';
        addRoomTypeBtn.innerHTML = '<i class="fa fa-plus"></i> Add Room Type (Specify rooms first)';
    } else if (currentRoomTypeBlocks >= totalAllowedRooms) {
        addRoomTypeBtn.disabled = true;
        addRoomTypeBtn.title = `Maximum ${totalAllowedRooms} room type(s) allowed`;
        addRoomTypeBtn.innerHTML = `<i class="fa fa-plus"></i> Add Room Type (${currentRoomTypeBlocks}/${totalAllowedRooms})`;
    } else {
        addRoomTypeBtn.disabled = false;
        addRoomTypeBtn.title = 'Add a new room type';
        addRoomTypeBtn.innerHTML = `<i class="fa fa-plus"></i> Add Room Type (${currentRoomTypeBlocks}/${totalAllowedRooms})`;
    }
}

// Set date constraints based on trip start date
function setDateConstraints() {
    const tripStartDate = document.getElementById('startDate').value;
    if (!tripStartDate) return;
    
    // Set minimum date for all service date inputs
    const dateInputs = [
        'flightDate',
        'transferDate', 
        'checkInDate',
        'checkOutDate',
        'excursionDate',
        'tourStartDate',
        'tourEndDate',
        'otherDate'
    ];
    
    dateInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.min = tripStartDate;
            // Set default value to trip start date if empty
            if (!input.value) {
                input.value = tripStartDate;
            }
        }
    });
}

// Setup date constraint listeners
function setupDateConstraints() {
    // Listen for trip start date changes
    const startDateInput = document.getElementById('startDate');
    if (startDateInput) {
        startDateInput.addEventListener('change', setDateConstraints);
        // Set initial constraints
        setDateConstraints();
    }
}

// Save service
function saveService(serviceType) {
    const serviceData = collectServiceData(serviceType);
    
    if (!serviceData) {
        return; // Validation failed
    }
    
    // Additional validation to ensure dates are not empty strings
    if (serviceType === 'flights' && (!serviceData.date || serviceData.date === '')) {
        showNotification('Flight date is required', 'error');
        return;
    }
    if (serviceType === 'transfers' && (!serviceData.date || serviceData.date === '')) {
        showNotification('Transfer date is required', 'error');
        return;
    }
    if (serviceType === 'hotels' && (!serviceData.from_date || serviceData.from_date === '' || !serviceData.to_date || serviceData.to_date === '')) {
        showNotification('Hotel check-in and check-out dates are required', 'error');
        return;
    }
    if (serviceType === 'excursions' && (!serviceData.date || serviceData.date === '')) {
        showNotification('Excursion date is required', 'error');
        return;
    }
    if (serviceType === 'tours' && (!serviceData.startDate || serviceData.startDate === '')) {
        showNotification('Tour start date is required', 'error');
        return;
    }
    if (serviceType === 'others' && (!serviceData.date || serviceData.date === '')) {
        showNotification('Service date is required', 'error');
        return;
    }
    
    if (currentEditingService && currentEditingService.type === serviceType) {
        // Update existing service
        leadData[serviceType][currentEditingService.index] = serviceData;
        console.log(`Updated ${serviceType} service at index ${currentEditingService.index}:`, serviceData);
        showNotification(`${serviceType.slice(0, -1)} updated successfully`, 'success');
        
        // Clear editing state
        currentEditingService = null;
    } else {
        // Add new service
        leadData[serviceType].push(serviceData);
        console.log(`Added new ${serviceType} service:`, serviceData);
        console.log(`Total ${serviceType} services now:`, leadData[serviceType].length);
        console.log(`Current ${serviceType} data:`, leadData[serviceType]);
        showNotification(`${serviceType.slice(0, -1)} added successfully`, 'success');
    }
    
    console.log(`About to update ${serviceType} table with data:`, leadData[serviceType]);
    updateServiceTable(serviceType);
    updatePricingSummary();
    
    // Close modal and reset form
    const modalMap = {
        'flights': '#flightModal',
        'transfers': '#transferModal',
        'hotels': '#hotelModal',
        'excursions': '#excursionModal',
        'tours': '#tourModal',
        'others': '#othersModal'
    };
    
    $(modalMap[serviceType]).modal('hide');
    resetServiceForm(serviceType);
}

// Collect service data
function collectServiceData(serviceType) {
    let serviceData;
    
    switch(serviceType) {
        case 'flights':
            const flightName = document.getElementById('flight').value;
            const flightCost = parseFloat(document.getElementById('flightCost').value) || 0;
            const flightDate = document.getElementById('flightDate').value;
            
            console.log('Flight collection - Name:', flightName, 'Cost:', flightCost, 'Date:', flightDate);
            
            if (!flightName) {
                showNotification('Please fill all required flight fields', 'warning');
                return null;
            }
            
            // Validate flight date
            if (!flightDate || flightDate.trim() === '') {
                showNotification('Please select a flight date', 'warning');
                return null;
            }
            
            const formattedFlightDate = formatDateForBackend(flightDate);
            console.log('Formatted flight date:', formattedFlightDate);
            
            if (!formattedFlightDate || formattedFlightDate === '' || formattedFlightDate === null) {
                showNotification('Invalid flight date format. Please select a valid date.', 'warning');
                return null;
            }
            
            // Double-check the formatted date is valid
            if (!formattedFlightDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                showNotification('Flight date must be in YYYY-MM-DD format', 'warning');
                return null;
            }
            
            serviceData = {
                flightName: flightName,
                number: document.getElementById('number').value || '',
                flightInOut: document.getElementById('flightInOut').value || '',
                route: document.getElementById('flightRoute').value || '',
                date: formattedFlightDate,
                departureTime: document.getElementById('departureTime').value || '',
                arrivalTime: document.getElementById('arrivalTime').value || '',
                issuedBy: document.getElementById('issuedBy').value || '',
                cost: flightCost,
                totalCost: flightCost,
                finalCost: flightCost,
                remarks: document.getElementById('flightRemarks').value || ''
            };
            
            console.log('Flight service data created:', serviceData);
            console.log('Flight cost in service data:', serviceData.cost, serviceData.finalCost);
            break;
            
        case 'transfers':
            const transferCity = document.getElementById('transferCity').value;
            const transferType = document.getElementById('transferType').value;
            const transferDate = document.getElementById('transferDate').value;
            const transferFrom = document.getElementById('transferFrom').value;
            const transferTo = document.getElementById('transferTo').value;
            const backendTransferPrice = parseFloat(document.getElementById('backendTransferPrice').value) || 0;
            
            if (!transferCity || !transferType || !transferDate || !transferFrom || !transferTo) {
                showNotification('Please fill all required transfer fields', 'warning');
                return null;
            }
            
            if (!backendTransferPrice) {
                showNotification('Please get backend price for transfer', 'warning');
                return null;
            }
            
            const formattedTransferDate = formatDateForBackend(transferDate);
            if (!formattedTransferDate) {
                showNotification('Invalid transfer date format', 'warning');
                return null;
            }
            
            serviceData = {
                city: transferCity,
                transferType: transferType,
                transferName: document.getElementById('transferType').selectedOptions[0]?.textContent || '',
                transferDescription: document.getElementById('transferType').selectedOptions[0]?.textContent || '',
                date: formattedTransferDate,
                from: transferFrom,
                to: transferTo,
                flight: document.getElementById('transferFlight').value,
                flightTime: document.getElementById('flightTime').value,
                tot: document.getElementById('transferToT').value,
                pickupTime: document.getElementById('transferPickupTime').value,
                backendPrice: backendTransferPrice,
                totalCost: backendTransferPrice,
                finalCost: backendTransferPrice,
                manualCost: null,
                remarks: document.getElementById('transferRemarks').value
            };
            break;
            
        case 'hotels':
            const hotelCity = document.getElementById('hotelCity').value;
            const hotelType = document.getElementById('hotelType').value;
            const checkIn = document.getElementById('checkInDate').value;
            const checkOut = document.getElementById('checkOutDate').value;
            const backendHotelPrice = parseFloat(document.getElementById('backendHotelPrice').value) || 0;
            
            if (!hotelCity || !hotelType || !checkIn || !checkOut) {
                showNotification('Please fill all required hotel fields', 'warning');
                return null;
            }
            
            if (!backendHotelPrice) {
                showNotification('Please get backend price for hotel', 'warning');
                return null;
            }
            
            const singleRooms = parseInt(document.getElementById('singleRooms').value) || 0;
            const doubleRooms = parseInt(document.getElementById('doubleRooms').value) || 0;
            
            // Collect room type details from dynamic blocks
            const roomTypeDetails = [];
            document.querySelectorAll('.room-type-block').forEach((block) => {
                const roomTypeDropdown = block.querySelector('.roomtype-dropdown');
                const adultsInput = block.querySelector('.adults-input');
                const childrenInput = block.querySelector('.children-input');
                
                // Get the actual counter number from the block ID
                const blockId = block.id;
                const counterNumber = blockId.split('_')[1];
                const abfCheckbox = document.getElementById(`abf_${counterNumber}`);
                const extraAdultBedCheckbox = document.getElementById(`extraAdultBed_${counterNumber}`);
                const extraChildBedCheckbox = document.getElementById(`extraChildBed_${counterNumber}`);
                const sharingBedCheckbox = document.getElementById(`sharingBed_${counterNumber}`);
                
                console.log(`🔍 Processing room type block ${counterNumber}:`);
                console.log(`  - ABF checkbox found: ${!!abfCheckbox}, checked: ${abfCheckbox?.checked}`);
                console.log(`  - Extra Adult Bed checkbox found: ${!!extraAdultBedCheckbox}, checked: ${extraAdultBedCheckbox?.checked}`);
                console.log(`  - Extra Child Bed checkbox found: ${!!extraChildBedCheckbox}, checked: ${extraChildBedCheckbox?.checked}`);
                console.log(`  - Sharing Bed checkbox found: ${!!sharingBedCheckbox}, checked: ${sharingBedCheckbox?.checked}`);
                
                if (roomTypeDropdown && roomTypeDropdown.value) {
                    const roomTypeData = {
                        roomTypeId: roomTypeDropdown.value,
                        roomTypeName: roomTypeDropdown.selectedOptions[0]?.textContent || '',
                        adults: parseInt(adultsInput?.value) || 0,
                        children: parseInt(childrenInput?.value) || 0,
                        abf: abfCheckbox?.checked || false,
                        extraAdultBed: extraAdultBedCheckbox?.checked || false,
                        extraChildBed: extraChildBedCheckbox?.checked || false,
                        sharingBed: sharingBedCheckbox?.checked || false
                    };
                    
                    console.log(`  - Final room type data:`, roomTypeData);
                    roomTypeDetails.push(roomTypeData);
                }
            });
            
            const formattedCheckIn = formatDateForBackend(checkIn);
            const formattedCheckOut = formatDateForBackend(checkOut);
            
            if (!formattedCheckIn || !formattedCheckOut) {
                showNotification('Invalid hotel date format', 'warning');
                return null;
            }
            
            // Collect global extra bed options for this hotel service
            const globalExtraAdultBed = document.getElementById('extraAdultBed')?.checked || false;
            const globalExtraChildBed = document.getElementById('extraChildBed')?.checked || false;
            const globalSharingBed = document.getElementById('sharingBed')?.checked || false;
            
            serviceData = {
                city: hotelCity,
                hotelType: hotelType,
                hotelName: document.getElementById('hotelType').selectedOptions[0]?.textContent || '',
                from_date: formattedCheckIn,
                to_date: formattedCheckOut,
                checkIn: formattedCheckIn, // Keep for frontend compatibility
                checkOut: formattedCheckOut, // Keep for frontend compatibility
                nights: parseInt(document.getElementById('numberOfNights').value) || 1,
                singleRooms: singleRooms,
                doubleRooms: doubleRooms,
                roomTypes: buildRoomTypesString(roomTypeDetails, singleRooms, doubleRooms),
                roomTypeDetails: roomTypeDetails,
                earlyCheckIn: document.getElementById('earlyCheckIn').checked,
                lateCheckOut: document.getElementById('lateCheckOut').checked,
                extraAdultBed: globalExtraAdultBed,
                extraChildBed: globalExtraChildBed,
                sharingBed: globalSharingBed,
                promotion: document.getElementById('promotion').value || '',
                backendPrice: backendHotelPrice,
                totalCost: backendHotelPrice,
                finalCost: backendHotelPrice,
                manualCost: null,
                notes: document.getElementById('hotelNotes').value
            };
            break;
            
        case 'excursions':
            const excursionCity = document.getElementById('excursionCity').value;
            const excursionName = document.getElementById('excursionName').value;
            const excursionDate = document.getElementById('excursionDate').value;
            const excursionHotel = document.getElementById('excursionHotel').value;
            const backendExcursionPrice = parseFloat(document.getElementById('backendExcursionPrice').value) || 0;
            
            if (!excursionCity || !excursionName || !excursionDate || !excursionHotel) {
                showNotification('Please fill all required excursion fields', 'warning');
                return null;
            }
            
            if (!backendExcursionPrice) {
                showNotification('Please get backend price for excursion', 'warning');
                return null;
            }
            
            const formattedExcursionDate = formatDateForBackend(excursionDate);
            if (!formattedExcursionDate) {
                showNotification('Invalid excursion date format', 'warning');
                return null;
            }
            
            serviceData = {
                city: excursionCity,
                excursionType: excursionName,
                excursionName: document.getElementById('excursionName').selectedOptions[0]?.textContent || '',
                date: formattedExcursionDate,
                hotel: excursionHotel,
                pickupTime: document.getElementById('excursionPickupTime').value,
                eventTime: document.getElementById('excursionPickupTime').value,
                typeOfExcursion: document.getElementById('typeOfExcursion').value,
                toe: document.getElementById('typeOfExcursion').value,
                backendPrice: backendExcursionPrice,
                totalCost: backendExcursionPrice,
                finalCost: backendExcursionPrice,
                manualCost: null,
                remarks: document.getElementById('excursionRemarks').value
            };
            break;
            
        case 'tours':
            const tourCity = document.getElementById('tourCity').value;
            const tourName = document.getElementById('tourName').value;
            const tourStartDate = document.getElementById('tourStartDate').value;
            const backendTourPrice = parseFloat(document.getElementById('backendTourPrice').value) || 0;
            
            if (!tourCity || !tourName || !tourStartDate) {
                showNotification('Please fill all required tour fields', 'warning');
                return null;
            }
            
            if (!backendTourPrice) {
                showNotification('Please get backend price for tour', 'warning');
                return null;
            }
            
            const formattedTourStartDate = formatDateForBackend(tourStartDate);
            if (!formattedTourStartDate) {
                showNotification('Invalid tour start date format', 'warning');
                return null;
            }
            
            const tourEndDateValue = document.getElementById('tourEndDate').value;
            const formattedTourEndDate = tourEndDateValue ? formatDateForBackend(tourEndDateValue) : formattedTourStartDate;
            
            serviceData = {
                city: tourCity,
                tourType: tourName,
                tourName: document.getElementById('tourName').selectedOptions[0]?.textContent || '',
                route: document.getElementById('tourRoute').value,
                startDate: formattedTourStartDate,
                endDate: formattedTourEndDate,
                fromDate: formattedTourStartDate,
                toDate: formattedTourEndDate,
                tot: document.getElementById('tourToT').value,
                singleRoom: document.getElementById('tourSingleRoom').checked,
                singleRoomCount: document.getElementById('tourSingleRoom').checked ? parseInt(document.getElementById('tourSingleRoomCount').value) || 0 : 0,
                doubleRoom: document.getElementById('tourDoubleRoom').checked,
                doubleRoomCount: document.getElementById('tourDoubleRoom').checked ? parseInt(document.getElementById('tourDoubleRoomCount').value) || 0 : 0,
                tripleRoom: document.getElementById('tourTripleRoom').checked,
                tripleRoomCount: document.getElementById('tourTripleRoom').checked ? parseInt(document.getElementById('tourTripleRoomCount').value) || 0 : 0,
                backendPrice: backendTourPrice,
                totalCost: backendTourPrice,
                finalCost: backendTourPrice,
                manualCost: null,
                remarks: document.getElementById('tourRemarks').value
            };
            break;
            
        case 'others':
            const otherDescription = document.getElementById('otherDescription').value;
            const otherCost = parseFloat(document.getElementById('otherCost').value);
            
            if (!otherDescription || !otherCost || otherCost <= 0) {
                showNotification('Please fill description and enter a valid cost for other service', 'warning');
                return null;
            }
            
            const otherDateValue = document.getElementById('otherDate').value;
            const formattedOtherDate = otherDateValue ? formatDateForBackend(otherDateValue) : formatDateForBackend(document.getElementById('startDate').value);
            
            if (!formattedOtherDate) {
                showNotification('Invalid date format for other service', 'warning');
                return null;
            }
            
            serviceData = {
                description: otherDescription,
                date: formattedOtherDate,
                cost: otherCost,
                remarks: '' // otherRemarks field has been removed, so use empty string
            };
            break;
            
        default:
            return null;
    }
    
    // Calculate final cost with markup for all services
    const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
    
    if (serviceType === 'flights') {
        // For flights, apply markup to the base cost
        serviceData.finalCost = serviceData.cost * (1 + markupPercentage / 100);
    } else if (serviceType === 'others') {
        // For others, apply markup to the base cost
        serviceData.finalCost = serviceData.cost * (1 + markupPercentage / 100);
    } else {
        // For other services (transfers, hotels, excursions, tours), apply markup to backend price
        if (serviceData.backendPrice) {
            serviceData.finalCost = serviceData.backendPrice * (1 + markupPercentage / 100);
        } else {
            serviceData.finalCost = 0;
        }
    }
    
    return serviceData;
}

// Update service table
function updateServiceTable(serviceType) {
    console.log(`Updating ${serviceType} table with ${leadData[serviceType].length} services`);
    
    const tableBody = document.getElementById(`${serviceType}TableBody`);
    if (!tableBody) {
        console.error(`Table body not found: ${serviceType}TableBody`);
        return;
    }
    
    console.log(`Found table body for ${serviceType}, clearing existing content`);
    tableBody.innerHTML = '';
    
    leadData[serviceType].forEach((service, index) => {
        console.log(`Creating row ${index} for ${serviceType}:`, service);
        const row = createServiceTableRow(serviceType, service, index);
        tableBody.appendChild(row);
        console.log(`Added row ${index} to ${serviceType} table`);
    });
    
    console.log(`Finished updating ${serviceType} table`);
}

// Create service table row with edit functionality
function createServiceTableRow(serviceType, service, index) {
    const row = document.createElement('tr');
    
    switch (serviceType) {
        case 'flights':
            console.log('Creating flight table row for service:', service);
            console.log('Flight cost values - cost:', service.cost, 'finalCost:', service.finalCost, 'totalCost:', service.totalCost);
            
            const displayCost = service.finalCost || service.cost || service.totalCost || 0;
            console.log('Display cost for flight:', displayCost);
            
            row.innerHTML = `
                <td>${service.flightName}</td>
                <td>${formatDateForDisplay(service.date)}</td>
                <td>${service.departureTime}</td>
                <td>${service.arrivalTime}</td>
                <td>฿${displayCost.toFixed(2)}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-warning" onclick="editService('${serviceType}', ${index})">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeService('${serviceType}', ${index})">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            `;
            break;
            
        case 'transfers':
            row.innerHTML = `
                <td>${service.from}</td>
                <td>${service.to}</td>
                <td>${formatDateForDisplay(service.date)}</td>
                <td>${service.pickupTime}</td>
                <td>฿${(service.finalCost || 0).toFixed(2)}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-warning" onclick="editService('${serviceType}', ${index})">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeService('${serviceType}', ${index})">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            `;
            break;
            
        case 'hotels':
            row.innerHTML = `
                <td>${service.hotelName}</td>
                <td>${service.city}</td>
                <td>${formatDateForDisplay(service.checkIn || service.from_date)}</td>
                <td>${formatDateForDisplay(service.checkOut || service.to_date)}</td>
                <td>${service.nights}</td>
                <td>${service.roomTypes}</td>
                <td>฿${(service.finalCost || 0).toFixed(2)}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-warning" onclick="editService('${serviceType}', ${index})">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeService('${serviceType}', ${index})">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            `;
            break;
            
        case 'excursions':
            row.innerHTML = `
                <td>${service.excursionName}</td>
                <td>${formatDateForDisplay(service.date)}</td>
                <td>${service.pickupTime || service.eventTime}</td>
                <td>${service.hotel}</td>
                <td>฿${(service.finalCost || 0).toFixed(2)}</td>
                <td>${service.remarks}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-warning" onclick="editService('${serviceType}', ${index})">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeService('${serviceType}', ${index})">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            `;
            break;
            
        case 'tours':
            row.innerHTML = `
                <td>${service.tourName}</td>
                <td>${formatDateForDisplay(service.startDate || service.fromDate)}</td>
                <td>${formatDateForDisplay(service.endDate || service.toDate)}</td>
                <td>${service.route}</td>
                <td>฿${(service.finalCost || 0).toFixed(2)}</td>
                <td>${service.remarks}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-warning" onclick="editService('${serviceType}', ${index})">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeService('${serviceType}', ${index})">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            `;
            break;
            
        case 'others':
            row.innerHTML = `
                <td>${service.description}</td>
                <td>${formatDateForDisplay(service.date)}</td>
                <td>฿${(service.finalCost || service.cost || 0).toFixed(2)}</td>
                <td>
                    <button type="button" class="btn btn-sm btn-warning" onclick="editService('${serviceType}', ${index})">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removeService('${serviceType}', ${index})">
                        <i class="fa fa-trash"></i>
                    </button>
                </td>
            `;
            break;
    }
    
    return row;
}

// Edit service function
function editService(serviceType, index) {
    const service = leadData[serviceType][index];
    if (!service) {
        showNotification('Service not found', 'error');
        return;
    }
    
    console.log('Editing service:', serviceType, 'Index:', index, 'Data:', service);
    
    // Set editing state
    currentEditingService = { type: serviceType, index: index };
    
    // Update modal title first
    updateModalTitle(serviceType, true);
    
    // Open the modal first, then populate after it's shown
    const modalMap = {
        'flights': '#flightModal',
        'transfers': '#transferModal',
        'hotels': '#hotelModal',
        'excursions': '#excursionModal',
        'tours': '#tourModal',
        'others': '#othersModal'
    };
    
    const modal = $(modalMap[serviceType]);
    
    // Show modal and populate data after it's fully shown
    modal.on('shown.bs.modal.edit', function() {
        // Remove this specific event listener to prevent multiple bindings
        modal.off('shown.bs.modal.edit');
        
        // Populate the modal with service data
        populateServiceModal(serviceType, service);
        
        console.log('Modal populated with data for', serviceType);
    });
    
    modal.modal('show');
}

// Populate service modal with existing data
function populateServiceModal(serviceType, service) {
    switch (serviceType) {
        case 'flights':
            console.log('Populating flight modal with:', service);
            
            document.getElementById('flight').value = service.flightName || '';
            document.getElementById('number').value = service.number || '';
            document.getElementById('flightInOut').value = service.flightInOut || '';
            document.getElementById('flightRoute').value = service.route || '';
            const formattedDate = formatDateForInput(service.date || '');
            console.log('Setting flight date in edit modal:', formattedDate, 'from:', service.date);
            document.getElementById('flightDate').value = formattedDate;
            
            // Verify the date was set correctly
            setTimeout(() => {
                const actualValue = document.getElementById('flightDate').value;
                console.log('Flight date input value after setting:', actualValue);
                if (!actualValue || actualValue === '') {
                    console.error('Flight date was not set properly in edit modal!');
                }
            }, 100);
            document.getElementById('departureTime').value = service.departureTime || '';
            document.getElementById('arrivalTime').value = service.arrivalTime || '';
            document.getElementById('issuedBy').value = service.issuedBy || '';
            document.getElementById('flightCost').value = service.finalCost || service.cost || '';
            document.getElementById('flightRemarks').value = service.remarks || '';
            break;
            
        case 'transfers':
            console.log('Populating transfer modal with:', service);
            
            // Set basic fields first
            document.getElementById('transferDate').value = formatDateForInput(service.date || '');
            document.getElementById('transferFrom').value = service.from || '';
            document.getElementById('transferTo').value = service.to || '';
            document.getElementById('transferFlight').value = service.flight || '';
            document.getElementById('flightTime').value = service.flightTime || '';
            document.getElementById('transferToT').value = service.tot || '';
            document.getElementById('transferPickupTime').value = service.pickupTime || '';
            document.getElementById('backendTransferPrice').value = service.backendPrice || '';
            document.getElementById('transferRemarks').value = service.remarks || '';
            
            // Set city and transfer type with proper timing
            if (service.city) {
                const cityDropdown = document.getElementById('transferCity');
                const transferDropdown = document.getElementById('transferType');
                
                cityDropdown.value = service.city;
                
                // Trigger change event to load transfers for this city
                cityDropdown.dispatchEvent(new Event('change'));
                
                // Wait for transfers to load, then set the transfer type
                setTimeout(() => {
                    if (service.transferType) {
                        transferDropdown.value = service.transferType;
                        console.log('Set transfer type to:', service.transferType);
                    }
                }, 300);
            }
            break;
            
        case 'hotels':
            console.log('Populating hotel modal with:', service);
            
            // Set basic fields first - handle both field name formats
            const checkInDate = service.checkIn || service.from_date || '';
            const checkOutDate = service.checkOut || service.to_date || '';
            
            document.getElementById('checkInDate').value = formatDateForInput(checkInDate);
            document.getElementById('checkOutDate').value = formatDateForInput(checkOutDate);
            document.getElementById('numberOfNights').value = service.nights || '';
            document.getElementById('singleRooms').value = service.singleRooms || 0;
            document.getElementById('doubleRooms').value = service.doubleRooms || 0;
            document.getElementById('earlyCheckIn').checked = service.earlyCheckIn || false;
            document.getElementById('lateCheckOut').checked = service.lateCheckOut || false;
            
            // Handle global extra bed options
            const extraAdultBedEl = document.getElementById('extraAdultBed');
            const extraChildBedEl = document.getElementById('extraChildBed');
            const sharingBedEl = document.getElementById('sharingBed');
            
            if (extraAdultBedEl) extraAdultBedEl.checked = service.extraAdultBed || false;
            if (extraChildBedEl) extraChildBedEl.checked = service.extraChildBed || false;
            if (sharingBedEl) sharingBedEl.checked = service.sharingBed || false;
            
            document.getElementById('promotion').value = service.promotion || '';
            document.getElementById('backendHotelPrice').value = service.backendPrice || '';
            document.getElementById('hotelNotes').value = service.notes || '';
            
            // Clear existing room types first
            const roomTypesWrapper = document.getElementById('roomTypesWrapper');
            if (roomTypesWrapper) {
                roomTypesWrapper.innerHTML = '';
            }
            
            // Set city and hotel with proper timing
            if (service.city) {
                const cityDropdown = document.getElementById('hotelCity');
                const hotelDropdown = document.getElementById('hotelType');
                
                cityDropdown.value = service.city;
                
                // Trigger change event to load hotels for this city
                cityDropdown.dispatchEvent(new Event('change'));
                
                // Wait for hotels to load, then set the hotel and populate room types
                setTimeout(() => {
                    if (service.hotelType) {
                        hotelDropdown.value = service.hotelType;
                        console.log('Set hotel type to:', service.hotelType);
                        
                        // Trigger hotel change to load room types data
                        hotelDropdown.dispatchEvent(new Event('change'));
                        
                        // Populate room types immediately after hotel selection
                        setTimeout(() => {
                            populateRoomTypesForEdit(service);
                        }, 200);
                    }
                }, 400);
            } else {
                // If no city, still try to populate room types with saved data
                setTimeout(() => {
                    populateRoomTypesForEdit(service);
                }, 200);
            }
            
            // Update Add Room Type button state after populating data
            setTimeout(() => {
                updateAddRoomTypeButtonState();
            }, 300);
            break;
            
        case 'excursions':
            console.log('Populating excursion modal with:', service);
            
            // Set basic fields first
            document.getElementById('excursionDate').value = formatDateForInput(service.date || '');
            document.getElementById('excursionHotel').value = service.hotel || '';
            document.getElementById('excursionPickupTime').value = service.pickupTime || '';
            document.getElementById('typeOfExcursion').value = service.typeOfExcursion || '';
            document.getElementById('backendExcursionPrice').value = service.backendPrice || '';
            document.getElementById('excursionRemarks').value = service.remarks || '';
            
            // Set city and excursion with proper timing
            if (service.city) {
                const cityDropdown = document.getElementById('excursionCity');
                const excursionDropdown = document.getElementById('excursionName');
                
                cityDropdown.value = service.city;
                
                // Trigger change event to load excursions for this city
                cityDropdown.dispatchEvent(new Event('change'));
                
                // Wait for excursions to load, then set the excursion
                setTimeout(() => {
                    if (service.excursionName) {
                        excursionDropdown.value = service.excursionType || service.excursionName;
                        console.log('Set excursion to:', service.excursionType || service.excursionName);
                    }
                }, 800);
            }
            break;
            
        case 'tours':
            console.log('Populating tour modal with:', service);
            
            // Set basic fields first
            document.getElementById('tourStartDate').value = formatDateForInput(service.startDate || '');
            document.getElementById('tourEndDate').value = formatDateForInput(service.endDate || '');
            document.getElementById('tourRoute').value = service.route || '';
            document.getElementById('tourToT').value = service.tot || '';
            document.getElementById('backendTourPrice').value = service.backendPrice || '';
            document.getElementById('tourRemarks').value = service.remarks || '';
            
            // Handle room selections
            if (service.singleRoom) {
                document.getElementById('tourSingleRoom').checked = true;
                document.getElementById('tourSingleRoomCount').disabled = false;
                document.getElementById('tourSingleRoomCount').value = service.singleRoomCount || 0;
            }
            if (service.doubleRoom) {
                document.getElementById('tourDoubleRoom').checked = true;
                document.getElementById('tourDoubleRoomCount').disabled = false;
                document.getElementById('tourDoubleRoomCount').value = service.doubleRoomCount || 0;
            }
            if (service.tripleRoom) {
                document.getElementById('tourTripleRoom').checked = true;
                document.getElementById('tourTripleRoomCount').disabled = false;
                document.getElementById('tourTripleRoomCount').value = service.tripleRoomCount || 0;
            }
            
            // Set city and tour with proper timing
            if (service.city) {
                const cityDropdown = document.getElementById('tourCity');
                const tourDropdown = document.getElementById('tourName');
                
                cityDropdown.value = service.city;
                
                // Trigger change event to load tours for this city
                cityDropdown.dispatchEvent(new Event('change'));
                
                // Wait for tours to load, then set the tour
                setTimeout(() => {
                    if (service.tourName) {
                        tourDropdown.value = service.tourType || service.tourName;
                        console.log('Set tour to:', service.tourType || service.tourName);
                    }
                }, 300);
            }
            break;
            
        case 'others':
            console.log('Populating others modal with:', service);
            
            document.getElementById('otherDescription').value = service.description || '';
            document.getElementById('otherDate').value = formatDateForInput(service.date || '');
            document.getElementById('otherCost').value = service.cost || service.finalCost || '';
            // otherRemarks field has been removed from the HTML, so skip setting it
            break;
    }
}

// Update modal title for edit vs add
function updateModalTitle(serviceType, isEdit = false) {
    const modalTitleId = getModalTitleId(serviceType);
    const modalTitleElement = document.getElementById(modalTitleId);
    
    if (modalTitleElement) {
        const action = isEdit ? 'Edit' : 'Add';
        const serviceTypeMap = {
            'flights': 'Flight',
            'transfers': 'Transfer',
            'hotels': 'Hotel',
            'excursions': 'Excursion',
            'tours': 'Tour',
            'others': 'Other Service'
        };
        const serviceTypeCapitalized = serviceTypeMap[serviceType] || serviceType;
        modalTitleElement.textContent = `${action} ${serviceTypeCapitalized}`;
    }
}

// Get modal title ID for each service type
function getModalTitleId(serviceType) {
    const modalTitleMap = {
        'flights': 'flightModalLabel',
        'transfers': 'transferModalLabel',
        'hotels': 'hotelModalLabel',
        'excursions': 'excursionModalLabel',
        'tours': 'tourModalLabel',
        'others': 'othersModalLabel'
    };
    return modalTitleMap[serviceType];
}

// Reset service form
function resetServiceForm(serviceType) {
    const formMap = {
        'flights': 'flightForm',
        'transfers': 'transferForm',
        'hotels': 'hotelBookingForm',
        'excursions': 'excursionForm',
        'tours': 'tourForm',
        'others': 'othersForm'
    };
    
    const formId = formMap[serviceType];
    if (formId) {
        document.getElementById(formId).reset();
        
        // Clear backend price displays
        const backendPriceIds = {
            'transfers': 'backendTransferPrice',
            'hotels': 'backendHotelPrice',
            'excursions': 'backendExcursionPrice',
            'tours': 'backendTourPrice'
        };
        
        if (backendPriceIds[serviceType]) {
            document.getElementById(backendPriceIds[serviceType]).value = '';
        }
    }
    
    // Reset editing state
    currentEditingService = null;
    
    // Reset modal title
    updateModalTitle(serviceType, false);
}

// Remove service
function removeService(serviceType, index) {
    if (confirm('Are you sure you want to remove this service?')) {
        leadData[serviceType].splice(index, 1);
        updateServiceTable(serviceType);
        updatePricingSummary();
        showNotification('Service removed successfully', 'success');
    }
}

// Update pricing summary
function updatePricingSummary() {
    let totalCost = 0;
    // Calculate total cost (without markup)
    Object.keys(leadData).forEach(serviceType => {
        leadData[serviceType].forEach(service => {
            // Add base cost (without markup)
            if (service.backendPrice) {
                totalCost += service.backendPrice;
            } else if (service.totalCost) {
                totalCost += service.totalCost;
            } else {
                totalCost += service.cost || 0;
            }
        });
    });
    
    const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
    const markupAmount = totalCost * (markupPercentage / 100);
    const finalCost = totalCost + markupAmount;
    
    // Update display: baseCost element now shows "Total Cost" (without markup)
    document.getElementById('baseCost').textContent = `฿${totalCost.toFixed(2)}`;
    document.getElementById('markupPercent').textContent = markupPercentage.toFixed(1);
    document.getElementById('markupAmount').textContent = `฿${markupAmount.toFixed(2)}`;
    document.getElementById('finalCost').textContent = `฿${finalCost.toFixed(2)}`;
}

// Helper function to populate room types when editing hotels
function populateRoomTypesForEdit(service) {
    const roomTypesWrapper = document.getElementById('roomTypesWrapper');
    if (!roomTypesWrapper) return;
    
    // Handle room types if they exist
    if (service.roomTypeDetails && service.roomTypeDetails.length > 0) {
        console.log('Populating room types for edit:', service.roomTypeDetails);
        
        // Recreate room type blocks with saved data
        service.roomTypeDetails.forEach((roomTypeDetail, index) => {
            // Create the room type block
            const roomTypeDiv = document.createElement('div');
            roomTypeDiv.className = 'room-type-block border rounded p-3 mb-3';
            roomTypeDiv.id = `roomType_${roomTypeCounter}`;
            
            roomTypeDiv.innerHTML = `
                <div class="row">
                    <div class="col-md-3">
                        <label>Room Type *</label>
                        <select class="form-control roomtype-dropdown" required>
                            <option value="">Select Room Type</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label>Adults</label>
                        <input type="number" class="form-control adults-input" min="0" value="${roomTypeDetail.adults || 2}" />
                    </div>
                    <div class="col-md-2">
                        <label>Children</label>
                        <input type="number" class="form-control children-input" min="0" value="${roomTypeDetail.children || 0}" />
                    </div>
                    <div class="col-md-4">
                        <label>Options</label><br>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="abf_${roomTypeCounter}" ${roomTypeDetail.abf ? 'checked' : ''}>
                            <label class="form-check-label" for="abf_${roomTypeCounter}">Complimentary ABF</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="extraAdultBed_${roomTypeCounter}" ${roomTypeDetail.extraAdultBed ? 'checked' : ''}>
                            <label class="form-check-label" for="extraAdultBed_${roomTypeCounter}">Extra Adult Bed</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="extraChildBed_${roomTypeCounter}" ${roomTypeDetail.extraChildBed ? 'checked' : ''}>
                            <label class="form-check-label" for="extraChildBed_${roomTypeCounter}">Extra Child Bed</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="sharingBed_${roomTypeCounter}" ${roomTypeDetail.sharingBed ? 'checked' : ''}>
                            <label class="form-check-label" for="sharingBed_${roomTypeCounter}">Sharing Bed</label>
                        </div>
                    </div>
                    <div class="col-md-1">
                        <label>&nbsp;</label><br>
                        <button type="button" class="btn btn-danger btn-sm remove-room-type">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            roomTypesWrapper.appendChild(roomTypeDiv);
            
            // Add remove functionality
            roomTypeDiv.querySelector('.remove-room-type').addEventListener('click', function() {
                roomTypesWrapper.removeChild(roomTypeDiv);
                updateAddRoomTypeButtonState();
            });
            
            // Populate room types dropdown and set the selected value
            const roomTypeDropdown = roomTypeDiv.querySelector('.roomtype-dropdown');
            const currentCounter = roomTypeCounter;
            
            // Try to populate from hotel data first
            const hotelDropdown = document.getElementById('hotelType');
            if (hotelDropdown && hotelDropdown.value && selectedHotelData[hotelDropdown.value]) {
                const roomTypes = selectedHotelData[hotelDropdown.value].room_types || [];
                roomTypes.forEach(roomType => {
                    const option = document.createElement('option');
                    option.value = roomType.id;
                    option.textContent = roomType.name;
                    roomTypeDropdown.appendChild(option);
                });
                
                // Set the selected room type
                if (roomTypeDetail.roomTypeId) {
                    roomTypeDropdown.value = roomTypeDetail.roomTypeId;
                }
            } else {
                // If hotel data is not available, create a placeholder option with the saved data
                if (roomTypeDetail.roomTypeId && roomTypeDetail.roomTypeName) {
                    const option = document.createElement('option');
                    option.value = roomTypeDetail.roomTypeId;
                    option.textContent = roomTypeDetail.roomTypeName;
                    option.selected = true;
                    roomTypeDropdown.appendChild(option);
                }
            }
            
            // Add ABF auto-check functionality
            addAbfAutoCheckListener(roomTypeDropdown, roomTypeDiv, currentCounter);
            
            roomTypeCounter++;
        });
        
        console.log(`Created ${service.roomTypeDetails.length} room type blocks for editing`);
    }
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Format date from backend for HTML input (HTML date inputs expect YYYY-MM-DD format)
function formatDateForInput(dateString) {
    // Handle empty or null input
    if (!dateString || dateString.trim() === '') {
        return '';
    }
    
    // Check if already in YYYY-MM-DD format
    const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (yyyymmddRegex.test(dateString)) {
        return dateString;
    }
    
    // Check if in DD-MM-YYYY format and convert to YYYY-MM-DD
    const ddmmyyyyRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (ddmmyyyyRegex.test(dateString)) {
        const [day, month, year] = dateString.split("-");
        return `${year}-${month}-${day}`;
    }

    // Try to parse other formats
    const dateParts = dateString.split("-");
    if (dateParts.length === 3) {
        // Assume it's already in some valid format
        return dateString;
    }
    
    return '';
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
    // Check for empty or null input
    if (!dateString || dateString.trim() === '') {
        return null;
    }
    
    // Check if the date is in dd-mm-yyyy format
    const ddmmyyyyRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (ddmmyyyyRegex.test(dateString)) {
        const [day, month, year] = dateString.split("-");
        return `${year}-${month}-${day}`; // Convert to yyyy-mm-dd
    }

    // Assume the date is already in yyyy-mm-dd format
    const yyyymmddRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (yyyymmddRegex.test(dateString)) {
        return dateString;
    }

    // Return null for invalid formats
    return null;
}

// Preview lead
async function previewLead() {
    const leadFormData = collectLeadFormData();
    
    if (!leadFormData) {
        showNotification('Please fill all required fields', 'warning');
        return;
    }
    
    // Show preview modal or navigate to preview page
    showNotification('Lead preview functionality coming soon', 'info');
}

// Handle lead submission
async function handleLeadSubmission(event) {
    event.preventDefault();
    
    // Show confirmation dialog
    const confirmed = await showConfirmationDialog(
        'Confirm Lead Creation',
        'Are you sure you want to create this lead? This will save all the lead details and services you have added.',
        'Create Lead',
        'Cancel'
    );
    
    if (!confirmed) {
        return; // User cancelled
    }
    
    // Clean up leadData before collecting form data
    // Remove any services with invalid dates
    Object.keys(leadData).forEach(serviceType => {
        const originalLength = leadData[serviceType].length;
        leadData[serviceType] = leadData[serviceType].filter(service => {
            if (serviceType === 'flights' && (!service.date || service.date === '')) {
                console.warn('Removing flight with invalid date:', service);
                return false;
            }
            if (serviceType === 'transfers' && (!service.date || service.date === '')) {
                console.warn('Removing transfer with invalid date:', service);
                return false;
            }
            if (serviceType === 'hotels' && (!service.from_date || service.from_date === '' || !service.to_date || service.to_date === '')) {
                console.warn('Removing hotel with invalid dates:', service);
                return false;
            }
            if (serviceType === 'excursions' && (!service.date || service.date === '')) {
                console.warn('Removing excursion with invalid date:', service);
                return false;
            }
            if (serviceType === 'tours' && (!service.startDate || service.startDate === '')) {
                console.warn('Removing tour with invalid start date:', service);
                return false;
            }
            if (serviceType === 'others' && (!service.date || service.date === '')) {
                console.warn('Removing other service with invalid date:', service);
                return false;
            }
            return true;
        });
        
        // If we removed any services, update the table
        if (originalLength !== leadData[serviceType].length) {
            updateServiceTable(serviceType);
            updatePricingSummary();
        }
    });
    
    const leadFormData = collectLeadFormData();
    
    if (!leadFormData) {
        showNotification('Please fill all required fields', 'warning');
        return;
    }
    
    const token = localStorage.getItem('token');
    
    try {
        showButtonLoading('submitLead');
        
        // Final validation: Check all flight dates before submission
        if (leadFormData.flights && leadFormData.flights.length > 0) {
            for (let i = 0; i < leadFormData.flights.length; i++) {
                const flight = leadFormData.flights[i];
                if (!flight.flight_date || flight.flight_date === '') {
                    showNotification(`Flight ${i + 1} has an invalid date. Please remove it or update with a valid date.`, 'error');
                    hideButtonLoading('submitLead');
                    return;
                }
            }
        }
        
        console.log('Sending lead data:', leadFormData); // Debug log
        console.log('Start date format:', leadFormData.startDate);
        console.log('Booking date format:', leadFormData.bookingDate);
        
        // Debug: Check flight data specifically
        if (leadFormData.flights && leadFormData.flights.length > 0) {
            console.log('Flight data being sent:');
            leadFormData.flights.forEach((flight, index) => {
                console.log(`Flight ${index + 1}:`, flight);
                console.log(`Flight ${index + 1} flight_date:`, flight.flight_date);
                console.log(`Flight ${index + 1} flight_date type:`, typeof flight.flight_date);
                console.log(`Flight ${index + 1} flight_date length:`, flight.flight_date ? flight.flight_date.length : 'null/undefined');
                
                // Check each field
                Object.keys(flight).forEach(key => {
                    if (flight[key] === null || flight[key] === undefined) {
                        console.warn(`Flight ${index + 1} has null/undefined ${key}`);
                    }
                });
            });
        } else {
            console.log('No flights in lead data');
        }
        
        // Final check before sending
        const requestBody = JSON.stringify(leadFormData);
        console.log('Full request body:', requestBody);
        
        // Check if any flight has empty date in the stringified body
        if (requestBody.includes('"flight_date":""') || requestBody.includes('"flight_date":null')) {
            console.error('WARNING: Request body contains empty or null flight_date!');
            console.error('Request body snippet:', requestBody.substring(0, 500));
        }
        
        const response = await fetch(`${Endpoint}/api/v1/proposals`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: requestBody
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend error:', errorText);
            throw new Error(`Failed to create lead: ${errorText}`);
        }
        
        const result = await response.json();
        showNotification('Lead created successfully!', 'success');
        
        // Redirect to leads page after 1 minute delay
        setTimeout(() => {
            window.location.href = 'leads.html';
        },300); // 60 seconds = 1 minute
        
    } catch (error) {
        console.error('Error creating lead:', error);
        showNotification('Failed to create lead. Please try again.', 'error');
    } finally {
        hideButtonLoading('submitLead');
    }
}

// Collect lead form data
function collectLeadFormData() {
    // Check if all required elements exist
    const requiredElements = [
        'optionName', 'templateType', 'markupPercentage', 'expiryDays', 'urgency',
        'clientName', 'clientEmail', 'clientPhone', 'startDate', 'bookingDate',
        'numberOfAdults', 'numberOfKids'
    ];
    
    for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
            console.error(`Required element not found: ${elementId}`);
            showNotification(`Form element missing: ${elementId}`, 'error');
            return null;
        }
    }
    
    const optionName = document.getElementById('optionName').value;
    const templateType = document.getElementById('templateType').value;
    const markupPercentage = parseFloat(document.getElementById('markupPercentage').value);
    const expiryDays = parseInt(document.getElementById('expiryDays').value) || 3;
    const urgency = document.getElementById('urgency').value;
    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientPhone = document.getElementById('clientPhone').value;
    const startDate = document.getElementById('startDate').value;
    
    // Calculate endDate as 7 days after startDate
    let endDate = startDate;
    if (startDate) {
        const startDateObj = new Date(startDate);
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(endDateObj.getDate() + 7); // Default to 7 days after start date
        const year = endDateObj.getFullYear();
        const month = String(endDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(endDateObj.getDate()).padStart(2, '0');
        endDate = `${year}-${month}-${day}`;
    }
    
    const bookingDate = document.getElementById('bookingDate').value;
    const numberOfAdults = parseInt(document.getElementById('numberOfAdults').value);
    const numberOfKids = parseInt(document.getElementById('numberOfKids').value);
    
    if (!optionName || !clientName || !clientEmail || !clientPhone || !startDate || !bookingDate) {
        return null;
    }
    
    // Validate date formats
    const formattedStartDate = formatDateForBackend(startDate);
    const formattedBookingDate = formatDateForBackend(bookingDate);
    
    if (!formattedStartDate) {
        showNotification('Invalid start date format. Please select a valid date.', 'error');
        return null;
    }
    
    if (!formattedBookingDate) {
        showNotification('Invalid booking date format. Please select a valid date.', 'error');
        return null;
    }
    
    // Check if at least one service is added
    const hasServices = Object.keys(leadData).some(serviceType => leadData[serviceType].length > 0);
    if (!hasServices) {
        showNotification('Please add at least one service to the lead', 'warning');
        return null;
    }
    
    // Calculate total costs
    let totalCost = 0;
    Object.keys(leadData).forEach(serviceType => {
        leadData[serviceType].forEach(service => {
            // Calculate total cost without markup
            if (service.backendPrice) {
                totalCost += service.backendPrice;
            } else {
                totalCost += service.cost || service.finalCost || 0;
            }
        });
    });
    
    const markupAmount = totalCost * (markupPercentage / 100);
    const finalCost = totalCost + markupAmount;
    
    // Process hotels to ensure they have from_date and to_date
    const processedHotels = (leadData.hotels || []).map(hotel => {
        // Make a copy of the hotel object
        const processedHotel = {...hotel};
        
        // Ensure from_date and to_date are set
        if (!processedHotel.from_date) {
            processedHotel.from_date = processedHotel.checkIn || '';
        }
        if (!processedHotel.to_date) {
            processedHotel.to_date = processedHotel.checkOut || '';
        }
        
        return processedHotel;
    });
    
    return {
        option_name: optionName,
        template_type: templateType,
        markup_percentage: markupPercentage,
        expiry_days: expiryDays,
        urgency: urgency,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        start_date: formatDateForBackend(startDate) || '',
        booking_date: formatDateForBackend(bookingDate) || '',
        number_of_adults: numberOfAdults,
        number_of_kids: numberOfKids,
        internal_notes: document.getElementById('internalNotes')?.value || '',
        client_notes: document.getElementById('clientNotes')?.value || '',
        remarks: document.getElementById('internalNotes')?.value || '', // Backend expects 'remarks' field
        base_cost: totalCost,
        markup_amount: markupAmount,
        final_cost: finalCost,
        flights: leadData.flights
            .filter(flight => {
                // More thorough filtering
                if (!flight.date || flight.date === '' || flight.date === null) {
                    console.warn('Filtering out flight with invalid date:', flight);
                    return false;
                }
                // Ensure the date is in the correct format
                if (!flight.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    console.warn('Filtering out flight with incorrectly formatted date:', flight);
                    return false;
                }
                return true;
            })
            .map(flight => {
                // Create a clean flight object with guaranteed non-null values
                // Map to backend expected field names (snake_case)
                const cleanFlight = {
                    flight_name: flight.flightName || '',
                    flight_number: flight.number || '',
                    in_or_out: flight.flightInOut || '',
                    route: flight.route || '',
                    flight_date: flight.date || '', // Backend expects flight_date
                    departure_time: flight.departureTime || '',
                    arrival_time: flight.arrivalTime || '',
                    issued_by: flight.issuedBy || '',
                    city: flight.city || '',
                    total_cost: parseFloat(flight.totalCost || flight.cost || 0),
                    final_cost: parseFloat(flight.finalCost || flight.cost || 0),
                    remarks: flight.remarks || ''
                };
                
                // Final validation
                if (!cleanFlight.flight_date || cleanFlight.flight_date === '') {
                    console.error('CRITICAL: Flight date is still empty after all validations!', cleanFlight);
                    // Force a valid date to prevent backend error
                    cleanFlight.flight_date = formatDateForBackend(document.getElementById('startDate').value) || new Date().toISOString().split('T')[0];
                }
                
                return cleanFlight;
            }),
        transfers: leadData.transfers.map(transfer => ({
            transfer_id: parseInt(transfer.transferType) || 0,
            transfer_type: transfer.transferType || '',
            transfer_name: transfer.transferName || '',
            transfer_description: transfer.transferDescription || transfer.transferName || '',
            city: transfer.city || '',
            from_location: transfer.from || '',
            to_location: transfer.to || '',
            date: transfer.date || '',
            flight_time: transfer.flightTime || '',
            flight: transfer.flight || '',
            pickup_time: transfer.pickupTime || '',
            flight_number: transfer.flightNumber || transfer.flight || '',
            tot: transfer.tot || '',
            remarks: transfer.remarks || '',
            backend_price: transfer.backendPrice || 0,
            manual_cost: null,
            total_cost: transfer.totalCost || transfer.backendPrice || 0,
            discount: 0,
            final_cost: transfer.finalCost || 0
        })),
        hotels: processedHotels.map(hotel => ({
            hotel_id: parseInt(hotel.hotelType) || 0,
            room_id: 0, // This should be set from room type data
            from_date: hotel.from_date || hotel.checkIn || '',
            to_date: hotel.to_date || hotel.checkOut || '',
            city: hotel.city || '',
            hotel_name: hotel.hotelName || '',
            room_types: (hotel.roomTypeDetails || []).map(rt => ({
                room_type_id: parseInt(rt.roomTypeId) || 0,
                room_type: rt.roomTypeName || '',
                adults: rt.adults || 0,
                children: rt.children || 0,
                complimentary_abf: rt.abf || false,
                extra_adult_bed: rt.extraAdultBed || false,
                extra_child_bed: rt.extraChildBed || false,
                sharing_bed: rt.sharingBed || false
            })),
            nights: hotel.nights || 1,
            single_room_days: hotel.singleRooms || 0,
            double_room_days: hotel.doubleRooms || 0,
            abf_notes: '',
            lunch_notes: '',
            dinner_notes: '',
            all_inclusive_notes: '',
            days_abf: 0,
            days_lunch: 0,
            days_dinner: 0,
            days_all_inclusive: 0,
            all_inclusive: hotel.allInclusive || false,
            abf_include: hotel.abfInclude || false,
            lunch_include: hotel.lunchInclude || false,
            dinner_include: hotel.dinnerInclude || false,
            early_checkin: hotel.earlyCheckIn || false,
            late_checkout: hotel.lateCheckOut || false,
            day_use: hotel.dayUse || false,
            christmas_dinner: hotel.christmasDinner || false,
            newyear_dinner: hotel.newYearDinner || false,
            promotion: hotel.promotion || '',
            free_nights: hotel.freeNights || 0,
            discount_percentage: hotel.discountPercentage || 0,
            flight_in: '',
            flight_out: '',
            flight_info: '',
            notes: hotel.notes || '',
            total_cost: hotel.totalCost || hotel.backendPrice || 0,
            final_cost: hotel.finalCost || 0
        })),
        excursions: leadData.excursions.map(excursion => ({
            excursion_id: parseInt(excursion.excursionType) || 0,
            excursion_name: excursion.excursionName || '',
            city: excursion.city || '',
            toe: excursion.toe || excursion.typeOfExcursion || '',
            date: excursion.date || '',
            event_time: excursion.eventTime || excursion.pickupTime || '',
            hotel: excursion.hotel || '',
            remarks: excursion.remarks || '',
            total_cost: excursion.totalCost || excursion.backendPrice || 0,
            discount: 0,
            final_cost: excursion.finalCost || 0
        })),
        tours: leadData.tours.map(tour => ({
            tour_id: parseInt(tour.tourType) || 0,
            tour_name: tour.tourName || '',
            tot: tour.tot || '',
            from_location: tour.city || '',
            from_date: tour.fromDate || tour.startDate || '',
            to_date: tour.toDate || tour.endDate || tour.startDate || '',
            route: tour.route || '',
            departure_time: tour.departureTime || '',
            arrival_time: tour.arrivalTime || '',
            flight_in: tour.flightIn || '',
            flight_out: tour.flightOut || '',
            remarks: tour.remarks || '',
            single_rooms: tour.singleRoomCount || 0,
            double_rooms: tour.doubleRoomCount || 0,
            triple_rooms: tour.tripleRoomCount || 0,
            total_cost: tour.totalCost || tour.backendPrice || 0,
            discount: 0,
            final_cost: tour.finalCost || 0
        })),
        others: leadData.others.map(other => ({
            description: other.description || '',
            date: other.date || '',
            total_price: other.cost || other.finalCost || 0,
            remarks: other.remarks || ''
        }))
    };
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
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
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Show button loading
function showButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i>Processing...';
    }
}

// Hide button loading
function hideButtonLoading(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="fa fa-save mr-2"></i>Create Lead';
    }
}

// Make removeService function global
window.removeService = removeService;

// Make editService function global
window.editService = editService;

// Show confirmation dialog
function showConfirmationDialog(title, message, confirmText = 'Confirm', cancelText = 'Cancel') {
  return new Promise((resolve) => {
    // Create modal HTML
    const modalId = 'confirmationModal_' + Date.now();
    const modalHtml = `
      <div class="modal fade" id="${modalId}" tabindex="-1" role="dialog" aria-labelledby="${modalId}Label" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
          <div class="modal-content">
            <div class="modal-header bg-warning text-white">
              <h5 class="modal-title" id="${modalId}Label">
                <i class="fa fa-exclamation-triangle mr-2"></i>${title}
              </h5>
            </div>
            <div class="modal-body">
              <p class="mb-0">${message}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="${modalId}Cancel">
                <i class="fa fa-times mr-2"></i>${cancelText}
              </button>
              <button type="button" class="btn btn-warning" id="${modalId}Confirm">
                <i class="fa fa-check mr-2"></i>${confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to DOM
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById(modalId);
    const confirmBtn = document.getElementById(modalId + 'Confirm');
    const cancelBtn = document.getElementById(modalId + 'Cancel');
    
    let resolved = false;
    
    // Function to resolve and cleanup
    const resolveAndCleanup = (result) => {
      if (resolved) return;
      resolved = true;
      
      // Hide modal first
      $(modal).modal('hide');
      
      // Clean up after modal is hidden
      setTimeout(() => {
        if (modal && modal.parentNode) {
          modal.remove();
        }
        resolve(result);
      }, 300);
    };
    
    // Show modal
    $(modal).modal('show');
    
    // Handle confirm
    confirmBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resolveAndCleanup(true);
    });
    
    // Handle cancel
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resolveAndCleanup(false);
    });
    
    // Handle modal close events
    $(modal).on('hidden.bs.modal', () => {
      if (!resolved) {
        resolved = true;
        if (modal && modal.parentNode) {
          modal.remove();
        }
        resolve(false);
      }
    });
  });
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
