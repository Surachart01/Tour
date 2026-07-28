import jwt from 'jsonwebtoken';
import { escapeWorkflowHtml } from './workflowEmail.js';

const JWT_SECRET = process.env.JWT_SECRET || 'WheelsApartSecretTokenKeyVerySecure32!';

export function createSupplierActionToken({ tripId, itemType, itemIds, action }) {
  return jwt.sign({
    purpose: 'supplier_booking_response',
    tripId: Number(tripId),
    itemType,
    itemIds: (Array.isArray(itemIds) ? itemIds : [itemIds]).map(Number),
    action
  }, JWT_SECRET, {
    expiresIn: process.env.SUPPLIER_ACTION_TOKEN_TTL || '180d'
  });
}

export function verifySupplierActionToken(token) {
  const claims = jwt.verify(token, JWT_SECRET);
  if (claims.purpose !== 'supplier_booking_response') {
    throw new Error('Invalid supplier action token');
  }
  return claims;
}

export function publicApiBaseUrl(req) {
  const configured = process.env.PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
  if (configured) return configured.replace(/\/+$/, '');

  const protocol = String(req.get('x-forwarded-proto') || req.protocol || 'https')
    .split(',')[0]
    .trim();
  const host = String(req.get('x-forwarded-host') || req.get('host') || '')
    .split(',')[0]
    .trim();
  return `${protocol}://${host}`;
}

export function buildSupplierActionButtons(req, { tripId, itemType, itemIds }) {
  const baseUrl = publicApiBaseUrl(req);
  const confirmToken = createSupplierActionToken({
    tripId, itemType, itemIds, action: 'confirm'
  });
  const declineToken = createSupplierActionToken({
    tripId, itemType, itemIds, action: 'decline'
  });
  const confirmUrl = `${baseUrl}/api/v1/supplier-response?token=${encodeURIComponent(confirmToken)}`;
  const declineUrl = `${baseUrl}/api/v1/supplier-response?token=${encodeURIComponent(declineToken)}`;

  return `
    <div style="margin:24px 0;text-align:center;">
      <a href="${escapeWorkflowHtml(confirmUrl)}" style="display:inline-block;margin:4px;padding:12px 20px;border-radius:6px;background:#16a34a;color:#fff;text-decoration:none;font-weight:700;">CONFIRM BOOKING</a>
      <a href="${escapeWorkflowHtml(declineUrl)}" style="display:inline-block;margin:4px;padding:12px 20px;border-radius:6px;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;">NOT AVAILABLE</a>
    </div>`;
}
