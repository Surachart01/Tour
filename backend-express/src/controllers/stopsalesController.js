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

export async function updateTourStopSaleStatus(req, res, next) {
  try {
    const data = req.body;
    
    // Check if updating an existing record by specific ID
    if (data.id) {
      const stopSale = await prisma.tour_stop_sales.update({
        where: { id: data.id },
        data: {
          stopped: data.stopped,
          attachment_url: data.attachment_url || null
        }
      });
      return res.json(stopSale);
    }
    
    const tourId = data.tour_id;
    if (!tourId) {
      return res.status(400).send('tour_id is required');
    }
    
    // Look for active stop sale records for the exact tour and dates
    const existing = await prisma.tour_stop_sales.findFirst({
      where: {
        tour_id: tourId,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        deleted_at: null
      }
    });
    
    let stopSale;
    if (existing) {
      stopSale = await prisma.tour_stop_sales.update({
        where: { id: existing.id },
        data: {
          stopped: data.stopped !== undefined ? data.stopped : true,
          attachment_url: data.attachment_url || existing.attachment_url
        }
      });
    } else {
      stopSale = await prisma.tour_stop_sales.create({
        data: {
          tour_id: tourId,
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
          stopped: data.stopped !== undefined ? data.stopped : true,
          attachment_url: data.attachment_url || null
        }
      });
    }

    // Send email notification to agents if requested
    if (data.notify_agents && process.env.SMTP_USER) {
      try {
        // Fetch tour info
        const tour = await prisma.tours.findUnique({
          where: { id: tourId },
          select: { name: true }
        });
        
        const tourName = tour ? tour.name : 'Unknown Tour';
        const startDateStr = new Date(data.start_date).toLocaleDateString();
        const endDateStr = new Date(data.end_date).toLocaleDateString();
        const statusStr = data.stopped === false ? 'START SALE (Available)' : 'STOP SALE (Not Available)';

        // Fetch agent emails
        const agents = await prisma.Agent.findMany({
          select: { email: true, name: true }
        });
        
        const agentEmails = agents.map(a => a.email).filter(Boolean);
        
        if (agentEmails.length > 0) {
          const subject = `[Availability Alert] ${statusStr}: ${tourName}`;
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: ${data.stopped === false ? '#27ae60' : '#c0392b'}; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
                Tour Sale Availability Update
              </h2>
              <p>Dear Partner Agent,</p>
              <p>Please be informed that the sales status for the following tour has been updated:</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr>
                  <td style="padding: 8px; font-weight: bold; width: 120px;">Tour:</td>
                  <td style="padding: 8px;">${tourName}</td>
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
        console.error('Error sending agent stop sale notification email for tour:', emailErr);
      }
    }
    
    return res.json(stopSale);
  } catch (err) { next(err); }
}

export async function getAvailableDatesForTour(req, res, next) {
  try {
    const tourId = parseInt(req.params.tour_id);
    if (isNaN(tourId)) return res.status(400).send('Invalid tour ID');
    const stopSales = await prisma.tour_stop_sales.findMany({
      where: { tour_id: tourId, deleted_at: null }
    });
    return res.json(stopSales);
  } catch (err) { next(err); }
}

export async function updateExcursionStopSaleStatus(req, res, next) {
  try {
    const data = req.body;
    const excursionId = Number.parseInt(data.excursion_id, 10);
    if (!Number.isFinite(excursionId)) {
      return res.status(400).send('excursion_id is required');
    }
    if (!data.start_date || !data.end_date) {
      return res.status(400).send('start_date and end_date are required');
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
      return res.status(400).send('Invalid stop sale date range');
    }

    const existing = await prisma.excursion_stop_sales.findFirst({
      where: {
        excursion_id: excursionId,
        start_date: startDate,
        end_date: endDate,
        deleted_at: null
      }
    });
    const values = {
      stopped: data.stopped !== false,
      attachment_url: data.attachment_url || existing?.attachment_url || null,
      updated_at: new Date()
    };
    const stopSale = existing
      ? await prisma.excursion_stop_sales.update({ where: { id: existing.id }, data: values })
      : await prisma.excursion_stop_sales.create({
          data: {
            excursion_id: excursionId,
            start_date: startDate,
            end_date: endDate,
            ...values
          }
        });

    if (data.notify_agents && process.env.SMTP_USER) {
      try {
        const [excursion, agents] = await Promise.all([
          prisma.excursions.findUnique({
            where: { id: excursionId },
            select: { name: true, city: true }
          }),
          prisma.agent.findMany({ select: { email: true } })
        ]);
        const recipients = agents.map((agent) => agent.email).filter(Boolean);
        if (recipients.length > 0) {
          const isStopped = values.stopped;
          const status = isStopped ? 'STOP SALE (Not Available)' : 'START SALE (Available)';
          const attachments = data.attachment_url
            ? [{
                filename: data.attachment_name || path.basename(data.attachment_url),
                path: path.join(process.cwd(), data.attachment_url.replace(/^\/+/, ''))
              }]
            : [];
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: recipients.join(','),
            subject: `[Availability Alert] ${status}: ${excursion?.name || 'Excursion'}`,
            html: `
              <div style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #ddd;padding:20px">
                <h2>Excursion Sale Availability Update</h2>
                <p>Dear Partner Agent,</p>
                <p>The excursion availability has been updated.</p>
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px;font-weight:bold">Excursion</td><td>${excursion?.name || '-'}</td></tr>
                  <tr><td style="padding:8px;font-weight:bold">City</td><td>${excursion?.city || '-'}</td></tr>
                  <tr><td style="padding:8px;font-weight:bold">Period</td><td>${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}</td></tr>
                  <tr><td style="padding:8px;font-weight:bold">Status</td><td>${status}</td></tr>
                </table>
              </div>
            `,
            attachments
          });
        }
      } catch (emailError) {
        console.error('Error sending excursion stop sale notification:', emailError);
      }
    }

    return res.json(stopSale);
  } catch (err) {
    next(err);
  }
}

