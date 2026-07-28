import prisma from '../config/db.js';
import { verifySupplierActionToken } from '../utils/supplierActions.js';

const MODEL_BY_TYPE = {
  hotel: 'hotel_trip_items',
  transfer: 'transfer_trip_items',
  excursion: 'excursion_trip_items',
  tour: 'tour_trip_items'
};

function responsePage({ success, title, message }) {
  const color = success ? '#15803d' : '#b91c1c';
  const background = success ? '#f0fdf4' : '#fef2f2';
  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#1f2937;">
        <main style="max-width:620px;margin:8vh auto;padding:24px;">
          <section style="background:#fff;border:1px solid #dbe5ec;border-radius:8px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,.10);">
            <header style="background:#243b53;color:#fff;padding:20px 24px;font-size:20px;font-weight:700;">VeraThailandia</header>
            <div style="padding:32px 24px;">
              <div style="display:inline-block;padding:7px 12px;border-radius:5px;background:${background};color:${color};font-weight:700;">${title}</div>
              <p style="font-size:16px;line-height:1.6;margin:20px 0 0;">${message}</p>
            </div>
          </section>
        </main>
      </body>
    </html>`;
}

function confirmationPage(claims, token) {
  const action = claims.action === 'confirm' ? 'confirm' : claims.action === 'decline' ? 'decline' : null;
  if (!action) return null;

  const isConfirm = action === 'confirm';
  const title = isConfirm ? 'Confirm Booking' : 'Report Not Available';
  const message = isConfirm
    ? 'Please confirm that the selected service is available and reserved.'
    : 'Please confirm that the selected service is not available.';
  const buttonLabel = isConfirm ? 'CONFIRM BOOKING' : 'NOT AVAILABLE';
  const buttonColor = isConfirm ? '#15803d' : '#b91c1c';
  const safeToken = String(token).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;');

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${title}</title>
      </head>
      <body style="margin:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#1f2937;">
        <main style="max-width:620px;margin:8vh auto;padding:24px;">
          <section style="background:#fff;border:1px solid #dbe5ec;border-radius:8px;overflow:hidden;box-shadow:0 12px 32px rgba(15,23,42,.10);">
            <header style="background:#243b53;color:#fff;padding:20px 24px;font-size:20px;font-weight:700;">VeraThailandia</header>
            <div style="padding:32px 24px;">
              <h1 style="font-size:22px;margin:0 0 12px;">${title}</h1>
              <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">${message}</p>
              <form method="post" action="/api/v1/supplier-response">
                <input type="hidden" name="token" value="${safeToken}">
                <button type="submit" style="appearance:none;border:0;border-radius:6px;background:${buttonColor};color:#fff;padding:13px 20px;font-size:15px;font-weight:700;cursor:pointer;">${buttonLabel}</button>
              </form>
            </div>
          </section>
        </main>
      </body>
    </html>`;
}

export async function showSupplierResponse(req, res) {
  try {
    const token = String(req.query.token || '');
    const claims = verifySupplierActionToken(token);
    const page = confirmationPage(claims, token);
    if (!page) throw new Error('Invalid supplier action');
    return res.send(page);
  } catch (error) {
    const expired = error?.name === 'TokenExpiredError';
    return res.status(400).send(responsePage({
      success: false,
      title: expired ? 'Link Expired' : 'Invalid Request',
      message: expired
        ? 'This response link has expired. Please contact VeraThailandia for a new request.'
        : 'This supplier response link could not be verified.'
    }));
  }
}

export async function handleSupplierResponse(req, res) {
  try {
    const claims = verifySupplierActionToken(String(req.body?.token || req.query.token || ''));
    const model = MODEL_BY_TYPE[claims.itemType];
    const tripId = Number(claims.tripId);
    const itemIds = [...new Set((claims.itemIds || []).map(Number).filter(Number.isInteger))];

    if (!model || !Number.isInteger(tripId) || itemIds.length === 0) {
      return res.status(400).send(responsePage({
        success: false,
        title: 'Invalid Request',
        message: 'This supplier response link is invalid.'
      }));
    }

    const action = claims.action === 'confirm' ? 'confirm' : claims.action === 'decline' ? 'decline' : null;
    if (!action) {
      return res.status(400).send(responsePage({
        success: false,
        title: 'Invalid Request',
        message: 'This supplier response action is invalid.'
      }));
    }

    const result = await prisma.$transaction(async (transaction) => {
      const booking = await transaction.trips.findFirst({
        where: {
          id: tripId,
          is_booking: true,
          status: { in: ['InProgress', 'Approved', 'Confirmed'] }
        },
        select: { id: true }
      });
      if (!booking) return { found: false, bookingFound: false };

      const items = await transaction[model].findMany({
        where: { id: { in: itemIds }, trip_item_id: tripId },
        select: { id: true }
      });
      if (items.length !== itemIds.length) return { found: false, bookingFound: true };

      await transaction[model].updateMany({
        where: { id: { in: itemIds }, trip_item_id: tripId },
        data: action === 'confirm'
          ? { approved: true, declined: false }
          : { approved: false, declined: true }
      });

      if (action === 'decline') {
        await transaction.trips.updateMany({
          where: { id: tripId, status: 'Confirmed' },
          data: { status: 'InProgress', approved: false, updated_at: new Date() }
        });
      }

      return { found: true, bookingFound: true };
    });

    if (!result.bookingFound) {
      return res.status(404).send(responsePage({
        success: false,
        title: 'Booking Not Found',
        message: 'This response link does not belong to an active booking.'
      }));
    }

    if (!result.found) {
      return res.status(404).send(responsePage({
        success: false,
        title: 'Service Not Found',
        message: 'The selected booking service is no longer available.'
      }));
    }

    const confirmed = action === 'confirm';
    return res.send(responsePage({
      success: true,
      title: confirmed ? 'Booking Confirmed' : 'Availability Declined',
      message: confirmed
        ? 'Thank you. The service has been marked as confirmed and the reservations team has been updated.'
        : 'Thank you. The service has been marked as not available and the reservations team has been updated.'
    }));
  } catch (error) {
    const expired = error?.name === 'TokenExpiredError';
    return res.status(400).send(responsePage({
      success: false,
      title: expired ? 'Link Expired' : 'Invalid Request',
      message: expired
        ? 'This response link has expired. Please contact VeraThailandia for a new request.'
        : 'This supplier response link could not be verified.'
    }));
  }
}
