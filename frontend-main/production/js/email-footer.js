/**
 * Email Footer Customization JavaScript
 * Handles email footer settings for admin and superadmin users
 */

document.addEventListener("DOMContentLoaded", function () {
  console.log("Email Footer JS loaded");
  
  // Check if user has admin access
  const role = localStorage.getItem("role");
  const hasAdminAccess = role === "admin" || role === "superadmin";
  
  // Show/hide email footer tab based on role
  const emailFooterTabNav = document.getElementById("emailFooterTabNav");
  if (emailFooterTabNav) {
    if (hasAdminAccess) {
      emailFooterTabNav.style.display = "block";
      initializeEmailFooter();
    } else {
      emailFooterTabNav.style.display = "none";
    }
  }

  /**
   * Initialize email footer functionality
   */
  function initializeEmailFooter() {
    console.log("Initializing email footer functionality");
    
    // Setup event listeners
    setupEmailFooterEventListeners();
    
    // Load current settings when tab is clicked
    const emailFooterTab = document.getElementById("email-footer-tab");
    if (emailFooterTab) {
      emailFooterTab.addEventListener("click", function() {
        loadCurrentEmailFooterSettings();
      });
    }

    // Setup auto-preview functionality
    setupAutoPreview();
  }

  /**
   * Setup event listeners for email footer functionality
   */
  function setupEmailFooterEventListeners() {
    // Save footer settings
    const saveFooterBtn = document.getElementById("saveFooterSettings");
    if (saveFooterBtn) {
      saveFooterBtn.addEventListener("click", function(e) {
        e.preventDefault();
        saveEmailFooterSettings();
      });
    }

    // Preview footer
    const previewBtn = document.getElementById("previewFooter");
    if (previewBtn) {
      previewBtn.addEventListener("click", function() {
        generateFooterPreview();
      });
    }

    // Reset to default
    const resetBtn = document.getElementById("resetFooterSettings");
    if (resetBtn) {
      resetBtn.addEventListener("click", function() {
        resetEmailFooterSettings();
      });
    }



    // Toggle eco message visibility
    const ecoMessageCheckbox = document.getElementById("footerShowEcoMessage");
    const ecoMessageGroup = document.getElementById("footerEcoMessageGroup");
    if (ecoMessageCheckbox && ecoMessageGroup) {
      ecoMessageCheckbox.addEventListener("change", function() {
        ecoMessageGroup.style.display = this.checked ? "block" : "none";
      });
    }
  }

  /**
   * Setup auto-preview functionality with debouncing
   */
  function setupAutoPreview() {
    const formInputs = document.querySelectorAll("#emailFooterForm input, #emailFooterForm textarea, #emailFooterForm select");
    let previewTimeout;

    formInputs.forEach(input => {
      input.addEventListener("input", function() {
        clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
          generateFooterPreview();
        }, 1000); // Debounce for 1 second
      });
    });
  }

  /**
   * Load current email footer settings
   */
  async function loadCurrentEmailFooterSettings() {
    try {
      showFooterLoading("Loading current settings...");
      
      const token = localStorage.getItem("token");
      const response = await fetch(`${Endpoint}/api/v1/email-footer/settings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 404) {
        // No settings found, load defaults
        console.log("No existing settings found, loading defaults");
        hideFooterLoading();
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load settings: ${response.status} ${response.statusText}`);
      }

      const settings = await response.json();
      console.log("Loaded email footer settings:", settings);
      
      populateEmailFooterForm(settings);
      generateFooterPreview();
      hideFooterLoading();
      showFooterSuccess("Settings loaded successfully");

    } catch (error) {
      console.error("Error loading email footer settings:", error);
      hideFooterLoading();
      showFooterError("Failed to load email footer settings: " + error.message);
    }
  }

  /**
   * Save email footer settings
   */
  async function saveEmailFooterSettings() {
    try {
      showFooterLoading("Saving settings...");
      
      const settings = collectFooterFormData();
      const token = localStorage.getItem("token");

      const response = await fetch(`${Endpoint}/api/v1/email-footer/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to save settings: ${response.status}`);
      }

      const result = await response.json();
      console.log("Email footer settings saved:", result);
      
      hideFooterLoading();
      showFooterSuccess("Email footer settings saved successfully!");
      
    } catch (error) {
      console.error("Error saving email footer settings:", error);
      hideFooterLoading();
      showFooterError("Failed to save settings: " + error.message);
    }
  }

  /**
   * Generate footer preview
   */
  async function generateFooterPreview() {
    try {
      const settings = collectFooterFormData();
      const token = localStorage.getItem("token");

      const response = await fetch(`${Endpoint}/api/v1/email-footer/preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate preview: ${response.status}`);
      }

      const previewData = await response.json();
      const previewContainer = document.getElementById("footerPreviewContainer");
      
      if (previewContainer && previewData.html) {
        previewContainer.innerHTML = previewData.html;
      }

    } catch (error) {
      console.error("Error generating preview:", error);
      const previewContainer = document.getElementById("footerPreviewContainer");
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="text-center text-danger py-4">
            <i class="fa fa-exclamation-triangle fa-2x mb-3"></i>
            <p>Failed to generate preview</p>
            <small>${error.message}</small>
          </div>
        `;
      }
    }
  }

  /**
   * Reset email footer settings to default
   */
  async function resetEmailFooterSettings() {
    if (!confirm("Are you sure you want to reset all email footer settings to default? This action cannot be undone.")) {
      return;
    }

    try {
      showFooterLoading("Resetting to default...");
      
      const token = localStorage.getItem("token");
      const response = await fetch(`${Endpoint}/api/v1/email-footer/reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to reset settings: ${response.status}`);
      }

      const result = await response.json();
      console.log("Email footer settings reset:", result);
      
      // Reload the settings
      await loadCurrentEmailFooterSettings();
      hideFooterLoading();
      showFooterSuccess("Email footer settings reset to default successfully!");
      
    } catch (error) {
      console.error("Error resetting email footer settings:", error);
      hideFooterLoading();
      showFooterError("Failed to reset settings: " + error.message);
    }
  }



  /**
   * Collect form data into settings object
   */
  function collectFooterFormData() {
    return {
      company_name: document.getElementById("footerCompanyName")?.value || "",
      team_name: document.getElementById("footerTeamName")?.value || "",
      address: document.getElementById("footerAddress")?.value || "",
      phone: document.getElementById("footerPhone")?.value || "",
      email: document.getElementById("footerEmail")?.value || "",
      website: document.getElementById("footerWebsite")?.value || "",
      tax_id: document.getElementById("footerTaxId")?.value || "",
      logo_width: parseInt(document.getElementById("footerLogoWidth")?.value) || 200,
      primary_color: document.getElementById("footerPrimaryColor")?.value || "#0066CC",
      secondary_color: document.getElementById("footerSecondaryColor")?.value || "#4A90E2",
      show_eco_message: document.getElementById("footerShowEcoMessage")?.checked || false,
      eco_message: document.getElementById("footerEcoMessage")?.value || "",
      custom_message: document.getElementById("footerCustomMessage")?.value || "",
      social_links: {
        facebook: document.getElementById("footerFacebookUrl")?.value || "",
        instagram: document.getElementById("footerInstagramUrl")?.value || "",
        twitter: document.getElementById("footerTwitterUrl")?.value || "",
        linkedin: document.getElementById("footerLinkedinUrl")?.value || ""
      }
    };
  }

  /**
   * Populate form with settings data
   */
  function populateEmailFooterForm(settings) {
    if (!settings) return;

    // Basic company information
    if (settings.company_name) document.getElementById("footerCompanyName").value = settings.company_name;
    if (settings.team_name) document.getElementById("footerTeamName").value = settings.team_name;
    if (settings.address) document.getElementById("footerAddress").value = settings.address;
    
    // Contact information
    if (settings.phone) document.getElementById("footerPhone").value = settings.phone;
    if (settings.email) document.getElementById("footerEmail").value = settings.email;
    if (settings.website) document.getElementById("footerWebsite").value = settings.website;
    if (settings.tax_id) document.getElementById("footerTaxId").value = settings.tax_id;
    
    // Styling
    if (settings.logo_width) document.getElementById("footerLogoWidth").value = settings.logo_width;
    if (settings.primary_color) document.getElementById("footerPrimaryColor").value = settings.primary_color;
    if (settings.secondary_color) document.getElementById("footerSecondaryColor").value = settings.secondary_color;
    
    // Messages
    if (typeof settings.show_eco_message === "boolean") {
      document.getElementById("footerShowEcoMessage").checked = settings.show_eco_message;
      document.getElementById("footerEcoMessageGroup").style.display = settings.show_eco_message ? "block" : "none";
    }
    if (settings.eco_message) document.getElementById("footerEcoMessage").value = settings.eco_message;
    if (settings.custom_message) document.getElementById("footerCustomMessage").value = settings.custom_message;
    
    // Social links
    if (settings.social_links) {
      if (settings.social_links.facebook) document.getElementById("footerFacebookUrl").value = settings.social_links.facebook;
      if (settings.social_links.instagram) document.getElementById("footerInstagramUrl").value = settings.social_links.instagram;
      if (settings.social_links.twitter) document.getElementById("footerTwitterUrl").value = settings.social_links.twitter;
      if (settings.social_links.linkedin) document.getElementById("footerLinkedinUrl").value = settings.social_links.linkedin;
    }
  }

  /**
   * Show loading state
   */
  function showFooterLoading(message = "Loading...") {
    const previewContainer = document.getElementById("footerPreviewContainer");
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="email-footer-loading">
          <i class="fa fa-spinner fa-spin fa-2x mb-3"></i>
          <p>${message}</p>
        </div>
      `;
    }
  }

  /**
   * Hide loading state
   */
  function hideFooterLoading() {
    // Loading will be replaced by success/error message or preview
  }

  /**
   * Show success message
   */
  function showFooterSuccess(message) {
    showFooterMessage(message, "success");
  }

  /**
   * Show error message
   */
  function showFooterError(message) {
    showFooterMessage(message, "error");
  }

  /**
   * Show message with type
   */
  function showFooterMessage(message, type = "info") {
    // Remove existing messages
    const existingMessages = document.querySelectorAll(".email-footer-success, .email-footer-error");
    existingMessages.forEach(msg => msg.remove());

    const messageDiv = document.createElement("div");
    messageDiv.className = `email-footer-${type}`;
    messageDiv.innerHTML = `
      <i class="fa fa-${type === "success" ? "check-circle" : "exclamation-circle"}"></i>
      ${message}
      <button type="button" class="close" style="float: right; background: none; border: none; font-size: 18px; line-height: 1; color: inherit; opacity: 0.7;" onclick="this.parentElement.remove()">
        <span>&times;</span>
      </button>
    `;

    const cardBody = document.querySelector("#email-footer .card-body");
    if (cardBody) {
      cardBody.insertBefore(messageDiv, cardBody.firstChild);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.remove();
        }
      }, 5000);
    }
  }

  // Make essential functions available globally for debugging
  window.emailFooterFunctions = {
    loadCurrentEmailFooterSettings,
    saveEmailFooterSettings,
    generateFooterPreview,
    resetEmailFooterSettings,
    collectFooterFormData,
    populateEmailFooterForm
  };
});
