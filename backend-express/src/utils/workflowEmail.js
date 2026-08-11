import transporter, { getTransporterForRole, SENDER_ROLES } from './smtpTransporter.js';
import { buildEmailFooter, buildEmailFooterText, getLogoAttachment } from './emailFooter.js';
import prisma from '../config/db.js';
import { ensureWorkflowEmailSchema } from './schemaMaintenance.js';

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

export function bookingGenerationOfficeCc() {
  return process.env.BOOKING_GENERATION_CC ||
    process.env.RESERVATION_OFFICE_EMAIL ||
    'reservation@verathailandia.com';
}

export function bookingGenerationAuditBcc() {
  return process.env.BOOKING_GENERATION_AUDIT_BCC ||
    process.env.WORKFLOW_AUDIT_BCC ||
    undefined;
}

function emailListForLog(value) {
  if (!value) return null;
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value);
}

async function recordWorkflowEmailAttempt({
  tripId,
  eventType,
  to,
  cc,
  bcc,
  subject,
  deliveryStatus,
  failureReason,
  errorMessage
}) {
  if (!eventType) return;

  try {
    await ensureWorkflowEmailSchema();
    await prisma.$executeRaw`
      INSERT INTO workflow_email_log (
        trip_id, event_type, to_email, cc_email, bcc_email, subject,
        delivery_status, failure_reason, error_message
      ) VALUES (
        ${tripId || null}, ${eventType}, ${emailListForLog(to)},
        ${emailListForLog(cc)}, ${emailListForLog(bcc)}, ${subject},
        ${deliveryStatus}, ${failureReason || null}, ${errorMessage || null}
      )
    `;
  } catch (error) {
    console.error('[EMAIL LOG FAILED]', error.message);
  }
}

