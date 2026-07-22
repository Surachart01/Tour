import prisma from '../config/db.js';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
});

function normalizeHotelEmailKey(item) {
  const hotelName = item.hotel_name || item.hotels?.name;
  if (hotelName) return `name:${String(hotelName).trim().toLowerCase()}`;
  if (item.hotel_id) return `id:${item.hotel_id}`;
  return 'name:unknown-hotel';
}

function toValidDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hotelItemNights(item, fromDate, toDate) {
  const storedNights = Number(item.nights);
  if (Number.isFinite(storedNights) && storedNights > 0) return storedNights;
  if (!fromDate || !toDate) return 1;
  return Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000));
}

export function groupHotelItemsForSupplierEmail(hotelItems = []) {
  const groups = new Map();

  hotelItems.forEach((item) => {
    const key = normalizeHotelEmailKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return Array.from(groups.values()).map((items) => {
    const sortedItems = [...items].sort((a, b) => {
      return (toValidDate(a.from_date)?.getTime() || 0) - (toValidDate(b.from_date)?.getTime() || 0);
    });
    const segments = [];

    sortedItems.forEach((item) => {
      const fromDate = toValidDate(item.from_date);
      const toDate = toValidDate(item.to_date) || fromDate;
      const nights = hotelItemNights(item, fromDate, toDate);
      const roomType = item.room_type || 'Standard';
      const current = segments[segments.length - 1];
      const isConsecutive = current && fromDate && current.to_date &&
        current.to_date.toDateString() === fromDate.toDateString();

      if (isConsecutive && current.room_type === roomType) {
        current.to_date = toDate;
        current.nights += nights;
        current.remarks.push(item.notes || item.remarks);
        current.originalItems.push(item);
      } else {
        segments.push({
          room_type: roomType,
          from_date: fromDate,
          to_date: toDate,
          nights,
          remarks: [item.notes || item.remarks].filter(Boolean),
          originalItems: [item]
        });
      }
    });

    const datedSegments = segments.filter((segment) => segment.from_date || segment.to_date);
    const checkIn = datedSegments.reduce((earliest, segment) => {
      if (!segment.from_date) return earliest;
      return !earliest || segment.from_date < earliest ? segment.from_date : earliest;
    }, null);
    const checkOut = datedSegments.reduce((latest, segment) => {
      if (!segment.to_date) return latest;
      return !latest || segment.to_date > latest ? segment.to_date : latest;
    }, null);

    return {
      hotel_id: sortedItems[0]?.hotel_id || null,
      hotel_name: sortedItems[0]?.hotel_name || sortedItems[0]?.hotels?.name || 'Hotel',
      hotel: sortedItems[0]?.hotels || null,
      check_in: checkIn,
      check_out: checkOut,
      segments,
      originalItems: sortedItems
    };
  });
}

function escapeEmailHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==================== PDF GENERATION ====================
export async function generateQuotationPDF(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true, hotel_trip_items: { include: { hotels: true, hotel_room_type_items: true } },
        excursion_trip_items: { include: { excursions: true } },
        tour_trip_items: { include: { tours: true } },
        transfer_trip_items: { include: { transfers: true } },
        flight_trip_items: true, other_trip_items: { include: { others: true } }
      }
    });
    if (!trip) return res.status(404).send('Trip not found');
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${trip.approved ? 'booking' : 'quotation'}_${id}.pdf`);
    doc.pipe(res);
    doc.fontSize(20).text(trip.approved ? 'BOOKING CONFIRMATION' : 'QUOTATION', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Reference: ${trip.booking_reference || 'N/A'}`);
    doc.text(`Client: ${trip.client_name}`);
    doc.text(`Phone: ${trip.client_phone || 'N/A'}`);
    doc.text(`Agent: ${trip.agents?.name || 'N/A'}`);
    doc.text(`Adults: ${trip.number_of_adults} | Children: ${trip.number_of_kids || 0}`);
    doc.moveDown();
    if (trip.hotel_trip_items?.length) {
      doc.fontSize(14).text('Hotels', { underline: true }); doc.moveDown(0.5);
      trip.hotel_trip_items.forEach(h => {
        const fromStr = h.from_date ? new Date(h.from_date).toLocaleDateString('en-GB') : '';
        const toStr = h.to_date ? new Date(h.to_date).toLocaleDateString('en-GB') : '';
        const datesStr = fromStr && toStr ? `, ${fromStr} to ${toStr}` : '';
        doc.fontSize(10).text(`• ${h.hotel_name || h.hotels?.name || 'N/A'} - ${h.city} (${h.nights} nights${datesStr})`);
      });
      doc.moveDown();
    }
    if (trip.tour_trip_items?.length) {
      doc.fontSize(14).text('Tours', { underline: true }); doc.moveDown(0.5);
      trip.tour_trip_items.forEach(t => {
        doc.fontSize(10).text(`• ${t.tours?.name || 'N/A'} - ${t.from_location} to ${t.to_location}`);
      });
      doc.moveDown();
    }
    if (trip.excursion_trip_items?.length) {
      doc.fontSize(14).text('Excursions', { underline: true }); doc.moveDown(0.5);
      trip.excursion_trip_items.forEach(e => {
        doc.fontSize(10).text(`• ${e.excursions?.name || 'N/A'} - ${e.city}`);
      });
      doc.moveDown();
    }
    if (trip.transfer_trip_items?.length) {
      doc.fontSize(14).text('Transfers', { underline: true }); doc.moveDown(0.5);
      trip.transfer_trip_items.forEach(t => {
        doc.fontSize(10).text(`• ${t.from_location} → ${t.to_location}`);
      });
      doc.moveDown();
    }
    if (trip.flight_trip_items?.length) {
      doc.fontSize(14).text('Flights', { underline: true }); doc.moveDown(0.5);
      trip.flight_trip_items.forEach(f => {
        doc.fontSize(10).text(`• ${f.flight_number || 'N/A'} - ${f.route || 'N/A'}`);
      });
      doc.moveDown();
    }
    doc.moveDown();
    doc.fontSize(12).text(`Total: ${trip.total_amount || 0}`);
    doc.text(`Discount: ${trip.discount_amount || 0}`);
    doc.fontSize(14).text(`Final Amount: ${trip.final_amount || 0}`, { underline: true });
    if (trip.remarks) { doc.moveDown(); doc.fontSize(10).text(`Remarks: ${trip.remarks}`); }
    doc.end();
  } catch (err) { next(err); }
}

