/**
 * Tour Hotels UI Component
 * Displays and manages tour hotel information in trip/booking views
 */

const TourHotelsUI = {
  // Store fetched hotel data for room type population
  hotelDataCache: {},
  /**
   * Initialize tour hotels display for a trip
   * @param {number} tripId - The trip ID
   * @param {Array} tourItems - Array of tour trip items
   * @param {boolean} isAdmin - Whether current user is admin
   * @param {boolean} isBooking - Whether this is a booking (vs quotation)
   */
  async initializeTourHotels(tripId, tourItems, isAdmin = false, isBooking = false) {
    if (!tourItems || tourItems.length === 0) {
      return;
    }

    console.log("[TourHotelsUI] Initializing with tripId:", tripId, "tourItems:", tourItems);

    for (const tourItem of tourItems) {
      try {
        // Validate tour item has required IDs
        const tourItemId = tourItem.id;
        const tourId = tourItem.tour_id;
        
        if (!tourItemId || tourItemId === 0) {
          console.warn("[TourHotelsUI] Skipping tour item without valid tour item ID:", tourItem);
          continue;
        }
        
        if (!tourId || tourId === 0) {
          console.warn("[TourHotelsUI] Skipping tour item without valid tour_id (master tour reference):", tourItem);
          continue;
        }
        
        await this.displayTourHotels(tripId, tourItem, isAdmin, isBooking);
      } catch (error) {
        console.error(`Error displaying hotels for tour ${tourItem.id}:`, error);
      }
    }
  },

  /**
   * Display hotels for a specific tour
   * @param {number} tripId - The trip ID
   * @param {Object} tourItem - Tour trip item object
   * @param {boolean} isAdmin - Whether current user is admin
   * @param {boolean} isBooking - Whether this is a booking
   */
  async displayTourHotels(tripId, tourItem, isAdmin, isBooking) {
    try {
      console.log("[TourHotelsUI] displayTourHotels called with tripId:", tripId, "tourItem.id:", tourItem.id, "tourItem:", tourItem);
      const hotelData = await TourHotelsAPI.getTourHotels(tripId, tourItem.id);
      
      // Find the tour row in the table
      const tourRow = this.findTourRow(tourItem.id);
      if (!tourRow) {
        return;
      }

      // Create hotels display element
      const hotelsDisplay = this.createHotelsDisplay(hotelData, isAdmin, isBooking, tripId, tourItem.id);
      
      // Insert hotels display after the tour row
      const hotelsRow = document.createElement("tr");
      hotelsRow.className = "tour-hotels-row";
      hotelsRow.dataset.tourItemId = tourItem.id;
      
      const cell = document.createElement("td");
      cell.colSpan = tourRow.cells.length;
      cell.appendChild(hotelsDisplay);
      hotelsRow.appendChild(cell);
      
      // Remove existing hotels row if present
      const existingHotelsRow = tourRow.nextElementSibling;
      if (existingHotelsRow && existingHotelsRow.classList.contains("tour-hotels-row")) {
        existingHotelsRow.remove();
      }
      
      // Insert after tour row
      tourRow.parentNode.insertBefore(hotelsRow, tourRow.nextSibling);
      
    } catch (error) {
      // Silently skip 404 errors (endpoint not implemented yet)
      if (error.status === 404 || (error.message && error.message.includes("404"))) {
        return;
      }
      
      // For other errors, show error message
      console.error("Error displaying tour hotels:", error);
      APIUtils.showError("Failed to load tour hotels");
    }
  },

  /**
   * Create the hotels display HTML element
   * @param {Object} hotelData - Hotel data from API
   * @param {boolean} isAdmin - Whether current user is admin
   * @param {boolean} isBooking - Whether this is a booking
   * @param {number} tripId - The trip ID
   * @param {number} tourItemId - The tour item ID
   * @returns {HTMLElement} Hotels display element
   */
  createHotelsDisplay(hotelData, isAdmin, isBooking, tripId, tourItemId) {
    const container = document.createElement("div");
    container.className = "tour-hotels-container";
    container.style.cssText = "padding: 15px; background-color: #f8f9fa; border-left: 4px solid #007bff; margin: 10px 0;";

    // Header with badge
    const header = document.createElement("div");
    header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;";
    
    const title = document.createElement("h5");
    title.style.cssText = "margin: 0; color: #333;";
    title.innerHTML = '<i class="fa fa-hotel"></i> Tour Accommodation';
    
    const badgeContainer = document.createElement("div");
    
    if (hotelData.has_overrides) {
      const badge = document.createElement("span");
      badge.className = "badge badge-warning";
      badge.textContent = "Custom Hotels";
      badge.style.cssText = "font-size: 0.85em; padding: 5px 10px;";
      badgeContainer.appendChild(badge);
    }
    
    // Add edit button for admin in quotations & bookings
    if (isAdmin) {
      const editBtn = document.createElement("button");
      editBtn.type = "button"; // Prevent form submission
      editBtn.className = "btn btn-sm btn-primary";
      editBtn.style.cssText = "margin-left: 10px;";
      editBtn.innerHTML = '<i class="fa fa-edit"></i> Edit Hotels';
      editBtn.onclick = (event) => {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        this.openEditModal(tripId, tourItemId, hotelData, isBooking);
        return false;
      };
      badgeContainer.appendChild(editBtn);
    }
    
    header.appendChild(title);
    header.appendChild(badgeContainer);
    container.appendChild(header);

    // ─── Transfer In (top) ───────────────────────────────────────────
    const transferInBox = document.createElement("div");
    transferInBox.className = "transfer-in-box";
    transferInBox.style.cssText = "display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; margin-bottom: 10px; background: #e8f4f8; border: 1px solid #bee5eb; border-radius: 6px;";
    transferInBox.innerHTML = `
      <span style="color:#0c6079; font-size:1.1em; margin-top:2px;"><i class="fa fa-arrow-circle-down"></i></span>
      <div style="flex:1;">
        <strong style="color:#0c6079; font-size:0.85em; text-transform:uppercase; letter-spacing:0.5px;">Transfer In</strong>
        <div style="color:#333; margin-top:2px; font-size:0.95em;">${hotelData.transfer_in || '<span style="color:#999; font-style:italic;">— Not specified —</span>'}</div>
      </div>
    `;
    container.appendChild(transferInBox);

    // Hotels list
    if (hotelData.hotels && hotelData.hotels.length > 0) {
      const hotelsList = document.createElement("div");
      hotelsList.className = "hotels-list";
      
      hotelData.hotels.forEach(hotel => {
        const hotelItem = this.createHotelItem(hotel);
        hotelsList.appendChild(hotelItem);
      });
      
      container.appendChild(hotelsList);
    } else {
      const noHotels = document.createElement("p");
      noHotels.className = "text-muted";
      noHotels.style.cssText = "margin: 10px 0 0 0;";
      noHotels.textContent = "No accommodation information available for this tour.";
      container.appendChild(noHotels);
    }

    // ─── Transfer Out (bottom) ───────────────────────────────────────
    const transferOutBox = document.createElement("div");
    transferOutBox.className = "transfer-out-box";
    transferOutBox.style.cssText = "display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; margin-top: 10px; background: #fff8e8; border: 1px solid #ffd27d; border-radius: 6px;";
    transferOutBox.innerHTML = `
      <span style="color:#b05e00; font-size:1.1em; margin-top:2px;"><i class="fa fa-arrow-circle-up"></i></span>
      <div style="flex:1;">
        <strong style="color:#b05e00; font-size:0.85em; text-transform:uppercase; letter-spacing:0.5px;">Transfer Out</strong>
        <div style="color:#333; margin-top:2px; font-size:0.95em;">${hotelData.transfer_out || '<span style="color:#999; font-style:italic;">— Not specified —</span>'}</div>
      </div>
    `;
    container.appendChild(transferOutBox);

    return container;
  },

  /**
   * Create a single hotel item display
   * @param {Object} hotel - Hotel object
   * @returns {HTMLElement} Hotel item element
   */
  createHotelItem(hotel) {
    const item = document.createElement("div");
    item.className = "hotel-item";
    item.style.cssText = "padding: 10px; margin: 5px 0; background-color: white; border-radius: 4px; border: 1px solid #dee2e6;";

    const content = document.createElement("div");
    
    // Hotel name with dates
    const mainInfo = document.createElement("div");
    mainInfo.style.cssText = "font-weight: 600; color: #333; margin-bottom: 5px;";
    
    // Display actual dates instead of day numbers
    const dateRange = hotel.check_in_date && hotel.check_out_date 
      ? `${hotel.check_in_date} to ${hotel.check_out_date}`
      : `Night ${hotel.day}`;
    
    mainInfo.innerHTML = `<strong>${dateRange}:</strong> ${hotel.hotel_name}`;
    
    if (hotel.is_override) {
      const customBadge = document.createElement("span");
      customBadge.className = "badge badge-info";
      customBadge.style.cssText = "margin-left: 10px; font-size: 0.75em;";
      customBadge.textContent = "Custom";
      mainInfo.appendChild(customBadge);
    }
    
    content.appendChild(mainInfo);

    // Additional info
    const details = [];
    if (hotel.room_type) {
      details.push(`Room Type: ${hotel.room_type}`);
    }
    if (hotel.city) {
      details.push(`City: ${hotel.city}`);
    }
    
    if (details.length > 0) {
      const detailsDiv = document.createElement("div");
      detailsDiv.style.cssText = "font-size: 0.9em; color: #666; margin-top: 3px;";
      detailsDiv.textContent = details.join(" • ");
      content.appendChild(detailsDiv);
    }

    // Replacement note
    if (hotel.replacement_note) {
      const noteDiv = document.createElement("div");
      noteDiv.className = "alert alert-info";
      noteDiv.style.cssText = "margin-top: 8px; margin-bottom: 0; padding: 8px; font-size: 0.9em;";
      noteDiv.innerHTML = `<i class="fa fa-info-circle"></i> <strong>Note:</strong> ${hotel.replacement_note}`;
      content.appendChild(noteDiv);
    }

    item.appendChild(content);
    return item;
  },

  /**
   * Find tour row in the table by tour item ID
   * @param {number} tourItemId - Tour item ID
   * @returns {HTMLElement|null} Tour row element
   */
  findTourRow(tourItemId) {
    // Try to find by data attribute
    const rows = document.querySelectorAll("#tourTableBody tr");
    for (const row of rows) {
      if (row.dataset.tourItemId == tourItemId) {
        return row;
      }
    }
    return null;
  },

  /**
   * Open edit modal for tour hotels (admin only)
   * @param {number} tripId - Trip ID
   * @param {number} tourItemId - Tour item ID
   * @param {Object} currentHotelData - Current hotel data
   */
  openEditModal(tripId, tourItemId, currentHotelData, isBooking) {
    // Create modal if it doesn't exist
    let modal = document.getElementById("editTourHotelsModal");
    if (!modal) {
      modal = this.createEditModal();
      document.body.appendChild(modal);
    }

    // Populate modal with current data
    this.populateEditModal(tripId, tourItemId, currentHotelData, isBooking);
    
    // Show modal
    try {
      if (typeof $ !== 'undefined' && $.fn.modal) {
        $(modal).modal("show");
      } else {
        // Fallback: show modal manually
        modal.style.display = "block";
        modal.classList.add("show");
        document.body.classList.add("modal-open");
      }
    } catch (error) {
      console.error("Error showing modal:", error);
    }
  },

  /**
   * Create the edit modal HTML
   * @returns {HTMLElement} Modal element
   */
  createEditModal() {
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "editTourHotelsModal";
    modal.setAttribute("tabindex", "-1");
    modal.setAttribute("role", "dialog");
    
    modal.innerHTML = `
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fa fa-hotel"></i> Edit Tour Hotels
            </h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <i class="fa fa-info-circle"></i>
              <strong>Note:</strong> Changes to hotels will apply to both the quotation and booking. Pricing will not change.
            </div>
            <div id="editHotelsForm">
              <!-- Hotels will be populated here -->
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="revertToDefaultsBtn">
              <i class="fa fa-undo"></i> Revert to Tour Defaults
            </button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="saveHotelsBtn">
              <i class="fa fa-save"></i> Save Changes
            </button>
          </div>
        </div>
      </div>
    `;

    return modal;
  },

  /**
   * Populate edit modal with hotel data
   * @param {number} tripId - Trip ID
   * @param {number} tourItemId - Tour item ID
   * @param {Object} hotelData - Hotel data
   */
  populateEditModal(tripId, tourItemId, hotelData, isBooking) {
    const form = document.getElementById("editHotelsForm");
    form.innerHTML = "";

    // Store trip and tour item IDs
    form.dataset.tripId = tripId;
    form.dataset.tourItemId = tourItemId;
    form.dataset.isBooking = isBooking;

    // ─── Transfer In (read-only, auto from trip's first transfer) ────
    const transferInSection = document.createElement("div");
    transferInSection.style.cssText = "margin-bottom: 20px; padding: 12px; background: #e8f4f8; border: 1px solid #bee5eb; border-radius: 6px;";
    transferInSection.innerHTML = `
      <div style="font-weight:600; color:#0c6079; margin-bottom:4px;">
        <i class="fa fa-arrow-circle-down"></i> Transfer In
        <small class="text-muted" style="font-weight:normal;"> — auto from first trip transfer</small>
      </div>
      <div style="color:#333; font-size:0.95em; padding: 6px 0;">${hotelData.transfer_in || '<span style="color:#999; font-style:italic;">No transfer found for this trip</span>'}</div>
    `;
    form.appendChild(transferInSection);

    if (!hotelData.hotels || hotelData.hotels.length === 0) {
      const noHotels = document.createElement('p');
      noHotels.className = 'text-muted';
      noHotels.textContent = 'No hotels defined for this tour.';
      form.appendChild(noHotels);
    } else {
      hotelData.hotels.forEach((hotel, index) => {
        const hotelForm = this.createHotelEditForm(hotel, index);
        form.appendChild(hotelForm);
      });
    }

    // ─── Transfer Out (read-only, auto from trip's last transfer) ────
    const transferOutSection = document.createElement("div");
    transferOutSection.style.cssText = "margin-top: 20px; padding: 12px; background: #fff8e8; border: 1px solid #ffd27d; border-radius: 6px;";
    transferOutSection.innerHTML = `
      <div style="font-weight:600; color:#b05e00; margin-bottom:4px;">
        <i class="fa fa-arrow-circle-up"></i> Transfer Out
        <small class="text-muted" style="font-weight:normal;"> — auto from last trip transfer</small>
      </div>
      <div style="color:#333; font-size:0.95em; padding: 6px 0;">${hotelData.transfer_out || '<span style="color:#999; font-style:italic;">No transfer found for this trip</span>'}</div>
    `;
    form.appendChild(transferOutSection);

    // Setup save button
    const saveBtn = document.getElementById("saveHotelsBtn");
    const revertBtn = document.getElementById("revertToDefaultsBtn");
    
    if (!saveBtn || !revertBtn) {
      return;
    }
    
    // Reset button states (in case they were disabled from previous save)
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa fa-save"></i> Save Changes';
    revertBtn.disabled = false;
    revertBtn.innerHTML = '<i class="fa fa-undo"></i> Revert to Tour Defaults';
    
    saveBtn.onclick = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      this.saveHotels(tripId, tourItemId);
    };
    
    revertBtn.onclick = (event) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      this.revertToDefaults(tripId, tourItemId);
    };
  },

  /**
   * Fetch hotels by city from the API
   * @param {string} city - City name
   * @param {string} fromDate - Check-in date (YYYY-MM-DD)
   * @param {string} toDate - Check-out date (YYYY-MM-DD)
   * @returns {Promise<Array>} Array of hotel objects
   */
  async fetchHotelsByCity(city, fromDate, toDate) {
    try {
      const url = new URL(`${Endpoint}/api/v1/hotels`);
      url.searchParams.append('city', city);
      // Convert DD-MM-YYYY to YYYY-MM-DD for backend query parsing compatibility
      const formatDateForAPI = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) return dateStr; // Already YYYY-MM-DD
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
      };

      const formattedFrom = formatDateForAPI(fromDate);
      const formattedTo = formatDateForAPI(toDate);

      if (formattedFrom) url.searchParams.append('from_date', formattedFrom);
      if (formattedTo) url.searchParams.append('to_date', formattedTo);
      url.searchParams.append('keyword', '');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hotels');
      }

      const hotels = await response.json();
      
      // Cache hotel data for room type population
      hotels.forEach(hotel => {
        this.hotelDataCache[hotel.id] = {
          name: hotel.name || hotel.hotel_name,
          room_types: hotel.room_types || [],
          promotions: hotel.promotions || []
        };
      });

      return hotels;
    } catch (error) {
      console.error('Error fetching hotels by city:', error);
      return [];
    }
  },

  /**
   * Populate hotel dropdown with hotels for a given city
   * @param {HTMLSelectElement} hotelDropdown - The hotel dropdown element
   * @param {string} city - City name
   * @param {string} fromDate - Check-in date
   * @param {string} toDate - Check-out date
   * @param {string} currentHotelName - Current hotel name to select
   */
  async populateHotelDropdown(hotelDropdown, city, fromDate, toDate, currentHotelName) {
    // Show loading state
    hotelDropdown.innerHTML = '<option value="">Loading hotels...</option>';
    hotelDropdown.disabled = true;

    try {
      const hotels = await this.fetchHotelsByCity(city, fromDate, toDate);
      
      hotelDropdown.innerHTML = '<option value="">Select Hotel</option>';
      
      let selectedFound = false;
      hotels.forEach(hotel => {
        const option = document.createElement('option');
        option.value = hotel.id;
        option.textContent = hotel.name || hotel.hotel_name;
        option.dataset.hotelName = hotel.name || hotel.hotel_name;
        
        // Store room types as data attribute (same pattern as edit_trip.html)
        option.setAttribute('data-roomtypes', JSON.stringify(hotel.room_types || []));
        
        // Select if it matches the current hotel name
        if (currentHotelName && (hotel.name === currentHotelName || hotel.hotel_name === currentHotelName)) {
          option.selected = true;
          selectedFound = true;
        }
        
        hotelDropdown.appendChild(option);
      });

      // If no match found but we have a current hotel name, add it as an option
      if (!selectedFound && currentHotelName) {
        const customOption = document.createElement('option');
        customOption.value = 'custom_' + currentHotelName;
        customOption.textContent = currentHotelName + ' (Current)';
        customOption.dataset.hotelName = currentHotelName;
        customOption.setAttribute('data-roomtypes', '[]');
        customOption.selected = true;
        hotelDropdown.appendChild(customOption);
      }

      hotelDropdown.disabled = false;

      // Trigger room type population for currently selected hotel (initial load)
      this.onHotelChange(hotelDropdown, true);

    } catch (error) {
      console.error('Error populating hotel dropdown:', error);
      hotelDropdown.innerHTML = '<option value="">Failed to load hotels</option>';
      hotelDropdown.disabled = false;
    }
  },

  /**
   * Handle hotel dropdown change - populate room types
   * @param {HTMLSelectElement} hotelDropdown - The hotel dropdown element
   * @param {boolean} isInitialLoad - Whether this is the initial load (not user-triggered change)
   */
  onHotelChange(hotelDropdown, isInitialLoad = false) {
    const container = hotelDropdown.closest('.hotel-edit-form');
    if (!container) return;

    const roomTypeDropdown = container.querySelector('.hotel-room-type-dropdown');
    if (!roomTypeDropdown) return;

    const hotelId = hotelDropdown.value;
    const selectedOption = hotelDropdown.options[hotelDropdown.selectedIndex];
    
    // Only use current room type on initial load, not when user changes hotel
    const currentRoomType = isInitialLoad ? (roomTypeDropdown.dataset.currentRoomType || '') : '';

    // Clear existing options
    roomTypeDropdown.innerHTML = '<option value="">Select Room Type</option>';

    // If it's a custom hotel (not in system), keep existing room type only on initial load
    if (hotelId && hotelId.startsWith('custom_')) {
      if (isInitialLoad && currentRoomType) {
        const customOption = document.createElement('option');
        customOption.value = currentRoomType;
        customOption.textContent = currentRoomType;
        customOption.selected = true;
        roomTypeDropdown.appendChild(customOption);
      }
      return;
    }

    // Get room types from data-roomtypes attribute (same pattern as edit_trip.html)
    let roomTypes = [];
    if (selectedOption) {
      try {
        roomTypes = JSON.parse(selectedOption.getAttribute('data-roomtypes') || '[]');
      } catch (e) {
        console.error('Failed to parse room types JSON:', e);
      }
    }

    // Fallback to cache if data attribute is empty
    if (roomTypes.length === 0 && hotelId && this.hotelDataCache[hotelId]) {
      roomTypes = this.hotelDataCache[hotelId].room_types || [];
    }

    if (roomTypes.length > 0) {
      let selectedFound = false;
      roomTypes.forEach(roomType => {
        const option = document.createElement('option');
        const roomTypeName = roomType.name || roomType.room_type_name;
        option.value = roomTypeName;
        option.textContent = roomTypeName;
        
        // Only select if it matches current room type AND this is initial load
        if (isInitialLoad && currentRoomType && roomTypeName === currentRoomType) {
          option.selected = true;
          selectedFound = true;
        }
        
        roomTypeDropdown.appendChild(option);
      });

      // Only add "(Current)" option on initial load if current room type not found in list
      if (isInitialLoad && !selectedFound && currentRoomType) {
        const customOption = document.createElement('option');
        customOption.value = currentRoomType;
        customOption.textContent = currentRoomType + ' (Current)';
        customOption.selected = true;
        roomTypeDropdown.appendChild(customOption);
      }
    } else if (isInitialLoad && currentRoomType) {
      // No room types available, but we have a current room type (only on initial load)
      const customOption = document.createElement('option');
      customOption.value = currentRoomType;
      customOption.textContent = currentRoomType;
      customOption.selected = true;
      roomTypeDropdown.appendChild(customOption);
    }
  },

  /**
   * Create edit form for a single hotel
   * @param {Object} hotel - Hotel object
   * @param {number} index - Hotel index
   * @returns {HTMLElement} Hotel form element
   */
  createHotelEditForm(hotel, index) {
    const container = document.createElement("div");
    container.className = "hotel-edit-form";
    container.style.cssText = "padding: 15px; margin-bottom: 15px; border: 1px solid #dee2e6; border-radius: 4px; background-color: #f8f9fa;";
    container.dataset.hotelIndex = index;
    container.dataset.day = hotel.day;
    container.dataset.city = hotel.city || '';
    container.dataset.checkInDate = hotel.check_in_date || '';
    container.dataset.checkOutDate = hotel.check_out_date || '';

    // Display dates if available, otherwise show day number
    const dateDisplay = hotel.check_in_date && hotel.check_out_date
      ? `${hotel.check_in_date} to ${hotel.check_out_date}`
      : `Night ${hotel.day}`;
    
    container.innerHTML = `
      <h6 style="margin-bottom: 15px; color: #007bff;">
        <i class="fa fa-bed"></i> ${dateDisplay}
      </h6>
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label>City</label>
            <input type="text" class="form-control hotel-city" value="${hotel.city || ""}" readonly style="background-color: #e9ecef; cursor: not-allowed;">
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label>Hotel *</label>
            <select class="form-control hotel-dropdown" required>
              <option value="">Loading hotels...</option>
            </select>
            <input type="hidden" class="hotel-name" value="${hotel.hotel_name || ""}">
          </div>
        </div>
      </div>
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label>Room Type</label>
            <select class="form-control hotel-room-type-dropdown" data-current-room-type="${hotel.room_type || ""}">
              <option value="">Select Room Type</option>
              ${hotel.room_type ? `<option value="${hotel.room_type}" selected>${hotel.room_type}</option>` : ''}
            </select>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label>Reason for Change (Optional)</label>
            <input type="text" class="form-control hotel-note" placeholder="E.g., Original hotel fully booked" value="${hotel.replacement_note || ""}">
          </div>
        </div>
      </div>
    `;

    // Setup hotel dropdown change event
    const hotelDropdown = container.querySelector('.hotel-dropdown');
    const hotelNameInput = container.querySelector('.hotel-name');
    
    hotelDropdown.addEventListener('change', () => {
      // Update hidden hotel name input
      const selectedOption = hotelDropdown.options[hotelDropdown.selectedIndex];
      if (selectedOption && selectedOption.dataset.hotelName) {
        hotelNameInput.value = selectedOption.dataset.hotelName;
      } else if (hotelDropdown.value) {
        hotelNameInput.value = selectedOption.textContent.replace(' (Current)', '');
      }
      
      // Populate room types
      this.onHotelChange(hotelDropdown);
    });

    // Populate hotel dropdown based on city
    if (hotel.city) {
      this.populateHotelDropdown(
        hotelDropdown, 
        hotel.city, 
        hotel.check_in_date, 
        hotel.check_out_date, 
        hotel.hotel_name
      );
    } else {
      hotelDropdown.innerHTML = '<option value="">No city specified</option>';
      hotelDropdown.disabled = true;
    }

    return container;
  },

  /**
   * Save hotels from edit modal
   * @param {number} tripId - Trip ID
   * @param {number} tourItemId - Tour item ID
   */
  async saveHotels(tripId, tourItemId) {
    try {
      // Validate inputs
      if (!tripId) {
        alert("Invalid trip ID. Please refresh the page and try again.");
        return;
      }
      
      if (!tourItemId) {
        alert("Invalid tour item ID. Please refresh the page and try again.");
        return;
      }
      
      const form = document.getElementById("editHotelsForm");
      if (!form) {
        alert("Form not found. Please refresh the page and try again.");
        return;
      }
      
      const hotelForms = form.querySelectorAll(".hotel-edit-form");
      
      const hotels = [];
      hotelForms.forEach(hotelForm => {
        const day = parseInt(hotelForm.dataset.day);
        
        // Get hotel name from hidden input (populated by dropdown selection)
        const hotelNameInput = hotelForm.querySelector(".hotel-name");
        const hotelDropdown = hotelForm.querySelector(".hotel-dropdown");
        let hotelName = hotelNameInput ? hotelNameInput.value.trim() : '';
        
        // Fallback: if hidden input is empty, try to get from dropdown selected option
        if (!hotelName && hotelDropdown) {
          const selectedOption = hotelDropdown.options[hotelDropdown.selectedIndex];
          if (selectedOption && selectedOption.dataset.hotelName) {
            hotelName = selectedOption.dataset.hotelName;
          } else if (selectedOption) {
            hotelName = selectedOption.textContent.replace(' (Current)', '').trim();
          }
        }
        
        // Get room type from dropdown
        const roomTypeDropdown = hotelForm.querySelector(".hotel-room-type-dropdown");
        const roomType = roomTypeDropdown ? roomTypeDropdown.value.replace(' (Current)', '').trim() : '';
        
        // Get city (read-only, from input)
        const city = hotelForm.querySelector(".hotel-city").value.trim();
        const note = hotelForm.querySelector(".hotel-note").value.trim();

        if (!hotelName) {
          throw new Error(`Hotel name is required for Night ${day}`);
        }

        hotels.push({
          day,
          hotel_name: hotelName,
          room_type: roomType || undefined,
          city: city || undefined,
          replacement_note: note || undefined,
        });
      });

      // Show loading state
      const saveBtn = document.getElementById("saveHotelsBtn");
      const originalText = saveBtn.innerHTML;
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';

      // Save hotels (transfer_in/out are auto-derived from trip transfers, not sent)
      await TourHotelsAPI.updateTourHotels(tripId, tourItemId, hotels);

      // Success
      APIUtils.showSuccess("Tour hotels updated successfully");
      
      // Restore button state BEFORE closing modal (so it works on next open)
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa fa-save"></i> Save Changes';
      
      // Close modal
      $("#editTourHotelsModal").modal("hide");
      
      // Refresh display - maintain current context
      const tourItem = { id: tourItemId };
      const userRole = localStorage.getItem("role");
      const isAdmin = userRole === "admin" || userRole === "superadmin";
      const isBooking = form.dataset.isBooking === "true";
      await this.displayTourHotels(tripId, tourItem, isAdmin, isBooking);

    } catch (error) {
      console.error("Error saving hotels:", error);
      APIUtils.showError(error.message || "Failed to save hotels");
      
      // Restore button
      const saveBtn = document.getElementById("saveHotelsBtn");
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fa fa-save"></i> Save Changes';
    }
  },

  /**
   * Revert hotels to tour defaults
   * @param {number} tripId - Trip ID
   * @param {number} tourItemId - Tour item ID
   */
  async revertToDefaults(tripId, tourItemId) {
    if (!confirm("Are you sure you want to revert to the tour's default hotels? This will remove any custom changes.")) {
      return;
    }

    try {
      // Show loading state
      const revertBtn = document.getElementById("revertToDefaultsBtn");
      const originalText = revertBtn.innerHTML;
      revertBtn.disabled = true;
      revertBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Reverting...';

      // Revert to defaults
      await TourHotelsAPI.revertToDefaults(tripId, tourItemId);

      // Success
      APIUtils.showSuccess("Reverted to tour default hotels");
      
      // Restore button state BEFORE closing modal (so it works on next open)
      revertBtn.disabled = false;
      revertBtn.innerHTML = '<i class="fa fa-undo"></i> Revert to Tour Defaults';
      
      // Close modal
      $("#editTourHotelsModal").modal("hide");
      
      // Refresh display - maintain current context
      const tourItem = { id: tourItemId };
      const userRole = localStorage.getItem("role");
      const isAdmin = userRole === "admin" || userRole === "superadmin";
      const form = document.getElementById("editHotelsForm");
      const isBooking = form ? form.dataset.isBooking === "true" : false;
      await this.displayTourHotels(tripId, tourItem, isAdmin, isBooking);

    } catch (error) {
      console.error("Error reverting hotels:", error);
      APIUtils.showError("Failed to revert to default hotels");
      
      // Restore button
      const revertBtn = document.getElementById("revertToDefaultsBtn");
      revertBtn.disabled = false;
      revertBtn.innerHTML = '<i class="fa fa-undo"></i> Revert to Tour Defaults';
    }
  },
};

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = TourHotelsUI;
}

