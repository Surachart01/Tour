document.addEventListener("DOMContentLoaded", function () {
  initializePage();
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const username = localStorage.getItem("username") || "Guest";

  if (!token) {
    alert("You are not authorized. Please log in first.");
    window.location.href = "login.html";
    return;
  }

  document.getElementById("profileName").innerText = username;
  document.getElementById("navProfileName").innerText = username;

  // Hide Control Panel for non-admin users
  if (role !== "admin" && role !== "superadmin") {
    const controlPanelMenu = document.getElementById("controlPanelMenu");
    if (controlPanelMenu) {
      controlPanelMenu.style.display = "none";
    }
  }

  setupEventListeners();
  loadInvoices();
});

let invoices = [];
let filteredInvoices = [];
let currentPage = 1;
let rowsPerPage = 25;
let showAllRows = false;
let totalPages = 1;
let currentFilterMode = 'all';
let currentDateRange = { start: null, end: null };

function initializePage() {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  document.getElementById("fromDate").value = startDate;
  document.getElementById("toDate").value = endDate;
}

function setupEventListeners() {
  document.getElementById("searchBox").addEventListener("keyup", filterTable);
  document.getElementById("filterByDateBtn").addEventListener("click", filterByDateRange);
  document.getElementById("refreshInvoicesBtn").addEventListener("click", loadInvoices);
  document.getElementById("invoiceTableBody").addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-trip]");
    if (viewButton) {
      window.location.href = `edit_booking.html?id=${encodeURIComponent(viewButton.dataset.viewTrip)}`;
      return;
    }
    const previewButton = event.target.closest("[data-preview-trip]");
    if (previewButton) {
      const invoice = invoices.find((item) => String(item.tripId) === String(previewButton.dataset.previewTrip));
      if (invoice) generateInvoicePDF(invoice);
    }
  });
  document.getElementById("rowsSelect").addEventListener("change", function () {
    showAllRows = this.value === "All";
    if (!showAllRows) rowsPerPage = parseInt(this.value, 10) || 25;
    currentPage = 1;
    recalculatePagination();
    renderInvoiceTable();
    updatePaginationButtons();
  });
  document.getElementById("previousPageBtn").addEventListener("click", function () {
    if (currentPage <= 1) return;
    currentPage -= 1;
    renderInvoiceTable();
    updatePaginationButtons();
  });
  document.getElementById("nextPageBtn").addEventListener("click", function () {
    if (currentPage >= totalPages) return;
    currentPage += 1;
    renderInvoiceTable();
    updatePaginationButtons();
  });
}

// Load confirmed bookings directly from the database.
async function loadInvoices() {
  const tableBody = document.getElementById("invoiceTableBody");
  const refreshButton = document.getElementById("refreshInvoicesBtn");
  refreshButton.disabled = true;
  refreshButton.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading...';
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
          paymentDate: booking.booking_date || booking.created_at,
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

    applyInvoiceFilters();
    recalculatePagination();
    currentPage = 1;
    renderInvoiceTable();
    updatePaginationButtons();
    const directPreviewId = new URLSearchParams(window.location.search).get('preview');
    if (directPreviewId) {
      const directInvoice = invoices.find((item) => String(item.tripId) === String(directPreviewId));
      if (!directInvoice) throw new Error('This booking is not Confirmed or is no longer available for a Proforma Invoice.');
      await renderDirectProformaPreview(directInvoice);
    }
  } catch (error) {
    console.error("Error loading proforma invoices:", error);
    tableBody.innerHTML = `
      <tr><td colspan="9" class="text-center text-danger" style="padding: 40px;">
        <i class="fa fa-exclamation-triangle"></i> ${error.message}
      </td></tr>`;
  } finally {
    refreshButton.disabled = false;
    refreshButton.innerHTML = '<i class="fa fa-refresh"></i> Refresh';
  }
}

// Filter table by search box
function filterTable() {
  applyInvoiceFilters();
  recalculatePagination();
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
  if (fromDate > toDate) {
    showFilterStatus('Start date must be on or before the end date', true);
    return;
  }
  currentFilterMode = 'date_range';
  currentDateRange = { start: fromDate, end: toDate };
  applyInvoiceFilters();
  recalculatePagination();
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
    filterStatus.className = 'alert alert-info';
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

function applyInvoiceFilters() {
  const searchText = document.getElementById("searchBox").value.trim().toLowerCase();
  filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = [invoice.bookingId, invoice.customerName, invoice.customerEmail, invoice.agentName]
      .some((value) => String(value || "").toLowerCase().includes(searchText));
    if (!matchesSearch) return false;
    if (currentFilterMode !== 'date_range') return true;
    const bookingDate = String(invoice.bookingDate || invoice.paymentDate || invoice.createdAt || '').slice(0, 10);
    return bookingDate >= currentDateRange.start && bookingDate <= currentDateRange.end;
  });
}

function recalculatePagination() {
  const pageSize = showAllRows ? Math.max(filteredInvoices.length, 1) : rowsPerPage;
  totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  currentPage = Math.min(Math.max(currentPage, 1), totalPages);
}

// Pagination controls
function updatePaginationButtons() {
  const pagination = document.getElementById('invoicePagination');
  const previousButton = document.getElementById('previousPageBtn');
  const nextButton = document.getElementById('nextPageBtn');
  const indicator = document.getElementById('pageIndicator');
  const shouldShow = !showAllRows && filteredInvoices.length > rowsPerPage;

  pagination.style.display = shouldShow ? 'block' : 'none';
  previousButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;
  indicator.textContent = `Page ${currentPage} of ${totalPages}`;
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
          <p class="text-muted">A proforma invoice appears after all required services and the booking are confirmed.</p>
        </td>
      </tr>
    `;
    return;
  }
  // Pagination logic
  const pageSize = showAllRows ? Math.max(filteredInvoices.length, 1) : rowsPerPage;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = showAllRows ? filteredInvoices.length : startIdx + pageSize;
  const pageData = filteredInvoices.slice(startIdx, endIdx);
  pageData.forEach((invoice) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeInvoiceHtml(invoice.bookingId)}</td>
      <td>${formatDate(invoice.bookingDate)}</td>
      <td>${escapeInvoiceHtml(invoice.customerName)}</td>
      <td>${escapeInvoiceHtml(invoice.agentName || "-")}</td>
      <td>${escapeInvoiceHtml(invoice.customerContact)}</td>
      <td>${invoice.pax || 0}</td>
      <td>${formatCurrency(invoice.totalFee)}</td>
      <td><span class="badge badge-success">CONFIRMED</span></td>
      <td>
        <button class="btn btn-sm btn-info btn-action" data-view-trip="${escapeInvoiceHtml(invoice.tripId)}" title="View Booking" aria-label="View Booking">
          <i class="fa fa-eye"></i>
        </button>
        <button class="btn btn-sm btn-success btn-action" data-preview-trip="${escapeInvoiceHtml(invoice.tripId)}" title="Open Proforma Preview" aria-label="Open Proforma Preview">
          <i class="fa fa-file-pdf-o"></i>
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
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
    throw new Error('Unable to load the complete booking details. Please refresh and try again.');
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
          font-family: Tahoma, Arial, Helvetica, sans-serif;
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
              <div>Tel +66 2126 6914 | Email: info@verathailandia.com</div>
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

async function renderDirectProformaPreview(invoice) {
  const detailedInvoice = await getDetailedInvoiceForPrint(invoice);
  document.open();
  document.write(buildProformaPreviewHTML(detailedInvoice));
  document.close();
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
