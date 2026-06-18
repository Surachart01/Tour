document.addEventListener("DOMContentLoaded", function () {
  // Initialize the page
  initializePage();
  
  // Set up authentication
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username") || "Guest";

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  // Set profile info
  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;

  // Hide Control Panel for non-admin users
  if (role !== "admin" && role !== "superadmin") {
    const controlPanelMenu = document.getElementById("controlPanelMenu");
    if (controlPanelMenu) {
      controlPanelMenu.style.display = "none";
    }
  }

  // Add event listeners
  setupEventListeners();
  
  // Load existing invoices
  loadInvoices();
});

// Global variables
let invoices = [];
let filteredInvoices = [];
let editingInvoiceId = null;
let currentPage = 1;
let rowsPerPage = 25;
let totalPages = 1;
let currentFilterMode = 'all'; // 'all' or 'date_range'
let currentDateRange = { start: null, end: null };

// Initialize page
function initializePage() {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  document.getElementById("fromDate").value = startDate;
  document.getElementById("toDate").value = endDate;
  document.getElementById("paymentDate").value = endDate;
}

// Setup event listeners
function setupEventListeners() {
  // Add new invoice button at bottom
  const addInvoiceBtnBottom = document.getElementById("addInvoiceBtnBottom");
  if (addInvoiceBtnBottom) {
    addInvoiceBtnBottom.addEventListener("click", function() {
      openInvoiceModal();
    });
  }
  
  // Save invoice button
  document.getElementById("saveInvoiceBtn").addEventListener("click", function() {
    saveInvoiceOnly();
  });
  
  // Generate PDF button
  document.getElementById("generatePdfBtn").addEventListener("click", function() {
    generatePdfOnly();
  });
  
  // Auto-generate booking ID when type changes
  document.getElementById("bookingType").addEventListener("change", function() {
    if (this.value && !document.getElementById("bookingId").value) {
      generateBookingId(this.value);
    }
  });
  
  // Form validation
  const requiredFields = document.querySelectorAll("#invoiceForm input[required], #invoiceForm select[required], #invoiceForm textarea[required]");
  requiredFields.forEach(field => {
    field.addEventListener("blur", validateField);
    field.addEventListener("input", clearFieldError);
  });
  
  // Search box
  document.getElementById("searchBox").addEventListener("keyup", filterTable);
  
  // Filter by date button
  document.getElementById("filterByDateBtn").addEventListener("click", filterByDateRange);
  
  // Rows per page
  document.getElementById("rowsSelect").addEventListener("change", function () {
    rowsPerPage = this.value === "All" ? filteredInvoices.length : parseInt(this.value);
    currentPage = 1;
    totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
    renderInvoiceTable();
    updatePaginationButtons();
  });
}

// Generate booking ID
function generateBookingId(type) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  let prefix = 'VT-BK';
  switch(type) {
    case 'Enterprise': prefix = 'VT-ENT'; break;
    case 'User': prefix = 'VT-USR'; break;
    default: prefix = 'VT-BK'; break;
  }
  
  const bookingId = `${prefix}-${year}${month}${day}-${random}`;
  document.getElementById("bookingId").value = bookingId;
}

// Open invoice modal
function openInvoiceModal(invoice = null) {
  editingInvoiceId = invoice ? invoice.id : null;
  
  if (invoice) {
    // Edit mode
    document.getElementById("invoiceModalTitle").textContent = "Edit Invoice";
    document.getElementById("invoiceId").value = invoice.id;
    document.getElementById("bookingId").value = invoice.bookingId;
    document.getElementById("bookingType").value = invoice.bookingType;
    document.getElementById("paymentDate").value = invoice.paymentDate;
    document.getElementById("customerName").value = invoice.customerName;
    document.getElementById("customerEmail").value = invoice.customerEmail;
    document.getElementById("customerContact").value = invoice.customerContact;
    document.getElementById("customerGst").value = invoice.customerGst || '';
    document.getElementById("billingAddress").value = invoice.billingAddress;
    document.getElementById("totalFee").value = invoice.totalFee;
    document.getElementById("gstAmount").value = invoice.gstAmount;
  } else {
    // Add mode
    document.getElementById("invoiceModalTitle").textContent = "Add New Invoice";
    document.getElementById("invoiceForm").reset();
    document.getElementById("invoiceId").value = '';
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("paymentDate").value = today;
  }
  
  $('#invoiceModal').modal('show');
}