export async function sendWorkflowEmail({
  from,
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  role = SENDER_ROLES.RESERVATION,
  tripId = null,
  eventType = null
}) {
  if (!to && !process.env.TEST_EMAIL_RECIPIENT) {
    await recordWorkflowEmailAttempt({
      tripId, eventType, to, cc, bcc, subject,
      deliveryStatus: 'skipped',
      failureReason: 'recipient_missing'
    });
    return { sent: false, prepared: false, reason: 'recipient_missing' };
  }

  const targetTo = process.env.TEST_EMAIL_RECIPIENT || to;
  const targetCc = process.env.TEST_EMAIL_RECIPIENT ? undefined : cc;
  const targetBcc = process.env.TEST_EMAIL_RECIPIENT ? undefined : bcc;
  const targetSubject = process.env.TEST_EMAIL_RECIPIENT
    ? `[TEST MODE -> To: ${to}] ${subject}`
    : subject;

  const hasConfiguredPass = (process.env.SMTP_PASS && process.env.SMTP_PASS !== 'YOUR_INFO_EMAIL_PASSWORD_HERE') ||
    (process.env.SMTP_PASS_INFO && process.env.SMTP_PASS_INFO !== 'YOUR_INFO_EMAIL_PASSWORD_HERE') ||
    (process.env.SMTP_PASS_RESERVATION && process.env.SMTP_PASS_RESERVATION !== 'YOUR_RESERVATION_EMAIL_PASSWORD_HERE') ||
    (process.env.SMTP_PASS_BOOKING && process.env.SMTP_PASS_BOOKING !== 'YOUR_BOOKING_EMAIL_PASSWORD_HERE');

  if (!hasConfiguredPass) {
    console.warn(`[EMAIL SKIPPED] SMTP Passwords are not configured yet in .env. Intended email: [${targetSubject}] to [${targetTo}]`);
    const result = {
      sent: false,
      prepared: true,
      reason: 'smtp_not_configured',
      preview: { from, to: targetTo, cc: targetCc, bcc: targetBcc, subject: targetSubject, text, html }
    };
    await recordWorkflowEmailAttempt({
      tripId, eventType, to: targetTo, cc: targetCc, bcc: targetBcc,
      subject: targetSubject,
      deliveryStatus: 'skipped',
      failureReason: result.reason
    });
    return result;
  }

  const activeTransporter = getTransporterForRole(role);
  const logoAtt = getLogoAttachment();
  const mailAttachments = logoAtt ? [logoAtt] : [];

  try {
    await activeTransporter.sendMail({
      from,
      to: targetTo,
      cc: targetCc,
      bcc: targetBcc,
      subject: targetSubject,
      text,
      html,
      attachments: mailAttachments
    });
    console.log(`[EMAIL SENT SUCCESS] Subject: [${targetSubject}] -> Sent to: [${targetTo}] CC: [${targetCc || '-'}]`);
    await recordWorkflowEmailAttempt({
      tripId, eventType, to: targetTo, cc: targetCc, bcc: targetBcc,
      subject: targetSubject,
      deliveryStatus: 'sent'
    });
    return { sent: true, prepared: true, to: targetTo, cc: targetCc };
  } catch (error) {
    console.error(`[EMAIL SEND FAILED] Subject: [${targetSubject}] Error:`, error.message);
    const result = {
      sent: false,
      prepared: true,
      reason: 'send_failed',
      error: error.message,
      preview: { from, to: targetTo, cc: targetCc, bcc: targetBcc, subject: targetSubject, text, html }
    };
    await recordWorkflowEmailAttempt({
      tripId, eventType, to: targetTo, cc: targetCc, bcc: targetBcc,
      subject: targetSubject,
      deliveryStatus: 'failed',
      failureReason: result.reason,
      errorMessage: result.error
    });
    return result;
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

function formatEmailItemDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${months[d.getMonth()]}`;
}

function renderQuotationItemsTable(trip) {
  const items = [];
  const paxCount = Number(trip.number_of_adults || 0) + Number(trip.number_of_kids || 0);

  (trip.hotel_trip_items || []).forEach(h => {
    const fromDateStr = formatEmailItemDate(h.from_date);
    const toDateStr = formatEmailItemDate(h.to_date);
    const periodStr = (fromDateStr !== '-' && toDateStr !== '-') ? `${fromDateStr} ${toDateStr}` : fromDateStr;

    items.push({
      date: h.from_date,
      period: periodStr,
      location: h.city || '-',
      service: 'Overnight',
      hotel: h.hotel_name || h.hotels?.name || '-',
      room: h.room_type || '-',
      pax: paxCount || '-',
      nights: h.nights || '-',
      website: h.hotels?.website || '',
      price: h.total_price ? parseFloat(h.total_price) : 0
    });
  });

  (trip.excursion_trip_items || []).forEach(e => {
    items.push({
      date: e.from_date,
      period: `${formatEmailItemDate(e.from_date)} -`,
      location: e.city || '-',
      service: e.excursion_name || e.excursions?.name || 'Excursion',
      hotel: '-',
      room: '-',
      pax: paxCount || '-',
      nights: '-',
      website: '',
      price: e.price ? parseFloat(e.price) : 0
    });
  });

  (trip.tour_trip_items || []).forEach(t => {
    items.push({
      date: t.from_date,
      period: `${formatEmailItemDate(t.from_date)} -`,
      location: t.from_location || '-',
      service: t.tours?.name || 'Tour',
      hotel: '-',
      room: '-',
      pax: paxCount || '-',
      nights: '-',
      website: '',
      price: t.price ? parseFloat(t.price) : 0
    });
  });

  (trip.transfer_trip_items || []).forEach(t => {
    items.push({
      date: t.from_date,
      period: `${formatEmailItemDate(t.from_date)} -`,
      location: t.city || '-',
      service: t.transfer_description || (t.from_location && t.to_location ? `${t.from_location} → ${t.to_location}` : 'Transfer'),
      hotel: '-',
      room: '-',
      pax: paxCount || '-',
      nights: '-',
      website: '',
      price: t.price ? parseFloat(t.price) : 0
    });
  });

  (trip.flight_trip_items || []).forEach(f => {
    items.push({
      date: f.from_date,
      period: `${formatEmailItemDate(f.from_date)} -`,
      location: '-',
      service: f.flight_number ? `Flight: ${f.flight_number}` : 'Flight',
      hotel: '-',
      room: '-',
      pax: paxCount || '-',
      nights: '-',
      website: '',
      price: f.price ? parseFloat(f.price) : 0
    });
  });

  (trip.other_trip_items || []).forEach(o => {
    items.push({
      date: o.from_date,
      period: `${formatEmailItemDate(o.from_date)} -`,
      location: '-',
      service: o.others?.name || o.service_name || 'Service',
      hotel: '-',
      room: '-',
      pax: paxCount || '-',
      nights: '-',
      website: '',
      price: o.price ? parseFloat(o.price) : 0
    });
  });

  if (!items.length) return '';

  items.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(a.date) - new Date(b.date);
  });

  const startDate = items.find(i => i.date)?.date || trip.trip_start_date || new Date();
  const monthYearTitle = new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
  const headerTitle = `${monthYearTitle} - STANDARD CATEGORY`;

  const totalCost = trip.total_amount ? parseFloat(trip.total_amount) : items.reduce((acc, i) => acc + (i.price || 0), 0);
  const discount = trip.discount_amount ? parseFloat(trip.discount_amount) : 0;
  const finalCost = trip.final_amount ? parseFloat(trip.final_amount) : (totalCost - discount);

  const tableRows = items.map(item => {
    const websiteCell = item.website
      ? `<a href="${item.website.startsWith('http') ? item.website : 'https://' + item.website}" target="_blank" style="color: #2980b9; text-decoration: underline;">${escapeWorkflowHtml(item.website.replace(/^https?:\/\//, ''))}</a>`
      : '-';

    return `
      <tr style="border: 1px solid #000;">
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; white-space: nowrap;">${escapeWorkflowHtml(item.period)}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${escapeWorkflowHtml(item.location)}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: left;">${escapeWorkflowHtml(item.service)}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: left;">${escapeWorkflowHtml(item.hotel)}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: left;">${escapeWorkflowHtml(item.room)}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${item.pax}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center;">${item.nights}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: center; font-size: 10px; word-break: break-all;">${websiteCell}</td>
        <td style="border: 1px solid #000; padding: 6px 4px; text-align: right; white-space: nowrap;">${item.price > 0 ? 'THB ' + Number(item.price).toLocaleString('en-US') : '-'}</td>
      </tr>
    `;
  }).join('');

  let totalRowsHtml = `
    <tr style="border: 1px solid #000; font-weight: bold; background-color: #ffffff;">
      <td colspan="8" style="border: 1px solid #000; padding: 8px; text-align: right;">Total Price</td>
      <td style="border: 1px solid #000; padding: 8px; text-align: right; white-space: nowrap;">THB ${Number(totalCost).toLocaleString('en-US')}</td>
    </tr>
  `;
  if (discount > 0) {
    totalRowsHtml += `
      <tr style="border: 1px solid #000; font-weight: bold; background-color: #ffffff;">
        <td colspan="8" style="border: 1px solid #000; padding: 8px; text-align: right; color: #c0392b;">Discount</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right; white-space: nowrap; color: #c0392b;">-THB ${Number(discount).toLocaleString('en-US')}</td>
      </tr>
      <tr style="border: 1px solid #000; font-weight: bold; background-color: #fff9e6;">
        <td colspan="8" style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 13px; color: #d35400;">Final Price</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right; white-space: nowrap; font-size: 13px; color: #d35400;">THB ${Number(finalCost).toLocaleString('en-US')}</td>
      </tr>
    `;
  }

  return `
    <div style="margin: 20px 0; overflow-x: auto;">
      <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4;">
        <thead>
          <tr style="background-color: #000000; color: #f39c12; font-weight: bold; text-align: center;">
            <th colspan="9" style="padding: 10px; font-size: 13px; letter-spacing: 0.5px;">${escapeWorkflowHtml(headerTitle)}</th>
          </tr>
          <tr style="background-color: #f39c12; color: #000000; font-weight: bold; text-align: center;">
            <th style="border: 1px solid #000; padding: 8px 4px; width: 11%;">Period</th>
            <th style="border: 1px solid #000; padding: 8px 4px; width: 10%;">Location</th>
            <th style="border: 1px solid #000; padding: 8px 4px; width: 22%;">Service</th>
            <th style="border: 1px solid #000; padding: 8px 4px; width: 14%;">Hotel</th>
            <th style="border: 1px solid #000; padding: 8px 4px; width: 14%;">Typology of Room</th>
            <th style="border: 1px solid #000; padding: 8px 4px; width: 5%;">Pax</th>
            <th style="border: 1px solid #000; padding: 8px 4px; width: 5%;">Nights</th>
            <th style="border: 1px solid #000; padding: 8px 4px; width: 8%;">Web Site</th>
            <th style="border: 1px solid #000; padding: 8px 4px; width: 11%;">Price in THB</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
          ${totalRowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

export function buildBookingGenerationEmail(trip) {
  const agentName = trip.agents?.name || 'Agent';
  const subject = `Booking Generation Request - ${trip.file_reference || trip.booking_reference || trip.id}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:750px;margin:auto;color:#1f2937;line-height:1.55;">
      <h2 style="color:#0f766e;">Booking Generation Request</h2>
      <p>Dear ${escapeWorkflowHtml(agentName)},</p>
      <p style="margin-bottom:8px;">Your quotation has been converted into a booking and is now <strong>In Progress</strong>.</p>
      <p style="margin-top:0;margin-bottom:16px;">Our reservation team will contact the suppliers and update you when every service is confirmed.</p>
      ${renderSummaryTable(bookingSummaryRows(trip))}
      ${renderQuotationItemsTable(trip)}
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
    cc: bookingGenerationOfficeCc(),
    bcc: bookingGenerationAuditBcc(),
    tripId: trip.id,
    eventType: 'booking_generation_request',
    ...email
  });
}

