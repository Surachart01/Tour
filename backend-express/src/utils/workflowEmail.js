import transporter, { getTransporterForRole, SENDER_ROLES } from './smtpTransporter.js';
import { buildEmailFooter, buildEmailFooterText, getLogoAttachment } from './emailFooter.js';

export function escapeWorkflowHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function workflowDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function reservationFromAddress() {
  return process.env.SMTP_RESERVATION_FROM ||
    process.env.RESERVATION_EMAIL_FROM ||
    process.env.SMTP_FROM ||
    'VeraThailandia Reservations <reservation@verathailandia.com>';
}

export function bookingFromAddress() {
  return process.env.SMTP_BOOKING_FROM ||
    process.env.BOOKING_EMAIL_FROM ||
    process.env.SMTP_FROM ||
    'VeraThailandia Bookings <booking@verathailandia.com>';
}

export async function sendWorkflowEmail({ from, to, subject, text, html, role = SENDER_ROLES.RESERVATION }) {
  if (!to && !process.env.TEST_EMAIL_RECIPIENT) {
    return { sent: false, prepared: false, reason: 'recipient_missing' };
  }

  const targetTo = process.env.TEST_EMAIL_RECIPIENT || to;
  const targetSubject = process.env.TEST_EMAIL_RECIPIENT
    ? `[TEST MODE -> To: ${to}] ${subject}`
    : subject;

  const hasConfiguredPass = (process.env.SMTP_PASS && process.env.SMTP_PASS !== 'YOUR_INFO_EMAIL_PASSWORD_HERE') ||
    (process.env.SMTP_PASS_INFO && process.env.SMTP_PASS_INFO !== 'YOUR_INFO_EMAIL_PASSWORD_HERE') ||
    (process.env.SMTP_PASS_RESERVATION && process.env.SMTP_PASS_RESERVATION !== 'YOUR_RESERVATION_EMAIL_PASSWORD_HERE') ||
    (process.env.SMTP_PASS_BOOKING && process.env.SMTP_PASS_BOOKING !== 'YOUR_BOOKING_EMAIL_PASSWORD_HERE');

  if (!hasConfiguredPass) {
    console.warn(`[EMAIL SKIPPED] SMTP Passwords are not configured yet in .env. Intended email: [${targetSubject}] to [${targetTo}]`);
    return {
      sent: false,
      prepared: true,
      reason: 'smtp_not_configured',
      preview: { from, to: targetTo, subject: targetSubject, text, html }
    };
  }

  const activeTransporter = getTransporterForRole(role);
  const logoAtt = getLogoAttachment();
  const mailAttachments = logoAtt ? [logoAtt] : [];

  try {
    await activeTransporter.sendMail({ from, to: targetTo, subject: targetSubject, text, html, attachments: mailAttachments });
    console.log(`[EMAIL SENT SUCCESS] Subject: [${targetSubject}] -> Sent to: [${targetTo}]`);
    return { sent: true, prepared: true, to: targetTo };
  } catch (error) {
    console.error(`[EMAIL SEND FAILED] Subject: [${targetSubject}] Error:`, error.message);
    return {
      sent: false,
      prepared: true,
      reason: 'send_failed',
      error: error.message,
      preview: { from, to: targetTo, subject: targetSubject, text, html }
    };
  }
}

function bookingSummaryRows(trip) {
  const rows = [
    ['File Number', trip.file_reference || '-'],
    ['Booking Reference', trip.booking_reference || `BK-${trip.id}`],
    ['Client Name', trip.client_name || '-'],
    ['Trip Start Date', workflowDate(trip.trip_start_date)],
    ['Pax', Number(trip.number_of_adults || 0) + Number(trip.number_of_kids || 0)]
  ];

  if (trip.invoice_number) rows.push(['Proforma Number', trip.invoice_number]);
  return rows;
}

