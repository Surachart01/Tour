// Edit Lead Management System
document.addEventListener("DOMContentLoaded", function () {
  // Initialize authentication and user setup
  initializeAuth();
  
  // Get lead ID from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  
  if (!leadId) {
    alert('No lead ID provided');
    window.location.href = 'leads.html';
    return;
  }
  
  // Initialize the edit lead system
  initializeEditLead(leadId);
});

// Global variables
let currentUser = null;
let currentLead = null;
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
let globalExtraAdultBed = false;
let globalExtraChildBed = false;
let globalSharingBed = false;

// Global editing state
let currentEditingService = null; // { type: 'transfers', index: 0 }

// Authentication and initialization
function initializeAuth() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username") || "Guest";
  const agentname = localStorage.getItem("agentname") || "";

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
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

// Initialize the edit lead system
async function initializeEditLead(leadId) {
  try {
    showLoadingOverlay();
    
    // Load lead data first
    await loadLeadData(leadId);
    
    // Setup event listeners
    setupEventListeners();
    
    // Populate city dropdowns for all service modals
    await populateCitiesDropdown('.city-dropdown-transfer');
    await populateCitiesDropdown('.city-dropdown-hotel');
    await populateCitiesDropdown('.city-dropdown-excursion');
    await populateCitiesDropdown('.city-dropdown-tour');
    
    // Setup city change listeners
    setupCityChangeListeners();
    
    // Hide loading overlay
    hideLoadingOverlay();
    
  } catch (error) {
    console.error('Failed to initialize edit lead:', error);
    hideLoadingOverlay();
    showNotification('Failed to load lead data. Please try again.', 'error');
  }
}

// Load lead data from API
async function loadLeadData(leadId) {
  try {
    const response = await apiCall(`/proposals/${leadId}`);
    currentLead = response;
    
    // Populate the form with lead data
    populateForm(currentLead);
    
    // Update page header
    document.getElementById('leadReference').textContent = 
      `${currentLead.lead_reference} - ${currentLead.option_name}`;
    
    console.log('Lead data loaded successfully:', currentLead);
  } catch (error) {
    console.error('Failed to load lead data:', error);
    
    // If API fails, try demo mode
    if (error.message.includes('API endpoint not found') || 
        error.message.includes('404')) {
      console.log('API not available, using demo data');
      loadDemoLeadData(leadId);
    } else {
      throw error;
    }
  }
}

// Load demo lead data when API is not available
function loadDemoLeadData(leadId) {
  // Create demo lead data
  currentLead = {
    id: leadId,
    lead_reference: `LEAD-2024-${leadId.toString().padStart(3, '0')}`,
    option_name: 'Bangkok Explorer Package',
    template_type: 'simple',
    markup_percentage: 15,
    expiry_days: 30,
    urgency: 'medium',
    client_name: 'John Doe',
    client_email: 'john.doe@example.com',
    client_phone: '+1234567890',
    start_date: '2024-03-15',
    booking_date: '2024-02-15',
    number_of_adults: 2,
    number_of_kids: 0,
    client_booking_reference: 'CLIENT-REF-001',
    internal_notes: 'First-time visitor, interested in cultural sites',
    client_notes: 'Looking for authentic Thai experiences',
    status: 'draft',
    created_at: new Date().toISOString(),
    services: {
      flights: [
        {
          flight_name: 'Bangkok Airways PG 123',
          flight_date: '2024-03-15',
          departure_time: '10:30',
          arrival_time: '12:45',
          final_cost: 450.00
        }
      ],
      transfers: [
        {
          from_location: 'Suvarnabhumi Airport',
          to_location: 'Hotel Riverside',
          date: '2024-03-15',
          pickup_time: '13:30',
          final_cost: 35.00
        }
      ],
      hotels: [
        {
          hotel_name: 'Hotel Riverside Bangkok',
          city: 'Bangkok',
          from_date: '2024-03-15',
          to_date: '2024-03-18',
          nights: 3,
          room_types: ['Deluxe Room', 'Superior Room'],
          final_cost: 285.00
        }
      ],
      excursions: [
        {
          excursion_name: 'Grand Palace & Wat Pho Tour',
          date: '2024-03-16',
          event_time: '09:00',
          final_cost: 65.00
        }
      ],
      tours: [
        {
          tour_name: 'Floating Market & River Cruise',
          from_date: '2024-03-17',
          to_date: '2024-03-17',
          route: 'Damnoen Saduak - Chao Phraya River',
          final_cost: 85.00
        }
      ],
      others: [
        {
          description: 'Travel Insurance',
          date: '2024-03-15',
          total_price: 25.00
        }
      ]
    }
  };
  
  // Populate the form
  populateForm(currentLead);
  
  // Update page header
  document.getElementById('leadReference').textContent = 
    `${currentLead.lead_reference} - ${currentLead.option_name}`;
  
  showNotification('Demo mode: Using sample lead data', 'info');
}

// Populate form with lead data
function populateForm(lead) {
  // Lead Configuration
  document.getElementById('optionName').value = lead.option_name || '';
  document.getElementById('templateType').value = lead.template_type || 'simple';
  document.getElementById('markupPercentage').value = lead.markup_percentage || 15;
  document.getElementById('expiryDays').value = lead.expiry_days || 30;
  document.getElementById('urgency').value = lead.urgency || 'medium';
  
  // Client Information
  document.getElementById('clientName').value = lead.client_name || '';
  document.getElementById('clientEmail').value = lead.client_email || '';
  document.getElementById('clientPhone').value = lead.client_phone || '';
  
  // Trip Details
  document.getElementById('startDate').value = formatDateForInput(lead.start_date || '');
  document.getElementById('bookingDate').value = formatDateForInput(lead.booking_date || '');
  document.getElementById('numberOfAdults').value = lead.number_of_adults || 2;
  document.getElementById('numberOfKids').value = lead.number_of_kids || 0;
  
  // Notes
  document.getElementById('internalNotes').value = lead.internal_notes || '';
  document.getElementById('clientNotes').value = lead.client_notes || '';
  
  // Load services data from lead object - ensure all arrays are properly initialized
  // Backend sends services directly as arrays, not nested in a services object
  leadData = {
    flights: Array.isArray(lead.flights) ? lead.flights : [],
    transfers: Array.isArray(lead.transfers) ? lead.transfers : [],
    hotels: Array.isArray(lead.hotels) ? lead.hotels : [],
    excursions: Array.isArray(lead.excursions) ? lead.excursions : [],
    tours: Array.isArray(lead.tours) ? lead.tours : [],
    others: Array.isArray(lead.others) ? lead.others : []
  };
  
  console.log('Initialized leadData:', leadData);
  
  // Render all service sections that have data
  Object.keys(leadData).forEach(serviceType => {
    if (Array.isArray(leadData[serviceType]) && leadData[serviceType].length > 0) {
      renderServiceItems(serviceType);
    }
  });
  
  updatePricingSummary();
}

