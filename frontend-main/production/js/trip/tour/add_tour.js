document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  let editingTourRow = null;
  let toursArray = []
  let isEditingTour = false; // Flag to prevent conflicts with auto-selection

  // Ensure toursData is populated before selection
  let toursData = {};

  // Fetch and populate tour options along with routes (with date filtering)
  function fetchAndPopulateTours(cityDropdown, tourDropdown) {
    const selectedCity = cityDropdown.value;
    const startDate = document.getElementById("tourStartDate").value;

    if (!selectedCity) {
      alert("Please select a city.");
      return;
    }

    if (!startDate) {
      alert("Please select a start date first.");
      tourDropdown.innerHTML = '<option value="">Select a start date first</option>';
      return;
    }

    console.log(`Fetching tours for city: ${selectedCity}, date: ${startDate}`);

    // Format date as YYYY-MM-DD
    const dateStr = startDate; // Already in YYYY-MM-DD format from date input

    fetch(`${Endpoint}/api/v1/tours?city=${selectedCity}&from_date=${dateStr}&to_date=${dateStr}&keyword=`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((tours) => {
        tourDropdown.innerHTML = '<option value="">Select Tour</option>'; // Reset options
        toursData = {}; // Reset stored tours

        if (tours.length === 0) {
          tourDropdown.innerHTML = '<option value="">No tours available on this date</option>';
          console.warn(`No tours available in ${selectedCity} on ${startDate}`);
          return;
        }

        tours.forEach((tour) => {
          if (!tour.id) {
            console.warn("Warning: Tour object missing ID:", tour);
            return;
          }

          console.log(
            `✅ Storing Tour: ID=${tour.id}, Name=${tour.name}, Duration=${tour.duration}`
          );

          toursData[tour.id] = tour; // Store tour data

          const option = document.createElement("option");
          option.value = tour.id;
          option.textContent = tour.name;
          tourDropdown.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Error fetching tours:", error);
        alert("Failed to load tours. Please try again later.");
      });
  }

  // Function to check if all required fields are present before calculating price
  function checkAndCalculateTourPrice() {
    const city = document.getElementById("city").value;
    const tourId = document.getElementById("tourName").value;
    const tourToT = document.getElementById("tourToT").value;
    const startDate = document.getElementById("tourStartDate").value;
    const endDate = document.getElementById("tourEndDate").value;
    // Ensure the end date is calculated correctly
    calculateEndDate();

    const singleRooms = document.getElementById("singleRoom").checked
      ? parseInt(document.getElementById("singleRoomCount").value || 0, 10)
      : 0;
    const doubleRooms = document.getElementById("doubleRoom").checked
      ? parseInt(document.getElementById("doubleRoomCount").value || 0, 10)
      : 0;
    const tripleRooms = document.getElementById("tripleRoom").checked
      ? parseInt(document.getElementById("tripleRoomCount").value || 0, 10)
      : 0;

    if (city && tourId && tourToT && startDate && endDate) {
      console.log("✅ All required fields are present, calculating tour price...");
      calculateTourPrice();
    }
  }

  // Add event listeners to trigger price calculation
  document.getElementById("city").addEventListener("change", checkAndCalculateTourPrice);
  document.getElementById("tourName").addEventListener("change", checkAndCalculateTourPrice);
  document.getElementById("tourStartDate").addEventListener("change", checkAndCalculateTourPrice);
  // document.getElementById("tourEndDate").addEventListener("change", checkAndCalculateTourPrice);
  document.getElementById("tourToT").addEventListener("change", checkAndCalculateTourPrice);

  // Room type event listeners (Single, Double, Triple)
  document.getElementById("singleRoomCount").addEventListener("input", checkAndCalculateTourPrice);
  document.getElementById("doubleRoomCount").addEventListener("input", checkAndCalculateTourPrice);
  document.getElementById("tripleRoomCount").addEventListener("input", checkAndCalculateTourPrice);

  // ✅ Function to calculate tour price
  function calculateTourPrice() {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("You are not authorized. Please log in first.");
      window.location.href = "login.html";
      return;
    }

    const agentName = document.getElementById("agentName").textContent;
    const city = document.getElementById("city").value;
    const tourId = document.getElementById("tourName").value;
    const tourToT = document.getElementById("tourToT").value;
    const startDate = document.getElementById("tourStartDate").value;
    const endDate = document.getElementById("tourEndDate").value;

    const numberOfAdults = parseInt(document.getElementById("adult").value || 0, 10);
    const numberOfKids = parseInt(document.getElementById("child").value || 0, 10);

    const singleRooms = document.getElementById("singleRoom").checked
      ? parseInt(document.getElementById("singleRoomCount").value || 0, 10)
      : 0;
    const doubleRooms = document.getElementById("doubleRoom").checked
      ? parseInt(document.getElementById("doubleRoomCount").value || 0, 10)
      : 0;
    const tripleRooms = document.getElementById("tripleRoom").checked
      ? parseInt(document.getElementById("tripleRoomCount").value || 0, 10)
      : 0;

    // Validate inputs before API request
    if (!city || !tourId || !tourToT || !startDate || !endDate || numberOfAdults + numberOfKids === 0) {
      alert("Please ensure all required fields are filled correctly.");
      return;
    }

    const requestData = {
      agent_name: agentName,
      city,
      tour_id: parseInt(tourId, 10),
      tot: tourToT,
      number_of_kids: numberOfKids,
      number_of_adults: numberOfAdults,
      travel_date: startDate,
      single_rooms: singleRooms,
      double_rooms: doubleRooms,
      triple_rooms: tripleRooms,
    };

    fetch(`${Endpoint}/api/v1/tours/calculate-cost`, {
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
          document.getElementById("updatedTourPrice").value = `${data.final_cost}`;
        } else {
          throw new Error("Failed to retrieve the price. Please try again.");
        }
      })
      .catch((error) => {
        console.error("Error fetching tour price:", error);
        alert(`Error: ${error.message}`);
        document.getElementById("updatedTourPrice").value = 0; // ✅ Set price to 0 on error
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

  // Listen for city change to populate tours
  document.getElementById("city").addEventListener("change", function () {
    fetchAndPopulateTours(this, document.getElementById("tourName"));
  });

  // Listen for start date change to reload tours (date filtering)
  document.getElementById("tourStartDate").addEventListener("change", function () {
    const cityDropdown = document.getElementById("city");
    const tourDropdown = document.getElementById("tourName");
    if (cityDropdown.value) {
      fetchAndPopulateTours(cityDropdown, tourDropdown);
    }
  });


  // Populate end date based on start date and duration
  function calculateEndDate() {
    const startDateInput = document.getElementById("tourStartDate");
    const endDateInput = document.getElementById("tourEndDate");
    const tourId = document.getElementById("tourName").value;

    if (!tourId || !toursData[tourId]) {
      console.warn("⚠️ Tour not selected or data missing. Cannot calculate end date.");
      return;
    }
    const duration = toursData[tourId]?.duration;
    const startDateValue = startDateInput.value;

    if (!startDateValue || !duration) {
      console.warn("⚠️ Start Date or Duration is missing.");
      return;
    }

    const startDate = new Date(startDateValue);
    startDate.setDate(startDate.getDate() + duration); // Add duration to start date

    const formattedEndDate = startDate.toISOString().split("T")[0]; // Convert to YYYY-MM-DD
    setTimeout(() => {
      // endDateInput.removeAttribute("readonly"); // Ensure it's editable
      endDateInput.value = formattedEndDate;
      console.log("✅ End Date Updated in UI:", endDateInput.value);
  }, 50);
  }

  // Listen for changes in the start date field
  document.getElementById("tourStartDate").addEventListener("change", calculateEndDate);

  // Populate route when tour is selected
  document.getElementById("tourName").addEventListener("change", function () {
    const selectedTourId = this.value;

    console.log("✅ Tour Selected:", selectedTourId);
    if (selectedTourId && toursData[selectedTourId]) {
      document.getElementById("route").value = toursData[selectedTourId]?.route || "Route Not Available";
      calculateEndDate(); // Auto-set end date when a tour is selected
    } else {
      console.warn("⚠️ Tour data not available.");
    }
  });


  function validateRoomCounts() {
    let pax = parseInt(document.getElementById("pax").value || 0, 10);
    if (pax === 0) {
      const adult = parseInt(document.getElementById("adult")?.value || 0, 10);
      const child = parseInt(document.getElementById("child")?.value || 0, 10);
      pax = adult + child;
      const paxField = document.getElementById("pax");
      if (paxField && pax > 0) {
        paxField.value = pax;
      }
    }

    const singleRoomCount = parseInt(document.getElementById("singleRoomCount").value || 0, 10);
    const doubleRoomCount = parseInt(document.getElementById("doubleRoomCount").value || 0, 10);
    const tripleRoomCount = parseInt(document.getElementById("tripleRoomCount").value || 0, 10);

    const totalRoomCapacity = singleRoomCount * 1 + doubleRoomCount * 2 + tripleRoomCount * 3;

    if (totalRoomCapacity > pax) {
      alert(`Total room capacity (${totalRoomCapacity}) exceeds the number of pax (${pax}). Please adjust the room counts.`);
      return false;
    }

    return true;
  }

  /**
   * Add validation to room count inputs
   */
  ["singleRoomCount", "doubleRoomCount", "tripleRoomCount", "pax"].forEach((id) => {
    document.getElementById(id).addEventListener("input", function () {
      validateRoomCounts();
    });
  });
  /**
   * Enable/disable room count based on checkbox selection
   */
  function toggleRoomCount(roomTypeId, roomCountId) {
    const checkbox = document.getElementById(roomTypeId);
    const roomCount = document.getElementById(roomCountId);
    roomCount.disabled = !checkbox.checked;
    if (!checkbox.checked) {
      roomCount.value = ""; // Clear value when disabled
    }
  }

  document.getElementById("singleRoom").addEventListener("change", function () {
    toggleRoomCount("singleRoom", "singleRoomCount");
  });

  document.getElementById("doubleRoom").addEventListener("change", function () {
    toggleRoomCount("doubleRoom", "doubleRoomCount");
  });

  document.getElementById("tripleRoom").addEventListener("change", function () {
    toggleRoomCount("tripleRoom", "tripleRoomCount");
  });


  /**
   * Open Add Tour Modal and Reset Fields
   */
  document.getElementById("addtourBtn").addEventListener("click", function () {
    document.getElementById("tourForm").reset();
    const adult = parseInt(document.getElementById("adult")?.value) || 0;
    const child = parseInt(document.getElementById("child")?.value) || 0;

    // Update pax field if there are any valid inputs
    if (adult || child) {
        document.getElementById("pax").value = adult + child;
    }
    document.getElementById("singleRoomCount").disabled = true;
    document.getElementById("doubleRoomCount").disabled = true;
    document.getElementById("tripleRoomCount").disabled = true;

    const tripStartDate = document.getElementById("tripStartDate")?.value || "";

    const startDateInput = document.getElementById("tourStartDate");
    const endDateInput = document.getElementById("tourEndDate");

    // Set tourStartDate to tripStartDate or today's date
    startDateInput.value = tripStartDate ? tripStartDate : today;
    startDateInput.min = tripStartDate; // Prevent selecting past dates

    // Ensure endDate can only be selected after startDate
    startDateInput.addEventListener("change", function () {
        endDateInput.min = startDateInput.value; // Set endDate's min to startDate's value
        endDateInput.value = ""; // Reset end date if start date is changed
    });

    $("#addTourModal").modal("show");
  });

  document.getElementById("getTourPriceBtn").addEventListener("click", function () {

    const agentName = document.getElementById("agentName").textContent;
    const city = document.getElementById("city").value;
    const tourId = document.getElementById("tourName").value;
    const tot = document.getElementById("tourToT").value;
    const travelDate = document.getElementById("tripStartDate").value;

    const numberOfAdults = parseInt(document.getElementById("adult").value || 0, 10);
    const numberOfKids = parseInt(document.getElementById("child").value || 0, 10);

    const singleRooms = document.getElementById("singleRoom").checked
      ? parseInt(document.getElementById("singleRoomCount").value || 0, 10)
      : 0;

    const doubleRooms = document.getElementById("doubleRoom").checked
      ? parseInt(document.getElementById("doubleRoomCount").value || 0, 10)
      : 0;

    const tripleRooms = document.getElementById("tripleRoom").checked
      ? parseInt(document.getElementById("tripleRoomCount").value || 0, 10)
      : 0;

    // Validate inputs
    if (!city || !tourId || !tot || !travelDate || numberOfAdults + numberOfKids === 0) {
      alert("Please ensure all required fields are filled correctly.");
      return;
    }

    console.log(parseInt(tourId, 10));

    const requestData = {
      agent_name: agentName,
      city,
      tour_id: parseInt(tourId, 10),
      tot,
      number_of_kids: numberOfKids,
      number_of_adults: numberOfAdults,
      travel_date: travelDate,
      single_rooms: singleRooms,
      double_rooms: doubleRooms,
      triple_rooms: tripleRooms,
    };

    fetch(`${Endpoint}/api/v1/tours/calculate-cost`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((errorData) => {
            throw new Error("Failed to calculate tour price: " + errorData);
          });
        }
        return response.json();
      })
      .then((data) => {
        if (data.final_cost) {
          document.getElementById("updatedTourPrice").value = `${data.final_cost}`;
        } else {
          document.getElementById("updatedTourPrice").value = "Price Unavailable";
        }
      })
      .catch((error) => {
        console.error("Error calculating tour price:", error);
        alert(error.message);
      });
  });

  /**
   * Save Tour data and add to table
   */
  document.getElementById("saveTour").addEventListener("click", function (event) {
    event.preventDefault(); // Prevent form submission

    const tourId = document.getElementById("tourName").value;
    if (!tourId) {
      alert("❌ Please select a tour before saving.");
      return;
    }

    // Get input values from the modal
    const tourCity = document.getElementById("city").value;
    const tourDropdown = document.getElementById("tourName");
    const tourName = tourDropdown.options[tourDropdown.selectedIndex].textContent;
    const route = document.getElementById("route").value;
    const tourToT = document.getElementById("tourToT").value;
    const tourFlightIn = document.getElementById("tourFlightIn").value;
    const arrivalTimeTour = document.getElementById("arrivalTimeTour").value;
    const tourFlightOut = document.getElementById("tourFlightOut").value;
    const departureTimeTour = document.getElementById("departureTimeTour").value;
    const remarks = document.getElementById("tourRemarks").value;
    const tourPrice = document.getElementById("updatedTourPrice").value || "N/A"; // ✅ Store Price
    const tourStartDate = formatToDDMMYYYY(document.getElementById("tourStartDate").value);
    const tourEndDate = formatToDDMMYYYY(document.getElementById("tourEndDate").value);

    // Room counts
    const singleRoomCount = document.getElementById("singleRoom").checked
      ? parseInt(document.getElementById("singleRoomCount").value || 0, 10)
      : 0;
    const doubleRoomCount = document.getElementById("doubleRoom").checked
      ? parseInt(document.getElementById("doubleRoomCount").value || 0, 10)
      : 0;
    const tripleRoomCount = document.getElementById("tripleRoom").checked
      ? parseInt(document.getElementById("tripleRoomCount").value || 0, 10)
      : 0;

    // Pax count
    const pax = parseInt(document.getElementById("pax").value, 10);

    // Validate required fields
    if (!tourCity || !tourName || !pax || !tourToT) {
      alert("Please fill in all required fields.");
      return;
    }

    // Validate room count does not exceed pax
    const totalRoomCapacity = singleRoomCount * 1 + doubleRoomCount * 2 + tripleRoomCount * 3;
    if (totalRoomCapacity > pax) {
      alert(`Total room capacity (${totalRoomCapacity}) exceeds total pax (${pax}).`);
      return;
    }

    console.log("tour id :", parseInt(tourId, 10))

    // Create a new tour object
    const newTour = {
      tour_id: parseInt(tourId, 10),
      tourCity,
      tourName,
      route,
      tourToT,
      singleRoomCount,
      doubleRoomCount,
      tripleRoomCount,
      tourFlightIn,
      arrivalTimeTour,
      tourFlightOut,
      departureTimeTour,
      remarks,
      price: tourPrice,
      pax,
      tourStartDate,
      tourEndDate,
    };

    // Check if editing an existing tour
    if (editingTourRow) {
      updateTourRow(editingTourRow, newTour);
      const rowIndex = editingTourRow.rowIndex - 1;
      toursArray[rowIndex] = newTour;
      editingTourRow = null;
    } else {
      toursArray.push(newTour);
      addTourRow(newTour);
    }

    // Reset form and close modal
    document.getElementById("tourForm").reset();
    $("#addTourModal").modal("hide");
  });

  document.getElementById("tourTableBody").addEventListener("click", function (event) {
    const row = event.target.closest("tr");
    if (!row) return;

    // ✅ Block package items editing/deleting
    if (row.dataset.isPackageItem === "true") {
      return;
    }
  
    const rowIndex = row.rowIndex - 1;
    const rowData = toursArray[rowIndex];
    if (!rowData) return;
  
    if (event.target.classList.contains("editBtn") || event.target.closest(".editBtn")) {
      console.log("Editing tour:", rowData);

      // Set editing flag to prevent auto-Thailand selection
      isEditingTour = true;

      // Set other fields immediately (non-location fields)
      document.getElementById("tourStartDate").value = formatToYYYYMMDD(rowData.tourStartDate);
      document.getElementById("tourEndDate").value = formatToYYYYMMDD(rowData.tourEndDate);
      document.getElementById("route").value = rowData.route || "";
      document.getElementById("tourToT").value = rowData.tourToT || "";
      document.getElementById("tourFlightIn").value = rowData.tourFlightIn || "";
      document.getElementById("arrivalTimeTour").value = rowData.arrivalTimeTour || "";
      document.getElementById("departureTimeTour").value = rowData.departureTimeTour || "";
      document.getElementById("tourFlightOut").value = rowData.tourFlightOut || "";
      document.getElementById("pax").value = rowData.pax || "";
      document.getElementById("tourRemarks").value = rowData.remarks || "";
      document.getElementById("updatedTourPrice").value = rowData.price || "N/A";

      document.getElementById("singleRoom").checked = rowData.singleRoomCount > 0;
      document.getElementById("singleRoomCount").value = rowData.singleRoomCount || 0;
      document.getElementById("singleRoomCount").disabled = rowData.singleRoomCount === 0;

      document.getElementById("doubleRoom").checked = rowData.doubleRoomCount > 0;
      document.getElementById("doubleRoomCount").value = rowData.doubleRoomCount || 0;
      document.getElementById("doubleRoomCount").disabled = rowData.doubleRoomCount === 0;

      document.getElementById("tripleRoom").checked = rowData.tripleRoomCount > 0;
      document.getElementById("tripleRoomCount").value = rowData.tripleRoomCount || 0;
      document.getElementById("tripleRoomCount").disabled = rowData.tripleRoomCount === 0;

      editingTourRow = row;

      // Show modal first, then handle location setup
      $("#addTourModal").modal("show");

      // Wait for modal to be fully shown, then set up location fields
      $("#addTourModal").one("shown.bs.modal", function() {
        console.log("Tour modal shown, setting up location fields for edit");
        
        // Clear any existing selections first
        const countryDropdown = document.getElementById("tourCountry");
        const cityDropdown = document.getElementById("city");
        
        if (countryDropdown) countryDropdown.value = "";
        if (cityDropdown) cityDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';

        // Now set up the location fields with proper coordination
        if (typeof LocationCache !== 'undefined' && rowData.tourCity) {
          console.log("LocationCache is available, finding country for city:", rowData.tourCity);
          
          LocationCache.findCountryForCity(rowData.tourCity).then(countryCode => {
            console.log("findCountryForCity result:", countryCode);
            
            if (countryCode && countryDropdown) {
              console.log(`Found country ${countryCode} for city ${rowData.tourCity}`);
              console.log("Setting tour country dropdown to:", countryCode);
              
              // Set country first
              countryDropdown.value = countryCode;
              
              // Load cities for this country
              console.log("Calling populateCitiesDropdown for country:", countryCode);
              LocationCache.populateCitiesDropdown(countryCode, "city").then(() => {
                console.log("Cities populated successfully, now setting city to:", rowData.tourCity);
                
                // Use requestAnimationFrame for better timing instead of setTimeout
                requestAnimationFrame(() => {
                  const cityDropdown = document.getElementById("city");
                  console.log("Tour city dropdown element:", cityDropdown);
                  
                  if (cityDropdown) {
                    console.log("Available city options:", Array.from(cityDropdown.options).map(opt => opt.value));
                    
                    // Set the city value
                    cityDropdown.value = rowData.tourCity;
                    console.log("Set tour city dropdown value to:", cityDropdown.value);
                    
                    // Verify the selection worked
                    if (cityDropdown.value === rowData.tourCity) {
                      console.log("✅ Tour city selection successful!");
                    } else {
                      console.warn("❌ Tour city selection failed, trying alternative approach");
                      
                      // Try to find the option by text content
                      const options = Array.from(cityDropdown.options);
                      const matchingOption = options.find(opt => 
                        opt.textContent.toLowerCase() === rowData.tourCity.toLowerCase() ||
                        opt.value.toLowerCase() === rowData.tourCity.toLowerCase()
                      );
                      
                      if (matchingOption) {
                        matchingOption.selected = true;
                        console.log("✅ Tour city selection successful via text matching!");
                      } else {
                        console.error("❌ Could not find matching tour city option");
                      }
                    }
                    
                    // Trigger change event to load tours
                    cityDropdown.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    // Set tour type after a short delay to allow tours to load
                    setTimeout(() => {
                      const tourDropdown = document.getElementById("tourName");
                      console.log("Setting tour dropdown");
                      
                      if (tourDropdown) {
                        console.log("Available tour options:", Array.from(tourDropdown.options).map(opt => opt.textContent));
                        
                        for (let option of tourDropdown.options) {
                          if (option.textContent.trim() === rowData.tourName.trim()) {
                            option.selected = true;
                            console.log("Selected tour:", option.textContent);
                            break;
                          }
                        }
                        
                        // If not found, try again after a bit more time
                        if (!tourDropdown.value) {
                          console.warn("Tour not found, trying again in 500ms");
                          setTimeout(() => {
                            for (let option of tourDropdown.options) {
                              if (option.textContent.trim() === rowData.tourName.trim()) {
                                option.selected = true;
                                console.log("Selected tour (retry):", option.textContent);
                                break;
                              }
                            }
                          }, 500);
                        }
                      }
                      
                      // Clear editing flag
                      isEditingTour = false;
                    }, 300);
                  }
                });
              }).catch(error => {
                console.error("Error populating tour cities:", error);
                // Fallback: set city directly
                if (cityDropdown) {
                  cityDropdown.innerHTML = `<option value="${rowData.tourCity}" selected>${rowData.tourCity}</option>`;
                }
                isEditingTour = false;
              });
            } else {
              console.warn(`Could not find country for city: ${rowData.tourCity} or country dropdown not found`);
              // Fallback: set city directly
              if (cityDropdown) {
                cityDropdown.innerHTML = `<option value="${rowData.tourCity}" selected>${rowData.tourCity}</option>`;
              }
              isEditingTour = false;
            }
          }).catch(error => {
            console.error("Error in findCountryForCity:", error);
            // Fallback: set city directly
            if (cityDropdown) {
              cityDropdown.innerHTML = `<option value="${rowData.tourCity}" selected>${rowData.tourCity}</option>`;
            }
            isEditingTour = false;
          });
        } else {
          console.warn("LocationCache not available or no city, setting city directly");
          // Fallback: set city directly
          if (cityDropdown) {
            cityDropdown.innerHTML = `<option value="${rowData.tourCity}" selected>${rowData.tourCity}</option>`;
          }
          isEditingTour = false;
        }
      });
    }
  
    if (event.target.classList.contains("deleteBtn") || event.target.closest(".deleteBtn")) {
      if (confirm("Are you sure you want to delete this tour?")) {
        toursArray.splice(rowIndex, 1);
        row.remove();
        console.log("Tour deleted:", rowData);
      }
    }
  });

  // Add a new row to the tour table
  function addTourRow(tour) {
    const newRow = document.createElement("tr");

    // Store hidden values in `data-*` attributes
    newRow.dataset.tourId = tour.tour_id;
    newRow.dataset.singleRooms = tour.singleRoomCount;
    newRow.dataset.doubleRooms = tour.doubleRoomCount;
    newRow.dataset.tripleRooms = tour.tripleRoomCount;
    newRow.dataset.arrivalTime = tour.arrivalTimeTour;
    newRow.dataset.departureTime = tour.departureTimeTour;
    newRow.dataset.flightIn = tour.tourFlightIn;
    newRow.dataset.flightOut = tour.tourFlightOut;
    newRow.dataset.tourStartDate = tour.tourStartDate;
    newRow.dataset.tourEndDate = tour.tourEndDate;

    newRow.innerHTML = `
      <td>${tour.tourCity}</td>
      <td>${tour.tourName}</td>
      <td>${tour.tourToT}</td>
      <td>${tour.route || ""}</td>
      <td>${tour.pax}</td>
      <td>${tour.remarks || ""}</td>
      <td class="tour-price">${tour.price ? `${tour.price}` : "N/A"}</td>
      <td>
        <button class="btn btn-sm btn-primary editBtn" type="button" data-toggle="tooltip" title="Edit Tour">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger deleteBtn" type="button" data-toggle="tooltip" title="Delete Tour">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;

    document.getElementById("tourTableBody").appendChild(newRow);
    
    // Initialize tooltips for the new row
    $(newRow).find('[data-toggle="tooltip"]').tooltip();
  }

  // Function to update an existing tour row
  function updateTourRow(row, tour) {
    row.cells[0].textContent = tour.tourCity;
    row.cells[1].textContent = tour.tourName;
    row.cells[2].textContent = tour.tourToT;
    row.cells[3].textContent = tour.route || "";
    row.cells[4].textContent = tour.pax;
    row.cells[5].textContent = tour.remarks || "";
    row.cells[6].textContent = tour.price ? `${tour.price}` : "N/A";

    row.dataset.tourId = tour.tour_id;
    row.dataset.singleRooms = tour.singleRoomCount;
    row.dataset.doubleRooms = tour.doubleRoomCount;
    row.dataset.tripleRooms = tour.tripleRoomCount;
    row.dataset.arrivalTime = tour.arrivalTimeTour;
    row.dataset.departureTime = tour.departureTimeTour;
    row.dataset.flightIn = tour.tourFlightIn;
    row.dataset.flightOut = tour.tourFlightOut;
    row.dataset.tourStartDate = tour.tourStartDate;
    row.dataset.tourEndDate = tour.tourEndDate;
  }

  // Make isEditingTour available globally so add_trip.html can check it
  window.isEditingTour = () => isEditingTour;
});
