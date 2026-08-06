import dns from 'dns';
import nodemailer from 'nodemailer';

// Force Node.js DNS resolver to prioritize IPv4 over IPv6 globally across the application.
// This prevents ENETUNREACH errors on Railway, Docker, and Cloud Run containers when connecting to Office365 SMTP.
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

function customIPv4Lookup(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
}

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
    lookup: customIPv4Lookup,
    family: 4,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 5000,
    socketTimeout: 10000,
    greetingTimeout: 5000,
    auth: { user, pass }
  });
}

export const SENDER_ROLES = {
  QUOTATION: 'quotation',
  RESERVATION: 'reservation',
  BOOKING: 'booking'
};

export function getTransporterForRole(role = SENDER_ROLES.QUOTATION) {
  let user = process.env.SMTP_USER_RESERVATION || process.env.SMTP_USER || 'reservation@verathailandia.com';
  let pass = process.env.SMTP_PASS_RESERVATION || process.env.SMTP_PASS || '';

  if (role === SENDER_ROLES.BOOKING && process.env.SMTP_PASS_BOOKING) {
    user = process.env.SMTP_USER_BOOKING || 'booking@verathailandia.com';
    pass = process.env.SMTP_PASS_BOOKING;
  } else if (role === SENDER_ROLES.RESERVATION && process.env.SMTP_PASS_RESERVATION) {
    user = process.env.SMTP_USER_RESERVATION || 'reservation@verathailandia.com';
    pass = process.env.SMTP_PASS_RESERVATION;
  } else if (role === SENDER_ROLES.QUOTATION) {
    if (process.env.SMTP_PASS_INFO && process.env.SMTP_USER_INFO && process.env.SMTP_USER_INFO !== 'info@verathailandia.com') {
      user = process.env.SMTP_USER_INFO;
      pass = process.env.SMTP_PASS_INFO;
    } else if (process.env.SMTP_PASS_RESERVATION) {
      user = process.env.SMTP_USER_RESERVATION || 'reservation@verathailandia.com';
      pass = process.env.SMTP_PASS_RESERVATION;
    }
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
      return process.env.SMTP_FROM_QUOTATION || 'VeraThailandia Quotations <reservation@verathailandia.com>';
  }
}

const defaultTransporter = getTransporterForRole();
export default defaultTransporter;
