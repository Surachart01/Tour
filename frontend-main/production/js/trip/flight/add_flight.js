// Event listener for the "Add Flight" button
document.getElementById("addFlightBtn").addEventListener("click", function () {
  document.getElementById("flightForm").reset();
  const tripStartDate = document.getElementById("tripStartDate")?.value;
  if (tripStartDate) {
    document.getElementById("flightDate").value = tripStartDate;
  }
  $("#flightModal").modal("show"); // Show the flights modal
});

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

let flightsArray = [];
let editingFlightRow = null;

// Save flight booking
document.getElementById("saveFlight").addEventListener("click", function (event) {
    event.preventDefault();

    // Get the values from the form
    const flight = document.getElementById("flight").value;
    const number = document.getElementById("number").value;
    const flightInOut = document.getElementById("flightInOut").value;
    const flightFromVal = document.getElementById("flightFrom")?.value?.trim() || "";
    const flightToVal = document.getElementById("flightTo")?.value?.trim() || "";
    const flightRoute = flightToVal ? `${flightFromVal}-${flightToVal}` : flightFromVal;
    const flightDate = formatToDDMMYYYY(document.getElementById("flightDate").value);
    const departureTime = document.getElementById("departureTime").value;
    const arrivalTime = document.getElementById("arrivalTime").value;
    const issuedBy = document.getElementById("issuedBy").value;
    const flightRemarks = document.getElementById("flightRemarks").value;
    const flightCost = parseFloat(document.getElementById("flightCost").value) || 0;

    const newFlight = {
      flight,
      number,
      flightInOut,
      flightRoute,
      flightDate,
      departureTime,
      arrivalTime,
      issuedBy,
      flightRemarks,
      flightCost,
    };

    if (editingFlightRow) {
        // Update the row being edited
        updateFlightRow(editingFlightRow, newFlight);

        // Update the array
        const rowIndex = editingFlightRow.rowIndex - 1;
        flightsArray[rowIndex] = newFlight;

        editingFlightRow = null; // Reset editing state
    } else {
        // Add new flights to array and table
        flightsArray.push(newFlight);
        addFlightRow(newFlight);
    }

    // Hide the modal and reset form fields
    document.getElementById("flightForm").reset();
    $("#flightModal").modal("hide");
});

