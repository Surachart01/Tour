function toggleEditButtonVisibility() {
  const checkboxes = document.querySelectorAll('.rowCheckbox');
  const massEditButton = document.getElementById('massEditButton');

  // Check if at least one checkbox is selected
  const anyChecked = Array.from(checkboxes).some(checkbox => checkbox.checked);

  // Toggle button visibility
  if (anyChecked) {
    massEditButton.style.display = 'inline-block';
  } else {
    massEditButton.style.display = 'none';
  }
}

function loadSelectedRowsIntoModal() {
  const selectedRows = document.querySelectorAll('input[type="checkbox"]:checked');
  const dynamicContainer = document.getElementById("dynamicRoomEntriesContainer");
  // ✅ Clear all input fields and dynamic entries before proceeding
  dynamicContainer.innerHTML = "";
  document.getElementById("massEditFromDate").value = "";
  document.getElementById("massEditToDate").value = "";
  document.getElementById("massEditExtraBedAdult").value = "";
  document.getElementById("massEditExtraBedChild").value = "";
  document.getElementById("massEditExtraBedShared").value = "";
  document.getElementById("massEditFoodCostAdultABF").value = "";
  document.getElementById("massEditFoodCostAdultLunch").value = "";
  document.getElementById("massEditFoodCostAdultDinner").value = "";
  document.getElementById("massEditFoodCostAdultAllinclusive").value = "";
  document.getElementById("massEditFoodCostChildABF").value = "";
  document.getElementById("massEditFoodCostChildLunch").value = "";
  document.getElementById("massEditFoodCostChildDinner").value = "";
  document.getElementById("massEditFoodCostChildAllinclusive").value = "";

  if (selectedRows.length === 0) {
      alert("Please select at least one row to edit.");
      return;
  }

  let fromDate, toDate, extraBedAdult, extraBedChild, extraBedShared;
  let foodAdultABF, foodAdultLunch, foodAdultDinner, foodAdultAllinclusive;
  let foodChildABF, foodChildLunch, foodChildDinner, foodChildAllinclusive;
  let isFirstRow = true;
  let identical = true; // Flag to check if all values are identical

  for (const checkbox of selectedRows) {
      const row = checkbox.closest("tr");
      const cells = row.getElementsByTagName("td");

      if (cells.length < 8) {
          alert("Invalid data detected in the selected rows.");
          return; // Exit early if data is missing
      }

      const currentFromDate = formatToYYYYMMDD(cells[1].textContent.trim());
      const currentToDate = formatToYYYYMMDD(cells[2].textContent.trim());

      const extraBedDetails = cells[5].innerHTML.split("<br>");
      const currentExtraBedAdult = extraBedDetails[0]?.replace("Adult: ", "").trim() || "";
      const currentExtraBedChild = extraBedDetails[1]?.replace("Child: ", "").trim() || "";
      const currentExtraBedShared = extraBedDetails[2]?.replace("Shared: ", "").trim() || "";

      const foodAdult = cells[6].innerHTML.split("<br>");
      const currentFoodAdultABF = foodAdult[0]?.replace("ABF: ", "").trim() || "";
      const currentFoodAdultLunch = foodAdult[1]?.replace("Lunch: ", "").trim() || "";
      const currentFoodAdultDinner = foodAdult[2]?.replace("Dinner: ", "").trim() || "";
      const currentFoodAdultAllinclusive = foodAdult[3]?.replace("All Inclusive: ", "").trim() || "";

      const foodChild = cells[7].innerHTML.split("<br>");
      const currentFoodChildABF = foodChild[0]?.replace("ABF: ", "").trim() || "";
      const currentFoodChildLunch = foodChild[1]?.replace("Lunch: ", "").trim() || "";
      const currentFoodChildDinner = foodChild[2]?.replace("Dinner: ", "").trim() || "";
      const currentFoodChildAllinclusive = foodChild[3]?.replace("All Inclusive: ", "").trim() || "";

      if (isFirstRow) {
          fromDate = currentFromDate;
          toDate = currentToDate;
          extraBedAdult = currentExtraBedAdult;
          extraBedChild = currentExtraBedChild;
          extraBedShared = currentExtraBedShared;
          foodAdultABF = currentFoodAdultABF;
          foodAdultLunch = currentFoodAdultLunch;
          foodAdultDinner = currentFoodAdultDinner;
          foodAdultAllinclusive = currentFoodAdultAllinclusive;
          foodChildABF = currentFoodChildABF;
          foodChildLunch = currentFoodChildLunch;
          foodChildDinner = currentFoodChildDinner;
          foodChildAllinclusive = currentFoodChildAllinclusive;
          isFirstRow = false;
      } else {
          if (
              currentFromDate !== fromDate ||
              currentToDate !== toDate ||
              currentExtraBedAdult !== extraBedAdult ||
              currentExtraBedChild !== extraBedChild ||
              currentExtraBedShared !== extraBedShared ||
              currentFoodAdultABF !== foodAdultABF ||
              currentFoodAdultLunch !== foodAdultLunch ||
              currentFoodAdultDinner !== foodAdultDinner ||
              currentFoodAdultAllinclusive !== foodAdultAllinclusive ||
              currentFoodChildABF !== foodChildABF ||
              currentFoodChildLunch !== foodChildLunch ||
              currentFoodChildDinner !== foodChildDinner ||
              currentFoodChildAllinclusive !== foodChildAllinclusive
          ) {
              alert("Selected rows have different values. Please select rows with identical data.");
              return;  // Prevent the modal from opening if values are different
          }
      }
  }

  // If not identical, the modal should never open
  if (!identical) {
      return;
  }

  // ✅ Populate the modal inputs with the first row data after all checks pass
  document.getElementById("massEditFromDate").value = fromDate;
  document.getElementById("massEditToDate").value = toDate;
  document.getElementById("massEditExtraBedAdult").value = extraBedAdult;
  document.getElementById("massEditExtraBedChild").value = extraBedChild;
  document.getElementById("massEditExtraBedShared").value = extraBedShared;
  document.getElementById("massEditFoodCostAdultABF").value = foodAdultABF;
  document.getElementById("massEditFoodCostAdultLunch").value = foodAdultLunch;
  document.getElementById("massEditFoodCostAdultDinner").value = foodAdultDinner;
  document.getElementById("massEditFoodCostAdultAllinclusive").value = foodAdultAllinclusive;
  document.getElementById("massEditFoodCostChildABF").value = foodChildABF;
  document.getElementById("massEditFoodCostChildLunch").value = foodChildLunch;
  document.getElementById("massEditFoodCostChildDinner").value = foodChildDinner;
  document.getElementById("massEditFoodCostChildAllinclusive").value = foodChildAllinclusive;

  // Only populate the modal when identical values are confirmed
  selectedRows.forEach((checkbox) => {
      const row = checkbox.closest("tr");
      const cells = row.getElementsByTagName("td");

      const nameAllotment = cells[3].innerHTML.split("<br>");
      const prices = cells[4].innerHTML.split("<br>");

      dynamicContainer.innerHTML += `
          <div class="form-row dynamic-entry">
              <div class="form-group col-md-6">
                  <label for="roomType" style="font-weight: bold">
                      Room Type(Name,Allotment,Cut-Off,Max Capacity)
                  </label>
                  <div class="d-flex">
                      <input type="text" class="form-control mr-2" value="${nameAllotment[0]?.replace("Name:", "").trim() || ""}" placeholder="Name" required>
                      <input type="number" class="form-control mr-2" value="${nameAllotment[1]?.replace("Allotment:", "").trim() || ""}" placeholder="Allotment" required>
                      <input type="number" class="form-control mr-2" value="${nameAllotment[2]?.replace("CutOff Days:", "").trim() || ""}" placeholder="Cut-Off" required>
                      <input type="number" class="form-control" value="${nameAllotment[3]?.replace("Max Capacity:", "").trim() || "0"}" placeholder="Max Capacity" min="0">
                  </div>
              </div>
              <div class="form-group col-md-6">
                  <label for="singlePrice" style="font-weight: bold">
                      Room Price (Single, Double)
                  </label>
                  <div class="d-flex">
                      <input type="number" class="form-control mr-2" value="${prices[0]?.replace("Single:", "").trim() || ""}" placeholder="Single Price" required>
                      <input type="number" class="form-control mr-2" value="${prices[1]?.replace("Double:", "").trim() || ""}" placeholder="Double Price" required>
                  </div>
              </div>
          </div>
      `;
  });

  // Modal is opened here ONLY if all the conditions are passed
  if (identical) {
      $("#massEditRoomTypeModal").modal("show");
  }
}

