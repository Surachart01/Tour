document.addEventListener("DOMContentLoaded", function () {
  const agentSelect = document.getElementById("selectAgent");
  const roleSelect = document.getElementById("selectRole");

  const token = localStorage.getItem("token");

  // Check if token exists
  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html"; // Redirect to login page if token is not found
    return;
  }

  // Fetch agent options from the backend with token authentication
  fetch(`${Endpoint}/api/v1/agents/names`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (response.status === 401) {
        // Unauthorized, redirect to login
        window.location.href = "login.html";
      } else if (!response.ok) {
        throw new Error("Failed to load agents");
      }
      return response.json();
    })
    .then((data) => {
      data.forEach((agent) => {
        const optionElement = document.createElement("option");
        optionElement.value = agent.id;
        optionElement.textContent = agent.name;
        agentSelect.appendChild(optionElement);
      });
    })
    .catch((error) => console.error("Error fetching agents:", error));

  // Basic form validation and sending data to the backend
  document
    .getElementById("userForm")
    .addEventListener("submit", function (event) {
      event.preventDefault();

      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return;
      }

      const agentIdValue = document.getElementById("selectAgent").value;
      const agentId = agentIdValue ? parseInt(agentIdValue, 10) : null;

      const permissionsObj = {};
      const permKeys = ["tours", "hotels", "transfers", "excursions", "bookings", "special_packages", "activities", "suppliers", "agents", "markups", "city_info", "users"];
      permKeys.forEach(key => {
        const checkbox = document.getElementById(`perm_${key}`);
        permissionsObj[key] = checkbox ? checkbox.checked : true;
      });

      // Prepare the user data
      const user = {
        username: document.getElementById("username").value,
        role: document.getElementById("selectRole").value,
        agent_id: agentId,
        email: document.getElementById("email").value,
        password: password,
        permissions: permissionsObj
      };

      // Log the user object to check its structure
      console.log("User data being sent:", user);

      // Send the user data to the backend
      fetch(`${Endpoint}/api/v1/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      })
        .then((response) => {
          if (response.status === 401) {
            window.location.href = "login.html";
          } else if (!response.ok) {
            return response.text().then((text) => {
              throw new Error(text);
            });
          }
          return response.json();
        })
        .then((data) => {
          console.log("User saved successfully:", data);
          window.location.href = "users.html";
        })
        .catch((error) => {
          console.error("Error saving user:", error);
          alert(`Error saving user: ${error.message}`);
        });
    });
});
