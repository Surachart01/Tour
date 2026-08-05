import nodemailer from 'nodemailer';

// Intelligent SMTP Transporter with connection pooling for high reliability on cloud hosts (Railway, Heroku, AWS)
const smtpPort = Number(process.env.SMTP_PORT || 465);
const isSecure = process.env.SMTP_SECURE !== undefined
  ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
  : smtpPort === 465;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: smtpPort,
  secure: isSecure,
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  connectionTimeout: 15000,
  socketTimeout: 15000,
  greetingTimeout: 15000,
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
});

export default transporter;
