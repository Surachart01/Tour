// Event listener for the "Add Transfer" button
document.getElementById("addTransferBtn").addEventListener("click", function() {
  document.getElementById("transferForm").reset();
  const tripStartDateInput = document.getElementById("tripStartDate");
  const transferDateInput = document.getElementById("transferDate");

  if (tripStartDateInput.value) {
    transferDateInput.min = tripStartDateInput.value; // ✅ Set min date
    transferDateInput.value = tripStartDateInput.value; // ✅ Default to Trip Start Date
  }

  $("#addTransferModal").modal("show"); // Show the transfer modal
});

document.getElementById("transferDate").addEventListener("change", function () {
  const tripStartDate = document.getElementById("tripStartDate").value;

  if (new Date(this.value) < new Date(tripStartDate)) {
    alert("Transfer Date cannot be before Trip Start Date.");
    this.value = tripStartDate; // Reset to valid date
  }
});

document.getElementById("tripStartDate").addEventListener("change", function () {
  const transferDateInput = document.getElementById("transferDate");

  if (this.value) {
    transferDateInput.min = this.value;

    // If the selected transfer date is before the new Trip Start Date, reset it
    if (new Date(transferDateInput.value) < new Date(this.value)) {
      transferDateInput.value = this.value;
    }
  }
});

// Function to check if all required fields are filled and call price calculation
function checkAndCalculateTransferPrice() {
  const transferCity = document.getElementById("transferCity").value;
  const transferType = document.getElementById("transferType").value;
  const transferDate = document.getElementById("transferDate").value;
  const transferToT = document.getElementById("transferToT").value;

  if (transferCity && transferDate && transferToT) {
    console.log("✅ All required fields are filled, calculating price...");
    calculateTransferPrice();
  }
}

// Event listeners for relevant fields
document.getElementById("transferCity").addEventListener("change", checkAndCalculateTransferPrice);
document.getElementById("transferType").addEventListener("change", function () {
  const selectedOption = this.options[this.selectedIndex];
  if (selectedOption && this.value !== "") {
    const text = selectedOption.textContent.trim();
    if (text.includes("-")) {
      const parts = text.split("-");
      if (parts.length === 2) {
        const fromVal = parts[0].trim();
        const toVal = parts[1].trim();
        const transferFromInput = document.getElementById("transferFrom");
        const transferToInput = document.getElementById("transferTo");
        if (transferFromInput) transferFromInput.value = fromVal;
        if (transferToInput) transferToInput.value = toVal;
      }
    }
  }
  checkAndCalculateTransferPrice();
});
document.getElementById("transferDate").addEventListener("change", checkAndCalculateTransferPrice);
document.getElementById("transferToT").addEventListener("change", checkAndCalculateTransferPrice);

// Function to calculate transfer price
function calculateTransferPrice() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  const agentName = document.getElementById("agentName").textContent;
  const transferCity = document.getElementById("transferCity").value;
  const transferType = document.getElementById("transferType").value;
  const transferToT = document.getElementById("transferToT").value;
  const numberOfAdults = parseInt(document.getElementById("adult").value, 10) || 0;
  const numberOfKids = parseInt(document.getElementById("child").value, 10) || 0;
  const travelDate = document.getElementById("transferDate").value;
  const pickupTime = document.getElementById("transferPickupTime").value.trim();

  const requestData = {
    agent_name: agentName,
    city: transferCity,
    transfer_id: parseInt(transferType, 10),
    tot: transferToT,
    number_of_kids: numberOfKids,
    number_of_adults: numberOfAdults,
    travel_date: travelDate,
    pickup_time: pickupTime || null,
  };

  fetch(`${Endpoint}/api/v1/transfers/calculate-cost`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  })
  .then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
    return response.json();
  })
  .then((data) => {
    if (data.final_cost) {
      document.getElementById("updatedTransferPrice").value = `${data.final_cost}`;
    } else {
      throw new Error("Failed to retrieve the price. Please try again.");
    }
  })
  .catch((error) => {
    console.error("Error fetching transfer price:", error);
    alert(`Error: ${error.message}`);
    document.getElementById("updatedTransferPrice").value = 0;
  });
}


