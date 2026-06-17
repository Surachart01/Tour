import prisma from '../config/db.js';
import PDFDocument from 'pdfkit';

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
        doc.fontSize(10).text(`• ${h.hotel_name || h.hotels?.name || 'N/A'} - ${h.city} (${h.nights} nights)`);
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
    const { itemType, itemID } = req.params;
    return res.json({ success: true, message: `Notification sent for ${itemType} item ${itemID}` });
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
