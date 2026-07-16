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
  document.getElementById("filterRateSeason").addEventListener("change", function () {
    annotateHotelsWithRateStatus();
    filterTable();
  });
  document.getElementById("filterRateStatus").addEventListener("change", filterTable);

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
let selectedRateSeasonStartYear = new Date().getFullYear();

const RATE_STATUS_CONFIG = {
  updated: {
    label: "Updated",
    className: "rate-status-updated",
    rowClassName: "hotel-rate-updated",
  },
  review: {
    label: "Needs Review",
    className: "rate-status-review",
    rowClassName: "hotel-rate-review",
  },
  pending: {
    label: "Pending",
    className: "rate-status-pending",
    rowClassName: "hotel-rate-pending",
  },
};

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  const dmy = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toUtcDay(date) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
}

function getSeasonRange(startYear) {
  const start = new Date(Date.UTC(startYear, 10, 1));
  const end = new Date(Date.UTC(startYear + 1, 9, 31));
  return {
    start,
    end,
    startDay: toUtcDay(start),
    endDay: toUtcDay(end),
    label: `${startYear}/${startYear + 1}`,
  };
}

function formatDateDisplay(value) {
  const date = parseDate(value);
  if (!date) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getNumericRate(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasRoomRate(roomType) {
  return [
    roomType.single_price,
    roomType.double_price,
  ].some((value) => getNumericRate(value) > 0);
}

function mergeIntervals(intervals) {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];

  for (const interval of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (interval.start <= last.end + 1) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

function computeRateStatus(hotel, seasonStartYear) {
  const season = getSeasonRange(seasonStartYear);
  const roomTypes = hotel.room_types || hotel.roomTypes || [];
  const overlappingRows = [];
  const pricedIntervals = [];
  let latestRateUpdate = null;

  roomTypes.forEach((roomType) => {
    const start = parseDate(roomType.start_date || roomType.fromDate);
    const end = parseDate(roomType.end_date || roomType.toDate);
    if (!start || !end) return;

    const startDay = toUtcDay(start);
    const endDay = toUtcDay(end);
    if (endDay < season.startDay || startDay > season.endDay) return;

    overlappingRows.push(roomType);

    const updatedAt = parseDate(roomType.updated_at || roomType.updatedAt);
    if (updatedAt && (!latestRateUpdate || updatedAt > latestRateUpdate)) {
      latestRateUpdate = updatedAt;
    }

    if (hasRoomRate(roomType)) {
      pricedIntervals.push({
        start: Math.max(startDay, season.startDay),
        end: Math.min(endDay, season.endDay),
      });
    }
  });

  if (!latestRateUpdate) {
    latestRateUpdate = parseDate(hotel.updated_at || hotel.updatedAt);
  }

  if (!overlappingRows.length) {
    return {
      key: "pending",
      label: `Pending ${season.label}`,
      season: season.label,
      lastRateUpdate: latestRateUpdate,
      coverageText: "No rates entered for this season",
    };
  }

  const merged = mergeIntervals(pricedIntervals);
  const coveredDays = merged.reduce((sum, interval) => sum + (interval.end - interval.start + 1), 0);
  const totalDays = season.endDay - season.startDay + 1;
  const coveragePercent = Math.min(100, Math.round((coveredDays / totalDays) * 100));

  if (coveragePercent >= 100) {
    return {
      key: "updated",
      label: `Updated ${season.label}`,
      season: season.label,
      lastRateUpdate: latestRateUpdate,
      coverageText: "Full season covered",
    };
  }

  return {
    key: "review",
    label: `Needs Review ${season.label}`,
    season: season.label,
    lastRateUpdate: latestRateUpdate,
    coverageText: `${coveragePercent}% of season covered`,
  };
}

function annotateHotelsWithRateStatus() {
  const seasonSelect = document.getElementById("filterRateSeason");
  selectedRateSeasonStartYear = parseInt(seasonSelect?.value, 10) || new Date().getFullYear();
  hotelsData = hotelsData.map((hotel) => ({
    ...hotel,
    rateStatus: computeRateStatus(hotel, selectedRateSeasonStartYear),
  }));
}

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
      const hotelList = window.ApiResponse.list(hotels, ["hotels", "data", "items", "results"]);
      if (hotelList.length === 0) {
        console.log("No hotels found.");
        hotelsData = [];
        filteredHotelsData = [];
        totalPages = 1;
        updateHotelsCount();
        renderTable();
        return; // Exit if there are no hotels
      }
      hotelsData = hotelList;
      populateRateSeasonFilter(hotelList);
      annotateHotelsWithRateStatus();
      filteredHotelsData = hotelsData; // Initially, filtered data is the same as the original data
      totalPages = Math.ceil(hotelList.length / rowsPerPage) || 1;
      populateFilters(hotelList);
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
    const status = hotel.rateStatus || computeRateStatus(hotel, selectedRateSeasonStartYear);
    const statusConfig = RATE_STATUS_CONFIG[status.key] || RATE_STATUS_CONFIG.pending;

    row.classList.add(statusConfig.rowClassName);

    row.innerHTML = `
      <td>${hotel.display_order ?? 0}</td>
      <td>${hotel.name}</td>
      <td>${hotel.city}</td>
      <td>${status.season}</td>
      <td>
        <span class="rate-status-badge ${statusConfig.className}" title="${status.coverageText}">
          ${statusConfig.label}
        </span>
        <div class="rate-status-note">${status.coverageText}</div>
      </td>
      <td>${formatDateDisplay(status.lastRateUpdate)}</td>
      <td><button class="btn btn-primary btn-sm edit-btn" data-id="${hotel.id}"><i class="fa fa-edit"></i> Edit</button></td>
      <td><button class="btn btn-success btn-sm clone-btn" data-id="${hotel.id}"><i class="fa fa-copy"></i> Clone</button></td>
      <td><button class="btn btn-danger btn-sm delete-btn" data-id="${hotel.id}"><i class="fa fa-trash"></i> Delete</button></td>
    `;

    hotelTableBody.appendChild(row);
  });

  updatePaginationButtons();

  // Add event listeners for the edit, clone and delete buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const hotelId = this.getAttribute("data-id");
      window.location.href = `edit_hotel.html?id=${hotelId}`;
    });
  });

  document.querySelectorAll(".clone-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const hotelId = this.getAttribute("data-id");
      window.location.href = `edit_hotel.html?id=${hotelId}&clone=true`;
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

function populateRateSeasonFilter(dataList) {
  const filterRateSeason = document.getElementById("filterRateSeason");
  if (!filterRateSeason) return;

  const selectedValue = filterRateSeason.value;
  const currentYear = new Date().getFullYear();
  const years = new Set([currentYear - 1, currentYear, currentYear + 1, currentYear + 2]);

  dataList.forEach((hotel) => {
    (hotel.room_types || hotel.roomTypes || []).forEach((roomType) => {
      const start = parseDate(roomType.start_date || roomType.fromDate);
      const end = parseDate(roomType.end_date || roomType.toDate);
      [start, end].forEach((date) => {
        if (date) {
          const year = date.getUTCMonth() >= 10 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
          years.add(year);
        }
      });
    });
  });

  const sortedYears = [...years].sort((a, b) => b - a);
  filterRateSeason.innerHTML = sortedYears
    .map((year) => `<option value="${year}">${year}/${year + 1}</option>`)
    .join("");

  if (selectedValue && sortedYears.includes(parseInt(selectedValue, 10))) {
    filterRateSeason.value = selectedValue;
  } else if (sortedYears.includes(currentYear)) {
    filterRateSeason.value = String(currentYear);
  } else {
    filterRateSeason.value = String(sortedYears[0]);
  }
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
  const selectedRateStatus = document.getElementById("filterRateStatus").value;
  const searchValue = document.getElementById("searchBox").value.toLowerCase();

  // Filter the hotelsData based on the search values
  filteredHotelsData = hotelsData.filter((hotel) => {
    // Country filter
    const matchCountry = selectedCountry === "All" || (hotel.country || "Thailand") === selectedCountry;
    
    // City filter
    const matchCity = selectedCity === "All" || hotel.city === selectedCity;

    // Rate status filter
    const status = hotel.rateStatus || computeRateStatus(hotel, selectedRateSeasonStartYear);
    const matchRateStatus = selectedRateStatus === "All" || status.key === selectedRateStatus;

    // Keyword filter
    const matchKeyword = !searchValue ||
      hotel.name.toLowerCase().includes(searchValue) ||
      hotel.city.toLowerCase().includes(searchValue) ||
      (hotel.address || "").toLowerCase().includes(searchValue) ||
      (hotel.notes || "").toLowerCase().includes(searchValue) ||
      (status.label || "").toLowerCase().includes(searchValue);

    return matchCountry && matchCity && matchRateStatus && matchKeyword;
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