// Function to format date as DDMMYYYY
function formatToDDMMYYYY(dateString) {
  const ddmmyyyyRegex = /^\d{2}-\d{2}-\d{4}$/;
  if (ddmmyyyyRegex.test(dateString)) {
    return dateString; // Return as-is if already in dd-mm-yyyy format
  }

  const dateParts = dateString.split("-");
  if (dateParts.length === 3) {
    const [year, month, day] = dateParts;
    return `${day}-${month}-${year}`;
  }
  return null;
}

function formatToYYYYMMDD(dateString) {
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

let transfersArray = []; // Array to store transfer data
let editingTransferRow = null; // Keep track of the row being edited
let isEditingTransfer = false; // Flag to prevent conflicts with auto-selection

// Save Transfer Functionality
document.getElementById("saveTransfer").addEventListener("click", function (event) {
  event.preventDefault();

  const transferDropdown = document.querySelector(".transfer-dropdown");

  // Get input values from the modal
  const transferCity = document.getElementById("transferCity").value;
  const transferType = transferDropdown.options[transferDropdown.selectedIndex].textContent;
  const transferDate = formatToDDMMYYYY(document.getElementById("transferDate").value);
  const transferFrom = document.getElementById("transferFrom").value;
  const transferTo = document.getElementById("transferTo").value;
  const transferToT = document.getElementById("transferToT").value;
  const transferPickupTime = document.getElementById("transferPickupTime").value;
  const flightTime = document.getElementById("flightTime").value || "";
  const transferFlight = document.getElementById("transferFlight").value || "";
  const remarks = document.getElementById("remarks").value;
  const transferPrice = document.getElementById("updatedTransferPrice").value || "N/A";

  if (!transferCity || !transferDate || !transferFrom || !transferTo) {
    alert("Please fill in all required fields.");
    return;
  }

  // ✅ Ensure `transferId` is properly assigned
  const transferId = document.getElementById("transferType").value; // Assign the selected transfer ID

  const newTransfer = {
    transferId, // ✅ Ensure ID is included
    transferCity,
    transferType,
    transferDate,
    transferFrom,
    transferTo,
    transferToT,
    transferPickupTime,
    flightTime,
    transferFlight,
    remarks,
    price: transferPrice,
  };

  if (editingTransferRow) {
    updateTransferRow(editingTransferRow, newTransfer);
    const rowIndex = editingTransferRow.rowIndex - 1;
    transfersArray[rowIndex] = newTransfer;
    editingTransferRow = null;
  } else {
    transfersArray.push(newTransfer);
    addTransferRow(newTransfer);
  }

  document.getElementById("transferForm").reset();
  $("#addTransferModal").modal("hide");
});


// Add a new row to the table
function addTransferRow(transfer) {
  const newRow = document.createElement("tr");

  // Store transferId, flightTime, and transferFlight in dataset
  newRow.dataset.transferId = transfer.transferId || "";
  newRow.dataset.flightTime = transfer.flightTime || "";
  newRow.dataset.transferFlight = transfer.transferFlight || "";
  newRow.dataset.transferDate = formatToYYYYMMDD(transfer.transferDate) || "";

  let displayPickupTime = formatTimeToHHMM(transfer.transferPickupTime || transfer.flightTime || "");
  if (!displayPickupTime && transfer.transferFlight && typeof flightsArray !== "undefined") {
    const matchingFlight = flightsArray.find(
      (f) => (f.flight_number || f.number || "").trim().toLowerCase() === (transfer.transferFlight || "").trim().toLowerCase()
    );
    if (matchingFlight) {
      displayPickupTime = formatTimeToHHMM(matchingFlight.eat || matchingFlight.arrival_time || "");
    }
  }
  newRow.dataset.pickupTime = displayPickupTime;

  newRow.innerHTML = `
    <td>${transfer.transferDate}<br>${transfer.transferFlight || ""}</td>
    <td>${transfer.transferCity}</td>
    <td>${transfer.transferType}</td>
    <td>${transfer.transferToT || ""}</td>
    <td>${transfer.transferFrom}</td>
    <td>${transfer.transferTo}</td>
    <td>${transfer.remarks || ""}</td>
    <td class="transfer-price">${transfer.price ? `${transfer.price}` : "N/A"}</td>
    <td>
      <button class="btn btn-sm btn-primary editBtn" type="button" style="margin-right: 5px;" data-toggle="tooltip" data-placement="top" title="Edit">
        <i class="fas fa-edit"></i>
      </button>
      <button class="btn btn-sm btn-danger deleteBtn" type="button" data-toggle="tooltip" data-placement="top" title="Delete">
        <i class="fas fa-trash"></i>
      </button>
    </td>
  `;

  document.getElementById("transferTableBody").appendChild(newRow);
  
  // Initialize tooltips for the new row
  $(newRow).find('[data-toggle="tooltip"]').tooltip();
}

// Update an existing row in the table
function updateTransferRow(row, transfer) {
  row.cells[0].innerHTML = `${transfer.transferDate}<br>${transfer.transferFlight || ""}`;
  row.cells[1].textContent = transfer.transferCity;
  row.cells[2].textContent = transfer.transferType;
  row.cells[3].textContent = transfer.transferToT || "";
  row.cells[4].textContent = transfer.transferFrom;
  row.cells[5].textContent = transfer.transferTo;
  row.cells[6].textContent = transfer.remarks || "";
  row.cells[7].textContent = transfer.price ? `${transfer.price}` : "N/A";

  let displayPickupTime = formatTimeToHHMM(transfer.transferPickupTime || transfer.flightTime || "");
  if (!displayPickupTime && transfer.transferFlight && typeof flightsArray !== "undefined") {
    const matchingFlight = flightsArray.find(
      (f) => (f.flight_number || f.number || "").trim().toLowerCase() === (transfer.transferFlight || "").trim().toLowerCase()
    );
    if (matchingFlight) {
      displayPickupTime = formatTimeToHHMM(matchingFlight.eat || matchingFlight.arrival_time || "");
    }
  }

  //Ensure `transferId`, `flightTime`, and `transferFlight` stay in dataset
  row.dataset.transferId = transfer.transferId;
  row.dataset.flightTime = transfer.flightTime || "";
  row.dataset.transferFlight = transfer.transferFlight || "";
  row.dataset.pickupTime = displayPickupTime;
  row.dataset.transferDate = formatToYYYYMMDD(transfer.transferDate) || "";
}

// Handle edit and delete button clicks
document.getElementById("transferTableBody").addEventListener("click", function (event) {
  const row = event.target.closest("tr");
  if (!row) return;

  // ✅ Block package items delete only, allow edit
  if (row.dataset.isPackageItem === "true" && (event.target.classList.contains("deleteBtn") || event.target.closest(".deleteBtn"))) {
    return;
  }

  if (event.target.classList.contains("editBtn") || event.target.closest(".editBtn")) {
    const transferId = row.dataset.transferId; // ✅ Retrieve ID from dataset
    console.log("Editing Transfer ID:", transferId);

    if (!transferId) {
      console.error("Error: Transfer ID not found in dataset.");
      return;
    }

    const rowData = transfersArray.find(t => t.transferId == transferId);

    if (!rowData) {
      console.error("Error: No transfer found in array for ID:", transferId);
      return;
    }

    console.log("Editing Transfer Data:", rowData);
    console.log("Transfer City to edit:", rowData.transferCity);

    // Set editing flag to prevent auto-Thailand selection
    isEditingTransfer = true;

    // Set other fields immediately (non-location fields)
    document.getElementById("transferDate").value = formatToYYYYMMDD(rowData.transferDate);
    document.getElementById("transferFrom").value = rowData.transferFrom;
    document.getElementById("transferTo").value = rowData.transferTo;
    document.getElementById("transferToT").value = rowData.transferToT;
    document.getElementById("transferPickupTime").value = formatTimeToHHMM(rowData.transferPickupTime);
    document.getElementById("flightTime").value = formatTimeToHHMM(row.dataset.flightTime);

    const transferFlightSelect = document.getElementById("transferFlight");
    if (transferFlightSelect && typeof transferFlightSelect.refreshOptions === "function") {
      transferFlightSelect.refreshOptions(row.dataset.transferFlight);
    } else if (transferFlightSelect) {
      transferFlightSelect.value = row.dataset.transferFlight || "";
    }

    // Fallback: If flight time or pickup time are empty, try to populate them from the selected flight details
    if (transferFlightSelect && transferFlightSelect.value !== "") {
      const selectedFlightOption = transferFlightSelect.options[transferFlightSelect.selectedIndex];
      if (selectedFlightOption) {
        const departure = selectedFlightOption.dataset.departure;
        const arrival = selectedFlightOption.dataset.arrival;

        if (departure && !document.getElementById("flightTime").value) {
          document.getElementById("flightTime").value = formatTimeToHHMM(departure);
        }
        if (arrival && !document.getElementById("transferPickupTime").value) {
          document.getElementById("transferPickupTime").value = formatTimeToHHMM(arrival);
        }
      }
    }

    document.getElementById("remarks").value = rowData.remarks;
    document.getElementById("updatedTransferPrice").value = rowData.price || "N/A";

    editingTransferRow = row;

    const isPackageItem = row.dataset.isPackageItem === "true";
    if (isPackageItem) {
      const totSelect = document.getElementById("transferToT");
      if (totSelect) totSelect.value = "SIC";
    }
    setTimeout(() => {
      if (typeof window.toggleModalFieldsForPackage === "function") {
        window.toggleModalFieldsForPackage("#addTransferModal", isPackageItem, ["#transferDate"]);
      }
    }, 300);

    // Show modal first, then handle location setup
    $("#addTransferModal").modal("show");

    // Wait for modal to be fully shown, then set up location fields
    $("#addTransferModal").one("shown.bs.modal", function() {
      console.log("Modal shown, setting up location fields for edit");
      
      // Clear any existing selections first
      const countryDropdown = document.getElementById("transferCountry");
      const cityDropdown = document.getElementById("transferCity");
      
      if (countryDropdown) countryDropdown.value = "";
      if (cityDropdown) cityDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';

      // Now set up the location fields with proper coordination
      if (typeof LocationCache !== 'undefined' && rowData.transferCity) {
        console.log("LocationCache is available, finding country for city:", rowData.transferCity);
        
        LocationCache.findCountryForCity(rowData.transferCity).then(countryCode => {
          console.log("findCountryForCity result:", countryCode);
          
          if (countryCode && countryDropdown) {
            console.log(`Found country ${countryCode} for city ${rowData.transferCity}`);
            console.log("Setting country dropdown to:", countryCode);
            
            // Set country first
            countryDropdown.value = countryCode;
            
            // Load cities for this country
            console.log("Calling populateCitiesDropdown for country:", countryCode);
            LocationCache.populateCitiesDropdown(countryCode, "transferCity").then(() => {
              console.log("Cities populated successfully, now setting city to:", rowData.transferCity);
              
              // Use requestAnimationFrame for better timing instead of setTimeout
              requestAnimationFrame(() => {
                const cityDropdown = document.getElementById("transferCity");
                console.log("City dropdown element:", cityDropdown);
                
                if (cityDropdown) {
                  console.log("Available city options:", Array.from(cityDropdown.options).map(opt => opt.value));
                  
                  // Set the city value
                  cityDropdown.value = rowData.transferCity;
                  console.log("Set city dropdown value to:", cityDropdown.value);
                  
                  // Verify the selection worked
                  if (cityDropdown.value === rowData.transferCity) {
                    console.log("✅ City selection successful!");
                  } else {
                    console.warn("❌ City selection failed, trying alternative approach");
                    
                    // Try to find the option by text content
                    const options = Array.from(cityDropdown.options);
                    const matchingOption = options.find(opt => 
                      opt.textContent.toLowerCase() === rowData.transferCity.toLowerCase() ||
                      opt.value.toLowerCase() === rowData.transferCity.toLowerCase()
                    );
                    
                    if (matchingOption) {
                      matchingOption.selected = true;
                      console.log("✅ City selection successful via text matching!");
                    } else {
                      console.error("❌ Could not find matching city option");
                    }
                  }
                  
                  // Trigger change event to load transfers
                  cityDropdown.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  // Set transfer type after a short delay to allow transfers to load
                  setTimeout(() => {
                    const transferDropdown = document.getElementById("transferType");
                    console.log("Setting transfer type dropdown to:", transferId);
                    
                    if (transferDropdown) {
                      console.log("Available transfer options:", Array.from(transferDropdown.options).map(opt => `${opt.value}: ${opt.textContent}`));
                      
                      for (let option of transferDropdown.options) {
                        if (option.value == transferId) {
                          option.selected = true;
                          console.log("Selected transfer type:", option.textContent);
                          break;
                        }
                      }
                      
                      // If not found, try again after a bit more time
                      if (!transferDropdown.value) {
                        console.warn("Transfer not found, trying again in 500ms");
                        setTimeout(() => {
                          for (let option of transferDropdown.options) {
                            if (option.value == transferId) {
                              option.selected = true;
                              console.log("Selected transfer type (retry):", option.textContent);
                              break;
                            }
                          }
                        }, 500);
                      }
                    }
                    
                    // Clear editing flag
                    isEditingTransfer = false;
                  }, 300);
                }
              });
            }).catch(error => {
              console.error("Error populating cities:", error);
              // Fallback: set city directly
              if (cityDropdown) {
                cityDropdown.innerHTML = `<option value="${rowData.transferCity}" selected>${rowData.transferCity}</option>`;
              }
              isEditingTransfer = false;
            });
          } else {
            console.warn(`Could not find country for city: ${rowData.transferCity} or country dropdown not found`);
            // Fallback: set city directly
            if (cityDropdown) {
              cityDropdown.innerHTML = `<option value="${rowData.transferCity}" selected>${rowData.transferCity}</option>`;
            }
            isEditingTransfer = false;
          }
        }).catch(error => {
          console.error("Error in findCountryForCity:", error);
          // Fallback: set city directly
          if (cityDropdown) {
            cityDropdown.innerHTML = `<option value="${rowData.transferCity}" selected>${rowData.transferCity}</option>`;
          }
          isEditingTransfer = false;
        });
      } else {
        console.warn("LocationCache not available or no city, setting city directly");
        // Fallback: set city directly
        if (cityDropdown) {
          cityDropdown.innerHTML = `<option value="${rowData.transferCity}" selected>${rowData.transferCity}</option>`;
        }
        isEditingTransfer = false;
      }
    });
  }

  if (event.target.classList.contains("deleteBtn") || event.target.closest(".deleteBtn")) {
    // Confirm deletion
    if (confirm("Are you sure you want to delete this transfer?")) {
      const rowIndex = row.rowIndex - 1;
      transfersArray.splice(rowIndex, 1); // Remove from array
      row.remove(); // Remove row from the table
    }
  }
});

document.getElementById("getTransferPriceBtn").addEventListener("click", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  const agentName = document.getElementById("agentName").textContent;
  const transferCity = document.getElementById("transferCity").value;
  const transferType = document.getElementById("transferType").value;
  const transferToT = document.getElementById("transferToT").value;
  const numberOfAdults = parseInt(document.getElementById("adult").value, 10) || 0;
  const numberOfKids = parseInt(document.getElementById("child").value, 10) || 0;
  const travelDate = document.getElementById("transferDate").value;
  const pickupTime = document.getElementById("transferPickupTime").value;

  // Validation
  if (!transferCity || !transferType || !transferToT || !travelDate) {
    alert("Please fill in all required fields before getting the price.");
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
    pickup_time: pickupTime,
  };

  fetch(`${Endpoint}/api/v1/transfers/calculate-cost`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  })
  .then(async (response) => {
    if (!response.ok) {
      const errorText = await response.text(); // ✅ Read error message
      throw new Error(errorText); // ✅ Throw error to be caught in catch block
    }
    return response.json();
  })
  .then((data) => {
    if (data.final_cost) {
      document.getElementById("updatedTransferPrice").value = `${data.final_cost}`; // ✅ Display Price
    } else {
      throw new Error("Failed to retrieve the price. Please try again.");
    }
  })
  .catch((error) => {
    console.error("Error fetching transfer price:", error);
    alert(`Error: ${error.message}`); // ✅ Show backend error message
  });
});

