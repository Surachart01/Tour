const params = new URLSearchParams(window.location.search);
const tripId = Number(params.get('trip_id'));
const documentType = params.get('type') || 'original_tax_invoice';
const ORIGINAL_DOCUMENT_TYPE = 'original_tax_invoice';
const canManageInvoices = ['admin', 'superadmin'].includes(String(localStorage.getItem('role') || '').toLowerCase());
const VAT_RATE = 0.07;
const DOCUMENT_CONFIG = {
  original_tax_invoice: { title: 'ORIGINAL TAX INVOICE', allowed: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'] },
  tax_invoice: { title: 'TAX INVOICE', allowed: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'] },
  original_receipt_transportation: { title: 'ORIGINAL RECEIPT TRANSPORTATION', allowed: ['transfer'], noVat: true },
  tax_invoice_hotel: { title: 'TAX INVOICE HOTEL', allowed: ['hotel', 'tour_hotel'] }
};
const COMPANY = {
  name: 'Verathailandia Co., Ltd.',
  thaiName: 'บริษัท เวร่าไทยลานเดีย จำกัด',
  address: '160/424-425, ITF Silom Palace, 20th Floor, Silom Road, Suriya Wong, Bangrak, Bangkok 10500 - Thailand',
  taxId: '0105547045569', tat: '14/03484',
  bank: 'SIAM COMMERCIAL BANK', bankAddress: '4th Fl. Silom Complex, 191 Silom Road, Bang Rak City, 10500, Bangkok Thailand', account: '419-200606-3', swift: 'SICOTHBK'
};
let booking = null;
let services = [];
let savedDocument = null;
let masterDocument = null;

document.addEventListener('DOMContentLoaded', () => {
  if (!tripId || !DOCUMENT_CONFIG[documentType]) {
    document.getElementById('invoicePaper').innerHTML = '<div class="loading">Invalid tax invoice request.</div>';
    return;
  }
  document.getElementById('saveButton').addEventListener('click', saveDocument);
  document.getElementById('printButton').addEventListener('click', openPrintView);
  if (!canManageInvoices) document.getElementById('saveButton').style.display = 'none';
  loadDocument();
});

async function loadDocument() {
  try {
    const response = await fetch(`${Endpoint}/api/v1/tax-invoice/booking/${tripId}`, { headers: authHeaders() });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Failed to load booking.');
    const data = await response.json();
    booking = data.booking;
    const documents = data.documents || [];
    savedDocument = documents.find((document) => document.document_type === documentType) || null;
    masterDocument = documents.find((document) => document.document_type === ORIGINAL_DOCUMENT_TYPE) || null;
    if (documentType !== ORIGINAL_DOCUMENT_TYPE && !masterDocument) {
      document.getElementById('invoiceNotice').innerHTML = '<i class="fa fa-lock"></i> Save the Original Tax Invoice first. Its invoice date and selected services will be copied automatically to the other tax documents.';
      document.getElementById('invoicePaper').innerHTML = '<div class="loading"><i class="fa fa-lock"></i><br>Save the Original Tax Invoice first, then return here to open this document.</div>';
      document.getElementById('saveButton').disabled = true;
      document.getElementById('printButton').disabled = true;
      return;
    }
    const stored = savedDocument ? parseJson(savedDocument.selected_services, []) : [];
    const byId = new Map(stored.map((row) => [row.id, row]));
    services = (data.services || []).filter((row) => DOCUMENT_CONFIG[documentType].allowed.includes(row.type)).map((row) => ({
      ...row,
      ...(byId.get(row.id) || {}),
      selected: byId.has(row.id) ? byId.get(row.id).selected !== false : true,
      adv: number(byId.get(row.id)?.adv),
      total: number(byId.get(row.id)?.total ?? row.total)
    }));
    updateNotice();
    document.getElementById('pageTitle').innerHTML = `<i class="fa fa-file-text-o"></i> ${DOCUMENT_CONFIG[documentType].title}`;
    render();
  } catch (error) {
    document.getElementById('invoicePaper').innerHTML = `<div class="loading"><i class="fa fa-exclamation-triangle"></i><br>${escapeHtml(error.message)}</div>`;
  }
}

function render() {
  const config = DOCUMENT_CONFIG[documentType];
  const isOriginal = documentType === ORIGINAL_DOCUMENT_TYPE && canManageInvoices;
  const calculation = calculate();
  const billing = booking.proforma_billing || {};
  document.getElementById('invoicePaper').innerHTML = `
    <section class="company-header">
      <img src="images/Verathailand_logo.png" alt="VeraThailandia" />
      <div class="company-info"><strong>${COMPANY.thaiName} | ${COMPANY.name}</strong><br><span class="company-address">${COMPANY.address}</span><br>Tax ID ${COMPANY.taxId}<br>TAT License number ${COMPANY.tat}</div>
    </section>
    <div class="title-band">${config.title}</div>
    <section class="party-grid">
      <div class="party"><div class="section-title">BILLED TO</div><div class="party-content"><strong>Agent Name:</strong> ${escapeHtml(billing.agent_name || booking.agents?.name || '-')}<br><strong>Address:</strong> ${escapeHtml(billing.address || '-')}<br><strong>City/Country:</strong> ${escapeHtml([billing.postal_code, billing.city, billing.country].filter(Boolean).join(' - ') || '-')}<br><strong>Tax ID:</strong> ${escapeHtml(billing.tax_id || '-')}</div></div>
      <div class="party"><div class="section-title">PAYMENT / BANK ACCOUNT</div><div class="party-content"><strong>${COMPANY.name.toUpperCase()}</strong><br><strong>Bank Name:</strong> ${COMPANY.bank}<br><span class="bank-address"><strong>Address:</strong> ${COMPANY.bankAddress}</span><br><strong>Account Number:</strong> ${COMPANY.account} | <strong>Swift Code:</strong> ${COMPANY.swift}</div></div>
    </section>
    <section class="details-grid">
      <div class="details-label">Client Name(s)</div><div>${escapeHtml(booking.client_name || '-')}</div>
      <div class="details-label">Nr. of Clients</div><div>${number(booking.number_of_adults) + number(booking.number_of_kids)}</div>
      <div class="details-label">Invoice Nr.</div><div>${escapeHtml(booking.invoice_number || '-')}</div>
      <div class="details-label">File Nr.</div><div>${escapeHtml(booking.file_reference || booking.booking_reference || '-')}</div>
      <div class="details-label">Date</div><div><input id="invoiceDate" type="date" class="invoice-number-input" value="${escapeAttribute(toInputDate(savedDocument?.invoice_date || masterDocument?.invoice_date))}" ${isOriginal ? '' : 'readonly'} /></div>
      <div class="details-label">Tax Invoice Number</div><div>${escapeHtml(savedDocument?.invoice_number || defaultInvoiceNumber())}</div>
    </section>
    <div class="service-heading">DESCRIPTION OF SERVICES</div>
    ${renderSections(calculation.rows)}
    ${renderTotals(calculation.totals, config.noVat)}
    <div class="signature-row"><span>Controller__________________</span><span>Cashier / Bill Collector___________________</span></div>
    <footer class="footer"><strong>${COMPANY.name}</strong>20th Floor, Room 160/424-425, ITF Silom Palace, 160 Silom Road, Suriya Wong, Bangrak, Bangkok 10500, Thailand</footer>
  `;
  bindInputs();
}

function renderSections(rows) {
  const order = ['transfer', 'excursion', 'tour', 'hotel', 'other', 'special_package', 'assistance_fee'];
  const title = { transfer: 'TRANSFERS', excursion: 'EXCURSIONS', tour: 'TOURS', hotel: 'HOTEL', other: 'OTHER SERVICES', special_package: 'SPECIAL PACKAGE', assistance_fee: 'ASSISTANCE FEE' };
  const grouped = order.map((type) => [type, rows.filter((row) => row.type === type || (type === 'tour' && row.type === 'tour_hotel'))]).filter(([, values]) => values.length);
  if (!grouped.length) return '<div class="document-empty">There are no eligible services for this document.</div>';
  return grouped.map(([type, items]) => `
    <section class="service-section"><h2>${title[type]}</h2>
      <table><thead><tr>
        <th class="select-cell">Use</th><th>${type === 'transfer' ? 'Date' : 'From'}</th><th>${type === 'transfer' ? 'From / Description' : 'To'}</th><th class="description">${type === 'transfer' ? 'To' : 'Name / Hotel'}</th>
        <th class="money">Total (Incl. VAT)</th><th class="money">ADV (Non-VAT)</th><th class="money">Unit Price (Excl. ADV)</th>${DOCUMENT_CONFIG[documentType].noVat ? '' : '<th class="money">Unit Price (Excl. VAT)</th><th class="money">VAT 7%</th>'}
      </tr></thead><tbody>
      ${items.map(renderRow).join('')}
      </tbody></table>
    </section>`).join('');
}

function renderRow(row) {
  const noVat = DOCUMENT_CONFIG[documentType].noVat;
  const dataLocked = documentType !== ORIGINAL_DOCUMENT_TYPE || !canManageInvoices;
  const readOnlyTotal = dataLocked || !row.editable_total;
  const inputTotal = readOnlyTotal ? formatAmount(row.raw_total) : `<input class="total-input" data-id="${row.id}" value="${number(row.raw_total)}" aria-label="Total price" />`;
  return `<tr class="${row.type === 'tour_hotel' ? 'tour-hotel' : ''}">
    <td class="select-cell"><input type="checkbox" data-select="${row.id}" ${row.selected ? 'checked' : ''} ${dataLocked ? 'disabled' : ''} /></td>
    <td>${formatDate(row.from_date || row.date)}</td>
    <td>${row.type === 'transfer' ? escapeHtml(row.from || '-') : formatDate(row.to_date)}</td>
    <td class="description">${escapeHtml(row.type === 'transfer' ? row.to || row.description : row.name)}${row.room_type ? `<br><small>[${escapeHtml(row.room_type)}]</small>` : ''}</td>
    <td class="money">${inputTotal}</td>
    <td class="money"><input class="adv-input" data-adv="${row.id}" value="${number(row.adv)}" aria-label="ADV amount" ${dataLocked ? 'disabled' : ''} /></td>
    <td class="money">${formatAmount(row.taxable_gross)}</td>
    ${noVat ? '' : `<td class="money">${formatAmount(row.taxable_net)}</td><td class="money">${formatAmount(row.vat)}</td>`}
  </tr>`;
}

function renderTotals(totals, noVat) {
  const vatTaxableAmount = noVat ? totals.taxable_gross : totals.taxable_net;
  const vatAmount = noVat ? 0 : totals.vat;
  return `<table class="total-box"><tbody>
    <tr><td>VAT Taxable Amount</td><td class="money">${formatAmount(vatTaxableAmount)} THB</td></tr>
    <tr><td>VAT 7%</td><td class="money">${formatAmount(vatAmount)} THB</td></tr>
    <tr><td>ADV (Non-VAT Services)</td><td class="money adv-total">${formatAmount(totals.adv)} THB</td></tr>
    <tr><td>Total Amount</td><td class="money">${formatAmount(totals.total)} THB</td></tr>
  </tbody></table>`;
}

function bindInputs() {
  if (documentType !== ORIGINAL_DOCUMENT_TYPE || !canManageInvoices) return;
  document.querySelectorAll('[data-select]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.select); if (row) row.selected = input.checked; render();
  }));
  document.querySelectorAll('[data-adv]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.adv); if (row) row.adv = number(input.value); render();
  }));
  document.querySelectorAll('[data-id]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.id); if (row) row.total = number(input.value); render();
  }));
}

