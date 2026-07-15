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

function getRoomTypeNameFromRow(row) {
  const roomCell = row?.getElementsByTagName("td")?.[3];
  return (roomCell?.textContent || "").split("\n")[0].trim().toLowerCase();
}

function getRoomTypeStartDateFromRow(row) {
  const dateCell = row?.getElementsByTagName("td")?.[1];
  return formatToYYYYMMDD((dateCell?.textContent || "").trim()) || "";
}

function getRoomTypeLowestPriceFromRow(row) {
  const priceCell = row?.getElementsByTagName("td")?.[4];
  const prices = (priceCell?.innerText || "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((price) => !Number.isNaN(price)) || [];
  return prices.length ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
}

function styleRoomTypeSeasonalityTable() {
  const tableBody = document.querySelector("#roomTypesTable tbody");
  if (!tableBody) return;

  const rows = Array.from(tableBody.querySelectorAll("tr"));
  const originalRows = rows.slice();
  const roomLowestPrices = rows.reduce((pricesByRoom, row) => {
    const roomName = getRoomTypeNameFromRow(row);
    if (!roomName) return pricesByRoom;
    const currentLowest = pricesByRoom.get(roomName) ?? Number.MAX_SAFE_INTEGER;
    pricesByRoom.set(roomName, Math.min(currentLowest, getRoomTypeLowestPriceFromRow(row)));
    return pricesByRoom;
  }, new Map());
  const sortedRows = rows.sort((a, b) => {
    const aName = getRoomTypeNameFromRow(a);
    const bName = getRoomTypeNameFromRow(b);
    const priceCompare = (roomLowestPrices.get(aName) ?? Number.MAX_SAFE_INTEGER) -
      (roomLowestPrices.get(bName) ?? Number.MAX_SAFE_INTEGER);
    if (priceCompare !== 0) return priceCompare;
    const nameCompare = aName.localeCompare(bName);
    if (nameCompare !== 0) return nameCompare;
    return getRoomTypeStartDateFromRow(a).localeCompare(
      getRoomTypeStartDateFromRow(b)
    );
  });
  if (sortedRows.some((row, index) => row !== originalRows[index])) {
    sortedRows.forEach((row) => tableBody.appendChild(row));
  }

  const groupedRows = new Map();
  Array.from(tableBody.querySelectorAll("tr")).forEach((row) => {
    const cells = row.getElementsByTagName("td");
    const roomCell = cells[3];
    if (!roomCell) return;
    row.classList.remove("room-season-row");
    row.classList.remove("room-type-group-row");
    roomCell.classList.remove("room-season-duplicate");
    roomCell.classList.remove("room-type-group-cell");

    const roomName = getRoomTypeNameFromRow(row);
    if (!roomName) return;
    if (!groupedRows.has(roomName)) {
      groupedRows.set(roomName, []);
    }
    groupedRows.get(roomName).push(row);
  });

  groupedRows.forEach((roomRows) => {
    roomRows.forEach((row, index) => {
      const roomCell = row.getElementsByTagName("td")[3];
      row.classList.add(index === 0 ? "room-type-group-row" : "room-season-row");
      roomCell.classList.add(index === 0 ? "room-type-group-cell" : "room-season-duplicate");
    });
  });
}

function installRoomTypeSeasonalityView() {
  const tableBody = document.querySelector("#roomTypesTable tbody");
  if (!tableBody || tableBody.dataset.seasonalityObserver === "true") return;
  tableBody.dataset.seasonalityObserver = "true";

  const style = document.createElement("style");
  style.textContent = `
    #roomTypesTable {
      width: 100%;
      table-layout: fixed;
    }
    #roomTypesTable thead,
    #roomTypesTable tbody {
      display: block;
      width: 100%;
    }
    #roomTypesTable thead tr,
    #roomTypesTable tbody tr {
      display: grid;
      grid-template-columns:
        minmax(220px, 1.45fr)
        44px
        minmax(120px, 0.72fr)
        minmax(120px, 0.72fr)
        minmax(140px, 0.9fr)
        minmax(130px, 0.82fr)
        minmax(170px, 1fr)
        minmax(170px, 1fr)
        minmax(130px, 0.78fr);
      width: 100%;
      align-items: stretch;
    }
    #roomTypesTable th,
    #roomTypesTable td {
      display: flex;
      align-items: center;
      min-width: 0;
      margin: 0;
      border-top: 0;
      border-left: 0;
      border-right: 0;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    #roomTypesTable th:nth-child(4), #roomTypesTable td:nth-child(4) { order: 1; }
    #roomTypesTable th:nth-child(1), #roomTypesTable td:nth-child(1) { order: 2; justify-content: center; }
    #roomTypesTable th:nth-child(2), #roomTypesTable td:nth-child(2) { order: 3; justify-content: center; }
    #roomTypesTable th:nth-child(3), #roomTypesTable td:nth-child(3) { order: 4; justify-content: center; }
    #roomTypesTable th:nth-child(5), #roomTypesTable td:nth-child(5) { order: 5; }
    #roomTypesTable th:nth-child(6), #roomTypesTable td:nth-child(6) { order: 6; }
    #roomTypesTable th:nth-child(7), #roomTypesTable td:nth-child(7) { order: 7; }
    #roomTypesTable th:nth-child(8), #roomTypesTable td:nth-child(8) { order: 8; }
    #roomTypesTable th:nth-child(9), #roomTypesTable td:nth-child(9) { order: 9; justify-content: center; }
    #roomTypesTable tbody tr.room-type-group-row td {
      border-top: 3px solid #1abb9c;
    }
    #roomTypesTable td.room-type-group-cell {
      background: #f4fbf9;
      font-weight: 700;
      color: #263f55;
      vertical-align: middle;
    }
    #roomTypesTable td.room-season-duplicate {
      color: transparent !important;
      font-size: inherit;
      position: static;
      background: #fbfdfe;
      font-weight: 700;
      text-shadow: none !important;
      user-select: none;
      vertical-align: middle;
    }
    #roomTypesTable td.room-season-duplicate * {
      color: transparent !important;
      text-shadow: none !important;
    }
    #massEditRoomTypeModal .modal-dialog {
      max-width: min(1280px, calc(100vw - 48px));
    }
    #dynamicRoomEntriesContainer {
      display: block;
      margin: 12px 0 0;
    }
    .mass-edit-room-table {
      border: 1px solid #dfe7ef;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }
    .mass-edit-room-header,
    #dynamicRoomEntriesContainer .dynamic-entry {
      display: grid;
      grid-template-columns: minmax(220px, 1.7fr) repeat(3, minmax(95px, 0.8fr)) repeat(2, minmax(130px, 1fr));
      gap: 0;
      align-items: center;
      margin: 0;
    }
    .mass-edit-room-header {
      background: #f3f7fb;
      color: #34495e;
      font-weight: 700;
      border-bottom: 1px solid #dfe7ef;
    }
    .mass-edit-room-header span,
    #dynamicRoomEntriesContainer .dynamic-entry input {
      min-width: 0;
    }
    .mass-edit-room-header span {
      padding: 10px 12px;
      border-right: 1px solid #dfe7ef;
    }
    .mass-edit-room-header span:last-child {
      border-right: 0;
    }
    #dynamicRoomEntriesContainer .dynamic-entry {
      border-bottom: 1px solid #edf1f5;
      padding: 8px;
      column-gap: 8px;
    }
    #dynamicRoomEntriesContainer .dynamic-entry:last-child {
      border-bottom: 0;
    }
    #dynamicRoomEntriesContainer .dynamic-entry input {
      height: 40px;
      font-size: 14px;
    }
  `;
  document.head.appendChild(style);

  let scheduled = false;
  const scheduleGrouping = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      styleRoomTypeSeasonalityTable();
    });
  };
  new MutationObserver(scheduleGrouping).observe(tableBody, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  scheduleGrouping();
}

