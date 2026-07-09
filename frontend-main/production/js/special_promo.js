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
  let savedCustomEmails = [];
  const customEmailsStorageKey = "specialPromoCustomEmails";

  // DOM Elements
  const agentSelectBox = document.getElementById("agentSelectBox");
  const customEmailsInput = document.getElementById("customEmails");
  const btnAddCustomEmail = document.getElementById("btnAddCustomEmail");
  const customEmailList = document.getElementById("customEmailList");
  const ccEmailInput = document.getElementById("ccEmail");
  const emailSubjectInput = document.getElementById("promoSubject");
  const emailBodyInput = document.getElementById("promoBody");
  
  const dropzoneArea = document.getElementById("dropzoneArea");
  const promoFileInput = document.getElementById("promoFileInput");
  const attachmentList = document.getElementById("fileList");
  
  const btnSelectAllAgents = document.getElementById("btnSelectAllAgents");
  const btnDeselectAllAgents = document.getElementById("btnDeselectAllAgents");
  const promoForm = document.getElementById("promoEmailForm");
  const btnSendPromo = document.getElementById("btnSendPromo");

  // Role-based visibility
  const role = localStorage.getItem("role");
  const promoCreateCard = document.getElementById("promoCreateCard");
  const historyTitle = document.getElementById("historyTitle");
  const historySubtitle = document.getElementById("historySubtitle");

  if (role === "agent") {
    if (promoCreateCard) promoCreateCard.style.display = "none";
    
    const headerTitle = document.querySelector(".promo-header h2");
    const headerDesc = document.querySelector(".promo-header p");
    if (headerTitle) headerTitle.innerHTML = '<i class="fa fa-bullhorn text-primary mr-2" style="color: #9b59b6 !important;"></i> Special Promotions';
    if (headerDesc) headerDesc.textContent = 'View and download special hotel promotions, news, and details sent by administrator.';
    
    if (historyTitle) historyTitle.innerHTML = '<i class="fa fa-history text-primary mr-2" style="color: #9b59b6 !important;"></i> Received Promotions';
    if (historySubtitle) historySubtitle.textContent = 'Review promotions and details sent by administrator.';
  } else {
    if (historyTitle) historyTitle.innerHTML = '<i class="fa fa-history text-primary mr-2" style="color: #9b59b6 !important;"></i> Sent Promotions History';
    if (historySubtitle) historySubtitle.textContent = 'Review promotions and details sent to your B2B agents.';
  }

  function normalizeEmail(email) {
    return (email || "").trim().toLowerCase();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function loadSavedCustomEmails() {
    try {
      const raw = localStorage.getItem(customEmailsStorageKey);
      savedCustomEmails = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(savedCustomEmails)) savedCustomEmails = [];
    } catch (error) {
      savedCustomEmails = [];
    }
    savedCustomEmails = [...new Set(savedCustomEmails.map(normalizeEmail).filter(isValidEmail))];
    saveCustomEmails();
    renderCustomEmails();
  }

  function saveCustomEmails() {
    localStorage.setItem(customEmailsStorageKey, JSON.stringify(savedCustomEmails));
  }

  function renderCustomEmails() {
    if (!customEmailList) return;
    customEmailList.innerHTML = "";

    if (savedCustomEmails.length === 0) {
      customEmailList.innerHTML = '<div class="text-muted small">No custom emails saved.</div>';
      return;
    }

    savedCustomEmails.forEach(email => {
      const chip = document.createElement("div");
      chip.className = "custom-email-chip";
      chip.innerHTML = `
        <span title="${email}">${email}</span>
        <button type="button" class="remove-custom-email-btn" data-email="${email}" title="Remove email">
          <i class="fa fa-times"></i>
        </button>
      `;
      customEmailList.appendChild(chip);
    });
  }

  function addCustomEmailFromInput() {
    if (!customEmailsInput) return;
    const email = normalizeEmail(customEmailsInput.value);
    if (!email) return;
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (savedCustomEmails.includes(email)) {
      alert("This email is already in the custom recipient list.");
      customEmailsInput.value = "";
      return;
    }

    savedCustomEmails.push(email);
    saveCustomEmails();
    renderCustomEmails();
    customEmailsInput.value = "";
    customEmailsInput.focus();
  }

  if (btnAddCustomEmail) {
    btnAddCustomEmail.addEventListener("click", addCustomEmailFromInput);
  }

  if (customEmailsInput) {
    customEmailsInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addCustomEmailFromInput();
      }
    });
  }

  if (customEmailList) {
    customEmailList.addEventListener("click", (event) => {
      const removeButton = event.target.closest(".remove-custom-email-btn");
      if (!removeButton) return;
      const email = normalizeEmail(removeButton.dataset.email);
      savedCustomEmails = savedCustomEmails.filter(item => item !== email);
      saveCustomEmails();
      renderCustomEmails();
    });
  }

  loadSavedCustomEmails();

  // Fetch B2B Agents list (only for admins)
  if (role !== "agent") {
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
  }

  // Render agents list
  function renderAgentsList(agents) {
    if (agents.length === 0) {
      agentSelectBox.innerHTML = '<div class="text-muted text-center py-4">No agents found</div>';
      return;
    }

    agentSelectBox.innerHTML = "";
    agents.forEach(agent => {
      if (!agent.email) return; // Skip if no email

      const emails = agent.email.split(/[,;]/).map(e => e.trim()).filter(e => e);
      if (emails.length === 0) return;

      const groupDiv = document.createElement("div");
      groupDiv.className = "agent-group-container mb-3";
      groupDiv.setAttribute("data-agent-name", agent.name.toLowerCase());
      
      const title = document.createElement("div");
      title.style.fontWeight = "600";
      title.style.color = "#34495e";
      title.style.fontSize = "0.95rem";
      title.style.marginBottom = "5px";
      title.textContent = agent.name;
      groupDiv.appendChild(title);

      emails.forEach((email, idx) => {
        const item = document.createElement("div");
        item.className = "agent-item mb-1";
        item.style.paddingLeft = "15px";
        item.setAttribute("data-email", email.toLowerCase());
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = email;
        checkbox.id = `agentCheckbox_${agent.id}_${idx}`;
        checkbox.className = "agent-cb";
        checkbox.checked = true; // Checked by default!

        const label = document.createElement("label");
        label.htmlFor = `agentCheckbox_${agent.id}_${idx}`;
        label.className = "m-0 flex-grow-1";
        label.style.cursor = "pointer";
        label.textContent = email;

        item.appendChild(checkbox);
        item.appendChild(label);
        groupDiv.appendChild(item);
      });

      agentSelectBox.appendChild(groupDiv);
    });
  }

  // Toggle checkbox on row click
  $(document).on("click", ".agent-item", function (e) {
    if (e.target.tagName !== "INPUT" && e.target.tagName !== "LABEL") {
      const cb = this.querySelector(".agent-cb");
      if (cb) cb.checked = !cb.checked;
    }
  });

  // Search / filter agents
  const searchAgents = document.getElementById("searchAgents");
  if (searchAgents) {
    searchAgents.addEventListener("input", function () {
      const query = this.value.toLowerCase().trim();
      document.querySelectorAll(".agent-group-container").forEach(group => {
        const name = group.getAttribute("data-agent-name");
        let hasVisibleEmail = false;

        group.querySelectorAll(".agent-item").forEach(item => {
          const email = item.getAttribute("data-email");
          if (name.includes(query) || email.includes(query)) {
            item.style.display = "flex";
            hasVisibleEmail = true;
          } else {
            item.style.display = "none";
          }
        });

        if (hasVisibleEmail) {
          group.style.display = "block";
        } else {
          group.style.display = "none";
        }
      });
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
  if (promoForm) {
    promoForm.addEventListener("submit", (e) => {
      e.preventDefault();

      // 1. Gather recipients
      const selectedEmails = Array.from(document.querySelectorAll(".agent-cb:checked")).map(cb => cb.value);
      
      const customEmailDraft = normalizeEmail(customEmailsInput?.value || "");
      if (customEmailDraft) {
        if (!isValidEmail(customEmailDraft)) {
          alert("Please enter a valid custom email address or add it to the saved custom list.");
          return;
        }
        if (!savedCustomEmails.includes(customEmailDraft)) {
          savedCustomEmails.push(customEmailDraft);
          saveCustomEmails();
          renderCustomEmails();
        }
        customEmailsInput.value = "";
      }

      selectedEmails.push(...savedCustomEmails);

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
      fetch(`${Endpoint}/api/v1/email/promo`, {
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

          // Reload history
          loadPromoHistory();
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
  }

  // Fetch and render promo history
  function loadPromoHistory() {
    const promoHistoryLoading = document.getElementById("promoHistoryLoading");
    const promoHistoryContent = document.getElementById("promoHistoryContent");
    const promoHistoryTableBody = document.getElementById("promoHistoryTableBody");

    if (!promoHistoryTableBody) return;

    fetch(`${Endpoint}/api/v1/email/promos`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch promos");
        return res.json();
      })
      .then(data => {
        if (promoHistoryLoading) promoHistoryLoading.style.display = "none";
        if (promoHistoryContent) promoHistoryContent.style.display = "block";

        promoHistoryTableBody.innerHTML = "";
        if (data.length === 0) {
          promoHistoryTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No promotions found</td></tr>';
          return;
        }

        data.forEach(promo => {
          const row = document.createElement("tr");

          // Date column
          const dateTd = document.createElement("td");
          dateTd.style.whiteSpace = "nowrap";
          dateTd.textContent = new Date(promo.created_at).toLocaleString('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          row.appendChild(dateTd);

          // Subject column
          const subjectTd = document.createElement("td");
          subjectTd.style.fontWeight = "600";
          subjectTd.style.color = "#2c3e50";
          subjectTd.textContent = promo.subject;
          
          if (role !== "agent") {
            const recipsDiv = document.createElement("div");
            recipsDiv.className = "text-muted small mt-1";
            recipsDiv.style.fontWeight = "normal";
            recipsDiv.innerHTML = `<i class="fa fa-paper-plane-o mr-1"></i> To: ${promo.recipients}`;
            subjectTd.appendChild(recipsDiv);
          }
          row.appendChild(subjectTd);

          // Body details column
          const bodyTd = document.createElement("td");
          bodyTd.style.whiteSpace = "pre-wrap";
          bodyTd.textContent = promo.body;
          row.appendChild(bodyTd);

          // Attachments column
          const attTd = document.createElement("td");
          if (promo.attachments && promo.attachments.length > 0) {
            promo.attachments.forEach(att => {
              const link = document.createElement("a");
              link.href = `${Endpoint}${att.url}`;
              link.target = "_blank";
              link.className = "btn btn-sm btn-outline-info d-block text-left mb-1 text-truncate";
              link.style.maxWidth = "180px";
              
              const iconClass = getFileIconClass(att.filename);
              link.innerHTML = `<i class="fa ${iconClass} mr-1"></i> ${att.filename}`;
              attTd.appendChild(link);
            });
          } else {
            attTd.innerHTML = '<span class="text-muted small">No attachments</span>';
          }
          row.appendChild(attTd);

          promoHistoryTableBody.appendChild(row);
        });
      })
      .catch(err => {
        console.error(err);
        if (promoHistoryLoading) {
          promoHistoryLoading.innerHTML = '<div class="text-danger"><i class="fa fa-exclamation-triangle fa-2x"></i><p class="mt-2">Error loading promotions history</p></div>';
        }
      });
  }

  // Load history initially
  loadPromoHistory();

  // Retrieve and show username
  const username = localStorage.getItem("username");
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;
});
