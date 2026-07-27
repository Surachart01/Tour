// Event listener for the "Add Excursion" button
document.getElementById("addExcursionBtn").addEventListener("click", function() {
  document.getElementById("excursionForm").reset();
  const tripStartDateInput = document.getElementById("tripStartDate");
  const excursionDateInput = document.getElementById("excursionDate");

  if (tripStartDateInput.value) {
    excursionDateInput.min = tripStartDateInput.value; // ✅ Set min date only, no default value
    excursionDateInput.value = ""; // ✅ Always start empty so user must explicitly pick a date
  }

  $("#addExcursionModal").modal("show"); // Show the excursion modal
});

document.getElementById("excursionDate").addEventListener("change", function () {
  const tripStartDate = document.getElementById("tripStartDate").value;

  if (new Date(this.value) < new Date(tripStartDate)) {
    alert("Transfer Date cannot be before Trip Start Date.");
    this.value = tripStartDate; // Reset to valid date
  }
});

document.getElementById("tripStartDate").addEventListener("change", function () {
  const excursionDateInput = document.getElementById("excursionDate");

  if (this.value) {
    excursionDateInput.min = this.value;

    // If the selected excursion date is before the new Trip Start Date, reset it
    if (new Date(excursionDateInput.value) < new Date(this.value)) {
      excursionDateInput.value = this.value;
    }
  }
});

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

let excursionsArray = [];
let editingExcursionRow = null;
let isEditingExcursion = false; // Flag to prevent conflicts with auto-selection

// Save Excursion Functionality
document.getElementById("saveExcursion").addEventListener("click", function (event) {
  event.preventDefault(); // Prevent form submission

  const excursionDropdown = document.getElementById("excursionName");

  // ✅ Fetch excursion_id correctly
  const excursionId = parseInt(excursionDropdown.value, 10); 
  console.log("Saving Excursion ID:", excursionId); // Debugging

  let city = document.getElementById("excursionCity").value;
  let excursionName = excursionDropdown.options[excursionDropdown.selectedIndex]?.textContent || "";
  let date = formatToDDMMYYYY(document.getElementById("excursionDate").value);
  let hotel = document.getElementById("excursionHotel").value;
  const excursionPickupTime = document.getElementById("excursionPickupTime").value;
  let typeOfExcursion = document.getElementById("typeOfExcursion").value;
  let remarks = document.getElementById("excursionRemarks").value;
  let price = document.getElementById("updatedExcursionPrice").value || "N/A";
  const packageExcursion = editingExcursionRow?.dataset.isPackageItem === "true"
    ? editingExcursionRow._packageExcursionData
    : null;
  if (packageExcursion) {
    city = packageExcursion.city;
    excursionName = packageExcursion.excursionName;
    date = formatToDDMMYYYY(document.getElementById("excursionDate").value) || packageExcursion.date;
    hotel = packageExcursion.hotel;
    typeOfExcursion = "SIC";
    price = packageExcursion.price;
    const cleanRemarks = remarks.replace(/\[Special Package\]/gi, "").trim();
    remarks = cleanRemarks ? `${cleanRemarks} [Special Package]` : "[Special Package]";
  }

  // ✅ Validate required fields
  const effectiveExcursionId = packageExcursion?.excursionId || excursionId || 0;
  if (!city || (!packageExcursion && !effectiveExcursionId) || !date || !hotel || !typeOfExcursion) {
    alert("Please fill in all required fields.");
    return;
  }

  // ✅ Include excursion_id in the object
  const newExcursion = {
    excursionId: effectiveExcursionId, // ✅ Ensure excursionId is saved
    city,
    excursionName,
    date,
    hotel,
    excursionPickupTime,
    typeOfExcursion,
    remarks,
    price,
  };

  if (editingExcursionRow) {
    updateExcursionRow(editingExcursionRow, newExcursion);

    // Update the array
    const rowIndex = editingExcursionRow.rowIndex - 1;
    excursionsArray[rowIndex] = newExcursion;

    editingExcursionRow = null; // Reset editing state
  } else {
    // ✅ Ensure excursionId is saved to table
    excursionsArray.push(newExcursion);
    addExcursionRow(newExcursion);
  }

  document.getElementById("excursionForm").reset();
  $("#addExcursionModal").modal("hide");
});


