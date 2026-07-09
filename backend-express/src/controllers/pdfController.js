import prisma from '../config/db.js';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
});

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

export async function generateTripPDF(req, res, next) { return generateQuotationPDF(req, res, next); }
export async function generateTripServicesPDF(req, res, next) { return generateQuotationPDF(req, res, next); }

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
      let whereClause = {};
      if (itemID === 'all') {
        whereClause = { trip_item_id: tripId };
      } else if (itemID.startsWith('group_')) {
        const ids = itemID.replace('group_', '').split('_').map(x => parseInt(x)).filter(Boolean);
        whereClause = { id: { in: ids } };
      } else {
        whereClause = { id: parseInt(itemID) };
      }

      const hotelItems = await prisma.hotel_trip_items.findMany({
        where: whereClause,
        include: { hotels: { include: { hotel_contacts: true } } }
      });

      if (hotelItems.length === 0) {
        return res.status(404).json({ success: false, message: 'No hotel items found' });
      }

      // Group items by hotel_id / hotel_name
      const grouped = {};
      hotelItems.forEach(item => {
        const key = item.hotel_id || item.hotel_name;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
      });

      // For each group, sort by from_date and consolidate consecutive stays
      for (const key in grouped) {
        const sortedItems = grouped[key].sort((a, b) => new Date(a.from_date) - new Date(b.from_date));
        
        const consolidatedList = [];
        let currentConsolidated = null;

        for (const item of sortedItems) {
          const itemFrom = new Date(item.from_date);
          const itemTo = new Date(item.to_date);

          if (currentConsolidated && 
              new Date(currentConsolidated.to_date).toDateString() === itemFrom.toDateString() &&
              currentConsolidated.room_type === item.room_type
          ) {
            currentConsolidated.to_date = itemTo;
            currentConsolidated.nights += item.nights || 1;
            currentConsolidated.remarks.push(item.notes);
            currentConsolidated.originalItems.push(item);
          } else {
            currentConsolidated = {
              hotel_id: item.hotel_id,
              hotel_name: item.hotel_name,
              room_type: item.room_type || 'Standard',
              from_date: itemFrom,
              to_date: itemTo,
              nights: item.nights || 1,
              remarks: [item.notes].filter(Boolean),
              originalItems: [item]
            };
            consolidatedList.push(currentConsolidated);
          }
        }

        // For each consolidated stay, build and send the email
        for (const stay of consolidatedList) {
          // Get hotel contact email
          let recipientEmail = 'reservation@verathailandia.com'; // fallback
          const firstOriginalItem = stay.originalItems[0];
          if (firstOriginalItem.hotels?.hotel_contacts?.length) {
            const contact = firstOriginalItem.hotels.hotel_contacts.find(c => c.email);
            if (contact?.email) recipientEmail = contact.email;
          }

          const remarksStr = [...new Set(stay.remarks)].join(', ');

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
                    <td style="padding: 4px 0; color: #2A3F54; font-weight: bold;">${stay.hotel_name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Room Type:</td>
                    <td style="padding: 4px 0; color: #2A3F54;">${stay.room_type}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Check-in:</td>
                    <td style="padding: 4px 0; color: #2A3F54;">${formatDate(stay.from_date)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Check-out:</td>
                    <td style="padding: 4px 0; color: #2A3F54;">${formatDate(stay.to_date)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Total Nights:</td>
                    <td style="padding: 4px 0; color: #2A3F54;">${stay.nights} night(s)</td>
                  </tr>
                  ${remarksStr ? `
                  <tr>
                    <td style="padding: 4px 0; color: #73879C; font-weight: bold; vertical-align: top;">Remarks:</td>
                    <td style="padding: 4px 0; color: #d9534f;">${remarksStr}</td>
                  </tr>` : ''}
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
              subject: `Hotel Stay Booking - Ref: ${trip.booking_reference || trip.id} - ${stay.hotel_name}`,
              html: emailHtml
            });
          }

          // Mark all original items as email_sent = true in DB
          const ids = stay.originalItems.map(x => x.id);
          await prisma.hotel_trip_items.updateMany({
            where: { id: { in: ids } },
            data: { email_sent: true }
          });
        }
      }

      return res.json({ success: true, message: `Consolidated notification(s) sent successfully for hotels.` });
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
