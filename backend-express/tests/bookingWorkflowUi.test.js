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
const statementPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/payment.html'), 'utf8');
const builtSidebarSource = readFileSync(resolve(rootDirectory, 'frontend-main/build/js/custom.js'), 'utf8');
const minifiedSidebarSource = readFileSync(resolve(rootDirectory, 'frontend-main/build/js/custom.min.js'), 'utf8');
const sidebarSource = readFileSync(resolve(rootDirectory, 'frontend-main/src/js/custom.js'), 'utf8');
const proformaPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/invoice_management.html'), 'utf8');
const proformaSource = readFileSync(resolve(rootDirectory, 'frontend-main/production/js/invoice_management/invoice_management.js'), 'utf8');
const taxInvoiceListPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/tax_invoices.html'), 'utf8');
const taxInvoiceEditorPage = readFileSync(resolve(rootDirectory, 'frontend-main/production/tax_invoice_editor.html'), 'utf8');
const taxInvoiceEditorSource = readFileSync(resolve(rootDirectory, 'frontend-main/production/js/tax_invoices/tax_invoice_editor.js'), 'utf8');
const taxInvoiceControllerSource = readFileSync(resolve(rootDirectory, 'backend-express/src/controllers/taxInvoiceController.js'), 'utf8');
const tripControllerSource = readFileSync(resolve(rootDirectory, 'backend-express/src/controllers/tripController.js'), 'utf8');
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

test('statement page keeps the Statement label after navigation', () => {
  assert.match(statementPage, /<title>Statement<\/title>/);
  assert.match(statementPage, /<h3>Statement<\/h3>/);
  assert.match(statementPage, /<h2>Statement Records<\/h2>/);
  assert.match(statementPage, /js\/common\/sidebar-control\.js\?v=/);
  assert.match(statementPage, /href="payment\.html"[\s\S]{0,120}>[\s\S]{0,80}Statement/);
  assert.doesNotMatch(statementPage, /href="payment\.html"[\s\S]{0,120}>[\s\S]{0,80}\bPayments?\b/);
  assert.doesNotMatch(statementPage, /<h3>Payments<\/h3>/);
  for (const source of [builtSidebarSource, minifiedSidebarSource, sidebarSource]) {
    assert.match(source, /href="payment\.html"><i class="fa fa-pencil-square-o"><\/i> Statement<\/a>/);
    assert.doesNotMatch(source, /href="payment\.html"><i class="fa fa-pencil-square-o"><\/i> Payments?<\/a>/);
  }
});