function applyMassEdit() {
  const selectedRows = document.querySelectorAll('input[type="checkbox"]:checked');
  const dynamicEntries = document.querySelectorAll("#dynamicRoomEntriesContainer .dynamic-entry");

  if (selectedRows.length === 0) {
      alert("Please select at least one row to apply changes.");
      return;
  }

  // Validate if dynamic entries match selected rows
  if (dynamicEntries.length !== selectedRows.length) {
      alert(`Expected ${selectedRows.length} dynamic inputs but found ${dynamicEntries.length}`);
      console.error("Mismatch in dynamic inputs for selected rows.");
      return;
  }

  // ✅ Static Values from the Modal
  const fromDate = formatToDDMMYYYY(document.getElementById("massEditFromDate").value);
  const toDate = formatToDDMMYYYY(document.getElementById("massEditToDate").value);
  const extraBedAdult = document.getElementById("massEditExtraBedAdult").value;
  const extraBedChild = document.getElementById("massEditExtraBedChild").value;
  const extraBedShared = document.getElementById("massEditExtraBedShared").value;
  const foodAdultABF = document.getElementById("massEditFoodCostAdultABF").value;
  const foodAdultLunch = document.getElementById("massEditFoodCostAdultLunch").value;
  const foodAdultDinner = document.getElementById("massEditFoodCostAdultDinner").value;
  const foodAdultAllinclusive = document.getElementById("massEditFoodCostAdultAllinclusive").value;
  const foodChildABF = document.getElementById("massEditFoodCostChildABF").value;
  const foodChildLunch = document.getElementById("massEditFoodCostChildLunch").value;
  const foodChildDinner = document.getElementById("massEditFoodCostChildDinner").value;
  const foodChildAllinclusive = document.getElementById("massEditFoodCostChildAllinclusive").value;

  if (!validateDateRange(fromDate, toDate)) {
    return;
  }

  // ✅ Loop through selected rows and apply all changes
  selectedRows.forEach((checkbox, index) => {
      const row = checkbox.closest("tr");
      const cells = row.getElementsByTagName("td");

      // Update static fields for all rows
      cells[1].textContent = fromDate;
      cells[2].textContent = toDate;

      // ✅ Update Extra Bed Information
      cells[5].innerHTML = `
          Adult: ${extraBedAdult}<br>
          Child: ${extraBedChild}<br>
          Shared: ${extraBedShared}
      `;

      // ✅ Update Food Cost (Adult)
      cells[6].innerHTML = `
          ABF: ${foodAdultABF}<br>
          Lunch: ${foodAdultLunch}<br>
          Dinner: ${foodAdultDinner}<br>
          All Inclusive: ${foodAdultAllinclusive}
      `;

      // ✅ Update Food Cost (Child)
      cells[7].innerHTML = `
          ABF: ${foodChildABF}<br>
          Lunch: ${foodChildLunch}<br>
          Dinner: ${foodChildDinner}<br>
          All Inclusive: ${foodChildAllinclusive}
      `;

      // ✅ Dynamic Inputs - Room Entries
      const inputs = dynamicEntries[index].querySelectorAll("input");

      // Ensure all fields are present before proceeding
      if (inputs.length < 6) {
          alert(`Not enough inputs for dynamic entry at row ${index + 1}`);
          console.error(`Input length mismatch at row ${index + 1}`);
          return;
      }

      // ✅ Update table cells with the dynamic values
      cells[3].innerHTML = `
          ${inputs[0].value}<br>
          Allotment: ${inputs[1].value}<br>
          CutOff Days: ${inputs[2].value}<br>
          Max Capacity: ${inputs[3].value}
      `;

      cells[4].innerHTML = `
          Single: ${inputs[4].value}<br>
          Double: ${inputs[5].value}
      `;
  });

  // ✅ Close modal after all updates
  $("#massEditRoomTypeModal").modal("hide");
  alert("Changes have been successfully applied!");
}

function addNewRoomType() {
  const roomTypesTable = document
      .getElementById("roomTypesTable")
      .getElementsByTagName("tbody")[0];

  // Select all dynamic room entries within the modal
  const dynamicEntries = document.querySelectorAll("#dynamicRoomEntriesContainer .form-row.dynamic-entry");

  if (dynamicEntries.length === 0) {
      alert("No room types available to add.");
      return;
  }

  const fromDate = formatToDDMMYYYY(document.getElementById("massEditFromDate").value);
  const toDate = formatToDDMMYYYY(document.getElementById("massEditToDate").value);

  // ✅ Check for duplicate entries for all dynamic entries before adding any rows
  const existingRows = roomTypesTable.getElementsByTagName("tr");
  for (const entry of dynamicEntries) {
      const roomTypeInput = entry.querySelector('input[placeholder="Name"]');
      const allotmentInput = entry.querySelector('input[placeholder="Allotment"]');
      const cutoffInput = entry.querySelector('input[placeholder="Cut-Off"]');
      const maxCapacityInput = entry.querySelector('input[placeholder="Max Capacity"]');
      const singlePriceInput = entry.querySelector('input[placeholder="Single Price"]');
      const doublePriceInput = entry.querySelector('input[placeholder="Double Price"]');

      if (!roomTypeInput || !allotmentInput || !cutoffInput || !maxCapacityInput || !singlePriceInput || !doublePriceInput) {
          alert("Some input fields are missing. Please ensure all fields are present.");
          return;
      }

      if (!roomTypeInput.value || !allotmentInput.value || !cutoffInput.value || !singlePriceInput.value || !doublePriceInput.value) {
          alert("Some input fields are empty. Please fill all fields before proceeding.");
          return;
      }

      for (let row of existingRows) {
          const cells = row.getElementsByTagName("td");
          if (
              cells[1].textContent.trim() === fromDate &&
              cells[2].textContent.trim() === toDate &&
              cells[3].textContent.trim().includes(roomTypeInput.value.trim())
          ) {
              alert("A similar row already exists. Please modify your entry.");
              return;
          }
      }
  }

  // ✅ If no issues, add the rows to the table
  for (const entry of dynamicEntries) {
      const roomTypeInput = entry.querySelector('input[placeholder="Name"]');
      const allotmentInput = entry.querySelector('input[placeholder="Allotment"]');
      const cutoffInput = entry.querySelector('input[placeholder="Cut-Off"]');
      const singlePriceInput = entry.querySelector('input[placeholder="Single Price"]');
      const doublePriceInput = entry.querySelector('input[placeholder="Double Price"]');

      const newRow = roomTypesTable.insertRow();
      newRow.innerHTML = `
          <td><input type="checkbox" class="rowCheckbox" onchange="toggleEditButtonVisibility()"/></td>
          <td>${fromDate}</td>
          <td>${toDate}</td>
          <td>${roomTypeInput.value}<br>Allotment: ${allotmentInput.value}<br>CutOff Days: ${cutoffInput.value}<br>Max Capacity: ${maxCapacityInput.value}</td>
          <td>Single: ${singlePriceInput.value}<br>Double: ${doublePriceInput.value}</td>
          <td>Adult: ${document.getElementById("massEditExtraBedAdult").value}<br>
              Child: ${document.getElementById("massEditExtraBedChild").value}<br>
              Shared: ${document.getElementById("massEditExtraBedShared").value}</td>
          <td>ABF: ${document.getElementById("massEditFoodCostAdultABF").value}<br>
              Lunch: ${document.getElementById("massEditFoodCostAdultLunch").value}<br>
              Dinner: ${document.getElementById("massEditFoodCostAdultDinner").value}<br>
              All Inclusive: ${document.getElementById("massEditFoodCostAdultAllinclusive").value}</td>
          <td>ABF: ${document.getElementById("massEditFoodCostChildABF").value}<br>
              Lunch: ${document.getElementById("massEditFoodCostChildLunch").value}<br>
              Dinner: ${document.getElementById("massEditFoodCostChildDinner").value}<br>
              All Inclusive: ${document.getElementById("massEditFoodCostChildAllinclusive").value}</td>
          <td>
              <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: nowrap;">
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-success btn-sm" onclick="editRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-edit"></i>
                      </button>
                      <span class="tooltip-text">Edit</span>
                  </div>
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-danger btn-sm" onclick="deleteRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-trash"></i>
                      </button>
                      <span class="tooltip-text">Delete</span>
                  </div>
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-warning btn-sm" onclick="duplicateRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-copy"></i>
                      </button>
                      <span class="tooltip-text">Duplicate</span>
                  </div>
              </div>
          </td>
      `;
  }

  // ✅ Close the modal and confirm addition only after all checks pass
  $("#massEditRoomTypeModal").modal("hide");
  alert("Room type added successfully!");
}

