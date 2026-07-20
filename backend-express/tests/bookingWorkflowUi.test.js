import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const rootDirectory = resolve(testDirectory, '..', '..');
const routeSource = readFileSync(resolve(rootDirectory, 'backend-express/src/routes/tripRoutes.js'), 'utf8');
const quotationPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/edit_trip.html'), 'utf8');
const bookingPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/edit_booking.html'), 'utf8');
const quotationListPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/trip.html'), 'utf8');
const bookingListPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/booking.html'), 'utf8');
const taxInvoiceListPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/tax_invoices.html'), 'utf8');
const taxInvoiceEditorPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/tax_invoice_editor.html'), 'utf8');
const taxInvoiceEditorSource = readFileSync(resolve(rootDirectory, 'frontend-main/production/js/tax_invoices/tax_invoice_editor.js'), 'utf8');
const rolePermissionsSource = readFileSync(resolve(rootDirectory, 'frontend-main/production/js/common/role-permissions.js'), 'utf8');

function getFunctionSource(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = source.indexOf('\n        function ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test('workflow status routes are restricted to their intended roles', () => {
  assert.match(routeSource, /router\.post\('\/quotations\/:id\/finalize', authorize\('agent', 'admin'\), finalizeQuotation\)/);
  assert.match(routeSource, /router\.post\('\/bookings\/:id\/confirm', authorize\('admin'\), confirmBooking\)/);
  assert.match(routeSource, /router\.post\('\/bookings\/:id\/approveItem\/:itemType\/:itemID', authorize\('admin'\), approveItem\)/);
  assert.match(routeSource, /router\.post\('\/bookings\/:id\/declineItem\/:itemType\/:itemID', authorize\('admin'\), declineItem\)/);
});

test('quotation conversion is wired to the finalization endpoint', () => {
  const source = getFunctionSource(quotationPage, 'attachConvertToBookingListener');
  assert.match(source, /\/api\/v1\/quotations\/\$\{tripId\}\/finalize/);
  assert.match(source, /method:\s*"POST"/);
});

test('booking confirmation controls call the correct endpoints without a page reload', () => {
  const approve = getFunctionSource(bookingPage, 'approveItem');
  const decline = getFunctionSource(bookingPage, 'declineItem');
  const confirm = getFunctionSource(bookingPage, 'confirmBookingWhenServicesReady');

  assert.match(approve, /\/api\/v1\/bookings\/\$\{tripId\}\/approveItem\/\$\{itemType\}\/\$\{itemId\}/);
  assert.match(decline, /\/api\/v1\/bookings\/\$\{tripId\}\/declineItem\/\$\{itemType\}\/\$\{itemId\}/);
  assert.match(confirm, /\/api\/v1\/bookings\/\$\{tripId\}\/confirm/);
  assert.doesNotMatch(approve, /window\.location\.reload\(\)/);
  assert.doesNotMatch(decline, /window\.location\.reload\(\)/);
  assert.doesNotMatch(confirm, /window\.location\.reload\(\)/);
});

test('confirmed bookings use the dedicated admin Proforma endpoint', () => {
  assert.match(routeSource, /router\.get\('\/bookings\/:id\/proforma-pdf', authorize\('admin'\), generateProformaInvoicePDF\)/);
  assert.match(quotationListPage, /\(role === 'admin' \|\| role === 'superadmin'\) && trip\.status === 'Confirmed'/);
  assert.match(quotationListPage, /class="btn-action btn-action-save proforma-btn"/);
  assert.doesNotMatch(quotationListPage, /class="btn-action btn-action-save print-btn proforma-btn"/);
  assert.match(quotationListPage, /\/api\/v1\/bookings\/\$\{tripId\}\/proforma-pdf/);
  assert.match(bookingListPage, /trip\.status === "Confirmed"/);
  assert.match(bookingListPage, /class="btn table-action-btn proforma-btn"/);
  assert.match(bookingListPage, /\/api\/v1\/bookings\/\$\{tripId\}\/proforma-pdf/);
  assert.doesNotMatch(bookingListPage, /class="btn table-action-btn invoice-btn"/);
  assert.doesNotMatch(bookingListPage, /summary-btn notify-agent-btn/);
});

