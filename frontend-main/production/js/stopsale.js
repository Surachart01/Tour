document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  let selectedHotel = null; // Define selectedHotel globally

  // Fetch cities from the backend and populate the dropdown
  fetch(`${Endpoint}/api/v1/cities`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        if (response.status === 401) {
          // Handle 401 Unauthorized
          alert("Unauthorized. Please log in again.");
          window.location.href = "login.html"; // Redirect to login page
        } else if (response.status === 403) {
          // Handle 403 Forbidden
          alert(
            "You don't have sufficient permissions to perform this action."
          );
          return;
        } else {
          throw new Error("Failed to load cities");
        }
      }
      return response.json();
    })
    .then((cities) => {
      const dropdownMenu = document.getElementById("cityDropdownMenu");
      dropdownMenu.innerHTML = ""; // Clear the current dropdown

      cities.forEach((city) => {
        const cityItem = document.createElement("a");
        cityItem.className = "dropdown-item";
        cityItem.href = "#";
        cityItem.textContent = city;
        cityItem.onclick = function () {
          document.getElementById("citySearchInput").value = city;
          displayHotels(city); // Display hotels for the selected city
          dropdownMenu.classList.remove("show"); // Hide the dropdown after selection
        };
        dropdownMenu.appendChild(cityItem);
      });
    })
    .catch((error) => {
      console.error("Error fetching cities:", error);
      alert("Failed to load cities. Please try again later.");
    });

  // Function to display hotels associated with the selected city
  function displayHotels(city) {
    fetch(`${Endpoint}/api/v1/hotels?city=${encodeURIComponent(city)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            // Handle 401 Unauthorized
            alert("Unauthorized. Please log in again.");
            window.location.href = "login.html"; // Redirect to login page
          } else if (response.status === 403) {
            // Handle 403 Forbidden
            alert(
              "You don't have sufficient permissions to perform this action."
            );
            return;
          } else {
            throw new Error("Failed to load hotels");
          }
        }
        return response.json();
      })
      .then((hotels) => {
        const hotelList = document.getElementById("hotelList");
        hotelList.innerHTML = ""; // Clear the current hotel list

        if (hotels.length > 0) {
          hotels.forEach((hotel) => {
            const hotelItem = document.createElement("li");
            hotelItem.className = "list-group-item list-group-item-action";
            hotelItem.textContent = hotel.name;
            hotelItem.addEventListener("click", () => {
              selectedHotel = hotel; // Set selectedHotel when a hotel is clicked
              displayRoomTypesInBox(hotel);
            });
            hotelList.appendChild(hotelItem);
          });
        } else {
          hotelList.innerHTML =
            '<li class="list-group-item">No hotels found</li>';
        }
      })
      .catch((error) => {
        console.error("Error fetching hotels:", error);
        alert("Failed to load hotels. Please try again later.");
      });
  }

  // Function to display room types for the selected hotel
  function displayRoomTypesInBox(hotel) {
    const roomTypeSection = document.getElementById("roomTypeSection");
    const roomTypeList = document.getElementById("roomTypeList");
    roomTypeList.innerHTML = ""; // Clear the current room type list

    hotel.room_types.forEach((room) => {
      const roomItem = document.createElement("li");
      roomItem.className = "list-group-item";

      // Create checkbox
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `roomTypeCheckbox${room.id}`;
      checkbox.value = room.id;
      checkbox.className = "mr-2";

      // Add checkbox and room name to list item
      roomItem.appendChild(checkbox);
      roomItem.appendChild(document.createTextNode(room.name));

      roomTypeList.appendChild(roomItem);
    });

    // Add a button to open the modal
    const buttonWrapper = document.createElement("div");
    buttonWrapper.className = "mt-3 text-right";
    const stopSaleButton = document.createElement("button");
    stopSaleButton.className = "btn btn-primary";
    stopSaleButton.textContent = "Stop Sale";
    stopSaleButton.onclick = function () {
      $("#stopSaleModal").modal("show");

      // Initialize the datepicker inside the modal after it is shown
      $(".datepicker").datepicker({
        format: "yyyy-mm-dd",
        autoclose: true,
        todayHighlight: true,
        orientation: "bottom auto",
        templates: {
          leftArrow: "&laquo;",
          rightArrow: "&raquo;",
        },
      });
    };
    buttonWrapper.appendChild(stopSaleButton);
    roomTypeList.appendChild(buttonWrapper);

    roomTypeSection.style.display = "block"; // Show the room type section
  }

  // Function to validate that "To Date" is greater than "From Date"
  function validateDates() {
    const fromDate = $("#fromDate").datepicker("getDate");
    const toDate = $("#toDate").datepicker("getDate");

    if (fromDate && toDate && toDate <= fromDate) {
      alert('The "To Date" must be greater than the "From Date".');
      return false;
    }
    return true;
  }

  // Send stop sale request to backend
  document
    .getElementById("applyStopSaleButton")
    .addEventListener("click", function () {
      if (validateDates()) {
        sendStopSaleRequest(true);
      }
    });

  // Send start sale request to backend
  document
    .getElementById("applyStartSaleButton")
    .addEventListener("click", function () {
      if (validateDates()) {
        sendStopSaleRequest(false);
      }
    });

  // Function to send stop/start sale request to the backend
  function sendStopSaleRequest(isStopSale) {
    if (!selectedHotel) {
      alert("Please select a hotel.");
      return;
    }

    const selectedRoomTypeIds = Array.from(
      document.querySelectorAll('#roomTypeList input[type="checkbox"]:checked')
    ).map((cb) => parseInt(cb.value));

    if (selectedRoomTypeIds.length === 0) {
      alert("Please select at least one room type.");
      return;
    }

    const stopSaleRequest = {
      hotel_id: selectedHotel.id,
      room_type_ids: selectedRoomTypeIds,
      start_date: $("#fromDate").datepicker("getDate").toISOString(),
      end_date: $("#toDate").datepicker("getDate").toISOString(),
      stopped: isStopSale,
    };

    // Debugging: Log the stopSaleRequest object
    console.log("Sending stopSaleRequest:", stopSaleRequest);

    fetch(`${Endpoint}/api/v1/stop-sales`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stopSaleRequest),
    })
      .then((response) => {
        if (!response.ok) {
          if (response.status === 401) {
            // Handle 401 Unauthorized
            alert("Unauthorized. Please log in again.");
            window.location.href = "login.html"; // Redirect to login page
          } else if (response.status === 403) {
            // Handle 403 Forbidden
            alert(
              "You don't have sufficient permissions to perform this action."
            );
            return;
          } else {
            return response.text().then((text) => {
              throw new Error(text);
            });
          }
        }
        alert(
          isStopSale
            ? "Stop sale applied successfully!"
            : "Start sale applied successfully!"
        );
        $("#stopSaleModal").modal("hide");
      })
      .catch((error) => {
        console.error("Error applying stop sale:", error);
        alert(`Failed to apply stop sale: ${error.message}`);
      });
  }

  // Real-time search for hotels as the user types
  document
    .getElementById("hotelSearchInput")
    .addEventListener("input", function () {
      const city = document.getElementById("citySearchInput").value;
      const query = this.value.toLowerCase();
      const hotelList = document.getElementById("hotelList");
      hotelList.innerHTML = ""; // Clear the current hotel list

      if (hotels[city]) {
        const filteredHotels = hotels[city].filter((hotel) =>
          hotel.toLowerCase().includes(query)
        );
        if (filteredHotels.length > 0) {
          filteredHotels.forEach((hotel) => {
            const hotelItem = document.createElement("li");
            hotelItem.className = "list-group-item list-group-item-action";
            hotelItem.textContent = hotel;
            hotelItem.addEventListener("click", () =>
              displayRoomTypesInBox(hotel)
            );
            hotelList.appendChild(hotelItem);
          });
        } else {
          hotelList.innerHTML =
            '<li class="list-group-item">No hotels found</li>';
        }
      }
    });
  // Retrieve the username from localStorage
  const username = localStorage.getItem("username");

  // Set the username in the profile info
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;
});