export async function generateReceiptPDF(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    const trip = await prisma.trips.findUnique({ where: { id }, include: { agents: true } });
    if (!trip) return res.status(404).send('Booking not found');
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt_${id}.pdf`);
    doc.pipe(res);
    doc.fontSize(20).text('RECEIPT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Receipt #: ${trip.booking_reference || id}`);
    doc.text(`Client: ${trip.client_name}`);
    doc.text(`Agent: ${trip.agents?.name || 'N/A'}`);
    doc.text(`Date: ${new Date(trip.created_at).toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Total Amount: ${trip.total_amount || 0}`);
    doc.text(`Discount: ${trip.discount_amount || 0}`);
    doc.fontSize(14).text(`Amount Paid: ${trip.final_amount || 0}`, { underline: true });
    doc.end();
  } catch (err) { next(err); }
}

function proformaNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstPositive(...values) {
  for (const value of values) {
    const parsed = proformaNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function proformaDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB').replace(/\//g, '-');
}

function proformaCurrency(value) {
  return `THB ${proformaNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function proformaPax(item, trip) {
  const itemPax = proformaNumber(item?.pax || item?.number_of_adults) + proformaNumber(item?.number_of_kids);
  const tripPax = proformaNumber(trip?.number_of_adults) + proformaNumber(trip?.number_of_kids);
  return itemPax > 0 ? itemPax : (tripPax > 0 ? tripPax : '-');
}

function buildProformaServiceRows(trip) {
  const rows = [];

  (trip.hotel_trip_items || []).forEach((item) => {
    const dates = `${proformaDate(item.from_date)} - ${proformaDate(item.to_date)}`;
    const details = [
      item.room_type,
      item.city,
      item.nights ? `${item.nights} night(s)` : ''
    ].filter(Boolean).join(' | ') || '-';
    rows.push({
      type: 'Hotel',
      date: dates,
      description: item.hotel_name || item.hotels?.name || 'Hotel',
      details,
      pax: proformaPax(item, trip),
      amount: firstPositive(
        item.total_price,
        item.final_cost,
        item.total_cost,
        item.price,
        proformaNumber(item.single_price) + proformaNumber(item.double_price) + proformaNumber(item.extra_bed_price)
      )
    });
  });

  (trip.tour_trip_items || []).forEach((item) => {
    rows.push({
      type: 'Tour',
      date: proformaDate(item.from_date),
      description: item.tour_name || item.tours?.name || 'Tour',
      details: [item.from_location, item.to_location, item.remarks].filter(Boolean).join(' | ') || '-',
      pax: proformaPax(item, trip),
      amount: firstPositive(item.total_price, item.final_cost, item.total_cost, item.price)
    });
  });

  (trip.transfer_trip_items || []).forEach((item) => {
    const route = [item.from_location, item.to_location].filter(Boolean).join(' -> ');
    rows.push({
      type: 'Transfer',
      date: proformaDate(item.from_date),
      description: item.transfer_description || item.transfers?.description || route || 'Transfer',
      details: [route, item.pickup_time ? `Pickup ${item.pickup_time}` : '', item.flight_number || item.flight_time].filter(Boolean).join(' | ') || '-',
      pax: proformaPax(item, trip),
      amount: firstPositive(item.total_price, item.final_cost, item.total_cost, item.price)
    });
  });

  (trip.excursion_trip_items || []).forEach((item) => {
    rows.push({
      type: 'Excursion',
      date: proformaDate(item.from_date),
      description: item.excursion_name || item.excursions?.name || 'Excursion',
      details: item.city || item.remarks || '-',
      pax: proformaPax(item, trip),
      amount: firstPositive(item.total_price, item.final_cost, item.total_cost, item.price)
    });
  });

  (trip.flight_trip_items || []).forEach((item) => {
    rows.push({
      type: 'Flight',
      date: proformaDate(item.from_date),
      description: item.flight_number || item.route || 'Flight',
      details: item.route || item.remarks || '-',
      pax: proformaPax(item, trip),
      amount: firstPositive(item.total_price, item.final_cost, item.total_cost, item.price)
    });
  });

  (trip.other_trip_items || []).forEach((item) => {
    rows.push({
      type: 'Other',
      date: proformaDate(item.from_date),
      description: item.other_name || item.others?.name || item.description || 'Other Service',
      details: item.remarks || item.notes || '-',
      pax: proformaPax(item, trip),
      amount: firstPositive(item.total_price, item.final_cost, item.total_cost, item.price)
    });
  });

  const total = firstPositive(trip.final_amount, trip.final_cost, trip.total_amount, trip.total_cost);
  const amountSum = rows.reduce((sum, row) => sum + proformaNumber(row.amount), 0);
  if (rows.length && amountSum === 0 && total > 0) {
    const perRow = Math.floor((total / rows.length) * 100) / 100;
    rows.forEach((row, index) => {
      row.amount = index === rows.length - 1
        ? Math.round((total - perRow * (rows.length - 1)) * 100) / 100
        : perRow;
    });
  }

  return rows;
}

function ensureProformaSpace(doc, neededHeight) {
  if (doc.y + neededHeight > doc.page.height - 70) {
    doc.addPage();
  }
}

function drawProformaSectionTitle(doc, title, brandColor) {
  ensureProformaSpace(doc, 24);
  doc.fillColor(brandColor).fontSize(11).font('Helvetica-Bold').text(title, 50, doc.y);
  doc.moveTo(50, doc.y + 3).lineTo(545, doc.y + 3).strokeColor(brandColor).lineWidth(1).stroke();
  doc.moveDown(0.7);
}

function drawProformaRow(doc, columns, widths, options = {}) {
  const x = 50;
  const y = doc.y;
  const padding = 5;
  const fontSize = options.fontSize || 8;
  const fill = options.fill;
  const color = options.color || '#111111';
  const bold = options.bold;
  const heights = columns.map((col, index) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);
    return doc.heightOfString(String(col ?? ''), { width: widths[index] - padding * 2 });
  });
  const rowHeight = Math.max(options.minHeight || 22, Math.max(...heights) + padding * 2);
  ensureProformaSpace(doc, rowHeight + 4);
  if (fill) {
    doc.rect(x, doc.y, widths.reduce((a, b) => a + b, 0), rowHeight).fill(fill);
  }
  let cursorX = x;
  columns.forEach((col, index) => {
    doc.fillColor(color)
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(fontSize)
      .text(String(col ?? ''), cursorX + padding, doc.y + padding, {
        width: widths[index] - padding * 2,
        align: options.align?.[index] || 'left'
      });
    cursorX += widths[index];
  });
  doc.y = y + rowHeight;
  doc.moveTo(x, doc.y).lineTo(x + widths.reduce((a, b) => a + b, 0), doc.y).strokeColor('#eeeeee').lineWidth(0.5).stroke();
}

export async function generateProformaInvoicePDF(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid booking ID');

    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true,
        hotel_trip_items: { orderBy: [{ display_order: 'asc' }, { from_date: 'asc' }], include: { hotels: true, hotel_room_type_items: true } },
        excursion_trip_items: { orderBy: { from_date: 'asc' }, include: { excursions: true, suppliers: true } },
        tour_trip_items: { orderBy: { from_date: 'asc' }, include: { tours: true, suppliers: true } },
        transfer_trip_items: { orderBy: { from_date: 'asc' }, include: { transfers: true, suppliers: true } },
        flight_trip_items: { orderBy: { from_date: 'asc' } },
        other_trip_items: { orderBy: { from_date: 'asc' }, include: { others: true } }
      }
    });

    if (!trip) return res.status(404).send('Booking not found');

    const brandColor = '#f47b20';
    const brandDark = '#c85f0f';
    const brandLight = '#fff4ec';
    const bookingRef = trip.booking_reference || trip.quotation_reference || `booking-${trip.id}`;
    const total = firstPositive(trip.final_amount, trip.final_cost, trip.total_amount, trip.total_cost);
    const rows = buildProformaServiceRows(trip);

    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=proforma_${bookingRef}.pdf`);
    doc.pipe(res);

    const logoPath = path.resolve(process.cwd(), '../frontend-main/production/images/Verathailand_logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 115 });
    }
    doc.fillColor(brandDark).font('Helvetica-Bold').fontSize(11).text('VeraThailandia Travel Co., Ltd.', 335, 50, { align: 'right', width: 210 });
    doc.fillColor('#111111').font('Helvetica').fontSize(8)
      .text('Email: info@verathailandia.com', 335, 66, { align: 'right', width: 210 })
      .text('Contact: +66 123 456 789', 335, 78, { align: 'right', width: 210 })
      .text('Website: www.verathailandia.com', 335, 90, { align: 'right', width: 210 });
    doc.moveTo(50, 112).lineTo(545, 112).strokeColor(brandColor).lineWidth(1.5).stroke();

    doc.y = 132;
    doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(19).text('PROFORMA INVOICE', { align: 'center' });
    doc.moveDown(2);

    drawProformaSectionTitle(doc, 'Booking Details', brandColor);
    const detailsY = doc.y;
    doc.fillColor('#111111').fontSize(9).font('Helvetica-Bold').text('Booking ID:', 60, detailsY);
    doc.font('Helvetica').text(bookingRef, 125, detailsY);
    doc.font('Helvetica-Bold').text('Payment Date:', 315, detailsY);
    doc.font('Helvetica').text(proformaDate(trip.created_at || trip.booking_date), 395, detailsY);
    doc.font('Helvetica-Bold').text('Status:', 60, detailsY + 14);
    doc.font('Helvetica').text(trip.status || 'Confirmed', 125, detailsY + 14);
    doc.y = detailsY + 42;

    drawProformaSectionTitle(doc, 'Client Details', brandColor);
    const clientBoxY = doc.y;
    doc.roundedRect(50, clientBoxY, 495, 70, 4).strokeColor('#e9ecef').stroke();
    doc.rect(50, clientBoxY, 3, 70).fill(brandColor);
    doc.fillColor('#111111').font('Helvetica-Bold').fontSize(10).text(trip.client_name || '-', 62, clientBoxY + 12);
    doc.font('Helvetica').fontSize(9)
      .text(`Email: ${trip.client_email || '-'}`, 62, clientBoxY + 28)
      .text(`Contact: ${trip.client_phone || '-'}`, 62, clientBoxY + 42)
      .text(`Agent: ${trip.agents?.name || trip.agent_name || '-'}`, 62, clientBoxY + 56);
    doc.y = clientBoxY + 92;

    drawProformaSectionTitle(doc, 'Booked Services', brandColor);
    if (rows.length) {
      const widths = [28, 58, 86, 208, 35, 80];
      drawProformaRow(doc, ['#', 'Type', 'Date', 'Booked Detail', 'Pax', 'Amount'], widths, {
        fill: brandColor,
        color: '#ffffff',
        bold: true,
        fontSize: 8,
        minHeight: 22,
        align: ['center', 'left', 'left', 'left', 'center', 'right']
      });
      rows.forEach((row, index) => {
        drawProformaRow(doc, [
          index + 1,
          row.type,
          row.date,
          `${row.description}\n${row.details}`,
          row.pax,
          proformaCurrency(row.amount)
        ], widths, {
          fontSize: 8,
          minHeight: 34,
          align: ['center', 'left', 'left', 'left', 'center', 'right']
        });
      });
      doc.moveDown(1.4);
    } else {
      doc.roundedRect(50, doc.y, 495, 28, 4).fillAndStroke(brandLight, brandColor);
      doc.fillColor('#555555').fontSize(9).text('No service details were found for this booking.', 60, doc.y + 9);
      doc.moveDown(2);
    }

    drawProformaSectionTitle(doc, 'Amount Details', brandColor);
    const amountY = doc.y;
    doc.roundedRect(320, amountY, 225, 28, 4).fill(brandColor);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10).text('Total (Excluding Tax):', 332, amountY + 9);
    doc.text(proformaCurrency(total), 430, amountY + 9, { width: 100, align: 'right' });
    doc.y = amountY + 58;

    ensureProformaSpace(doc, 45);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(brandColor).lineWidth(1).stroke();
    doc.moveDown(1.3);
    doc.fillColor(brandColor).font('Helvetica-Bold').fontSize(8).text('Thank you for choosing VeraThailandia!', { align: 'center' });
    doc.fillColor('#666666').font('Helvetica').fontSize(7)
      .text('We appreciate your business and look forward to serving you again.', { align: 'center' })
      .text('This is a computer-generated invoice and does not require a signature.', { align: 'center' })
      .text('For any queries, please contact us at info@verathailandia.com or +66 123 456 789', { align: 'center' });

    doc.end();
  } catch (err) { next(err); }
}