test('tax invoice pages retain the application shell and protect direct editor access', () => {
  for (const source of [taxInvoiceListPage, taxInvoiceEditorPage]) {
    assert.match(source, /<body class="nav-md">/);
    assert.match(source, /class="container body"/);
    assert.match(source, /id="sidebar-menu"/);
    assert.match(source, /class="top_nav"/);
    assert.match(source, /class="right_col" role="main"/);
    assert.match(source, /js\/common\/sidebar-profile\.js/);
    assert.doesNotMatch(source, /js\/profile\.js/);
    assert.match(source, /js\/common\/role-permissions\.js/);
  }

  assert.match(taxInvoiceEditorPage, /@media print[\s\S]*\.left_col, \.top_nav, \.sidebar-footer/);
  assert.match(rolePermissionsSource, /"tax_invoice_editor\.html": "tax_invoices"/);
});

test('tax invoice editor uses the Proforma document structure and correct document prefixes', () => {
  assert.match(taxInvoiceEditorPage, /Use the same document language as the Proforma Invoice/);
  assert.match(taxInvoiceEditorSource, /PASSENGER INFORMATION/);
  assert.match(taxInvoiceEditorSource, /Descriptions of Service/);
  assert.match(taxInvoiceEditorSource, /class="passenger-section"/);
  assert.match(taxInvoiceEditorSource, /class="amount-section"/);
  assert.match(taxInvoiceEditorSource, /VAT Taxable Amount/);
  assert.match(taxInvoiceEditorSource, /original_receipt_transportation: 'ORT'/);
  assert.match(taxInvoiceEditorSource, /tax_invoice_hotel: 'TIH'/);
  assert.match(taxInvoiceEditorSource, /VAT 7%/);
  assert.match(taxInvoiceEditorSource, /ADV \(Non-VAT\)/);
  assert.match(taxInvoiceEditorSource, /VAT 7% \+ ADV \(manual split\)/);
  assert.match(taxInvoiceEditorSource, /validateTreatmentSelection/);
  assert.match(taxInvoiceEditorPage, /Open PDF \/ Print/);
});

test('tax invoice list exposes the three required downloadable documents', () => {
  const taxInvoiceListSource = readFileSync(resolve(rootDirectory, 'frontend-main/production/js/tax_invoices/tax_invoices.js'), 'utf8');
  assert.match(taxInvoiceListSource, /original_tax_invoice/);
  assert.match(taxInvoiceListSource, /tax_invoice/);
  assert.match(taxInvoiceListSource, /original_receipt_transportation/);
  assert.match(taxInvoiceListPage, /Tax Settings/);
  assert.match(taxInvoiceListSource, /Complete Tax Settings to unlock the 3 document previews/);
  assert.match(taxInvoiceEditorSource, /defaultTreatmentFor/);
  assert.match(taxInvoiceEditorSource, /data-treatment-option="vat"/);
  assert.match(taxInvoiceEditorSource, /data-treatment-option="adv"/);
  assert.match(taxInvoiceEditorSource, /data-vat-base/);
  assert.match(taxInvoiceEditorSource, /VAT Taxable Amount/);
  assert.match(taxInvoiceEditorSource, /treatmentFromFlags/);
  assert.match(taxInvoiceEditorSource, /vatSelected = treatment === 'vat' \|\| treatment === 'split'/);
  assert.match(taxInvoiceEditorSource, /advSelected = treatment === 'adv' \|\| treatment === 'split'/);
  assert.doesNotMatch(taxInvoiceListSource, /type: 'tax_invoice_hotel'/);
});