// Add a new row to the table
function addExcursionRow(excursion) {
  const newRow = `
    <tr data-excursion-id="${excursion.excursionId}"> <!-- ✅ Store excursion_id in row -->
      <td>${excursion.date}</td>
      <td>${excursion.city}</td>
      <td>${excursion.excursionName}</td>
      <td>${excursion.excursionPickupTime}</td>
      <td>${excursion.hotel}</td>
      <td>${excursion.remarks || ""}</td>
      <td>${excursion.typeOfExcursion}</td>
      <td>${excursion.price}</td> <!-- ✅ Show Price -->
      <td>
        <button class="btn btn-sm btn-primary editBtn" type="button" style="margin-right: 5px;" data-toggle="tooltip" data-placement="top" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger deleteBtn" type="button" data-toggle="tooltip" data-placement="top" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>`;

  document.getElementById("excursionTableBody").insertAdjacentHTML("beforeend", newRow);
  
  // Initialize tooltips for the new row
  const addedRow = document.getElementById("excursionTableBody").lastElementChild;
  $(addedRow).find('[data-toggle="tooltip"]').tooltip();
}

// Update an existing row in the table
function updateExcursionRow(row, excursion) {
  row.cells[0].innerHTML = row.dataset.isPackageItem === "true"
    ? `<input type="date" class="form-control form-control-sm inline-date-picker inline-package-preview-date" value="${formatToYYYYMMDD(excursion.date) || ""}" data-item-index="${row.dataset.packageItemIndex || ""}">`
    : excursion.date;
  row.cells[1].textContent = excursion.city;
  row.cells[2].innerHTML = row.dataset.isPackageItem === "true"
    ? `${excursion.excursionName} <span class="badge pkg-badge" style="background-color: #7b1fa2; color: white; font-size: 0.75rem; margin-left: 6px; padding: 3px 8px; border-radius: 4px; display: inline-block; vertical-align: middle;">Special Package</span>`
    : excursion.excursionName;
  row.cells[3].textContent = excursion.excursionPickupTime;
  row.cells[4].textContent = excursion.hotel;
  row.cells[5].textContent = excursion.remarks || "";
  row.cells[6].textContent = excursion.typeOfExcursion;
  row.cells[7].textContent = excursion.price; // ✅ Update price
  row.dataset.remarks = excursion.remarks || "";
  row.dataset.excursionId = excursion.excursionId || 0;
}

