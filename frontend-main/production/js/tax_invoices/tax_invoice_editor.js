const params = new URLSearchParams(window.location.search);
const tripId = Number(params.get('trip_id'));
const documentType = params.get('type') || 'original_tax_invoice';
const isSettingsMode = params.get('mode') === 'settings';
const ORIGINAL_DOCUMENT_TYPE = 'original_tax_invoice';
const canManageInvoices = ['admin', 'superadmin'].includes(String(localStorage.getItem('role') || '').toLowerCase());
const VAT_RATE = 0.07;
const WHT_RATE = 0.03;
const LOCAL_OPERATOR_DOCUMENT_TYPES = new Set([
  'local_operator_original_tax_invoice',
  'local_operator_copy_tax_invoice'
]);
const DOCUMENT_CONFIG = {
  original_tax_invoice: { title: 'ORIGINAL TAX INVOICE', allowed: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'] },
  tax_invoice: { title: 'TAX INVOICE', allowed: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'] },
  original_receipt_transportation: { title: 'ORIGINAL RECEIPT TRANSPORTATION', allowed: ['transfer', 'excursion', 'tour'], noVat: true },
  tax_invoice_hotel: { title: 'TAX INVOICE HOTEL', allowed: ['hotel', 'tour_hotel'] },
  local_operator_original_tax_invoice: { title: 'ORIGINAL TAX INVOICE - LOCAL OPERATOR', allowed: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'], wht: true },
  local_operator_copy_tax_invoice: { title: 'COPY TAX INVOICE - LOCAL OPERATOR', allowed: ['transfer', 'excursion', 'tour', 'tour_hotel', 'hotel', 'other', 'special_package', 'assistance_fee'], wht: true }
};
const COMPANY = {
  name: 'Verathailandia Co., Ltd.',
  thaiName: 'บริษัท เวร่าไทยลานเดีย จำกัด',
  thaiAddressLine1: '160/424-425 อาคารไอทีเอฟ สีลมพาเลส ชั้น 20',
  englishAddressLine1: '160/424-425, ITF Silom Palace, 20th Floor',
  thaiAddressLine2: 'ถนน สีลม แขวงสุริยวงศ์ เขต บางรัก',
  englishAddressLine2: 'Silom Road, Suriya Wong, Bangrak',
  thaiAddressLine3: 'กรุงเทพฯ 10500 ประเทศไทย',
  englishAddressLine3: 'Bangkok 10500 - Thailand',
  telephone: '+66 2126 6914',
  email: 'info@verathailandia.com',
  taxId: '0105547045569', tat: '14/03484'
};
let booking = null;
let services = [];
let savedDocument = null;
let masterDocument = null;
let documentsByType = new Map();
let draftInvoiceDate = '';

document.addEventListener('DOMContentLoaded', () => {
  if (!tripId || !DOCUMENT_CONFIG[documentType]) {
    document.getElementById('invoicePaper').innerHTML = '<div class="loading">Invalid tax invoice request.</div>';
    return;
  }
  document.getElementById('saveButton').addEventListener('click', saveDocument);
  document.getElementById('printButton').addEventListener('click', openPrintView);
  if (!canManageInvoices || ![ORIGINAL_DOCUMENT_TYPE, 'tax_invoice'].includes(documentType)) {
    document.getElementById('saveButton').style.display = 'none';
  }
  if (isSettingsMode && documentType === ORIGINAL_DOCUMENT_TYPE) {
    document.getElementById('saveButton').innerHTML = '<i class="fa fa-check"></i> Save Tax Settings';
  } else if (documentType === 'tax_invoice') {
    document.getElementById('saveButton').innerHTML = '<i class="fa fa-check"></i> Save WHT Selection';
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
    documentsByType = new Map(documents.map((document) => [document.document_type, document]));
    savedDocument = documents.find((document) => document.document_type === documentType) || null;
    masterDocument = documents.find((document) => document.document_type === ORIGINAL_DOCUMENT_TYPE) || null;
    draftInvoiceDate = toInputDate(savedDocument?.invoice_date || masterDocument?.invoice_date || booking.payment_date);
    if (documentType !== ORIGINAL_DOCUMENT_TYPE && !masterDocument) {
      document.getElementById('invoiceNotice').innerHTML = '<i class="fa fa-lock"></i> Save the Original Tax Invoice first. Its invoice date and selected services will be copied automatically to the other tax documents.';
      document.getElementById('invoicePaper').innerHTML = '<div class="loading"><i class="fa fa-lock"></i><br>Save the Original Tax Invoice first, then return here to open this document.</div>';
      document.getElementById('saveButton').disabled = true;
      document.getElementById('printButton').disabled = true;
      return;
    }
    const sourceDocument = documentType === ORIGINAL_DOCUMENT_TYPE ? savedDocument : (masterDocument || savedDocument);
    const stored = sourceDocument ? parseJson(sourceDocument.selected_services, []) : [];
    const byId = new Map(stored.map((row) => [row.id, row]));
    const savedRows = documentType === 'tax_invoice' && savedDocument
      ? parseJson(savedDocument.selected_services, [])
      : [];
    const savedById = new Map(savedRows.map((row) => [row.id, row]));
    services = (data.services || []).filter((row) => DOCUMENT_CONFIG[documentType].allowed.includes(row.type)).map((row) => {
      const storedRow = byId.get(row.id);
      const hasStoredRow = byId.has(row.id);
      const storedTreatment = normalizeTreatment(storedRow?.tax_treatment || storedRow?.taxTreatment);
      const storedTotal = number(storedRow?.total ?? row.total);
      const eligibleForAdv = usesRemainingAmountVat(row);
      const legacyAdv = number(storedRow?.adv);
      const advEnabled = eligibleForAdv && hasStoredRow && Boolean(
        storedRow?.adv_enabled ?? (legacyAdv > 0 || storedTreatment === 'adv' || storedTreatment === 'split')
      );
      const storedAdv = advEnabled
        ? Math.min(storedTotal, storedTreatment === 'adv' && legacyAdv <= 0 ? storedTotal : Math.max(0, legacyAdv))
        : 0;
      const inferredTreatment = inferTreatment(storedAdv, storedTotal);
      return {
        ...row,
        ...(storedRow || {}),
        // Keep allocation rules from the booking payload; saved JSON may come
        // from an older version that did not expose package detail pricing.
        parent_id: row.parent_id || null,
        editable_total: Boolean(row.editable_total),
        selected: hasStoredRow ? storedRow.selected !== false : true,
        wht_selected: documentType === 'tax_invoice' && hasStoredRow
          ? Boolean(savedById.get(row.id)?.wht_selected)
          : Boolean(storedRow?.wht_selected),
        tax_treatment: inferredTreatment,
        adv_enabled: advEnabled,
        adv: storedAdv,
        vat_base: round(Math.max(0, storedTotal - storedAdv) / (1 + VAT_RATE)),
        total: storedTotal
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
  const documentNumberLabel = documentType === 'original_receipt_transportation' ? 'Receipt Nr.' : 'Tax Invoice Nr.';
  // Pre-fill the editable invoice date from the recorded payment date.
  // The user can still change it, but the default now matches the required date.
  const invoiceDate = escapeAttribute(draftInvoiceDate);
  const billedName = billing.agent_name || booking.agents?.name || '-';
  const billedLocation = [billing.postal_code, billing.city, billing.country].filter(Boolean).join(' - ') || '-';
  document.getElementById('invoicePaper').innerHTML = `
    <section class="company-header">
      <img src="images/Verathailand_logo.png" alt="VeraThailandia" />
      <div class="company-info">${companyDetailsHtml()}</div>
    </section>
    <div class="title-band">${config.title}</div>
    <section class="party-grid">
      <div class="party"><div class="section-title">BILLED TO</div><div class="party-content"><strong>Agent Name:</strong> ${escapeHtml(billedName)}<br><strong>Address:</strong> ${escapeHtml(billing.address || '-')}<br><strong>City/Country:</strong> ${escapeHtml(billedLocation)}<br><strong>Tax ID:</strong> ${escapeHtml(billing.tax_id || '-')}</div></div>
    </section>
    <section class="passenger-section">
      <div class="passenger-title">PASSENGER INFORMATION</div>
      <table class="passenger-table"><tbody>
        <tr><td class="passenger-label">Client Name(s)</td><td>${escapeHtml(booking.client_name || '-')}</td><td class="passenger-label">Invoice Nr.</td><td>${escapeHtml(booking.invoice_number || '-')}</td></tr>
        <tr><td class="passenger-label">Nr. of Clients</td><td>${number(booking.number_of_adults) + number(booking.number_of_kids)}</td><td class="passenger-label">File Nr.</td><td>${escapeHtml(booking.file_reference || booking.booking_reference || '-')}</td></tr>
        <tr><td class="passenger-label">Date</td><td><input id="invoiceDate" type="date" class="invoice-number-input" value="${invoiceDate}" ${isOriginal ? '' : 'readonly'} /></td><td class="passenger-label">${documentNumberLabel}</td><td>${escapeHtml(taxInvoiceNumber)}</td></tr>
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
  const visibleRows = documentType === 'original_receipt_transportation'
    ? rows.filter((row) => row.selected && number(row.document_adv ?? row.adv) > 0)
    : rows;
  const grouped = order.map((type) => [type, visibleRows.filter((row) => row.type === type || (type === 'tour' && row.type === 'tour_hotel'))]).filter(([, values]) => values.length);
  if (!grouped.length) return '<div class="document-empty">There are no eligible services for this document.</div>';
  return `<section class="services-wrap"><h2 class="services-heading">Descriptions of Service</h2>${grouped.map(([type, items]) => {
    const showWht = documentType === 'tax_invoice' && items.some((row) => row.selected && row.wht_selected);
    return `
    <section class="service-section"><h3 class="service-section-title">${title[type]}</h3>
      <table class="services-table ${showWht ? 'with-wht' : ''}"><thead><tr>
        <th class="select-cell">Use</th><th>${type === 'transfer' ? 'Date' : 'From'}</th><th>${type === 'transfer' ? 'From / Description' : 'To'}</th><th class="description">${type === 'transfer' ? 'To' : 'Name / Hotel'}</th>
        <th class="money">Amount for This Document</th><th>Tax Treatment</th><th class="money">ADV (Non-VAT)</th><th class="money">VAT Taxable Amount</th><th class="money">VAT 7%</th>
        ${showWht ? '<th class="money wht-column">WHT 3%</th>' : ''}
      </tr></thead><tbody>
      ${items.map((row) => renderRow(row, showWht)).join('')}
      </tbody></table>
    </section>`;
  }).join('')}</section>`;
}

function renderRow(row, showWht = false) {
  const dataLocked = documentType !== ORIGINAL_DOCUMENT_TYPE || !canManageInvoices;
  const selectionEditable = canManageInvoices && (
    documentType === ORIGINAL_DOCUMENT_TYPE
    || (documentType === 'tax_invoice' && row.selected)
  );
  const selectionChecked = documentType === 'tax_invoice' ? Boolean(row.wht_selected) : Boolean(row.selected);
  const selectionTitle = documentType === 'tax_invoice'
    ? 'Apply 3% Withholding Tax to this service line'
    : 'Include this service in the tax documents';
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
  const advEligible = usesRemainingAmountVat(row);
  const advEnabled = advEligible && Boolean(row.adv_enabled);
  const treatmentControl = dataLocked
    ? `<span class="treatment-value">${advEnabled ? 'VAT 7% + ADV (Non-VAT)' : 'VAT 7% (Automatic)'}</span>`
    : advEligible
      ? `<div class="treatment-checks" aria-label="ADV treatment">
          <label><input type="checkbox" data-adv-toggle="${row.id}" ${advEnabled ? 'checked' : ''} /> ADV (Non-VAT)</label>
          <small>${advEnabled ? 'ADV is deducted first; VAT 7% is calculated from the remaining amount.' : 'VAT 7% applies automatically to the full amount.'}</small>
        </div>`
      : '<span class="treatment-value">VAT 7% (Automatic)</span>';
  const advDisabled = dataLocked || !advEnabled;
  return `<tr class="${row.type === 'tour_hotel' ? 'tour-hotel' : ''}">
    <td class="select-cell"><input type="checkbox" data-select="${row.id}" ${selectionChecked ? 'checked' : ''} ${selectionEditable ? '' : 'disabled'} title="${selectionTitle}" aria-label="${selectionTitle}" /></td>
    <td>${formatDate(row.from_date || row.date)}</td>
    <td>${row.type === 'transfer' ? escapeHtml(row.from || '-') : formatDate(row.to_date)}</td>
    <td class="description">${escapeHtml(row.type === 'transfer' ? row.to || row.description : row.name)}${row.room_type ? `<br><small>[${escapeHtml(row.room_type)}]</small>` : ''}</td>
    <td class="money" title="${includedInPackage ? 'This service is included in the Special Package selling price.' : ''}">${amountDisplay}</td>
    <td>${treatmentControl}</td>
    <td class="money">${advEligible ? `<input class="adv-input" data-adv="${row.id}" value="${number(documentType === ORIGINAL_DOCUMENT_TYPE ? row.adv : row.document_adv)}" aria-label="ADV amount" title="ADV amount deducted before VAT" ${advDisabled ? 'disabled' : ''} />` : formatAmount(0)}</td>
    <td class="money">${formatAmount(row.vat_taxable_amount)}</td>
    <td class="money" title="VAT 7% is calculated automatically from the VAT Taxable Amount">${formatAmount(row.vat)}</td>
    ${showWht ? `<td class="money wht-column" title="3% of VAT Taxable Amount">${row.wht_selected ? formatAmount(row.withholding_tax) : ''}</td>` : ''}
  </tr>`;
}

function renderTotals(totals) {
  const hasSelectiveWithholding = documentType === 'tax_invoice'
    && services.some((row) => row.selected && row.wht_selected);
  const hasWithholding = isLocalOperatorDocument(documentType)
    || hasSelectiveWithholding;
  const withholdingRows = hasWithholding ? `
    <tr><td>Invoice Total</td><td class="money">THB ${formatAmount(totals.invoice_total)}</td></tr>
    <tr><td>Less 3% Withholding Tax</td><td class="money">THB -${formatAmount(totals.withholding_tax)}</td></tr>
    <tr><td>Amount Payable</td><td class="money">THB ${formatAmount(totals.amount_payable)}</td></tr>` : `
    <tr><td>Total Amount</td><td class="money">THB ${formatAmount(totals.document_total)}</td></tr>`;
  return `<section class="amount-section"><h2>Amount Details</h2><div class="amount-wrap"><table class="total-box"><tbody>
    <tr><td>VAT Taxable Amount</td><td class="money">THB ${formatAmount(totals.vat_taxable_amount)}</td></tr>
    <tr><td>VAT 7%</td><td class="money">THB ${formatAmount(totals.vat)}</td></tr>
    <tr><td>ADV (Non-VAT Services)</td><td class="money">THB ${formatAmount(totals.document_adv)}</td></tr>
    ${withholdingRows}
  </tbody></table></div></section>`;
}

function bindInputs() {
  if (!canManageInvoices) return;
  if (documentType === 'tax_invoice') {
    document.querySelectorAll('[data-select]').forEach((input) => input.addEventListener('change', () => {
      const row = findRow(input.dataset.select);
      if (row && row.selected) row.wht_selected = input.checked;
      render();
    }));
    return;
  }
  if (documentType !== ORIGINAL_DOCUMENT_TYPE) return;
  document.getElementById('invoiceDate')?.addEventListener('change', (event) => {
    draftInvoiceDate = event.target.value;
  });
  document.querySelectorAll('[data-select]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.select); if (row) row.selected = input.checked; render();
  }));
  document.querySelectorAll('[data-adv]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.adv);
    if (row) {
      row.adv = Math.min(Math.max(0, number(input.value)), Math.max(0, number(row.total)));
      row.tax_treatment = inferTreatment(row.adv, row.total);
      row.vat_base = round(Math.max(0, number(row.total) - row.adv) / (1 + VAT_RATE));
    }
    render();
  }));
  document.querySelectorAll('[data-adv-toggle]').forEach((input) => input.addEventListener('change', () => {
    const row = findRow(input.dataset.advToggle); if (!row) return;
    row.adv_enabled = input.checked;
    if (!row.adv_enabled) row.adv = 0;
    row.tax_treatment = inferTreatment(row.adv, row.total);
    row.vat_base = round(Math.max(0, number(row.total) - number(row.adv)) / (1 + VAT_RATE));
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
    const advEnabled = usesRemainingAmountVat(row) && Boolean(row.adv_enabled);
    const adv = advEnabled ? Math.min(total, Math.max(0, number(row.adv))) : 0;
    const treatment = inferTreatment(adv, total);
    const remainingGross = round(Math.max(0, total - adv));
    const taxableNet = DOCUMENT_CONFIG[documentType].noVat ? remainingGross : round(remainingGross / (1 + VAT_RATE));
    const taxableGross = remainingGross;
    const vat = DOCUMENT_CONFIG[documentType].noVat ? 0 : round(taxableGross - taxableNet);
    const allocatedGross = round(adv + taxableGross);
    const localOperatorDocument = isLocalOperatorDocument(documentType);
    const documentTotal = DOCUMENT_CONFIG[documentType].noVat ? adv : (documentType === ORIGINAL_DOCUMENT_TYPE || localOperatorDocument) ? total : taxableGross;
    const documentAdv = documentType === 'tax_invoice' || documentType === 'tax_invoice_hotel' ? 0 : adv;
    return { ...row, adv_enabled: advEnabled, tax_treatment: treatment, raw_total: rawTotal, total, adv, vat_base: taxableNet, document_adv: documentAdv, taxable_gross: taxableGross, taxable_net: taxableNet, vat_taxable_amount: DOCUMENT_CONFIG[documentType].noVat ? 0 : taxableNet, vat, allocated_gross: allocatedGross, document_total: documentTotal };
  });
  const totals = rows.filter((row) => row.selected).reduce((sum, row) => ({ total: sum.total + row.total, document_total: sum.document_total + row.document_total, adv: sum.adv + row.adv, document_adv: sum.document_adv + row.document_adv, taxable_gross: sum.taxable_gross + row.taxable_gross, taxable_net: sum.taxable_net + row.taxable_net, vat_taxable_amount: sum.vat_taxable_amount + row.vat_taxable_amount, vat: sum.vat + row.vat }), { total: 0, document_total: 0, adv: 0, document_adv: 0, taxable_gross: 0, taxable_net: 0, vat_taxable_amount: 0, vat: 0 });
  const roundedTotals = Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, round(value)]));
  if (isLocalOperatorDocument(documentType) || documentType === 'tax_invoice') {
    const withholdingRows = rows.filter((row) => row.selected && (
      isLocalOperatorDocument(documentType) || row.wht_selected
    ));
    roundedTotals.withholding_tax_rate = WHT_RATE;
    roundedTotals.withholding_tax_base = round(withholdingRows.reduce(
      (sum, row) => sum + number(row.vat_taxable_amount),
      0
    ));
    roundedTotals.withholding_tax = round(roundedTotals.withholding_tax_base * WHT_RATE);
    roundedTotals.invoice_total = roundedTotals.document_total;
    roundedTotals.amount_payable = round(Math.max(0, roundedTotals.invoice_total - roundedTotals.withholding_tax));

    let allocatedWht = 0;
    withholdingRows.forEach((row, index) => {
      const amount = index === withholdingRows.length - 1
        ? round(roundedTotals.withholding_tax - allocatedWht)
        : round(number(row.vat_taxable_amount) * WHT_RATE);
      row.withholding_tax = Math.max(0, amount);
      allocatedWht = round(allocatedWht + row.withholding_tax);
    });
  }
  return { rows, totals: roundedTotals };
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
    documentsByType.set(documentType, data.document);
    if (documentType === ORIGINAL_DOCUMENT_TYPE) {
      masterDocument = data.document;
      draftInvoiceDate = toInputDate(data.document.invoice_date);
    }
    if (documentType === ORIGINAL_DOCUMENT_TYPE) document.getElementById('printButton').disabled = false;
    updateNotice();
    window.alert(documentType === 'tax_invoice'
      ? 'WHT selection saved successfully.'
      : data.synchronized?.length
        ? 'Original Tax Invoice saved. The other tax documents were synchronized automatically.'
        : 'Tax invoice saved successfully.');
  } catch (error) { window.alert(error.message); }
  finally {
    button.disabled = false;
    button.innerHTML = isSettingsMode && documentType === ORIGINAL_DOCUMENT_TYPE
      ? '<i class="fa fa-check"></i> Save Tax Settings'
      : documentType === 'tax_invoice'
        ? '<i class="fa fa-check"></i> Save WHT Selection'
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
  printWindow.document.write(buildPrintableDocument(title));
  printWindow.document.close();
}

function buildPrintableDocument(title) {
  const calculation = calculate();
  const billing = booking.proforma_billing || {};
  const agentName = billing.agent_name || booking.agents?.name || '-';
  const address = billing.address || '-';
  const country = billing.country || '-';
  const invoiceDate = document.getElementById('invoiceDate')?.value
    || toInputDate(savedDocument?.invoice_date || masterDocument?.invoice_date || booking.payment_date);
  const bookingInvoiceNumber = booking.invoice_number || '-';
  const taxDocumentNumber = documentNumber(documentType);
  const taxDocumentLabel = documentType === 'original_receipt_transportation' ? 'RECEIPT N°:' : 'TAX INVOICE N°:';
  const fileNumber = booking.file_reference || booking.booking_reference || '-';
  const clientCount = number(booking.number_of_adults) + number(booking.number_of_kids);
  const logoUrl = new URL('images/Verathailand_logo.png', window.location.href).href;
  const rows = printableRows(calculation.rows);
  const totals = printableTotals(calculation.totals);
  const showSelectiveWht = documentType === 'tax_invoice' && rows.some((row) => row.wht_selected);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${printDocumentStyles()}</style></head><body>
    <button class="print-control" type="button" onclick="window.print()">Print / Save PDF</button>
    <main class="tax-document">
      <section class="print-company-header">
        <div class="print-logo"><img src="${escapeAttribute(logoUrl)}" alt="VeraThailandia"></div>
        <div class="print-company-info">${companyDetailsHtml()}</div>
      </section>
      <h1 class="print-title">${escapeHtml(title)}</h1>
      <div class="print-billed-title">BILLED TO</div>
      <table class="agent-details"><tbody>
        <tr><th>AGENT'S NAME:</th><td>${escapeHtml(agentName)}</td></tr>
        <tr><th>ADDRESS:</th><td>${escapeHtml(address)}</td></tr>
        <tr><th>COUNTRY:</th><td>${escapeHtml(country)}</td></tr>
        <tr><th>DATE:</th><td>${formatShortDate(invoiceDate)}</td></tr>
        <tr><th>FILE N°:</th><td>${escapeHtml(fileNumber)}</td></tr>
        <tr><th>INVOICE N°:</th><td>${escapeHtml(bookingInvoiceNumber)}</td></tr>
        <tr><th>${taxDocumentLabel}</th><td>${escapeHtml(taxDocumentNumber)}</td></tr>
      </tbody></table>
      <div class="rooming-title">ROOMING LIST DETAILS:</div>
      <table class="rooming-details"><tbody>
        <tr><th>Client Name(s):</th><td>${escapeHtml(booking.client_name || '-')}</td></tr>
        <tr><th>N° of Client(s):</th><td>${clientCount}</td></tr>
      </tbody></table>
      <table class="service-print-table">
        <thead><tr><th>DESCRIPTION OF SERVICES:</th><th>NET PRICE</th><th>TOTAL</th>${documentType === 'tax_invoice' ? '<th>VAT</th>' : ''}${showSelectiveWht ? '<th>WHT 3%</th>' : ''}</tr></thead>
        <tbody>${rows.length ? rows.map((row) => renderPrintableService(row, showSelectiveWht)).join('') : `<tr><td colspan="${documentType === 'tax_invoice' ? (showSelectiveWht ? 5 : 4) : 3}" class="no-services">No services are available for this document.</td></tr>`}</tbody>
        <tfoot>${renderPrintableTotals(totals, showSelectiveWht)}</tfoot>
      </table>
      ${isLocalOperatorDocument(documentType) || showSelectiveWht ? '<div class="wht-note"><strong>Withholding Tax:</strong> The 3% WHT is calculated on the VAT Taxable Amount before VAT. It is deducted from the amount paid and is not an additional charge.</div>' : ''}
      <div class="print-note">Note:</div>
      <div class="print-signatures"><span>Controller__________________</span><span>Cashier / Bill Collector___________________</span></div>
    </main>
  </body></html>`;
}

function printableRows(rows) {
  return rows.filter((row) => {
    if (!row.selected) return false;
    if (documentType === 'original_receipt_transportation') return row.adv > 0;
    if (documentType === 'tax_invoice' || documentType === 'tax_invoice_hotel') return row.taxable_gross > 0;
    return row.taxable_gross > 0 || row.adv > 0;
  });
}

function printableTotals(totals) {
  if (documentType === 'original_receipt_transportation') {
    return { vatBase: 0, vat: 0, adv: totals.adv, total: totals.adv };
  }
  if (documentType === 'tax_invoice' || documentType === 'tax_invoice_hotel') {
    return {
      vatBase: totals.vat_taxable_amount,
      vat: totals.vat,
      adv: 0,
      total: totals.taxable_gross,
      withholdingTax: totals.withholding_tax || 0,
      withholdingTaxBase: totals.withholding_tax_base || 0,
      amountPayable: totals.amount_payable ?? totals.taxable_gross
    };
  }
  if (isLocalOperatorDocument(documentType)) {
    return {
      vatBase: totals.vat_taxable_amount,
      vat: totals.vat,
      adv: totals.adv,
      total: totals.document_total,
      withholdingTax: totals.withholding_tax,
      withholdingTaxBase: totals.withholding_tax_base,
      amountPayable: totals.amount_payable
    };
  }
  return { vatBase: totals.vat_taxable_amount, vat: totals.vat, adv: totals.adv, total: totals.document_total };
}

function renderPrintableService(row, showSelectiveWht = false) {
  const cells = [];
  const quantity = serviceQuantity(row);
  const taxableTotal = round(row.taxable_gross);
  const unitPrice = quantity > 0 ? round(taxableTotal / quantity) : taxableTotal;
  const vatColumn = documentType === 'tax_invoice' ? '<td class="vat-rate">7%</td>' : '';
  const whtColumn = showSelectiveWht
    ? `<td class="number wht-value-cell">${row.wht_selected ? formatAmount(row.withholding_tax) : ''}</td>`
    : '';
  if (documentType !== 'original_receipt_transportation' && taxableTotal > 0) {
    cells.push(`<tr class="service-main-row"><td>${serviceDescription(row)}</td><td class="number">${formatAmount(unitPrice)}</td><td class="number total-value">${formatAmount(taxableTotal)}</td>${vatColumn}${whtColumn}</tr>`);
  }
  if ((documentType === ORIGINAL_DOCUMENT_TYPE || documentType === 'original_receipt_transportation' || isLocalOperatorDocument(documentType)) && row.adv > 0) {
    cells.push(`<tr class="service-adv-row"><td>${advDescription(row)}</td><td></td><td class="number adv-value">${formatAmount(row.adv)}</td></tr>`);
  }
  return cells.join('');
}

function serviceDescription(row) {
  const label = {
    transfer: 'Transfer:', excursion: 'Excursion:', tour: 'Tour Package:', tour_hotel: 'Hotel:',
    hotel: 'Hotel:', other: 'Other Service:', special_package: 'Special Package:', assistance_fee: 'Extra Fee:'
  }[row.type] || 'Service:';
  const pax = servicePax(row);
  const dateLabel = row.type === 'hotel' || row.type === 'tour_hotel' || row.type === 'tour' || row.type === 'special_package' ? 'Period:' : 'Date:';
  const period = row.to_date && formatShortDate(row.to_date) !== formatShortDate(row.from_date || row.date)
    ? `${formatShortDate(row.from_date || row.date)} to ${formatShortDate(row.to_date)}`
    : formatShortDate(row.from_date || row.date);
  const route = row.type === 'transfer' ? [row.from, row.to].filter(Boolean).join(' - ') : '';
  const roomLine = row.room_type ? `<div><span>Type of Room:</span><strong>${escapeHtml(row.room_type)}</strong></div>` : '';
  const paxLine = pax > 0 ? `<span class="service-pax">Pax: ${pax}</span>` : '';
  return `<div class="service-description"><div><span>${label}</span><strong>${escapeHtml(row.name || route || row.description || '-')}</strong></div>
    ${route ? `<div><span>Route:</span>${escapeHtml(route)}</div>` : ''}
    ${roomLine}<div><span>${dateLabel}</span>${period}${paxLine}</div>
    ${row.nights ? `<div><span></span>${number(row.nights)} night(s)</div>` : ''}</div>`;
}

function advDescription(row) {
  const route = row.type === 'transfer'
    ? [row.from, row.to].filter(Boolean).join(' - ')
    : row.type === 'excursion' ? `Hotel - ${row.name || 'Excursion'} - Hotel`
      : `${formatShortDate(row.from_date || row.date)} to ${formatShortDate(row.to_date)} / ${row.name || 'Tour'}`;
  const label = row.type === 'transfer' ? 'Car Fee:' : 'ADV (Non-VAT):';
  return `<div class="service-description"><div><span>${label}</span>${escapeHtml(route || row.name || '-')}</div></div>`;
}

function renderPrintableTotals(totals, showSelectiveWht = false) {
  const columnCount = documentType === 'tax_invoice' ? (showSelectiveWht ? 5 : 4) : 3;
  if (documentType === 'tax_invoice') {
    const spacerColumns = showSelectiveWht ? 2 : 1;
    const row = (label, value, className = '') => `<tr><td class="totals-spacer" colspan="${spacerColumns}"></td><th>${label}</th><td class="number ${className}">${formatAmount(value)}</td><td>THB</td></tr>`;
    const withholdingRows = showSelectiveWht ? `
      ${row('Total Amount', totals.total)}
      <tr><td class="totals-spacer" colspan="${spacerColumns}"></td><th>Less WHT 3%</th><td class="number withholding-value">-${formatAmount(totals.withholdingTax)}</td><td>THB</td></tr>
      ${row('Amount Payable', totals.amountPayable, 'total-amount')}` : row('Total Amount', totals.total, 'total-amount');
    return `${row('VAT Taxable Amount', totals.vatBase)}
      ${row('VAT 7 %', totals.vat)}
      ${row('ADV (NON Vatable)', totals.adv)}
      ${withholdingRows}
      <tr class="column-count-sentinel"><td colspan="${columnCount}"></td></tr>`;
  }
  const withholdingRows = isLocalOperatorDocument(documentType) ? `
    <tr><td class="totals-spacer"></td><th>Invoice Total</th><td class="number">${formatAmount(totals.total)}</td></tr>
    <tr><td class="totals-spacer"></td><th>Less 3% Withholding Tax</th><td class="number withholding-value">-${formatAmount(totals.withholdingTax)}</td></tr>
    <tr><td class="totals-spacer"></td><th>Amount Payable</th><td class="number total-amount">${formatAmount(totals.amountPayable)}</td></tr>` : `
    <tr><td class="totals-spacer"></td><th>Total Amount</th><td class="number total-amount">${formatAmount(totals.total)}</td></tr>`;
  return `<tr><td class="totals-spacer"></td><th>VAT Taxable Amount</th><td class="number">${formatAmount(totals.vatBase)}</td></tr>
    <tr><td class="totals-spacer"></td><th>VAT 7 %</th><td class="number">${formatAmount(totals.vat)}</td></tr>
    <tr><td class="totals-spacer"></td><th>ADV (NON Vatable)</th><td class="number">${formatAmount(totals.adv)}</td></tr>
    ${withholdingRows}
    <tr class="column-count-sentinel"><td colspan="${columnCount}"></td></tr>`;
}

function servicePax(row) {
  return Math.max(0, number(row.pax)) || number(booking.number_of_adults) + number(booking.number_of_kids);
}

function serviceQuantity(row) {
  if (row.type === 'hotel' || row.type === 'tour_hotel') return Math.max(1, number(row.nights));
  if (row.type === 'assistance_fee' || row.type === 'other') return 1;
  return Math.max(1, servicePax(row));
}

function documentNumber(type) {
  const document = documentsByType.get(type);
  if (document?.invoice_number) return document.invoice_number;
  const prefix = { original_tax_invoice: 'OTI', tax_invoice: 'TI', original_receipt_transportation: 'ORT', tax_invoice_hotel: 'TIH', local_operator_original_tax_invoice: 'LOTI', local_operator_copy_tax_invoice: 'LCTI' }[type] || 'TI';
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(tripId).padStart(5, '0')}`;
}

function companyDetailsHtml() {
  return `<div class="company-detail-line company-detail-name">${escapeHtml(COMPANY.thaiName)} | ${escapeHtml(COMPANY.name)}</div>
    <div class="company-detail-line">${escapeHtml(COMPANY.thaiAddressLine1)} | ${escapeHtml(COMPANY.englishAddressLine1)}</div>
    <div class="company-detail-line">${escapeHtml(COMPANY.thaiAddressLine2)} | ${escapeHtml(COMPANY.englishAddressLine2)}</div>
    <div class="company-detail-line">${escapeHtml(COMPANY.thaiAddressLine3)} | ${escapeHtml(COMPANY.englishAddressLine3)}</div>
    <div class="company-detail-line">Tel ${escapeHtml(COMPANY.telephone)} | Email: ${escapeHtml(COMPANY.email)}</div>
    <div class="company-detail-line">ทะเบียนเลขที่ | Tax ID ${escapeHtml(COMPANY.taxId)}</div>
    <div class="company-detail-line">ใบอนุญาตประกอบธุรกิจนำเที่ยวเลขที่ | TAT License number ${escapeHtml(COMPANY.tat)}</div>`;
}

function printDocumentStyles() {
  return `@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#eceff3;color:#000;font-family:Tahoma,Arial,sans-serif;font-size:9px}.print-control{position:fixed;right:18px;top:18px;z-index:5;border:0;border-radius:5px;padding:10px 16px;background:#1688d4;color:#fff;font:700 13px Tahoma,Arial,sans-serif;cursor:pointer;box-shadow:0 2px 8px #0003}.tax-document{width:210mm;min-height:297mm;margin:15px auto;padding:4mm 7mm 6mm;background:#fff;box-shadow:0 2px 16px #0003}.print-company-header{display:grid;grid-template-columns:64mm 1fr;min-height:34mm;border:1px solid #111}.print-logo{display:flex;align-items:center;justify-content:center;border-right:1px solid #111}.print-logo img{max-width:58mm;max-height:31mm;object-fit:contain}.print-company-info{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:2mm 3mm;text-align:left;line-height:1.2;font-size:8px}.company-detail-line{white-space:nowrap}.company-detail-name{font-size:9px;font-weight:700}.print-title,.rooming-title{margin:0;background:#ffc000;border:1px solid #111;border-top:0;text-align:center;font-family:Georgia,'Times New Roman',serif;font-weight:700}.print-title{padding:1.5mm 1mm;font-size:20px}.print-billed-title{padding:.8mm;background:#000;color:#fff;border:1px solid #111;border-top:0;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:11px;font-weight:700}.agent-details,.rooming-details,.service-print-table{width:100%;border-collapse:collapse}.agent-details{margin:0}.agent-details th,.agent-details td{height:4.2mm;padding:.3mm .8mm;border:1px solid #111;border-top:0;text-align:left;vertical-align:middle}.agent-details th{width:36mm;font-weight:700}.rooming-title{padding:.6mm;font-size:10px}.rooming-details{margin:.8mm 0}.rooming-details th,.rooming-details td{height:4.3mm;padding:.5mm;border-bottom:1px solid #111;text-align:left}.rooming-details th{width:25mm}.service-print-table{table-layout:fixed}.service-print-table thead th{padding:.8mm .5mm;background:#ffc000;border-top:1px solid #111;border-bottom:1px solid #111;text-align:left}.service-print-table thead th:first-child{width:auto}.service-print-table thead th:nth-last-child(1),.service-print-table thead th:nth-last-child(2){width:31mm;text-align:right}.service-print-table thead th:nth-last-child(3):not(:first-child){width:31mm;text-align:right}.service-print-table thead th:last-child:not(:nth-child(3)){width:13mm;text-align:center}.service-print-table tbody td{padding:.8mm .5mm;border-left:1px solid #111;border-right:1px solid #111;vertical-align:top}.service-print-table tbody tr:last-child td{border-bottom:1px solid #111}.service-description{line-height:1.35}.service-description>div{display:grid;grid-template-columns:25mm 1fr;gap:1mm;min-height:3.5mm}.service-description strong{font-weight:700}.service-pax{float:right;margin-right:5mm}.number{text-align:right;white-space:nowrap}.total-value{font-weight:700}.adv-value{color:#ed1c24;font-weight:700}.withholding-value{color:#b91c1c;font-weight:700}.wht-value-cell{background:#fff7df;color:#8a4b00;font-weight:700}.vat-rate{text-align:center}.no-services{padding:6mm!important;text-align:center}.service-print-table tfoot th,.service-print-table tfoot td{height:4.5mm;padding:.5mm;border:1px solid #111}.service-print-table tfoot .totals-spacer{border:0}.service-print-table tfoot th{text-align:center;font-weight:400}.service-print-table tfoot .total-amount,.service-print-table tfoot tr:last-of-type th{font-weight:700}.column-count-sentinel{display:none}.wht-note{width:92mm;margin:2mm 0 0 auto;padding:1.5mm 2mm;border:1px solid #d7b56d;background:#fff8e7;color:#5f450d;line-height:1.35}.print-note{margin-top:3mm;min-height:8mm;padding:.5mm;border-top:1px solid #111}.print-signatures{display:flex;gap:20mm;margin:12mm 0 0;font-family:Georgia,'Times New Roman',serif;font-size:9px}@media print{body{background:#fff}.print-control{display:none}.tax-document{margin:0;padding:4mm 7mm 6mm;box-shadow:none}.service-main-row,.service-adv-row{break-inside:avoid;page-break-inside:avoid}}`;
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
    ? `<i class="fa fa-info-circle"></i> VAT 7% applies automatically to every selected service. For Transfers, Excursions and Tours only, select <strong>ADV (Non-VAT)</strong> and enter its amount when required. The system deducts ADV first, then calculates the VAT Taxable Amount and VAT 7% from the remaining amount. Save Tax Settings to unlock all five document previews, including both Local Operator documents with 3% WHT.${packageNotice}`
    : documentType === 'tax_invoice'
      ? '<i class="fa fa-percent"></i> Select <strong>Use</strong> only for service lines subject to WHT 3%, then save the WHT selection. WHT is calculated from each selected line\'s VAT Taxable Amount and deducted from the Total Amount. Prices, ADV, VAT treatment and Invoice Date remain synchronized with Tax Settings.'
    : `<i class="fa fa-lock"></i> This document is copied from the Original Tax Invoice. Service details, selections, ADV and Invoice Date are locked to keep all tax documents consistent.${isLocalOperatorDocument(documentType) ? ' WHT 3% is calculated automatically from the VAT Taxable Amount before VAT.' : ''}`;
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
function usesRemainingAmountVat(row) { return ['transfer', 'excursion', 'tour'].includes(String(row?.type || '').toLowerCase()); }
function isLocalOperatorDocument(type) { return LOCAL_OPERATOR_DOCUMENT_TYPES.has(type); }
function treatmentLabelFor(value) {
  return { vat: 'VAT 7% (Automatic)', adv: 'ADV (Non-VAT)', split: 'VAT 7% + ADV (Non-VAT)' }[normalizeTreatment(value)] || '';
}
function validateTreatmentSelection() {
  const calculation = calculate();
  const selected = calculation.rows.filter((row) => row.selected);
  const invalidAdv = selected.filter((row) => row.adv_enabled && (row.total <= 0 || row.adv <= 0 || row.adv > row.total));
  if (invalidAdv.length) return `Enter an ADV amount greater than zero and not exceeding the service price for: ${invalidAdv.slice(0, 3).map((row) => row.name || row.id).join(', ')}.`;
  return '';
}
function parseJson(value, fallback) { try { return typeof value === 'string' ? JSON.parse(value) : (value || fallback); } catch { return fallback; } }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : 0; }
function round(value) { return Math.round((number(value) + Number.EPSILON) * 100) / 100; }
function formatAmount(value) { return number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(value) { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB').replaceAll('/', '-'); }
function formatShortDate(value) { if (!value) return '-'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
function toInputDate(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10); }
function defaultInvoiceNumber() {
  const prefix = {
    original_tax_invoice: 'OTI',
    tax_invoice: 'TI',
    original_receipt_transportation: 'ORT',
    tax_invoice_hotel: 'TIH',
    local_operator_original_tax_invoice: 'LOTI',
    local_operator_copy_tax_invoice: 'LCTI'
  }[documentType] || 'TI';
  return `${prefix}-${new Date().getFullYear()}-${String(tripId).padStart(5, '0')}`;
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function escapeAttribute(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
