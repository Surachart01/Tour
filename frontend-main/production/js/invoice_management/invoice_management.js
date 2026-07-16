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
  showSuccessMessage('PDF download started successfully!');
}

// Save invoice (legacy function - kept for compatibility)
function saveInvoice() {
  saveInvoiceOnly();
}

// Load confirmed bookings directly from the database.
async function loadInvoices() {
  const tableBody = document.getElementById("invoiceTableBody");
  tableBody.innerHTML = `
    <tr><td colspan="9" class="text-center" style="padding: 40px;">
      <i class="fa fa-spinner fa-spin"></i> Loading confirmed bookings...
    </td></tr>`;

  try {
    const response = await fetch(`${Endpoint}/api/v1/bookings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (!response.ok) throw new Error("Failed to load confirmed bookings");

    const bookings = await response.json();
    invoices = (Array.isArray(bookings) ? bookings : [])
      .filter((booking) => String(booking.status || "").toLowerCase() === "confirmed")
      .map((booking) => {
        const amount = Number(booking.final_amount || booking.final_cost || 0);
        return {
          id: booking.id,
          tripId: booking.id,
          bookingId: booking.booking_reference || booking.quotation_reference || String(booking.id),
          paymentDate: booking.created_at || booking.booking_date,
          customerName: booking.client_name || "-",
          customerEmail: booking.client_email || "",
          customerContact: booking.client_phone || "-",
          agentName: booking.agents?.name || booking.agent_name || "-",
          pax: (Number(booking.number_of_adults) || 0) + (Number(booking.number_of_kids) || 0),
          totalFee: amount,
          gstAmount: 0,
          netAmount: amount,
          billingAddress: "-",
          status: "Confirmed",
          isConfirmedBooking: true
        };
      });

    filteredInvoices = [...invoices];
    totalPages = Math.ceil(filteredInvoices.length / rowsPerPage);
    currentPage = 1;
    renderInvoiceTable();
    updatePaginationButtons();
  } catch (error) {
    console.error("Error loading proforma invoices:", error);
    tableBody.innerHTML = `
      <tr><td colspan="9" class="text-center text-danger" style="padding: 40px;">
        <i class="fa fa-exclamation-triangle"></i> ${error.message}
      </td></tr>`;
  }
}

// Filter table by search box
function filterTable() {
  const searchText = document.getElementById("searchBox").value.toLowerCase();
  filteredInvoices = invoices.filter(inv =>
    String(inv.bookingId || "").toLowerCase().includes(searchText) ||
    String(inv.customerName || "").toLowerCase().includes(searchText) ||
    String(inv.customerEmail || "").toLowerCase().includes(searchText) ||
    String(inv.agentName || "").toLowerCase().includes(searchText)
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
        <td colspan="9" class="text-center" style="padding: 40px;">
          <i class="fa fa-file-text-o fa-3x" style="color: #ddd; margin-bottom: 15px;"></i>
          <h4>No Confirmed Bookings Found</h4>
          <p class="text-muted">A proforma invoice appears after every required service and the booking are confirmed.</p>
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
      <td>${formatDate(invoice.paymentDate)}</td>
      <td>${invoice.customerName}</td>
      <td>${invoice.agentName || "-"}</td>
      <td>${invoice.customerContact}</td>
      <td>${invoice.pax || 0}</td>
      <td>${formatCurrency(invoice.totalFee)}</td>
      <td><span class="badge badge-success">CONFIRMED</span></td>
      <td>
        <button class="btn btn-sm btn-info btn-action" onclick="window.location.href='edit_booking.html?id=${invoice.tripId}'" title="View Booking">
          <i class="fa fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-success btn-action" onclick="generateInvoicePDF(${JSON.stringify(invoice).replace(/"/g, '&quot;')})" title="Generate PDF">
          <i class="fa fa-file-pdf-o"></i>
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

function escapeInvoiceHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function serviceDate(value) {
  return value ? formatDate(value) : '-';
}

function formatPax(value, fallbackInvoice) {
  const pax = Number(value || fallbackInvoice?.pax || 0);
  return pax > 0 ? pax : '-';
}

function asInvoiceNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstPositiveAmount(...values) {
  for (const value of values) {
    const parsed = asInvoiceNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function buildBookedServiceRows(invoice) {
  const rows = [];

  (invoice.hotels || invoice.hotel_trip_items || []).forEach((item) => {
    const hotelName = item.hotel_name || item.hotels?.name || item.name || 'Hotel';
    const dates = [serviceDate(item.from_date), serviceDate(item.to_date)].filter((date) => date !== '-').join(' - ') || '-';
    const roomInfo = item.room_type || item.room_types?.[0]?.room_type || item.hotel_room_type_items?.[0]?.room_type || '';
    const detailParts = [
      roomInfo,
      item.city,
      item.nights ? `${item.nights} night(s)` : ''
    ].filter(Boolean);
    rows.push({
      type: 'Hotel',
      date: dates,
      description: hotelName,
      details: detailParts.join(' | ') || '-',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(
        item.total_price,
        item.total_cost,
        item.final_cost,
        item.price,
        asInvoiceNumber(item.single_price) + asInvoiceNumber(item.double_price) + asInvoiceNumber(item.extra_bed_price)
      )
    });
  });

  (invoice.tours || invoice.tour_trip_items || []).forEach((item) => {
    const tourName = item.tour_name || item.tours?.name || item.name || 'Tour';
    const detailParts = [
      item.from_location || item.city,
      item.route,
      item.remarks
    ].filter(Boolean);
    rows.push({
      type: 'Tour',
      date: serviceDate(item.from_date || item.date),
      description: tourName,
      details: detailParts.join(' | ') || '-',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });
  });

  (invoice.transfers || invoice.transfer_trip_items || []).forEach((item) => {
    const transferName = item.transfer_description || item.transfers?.description || item.description || 'Transfer';
    const route = [item.from_location, item.to_location].filter(Boolean).join(' → ');
    const detailParts = [
      route,
      item.pickup_time ? `Pickup ${item.pickup_time}` : '',
      item.flight_number || item.flight_time || ''
    ].filter(Boolean);
    rows.push({
      type: 'Transfer',
      date: serviceDate(item.from_date || item.date),
      description: transferName,
      details: detailParts.join(' | ') || '-',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });
  });

  (invoice.excursions || invoice.excursion_trip_items || []).forEach((item) => {
    const excursionName = item.excursion_name || item.excursions?.name || item.name || 'Excursion';
    rows.push({
      type: 'Excursion',
      date: serviceDate(item.from_date || item.date),
      description: excursionName,
      details: item.city || item.remarks || '-',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });
  });

  (invoice.flights || invoice.flight_trip_items || []).forEach((item) => {
    const flightName = item.flight_number || item.route || 'Flight';
    rows.push({
      type: 'Flight',
      date: serviceDate(item.from_date || item.date),
      description: flightName,
      details: item.route || item.remarks || '-',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });
  });

  (invoice.others || invoice.other_trip_items || []).forEach((item) => {
    const otherName = item.other_name || item.others?.name || item.description || 'Other Service';
    rows.push({
      type: 'Other',
      date: serviceDate(item.from_date || item.date),
      description: otherName,
      details: item.remarks || item.notes || '-',
      pax: formatPax(item.pax || item.quantity, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });
  });

  const rowAmountTotal = rows.reduce((sum, row) => sum + asInvoiceNumber(row.amount), 0);
  const invoiceTotal = firstPositiveAmount(invoice.totalFee, invoice.final_amount, invoice.final_cost, invoice.total_amount, invoice.total_cost);
  if (rows.length && rowAmountTotal === 0 && invoiceTotal > 0) {
    const perRow = Math.floor((invoiceTotal / rows.length) * 100) / 100;
    rows.forEach((row, index) => {
      row.amount = index === rows.length - 1
        ? Math.round((invoiceTotal - perRow * (rows.length - 1)) * 100) / 100
        : perRow;
    });
  }

  return rows;
}

function renderBookedServicesTable(invoice, brandColor, brandLight) {
  const rows = buildBookedServiceRows(invoice);
  if (!rows.length) {
    return `
      <div style="margin-bottom: 20px;">
        <h4 style="color: ${brandColor}; margin-bottom: 8px; border-bottom: 1px solid ${brandColor}; padding-bottom: 2px; font-size: 12px;">Booked Services</h4>
        <div style="padding: 12px; border: 1px dashed ${brandColor}; background: ${brandLight}; border-radius: 5px; font-size: 11px; color: #555;">
          No service details were found for this booking.
        </div>
      </div>
    `;
  }

  const bodyRows = rows.map((item, index) => `
    <tr>
      <td style="padding: 7px; border-bottom: 1px solid #f1f1f1; text-align: center;">${index + 1}</td>
      <td style="padding: 7px; border-bottom: 1px solid #f1f1f1;">${escapeInvoiceHtml(item.type)}</td>
      <td style="padding: 7px; border-bottom: 1px solid #f1f1f1;">${escapeInvoiceHtml(item.date)}</td>
      <td style="padding: 7px; border-bottom: 1px solid #f1f1f1;">
        <strong>${escapeInvoiceHtml(item.description)}</strong><br>
        <span style="color: #666; font-size: 10px;">${escapeInvoiceHtml(item.details)}</span>
      </td>
      <td style="padding: 7px; border-bottom: 1px solid #f1f1f1; text-align: center;">${escapeInvoiceHtml(item.pax)}</td>
      <td style="padding: 7px; border-bottom: 1px solid #f1f1f1; text-align: right;">${formatCurrency(item.amount).replace('฿', 'THB ')}</td>
    </tr>
  `).join('');

  return `
    <div class="section">
      <h4>Booked Services</h4>
      <table class="services-table">
        <thead>
          <tr>
            <th class="col-no">#</th>
            <th class="col-type">Type</th>
            <th class="col-date">Date</th>
            <th class="col-detail">Booked Detail</th>
            <th class="col-pax">Pax</th>
            <th class="col-amount">Amount</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

async function getDetailedInvoiceForPrint(invoice) {
  if (!invoice?.tripId || invoice.hotels || invoice.hotel_trip_items) return invoice;

  try {
    const response = await fetch(`${Endpoint}/api/v1/bookings/${invoice.tripId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (!response.ok) throw new Error("Failed to load booking details");
    const booking = await response.json();
    return {
      ...invoice,
      ...booking,
      id: invoice.id,
      tripId: invoice.tripId,
      bookingId: invoice.bookingId,
      paymentDate: invoice.paymentDate,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerContact: invoice.customerContact,
      agentName: invoice.agentName,
      totalFee: invoice.totalFee,
      status: invoice.status
    };
  } catch (error) {
    console.error("Unable to load full booking details for invoice:", error);
    return invoice;
  }
}

function buildProformaPreviewHTML(invoice) {
  const brandColor = '#f47b20';
  const brandDark = '#c85f0f';
  const brandLight = '#fff4ec';
  const totalAmount = firstPositiveAmount(invoice.totalFee, invoice.final_amount, invoice.final_cost, invoice.total_amount, invoice.total_cost);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Proforma Invoice - ${escapeInvoiceHtml(invoice.bookingId)}</title>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #2f2f2f;
          color: #111;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
        }
        .toolbar {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          height: 54px;
          padding: 0 22px;
          background: #1f2933;
          color: #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.28);
        }
        .toolbar-title {
          font-weight: 700;
          font-size: 15px;
        }
        .toolbar-actions {
          display: flex;
          gap: 8px;
        }
        .toolbar button {
          border: 0;
          border-radius: 4px;
          padding: 9px 14px;
          font-weight: 700;
          color: #fff;
          background: ${brandColor};
          cursor: pointer;
        }
        .toolbar button.secondary {
          background: #4b5563;
        }
        .page-wrap {
          padding: 28px 16px;
        }
        .invoice-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 18mm 16mm;
          background: #fff;
          box-shadow: 0 4px 22px rgba(0,0,0,0.35);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid ${brandColor};
          padding-bottom: 12px;
        }
        .logo {
          max-height: 54px;
          max-width: 150px;
        }
        .company {
          text-align: right;
          line-height: 1.35;
          font-size: 11px;
        }
        .company strong {
          color: ${brandDark};
          font-size: 13px;
        }
        .title {
          margin: 18px 0 28px;
          text-align: center;
          color: ${brandColor};
          font-size: 23px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .section {
          margin-bottom: 20px;
        }
        .section h4 {
          margin: 0 0 8px;
          padding-bottom: 4px;
          border-bottom: 1.5px solid ${brandColor};
          color: ${brandColor};
          font-size: 13px;
          font-weight: 800;
        }
        .booking-box {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 11px 12px;
          background: ${brandLight};
          border-radius: 5px;
        }
        .booking-box p,
        .client-card p {
          margin: 3px 0;
        }
        .client-card {
          padding: 12px 14px;
          border: 1px solid #e5e7eb;
          border-left: 4px solid ${brandColor};
          border-radius: 5px;
        }
        .services-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          border: 1px solid #f0d6bf;
          font-size: 11px;
        }
        .services-table th {
          padding: 8px 7px;
          background: ${brandColor};
          color: #fff;
          text-align: left;
          font-weight: 800;
        }
        .services-table td {
          padding: 8px 7px !important;
          border-bottom: 1px solid #ececec !important;
          vertical-align: top;
          line-height: 1.35;
          overflow-wrap: anywhere;
          word-break: normal;
        }
        .services-table .col-no { width: 34px; text-align: center; }
        .services-table .col-type { width: 72px; }
        .services-table .col-date { width: 108px; }
        .services-table .col-detail { width: auto; }
        .services-table .col-pax { width: 46px; text-align: center; }
        .services-table .col-amount { width: 108px; text-align: right; }
        .amount-wrap {
          display: flex;
          justify-content: flex-end;
        }
        .amount-total {
          display: grid;
          grid-template-columns: auto auto;
          gap: 28px;
          min-width: 330px;
          padding: 12px 16px;
          border-radius: 6px;
          background: ${brandColor};
          color: #fff;
          font-size: 14px;
          font-weight: 800;
        }
        .footer {
          margin-top: 34px;
          padding-top: 16px;
          border-top: 1.5px solid ${brandColor};
          text-align: center;
          color: #666;
          font-size: 10px;
        }
        .footer strong {
          color: ${brandColor};
          font-size: 11px;
        }
        @page {
          size: A4;
          margin: 12mm;
        }
        @media print {
          body {
            background: #fff;
          }
          .toolbar {
            display: none;
          }
          .page-wrap {
            padding: 0;
          }
          .invoice-page {
            width: auto;
            min-height: auto;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          .services-table tr,
          .client-card,
          .booking-box,
          .amount-total {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <div class="toolbar-title">Proforma Preview - ${escapeInvoiceHtml(invoice.bookingId || invoice.tripId || '')}</div>
        <div class="toolbar-actions">
          <button onclick="window.print()">Print</button>
          <button class="secondary" onclick="window.close()">Close</button>
        </div>
      </div>
      <div class="page-wrap">
        <main class="invoice-page">
          <div class="header">
            <img class="logo" src="images/Verathailand_logo.png" alt="VeraThailandia Logo">
            <div class="company">
              <strong>VeraThailandia Travel Co., Ltd.</strong><br>
              <b>Email:</b> info@verathailandia.com<br>
              <b>Contact:</b> +66 123 456 789<br>
              <b>Website:</b> www.verathailandia.com
            </div>
          </div>

          <div class="title">Proforma Invoice</div>

          <section class="section">
            <h4>Booking Details</h4>
            <div class="booking-box">
              <div>
                <p><strong>Booking ID:</strong> ${escapeInvoiceHtml(invoice.bookingId || '-')}</p>
                <p><strong>Status:</strong> ${escapeInvoiceHtml(invoice.status || 'Confirmed')}</p>
              </div>
              <div>
                <p><strong>Payment Date:</strong> ${formatDate(invoice.paymentDate)}</p>
              </div>
            </div>
          </section>

          <section class="section">
            <h4>Client Details</h4>
            <div class="client-card">
              <p><strong>${escapeInvoiceHtml(invoice.customerName || '-')}</strong></p>
              <p><strong>Email:</strong> ${escapeInvoiceHtml(invoice.customerEmail || '-')}</p>
              <p><strong>Contact:</strong> ${escapeInvoiceHtml(invoice.customerContact || '-')}</p>
              ${invoice.agentName ? `<p><strong>Agent:</strong> ${escapeInvoiceHtml(invoice.agentName)}</p>` : ''}
              <p><strong>Billing Address:</strong><br>${escapeInvoiceHtml(invoice.billingAddress || '-').replace(/\n/g, '<br>')}</p>
            </div>
          </section>

          ${renderBookedServicesTable(invoice, brandColor, brandLight)}

          <section class="section">
            <h4>Amount Details</h4>
            <div class="amount-wrap">
              <div class="amount-total">
                <span>Total (Excluding Tax):</span>
                <span>${formatCurrency(totalAmount).replace('฿', 'THB ')}</span>
              </div>
            </div>
          </section>

          <div class="footer">
            <p><strong>Thank you for choosing VeraThailandia!</strong></p>
            <p>We appreciate your business and look forward to serving you again.</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>For any queries, please contact us at info@verathailandia.com or +66 123 456 789</p>
          </div>
        </main>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF preview
async function generateInvoicePDF(invoice) {
  const previewWindow = window.open('', '_blank', 'width=1100,height=800');
  if (!previewWindow) {
    alert('Please allow pop-ups to preview the Proforma Invoice.');
    return;
  }

  previewWindow.document.write(`
    <html>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        Loading booking details...
      </body>
    </html>
  `);
  previewWindow.document.close();

  try {
    const detailedInvoice = await getDetailedInvoiceForPrint(invoice);
    previewWindow.document.open();
    previewWindow.document.write(buildProformaPreviewHTML(detailedInvoice));
    previewWindow.document.close();
    showSuccessMessage('Proforma preview opened successfully!');
  } catch (error) {
    console.error('Error opening Proforma preview:', error);
    previewWindow.document.open();
    previewWindow.document.write(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 24px; color: #b91c1c;">
          ${escapeInvoiceHtml(error.message || 'Error opening Proforma preview')}
        </body>
      </html>
    `);
    previewWindow.document.close();
  }
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
  }).replace(/\//g, '-');
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