let currentRoomTypeRow = null;
let currentPromotionRow = null;
let currentContactRow = null;

function validateDateRange(fromDate, toDate) {
  const fromDateValue = new Date(fromDate.value);
  const toDateValue = new Date(toDate.value);

  if (toDateValue <= fromDateValue) {
    alert("The 'To' date must be greater than the 'From' date.");
    return false;
  }
  return true;
}

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

function convertToISODate(dateString) {
  const dateParts = dateString.split("-");
  if (dateParts.length === 3) {
    const [day, month, year] = dateParts;
    return `${year}-${month}-${day}`;
  }
  return null; // Return null if the input is invalid
}

// Universal cities loading function with proper error handling
async function populateCitiesDropdown() {
  try {
    // Retrieve the token from localStorage
    const token = localStorage.getItem("token");

    // Check if token exists
    if (!token) {
      alert("You are not authorized. Please log in first.");
      window.location.href = "login.html";
      return;
    }

    console.log("Fetching cities from API...");
    
    // Fetch the list of cities from the API
    const response = await fetch(`${Endpoint}/api/v1/cities`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Unauthorized. Please log in again.");
        window.location.href = "login.html";
        return;
      } else if (response.status === 403) {
        alert("You don't have sufficient permissions to perform this action.");
        return;
      } else {
        const errorMessage = await response.text() || "Failed to load cities data";
        throw new Error(errorMessage);
      }
    }

    const data = await response.json();
    console.log("Cities API response:", data);
    
    // Handle different response formats
    let cities = [];
    if (Array.isArray(data)) {
      // Direct array response
      cities = data;
    } else if (data.cities && Array.isArray(data.cities)) {
      // Response with cities property
      cities = data.cities;
    } else {
      console.error("Unexpected API response format:", data);
      throw new Error("Invalid cities data format received from server");
    }

    // Extract city names from objects or use strings directly
    const cityNames = cities.map(cityItem => {
      if (typeof cityItem === 'string') {
        return cityItem;
      } else if (cityItem.city) {
        return cityItem.city;
      } else if (cityItem.name) {
        return cityItem.name;
      } else {
        console.warn("Unknown city format:", cityItem);
        return cityItem.toString();
      }
    });

    console.log("Processed city names:", cityNames);

    // Populate the dropdown
    const cityDropdown = document.getElementById("hotelLocation");
    if (!cityDropdown) {
      console.error("Hotel location dropdown element not found");
      return;
    }

    // Clear existing options except the first one
    while (cityDropdown.children.length > 1) {
      cityDropdown.removeChild(cityDropdown.lastChild);
    }

    // Add city options
    cityNames.forEach((cityName) => {
      const option = document.createElement("option");
      option.value = cityName;
      option.textContent = cityName;
      cityDropdown.appendChild(option);
    });

    console.log(`Successfully loaded ${cityNames.length} cities`);
    
  } catch (error) {
    console.error("Error fetching cities:", error);
    alert(`Failed to load cities: ${error.message}`);
  }
}

// Function to handle duplication of a room type
// Function to handle duplication of a room type
function duplicateRoomType(button) {
  const row = button.closest("tr");
  const cells = row.getElementsByTagName("td");

  document.getElementById("duplicateFromDate").value = formatToYYYYMMDD(
    cells[1].textContent.trim()
  );
  document.getElementById("duplicateToDate").value = formatToYYYYMMDD(
    cells[2].textContent.trim()
  );

  const nameAllotment = cells[3].innerHTML.split("<br>");
  document.getElementById("duplicateRoomType").value = nameAllotment[0]
    .replace("", "")
    .trim();
  document.getElementById("duplicateAllotment").value = nameAllotment[1]
    .replace("Allotment: ", "")
    .trim();
  document.getElementById("duplicateCutoff").value = nameAllotment[2]
    .replace("CutOff Days: ", "")
    .trim();
  document.getElementById("duplicateMaxCapacity").value = nameAllotment[3]
    ?.replace("Max Capacity: ", "")
    .trim() || "0";

  const prices = cells[4].innerHTML.split("<br>");
  document.getElementById("duplicateSinglePrice").value = prices[0]
    .replace("Single: ", "")
    .trim();
  document.getElementById("duplicateDoublePrice").value = prices[1]
    .replace("Double: ", "")
    .trim();

  const extraBedDetails = cells[5].innerHTML.split("<br>");
  document.getElementById("duplicateExtraBedAdult").value =
    extraBedDetails[0].replace("Adult: ", "").trim();
  document.getElementById("duplicateExtraBedChild").value =
    extraBedDetails[1].replace("Child: ", "").trim();
  document.getElementById("duplicateExtraBedShared").value =
    extraBedDetails[2].replace("Shared: ", "").trim();

  const foodCostAdult = cells[6].innerHTML.split("<br>");
  document.getElementById("duplicateFoodCostAdultABF").value =
    foodCostAdult[0].replace("ABF: ", "").trim();
  document.getElementById("duplicateFoodCostAdultLunch").value =
    foodCostAdult[1].replace("Lunch: ", "").trim();
  document.getElementById("duplicateFoodCostAdultDinner").value =
    foodCostAdult[2].replace("Dinner: ", "").trim();
  document.getElementById("duplicateFoodCostAdultAllinclusive").value =
    foodCostAdult[3].replace("All Inclusive: ", "").trim();

  const foodCostChild = cells[7].innerHTML.split("<br>");
  document.getElementById("duplicateFoodCostChildABF").value =
    foodCostChild[0]?.replace("ABF: ", "").trim() || "";
  document.getElementById("duplicateFoodCostChildLunch").value =
    foodCostChild[1]?.replace("Lunch: ", "").trim() || "";
  document.getElementById("duplicateFoodCostChildDinner").value =
    foodCostChild[2]?.replace("Dinner: ", "").trim() || "";
  document.getElementById("duplicateFoodCostChildAllinclusive").value =
    foodCostChild[3]?.replace("All Inclusive: ", "").trim() || "";

  $("#duplicateRoomTypeModal").modal("show");
}

