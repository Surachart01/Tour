let selectedHotel = null; // Define selectedHotel globally
let editingRow = null;
let isEditingHotel = false; // Flag to prevent conflicts with auto-selection

let hotelsArray = [];

// Handle saving hotel booking
document
    .getElementById("saveHotelBooking")
    .addEventListener("click", function (event) {
    event.preventDefault(); // Prevent default form submission

    const checkInDate = document.getElementById("checkInDate").value;
    const checkOutDate = document.getElementById("checkOutDate").value;
    const city = document.getElementById("hotelCity").value;
    const hotel = document.getElementById("hotel").value;
    const roomType = document.getElementById("roomType").value;
    const promotion = document.getElementById("promotion").value;
    const freeNights =
        document.getElementById("freeNights").value || "0";
    const compulsoryAbf = document.getElementById("compulsoryAbf")
        .checked
        ? "Yes"
        : "No";
    const discountPercent =
        document.getElementById("discountPercent").value || "0";
    const singleRooms =
        document.getElementById("singleRooms").value || "0";
    const doubleRooms =
        document.getElementById("doubleRooms").value || "0";
    const earlyCheckIn = document.getElementById("earlyCheckIn").checked
        ? "Yes"
        : "No";
    const lateCheckOut = document.getElementById("lateCheckOut").checked
        ? "Yes"
        : "No";
    const dayUse = document.getElementById("dayUse").checked
        ? "Yes"
        : "No";
    const extraAdultBed = document.getElementById("extraAdultBed")
        .checked
        ? "Yes"
        : "No";
    const extraChildBed = document.getElementById("extraChildBed")
        .checked
        ? "Yes"
        : "No";
    const sharingBed = document.getElementById("sharingBed").checked
        ? "Yes"
        : "No";
    const mealAbf = document.getElementById("mealAbf").checked
        ? "Yes"
        : "No";
    const mealLunch = document.getElementById("mealLunch").checked
        ? "Yes"
        : "No";
    const mealDinner = document.getElementById("mealDinner").checked
        ? "Yes"
        : "No";
    const reservationIn =
        document.getElementById("reservationIn").value;
    const reservationOut =
        document.getElementById("reservationOut").value;
    const paymentDate = document.getElementById("paymentDate").value;
    const notes = document.getElementById("notes").value;

    // Check if all required fields are filled
    if (!checkInDate || !checkOutDate || !city || !hotel || !roomType) {
        alert("Please fill all required fields.");
        return;
    }

    // Calculate nights
    const nights = Math.ceil(
        (new Date(checkOutDate) - new Date(checkInDate)) /
        (1000 * 60 * 60 * 24)
    );

    const newHotel = {
        checkInDate,
        checkOutDate,
        city,
        hotel,
        roomType,
        promotion,
        freeNights,
        compulsoryAbf,
        discountPercent,
        singleRooms,
        doubleRooms,
        earlyCheckIn,
        lateCheckOut,
        dayUse,
        extraAdultBed,
        extraChildBed,
        sharingBed,
        mealAbf,
        mealLunch,
        mealDinner,
        reservationIn,
        reservationOut,
        paymentDate,
        notes,
        nights,
    };

    hotelsArray.push(newHotel);

    // Add new row to the table
    const newRow = `
        <tr>
            <td>${checkInDate}</td>
            <td>${checkOutDate}</td>
            <td>${city}</td>
            <td></td> <!-- Tour -->
            <td></td> <!-- Package -->
            <td>${hotel}</td>
            <td>${nights}</td>
            <td>${singleRooms}</td>
            <td>${doubleRooms}</td>
            <td></td> <!-- Extra Bed -->
            <td>${roomType}</td>
            <td>${promotion}</td>
            <td>${mealAbf}</td>
            <td>${mealLunch}</td>
            <td>${mealDinner}</td>
            <td>${reservationIn}</td>
            <td>${reservationOut}</td>
            <td>${paymentDate}</td>
            <td>${notes}</td>
            <td><button class="btn btn-sm btn-primary editBtn" type="button">Edit</button></td>
            <td><button class="btn btn-sm btn-danger deleteBtn" type="button">Delete</button></td>
        </tr>`;

    document
        .getElementById("hotelsTableBody")
        .insertAdjacentHTML("beforeend", newRow);

    // Hide the modal and reset form fields
    $("#hotelModal").modal("hide");
    document.getElementById("hotelBookingForm").reset();
    });

