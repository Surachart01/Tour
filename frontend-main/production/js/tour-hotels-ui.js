/**
 * Tour Hotels UI Component
 * Displays and manages tour hotel information in trip/booking views
 */

const TourHotelsUI = {
  // Store fetched hotel data for room type population
  hotelDataCache: {},

  ensureDisplayStyles() {
    if (document.getElementById("tourHotelsDisplayStyles")) return;
    const style = document.createElement("style");
    style.id = "tourHotelsDisplayStyles";
    style.textContent = `
      .tour-hotels-row > td {
        padding: 0 !important;
        background: #f8fafc;
        border-top: 0 !important;
      }
      .tour-hotels-container {
        width: 100%;
        padding: 20px 24px 22px;
        background: #f8fafc;
        border-left: 4px solid #1a9fd1;
      }
      .tour-hotels-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      .tour-hotels-title {
        margin: 0;
        color: #24384a;
        font-size: 16px;
        font-weight: 700;
        white-space: nowrap;
      }
      .tour-hotels-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        width: min(100%, 980px);
        margin: 0 auto;
      }
      .tour-hotels-panel {
        min-width: 0;
      }
      .tour-hotels-list {
        display: grid;
        gap: 10px;
      }
      .tour-hotel-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
        padding: 11px 14px;
        background: #ffffff;
        border: 1px solid #d9e3ec;
        border-radius: 8px;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
      }
      .tour-hotel-email-btn {
        min-width: 82px;
        flex-shrink: 0;
        white-space: nowrap;
      }
      .tour-hotel-content {
        min-width: 0;
        flex: 1;
      }
      .tour-hotel-main {
        color: #26384a;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.35;
        overflow-wrap: anywhere;
      }
      .tour-hotel-details {
        margin-top: 3px;
        color: #64748b;
        font-size: 11px;
        line-height: 1.3;
        overflow-wrap: anywhere;
      }
      .tour-transfer-box {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        padding: 12px 14px;
        border-radius: 8px;
        line-height: 1.35;
      }
      .tour-transfer-box.in {
        background: #e8f6fb;
        border: 1px solid #b8dfec;
      }
      .tour-transfer-box.out {
        background: #fff8e8;
        border: 1px solid #f4d38a;
      }
      .tour-transfer-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        font-size: 16px;
      }
      .tour-transfer-box.in .tour-transfer-icon,
      .tour-transfer-box.in .tour-transfer-label {
        color: #08738d;
      }
      .tour-transfer-box.out .tour-transfer-icon,
      .tour-transfer-box.out .tour-transfer-label {
        color: #a35a00;
      }
      .tour-transfer-label {
        display: block;
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 4px;
      }
      .tour-transfer-text {
        color: #334155;
        font-size: 12px;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .tour-empty-note {
        margin: 0;
        padding: 12px;
        color: #64748b;
        background: #ffffff;
        border: 1px dashed #cbd5e1;
        border-radius: 6px;
      }
      @media (max-width: 640px) {
        .tour-hotels-container {
          padding: 14px;
        }
        .tour-hotels-header,
        .tour-hotel-item {
          align-items: stretch;
          flex-direction: column;
        }
        .tour-hotels-title {
          white-space: normal;
        }
        .tour-hotel-email-btn {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  },

  normalizeDisplayDate(value) {
    if (!value) return "";
    const text = String(value).trim();
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
    return text;
  },

  buildTourTransferText(tourItem, direction = "in") {
    if (!tourItem) return "";
    const isOut = direction === "out";
    const time = isOut
      ? (tourItem.departure_time || tourItem.departureTime || tourItem.departureTimeTour)
      : (tourItem.arrival_time || tourItem.arrivalTime || tourItem.arrivalTimeTour);
    const transport = isOut
      ? (tourItem.flight_out || tourItem.tourFlightOut || tourItem.transport_out)
      : (tourItem.mode_of_transport || tourItem.flight_in || tourItem.tourFlightIn || tourItem.flight_number);
    const parts = [];

    if (transport) parts.push(transport);
    if (time) parts.push(time);

    return parts.join(" | ");
  },

  isTransferTextIncomplete(value) {
    const text = String(value || "");
    if (!text) return true;
    const hasTime = /\b(?:Pickup|Departure):/i.test(text) || /\b\d{1,2}:\d{2}(?:\s*[AP]M)?\b/i.test(text);
    const hasTransport = text.split("|").some((part) => {
      const clean = part.trim();
      if (!clean) return false;
      if (/^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}$/.test(clean)) return false;
      if (/^\d{1,2}:\d{2}(?:\s*[AP]M)?$/i.test(clean)) return false;
      if (/^(?:Pickup|Departure):/i.test(clean)) return false;
      if (/^\(.+\)$/.test(clean)) return false;
      return true;
    });
    return !hasTime || !hasTransport;
  },

  pickTourTransferText(currentText, builtText, tourItem, direction = "in") {
    return builtText || "";
  },

  parseTourDisplayDate(value) {
    if (!value) return null;
    if (value instanceof Date && !isNaN(value.getTime())) {
      return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    }

    const text = String(value).trim().split("T")[0];
    let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match) {
      return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    }

    match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) {
      return new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
    }

    return null;
  },

  formatTourStayDate(date) {
    return [
      String(date.getUTCDate()).padStart(2, "0"),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      date.getUTCFullYear(),
    ].join("-");
  },

  getTourRowStartDate(tourRow, tourItem) {
    const firstCell = tourRow?.cells?.[0];
    const dateInput = firstCell?.querySelector?.("input[type='date']");
    return (
      dateInput?.value ||
      firstCell?.dataset?.date ||
      tourRow?.dataset?.tourStartDate ||
      tourItem?.from_date ||
      tourItem?.tourStartDate ||
      tourItem?.tour_start_date ||
      firstCell?.textContent?.trim() ||
      ""
    );
  },

  alignHotelStayDatesWithTourRow(hotelData, tourItem, tourRow) {
    const startDate = this.parseTourDisplayDate(this.getTourRowStartDate(tourRow, tourItem));
    if (!startDate || !Array.isArray(hotelData.hotels)) {
      return hotelData;
    }

    return {
      ...hotelData,
      hotels: hotelData.hotels.map((hotel, index) => {
        const dayNumber = Number.parseInt(hotel.day, 10) || index + 1;
        const checkIn = new Date(startDate);
        checkIn.setUTCDate(startDate.getUTCDate() + Math.max(dayNumber - 1, 0));
        const checkOut = new Date(checkIn);
        checkOut.setUTCDate(checkIn.getUTCDate() + 1);

        return {
          ...hotel,
          check_in_date: this.formatTourStayDate(checkIn),
          check_out_date: this.formatTourStayDate(checkOut),
        };
      }),
    };
  },

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
      const tourRow = this.findTourRow(tourItem.id);
      if (!tourRow) {
        return;
      }

      const builtTransferIn = this.buildTourTransferText(tourItem, "in");
      const builtTransferOut = this.buildTourTransferText(tourItem, "out");
      const displayHotelData = this.alignHotelStayDatesWithTourRow({
        ...hotelData,
        transfer_in: this.pickTourTransferText(hotelData.transfer_in, builtTransferIn, tourItem, "in"),
        transfer_out: this.pickTourTransferText(hotelData.transfer_out, builtTransferOut, tourItem, "out"),
      }, tourItem, tourRow);

      // Create hotels display element
      const hotelsDisplay = this.createHotelsDisplay(displayHotelData, isAdmin, isBooking, tripId, tourItem.id);
      
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
    this.ensureDisplayStyles();
    const container = document.createElement("div");
    container.className = "tour-hotels-container";

    // Header with badge
    const header = document.createElement("div");
    header.className = "tour-hotels-header";
    
    const title = document.createElement("h5");
    title.className = "tour-hotels-title";
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

    const layout = document.createElement("div");
    layout.className = "tour-hotels-layout";

    const hotelsPanel = document.createElement("div");
    hotelsPanel.className = "tour-hotels-panel";

    // Hotels list
    if (hotelData.hotels && hotelData.hotels.length > 0) {
      const hotelsList = document.createElement("div");
      hotelsList.className = "tour-hotels-list";
      
      hotelData.hotels.forEach(hotel => {
        const hotelItem = this.createHotelItem(hotel, isAdmin, isBooking);
        hotelsList.appendChild(hotelItem);
      });
      
      hotelsPanel.appendChild(hotelsList);
    } else {
      const noHotels = document.createElement("p");
      noHotels.className = "tour-empty-note";
      noHotels.textContent = "No accommodation information available for this tour.";
      hotelsPanel.appendChild(noHotels);
    }

    const transferInBox = document.createElement("div");
    transferInBox.className = "tour-transfer-box in";
    transferInBox.innerHTML = `
      <span class="tour-transfer-icon"><i class="fa fa-arrow-circle-down"></i></span>
      <div>
        <strong class="tour-transfer-label">Transfer In</strong>
        <div class="tour-transfer-text">${hotelData.transfer_in || '<span style="color:#999; font-style:italic;">— Not specified —</span>'}</div>
      </div>
    `;
    const transferOutBox = document.createElement("div");
    transferOutBox.className = "tour-transfer-box out";
    transferOutBox.innerHTML = `
      <span class="tour-transfer-icon"><i class="fa fa-arrow-circle-up"></i></span>
      <div>
        <strong class="tour-transfer-label">Transfer Out</strong>
        <div class="tour-transfer-text">${hotelData.transfer_out || '<span style="color:#999; font-style:italic;">— Not specified —</span>'}</div>
      </div>
    `;
    layout.appendChild(transferInBox);
    layout.appendChild(hotelsPanel);
    layout.appendChild(transferOutBox);
    container.appendChild(layout);

    return container;
  },

  /**
   * Create a single hotel item display
   * @param {Object} hotel - Hotel object
   * @param {boolean} isAdmin - Whether current user is admin
   * @param {boolean} isBooking - Whether this is a booking
   * @returns {HTMLElement} Hotel item element
   */
  createHotelItem(hotel, isAdmin = false, isBooking = false) {
    const item = document.createElement("div");
    item.className = "tour-hotel-item";

    const content = document.createElement("div");
    content.className = "tour-hotel-content";
    
    // Hotel name with dates
    const mainInfo = document.createElement("div");
    mainInfo.className = "tour-hotel-main";
    
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
    if (hotel.room_type) details.push(`Room Type: ${hotel.room_type}`);
    if (hotel.city) details.push(`City: ${hotel.city}`);
    
    if (details.length > 0) {
      const detailsDiv = document.createElement("div");
      detailsDiv.className = "tour-hotel-details";
      detailsDiv.textContent = details.join(" • ");
      content.appendChild(detailsDiv);
    }

    if (hotel.replacement_note) {
      const noteDiv = document.createElement("div");
      noteDiv.className = "alert alert-info";
      noteDiv.style.cssText = "margin-top: 8px; margin-bottom: 0; padding: 8px; font-size: 0.9em;";
      noteDiv.innerHTML = `<i class="fa fa-info-circle"></i> <strong>Note:</strong> ${hotel.replacement_note}`;
      content.appendChild(noteDiv);
    }

    item.appendChild(content);

    // Supplier email is available only to admins after conversion to booking.
    if (isAdmin && isBooking) {
      const emailBtn = document.createElement("button");
      emailBtn.type = "button";
      emailBtn.className = "btn btn-sm btn-outline-primary tour-hotel-email-btn";
      emailBtn.innerHTML = '<i class="fa fa-envelope"></i> EMAIL';
      emailBtn.onclick = () => this.openHotelEmailModal(hotel);
      item.appendChild(emailBtn);
    }

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

  buildTourItemFromRow(row) {
    if (!row) return null;
    const cells = row.cells || [];
    const getDateFromCell = (cell) => {
      const input = cell?.querySelector?.("input[type='date']");
      return input?.value || cell?.dataset?.date || cell?.textContent?.trim() || "";
    };

    return {
      id: row.dataset.tourItemId,
      tour_id: row.dataset.tourId,
      from_date: getDateFromCell(cells[0]) || row.dataset.tourStartDate || "",
      to_date: getDateFromCell(cells[1]) || row.dataset.tourEndDate || "",
      tourStartDate: row.dataset.tourStartDate || getDateFromCell(cells[0]) || "",
      tourEndDate: row.dataset.tourEndDate || getDateFromCell(cells[1]) || "",
      arrival_time: row.dataset.arrivalTime || "",
      departure_time: row.dataset.departureTime || "",
      flight_in: row.dataset.flightIn || "",
      flight_out: row.dataset.flightOut || "",
      route: cells[5]?.textContent?.trim() || "",
    };
  },

  async refreshTourHotelsForRow(row, tripId, isAdmin = false, isBooking = false) {
    const tourItem = this.buildTourItemFromRow(row);
    if (!tourItem?.id || !tripId) return;
    await this.displayTourHotels(tripId, tourItem, isAdmin, isBooking);
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

  async fetchHotelDetails(hotelId) {
    if (!hotelId || String(hotelId).startsWith("custom_")) return null;
    if (this.hotelDataCache[hotelId]?.room_types?.length) {
      return this.hotelDataCache[hotelId];
    }

    try {
      const response = await fetch(`${Endpoint}/api/v1/hotels/${hotelId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch hotel details");
      }

      const hotel = await response.json();
      this.hotelDataCache[hotelId] = {
        name: hotel.name || hotel.hotel_name,
        room_types: hotel.room_types || [],
        promotions: hotel.promotions || [],
      };
      return this.hotelDataCache[hotelId];
    } catch (error) {
      console.error("Error fetching hotel details:", error);
      return null;
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
  async onHotelChange(hotelDropdown, isInitialLoad = false) {
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

    if (roomTypes.length === 0 && hotelId) {
      roomTypeDropdown.innerHTML = '<option value="">Loading room types...</option>';
      const hotelDetails = await this.fetchHotelDetails(hotelId);
      roomTypes = hotelDetails?.room_types || [];
      if (selectedOption && roomTypes.length > 0) {
        selectedOption.setAttribute("data-roomtypes", JSON.stringify(roomTypes));
      }
      roomTypeDropdown.innerHTML = '<option value="">Select Room Type</option>';
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

      if (!isInitialLoad && roomTypes.length === 1) {
        roomTypeDropdown.selectedIndex = 1;
        selectedFound = true;
      }

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
    } else {
      roomTypeDropdown.innerHTML = '<option value="">No room types available</option>';
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
    
    hotelDropdown.addEventListener('change', async () => {
      // Update hidden hotel name input
      const selectedOption = hotelDropdown.options[hotelDropdown.selectedIndex];
      if (selectedOption && selectedOption.dataset.hotelName) {
        hotelNameInput.value = selectedOption.dataset.hotelName;
      } else if (hotelDropdown.value) {
        hotelNameInput.value = selectedOption.textContent.replace(' (Current)', '');
      }
      
      // Populate room types
      await this.onHotelChange(hotelDropdown);
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

  /**
   * Open email modal for sending hotel reservation request
   */
  openHotelEmailModal(hotel) {
    // Create modal if not exists
    let modal = document.getElementById("tourHotelEmailModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal fade";
      modal.id = "tourHotelEmailModal";
      modal.setAttribute("tabindex", "-1");
      modal.innerHTML = `
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header" style="background:linear-gradient(135deg,#2c3e50,#3498db);color:white;">
              <h5 class="modal-title"><i class="fa fa-envelope"></i> Hotel Reservation Request</h5>
              <button type="button" class="close" data-dismiss="modal" style="color:white;"><span>&times;</span></button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label><strong>To (Hotel Email)</strong></label>
                <input type="email" class="form-control" id="hotelEmailTo" placeholder="hotel@email.com">
              </div>
              <div class="form-group">
                <label>Subject</label>
                <input type="text" class="form-control" id="hotelEmailSubject">
              </div>
              <div class="form-group">
                <label>Message</label>
                <textarea class="form-control" id="hotelEmailBody" rows="10" style="font-family:monospace;font-size:13px;"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-primary" id="sendHotelEmailBtn"><i class="fa fa-send"></i> Send Email</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    // Pre-fill fields
    const dateRange = hotel.check_in_date && hotel.check_out_date
      ? `${hotel.check_in_date} to ${hotel.check_out_date}` : `Night ${hotel.day}`;
    document.getElementById("hotelEmailTo").value = "";
    document.getElementById("hotelEmailSubject").value = `Reservation Request – ${hotel.hotel_name} (${dateRange})`;
    document.getElementById("hotelEmailBody").value =
`Dear ${hotel.hotel_name} Reservations Team,

We would like to request a room reservation for our client as follows:

Hotel: ${hotel.hotel_name}
City: ${hotel.city || ""}
Check-In: ${hotel.check_in_date || ""}
Check-Out: ${hotel.check_out_date || ""}
Room Type: ${hotel.room_type || ""}

Kindly confirm availability and provide your best available rate.

Thank you,
VeraThailandia Travel Co., Ltd.
info@verathailandia.com | +66 123 456 789`;

    // Wire send button
    const sendBtn = document.getElementById("sendHotelEmailBtn");
    sendBtn.onclick = async () => {
      const to = document.getElementById("hotelEmailTo").value.trim();
      const subject = document.getElementById("hotelEmailSubject").value.trim();
      const body = document.getElementById("hotelEmailBody").value.trim();
      if (!to) { alert("Please enter the hotel email address."); return; }
      sendBtn.disabled = true;
      sendBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';
      try {
        const res = await fetch(`${Endpoint}/api/v1/email/send-generic`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to, subject, body })
        });
        if (!res.ok) throw new Error(await res.text());
        alert("Email sent successfully!");
        $("#tourHotelEmailModal").modal("hide");
      } catch (e) {
        alert("Failed to send email: " + e.message);
      } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fa fa-send"></i> Send Email';
      }
    };

    $("#tourHotelEmailModal").modal("show");
  },
};

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = TourHotelsUI;
}