test('statement page provides monthly agent selection, print, and default email actions', () => {
  assert.match(statementPage, /id="statementAgent"/);
  assert.match(statementPage, /id="statementMonth"/);
  assert.match(statementPage, /id="selectAllStatements"/);
  assert.match(statementPage, /id="printStatementBtn"/);
  assert.match(statementPage, /id="emailStatementBtn"/);
  assert.match(statementPage, /id="emailStatementModal"/);
  assert.match(statementPage, /function buildStatementContent\(payments\)/);
  assert.match(statementPage, /function openStatementPrint\(payments\)/);
  assert.match(statementPage, /function openStatementEmail\(payments\)/);
  assert.match(statementPage, /function statementPaymentsForAgent\(payment\)/);
  assert.match(statementPage, /<th style="min-width: 140px">Actions<\/th>/);
  assert.match(statementPage, /Update payment amount, received date, and reference/);
  assert.match(statementPage, /id="editPaymentDate"/);
  assert.match(statementPage, /Payment Received Date is required when an amount has been received/);
  assert.match(statementPage, /\/api\/v1\/bookings\/\$\{paymentId\}\/payment/);
  assert.match(statementPage, /Email this agent's matching statement/);
  assert.match(statementPage, /const payments = activeStatementPayments/);
  assert.match(statementPage, /payment\.payment_deadline \|\| payment\.booking_date/);
  assert.match(statementPage, /\/api\/v1\/email\/send/);
  assert.match(statementPage, /Statement of Account - \$\{period\} - VeraThailandia/);
  assert.match(statementPage, /Proforma \/ File/);
  assert.match(statementPage, /Payment Deadline/);
  assert.match(statementPage, /Outstanding/);
});

test('confirmed booking payment records expose the agent and invoice details needed by statements', () => {
  assert.match(tripControllerSource, /const where = \{ status: 'Confirmed' \}/);
  assert.doesNotMatch(tripControllerSource, /const where = \{ approved: true, status: 'Confirmed' \}/);
  assert.match(tripControllerSource, /agent_email: trip\.agents\?\.email \|\| ''/);
  assert.match(tripControllerSource, /agent_address: trip\.agents\?\.address \|\| ''/);
  assert.match(tripControllerSource, /file_number: trip\.file_reference \|\| trip\.booking_reference \|\| ''/);
  assert.match(tripControllerSource, /proforma_invoice_number: trip\.invoice_number \|\| ''/);
  assert.match(tripControllerSource, /agents: \{ select: \{ id: true, name: true, email: true, address: true, telephone: true \} \}/);
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

test('confirmed bookings open the single Proforma preview implementation', () => {
  assert.match(routeSource, /router\.get\('\/bookings\/:id\/proforma-pdf', authorize\('admin'\), generateProformaInvoicePDF\)/);
  assert.match(quotationListPage, /\(role === 'admin' \|\| role === 'superadmin'\) && trip\.status === 'Confirmed'/);
  assert.match(quotationListPage, /class="btn-action btn-action-save proforma-btn"/);
  assert.doesNotMatch(quotationListPage, /class="btn-action btn-action-save print-btn proforma-btn"/);
  assert.match(quotationListPage, /invoice_management\.html\?preview=\$\{encodeURIComponent\(tripId\)\}/);
  assert.doesNotMatch(quotationListPage, /\/api\/v1\/bookings\/\$\{tripId\}\/proforma-pdf/);
  assert.match(bookingListPage, /trip\.status === "Confirmed"/);
  assert.match(bookingListPage, /class="btn table-action-btn proforma-btn"/);
  assert.match(bookingListPage, /invoice_management\.html\?preview=\$\{encodeURIComponent\(tripId\)\}/);
  assert.doesNotMatch(bookingListPage, /\/api\/v1\/bookings\/\$\{tripId\}\/proforma-pdf/);
  assert.doesNotMatch(bookingListPage, /class="btn table-action-btn invoice-btn"/);
  assert.doesNotMatch(bookingListPage, /summary-btn notify-agent-btn/);
});

test('Proforma page is booking-driven and contains no legacy manual invoice form', () => {
  assert.match(proformaPage, /<title>Proforma Invoices<\/title>/);
  assert.match(proformaPage, /> Proforma Invoice/);
  assert.match(proformaPage, /id="refreshInvoicesBtn"/);
  assert.match(proformaPage, /js\/common\/sidebar-control\.js/);
  assert.doesNotMatch(proformaPage, /id="invoiceModal"/);
  assert.doesNotMatch(proformaPage, /Add New Invoice/);
  assert.doesNotMatch(proformaPage, /GST Amount/);
  assert.doesNotMatch(proformaSource, /saveInvoiceOnly|generatePdfOnly|localStorage\.setItem\('invoices'/);
  assert.match(proformaSource, /String\(booking\.status \|\| ""\)\.toLowerCase\(\) === "confirmed"/);
  assert.match(proformaSource, /renderDirectProformaPreview/);
  assert.match(proformaSource, /new URLSearchParams\(window\.location\.search\)\.get\('preview'\)/);
  assert.doesNotMatch(proformaSource, /onclick="generateInvoicePDF/);
  assert.match(proformaSource, /Tel \+66 2126 6914 \| Email: info@verathailandia\.com/);
  assert.match(proformaSource, /<span>Total:<\/span>/);
  assert.match(proformaPage, /id="invoicePagination"/);
  assert.match(proformaPage, /id="previousPageBtn"/);
  assert.match(proformaPage, /id="nextPageBtn"/);
  assert.match(proformaSource, /Start date must be on or before the end date/);
  assert.match(proformaSource, /bookingDate >= currentDateRange\.start && bookingDate <= currentDateRange\.end/);
  assert.match(proformaSource, /indicator\.textContent = `Page \$\{currentPage\} of \$\{totalPages\}`/);
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
  assert.match(taxInvoiceEditorSource, /ORIGINAL RECEIPT TRANSPORTATION/);
  assert.match(taxInvoiceEditorSource, /บริษัท เวร่าไทยลานเดีย จำกัด/);
  assert.match(taxInvoiceEditorSource, /อาคารไอทีเอฟ สีลมพาเลส ชั้น 20/);
  assert.match(taxInvoiceEditorSource, /ทะเบียนเลขที่ \| Tax ID/);
  assert.match(taxInvoiceEditorSource, /ใบอนุญาตประกอบธุรกิจนำเที่ยวเลขที่ \| TAT License number/);
  assert.match(taxInvoiceEditorSource, /original_receipt_transportation: \{ title: 'ORIGINAL RECEIPT TRANSPORTATION', allowed: \['transfer', 'excursion', 'tour'\]/);
  assert.match(taxInvoiceEditorSource, /documentType === 'original_receipt_transportation'[\s\S]*document_adv \?\? row\.adv/);
  assert.match(taxInvoiceEditorSource, /ROOMING LIST DETAILS:/);
  assert.match(taxInvoiceEditorSource, /DESCRIPTION OF SERVICES:/);
  assert.match(taxInvoiceEditorSource, /buildPrintableDocument/);
  assert.match(taxInvoiceEditorSource, /printDocumentStyles/);
  assert.match(taxInvoiceEditorSource, /VAT 7% \(Automatic\)/);
  assert.match(taxInvoiceEditorSource, /validateTreatmentSelection/);
  assert.match(taxInvoiceEditorSource, /BILLED TO/);
  assert.doesNotMatch(taxInvoiceEditorSource, /PAYMENT \/ BANK ACCOUNT/);
  assert.doesNotMatch(taxInvoiceEditorSource, /COMPANY\.bank/);
  assert.match(taxInvoiceEditorSource, /Client Name\(s\)<\/td><td>\$\{escapeHtml\(booking\.client_name \|\| '-'\)\}<\/td><td class="passenger-label">Invoice Nr\./);
  assert.doesNotMatch(taxInvoiceEditorSource, /<tr><td class="passenger-label">Agent Name/);
  assert.doesNotMatch(taxInvoiceEditorSource, /<tr><td class="passenger-label">Address/);
  assert.match(taxInvoiceEditorPage, /Open PDF \/ Print/);
  assert.match(taxInvoiceEditorSource, /!\[ORIGINAL_DOCUMENT_TYPE, 'tax_invoice', 'original_receipt_transportation'\]\.includes\(documentType\)/);
  assert.match(taxInvoiceEditorSource, /Save WHT Selection/);
  assert.match(taxInvoiceEditorSource, /Save WHT 1% Selection/);
  assert.match(taxInvoiceEditorSource, /Apply \$\{documentType === 'original_receipt_transportation' \? '1%' : '3%'\} Withholding Tax to this service line/);
  assert.match(taxInvoiceEditorSource, /1% of ADV \(Non-VAT\)/);
  assert.match(taxInvoiceEditorSource, /type === 'original_receipt_transportation' \? TRANSPORT_WHT_RATE : WHT_RATE/);
  assert.match(taxInvoiceEditorSource, /WHT 1%/);
  assert.match(taxInvoiceEditorSource, /row\.wht_selected/);
  assert.match(taxInvoiceEditorSource, /3% of VAT Taxable Amount/);
  assert.match(taxInvoiceEditorSource, /row\.wht_selected \? formatAmount\(row\.withholding_tax\) : ''/);
  assert.doesNotMatch(taxInvoiceEditorSource, /row\.wht_selected \? formatAmount\(row\.withholding_tax\) : '-'/);
  assert.match(taxInvoiceEditorSource, /row\.type === 'transfer' \? 'Car Fee:' : 'ADV \(Non-VAT\):'/);
  assert.match(taxInvoiceEditorSource, /class="print-billed-title">BILLED TO/);
  assert.match(taxInvoiceEditorSource, /bookingInvoiceNumber = booking\.invoice_number \|\| '-'/);
  assert.match(taxInvoiceEditorSource, /taxDocumentLabel = documentType === 'original_receipt_transportation' \? 'RECEIPT N°:' : 'TAX INVOICE N°:'/);
});

test('tax invoice list exposes the five required downloadable documents', () => {
  const taxInvoiceListSource = readFileSync(resolve(rootDirectory, 'frontend-main/production/js/tax_invoices/tax_invoices.js'), 'utf8');
  assert.match(taxInvoiceListSource, /original_tax_invoice/);
  assert.match(taxInvoiceListSource, /tax_invoice/);
  assert.match(taxInvoiceListSource, /original_receipt_transportation/);
  assert.match(taxInvoiceListSource, /local_operator_original_tax_invoice/);
  assert.match(taxInvoiceListSource, /local_operator_copy_tax_invoice/);
  assert.match(taxInvoiceListPage, /Tax Settings/);
  assert.match(taxInvoiceListSource, /Complete Tax Settings to unlock the 5 document previews/);
  assert.doesNotMatch(taxInvoiceEditorSource, /defaultTreatmentFor/);
  assert.doesNotMatch(taxInvoiceEditorSource, /data-treatment-option="vat"/);
  assert.doesNotMatch(taxInvoiceEditorSource, /data-treatment-option="adv"/);
  assert.doesNotMatch(taxInvoiceEditorSource, /data-vat-base/);
  assert.match(taxInvoiceEditorSource, /data-adv-toggle/);
  assert.match(taxInvoiceEditorSource, /VAT Taxable Amount/);
  assert.doesNotMatch(taxInvoiceEditorSource, /treatmentFromFlags/);
  assert.match(taxInvoiceEditorSource, /VAT 7% applies automatically to every selected service/);
  assert.match(taxInvoiceEditorSource, /usesRemainingAmountVat/);
  assert.match(taxInvoiceEditorSource, /ADV is deducted first; VAT 7% is calculated from the remaining amount/);
  assert.doesNotMatch(taxInvoiceListSource, /type: 'tax_invoice_hotel'/);
  assert.match(taxInvoiceControllerSource, /return bookingConfirmed\(booking\)/);
  assert.match(taxInvoiceControllerSource, /prisma\.\$transaction\(async \(transaction\)/);
  assert.match(taxInvoiceEditorSource, /ORIGINAL TAX INVOICE - LOCAL OPERATOR/);
  assert.match(taxInvoiceEditorSource, /COPY TAX INVOICE - LOCAL OPERATOR/);
  assert.match(taxInvoiceEditorSource, /Less 3% Withholding Tax/);
  assert.match(taxInvoiceEditorSource, /usesSelectiveWithholding\(documentType\) && rows\.some\(\(row\) => row\.wht_selected\)/);
  assert.match(taxInvoiceEditorSource, /selection saved successfully/);
  assert.match(taxInvoiceEditorSource, /withholding_tax_base \* withholdingRate/);
  assert.match(taxInvoiceEditorSource, /amount_payable = round\(Math\.max\(0, roundedTotals\.invoice_total - roundedTotals\.withholding_tax\)\)/);
  assert.match(taxInvoiceControllerSource, /withholdingTaxBase \* withholdingRate/);
  assert.match(taxInvoiceControllerSource, /original_receipt_transportation' \? TRANSPORT_WHT_RATE : WHT_RATE/);
});