// Make isEditingTransfer available globally so add_trip.html can check it
window.isEditingTransfer = () => isEditingTransfer;

// Function to format time to HH:MM
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

// Set up flight select dropdown for transfer modal and auto field pre-fill
function setupFlightDropdown() {
  const transferFlightSelect = document.getElementById("transferFlight");
  const flightTimeInput = document.getElementById("flightTime");
  const transferPickupTimeInput = document.getElementById("transferPickupTime");
  const transferFromInput = document.getElementById("transferFrom");
  const transferToInput = document.getElementById("transferTo");

  if (!transferFlightSelect) return;

  function getAirportName(codeOrName) {
    if (!codeOrName) return "";
    const code = codeOrName.trim().toUpperCase();
    const airports = {
      "BKK": "Suvarnabhumi Airport",
      "DMK": "Don Mueang Airport",
      "HKT": "Phuket Airport",
      "CNX": "Chiang Mai Airport",
      "KBV": "Krabi Airport",
      "USM": "Samui Airport",
      "DXB": "Dubai Airport",
      "SIN": "Singapore Changi Airport",
      "KUL": "Kuala Lumpur Airport",
      "HKG": "Hong Kong Airport",
      "ICN": "Incheon Airport",
      "NRT": "Narita Airport",
      "HND": "Haneda Airport"
    };
    return airports[code] || codeOrName;
  }

  function getHotelNameFromQuotation(city) {
    const hotels = typeof hotelsArray !== "undefined" ? hotelsArray : [];
    if (!city) return hotels.length > 0 ? (hotels[0].hotelName || hotels[0].hotel_name || "") : "";
    const matchedHotel = hotels.find(h => {
      const hotelCity = h.city || h.hotelCity || "";
      return hotelCity.toLowerCase().trim() === city.toLowerCase().trim();
    });
    if (matchedHotel) {
      return matchedHotel.hotelName || matchedHotel.hotel_name || "";
    }
    if (hotels.length > 0) {
      return hotels[0].hotelName || hotels[0].hotel_name || "";
    }
    return "";
  }

  function refreshFlightSelect(selectedValue) {
    transferFlightSelect.innerHTML = '<option value="" disabled selected>Select Flight</option>';
    
    // Access flightsArray from add_flight.js
    const flights = typeof flightsArray !== "undefined" ? flightsArray : [];
    console.log("Refreshing flight select dropdown. Flights found:", flights);
    
    flights.forEach((flight, idx) => {
      const flightNo = flight.number || flight.flight_number || "";
      const airline = flight.flight_airline || "";

      // Normalise flight number with airline code prefix if not already present
      let combinedFlight = flightNo;
      if (airline && !flightNo.toLowerCase().startsWith(airline.toLowerCase())) {
        combinedFlight = `${airline} ${flightNo}`;
      }

      if (!combinedFlight) return;

      const flightInOut = flight.flightInOut || flight.in_or_out || "";
      const route = flight.flightRoute || flight.route || "";
      const depTime = flight.departureTime || flight.departure_time || flight.edt || "";
      const arrTime = flight.arrivalTime || flight.arrival_time || flight.eat || "";

      const option = document.createElement("option");
      option.value = combinedFlight;
      option.textContent = `${combinedFlight} (${flightInOut}) ${route ? '- ' + route : ''}`;
      
      option.dataset.index = idx;
      option.dataset.flightNo = flightNo;
      option.dataset.airline = airline;
      option.dataset.combinedFlight = combinedFlight;
      option.dataset.inout = flightInOut;
      option.dataset.departure = depTime;
      option.dataset.arrival = arrTime;
      option.dataset.route = route;

      if (selectedValue && (combinedFlight.toLowerCase() === selectedValue.toLowerCase() || flightNo.toLowerCase() === selectedValue.toLowerCase())) {
        option.selected = true;
      }

      transferFlightSelect.appendChild(option);
    });
  }

  // Attach to element so we can trigger it from edit event handler
  transferFlightSelect.refreshOptions = function(selectedValue) {
    refreshFlightSelect(selectedValue);
  };

  transferFlightSelect.addEventListener("change", function () {
    const selectedOption = this.options[this.selectedIndex];
    if (!selectedOption || this.value === "") return;

    const inout = selectedOption.dataset.inout || "";
    const departure = selectedOption.dataset.departure;
    const arrival = selectedOption.dataset.arrival;
    const route = selectedOption.dataset.route;

    console.log(`Dropdown matched flight: ${this.value}, direction: ${inout}, dep: ${departure}, arr: ${arrival}`);

    // 1. Set Flight Time to ETD (departure)
    if (flightTimeInput && departure) {
      flightTimeInput.value = formatTimeToHHMM(departure);
    }

    // 2. Set Pickup Time to ETA (arrival)
    if (transferPickupTimeInput && arrival) {
      transferPickupTimeInput.value = formatTimeToHHMM(arrival);
    }
  });

  // Bind shown.bs.modal to refresh options whenever the modal opens
  $("#addTransferModal").on("shown.bs.modal", function () {
    const currentVal = transferFlightSelect.value;
    refreshFlightSelect(currentVal);
  });
}

// Initialize on load
setupFlightDropdown();