function itineraryDateKey(value) {
  const date = toValidDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
}

function itineraryDate(value) {
  const date = toValidDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC'
  });
}

function itineraryShortDate(value) {
  const date = toValidDate(value);
  if (!date) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC'
  });
}

function itineraryTime(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return text;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${String(hours % 12 || 12).padStart(2, '0')}:${match[2]} ${suffix}`;
}

export function itineraryHotelName(item = {}) {
  const name = String(item.hotels?.name || item.hotel_name || 'Hotel').trim();
  return name.replace(/(?:\s+Special Package){2,}/gi, ' Special Package');
}

export function buildItineraryDays(trip = {}) {
  const days = new Map();
  const add = (dateValue, service) => {
    const key = itineraryDateKey(dateValue);
    if (!key) return;
    if (!days.has(key)) days.set(key, { key, date: dateValue, services: [] });
    days.get(key).services.push(service);
  };

  (trip.flight_trip_items || []).forEach((item) => add(item.from_date, {
    type: 'flight',
    title: `Flight ${item.flight_number || ''}`.trim(),
    description: item.route || `${item.in_or_out || 'Flight'}`,
    timeLabel: [item.edt && `Departure ${itineraryTime(item.edt)}`, item.eat && `Arrival ${itineraryTime(item.eat)}`].filter(Boolean).join(' | '),
    notes: item.remarks || ''
  }));

  (trip.transfer_trip_items || []).forEach((item) => add(item.from_date, {
    type: 'transfer',
    title: item.type_of_transfer || item.transfers?.transfer_type || 'Transfer',
    description: item.transfer_description || item.transfers?.description || [item.from_location, item.to_location].filter(Boolean).join(' to '),
    route: [item.from_location, item.to_location].filter(Boolean).join(' to '),
    timeLabel: item.pickup_time ? `Pickup ${itineraryTime(item.pickup_time)}` : (item.flight_time ? `Time ${itineraryTime(item.flight_time)}` : ''),
    notes: item.remarks || ''
  }));

  (trip.excursion_trip_items || []).forEach((item) => add(item.from_date, {
    type: 'excursion',
    title: item.excursions?.name || 'Excursion',
    description: [item.city, item.hotel && `Meeting point: ${item.hotel}`].filter(Boolean).join(' | '),
    timeLabel: item.pickup_time ? `Pickup ${itineraryTime(item.pickup_time)}` : '',
    notes: item.remarks || ''
  }));

  (trip.tour_trip_items || []).forEach((item) => add(item.from_date, {
    type: 'tour',
    title: item.tours?.name || 'Tour',
    description: item.tours?.route || [item.from_location, item.to_location].filter(Boolean).join(' to '),
    timeLabel: item.flight_in ? `Start ${itineraryTime(item.flight_in)}` : '',
    notes: item.remarks || '',
    endDate: item.to_date
  }));

  (trip.hotel_trip_items || []).forEach((item) => {
    const hotelName = itineraryHotelName(item);
    add(item.from_date, {
      type: 'hotel',
      title: `Check-in: ${hotelName}`,
      description: [item.city, item.room_type, item.nights && `${item.nights} night(s)`].filter(Boolean).join(' | '),
      notes: item.notes || ''
    });
    if (itineraryDateKey(item.to_date) !== itineraryDateKey(item.from_date)) {
      add(item.to_date, {
        type: 'hotel',
        title: `Check-out: ${hotelName}`,
        description: item.city || '',
        notes: ''
      });
    }
  });

  const order = { flight: 1, transfer: 2, tour: 3, excursion: 4, hotel: 5 };
  return Array.from(days.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((day) => ({
      ...day,
      services: day.services.sort((a, b) => (order[a.type] || 99) - (order[b.type] || 99))
    }));
}

function ensureItinerarySpace(doc, height = 90) {
  if (doc.y + height <= doc.page.height - 52) return;
  doc.addPage();
  doc.y = 48;
}

function itineraryServiceMetrics(doc, service) {
  const title = service.title || service.type;
  const titleWidth = service.timeLabel ? 330 : 502;
  doc.font('Times-Bold').fontSize(10);
  const titleHeight = doc.heightOfString(title, { width: titleWidth, lineGap: 1 });
  const timeHeight = service.timeLabel
    ? doc.heightOfString(service.timeLabel, { width: 164, align: 'right', lineGap: 1 })
    : 0;
  const headerHeight = Math.max(12, titleHeight, timeHeight);
  const description = [service.route, service.description]
    .filter((value, i, values) => value && values.indexOf(value) === i)
    .join(' | ');

  let contentHeight = 0;
  if (description) {
    doc.font('Times-Roman').fontSize(9);
    contentHeight += doc.heightOfString(description, { width: 488, lineGap: 1 }) + 2;
  }
  if (service.endDate) {
    doc.font('Times-Italic').fontSize(8.5);
    contentHeight += doc.heightOfString(`Until ${itineraryShortDate(service.endDate)}`, { width: 488 }) + 2;
  }
  if (service.notes) {
    doc.font('Times-Italic').fontSize(8.5);
    contentHeight += doc.heightOfString(`Note: ${service.notes}`, { width: 488, lineGap: 1 }) + 2;
  }

  return {
    title,
    titleWidth,
    titleHeight,
    timeHeight,
    headerHeight,
    description,
    totalHeight: headerHeight + (contentHeight ? contentHeight + 3 : 0) + 9
  };
}

function drawItineraryHeader(doc, trip) {
  doc.fillColor('#18283a').font('Times-Bold').fontSize(10)
    .text('VERATHAILANDIA CO., LTD.', { align: 'center', characterSpacing: 0.7 });
  doc.moveDown(0.25);
  doc.fillColor('#111111').font('Times-Bold').fontSize(19)
    .text(String(trip.client_name || 'CLIENT ITINERARY').toUpperCase(), { align: 'center', underline: true });
  doc.moveDown(0.25);
  doc.font('Times-Roman').fontSize(9).fillColor('#555555')
    .text(`File Number: ${trip.file_reference || trip.booking_reference || '-'}   |   Pax: ${(trip.number_of_adults || 0) + (trip.number_of_kids || 0)}   |   Trip Start: ${itineraryShortDate(trip.trip_start_date)}`, { align: 'center' });
  doc.moveDown(1.2);
}

export function writeItineraryPDF(doc, trip) {
  drawItineraryHeader(doc, trip);
  const days = buildItineraryDays(trip);
  if (!days.length) {
    doc.font('Times-Italic').fontSize(11).fillColor('#555555')
      .text('No itinerary services are available for this booking.', { align: 'center' });
  }

  days.forEach((day, index) => {
    ensureItinerarySpace(doc, 80);
    if (index > 0) doc.moveDown(0.45);
    const titleY = doc.y;
    doc.moveTo(42, titleY + 16).lineTo(570, titleY + 16).lineWidth(0.7).strokeColor('#18283a').stroke();
    doc.fillColor('#18283a').font('Times-Bold').fontSize(12)
      .text(itineraryDate(day.date), 42, titleY, { underline: true });
    doc.y = titleY + 25;

    day.services.forEach((service) => {
      const metrics = itineraryServiceMetrics(doc, service);
      ensureItinerarySpace(doc, metrics.totalHeight);
      const serviceY = doc.y;
      doc.fillColor('#111111').font('Times-Bold').fontSize(10)
        .text(metrics.title, 56, serviceY, { width: metrics.titleWidth, lineGap: 1 });
      if (service.timeLabel) {
        doc.fillColor('#b42318').font('Times-Bold').fontSize(10)
          .text(service.timeLabel, 394, serviceY, { width: 164, align: 'right', lineGap: 1 });
      }
      let cursorY = serviceY + metrics.headerHeight + 3;
      if (metrics.description) {
        doc.fillColor('#333333').font('Times-Roman').fontSize(9)
          .text(metrics.description, 70, cursorY, { width: 488, lineGap: 1 });
        cursorY += doc.heightOfString(metrics.description, { width: 488, lineGap: 1 }) + 2;
      }
      if (service.endDate) {
        const endText = `Until ${itineraryShortDate(service.endDate)}`;
        doc.fillColor('#555555').font('Times-Italic').fontSize(8.5)
          .text(endText, 70, cursorY, { width: 488 });
        cursorY += doc.heightOfString(endText, { width: 488 }) + 2;
      }
      if (service.notes) {
        const noteText = `Note: ${service.notes}`;
        doc.fillColor('#555555').font('Times-Italic').fontSize(8.5)
          .text(noteText, 70, cursorY, { width: 488, lineGap: 1 });
        cursorY += doc.heightOfString(noteText, { width: 488, lineGap: 1 }) + 2;
      }
      doc.y = Math.max(cursorY, serviceY + metrics.headerHeight) + 7;
    });
  });

  doc.end();
}

export async function generateTripPDF(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).send('Invalid itinerary ID');
    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true,
        hotel_trip_items: { include: { hotels: true }, orderBy: { from_date: 'asc' } },
        excursion_trip_items: { include: { excursions: true }, orderBy: { from_date: 'asc' } },
        tour_trip_items: { include: { tours: true }, orderBy: { from_date: 'asc' } },
        transfer_trip_items: { include: { transfers: true }, orderBy: { from_date: 'asc' } },
        flight_trip_items: { orderBy: { from_date: 'asc' } }
      }
    });
    if (!trip) return res.status(404).send('Itinerary not found');

    const doc = new PDFDocument({ size: 'LETTER', margins: { top: 46, bottom: 46, left: 42, right: 42 } });
    const filename = `itinerary_${trip.file_reference || trip.booking_reference || id}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);
    writeItineraryPDF(doc, trip);
  } catch (err) { next(err); }
}

