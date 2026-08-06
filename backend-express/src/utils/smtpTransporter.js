import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST || 'smtp.office365.com';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const isSecure = process.env.SMTP_SECURE !== undefined
  ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
  : smtpPort === 465;

const transporterCache = {};

function createTransporter(user, pass) {
  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: isSecure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 15000,
    socketTimeout: 15000,
    greetingTimeout: 15000,
    auth: { user, pass }
  });
}

export const SENDER_ROLES = {
  QUOTATION: 'quotation',
  RESERVATION: 'reservation',
  BOOKING: 'booking'
};

export function getTransporterForRole(role = SENDER_ROLES.QUOTATION) {
  let user = process.env.SMTP_USER || '';
  let pass = process.env.SMTP_PASS || '';

  if (role === SENDER_ROLES.BOOKING && process.env.SMTP_PASS_BOOKING) {
    user = process.env.SMTP_USER_BOOKING || 'booking@verathailandia.com';
    pass = process.env.SMTP_PASS_BOOKING;
  } else if (role === SENDER_ROLES.RESERVATION && process.env.SMTP_PASS_RESERVATION) {
    user = process.env.SMTP_USER_RESERVATION || 'reservation@verathailandia.com';
    pass = process.env.SMTP_PASS_RESERVATION;
  } else if (role === SENDER_ROLES.QUOTATION && process.env.SMTP_PASS_INFO) {
    user = process.env.SMTP_USER_INFO || 'info@verathailandia.com';
    pass = process.env.SMTP_PASS_INFO;
  }

  const key = `${user}:${pass}:${smtpHost}:${smtpPort}`;
  if (!transporterCache[key]) {
    transporterCache[key] = createTransporter(user, pass);
  }
  return transporterCache[key];
}

export function getSenderAddress(role = SENDER_ROLES.QUOTATION) {
  switch (role) {
    case SENDER_ROLES.BOOKING:
      return process.env.SMTP_FROM_BOOKING || 'VeraThailandia Bookings <booking@verathailandia.com>';
    case SENDER_ROLES.RESERVATION:
      return process.env.SMTP_FROM_RESERVATION || 'VeraThailandia Reservations <reservation@verathailandia.com>';
    case SENDER_ROLES.QUOTATION:
    default:
      return process.env.SMTP_FROM_QUOTATION || 'VeraThailandia Quotations <info@verathailandia.com>';
  }
}

const defaultTransporter = getTransporterForRole();
export default defaultTransporter;
