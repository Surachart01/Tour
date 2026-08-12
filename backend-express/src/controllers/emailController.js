import path from 'path';
import prisma from '../config/db.js';
import transporter from '../utils/smtpTransporter.js';
import { prepareEmailWithStandardFooter } from '../utils/emailFooter.js';

export async function sendEmail(req, res, next) {
  try {
    const { to, cc, subject, body, html, attachments } = req.body;
    if (!to || !subject) return res.status(400).send('to and subject are required');
    const nodemailerAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.url) {
          const relativePath = att.url.startsWith('/') ? att.url.substring(1) : att.url;
          const absolutePath = path.join(process.cwd(), relativePath);
          nodemailerAttachments.push({
            filename: att.filename || path.basename(absolutePath),
            path: absolutePath
          });
        }
      }
    }

    const targetTo = process.env.TEST_EMAIL_RECIPIENT || to;
    const targetCc = process.env.TEST_EMAIL_RECIPIENT ? undefined : cc;
    const targetSubject = process.env.TEST_EMAIL_RECIPIENT
      ? `[TEST MODE -> To: ${to}] ${subject}`
      : subject;

    const fromAddress = process.env.SMTP_FROM_RESERVATION || process.env.SMTP_FROM || 'VeraThailandia Reservations <reservation@verathailandia.com>';

    await transporter.sendMail(prepareEmailWithStandardFooter({
      from: fromAddress,
      to: targetTo,
      cc: targetCc,
      subject: targetSubject,
      text: body || '',
      html: html || body || '',
      attachments: nodemailerAttachments
    }, { senderEmail: fromAddress }));
    return res.json({ success: true, message: `Email sent successfully to ${targetTo}` });
  } catch (err) { next(err); }
}

export async function sendBookingConfirmation(req, res, next) {
  try {
    const { booking_id, to } = req.body;
    return res.json({ success: true, message: 'Booking confirmation email sent' });
  } catch (err) { next(err); }
}

export async function sendQuotation(req, res, next) {
  try {
    const { quotation_id, to } = req.body;
    return res.json({ success: true, message: 'Quotation email sent' });
  } catch (err) { next(err); }
}

export async function sendPromo(req, res, next) {
  try {
    const { to, cc, subject, body, attachments } = req.body;
    if (!to || !subject) return res.status(400).send('to and subject are required');
    if (!process.env.SMTP_USER) return res.status(500).send('Email service not configured');

    const nodemailerAttachments = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        if (att.url) {
          const relativePath = att.url.startsWith('/') ? att.url.substring(1) : att.url;
          const absolutePath = path.join(process.cwd(), relativePath);
          nodemailerAttachments.push({
            filename: att.filename || path.basename(absolutePath),
            path: absolutePath
          });
        }
      }
    }

    // Send email
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transporter.sendMail(prepareEmailWithStandardFooter({
      from: fromAddress, to, cc, subject,
      text: body || '', html: body || '',
      attachments: nodemailerAttachments
    }, { senderEmail: fromAddress }));

    // Save promo to database
    const promo = await prisma.special_promos.create({
      data: {
        subject,
        body,
        recipients: to,
        attachments: attachments ? JSON.stringify(attachments) : null
      }
    });

    return res.json({ success: true, message: 'Promotion sent and saved successfully', promo });
  } catch (err) { next(err); }
}

export async function listPromos(req, res, next) {
  try {
    const claims = req.user;
    let promos = [];
    if (claims.role === 'admin' || claims.role === 'superadmin') {
      promos = await prisma.special_promos.findMany({
        orderBy: { created_at: 'desc' }
      });
    } else {
      // Agent role: find agent email
      const user = await prisma.user.findUnique({
        where: { id: claims.user_id },
        include: { agent: true }
      });
      const agentEmail = user?.agent?.email || claims.email;
      if (!agentEmail) {
        return res.json([]);
      }

      // Retrieve all promos and filter in JS memory
      const allPromos = await prisma.special_promos.findMany({
        orderBy: { created_at: 'desc' }
      });
      
      promos = allPromos.filter(p => {
        const recipientsList = p.recipients.split(',').map(r => r.trim().toLowerCase());
        return recipientsList.includes(agentEmail.toLowerCase());
      });
    }

    // Map attachments back to objects
    const response = promos.map(p => ({
      id: p.id,
      subject: p.subject,
      body: p.body,
      recipients: p.recipients,
      created_at: p.created_at,
      attachments: p.attachments ? JSON.parse(p.attachments) : []
    }));

    return res.json(response);
  } catch (err) { next(err); }
}
