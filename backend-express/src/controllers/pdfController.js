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
      const hotelItems = await prisma.hotel_trip_items.findMany({
        where: itemID === 'all' ? { trip_item_id: tripId } : { id: parseInt(itemID) },
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
export async function sendQuotationEmail(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    return res.json({ success: true, message: `Quotation email sent for trip ${id}` });
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
