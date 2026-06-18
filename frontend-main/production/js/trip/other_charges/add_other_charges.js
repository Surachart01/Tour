// document.addEventListener("DOMContentLoaded", function () {
//     const addOtherChargesBtn = document.getElementById("addOtherChargesBtn");
//     const submitOtherChargeBtn = document.getElementById("submitOtherCharge");
  
//     // Open the modal when "Add Other Charges" button is clicked
//     addOtherChargesBtn.addEventListener("click", function () {
//       $("#otherChargesModal").modal("show");
//     });
  
//     // Handle form submission
//     submitOtherChargeBtn.addEventListener("click", function (event) {
//       event.preventDefault();
  
//       // Collect form values
//       const chargeType = document.getElementById("chargeType").value;
//       const newCharge = document.getElementById("newCharge").value;
//       const amount = document.getElementById("amount").value;
//       const chargeUnitType = document.getElementById("chargeUnitType").value;
  
//       // Validate required fields
//       if (!chargeType || !amount || !chargeUnitType) {
//         alert("Please fill in all required fields.");
//         return;
//       }
  
//       // Collect data into an object for processing (e.g., saving, displaying in a table)
//       const newChargeEntry = {
//         chargeType: newCharge || chargeType, // Use new charge if entered, else default chargeType
//         amount,
//         chargeUnitType,
//       };
  
//       // Add new charge entry to the table
//       addChargeToTable(newChargeEntry);
  
//       // Close the modal and reset the form
//       $("#otherChargesModal").modal("hide");
//       document.getElementById("otherChargesForm").reset();
//     });
  
//     // Function to add the new charge entry to the table
//     function addChargeToTable(charge) {
//       const otherChargesTableBody = document.getElementById("otherChargesTable").getElementsByTagName("tbody")[0];
//       const newRow = document.createElement("tr");
  
//       newRow.innerHTML = `
//         <td>${charge.chargeType}</td>
//         <td>${charge.amount}</td>
//         <td>${charge.chargeUnitType}</td>
//         <td><button class="btn btn-sm btn-danger deleteBtn">Delete</button></td>
//       `;
  
//       otherChargesTableBody.appendChild(newRow);
//     }
//   });
  