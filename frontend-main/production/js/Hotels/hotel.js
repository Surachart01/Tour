document
  .getElementById("addHotelButton")
  .addEventListener("click", function () {
    window.location.href = "add_hotel.html";
  });

document.addEventListener("DOMContentLoaded", function () {
  loadHotels();

  document.getElementById("nextPage").addEventListener("click", nextPage);
  document.getElementById("prevPage").addEventListener("click", prevPage);

  // Add event listener for search triggers
  document.getElementById("btnFilterSearch").addEventListener("click", filterTable);
  document.getElementById("searchBox").addEventListener("keyup", filterTable);

  document.getElementById("filterCountry").addEventListener("change", function() {
    populateCities(this.value);
    filterTable();
  });
  document.getElementById("filterCity").addEventListener("change", filterTable);

  // Add event listener for changing the number of rows per page
  document.getElementById("rowsSelect").addEventListener("change", function () {
    rowsPerPage =
      this.value === "All" ? filteredHotelsData.length : parseInt(this.value);
    currentPage = 1; // Reset to first page
    renderTable();
  });
});

let currentPage = 1;
let rowsPerPage = 25;
let totalPages = 1;
let hotelsData = [];
let filteredHotelsData = [];

// Function to load hotels
function loadHotels() {
  fetch(`${Endpoint}/api/v1/hotels`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`, // Make sure 'token' is defined and valid
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
          return response.text().then((errorMessage) => {
            // If the error message is empty, use a default message
            if (!errorMessage) {
              errorMessage = "Failed to load hotel data";
            }
            throw new Error(errorMessage); // Throw the error with the message
          });
        }
      }
      return response.json();
    })
    .then((hotels) => {
      if (!hotels || hotels.length === 0) {
        console.log("No hotels found.");
        return; // Exit if there are no hotels
      }
      hotelsData = hotels;
      filteredHotelsData = hotels; // Initially, filtered data is the same as the original data
      totalPages = Math.ceil(hotels.length / rowsPerPage) || 1;
      populateFilters(hotels);
      updateHotelsCount();
      renderTable();
    })
    .catch((error) => {
      console.error("Error fetching hotels:", error);
      alert(error.message);
    });
}

// Function to render the table
function renderTable() {
  const hotelTableBody = document.getElementById("hotelTableBody");
  hotelTableBody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const end = Math.min(start + rowsPerPage, filteredHotelsData.length);
  const rowsToShow = filteredHotelsData.slice(start, end);

  rowsToShow.forEach((hotel) => {
    const row = document.createElement("tr");

    // Check if roomTypeEmpty is true, apply color
    if (hotel.empty) {
      row.style.backgroundColor = "#FFD580";
    }

    row.innerHTML = `
      <td>${hotel.name}</td>
      <td>${hotel.city}</td>
      <td><button class="btn btn-primary btn-sm edit-btn" data-id="${hotel.id}"><i class="fa fa-edit"></i> Edit</button></td>
      <td><button class="btn btn-danger btn-sm delete-btn" data-id="${hotel.id}"><i class="fa fa-trash"></i> Delete</button></td>
    `;

    hotelTableBody.appendChild(row);
  });

  updatePaginationButtons();

  // Add event listeners for the edit and delete buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const hotelId = this.getAttribute("data-id");
      window.location.href = `edit_hotel.html?id=${hotelId}`;
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      if (confirm("Are you sure you want to delete this Hotel?")) {
        const hotelId = this.getAttribute("data-id");

        // Call function to delete hotel by ID
        deleteHotel(hotelId);
      }
    });
  });
}

// Update pagination buttons based on current page
function updatePaginationButtons() {
  document.getElementById("prevPage").disabled = currentPage === 1;
  document.getElementById("nextPage").disabled = currentPage === totalPages;
}

// Function to move to the next page
function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
  }
}

// Function to move to the previous page
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
  }
}

// Function to delete a hotel by ID
function deleteHotel(hotelId) {
  fetch(`${Endpoint}/api/v1/hotels/${hotelId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`, // Ensure the 'token' is valid and defined
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
          return response.text().then((errorMessage) => {
            // If the error message is empty, use a default message
            if (!errorMessage) {
              errorMessage = "Failed to delete hotel";
            }
            throw new Error(errorMessage); // Throw the error with the message
          });
        }
      }
      // Reload the hotels list after deletion
      loadHotels();
    })
    .catch((error) => {
      console.error("Error deleting hotel:", error);
      alert(error.message);
    });
}

// Populate unique countries and cities filters
function populateFilters(dataList) {
  const filterCountry = document.getElementById("filterCountry");
  const filterCity = document.getElementById("filterCity");

  // Save selected values to restore them
  const selectedCountry = filterCountry.value;
  const selectedCity = filterCity.value;

  // Unique countries
  const countries = [...new Set(dataList.map(item => item.country || "Thailand"))].sort();
  filterCountry.innerHTML = `<option value="All">All Countries</option>` + 
    countries.map(c => `<option value="${c}">${c}</option>`).join("");

  // Unique cities
  const cities = [...new Set(dataList.map(item => item.city || ""))].filter(Boolean).sort();
  filterCity.innerHTML = `<option value="All">All Cities</option>` + 
    cities.map(c => `<option value="${c}">${c}</option>`).join("");

  // Restore previous selections if they still exist
  if (countries.includes(selectedCountry)) filterCountry.value = selectedCountry;
  populateCities(filterCountry.value);
  if (cities.includes(selectedCity)) filterCity.value = selectedCity;
}

// Dynamically populate cities based on selected country
function populateCities(country) {
  const filterCity = document.getElementById("filterCity");
  const selectedCity = filterCity.value;

  let filteredData = hotelsData;
  if (country && country !== "All") {
    filteredData = hotelsData.filter(item => (item.country || "Thailand") === country);
  }

  const cities = [...new Set(filteredData.map(item => item.city || ""))].filter(Boolean).sort();
  filterCity.innerHTML = `<option value="All">All Cities</option>` + 
    cities.map(c => `<option value="${c}">${c}</option>`).join("");

  if (cities.includes(selectedCity)) {
    filterCity.value = selectedCity;
  } else {
    filterCity.value = "All";
  }
}

// Function to filter the table based on search inputs
function filterTable() {
  const selectedCountry = document.getElementById("filterCountry").value;
  const selectedCity = document.getElementById("filterCity").value;
  const searchValue = document.getElementById("searchBox").value.toLowerCase();

  // Filter the hotelsData based on the search values
  filteredHotelsData = hotelsData.filter((hotel) => {
    // Country filter
    const matchCountry = selectedCountry === "All" || (hotel.country || "Thailand") === selectedCountry;
    
    // City filter
    const matchCity = selectedCity === "All" || hotel.city === selectedCity;

    // Keyword filter
    const matchKeyword = !searchValue ||
      hotel.name.toLowerCase().includes(searchValue) ||
      hotel.city.toLowerCase().includes(searchValue) ||
      (hotel.address || "").toLowerCase().includes(searchValue) ||
      (hotel.notes || "").toLowerCase().includes(searchValue);

    return matchCountry && matchCity && matchKeyword;
  });

  currentPage = 1; // Reset to the first page on search
  totalPages = Math.ceil(filteredHotelsData.length / rowsPerPage) || 1;

  // Update count and render the filtered table
  updateHotelsCount();
  renderTable();
}

// Retrieve the username from localStorage
const username = localStorage.getItem("username");

// Set the username in the profile info
document.getElementById("profileName").innerText = username;
document.getElementById("navProfileName").innerText = username;

// Function to update the hotels count display
function updateHotelsCount() {
  const hotelsCountElement = document.getElementById("hotelsCount");
  if (hotelsCountElement) {
    const totalCount = hotelsData.length;
    const filteredCount = filteredHotelsData.length;
    
    if (filteredCount === totalCount) {
      hotelsCountElement.textContent = totalCount;
    } else {
      hotelsCountElement.textContent = `${filteredCount} of ${totalCount}`;
    }
  }
}