// Add room type
function saveRoomType() {
  const fromDateInput = document.getElementById("fromDate").value.trim();
  const toDateInput = document.getElementById("toDate").value.trim();

  // Validate and format dates
  const fromDate = formatToDDMMYYYY(fromDateInput);
  const toDate = formatToDDMMYYYY(toDateInput);

  // Validate date range
  if (
    !validateDateRange(
      document.getElementById("fromDate"),
      document.getElementById("toDate")
    )
  ) {
    return;
  }

  const roomTypesTable = document
    .getElementById("roomTypesTable")
    .querySelector("tbody");
  const roomNameContainer = document.getElementById("roomNameContainer");

  // Validate the original room type inputs
  const roomTypeName = document.getElementById("roomType").value.trim();
  const allotment = document.getElementById("allotment").value.trim();
  const cutoff = document.getElementById("cutoff").value.trim();
  const singlePrice = document.getElementById("singlePrice").value.trim();
  const doublePrice = document.getElementById("doublePrice").value.trim();

  if (!roomTypeName) {
    alert("Original Room Name is required.");
    return;
  }

  // Add the original room type as a row
  const originalRow = roomTypesTable.insertRow();
  originalRow.innerHTML = `
    <td><input type="checkbox" class="rowCheckbox" onchange="toggleEditButtonVisibility()" /></td>
    <td>${fromDate}</td>
    <td>${toDate}</td>
    <td>${roomTypeName}<br>Allotment: ${allotment || 0}<br>CutOff Days: ${
      cutoff || 0
    }<br>Max Capacity: ${document.getElementById("maxCapacity").value.trim() || 0}</td>
    <td>Single: ${singlePrice || 0}<br>Double: ${doublePrice || 0}</td>
    <td>Adult: ${
      document.getElementById("extraBedAdult").value.trim() || 0
    }<br>Child: ${
      document.getElementById("extraBedChild").value.trim() || 0
    }<br>Shared: ${
      document.getElementById("extraBedShared").value.trim() || 0
    }</td>
    <td>ABF: ${
      document.getElementById("foodCostAdultABF").value.trim() || 0
    }<br>Lunch: ${
      document.getElementById("foodCostAdultLunch").value.trim() || 0
    }<br>Dinner: ${
      document.getElementById("foodCostAdultDinner").value.trim() || 0
    }<br>All Inclusive: ${
      document.getElementById("foodCostAdultAllinclusive").value.trim() || 0
    }</td>
    <td>ABF: ${
      document.getElementById("foodCostChildABF").value.trim() || 0
    }<br>Lunch: ${
      document.getElementById("foodCostChildLunch").value.trim() || 0
    }<br>Dinner: ${
      document.getElementById("foodCostChildDinner").value.trim() || 0
    }<br>All Inclusive: ${
      document.getElementById("foodCostChildAllinclusive").value.trim() || 0
    }</td>
    <td>
        <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: nowrap;">
            <div class="tooltip-btn">
                <button type="button" class="btn btn-success btn-sm" onclick="editRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                    <i class="fas fa-edit"></i>
                </button>
                <span class="tooltip-text">Edit</span>
            </div>
            <div class="tooltip-btn">
                <button type="button" class="btn btn-danger btn-sm" onclick="deleteRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                    <i class="fas fa-trash"></i>
                </button>
                <span class="tooltip-text">Delete</span>
            </div>
            <div class="tooltip-btn">
                <button type="button" class="btn btn-warning btn-sm" onclick="duplicateRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                    <i class="fas fa-copy"></i>
                </button>
                <span class="tooltip-text">Duplicate</span>
            </div>
        </div>
    </td>
  `;

  // Get all dynamically added room type groups
  const roomTypeGroups = roomNameContainer.querySelectorAll(".room-type-group");

  if (roomTypeGroups.length > 0) {
    // Iterate through each dynamically added room type group
    roomTypeGroups.forEach((group) => {
      const dynamicRoomName = group.querySelector(".roomTypeName").value.trim();
      const dynamicAllotment = group.querySelector(".roomTypeAllotment").value.trim();
      const dynamicCutoff = group.querySelector(".roomTypeCutoff").value.trim();
      const dynamicMaxCapacity = group.querySelector(".roomTypeMaxCapacity").value.trim();
      const dynamicSinglePrice = group.querySelector(".roomTypeSinglePrice").value.trim();
      const dynamicDoublePrice = group.querySelector(".roomTypeDoublePrice").value.trim();

      // Validate required fields
      if (!dynamicRoomName) {
        alert("Room Name is required for dynamically added rooms.");
        return; // Skip this iteration
      }

      // Add a new row for this room type
      const newRow = roomTypesTable.insertRow();
      newRow.innerHTML = `
        <td><input type="checkbox" class="rowCheckbox" onchange="toggleEditButtonVisibility()" /></td>
        <td>${fromDate}</td>
        <td>${toDate}</td>
        <td>${dynamicRoomName}<br>Allotment: ${dynamicAllotment || 0}
        <br>CutOff Days: ${dynamicCutoff || 0}<br>Max Capacity: ${dynamicMaxCapacity || 0}</td>
          <td>Single: ${dynamicSinglePrice || 0}<br>Double: ${
        dynamicDoublePrice || 0
      }</td>
          <td>Adult: ${
            document.getElementById("extraBedAdult").value.trim() || 0
          }<br>Child: ${
        document.getElementById("extraBedChild").value.trim() || 0
      }<br>Shared: ${
        document.getElementById("extraBedShared").value.trim() || 0
      }</td>
          <td>ABF: ${
            document.getElementById("foodCostAdultABF").value.trim() || 0
          }<br>Lunch: ${
        document.getElementById("foodCostAdultLunch").value.trim() || 0
      }<br>Dinner: ${
        document.getElementById("foodCostAdultDinner").value.trim() || 0
      }<br>All Inclusive: ${
        document
          .getElementById("foodCostAdultAllinclusive")
          .value.trim() || 0
      }</td>
          <td>ABF: ${
            document.getElementById("foodCostChildABF").value.trim() || 0
          }<br>Lunch: ${
        document.getElementById("foodCostChildLunch").value.trim() || 0
      }<br>Dinner: ${
        document.getElementById("foodCostChildDinner").value.trim() || 0
      }<br>All Inclusive: ${
        document
          .getElementById("foodCostChildAllinclusive")
          .value.trim() || 0
      }</td>
          <td>
              <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: nowrap;">
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-success btn-sm" onclick="editRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-edit"></i>
                      </button>
                      <span class="tooltip-text">Edit</span>
                  </div>
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-danger btn-sm" onclick="deleteRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-trash"></i>
                      </button>
                      <span class="tooltip-text">Delete</span>
                  </div>
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-warning btn-sm" onclick="duplicateRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-copy"></i>
                      </button>
                      <span class="tooltip-text">Duplicate</span>
                  </div>
              </div>
          </td>
      `;
    });
  }

  // Clear inputs and close the modal
  document.getElementById("roomTypeForm").reset();
  roomNameContainer.innerHTML = ""; // Clear dynamically added room types
  $("#roomTypeModal").modal("hide");

  console.log("All room types saved successfully!");
}

// Edit an existing room type row
function editRoomType(button) {
  const row = button.closest("tr");
  const cells = row.getElementsByTagName("td");

  currentRoomTypeRow = row; // Save reference to the current row being edited

  document.getElementById("editFromDate").value = formatToYYYYMMDD(
    cells[1].textContent.trim()
  );
  document.getElementById("editToDate").value = formatToYYYYMMDD(
    cells[2].textContent.trim()
  );

  // Parsing Name and Allotment fields
  const nameAllotment = cells[3].innerHTML.split("<br>");
  document.getElementById("editRoomType").value = nameAllotment[0]
    .replace("", "")
    .trim();
  document.getElementById("editAllotment").value = nameAllotment[1]
    .replace("Allotment: ", "")
    .trim();
  document.getElementById("editCutoff").value = nameAllotment[2]
    .replace("CutOff Days: ", "")
    .trim();
  document.getElementById("editMaxCapacity").value = nameAllotment[3]
    ?.replace("Max Capacity: ", "")
    .trim() || "0";

  // Parsing Single and Double Prices
  const prices = cells[4].innerHTML.split("<br>");
  document.getElementById("editSinglePrice").value = prices[0]
    .replace("Single: ", "")
    .trim();
  document.getElementById("editDoublePrice").value = prices[1]
    .replace("Double: ", "")
    .trim();

  // Parsing Extra Bed details
  const extraBedDetails = cells[5].innerHTML.split("<br>");
  document.getElementById("editExtraBedAdult").value = extraBedDetails[0]
    .replace("Adult: ", "")
    .trim();
  document.getElementById("editExtraBedChild").value = extraBedDetails[1]
    .replace("Child: ", "")
    .trim();
  document.getElementById("editExtraBedShared").value = extraBedDetails[2]
    .replace("Shared: ", "")
    .trim();

  // Parsing Food Cost for Adults
  const foodCostAdult = cells[6].innerHTML.split("<br>");
  document.getElementById("editFoodCostAdultABF").value = foodCostAdult[0]
    .replace("ABF: ", "")
    .trim();
  document.getElementById("editFoodCostAdultLunch").value =
    foodCostAdult[1].replace("Lunch: ", "").trim();
  document.getElementById("editFoodCostAdultDinner").value =
    foodCostAdult[2].replace("Dinner: ", "").trim();
  document.getElementById("editFoodCostAdultAllinclusive").value =
    foodCostAdult[3].replace("All Inclusive: ", "").trim();

  // Parsing Food Cost for Children
  const foodCostChild = cells[7].innerHTML.split("<br>");
  document.getElementById("editFoodCostChildABF").value = foodCostChild[0]?.replace("ABF: ", "").trim() || "";
  document.getElementById("editFoodCostChildLunch").value = foodCostChild[1]?.replace("Lunch: ", "").trim() || "";
  document.getElementById("editFoodCostChildDinner").value = foodCostChild[2]?.replace("Dinner: ", "").trim() || "";
  document.getElementById("editFoodCostChildAllinclusive").value = foodCostChild[3]?.replace("All Inclusive: ", "").trim() || "";

  // Show the modal for editing
  $("#editRoomTypeModal").modal("show");
}

