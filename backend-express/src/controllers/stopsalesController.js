import prisma from '../config/db.js';
import nodemailer from 'nodemailer';
import path from 'path';

// Nodemailer SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
});

export async function updateStopSaleStatus(req, res, next) {
  try {
    const data = req.body;
    
    // Check if updating an existing record by specific ID
    if (data.id) {
      const stopSale = await prisma.stop_sales.update({
        where: { id: data.id },
        data: {
          stopped: data.stopped,
          attachment_url: data.attachment_url || null
        }
      });
      return res.json(stopSale);
    }
    
    // Handle creating new stop sales
    const roomTypeIds = data.room_type_ids || (data.room_type_id ? [data.room_type_id] : []);
    if (roomTypeIds.length === 0) {
      return res.status(400).send('room_type_ids or room_type_id is required');
    }
    
    const results = [];
    
    // Process each room type
    for (const roomTypeId of roomTypeIds) {
      // Look for active stop sale records for the exact hotel, room, and dates
      const existing = await prisma.stop_sales.findFirst({
        where: {
          hotel_id: data.hotel_id,
          room_type_id: roomTypeId,
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
          deleted_at: null
        }
      });
      
      let stopSale;
      if (existing) {
        stopSale = await prisma.stop_sales.update({
          where: { id: existing.id },
          data: {
            stopped: data.stopped !== undefined ? data.stopped : true,
            attachment_url: data.attachment_url || existing.attachment_url
          }
        });
      } else {
        stopSale = await prisma.stop_sales.create({
          data: {
            hotel_id: data.hotel_id,
            room_type_id: roomTypeId,
            start_date: new Date(data.start_date),
            end_date: new Date(data.end_date),
            stopped: data.stopped !== undefined ? data.stopped : true,
            attachment_url: data.attachment_url || null
          }
        });
      }
      results.push(stopSale);
    }

    // Send email notification to agents if requested
    if (data.notify_agents && process.env.SMTP_USER) {
      try {
        // Fetch hotel info
        const hotel = await prisma.hotels.findUnique({
          where: { id: data.hotel_id },
          select: { name: true }
        });
        
        // Fetch room type info
        const roomTypes = await prisma.room_types.findMany({
          where: { id: { in: roomTypeIds } },
          select: { name: true }
        });
        
        const hotelName = hotel ? hotel.name : 'Unknown Hotel';
        const roomTypeNames = roomTypes.map(r => r.name);
        const startDateStr = new Date(data.start_date).toLocaleDateString();
        const endDateStr = new Date(data.end_date).toLocaleDateString();
        const statusStr = data.stopped === false ? 'START SALE (Available)' : 'STOP SALE (Not Available)';

        // Fetch agent emails
        const agents = await prisma.Agent.findMany({
          select: { email: true, name: true }
        });
        
        const agentEmails = agents.map(a => a.email).filter(Boolean);
        
        if (agentEmails.length > 0) {
          const subject = `[Availability Alert] ${statusStr}: ${hotelName}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: ${data.stopped === false ? '#27ae60' : '#c0392b'}; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
                Hotel Sale Availability Update
              </h2>
              <p>Dear Partner Agent,</p>
              <p>Please be informed that the sales status for the following hotel rooms has been updated:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; width: 120px;">Hotel:</td>
                  <td style="padding: 8px;">${hotelName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Room Type(s):</td>
                  <td style="padding: 8px;">${roomTypeNames.join(', ')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Period:</td>
                  <td style="padding: 8px;">${startDateStr} to ${endDateStr}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; font-weight: bold;">Status:</td>
                  <td style="padding: 8px; font-weight: bold; color: ${data.stopped === false ? '#27ae60' : '#c0392b'};">${statusStr}</td>
                </tr>
              </table>
              <p style="margin-top: 20px; color: #555; font-size: 13px;">
                This is an automated notification. If there are attachments, they have been enclosed with this email.
              </p>
            </div>
          `;

          const emailAttachments = [];
          if (data.attachment_url) {
            // Locate local file
            const fileId = path.basename(data.attachment_url);
            const absolutePath = path.join(process.cwd(), 'uploads', 'document', fileId);
            emailAttachments.push({
              filename: data.attachment_name || fileId,
              path: absolutePath
            });
          }

          // Send to all agents
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: agentEmails.join(','),
            subject,
            html: emailHtml,
            attachments: emailAttachments
          });
        }
      } catch (emailErr) {
        console.error('Error sending agent stop sale notification email:', emailErr);
      }
    }
    
    return res.json(results);
  } catch (err) { next(err); }
}

export async function getAvailableDatesForHotel(req, res, next) {
  try {
    const hotelId = parseInt(req.params.hotel_id);
    if (isNaN(hotelId)) return res.status(400).send('Invalid hotel ID');
    const stopSales = await prisma.stop_sales.findMany({
      where: { hotel_id: hotelId, deleted_at: null },
      include: { room_types: true }
    });
    return res.json(stopSales);
  } catch (err) { next(err); }
}