document.addEventListener("DOMContentLoaded", installRoomTypeSeasonalityView);

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
          if (currentFromDate !== fromDate) fromDate = "";
          if (currentToDate !== toDate) toDate = "";
          if (currentExtraBedAdult !== extraBedAdult) extraBedAdult = "";
          if (currentExtraBedChild !== extraBedChild) extraBedChild = "";
          if (currentExtraBedShared !== extraBedShared) extraBedShared = "";
          if (currentFoodAdultABF !== foodAdultABF) foodAdultABF = "";
          if (currentFoodAdultLunch !== foodAdultLunch) foodAdultLunch = "";
          if (currentFoodAdultDinner !== foodAdultDinner) foodAdultDinner = "";
          if (currentFoodAdultAllinclusive !== foodAdultAllinclusive) foodAdultAllinclusive = "";
          if (currentFoodChildABF !== foodChildABF) foodChildABF = "";
          if (currentFoodChildLunch !== foodChildLunch) foodChildLunch = "";
          if (currentFoodChildDinner !== foodChildDinner) foodChildDinner = "";
          if (currentFoodChildAllinclusive !== foodChildAllinclusive) foodChildAllinclusive = "";
      }
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

  let roomEntriesHtml = `
      <div class="mass-edit-room-table">
          <div class="mass-edit-room-header">
              <span>Room Type</span>
              <span>Allotment</span>
              <span>Cut-off</span>
              <span>Max Capacity</span>
              <span>Single</span>
              <span>Double</span>
          </div>
  `;

  selectedRows.forEach((checkbox) => {
      const row = checkbox.closest("tr");
      const cells = row.getElementsByTagName("td");

      const nameAllotment = cells[3].innerHTML.split("<br>");
      const prices = cells[4].innerHTML.split("<br>");

      roomEntriesHtml += `
          <div class="dynamic-entry">
              <input type="text" class="form-control" value="${nameAllotment[0]?.replace("Name:", "").trim() || ""}" placeholder="Room Type" required>
              <input type="number" class="form-control" value="${nameAllotment[1]?.replace("Allotment:", "").trim() || ""}" placeholder="Allotment" required>
              <input type="number" class="form-control" value="${nameAllotment[2]?.replace("CutOff Days:", "").trim() || ""}" placeholder="Cut-off" required>
              <input type="number" class="form-control" value="${nameAllotment[3]?.replace("Max Capacity:", "").trim() || "0"}" placeholder="Max Capacity" min="0">
              <input type="number" class="form-control" value="${prices[0]?.replace("Single:", "").trim() || ""}" placeholder="Single" required>
              <input type="number" class="form-control" value="${prices[1]?.replace("Double:", "").trim() || ""}" placeholder="Double" required>
          </div>
      `;
  });
  roomEntriesHtml += "</div>";
  dynamicContainer.innerHTML = roomEntriesHtml;

  $("#massEditRoomTypeModal").modal("show");
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
  const fromDateInput = document.getElementById("massEditFromDate").value;
  const toDateInput = document.getElementById("massEditToDate").value;
  const fromDate = fromDateInput ? formatToDDMMYYYY(fromDateInput) : "";
  const toDate = toDateInput ? formatToDDMMYYYY(toDateInput) : "";
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

  if ((fromDate || toDate) && (!fromDate || !toDate || !validateDateRange(fromDate, toDate))) {
    return;
  }

  // ✅ Loop through selected rows and apply all changes
  selectedRows.forEach((checkbox, index) => {
      const row = checkbox.closest("tr");
      const cells = row.getElementsByTagName("td");

      // Update shared fields only when the user enters a value in the mass edit modal.
      if (fromDate) cells[1].textContent = fromDate;
      if (toDate) cells[2].textContent = toDate;

      const existingExtraBed = cells[5].innerHTML.split("<br>");
      const existingFoodAdult = cells[6].innerHTML.split("<br>");
      const existingFoodChild = cells[7].innerHTML.split("<br>");

      const nextExtraBedAdult = extraBedAdult !== "" ? extraBedAdult : existingExtraBed[0]?.replace("Adult: ", "").trim() || "";
      const nextExtraBedChild = extraBedChild !== "" ? extraBedChild : existingExtraBed[1]?.replace("Child: ", "").trim() || "";
      const nextExtraBedShared = extraBedShared !== "" ? extraBedShared : existingExtraBed[2]?.replace("Shared: ", "").trim() || "";
      const nextFoodAdultABF = foodAdultABF !== "" ? foodAdultABF : existingFoodAdult[0]?.replace("ABF: ", "").trim() || "";
      const nextFoodAdultLunch = foodAdultLunch !== "" ? foodAdultLunch : existingFoodAdult[1]?.replace("Lunch: ", "").trim() || "";
      const nextFoodAdultDinner = foodAdultDinner !== "" ? foodAdultDinner : existingFoodAdult[2]?.replace("Dinner: ", "").trim() || "";
      const nextFoodAdultAllinclusive = foodAdultAllinclusive !== "" ? foodAdultAllinclusive : existingFoodAdult[3]?.replace("All Inclusive: ", "").trim() || "";
      const nextFoodChildABF = foodChildABF !== "" ? foodChildABF : existingFoodChild[0]?.replace("ABF: ", "").trim() || "";
      const nextFoodChildLunch = foodChildLunch !== "" ? foodChildLunch : existingFoodChild[1]?.replace("Lunch: ", "").trim() || "";
      const nextFoodChildDinner = foodChildDinner !== "" ? foodChildDinner : existingFoodChild[2]?.replace("Dinner: ", "").trim() || "";
      const nextFoodChildAllinclusive = foodChildAllinclusive !== "" ? foodChildAllinclusive : existingFoodChild[3]?.replace("All Inclusive: ", "").trim() || "";

      // ✅ Update Extra Bed Information
      cells[5].innerHTML = `
          Adult: ${nextExtraBedAdult}<br>
          Child: ${nextExtraBedChild}<br>
          Shared: ${nextExtraBedShared}
      `;

      // ✅ Update Food Cost (Adult)
      cells[6].innerHTML = `
          ABF: ${nextFoodAdultABF}<br>
          Lunch: ${nextFoodAdultLunch}<br>
          Dinner: ${nextFoodAdultDinner}<br>
          All Inclusive: ${nextFoodAdultAllinclusive}
      `;

      // ✅ Update Food Cost (Child)
      cells[7].innerHTML = `
          ABF: ${nextFoodChildABF}<br>
          Lunch: ${nextFoodChildLunch}<br>
          Dinner: ${nextFoodChildDinner}<br>
          All Inclusive: ${nextFoodChildAllinclusive}
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

  // Validate all entries before adding
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
      const maxCapacityInput = entry.querySelector('input[placeholder="Max Capacity"]');
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
  // Check if the date is already in dd-mm-yyyy format
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

// Add a function to parse integers safely
function parseIntegerOrDefault(value, defaultValue = 0) {
  const parsedValue = parseInt(value, 10);
  return isNaN(parsedValue) ? defaultValue : parsedValue;
}

// Utility function for parsing floats safely
function parseFloatOrDefault(value, defaultValue = 0) {
  const parsedValue = parseFloat(value);
  return isNaN(parsedValue) ? defaultValue : parsedValue;
}

function parseIntOrDefault(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// NOTE: The old populateCitiesDropdown function has been replaced.
// Cities are now loaded based on the hotel's country when editing,
// using the loadCitiesForCountry function defined in DOMContentLoaded.

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
    .replace("Name: ", "")
    .trim();
  document.getElementById("duplicateAllotment").value = nameAllotment[1]
    .replace("Allotment: ", "")
    .trim();
  document.getElementById("duplicateCutoff").value = nameAllotment[2]
    .replace("CutOff Days: ", "")
    .trim();
  document.getElementById("duplicateMaxCapacity").value = nameAllotment[3]
    ?.replace("Max Capacity: ", "")
    .trim() || "";

  const prices = cells[4].innerHTML.split("<br>");
  document.getElementById("duplicateSinglePrice").value = prices[0]
    .replace("Single: ", "")
    .trim();
  document.getElementById("duplicateDoublePrice").value = prices[1]
    .replace("Double: ", "")
    .trim();

  const extraBedDetails = cells[5].innerHTML.split("<br>");
  document.getElementById("duplicateExtraBedAdult").value = extraBedDetails[0]
    .replace("Adult: ", "")
    .trim();
  document.getElementById("duplicateExtraBedChild").value = extraBedDetails[1]
    .replace("Child: ", "")
    .trim();
  document.getElementById("duplicateExtraBedShared").value = extraBedDetails[2]
    .replace("Shared: ", "")
    .trim();

  const foodCostAdult = cells[6].innerHTML.split("<br>");
  document.getElementById("duplicateFoodCostAdultABF").value = foodCostAdult[0]
    .replace("ABF: ", "")
    .trim();
  document.getElementById("duplicateFoodCostAdultLunch").value =
    foodCostAdult[1].replace("Lunch: ", "").trim();
  document.getElementById("duplicateFoodCostAdultDinner").value =
    foodCostAdult[2].replace("Dinner: ", "").trim();
  document.getElementById("duplicateFoodCostAdultAllinclusive").value =
    foodCostAdult[3].replace("All Inclusive: ", "").trim();

  const foodCostChild = cells[7].innerHTML.split("<br>");
  document.getElementById("duplicateFoodCostChildABF").value = foodCostChild[0]
    .replace("ABF: ", "")
    .trim();
  document.getElementById("duplicateFoodCostChildLunch").value =
    foodCostChild[1].replace("Lunch: ", "").trim();
  document.getElementById("duplicateFoodCostChildDinner").value =
    foodCostChild[2].replace("Dinner: ", "").trim();
  document.getElementById("duplicateFoodCostChildAllinclusive").value =
    foodCostChild[3].replace("All Inclusive: ", "").trim();

  $("#duplicateRoomTypeModal").modal("show");
}

document.addEventListener("DOMContentLoaded", function () {
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
              placeholder="*Name"
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
  const urlParams = new URLSearchParams(window.location.search);
  const hotelId = urlParams.get("id");
  const token = localStorage.getItem("token"); // Ensure token is available
  const isClone = urlParams.get("clone") === "true";
  if (isClone) {
    document.title = "Add Hotel (Clone)";
    const titleH1 = document.querySelector("h1");
    if (titleH1) titleH1.textContent = "Add Hotel (Clone)";
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-save" style="margin-right: 8px"></i>Create Hotel';
    }
  }
  
  // Store hotel data for later use
  let loadedHotelData = null;
  
  // Initialize location cache functionality - load countries dropdown first
  LocationCache.populateCountriesDropdown("country");
  
  // Country change handler - loads cities for the selected country
  document.getElementById("country").addEventListener("change", function () {
    const selectedCountry = this.value;
    LocationCache.populateCitiesDropdown(
      selectedCountry,
      "hotelLocation",
      "addNewCityBtn"
    ).then(() => {
      // If we have loaded hotel data and the country matches, select the city
      if (loadedHotelData && loadedHotelData.city) {
        const cityDropdown = document.getElementById("hotelLocation");
        // Try to select the hotel's city
        const cityExists = Array.from(cityDropdown.options).some(
          option => option.value === loadedHotelData.city
        );
        
        if (cityExists) {
          cityDropdown.value = loadedHotelData.city;
          console.log(`Selected city: ${loadedHotelData.city}`);
        } else {
          // Add the city if it doesn't exist in the list
          const newOption = document.createElement("option");
          newOption.value = loadedHotelData.city;
          newOption.textContent = loadedHotelData.city;
          cityDropdown.insertBefore(newOption, cityDropdown.options[1]);
          cityDropdown.value = loadedHotelData.city;
          console.log(`Added and selected city: ${loadedHotelData.city} (not in country's city list)`);
        }
      }
    });
  });
  
  // Add new city button handler
  document.getElementById("addNewCityBtn").addEventListener("click", function () {
    const selectedCountry = document.getElementById("country").value;
    const selectedCountryText = document.getElementById("country").selectedOptions[0]?.textContent;
    
    if (!selectedCountry) {
      alert("Please select a country first");
      return;
    }
    
    document.getElementById("newCityCountry").value = selectedCountryText;
    document.getElementById("newCityName").value = "";
    $("#addNewCityModal").modal("show");
  });
  
  // Save new city handler
  document.getElementById("saveNewCity").addEventListener("click", async function () {
    const cityName = document.getElementById("newCityName").value.trim();
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
      const success = await LocationCache.addNewCity(cityName, countryCode);
      if (success) {
        // Reload cities for the current country
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
  
  // Fetch hotel data and populate the form
  fetch(`${Endpoint}/api/v1/hotels/${hotelId}`, {
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
        } else if (response.status === 403) {
          alert("You don't have sufficient permissions to perform this action.");
          return;
        } else {
          return response.text().then((errorMessage) => {
            if (!errorMessage) {
              errorMessage = "Failed to load hotel data";
            }
            throw new Error(errorMessage);
          });
        }
      }
      return response.json();
    })
    .then(async (hotel) => {
      if (!hotel) return;
      
      // Store hotel data for use in country change handler
      loadedHotelData = hotel;
      console.log(`Loading hotel: ${hotel.name}, Country: ${hotel.country}, City: ${hotel.city}`);
      
      // Find and select the country in the dropdown
      const countryDropdown = document.getElementById("country");
      
      // Wait for countries to load (poll for up to 3 seconds)
      let attempts = 0;
      while (countryDropdown.options.length <= 1 && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      // Find the country option by name (backend returns country name like "Thailand")
      const countryOption = Array.from(countryDropdown.options).find(option => 
        option.textContent.toLowerCase() === hotel.country.toLowerCase()
      );
      
      if (countryOption) {
        countryDropdown.value = countryOption.value;
        console.log(`Selected country: ${countryOption.textContent} (${countryOption.value})`);
        
        // Trigger change event to load cities
        countryDropdown.dispatchEvent(new Event('change'));
      } else {
        console.warn(`Country "${hotel.country}" not found in dropdown`);
        // Fallback: just set the city dropdown directly
        const cityDropdown = document.getElementById("hotelLocation");
        cityDropdown.innerHTML = '<option value="" disabled>Select city</option>';
        const cityOption = document.createElement("option");
        cityOption.value = hotel.city;
        cityOption.textContent = hotel.city;
        cityDropdown.appendChild(cityOption);
        cityDropdown.value = hotel.city;
      }
      
      // Populate the rest of the form with hotel data
      document.getElementById("hotelName").value = hotel.name;
      document.getElementById("displayOrder").value = hotel.display_order ?? 0;
      document.getElementById("hotelAddress").value = hotel.address;
      document.getElementById("earlycheckinadd").value =
        hotel.fees.early_checkin_fee || "";
      document.getElementById("latecheckoutadd").value =
        hotel.fees.late_checkout_fee || "";
      document.getElementById("latecheckout21add").value =
        hotel.fees.late_checkout_21_fee || "";
      document.getElementById("christmasdinner").value =
        hotel.fees.christmas_dinner_fee || "";
      document.getElementById("newyear").value =
        hotel.fees.new_year_dinner_fee || "";
      document.getElementById("hotelnotesforagent").value = hotel.notes || "";
      const isCloneMode = new URLSearchParams(window.location.search).get("clone") === "true";
      const userRole = localStorage.getItem("role") || "";
      const isAdmin = userRole.trim().toLowerCase() === "admin" || userRole.trim().toLowerCase() === "superadmin";
      populateContactTable(hotel.contacts || []);
      populateRoomTypesTable(hotel.room_types || []);
      populatePromotionsTable((isCloneMode && !isAdmin) ? [] : (hotel.promotions || []));
    })
    .catch((error) => {
      console.error("Error loading hotel data:", error);
      alert(error.message);
    });

  // Add event listeners for early bird and minimum nights fields for adding promotions
  const earlyBirdInput = document.getElementById("earlyBird");
  const minNightsInput = document.getElementById("minNights");

  earlyBirdInput.addEventListener("input", function () {
    if (earlyBirdInput.value.trim() !== "") {
      minNightsInput.disabled = true;
      minNightsInput.value = ""; // Clear value when disabled
    } else {
      minNightsInput.disabled = false;
    }
  });

  minNightsInput.addEventListener("input", function () {
    if (minNightsInput.value.trim() !== "") {
      earlyBirdInput.disabled = true;
      earlyBirdInput.value = ""; // Clear value when disabled
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
      editMinNightsInput.value = ""; // Clear value when disabled
    } else {
      editMinNightsInput.disabled = false;
    }
  });

  editMinNightsInput.addEventListener("input", function () {
    if (editMinNightsInput.value.trim() !== "") {
      editEarlyBirdInput.disabled = true;
      editEarlyBirdInput.value = ""; // Clear value when disabled
    } else {
      editEarlyBirdInput.disabled = false;
    }
  });

  // Function to validate discount amount when the type is %
  function validateDiscountAmount(discountInput, discountTypeInput) {
    const discountType = discountTypeInput.value;
    const discountValue = parseFloat(discountInput.value);

    if (discountType === "%") {
      if (isNaN(discountValue) || discountValue < 0 || discountValue > 100) {
        alert(
          "For percentage discount, please enter a value between 0 and 100."
        );
        discountInput.value = ""; // Clear the input if invalid
      }
    }
  }

  // Attach validation to Add Promotion modal
  const discountInput = document.getElementById("discount");
  const discountTypeInput = document.getElementById("discounttype");

  discountInput.addEventListener("input", () =>
    validateDiscountAmount(discountInput, discountTypeInput)
  );
  discountTypeInput.addEventListener("change", () =>
    validateDiscountAmount(discountInput, discountTypeInput)
  );

  // Attach validation to Edit Promotion modal
  const editDiscountInput = document.getElementById("editDiscount");
  const editDiscountTypeInput = document.getElementById("editDiscountType");

  editDiscountInput.addEventListener("input", () =>
    validateDiscountAmount(editDiscountInput, editDiscountTypeInput)
  );
  editDiscountTypeInput.addEventListener("change", () =>
    validateDiscountAmount(editDiscountInput, editDiscountTypeInput)
  );

  // Define global variable to track the currently edited row
  let currentContactRow = null;

  document
    .getElementById("editHotelForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();

      let roomTypes = [];
      let promotions = [];
      try {
        roomTypes = getRoomTypesFromTable();
        promotions = getPromotionsFromTable();
      } catch (error) {
        alert(error.message);
        return;
      }

      const updatedHotelData = {
        name: document.getElementById("hotelName").value,
        display_order: parseInt(document.getElementById("displayOrder").value) || 0,
        country: document.getElementById("country").value,
        city: document.getElementById("hotelLocation").value,
        address: document.getElementById("hotelAddress").value,
        fees: {
          early_checkin_fee:
            parseInt(document.getElementById("earlycheckinadd").value) || 0,
          late_checkout_fee:
            parseInt(document.getElementById("latecheckoutadd").value) || 0,
          late_checkout_21_fee:
            parseInt(document.getElementById("latecheckout21add").value) || 0,
          christmas_dinner_fee:
            parseInt(document.getElementById("christmasdinner").value) || 0,
          new_year_dinner_fee:
            parseInt(document.getElementById("newyear").value) || 0,
          currency_id: 4, // Assuming THB as the currency
        },
        notes: document.getElementById("hotelnotesforagent").value,
        contacts: getContactsFromTable(),
        room_types: roomTypes,
        promotions,
      };

      const isCloneMode = new URLSearchParams(window.location.search).get("clone") === "true";
      const fetchUrl = isCloneMode ? `${Endpoint}/api/v1/hotels` : `${Endpoint}/api/v1/hotels/${hotelId}`;
      const fetchMethod = isCloneMode ? "POST" : "PUT";

      fetch(fetchUrl, {
        method: fetchMethod,
        headers: {
          Authorization: `Bearer ${token}`, // Use the token from local storage
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedHotelData),
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
                  errorMessage = "Failed to update hotel data";
                }
                throw new Error(errorMessage); // Throw the error with the message
              });
            }
          }
          const isCloneMode = new URLSearchParams(window.location.search).get("clone") === "true";
          alert(isCloneMode ? "Hotel data cloned successfully!" : "Hotel data updated successfully!");
          window.location.href = "hotels.html"; // Redirect to hotel list page
        })
        .catch((error) => {
          console.error("Error updating hotel data:", error);
          alert(error.message);
        });
    });

  // Save the edited room type
  function saveEditedRoomType() {
    const editFromDateInput = document.getElementById("editFromDate");
    const editToDateInput = document.getElementById("editToDate");

    if (!validateDateRange(editFromDateInput, editToDateInput)) {
      return; // Stop the function if validation fails
    }

    if (currentRoomTypeRow) {
      const cells = currentRoomTypeRow.getElementsByTagName("td");

      cells[1].textContent = formatToDDMMYYYY(
        document.getElementById("editFromDate").value
      );
      cells[2].textContent = formatToDDMMYYYY(
        document.getElementById("editToDate").value
      );
      cells[3].innerHTML = `${
        document.getElementById("editRoomType").value
      }<br>Allotment: ${
        document.getElementById("editAllotment").value
      }<br>CutOff Days: ${document.getElementById("editCutoff").value}<br>Max Capacity: ${document.getElementById("editMaxCapacity").value}`;
      cells[4].innerHTML = `Single: ${
        document.getElementById("editSinglePrice").value
      }<br>Double: ${document.getElementById("editDoublePrice").value}`;
      cells[5].innerHTML = `Adult: ${
        document.getElementById("editExtraBedAdult").value
      }<br>Child: ${
        document.getElementById("editExtraBedChild").value
      }<br>Shared: ${document.getElementById("editExtraBedShared").value}`;
      cells[6].innerHTML = `ABF: ${
        document.getElementById("editFoodCostAdultABF").value || 0
      }<br>Lunch: ${
        document.getElementById("editFoodCostAdultLunch").value || 0
      }<br>Dinner: ${
        document.getElementById("editFoodCostAdultDinner").value || 0
      }<br>All Inclusive: ${
        document.getElementById("editFoodCostAdultAllinclusive").value || 0
      }`;
      cells[7].innerHTML = `ABF: ${
        document.getElementById("editFoodCostChildABF").value || 0
      }<br>Lunch: ${
        document.getElementById("editFoodCostChildLunch").value || 0
      }<br>Dinner: ${
        document.getElementById("editFoodCostChildDinner").value || 0
      }<br>All Inclusive: ${
        document.getElementById("editFoodCostChildAllinclusive").value || 0
      }`;

      $("#editRoomTypeModal").modal("hide");
      currentRoomTypeRow = null; // Reset current row reference
    }
  }

  // Save the edited promotion
  function saveEditedPromotion() {
    const fromDateInputBooking = document.getElementById("editBookingDateFrom");
    const toDateInputBooking = document.getElementById("editBookingDateTo");

    if (!validateDateRange(fromDateInputBooking, toDateInputBooking)) {
      return;
    }

    const code = document.getElementById("editPromotionCode").value.trim();
    const name = document.getElementById("editPromotionName").value.trim();

    // Check required fields
    if (!code || !name) {
      alert("Please fill in all required fields.");
      return;
    }

    // Validate discount amount when discount type is %
    const discountInput = parseFloat(
      document.getElementById("editDiscount").value.trim()
    );
    const discountType = document
      .getElementById("editDiscountType")
      .value.trim();

    if (
      discountType === "%" &&
      (isNaN(discountInput) || discountInput < 0 || discountInput > 100)
    ) {
      alert("For percentage discount, please enter a value between 0 and 100.");
      return;
    }

    if (currentPromotionRow) {
      const cells = currentPromotionRow.getElementsByTagName("td");

      const earlyBird = parseIntegerOrDefault(
        editEarlyBirdInput.value.trim(),
        0
      ); // Use 0 if empty
      const minNights = parseIntegerOrDefault(
        editMinNightsInput.value.trim(),
        0
      ); // Use 0 if empty

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
      cells[4].textContent = earlyBird;
      cells[5].textContent = minNights;
      cells[6].innerHTML = `ABF: ${parseIntegerOrDefault(
        document.getElementById("editfree_meals_abf").value.trim()
      )}, Lunch: ${parseIntegerOrDefault(
        document.getElementById("edit_free_meals_lunch").value.trim()
      )}, Dinner: ${parseIntegerOrDefault(
        document.getElementById("edit_free_meals_dinner").value.trim()
      )}`;
      cells[7].textContent = `${parseIntegerOrDefault(
        document.getElementById("editDiscount").value.trim()
      )} ${document.getElementById("editDiscountType").value}`;
      cells[8].textContent = document.getElementById("editValidForExtraBeds")
        .checked
        ? "Yes"
        : "No";
      cells[9].textContent = document.getElementById("editEnabled").checked
        ? "Yes"
        : "No";
      cells[10].textContent = document
        .getElementById("editPromotionDescription")
        .value.trim();

      // Hide the modal after saving
      $("#editPromotionModal").modal("hide");
      currentPromotionRow = null; // Reset current row reference
    }
  }

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
    .getElementById("savePromotionBtn")
    .addEventListener("click", savePromotion);
  document
    .getElementById("saveRoomTypeBtn")
    .addEventListener("click", saveRoomType);
  document
    .getElementById("saveEditedRoomTypeBtn")
    .addEventListener("click", saveEditedRoomType);
  document
    .getElementById("saveEditedPromotionBtn")
    .addEventListener("click", saveEditedPromotion);

  function populateContactTable(contacts) {
    const tableBody = document.querySelector("#contactsTable tbody");
    tableBody.innerHTML = "";
    contacts.forEach((contact, idx) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${contact.contact_name}</td>
                <td>${contact.email}</td>
                <td>${contact.telephone}</td>
                <td>
                    <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: nowrap;">
                        <div class="tooltip-btn">
                            <button type="button" class="btn btn-success btn-sm" onclick="editContact(this)" style="min-width: 32px; padding: 6px 8px;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <span class="tooltip-text">Edit</span>
                        </div>
                        <div class="tooltip-btn">
                            <button type="button" class="btn btn-danger btn-sm" onclick="deleteContact(this)" style="min-width: 32px; padding: 6px 8px;">
                                <i class="fas fa-trash"></i>
                            </button>
                            <span class="tooltip-text">Delete</span>
                        </div>
                    </div>
                </td>
            `;
      tableBody.appendChild(row);
    });
  }

  function populateRoomTypesTable(roomTypes) {
    const tableBody = document.querySelector("#roomTypesTable tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    // Sort roomTypes by start_date, end_date, single_price, and double_price
    roomTypes.sort((a, b) => {
      const startDateA = new Date(a.start_date).getTime();
      const startDateB = new Date(b.start_date).getTime();

      const endDateA = new Date(a.end_date).getTime();
      const endDateB = new Date(b.end_date).getTime();

      const singlePriceA = a.single_price || 0;
      const singlePriceB = b.single_price || 0;

      const doublePriceA = a.double_price || 0;
      const doublePriceB = b.double_price || 0;

      if (startDateA !== startDateB) {
        return startDateA - startDateB; // Sort by start_date
      } else if (endDateA !== endDateB) {
        return endDateA - endDateB; // If start_date is the same, sort by end_date
      } else if (singlePriceA !== singlePriceB) {
        return singlePriceA - singlePriceB; // If end_date is the same, sort by single_price
      } else {
        return doublePriceA - doublePriceB; // If single_price is the same, sort by double_price
      }
    });

    roomTypes.forEach((roomType) => {
      const startDate = formatToDDMMYYYY(
        new Date(roomType.start_date).toISOString().split("T")[0]
      );
      const endDate = formatToDDMMYYYY(
        new Date(roomType.end_date).toISOString().split("T")[0]
      );

      const isCloneMode = new URLSearchParams(window.location.search).get("clone") === "true";
      const userRole = localStorage.getItem("role") || "";
      const isAdmin = userRole.trim().toLowerCase() === "admin" || userRole.trim().toLowerCase() === "superadmin";
      const shouldZeroPrices = isCloneMode && !isAdmin;
      const row = document.createElement("tr");
      row.setAttribute("data-room-type-id", isCloneMode ? "0" : roomType.id);

      const singlePrice = shouldZeroPrices ? 0 : (roomType.single_price || 0);
      const doublePrice = shouldZeroPrices ? 0 : (roomType.double_price || 0);
      const extraBedAdult = shouldZeroPrices ? 0 : (roomType.extra_bed_adult || 0);
      const extraBedChild = shouldZeroPrices ? 0 : (roomType.extra_bed_child || 0);
      const extraBedShared = shouldZeroPrices ? 0 : (roomType.extra_bed_shared || 0);
      const foodAdultAbf = shouldZeroPrices ? 0 : (roomType.food_adult_abf || 0);
      const foodAdultLunch = shouldZeroPrices ? 0 : (roomType.food_adult_lunch || 0);
      const foodAdultDinner = shouldZeroPrices ? 0 : (roomType.food_adult_dinner || 0);
      const foodAdultAllInclusive = shouldZeroPrices ? 0 : (roomType.food_adult_all_inclusive || 0);
      const foodChildAbf = shouldZeroPrices ? 0 : (roomType.food_child_abf || 0);
      const foodChildLunch = shouldZeroPrices ? 0 : (roomType.food_child_lunch || 0);
      const foodChildDinner = shouldZeroPrices ? 0 : (roomType.food_child_dinner || 0);
      const foodChildAllInclusive = shouldZeroPrices ? 0 : (roomType.food_child_all_inclusive || 0);

      row.innerHTML = `
            <td><input type="checkbox" class="rowCheckbox" onchange="toggleEditButtonVisibility()" /></td>
            <td>${startDate}</td>
            <td>${endDate}</td>
            <td>${roomType.name}<br>Allotment: ${
        roomType.allotment || 0
      }<br>CutOff Days: ${roomType.cutoff_days || 0}<br>Max Capacity: ${roomType.max_capacity || 0}</td>
            <td>Single: ${singlePrice}<br>Double: ${doublePrice}</td>
            <td>Adult: ${extraBedAdult}<br>Child: ${extraBedChild}<br>Shared: ${extraBedShared}</td>
            <td>ABF: ${foodAdultAbf}<br>Lunch: ${foodAdultLunch}<br>Dinner: ${foodAdultDinner}<br>All Inclusive: ${foodAdultAllInclusive}</td>
            <td>ABF: ${foodChildAbf}<br>Lunch: ${foodChildLunch}<br>Dinner: ${foodChildDinner}<br>All Inclusive: ${foodChildAllInclusive}</td>
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
      tableBody.appendChild(row);
    });
  }

  function populatePromotionsTable(promotions) {
    const tableBody = document.querySelector("#promotionsTable tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    // Sort promotions by promotion_code (case-insensitive)
    promotions.sort((a, b) => {
        const codeA = a.promotion_code.toLowerCase(); // Convert to lowercase for case-insensitive comparison
        const codeB = b.promotion_code.toLowerCase();
        return codeA.localeCompare(codeB); // Alphabetical sorting
    });

    promotions.forEach((promotion) => {
      // Handle date fields and null values gracefully
      const formatDate = (dateString) => {
        if (!dateString || dateString === "0001-01-01T00:00:00Z") {
            return "";
        }
        const dateParts = dateString.split("T")[0].split("-");
        if (dateParts.length === 3) {
          return `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; // Convert YYYY-MM-DD to DD-MM-YYYY
        }
        return ""; // Return empty string if the format is invalid
      };

      const discountDisplay = promotion.discount_amount
        ? promotion.discount_amount + " " + (promotion.discount_type || "")
        : "";

      const freeMealsDisplay = `ABF: ${promotion.free_meals_abf || "0"}, Lunch: ${promotion.free_meals_lunch || "0"}, Dinner: ${promotion.free_meals_dinner || "0"}`;

      const validForExtraBedsDisplay = promotion.valid_for_extra_beds ? "Yes" : "No";
      const enabledDisplay = promotion.enabled ? "Yes" : "No";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${promotion.promotion_code || ""}</td>
        <td>${promotion.name || ""}</td>
        <td>${formatDate(promotion.booking_date_from)}</td>
        <td>${formatDate(promotion.booking_date_to)}</td>
        <td>${promotion.early_bird_days || ""}</td>
        <td>${promotion.minimum_nights || ""}</td>
        <td>${freeMealsDisplay}</td>
        <td>${discountDisplay}</td>
        <td style="display:none;">${validForExtraBedsDisplay}</td>
        <td>${enabledDisplay}</td>
        <td style="display:none;">${promotion.description || ""}</td> <!-- Separate cell for description -->
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
      tableBody.appendChild(row);
    });
  }

  function getContactsFromTable() {
    const contacts = [];
    const rows = document.querySelectorAll("#contactsTable tbody tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      const contact = {
        contact_name: cells[0].textContent,
        email: cells[1].textContent,
        telephone: cells[2].textContent,
      };
      contacts.push(contact);
    });
    return contacts;
  }

  function getRoomTypesFromTable() {
    const roomTypes = [];
    const rows = document.querySelectorAll("#roomTypesTable tbody tr");

    rows.forEach((row, index) => {
      const cells = row.getElementsByTagName("td");

      // Retrieve room type ID from a data attribute or elsewhere as appropriate
      const roomTypeId = parseInt(
        row.getAttribute("data-room-type-id") || "0",
        10
      );

      // Extract the name, allotment, cutoff, and max capacity properly
      const nameLine = cells[3].innerText.split("\n")[0];
      const allotmentLine = cells[3].innerText.split("\n")[1];
      const cutoffLine =
        cells[3].innerText
          .split("\n")
          .find((line) => /cut.*off.*days/i.test(line)) || "CutOff Days: 0";
      const maxCapacityLine =
        cells[3].innerText
          .split("\n")
          .find((line) => /max.*capacity/i.test(line)) || "Max Capacity: 0";

      const cutoffDays = parseIntOrDefault(
        cutoffLine.replace(/cut.*off.*days\s*:\s*/i, "").trim()
      );
      const maxCapacity = parseIntOrDefault(
        maxCapacityLine.replace(/max.*capacity\s*:\s*/i, "").trim()
      );

      // Safely handle missing or undefined fields
      const parseOrDefault = (value, defaultValue = 0) => {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? defaultValue : parsed;
      };

      const roomTypeName = nameLine.replace("Name: ", "").trim();
      const startDateISO = convertToISODate(cells[1].textContent.trim());
      const endDateISO = convertToISODate(cells[2].textContent.trim());
      const startDate = new Date(startDateISO);
      const endDate = new Date(endDateISO);

      if (!roomTypeName || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error(
          `Room type row ${index + 1}: Room Type, From date, and To date are required.`
        );
      }

      const roomType = {
        id: roomTypeId,
        name: roomTypeName,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        single_price: parseOrDefault(
          cells[4].innerText.split("\n")[0].replace("Single: ", "").trim()
        ),
        double_price: parseOrDefault(
          cells[4].innerText.split("\n")[1].replace("Double: ", "").trim()
        ),
        allotment:
          parseInt(allotmentLine.replace("Allotment: ", "").trim(), 10) || 0,
        cutoff_days: cutoffDays,
        max_capacity: maxCapacity,
        extra_bed_adult: parseOrDefault(
          cells[5].innerText.split("\n")[0].replace("Adult: ", "").trim()
        ),
        extra_bed_child: parseOrDefault(
          cells[5].innerText.split("\n")[1].replace("Child: ", "").trim()
        ),
        extra_bed_shared: parseOrDefault(
          cells[5].innerText.split("\n")[2].replace("Shared: ", "").trim()
        ),
        food_adult_abf: parseOrDefault(
          cells[6].innerText.split("\n")[0].replace("ABF: ", "").trim()
        ),
        food_adult_lunch: parseOrDefault(
          cells[6].innerText.split("\n")[1].replace("Lunch: ", "").trim()
        ),
        food_adult_dinner: parseOrDefault(
          cells[6].innerText.split("\n")[2].replace("Dinner: ", "").trim()
        ),
        food_adult_all_inclusive: parseOrDefault(
          cells[6].innerText
            .split("\n")[3]
            ?.replace("All Inclusive: ", "")
            .trim()
        ),
        food_child_abf: parseOrDefault(
          cells[7].innerText.split("\n")[0].replace("ABF: ", "").trim()
        ),
        food_child_lunch: parseOrDefault(
          cells[7].innerText.split("\n")[1].replace("Lunch: ", "").trim()
        ),
        food_child_dinner: parseOrDefault(
          cells[7].innerText.split("\n")[2].replace("Dinner: ", "").trim()
        ),
        food_child_all_inclusive: parseOrDefault(
          cells[7].innerText
            .split("\n")[3]
            ?.replace("All Inclusive: ", "")
            .trim()
        ),
        currency_id: 4, // Assuming THB as the currency ID
      };

      roomTypes.push(roomType);
    });

    return roomTypes;
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
          cells[6].textContent.split(", ")[2].replace("Dinner: ", "")
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

  window.editContact = function (button) {
    const row = button.closest("tr");
    const cells = row.querySelectorAll("td");
    const contact = {
      contact_name: cells[0].textContent,
      email: cells[1].textContent,
      telephone: cells[2].textContent,
    };

    document.getElementById("contactName").value = contact.contact_name;
    document.getElementById("contactEmail").value = contact.email;
    document.getElementById("contactTelephone").value = contact.telephone;

    currentContactRow = row; // Save reference to the current row being edited

    $("#contactModal").modal("show");
  };

  window.deleteContact = function (button) {
    if (confirm("Are you sure you want to delete this contact?")) {
      const row = button.closest("tr");
      row.parentNode.removeChild(row);
    }
  };

  window.editRoomType = function (button) {
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
      .replace("Name: ", "")
      .trim();
    document.getElementById("editAllotment").value = nameAllotment[1]
      .replace("Allotment: ", "")
      .trim();
    document.getElementById("editCutoff").value = nameAllotment[2]
      .replace("CutOff Days: ", "")
      .trim();
    document.getElementById("editMaxCapacity").value = nameAllotment[3]
      ?.replace("Max Capacity: ", "")
      .trim() || "";

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
    document.getElementById("editFoodCostAdultLunch").value = foodCostAdult[1]
      .replace("Lunch: ", "")
      .trim();
    document.getElementById("editFoodCostAdultDinner").value = foodCostAdult[2]
      .replace("Dinner: ", "")
      .trim();
    document.getElementById("editFoodCostAdultAllinclusive").value =
      foodCostAdult[3].replace("All Inclusive: ", "").trim();

    // Parsing Food Cost for Children
    const foodCostChild = cells[7].innerHTML.split("<br>");
    document.getElementById("editFoodCostChildABF").value = foodCostChild[0]
      .replace("ABF: ", "")
      .trim();
    document.getElementById("editFoodCostChildLunch").value = foodCostChild[1]
      .replace("Lunch: ", "")
      .trim();
    document.getElementById("editFoodCostChildDinner").value = foodCostChild[2]
      .replace("Dinner: ", "")
      .trim();
    document.getElementById("editFoodCostChildAllinclusive").value =
      foodCostChild[3].replace("All Inclusive: ", "").trim();

    // Show the modal for editing
    $("#editRoomTypeModal").modal("show");
  };

  window.deleteRoomType = function (button) {
    if (confirm("Are you sure you want to delete this Room Type?")) {
      const row = button.closest("tr");
      row.parentNode.removeChild(row);
    }
  };

  window.editPromotionRow = function (button) {
    const row = button.closest("tr");
    const cells = row.getElementsByTagName("td");
  
    // Save reference to the current row being edited
    currentPromotionRow = row;
  
    // Extract dates in DD-MM-YYYY format and convert them to YYYY-MM-DD
    const bookingDateFrom = cells[2].textContent.trim();
    const bookingDateTo = cells[3].textContent.trim();
  
    console.log("Original Date From (DD-MM-YYYY):", bookingDateFrom);
    console.log("Original Date To (DD-MM-YYYY):", bookingDateTo);
  
    const formattedBookingDateFrom = formatToYYYYMMDD(bookingDateFrom);
    const formattedBookingDateTo = formatToYYYYMMDD(bookingDateTo);
  
    console.log("Converted Date From (YYYY-MM-DD):", formattedBookingDateFrom);
    console.log("Converted Date To (YYYY-MM-DD):", formattedBookingDateTo);
  
    // Prefill the modal fields with the values from the table row
    document.getElementById("editPromotionCode").value =
      cells[0].textContent.trim();
    document.getElementById("editPromotionName").value =
      cells[1].textContent.trim();
    document.getElementById("editBookingDateFrom").value =
      formattedBookingDateFrom;
    document.getElementById("editBookingDateTo").value = formattedBookingDateTo;
    document.getElementById("editEarlyBird").value = cells[4].textContent.trim();
    document.getElementById("editMinNights").value = cells[5].textContent.trim();

    document.getElementById("editfree_meals_abf").value = cells[6].textContent
      .split(", ")[0]
      .replace("ABF: ", "")
      .trim();
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
    // Handle enabled checkbox
    document.getElementById("editEnabled").checked =
      cells[9].textContent.trim() === "Yes";
    document.getElementById("editPromotionDescription").value =
      cells[10].textContent.trim();

    // Show the modal
    $("#editPromotionModal").modal("show");
  };
  

  window.deletePromotionRow = function (button) {
    if (confirm("Are you sure you want to delete this promotion?")) {
      const row = button.closest("tr");
      row.parentNode.removeChild(row);
    }
  };

  function saveContact() {
    const contact_name = document.getElementById("contactName").value;
    const email = document.getElementById("contactEmail").value;
    const telephone = document.getElementById("contactTelephone").value;

    if (currentContactRow) {
      // Update existing row (if editing)
      const cells = currentContactRow.querySelectorAll("td");
      cells[0].textContent = contact_name;
      cells[1].textContent = email;
      cells[2].textContent = telephone;

      currentContactRow = null; // Reset current row reference
    } else {
      // Add a new row (if not editing)
      const tableBody = document.querySelector("#contactsTable tbody");
      const newRow = document.createElement("tr");
      newRow.innerHTML = `
        <td>${contact_name}</td>
        <td>${email}</td>
        <td>${telephone}</td>
        <td>
            <div style="display: flex; gap: 10px; justify-content: center; align-items: center; flex-wrap: nowrap;">
                <div class="tooltip-btn">
                    <button type="button" class="btn btn-success btn-sm" onclick="editContact(this)" style="min-width: 32px; padding: 6px 8px;">
                        <i class="fas fa-edit"></i>
                    </button>
                    <span class="tooltip-text">Edit</span>
                </div>
                <div class="tooltip-btn">
                    <button type="button" class="btn btn-danger btn-sm" onclick="deleteContact(this)" style="min-width: 32px; padding: 6px 8px;">
                        <i class="fas fa-trash"></i>
                    </button>
                    <span class="tooltip-text">Delete</span>
                </div>
            </div>
        </td>
      `;
      tableBody.appendChild(newRow);
    }

    // Clear form and hide modal
    document.getElementById("contactForm").reset();
    $("#contactModal").modal("hide");
  }

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
    const roomTypeGroups =
      roomNameContainer.querySelectorAll(".room-type-group");

    if (roomTypeGroups.length > 0) {
      // Iterate through each dynamically added room type group
      roomTypeGroups.forEach((group) => {
        const dynamicRoomName = group
          .querySelector(".roomTypeName")
          .value.trim();
        const dynamicAllotment = group
          .querySelector(".roomTypeAllotment")
          .value.trim();
        const dynamicCutoff = group
          .querySelector(".roomTypeCutoff")
          .value.trim();
        const dynamicSinglePrice = group
          .querySelector(".roomTypeSinglePrice")
          .value.trim();
        const dynamicDoublePrice = group
          .querySelector(".roomTypeDoublePrice")
          .value.trim();

        // Validate required fields
        if (!dynamicRoomName) {
          alert("Room Name is required for dynamically added rooms.");
          return; // Skip this iteration
        }

        // Add a new row for this room type
        const newRow = roomTypesTable.insertRow();
        newRow.innerHTML = `
            <td><input type="checkbox" class="rowCheckbox" onchange="toggleEditButtonVisibility()"/></td>
            <td>${fromDate}</td>
            <td>${toDate}</td>
            <td>${dynamicRoomName}<br>Allotment: ${
          dynamicAllotment || 0
        }<br>CutOff Days: ${dynamicCutoff || 0}<br>Max Capacity: ${document.getElementById("maxCapacity").value.trim() || 0}</td>
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
                <div style="display: flex; gap: 5px; justify-content: center; align-items: center; flex-wrap: nowrap;">
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

  function savePromotion() {
    const fromDateInputBooking = document.getElementById("bookingDateFrom");
    const toDateInputBooking = document.getElementById("bookingDateTo");

    if (!validateDateRange(fromDateInputBooking, toDateInputBooking)) {
      return; // Stop the function if validation fails
    }

    const code = document.getElementById("promotionCode").value.trim();
    const name = document.getElementById("promotionName").value.trim();
    const bookingDateFrom = formatToDDMMYYYY(
      document.getElementById("bookingDateFrom").value
    );
    const bookingDateTo = formatToDDMMYYYY(
      document.getElementById("bookingDateTo").value
    );
    const earlyBird = parseIntegerOrDefault(earlyBirdInput.value.trim(), 0); // Use 0 if empty
    const minNights = parseIntegerOrDefault(minNightsInput.value.trim(), 0); // Use 0 if empty
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
    const description = document
      .getElementById("promotiondescription")
      .value.trim();

    // Check required fields
    if (!code || !name) {
      alert("Please fill in all required fields.");
      return;
    }
    // Ensure discount validation
    if (discountType === "%" && (discount < 0 || discount > 100)) {
      alert("For percentage discount, please enter a value between 0 and 100.");
      return;
    }

    // Determine the display values
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
          <div style="display: flex; gap: 5px; justify-content: center; align-items: center; flex-wrap: nowrap;">
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

    // Clear form and hide modal
    document.getElementById("promotionForm").reset();
    $("#promotionModal").modal("hide");
  }
});