function saveEditedRoomType() {
  const editFromDateInput = document.getElementById("editFromDate");
  const editToDateInput = document.getElementById("editToDate");

  if (!validateDateRange(editFromDateInput, editToDateInput)) {
    return; // Stop the function if validation fails
  }

  if (currentRoomTypeRow) {
    const cells = currentRoomTypeRow.getElementsByTagName("td");

    cells[1].textContent = formatToDDMMYYYY(
      document.getElementById("editFromDate").value.trim()
    );
    cells[2].textContent = formatToDDMMYYYY(
      document.getElementById("editToDate").value.trim()
    );
    cells[3].innerHTML = `${document
      .getElementById("editRoomType")
      .value.trim()}<br>Allotment: ${document
      .getElementById("editAllotment")
      .value.trim()}<br>CutOff Days: ${document
      .getElementById("editCutoff")
      .value.trim()}<br>Max Capacity: ${document
      .getElementById("editMaxCapacity")
      .value.trim()}`;
    cells[4].innerHTML = `Single: ${document
      .getElementById("editSinglePrice")
      .value.trim()}<br>Double: ${document
      .getElementById("editDoublePrice")
      .value.trim()}`;
    cells[6].innerHTML = `Adult: ${document
      .getElementById("editExtraBedAdult")
      .value.trim()}<br>Child: ${document
      .getElementById("editExtraBedChild")
      .value.trim()}<br>Shared: ${document
      .getElementById("editExtraBedShared")
      .value.trim()}`;
    cells[7].innerHTML = `ABF: ${document
      .getElementById("editFoodCostAdultABF")
      .value.trim()}<br>Lunch: ${document
      .getElementById("editFoodCostAdultLunch")
      .value.trim()}<br>Dinner: ${document
      .getElementById("editFoodCostAdultDinner")
      .value.trim()}<br>All Inclusive: ${document
      .getElementById("editFoodCostAdultAllinclusive")
      .value.trim()}`;
    cells[8].innerHTML = `ABF: ${document
      .getElementById("editFoodCostChildABF")
      .value.trim()}<br>Lunch: ${document
      .getElementById("editFoodCostChildLunch")
      .value.trim()}<br>Dinner: ${document
      .getElementById("editFoodCostChildDinner")
      .value.trim()}<br>All Inclusive: ${document
      .getElementById("editFoodCostChildAllinclusive")
      .value.trim()}`;

    $("#editRoomTypeModal").modal("hide");
    currentRoomTypeRow = null; // Reset current row reference
  }
}

// Add a new contact row from the modal form
function saveContact() {
  const name = document.getElementById("contactName").value;
  const email = document.getElementById("contactEmail").value;
  const telephone = document.getElementById("contactTelephone").value;

  const table = document
    .getElementById("contactsTable")
    .getElementsByTagName("tbody")[0];
  const newRow = table.insertRow();

  newRow.innerHTML = `
        <td>${name}</td>
        <td>${email}</td>
        <td>${telephone}</td>
        <td>
            <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: nowrap;">
                <div class="tooltip-btn">
                    <button type="button" class="btn btn-success btn-sm" onclick="editContactRow(this)" style="min-width: 32px; padding: 6px 8px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <span class="tooltip-text">Edit</span>
                </div>
                <div class="tooltip-btn">
                    <button type="button" class="btn btn-danger btn-sm" onclick="deleteContactRow(this)" style="min-width: 32px; padding: 6px 8px;">
                        <i class="fas fa-trash"></i>
                    </button>
                    <span class="tooltip-text">Delete</span>
                </div>
            </div>
        </td>
    `;

  // Clear form and hide modal
  document.getElementById("contactForm").reset();
  $("#contactModal").modal("hide");
}

// Edit a contact row
function editContactRow(button) {
  const row = button.closest("tr");
  const cells = row.getElementsByTagName("td");

  currentContactRow = row; // Save reference to the current row being edited

  document.getElementById("editContactName").value = cells[0].textContent;
  document.getElementById("editContactEmail").value = cells[1].textContent;
  document.getElementById("editContactTelephone").value = cells[2].textContent;

  $("#editContactModal").modal("show");
}

// Save the edited contact
function saveEditedContact() {
  if (currentContactRow) {
    const cells = currentContactRow.getElementsByTagName("td");

    cells[0].textContent = document.getElementById("editContactName").value;
    cells[1].textContent = document.getElementById("editContactEmail").value;
    cells[2].textContent = document.getElementById("editContactTelephone").value;

    $("#editContactModal").modal("hide");
    currentContactRow = null; // Reset current row reference
  }
}
// Add a function to parse integers safely
function parseIntegerOrDefault(value, defaultValue = 0) {
  const parsedValue = parseInt(value, 10);
  return isNaN(parsedValue) ? defaultValue : parsedValue;
}

// Add a new promotion row from the modal form
function savePromotion() {
  const fromDateInputBooking = document.getElementById("bookingDateFrom");
  const toDateInputBooking = document.getElementById("bookingDateTo");

  if (!validateDateRange(fromDateInputBooking, toDateInputBooking)) {
    return;
  }

  const code = document.getElementById("promotionCode").value.trim();
  const name = document.getElementById("promotionName").value.trim();
  const bookingDateFrom = formatToDDMMYYYY(
    document.getElementById("bookingDateFrom").value
  );
  const bookingDateTo = formatToDDMMYYYY(
    document.getElementById("bookingDateTo").value
  );
  const earlyBird = parseIntegerOrDefault(
    document.getElementById("earlyBird").value.trim()
  );
  const minNights = parseIntegerOrDefault(
    document.getElementById("minNights").value.trim()
  );
  const freeMealsABF = parseIntegerOrDefault(
    document.getElementById("free_meals_abf").value.trim()
  );
  const freeMealsLunch = parseIntegerOrDefault(
    document.getElementById("free_meals_lunch").value.trim()
  );
  const freeMealsDinner = parseIntegerOrDefault(
    document.getElementById("free_meals_dinner").value.trim()
  );
  const discount = parseIntegerOrDefault(
    document.getElementById("discount").value.trim()
  );
  const discountType = document.getElementById("discounttype").value;
  const enabled = document.getElementById("enabled").checked;
  const validForExtraBeds =
    document.getElementById("validforextrabeds").checked;
  const description =
    document.getElementById("promotiondescription")
    .value.trim();

  // Check required fields
  if (!code || !name) {
    alert("Please fill in all required fields.");
    return;
  }

  const discountDisplay = discount ? `${discount} ${discountType}` : "";
  const enabledDisplay = enabled ? "Yes" : "No";
  const validForExtraBedsDisplay = validForExtraBeds ? "Yes" : "No";

  const table = document
    .getElementById("promotionsTable")
    .getElementsByTagName("tbody")[0];
  const newRow = table.insertRow();
  newRow.innerHTML = `
<td>${code}</td>
<td>${name}</td>
<td>${bookingDateFrom}</td>
<td>${bookingDateTo}</td>
<td>${earlyBird}</td>
<td>${minNights}</td>
<td>ABF: ${freeMealsABF}, Lunch: ${freeMealsLunch}, Dinner: ${freeMealsDinner}</td>
<td>${discountDisplay}</td>
<td style="display:none;">${validForExtraBedsDisplay}</td>
<td>${enabledDisplay}</td>
<td style="display:none;">${description}</td>
<td>
    <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: nowrap;">
        <div class="tooltip-btn">
            <button type="button" class="btn btn-success btn-sm" onclick="editPromotionRow(this)" style="min-width: 32px; padding: 6px 8px;">
                <i class="fas fa-edit"></i>
            </button>
            <span class="tooltip-text">Edit</span>
        </div>
        <div class="tooltip-btn">
            <button type="button" class="btn btn-danger btn-sm" onclick="deletePromotionRow(this)" style="min-width: 32px; padding: 6px 8px;">
                <i class="fas fa-trash"></i>
            </button>
            <span class="tooltip-text">Delete</span>
        </div>
    </div>
</td>
`;

  document.getElementById("promotionForm").reset();
  $("#promotionModal").modal("hide");
}

