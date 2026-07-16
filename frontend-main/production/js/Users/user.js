document.addEventListener("DOMContentLoaded", function () {
  let users = [];
  let filteredUsers = []; // For filtered data
  let currentPage = 1;
  let rowsPerPage = 25;
  let totalPages = 1;

  const userTableBody = document.getElementById("userTableBody");
  const searchBox = document.getElementById("searchBox");
  const rowsSelect = document.getElementById("rowsSelect");
  const prevPageButton = document.getElementById("prevPage");
  const nextPageButton = document.getElementById("nextPage");

  // Load users from the backend
  function loadUsers() {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("You are not authorized. Please log in first.");
      window.location.href = "login.html";
      return;
    }

    fetch(`${Endpoint}/api/v1/users/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((response) => {
        if (response.status === 401) {
          window.location.href = "login.html";
        } else if (response.status === 403) {
          alert(
            "You don't have sufficient permissions to perform this action."
          );
          return;
        } else if (!response.ok) {
          throw new Error("Failed to load users");
        }
        return response.json();
      })
      .then((data) => {
        users = window.ApiResponse.list(data, ["users", "data", "items", "results"]);
        filteredUsers = [...users]; // Initialize filteredUsers with all users
        totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
        updateUsersCount();
        renderTable();
      })
      .catch((error) => {
        console.error("Error loading users:", error);
      });
  }

  // Function to render the table based on current page
  function renderTable() {
    userTableBody.innerHTML = "";

    const start = (currentPage - 1) * rowsPerPage;
    const end = Math.min(start + rowsPerPage, filteredUsers.length);
    const rowsToShow = filteredUsers.slice(start, end);

    rowsToShow.forEach((user, index) => {
      const row = `<tr>
        <td>${user.user}</td>
        <td>${user.role}</td>
        <td>${user.agent}</td>
        <td>${user.email}</td>
        <td><button class="btn btn-primary btn-sm edit-btn" data-id="${user.id}"><i class="fa fa-edit"></i> Edit</button></td>
        <td><button class="btn btn-danger btn-sm delete-btn" data-id="${user.id}"><i class="fa fa-trash"></i> Delete</button></td>
      </tr>`;
      userTableBody.innerHTML += row;
    });

    updatePaginationButtons();
    addEditDeleteListeners();
  }

  // Update pagination buttons based on current page
  function updatePaginationButtons() {
    prevPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === totalPages;
  }

  // Function to handle search functionality
  function filterUsers() {
    const searchValue = searchBox.value.toLowerCase();
    filteredUsers = users.filter((user) =>
      Object.values(user).join(" ").toLowerCase().includes(searchValue)
    );
    currentPage = 1; // Reset to the first page on new search
    totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
    updateUsersCount();
    renderTable();
  }

  // Add event listeners to edit and delete buttons
  function addEditDeleteListeners() {
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        const userId = this.getAttribute("data-id");
        window.location.href = `edit_user.html?id=${userId}`;
      });
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", function () {
        if (confirm("Are you sure you want to delete this user?")) {
          const userId = this.getAttribute("data-id");
          deleteUser(userId);
        }
      });
    });
  }

  // Function to delete a user
  function deleteUser(userId) {
    const token = localStorage.getItem("token");

    fetch(`${Endpoint}/api/v1/users/${userId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
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
            throw new Error("Failed to delete user");
          }
        }
        loadUsers(); // Reload users after deletion
      })
      .catch((error) => {
        console.error("Error deleting user:", error);
        alert("Failed to delete user.");
      });
  }

  // Event listeners for pagination
  nextPageButton.addEventListener("click", function () {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  prevPageButton.addEventListener("click", function () {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });

  // Event listener for search box input
  searchBox.addEventListener("keyup", filterUsers);

  // Event listener for changing rows per page
  rowsSelect.addEventListener("change", function () {
    rowsPerPage =
      this.value === "All" ? filteredUsers.length : parseInt(this.value);
    totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
    currentPage = 1;
    renderTable();
  });

  // Event listener for adding a new user
  document
    .getElementById("addUserButton")
    .addEventListener("click", function () {
      window.location.href = "add_user.html";
    });
  
    // Function to update the users count display
    function updateUsersCount() {
      const usersCountElement = document.getElementById("usersCount");
      if (usersCountElement) {
        const totalCount = users.length;
        const filteredCount = filteredUsers.length;
        
        if (filteredCount === totalCount) {
          usersCountElement.textContent = totalCount;
        } else {
          usersCountElement.textContent = `${filteredCount} of ${totalCount}`;
        }
      }
    }
  
    // Initial load of users
    loadUsers();
  });
  
  // Retrieve the username from localStorage
  const username = localStorage.getItem("username");
  
  // Set the username in the profile info
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;
