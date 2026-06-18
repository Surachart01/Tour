document.addEventListener("DOMContentLoaded", function () {
    const charges = JSON.parse(localStorage.getItem("charges")) || [];
    let filteredCharges = [...charges]; // For filtered data
    let currentPage = 1;
    let rowsPerPage = 25;
    let totalPages = 1;

    const chargesTableBody = document.getElementById("chargesTableBody");
    const searchBox = document.getElementById("searchBox");
    const rowsSelect = document.getElementById("rowsSelect");
    const prevPageButton = document.getElementById("prevPage");
    const nextPageButton = document.getElementById("nextPage");

    // Load charges based on pagination
    function loadCharges() {
      chargesTableBody.innerHTML = "";

      const start = (currentPage - 1) * rowsPerPage;
      const end = Math.min(start + rowsPerPage, filteredCharges.length);
      const rowsToShow = filteredCharges.slice(start, end);

      rowsToShow.forEach((charge, index) => {
        const row = `
            <tr>
              <td>${charge.description}</td>
              <td>${charge.amount}</td>
              <td>${charge.chargeType}</td>
              <td><button class="btn btn-primary btn-sm edit-btn" data-index="${index}"><i class="fa fa-edit"></i> Edit</button></td>
              <td><button class="btn btn-danger btn-sm delete-btn" data-index="${index}"><i class="fa fa-trash"></i> Delete</button></td>
            </tr>`;
        chargesTableBody.insertAdjacentHTML("beforeend", row);
      });

      updatePaginationButtons();
      addEditDeleteListeners();
      updateChargesCount();
    }

    // Update pagination buttons based on current page
    function updatePaginationButtons() {
      prevPageButton.disabled = currentPage === 1;
      nextPageButton.disabled = currentPage === totalPages;
    }

    // Handle search functionality
    function filterCharges() {
      const searchValue = searchBox.value.toLowerCase();
      filteredCharges = charges.filter((charge) =>
        Object.values(charge).join(" ").toLowerCase().includes(searchValue)
      );
      currentPage = 1; // Reset to first page on new search
      totalPages = Math.ceil(filteredCharges.length / rowsPerPage);
      loadCharges();
      updateChargesCount();
    }

    // Add event listeners for edit and delete buttons
    function addEditDeleteListeners() {
      document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const index = this.getAttribute("data-index");
          window.location.href = `edit_othercharges.html?index=${index}`;
        });
      });

      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          if (confirm("Are you sure you want to delete this charge?")) {
            const index = this.getAttribute("data-index");
            charges.splice(index, 1);
            localStorage.setItem("charges", JSON.stringify(charges));
            filteredCharges = [...charges]; // Update filtered charges after deletion
            filterCharges();
          }
        });
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
      totalPages = Math.ceil(filteredCharges.length / rowsPerPage);
      currentPage = 1;
      loadCharges();
      updateChargesCount();
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
      const countElement = document.getElementById("chargesCountNumber");
      if (countElement) {
        const searchValue = searchBox ? searchBox.value.toLowerCase() : '';
        if (searchValue) {
          // Show "filtered of total" when searching
          countElement.textContent = `${filteredCharges.length} of ${charges.length}`;
        } else {
          // Show total count when not searching
          countElement.textContent = charges.length;
        }
      }
    }

    // Expose data globally for HTML file access
    window.originalChargesData = charges;
    window.filteredChargesData = filteredCharges;
    window.updateChargesCount = updateChargesCount;

    // Initial rendering of charges
    totalPages = Math.ceil(filteredCharges.length / rowsPerPage);
    loadCharges();
  });

  // Retrieve the username from localStorage
  const username = localStorage.getItem("username");

  // Set the username in the profile info
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;