// Edit an existing promotion row
function editPromotionRow(button) {
  const row = button.closest("tr");
  const cells = row.getElementsByTagName("td");

  currentPromotionRow = row; // Save reference to the current row being edited

  // Populate modal fields
  document.getElementById("editPromotionCode").value =
    cells[0].textContent.trim();
  document.getElementById("editPromotionName").value =
    cells[1].textContent.trim();
  document.getElementById("editBookingDateFrom").value = formatToYYYYMMDD(
    cells[2].textContent.trim()
  );
  document.getElementById("editBookingDateTo").value = formatToYYYYMMDD(
    cells[3].textContent.trim()
  );
  document.getElementById("editEarlyBird").value =
    cells[4].textContent.trim();
  document.getElementById("editMinNights").value =
    cells[5].textContent.trim();

  document.getElementById("editfree_meals_abf").value =
    cells[6].textContent.split(", ")[0].replace("ABF: ", "").trim();
  document.getElementById("edit_free_meals_lunch").value =
    cells[6].textContent.split(", ")[1].replace("Lunch: ", "").trim();
  document.getElementById("edit_free_meals_dinner").value =
    cells[6].textContent.split(", ")[2].replace("Dinner: ", "").trim();

  document.getElementById("editDiscount").value = parseFloat(
    cells[7].textContent.split(" ")[0]
  );
  document.getElementById("editDiscountType").value =
    cells[7].textContent.split(" ")[1];

  // Update valid_for_extra_beds checkbox
  document.getElementById("editValidForExtraBeds").checked =
    cells[8].textContent.trim() === "Yes";

  // Assuming editEnabled is no longer a checkbox, ensure you get its value correctly
  document.getElementById("editEnabled").checked =
    cells[9].textContent.trim() === "Yes";
  document.getElementById("editpromotiondescription").value =
    cells[10].textContent.trim();

  $("#editPromotionModal").modal("show");
}

// Save the edited promotion
function saveEditedPromotion() {
  const fromDateInputBooking = document.getElementById(
    "editBookingDateFrom"
  );
  const toDateInputBooking = document.getElementById("editBookingDateTo");

  if (!validateDateRange(fromDateInputBooking, toDateInputBooking)) {
    return;
  }

  if (currentPromotionRow) {
    const cells = currentPromotionRow.getElementsByTagName("td");

    cells[0].textContent = document
      .getElementById("editPromotionCode")
      .value.trim();
    cells[1].textContent = document
      .getElementById("editPromotionName")
      .value.trim();
    cells[2].textContent = formatToDDMMYYYY(
      document.getElementById("editBookingDateFrom").value.trim()
    );
    cells[3].textContent = formatToDDMMYYYY(
      document.getElementById("editBookingDateTo").value.trim()
    );
    cells[4].textContent = parseIntegerOrDefault(
      document.getElementById("editEarlyBird").value.trim()
    );
    cells[5].textContent = parseIntegerOrDefault(
      document.getElementById("editMinNights").value.trim()
    );
    cells[6].textContent = `ABF: ${parseIntegerOrDefault(
      document.getElementById("editfree_meals_abf").value.trim()
    )}, Lunch: ${parseIntegerOrDefault(
      document.getElementById("edit_free_meals_lunch").value.trim()
    )}, Dinner: ${parseIntegerOrDefault(
      document.getElementById("edit_free_meals_dinner").value.trim()
    )}`;
    cells[7].textContent = `${parseIntegerOrDefault(
      document.getElementById("editDiscount").value.trim()
    )} ${document.getElementById("editDiscountType").value}`;
    cells[8].textContent = document.getElementById(
      "editValidForExtraBeds"
    ).checked
      ? "Yes"
      : "No";
    cells[9].textContent = document.getElementById("editEnabled").checked
      ? "Yes"
      : "No";
    cells[10].textContent = document
      .getElementById("editpromotiondescription")
      .value.trim();

    $("#editPromotionModal").modal("hide");
    currentPromotionRow = null; // Reset current row reference
  }
}

// Delete a contact row
function deleteContactRow(button) {
  if (confirm("Are you sure you want to delete this Contact?")) {
    const row = button.closest("tr");
    row.parentNode.removeChild(row);
  }
}

// Delete a promotion row
function deletePromotionRow(button) {
  if (confirm("Are you sure you want to delete this Promotion?")) {
    const row = button.closest("tr");
    row.parentNode.removeChild(row);
  }
}

// Delete a room type row
function deleteRoomType(button) {
  if (confirm("Are you sure you want to delete this Room Type?")) {
    const row = button.closest("tr");
    row.parentNode.removeChild(row);
  }
}

function validatePercentageInput(input) {
  const value = parseFloat(input.value);
  if (isNaN(value) || value < 0 || value > 100) {
    alert("Please enter a valid percentage between 0 and 100.");
    input.value = ""; // Clear the input if invalid
  }
}
// Utility function for parsing floats safely
function parseFloatOrDefault(value, defaultValue = 0) {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseIntOrDefault(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getPromotionsFromTable() {
  const promotions = [];
  const rows = document.querySelectorAll("#promotionsTable tbody tr");

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");
    const getDateOrNull = (dateString) => {
      const date = new Date(convertToISODate(dateString));
      return isNaN(date.getTime()) ? null : date.toISOString();
    };

    const promotion = {
      promotion_code: cells[0].textContent,
      name: cells[1].textContent,
      booking_date_from: getDateOrNull(cells[2].textContent),
      booking_date_to: getDateOrNull(cells[3].textContent),
      early_bird_days: parseIntegerOrDefault(cells[4].textContent),
      minimum_nights: parseIntegerOrDefault(cells[5].textContent),
      free_meals_abf: parseIntegerOrDefault(
        cells[6].textContent.split(", ")[0].replace("ABF: ", "")
      ),
      free_meals_lunch: parseIntegerOrDefault(
        cells[6].textContent.split(", ")[1].replace("Lunch: ", "")
      ),
      free_meals_dinner: parseIntegerOrDefault(
        cells[6].textContent.split(", ")[2].replace("Dinner: ", "").trim()
      ),
      discount_amount: parseFloatOrDefault(
        cells[7].textContent.split(" ")[0]
      ),
      discount_type: cells[7].textContent.split(" ")[1],
      valid_for_extra_beds: cells[8].textContent === "Yes",
      enabled: cells[9].textContent === "Yes",
      description: cells[10].textContent,
    };
    promotions.push(promotion);
  });
  return promotions;
}

