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
          alert("Unauthorized. Please log in again.");
          window.location.href = "login.html";
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
        cityItem.onclick = function (e) {
          e.preventDefault();
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
      hotel.room_types.forEach((room) => {
        const col = document.createElement("div");
        col.className = "col-md-3 mt-2";
        
        const div = document.createElement("div");
        div.className = "custom-control custom-checkbox";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `roomTypeCheckbox${room.id}`;
        checkbox.value = room.id;
        checkbox.className = "custom-control-input room-type-cb";
        checkbox.checked = true;
        
        // Re-render calendar when checkbox status changes
        checkbox.addEventListener("change", renderCalendar);
        
        const label = document.createElement("label");
        label.className = "custom-control-label";
        label.htmlFor = `roomTypeCheckbox${room.id}`;
        label.style.cursor = "pointer";
        label.style.fontWeight = "600";
        label.textContent = room.name;
        
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
    const checkedRoomIds = Array.from(
      document.querySelectorAll('#roomTypeList input.room-type-cb:checked')
    ).map(cb => parseInt(cb.value));

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
    
    const checkedRoomIds = Array.from(
      document.querySelectorAll('#roomTypeList input.room-type-cb:checked')
    ).map(cb => parseInt(cb.value));
    
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
      .then(res => {
        if (!res.ok) throw new Error("Failed to save changes");
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

  // Retrieve the username from localStorage
  const username = localStorage.getItem("username");
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;
});
