document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  // State variables
  let allAgents = [];
  let attachedFiles = []; // Array of { id, original_name, url }

  // DOM Elements
  const agentSelectBox = document.getElementById("agentSelectBox");
  const customEmailsInput = document.getElementById("customEmails");
  const ccEmailInput = document.getElementById("ccEmail");
  const emailSubjectInput = document.getElementById("emailSubject");
  const emailBodyInput = document.getElementById("emailBody");
  
  const dropzoneArea = document.getElementById("dropzoneArea");
  const promoFileInput = document.getElementById("promoFileInput");
  const attachmentList = document.getElementById("attachmentList");
  
  const btnSelectAllAgents = document.getElementById("btnSelectAllAgents");
  const btnDeselectAllAgents = document.getElementById("btnDeselectAllAgents");
  const promoForm = document.getElementById("promoEmailForm");
  const btnSendPromo = document.getElementById("btnSendPromo");

  // Fetch B2B Agents list
  fetch(`${Endpoint}/api/v1/agents/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Failed to load agents list");
      return res.json();
    })
    .then(data => {
      allAgents = data || [];
      renderAgentsList(allAgents);
    })
    .catch(err => {
      console.error(err);
      agentSelectBox.innerHTML = '<div class="text-danger text-center py-4">Error loading agents list</div>';
    });

  // Render agents list
  function renderAgentsList(agents) {
    if (agents.length === 0) {
      agentSelectBox.innerHTML = '<div class="text-muted text-center py-4">No agents found</div>';
      return;
    }

    agentSelectBox.innerHTML = "";
    agents.forEach(agent => {
      if (!agent.email) return; // Skip if no email

      const item = document.createElement("div");
      item.className = "agent-item mb-1";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = agent.email;
      checkbox.id = `agentCheckbox_${agent.id}`;
      checkbox.className = "agent-cb";

      const label = document.createElement("label");
      label.htmlFor = `agentCheckbox_${agent.id}`;
      label.className = "m-0 flex-grow-1";
      label.style.cursor = "pointer";
      label.textContent = `${agent.name} (${agent.email})`;

      item.appendChild(checkbox);
      item.appendChild(label);
      agentSelectBox.appendChild(item);
    });
  }

  // Select all / Deselect all
  btnSelectAllAgents.addEventListener("click", () => {
    document.querySelectorAll(".agent-cb").forEach(cb => cb.checked = true);
  });

  btnDeselectAllAgents.addEventListener("click", () => {
    document.querySelectorAll(".agent-cb").forEach(cb => cb.checked = false);
  });

  // Dropzone file upload actions
  dropzoneArea.addEventListener("click", () => promoFileInput.click());

  dropzoneArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzoneArea.style.background = "#f3ebf7";
    dropzoneArea.style.borderColor = "#8e44ad";
  });

  dropzoneArea.addEventListener("dragleave", () => {
    dropzoneArea.style.background = "#f9f6fc";
    dropzoneArea.style.borderColor = "#9b59b6";
  });

  dropzoneArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzoneArea.style.background = "#f9f6fc";
    dropzoneArea.style.borderColor = "#9b59b6";
    if (e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  });

  promoFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFilesUpload(e.target.files);
    }
  });

  // Handle files upload to server
  function handleFilesUpload(filesList) {
    Array.from(filesList).forEach(file => {
      const tempId = Date.now() + Math.random().toString(36).substr(2, 9);
      
      // Render pending item
      const itemEl = document.createElement("div");
      itemEl.className = "attachment-item";
      itemEl.id = `temp_file_${tempId}`;
      itemEl.innerHTML = `
        <div class="attachment-file-info">
          <i class="fa fa-spinner fa-spin text-secondary"></i>
          <span>Uploading ${file.name}...</span>
        </div>
      `;
      attachmentList.appendChild(itemEl);

      // Perform upload
      const formData = new FormData();
      formData.append("file", file);

      fetch(`${Endpoint}/api/v1/files/upload/document`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })
        .then(res => {
          if (!res.ok) throw new Error("Upload failed");
          return res.json();
        })
        .then(data => {
          if (data.success && data.file_info) {
            const fileInfo = data.file_info;
            attachedFiles.push({
              id: fileInfo.id,
              original_name: fileInfo.original_name,
              url: fileInfo.url
            });

            // Update DOM element
            const element = document.getElementById(`temp_file_${tempId}`);
            if (element) {
              element.id = `attached_file_${fileInfo.id}`;
              const iconClass = getFileIconClass(fileInfo.original_name);
              element.innerHTML = `
                <div class="attachment-file-info">
                  <i class="fa ${iconClass}"></i>
                  <span>${fileInfo.original_name}</span>
                </div>
                <button type="button" class="remove-attachment-btn" data-id="${fileInfo.id}">
                  <i class="fa fa-times"></i>
                </button>
              `;
              
              // Remove listener
              element.querySelector(".remove-attachment-btn").addEventListener("click", () => {
                removeAttachment(fileInfo.id);
              });
            }
          } else {
            throw new Error("Invalid response format");
          }
        })
        .catch(err => {
          console.error(err);
          const element = document.getElementById(`temp_file_${tempId}`);
          if (element) {
            element.innerHTML = `
              <div class="attachment-file-info text-danger">
                <i class="fa fa-exclamation-triangle"></i>
                <span>Failed to upload ${file.name}</span>
              </div>
              <button type="button" class="remove-attachment-btn" onclick="this.parentElement.remove()">
                <i class="fa fa-times"></i>
              </button>
            `;
          }
        });
    });
  }

  // Remove attachment
  function removeAttachment(fileId) {
    attachedFiles = attachedFiles.filter(f => f.id !== fileId);
    const element = document.getElementById(`attached_file_${fileId}`);
    if (element) element.remove();
  }

  // Helper to determine file icon class
  function getFileIconClass(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    if (ext === "pdf") return "fa-file-pdf-o file-pdf";
    if (["doc", "docx"].includes(ext)) return "fa-file-word-o file-word";
    if (["xls", "xlsx"].includes(ext)) return "fa-file-excel-o file-excel";
    if (["ppt", "pptx"].includes(ext)) return "fa-file-powerpoint-o file-powerpoint";
    return "fa-file-o file-other";
  }

  // Handle Form Submit
  promoForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // 1. Gather recipients
    const selectedEmails = Array.from(document.querySelectorAll(".agent-cb:checked")).map(cb => cb.value);
    
    const customEmailsText = customEmailsInput.value.trim();
    if (customEmailsText) {
      const customEmails = customEmailsText.split(",").map(em => em.trim()).filter(em => em);
      selectedEmails.push(...customEmails);
    }

    if (selectedEmails.length === 0) {
      alert("Please select at least one agent or enter a custom recipient email.");
      return;
    }

    // 2. Validate form fields
    const subject = emailSubjectInput.value.trim();
    const body = emailBodyInput.value.trim();
    const cc = ccEmailInput.value.trim();

    if (!subject || !body) {
      alert("Subject and Body fields are required.");
      return;
    }

    // Disable button & show loading state
    btnSendPromo.disabled = true;
    const originalText = btnSendPromo.innerHTML;
    btnSendPromo.innerHTML = '<i class="fa fa-spinner fa-spin mr-2"></i> Sending...';

    // 3. Construct payload
    const payload = {
      to: [...new Set(selectedEmails)].join(", "),
      cc: cc || undefined,
      subject: subject,
      body: body,
      attachments: attachedFiles.map(f => ({
        filename: f.original_name,
        url: f.url
      }))
    };

    // 4. Send Request
    fetch(`${Endpoint}/api/v1/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to send promotion email");
        return res.json();
      })
      .then(data => {
        alert("Promotion email sent successfully!");
        
        // Reset form & state
        promoForm.reset();
        attachedFiles = [];
        attachmentList.innerHTML = "";
        document.querySelectorAll(".agent-cb").forEach(cb => cb.checked = false);
      })
      .catch(err => {
        console.error(err);
        alert("Error sending email: " + err.message);
      })
      .finally(() => {
        btnSendPromo.disabled = false;
        btnSendPromo.innerHTML = originalText;
      });
  });

  // Retrieve and show username
  const username = localStorage.getItem("username");
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;
});