document.addEventListener("DOMContentLoaded", function () {
  // Initialize location cache functionality
  LocationCache.populateCountriesDropdown("country");
  
  // Country change handler
  document
    .getElementById("country")
    .addEventListener("change", function () {
      const selectedCountry = this.value;
      LocationCache.populateCitiesDropdown(
        selectedCountry,
        "hotelLocation",
        "addNewCityBtn"
      );
    });

  // Add new city button handler
  document
    .getElementById("addNewCityBtn")
    .addEventListener("click", function () {
      const selectedCountry = document.getElementById("country").value;
      const selectedCountryText =
        document.getElementById("country").selectedOptions[0]
          ?.textContent;

      if (!selectedCountry) {
        alert("Please select a country first");
        return;
      }

      document.getElementById("newCityCountry").value =
        selectedCountryText;
      document.getElementById("newCityName").value = "";
      $("#addNewCityModal").modal("show");
    });

  // Save new city handler
  document
    .getElementById("saveNewCity")
    .addEventListener("click", async function () {
      const cityName = document
        .getElementById("newCityName")
        .value.trim();
      const countryCode = document.getElementById("country").value;

      if (!cityName) {
        alert("Please enter a city name");
        return;
      }

      // Show loading state
      const spinner = this.querySelector(".fa-spinner");
      spinner.style.display = "inline-block";
      this.disabled = true;

      try {
        const success = await LocationCache.addNewCity(
          cityName,
          countryCode
        );
        if (success) {
          // Reload cities for the current country (will use updated cache)
          await LocationCache.populateCitiesDropdown(
            countryCode,
            "hotelLocation",
            "addNewCityBtn"
          );

          // Select the newly added city
          const cityDropdown = document.getElementById("hotelLocation");
          cityDropdown.value = cityName;

          // Close modal
          $("#addNewCityModal").modal("hide");
          alert("City added successfully!");
        }
      } finally {
        // Hide loading state
        spinner.style.display = "none";
        this.disabled = false;
      }
    });

  const addRoomNameRowBtn = document.getElementById("addRoomNameRowBtn");
  const roomNameContainer = document.getElementById("roomNameContainer");

  // Event listener for the Add Room Type button
  addRoomNameRowBtn.addEventListener("click", function () {
    // Create a new room type input group
    const newRoomType = document.createElement("div");
    newRoomType.className = "room-type-group mb-3";
    newRoomType.innerHTML = `
      <div class="form-row">
        <div class="form-group col-md-6">
          <label style="font-weight: bold">Room Type(Name,Allotment,Cut-Off,Max Capacity)</label>
          <div class="d-flex">
            <input
              type="text"
              class="form-control mr-2 roomTypeName"
              placeholder="Name"
              required
            />
            <input
              type="number"
              class="form-control mr-2 roomTypeAllotment"
              placeholder="Allotment"
              required
            />
            <input
              type="number"
              class="form-control mr-2 roomTypeCutoff"
              placeholder="Cut-Off"
              required
            />
            <input
              type="number"
              class="form-control roomTypeMaxCapacity"
              placeholder="Max Capacity"
              min="0"
            />
          </div>
        </div>
        <div class="form-group col-md-6">
          <label style="font-weight: bold">Room Price (Single, Double)</label>
          <div class="d-flex">
            <input
              type="number"
              class="form-control mr-2 roomTypeSinglePrice"
              placeholder="Single Price"
              required
            />
            <input
              type="number"
              class="form-control roomTypeDoublePrice"
              placeholder="Double Price"
              required
            />
          </div>
        </div>
      </div>
      <button type="button" class="btn btn-danger btn-sm remove-room-type">
        Remove
      </button>
      <hr />
    `;

    // Append the new room type input group to the container
    roomNameContainer.appendChild(newRoomType);

    // Add event listener for removing the row
    const removeButton = newRoomType.querySelector(".remove-room-type");
    removeButton.addEventListener("click", function () {
      roomNameContainer.removeChild(newRoomType);
    });
  });

  // Date range picker is not used in this implementation

  // NOTE: Cities dropdown is initialized via LocationCache.populateCountriesDropdown
  // which triggers country change event and loads cities automatically.
  // Do NOT call populateCitiesDropdown() here as it loads ALL cities without country filtering.

  // Function to validate discount input based on discount type
  function validateDiscountAmount(inputElement, typeElement) {
    const discountType = typeElement.value;
    const discountValue = parseFloat(inputElement.value);

    if (discountType === "%") {
      if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
        alert(
          "For percentage discount, please enter a value between 0 and 100."
        );
        inputElement.value = ""; // Clear the input if invalid
      }
    }
  }
  // Add event listeners for early bird and minimum nights fields
  const earlyBirdInput = document.getElementById("earlyBird");
  const minNightsInput = document.getElementById("minNights");

  earlyBirdInput.addEventListener("input", function () {
    if (earlyBirdInput.value.trim() !== "") {
      minNightsInput.disabled = true;
    } else {
      minNightsInput.disabled = false;
    }
  });

  minNightsInput.addEventListener("input", function () {
    if (minNightsInput.value.trim() !== "") {
      earlyBirdInput.disabled = true;
    } else {
      earlyBirdInput.disabled = false;
    }
  });

  // For the edit modal inputs
  const editEarlyBirdInput = document.getElementById("editEarlyBird");
  const editMinNightsInput = document.getElementById("editMinNights");

  editEarlyBirdInput.addEventListener("input", function () {
    if (editEarlyBirdInput.value.trim() !== "") {
      editMinNightsInput.disabled = true;
    } else {
      editMinNightsInput.disabled = false;
    }
  });

  editMinNightsInput.addEventListener("input", function () {
    if (editMinNightsInput.value.trim() !== "") {
      editEarlyBirdInput.disabled = true;
    } else {
      editEarlyBirdInput.disabled = false;
    }
  });

  // Add event listeners to validate discount input for the add promotion modal
  const discountInput = document.getElementById("discount");
  const discountTypeInput = document.getElementById("discounttype");
  discountInput.addEventListener("input", () =>
    validateDiscountAmount(discountInput, discountTypeInput)
  );
  discountTypeInput.addEventListener("change", () =>
    validateDiscountAmount(discountInput, discountTypeInput)
  );

  // Add event listeners to validate discount input for the edit promotion modal
  const editDiscountInput = document.getElementById("editDiscount");
  const editDiscountTypeInput = document.getElementById("editDiscountType");
  editDiscountInput.addEventListener("input", () =>
    validateDiscountAmount(editDiscountInput, editDiscountTypeInput)
  );
  editDiscountTypeInput.addEventListener("change", () =>
    validateDiscountAmount(editDiscountInput, editDiscountTypeInput)
  );

  // Save Duplicate Room Type
  document
    .getElementById("saveDuplicateRoomTypeBtn")
    .addEventListener("click", function () {
      const roomTypesTable = document
        .getElementById("roomTypesTable")
        .getElementsByTagName("tbody")[0];

      const fromDate = formatToDDMMYYYY(
        document.getElementById("duplicateFromDate").value
      );
      const toDate = formatToDDMMYYYY(
        document.getElementById("duplicateToDate").value
      );
      const roomTypeName = document.getElementById("duplicateRoomType").value.trim();

      if (!validateDateRange(fromDate, toDate)) {
        return; // Stop the function if validation fails
      }

      // Prevent saving if a duplicate entry exists
      const existingRows = roomTypesTable.getElementsByTagName("tr");
      for (let row of existingRows) {
          const cells = row.getElementsByTagName("td");
          if (
              cells[1].textContent.trim() === fromDate &&
              cells[2].textContent.trim() === toDate &&
              cells[3].textContent.trim().includes(roomTypeName)
          ) {
              alert("A similar room type with the same date range already exists.");
              return; // Stop the function
          }
      }

      const newRow = roomTypesTable.insertRow();
      newRow.innerHTML = `
          <td><input type="checkbox" class="rowCheckbox" onchange="toggleEditButtonVisibility()" /></td>
          <td>${fromDate}</td>
          <td>${toDate}</td>
          <td>${roomTypeName}<br>Allotment: ${
       document.getElementById("duplicateAllotment").value
     }<br>CutOff Days: ${document.getElementById("duplicateCutoff").value}<br>Max Capacity: ${document.getElementById("duplicateMaxCapacity").value}</td>
          <td>Single: ${
            document.getElementById("duplicateSinglePrice").value
          }<br>Double: ${
       document.getElementById("duplicateDoublePrice").value
     }</td>
          <td>Adult: ${
            document.getElementById("duplicateExtraBedAdult").value
          }<br>Child: ${
        document.getElementById("duplicateExtraBedChild").value
      }<br>Shared: ${
        document.getElementById("duplicateExtraBedShared").value
      }</td>
          <td>ABF: ${
            document.getElementById("duplicateFoodCostAdultABF").value
          }<br>Lunch: ${
        document.getElementById("duplicateFoodCostAdultLunch").value
      }<br>Dinner: ${
        document.getElementById("duplicateFoodCostAdultDinner").value
      }<br>All Inclusive: ${
        document.getElementById("duplicateFoodCostAdultAllinclusive").value
      }</td>
          <td>ABF: ${
            document.getElementById("duplicateFoodCostChildABF").value
          }<br>Lunch: ${
        document.getElementById("duplicateFoodCostChildLunch").value
      }<br>Dinner: ${
        document.getElementById("duplicateFoodCostChildDinner").value
      }<br>All Inclusive: ${
        document.getElementById("duplicateFoodCostChildAllinclusive").value
      }</td>
          <td>
              <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: nowrap;">
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-success btn-sm" onclick="editRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-edit"></i>
                      </button>
                      <span class="tooltip-text">Edit</span>
                  </div>
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-danger btn-sm" onclick="deleteRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-trash"></i>
                      </button>
                      <span class="tooltip-text">Delete</span>
                  </div>
                  <div class="tooltip-btn">
                      <button type="button" class="btn btn-warning btn-sm" onclick="duplicateRoomType(this)" style="min-width: 32px; padding: 6px 8px;">
                          <i class="fas fa-copy"></i>
                      </button>
                      <span class="tooltip-text">Duplicate</span>
                  </div>
              </div>
          </td>
      `;

      // Hide the modal after saving
      $("#duplicateRoomTypeModal").modal("hide");
    });

  document
    .getElementById("saveContactBtn")
    .addEventListener("click", function () {
      // Check validity
      if (contactForm.checkValidity() === false) {
        contactForm.classList.add("was-validated");
        return; // Do not proceed if form is invalid
      }

      // If the form is valid, proceed with saving the contact
      saveContact();
      $("#contactModal").modal("hide");
    });
  document
    .getElementById("saveEditedContactBtn")
    .addEventListener("click", function () {
      // Check validity
      if (editContactForm.checkValidity() === false) {
        editContactForm.classList.add("was-validated");
        return; // Do not proceed if form is invalid
      }

      // If the form is valid, proceed with saving the contact
      saveEditedContact();
      $("#editContactModal").modal("hide");
    });
  document
    .getElementById("savePromotionBtn")
    .addEventListener("click", savePromotion);
  document
    .getElementById("saveRoomTypeBtn")
    .addEventListener("click", function () {
      const roomTypeInput = document.getElementById("roomType");

      // Check if the roomType input is empty
      if (roomTypeInput.value.trim() === "") {
        // Set a custom validation message
        roomTypeInput.setCustomValidity("Please enter the room name.");
        // Trigger the invalid event to show the error message
        roomTypeInput.reportValidity();
      } else {
        // Clear any previous validation messages
        roomTypeInput.setCustomValidity("");
        // Proceed with saving the room type
        saveRoomType();
      }
    });

  document
    .getElementById("saveEditedRoomTypeBtn")
    .addEventListener("click", saveEditedRoomType);
  document
    .getElementById("saveEditedPromotionBtn")
    .addEventListener("click", saveEditedPromotion);

  document
    .getElementById("editHotelForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();
      const name = document.getElementById("hotelName").value;
      const city = document.getElementById("hotelLocation").value;
      const address = document.getElementById("hotelAddress").value;
      const earlyCheckinAdd = parseInt(
        document.getElementById("earlycheckinadd").value,
        10
      );
      const lateCheckoutAdd = parseInt(
        document.getElementById("latecheckoutadd").value,
        10
      );
      const christmasDinner = parseInt(
        document.getElementById("christmasdinner").value,
        10
      );
      const newYear = parseInt(document.getElementById("newyear").value, 10);
      const hotelNotesForAgent =
        document.getElementById("hotelnotesforagent").value;

      const contacts = Array.from(
        document.querySelectorAll("#contactsTable tbody tr")
      ).map((row) => ({
        contact_name: row.cells[0].textContent,
        email: row.cells[1].textContent,
        telephone: row.cells[2].textContent,
      }));

      let allotment = document.getElementById("allotment").value;
      if (!allotment) {
        allotment = 0; // Default to 0 if no allotment is provided
      }
      function getRoomTypesFromTable() {
        const roomTypes = [];
        const rows = document.querySelectorAll("#roomTypesTable tbody tr");

        rows.forEach((row) => {
          const cells = row.getElementsByTagName("td");

          // Extract room type details
          const nameLine = cells[3].innerText.split("\n")[0];
          const allotmentLine = cells[3].innerText.split("\n")[1];
          const cutoffLine = cells[3].innerText.split("\n").find((line) => /cut.*off.*days/i.test(line)) ||"CutOff Days: 0";
          const maxCapacityLine = cells[3].innerText.split("\n").find((line) => /max.*capacity/i.test(line)) || "Max Capacity: 0";
          const cutoffDays = parseIntOrDefault(cutoffLine.replace(/cut.*off.*days\s*:\s*/i, "").trim());
          const maxCapacity = parseIntOrDefault(maxCapacityLine.replace(/max.*capacity\s*:\s*/i, "").trim());

          const startDateISO = convertToISODate(cells[1].textContent.trim());
          const endDateISO = convertToISODate(cells[2].textContent.trim());

          const roomType = {
            id: parseInt(row.getAttribute("data-room-type-id") || "0", 10),
            name: nameLine.replace("", "").trim(),
            start_date: new Date(startDateISO).toISOString(),
            end_date: new Date(endDateISO).toISOString(),
            single_price: parseFloatOrDefault(
              cells[4].innerText.split("\n")[0].replace("Single: ", "").trim()
            ),
            double_price: parseFloatOrDefault(
              cells[4].innerText.split("\n")[1].replace("Double: ", "").trim()
            ),
            allotment: parseIntOrDefault(
              allotmentLine.replace("Allotment: ", "").trim()
            ),
            cutoff_days: cutoffDays,
            max_capacity: maxCapacity,
            extra_bed_adult: parseFloatOrDefault(
              cells[5].innerText.split("\n")[0].replace("Adult: ", "").trim()
            ),
            extra_bed_child: parseFloatOrDefault(
              cells[5].innerText.split("\n")[1].replace("Child: ", "").trim()
            ),
            extra_bed_shared: parseFloatOrDefault(
              cells[5].innerText.split("\n")[2].replace("Shared: ", "").trim()
            ),
            food_adult_abf: parseFloatOrDefault(
              cells[6].innerText.split("\n")[0].replace("ABF: ", "").trim()
            ),
            food_adult_lunch: parseFloatOrDefault(
              cells[6].innerText.split("\n")[1]?.replace("Lunch: ", "").trim() || ""
            ),
            food_adult_dinner: parseFloatOrDefault(
              cells[6].innerText.split("\n")[2]?.replace("Dinner: ", "").trim() || ""
            ),
            food_adult_all_inclusive: parseFloatOrDefault(
              cells[6].innerText
                .split("\n")[3]
                ?.replace("All Inclusive: ", "")
                .trim() || ""
            ),
            food_child_abf: parseFloatOrDefault(
              cells[7].innerText.split("\n")[0]?.replace("ABF: ", "").trim() || ""
            ),
            food_child_lunch: parseFloatOrDefault(
              cells[7].innerText.split("\n")[1]?.replace("Lunch: ", "").trim() || ""
            ),
            food_child_dinner: parseFloatOrDefault(
              cells[7].innerText.split("\n")[2]?.replace("Dinner: ", "").trim() || ""
            ),
            food_child_all_inclusive: parseFloatOrDefault(
              cells[7].innerText
                .split("\n")[3]
                ?.replace("All Inclusive: ", "")
                .trim() || ""
            ),
            currency_id: 4, // Assuming THB as the currency ID
          };

          roomTypes.push(roomType);
        });

        return roomTypes;
      }

      const hotelData = {
        name,
        country: document.getElementById("country").value,
        city,
        address,
        notes: hotelNotesForAgent,
        contacts,
        fees: {
          early_checkin_fee: earlyCheckinAdd,
          late_checkout_fee: lateCheckoutAdd,
          christmas_dinner_fee: christmasDinner,
          new_year_dinner_fee: newYear,
          currency_id: 4, // Assuming THB as the currency
        },
        room_types: getRoomTypesFromTable(),
        promotions: getPromotionsFromTable(),
      };

      console.log(getRoomTypesFromTable());
      console.log(getPromotionsFromTable());
      console.log("Hotel Data being sent to backend:", hotelData);
      // Send the hotel data to the backend
      fetch(`${Endpoint}/api/v1/hotels`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`, // Include token if required
          "Content-Type": "application/json",
        },
        body: JSON.stringify(hotelData),
      })
        .then((response) => {
          if (response.ok) {
            alert("Hotel data saved successfully!");
            window.location.href = "hotels.html"; // Redirect to the hotel list page
          } else {
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
              return response.text().then((errorData) => {
                console.error("Raw response data:", errorData);
                throw new Error("Failed to save hotel data: " + errorData);
              });
            }
          }
        })
        .catch((error) => {
          console.error("Error saving hotel data:", error);
          alert(error.message);
        });
    });
});