// Handle edit and delete button clicks
document.getElementById("excursionTableBody").addEventListener("click", function (event) {
  const row = event.target.closest("tr");
  if (!row) return;

  // ✅ Block package items delete only, allow edit
  if (row.dataset.isPackageItem === "true" && (event.target.classList.contains("deleteBtn") || event.target.closest(".deleteBtn"))) {
    return;
  }

  if (event.target.classList.contains("editBtn") || event.target.closest(".editBtn")) {
      // Populate modal with data from the row
      const isPackageItem = row.dataset.isPackageItem === "true";
      const rowData = isPackageItem
        ? {
            excursionId: row.dataset.excursionId || "",
            city: row.cells[1]?.textContent.trim() || "",
            excursionName: row.cells[2]?.textContent.replace("Special Package", "").trim() || "",
            date: row.cells[0]?.querySelector("input")?.value || row.cells[0]?.textContent.trim() || "",
            hotel: row.cells[4]?.textContent.trim() || "",
            excursionPickupTime: row.cells[3]?.textContent.trim() || "",
            typeOfExcursion: "SIC",
            remarks: row.dataset.remarks || row.cells[5]?.textContent.trim() || "",
            price: row.cells[7]?.textContent.trim() || "0",
          }
        : excursionsArray[row.rowIndex - 1];

      if (!rowData) {
        console.error("Error: No excursion data found for the selected row.");
        return;
      }

      console.log("Editing Excursion Data:", rowData);
      console.log("Excursion City to edit:", rowData.city);

      // Set editing flag to prevent auto-Thailand selection
      isEditingExcursion = true;

      // Set other fields immediately (non-location fields)
      document.getElementById("excursionDate").value = formatToYYYYMMDD(rowData.date);
      document.getElementById("excursionHotel").value = rowData.hotel;
      document.getElementById("excursionPickupTime").value = rowData.excursionPickupTime;
      document.getElementById("typeOfExcursion").value = rowData.typeOfExcursion;
      document.getElementById("excursionRemarks").value = rowData.remarks;
      document.getElementById("updatedExcursionPrice").value = rowData.price || "N/A";

      editingExcursionRow = row;

      if (isPackageItem) {
        const toeSelect = document.getElementById("typeOfExcursion");
        if (toeSelect) toeSelect.value = "SIC";
        editingExcursionRow._packageExcursionData = rowData;
      }
      setTimeout(() => {
        if (typeof window.toggleModalFieldsForPackage === "function") {
          window.toggleModalFieldsForPackage("#addExcursionModal", isPackageItem, [
            "#excursionDate",
            "#excursionPickupTime",
            "#excursionRemarks",
          ]);
        }
      }, 300);

      // Show modal first, then handle location setup
      $("#addExcursionModal").modal("show");

      // Wait for modal to be fully shown, then set up location fields
      $("#addExcursionModal").one("shown.bs.modal", function() {
        console.log("Excursion modal shown, setting up location fields for edit");
        
        // Clear any existing selections first
        const countryDropdown = document.getElementById("excursionCountry");
        const cityDropdown = document.getElementById("excursionCity");
        
        if (countryDropdown) countryDropdown.value = "";
        if (cityDropdown) cityDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';

        // Now set up the location fields with proper coordination
        if (typeof LocationCache !== 'undefined' && rowData.city) {
          console.log("LocationCache is available, finding country for city:", rowData.city);
          
          LocationCache.findCountryForCity(rowData.city).then(countryCode => {
            console.log("findCountryForCity result:", countryCode);
            
            if (countryCode && countryDropdown) {
              console.log(`Found country ${countryCode} for city ${rowData.city}`);
              console.log("Setting excursion country dropdown to:", countryCode);
              
              // Set country first
              countryDropdown.value = countryCode;
              
              // Load cities for this country
              console.log("Calling populateCitiesDropdown for country:", countryCode);
              LocationCache.populateCitiesDropdown(countryCode, "excursionCity").then(() => {
                console.log("Cities populated successfully, now setting city to:", rowData.city);
                
                // Use requestAnimationFrame for better timing instead of setTimeout
                requestAnimationFrame(() => {
                  const cityDropdown = document.getElementById("excursionCity");
                  console.log("Excursion city dropdown element:", cityDropdown);
                  
                  if (cityDropdown) {
                    console.log("Available city options:", Array.from(cityDropdown.options).map(opt => opt.value));
                    
                    // Set the city value
                    cityDropdown.value = rowData.city;
                    console.log("Set excursion city dropdown value to:", cityDropdown.value);
                    
                    // Verify the selection worked
                    if (cityDropdown.value === rowData.city) {
                      console.log("✅ Excursion city selection successful!");
                    } else {
                      console.warn("❌ Excursion city selection failed, trying alternative approach");
                      
                      // Try to find the option by text content
                      const options = Array.from(cityDropdown.options);
                      const matchingOption = options.find(opt => 
                        opt.textContent.toLowerCase() === rowData.city.toLowerCase() ||
                        opt.value.toLowerCase() === rowData.city.toLowerCase()
                      );
                      
                      if (matchingOption) {
                        matchingOption.selected = true;
                        console.log("✅ Excursion city selection successful via text matching!");
                      } else {
                        console.error("❌ Could not find matching excursion city option");
                      }
                    }
                    
                    // Trigger change event to load excursions
                    cityDropdown.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Set excursion type after a short delay to allow excursions to load
                    setTimeout(() => {
                      const excursionDropdown = document.getElementById("excursionName");
                      console.log("Setting excursion dropdown");
                      
                      if (excursionDropdown) {
                        console.log("Available excursion options:", Array.from(excursionDropdown.options).map(opt => opt.textContent));
                        
                        for (let option of excursionDropdown.options) {
                          if (option.textContent.trim() === rowData.excursionName.trim()) {
                            option.selected = true;
                            console.log("Selected excursion:", option.textContent);
                            break;
                          }
                        }
                        
                        // If not found, try again after a bit more time
                        if (!excursionDropdown.value) {
                          console.warn("Excursion not found, trying again in 500ms");
                          setTimeout(() => {
                            for (let option of excursionDropdown.options) {
                              if (option.textContent.trim() === rowData.excursionName.trim()) {
                                option.selected = true;
                                console.log("Selected excursion (retry):", option.textContent);
                                break;
                              }
                            }
                          }, 500);
                        }
                      }
                      
                      // Clear editing flag
                      isEditingExcursion = false;
                    }, 300);
                  }
                });
              }).catch(error => {
                console.error("Error populating excursion cities:", error);
                // Fallback: set city directly
                if (cityDropdown) {
                  cityDropdown.innerHTML = `<option value="${rowData.city}" selected>${rowData.city}</option>`;
                }
                isEditingExcursion = false;
              });
            } else {
              console.warn(`Could not find country for city: ${rowData.city} or country dropdown not found`);
              // Fallback: set city directly
              if (cityDropdown) {
                cityDropdown.innerHTML = `<option value="${rowData.city}" selected>${rowData.city}</option>`;
              }
              isEditingExcursion = false;
            }
          }).catch(error => {
            console.error("Error in findCountryForCity:", error);
            // Fallback: set city directly
            if (cityDropdown) {
              cityDropdown.innerHTML = `<option value="${rowData.city}" selected>${rowData.city}</option>`;
            }
            isEditingExcursion = false;
          });
        } else {
          console.warn("LocationCache not available or no city, setting city directly");
          // Fallback: set city directly
          if (cityDropdown) {
            cityDropdown.innerHTML = `<option value="${rowData.city}" selected>${rowData.city}</option>`;
          }
          isEditingExcursion = false;
        }
      });
  }

  if (event.target.classList.contains("deleteBtn") || event.target.closest(".deleteBtn")) {
      // Confirm deletion
      if (confirm("Are you sure you want to delete this excursion?")) {
          const rowIndex = row.rowIndex - 1;
          excursionsArray.splice(rowIndex, 1); // Remove from array
          row.remove(); // Remove row from the table
      }
  }
});