// Validate field
function validateField(event) {
  const field = event.target;
  const value = field.value.trim();
  
  // Remove existing error styling
  field.classList.remove('is-invalid');
  const existingError = field.parentNode.querySelector('.invalid-feedback');
  if (existingError) {
    existingError.remove();
  }
  
  // Check if required field is empty
  if (field.hasAttribute('required') && !value) {
    showFieldError(field, 'This field is required');
    return false;
  }
  
  // Email validation
  if (field.type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showFieldError(field, 'Please enter a valid email address');
      return false;
    }
  }
  
  // Phone validation
  if (field.type === 'tel' && value) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(value)) {
      showFieldError(field, 'Please enter a valid phone number');
      return false;
    }
  }
  
  return true;
}

// Show field error
function showFieldError(field, message) {
  field.classList.add('is-invalid');
  const errorDiv = document.createElement('div');
  errorDiv.className = 'invalid-feedback';
  errorDiv.textContent = message;
  field.parentNode.appendChild(errorDiv);
}

// Clear field error
function clearFieldError(event) {
  const field = event.target;
  field.classList.remove('is-invalid');
  const existingError = field.parentNode.querySelector('.invalid-feedback');
  if (existingError) {
    existingError.remove();
  }
}

// Validate form
function validateForm() {
  const requiredFields = document.querySelectorAll("#invoiceForm input[required], #invoiceForm select[required], #invoiceForm textarea[required]");
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!validateField({ target: field })) {
      isValid = false;
    }
  });
  
  // Additional validation for amounts
  const totalFee = parseFloat(document.getElementById("totalFee").value) || 0;
  const gstAmount = parseFloat(document.getElementById("gstAmount").value) || 0;
  
  if (totalFee <= 0) {
    showFieldError(document.getElementById("totalFee"), 'Total fee must be greater than 0');
    isValid = false;
  }
  
  if (gstAmount < 0) {
    showFieldError(document.getElementById("gstAmount"), 'GST amount cannot be negative');
    isValid = false;
  }
  
  if (gstAmount > totalFee) {
    showFieldError(document.getElementById("gstAmount"), 'GST amount cannot be greater than total fee');
    isValid = false;
  }
  
  return isValid;
}

// Save invoice only (without PDF generation)
function saveInvoiceOnly() {
  if (!validateForm()) {
    return;
  }
  
  const formData = {
    id: editingInvoiceId || Date.now(), // Use timestamp as ID for new invoices
    bookingId: document.getElementById("bookingId").value,
    bookingType: document.getElementById("bookingType").value,
    paymentDate: document.getElementById("paymentDate").value,
    customerName: document.getElementById("customerName").value,
    customerEmail: document.getElementById("customerEmail").value,
    customerContact: document.getElementById("customerContact").value,
    customerGst: document.getElementById("customerGst").value,
    billingAddress: document.getElementById("billingAddress").value,
    totalFee: parseFloat(document.getElementById("totalFee").value),
    gstAmount: parseFloat(document.getElementById("gstAmount").value),
    netAmount: parseFloat(document.getElementById("totalFee").value) - parseFloat(document.getElementById("gstAmount").value),
    createdAt: new Date().toISOString()
  };
  
  if (editingInvoiceId) {
    // Update existing invoice
    const index = invoices.findIndex(inv => inv.id === editingInvoiceId);
    if (index !== -1) {
      invoices[index] = formData;
    }
  } else {
    // Add new invoice
    invoices.push(formData);
  }
  
  // Save to localStorage (in real app, this would be saved to backend)
  localStorage.setItem('invoices', JSON.stringify(invoices));
  
  // Close modal
  $('#invoiceModal').modal('hide');
  
  // Reapply current filter so new invoice appears if it matches
  if (currentFilterMode === 'date_range') {
    filterByDateRange();
  } else if (document.getElementById('searchBox').value.trim() !== '') {
    filterTable();
  } else {
    filteredInvoices = [...invoices];
    totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
    currentPage = 1;
    renderInvoiceTable();
    updatePaginationButtons();
    updateFilterStatus();
  }
  
  // Show success message
  showSuccessMessage(editingInvoiceId ? 'Invoice updated successfully!' : 'Invoice saved successfully!');
}

