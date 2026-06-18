// // Event listener for the "Add Transfer" button
// // Show the transfer modal when the button is clicked
// document.getElementById("addTransferBtn").addEventListener("click", function() {
//     document.getElementById("transferForm").reset(); // Reset form
//     editingTransferRow = null;
//     $("#addTransferModal").modal("show");
// });

// let transfersArray = []; // Array to store transfer data
// let editingTransferRow = null; // Keep track of the row being edited

// // Save Transfer Functionality
// document.getElementById("saveTransfer").addEventListener("click", function (event) {
//     event.preventDefault();
//     // Get input values from the modal
//     const transferCity = document.getElementById("transferCity").value;
//     const transferType = document.getElementById("transferType").value;
//     const transferDate = document.getElementById("transferDate").value;
//     const transferFrom = document.getElementById("transferFrom").value;
//     const transferTo = document.getElementById("transferTo").value;
//     const transferToT = document.getElementById("transferToT").value;
//     const transferPickupTime = document.getElementById("transferPickupTime").value;
//     const flightTime = document.getElementById("flightTime").value;
//     const remarks = document.getElementById("remarks").value;
//     const transferPrice = document.getElementById("updatedTransferPrice").value || "N/A";

//     if (!transferCity || !transferType || !transferDate || !transferFrom || !transferTo) {
//         alert("Please fill in all required fields.");
//         return;
//     }

//     const newTransfer = {
//         transferCity,
//         transferType,
//         transferDate,
//         transferFrom,
//         transferTo,
//         transferToT,
//         transferPickupTime,
//         flightTime,
//         remarks,
//         price: transferPrice,
//     };

//     if (editingTransferRow) {
//         updateTransferRow(editingTransferRow, newTransfer);
//         transfersArray[editingTransferRow.rowIndex - 1] = newTransfer;
//         editingTransferRow = null;
//     } else {
//         transfersArray.push(newTransfer);
//         addTransferRow(newTransfer);
//     }

//     document.getElementById("transferForm").reset();
//     $("#addTransferModal").modal("hide");
// });

// // Add a new row to the table
// function addTransferRow(transfer) {
//     const newRow = `
//     <tr>
//         <td>${transfer.transferDate}</td>
//         <td>${transfer.transferCity}</td>
//         <td>${transfer.transferType}</td>
//         <td>${transfer.transferToT || ""}</td>
//         <td>${transfer.transferFrom}</td>
//         <td>${transfer.transferTo}</td>
//         <td>${transfer.transferPickupTime}</td>
//         <td>${transfer.remarks || ""}</td>
//         <td>${transfer.price ? `${transfer.price}` : "N/A"}</td>
//         <td><button class="btn btn-sm btn-primary editBtn">Edit</button></td>
//         <td><button class="btn btn-sm btn-danger deleteBtn">Delete</button></td>
//     </tr>`;
//     document.getElementById("transferTableBody").insertAdjacentHTML("beforeend", newRow);
// }

// // Update an existing row in the table
// function updateTransferRow(row, transfer) {
//     row.cells[0].textContent = transfer.transferDate;
//     row.cells[1].textContent = transfer.transferCity;
//     row.cells[2].textContent = transfer.transferType;
//     row.cells[3].textContent = transfer.transferToT || "";
//     row.cells[4].textContent = transfer.transferFrom;
//     row.cells[5].textContent = transfer.transferTo;
//     row.cells[6].textContent = transfer.transferPickupTime;
//     row.cells[7].textContent = transfer.remarks || "";
//     row.cells[8].textContent = transfer.price ? `${transfer.price}` : "N/A";
// }

// // Handle edit and delete button clicks
// document.getElementById("transferTableBody").addEventListener("click", function (event) {
//     const row = event.target.closest("tr");
//     if (event.target.classList.contains("editBtn")) {
//         const rowData = transfersArray[row.rowIndex - 1];
//         document.getElementById("transferCity").value = rowData.transferCity;
//         document.getElementById("transferDate").value = rowData.transferDate;
//         document.getElementById("transferFrom").value = rowData.transferFrom;
//         document.getElementById("transferTo").value = rowData.transferTo;
//         document.getElementById("transferToT").value = rowData.transferToT;
//         document.getElementById("transferPickupTime").value = rowData.transferPickupTime;
//         document.getElementById("flightTime").value = rowData.flightTime || "";
//         document.getElementById("remarks").value = rowData.remarks;
//         document.getElementById("updatedTransferPrice").value = rowData.price || "N/A";
//         editingTransferRow = row;
//         $("#addTransferModal").modal("show");
//     }
//     if (event.target.classList.contains("deleteBtn")) {
//         if (confirm("Are you sure you want to delete this transfer?")) {
//             transfersArray.splice(row.rowIndex - 1, 1);
//             row.remove();
//         }
//     }
// });

// document.getElementById("getTransferPriceBtn").addEventListener("click", function () {
//     const token = localStorage.getItem("token");

//     if (!token) {
//       alert("You are not authorized. Please log in first.");
//       window.location.href = "login.html";
//       return;
//     }
  
//     const transferCity = document.getElementById("transferCity").value;
//     const transferType = document.getElementById("transferType").value;
//     const transferToT = document.getElementById("transferToT").value;
//     const numberOfAdults = parseInt(document.getElementById("adult").value, 10) || 0;
//     const numberOfKids = parseInt(document.getElementById("child").value, 10) || 0;
//     const travelDate = document.getElementById("transferDate").value;
//     const pickupTime = document.getElementById("transferPickupTime").value;

//     // Validation
//     if (!transferCity || !transferType || !transferToT || !travelDate) {
//       alert("Please fill in all required fields before getting the price.");
//       return;
//     }

//     const requestData = {
//       city: transferCity,
//       transfer_id: parseInt(transferType, 10),
//       tot: transferToT,
//       number_of_kids: numberOfKids,
//       number_of_adults: numberOfAdults,
//       travel_date: travelDate,
//       pickup_time: pickupTime,
//     };

//     fetch(`${Endpoint}/api/v1/transfers/calculate-cost`, {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(requestData),
//     })
//     .then(async (response) => {
//       if (!response.ok) {
//         const errorText = await response.text(); // ✅ Read error message
//         throw new Error(errorText); // ✅ Throw error to be caught in catch block
//       }
//       return response.json();
//     })
//     .then((data) => {
//       if (data.final_cost) {
//         document.getElementById("updatedTransferPrice").value = `${data.final_cost}`; // ✅ Display Price
//       } else {
//         throw new Error("Failed to retrieve the price. Please try again.");
//       }
//     })
//     .catch((error) => {
//       console.error("Error fetching transfer price:", error);
//       alert(`Error: ${error.message}`); // ✅ Show backend error message
//     });
// });
