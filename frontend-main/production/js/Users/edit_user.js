document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get("id");
  const token = localStorage.getItem("token");

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  if (userId) {
    // Fetch user data from the backend
    fetch(`${Endpoint}/api/v1/users/${userId}`, {
      method: "GET",
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
            throw new Error("Failed to load user data");
          }
        }
        return response.json();
      })
      .then((user) => {
        // Set the title with the username
        document.getElementById(
          "editUserTitle"
        ).textContent = `Edit User Account: ${user.user}`;
        document.getElementById("editUsername").value = user.username;
        document.getElementById("editRole").value = user.role; // Ensure this value matches the backend exactly
        document.getElementById("editEmail").value = user.email;
        document.getElementById("editAgent").value = user.agent;

        // Parse and bind permissions
        let permissions = {};
        if (user.permissions) {
          try {
            permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
          } catch (e) {
            console.error("Failed to parse permissions", e);
          }
        }
        
        const permKeys = ["tours", "hotels", "transfers", "excursions", "bookings", "special_packages", "activities", "suppliers", "agents", "markups", "city_info", "users", "analytics"];
        permKeys.forEach(key => {
          const checkbox = document.getElementById(`perm_${key}`);
          if (checkbox) {
            checkbox.checked = permissions[key] !== false;
          }
        });

        // Fetch agent options from the backend
        fetch(`${Endpoint}/api/v1/agents/names`, {
          method: "GET",
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
                throw new Error("Failed to load agents");
              }
            }
            return response.json();
          })
          .then((agents) => {
            const agentSelect = document.getElementById("editAgent");
            //agentSelect.innerHTML = ""; // Clear existing options

            // Populate agent options
            agents.forEach((agent) => {
              const optionElement = document.createElement("option");
              optionElement.value = agent.id;
              optionElement.textContent = agent.name;
              agentSelect.appendChild(optionElement);
            });

            // Set the agent based on the user data returned from the backend
            agentSelect.value = user.agent_id || ""; // Ensure agent is set correctly
          })
          .catch((error) => {
            console.error("Error fetching agents:", error);
          });

        // Save edited user details
        document
          .getElementById("editUserForm")
          .addEventListener("submit", function (event) {
            event.preventDefault();

            const permissionsObj = {};
            const permKeys = ["tours", "hotels", "transfers", "excursions", "bookings", "special_packages", "activities", "suppliers", "agents", "markups", "city_info", "users", "analytics"];
            permKeys.forEach(key => {
              const checkbox = document.getElementById(`perm_${key}`);
              permissionsObj[key] = checkbox ? checkbox.checked : true;
            });

            const updatedUser = {
              username: document.getElementById("editUsername").value,
              role: document.getElementById("editRole").value,
              agent_id:
                parseInt(document.getElementById("editAgent").value, 10) ||
                null,
              email: document.getElementById("editEmail").value,
              permissions: permissionsObj
            };

            const submitBtn = document.getElementById("submitEditUser");
            if (submitBtn) {
              submitBtn.disabled = true;
              submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px"></i> Saving...';
            }

            fetch(`${Endpoint}/api/v1/users/${userId}`, {
              method: "PUT",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(updatedUser),
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
                    throw new Error("Failed to update user");
                  }
                }
                alert("User updated successfully!");
                window.location.href = "users.html";
              })
              .catch((error) => {
                console.error("Error updating user:", error);
                alert("Failed to update user. Please try again later.");
                if (submitBtn) {
                  submitBtn.disabled = false;
                  submitBtn.innerHTML = '<i class="fas fa-save" style="margin-right: 8px"></i> Save Changes';
                }
              });
          });

        // Handle password change
        document
          .getElementById("changePasswordForm")
          .addEventListener("submit", function (event) {
            event.preventDefault();

            const currentPassword =
              document.getElementById("currentPassword").value;
            const newPassword = document.getElementById("newPassword").value;
            const confirmNewPassword =
              document.getElementById("confirmNewPassword").value;

            if (newPassword !== confirmNewPassword) {
              alert("New passwords do not match.");
              return;
            }

            const passwordData = {
              current_password: currentPassword,
              new_password: newPassword,
            };

            fetch(`${Endpoint}/api/v1/users/${userId}/password`, {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(passwordData),
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
                    throw new Error("Failed to change password");
                  }
                }
                alert("Password updated successfully!");
                $("#changePasswordModal").modal("hide");
              })
              .catch((error) => {
                console.error("Error changing password:", error);
                alert("Failed to change password. Please try again later.");
              });
          });

        // Toggle password visibility for change password form
        document
          .getElementById("toggleCurrentPassword")
          .addEventListener("change", function () {
            const currentPasswordInput =
              document.getElementById("currentPassword");
            currentPasswordInput.type = this.checked ? "text" : "password";
          });

        document
          .getElementById("toggleNewPassword")
          .addEventListener("change", function () {
            const newPasswordInput = document.getElementById("newPassword");
            newPasswordInput.type = this.checked ? "text" : "password";
          });

        document
          .getElementById("toggleConfirmNewPassword")
          .addEventListener("change", function () {
            const confirmNewPasswordInput =
              document.getElementById("confirmNewPassword");
            confirmNewPasswordInput.type = this.checked ? "text" : "password";
          });
      })
      .catch((error) => {
        console.error("Error loading user data:", error);
        alert("Failed to load user data. Please try again later.");
        window.location.href = "users.html";
      });
  } else {
    alert("User not found");
    window.location.href = "users.html";
  }
});