// Generate PDF only (for current form data)
function generatePdfOnly() {
  if (!validateForm()) {
    return;
  }
  
  const formData = {
    id: editingInvoiceId || Date.now(),
    bookingId: document.getElementById("bookingId").value,
    bookingType: document.getElementById("bookingType").value,
    paymentDate: document.getElementById("paymentDate").value,
    customerName: document.getElementById("customerName").value,
    customerEmail: document.getElementById("customerEmail").value,
    customerContact: document.getElementById("customerContact").value,
    customerGst: document.getElementById("customerGst").value,
    billingAddress: document.getElementById("billingAddress").value,
    totalFee: parseFloat(document.getElementById("totalFee").value),
    gstAmount: parseFloat(document.getElementById("gstAmount").value),
    netAmount: parseFloat(document.getElementById("totalFee").value) - parseFloat(document.getElementById("gstAmount").value),
    createdAt: new Date().toISOString()
  };
  
  // Generate PDF
  generateInvoicePDF(formData);
  
  // Show success message
  showSuccessMessage('PDF generated successfully!');
}

// Save invoice (legacy function - kept for compatibility)
function saveInvoice() {
  saveInvoiceOnly();
}

// Load invoices
function loadInvoices() {
  const savedInvoices = localStorage.getItem('invoices');
  if (savedInvoices) {
    invoices = JSON.parse(savedInvoices);
  }
  filteredInvoices = [...invoices];
  totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
  currentPage = 1;
  renderInvoiceTable();
  updatePaginationButtons();
}

// Filter table by search box
function filterTable() {
  const searchText = document.getElementById("searchBox").value.toLowerCase();
  filteredInvoices = invoices.filter(inv =>
    inv.bookingId.toLowerCase().includes(searchText) ||
    inv.customerName.toLowerCase().includes(searchText) ||
    inv.customerEmail.toLowerCase().includes(searchText)
  );
  totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
  currentPage = 1;
  renderInvoiceTable();
  updatePaginationButtons();
  updateFilterStatus();
}

// Filter by date range
function filterByDateRange() {
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  if (!fromDate || !toDate) {
    showFilterStatus('Please select both start and end dates', true);
    return;
  }
  filteredInvoices = invoices.filter(inv => {
    const payDate = inv.paymentDate || inv.createdAt;
    return payDate >= fromDate && payDate <= toDate;
  });
  currentFilterMode = 'date_range';
  currentDateRange = { start: fromDate, end: toDate };
  totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
  currentPage = 1;
  renderInvoiceTable();
  updatePaginationButtons();
  updateFilterStatus();
}

// Update filter status display
function updateFilterStatus() {
  const filterStatus = document.getElementById("filterStatus");
  if (currentFilterMode === 'date_range') {
    filterStatus.style.display = 'block';
    filterStatus.textContent = `Showing invoices from ${currentDateRange.start} to ${currentDateRange.end} (${filteredInvoices.length} found)`;
  } else {
    filterStatus.style.display = 'none';
  }
}

function showFilterStatus(message, isError) {
  const filterStatus = document.getElementById("filterStatus");
  filterStatus.style.display = 'block';
  filterStatus.className = isError ? 'alert alert-danger' : 'alert alert-info';
  filterStatus.textContent = message;
}

// Pagination controls
function updatePaginationButtons() {
  // You can add pagination buttons if needed, similar to tax_invoices.js
}

