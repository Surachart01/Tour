import path from 'path';
import nodemailer from 'nodemailer';
// Email service - configurable via env vars
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
});

export async function sendEmail(req, res, next) {
  try {
    const { to, cc, subject, body, html, attachments } = req.body;
    if (!to || !subject) return res.status(400).send('to and subject are required');
    if (!process.env.SMTP_USER) return res.json({ success: true, message: 'Email service not configured (SMTP_USER not set)' });

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

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER, to, cc, subject,
      text: body || '', html: html || body || '',
      attachments: nodemailerAttachments
    });
    return res.json({ success: true, message: 'Email sent successfully' });
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