// Add a new row to the table
function addFlightRow(flight) {
  const newRow = document.createElement("tr");
  
  // Store flight cost data in dataset for later extraction
  newRow.dataset.flightCost = flight.flightCost || 0;
  
  newRow.innerHTML = `
      <td>${flight.flightDate}</td>
      <td>${flight.flight}</td>
      <td>${flight.number}</td>
      <td>${flight.flightInOut}</td>
      <td>${flight.flightRoute}</td>
      <td>${flight.departureTime}</td>
      <td>${flight.arrivalTime}</td>
      <td>${flight.issuedBy}</td>
      <td>${flight.flightCost ? flight.flightCost.toFixed(2) : '0.00'}</td>
      <td>${flight.flightRemarks}</td>
      <td>
        <button class="btn btn-sm btn-primary editBtn" type="button" style="margin-right: 5px;" data-toggle="tooltip" data-placement="top" title="Edit">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger deleteBtn" type="button" data-toggle="tooltip" data-placement="top" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
  document.getElementById("flightsTableBody").appendChild(newRow);
  
  // Initialize tooltips for the new row
  $(newRow).find('[data-toggle="tooltip"]').tooltip();
}

// Update an existing row in the table
function updateFlightRow(row, flight) {
  row.cells[0].textContent = flight.flightDate;
  row.cells[1].textContent = flight.flight;
  row.cells[2].textContent = flight.number;
  row.cells[3].textContent = flight.flightInOut;
  row.cells[4].textContent = flight.flightRoute;
  row.cells[5].textContent = flight.departureTime;
  row.cells[6].textContent = flight.arrivalTime;
  row.cells[7].textContent = flight.issuedBy;
  row.cells[8].textContent = flight.flightCost ? flight.flightCost.toFixed(2) : '0.00';
  row.cells[9].textContent = flight.flightRemarks;
  
  // Update dataset with flight cost data
  row.dataset.flightCost = flight.flightCost || 0;
}

// Handle edit and delete button clicks
document.getElementById("flightsTableBody").addEventListener("click", function (event) {
  const row = event.target.closest("tr");
  if (!row) return;

  // ✅ Block package items editing/deleting
  if (row.dataset.isPackageItem === "true") {
    return;
  }

  if (event.target.classList.contains("editBtn") || event.target.closest(".editBtn")) {
      const rowIndex = row.rowIndex - 1;
      const rowData = flightsArray[rowIndex];

      document.getElementById("flightDate").value = formatToYYYYMMDD(rowData.flightDate);
      document.getElementById("flight").value = rowData.flight;
      document.getElementById("number").value = rowData.number;
      document.getElementById("flightInOut").value = rowData.flightInOut;
      
      const routeVal = rowData.flightRoute || "";
      let fromVal = "";
      let toVal = "";
      if (routeVal.includes("-")) {
        const parts = routeVal.split("-");
        fromVal = parts[0] ? parts[0].trim() : "";
        toVal = parts[1] ? parts[1].trim() : "";
      } else {
        fromVal = routeVal;
      }
      if (document.getElementById("flightFrom")) {
        document.getElementById("flightFrom").value = fromVal;
      }
      if (document.getElementById("flightTo")) {
        document.getElementById("flightTo").value = toVal;
      }

      document.getElementById("departureTime").value = rowData.departureTime;
      document.getElementById("arrivalTime").value = rowData.arrivalTime;
      document.getElementById("issuedBy").value = rowData.issuedBy;
      document.getElementById("flightRemarks").value = rowData.flightRemarks;
      document.getElementById("flightCost").value = rowData.flightCost || 0;

      // Show the modal for editing
      editingFlightRow = row; // Track the row being edited
      $("#flightModal").modal("show");
  }

  if (event.target.classList.contains("deleteBtn") || event.target.closest(".deleteBtn")) {
      // Confirm deletion
      if (confirm("Are you sure you want to delete this flight?")) {
          const rowIndex = row.rowIndex - 1;
          flightsArray.splice(rowIndex, 1); // Remove from array
          row.remove(); // Remove row from the table
      }
  }
});

// Function to extract flight data for form submission
function extractFlightData() {
  const table = document.getElementById("flightsTable");
  const rows = table.querySelectorAll("tbody tr");
  let flightArray = [];

  rows.forEach((row) => {
    let flightData = {};
    const cells = row.querySelectorAll("td");

    flightData["flight_name"] = cells[1]?.textContent.trim() || "";
    flightData["flight_number"] = cells[2]?.textContent.trim() || "";
    flightData["in_or_out"] = cells[3]?.textContent.trim() || "";
    flightData["route"] = cells[4]?.textContent.trim() || "";
    flightData["flight_date"] = cells[0]?.textContent.trim() || "";
    flightData["departure_time"] = cells[5]?.textContent.trim() || "";
    flightData["arrival_time"] = cells[6]?.textContent.trim() || "";
    flightData["issued_by"] = cells[7]?.textContent.trim() || "";
    flightData["remarks"] = cells[9]?.textContent.trim() || "";

    // Extract cost data from dataset or cell
    const cost = parseFloat(row.dataset.flightCost) || parseFloat(cells[8]?.textContent.trim()) || 0;
    flightData["total_cost"] = cost;
    flightData["discount"] = 0;
    flightData["final_cost"] = cost;

    flightData["trip_item_id"] = 0;
    flightData["approved"] = false;
    flightData["declined"] = false;
    flightData["created_at"] = new Date().toISOString();
    flightData["updated_at"] = new Date().toISOString();

    flightArray.push(flightData);
  });

  return flightArray;
}