// Render invoice table (with pagination)
function renderInvoiceTable() {
  const tableBody = document.getElementById("invoiceTableBody");
  tableBody.innerHTML = "";
  if (filteredInvoices.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center" style="padding: 40px;">
          <i class="fa fa-file-text-o fa-3x" style="color: #ddd; margin-bottom: 15px;"></i>
          <h4>No Invoices Found</h4>
          <p class="text-muted">Click "Add New Invoice" to create your first invoice.</p>
        </td>
      </tr>
    `;
    return;
  }
  // Pagination logic
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = rowsPerPage === filteredInvoices.length ? filteredInvoices.length : startIdx + rowsPerPage;
  const pageData = filteredInvoices.slice(startIdx, endIdx);
  pageData.forEach((invoice) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${invoice.bookingId}</td>
      <td>${invoice.bookingType}</td>
      <td>${formatDate(invoice.paymentDate)}</td>
      <td>${invoice.customerName}</td>
      <td>${invoice.customerEmail}</td>
      <td>${invoice.customerContact}</td>
      <td>${formatCurrency(invoice.totalFee)}</td>
      <td>${formatCurrency(invoice.gstAmount)}</td>
      <td>${formatCurrency(invoice.netAmount)}</td>
      <td>
        <button class="btn btn-sm btn-info btn-action" onclick="editInvoice(${invoice.id})" title="Edit">
          <i class="fa fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-success btn-action" onclick="generateInvoicePDF(${JSON.stringify(invoice).replace(/"/g, '&quot;')})" title="Generate PDF">
          <i class="fa fa-file-pdf-o"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-action" onclick="deleteInvoice(${invoice.id})" title="Delete">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// Edit invoice
function editInvoice(invoiceId) {
  const invoice = invoices.find(inv => inv.id === invoiceId);
  if (invoice) {
    openInvoiceModal(invoice);
  }
}

// Delete invoice
function deleteInvoice(invoiceId) {
  if (confirm("Are you sure you want to delete this invoice?")) {
    invoices = invoices.filter(inv => inv.id !== invoiceId);
    localStorage.setItem('invoices', JSON.stringify(invoices));
    renderInvoiceTable();
    showSuccessMessage('Invoice deleted successfully!');
  }
}

// Generate PDF
function generateInvoicePDF(invoice) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  const invoiceHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${invoice.bookingId}</title>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 15px; 
          background: white;
          font-size: 11px;
        }
        @media print {
          body { 
            margin: 0; 
            padding: 10px;
          }
        }
        @page {
          margin: 0.5cm;
          size: A4;
        }
      </style>
    </head>
    <body>
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 20px; font-family: Arial, sans-serif; font-size: 11px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          <div>
            <img src="images/Verathailand_logo.png" alt="VeraThailandia Logo" style="max-height: 50px;">
          </div>
          <div style="text-align: right; font-size: 10px; line-height: 1.3; color: #333;">
            <strong style="font-size: 12px; color: #007bff;">VeraThailandia Travel Co., Ltd.</strong><br>
            <strong>Email:</strong> info@verathailandia.com<br>
            <strong>Contact:</strong> +66 123 456 789<br>
            <strong>Website:</strong> www.verathailandia.com
          </div>
        </div>
        
        <!-- Payment Summary Title -->
        <div style="text-align: center; font-size: 20px; font-weight: bold; color: #007bff; margin: 15px 0; text-transform: uppercase; letter-spacing: 1px;">
          Payment Summary
        </div>
        
        <!-- Booking Details -->
        <div style="margin-bottom: 20px; background: #f8f9fa; padding: 12px; border-radius: 5px;">
          <h4 style="color: #007bff; margin-bottom: 8px; border-bottom: 1px solid #007bff; padding-bottom: 2px; font-size: 12px;">Booking Details</h4>
          <div style="display: flex; justify-content: space-between;">
            <div style="flex: 1; margin-right: 10px;">
              <p style="margin: 3px 0; font-size: 11px;"><strong>Booking ID:</strong> ${invoice.bookingId}</p>
              <p style="margin: 3px 0; font-size: 11px;"><strong>Type:</strong> ${invoice.bookingType}</p>
            </div>
            <div style="flex: 1;">
              <p style="margin: 3px 0; font-size: 11px;"><strong>Payment Date:</strong> ${formatDate(invoice.paymentDate)}</p>
            </div>
          </div>
        </div>
        
        <!-- User Details -->
        <div style="margin-bottom: 20px;">
          <h4 style="color: #007bff; margin-bottom: 8px; border-bottom: 1px solid #007bff; padding-bottom: 2px; font-size: 12px;">User Details</h4>
          <div style="background: #fff; padding: 12px; border: 1px solid #e9ecef; border-radius: 5px; border-left: 3px solid #007bff;">
            <p style="margin: 3px 0; font-size: 12px;"><strong>${invoice.customerName}</strong></p>
            <p style="margin: 3px 0; font-size: 11px;"><strong>Email:</strong> ${invoice.customerEmail}</p>
            <p style="margin: 3px 0; font-size: 11px;"><strong>Contact:</strong> ${invoice.customerContact}</p>
            ${invoice.customerGst ? `<p style="margin: 3px 0; font-size: 11px;"><strong>GST Number:</strong> ${invoice.customerGst}</p>` : ''}
            <p style="margin: 3px 0; font-size: 11px;"><strong>Billing Address:</strong><br>${invoice.billingAddress.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
        
        <!-- Amount Details -->
        <div style="margin-bottom: 20px;">
          <h4 style="color: #007bff; margin-bottom: 8px; border-bottom: 1px solid #007bff; padding-bottom: 2px; font-size: 12px;">Amount Details</h4>
          <div style="max-width: 300px; margin-left: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #dee2e6; font-size: 11px;">Total Fee:</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 11px;">${formatCurrency(invoice.totalFee)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; border-bottom: 1px solid #dee2e6; font-size: 11px;">GST Amount (Included):</td>
                <td style="padding: 6px 0; border-bottom: 1px solid #dee2e6; text-align: right; font-size: 11px;">${formatCurrency(invoice.gstAmount)}</td>
              </tr>
              <tr style="background: #007bff; color: white;">
                <td style="padding: 8px; font-weight: bold; font-size: 12px;">Net Amount:</td>
                <td style="padding: 8px; text-align: right; font-weight: bold; font-size: 12px;">${formatCurrency(invoice.netAmount)}</td>
              </tr>
            </table>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #007bff; color: #666; font-size: 9px;">
          <p style="margin: 2px 0; font-weight: bold; color: #007bff;">Thank you for choosing VeraThailandia!</p>
          <p style="margin: 2px 0;">We appreciate your business and look forward to serving you again.</p>
          <p style="margin: 2px 0; font-size: 8px;">This is a computer-generated invoice and does not require a signature.</p>
          <p style="margin: 2px 0; font-size: 8px;">For any queries, please contact us at info@verathailandia.com or +66 123 456 789</p>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        }
        
        window.onafterprint = function() {
          setTimeout(function() {
            window.close();
          }, 1000);
        }
      </script>
    </body>
    </html>
  `;
  
  printWindow.document.write(invoiceHTML);
  printWindow.document.close();
}

// Format currency
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '฿0.00';
  return `฿${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format date
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
}

// Show success message
function showSuccessMessage(message) {
  let statusDiv = document.getElementById("statusMessage");
  if (!statusDiv) {
    statusDiv = document.createElement("div");
    statusDiv.id = "statusMessage";
    statusDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      padding: 15px 20px;
      border-radius: 8px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(statusDiv);
  }
  
  statusDiv.innerHTML = `<i class="fa fa-check-circle"></i> ${message}`;
  statusDiv.className = "alert alert-success";
  statusDiv.style.display = "block";
  
  setTimeout(() => {
    if (statusDiv) {
      statusDiv.style.display = "none";
    }
  }, 5000);
}