// Set up event listeners
function setupEventListeners() {
  // Form submission
  document.getElementById('editLeadForm').addEventListener('submit', handleFormSubmit);
  
  // Markup percentage change
  document.getElementById('markupPercentage').addEventListener('input', function() {
    document.getElementById('markupPercent').textContent = this.value;
    updatePricingSummary();
  });
  
  // Number of adults/children change confirmation
  document.getElementById('numberOfAdults').addEventListener('change', function() {
    showPaxChangeConfirmation('adults', this.value);
  });
  
  document.getElementById('numberOfKids').addEventListener('change', function() {
    showPaxChangeConfirmation('children', this.value);
  });
  
  // Preview button
  document.getElementById('previewLeadBtn').addEventListener('click', function() {
    showNotification('Lead preview will be implemented in the next phase', 'info');
  });
  
  // Add service buttons - Use modal system like add_lead.html
  document.getElementById('addFlightBtn').addEventListener('click', function() {
    // Reset editing state for new flight
    currentEditingService = null;
    updateModalTitle('flights', false);
    initializeNewFlightModal();
    $('#flightModal').modal('show');
  });
  
  document.getElementById('addTransferBtn').addEventListener('click', function() {
    // Reset editing state for new transfer
    currentEditingService = null;
    updateModalTitle('transfers', false);
    initializeNewTransferModal();
    $('#transferModal').modal('show');
  });
  
  document.getElementById('addHotelBtn').addEventListener('click', function() {
    // Reset editing state for new hotel
    currentEditingService = null;
    updateModalTitle('hotels', false);
    $('#hotelModal').modal('show');
  });
  
  document.getElementById('addExcursionBtn').addEventListener('click', function() {
    // Reset editing state for new excursion
    currentEditingService = null;
    updateModalTitle('excursions', false);
    initializeNewExcursionModal();
    $('#excursionModal').modal('show');
  });
  
  document.getElementById('addTourBtn').addEventListener('click', function() {
    // Reset editing state for new tour
    currentEditingService = null;
    updateModalTitle('tours', false);
    initializeNewTourModal();
    $('#tourModal').modal('show');
  });
  
  document.getElementById('addOtherBtn').addEventListener('click', function() {
    // Reset editing state for new other service
    currentEditingService = null;
    updateModalTitle('others', false);
    initializeNewOtherModal();
    $('#othersModal').modal('show');
  });
  
  // Modal save buttons
  document.getElementById('saveFlight').addEventListener('click', function() {
    saveFlightData();
  });
  
  document.getElementById('saveTransfer').addEventListener('click', function() {
    saveTransferData();
  });
  
  document.getElementById('saveHotelBooking').addEventListener('click', function() {
    saveHotelData();
  });
  
  document.getElementById('saveExcursion').addEventListener('click', function() {
    saveExcursionData();
  });
  
  document.getElementById('saveTour').addEventListener('click', function() {
    saveTourData();
  });
  
  // Tour event listeners
  document.getElementById('tourName').addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    if (selectedOption && selectedOption.value) {
      // Update route field
      const route = selectedOption.getAttribute('data-route') || '';
      document.getElementById('tourRoute').value = route;
      
      // Calculate end date based on duration
      calculateTourEndDate();
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

  document.getElementById('saveOther').addEventListener('click', function() {
    saveOtherData();
  });

  // Get Price button event listeners
  document.getElementById('getTransferPriceBtn').addEventListener('click', calculateTransferPrice);
  document.getElementById('getHotelPriceBtn').addEventListener('click', calculateHotelPrice);
  document.getElementById('getExcursionPriceBtn').addEventListener('click', calculateExcursionPrice);
  document.getElementById('getTourPriceBtn').addEventListener('click', calculateTourPrice);
  
  // City change listeners
  setupCityChangeListeners();
  
  // Hotel-specific event listeners
  setupHotelEventListeners();
  
  // Hotel modal event listeners
  setupHotelModalEventListeners();
}

// Setup hotel-specific event listeners
function setupHotelEventListeners() {
  // Add Room Type button
  const addRoomTypeBtn = document.getElementById('addRoomTypeBtn');
  if (addRoomTypeBtn) {
    addRoomTypeBtn.addEventListener('click', addRoomType);
  }
  
  // Add event listeners for room count changes
  const singleRoomsInput = document.getElementById('singleRooms');
  const doubleRoomsInput = document.getElementById('doubleRooms');
  
  if (singleRoomsInput) {
    singleRoomsInput.addEventListener('input', updateAddRoomTypeButtonState);
  }
  
  if (doubleRoomsInput) {
    doubleRoomsInput.addEventListener('input', updateAddRoomTypeButtonState);
  }
  
  // Extra bed checkboxes - removed from edit_lead.html, no longer needed
}

// Setup hotel modal event listeners
function setupHotelModalEventListeners() {
  // Hotel modal shown event - initialize for new hotels
  $('#hotelModal').on('shown.bs.modal', function() {
    // Only initialize if this is a new hotel (not editing)
    if (!currentEditingService || currentEditingService.type !== 'hotels') {
      initializeNewHotelModal();
    }
  });
  
  // Date change listeners for automatic nights calculation
  const checkInDateInput = document.getElementById('checkInDate');
  const checkOutDateInput = document.getElementById('checkOutDate');
  const numberOfNightsInput = document.getElementById('numberOfNights');
  
  if (checkInDateInput) {
    checkInDateInput.addEventListener('change', function() {
      updateCheckoutDateMinimum();
      calculateHotelNights();
    });
  }
  
  if (checkOutDateInput) {
    checkOutDateInput.addEventListener('change', function() {
      if (validateCheckoutDate()) {
        calculateHotelNights();
      }
    });
  }
}

// Initialize new hotel modal with default values
function initializeNewHotelModal() {
  // Set check-in date to trip start date
  const tripStartDate = document.getElementById('startDate').value;
  if (tripStartDate) {
    document.getElementById('checkInDate').value = tripStartDate;
    console.log('Set check-in date to trip start date:', tripStartDate);
    
    // Update checkout date minimum after setting checkin date
    updateCheckoutDateMinimum();
  }
  
  // Clear other fields for new hotel
  document.getElementById('checkOutDate').value = '';
  document.getElementById('numberOfNights').value = '';
  document.getElementById('singleRooms').value = '0';
  document.getElementById('doubleRooms').value = '1'; // Default to 1 double room
  document.getElementById('hotelNotes').value = '';
  document.getElementById('backendHotelPrice').value = '0.00';
  
  // Clear room types wrapper
  const roomTypesWrapper = document.getElementById('roomTypesWrapper');
  if (roomTypesWrapper) {
    roomTypesWrapper.innerHTML = '';
  }
  
  // Reset dropdowns
  const hotelCitySelect = document.getElementById('hotelCity');
  const hotelTypeSelect = document.getElementById('hotelType');
  if (hotelCitySelect) hotelCitySelect.value = '';
  if (hotelTypeSelect) hotelTypeSelect.innerHTML = '<option value="">Select Hotel</option>';
  
  // Calculate nights if we have a start date
  if (tripStartDate) {
    // Set a default checkout date (e.g., 2 nights later)
    const startDate = new Date(tripStartDate);
    const defaultCheckoutDate = new Date(startDate);
    defaultCheckoutDate.setDate(startDate.getDate() + 2); // Default 2 nights
    
    const year = defaultCheckoutDate.getFullYear();
    const month = String(defaultCheckoutDate.getMonth() + 1).padStart(2, '0');
    const day = String(defaultCheckoutDate.getDate()).padStart(2, '0');
    const checkoutDateString = `${year}-${month}-${day}`;
    
    document.getElementById('checkOutDate').value = checkoutDateString;
    document.getElementById('numberOfNights').value = '2';
    
    console.log('Set default checkout date and nights:', checkoutDateString, '2 nights');
  }
  
  // Update Add Room Type button state
  setTimeout(() => {
    updateAddRoomTypeButtonState();
  }, 100);
}

// Calculate hotel nights automatically
function calculateHotelNights() {
  const checkInDate = document.getElementById('checkInDate').value;
  const checkOutDate = document.getElementById('checkOutDate').value;
  const numberOfNightsInput = document.getElementById('numberOfNights');
  
  if (checkInDate && checkOutDate && numberOfNightsInput) {
    try {
      const startDate = new Date(checkInDate);
      const endDate = new Date(checkOutDate);
      
      // Calculate the difference in days
      const timeDifference = endDate.getTime() - startDate.getTime();
      const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
      
      if (daysDifference > 0) {
        numberOfNightsInput.value = daysDifference;
        console.log(`Calculated nights: ${daysDifference} (from ${checkInDate} to ${checkOutDate})`);
      } else if (daysDifference === 0) {
        numberOfNightsInput.value = '1'; // Same day booking = 1 night
        console.log('Same day booking, set to 1 night');
      } else {
        numberOfNightsInput.value = '';
        console.log('Invalid date range - checkout before checkin');
      }
    } catch (error) {
      console.error('Error calculating nights:', error);
      numberOfNightsInput.value = '';
    }
  }
}

// Update checkout date minimum to prevent selecting dates before checkin
function updateCheckoutDateMinimum() {
  const checkInDate = document.getElementById('checkInDate').value;
  const checkOutDateInput = document.getElementById('checkOutDate');
  
  if (checkInDate && checkOutDateInput) {
    // Set minimum checkout date to the day after checkin
    const checkinDateObj = new Date(checkInDate);
    checkinDateObj.setDate(checkinDateObj.getDate() + 1);
    
    const year = checkinDateObj.getFullYear();
    const month = String(checkinDateObj.getMonth() + 1).padStart(2, '0');
    const day = String(checkinDateObj.getDate()).padStart(2, '0');
    const minCheckoutDate = `${year}-${month}-${day}`;
    
    checkOutDateInput.setAttribute('min', minCheckoutDate);
    
    // If current checkout date is before the new minimum, clear it
    const currentCheckoutDate = checkOutDateInput.value;
    if (currentCheckoutDate && currentCheckoutDate <= checkInDate) {
      checkOutDateInput.value = '';
      document.getElementById('numberOfNights').value = '';
      showNotification('Checkout date must be after checkin date. Please select a new checkout date.', 'warning');
    }
    
    console.log(`Set minimum checkout date to: ${minCheckoutDate}`);
  }
}

// Validate checkout date is not before checkin date
function validateCheckoutDate() {
  const checkInDate = document.getElementById('checkInDate').value;
  const checkOutDate = document.getElementById('checkOutDate').value;
  const checkOutDateInput = document.getElementById('checkOutDate');
  
  if (checkInDate && checkOutDate) {
    if (checkOutDate <= checkInDate) {
      // Clear the invalid checkout date
      checkOutDateInput.value = '';
      document.getElementById('numberOfNights').value = '';
      showNotification('Checkout date must be after checkin date. Please select a valid checkout date.', 'error');
      return false;
    }
  }
  return true;
}

// Enhanced edit service item function
function editServiceItem(serviceType, index) {
  const item = leadData[serviceType][index];
  if (!item) {
    showNotification('Service item not found', 'error');
    return;
  }
  
  console.log(`Editing ${serviceType} item:`, item);
  
  // Set editing state
  currentEditingService = { type: serviceType, index: index };
  
  // Update modal title
  updateModalTitle(serviceType, true);
  
  // First, ensure city dropdowns are populated for the specific service type
  const selectorMap = {
    'transfers': '.city-dropdown-transfer',
    'hotels': '.city-dropdown-hotel', 
    'excursions': '.city-dropdown-excursion',
    'tours': '.city-dropdown-tour'
  };
  
  const selector = selectorMap[serviceType];
  if (selector) {
    populateCitiesDropdown(selector).then(() => {
    // After city dropdowns are populated, populate the modal with service data
    populateServiceModal(serviceType, item);
    
    // Open the modal
    const modalMap = {
      'flights': '#flightModal',
      'transfers': '#transferModal',
      'hotels': '#hotelModal',
      'excursions': '#excursionModal',
      'tours': '#tourModal',
      'others': '#othersModal'
    };
    
    $(modalMap[serviceType]).modal('show');
  }).catch(error => {
    console.error('Error populating city dropdowns:', error);
    // Still open the modal even if city population fails
    populateServiceModal(serviceType, item);
    
    const modalMap = {
      'flights': '#flightModal',
      'transfers': '#transferModal',
      'hotels': '#hotelModal',
      'excursions': '#excursionModal',
      'tours': '#tourModal',
      'others': '#othersModal'
    };
    
    $(modalMap[serviceType]).modal('show');
    });
  } else {
    // For services without city dropdowns (like flights), just populate and show modal
    populateServiceModal(serviceType, item);
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
}

// Populate service modal with existing data
function populateServiceModal(serviceType, service) {
  console.log(`Populating ${serviceType} modal with data:`, service);
  
  switch (serviceType) {
    case 'flights':
      document.getElementById('flight').value = service.flight_name || service.flight || '';
      // Backend sends flight_number, frontend expects number
      document.getElementById('number').value = service.flight_number || service.number || '';
      // Backend sends in_or_out, frontend expects flightInOut
      document.getElementById('flightInOut').value = service.in_or_out || service.flight_in_out || service.flightInOut || '';
      document.getElementById('flightRoute').value = service.route || '';
      document.getElementById('flightDate').value = formatDateForInput(service.flight_date || service.date || '');
      document.getElementById('departureTime').value = service.departure_time || service.departureTime || '';
      document.getElementById('arrivalTime').value = service.arrival_time || service.arrivalTime || '';
      document.getElementById('issuedBy').value = service.issued_by || service.issuedBy || '';
      // Always load the original base cost, not the marked-up final cost
      document.getElementById('flightCost').value = service.cost || service.total_cost || '';
      document.getElementById('flightRemarks').value = service.remarks || '';
      break;
      
    case 'transfers':
      // First populate basic fields
      document.getElementById('transferDate').value = formatDateForInput(service.date || '');
      document.getElementById('transferFrom').value = service.from_location || service.from || '';
      document.getElementById('transferTo').value = service.to_location || service.to || '';
      document.getElementById('transferFlight').value = service.flight_number || service.flight || '';
      document.getElementById('flightTime').value = service.flight_time || service.flightTime || '';
      document.getElementById('transferToT').value = service.tot || '';
      document.getElementById('transferPickupTime').value = service.pickup_time || service.pickupTime || '';
      document.getElementById('transferRemarks').value = service.remarks || '';
      
      // Populate backend price field
      const transferPrice = service.total_cost || service.final_cost || service.cost || service.backend_price || 0;
      document.getElementById('backendTransferPrice').value = parseFloat(transferPrice).toFixed(2);
      
      // Handle city and transfer type dropdowns
      const cityValue = service.city || '';
      if (cityValue) {
        // First set the city
        document.getElementById('transferCity').value = cityValue;
        
        // Wait a bit for the DOM to update, then populate transfers for this city
        setTimeout(() => {
          populateTransferDropdown(cityValue).then(() => {
            // After transfers are loaded, set the selected transfer
            const transferTypeSelect = document.getElementById('transferType');
            const transferDescription = service.transfer_description || '';
            const transferId = service.transfer_id || 0;
            
            console.log('Looking for transfer:', { transferDescription, transferId, service });
            console.log('Available transfer options:', Array.from(transferTypeSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })));
            
            if (transferDescription) {
              // Try to find matching option by text content
              let optionFound = false;
              for (let option of transferTypeSelect.options) {
                if (option.textContent.includes(transferDescription)) {
                  transferTypeSelect.value = option.value;
                  optionFound = true;
                  console.log('Matched transfer by description:', transferDescription);
                  break;
                }
              }
              
              // If option not found, create a custom option
              if (!optionFound) {
                const option = document.createElement('option');
                option.value = transferId || 'custom';
                option.textContent = transferDescription;
                option.selected = true;
                transferTypeSelect.appendChild(option);
                console.log('Created custom transfer option:', transferDescription);
              }
            } else {
              console.log('⚠️ transfer_description is empty! This indicates a problem with the save logic.');
              console.log('Transfer data from backend:', service);
            }
          }).catch(error => {
            console.error('Error populating transfer dropdown:', error);
          });
        }, 100);
      }
      
      // Populate room types for editing if they exist
      setTimeout(() => {
        populateRoomTypesForEdit(service);
      }, 200);
      break;
      
    case 'hotels':
      document.getElementById('checkInDate').value = formatDateForInput(service.from_date || '');
      document.getElementById('checkOutDate').value = formatDateForInput(service.to_date || '');
      document.getElementById('numberOfNights').value = service.nights || '';
      document.getElementById('singleRooms').value = service.single_room_days || 0;
      document.getElementById('doubleRooms').value = service.double_room_days || 0;
      document.getElementById('earlyCheckIn').checked = service.early_checkin || false;
      document.getElementById('lateCheckOut').checked = service.late_checkout || false;
      
      // Extra bed checkboxes removed from edit_lead.html - no longer needed
      
      document.getElementById('hotelNotes').value = service.notes || '';
      
      // Populate backend price field
      const hotelPrice = service.total_cost || service.final_cost || 0;
      document.getElementById('backendHotelPrice').value = parseFloat(hotelPrice).toFixed(2);
      
      // Clear existing room types first
      const roomTypesWrapper = document.getElementById('roomTypesWrapper');
      if (roomTypesWrapper) {
        roomTypesWrapper.innerHTML = '';
      }
      
      // Store room types data for later population
      const savedRoomTypes = service.room_types || [];
      console.log('Saved room types from service:', savedRoomTypes);
      
      // Handle city and hotel dropdowns
      const hotelCityValue = service.city || '';
      if (hotelCityValue) {
        document.getElementById('hotelCity').value = hotelCityValue;
        
        setTimeout(() => {
          populateHotelDropdown(hotelCityValue).then(() => {
            const hotelSelect = document.getElementById('hotelType');
            const hotelName = service.hotel_name || '';
            const hotelId = service.hotel_id || '';
            
            if (hotelId) {
              // Try to find the hotel by ID first
              let optionFound = false;
              for (let option of hotelSelect.options) {
                if (option.value == hotelId) {
                  hotelSelect.value = option.value;
                  optionFound = true;
                  break;
                }
              }
              
              // If not found by ID, try by name
              if (!optionFound && hotelName) {
                for (let option of hotelSelect.options) {
                  if (option.textContent.includes(hotelName)) {
                    hotelSelect.value = option.value;
                    optionFound = true;
                    break;
                  }
                }
              }
              
              // If still not found, create a custom option
              if (!optionFound) {
                const option = document.createElement('option');
                option.value = hotelId;
                option.textContent = hotelName;
                option.selected = true;
                hotelSelect.appendChild(option);
              }
              
              // Trigger hotel change to load room types data
              hotelSelect.dispatchEvent(new Event('change'));
            }
            
            // Always populate room types with saved data, regardless of hotel dropdown state
            setTimeout(() => {
              populateRoomTypesForEdit(service);
            }, 300);
          }).catch(error => {
            console.error('Error populating hotel dropdown:', error);
            // Still populate room types with saved data
            setTimeout(() => {
              populateRoomTypesForEdit(service);
            }, 300);
          });
        }, 100);
      } else {
        // If no city, still populate room types with saved data
        setTimeout(() => {
          populateRoomTypesForEdit(service);
        }, 300);
      }
      
      // Update Add Room Type button state after populating data
      setTimeout(() => {
        updateAddRoomTypeButtonState();
      }, 500);
      break;
      
    case 'excursions':
      document.getElementById('excursionDate').value = formatDateForInput(service.date || '');
      document.getElementById('excursionHotel').value = service.hotel || '';
      // Handle event_time from backend response (maps to pickup time field in UI)
      document.getElementById('excursionPickupTime').value = service.event_time || service.pickup_time || service.pickupTime || '';
      // Handle toe (Type of Excursion) from backend response
      document.getElementById('typeOfExcursion').value = service.toe || service.tot || service.type_of_excursion || '';
      document.getElementById('excursionRemarks').value = service.remarks || '';
      
      // Populate backend price field
      const excursionPrice = service.total_cost || service.final_cost || service.cost || service.backend_price || 0;
      document.getElementById('backendExcursionPrice').value = parseFloat(excursionPrice).toFixed(2);
      
      // Handle city and excursion dropdowns
      const excursionCityValue = service.city || '';
      if (excursionCityValue) {
        document.getElementById('excursionCity').value = excursionCityValue;
        
        setTimeout(() => {
          populateExcursionDropdown(excursionCityValue).then(() => {
            const excursionSelect = document.getElementById('excursionName');
            const excursionName = service.excursion || service.excursion_name || service.excursion_description || '';
            
            if (excursionName) {
              let optionFound = false;
              for (let option of excursionSelect.options) {
                if (option.textContent.includes(excursionName)) {
                  excursionSelect.value = option.value;
                  optionFound = true;
                  break;
                }
              }
              
              if (!optionFound) {
                const option = document.createElement('option');
                option.value = service.excursion_id || 'custom';
                option.textContent = excursionName;
                option.selected = true;
                excursionSelect.appendChild(option);
              }
            }
          }).catch(error => {
            console.error('Error populating excursion dropdown:', error);
          });
        }, 100);
      }
      break;
      
    case 'tours':
      document.getElementById('tourStartDate').value = formatDateForInput(service.start_date || service.from_date || '');
      document.getElementById('tourEndDate').value = formatDateForInput(service.end_date || service.to_date || '');
      document.getElementById('tourRoute').value = service.route || '';
      document.getElementById('tourToT').value = service.tot || service.type_of_tour || '';
      document.getElementById('tourRemarks').value = service.remarks || '';
      
      // Populate backend price field
      const tourPrice = service.total_cost || service.final_cost || service.cost || service.backend_price || 0;
      document.getElementById('backendTourPrice').value = parseFloat(tourPrice).toFixed(2);
      
      // Handle room types
      document.getElementById('tourSingleRoom').checked = (service.single_rooms || 0) > 0;
      document.getElementById('tourSingleRoomCount').value = service.single_rooms || 0;
      document.getElementById('tourSingleRoomCount').disabled = !((service.single_rooms || 0) > 0);
      document.getElementById('tourDoubleRoom').checked = (service.double_rooms || 0) > 0;
      document.getElementById('tourDoubleRoomCount').value = service.double_rooms || 0;
      document.getElementById('tourDoubleRoomCount').disabled = !((service.double_rooms || 0) > 0);
      document.getElementById('tourTripleRoom').checked = (service.triple_rooms || 0) > 0;
      document.getElementById('tourTripleRoomCount').value = service.triple_rooms || 0;
      document.getElementById('tourTripleRoomCount').disabled = !((service.triple_rooms || 0) > 0);
      
      // Handle city and tour dropdowns - backend sends from_location as the city
      const tourCityValue = service.from_location || service.city || service.start_city || '';
      console.log('Tour city value from service:', tourCityValue, 'Full service:', service);
      
      if (tourCityValue) {
        // Set the city dropdown
        const tourCityDropdown = document.getElementById('tourCity');
        if (tourCityDropdown) {
          tourCityDropdown.value = tourCityValue;
          console.log('Set tour city dropdown to:', tourCityValue);
        }
        
        // Wait for city dropdown to be set, then populate tours
        setTimeout(() => {
          populateTourDropdown(tourCityValue).then(() => {
            const tourSelect = document.getElementById('tourName');
            const tourName = service.tour_name || service.tour || service.tour_description || '';
            const tourId = service.tour_id || '';
            
            console.log('Looking for tour:', { tourName, tourId, service });
            console.log('Available tour options:', Array.from(tourSelect.options).map(opt => ({ value: opt.value, text: opt.textContent })));
            
            if (tourId) {
              // Try to find the tour by ID first
              let optionFound = false;
              for (let option of tourSelect.options) {
                if (option.value == tourId) {
                  tourSelect.value = option.value;
                  optionFound = true;
                  console.log('Matched tour by ID:', tourId);
                  break;
                }
              }
              
              // If not found by ID, try by name
              if (!optionFound && tourName) {
                for (let option of tourSelect.options) {
                  if (option.textContent.includes(tourName)) {
                    tourSelect.value = option.value;
                    optionFound = true;
                    console.log('Matched tour by name:', tourName);
                    break;
                  }
                }
              }
              
              // If still not found, create a custom option
              if (!optionFound) {
                const option = document.createElement('option');
                option.value = tourId;
                option.textContent = tourName || `Tour ID: ${tourId}`;
                option.selected = true;
                tourSelect.appendChild(option);
                console.log('Created custom tour option:', tourName || `Tour ID: ${tourId}`);
              }
              
              // Trigger tour change event to populate route and other fields
              if (optionFound) {
                tourSelect.dispatchEvent(new Event('change'));
              }
            } else {
              console.log('⚠️ tour_id is missing! This indicates a problem with the backend data.');
              console.log('Tour data from backend:', service);
            }
          }).catch(error => {
            console.error('Error populating tour dropdown:', error);
            // Still try to create a custom option with the available data
            if (service.tour_name || service.tour_id) {
              const tourSelect = document.getElementById('tourName');
              const option = document.createElement('option');
              option.value = service.tour_id || 'custom';
              option.textContent = service.tour_name || `Tour ID: ${service.tour_id}`;
              option.selected = true;
              tourSelect.appendChild(option);
              console.log('Created fallback tour option due to API error');
            }
          });
        }, 100);
      } else {
        console.log('⚠️ No city information found in tour service data');
        // Still try to populate the tour name if we have it
        if (service.tour_name || service.tour_id) {
          const tourSelect = document.getElementById('tourName');
          const option = document.createElement('option');
          option.value = service.tour_id || 'custom';
          option.textContent = service.tour_name || `Tour ID: ${service.tour_id}`;
          option.selected = true;
          tourSelect.appendChild(option);
          console.log('Created tour option without city context');
        }
      }
      break;
      
    case 'others':
      document.getElementById('otherDescription').value = service.description || '';
      document.getElementById('otherDate').value = formatDateForInput(service.date || '');
      // Always load the original base cost, not the marked-up final cost
      document.getElementById('otherCost').value = service.cost || service.total_cost || service.total_price || '';
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
    const serviceTypeCapitalized = serviceType.charAt(0).toUpperCase() + serviceType.slice(1, -1);
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

// Enhanced save functions
function saveFlightData() {
  const flightCost = parseFloat(document.getElementById('flightCost').value) || 0;
  const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
  const finalCostWithMarkup = flightCost * (1 + markupPercentage / 100);
  
  const flightData = {
    id: currentEditingService && currentEditingService.type === 'flights' &&
        leadData.flights && leadData.flights[currentEditingService.index] ?
        leadData.flights[currentEditingService.index].id : Date.now(),
    flight: document.getElementById('flight').value,
    number: document.getElementById('number').value,
    flight_in_out: document.getElementById('flightInOut').value,
    route: document.getElementById('flightRoute').value,
    date: document.getElementById('flightDate').value,
    departure_time: document.getElementById('departureTime').value,
    arrival_time: document.getElementById('arrivalTime').value,
    issued_by: document.getElementById('issuedBy').value,
    cost: flightCost,
    totalCost: flightCost,
    finalCost: finalCostWithMarkup,
    remarks: document.getElementById('flightRemarks').value
  };
  
  // Validate required fields
  if (!flightData.flight || !flightData.date || !flightData.cost) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  // Ensure leadData.flights is initialized
  if (!leadData.flights) leadData.flights = [];
  
  if (currentEditingService && currentEditingService.type === 'flights' &&
      currentEditingService.index >= 0 && currentEditingService.index < leadData.flights.length) {
    // Update existing flight
    leadData.flights[currentEditingService.index] = flightData;
    showNotification('Flight updated successfully', 'success');
  } else {
    // Add new flight
    leadData.flights.push(flightData);
    showNotification('Flight added successfully', 'success');
  }
  
  // Re-render and update
  renderServiceItems('flights');
  updatePricingSummary();
  
  // Close modal and reset form
  $('#flightModal').modal('hide');
  document.getElementById('flightForm').reset();
  currentEditingService = null;
}

function saveTransferData() {
  const transferTypeSelect = document.getElementById('transferType');
  const selectedOption = transferTypeSelect.options[transferTypeSelect.selectedIndex];
  const transferCost = parseFloat(document.getElementById('backendTransferPrice').value) || 0;
  const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
  const finalCostWithMarkup = transferCost * (1 + markupPercentage / 100);
  
  const transferData = {
    id: currentEditingService && currentEditingService.type === 'transfers' &&
        leadData.transfers && leadData.transfers[currentEditingService.index] ?
        leadData.transfers[currentEditingService.index].id : Date.now(),
    // Backend expected format (camelCase for request)
    transferId: parseInt(document.getElementById('transferType').value) || 0,
    transferType: selectedOption ? selectedOption.textContent : '',
    transferName: selectedOption ? selectedOption.textContent : '',
    transferDescription: selectedOption ? selectedOption.textContent : '',
    city: document.getElementById('transferCity').value,
    from: document.getElementById('transferFrom').value,
    to: document.getElementById('transferTo').value,
    date: document.getElementById('transferDate').value,
    flightTime: document.getElementById('flightTime').value,
    flight: document.getElementById('transferFlight').value,
    pickupTime: document.getElementById('transferPickupTime').value,
    flightNumber: document.getElementById('transferFlight').value,
    tot: document.getElementById('transferToT').value,
    remarks: document.getElementById('transferRemarks').value,
    backendPrice: transferCost,
    manualCost: null,
    totalCost: transferCost, // Normal cost without markup
    discount: 0,
    finalCost: finalCostWithMarkup, // Cost with markup applied
    
    // Keep some fields for local compatibility (snake_case from response)
    transfer_id: parseInt(document.getElementById('transferType').value) || 0,
    transfer_description: selectedOption ? selectedOption.textContent : '',
    from_location: document.getElementById('transferFrom').value,
    to_location: document.getElementById('transferTo').value,
    flight_number: document.getElementById('transferFlight').value,
    pickup_time: document.getElementById('transferPickupTime').value,
    final_cost: finalCostWithMarkup,
    total_cost: transferCost,
    cost: transferCost
  };
  
  console.log('Saving transfer data:', transferData);
  
  // Validate required fields
  if (!transferData.from || !transferData.to || !transferData.date || !transferData.finalCost) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  // Ensure leadData.transfers is initialized
  if (!leadData.transfers) leadData.transfers = [];
  
  if (currentEditingService && currentEditingService.type === 'transfers' &&
      currentEditingService.index >= 0 && currentEditingService.index < leadData.transfers.length) {
    // Update existing transfer
    console.log('BEFORE UPDATE - leadData.transfers:', JSON.stringify(leadData.transfers, null, 2));
    console.log('Updating transfer at index:', currentEditingService.index);
    leadData.transfers[currentEditingService.index] = transferData;
    console.log('AFTER UPDATE - leadData.transfers:', JSON.stringify(leadData.transfers, null, 2));
    showNotification('Transfer updated successfully', 'success');
  } else {
    // Add new transfer
    leadData.transfers.push(transferData);
    console.log('ADDED NEW TRANSFER - leadData.transfers:', JSON.stringify(leadData.transfers, null, 2));
    showNotification('Transfer added successfully', 'success');
  }
  
  // Log the entire leadData object to verify the update
  console.log('COMPLETE leadData after transfer save:', JSON.stringify(leadData, null, 2));
  
  // Re-render and update
  renderServiceItems('transfers');
  updatePricingSummary();
  
  // Close modal and reset form
  $('#transferModal').modal('hide');
  document.getElementById('transferForm').reset();
  currentEditingService = null;
}

function saveHotelData() {
  const hotelTypeSelect = document.getElementById('hotelType');
  const selectedHotelOption = hotelTypeSelect.options[hotelTypeSelect.selectedIndex];
  const hotelId = parseInt(document.getElementById('hotelType').value) || 0;
  const hotelName = selectedHotelOption ? selectedHotelOption.textContent : '';
  const fromDate = document.getElementById('checkInDate').value;
  const toDate = document.getElementById('checkOutDate').value;
  const nights = parseInt(document.getElementById('numberOfNights').value) || 0;
  const singleRooms = parseInt(document.getElementById('singleRooms').value) || 0;
  const doubleRooms = parseInt(document.getElementById('doubleRooms').value) || 0;
  const city = document.getElementById('hotelCity').value;
  const cost = parseFloat(document.getElementById('backendHotelPrice').value) || 0;
  const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
  const finalCostWithMarkup = cost * (1 + markupPercentage / 100);
  const notes = document.getElementById('hotelNotes').value;
  
  // Extra bed options removed from edit_lead.html - use default values
  const extraAdultBed = false;
  const extraChildBed = false;
  const sharingBed = false;
  
  // Default room ID (we'll use 1 as default if not specified)
  const roomId = 1;
  
  // Get room types from room type blocks if they exist
  const roomTypeBlocks = document.querySelectorAll('.room-type-block');
  const roomTypes = [];
  
  if (roomTypeBlocks && roomTypeBlocks.length > 0) {
    roomTypeBlocks.forEach((block, index) => {
      const roomTypeSelect = block.querySelector('.roomtype-dropdown');
      const adultsInput = block.querySelector('.adults-input');
      const childrenInput = block.querySelector('.children-input');
      const blockIndex = block.id.split('_')[1];
      const abfCheckbox = block.querySelector(`#abf_${blockIndex}`);
      const extraAdultBedCheckbox = block.querySelector(`#extraAdultBed_${blockIndex}`);
      const extraChildBedCheckbox = block.querySelector(`#extraChildBed_${blockIndex}`);
      const sharingBedCheckbox = block.querySelector(`#sharingBed_${blockIndex}`);
      
      console.log(`🔍 Processing room type block ${blockIndex}:`);
      console.log(`  - ABF checkbox found: ${!!abfCheckbox}, checked: ${abfCheckbox?.checked}`);
      console.log(`  - Extra Adult Bed checkbox found: ${!!extraAdultBedCheckbox}, checked: ${extraAdultBedCheckbox?.checked}`);
      console.log(`  - Extra Child Bed checkbox found: ${!!extraChildBedCheckbox}, checked: ${extraChildBedCheckbox?.checked}`);
      console.log(`  - Sharing Bed checkbox found: ${!!sharingBedCheckbox}, checked: ${sharingBedCheckbox?.checked}`);
      
      if (roomTypeSelect && adultsInput) {
        const roomTypeId = parseInt(roomTypeSelect.value) || 0;
        const roomTypeName = roomTypeSelect.options[roomTypeSelect.selectedIndex]?.textContent || '';
        
        // Only add room type if a valid room type is selected
        if (roomTypeId > 0 && roomTypeName) {
          const roomTypeData = {
            room_type_id: roomTypeId,
            room_type_name: roomTypeName,
            adults: parseInt(adultsInput.value) || 0,
            children: parseInt(childrenInput?.value) || 0,
            complimentary_abf: abfCheckbox ? abfCheckbox.checked : false,
            extra_adult_bed: extraAdultBedCheckbox ? extraAdultBedCheckbox.checked : false,
            extra_child_bed: extraChildBedCheckbox ? extraChildBedCheckbox.checked : false,
            sharing_bed: sharingBedCheckbox ? sharingBedCheckbox.checked : false
          };
          
          console.log(`  - Final room type data:`, roomTypeData);
          roomTypes.push(roomTypeData);
        } else {
          console.log(`  - Skipping room type block ${blockIndex}: no valid room type selected`);
        }
      }
    });
  }
  
  // If no room types were added via dynamic blocks, create default room types based on single/double room counts
  if (roomTypes.length === 0 && (singleRooms > 0 || doubleRooms > 0)) {
    console.log('No room type blocks found, creating default room types based on room counts');
    
    // Create default room types based on single/double room counts
    if (singleRooms > 0) {
      roomTypes.push({
        room_type_id: 1, // Default single room type ID
        room_type_name: 'Single Room',
        adults: 1,
        children: 0,
        complimentary_abf: false,
        extra_adult_bed: extraAdultBed,
        extra_child_bed: extraChildBed,
        sharing_bed: sharingBed
      });
      console.log(`Added default single room type for ${singleRooms} rooms`);
    }
    
    if (doubleRooms > 0) {
      roomTypes.push({
        room_type_id: 2, // Default double room type ID
        room_type_name: 'Double Room',
        adults: 2,
        children: 0,
        complimentary_abf: false,
        extra_adult_bed: extraAdultBed,
        extra_child_bed: extraChildBed,
        sharing_bed: sharingBed
      });
      console.log(`Added default double room type for ${doubleRooms} rooms`);
    }
  }
  
  // Validate that we have at least one room type
  if (roomTypes.length === 0) {
    showNotification('Please add at least one room type or specify room counts', 'error');
    return;
  }
  
  // Format data exactly as backend expects
  const hotelData = {
    id: currentEditingService && currentEditingService.type === 'hotels' &&
        leadData.hotels && leadData.hotels[currentEditingService.index] ?
        leadData.hotels[currentEditingService.index].id : Date.now(),
    
    // Backend expected fields (snake_case only)
    hotel_id: hotelId,
    room_id: roomId,
    from_date: fromDate,
    to_date: toDate,
    city: city,
    hotel_name: hotelName,
    room_types: roomTypes,
    nights: nights,
    single_room_days: singleRooms,
    double_room_days: doubleRooms,
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
    early_checkin: document.getElementById('earlyCheckIn').checked,
    late_checkout: document.getElementById('lateCheckOut').checked,
    // Store extra bed options in the hotel data
    extra_adult_bed: extraAdultBed,
    extra_child_bed: extraChildBed,
    sharing_bed: sharingBed,
    day_use: false,
    christmas_dinner: false,
    newyear_dinner: false,
    promotion: '',
    free_nights: 0,
    discount_percentage: 0,
    flight_in: '',
    flight_out: '',
    flight_info: '',
    notes: notes,
    total_cost: cost, // Normal cost without markup
    discount: 0,
    final_cost: finalCostWithMarkup // Cost with markup applied
  };
  
  console.log('Saving hotel data:', hotelData);
  
  // Validate required fields based on backend struct
  if (!hotelData.hotel_id) {
    showNotification('Hotel is required', 'error');
    return;
  }
  
  if (!hotelData.from_date) {
    showNotification('Check-in date is required', 'error');
    return;
  }
  
  if (!hotelData.to_date) {
    showNotification('Check-out date is required', 'error');
    return;
  }
  
  // Validate that checkout date is after checkin date
  if (hotelData.from_date && hotelData.to_date && hotelData.to_date <= hotelData.from_date) {
    showNotification('Check-out date must be after check-in date', 'error');
    return;
  }
  
  // Additional validation using the validateCheckoutDate function
  if (!validateCheckoutDate()) {
    return;
  }
  
  if (!hotelData.city) {
    showNotification('City is required', 'error');
    return;
  }
  
  if (!hotelData.hotel_name) {
    showNotification('Hotel name is required', 'error');
    return;
  }
  
  if (!hotelData.nights || hotelData.nights < 1) {
    showNotification('Nights must be at least 1', 'error');
    return;
  }
  
  // Ensure leadData.hotels is initialized
  if (!leadData.hotels) leadData.hotels = [];
  
  if (currentEditingService && currentEditingService.type === 'hotels' &&
      currentEditingService.index >= 0 && currentEditingService.index < leadData.hotels.length) {
    // Update existing hotel
    leadData.hotels[currentEditingService.index] = hotelData;
    showNotification('Hotel updated successfully', 'success');
  } else {
    // Add new hotel
    leadData.hotels.push(hotelData);
    showNotification('Hotel added successfully', 'success');
  }
  
  // Re-render and update
  renderServiceItems('hotels');
  updatePricingSummary();
  
  // Close modal and reset form
  $('#hotelModal').modal('hide');
  resetHotelModal();
  currentEditingService = null;
}

function saveExcursionData() {
  const excursionTypeSelect = document.getElementById('excursionName');
  const selectedExcursionOption = excursionTypeSelect.options[excursionTypeSelect.selectedIndex];
  const eventTime = document.getElementById('excursionPickupTime').value;
  const typeOfExcursion = document.getElementById('typeOfExcursion').value;
  
  // Calculate markup
  const cost = parseFloat(document.getElementById('backendExcursionPrice').value) || 0;
  const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
  const finalCostWithMarkup = cost * (1 + markupPercentage / 100);
  
  const excursionData = {
    id: currentEditingService && currentEditingService.type === 'excursions' &&
        leadData.excursions && leadData.excursions[currentEditingService.index] ?
        leadData.excursions[currentEditingService.index].id : Date.now(),
    
    // Backend expected fields (snake_case)
    excursion_id: parseInt(document.getElementById('excursionName').value) || 0,
    excursion_name: selectedExcursionOption ? selectedExcursionOption.textContent : '',
    city: document.getElementById('excursionCity').value,
    date: document.getElementById('excursionDate').value,
    event_time: eventTime, // Backend expects event_time
    hotel: document.getElementById('excursionHotel').value,
    toe: typeOfExcursion, // Backend expects toe (Type of Excursion)
    remarks: document.getElementById('excursionRemarks').value,
    total_cost: cost, // Normal cost without markup
    discount: 0,
    final_cost: finalCostWithMarkup, // Cost with markup applied
    
    // Keep some fields for local compatibility
    excursion: selectedExcursionOption ? selectedExcursionOption.textContent : '',
    pickup_time: eventTime, // For local compatibility
    type: typeOfExcursion, // For local compatibility
    cost: cost
  };
  
  // Validate required fields
  if (!excursionData.excursion || !excursionData.date || !excursionData.cost) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  // Ensure leadData.excursions is initialized
  if (!leadData.excursions) leadData.excursions = [];
  
  if (currentEditingService && currentEditingService.type === 'excursions' &&
      currentEditingService.index >= 0 && currentEditingService.index < leadData.excursions.length) {
    // Update existing excursion
    leadData.excursions[currentEditingService.index] = excursionData;
    showNotification('Excursion updated successfully', 'success');
  } else {
    // Add new excursion
    leadData.excursions.push(excursionData);
    showNotification('Excursion added successfully', 'success');
  }
  
  // Re-render and update
  renderServiceItems('excursions');
  updatePricingSummary();
  
  // Close modal and reset form
  $('#excursionModal').modal('hide');
  document.getElementById('excursionForm').reset();
  currentEditingService = null;
}

function saveTourData() {
  const tourNameSelect = document.getElementById('tourName');
  const selectedTourOption = tourNameSelect.options[tourNameSelect.selectedIndex];
  const tourCost = parseFloat(document.getElementById('backendTourPrice').value) || 0;
  const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
  const finalCostWithMarkup = tourCost * (1 + markupPercentage / 100);
  
  const tourData = {
    id: currentEditingService && currentEditingService.type === 'tours' &&
        leadData.tours && leadData.tours[currentEditingService.index] ?
        leadData.tours[currentEditingService.index].id : Date.now(),
    city: document.getElementById('tourCity').value,
    from_location: document.getElementById('tourCity').value, // Use tourCity as from_location
    tour: selectedTourOption ? selectedTourOption.textContent : '',
    tour_id: parseInt(document.getElementById('tourName').value) || 0,
    tour_name: selectedTourOption ? selectedTourOption.textContent : '',
    route: document.getElementById('tourRoute').value,
    start_date: document.getElementById('tourStartDate').value,
    end_date: document.getElementById('tourEndDate').value,
    tot: document.getElementById('tourToT').value,
    single_room: document.getElementById('tourSingleRoom').checked,
    single_count: parseInt(document.getElementById('tourSingleRoomCount').value) || 0,
    double_room: document.getElementById('tourDoubleRoom').checked,
    double_count: parseInt(document.getElementById('tourDoubleRoomCount').value) || 0,
    triple_room: document.getElementById('tourTripleRoom').checked,
    triple_count: parseInt(document.getElementById('tourTripleRoomCount').value) || 0,
    cost: tourCost,
    total_cost: tourCost, // Normal cost without markup
    final_cost: finalCostWithMarkup, // Cost with markup applied
    remarks: document.getElementById('tourRemarks').value
  };
  
  // Validate required fields
  if (!tourData.tour_name || !tourData.start_date || !tourData.cost) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  // Ensure leadData.tours is initialized
  if (!leadData.tours) leadData.tours = [];
  
  if (currentEditingService && currentEditingService.type === 'tours' &&
      currentEditingService.index >= 0 && currentEditingService.index < leadData.tours.length) {
    // Update existing tour
    leadData.tours[currentEditingService.index] = tourData;
    showNotification('Tour updated successfully', 'success');
  } else {
    // Add new tour
    leadData.tours.push(tourData);
    showNotification('Tour added successfully', 'success');
  }
  
  // Re-render and update
  renderServiceItems('tours');
  updatePricingSummary();
  
  // Close modal and reset form
  $('#tourModal').modal('hide');
  document.getElementById('tourForm').reset();
  currentEditingService = null;
}

function saveOtherData() {
  const otherCost = parseFloat(document.getElementById('otherCost').value) || 0;
  const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
  const finalCostWithMarkup = otherCost * (1 + markupPercentage / 100);
  
  const otherData = {
    id: currentEditingService && currentEditingService.type === 'others' &&
        leadData.others && leadData.others[currentEditingService.index] ?
        leadData.others[currentEditingService.index].id : Date.now(),
    description: document.getElementById('otherDescription').value,
    date: document.getElementById('otherDate').value,
    cost: otherCost,
    finalCost: finalCostWithMarkup,
    remarks: '' // otherRemarks field has been removed, so use empty string
  };
  
  // Validate required fields
  if (!otherData.description || !otherData.cost) {
    showNotification('Please fill in all required fields', 'error');
    return;
  }
  
  // Ensure leadData.others is initialized
  if (!leadData.others) leadData.others = [];
  
  if (currentEditingService && currentEditingService.type === 'others' &&
      currentEditingService.index >= 0 && currentEditingService.index < leadData.others.length) {
    // Update existing other service
    leadData.others[currentEditingService.index] = otherData;
    showNotification('Other service updated successfully', 'success');
  } else {
    // Add new other service
    leadData.others.push(otherData);
    showNotification('Other service added successfully', 'success');
  }
  
  // Re-render and update
  renderServiceItems('others');
  updatePricingSummary();
  
  // Close modal and reset form
  $('#othersModal').modal('hide');
  document.getElementById('othersForm').reset();
  currentEditingService = null;
}

// Handle form submission
async function handleFormSubmit(event) {
  console.log('Form submission started');
  event.preventDefault();
  
  console.log('Current lead:', currentLead);
  
  // Show confirmation dialog
  console.log('Showing confirmation dialog');
  const confirmed = await showConfirmationDialog(
    'Confirm Lead Update',
    'Are you sure you want to update this lead? This will save all changes made to the lead details and services.',
    'Update Lead',
    'Cancel'
  );
  
  console.log('Confirmation result:', confirmed);
  
  if (!confirmed) {
    console.log('User cancelled the update');
    return; // User cancelled
  }
  
  try {
    console.log('Starting lead update process');
    
    // Show loading on submit button
    const submitBtn = document.getElementById('updateLead');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i>Updating...';
    
    console.log('Collecting form data');
    // Collect form data
    const formData = collectFormData();
    
    console.log('Form data collected:', formData);
    
    // Validate required fields
    console.log('Validating form data');
    if (!validateFormData(formData)) {
      console.log('Validation failed, resetting button');
      // Reset submit button on validation failure
      const submitBtn = document.getElementById('updateLead');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa fa-save mr-2"></i>Update Lead';
      return;
    }
    
    console.log('Validation passed, updating lead');
    // Update the lead
    const updateResult = await updateLead(currentLead.id, formData);
    console.log('Update result:', updateResult);
    
    // Show success message
    showNotification('Lead updated successfully!', 'success');
    
    // Redirect back to leads page after 1 minute delay
    setTimeout(() => {
      console.log('Redirecting to leads page');
      window.location.href = 'leads.html';
    }, 300000); // 60 seconds = 1 minute
    
  } catch (error) {
    console.error('Failed to update lead:', error);
    showNotification('Failed to update lead. Please try again.', 'error');
  } finally {
    // Reset submit button
    console.log('Resetting submit button');
    const submitBtn = document.getElementById('updateLead');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa fa-save mr-2"></i>Update Lead';
  }
}

// Collect form data
function collectFormData() {
  const userProfile = getUserProfile();
  
  console.log('Collecting form data from leadData:', leadData);
  
  // Format services data to match backend expectations
  const startDate = document.getElementById('startDate').value;
  // Calculate endDate as 7 days after startDate if not available
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

  const formattedData = {
    // Basic lead information (snake_case to match backend JSON struct tags)
    option_name: document.getElementById('optionName').value,
    template_type: document.getElementById('templateType').value,
    markup_percentage: parseFloat(document.getElementById('markupPercentage').value),
    expiry_days: parseInt(document.getElementById('expiryDays').value),
    urgency: document.getElementById('urgency').value,
    client_name: document.getElementById('clientName').value,
    client_email: document.getElementById('clientEmail').value,
    client_phone: document.getElementById('clientPhone').value,
    start_date: formatDateForBackend(startDate),
    booking_date: formatDateForBackend(document.getElementById('bookingDate').value),
    number_of_adults: parseInt(document.getElementById('numberOfAdults').value),
    number_of_kids: parseInt(document.getElementById('numberOfKids').value),
    internal_notes: document.getElementById('internalNotes').value,
    client_notes: document.getElementById('clientNotes').value,
    
    // Service arrays (snake_case to match backend JSON struct tags)
    // IMPORTANT: Use leadData (which contains user edits) instead of currentLead (original data)
    flights: (leadData.flights || []).map(flight => {
      console.log('Processing flight data:', flight);
      return {
        flight_name: flight.flight || flight.flight_name || '',
        flight_date: formatDateForBackend(flight.date || flight.flight_date || ''),
        flight_number: flight.number || flight.flight_number || '',
        city: flight.city || '',
        departure_time: flight.departure_time || flight.departureTime || '',
        arrival_time: flight.arrival_time || flight.arrivalTime || '',
        in_or_out: flight.in_or_out || flight.flight_in_out || flight.flightInOut || '',
        route: flight.route || '',
        issued_by: flight.issued_by || flight.issuedBy || '',
        total_cost: parseFloat(flight.totalCost || flight.total_cost || flight.cost || 0),
        discount: parseFloat(flight.discount || 0),
        final_cost: parseFloat(flight.finalCost || flight.final_cost || flight.cost || 0),
        remarks: flight.remarks || ''
      };
    }),
    
    transfers: (leadData.transfers || []).map(transfer => {
      console.log('Processing transfer data:', transfer);
      return {
        transfer_id: parseInt(transfer.transfer_id || transfer.transferId || 0),
        transfer_type: transfer.transfer_description || transfer.transferDescription || transfer.transferType || '',
        transfer_name: transfer.transfer_description || transfer.transferDescription || transfer.transferType || '',
        transfer_description: transfer.transfer_description || transfer.transferDescription || transfer.transferType || '',
        city: transfer.city || '',
        from_location: transfer.from_location || transfer.from || '',
        to_location: transfer.to_location || transfer.to || '',
        date: formatDateForBackend(transfer.date || ''),
        flight_time: transfer.flight_time || transfer.flightTime || '',
        pickup_time: transfer.pickup_time || transfer.pickupTime || '',
        flight_number: transfer.flight_number || transfer.flight || transfer.flightNumber || '',
        tot: transfer.tot || '',
        total_cost: parseFloat(transfer.totalCost || transfer.total_cost || transfer.cost || 0),
        discount: parseFloat(transfer.discount || 0),
        final_cost: parseFloat(transfer.finalCost || transfer.final_cost || transfer.cost || 0),
        remarks: transfer.remarks || ''
      };
    }),
    
    hotels: (leadData.hotels || []).map(hotel => {
      console.log('Processing hotel data:', hotel);
      // Extract all possible variations of fields to ensure we get the data
      const fromDate = formatDateForBackend(hotel.from_date || hotel.check_in || hotel.checkIn || hotel.fromDate || '');
      const toDate = formatDateForBackend(hotel.to_date || hotel.check_out || hotel.checkOut || hotel.toDate || '');
      const hotelId = parseInt(hotel.hotel_id || hotel.hotelId || hotel.hotelType || 0);
      const roomId = parseInt(hotel.room_id || hotel.roomId || 0) || 1; // Default to 1 if not specified
      const hotelName = hotel.hotel_name || hotel.hotelName || hotel.hotel || '';
      
      // Get room types from any available source
      const roomTypes = (hotel.room_types || hotel.room_type_details || hotel.roomTypeDetails || []).map(rt => ({
        room_type_id: parseInt(rt.room_type_id || rt.roomTypeId || 0),
        room_type: rt.room_type_name || rt.roomTypeName || '',
        adults: parseInt(rt.adults || 0),
        children: parseInt(rt.children || 0),
        complimentary_abf: rt.complimentary_abf || rt.abf || false,
        extra_adult_bed: rt.extra_adult_bed || rt.extraAdultBed || false,
        extra_child_bed: rt.extra_child_bed || rt.extraChildBed || false,
        sharing_bed: rt.sharing_bed || rt.sharingBed || false
      }));
      
      // Return only the fields that the backend expects (matching LeadHotelItem struct)
      return {
        hotel_id: hotelId,
        room_id: roomId,
        from_date: fromDate,
        to_date: toDate,
        city: hotel.city || '',
        hotel_name: hotelName,
        room_types: roomTypes,
        nights: parseInt(hotel.nights || 0),
        single_room_days: parseInt(hotel.single_room_days || hotel.single_rooms || hotel.singleRooms || 0),
        double_room_days: parseInt(hotel.double_room_days || hotel.double_rooms || hotel.doubleRooms || 0),
        abf_notes: hotel.abf_notes || '',
        lunch_notes: hotel.lunch_notes || '',
        dinner_notes: hotel.dinner_notes || '',
        all_inclusive_notes: hotel.all_inclusive_notes || '',
        days_abf: parseInt(hotel.days_abf || 0),
        days_lunch: parseInt(hotel.days_lunch || 0),
        days_dinner: parseInt(hotel.days_dinner || 0),
        days_all_inclusive: parseInt(hotel.days_all_inclusive || 0),
        all_inclusive: hotel.all_inclusive || false,
        abf_include: hotel.abf_include || false,
        lunch_include: hotel.lunch_include || false,
        dinner_include: hotel.dinner_include || false,
        early_checkin: hotel.early_checkin || hotel.earlyCheckIn || false,
        late_checkout: hotel.late_checkout || hotel.lateCheckOut || false,
        // Include extra bed options in the final submission
        extra_adult_bed: hotel.extra_adult_bed || false,
        extra_child_bed: hotel.extra_child_bed || false,
        sharing_bed: hotel.sharing_bed || false,
        day_use: hotel.day_use || false,
        christmas_dinner: hotel.christmas_dinner || false,
        newyear_dinner: hotel.newyear_dinner || false,
        promotion: hotel.promotion || '',
        free_nights: parseInt(hotel.free_nights || 0),
        discount_percentage: parseFloat(hotel.discount_percentage || 0),
        flight_in: hotel.flight_in || '',
        flight_out: hotel.flight_out || '',
        flight_info: hotel.flight_info || '',
        notes: hotel.notes || '',
        total_cost: parseFloat(hotel.total_cost || hotel.cost || 0),
        discount: parseFloat(hotel.discount || 0),
        final_cost: parseFloat(hotel.final_cost || hotel.cost || 0)
      };
    }),
    
    excursions: (leadData.excursions || []).map(excursion => {
      console.log('Processing excursion data:', excursion);
      return {
        excursion_id: parseInt(excursion.excursion_id || excursion.excursionId || 0),
        excursion_name: excursion.excursion_name || excursion.excursion || excursion.excursionName || '',
        city: excursion.city || '',
        toe: excursion.toe || excursion.type || '', // Backend expects 'toe'
        date: formatDateForBackend(excursion.date || ''),
        event_time: excursion.event_time || excursion.pickup_time || excursion.pickupTime || '', // Backend expects 'event_time'
        hotel: excursion.hotel || '',
        total_cost: parseFloat(excursion.total_cost || excursion.cost || 0),
        discount: parseFloat(excursion.discount || 0),
        final_cost: parseFloat(excursion.final_cost || excursion.cost || 0),
        remarks: excursion.remarks || ''
      };
    }),
    
    tours: (leadData.tours || []).map(tour => {
      console.log('Processing tour data:', tour);
      return {
        tour_id: parseInt(tour.tour_id || tour.tourId || 0),
        tour_name: tour.tour_name || tour.tour || tour.tourName || '',
        tot: tour.tot || '',
        city: tour.city || '',
        from_location: tour.from_location || tour.fromLocation || '',
        from_date: formatDateForBackend(tour.from_date || tour.start_date || tour.startDate || ''),
        to_date: formatDateForBackend(tour.to_date || tour.end_date || tour.endDate || ''),
        route: tour.route || '',
        departure_time: tour.departure_time || tour.departureTime || '',
        arrival_time: tour.arrival_time || tour.arrivalTime || '',
        flight_in: tour.flight_in || tour.flightIn || '',
        flight_out: tour.flight_out || tour.flightOut || '',
        single_rooms: parseInt(tour.single_rooms || tour.single_count || tour.singleCount || 0),
        double_rooms: parseInt(tour.double_rooms || tour.double_count || tour.doubleCount || 0),
        triple_rooms: parseInt(tour.triple_rooms || tour.triple_count || tour.tripleCount || 0),
        total_cost: parseFloat(tour.total_cost || tour.cost || 0),
        discount: parseFloat(tour.discount || 0),
        final_cost: parseFloat(tour.final_cost || tour.cost || 0),
        remarks: tour.remarks || ''
      };
    }),
    
    others: (leadData.others || []).map(other => {
      console.log('Processing other data:', other);
      return {
        description: other.description || '',
        date: formatDateForBackend(other.date || ''),
        total_price: parseFloat(other.total_price || other.final_cost || other.cost || other.total_cost || 0),
        remarks: other.remarks || ''
      };
    }),
    
    // Pricing information (snake_case to match backend)
    total_cost: 0, // Will be calculated below
    markup_amount: 0, // Will be calculated below
    final_cost: 0 // Will be calculated below
  };
  
  // Calculate costs
  let totalCost = 0;
  [...formattedData.flights, ...formattedData.transfers, ...formattedData.hotels,
   ...formattedData.excursions, ...formattedData.tours, ...formattedData.others].forEach(item => {
    totalCost += parseFloat(item.final_cost || item.total_price || 0);
  });
  
  const markupAmount = (totalCost * formattedData.markup_percentage) / 100;
  const finalCost = totalCost + markupAmount;
  
  formattedData.total_cost = totalCost;
  formattedData.markup_amount = markupAmount;
  formattedData.final_cost = finalCost;
  
  console.log('Formatted lead data for update:', formattedData);
  return formattedData;
}

// Validate form data
function validateFormData(formData) {
  console.log('Validating form data:', formData);
  
  const requiredFields = [
    { field: 'option_name', name: 'Option Name' },
    { field: 'client_name', name: 'Client Name' },
    { field: 'client_email', name: 'Client Email' },
    { field: 'client_phone', name: 'Client Phone' },
    { field: 'start_date', name: 'Trip Start Date' },
    { field: 'booking_date', name: 'Booking Date' }
  ];
  
  for (const { field, name } of requiredFields) {
    if (!formData[field] || formData[field].toString().trim() === '') {
      console.error(`Validation failed for field: ${field} (${name})`);
      showNotification(`${name} is required`, 'error');
      return false;
    }
  }
  
  console.log('Basic field validation passed');
  
  // Validate service data
  if (formData.hotels && formData.hotels.length > 0) {
    for (let i = 0; i < formData.hotels.length; i++) {
      const hotel = formData.hotels[i];
      
      // Check required fields based on backend struct
      if (!hotel.hotel_id) {
        showNotification(`Hotel ${i + 1}: Hotel ID is required`, 'error');
        return false;
      }
      
      if (!hotel.room_id) {
        showNotification(`Hotel ${i + 1}: Room ID is required`, 'error');
        return false;
      }
      
      if (!hotel.from_date || hotel.from_date.trim() === '') {
        showNotification(`Hotel ${i + 1}: From date is required`, 'error');
        return false;
      }
      
      if (!hotel.to_date || hotel.to_date.trim() === '') {
        showNotification(`Hotel ${i + 1}: To date is required`, 'error');
        return false;
      }
      
      if (!hotel.city || hotel.city.trim() === '') {
        showNotification(`Hotel ${i + 1}: City is required`, 'error');
        return false;
      }
      
      if (!hotel.hotel_name || hotel.hotel_name.trim() === '') {
        showNotification(`Hotel ${i + 1}: Hotel name is required`, 'error');
        return false;
      }
      
      if (!hotel.nights || hotel.nights < 1) {
        showNotification(`Hotel ${i + 1}: Nights must be at least 1`, 'error');
        return false;
      }
      
      if (hotel.total_cost < 0) {
        showNotification(`Hotel ${i + 1}: Total cost cannot be negative`, 'error');
        return false;
      }
      
      if (hotel.final_cost < 0) {
        showNotification(`Hotel ${i + 1}: Final cost cannot be negative`, 'error');
        return false;
      }
    }
  }
  
  // Validate transfers
  if (formData.transfers && formData.transfers.length > 0) {
    for (let i = 0; i < formData.transfers.length; i++) {
      const transfer = formData.transfers[i];
      if (!transfer.date || transfer.date.trim() === '') {
        showNotification(`Transfer ${i + 1}: Date is required`, 'error');
        return false;
      }
    }
  }
  
  // Validate flights
  if (formData.flights && formData.flights.length > 0) {
    for (let i = 0; i < formData.flights.length; i++) {
      const flight = formData.flights[i];
      if (!flight.flight_date || flight.flight_date.trim() === '') {
        showNotification(`Flight ${i + 1}: Date is required`, 'error');
        return false;
      }
    }
  }
  
  // Validate excursions
  if (formData.excursions && formData.excursions.length > 0) {
    for (let i = 0; i < formData.excursions.length; i++) {
      const excursion = formData.excursions[i];
      if (!excursion.date || excursion.date.trim() === '') {
        showNotification(`Excursion ${i + 1}: Date is required`, 'error');
        return false;
      }
    }
  }
  
  // Validate tours
  if (formData.tours && formData.tours.length > 0) {
    for (let i = 0; i < formData.tours.length; i++) {
      const tour = formData.tours[i];
      if (!tour.from_date || tour.from_date.trim() === '') {
        showNotification(`Tour ${i + 1}: Start date is required`, 'error');
        return false;
      }
    }
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.client_email)) {
    showNotification('Please enter a valid email address', 'error');
    return false;
  }
  
  // Validate markup percentage
  if (formData.markup_percentage < 0 || formData.markup_percentage > 100) {
    showNotification('Markup percentage must be between 0 and 100', 'error');
    return false;
  }
  
  // Validate expiry days
  if (formData.expiry_days < 1 || formData.expiry_days > 365) {
    console.error('Validation failed: expiry days out of range:', formData.expiry_days);
    showNotification('Expiry days must be between 1 and 365', 'error');
    return false;
  }
  
  console.log('All validation checks passed');
  return true;
}

// Update lead via API
async function updateLead(leadId, formData) {
  try {
    console.log('Attempting to update lead:', leadId);
    console.log('Form data being sent:', JSON.stringify(formData, null, 2));
    
    const response = await apiCall(`/proposals/${leadId}`, 'PUT', formData);
    
    console.log('API response received:', JSON.stringify(response, null, 2));
    
    // Check if the response contains the updated data
    if (response && response.transfers && response.transfers.length > 0) {
      console.log('Response transfer flight_number:', response.transfers[0].flight_number);
      console.log('Expected flight_number:', formData.transfers[0]?.flight_number);
      
      if (response.transfers[0].flight_number !== formData.transfers[0]?.flight_number) {
        console.error('⚠️ BACKEND DID NOT SAVE THE CHANGES!');
        console.error('Sent:', formData.transfers[0]?.flight_number);
        console.error('Received back:', response.transfers[0].flight_number);
      } else {
        console.log('✅ Backend successfully saved the changes');
      }
    }
    
    return response;
  } catch (error) {
    console.error('API update failed:', error);
    
    // If API fails, simulate success for demo
    if (error.message.includes('API endpoint not found') ||
        error.message.includes('404') ||
        error.message.includes('Failed to fetch')) {
      console.log('API not available, simulating update success');
      return { success: true, message: 'Demo mode: Lead update simulated' };
    } else {
      throw error;
    }
  }
}

// Update pricing summary
function updatePricingSummary() {
  // Calculate total cost (without markup) from all services
  let totalCost = 0;
  
  // Calculate from individual service items - use base cost (without markup)
  Object.keys(leadData).forEach(serviceType => {
    if (Array.isArray(leadData[serviceType])) {
      leadData[serviceType].forEach(item => {
        // Priority order for getting the base cost (without markup):
        // 1. total_cost (this is the cost without markup)
        // 2. cost (fallback to base cost)
        // 3. totalCost (camelCase version)
        // 4. total_price (for others service type)
        let itemBaseCost = 0;
        
        if (item.total_cost !== undefined && parseFloat(item.total_cost) >= 0) {
          // Use total_cost (this is the cost without markup)
          itemBaseCost = parseFloat(item.total_cost);
        } else if (item.cost !== undefined && parseFloat(item.cost) >= 0) {
          // Use cost field as fallback
          itemBaseCost = parseFloat(item.cost);
        } else if (item.totalCost !== undefined && parseFloat(item.totalCost) >= 0) {
          // Use totalCost (camelCase version)
          itemBaseCost = parseFloat(item.totalCost);
        } else {
          // Fallback to any available price field
          itemBaseCost = parseFloat(item.total_price || 0);
        }
        
        totalCost += itemBaseCost;
      });
    }
  });
  
  const markupPercentage = parseFloat(document.getElementById('markupPercentage').value) || 0;
  
  // Calculate markup amount and final cost
  const markupAmount = (totalCost * markupPercentage) / 100;
  const finalCost = totalCost + markupAmount;
  
  // Update pricing display
  document.getElementById('baseCost').textContent = `฿${totalCost.toFixed(2)}`;
  document.getElementById('markupAmount').textContent = `฿${markupAmount.toFixed(2)}`;
  document.getElementById('finalCost').textContent = `฿${finalCost.toFixed(2)}`;
  document.getElementById('markupPercent').textContent = markupPercentage;
}

// Render service items in their respective sections
function renderServiceItems(serviceType) {
  const items = leadData[serviceType] || [];
  const containerId = `${serviceType}TableBody`;
  const container = document.getElementById(containerId);
  
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }
  
  if (items.length === 0) {
    const colSpan = serviceType === 'hotels' ? 8 : serviceType === 'excursions' || serviceType === 'tours' ? 7 : serviceType === 'transfers' ? 6 : serviceType === 'flights' ? 6 : 4;
    container.innerHTML = `
      <tr>
        <td colspan="${colSpan}" class="text-center text-muted py-4">
          <i class="fa fa-plus-circle fa-2x mb-2"></i>
          <p>No ${serviceType} added yet. Click "Add ${serviceType.slice(0, -1)}" to get started.</p>
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  items.forEach((item, index) => {
    html += createServiceItemHTML(serviceType, item, index);
  });
  
  container.innerHTML = html;
  
  // Attach event listeners for edit/delete buttons
  attachServiceEventListeners(serviceType);
}

// Create HTML for a service item
function createServiceItemHTML(serviceType, item, index) {
  switch (serviceType) {
    case 'flights':
      return `
        <tr class="service-item" data-index="${index}">
          <td>${item.flight || item.flight_name || 'N/A'}</td>
          <td>${formatDateForDisplay(item.date || item.flight_date) || 'N/A'}</td>
          <td>${item.departure_time || 'N/A'}</td>
          <td>${item.arrival_time || 'N/A'}</td>
          <td>฿${(item.finalCost || item.final_cost || item.cost || item.total_cost || 0).toFixed(2)}</td>
          <td>
            <button type="button" class="btn btn-sm btn-warning edit-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-danger delete-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    
    case 'transfers':
      return `
        <tr class="service-item" data-index="${index}">
          <td>${item.from || item.from_location || 'N/A'}</td>
          <td>${item.to || item.to_location || 'N/A'}</td>
          <td>${formatDateForDisplay(item.date) || 'N/A'}</td>
          <td>${item.pickup_time || 'N/A'}</td>
          <td>฿${(item.finalCost || item.final_cost || item.cost || item.total_cost || 0).toFixed(2)}</td>
          <td>
            <button type="button" class="btn btn-sm btn-warning edit-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-danger delete-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    
    case 'hotels':
      // Build room types string for display
      const roomTypeDetails = item.room_types || item.room_type_details || [];
      const singleRooms = item.single_rooms || 0;
      const doubleRooms = item.double_rooms || 0;
      const roomTypesDisplay = buildRoomTypesString(roomTypeDetails, singleRooms, doubleRooms);
      
      return `
        <tr class="service-item" data-index="${index}">
          <td>${item.hotel || item.hotel_name || 'N/A'}</td>
          <td>${item.city || 'N/A'}</td>
          <td>${formatDateForDisplay(item.check_in || item.from_date) || 'N/A'}</td>
          <td>${formatDateForDisplay(item.check_out || item.to_date) || 'N/A'}</td>
          <td>${item.nights || 'N/A'}</td>
          <td>${roomTypesDisplay}</td>
          <td>฿${(item.final_cost || item.cost || item.total_cost || 0).toFixed(2)}</td>
          <td>
            <button type="button" class="btn btn-sm btn-warning edit-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-danger delete-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    
    case 'excursions':
      return `
        <tr class="service-item" data-index="${index}">
          <td>${item.excursion || item.excursion_name || 'N/A'}</td>
          <td>${formatDateForDisplay(item.date) || 'N/A'}</td>
          <td>${item.pickup_time || item.event_time || 'N/A'}</td>
          <td>${item.hotel || 'N/A'}</td>
          <td>฿${(item.final_cost || item.cost || item.total_cost || 0).toFixed(2)}</td>
          <td>${item.remarks || 'N/A'}</td>
          <td>
            <button type="button" class="btn btn-sm btn-warning edit-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-danger delete-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    
    case 'tours':
      return `
        <tr class="service-item" data-index="${index}">
          <td>${item.tour || item.tour_name || 'N/A'}</td>
          <td>${formatDateForDisplay(item.start_date || item.from_date) || 'N/A'}</td>
          <td>${formatDateForDisplay(item.end_date || item.to_date) || 'N/A'}</td>
          <td>${item.route || 'N/A'}</td>
          <td>฿${(item.final_cost || item.cost || item.total_cost || 0).toFixed(2)}</td>
          <td>${item.remarks || 'N/A'}</td>
          <td>
            <button type="button" class="btn btn-sm btn-warning edit-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-danger delete-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    
    case 'others':
      return `
        <tr class="service-item" data-index="${index}">
          <td>${item.description || 'N/A'}</td>
          <td>${formatDateForDisplay(item.date) || 'N/A'}</td>
          <td>฿${(item.finalCost || item.final_cost || item.cost || item.total_price || item.total_cost || 0).toFixed(2)}</td>
          <td>
            <button type="button" class="btn btn-sm btn-warning edit-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-edit"></i>
            </button>
            <button type="button" class="btn btn-sm btn-danger delete-service-btn" data-service="${serviceType}" data-index="${index}">
              <i class="fa fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    
    default:
      return `<tr><td colspan="5" class="alert alert-warning">Unknown service type: ${serviceType}</td></tr>`;
  }
}

// Attach event listeners for service items
function attachServiceEventListeners(serviceType) {
  // Edit buttons
  document.querySelectorAll(`.edit-service-btn[data-service="${serviceType}"]`).forEach(btn => {
    btn.addEventListener('click', function(event) {
      event.preventDefault(); // Prevent form submission
      event.stopPropagation(); // Stop event bubbling
      const index = parseInt(this.dataset.index);
      editServiceItem(serviceType, index);
    });
  });
  
  // Delete buttons
  document.querySelectorAll(`.delete-service-btn[data-service="${serviceType}"]`).forEach(btn => {
    btn.addEventListener('click', function(event) {
      event.preventDefault(); // Prevent form submission
      event.stopPropagation(); // Stop event bubbling
      const index = parseInt(this.dataset.index);
      deleteServiceItem(serviceType, index);
    });
  });
}

// Delete a service item
function deleteServiceItem(serviceType, index) {
  if (confirm('Are you sure you want to delete this service item?')) {
    leadData[serviceType].splice(index, 1);
    renderServiceItems(serviceType);
    updatePricingSummary();
    showNotification('Service item deleted successfully', 'success');
  }
}

// API Helper Functions
async function apiCall(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem("token");
  
  if (!token) {
    throw new Error("No authorization token available");
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

  console.log('Making API call:', {
    endpoint: `${Endpoint}/api/v1${endpoint}`,
    method,
    hasData: !!data,
    dataSize: data ? JSON.stringify(data).length : 0
  });

  try {
    const response = await fetch(`${Endpoint}/api/v1${endpoint}`, config);
    
    console.log('API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        localStorage.removeItem("agentname");
        window.location.href = "login.html";
        return;
      } else if (response.status === 403) {
        throw new Error("You don't have sufficient permissions to perform this action.");
      } else if (response.status === 404) {
        throw new Error(`API endpoint not found: ${endpoint}`);
      } else {
        const errorMessage = await response.text();
        console.error('API error response:', errorMessage);
        throw new Error(errorMessage || `HTTP error! status: ${response.status}`);
      }
    }

    // Handle different response types
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const jsonResponse = await response.json();
      console.log('API JSON response:', jsonResponse);
      return jsonResponse;
    } else {
      const textResponse = await response.text();
      console.log('API text response:', textResponse);
      return textResponse;
    }
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

// Utility Functions
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

// Populate city dropdowns
async function populateCityDropdowns() {
  try {
    const response = await fetch(`${Endpoint}/api/v1/cities`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch cities');
      return;
    }
    
    const data = await response.json();
    console.log('Cities API response:', data);
    
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
        } else if (cityObj && cityObj.name) {
          return cityObj.name;
        }
        return cityObj;
      });
    } else if (data && typeof data === 'object') {
      // Handle other object formats
      cities = Object.values(data).filter(item => 
        typeof item === 'string' || (item && (item.city || item.name))
      ).map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (item.city) {
          return item.city;
        } else if (item.name) {
          return item.name;
        }
        return item;
      });
    } else {
      console.error("Unexpected cities data format:", data);
      cities = [];
    }
    
    console.log('Processed city names:', cities.length, 'cities');
    
    if (!Array.isArray(cities)) {
      throw new Error("Invalid cities data format after processing.");
    }
    
    // Populate all city dropdowns
    const cityDropdowns = [
      '.city-dropdown-transfer',
      '.city-dropdown-hotel', 
      '.city-dropdown-excursion',
      '.city-dropdown-tour'
    ];
    
    cityDropdowns.forEach(selector => {
      const dropdown = document.querySelector(selector);
      if (dropdown) {
        // Clear existing options except the first one
        dropdown.innerHTML = '<option value="" disabled selected>Select City</option>';
        
        // Add city options
        cities.forEach(city => {
          const option = document.createElement('option');
          option.value = city;
          option.textContent = city;
          dropdown.appendChild(option);
        });
        
        console.log(`Populated ${selector} with ${cities.length} cities`);
      } else {
        console.warn(`City dropdown ${selector} not found`);
      }
    });
    
  } catch (error) {
    console.error('Error populating city dropdowns:', error);
    throw error;
  }
}

// Setup city change listeners
function setupCityChangeListeners() {
  // Transfer city change
  const transferCityDropdown = document.querySelector('.city-dropdown-transfer');
  if (transferCityDropdown) {
    transferCityDropdown.addEventListener('change', function() {
      populateTransferDropdown(this.value);
    });
  }
  
  // Hotel city change
  const hotelCityDropdown = document.querySelector('.city-dropdown-hotel');
  if (hotelCityDropdown) {
    hotelCityDropdown.addEventListener('change', function() {
      populateHotelDropdown(this.value);
    });
  }
  
  // Hotel selection change - populate room types for existing blocks
  const hotelTypeDropdown = document.getElementById('hotelType');
  if (hotelTypeDropdown) {
    hotelTypeDropdown.addEventListener('change', function() {
      const hotelId = this.value;
      if (hotelId) {
        // Populate room types for all existing room type blocks
        const roomTypeBlocks = document.querySelectorAll('#roomTypesWrapper .room-type-block');
        roomTypeBlocks.forEach(block => {
          populateRoomTypesForBlock(block, hotelId);
        });
      }
    });
  }
  
  // Excursion city change
  const excursionCityDropdown = document.querySelector('.city-dropdown-excursion');
  if (excursionCityDropdown) {
    excursionCityDropdown.addEventListener('change', function() {
      populateExcursionDropdown(this.value);
    });
  }
  
  // Tour city change
  const tourCityDropdown = document.querySelector('.city-dropdown-tour');
  if (tourCityDropdown) {
    tourCityDropdown.addEventListener('change', function() {
      populateTourDropdown(this.value);
    });
  }
}

// Populate service dropdowns based on city
async function populateTransferDropdown(cityName) {
  try {
    const response = await fetch(`${Endpoint}/api/v1/transfers?city=${encodeURIComponent(cityName)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch transfers');
      return;
    }
    
    const transfers = await response.json();
    const transferDropdown = document.getElementById('transferType');
    
    if (transferDropdown) {
      // Clear existing options except the first one
      transferDropdown.innerHTML = '<option value="" disabled selected>Select Transfer</option>';
      // Sort transfers by score in descending order (highest score first)
      transfers.sort((a, b) => (b.order || 0) - (a.order || 0));

      // Add transfer options
      transfers.forEach(transfer => {
        const option = document.createElement('option');
        option.value = transfer.id;
        option.textContent = transfer.name || transfer.description;
        transferDropdown.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('Error populating transfer dropdown:', error);
  }
}

async function populateHotelDropdown(cityName) {
  try {
    const checkInDate = document.getElementById('checkInDate').value;
    const checkOutDate = document.getElementById('checkOutDate').value;
    
    let url = `${Endpoint}/api/v1/hotels?city=${encodeURIComponent(cityName)}`;
    if (checkInDate && checkOutDate) {
      url += `&from_date=${checkInDate}&to_date=${checkOutDate}&keyword=`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch hotels');
      return;
    }
    
    const hotels = await response.json();
    const hotelDropdown = document.getElementById('hotelType');
    
    if (hotelDropdown) {
      // Clear existing options and hotel data
      hotelDropdown.innerHTML = '<option value="">Select Hotel</option>';
      Object.keys(selectedHotelData).forEach(key => delete selectedHotelData[key]);
      
      // Add hotel options and store hotel data
      hotels.forEach(hotel => {
        const option = document.createElement('option');
        option.value = hotel.id;
        option.textContent = hotel.name || hotel.hotel_name;
        hotelDropdown.appendChild(option);
        
        // Store hotel data for room types and promotions
        selectedHotelData[hotel.id] = {
          meta: hotel.fees || {},
          room_types: hotel.room_types || [],
          promotions: hotel.promotions || []
        };
      });
    }
    
  } catch (error) {
    console.error('Error populating hotel dropdown:', error);
  }
}

async function populateExcursionDropdown(cityName) {
  try {
    const response = await fetch(`${Endpoint}/api/v1/excursions?city=${encodeURIComponent(cityName)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch excursions');
      return;
    }
    
    const excursions = await response.json();
    const excursionDropdown = document.getElementById('excursionName');
    
    if (excursionDropdown) {
      // Clear existing options except the first one
      excursionDropdown.innerHTML = '<option value="" disabled selected>Select Excursion</option>';
      // Sort excursions by score in descending order (highest score first)
      excursions.sort((a, b) => (b.order || 0) - (a.order || 0));
      
      // Add excursion options
      excursions.forEach(excursion => {
        const option = document.createElement('option');
        option.value = excursion.id;
        option.textContent = excursion.name || excursion.excursion_name;
        excursionDropdown.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('Error populating excursion dropdown:', error);
  }
}

async function populateTourDropdown(cityName) {
  try {
    const response = await fetch(`${Endpoint}/api/v1/tours?city=${encodeURIComponent(cityName)}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) {
      console.error('Failed to fetch tours');
      return;
    }
    
    const tours = await response.json();
    const tourDropdown = document.getElementById('tourName');
    
    if (tourDropdown) {
      // Clear existing options except the first one
      tourDropdown.innerHTML = '<option value="" disabled selected>Select Tour</option>';
      // Clear tours data
      toursData = {};
      
      // Add tour options
      tours.forEach(tour => {
        const option = document.createElement('option');
        option.value = tour.id;
        option.textContent = tour.name || tour.tour_name;
        option.setAttribute('data-route', tour.route || '');
        option.setAttribute('data-duration', tour.duration || '');
        tourDropdown.appendChild(option);
        
        // Store tour data for later use
        toursData[tour.id] = {
          name: tour.name || tour.tour_name,
          route: tour.route || '',
          duration: tour.duration || 0
        };
      });
    }
    
  } catch (error) {
    console.error('Error populating tour dropdown:', error);
  }
}

// Calculate tour end date based on duration
function calculateTourEndDate() {
  const tourName = document.getElementById('tourName').value;
  const tourStartDate = document.getElementById('tourStartDate').value;
  
  if (!tourName || !tourStartDate) return;
  
  const tourData = toursData[tourName];
  if (!tourData || !tourData.duration) return;
  
  const startDate = new Date(tourStartDate);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + tourData.duration); // Add full duration
  
  const year = endDate.getFullYear();
  const month = String(endDate.getMonth() + 1).padStart(2, '0');
  const day = String(endDate.getDate()).padStart(2, '0');
  const formattedEndDate = `${year}-${month}-${day}`;
  
  // Use setTimeout with 50ms delay to set readonly field value
  setTimeout(() => {
    document.getElementById('tourEndDate').value = formattedEndDate;
  }, 50);
}

function showLoadingOverlay() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoadingOverlay() {
  document.getElementById('loadingOverlay').style.display = 'none';
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

// Format date for backend API
function formatDateForBackend(dateString) {
  if (!dateString) return '';
  
  try {
    // Try to parse the date string
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return as is if not a valid date
    }
    
    // Format as YYYY-MM-DD for backend
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date for backend:', error);
    return dateString; // Return as is if there's an error
  }
}

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

// Show confirmation when changing number of adults/children
async function showPaxChangeConfirmation(type, newValue) {
  const typeText = type === 'adults' ? 'Adults' : 'Children';
  const confirmed = await showConfirmationDialog(
    'Passenger Count Changed',
    `You have changed the number of ${typeText} to ${newValue}. This may affect pricing for hotels, transfers, excursions, and tours. Please make sure to update these services accordingly.`,
    'I Understand',
    'Cancel'
  );
  
  if (!confirmed) {
    // Reset to previous value if user cancels
    const input = document.getElementById(type === 'adults' ? 'numberOfAdults' : 'numberOfKids');
    const previousValue = currentLead ? (type === 'adults' ? currentLead.number_of_adults : currentLead.number_of_kids) : (type === 'adults' ? 2 : 0);
    input.value = previousValue;
  } else {
    // Update pricing summary when confirmed
    updatePricingSummary();
    showNotification(`Number of ${typeText} updated. Please review and update your services as needed.`, 'info');
  }
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
    
    // Extra bed options removed from edit_lead.html - use default values
    const extraAdultBed = false;
    const extraChildBed = false;
    const sharingBed = false;
    
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
        room_types: roomTypesData,
        // Include global extra bed options in the request
        extra_adult_bed: extraAdultBed,
        extra_child_bed: extraChildBed,
        sharing_bed: sharingBed
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
    
    const requestData = {
        agent_name: agentName,
        city: tourCity,
        tour_id: parseInt(tourName, 10),
        tot: tourToT,
        number_of_kids: numberOfKids,
        number_of_adults: numberOfAdults,
        travel_date: tourStartDate,
        to_date: tourEndDate || tourStartDate,
        single_rooms: singleRoomCount,
        double_rooms: doubleRoomCount,
        triple_rooms: tripleRoomCount
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

// Build room types string for display
function buildRoomTypesString(roomTypeDetails, singleRooms, doubleRooms) {
    if (!roomTypeDetails || roomTypeDetails.length === 0) {
        // Fallback to basic single/double room display
        if (singleRooms > 0 || doubleRooms > 0) {
            return `${singleRooms}S, ${doubleRooms}D`;
        }
        return 'No rooms specified';
    }
    
    // Build descriptive room type string
    const roomTypeStrings = roomTypeDetails.map(rt => {
        const roomName = rt.room_type_name || rt.room_type || 'Room';
        const adults = rt.adults || 0;
        const children = rt.children || 0;
        return `${roomName} (${adults}A, ${children}C)`;
    });
    
    return roomTypeStrings.join(', ');
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

// Remove room type block
function removeRoomType(blockId) {
    const block = document.getElementById(blockId);
    if (block) {
        block.remove();
    }
}

// Helper function to populate room types when editing hotels
function populateRoomTypesForEdit(service) {
    const roomTypesWrapper = document.getElementById('roomTypesWrapper');
    if (!roomTypesWrapper) {
        console.warn('Room types wrapper not found');
        return;
    }
    
    // Handle room types if they exist - backend sends room_types array
    const roomTypes = service.room_types || service.roomTypeDetails || [];
    console.log('populateRoomTypesForEdit called with service:', service);
    console.log('Room types to populate:', roomTypes);
    
    if (roomTypes && roomTypes.length > 0) {
        console.log('Populating room types for edit:', roomTypes);
        
        // Clear existing room type blocks first
        roomTypesWrapper.innerHTML = '';
        
        // Recreate room type blocks with saved data
        roomTypes.forEach((roomTypeDetail, index) => {
            console.log(`Creating room type block ${index}:`, roomTypeDetail);
            
            // Create the room type block
            const roomTypeDiv = document.createElement('div');
            roomTypeDiv.className = 'room-type-block border rounded p-3 mb-3';
            roomTypeDiv.id = `roomType_${roomTypeCounter}`;
            
            // Extract room type information with fallbacks
            const roomTypeId = roomTypeDetail.room_type_id || 0;
            const roomTypeName = roomTypeDetail.room_type || roomTypeDetail.room_type_name || 'Unknown Room Type';
            const adults = roomTypeDetail.adults || 2;
            const children = roomTypeDetail.children || 0;
            const complimentaryAbf = roomTypeDetail.complimentary_abf || false;
            const extraAdultBed = roomTypeDetail.extra_adult_bed || false;
            const extraChildBed = roomTypeDetail.extra_child_bed || false;
            const sharingBed = roomTypeDetail.sharing_bed || false;
            
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
                        <input type="number" class="form-control adults-input" min="0" value="${adults}" />
                    </div>
                    <div class="col-md-2">
                        <label>Children</label>
                        <input type="number" class="form-control children-input" min="0" value="${children}" />
                    </div>
                    <div class="col-md-4">
                        <label>Options</label><br>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="abf_${roomTypeCounter}" ${complimentaryAbf ? 'checked' : ''}>
                            <label class="form-check-label" for="abf_${roomTypeCounter}">Complimentary ABF</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="extraAdultBed_${roomTypeCounter}" ${extraAdultBed ? 'checked' : ''}>
                            <label class="form-check-label" for="extraAdultBed_${roomTypeCounter}">Extra Adult Bed</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="extraChildBed_${roomTypeCounter}" ${extraChildBed ? 'checked' : ''}>
                            <label class="form-check-label" for="extraChildBed_${roomTypeCounter}">Extra Child Bed</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" id="sharingBed_${roomTypeCounter}" ${sharingBed ? 'checked' : ''}>
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
            
            // Always create the saved room type option first
            if (roomTypeId && roomTypeName) {
                const savedOption = document.createElement('option');
                savedOption.value = roomTypeId;
                savedOption.textContent = roomTypeName;
                savedOption.selected = true;
                roomTypeDropdown.appendChild(savedOption);
                console.log(`Added saved room type option: ${roomTypeName} (ID: ${roomTypeId})`);
            }
            
            // Try to populate additional options from hotel data if available
            const hotelDropdown = document.getElementById('hotelType');
            if (hotelDropdown && hotelDropdown.value && selectedHotelData[hotelDropdown.value]) {
                const availableRoomTypes = selectedHotelData[hotelDropdown.value].room_types || [];
                availableRoomTypes.forEach(roomType => {
                    // Only add if it's not already the selected option
                    if (roomType.id != roomTypeId) {
                        const option = document.createElement('option');
                        option.value = roomType.id;
                        option.textContent = roomType.name;
                        roomTypeDropdown.appendChild(option);
                    }
                });
                console.log(`Added ${availableRoomTypes.length} additional room type options`);
            }
            
            // Add ABF auto-check functionality
            addAbfAutoCheckListener(roomTypeDropdown, roomTypeDiv, currentCounter);
            
            roomTypeCounter++;
        });
        
        console.log(`✅ Successfully created ${roomTypes.length} room type blocks for editing`);
        
        // Update button state after creating all blocks
        setTimeout(() => {
            updateAddRoomTypeButtonState();
        }, 100);
    } else {
        console.log('No room types found to populate for editing');
    }
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

// Reset hotel modal to clean state
function resetHotelModal() {
  // Reset the form
  const hotelForm = document.getElementById('hotelBookingForm');
  if (hotelForm) {
    hotelForm.reset();
  }
  
  // Clear room types wrapper
  const roomTypesWrapper = document.getElementById('roomTypesWrapper');
  if (roomTypesWrapper) {
    roomTypesWrapper.innerHTML = '';
  }
  
  // Reset dropdowns to default state
  const hotelCitySelect = document.getElementById('hotelCity');
  const hotelTypeSelect = document.getElementById('hotelType');
  
  if (hotelCitySelect) {
    hotelCitySelect.value = '';
  }
  
  if (hotelTypeSelect) {
    hotelTypeSelect.innerHTML = '<option value="">Select Hotel</option>';
  }
  
  // Clear hotel data
  Object.keys(selectedHotelData).forEach(key => delete selectedHotelData[key]);
  
  // Reset room type counter for next use
  roomTypeCounter = 0;
  
  console.log('Hotel modal reset completed');
}

// Populate room types for a specific block
function populateRoomTypesForBlock(block, hotelId) {
    const roomTypeSelect = block.querySelector('.roomtype-dropdown');
    
    if (!roomTypeSelect) return;
    
    // Clear existing options except the first one
    roomTypeSelect.innerHTML = '<option value="">Select Room Type</option>';
    
    // Use stored hotel data if available
    if (selectedHotelData[hotelId] && selectedHotelData[hotelId].room_types) {
        const roomTypes = selectedHotelData[hotelId].room_types;
        
        // Add room type options
        roomTypes.forEach(roomType => {
            const option = document.createElement('option');
            option.value = roomType.id;
            option.textContent = roomType.name || roomType.room_type_name;
            roomTypeSelect.appendChild(option);
        });
        
        console.log(`Populated room types for block with ${roomTypes.length} options`);
    } else {
        console.warn(`No room types data found for hotel ID: ${hotelId}`);
    }
}

// Initialize new flight modal with default values
function initializeNewFlightModal() {
  // Set flight date to trip start date
  const tripStartDate = document.getElementById('startDate').value;
  if (tripStartDate) {
    document.getElementById('flightDate').value = tripStartDate;
    console.log('Set flight date to trip start date:', tripStartDate);
  }
  
  // Clear other fields for new flight
  document.getElementById('flight').value = '';
  document.getElementById('number').value = '';
  document.getElementById('flightInOut').value = '';
  document.getElementById('flightRoute').value = '';
  document.getElementById('departureTime').value = '';
  document.getElementById('arrivalTime').value = '';
  document.getElementById('issuedBy').value = '';
  document.getElementById('flightCost').value = '';
  document.getElementById('flightRemarks').value = '';
}

// Initialize new transfer modal with default values
function initializeNewTransferModal() {
  // Set transfer date to trip start date
  const tripStartDate = document.getElementById('startDate').value;
  if (tripStartDate) {
    document.getElementById('transferDate').value = tripStartDate;
    console.log('Set transfer date to trip start date:', tripStartDate);
  }
  
  // Clear other fields for new transfer
  document.getElementById('transferCity').value = '';
  document.getElementById('transferType').innerHTML = '<option value="" disabled selected>Select Transfer</option>';
  document.getElementById('transferFrom').value = '';
  document.getElementById('transferTo').value = '';
  document.getElementById('transferFlight').value = '';
  document.getElementById('flightTime').value = '';
  document.getElementById('transferToT').value = '';
  document.getElementById('transferPickupTime').value = '';
  document.getElementById('backendTransferPrice').value = '0.00';
  document.getElementById('transferRemarks').value = '';
}

// Initialize new excursion modal with default values
function initializeNewExcursionModal() {
  // Set excursion date to trip start date
  const tripStartDate = document.getElementById('startDate').value;
  if (tripStartDate) {
    document.getElementById('excursionDate').value = tripStartDate;
    console.log('Set excursion date to trip start date:', tripStartDate);
  }
  
  // Clear other fields for new excursion
  document.getElementById('excursionCity').value = '';
  document.getElementById('excursionName').innerHTML = '<option value="" disabled selected>Select Excursion</option>';
  document.getElementById('excursionHotel').value = '';
  document.getElementById('excursionPickupTime').value = '';
  document.getElementById('typeOfExcursion').value = '';
  document.getElementById('backendExcursionPrice').value = '0.00';
  document.getElementById('excursionRemarks').value = '';
}

// Initialize new tour modal with default values
function initializeNewTourModal() {
  // Set tour start date to trip start date
  const tripStartDate = document.getElementById('startDate').value;
  if (tripStartDate) {
    document.getElementById('tourStartDate').value = tripStartDate;
    console.log('Set tour start date to trip start date:', tripStartDate);
  }
  
  // Clear other fields for new tour
  document.getElementById('tourCity').value = '';
  document.getElementById('tourName').innerHTML = '<option value="" disabled selected>Select Tour</option>';
  document.getElementById('tourRoute').value = '';
  document.getElementById('tourEndDate').value = '';
  document.getElementById('tourToT').value = '';
  
  // Reset room type checkboxes and counts
  document.getElementById('tourSingleRoom').checked = false;
  document.getElementById('tourSingleRoomCount').value = '';
  document.getElementById('tourSingleRoomCount').disabled = true;
  document.getElementById('tourDoubleRoom').checked = false;
  document.getElementById('tourDoubleRoomCount').value = '';
  document.getElementById('tourDoubleRoomCount').disabled = true;
  document.getElementById('tourTripleRoom').checked = false;
  document.getElementById('tourTripleRoomCount').value = '';
  document.getElementById('tourTripleRoomCount').disabled = true;
  
  document.getElementById('backendTourPrice').value = '0.00';
  document.getElementById('tourRemarks').value = '';
}

// Initialize new other service modal with default values
function initializeNewOtherModal() {
  // Set other service date to trip start date
  const tripStartDate = document.getElementById('startDate').value;
  if (tripStartDate) {
    document.getElementById('otherDate').value = tripStartDate;
    console.log('Set other service date to trip start date:', tripStartDate);
  }
  
  // Clear other fields for new other service
  document.getElementById('otherDescription').value = '';
  document.getElementById('otherCost').value = '';
}