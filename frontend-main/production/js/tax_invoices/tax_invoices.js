document.addEventListener("DOMContentLoaded", function () {
  // Initialize the page
  initializePage();
  
  // Check if we have saved filters and should use them
  const savedFilterMode = localStorage.getItem('tax_invoices_filterMode');
  if (savedFilterMode === 'date_range') {
    // Use saved date range filters
    loadTaxInvoices(false);
  } else {
  // Load current month data by default
  loadTaxInvoices();
  }

  // Add event listeners
  document.getElementById("nextPage").addEventListener("click", nextPage);
  document.getElementById("prevPage").addEventListener("click", prevPage);
  document.getElementById("searchBox").addEventListener("keyup", filterTable);
  document.getElementById("filterByDateBtn").addEventListener("click", filterByDateRange);
  
  // Add event listener for changing the number of rows per page
  document.getElementById("rowsSelect").addEventListener("change", function () {
    rowsPerPage = this.value === "All" ? filteredTaxInvoicesData.length : parseInt(this.value);
    currentPage = 1; // Reset to first page
    totalPages = Math.ceil(filteredTaxInvoicesData.length / rowsPerPage);
    renderTable();
    updatePaginationButtons();
  });

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
});

let currentPage = 1;
let rowsPerPage = 25;
let totalPages = 1;
let taxInvoicesData = [];
let filteredTaxInvoicesData = [];
let currentFilterMode = 'current'; // 'current' or 'date_range'
let currentDateRange = { start: null, end: null };

// Initialize page with current date
function initializePage() {
  // Try to restore saved date filters for tax invoices page
  const savedFromDate = localStorage.getItem('tax_invoices_fromDate');
  const savedToDate = localStorage.getItem('tax_invoices_toDate');
  const savedFilterMode = localStorage.getItem('tax_invoices_filterMode');
  
  if (savedFromDate && savedToDate && savedFilterMode) {
    // Restore saved dates
    document.getElementById("fromDate").value = savedFromDate;
    document.getElementById("toDate").value = savedToDate;
    console.log('Restored saved tax invoices date filters:', savedFromDate, 'to', savedToDate);
  } else {
    // Set default dates (current month)
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  
  document.getElementById("fromDate").value = startDate;
  document.getElementById("toDate").value = endDate;
  }
}

// Save date filters to localStorage
function saveDateFilters() {
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  
  if (fromDate && toDate) {
    localStorage.setItem('tax_invoices_fromDate', fromDate);
    localStorage.setItem('tax_invoices_toDate', toDate);
    localStorage.setItem('tax_invoices_filterMode', currentFilterMode);
    console.log('Saved tax invoices date filters:', fromDate, 'to', toDate);
  }
}