export function buildFinalBookingEmail(trip) {
  const agentName = trip.agents?.name || 'Agent';
  const subject = `Booking Confirmed - ${trip.file_reference || trip.booking_reference || trip.id}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:750px;margin:auto;color:#1f2937;line-height:1.55;">
      <h2 style="color:#15803d;">Booking Confirmed</h2>
      <p>Dear ${escapeWorkflowHtml(agentName)},</p>
      <p>All required services have been confirmed. The booking is now complete and its Proforma Invoice is available in the system.</p>
      ${renderSummaryTable(bookingSummaryRows(trip))}
      ${renderQuotationItemsTable(trip)}
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

export function buildBookingUnconfirmedEmail(trip, reason) {
  const agentName = trip.agents?.name || 'Agent';
  const subject = `Booking Unconfirmed / Action Required - ${trip.file_reference || trip.booking_reference || trip.id}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:750px;margin:auto;color:#1f2937;line-height:1.55;">
      <h2 style="color:#dc2626;">Booking Unconfirmed</h2>
      <p>Dear ${escapeWorkflowHtml(agentName)},</p>
      <p style="margin-bottom:8px;">Your booking (<strong>${escapeWorkflowHtml(trip.file_reference || trip.booking_reference || trip.id)}</strong>) could not be confirmed at this time.</p>
      <div style="margin:16px 0;padding:14px 16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px;">
        <strong style="color:#991b1b;display:block;margin-bottom:4px;">Reason / Issues Details:</strong>
        <span style="color:#7f1d1d;">${escapeWorkflowHtml(reason || 'No specific reason provided.')}</span>
      </div>
      <p style="margin-top:0;margin-bottom:16px;">Please review the details or contact the reservation team for further assistance.</p>
      ${renderSummaryTable(bookingSummaryRows(trip))}
      ${renderQuotationItemsTable(trip)}
      ${buildEmailFooter({ senderName: 'Verathailandia Reservations Team', senderEmail: 'reservation@verathailandia.com', salutation: 'Best regards,' })}
    </div>`;
  const text = [
    `Dear ${agentName},`,
    '',
    `Your booking (${trip.file_reference || trip.booking_reference || trip.id}) could not be confirmed.`,
    `Reason: ${reason || 'No specific reason provided.'}`,
    '',
    `File Number: ${trip.file_reference || '-'}`,
    `Client Name: ${trip.client_name || '-'}`,
    `Trip Start Date: ${workflowDate(trip.trip_start_date)}`,
    buildEmailFooterText({ senderName: 'Verathailandia Reservations Team', senderEmail: 'reservation@verathailandia.com', salutation: 'Best regards,' })
  ].join('\n');
  return { subject, html, text };
}

export async function sendBookingUnconfirmedEmail(trip, reason) {
  const email = buildBookingUnconfirmedEmail(trip, reason);
  return sendWorkflowEmail({
    from: reservationFromAddress(),
    to: trip.agents?.email,
    ...email
  });
}
