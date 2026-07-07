document.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  let selectedHotel = null;
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth(); // 0-indexed
  let stopSaleEvents = [];
  
  let uploadedAttachmentUrl = null;
  let uploadedAttachmentName = null;

  // Fetch cities from the backend and populate the search autocomplete list
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
          alert("Unauthorized. Please log in again.");
          window.location.href = "login.html";
        } else {
          throw new Error("Failed to load cities");
        }
      }
      return response.json();
    })
    .then((data) => {
      let citiesList = [];
      if (Array.isArray(data)) {
        citiesList = data;
      } else if (data && data.cities && Array.isArray(data.cities)) {
        citiesList = data.cities;
      }
      
      const cityNames = citiesList.map(c => {
        if (typeof c === 'string') return c;
        if (c && typeof c === 'object') {
          return c.city || c.name || c.city_name || '';
        }
        return '';
      }).filter(name => name && name.trim() !== '');

      window.allCities = [...new Set(cityNames)];
      populateCitiesDropdown(window.allCities);
      populateTourCitiesDropdown(window.allCities);
      populatePkgCitiesDropdown(window.allCities);
    })
    .catch((error) => {
      console.error("Error fetching cities:", error);
      alert("Failed to load cities. Please try again later.");
    });

  function populateCitiesDropdown(cities) {
    const dropdownMenu = document.getElementById("cityDropdownMenu");
    dropdownMenu.innerHTML = ""; // Clear

    if (cities.length === 0) {
      dropdownMenu.innerHTML = '<li class="list-group-item text-muted">No cities found</li>';
      return;
    }

    cities.forEach((city) => {
      const cityItem = document.createElement("li");
      cityItem.className = "list-group-item list-group-item-action";
      cityItem.textContent = city;
      cityItem.style.cursor = "pointer";
      cityItem.addEventListener("click", () => {
        document.getElementById("citySearchInput").value = city;
        dropdownMenu.style.display = "none";
        displayHotels(city); // Display hotels for the selected city
      });
      dropdownMenu.appendChild(cityItem);
    });
  }

  // Real-time search for cities as the user types
  document.getElementById("citySearchInput").addEventListener("input", function () {
    const query = this.value.toLowerCase();
    const dropdownMenu = document.getElementById("cityDropdownMenu");
    dropdownMenu.style.display = "block";

    if (window.allCities) {
      const filtered = window.allCities.filter(c => c.toLowerCase().includes(query));
      populateCitiesDropdown(filtered);
    }
  });

  // Focus triggers display of dropdown
  document.getElementById("citySearchInput").addEventListener("focus", function () {
    const dropdownMenu = document.getElementById("cityDropdownMenu");
    dropdownMenu.style.display = "block";
    
    // Populate with all if empty
    if (window.allCities) {
      populateCitiesDropdown(window.allCities);
    }
  });

  // Hide city dropdown menu on click outside
  document.addEventListener("click", function(e) {
    if (e.target.id !== "citySearchInput" && e.target.id !== "cityDropdownMenu") {
      const dropdownMenu = document.getElementById("cityDropdownMenu");
      if (dropdownMenu) dropdownMenu.style.display = "none";
    }
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
          throw new Error("Failed to load hotels");
        }
        return response.json();
      })
      .then((hotels) => {
        window.cityHotels = hotels;
        
        const hotelList = document.getElementById("hotelList");
        hotelList.innerHTML = "";
        hotelList.style.display = "block";

        if (hotels.length > 0) {
          hotels.forEach((hotel) => {
            const hotelItem = document.createElement("li");
            hotelItem.className = "list-group-item list-group-item-action";
            hotelItem.textContent = hotel.name;
            hotelItem.style.cursor = "pointer";
            hotelItem.addEventListener("click", () => {
              selectedHotel = hotel;
              document.getElementById("hotelSearchInput").value = hotel.name;
              hotelList.style.display = "none";
              displayRoomTypesInBox(hotel);
            });
            hotelList.appendChild(hotelItem);
          });
        } else {
          hotelList.innerHTML = '<li class="list-group-item">No hotels found</li>';
        }
      })
      .catch((error) => {
        console.error("Error fetching hotels:", error);
        alert("Failed to load hotels. Please try again later.");
      });
  }

  // Real-time search for hotels as the user types
  document
    .getElementById("hotelSearchInput")
    .addEventListener("input", function () {
      const city = document.getElementById("citySearchInput").value;
      const query = this.value.toLowerCase();
      const hotelList = document.getElementById("hotelList");
      hotelList.innerHTML = "";

      if (!city) {
        alert("Please select a city first.");
        this.value = "";
        return;
      }

      hotelList.style.display = "block";

      if (window.cityHotels) {
        const filteredHotels = window.cityHotels.filter((hotel) =>
          hotel.name.toLowerCase().includes(query)
        );
        if (filteredHotels.length > 0) {
          filteredHotels.forEach((hotel) => {
            const hotelItem = document.createElement("li");
            hotelItem.className = "list-group-item list-group-item-action";
            hotelItem.textContent = hotel.name;
            hotelItem.style.cursor = "pointer";
            hotelItem.addEventListener("click", () => {
              selectedHotel = hotel;
              document.getElementById("hotelSearchInput").value = hotel.name;
              hotelList.style.display = "none";
              displayRoomTypesInBox(hotel);
            });
            hotelList.appendChild(hotelItem);
          });
        } else {
          hotelList.innerHTML = '<li class="list-group-item">No hotels found</li>';
        }
      }
    });

  // Hide hotel list dropdown on click outside
  document.addEventListener("click", function(e) {
    if (e.target.id !== "hotelSearchInput" && e.target.id !== "hotelList") {
      const list = document.getElementById("hotelList");
      if (list) list.style.display = "none";
    }
  });

  // Function to display room types for the selected hotel
  function displayRoomTypesInBox(hotel) {
    const roomTypeSection = document.getElementById("roomTypeSection");
    const roomTypeList = document.getElementById("roomTypeList");
    const calendarSection = document.getElementById("calendarSection");

    roomTypeList.innerHTML = "";

    if (hotel.room_types && hotel.room_types.length > 0) {
      // Group room types by name
      const groupedRoomTypes = {};
      hotel.room_types.forEach((room) => {
        const name = room.name || room.roomType;
        if (name) {
          if (!groupedRoomTypes[name]) {
            groupedRoomTypes[name] = [];
          }
          groupedRoomTypes[name].push(room.id);
        }
      });

      // Render grouped room types
      Object.keys(groupedRoomTypes).forEach((roomName, index) => {
        const ids = groupedRoomTypes[roomName];
        
        const col = document.createElement("div");
        col.className = "col-md-3 mt-2";
        
        const div = document.createElement("div");
        div.className = "custom-control custom-checkbox";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `roomTypeCheckbox_${index}`;
        checkbox.dataset.ids = ids.join(",");
        checkbox.className = "custom-control-input room-type-cb";
        checkbox.checked = true;
        
        // Re-render calendar when checkbox status changes
        checkbox.addEventListener("change", renderCalendar);
        
        const label = document.createElement("label");
        label.className = "custom-control-label";
        label.htmlFor = `roomTypeCheckbox_${index}`;
        label.style.cursor = "pointer";
        label.style.fontWeight = "600";
        label.textContent = roomName;
        
        div.appendChild(checkbox);
        div.appendChild(label);
        col.appendChild(div);
        roomTypeList.appendChild(col);
      });
      
      roomTypeSection.style.display = "block";
      calendarSection.style.display = "flex";
      
      // Fetch status and render the interactive calendar
      fetchAvailabilityAndRender();
    } else {
      roomTypeList.innerHTML = "<div class='col-12 text-muted'>No room types found for this hotel</div>";
      roomTypeSection.style.display = "block";
      calendarSection.style.display = "none";
    }
  }

  // Fetch stop sales and render calendar
  function fetchAvailabilityAndRender() {
    if (!selectedHotel) return;
    
    fetch(`${Endpoint}/api/v1/hotels/${selectedHotel.id}/availability`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        stopSaleEvents = data;
        renderCalendar();
      })
      .catch(err => {
        console.error("Error fetching availability:", err);
      });
  }

  // Render Month Calendar
  function renderCalendar() {
    const grid = document.getElementById("calendarGrid");
    const monthTitle = document.getElementById("calendarMonthTitle");
    if (!grid || !monthTitle) return;
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthTitle.textContent = `${months[currentMonth]} ${currentYear}`;
    
    grid.innerHTML = "";
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Offset first day of month
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement("div");
      grid.appendChild(cell);
    }
    
    // Checked room types
    const checkedRoomIds = [];
    document.querySelectorAll('#roomTypeList input.room-type-cb:checked').forEach(cb => {
      if (cb.dataset.ids) {
        const ids = cb.dataset.ids.split(',').map(id => parseInt(id, 10));
        checkedRoomIds.push(...ids);
      }
    });

    // Render cells
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(currentYear, currentMonth, day);
      cellDate.setHours(0,0,0,0);
      
      const cell = document.createElement("div");
      cell.style.padding = "10px 5px";
      cell.style.borderRadius = "8px";
      cell.style.cursor = "pointer";
      cell.style.fontSize = "14px";
      cell.style.fontWeight = "600";
      cell.style.textAlign = "center";
      cell.style.border = "1px solid #eef2f7";
      cell.style.position = "relative";
      
      const numSpan = document.createElement("span");
      numSpan.textContent = day;
      cell.appendChild(numSpan);
      
      let isStopped = false;
      if (checkedRoomIds.length > 0) {
        isStopped = stopSaleEvents.some(event => {
          if (!event.stopped) return false;
          if (!checkedRoomIds.includes(event.room_type_id)) return false;
          
          const start = new Date(event.start_date);
          const end = new Date(event.end_date);
          start.setHours(0,0,0,0);
          end.setHours(0,0,0,0);
          
          return cellDate >= start && cellDate <= end;
        });
      }
      
      if (isStopped) {
        cell.style.backgroundColor = "#fde8e8";
        cell.style.color = "#e74c3c";
        cell.style.borderColor = "#f5c6cb";
        
        const label = document.createElement("div");
        label.style.fontSize = "8px";
        label.style.fontWeight = "bold";
        label.style.color = "#c0392b";
        label.textContent = "STOP";
        cell.appendChild(label);
      } else {
        cell.style.backgroundColor = "#e8f7ec";
        cell.style.color = "#28a745";
        cell.style.borderColor = "#c3e6cb";
        
        const label = document.createElement("div");
        label.style.fontSize = "8px";
        label.style.fontWeight = "bold";
        label.style.color = "#28a745";
        label.textContent = "OPEN";
        cell.appendChild(label);
      }
      
      cell.addEventListener("click", () => {
        const dateString = cellDate.getFullYear() + "-" + String(cellDate.getMonth() + 1).padStart(2, "0") + "-" + String(cellDate.getDate()).padStart(2, "0");
        const fromInput = document.getElementById("fromDateInput");
        const toInput = document.getElementById("toDateInput");
        
        if (!fromInput.value || (fromInput.value && toInput.value)) {
          fromInput.value = dateString;
          toInput.value = "";
        } else {
          if (dateString < fromInput.value) {
            fromInput.value = dateString;
          } else {
            toInput.value = dateString;
          }
        }
        highlightSelectedDates();
      });
      
      grid.appendChild(cell);
    }
    highlightSelectedDates();
  }

  // Highlight range selection
  function highlightSelectedDates() {
    const fromVal = document.getElementById("fromDateInput").value;
    const toVal = document.getElementById("toDateInput").value;
    const grid = document.getElementById("calendarGrid");
    if (!grid) return;
    
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const cells = grid.children;
    
    for (let i = firstDay; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell.textContent || cell.children.length === 0) continue;
      const day = parseInt(cell.firstChild.textContent);
      const cellDate = new Date(currentYear, currentMonth, day);
      cellDate.setHours(0,0,0,0);
      const dateString = cellDate.getFullYear() + "-" + String(cellDate.getMonth() + 1).padStart(2, "0") + "-" + String(cellDate.getDate()).padStart(2, "0");
      
      cell.style.outline = "none";
      cell.style.boxShadow = "none";
      
      if (fromVal && dateString === fromVal) {
        cell.style.outline = "3px solid #007bff";
      } else if (toVal && dateString === toVal) {
        cell.style.outline = "3px solid #007bff";
      } else if (fromVal && toVal && dateString > fromVal && dateString < toVal) {
        cell.style.boxShadow = "inset 0 0 0 3px #007bff";
      }
    }
  }

  // Navigation listeners
  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });
  
  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  document.getElementById("fromDateInput").addEventListener("input", highlightSelectedDates);
  document.getElementById("toDateInput").addEventListener("input", highlightSelectedDates);

  // File Attachment Upload Logic
  const fileInput = document.getElementById("stopSaleFile");
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      const file = fileInput.files[0];
      if (!file) return;
      
      const label = document.getElementById("stopSaleFileLabel");
      if (label) label.textContent = "Uploading " + file.name + "...";
      
      const formData = new FormData();
      formData.append("file", file);
      
      fetch(`${Endpoint}/api/v1/files/upload/document`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })
        .then(res => {
          if (!res.ok) throw new Error("Upload failed");
          return res.json();
        })
        .then(data => {
          if (data.success && data.file_info) {
            uploadedAttachmentUrl = data.file_info.url;
            uploadedAttachmentName = data.file_info.original_name;
            if (label) label.textContent = "✓ " + data.file_info.original_name;
          } else {
            throw new Error("Invalid response format");
          }
        })
        .catch(err => {
          console.error("File upload error:", err);
          alert("File upload failed: " + err.message);
          if (label) label.textContent = "Choose file...";
          fileInput.value = "";
        });
    });
  }

  // Save changes actions
  document.getElementById("btnStopSale").addEventListener("click", () => {
    submitStopSaleAction(true);
  });
  
  document.getElementById("btnStartSale").addEventListener("click", () => {
    submitStopSaleAction(false);
  });
  
  function submitStopSaleAction(isStopSale) {
    if (!selectedHotel) {
      alert("Please select a hotel first.");
      return;
    }
    
    const checkedRoomIds = [];
    document.querySelectorAll('#roomTypeList input.room-type-cb:checked').forEach(cb => {
      if (cb.dataset.ids) {
        const ids = cb.dataset.ids.split(',').map(id => parseInt(id, 10));
        checkedRoomIds.push(...ids);
      }
    });
    
    if (checkedRoomIds.length === 0) {
      alert("Please select at least one room type.");
      return;
    }
    
    const fromDateVal = document.getElementById("fromDateInput").value;
    const toDateVal = document.getElementById("toDateInput").value;
    
    if (!fromDateVal || !toDateVal) {
      alert("Please select the date range.");
      return;
    }
    
    if (toDateVal < fromDateVal) {
      alert("To Date must be greater than or equal to From Date.");
      return;
    }
    
    const notifyAgents = document.getElementById("notifyAgentsCheckbox")?.checked || false;
    
    const payload = {
      hotel_id: selectedHotel.id,
      room_type_ids: checkedRoomIds,
      start_date: new Date(fromDateVal).toISOString(),
      end_date: new Date(toDateVal).toISOString(),
      stopped: isStopSale,
      notify_agents: notifyAgents,
      attachment_url: uploadedAttachmentUrl,
      attachment_name: uploadedAttachmentName
    };
    
    const targetBtn = isStopSale ? document.getElementById("btnStopSale") : document.getElementById("btnStartSale");
    const originalText = targetBtn.innerHTML;
    targetBtn.disabled = true;
    targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    
    fetch(`${Endpoint}/api/v1/stop-sales`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Failed to save changes");
        }
        return res.json();
      })
      .then(data => {
        alert(isStopSale ? "Stop Sale applied successfully!" : "Start Sale applied successfully!");
        
        fetchAvailabilityAndRender();
        
        document.getElementById("fromDateInput").value = "";
        document.getElementById("toDateInput").value = "";
        
        uploadedAttachmentUrl = null;
        uploadedAttachmentName = null;
        if (fileInput) fileInput.value = "";
        const label = document.getElementById("stopSaleFileLabel");
        if (label) label.textContent = "Choose file...";
      })
      .catch(err => {
        console.error("Error saving stop sale:", err);
        alert("Failed to save stop sale: " + err.message);
      })
      .finally(() => {
        targetBtn.disabled = false;
        targetBtn.innerHTML = originalText;
      });
  }

  // ==================== TOUR STOP SALES LOGIC ====================
  let selectedTour = null;
  let currentYearTour = new Date().getFullYear();
  let currentMonthTour = new Date().getMonth(); // 0-indexed
  let stopSaleEventsTour = [];
  let toursForSelectedCity = [];

  // Populate Tour Cities list
  function populateTourCitiesDropdown(cities) {
    const dropdownMenu = document.getElementById("tourCityDropdownMenu");
    dropdownMenu.innerHTML = ""; // Clear

    if (cities.length === 0) {
      dropdownMenu.innerHTML = '<li class="list-group-item text-muted">No cities found</li>';
      return;
    }

    cities.forEach((city) => {
      const cityItem = document.createElement("li");
      cityItem.className = "list-group-item list-group-item-action";
      cityItem.textContent = city;
      cityItem.style.cursor = "pointer";
      cityItem.addEventListener("click", () => {
        document.getElementById("tourCitySearchInput").value = city;
        dropdownMenu.style.display = "none";
        loadToursForCity(city); // Load tours for selected city
      });
      dropdownMenu.appendChild(cityItem);
    });
  }

  // Real-time search for tour cities
  document.getElementById("tourCitySearchInput").addEventListener("input", function () {
    const query = this.value.toLowerCase();
    const dropdownMenu = document.getElementById("tourCityDropdownMenu");
    dropdownMenu.style.display = "block";

    if (window.allCities) {
      const filtered = window.allCities.filter(c => c.toLowerCase().includes(query));
      populateTourCitiesDropdown(filtered);
    }
  });

  document.getElementById("tourCitySearchInput").addEventListener("focus", function () {
    const dropdownMenu = document.getElementById("tourCityDropdownMenu");
    dropdownMenu.style.display = "block";
    if (window.allCities) {
      populateTourCitiesDropdown(window.allCities);
    }
  });

  // Hide tour city dropdown menu on click outside
  document.addEventListener("click", function(e) {
    if (e.target.id !== "tourCitySearchInput" && e.target.id !== "tourCityDropdownMenu") {
      const dropdownMenu = document.getElementById("tourCityDropdownMenu");
      if (dropdownMenu) dropdownMenu.style.display = "none";
    }
  });

  // Load tours associated with the selected city
  function loadToursForCity(city) {
    fetch(`${Endpoint}/api/v1/tours?city=${encodeURIComponent(city)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load tours");
        return response.json();
      })
      .then((tours) => {
        toursForSelectedCity = tours;
        populateTourCategoryFilter(tours);
        displayToursList(tours);
      })
      .catch((error) => {
        console.error("Error fetching tours:", error);
        alert("Failed to load tours. Please try again later.");
      });
  }

  // Populate Categories in the dropdown filter
  function populateTourCategoryFilter(tours) {
    const catFilter = document.getElementById("tourCategoryFilter");
    catFilter.innerHTML = '<option value="All">All Categories</option>';
    
    const categories = [...new Set(tours.map(t => t.category).filter(Boolean))].sort();
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      catFilter.appendChild(opt);
    });
  }

  // Handle category filter changes
  document.getElementById("tourCategoryFilter").addEventListener("change", function() {
    filterAndDisplayTours();
  });

  function filterAndDisplayTours() {
    const category = document.getElementById("tourCategoryFilter").value;
    const query = document.getElementById("tourSearchInput").value.toLowerCase();
    
    let filtered = toursForSelectedCity;
    if (category !== "All") {
      filtered = filtered.filter(t => t.category === category);
    }
    if (query) {
      filtered = filtered.filter(t => t.name.toLowerCase().includes(query));
    }
    displayToursList(filtered);
  }

  // Display tours dropdown list
  function displayToursList(tours) {
    const tourListUl = document.getElementById("tourList");
    tourListUl.innerHTML = "";
    tourListUl.style.display = "block";

    if (tours.length > 0) {
      tours.forEach((tour) => {
        const tourItem = document.createElement("li");
        tourItem.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
        tourItem.style.cursor = "pointer";
        
        const nameSpan = document.createElement("span");
        nameSpan.textContent = tour.name;
        
        const catBadge = document.createElement("span");
        catBadge.className = "badge badge-primary";
        catBadge.textContent = tour.category;
        
        tourItem.appendChild(nameSpan);
        tourItem.appendChild(catBadge);
        
        tourItem.addEventListener("click", () => {
          selectedTour = tour;
          document.getElementById("tourSearchInput").value = tour.name;
          tourListUl.style.display = "none";
          fetchTourAvailabilityAndRender();
        });
        tourListUl.appendChild(tourItem);
      });
    } else {
      tourListUl.innerHTML = '<li class="list-group-item text-muted">No tours found</li>';
    }
  }

  // Input filter for tours list
  document.getElementById("tourSearchInput").addEventListener("input", function() {
    const city = document.getElementById("tourCitySearchInput").value;
    if (!city) {
      alert("Please select a city first.");
      this.value = "";
      return;
    }
    filterAndDisplayTours();
  });

  document.getElementById("tourSearchInput").addEventListener("focus", function() {
    const city = document.getElementById("tourCitySearchInput").value;
    if (city) {
      filterAndDisplayTours();
    }
  });

  // Hide tour list dropdown on click outside
  document.addEventListener("click", function(e) {
    if (e.target.id !== "tourSearchInput" && e.target.id !== "tourList") {
      const list = document.getElementById("tourList");
      if (list) list.style.display = "none";
    }
  });

  // Fetch tour availability and render
  function fetchTourAvailabilityAndRender() {
    if (!selectedTour) return;
    
    fetch(`${Endpoint}/api/v1/tour-stop-sales/${selectedTour.id}`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        stopSaleEventsTour = data;
        renderCalendarTour();
        document.getElementById("calendarSectionTour").style.display = "flex";
      })
      .catch(err => {
        console.error("Error fetching tour availability:", err);
      });
  }

  // Render Tour Calendar
  function renderCalendarTour() {
    const grid = document.getElementById("calendarGridTour");
    const monthTitle = document.getElementById("calendarMonthTitleTour");
    if (!grid || !monthTitle) return;
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthTitle.textContent = `${months[currentMonthTour]} ${currentYearTour}`;
    
    grid.innerHTML = "";
    
    const firstDay = new Date(currentYearTour, currentMonthTour, 1).getDay();
    const daysInMonth = new Date(currentYearTour, currentMonthTour + 1, 0).getDate();
    
    // Offset first day of month
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement("div");
      grid.appendChild(cell);
    }
    
    // Render cells
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(currentYearTour, currentMonthTour, day);
      cellDate.setHours(0,0,0,0);
      
      const cell = document.createElement("div");
      cell.style.padding = "10px 5px";
      cell.style.borderRadius = "8px";
      cell.style.cursor = "pointer";
      cell.style.fontSize = "14px";
      cell.style.fontWeight = "600";
      cell.style.textAlign = "center";
      cell.style.border = "1px solid #eef2f7";
      cell.style.position = "relative";
      
      const numSpan = document.createElement("span");
      numSpan.textContent = day;
      cell.appendChild(numSpan);
      
      let isStopped = stopSaleEventsTour.some(event => {
        if (!event.stopped) return false;
        
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        
        return cellDate >= start && cellDate <= end;
      });
      
      if (isStopped) {
        cell.style.backgroundColor = "#fde8e8";
        cell.style.color = "#e74c3c";
        cell.style.borderColor = "#f5c6cb";
        
        const label = document.createElement("div");
        label.style.fontSize = "8px";
        label.style.fontWeight = "bold";
        label.style.color = "#c0392b";
        label.textContent = "STOP";
        cell.appendChild(label);
      } else {
        cell.style.backgroundColor = "#e8f7ec";
        cell.style.color = "#28a745";
        cell.style.borderColor = "#c3e6cb";
        
        const label = document.createElement("div");
        label.style.fontSize = "8px";
        label.style.fontWeight = "bold";
        label.style.color = "#28a745";
        label.textContent = "OPEN";
        cell.appendChild(label);
      }
      
      cell.addEventListener("click", () => {
        const dateString = cellDate.getFullYear() + "-" + String(cellDate.getMonth() + 1).padStart(2, "0") + "-" + String(cellDate.getDate()).padStart(2, "0");
        const fromInput = document.getElementById("fromDateInputTour");
        const toInput = document.getElementById("toDateInputTour");
        
        if (!fromInput.value || (fromInput.value && toInput.value)) {
          fromInput.value = dateString;
          toInput.value = "";
        } else {
          if (dateString < fromInput.value) {
            fromInput.value = dateString;
          } else {
            toInput.value = dateString;
          }
        }
        highlightSelectedDatesTour();
      });
      
      grid.appendChild(cell);
    }
    highlightSelectedDatesTour();
  }

  // Highlight range selection for Tour
  function highlightSelectedDatesTour() {
    const fromVal = document.getElementById("fromDateInputTour").value;
    const toVal = document.getElementById("toDateInputTour").value;
    const grid = document.getElementById("calendarGridTour");
    if (!grid) return;
    
    const firstDay = new Date(currentYearTour, currentMonthTour, 1).getDay();
    const cells = grid.children;
    
    for (let i = firstDay; i < cells.length; i++) {
      const cell = cells[i];
      if (!cell.textContent || cell.children.length === 0) continue;
      const day = parseInt(cell.firstChild.textContent);
      const cellDate = new Date(currentYearTour, currentMonthTour, day);
      cellDate.setHours(0,0,0,0);
      const dateString = cellDate.getFullYear() + "-" + String(cellDate.getMonth() + 1).padStart(2, "0") + "-" + String(cellDate.getDate()).padStart(2, "0");
      
      cell.style.outline = "none";
      cell.style.boxShadow = "none";
      
      if (fromVal && dateString === fromVal) {
        cell.style.outline = "3px solid #007bff";
      } else if (toVal && dateString === toVal) {
        cell.style.outline = "3px solid #007bff";
      } else if (fromVal && toVal && dateString > fromVal && dateString < toVal) {
        cell.style.boxShadow = "inset 0 0 0 3px #007bff";
      }
    }
  }

  // Navigation listeners for Tour Calendar
  document.getElementById("prevMonthBtnTour").addEventListener("click", () => {
    currentMonthTour--;
    if (currentMonthTour < 0) {
      currentMonthTour = 11;
      currentYearTour--;
    }
    renderCalendarTour();
  });
  
  document.getElementById("nextMonthBtnTour").addEventListener("click", () => {
    currentMonthTour++;
    if (currentMonthTour > 11) {
      currentMonthTour = 0;
      currentYearTour++;
    }
    renderCalendarTour();
  });

  document.getElementById("fromDateInputTour").addEventListener("input", highlightSelectedDatesTour);
  document.getElementById("toDateInputTour").addEventListener("input", highlightSelectedDatesTour);

  // Submit Tour Stop Sale Actions
  document.getElementById("btnStopSaleTour").addEventListener("click", () => {
    submitTourStopSaleAction(true);
  });
  
  document.getElementById("btnStartSaleTour").addEventListener("click", () => {
    submitTourStopSaleAction(false);
  });

  function submitTourStopSaleAction(isStopSale) {
    if (!selectedTour) {
      alert("Please select a tour first.");
      return;
    }
    
    const fromDateVal = document.getElementById("fromDateInputTour").value;
    const toDateVal = document.getElementById("toDateInputTour").value;
    
    if (!fromDateVal || !toDateVal) {
      alert("Please select the date range.");
      return;
    }
    
    if (toDateVal < fromDateVal) {
      alert("To Date must be greater than or equal to From Date.");
      return;
    }
    
    const notifyAgents = document.getElementById("notifyAgentsCheckboxTour")?.checked || false;
    
    const payload = {
      tour_id: selectedTour.id,
      start_date: new Date(fromDateVal).toISOString(),
      end_date: new Date(toDateVal).toISOString(),
      stopped: isStopSale,
      notify_agents: notifyAgents
    };
    
    const targetBtn = isStopSale ? document.getElementById("btnStopSaleTour") : document.getElementById("btnStartSaleTour");
    const originalText = targetBtn.innerHTML;
    targetBtn.disabled = true;
    targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    
    fetch(`${Endpoint}/api/v1/tour-stop-sales`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Failed to save changes");
        }
        return res.json();
      })
      .then(data => {
        alert(isStopSale ? "Tour Stop Sale applied successfully!" : "Tour Start Sale applied successfully!");
        
        fetchTourAvailabilityAndRender();
        
        document.getElementById("fromDateInputTour").value = "";
        document.getElementById("toDateInputTour").value = "";
      })
      .catch(err => {
        console.error("Error saving tour stop sale:", err);
        alert("Failed to save tour stop sale: " + err.message);
      })
      .finally(() => {
        targetBtn.disabled = false;
        targetBtn.innerHTML = originalText;
      });
  }

  // ==========================================
  // SPECIAL PACKAGE STOP SALES FUNCTIONALITY
  // ==========================================
  let selectedSpecialPackage = null;
  let packagesForSelectedCity = [];
  let currentYearPkg = new Date().getFullYear();
  let currentMonthPkg = new Date().getMonth();
  let stopSaleEventsPkg = [];

  function populatePkgCitiesDropdown(cities) {
    const dropdownMenu = document.getElementById("pkgCityDropdownMenu");
    if (!dropdownMenu) return;
    dropdownMenu.innerHTML = "";

    if (cities.length === 0) {
      dropdownMenu.innerHTML = '<li class="list-group-item text-muted">No cities found</li>';
      return;
    }

    cities.forEach((city) => {
      const cityItem = document.createElement("li");
      cityItem.className = "list-group-item list-group-item-action";
      cityItem.textContent = city;
      cityItem.style.cursor = "pointer";
      cityItem.addEventListener("click", () => {
        document.getElementById("pkgCitySearchInput").value = city;
        dropdownMenu.style.display = "none";
        fetchSpecialPackagesForCity(city);
      });
      dropdownMenu.appendChild(cityItem);
    });
  }

  // Real-time search for cities in pkg tab
  const pkgCityInput = document.getElementById("pkgCitySearchInput");
  if (pkgCityInput) {
    pkgCityInput.addEventListener("input", function () {
      const query = this.value.toLowerCase();
      const dropdownMenu = document.getElementById("pkgCityDropdownMenu");
      dropdownMenu.style.display = "block";

      if (window.allCities) {
        const filtered = window.allCities.filter(c => c.toLowerCase().includes(query));
        populatePkgCitiesDropdown(filtered);
      }
    });

    pkgCityInput.addEventListener("focus", function () {
      document.getElementById("pkgCityDropdownMenu").style.display = "block";
    });
  }

  // Fetch special packages for the selected city
  function fetchSpecialPackagesForCity(city) {
    fetch(`${Endpoint}/api/v1/special-packages?city=${encodeURIComponent(city)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load packages");
        return res.json();
      })
      .then(data => {
        packagesForSelectedCity = data || [];
        populatePkgCategoryFilter(packagesForSelectedCity);
        filterAndDisplayPackages();
      })
      .catch(err => {
        console.error(err);
        alert("Failed to load special packages for selected city");
      });
  }

  // Populate category dropdown
  function populatePkgCategoryFilter(packages) {
    const catFilter = document.getElementById("pkgCategoryFilter");
    if (!catFilter) return;
    catFilter.innerHTML = '<option value="All">All Categories</option>';
    
    const categories = [...new Set(packages.map(p => p.category).filter(Boolean))].sort();
    categories.forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      catFilter.appendChild(opt);
    });
  }

  // Handle category filter change
  const pkgCategoryFilter = document.getElementById("pkgCategoryFilter");
  if (pkgCategoryFilter) {
    pkgCategoryFilter.addEventListener("change", filterAndDisplayPackages);
  }

  function filterAndDisplayPackages() {
    const category = document.getElementById("pkgCategoryFilter").value;
    const query = document.getElementById("pkgSearchInput").value.toLowerCase();
    
    let filtered = packagesForSelectedCity;
    if (category !== "All") {
      filtered = filtered.filter(p => p.category === category);
    }
    if (query) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query) || (p.code && p.code.toLowerCase().includes(query)));
    }
    displayPackagesList(filtered);
  }

  // Display packages dropdown list
  function displayPackagesList(packages) {
    const pkgListUl = document.getElementById("pkgList");
    if (!pkgListUl) return;
    pkgListUl.innerHTML = "";
    pkgListUl.style.display = "block";

    if (packages.length > 0) {
      packages.forEach((pkg) => {
        const item = document.createElement("li");
        item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
        item.style.cursor = "pointer";
        
        const nameSpan = document.createElement("span");
        nameSpan.textContent = `${pkg.name} (${pkg.code || 'No Code'})`;
        
        const catBadge = document.createElement("span");
        catBadge.className = "badge badge-info";
        catBadge.textContent = pkg.category || "Uncategorized";
        
        item.appendChild(nameSpan);
        item.appendChild(catBadge);
        
        item.addEventListener("click", () => {
          selectedSpecialPackage = pkg;
          document.getElementById("pkgSearchInput").value = pkg.name;
          pkgListUl.style.display = "none";
          fetchPkgAvailabilityAndRender();
        });
        pkgListUl.appendChild(item);
      });
    } else {
      pkgListUl.innerHTML = '<li class="list-group-item text-muted">No packages found</li>';
    }
  }

  const pkgSearchInput = document.getElementById("pkgSearchInput");
  if (pkgSearchInput) {
    pkgSearchInput.addEventListener("input", function() {
      const city = document.getElementById("pkgCitySearchInput").value;
      if (!city) {
        alert("Please select a city first.");
        this.value = "";
        return;
      }
      filterAndDisplayPackages();
    });

    pkgSearchInput.addEventListener("focus", function() {
      const city = document.getElementById("pkgCitySearchInput").value;
      if (city) {
        document.getElementById("pkgList").style.display = "block";
      }
    });
  }

  // Hide dropdowns when clicking outside
  document.addEventListener("click", function(e) {
    if (e.target.id !== "pkgCitySearchInput" && e.target.id !== "pkgCityDropdownMenu") {
      const menu = document.getElementById("pkgCityDropdownMenu");
      if (menu) menu.style.display = "none";
    }
    if (e.target.id !== "pkgSearchInput" && e.target.id !== "pkgList") {
      const list = document.getElementById("pkgList");
      if (list) list.style.display = "none";
    }
  });

  // Fetch package availability & stop sale events
  function fetchPkgAvailabilityAndRender() {
    if (!selectedSpecialPackage) return;
    
    fetch(`${Endpoint}/api/v1/special-packages-stop-sales/${selectedSpecialPackage.id}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch package availability");
        return res.json();
      })
      .then(data => {
        stopSaleEventsPkg = data || [];
        document.getElementById("calendarSectionPkg").style.display = "flex";
        renderPkgCalendar();
      })
      .catch(err => {
        console.error(err);
        alert("Error loading package availability");
      });
  }

  // Render Package Calendar
  function renderPkgCalendar() {
    const grid = document.getElementById("calendarGridPkg");
    const title = document.getElementById("calendarMonthTitlePkg");
    if (!grid || !title) return;
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    title.textContent = monthNames[currentMonthPkg] + " " + currentYearPkg;
    grid.innerHTML = "";
    
    const firstDay = new Date(currentYearPkg, currentMonthPkg, 1).getDay();
    const daysInMonth = new Date(currentYearPkg, currentMonthPkg + 1, 0).getDate();
    
    // Offset
    for (let i = 0; i < firstDay; i++) {
      const cell = document.createElement("div");
      grid.appendChild(cell);
    }
    
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(currentYearPkg, currentMonthPkg, day);
      cellDate.setHours(0,0,0,0);
      
      const cell = document.createElement("div");
      cell.style.padding = "10px 5px";
      cell.style.borderRadius = "8px";
      cell.style.cursor = "pointer";
      cell.style.fontSize = "14px";
      cell.style.fontWeight = "600";
      cell.style.textAlign = "center";
      cell.style.border = "1px solid #eef2f7";
      cell.style.position = "relative";
      
      const numSpan = document.createElement("span");
      numSpan.textContent = day;
      cell.appendChild(numSpan);
      
      let isStopped = stopSaleEventsPkg.some(event => {
        if (!event.stopped) return false;
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return cellDate >= start && cellDate <= end;
      });
      
      if (isStopped) {
        cell.style.backgroundColor = "#fde8e8";
        cell.style.color = "#e74c3c";
        cell.style.borderColor = "#f5c6cb";
        
        const label = document.createElement("div");
        label.style.fontSize = "8px";
        label.style.fontWeight = "bold";
        label.style.color = "#c0392b";
        label.textContent = "STOP";
        cell.appendChild(label);
      } else {
        cell.style.backgroundColor = "#e8f7ec";
        cell.style.color = "#28a745";
        cell.style.borderColor = "#c3e6cb";
        
        const label = document.createElement("div");
        label.style.fontSize = "8px";
        label.style.fontWeight = "bold";
        label.style.color = "#28a745";
        label.textContent = "OPEN";
        cell.appendChild(label);
      }
      
      cell.addEventListener("click", () => {
        const dateString = cellDate.getFullYear() + "-" + String(cellDate.getMonth() + 1).padStart(2, "0") + "-" + String(cellDate.getDate()).padStart(2, "0");
        const fromInput = document.getElementById("fromDateInputPkg");
        const toInput = document.getElementById("toDateInputPkg");
        
        if (!fromInput.value || (fromInput.value && toInput.value)) {
          fromInput.value = dateString;
          toInput.value = "";
        } else {
          if (dateString < fromInput.value) {
            fromInput.value = dateString;
          } else {
            toInput.value = dateString;
          }
        }
        highlightSelectedDatesPkg();
      });
      
      grid.appendChild(cell);
    }
    highlightSelectedDatesPkg();
  }

  function highlightSelectedDatesPkg() {
    const fromVal = document.getElementById("fromDateInputPkg").value;
    const toVal = document.getElementById("toDateInputPkg").value;
    const grid = document.getElementById("calendarGridPkg");
    if (!grid) return;
    
    const firstDay = new Date(currentYearPkg, currentMonthPkg, 1).getDay();
    const cells = grid.children;
    
    for (let i = firstDay; i < cells.length; i++) {
      const cell = cells[i];
      const day = i - firstDay + 1;
      const cellDate = new Date(currentYearPkg, currentMonthPkg, day);
      cellDate.setHours(0,0,0,0);
      
      let inRange = false;
      if (fromVal) {
        const fromDate = new Date(fromVal);
        fromDate.setHours(0,0,0,0);
        
        if (toVal) {
          const toDate = new Date(toVal);
          toDate.setHours(0,0,0,0);
          inRange = cellDate >= fromDate && cellDate <= toDate;
        } else {
          inRange = cellDate.getTime() === fromDate.getTime();
        }
      }
      
      if (inRange) {
        cell.style.boxShadow = "0 0 0 3px #9b59b6 inset";
      } else {
        cell.style.boxShadow = "none";
      }
    }
  }

  // Month navigation for pkg
  const prevBtnPkg = document.getElementById("prevMonthBtnPkg");
  if (prevBtnPkg) {
    prevBtnPkg.addEventListener("click", () => {
      currentMonthPkg--;
      if (currentMonthPkg < 0) {
        currentMonthPkg = 11;
        currentYearPkg--;
      }
      renderPkgCalendar();
    });
  }

  const nextBtnPkg = document.getElementById("nextMonthBtnPkg");
  if (nextBtnPkg) {
    nextBtnPkg.addEventListener("click", () => {
      currentMonthPkg++;
      if (currentMonthPkg > 11) {
        currentMonthPkg = 0;
        currentYearPkg++;
      }
      renderPkgCalendar();
    });
  }

  // Save actions for pkg stop sale
  const btnStopSalePkg = document.getElementById("btnStopSalePkg");
  if (btnStopSalePkg) {
    btnStopSalePkg.addEventListener("click", () => handlePkgStopSaleToggle(true));
  }

  const btnStartSalePkg = document.getElementById("btnStartSalePkg");
  if (btnStartSalePkg) {
    btnStartSalePkg.addEventListener("click", () => handlePkgStopSaleToggle(false));
  }

  function handlePkgStopSaleToggle(isStopSale) {
    if (!selectedSpecialPackage) {
      alert("Please select a Special Package first.");
      return;
    }
    
    const fromDate = document.getElementById("fromDateInputPkg").value;
    const toDate = document.getElementById("toDateInputPkg").value;
    
    if (!fromDate || !toDate) {
      alert("Please select both a Start Date and an End Date from the calendar or input fields.");
      return;
    }
    
    const notifyAgents = document.getElementById("notifyAgentsCheckboxPkg").checked;
    
    const payload = {
      special_package_id: selectedSpecialPackage.id,
      start_date: fromDate,
      end_date: toDate,
      stopped: isStopSale,
      notify_agents: notifyAgents
    };
    
    const targetBtn = isStopSale ? document.getElementById("btnStopSalePkg") : document.getElementById("btnStartSalePkg");
    const originalText = targetBtn.innerHTML;
    targetBtn.disabled = true;
    targetBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    
    fetch(`${Endpoint}/api/v1/special-packages-stop-sales`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(async res => {
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || "Failed to save changes");
        }
        return res.json();
      })
      .then(data => {
        alert(isStopSale ? "Special Package Stop Sale applied successfully!" : "Special Package Start Sale applied successfully!");
        fetchPkgAvailabilityAndRender();
        document.getElementById("fromDateInputPkg").value = "";
        document.getElementById("toDateInputPkg").value = "";
      })
      .catch(err => {
        console.error("Error saving special package stop sale:", err);
        alert("Failed to save special package stop sale: " + err.message);
      })
      .finally(() => {
        targetBtn.disabled = false;
        targetBtn.innerHTML = originalText;
      });
  }

  // Retrieve the username from localStorage
  const username = localStorage.getItem("username");
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;
});