export async function generateTripServicesPDF(req, res, next) {
  return generateTripPDF(req, res, next);
}

export async function notifyAgentBookingConfirmed(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid booking ID' });

    const trip = await prisma.trips.findUnique({
      where: { id },
      include: { agents: true }
    });
    if (!trip) return res.status(404).json({ message: 'Booking not found' });
    if (trip.status !== 'Confirmed') {
      return res.status(400).json({ message: 'The booking must be confirmed before notifying the agent.' });
    }

    const agentEmail = trip.agents?.email;
    if (!agentEmail) return res.status(400).json({ message: 'Agent email is missing.' });

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    const formatDate = (value) => {
      if (!value) return 'N/A';
      const date = new Date(value);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-GB').replace(/\//g, '-');
    };

    const bookingRef = trip.booking_reference || `BK${trip.id}`;
    const agentName = trip.agents?.name || 'Agent';
    const subject = `Booking Confirmed - ${bookingRef} - ${trip.client_name || 'Client'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
        <h2 style="color: #0f766e; margin-bottom: 12px;">Booking Confirmed</h2>
        <p>Dear ${escapeHtml(agentName)},</p>
        <p>We are pleased to inform you that the booking below has been confirmed.</p>
        <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 620px; border: 1px solid #dbe5ec;">
          <tr><td style="background: #f8fafc; font-weight: 700; width: 190px;">Booking Reference</td><td>${escapeHtml(bookingRef)}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: 700;">Client Name</td><td>${escapeHtml(trip.client_name || 'N/A')}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: 700;">Trip Start Date</td><td>${formatDate(trip.trip_start_date)}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: 700;">Pax</td><td>${Number(trip.number_of_adults || 0) + Number(trip.number_of_kids || 0)}</td></tr>
          <tr><td style="background: #f8fafc; font-weight: 700;">Final Cost</td><td>${escapeHtml(trip.final_amount || 0)}</td></tr>
        </table>
        <p style="margin-top: 18px;">Our reservations team has confirmed the required services. Please contact us if you need any further assistance.</p>
        <p>Best regards,<br><strong>Verathailandia Reservations Team</strong></p>
      </div>
    `;
    const text = [
      `Dear ${agentName},`,
      '',
      'We are pleased to inform you that the booking below has been confirmed.',
      `Booking Reference: ${bookingRef}`,
      `Client Name: ${trip.client_name || 'N/A'}`,
      `Trip Start Date: ${formatDate(trip.trip_start_date)}`,
      `Pax: ${Number(trip.number_of_adults || 0) + Number(trip.number_of_kids || 0)}`,
      `Final Cost: ${trip.final_amount || 0}`,
      '',
      'Best regards,',
      'Verathailandia Reservations Team'
    ].join('\n');

    if (!process.env.SMTP_USER) {
      return res.json({
        success: true,
        message: 'Agent notification prepared. Email service is not configured.',
        preview: { to: agentEmail, subject, html }
      });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: agentEmail,
      subject,
      text,
      html
    });

    return res.json({ success: true, message: 'Agent notification sent successfully.', to: agentEmail });
  } catch (err) { next(err); }
}