function calculate() {
  const childTotals = services.reduce((map, row) => {
    if (row.parent_id && row.selected) map[row.parent_id] = (map[row.parent_id] || 0) + number(row.total);
    return map;
  }, {});
  const rows = services.map((row) => {
    const rawTotal = Math.max(0, number(row.total));
    const total = Math.max(0, rawTotal - number(childTotals[row.id]));
    const adv = Math.min(total, Math.max(0, number(row.adv)));
    const taxableGross = round(total - adv);
    const taxableNet = DOCUMENT_CONFIG[documentType].noVat ? round(total - adv) : round(taxableGross / (1 + VAT_RATE));
    return { ...row, raw_total: rawTotal, total, adv, taxable_gross: taxableGross, taxable_net: taxableNet, vat: DOCUMENT_CONFIG[documentType].noVat ? 0 : round(taxableGross - taxableNet) };
  });
  const totals = rows.filter((row) => row.selected).reduce((sum, row) => ({ total: sum.total + row.total, adv: sum.adv + row.adv, taxable_gross: sum.taxable_gross + row.taxable_gross, taxable_net: sum.taxable_net + row.taxable_net, vat: sum.vat + row.vat }), { total: 0, adv: 0, taxable_gross: 0, taxable_net: 0, vat: 0 });
  return { rows, totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round(value)])) };
}