// Calculate nights automatically when Check-Out date is selected
document
    .getElementById("checkOutDate")
    .addEventListener("change", function () {
    const checkIn = new Date(
        document.getElementById("checkInDate").value
    );
    const checkOut = new Date(this.value);
    if (checkOut > checkIn) {
        const diffTime = Math.abs(checkOut - checkIn);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        document.getElementById("numberOfNights").value = diffDays;
    } else {
        alert("Check-Out date must be later than Check-In date.");
        this.value = "";
    }
    });

// Handle add hotel button click without triggering form validation
document
    .getElementById("addHotelBtn")
    .addEventListener("click", function (event) {
    event.preventDefault(); // Prevent form validation and submission
    $("#hotelModal").modal("show");
    });

// Handle edit and delete button clicks for hotels
document.getElementById("hotelsTableBody").addEventListener("click", function (event) {
  const row = event.target.closest("tr");
  if (!row) return;

  const rowIndex = row.rowIndex - 1;
  const rowData = hotelsArray[rowIndex];
  if (!rowData) return;

  if (event.target.classList.contains("editBtn") || event.target.closest(".editBtn")) {
    console.log("Editing hotel:", rowData);

    // Set editing flag to prevent auto-Thailand selection
    isEditingHotel = true;

    // Set other fields immediately (non-location fields)
    document.getElementById("checkInDate").value = rowData.checkInDate;
    document.getElementById("checkOutDate").value = rowData.checkOutDate;
    document.getElementById("roomType").value = rowData.roomType;
    document.getElementById("promotion").value = rowData.promotion;
    document.getElementById("freeNights").value = rowData.freeNights || "0";
    document.getElementById("compulsoryAbf").checked = rowData.compulsoryAbf === "Yes";
    document.getElementById("discountPercent").value = rowData.discountPercent || "0";
    document.getElementById("singleRooms").value = rowData.singleRooms || "0";
    document.getElementById("doubleRooms").value = rowData.doubleRooms || "0";
    document.getElementById("earlyCheckIn").checked = rowData.earlyCheckIn === "Yes";
    document.getElementById("lateCheckOut").checked = rowData.lateCheckOut === "Yes";
    document.getElementById("dayUse").checked = rowData.dayUse === "Yes";
    document.getElementById("extraAdultBed").checked = rowData.extraAdultBed === "Yes";
    document.getElementById("extraChildBed").checked = rowData.extraChildBed === "Yes";
    document.getElementById("sharingBed").checked = rowData.sharingBed === "Yes";
    document.getElementById("mealAbf").checked = rowData.mealAbf === "Yes";
    document.getElementById("mealLunch").checked = rowData.mealLunch === "Yes";
    document.getElementById("mealDinner").checked = rowData.mealDinner === "Yes";
    document.getElementById("reservationIn").value = rowData.reservationIn;
    document.getElementById("reservationOut").value = rowData.reservationOut;
    document.getElementById("paymentDate").value = rowData.paymentDate;
    document.getElementById("notes").value = rowData.notes;

    editingRow = row;

    // Show modal first, then handle location setup
    $("#hotelModal").modal("show");

    // Wait for modal to be fully shown, then set up location fields
    $("#hotelModal").one("shown.bs.modal", function() {
      console.log("Hotel modal shown, setting up location fields for edit");
      
      // Clear any existing selections first
      const countryDropdown = document.getElementById("hotelCountry");
      const cityDropdown = document.getElementById("hotelCity");
      
      if (countryDropdown) countryDropdown.value = "";
      if (cityDropdown) cityDropdown.innerHTML = '<option value="" disabled selected>Loading...</option>';

      // Now set up the location fields with proper coordination
      if (typeof LocationCache !== 'undefined' && rowData.city) {
        console.log("LocationCache is available, finding country for city:", rowData.city);
        
        LocationCache.findCountryForCity(rowData.city).then(countryCode => {
          console.log("findCountryForCity result:", countryCode);
          
          if (countryCode && countryDropdown) {
            console.log(`Found country ${countryCode} for city ${rowData.city}`);
            console.log("Setting hotel country dropdown to:", countryCode);
            
            // Set country first
            countryDropdown.value = countryCode;
            
            // Load cities for this country
            console.log("Calling populateCitiesDropdown for country:", countryCode);
            LocationCache.populateCitiesDropdown(countryCode, "hotelCity").then(() => {
              console.log("Cities populated successfully, now setting city to:", rowData.city);
              
              // Use requestAnimationFrame for better timing instead of setTimeout
              requestAnimationFrame(() => {
                const cityDropdown = document.getElementById("hotelCity");
                console.log("Hotel city dropdown element:", cityDropdown);
                
                if (cityDropdown) {
                  console.log("Available city options:", Array.from(cityDropdown.options).map(opt => opt.value));
                  
                  // Set the city value
                  cityDropdown.value = rowData.city;
                  console.log("Set hotel city dropdown value to:", cityDropdown.value);
                  
                  // Verify the selection worked
                  if (cityDropdown.value === rowData.city) {
                    console.log("✅ Hotel city selection successful!");
                  } else {
                    console.warn("❌ Hotel city selection failed, trying alternative approach");
                    
                    // Try to find the option by text content
                    const options = Array.from(cityDropdown.options);
                    const matchingOption = options.find(opt => 
                      opt.textContent.toLowerCase() === rowData.city.toLowerCase() ||
                      opt.value.toLowerCase() === rowData.city.toLowerCase()
                    );
                    
                    if (matchingOption) {
                      matchingOption.selected = true;
                      console.log("✅ Hotel city selection successful via text matching!");
                    } else {
                      console.error("❌ Could not find matching hotel city option");
                    }
                  }
                  
                  // Trigger change event to load hotels
                  cityDropdown.dispatchEvent(new Event('change', { bubbles: true }));
                  
                  // Set hotel after a short delay to allow hotels to load
                  setTimeout(() => {
                    const hotelDropdown = document.getElementById("hotelType");
                    console.log("Setting hotel dropdown");
                    
                    if (hotelDropdown) {
                      console.log("Available hotel options:", Array.from(hotelDropdown.options).map(opt => opt.textContent));
                      
                      for (let option of hotelDropdown.options) {
                        if (option.textContent.trim() === rowData.hotel.trim()) {
                          option.selected = true;
                          console.log("Selected hotel:", option.textContent);
                          break;
                        }
                      }
                      
                      // If not found, try again after a bit more time
                      if (!hotelDropdown.value) {
                        console.warn("Hotel not found, trying again in 500ms");
                        setTimeout(() => {
                          for (let option of hotelDropdown.options) {
                            if (option.textContent.trim() === rowData.hotel.trim()) {
                              option.selected = true;
                              console.log("Selected hotel (retry):", option.textContent);
                              break;
                            }
                          }
                        }, 500);
                      }
                    }
                    
                    // Clear editing flag
                    isEditingHotel = false;
                  }, 300);
                }
              });
            }).catch(error => {
              console.error("Error populating hotel cities:", error);
              // Fallback: set city directly
              if (cityDropdown) {
                cityDropdown.innerHTML = `<option value="${rowData.city}" selected>${rowData.city}</option>`;
              }
              isEditingHotel = false;
            });
          } else {
            console.warn(`Could not find country for city: ${rowData.city} or country dropdown not found`);
            // Fallback: set city directly
            if (cityDropdown) {
              cityDropdown.innerHTML = `<option value="${rowData.city}" selected>${rowData.city}</option>`;
            }
            isEditingHotel = false;
          }
        }).catch(error => {
          console.error("Error in findCountryForCity:", error);
          // Fallback: set city directly
          if (cityDropdown) {
            cityDropdown.innerHTML = `<option value="${rowData.city}" selected>${rowData.city}</option>`;
          }
          isEditingHotel = false;
        });
      } else {
        console.warn("LocationCache not available or no city, setting city directly");
        // Fallback: set city directly
        if (cityDropdown) {
          cityDropdown.innerHTML = `<option value="${rowData.city}" selected>${rowData.city}</option>`;
        }
        isEditingHotel = false;
      }
    });
  }

  if (event.target.classList.contains("deleteBtn") || event.target.closest(".deleteBtn")) {
    if (confirm("Are you sure you want to delete this hotel booking?")) {
      hotelsArray.splice(rowIndex, 1);
      row.remove();
      console.log("Hotel deleted:", rowData);
    }
  }
});

// Make isEditingHotel available globally so add_trip.html can check it
window.isEditingHotel = () => isEditingHotel;
