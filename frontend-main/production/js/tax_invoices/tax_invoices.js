let paidBookings = [];
const ORIGINAL_DOCUMENT_TYPE = 'original_tax_invoice';
const canManageInvoices = ['admin', 'superadmin'].includes(String(localStorage.getItem('role') || '').toLowerCase());

const DOCUMENTS = [
  { type: 'original_tax_invoice', label: 'Original Tax Invoice', icon: 'fa-globe', className: 'btn-info' },
  { type: 'tax_invoice', label: 'Tax Invoice', icon: 'fa-file-text-o', className: 'btn-primary' },
  { type: 'original_receipt_transportation', label: 'Receipt: Transport', icon: 'fa-bus', className: 'btn-warning' },
  { type: 'tax_invoice_hotel', label: 'Tax Invoice: Hotel', icon: 'fa-building', className: 'btn-success' }
];

document.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('token')) {
    window.location.href = 'login.html';
    return;
  }
  document.getElementById('searchBox').addEventListener('input', renderBookings);
  document.getElementById('refreshButton').addEventListener('click', loadBookings);
  loadBookings();
});

async function loadBookings() {
  const body = document.getElementById('taxInvoiceTableBody');
  body.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:40px"><i class="fa fa-spinner fa-spin"></i> Loading paid bookings...</td></tr>';
  try {
    const response = await fetch(`${Endpoint}/api/v1/tax-invoice/eligible-bookings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Failed to load paid bookings.');
    const data = await response.json();
    paidBookings = data.bookings || [];
    renderBookings();
  } catch (error) {
    body.innerHTML = `<tr><td colspan="9" class="text-center text-danger" style="padding:40px"><i class="fa fa-exclamation-triangle"></i> ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderBookings() {
  const body = document.getElementById('taxInvoiceTableBody');
  const term = document.getElementById('searchBox').value.trim().toLowerCase();
  const rows = paidBookings.filter((booking) => [
    booking.file_reference, booking.booking_reference, booking.client_name,
    booking.agents?.name, booking.invoice_number
  ].some((value) => String(value || '').toLowerCase().includes(term)));
  document.getElementById('bookingCount').textContent = `${rows.length} paid booking${rows.length === 1 ? '' : 's'}`;
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9"><div class="empty-state"><i class="fa fa-file-text-o"></i><strong>No paid bookings found</strong><div>Tax documents become available after a booking is confirmed and payment is fully received.</div></div></td></tr>';
    return;
  }
  body.innerHTML = rows.map((booking) => {
    const documents = booking.tax_documents || [];
    const originalSaved = documents.some((document) => document.document_type === ORIGINAL_DOCUMENT_TYPE);
    const availableDocuments = canManageInvoices ? DOCUMENTS : DOCUMENTS.filter((document) => document.type === ORIGINAL_DOCUMENT_TYPE);
    const actions = availableDocuments.map((document) => {
      const locked = !canManageInvoices
        ? !originalSaved
        : document.type !== ORIGINAL_DOCUMENT_TYPE && !originalSaved;
      return `
      <button class="btn btn-xs ${document.className}" data-trip-id="${booking.id}" data-document-type="${document.type}" title="${locked ? 'Save Original Tax Invoice first' : document.label}" ${locked ? 'disabled' : ''}>
        <i class="fa ${document.icon}"></i> ${canManageInvoices ? document.label : 'Open Original Tax Invoice'}
      </button>`;
    }).join('');
    const generated = documents.length
      ? `<span class="doc-state"><i class="fa fa-check-circle"></i> Saved: ${documents.map((document) => document.document_type.replaceAll('_', ' ')).join(', ')}</span>`
      : `<span class="doc-state">${canManageInvoices ? 'No saved tax document yet' : 'Original Tax Invoice will be available after the office issues it.'}</span>`;
    return `<tr>
      <td><strong>${escapeHtml(booking.file_reference || booking.booking_reference || `#${booking.id}`)}</strong></td>
      <td>${formatDate(booking.booking_date || booking.created_at)}</td>
      <td>${escapeHtml(booking.client_name || '-')}</td>
      <td>${escapeHtml(booking.agents?.name || '-')}</td>
      <td>${escapeHtml(booking.client_phone || '-')}</td>
      <td>${Number(booking.number_of_adults || 0) + Number(booking.number_of_kids || 0)}</td>
      <td>THB ${formatAmount(booking.final_amount || booking.total_amount)}</td>
      <td><span class="badge-confirmed">Payment Received</span></td>
      <td><div class="document-actions">${actions}</div>${generated}</td>
    </tr>`;
  }).join('');
  body.querySelectorAll('[data-trip-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const { tripId, documentType } = button.dataset;
      window.location.href = `tax_invoice_editor.html?trip_id=${encodeURIComponent(tripId)}&type=${encodeURIComponent(documentType)}`;
    });
  });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB').replaceAll('/', '-');
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}