// Notify supplier/hotel about approved item
export async function notifySupplierOrHotel(req, res, next) {
  try {
    const tripId = parseInt(req.params.id);
    const { itemType, itemID } = req.params;

    const trip = await prisma.trips.findUnique({
      where: { id: tripId },
      include: { agents: true }
    });
    if (!trip) return res.status(404).send('Trip not found');

    const formatDate = (d) => {
      if (!d) return 'N/A';
      return new Date(d).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    };

    if (itemType === 'hotel') {
      let itemFilter = {};
      if (itemID === 'all') {
        itemFilter = {};
      } else if (itemID.startsWith('group_')) {
        const ids = itemID.replace('group_', '').split('_').map(x => parseInt(x)).filter(Boolean);
        if (ids.length === 0) return res.status(400).json({ success: false, message: 'Invalid hotel item selection' });
        itemFilter = { id: { in: ids } };
      } else {
        const parsedItemId = parseInt(itemID);
        if (Number.isNaN(parsedItemId)) return res.status(400).json({ success: false, message: 'Invalid hotel item ID' });
        itemFilter = { id: parsedItemId };
      }

      const hotelItems = await prisma.hotel_trip_items.findMany({
        where: { trip_item_id: tripId, ...itemFilter },
        include: { hotels: { include: { hotel_contacts: true } } }
      });

      if (hotelItems.length === 0) {
        return res.status(404).json({ success: false, message: 'No hotel items found' });
      }

      const hotelGroups = groupHotelItemsForSupplierEmail(hotelItems);
      let emailsSentCount = 0;

      // One message per hotel. Different room types/periods remain as detail rows.
      for (const hotelGroup of hotelGroups) {
          // Get hotel contact email
          let recipientEmail = 'reservation@verathailandia.com'; // fallback
          const firstOriginalItem = hotelGroup.originalItems[0];
          if (firstOriginalItem.hotels?.hotel_contacts?.length) {
            const contact = firstOriginalItem.hotels.hotel_contacts.find(c => c.email);
            if (contact?.email) recipientEmail = contact.email;
          }

          const stayRows = hotelGroup.segments.map((stay) => {
            const remarksStr = [...new Set(stay.remarks.filter(Boolean))].join(', ');
            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #dfe6e9;">${escapeEmailHtml(stay.room_type)}</td>
                <td style="padding: 8px; border: 1px solid #dfe6e9; white-space: nowrap;">${escapeEmailHtml(formatDate(stay.from_date))}</td>
                <td style="padding: 8px; border: 1px solid #dfe6e9; white-space: nowrap;">${escapeEmailHtml(formatDate(stay.to_date))}</td>
                <td style="padding: 8px; border: 1px solid #dfe6e9; text-align: center;">${escapeEmailHtml(stay.nights)}</td>
                <td style="padding: 8px; border: 1px solid #dfe6e9; color: #d9534f;">${escapeEmailHtml(remarksStr || '-')}</td>
              </tr>`;
          }).join('');

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <div style="text-align: center; border-bottom: 2px solid #26b99a; padding-bottom: 10px; margin-bottom: 20px;">
                <h2 style="color: #26b99a; margin: 0;">VERA THAILANDIA</h2>
                <p style="margin: 5px 0 0; color: #73879C; font-size: 14px;">Hotel Booking Request</p>
              </div>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 6px 0; color: #73879C; font-weight: bold; width: 140px;">Booking Ref:</td>
                  <td style="padding: 6px 0; color: #2A3F54;">${trip.booking_reference || trip.id}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #73879C; font-weight: bold;">Client Name:</td>
                  <td style="padding: 6px 0; color: #2A3F54;">${trip.client_name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #73879C; font-weight: bold;">Adults/Kids:</td>
                  <td style="padding: 6px 0; color: #2A3F54;">${trip.number_of_adults} Adults ${trip.number_of_kids ? `| ${trip.number_of_kids} Children` : ''}</td>
                </tr>
              </table>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #26b99a;">
                <h3 style="margin-top: 0; color: #2A3F54; border-bottom: 1px solid #e0e0e0; padding-bottom: 5px;">Stay Information</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 4px 0; color: #73879C; font-weight: bold; width: 120px;">Hotel Name:</td>
                    <td style="padding: 4px 0; color: #2A3F54; font-weight: bold;">${escapeEmailHtml(hotelGroup.hotel_name)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Overall Period:</td>
                    <td style="padding: 4px 0; color: #2A3F54;">${escapeEmailHtml(formatDate(hotelGroup.check_in))} - ${escapeEmailHtml(formatDate(hotelGroup.check_out))}</td>
                  </tr>
                </table>
                <table style="width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 13px;">
                  <thead>
                    <tr style="background: #2A3F54; color: #fff;">
                      <th style="padding: 8px; border: 1px solid #2A3F54; text-align: left;">Room Type</th>
                      <th style="padding: 8px; border: 1px solid #2A3F54; text-align: left;">Check-in</th>
                      <th style="padding: 8px; border: 1px solid #2A3F54; text-align: left;">Check-out</th>
                      <th style="padding: 8px; border: 1px solid #2A3F54;">Nights</th>
                      <th style="padding: 8px; border: 1px solid #2A3F54; text-align: left;">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>${stayRows}</tbody>
                </table>
              </div>
              <p style="color: #73879C; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 10px;">
                Please reply to this email to confirm the booking.<br/>
                VeraThailandia Co., Ltd.
              </p>
            </div>
          `;

          // Send consolidated reservation email if SMTP configured
          if (process.env.SMTP_USER) {
            await transporter.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: recipientEmail,
              subject: `Hotel Stay Booking - Ref: ${trip.booking_reference || trip.id} - ${hotelGroup.hotel_name}`,
              html: emailHtml
            });
          }

          // Mark all original items as email_sent = true in DB
          const ids = hotelGroup.originalItems.map(x => x.id);
          await prisma.hotel_trip_items.updateMany({
            where: { trip_item_id: tripId, id: { in: ids } },
            data: { email_sent: true }
          });
          emailsSentCount += 1;
      }

      return res.json({
        success: true,
        emailCount: emailsSentCount,
        itemCount: hotelItems.length,
        message: `${emailsSentCount} consolidated hotel email${emailsSentCount === 1 ? '' : 's'} sent successfully.`
      });
    }

    // Handles transfer notifications
    if (itemType === 'transfer') {
      const items = await prisma.transfer_trip_items.findMany({
        where: itemID === 'all' ? { trip_item_id: tripId } : { id: parseInt(itemID) },
        include: { suppliers: true }
      });

      for (const item of items) {
        let recipientEmail = item.suppliers?.email || 'reservation@verathailandia.com';
        if (process.env.SMTP_USER) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: recipientEmail,
            subject: `Transfer Booking Request - Ref: ${trip.booking_reference || trip.id}`,
            text: `Please confirm transfer from ${item.from_location} to ${item.to_location} on ${formatDate(item.from_date)}. Details: Pickup: ${item.pickup_time || 'N/A'}, Flight: ${item.flight_number || 'N/A'}. Remarks: ${item.remarks || 'None'}.`
          });
        }
        await prisma.transfer_trip_items.update({
          where: { id: item.id },
          data: { email_sent: true }
        });
      }
      return res.json({ success: true, message: `Notification sent for transfers.` });
    }

    // Handles excursion notifications
    if (itemType === 'excursion') {
      const items = await prisma.excursion_trip_items.findMany({
        where: itemID === 'all' ? { trip_item_id: tripId } : { id: parseInt(itemID) },
        include: { suppliers: true, excursions: true }
      });

      for (const item of items) {
        let recipientEmail = item.suppliers?.email || 'reservation@verathailandia.com';
        if (process.env.SMTP_USER) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: recipientEmail,
            subject: `Excursion Booking Request - Ref: ${trip.booking_reference || trip.id}`,
            text: `Please confirm excursion booking for ${item.excursions?.name || 'Excursion'} in ${item.city} on ${formatDate(item.from_date)}. Pickup: ${item.pickup_time || 'N/A'}. Remarks: ${item.remarks || 'None'}.`
          });
        }
        await prisma.excursion_trip_items.update({
          where: { id: item.id },
          data: { email_sent: true }
        });
      }
      return res.json({ success: true, message: `Notification sent for excursions.` });
    }

    // Handles tour notifications
    if (itemType === 'tour') {
      const items = await prisma.tour_trip_items.findMany({
        where: itemID === 'all' ? { trip_item_id: tripId } : { id: parseInt(itemID) },
        include: { suppliers: true, tours: true }
      });

      for (const item of items) {
        let recipientEmail = item.suppliers?.email || 'reservation@verathailandia.com';
        if (process.env.SMTP_USER) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: recipientEmail,
            subject: `Tour Booking Request - Ref: ${trip.booking_reference || trip.id}`,
            text: `Please confirm tour booking for ${item.tours?.name || 'Tour'} on ${formatDate(item.from_date)}. Route: ${item.from_location} to ${item.to_location}. Remarks: ${item.remarks || 'None'}.`
          });
        }
        await prisma.tour_trip_items.update({
          where: { id: item.id },
          data: { email_sent: true }
        });
      }
      return res.json({ success: true, message: `Notification sent for tours.` });
    }

    return res.json({ success: true, message: `No notification logic defined for ${itemType}` });
  } catch (err) { next(err); }
}