export async function getAvailableDatesForExcursion(req, res, next) {
  try {
    const excursionId = Number.parseInt(req.params.excursion_id, 10);
    if (!Number.isFinite(excursionId)) return res.status(400).send('Invalid excursion ID');
    return res.json(await prisma.excursion_stop_sales.findMany({
      where: { excursion_id: excursionId, deleted_at: null },
      orderBy: [{ start_date: 'asc' }, { end_date: 'asc' }]
    }));
  } catch (err) {
    next(err);
  }
}

export async function updateSpecialPackageStopSaleStatus(req, res, next) {
  try {
    const data = req.body;
    
    // Check if updating an existing record by specific ID
    if (data.id) {
      const stopSale = await prisma.special_package_stop_sales.update({
        where: { id: data.id },
        data: {
          stopped: data.stopped,
          attachment_url: data.attachment_url || null
        }
      });
      return res.json(stopSale);
    }
    
    const packageId = data.special_package_id;
    if (!packageId) {
      return res.status(400).send('special_package_id is required');
    }
    
    // Look for active stop sale records for the exact package and dates
    const existing = await prisma.special_package_stop_sales.findFirst({
      where: {
        special_package_id: packageId,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        deleted_at: null
      }
    });
    
    let stopSale;
    if (existing) {
      stopSale = await prisma.special_package_stop_sales.update({
        where: { id: existing.id },
        data: {
          stopped: data.stopped !== undefined ? data.stopped : true,
          attachment_url: data.attachment_url || existing.attachment_url
        }
      });
    } else {
      stopSale = await prisma.special_package_stop_sales.create({
        data: {
          special_package_id: packageId,
          start_date: new Date(data.start_date),
          end_date: new Date(data.end_date),
          stopped: data.stopped !== undefined ? data.stopped : true,
          attachment_url: data.attachment_url || null
        }
      });
    }

    // Send email notification to agents if requested
    if (data.notify_agents && process.env.SMTP_USER) {
      try {
        const pkg = await prisma.special_packages.findUnique({
          where: { id: packageId },
          select: { name: true, code: true }
        });
        
        const agents = await prisma.agent.findMany({
          select: { email: true }
        });
        const agentEmails = agents.map(a => a.email).filter(e => e);
        
        if (agentEmails.length > 0) {
          const transporter = (await import('./emailController.js')).default || (await import('./emailController.js')).transporter;
          // Wait, emailController's transporter is not exported by default, let's load it or construct nodemailer transporter
          const nodemailer = (await import('nodemailer')).default;
          const mailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
          });

          const formattedStart = new Date(data.start_date).toLocaleDateString();
          const formattedEnd = new Date(data.end_date).toLocaleDateString();
          
          let subject, emailHtml;
          if (data.stopped) {
            subject = `[STOP SALE] Special Package Closeout: ${pkg.name}`;
            emailHtml = `
              <h3>Special Package Stop Sale Notice</h3>
              <p>Dear Agents,</p>
              <p>Please be informed that sales for the following Special Package are temporarily closed:</p>
              <ul>
                <li><strong>Package Name:</strong> ${pkg.name}</li>
                <li><strong>Package Code:</strong> ${pkg.code || 'N/A'}</li>
                <li><strong>Closed Dates:</strong> ${formattedStart} to ${formattedEnd}</li>
              </ul>
              <p>Please do not book this package during the above dates. Thank you for your cooperation.</p>
              <p>Best regards,<br/>Operations Team</p>
            `;
          } else {
            subject = `[START SALE] Special Package Reopened: ${pkg.name}`;
            emailHtml = `
              <h3>Special Package Reopened Notice</h3>
              <p>Dear Agents,</p>
              <p>Please be informed that the following Special Package is now reopened and available for booking:</p>
              <ul>
                <li><strong>Package Name:</strong> ${pkg.name}</li>
                <li><strong>Package Code:</strong> ${pkg.code || 'N/A'}</li>
                <li><strong>Available Dates:</strong> ${formattedStart} to ${formattedEnd}</li>
              </ul>
              <p>Best regards,<br/>Operations Team</p>
            `;
          }

          const emailAttachments = [];
          if (data.attachment_url) {
            const relativePath = data.attachment_url.startsWith('/') ? data.attachment_url.substring(1) : data.attachment_url;
            const absolutePath = path.join(process.cwd(), relativePath);
            emailAttachments.push({
              filename: path.basename(absolutePath),
              path: absolutePath
            });
          }

          await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: agentEmails.join(','),
            subject,
            html: emailHtml,
            attachments: emailAttachments
          });
        }
      } catch (emailErr) {
        console.error('Error sending agent stop sale notification email for special package:', emailErr);
      }
    }
    
    return res.json(stopSale);
  } catch (err) { next(err); }
}

export async function getAvailableDatesForSpecialPackage(req, res, next) {
  try {
    const packageId = parseInt(req.params.package_id);
    if (isNaN(packageId)) return res.status(400).send('Invalid special package ID');
    const stopSales = await prisma.special_package_stop_sales.findMany({
      where: { special_package_id: packageId, deleted_at: null }
    });
    return res.json(stopSales);
  } catch (err) { next(err); }
}
