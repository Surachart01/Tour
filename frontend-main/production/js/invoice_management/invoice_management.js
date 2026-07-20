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
        const billing = booking.proforma_billing || {};
        return {
          id: booking.id,
          tripId: booking.id,
          bookingId: booking.booking_reference || booking.quotation_reference || String(booking.id),
          invoiceNumber: booking.invoice_number || "",
          bookingDate: booking.booking_date || booking.created_at,
          paymentDate: booking.payment_date || booking.booking_date || booking.created_at,
          customerName: booking.client_name || "-",
          customerEmail: booking.client_email || "",
          customerContact: booking.client_phone || "-",
          agentName: booking.agents?.name || booking.agent_name || "-",
          billingName: billing.agent_name || booking.agents?.name || booking.agent_name || "",
          billingAddress: billing.address || booking.agents?.address || "",
          billingCity: billing.city || "",
          billingState: billing.state || "",
          billingPostalCode: billing.postal_code || "",
          billingCountry: billing.country || "",
          billingTaxId: billing.tax_id || "",
          pax: (Number(booking.number_of_adults) || 0) + (Number(booking.number_of_kids) || 0),
          totalFee: amount,
          gstAmount: 0,
          netAmount: amount,
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
  if (!value) return '-';
  const text = String(value).trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) return text;
  const formatted = formatDate(text);
  return formatted === 'Invalid Date' || formatted === 'N/A' ? '-' : formatted;
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
    const roomTypeItems = item.room_types || item.hotel_room_type_items || [];
    const roomInfo = item.room_type || [...new Set(roomTypeItems.map((room) => room.room_type).filter(Boolean))].join(', ');
    const roomPax = roomTypeItems.reduce(
      (sum, room) => sum + asInvoiceNumber(room.adults) + asInvoiceNumber(room.children),
      0
    );
    const detailParts = [
      roomInfo,
      item.city,
      item.nights ? `${item.nights} night(s)` : ''
    ].filter(Boolean);
    rows.push({
      section: 'Hotel',
      fromDate: serviceDate(item.from_date),
      toDate: serviceDate(item.to_date),
      description: hotelName,
      details: detailParts.join(' | ') || '-',
      city: item.city || '-',
      type: roomInfo || 'Hotel',
      nights: item.nights || '-',
      pax: formatPax(item.pax || item.number_of_adults || roomPax, invoice),
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
      section: 'Tour',
      fromDate: serviceDate(item.from_date || item.date),
      toDate: serviceDate(item.to_date),
      description: tourName,
      details: detailParts.join(' | ') || '-',
      city: item.from_location || item.city || '-',
      type: item.tot || 'Tour',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });

    (item.tour_hotels || []).forEach((hotel) => {
      rows.push({
        section: 'Tour',
        fromDate: serviceDate(hotel.check_in_date),
        toDate: serviceDate(hotel.check_out_date),
        description: hotel.hotel_name || 'Tour Accommodation',
        details: hotel.room_type || '-',
        city: hotel.city || '-',
        type: 'Hotel',
        pax: '-',
        amount: 0
      });
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
      section: 'Transfer',
      date: serviceDate(item.from_date || item.date),
      description: transferName,
      details: detailParts.join(' | ') || '-',
      city: item.city || '-',
      type: item.tot || item.type_of_transfer || item.transfer_type || 'Transfer',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });
  });

  (invoice.excursions || invoice.excursion_trip_items || []).forEach((item) => {
    const excursionName = item.excursion_name || item.excursions?.name || item.name || 'Excursion';
    rows.push({
      section: 'Excursion',
      date: serviceDate(item.from_date || item.date),
      description: excursionName,
      details: item.city || item.remarks || '-',
      city: item.city || '-',
      type: item.toe || item.tot || 'Excursion',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });
  });

  (invoice.flights || invoice.flight_trip_items || []).forEach((item) => {
    const flightName = item.flight_number || item.route || 'Flight';
    rows.push({
      section: 'Flight',
      date: serviceDate(item.from_date || item.date),
      description: flightName,
      details: item.route || item.remarks || '-',
      route: item.route || [item.from_location, item.to_location].filter(Boolean).join(' → ') || '-',
      etd: item.edt || item.etd || item.departure_time || '-',
      eta: item.eat || item.eta || item.arrival_time || '-',
      type: item.flight_type || 'Flight',
      pax: formatPax(item.pax || item.number_of_adults, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price)
    });
  });

  (invoice.others || invoice.other_trip_items || []).forEach((item) => {
    const otherName = item.other_name || item.others?.description || item.description || 'Other Service';
    const otherAmount = item.others?.amount || item.amount;
    rows.push({
      section: 'Other',
      date: serviceDate(item.from_date || item.date),
      description: otherName,
      details: item.remarks || item.notes || '-',
      type: item.type || 'Other',
      pax: formatPax(item.pax || item.quantity, invoice),
      amount: firstPositiveAmount(item.total_price, item.total_cost, item.final_cost, item.price, otherAmount)
    });
  });

  const specialPackage = invoice.special_packages || invoice.special_package;
  if (invoice.special_package_id && specialPackage) {
    // Package child services are inclusions. Their stored prices must not be added again.
    rows.forEach((row) => { row.amount = 0; });
    const packageAssistanceFee = invoice.include_assistance_fee === false
      ? 0
      : asInvoiceNumber(invoice.assistance_fee_amount);
    const packageBaseAmount = Math.max(
      0,
      firstPositiveAmount(invoice.total_amount, invoice.total_cost, invoice.final_amount, invoice.final_cost) - packageAssistanceFee
    );
    const packagePax = Number(invoice.pax) ||
      ((Number(invoice.number_of_adults) || 0) + (Number(invoice.number_of_kids) || 0));
    rows.push({
      section: 'Special Package',
      fromDate: serviceDate(invoice.trip_start_date || invoice.start_date),
      toDate: specialPackage.duration ? `${specialPackage.duration} day(s)` : '-',
      description: specialPackage.name || 'Special Package',
      details: specialPackage.description || specialPackage.inclusions || '-',
      city: specialPackage.city || '-',
      type: specialPackage.category || 'Package',
      pax: packagePax || '-',
      amount: packageBaseAmount
    });
  }

  rows.forEach((row) => {
    const pax = asInvoiceNumber(row.pax);
    row.unitAmount = row.amount > 0 && pax > 0 ? row.amount / pax : 0;
  });

  return rows;
}