// Load tax invoices from API (current month by default)
async function loadTaxInvoices(useCurrentMonth = true) {
  try {
    showLoadingState();
    
    const token = localStorage.getItem("token");
    
    // Debug: Check if token exists
    if (!token) {
      console.error('No authentication token found');
      alert("No authentication token found. Please log in again.");
      window.location.href = "login.html";
      return;
    }
    
    console.log('Token exists:', token ? 'Yes' : 'No');
    console.log('Token length:', token ? token.length : 0);
    
    let url;
    
    if (useCurrentMonth) {
      // Use the default current month endpoint
      url = `${Endpoint}/api/v1/tax-invoice`;
      currentFilterMode = 'current';
    } else {
      // Use date range endpoint
      const fromDate = document.getElementById("fromDate").value;
      const toDate = document.getElementById("toDate").value;
      
      if (!fromDate || !toDate) {
        showErrorMessage("Please select both start and end dates");
        hideLoadingState();
        return;
      }
      
      url = `${Endpoint}/api/v1/tax-invoice/date-range?start_date=${fromDate}&end_date=${toDate}`;
      currentFilterMode = 'date_range';
      currentDateRange = { start: fromDate, end: toDate };
    }

    console.log('Loading tax invoices from:', url);
    console.log('Request headers:', {
      'Authorization': `Bearer ${token.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Authentication failed - 401 Unauthorized');
        alert("Unauthorized. Please log in again.");
        localStorage.removeItem("token"); // Clear invalid token
        localStorage.removeItem("role");
        localStorage.removeItem("username");
        window.location.href = "login.html";
        return;
      } else if (response.status === 403) {
        console.error('Access forbidden - 403 Forbidden');
        showErrorMessage("You don't have permission to access tax invoices.");
        hideLoadingState();
        return;
      } else {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (e2) {
            // Use default message
          }
        }
        console.error('API Error:', errorMessage);
        throw new Error(errorMessage);
      }
    }

    const data = await response.json();
    console.log('Tax invoices data received:', data);
    
    // Handle new response structure with invoices array and metadata
    if (data && data.invoices) {
      taxInvoicesData = data.invoices;
      filteredTaxInvoicesData = [...data.invoices];
      
      // Show filter status
      updateFilterStatus(data.metadata);
      
      // Update pagination
      totalPages = Math.ceil(filteredTaxInvoicesData.length / rowsPerPage);
      currentPage = 1;
      
      renderTable();
      updatePaginationButtons();
      hideLoadingState();
      
    } else {
      // No data found
      taxInvoicesData = [];
      filteredTaxInvoicesData = [];
      totalPages = 1;
      currentPage = 1;
      
      renderTable();
      updatePaginationButtons();
      hideLoadingState();
      
      if (currentFilterMode === 'current') {
        showInfoMessage('No tax invoices found for the current month');
      } else {
        showInfoMessage('No tax invoices found for the selected date range');
      }
    }
    
  } catch (error) {
    console.error('Error loading tax invoices:', error);
    hideLoadingState();
    showErrorMessage(`Error loading tax invoices: ${error.message}`);
    
    // Reset data on error
    taxInvoicesData = [];
    filteredTaxInvoicesData = [];
    totalPages = 1;
    currentPage = 1;
    renderTable();
    updatePaginationButtons();
  }
}

// Filter by date range
function filterByDateRange() {
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  
  // Save the date filters
  saveDateFilters();
  
  // If both dates are not selected, fall back to current month
  if (!fromDate || !toDate) {
    showInfoMessage('No date range selected. Loading current month data...');
    setTimeout(() => {
      loadTaxInvoices(true); // Load current month data
    }, 1000);
    return;
  }
  
  // If dates are selected, use date range filtering
  loadTaxInvoices(false); // false means use date range filtering
}

// Update filter status display
function updateFilterStatus(metadata) {
  const statusDiv = document.getElementById("filterStatus");
  
  if (currentFilterMode === 'current' && metadata) {
    statusDiv.innerHTML = `<i class="fa fa-info-circle"></i> Showing ${metadata.total_count} tax invoices for ${metadata.month_name} ${metadata.year}`;
    statusDiv.style.display = "block";
  } else if (currentFilterMode === 'date_range' && currentDateRange.start && currentDateRange.end) {
    const count = filteredTaxInvoicesData.length;
    statusDiv.innerHTML = `<i class="fa fa-calendar"></i> Showing ${count} tax invoices from ${formatDateForDisplay(currentDateRange.start)} to ${formatDateForDisplay(currentDateRange.end)}`;
    statusDiv.style.display = "block";
  } else {
    statusDiv.style.display = "none";
  }
}

// Format date for display
function formatDateForDisplay(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB');
}

// Show info message
function showInfoMessage(message) {
  const statusDiv = document.getElementById("filterStatus");
  statusDiv.innerHTML = `<i class="fa fa-info-circle"></i> ${message}`;
  statusDiv.className = "alert alert-info";
  statusDiv.style.display = "block";
}

// Show error message
function showErrorMessage(message) {
  const statusDiv = document.getElementById("filterStatus");
  statusDiv.innerHTML = `<i class="fa fa-exclamation-triangle"></i> ${message}`;
  statusDiv.className = "alert alert-danger";
  statusDiv.style.display = "block";
}

// Show loading state
function showLoadingState() {
  const tableBody = document.getElementById("taxInvoiceTableBody");
  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center">
        <i class="fa fa-spinner fa-spin fa-2x"></i>
        <p>Loading tax invoices...</p>
      </td>
    </tr>
  `;
}

// Hide loading state
function hideLoadingState() {
  // Loading state will be replaced by renderTable()
}

// Render table with new data structure
function renderTable() {
  const tableBody = document.getElementById("taxInvoiceTableBody");
  tableBody.innerHTML = "";

  if (filteredTaxInvoicesData.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center" style="padding: 40px;">
          <i class="fa fa-file-text-o fa-3x" style="color: #ddd; margin-bottom: 15px;"></i>
          <h4>No Tax Invoices Found</h4>
          <p class="text-muted">No tax invoices match your current filter criteria.</p>
        </td>
      </tr>
    `;
    return;
  }

  // Calculate pagination
  const start = (currentPage - 1) * rowsPerPage;
  const end = Math.min(start + rowsPerPage, filteredTaxInvoicesData.length);
  const invoicesToShow = filteredTaxInvoicesData.slice(start, end);

  invoicesToShow.forEach((invoice) => {
    const row = document.createElement("tr");
    
    // Extract data from new structure
    const invoiceNumber = invoice.invoice_number || 'N/A';
    const tripId = invoice.trip_id || 'N/A';
    const agentName = invoice.trip?.agent?.name || 'Unknown Agent';
    const totalCost = invoice.total_cost || 0;
    const taxAmount = invoice.total_tax_price || 0;
    const finalAmount = invoice.final_cost || 0;
    const createdDate = invoice.created_at || invoice.trip?.created_at || new Date().toISOString();

    row.innerHTML = `
      <td>${invoiceNumber}</td>
      <td><a href="edit_booking.html?id=${tripId}" style="color: #007bff; text-decoration: none; font-weight: 500;" title="Edit Booking">#${tripId}</a></td>
      <td>${agentName}</td>
      <td>${formatCurrency(totalCost)}</td>
      <td>${formatCurrency(taxAmount)}</td>
      <td>${formatCurrency(finalAmount)}</td>
      <td>${formatDate(createdDate)}</td>
      <td>
        <button class="btn btn-sm btn-info view-btn me-1" data-id="${invoice.id}" title="View Details" style="margin-right: 5px;">
          <i class="fa fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-warning edit-btn me-1" data-id="${invoice.id}" title="Edit Invoice" style="margin-right: 5px;">
          <i class="fa fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-success pdf-btn me-1" data-id="${invoice.id}" title="Generate PDF" style="margin-right: 5px;">
          <i class="fa fa-file-pdf-o"></i>
        </button>
        <button class="btn btn-sm btn-danger delete-btn" data-id="${invoice.id}" title="Delete Invoice">
          <i class="fa fa-trash"></i>
        </button>
      </td>
    `;

    tableBody.appendChild(row);
  });

  // Add event listeners to action buttons
  addActionListeners();
}

// Add event listeners to action buttons
function addActionListeners() {
  // View buttons
  document.querySelectorAll(".view-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const invoiceId = this.getAttribute("data-id");
      viewTaxInvoiceDetails(invoiceId);
    });
  });

  // Edit buttons
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const invoiceId = this.getAttribute("data-id");
      window.location.href = `edit_invoices.html?id=${invoiceId}`;
    });
  });

  // PDF buttons
  document.querySelectorAll(".pdf-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const invoiceId = this.getAttribute("data-id");
      generatePDF(invoiceId);
    });
  });

  // Delete buttons
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      const invoiceId = this.getAttribute("data-id");
      if (confirm("Are you sure you want to delete this tax invoice?")) {
        deleteTaxInvoice(invoiceId);
      }
    });
  });
}

// View tax invoice details
function viewTaxInvoiceDetails(invoiceId) {
  const invoice = filteredTaxInvoicesData.find(inv => inv.id == invoiceId);
  if (!invoice) {
    alert("Invoice not found");
    return;
  }

  // Create a detailed view modal or navigate to details page
  let detailsHtml = `
    <div class="modal fade" id="invoiceDetailsModal" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Tax Invoice Details - ${invoice.invoice_number}</h5>
            <button type="button" class="close" data-dismiss="modal">&times;</button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-6">
                <h6>Invoice Information</h6>
                <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
                <p><strong>Trip ID:</strong> #${invoice.trip_id}</p>
                <p><strong>Created Date:</strong> ${formatDate(invoice.created_at)}</p>
              </div>
              <div class="col-md-6">
                <h6>Client & Agent Information</h6>
                <p><strong>Agent:</strong> ${invoice.trip?.agent?.name || 'N/A'}</p>
                <p><strong>Client:</strong> ${invoice.trip?.client_name || 'N/A'}</p>
                <p><strong>Client Email:</strong> ${invoice.trip?.client_email || 'N/A'}</p>
              </div>
            </div>
            <hr>
            <div class="row">
              <div class="col-md-12">
                <h6>Financial Summary</h6>
                <table class="table table-bordered">
                  <tr>
                    <td><strong>Total Cost:</strong></td>
                    <td>${formatCurrency(invoice.total_cost)}</td>
                  </tr>
                  <tr>
                    <td><strong>Tax Amount:</strong></td>
                    <td>${formatCurrency(invoice.total_tax_price)}</td>
                  </tr>
                  <tr class="table-info">
                    <td><strong>Final Amount:</strong></td>
                    <td><strong>${formatCurrency(invoice.final_cost)}</strong></td>
                  </tr>
                </table>
              </div>
            </div>
  `;

  // Add categories if available
  if (invoice.categories && invoice.categories.length > 0) {
    detailsHtml += `
      <hr>
      <div class="row">
        <div class="col-md-12">
          <h6>Categories Breakdown</h6>
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Category</th>
                <th>Total Cost</th>
                <th>VAT Amount</th>
                <th>Non-VAT Amount</th>
                <th>Tax Price</th>
              </tr>
            </thead>
            <tbody>
    `;
    
    invoice.categories.forEach(category => {
      detailsHtml += `
        <tr>
          <td>${category.category_name}</td>
          <td>${formatCurrency(category.total_cost)}</td>
          <td>${formatCurrency(category.vat_amount)}</td>
          <td>${formatCurrency(category.non_vat_amount)}</td>
          <td>${formatCurrency(category.tax_price)}</td>
        </tr>
      `;
    });
    
    detailsHtml += `
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  detailsHtml += `
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-success" onclick="generatePDF(${invoice.id})">
              <i class="fa fa-file-pdf-o"></i> Generate PDF
            </button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove any existing modal and add new one
  const existingModal = document.getElementById("invoiceDetailsModal");
  if (existingModal) {
    existingModal.remove();
  }
  
  document.body.insertAdjacentHTML('beforeend', detailsHtml);
  $('#invoiceDetailsModal').modal('show');
}

// Update pagination buttons
function updatePaginationButtons() {
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// Next page
function nextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    renderTable();
    updatePaginationButtons();
  }
}

// Previous page
function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderTable();
    updatePaginationButtons();
  }
}

// Delete tax invoice
async function deleteTaxInvoice(invoiceId) {
  try {
    const token = localStorage.getItem("token");
    
    const response = await fetch(`${Endpoint}/api/v1/tax-invoice/${invoiceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Unauthorized. Please log in again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Remove from local data
    taxInvoicesData = taxInvoicesData.filter(inv => inv.id != invoiceId);
    filteredTaxInvoicesData = filteredTaxInvoicesData.filter(inv => inv.id != invoiceId);
    
    // Update pagination
    totalPages = Math.ceil(filteredTaxInvoicesData.length / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }
    
    renderTable();
    updatePaginationButtons();
    
    showInfoMessage('Tax invoice deleted successfully');
    
  } catch (error) {
    console.error('Error deleting tax invoice:', error);
    showErrorMessage(`Error deleting tax invoice: ${error.message}`);
  }
}

// Generate PDF
async function generatePDF(invoiceId) {
  try {
    const token = localStorage.getItem("token");
    
    showInfoMessage('Generating PDF...');
    
    const response = await fetch(`${Endpoint}/api/v1/tax-invoice/${invoiceId}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        alert("Unauthorized. Please log in again.");
        window.location.href = "login.html";
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Handle PDF response
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Open PDF in new tab
    window.open(url, '_blank');
    
    // Clean up
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
    
    showInfoMessage('PDF generated successfully');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    showErrorMessage(`Error generating PDF: ${error.message}`);
  }
}

// Filter table by search term
function filterTable() {
  const searchTerm = document.getElementById("searchBox").value.toLowerCase().trim();
  
  if (searchTerm === "") {
    filteredTaxInvoicesData = [...taxInvoicesData];
  } else {
    filteredTaxInvoicesData = taxInvoicesData.filter((invoice) => {
      return (
        (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(searchTerm)) ||
        (invoice.trip_id && invoice.trip_id.toString().includes(searchTerm)) ||
        (invoice.trip?.agent?.name && invoice.trip.agent.name.toLowerCase().includes(searchTerm)) ||
        (invoice.trip?.client_name && invoice.trip.client_name.toLowerCase().includes(searchTerm))
      );
    });
  }
  
  // Reset to first page and update pagination
  currentPage = 1;
  totalPages = Math.ceil(filteredTaxInvoicesData.length / rowsPerPage);
  
  renderTable();
  updatePaginationButtons();
}

// Format currency for display
function formatCurrency(amount) {
  if (!amount && amount !== 0) return '฿0.00';
  return `฿${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB');
} 