async function saveDocument() {
  const invoiceDate = document.getElementById('invoiceDate')?.value;
  if (documentType === ORIGINAL_DOCUMENT_TYPE && !invoiceDate) {
    window.alert('Invoice Date is required and must match the payment received date.');
    return;
  }
  const button = document.getElementById('saveButton');
  button.disabled = true; button.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Saving...';
  try {
    const response = await fetch(`${Endpoint}/api/v1/tax-invoice/booking/${tripId}/document`, {
      method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_type: documentType, invoice_date: documentType === ORIGINAL_DOCUMENT_TYPE ? invoiceDate : undefined, services, adjustments: {} })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Failed to save tax invoice.');
    savedDocument = data.document;
    if (documentType === ORIGINAL_DOCUMENT_TYPE) masterDocument = data.document;
    updateNotice();
    window.alert(data.synchronized?.length
      ? 'Original Tax Invoice saved. The other tax documents were synchronized automatically.'
      : 'Tax invoice saved successfully.');
  } catch (error) { window.alert(error.message); }
  finally { button.disabled = false; button.innerHTML = '<i class="fa fa-save"></i> Save Tax Invoice'; }
}

function openPrintView() {
  const printWindow = window.open('', '_blank');
  if (!printWindow) { window.alert('Please allow pop-ups to open the printable document.'); return; }
  const title = DOCUMENT_CONFIG[documentType].title;
  const paper = document.getElementById('invoicePaper').cloneNode(true);
  paper.querySelectorAll('input').forEach((input) => {
    const span = document.createElement('span');
    span.textContent = input.type === 'checkbox' ? (input.checked ? 'X' : '') : input.value;
    span.style.cssText = input.type === 'checkbox' ? 'font-weight:bold' : 'display:block;text-align:right';
    input.replaceWith(span);
  });
  printWindow.document.write(`<!doctype html><html><head><title>${title}</title><style>${document.querySelector('style').textContent}</style></head><body>${paper.outerHTML}</body></html>`);
  printWindow.document.close();
}

