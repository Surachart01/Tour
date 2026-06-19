document.addEventListener("DOMContentLoaded", function () {
    let charges = [];
    let filteredCharges = [];
    let currentPage = 1;
    let rowsPerPage = 25;
    let totalPages = 1;

    const chargesTableBody = document.getElementById("chargesTableBody");
    const searchBox = document.getElementById("searchBox");
    const rowsSelect = document.getElementById("rowsSelect");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");

    const token = localStorage.getItem("token");
    if (!token) {
        alert("You are not authorized. Please log in first.");
        window.location.href = "login.html";
        return;
    }

    // Load charges based on pagination
    function loadCharges() {
      chargesTableBody.innerHTML = "";

      const start = (currentPage - 1) * rowsPerPage;
      const end = Math.min(start + rowsPerPage, filteredCharges.length);
      const rowsToShow = filteredCharges.slice(start, end);

      rowsToShow.forEach((charge) => {
        const row = `
            <tr>
              <td>${charge.description}</td>
              <td>${charge.amount}</td>
              <td>${charge.chargetype || charge.chargeType}</td>
              <td><button class="btn btn-primary btn-sm edit-btn" data-id="${charge.id}"><i class="fa fa-edit"></i> Edit</button></td>
              <td><button class="btn btn-danger btn-sm delete-btn" data-id="${charge.id}"><i class="fa fa-trash"></i> Delete</button></td>
            </tr>`;
        chargesTableBody.insertAdjacentHTML("beforeend", row);
      });

      updatePaginationButtons();
      addEditDeleteListeners();
      updateChargesCount();
    }

    // Load charges from the backend database API
    function fetchCharges() {
      fetch(`${Endpoint}/api/v1/others`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (!response.ok) {
            if (response.status === 401) {
              alert("Unauthorized. Please log in again.");
              window.location.href = "login.html";
              return;
            }
            throw new Error("Failed to load other charges data");
          }
          return response.json();
        })
        .then((data) => {
          charges = data || [];
          filteredCharges = [...charges];
          
          // Expose globally for HTML count script
          window.originalChargesData = charges;
          window.filteredChargesData = filteredCharges;

          totalPages = Math.ceil(filteredCharges.length / rowsPerPage) || 1;
          loadCharges();
        })
        .catch((error) => {
          console.error("Error fetching other charges:", error);
          alert(error.message);
        });
    }

    // Update pagination buttons based on current page
    function updatePaginationButtons() {
      prevPageButton.disabled = currentPage === 1;
      nextPageButton.disabled = currentPage === totalPages;
    }

    // Handle search functionality
    function filterCharges() {
      const searchValue = searchBox.value.toLowerCase();
      filteredCharges = charges.filter((charge) => {
        const desc = (charge.description || "").toLowerCase();
        const type = (charge.chargetype || charge.chargeType || "").toLowerCase();
        const amt = String(charge.amount || "");
        return desc.includes(searchValue) || type.includes(searchValue) || amt.includes(searchValue);
      });
      window.filteredChargesData = filteredCharges;
      currentPage = 1; // Reset to first page on new search
      totalPages = Math.ceil(filteredCharges.length / rowsPerPage) || 1;
      loadCharges();
    }

    // Add event listeners for edit and delete buttons
    function addEditDeleteListeners() {
      document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = this.getAttribute("data-id");
          window.location.href = `edit_othercharges.html?id=${id}`;
        });
      });

      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          if (confirm("Are you sure you want to delete this charge?")) {
            const id = this.getAttribute("data-id");
            deleteCharge(id);
          }
        });
      });
    }

    // Delete other charge via database API
    function deleteCharge(id) {
      fetch(`${Endpoint}/api/v1/others/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          if (response.ok) {
            alert("Charge deleted successfully!");
            fetchCharges();
          } else {
            throw new Error("Failed to delete other charge");
          }
        })
        .catch((error) => {
          console.error("Error deleting other charge:", error);
          alert(error.message);
        });
    }

    // Event listener for search box input
    searchBox.addEventListener("keyup", filterCharges);

    // Event listener for changing rows per page
    rowsSelect.addEventListener("change", function () {
      rowsPerPage =
        this.value === "All"
          ? filteredCharges.length
          : parseInt(this.value);
      totalPages = Math.ceil(filteredCharges.length / rowsPerPage) || 1;
      currentPage = 1;
      loadCharges();
    });

    // Event listener for next page button
    nextPageButton.addEventListener("click", function () {
      if (currentPage < totalPages) {
        currentPage++;
        loadCharges();
      }
    });

    // Event listener for previous page button
    prevPageButton.addEventListener("click", function () {
      if (currentPage > 1) {
        currentPage--;
        loadCharges();
      }
    });

    // Event listener for adding a new charge
    document
      .getElementById("addChargeButton")
      .addEventListener("click", function () {
        window.location.href = "add_othercharges.html";
      });

    // Function to update charges count display
    function updateChargesCount() {
      // If the HTML page has its own globally exposed function, trigger that one
      if (typeof window.updateChargesCount === "function" && window.updateChargesCount !== updateChargesCount) {
        window.updateChargesCount();
      } else {
        const countElement = document.getElementById("chargesCountNumber");
        if (countElement) {
          const searchValue = searchBox ? searchBox.value.toLowerCase() : "";
          if (searchValue) {
            countElement.textContent = `${filteredCharges.length} of ${charges.length}`;
          } else {
            countElement.textContent = charges.length;
          }
        }
      }
    }

    // Expose data globally for HTML file access
    window.originalChargesData = charges;
    window.filteredChargesData = filteredCharges;
    window.updateChargesCount = updateChargesCount;

    // Initial loading of other charges
    fetchCharges();
});

// Retrieve the username from localStorage
const username = localStorage.getItem("username");
if (document.getElementById("profileName")) {
  document.getElementById("profileName").innerText = username || "Guest";
}
if (document.getElementById("navProfileName")) {
  document.getElementById("navProfileName").innerText = username || "Guest";
}