function renderInvoiceAmount(value) {
  const amount = asInvoiceNumber(value);
  return amount > 0 ? amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
}

function renderServiceDetail(item) {
  const details = item.details && item.details !== '-'
    ? `<br><span class="service-row-note">${escapeInvoiceHtml(item.details)}</span>`
    : '';
  return `<strong>${escapeInvoiceHtml(item.description || '-')}</strong>${details}`;
}

function renderServiceCell(item, key) {
  if (key === 'description') return renderServiceDetail(item);
  if (key === 'unitAmount' || key === 'amount') return renderInvoiceAmount(item[key]);
  return escapeInvoiceHtml(item[key] ?? '-');
}

function renderBookedServicesTables(rows, brandColor, brandLight) {
  if (!rows.length) {
    return `
      <div style="margin-bottom: 20px;">
        <h4 style="color: ${brandColor}; margin-bottom: 8px; border-bottom: 1px solid ${brandColor}; padding-bottom: 2px; font-size: 12px;">Descriptions of Service</h4>
        <div style="padding: 12px; border: 1px dashed ${brandColor}; background: ${brandLight}; border-radius: 5px; font-size: 11px; color: #555;">
          No service details were found for this booking.
        </div>
      </div>
    `;
  }

  const sectionConfigs = [
    { key: 'Flight', title: 'FLIGHTS', columns: [['Date', 'date'], ['Flight', 'description'], ['Route', 'route'], ['ETD', 'etd'], ['ETA', 'eta'], ['Pax', 'pax'], ['Net Price (THB)', 'unitAmount'], ['Total Price (THB)', 'amount']] },
    { key: 'Transfer', title: 'TRANSFERS', columns: [['Date', 'date'], ['City', 'city'], ['Description', 'description'], ['Type', 'type'], ['Pax', 'pax'], ['Net Price (THB)', 'unitAmount'], ['Total Price (THB)', 'amount']] },
    { key: 'Hotel', title: 'HOTELS', columns: [['Check In', 'fromDate'], ['Check Out', 'toDate'], ['City', 'city'], ['Hotel / Room Type', 'description'], ['Nights', 'nights'], ['Pax', 'pax'], ['Net Price (THB)', 'unitAmount'], ['Total Price (THB)', 'amount']] },
    { key: 'Excursion', title: 'EXCURSIONS', columns: [['Date', 'date'], ['City', 'city'], ['Description', 'description'], ['Type', 'type'], ['Pax', 'pax'], ['Net Price (THB)', 'unitAmount'], ['Total Price (THB)', 'amount']] },
    { key: 'Tour', title: 'TOURS', columns: [['From', 'fromDate'], ['To', 'toDate'], ['City', 'city'], ['Name / Hotel', 'description'], ['Type', 'type'], ['Pax', 'pax'], ['Net Price (THB)', 'unitAmount'], ['Total Price (THB)', 'amount']] },
    { key: 'Special Package', title: 'SPECIAL PACKAGES', columns: [['From', 'fromDate'], ['Duration', 'toDate'], ['City', 'city'], ['Package', 'description'], ['Type', 'type'], ['Pax', 'pax'], ['Net Price (THB)', 'unitAmount'], ['Total Price (THB)', 'amount']] },
    { key: 'Other', title: 'OTHER SERVICES', columns: [['Date', 'date'], ['Description', 'description'], ['Type', 'type'], ['Pax', 'pax'], ['Net Price (THB)', 'unitAmount'], ['Total Price (THB)', 'amount']] }
  ];

  const tables = sectionConfigs.map((config) => {
    const sectionRows = rows.filter((row) => row.section === config.key);
    if (!sectionRows.length) return '';

    const subtotal = sectionRows.reduce((sum, row) => sum + asInvoiceNumber(row.amount), 0);
    const headers = config.columns.map(([label]) => `<th>${escapeInvoiceHtml(label)}</th>`).join('');
    const body = sectionRows.map((item) => `
      <tr>${config.columns.map(([, key]) => `<td class="service-cell-${key}">${renderServiceCell(item, key)}</td>`).join('')}</tr>
    `).join('');

    return `
      <section class="service-section">
        <div class="service-section-title">${config.title}</div>
        <table class="services-table">
          <thead><tr>${headers}</tr></thead>
          <tbody>
            ${body}
            <tr class="service-subtotal-row">
              <td colspan="${config.columns.length - 1}">Subtotal ${config.title}</td>
              <td>${renderInvoiceAmount(subtotal)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    `;
  }).join('');

  return `
    <div class="services-wrap">
      <h4 class="services-heading">Descriptions of Service</h4>
      ${tables}
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
    const token = localStorage.getItem("token");
    const tourItems = booking.tours || booking.tour_trip_items || [];
    const toursWithHotels = await Promise.all(tourItems.map(async (tour) => {
      if (!tour?.id) return tour;
      try {
        const hotelResponse = await fetch(`${Endpoint}/api/v1/trips/${booking.id}/tour-items/${tour.id}/hotels`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!hotelResponse.ok) return tour;
        const hotelData = await hotelResponse.json();
        return { ...tour, tour_hotels: hotelData.hotels || [] };
      } catch (error) {
        console.warn(`Unable to load tour accommodation for item ${tour.id}:`, error);
        return tour;
      }
    }));
    const billing = booking.proforma_billing || invoice.proforma_billing || {};
    const amount = firstPositiveAmount(
      booking.final_amount,
      booking.final_cost,
      booking.total_amount,
      booking.total_cost,
      invoice.totalFee
    );
    return {
      ...invoice,
      ...booking,
      tours: toursWithHotels,
      id: invoice.id,
      tripId: invoice.tripId,
      bookingId: booking.booking_reference || booking.quotation_reference || invoice.bookingId,
      invoiceNumber: booking.invoice_number || invoice.invoiceNumber || "",
      bookingDate: booking.booking_date || booking.created_at || invoice.bookingDate,
      paymentDate: booking.payment_date || booking.booking_date || booking.created_at || invoice.paymentDate,
      customerName: booking.client_name || invoice.customerName,
      customerEmail: booking.client_email || invoice.customerEmail,
      customerContact: booking.client_phone || invoice.customerContact,
      agentName: booking.agents?.name || booking.agent_name || invoice.agentName,
      billingName: billing.agent_name || booking.agents?.name || booking.agent_name || invoice.billingName,
      billingAddress: billing.address || booking.agents?.address || invoice.billingAddress,
      billingCity: billing.city || invoice.billingCity,
      billingState: billing.state || invoice.billingState,
      billingPostalCode: billing.postal_code || invoice.billingPostalCode,
      billingCountry: billing.country || invoice.billingCountry,
      billingTaxId: billing.tax_id || invoice.billingTaxId,
      pax: (Number(booking.number_of_adults) || 0) + (Number(booking.number_of_kids) || 0) || invoice.pax,
      totalFee: amount,
      netAmount: amount,
      status: booking.status || invoice.status,
      proforma_billing: billing
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
  const bookedServiceRows = buildBookedServiceRows(invoice);
  const calculatedServicesTotal = bookedServiceRows.reduce((sum, row) => sum + asInvoiceNumber(row.amount), 0);
  const assistanceFee = invoice.include_assistance_fee === false
    ? 0
    : asInvoiceNumber(invoice.assistance_fee_amount);
  const discountAmount = asInvoiceNumber(invoice.discount_amount || invoice.discount);
  const calculatedNetTotal = Math.max(0, calculatedServicesTotal + assistanceFee - discountAmount);
  const totalAmount = firstPositiveAmount(
    invoice.totalFee,
    invoice.final_amount,
    invoice.final_cost,
    invoice.total_amount,
    invoice.total_cost,
    calculatedNetTotal,
    calculatedServicesTotal
  );
  const billing = invoice.proforma_billing || {};
  const billedName = invoice.billingName || billing.agent_name || invoice.agentName || '';
  const billedAddress = invoice.billingAddress || billing.address || '';
  const billedLocation = [
    invoice.billingPostalCode || billing.postal_code,
    invoice.billingCity || billing.city,
    invoice.billingState || billing.state,
    invoice.billingCountry || billing.country
  ].filter(Boolean).join(' - ');
  const billedTaxId = invoice.billingTaxId || billing.tax_id || '';
  const passengerDate = invoice.bookingDate || invoice.booking_date || invoice.created_at || invoice.paymentDate;
  const passengerInvoiceNumber = invoice.invoiceNumber || invoice.invoice_number || '-';
  const passengerFileNumber = invoice.bookingId || invoice.booking_reference || '-';
  const passengerCount = Number(invoice.pax) ||
    ((Number(invoice.number_of_adults) || 0) + (Number(invoice.number_of_kids) || 0));
  const paymentDeadline = serviceDate(invoice.payment_deadline);
  const cancellationDeadline = serviceDate(invoice.cancellation_deadline);

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
          display: flex;
          flex-direction: column;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 18mm 16mm;
          background: #fff;
          box-shadow: 0 4px 22px rgba(0,0,0,0.35);
        }
        .company-header {
          display: grid;
          grid-template-columns: 26% 74%;
          width: 100%;
          min-height: 31mm;
          border: 1px solid #222;
          border-bottom: 2px solid ${brandColor};
          background: #fff;
          font-family: Tahoma, Arial, sans-serif;
        }
        .company-logo-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-right: 1px solid #222;
        }
        .company-logo-cell img {
          display: block;
          width: 100%;
          max-width: 155px;
          max-height: 72px;
          object-fit: contain;
        }
        .company-details {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 7px 12px;
          color: #111;
          font-size: 11px;
          line-height: 1.38;
          letter-spacing: 0;
        }
        .company-details .company-name {
          margin-bottom: 2px;
          font-size: 12px;
          font-weight: 700;
        }
        .billing-payment-row {
          display: grid;
          grid-template-columns: minmax(0, 43fr) minmax(0, 57fr);
          gap: 10px;
          margin-top: 12px;
          align-items: stretch;
        }
        .billed-to,
        .bank-details {
          border: 1px solid #222;
          background: #fff;
          font-family: Tahoma, Arial, sans-serif;
        }
        .billed-to-title,
        .bank-details-title {
          padding: 5px 10px;
          background: #111;
          color: #fff;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0;
        }
        .billed-to-body,
        .bank-details-body {
          min-height: 27mm;
          padding: 7px 12px;
          font-size: 11px;
          line-height: 1.45;
        }
        .billed-to-body strong {
          display: inline-block;
          min-width: 76px;
        }
        .bank-details-body strong {
          font-weight: 700;
        }
        .title {
          margin: 0;
          padding: 5px 10px;
          border: 1px solid #222;
          border-top: 0;
          background: #ffc20e;
          text-align: center;
          color: #111;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0;
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
        .passenger-section {
          margin: 14px 0 20px;
          font-family: Tahoma, Arial, sans-serif;
        }
        .passenger-title {
          padding: 4px 10px;
          border: 1px solid #222;
          border-bottom: 0;
          background: #111;
          color: #fff;
          text-align: center;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 15px;
          font-weight: 700;
        }
        .passenger-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          font-size: 11px;
        }
        .passenger-table td {
          height: 25px;
          padding: 5px 8px;
          border: 1px solid #222;
          vertical-align: middle;
          overflow-wrap: anywhere;
        }
        .passenger-table .passenger-label {
          width: 16%;
          background: #f3f3f3;
          font-weight: 700;
        }
        .passenger-table .passenger-value-short {
          width: 17%;
        }
        .services-wrap {
          margin: 16px 0 20px;
        }
        .services-heading {
          margin: 0 0 10px;
          color: #111;
          font-size: 14px;
          font-weight: 700;
        }
        .service-section {
          margin: 0 0 13px;
        }
        .service-section-title {
          padding: 4px 9px;
          border: 1px solid #222;
          border-bottom: 0;
          background: #111;
          color: #fff;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 12px;
          font-weight: 700;
          break-after: avoid;
          page-break-after: avoid;
        }
        .services-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          border: 1px solid #333;
          font-size: 9px;
        }
        .services-table th {
          padding: 5px 4px;
          border: 1px solid #333;
          background: #f1f1f1;
          color: #111;
          text-align: left;
          font-weight: 700;
          vertical-align: middle;
        }
        .services-table td {
          padding: 5px 4px !important;
          border: 1px solid #555 !important;
          vertical-align: middle;
          line-height: 1.25;
          overflow-wrap: anywhere;
          word-break: normal;
        }
        .service-row-note {
          color: #555;
          font-size: 8px;
        }
        .service-cell-pax {
          text-align: center;
        }
        .service-cell-unitAmount,
        .service-cell-amount {
          text-align: right;
          white-space: nowrap;
        }
        .service-subtotal-row td {
          background: #f7f7f7;
          font-weight: 700;
          text-align: right;
        }
        .amount-wrap {
          display: flex;
          justify-content: flex-end;
        }
        .amount-total {
          min-width: 330px;
          padding: 9px 14px;
          border-radius: 6px;
          background: ${brandColor};
          color: #fff;
        }
        .amount-summary-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 28px;
          padding: 4px 0;
          font-size: 11px;
          font-weight: 600;
        }
        .amount-summary-row.net-total {
          margin-top: 4px;
          padding-top: 7px;
          border-top: 1px solid rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 800;
        }
        .document-end {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 42mm;
          margin-top: auto;
          padding-top: 20px;
          break-inside: avoid;
          page-break-inside: avoid;
          font-family: Tahoma, Arial, sans-serif;
        }
        .payment-policy {
          color: #111;
          font-size: 9px;
          line-height: 1.35;
        }
        .payment-policy-title {
          margin-bottom: 2px;
          font-weight: 700;
          text-decoration: underline;
        }
        .payment-policy p {
          margin: 0;
        }
        .document-company-footer {
          text-align: center;
          color: #111;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 8px;
          line-height: 1.25;
        }
        .document-company-footer strong {
          display: block;
          font-size: 9px;
          text-decoration: underline;
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
            display: flex;
            flex-direction: column;
            width: auto;
            min-height: auto;
            margin: 0;
            padding: 0;
            box-shadow: none;
          }
          .services-table tr,
          .billing-payment-row,
          .passenger-section,
          .client-card,
          .booking-box,
          .amount-total {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .services-table thead {
            display: table-header-group;
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
          <div class="invoice-content">
          <div class="company-header">
            <div class="company-logo-cell">
              <img src="images/Verathailand_logo.png" alt="VeraThailandia Co., Ltd.">
            </div>
            <div class="company-details">
              <div class="company-name">บริษัท เวร่าไทยแลนด์เดีย จำกัด | Verathailandia Co., Ltd.</div>
              <div>160/424-425 อาคารไอทีเอฟ สีลมพาเลซ ชั้น 20 | 160/424-425, ITF Silom Palace, 20th Floor</div>
              <div>ถนน สีลม แขวงสุริยวงศ์ เขต บางรัก | Silom Road, Suriya Wong, Bangrak</div>
              <div>กรุงเทพฯ 10500 ประเทศไทย | Bangkok 10500 - Thailand</div>
              <div>ทะเบียนเลขที่ | Tax ID 0105547045569</div>
              <div>ใบอนุญาตประกอบธุรกิจนำเที่ยวเลขที่ | TAT License number 14/03484</div>
            </div>
          </div>

          <div class="title">Proforma Invoice</div>

          <div class="billing-payment-row">
            <div class="billed-to">
              <div class="billed-to-title">BILLED TO</div>
              <div class="billed-to-body">
                <div><strong>Agent Name:</strong> ${escapeInvoiceHtml(billedName)}</div>
                <div><strong>Address:</strong> ${escapeInvoiceHtml(billedAddress)}</div>
                <div><strong>City/Country:</strong> ${escapeInvoiceHtml(billedLocation)}</div>
                <div><strong>Tax ID:</strong> ${escapeInvoiceHtml(billedTaxId)}</div>
              </div>
            </div>
            <div class="bank-details">
              <div class="bank-details-title">PAYMENT / BANK ACCOUNT</div>
              <div class="bank-details-body">
                <div><strong>VERATHAILANDIA Co., Ltd.</strong></div>
                <div><strong>Bank Name:</strong> SIAM COMMERCIAL BANK</div>
                <div><strong>Address:</strong> 4th Fl. Silom Complex, 191 Silom Road, Bang Rak City, 10500, Bangkok Thailand</div>
                <div><strong>Account Number:</strong> 419-200606-3 | <strong>Swift Code:</strong> SICOTHBK</div>
              </div>
            </div>
          </div>

          <section class="passenger-section">
            <div class="passenger-title">PASSENGER INFORMATIONS</div>
            <table class="passenger-table">
              <tbody>
                <tr>
                  <td class="passenger-label">Date:</td>
                  <td class="passenger-value-short">${formatDate(passengerDate)}</td>
                  <td class="passenger-label">Invoice Nr:</td>
                  <td class="passenger-value-short">${escapeInvoiceHtml(passengerInvoiceNumber)}</td>
                  <td class="passenger-label">File Nr:</td>
                  <td class="passenger-value-short">${escapeInvoiceHtml(passengerFileNumber)}</td>
                </tr>
                <tr>
                  <td class="passenger-label">Client Name(s):</td>
                  <td colspan="5">${escapeInvoiceHtml(invoice.customerName || invoice.client_name || '-')}</td>
                </tr>
                <tr>
                  <td class="passenger-label">Nr. of Clients</td>
                  <td colspan="5">${escapeInvoiceHtml(passengerCount || '-')}</td>
                </tr>
              </tbody>
            </table>
          </section>

          ${renderBookedServicesTables(bookedServiceRows, brandColor, brandLight)}

          <section class="section">
            <h4>Amount Details</h4>
            <div class="amount-wrap">
              <div class="amount-total">
                <div class="amount-summary-row">
                  <span>Services Subtotal:</span>
                  <span>THB ${renderInvoiceAmount(calculatedServicesTotal)}</span>
                </div>
                ${assistanceFee > 0 ? `
                  <div class="amount-summary-row">
                    <span>Assistance Fee:</span>
                    <span>THB ${renderInvoiceAmount(assistanceFee)}</span>
                  </div>
                ` : ''}
                ${discountAmount > 0 ? `
                  <div class="amount-summary-row">
                    <span>Discount:</span>
                    <span>- THB ${renderInvoiceAmount(discountAmount)}</span>
                  </div>
                ` : ''}
                <div class="amount-summary-row net-total">
                  <span>Total:</span>
                  <span>${formatCurrency(totalAmount).replace('฿', 'THB ')}</span>
                </div>
              </div>
            </div>
          </section>
          </div>

          <div class="document-end">
            <section class="payment-policy">
              <div class="payment-policy-title">Payment &amp; Cancellation Policy</div>
              <p>- Cancellation Deadline: ${escapeInvoiceHtml(cancellationDeadline)}</p>
              <p>- Payment Deadline: ${escapeInvoiceHtml(paymentDeadline)}</p>
              <p>- Please ensure that the payment is made before the deadline to confirm the booking.</p>
              <p>- Cancellations made after the deadline will be subject to applicable charges.</p>
            </section>

            <div class="document-company-footer">
              <strong>VeraThailandia Co., Ltd.</strong>
              20th Floor, Room 160/424-425, ITF Silom Palace, 160 Silom Road, Suriya Wong, Bangrak, Bangkok 10500, Thailand
            </div>
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