function renderSummaryTable(rows) {
  return `
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe5ec;">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="padding:9px 12px;background:#f8fafc;border-bottom:1px solid #e5e7eb;font-weight:700;width:190px;">${escapeWorkflowHtml(label)}</td>
          <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;">${escapeWorkflowHtml(value)}</td>
        </tr>`).join('')}
    </table>`;
}

function serviceSections(trip) {
  const sections = [];
  const pushSection = (title, rows) => {
    if (!rows.length) return;
    sections.push(`
      <h3 style="margin:22px 0 8px;color:#0f766e;">${title}</h3>
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #dbe5ec;">
        ${rows.map((row) => `<tr><td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;">${row}</td></tr>`).join('')}
      </table>`);
  };

  pushSection('Hotels', (trip.hotel_trip_items || []).map((item) =>
    `<strong>${escapeWorkflowHtml(item.hotel_name || item.hotels?.name || 'Hotel')}</strong> · ${escapeWorkflowHtml(item.room_type || 'Room')} · ${workflowDate(item.from_date)} to ${workflowDate(item.to_date)}`
  ));
  pushSection('Transfers', (trip.transfer_trip_items || []).map((item) =>
    `<strong>${workflowDate(item.from_date)}</strong> · ${escapeWorkflowHtml(item.from_location || '-')} to ${escapeWorkflowHtml(item.to_location || '-')} ${item.flight_number ? `· Flight ${escapeWorkflowHtml(item.flight_number)}` : ''}`
  ));
  pushSection('Excursions', (trip.excursion_trip_items || []).map((item) =>
    `<strong>${workflowDate(item.from_date)}</strong> · ${escapeWorkflowHtml(item.excursions?.name || 'Excursion')} · ${escapeWorkflowHtml(item.city || '')}`
  ));
  pushSection('Tours', (trip.tour_trip_items || []).map((item) =>
    `<strong>${workflowDate(item.from_date)} to ${workflowDate(item.to_date)}</strong> · ${escapeWorkflowHtml(item.tours?.name || 'Tour')}`
  ));

  return sections.join('');
}

export function buildBookingGenerationEmail(trip) {
  const agentName = trip.agents?.name || 'Agent';
  const subject = `Booking Generation Request - ${trip.file_reference || trip.booking_reference || trip.id}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#1f2937;line-height:1.55;">
      <h2 style="color:#0f766e;">Booking Generation Request</h2>
      <p>Dear ${escapeWorkflowHtml(agentName)},</p>
      <p style="margin-bottom:8px;">Your quotation has been converted into a booking and is now <strong>In Progress</strong>.</p>
      <p style="margin-top:0;margin-bottom:16px;">Our reservation team will contact the suppliers and update you when every service is confirmed.</p>
      ${renderSummaryTable(bookingSummaryRows(trip))}
      ${buildEmailFooter({ senderName: 'Verathailandia Reservations Team', senderEmail: 'reservation@verathailandia.com', salutation: 'Best regards,' })}
    </div>`;
  const text = [
    `Dear ${agentName},`,
    '',
    'Your quotation has been converted into a booking and is now In Progress.',
    `File Number: ${trip.file_reference || '-'}`,
    `Client Name: ${trip.client_name || '-'}`,
    `Trip Start Date: ${workflowDate(trip.trip_start_date)}`,
    buildEmailFooterText({ senderName: 'Verathailandia Reservations Team', senderEmail: 'reservation@verathailandia.com', salutation: 'Best regards,' })
  ].join('\n');
  return { subject, html, text };
}

export async function sendBookingGenerationRequest(trip) {
  const email = buildBookingGenerationEmail(trip);
  return sendWorkflowEmail({
    from: reservationFromAddress(),
    to: trip.agents?.email,
    ...email
  });
}

export function buildFinalBookingEmail(trip) {
  const agentName = trip.agents?.name || 'Agent';
  const subject = `Booking Confirmed - ${trip.file_reference || trip.booking_reference || trip.id}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:auto;color:#1f2937;line-height:1.55;">
      <h2 style="color:#15803d;">Booking Confirmed</h2>
      <p>Dear ${escapeWorkflowHtml(agentName)},</p>
      <p>All required services have been confirmed. The booking is now complete and its Proforma Invoice is available in the system.</p>
      ${renderSummaryTable(bookingSummaryRows(trip))}
      ${serviceSections(trip)}
      ${buildEmailFooter({ senderName: 'Verathailandia Reservations Team', senderEmail: 'reservation@verathailandia.com', salutation: 'Best regards,' })}
    </div>`;
  const text = [
    `Dear ${agentName},`,
    '',
    'All required services have been confirmed.',
    `File Number: ${trip.file_reference || '-'}`,
    `Proforma Number: ${trip.invoice_number || '-'}`,
    `Client Name: ${trip.client_name || '-'}`,
    buildEmailFooterText({ senderName: 'Verathailandia Reservations Team', senderEmail: 'reservation@verathailandia.com', salutation: 'Best regards,' })
  ].join('\n');
  return { subject, html, text };
}

export async function sendFinalBookingConfirmation(trip) {
  const email = buildFinalBookingEmail(trip);
  return sendWorkflowEmail({
    from: reservationFromAddress(),
    to: trip.agents?.email,
    ...email
  });
}

