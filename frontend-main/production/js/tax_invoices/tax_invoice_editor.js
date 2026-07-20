const params = new URLSearchParams(window.location.search);
const tripId = Number(params.get('trip_id'));
const documentType = params.get('type') || 'original_tax_invoice';
const isSettingsMode = params.get('mode') === 'settings';
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
  if (isSettingsMode && documentType === ORIGINAL_DOCUMENT_TYPE) {
    document.getElementById('saveButton').innerHTML = '<i class="fa fa-check"></i> Save Tax Settings';
  }
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
    services = (data.services || []).filter((row) => DOCUMENT_CONFIG[documentType].allowed.includes(row.type)).map((row) => {
      const storedRow = byId.get(row.id);
      const hasStoredRow = byId.has(row.id);
      const storedTreatment = normalizeTreatment(storedRow?.tax_treatment || storedRow?.taxTreatment);
      const inferredTreatment = hasStoredRow
        ? storedTreatment || inferTreatment(storedRow?.adv, storedRow?.total ?? row.total)
        : defaultTreatmentFor(row);
      return {
        ...row,
        ...(storedRow || {}),
        // Keep allocation rules from the booking payload; saved JSON may come
        // from an older version that did not expose package detail pricing.
        parent_id: row.parent_id || null,
        editable_total: Boolean(row.editable_total),
        selected: hasStoredRow ? storedRow.selected !== false : true,
        tax_treatment: inferredTreatment,
        adv: inferredTreatment === 'adv' ? number(storedRow?.total ?? row.total) : number(storedRow?.adv),
        total: number(storedRow?.total ?? row.total)
      };
    });
    updateNotice();
    document.getElementById('pageTitle').innerHTML = `<i class="fa fa-sliders"></i> ${isSettingsMode && documentType === ORIGINAL_DOCUMENT_TYPE ? 'Tax Settings' : DOCUMENT_CONFIG[documentType].title}`;
    document.getElementById('printButton').disabled = documentType === ORIGINAL_DOCUMENT_TYPE && !savedDocument;
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
  const taxInvoiceNumber = savedDocument?.invoice_number || defaultInvoiceNumber();
  // Pre-fill the editable invoice date from the recorded payment date.
  // The user can still change it, but the default now matches the required date.
  const invoiceDate = escapeAttribute(toInputDate(savedDocument?.invoice_date || masterDocument?.invoice_date || booking.payment_date));
  const billedName = billing.agent_name || booking.agents?.name || '-';
  const billedLocation = [billing.postal_code, billing.city, billing.country].filter(Boolean).join(' - ') || '-';
  document.getElementById('invoicePaper').innerHTML = `
    <section class="company-header">
      <img src="images/Verathailand_logo.png" alt="VeraThailandia" />
      <div class="company-info"><strong>${COMPANY.thaiName} | ${COMPANY.name}</strong><br><span class="company-address">${COMPANY.address}</span><br>Tax ID ${COMPANY.taxId}<br>TAT License number ${COMPANY.tat}</div>
    </section>
    <div class="title-band">${config.title}</div>
    <section class="party-grid">
      <div class="party"><div class="section-title">BILLED TO</div><div class="party-content"><strong>Agent Name:</strong> ${escapeHtml(billedName)}<br><strong>Address:</strong> ${escapeHtml(billing.address || '-')}<br><strong>City/Country:</strong> ${escapeHtml(billedLocation)}<br><strong>Tax ID:</strong> ${escapeHtml(billing.tax_id || '-')}</div></div>
      <div class="party"><div class="section-title">PAYMENT / BANK ACCOUNT</div><div class="party-content"><strong>${COMPANY.name.toUpperCase()}</strong><br><strong>Bank Name:</strong> ${COMPANY.bank}<br><span class="bank-address"><strong>Address:</strong> ${COMPANY.bankAddress}</span><br><strong>Account Number:</strong> ${COMPANY.account} | <strong>Swift Code:</strong> ${COMPANY.swift}</div></div>
    </section>
    <section class="passenger-section">
      <div class="passenger-title">PASSENGER INFORMATION</div>
      <table class="passenger-table"><tbody>
        <tr><td class="passenger-label">Agent Name</td><td>${escapeHtml(billedName)}</td><td class="passenger-label">Invoice Nr.</td><td>${escapeHtml(booking.invoice_number || '-')}</td></tr>
        <tr><td class="passenger-label">Address</td><td colspan="3">${escapeHtml([billing.address, billedLocation].filter((value) => value && value !== '-').join(', ') || '-')}</td></tr>
        <tr><td class="passenger-label">Client Name(s)</td><td colspan="3">${escapeHtml(booking.client_name || '-')}</td></tr>
        <tr><td class="passenger-label">Nr. of Clients</td><td>${number(booking.number_of_adults) + number(booking.number_of_kids)}</td><td class="passenger-label">File Nr.</td><td>${escapeHtml(booking.file_reference || booking.booking_reference || '-')}</td></tr>
        <tr><td class="passenger-label">Date</td><td><input id="invoiceDate" type="date" class="invoice-number-input" value="${invoiceDate}" ${isOriginal ? '' : 'readonly'} /></td><td class="passenger-label">Tax Invoice Nr.</td><td>${escapeHtml(taxInvoiceNumber)}</td></tr>
      </tbody></table>
    </section>
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
  return `<section class="services-wrap"><h2 class="services-heading">Descriptions of Service</h2>${grouped.map(([type, items]) => `
    <section class="service-section"><h3 class="service-section-title">${title[type]}</h3>
      <table class="services-table"><thead><tr>
        <th class="select-cell">Use</th><th>${type === 'transfer' ? 'Date' : 'From'}</th><th>${type === 'transfer' ? 'From / Description' : 'To'}</th><th class="description">${type === 'transfer' ? 'To' : 'Name / Hotel'}</th>
        <th class="money">Amount for This Document</th><th>Tax Treatment</th><th class="money">ADV (Non-VAT)</th><th class="money">VAT Taxable Amount</th><th class="money">VAT 7%</th>
      </tr></thead><tbody>
      ${items.map(renderRow).join('')}
      </tbody></table>
    </section>`).join('')}</section>`;
}

function renderRow(row) {
  const dataLocked = documentType !== ORIGINAL_DOCUMENT_TYPE || !canManageInvoices;
  const readOnlyTotal = dataLocked || !row.editable_total;
  const documentAmount = documentType === ORIGINAL_DOCUMENT_TYPE ? row.total : row.document_total;
  const allocationLimit = allocationLimitFor(row);
  const inputTotal = readOnlyTotal
    ? formatAmount(documentAmount)
    : `<input class="total-input" data-id="${row.id}" value="${number(row.total)}" ${allocationLimit !== null ? `max="${allocationLimit}"` : ''} min="0" step="0.01" inputmode="decimal" aria-label="Amount for This Document" />`;
  const includedInPackage = isIncludedPackageComponent(row);
  const amountDisplay = includedInPackage
    ? '<span class="included-package-note">Included in Special Package</span>'
    : inputTotal;
  const treatment = normalizeTreatment(row.tax_treatment);
  const treatmentLabel = treatmentLabelFor(treatment);
  const vatSelected = treatment === 'vat' || treatment === 'split';
  const advSelected = treatment === 'adv' || treatment === 'split';
  const treatmentControl = dataLocked
    ? `<span class="treatment-value ${treatment || 'treatment-missing'}">${escapeHtml(treatmentLabel || 'Not selected')}</span>`
    : `<div class="treatment-checks" aria-label="Tax treatment">
        <label><input type="checkbox" data-treatment-option="vat" data-treatment-id="${row.id}" ${vatSelected ? 'checked' : ''} /> VAT 7%</label>
        <label><input type="checkbox" data-treatment-option="adv" data-treatment-id="${row.id}" ${advSelected ? 'checked' : ''} /> ADV (Non-VAT)</label>
        ${treatment === 'split' ? '<small>Enter ADV amount; the remaining amount is VAT.</small>' : ''}
      </div>`;
  const advDisabled = dataLocked || !advSelected;
  return `<tr class="${row.type === 'tour_hotel' ? 'tour-hotel' : ''}">
    <td class="select-cell"><input type="checkbox" data-select="${row.id}" ${row.selected ? 'checked' : ''} ${dataLocked ? 'disabled' : ''} /></td>
    <td>${formatDate(row.from_date || row.date)}</td>
    <td>${row.type === 'transfer' ? escapeHtml(row.from || '-') : formatDate(row.to_date)}</td>
    <td class="description">${escapeHtml(row.type === 'transfer' ? row.to || row.description : row.name)}${row.room_type ? `<br><small>[${escapeHtml(row.room_type)}]</small>` : ''}</td>
    <td class="money" title="${includedInPackage ? 'This service is included in the Special Package selling price.' : ''}">${amountDisplay}</td>
    <td>${treatmentControl}</td>
    <td class="money"><input class="adv-input" data-adv="${row.id}" value="${number(documentType === ORIGINAL_DOCUMENT_TYPE ? row.adv : row.document_adv)}" aria-label="ADV amount" ${advDisabled ? 'disabled' : ''} /></td>
    <td class="money">${formatAmount(row.vat_taxable_amount)}</td>
    <td class="money">${formatAmount(row.vat)}</td>
  </tr>`;
}

function renderTotals(totals) {
  return `<section class="amount-section"><h2>Amount Details</h2><div class="amount-wrap"><table class="total-box"><tbody>
    <tr><td>VAT Taxable Amount</td><td class="money">THB ${formatAmount(totals.vat_taxable_amount)}</td></tr>
    <tr><td>VAT 7%</td><td class="money">THB ${formatAmount(totals.vat)}</td></tr>
    <tr><td>ADV (Non-VAT Services)</td><td class="money">THB ${formatAmount(totals.document_adv)}</td></tr>
    <tr><td>Total Amount</td><td class="money">THB ${formatAmount(totals.document_total)}</td></tr>
  </tbody></table></div></section>`;
}

function bindInputs() {
  if (documentType !== ORIGINAL_DOCUMENT_TYPE || !canManageInvoices) return;
  document.querySelectorAll('[data-select]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.select); if (row) row.selected = input.checked; render();
  }));
  document.querySelectorAll('[data-adv]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.adv);
    if (row) {
      row.adv = Math.min(Math.max(0, number(input.value)), Math.max(0, number(row.total)));
      if (row.tax_treatment === 'adv' && row.adv < number(row.total) && row.adv > 0) row.tax_treatment = 'split';
      if (row.tax_treatment === 'split' && row.adv >= number(row.total) && number(row.total) > 0) row.tax_treatment = 'adv';
    }
    render();
  }));
  document.querySelectorAll('[data-treatment-option]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.treatmentId); if (!row) return;
    const option = normalizeTreatment(input.dataset.treatmentOption);
    const current = normalizeTreatment(row.tax_treatment);
    const vatWasSelected = current === 'vat' || current === 'split';
    const advWasSelected = current === 'adv' || current === 'split';
    const vatIsSelected = option === 'vat' ? input.checked : vatWasSelected;
    const advIsSelected = option === 'adv' ? input.checked : advWasSelected;
    row.tax_treatment = treatmentFromFlags(vatIsSelected, advIsSelected);
    if (row.tax_treatment === 'vat') row.adv = 0;
    if (row.tax_treatment === 'adv') row.adv = Math.max(0, number(row.total));
    if (row.tax_treatment === 'split' && row.adv >= number(row.total)) row.adv = 0;
    render();
  }));
  document.querySelectorAll('[data-id]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.id);
    if (row) {
      const requested = Math.max(0, round(number(input.value)));
      const limit = allocationLimitFor(row);
      if (limit !== null && requested > limit) {
        row.total = limit;
        window.alert(`The allocated detail price cannot exceed ${formatAmount(limit)}. The value was adjusted to the remaining amount.`);
      } else {
        row.total = requested;
      }
    }
    render();
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
    const treatment = normalizeTreatment(row.tax_treatment);
    const adv = treatment === 'adv' ? total : treatment === 'vat' ? 0 : Math.min(total, Math.max(0, number(row.adv)));
    const taxableGross = round(total - adv);
    const taxableNet = DOCUMENT_CONFIG[documentType].noVat ? 0 : round(taxableGross / (1 + VAT_RATE));
    const vat = DOCUMENT_CONFIG[documentType].noVat ? 0 : round(taxableGross - taxableNet);
    const documentTotal = DOCUMENT_CONFIG[documentType].noVat ? adv : documentType === ORIGINAL_DOCUMENT_TYPE ? total : taxableGross;
    const documentAdv = documentType === 'tax_invoice' || documentType === 'tax_invoice_hotel' ? 0 : adv;
    return { ...row, tax_treatment: treatment, raw_total: rawTotal, total, adv, document_adv: documentAdv, taxable_gross: taxableGross, taxable_net: taxableNet, vat_taxable_amount: DOCUMENT_CONFIG[documentType].noVat ? 0 : taxableNet, vat, document_total: documentTotal };
  });
  const totals = rows.filter((row) => row.selected).reduce((sum, row) => ({ total: sum.total + row.total, document_total: sum.document_total + row.document_total, adv: sum.adv + row.adv, document_adv: sum.document_adv + row.document_adv, taxable_gross: sum.taxable_gross + row.taxable_gross, taxable_net: sum.taxable_net + row.taxable_net, vat_taxable_amount: sum.vat_taxable_amount + row.vat_taxable_amount, vat: sum.vat + row.vat }), { total: 0, document_total: 0, adv: 0, document_adv: 0, taxable_gross: 0, taxable_net: 0, vat_taxable_amount: 0, vat: 0 });
  return { rows, totals: Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round(value)])) };
}

async function saveDocument() {
  const invoiceDate = document.getElementById('invoiceDate')?.value;
  if (documentType === ORIGINAL_DOCUMENT_TYPE && !invoiceDate) {
    window.alert('Invoice Date is required.');
    return;
  }
  if (documentType === ORIGINAL_DOCUMENT_TYPE) {
    const allocationError = validateAllocationInputs();
    if (allocationError) {
      window.alert(allocationError);
      return;
    }
    const validationError = validateTreatmentSelection();
    if (validationError) {
      window.alert(validationError);
      return;
    }
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
    if (documentType === ORIGINAL_DOCUMENT_TYPE) document.getElementById('printButton').disabled = false;
    updateNotice();
    window.alert(data.synchronized?.length
      ? 'Original Tax Invoice saved. The other tax documents were synchronized automatically.'
      : 'Tax invoice saved successfully.');
  } catch (error) { window.alert(error.message); }
  finally {
    button.disabled = false;
    button.innerHTML = isSettingsMode && documentType === ORIGINAL_DOCUMENT_TYPE
      ? '<i class="fa fa-check"></i> Save Tax Settings'
      : '<i class="fa fa-save"></i> Save Tax Invoice';
  }
}

function openPrintView() {
  if (documentType === ORIGINAL_DOCUMENT_TYPE && !savedDocument) {
    window.alert('Please save Tax Settings before opening the document preview.');
    return;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) { window.alert('Please allow pop-ups to open the printable document.'); return; }
  const title = DOCUMENT_CONFIG[documentType].title;
  const paper = document.getElementById('invoicePaper').cloneNode(true);
  paper.querySelectorAll('input, select').forEach((input) => {
    const span = document.createElement('span');
    span.textContent = input.type === 'checkbox' ? (input.checked ? 'X' : '') : input.tagName === 'SELECT' ? input.options[input.selectedIndex]?.text || '' : input.value;
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
  const packageNotice = services.some((row) => row.type === 'special_package')
    ? '<br><i class="fa fa-gift"></i> For Tour or Special Package details, enter the allocation in <strong>Amount for This Document</strong>. The detail allocations cannot exceed the main Tour or Special Package price.'
    : '';
  notice.innerHTML = !canManageInvoices
    ? '<i class="fa fa-file-pdf-o"></i> This is the saved Original Tax Invoice. You can open or print it for your records.'
    : documentType === ORIGINAL_DOCUMENT_TYPE
    ? `<i class="fa fa-info-circle"></i> Set each selected service with the checkboxes. VAT 7% and ADV (Non-VAT) may be selected together for one service. When both are selected, enter the ADV amount and the remaining amount is VAT. Transfers default to ADV (Non-VAT); all other services default to VAT 7%. Save Tax Settings to unlock the three document previews.${packageNotice}`
    : '<i class="fa fa-lock"></i> This document is copied from the Original Tax Invoice. Service details, selections, ADV and Invoice Date are locked to keep all tax documents consistent.';
}
function isIncludedPackageComponent(row) {
  return services.some((item) => item.type === 'special_package')
    && row.type !== 'special_package'
    && row.type !== 'assistance_fee'
    && !row.editable_total
    && number(row.total) === 0;
}
function allocationLimitFor(row) {
  if (!row?.parent_id || !row.editable_total) return null;
  const parent = findRow(row.parent_id);
  if (!parent) return null;
  const allocatedByOthers = services
    .filter((candidate) => candidate.parent_id === row.parent_id && candidate.id !== row.id && candidate.selected)
    .reduce((sum, candidate) => sum + Math.max(0, round(candidate.total)), 0);
  return Math.max(0, round(number(parent.total) - allocatedByOthers));
}
function validateAllocationInputs() {
  const parentRows = services.filter((row) => row.id && services.some((child) => child.parent_id === row.id && child.selected));
  const exceeded = parentRows.find((parent) => {
    const allocated = services
      .filter((child) => child.parent_id === parent.id && child.selected)
      .reduce((sum, child) => sum + Math.max(0, round(child.total)), 0);
    return allocated > Math.max(0, round(parent.total)) + 0.01;
  });
  return exceeded ? `The allocated detail prices for ${exceeded.name || exceeded.id} cannot exceed ${formatAmount(exceeded.total)}.` : '';
}
function authHeaders() { return { Authorization: `Bearer ${localStorage.getItem('token')}` }; }
function normalizeTreatment(value) {
  const treatment = String(value || '').trim().toLowerCase();
  return ['vat', 'adv', 'split'].includes(treatment) ? treatment : '';
}
function inferTreatment(adv, total) {
  const amount = number(adv); const gross = Math.max(0, number(total));
  if (amount <= 0) return 'vat';
  return amount >= gross ? 'adv' : 'split';
}
function defaultTreatmentFor(row) { return row?.type === 'transfer' ? 'adv' : 'vat'; }
function treatmentLabelFor(value) {
  return { vat: 'VAT 7%', adv: 'ADV (Non-VAT)', split: 'VAT 7% + ADV (manual split)' }[normalizeTreatment(value)] || '';
}
function treatmentFromFlags(vatSelected, advSelected) {
  if (vatSelected && advSelected) return 'split';
  if (vatSelected) return 'vat';
  if (advSelected) return 'adv';
  return '';
}
function validateTreatmentSelection() {
  const calculation = calculate();
  const selected = calculation.rows.filter((row) => row.selected);
  const missing = selected.filter((row) => !normalizeTreatment(row.tax_treatment));
  if (missing.length) return `Please select VAT 7% or ADV (Non-VAT) for: ${missing.slice(0, 3).map((row) => row.name || row.id).join(', ')}${missing.length > 3 ? ' and more' : ''}.`;
  const invalidSplit = selected.filter((row) => row.tax_treatment === 'split' && (row.total <= 0 || row.adv <= 0 || row.adv >= row.total));
  if (invalidSplit.length) return `Enter an ADV amount between 0.01 and the service total for: ${invalidSplit.slice(0, 3).map((row) => row.name || row.id).join(', ')}.`;
  return '';
}
function parseJson(value, fallback) { try { return typeof value === 'string' ? JSON.parse(value) : (value || fallback); } catch { return fallback; } }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round(value) { return Math.round((number(value) + Number.EPSILON) * 100) / 100; }
function formatAmount(value) { return number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(value) { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB').replaceAll('/', '-'); }
function toInputDate(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10); }
function defaultInvoiceNumber() {
  const prefix = {
    original_tax_invoice: 'OTI',
    tax_invoice: 'TI',
    original_receipt_transportation: 'ORT',
    tax_invoice_hotel: 'TIH'
  }[documentType] || 'TI';
  return `${prefix}-${new Date().getFullYear()}-${String(tripId).padStart(5, '0')}`;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