function findRow(id) { return services.find((row) => row.id === id); }
function updateNotice() {
  const notice = document.getElementById('invoiceNotice');
  if (!notice) return;
  notice.innerHTML = !canManageInvoices
    ? '<i class="fa fa-file-pdf-o"></i> This is the saved Original Tax Invoice. You can open or print it for your records.'
    : documentType === ORIGINAL_DOCUMENT_TYPE
    ? '<i class="fa fa-info-circle"></i> Enter the Invoice Date manually to match the payment received date. Saving the Original Tax Invoice copies the selected services and amounts to the other tax documents. ADV is not subject to VAT.'
    : '<i class="fa fa-lock"></i> This document is copied from the Original Tax Invoice. Service details, selections, ADV and Invoice Date are locked to keep all tax documents consistent.';
}
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }
function parseJson(value, fallback) { try { return typeof value === 'string' ? JSON.parse(value) : (value || fallback); } catch { return fallback; } }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round(value) { return Math.round((number(value) + Number.EPSILON) * 100) / 100; }
function formatAmount(value) { return number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(value) { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB').replaceAll('/', '-'); }
function toInputDate(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10); }
function defaultInvoiceNumber() { return `${documentType === 'original_tax_invoice' ? 'OTI' : 'TI'}-${new Date().getFullYear()}-${String(tripId).padStart(5, '0')}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