// Function to check if all required fields are filled and call price calculation
function checkAndCalculateExcursionPrice() {
  const city = document.getElementById("excursionCity").value;
  const excursionID = document.getElementById("excursionName").value;
  const date = document.getElementById("excursionDate").value;
  const typeOfExcursion = document.getElementById("typeOfExcursion").value;

  if (city && excursionID && date && typeOfExcursion) {
    console.log("✅ All required fields are filled, calculating price...");
    calculateExcursionPrice();
  }
}

// Event listeners for relevant fields
document.getElementById("excursionCity").addEventListener("change", checkAndCalculateExcursionPrice);
document.getElementById("excursionName").addEventListener("change", checkAndCalculateExcursionPrice);
document.getElementById("excursionDate").addEventListener("change", checkAndCalculateExcursionPrice);
document.getElementById("typeOfExcursion").addEventListener("change", checkAndCalculateExcursionPrice);

// Function to calculate excursion price
function calculateExcursionPrice() {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  const agentName = document.getElementById("agentName").textContent;
  const city = document.getElementById("excursionCity").value;
  const excursionID = document.getElementById("excursionName").value;
  const toe = document.getElementById("typeOfExcursion").value;
  const hotelName = document.getElementById("excursionHotel").value.trim();
  const numberOfAdults = parseInt(document.getElementById("adult").value, 10) || 0;
  const numberOfKids = parseInt(document.getElementById("child").value, 10) || 0;
  const travelDate = document.getElementById("excursionDate").value;
  const pickupTime = document.getElementById("excursionPickupTime").value.trim();

  const requestData = {
    agent_name: agentName,
    city: city,
    excursion_id: parseInt(excursionID, 10),
    toe: toe,
    hotel_name: hotelName,
    number_of_kids: numberOfKids,
    number_of_adults: numberOfAdults,
    travel_date: travelDate,
    pickup_time: pickupTime || null,
  };

  fetch(`${Endpoint}/api/v1/excursions/calculate-cost`, {
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
      document.getElementById("updatedExcursionPrice").value = `${data.final_cost}`;
    } else {
      throw new Error("Failed to retrieve the price. Please try again.");
    }
  })
  .catch((error) => {
    console.error("Error fetching excursion price:", error);
    alert(`Error: ${error.message}`);
    document.getElementById("updatedExcursionPrice").value = 0;
  });
}

// Fetch Excursion Price
document.getElementById("getExcursionPriceBtn").addEventListener("click", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  const agentName = document.getElementById("agentName").textContent;
  const city = document.getElementById("excursionCity").value;
  const excursionID = document.getElementById("excursionName").value; // Ensure this is the ID
  const toe = document.getElementById("typeOfExcursion").value; // Type of Excursion (PVT/SIC)
  const hotelName = document.getElementById("excursionHotel").value.trim();
  const numberOfAdults = parseInt(document.getElementById("adult").value, 10) || 0;
  const numberOfKids = parseInt(document.getElementById("child").value, 10) || 0;
  const travelDate = document.getElementById("excursionDate").value;
  const pickupTime = document.getElementById("excursionPickupTime").value.trim();

  // Validate input fields
  if (!city || !excursionID || !toe || !travelDate) {
    alert("Please fill in all required fields before getting the price.");
    return;
  }

  // ✅ Prepare the request payload (matches ExcursionCostRequest struct)
  const requestData = {
    agent_name: agentName,
    city: city,
    excursion_id: parseInt(excursionID, 10),
    toe: toe,
    hotel_name: hotelName,
    number_of_kids: numberOfKids,
    number_of_adults: numberOfAdults,
    travel_date: travelDate,
    pickup_time: pickupTime || null, // Send empty if not provided
  };

  fetch(`${Endpoint}/api/v1/excursions/calculate-cost`, {
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
      document.getElementById("updatedExcursionPrice").value = `${data.final_cost}`;
    } else {
      throw new Error("Failed to retrieve the price. Please try again.");
    }
  })
  .catch((error) => {
    console.error("Error fetching excursion price:", error);
    alert(`Error: ${error.message}`);
  });
});

// Make isEditingExcursion available globally so add_trip.html can check it
window.isEditingExcursion = () => isEditingExcursion;