// Send quotation email
import path from 'path';
import fs from 'fs';

export async function sendQuotationEmail(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid quotation ID');

    const { to, cc, subject, body } = req.body;

    const trip = await prisma.trips.findUnique({
      where: { id },
      include: {
        agents: true,
        hotel_trip_items: {
          orderBy: [
            { display_order: 'asc' },
            { from_date: 'asc' }
          ],
          include: { hotels: true }
        },
        excursion_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { excursions: true }
        },
        tour_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { tours: true }
        },
        transfer_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { transfers: true }
        },
        flight_trip_items: {
          orderBy: { from_date: 'asc' }
        },
        other_trip_items: {
          orderBy: { from_date: 'asc' },
          include: { others: true }
        }
      }
    });

    if (!trip) return res.status(404).send('Quotation not found');

    const toRecipient = to || trip.client_email || trip.agents?.email;
    if (!toRecipient) return res.status(400).send('Recipient email is required (no client email or agent email found)');

    const ccRecipient = cc || (to ? trip.agents?.email : undefined);
    const subjectLine = subject || `Quotation Reference: ${trip.booking_reference || `Q-${trip.id}`}`;

    const formatEmailDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day}-${months[d.getMonth()]}`;
    };

    const items = [];

    (trip.hotel_trip_items || []).forEach(h => {
      items.push({
        date: h.from_date,
        period: `${formatEmailDate(h.from_date)} ${formatEmailDate(h.to_date)}`,
        location: h.city || '-',
        service: 'Overnight',
        hotel: h.hotel_name || h.hotels?.name || '-',
        room: h.room_type || '-',
        pax: trip.number_of_adults + (trip.number_of_kids || 0),
        nights: h.nights || '-',
        price: h.total_price ? parseFloat(h.total_price) : 0
      });
    });

    (trip.excursion_trip_items || []).forEach(e => {
      items.push({
        date: e.from_date,
        period: `${formatEmailDate(e.from_date)} -`,
        location: e.city || '-',
        service: e.excursion_name || e.excursions?.name || 'Excursion',
        hotel: '-',
        room: '-',
        pax: trip.number_of_adults + (trip.number_of_kids || 0),
        nights: '-',
        price: e.price ? parseFloat(e.price) : 0
      });
    });

    (trip.tour_trip_items || []).forEach(t => {
      items.push({
        date: t.from_date,
        period: `${formatEmailDate(t.from_date)} -`,
        location: t.from_location || '-',
        service: t.tours?.name || 'Tour',
        hotel: '-',
        room: '-',
        pax: trip.number_of_adults + (trip.number_of_kids || 0),
        nights: '-',
        price: t.price ? parseFloat(t.price) : 0
      });
    });

    (trip.transfer_trip_items || []).forEach(t => {
      items.push({
        date: t.from_date,
        period: `${formatEmailDate(t.from_date)} -`,
        location: t.city || '-',
        service: t.transfer_description || (t.from_location && t.to_location ? `${t.from_location} → ${t.to_location}` : 'Transfer'),
        hotel: '-',
        room: '-',
        pax: trip.number_of_adults + (trip.number_of_kids || 0),
        nights: '-',
        price: t.price ? parseFloat(t.price) : 0
      });
    });

    (trip.flight_trip_items || []).forEach(f => {
      items.push({
        date: f.from_date,
        period: `${formatEmailDate(f.from_date)} -`,
        location: '-',
        service: f.flight_number ? `Flight: ${f.flight_number}` : 'Flight',
        hotel: '-',
        room: '-',
        pax: trip.number_of_adults + (trip.number_of_kids || 0),
        nights: '-',
        price: f.price ? parseFloat(f.price) : 0
      });
    });

    (trip.other_trip_items || []).forEach(o => {
      items.push({
        date: o.from_date,
        period: `${formatEmailDate(o.from_date)} -`,
        location: '-',
        service: o.others?.name || 'Service',
        hotel: '-',
        room: '-',
        pax: trip.number_of_adults + (trip.number_of_kids || 0),
        nights: '-',
        price: o.price ? parseFloat(o.price) : 0
      });
    });

    // Sort chronologically by date
    items.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(a.date) - new Date(b.date);
    });

    const totalCost = trip.total_amount ? parseFloat(trip.total_amount) : 0;
    const discount = trip.discount_amount ? parseFloat(trip.discount_amount) : 0;
    const finalCost = trip.final_amount ? parseFloat(trip.final_amount) : 0;

    const tableRows = items.map(item => {
      return `
        <tr style="border: 1px solid #000;">
          <td style="border: 1px solid #000; padding: 6px; text-align: center; white-space: nowrap;">${item.period}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.location}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: left;">${item.service}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: left;">${item.hotel}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: left;">${item.room}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.pax}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: center;">${item.nights}</td>
          <td style="border: 1px solid #000; padding: 6px; text-align: right; white-space: nowrap;">${item.price > 0 ? 'THB ' + Number(item.price).toLocaleString('en-US') : '-'}</td>
        </tr>
      `;
    }).join('');

    let totalRowsHtml = `
      <tr style="border: 1px solid #000; font-weight: bold; background-color: #f9f9f9;">
        <td colspan="7" style="border: 1px solid #000; padding: 8px; text-align: right;">Total Price</td>
        <td style="border: 1px solid #000; padding: 8px; text-align: right; white-space: nowrap;">THB ${Number(totalCost).toLocaleString('en-US')}</td>
      </tr>
    `;
    if (discount > 0) {
      totalRowsHtml += `
        <tr style="border: 1px solid #000; font-weight: bold; background-color: #f9f9f9;">
          <td colspan="7" style="border: 1px solid #000; padding: 8px; text-align: right; color: #c0392b;">Discount</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right; white-space: nowrap; color: #c0392b;">-THB ${Number(discount).toLocaleString('en-US')}</td>
        </tr>
        <tr style="border: 1px solid #000; font-weight: bold; background-color: #fff9e6;">
          <td colspan="7" style="border: 1px solid #000; padding: 8px; text-align: right; font-size: 13px; color: #d35400;">Final Price</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right; white-space: nowrap; font-size: 13px; color: #d35400; border-bottom: 3px double #000;">THB ${Number(finalCost).toLocaleString('en-US')}</td>
        </tr>
      `;
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; font-size: 13px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <p>Dear Agent,</p>
        <p>Greetings from <strong>Verathailandia</strong>!</p>
        <p>${body || 'Please find as follow the requested quotation and attached the excursion and tour descriptions.'}</p>
        
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; margin-top: 20px; margin-bottom: 20px; border: 1px solid #000;">
          <thead>
            <tr style="background-color: #ffa600; color: #000000; font-weight: bold; border: 1px solid #000;">
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 80px;">Period</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 80px;">Location</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Service</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Hotel</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: left;">Typology of Room</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 40px;">Pax</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; width: 50px;">Nights</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: right; width: 100px;">Price in THB</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            ${totalRowsHtml}
          </tbody>
        </table>
        
        <p>The quotation includes the proposed accommodation, services, and the applicable rates based on your request.</p>
        <p>Should you require any amendments, alternative hotel options, additional services, or a customized itinerary, please do not hesitate to contact us. Our team will be pleased to assist you.</p>
        <p>We look forward to receiving your feedback and hope to have the opportunity to arrange this journey for you.</p>
        <p>Thank you for choosing Verathailandia.</p>
        <br>
        <p>Kind regards,<br><strong>Verathailandia Reservations Team!</strong></p>
        
        <div style="margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 20px; display: flex; align-items: flex-start; gap: 15px;">
          <div>
            <p style="font-size: 11px; color: #555; line-height: 1.5; margin: 0;">
              <strong>VeraThailandia Co., Ltd.</strong><br>
              20th Floor, Room 160/424-425, ITF Silom Palace<br>
              160 Silom Road, Suriya Wong, Bangrak, Bangkok 10500, Thailand<br>
              <strong>Tel:</strong> +66 2 126 6914<br>
              <strong>Tax ID:</strong> 0105540745569<br>
              <strong>Email:</strong> <a href="mailto:reservation@verathailandia.com" style="color: #3498db; text-decoration: none;">reservation@verathailandia.com</a><br>
              <strong>Website:</strong> <a href="https://www.verathailandia.com" target="_blank" style="color: #3498db; text-decoration: none;">www.verathailandia.com</a>
            </p>
            <p style="font-size: 11px; color: #27ae60; font-weight: bold; margin: 10px 0 0 0;">
              Before printing, think about environmental responsibility
            </p>
          </div>
        </div>
      </div>
    `;

    // Fetch and prepare service document attachments (tour/excursion)
    const tourIds = (trip.tour_trip_items || []).map(t => t.tour_id).filter(Boolean);
    const excursionIds = (trip.excursion_trip_items || []).map(e => e.excursion_id).filter(Boolean);

    const docRecords = await prisma.service_documents.findMany({
      where: {
        OR: [
          { service_type: 'tour', service_id: { in: tourIds } },
          { service_type: 'excursion', service_id: { in: excursionIds } }
        ]
      }
    });

    const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'service-docs');
    const attachments = docRecords.map(doc => {
      const filePath = path.join(UPLOAD_DIR, doc.file_path);
      if (fs.existsSync(filePath)) {
        return {
          filename: doc.file_name,
          path: filePath
        };
      }
      return null;
    }).filter(Boolean);

    if (!process.env.SMTP_USER) {
      console.warn('SMTP_USER not configured. Returning email preview.');
      await prisma.trips.update({
        where: { id },
        data: { email_sent: true }
      });
      return res.json({
        success: true,
        message: 'SMTP not configured. Email preview returned.',
        sent_to: toRecipient,
        cc: ccRecipient,
        subject: subjectLine,
        attachments: attachments.map(a => a.filename),
        html: htmlContent
      });
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toRecipient,
      cc: ccRecipient,
      subject: subjectLine,
      html: htmlContent,
      attachments
    });

    await prisma.trips.update({
      where: { id },
      data: { email_sent: true }
    });

    return res.json({
      success: true,
      message: 'Quotation email sent successfully',
      sent_to: toRecipient,
      cc: ccRecipient
    });
  } catch (err) { next(err); }
}

// ==================== CALCULATE COST ====================
export async function calculateExcursionCost(req, res, next) {
  try {
    const data = req.body;
    return res.json({ final_cost: 0, discount: 0, markup: 0 });
  } catch (err) { next(err); }
}

export async function calculateTourCost(req, res, next) {
  try {
    const data = req.body;
    return res.json({ final_cost: 0, discount: 0, markup: 0 });
  } catch (err) { next(err); }
}

export async function calculateTransferCost(req, res, next) {
  try {
    const data = req.body;
    return res.json({ final_cost: 0, discount: 0, markup: 0 });
  } catch (err) { next(err); }
}
