import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// ============================================================
// LIST ALL SPECIAL PACKAGES
// ============================================================
export async function listSpecialPackages(req, res, next) {
  try {
    const claims = req.user;
    const isAdmin = claims && claims.role === 'admin';

    const where = {};
    // Agents can only see active packages
    if (!isAdmin) {
      where.is_active = true;
    }

    // Optional filters
    if (req.query.city) {
      where.city = { contains: req.query.city, mode: 'insensitive' };
    }
    if (req.query.category) {
      where.category = { contains: req.query.category, mode: 'insensitive' };
    }
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search, mode: 'insensitive' } },
        { code: { contains: req.query.search, mode: 'insensitive' } },
        { city: { contains: req.query.search, mode: 'insensitive' } }
      ];
    }

    const packages = await prisma.special_packages.findMany({
      where,
      include: {
        currencies: true,
        items: {
          orderBy: [
            { day_number: 'asc' },
            { sort_order: 'asc' }
          ]
        }
      },
      orderBy: [
        { display_order: 'asc' },
        { created_at: 'desc' }
      ]
    });

    res.json(packages);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// GET SINGLE SPECIAL PACKAGE BY ID
// ============================================================
export async function getSpecialPackage(req, res, next) {
  try {
    const { id } = req.params;
    const pkg = await prisma.special_packages.findUnique({
      where: { id: parseInt(id) },
      include: {
        currencies: true,
        items: {
          orderBy: [
            { day_number: 'asc' },
            { sort_order: 'asc' }
          ]
        }
      }
    });

    if (!pkg) {
      return res.status(404).json({ error: 'Special package not found' });
    }

    // Agents can only see active packages
    const claims = req.user;
    if (claims && claims.role !== 'admin' && !pkg.is_active) {
      return res.status(404).json({ error: 'Special package not found' });
    }

    res.json(pkg);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// CREATE SPECIAL PACKAGE (Admin only)
// ============================================================
export async function createSpecialPackage(req, res, next) {
  try {
    const data = req.body;
    const claims = req.user;

    const items = data.items || [];

    const pkg = await prisma.$transaction(async (tx) => {
      const created = await tx.special_packages.create({
        data: {
          name: data.name,
          code: data.code || null,
          description: data.description || null,
          duration: parseInt(data.duration) || 1,
          city: data.city || null,
          category: data.category || null,
          price_per_adult: data.price_per_adult ? parseFloat(data.price_per_adult) : null,
          price_dbl: data.price_dbl ? parseFloat(data.price_dbl) : null,
          price_per_child: data.price_per_child ? parseFloat(data.price_per_child) : null,
          currency_id: data.currency_id ? parseInt(data.currency_id) : null,
          max_pax: data.max_pax ? parseInt(data.max_pax) : 20,
          min_pax: data.min_pax ? parseInt(data.min_pax) : 1,
          valid_from: data.valid_from ? new Date(data.valid_from) : null,
          valid_to: data.valid_to ? new Date(data.valid_to) : null,
          is_active: data.is_active !== undefined ? data.is_active : true,
          cover_image: data.cover_image || null,
          highlights: data.highlights || null,
          inclusions: data.inclusions || null,
          exclusions: data.exclusions || null,
          terms: data.terms || null,
          display_order: data.display_order !== undefined ? parseInt(data.display_order) : 0,
          created_by: claims ? claims.user_id : null
        }
      });

      if (items.length > 0) {
        await tx.special_package_items.createMany({
          data: items.map((item, index) => ({
            package_id: created.id,
            item_type: item.item_type,
            day_number: item.day_number ? parseInt(item.day_number) : 1,
            sort_order: item.sort_order !== undefined ? parseInt(item.sort_order) : index,
            hotel_id: item.hotel_id ? parseInt(item.hotel_id) : null,
            hotel_name: item.hotel_name || null,
            room_type: item.room_type || null,
            nights: item.nights ? parseInt(item.nights) : null,
            city: item.city || null,
            transfer_id: item.transfer_id ? parseInt(item.transfer_id) : null,
            transfer_type: item.transfer_type || null,
            from_location: item.from_location || null,
            to_location: item.to_location || null,
            pickup_time: item.pickup_time || null,
            excursion_id: item.excursion_id ? parseInt(item.excursion_id) : null,
            excursion_name: item.excursion_name || null,
            tour_id: item.tour_id ? parseInt(item.tour_id) : null,
            tour_name: item.tour_name || null,
            flight_number: item.flight_number || null,
            flight_airline: item.flight_airline || null,
            flight_route: item.flight_route || null,
            departure_time: item.departure_time || null,
            arrival_time: item.arrival_time || null,
            other_description: item.other_description || null,
            description: item.description || null,
            price: item.price ? parseFloat(item.price) : null,
            remarks: item.remarks || null
          }))
        });
      }

      return await tx.special_packages.findUnique({
        where: { id: created.id },
        include: {
          currencies: true,
          items: {
            orderBy: [
              { day_number: 'asc' },
              { sort_order: 'asc' }
            ]
          }
        }
      });
    });

    res.status(201).json(pkg);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// UPDATE SPECIAL PACKAGE (Admin only)
// ============================================================
export async function updateSpecialPackage(req, res, next) {
  try {
    const { id } = req.params;
    const data = req.body;
    const items = data.items || [];

    const existing = await prisma.special_packages.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Special package not found' });
    }

    const pkg = await prisma.$transaction(async (tx) => {
      // Update the main package
      await tx.special_packages.update({
        where: { id: parseInt(id) },
        data: {
          name: data.name !== undefined ? data.name : existing.name,
          code: data.code !== undefined ? data.code : existing.code,
          description: data.description !== undefined ? data.description : existing.description,
          duration: data.duration !== undefined ? parseInt(data.duration) : existing.duration,
          city: data.city !== undefined ? data.city : existing.city,
          category: data.category !== undefined ? data.category : existing.category,
          price_per_adult: data.price_per_adult !== undefined ? parseFloat(data.price_per_adult) : existing.price_per_adult,
          price_dbl: data.price_dbl !== undefined ? parseFloat(data.price_dbl) : existing.price_dbl,
          price_per_child: data.price_per_child !== undefined ? parseFloat(data.price_per_child) : existing.price_per_child,
          currency_id: data.currency_id !== undefined ? (data.currency_id ? parseInt(data.currency_id) : null) : existing.currency_id,
          max_pax: data.max_pax !== undefined ? parseInt(data.max_pax) : existing.max_pax,
          min_pax: data.min_pax !== undefined ? parseInt(data.min_pax) : existing.min_pax,
          valid_from: data.valid_from !== undefined ? (data.valid_from ? new Date(data.valid_from) : null) : existing.valid_from,
          valid_to: data.valid_to !== undefined ? (data.valid_to ? new Date(data.valid_to) : null) : existing.valid_to,
          is_active: data.is_active !== undefined ? data.is_active : existing.is_active,
          cover_image: data.cover_image !== undefined ? data.cover_image : existing.cover_image,
          highlights: data.highlights !== undefined ? data.highlights : existing.highlights,
          inclusions: data.inclusions !== undefined ? data.inclusions : existing.inclusions,
          exclusions: data.exclusions !== undefined ? data.exclusions : existing.exclusions,
          terms: data.terms !== undefined ? data.terms : existing.terms,
          display_order: data.display_order !== undefined ? parseInt(data.display_order) : existing.display_order,
          updated_at: new Date()
        }
      });

      // Delete old items and recreate
      if (data.items !== undefined) {
        await tx.special_package_items.deleteMany({
          where: { package_id: parseInt(id) }
        });

        if (items.length > 0) {
          await tx.special_package_items.createMany({
            data: items.map((item, index) => ({
              package_id: parseInt(id),
              item_type: item.item_type,
              day_number: item.day_number ? parseInt(item.day_number) : 1,
              sort_order: item.sort_order !== undefined ? parseInt(item.sort_order) : index,
              hotel_id: item.hotel_id ? parseInt(item.hotel_id) : null,
              hotel_name: item.hotel_name || null,
              room_type: item.room_type || null,
              nights: item.nights ? parseInt(item.nights) : null,
              city: item.city || null,
              transfer_id: item.transfer_id ? parseInt(item.transfer_id) : null,
              transfer_type: item.transfer_type || null,
              from_location: item.from_location || null,
              to_location: item.to_location || null,
              pickup_time: item.pickup_time || null,
              excursion_id: item.excursion_id ? parseInt(item.excursion_id) : null,
              excursion_name: item.excursion_name || null,
              tour_id: item.tour_id ? parseInt(item.tour_id) : null,
              tour_name: item.tour_name || null,
              flight_number: item.flight_number || null,
              flight_airline: item.flight_airline || null,
              flight_route: item.flight_route || null,
              departure_time: item.departure_time || null,
              arrival_time: item.arrival_time || null,
              other_description: item.other_description || null,
              description: item.description || null,
              price: item.price ? parseFloat(item.price) : null,
              remarks: item.remarks || null
            }))
          });
        }
      }

      return await tx.special_packages.findUnique({
        where: { id: parseInt(id) },
        include: {
          currencies: true,
          items: {
            orderBy: [
              { day_number: 'asc' },
              { sort_order: 'asc' }
            ]
          }
        }
      });
    });

    res.json(pkg);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// DELETE SPECIAL PACKAGE (Admin only)
// ============================================================
export async function deleteSpecialPackage(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.special_packages.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Special package not found' });
    }

    await prisma.$transaction(async (tx) => {
      // Nullify references in trips table first
      await tx.trips.updateMany({
        where: { special_package_id: parseInt(id) },
        data: { special_package_id: null }
      });
      // Delete child items
      await tx.special_package_items.deleteMany({
        where: { package_id: parseInt(id) }
      });
      // Delete the package itself
      await tx.special_packages.delete({
        where: { id: parseInt(id) }
      });
    });

    res.json({ message: 'Special package deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ============================================================
// TOGGLE ACTIVE STATUS (Admin only)
// ============================================================
export async function toggleSpecialPackage(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.special_packages.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Special package not found' });
    }

    const updated = await prisma.special_packages.update({
      where: { id: parseInt(id) },
      data: {
        is_active: !existing.is_active,
        updated_at: new Date()
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// CLONE SPECIAL PACKAGE (Admin only)
// ============================================================
export async function cloneSpecialPackage(req, res, next) {
  try {
    const { id } = req.params;
    const pkgId = parseInt(id);
    if (isNaN(pkgId)) {
      return res.status(400).json({ error: 'Invalid special package ID' });
    }

    // Fetch original package with items
    const original = await prisma.special_packages.findUnique({
      where: { id: pkgId },
      include: { items: true }
    });

    if (!original) {
      return res.status(404).json({ error: 'Special package not found' });
    }

    const clonedName = `${original.name} (Copy)`;
    const clonedData = {
      name: clonedName,
      code: original.code,
      description: original.description,
      duration: original.duration,
      city: original.city,
      category: original.category,
      price_per_adult: original.price_per_adult,
      price_dbl: original.price_dbl,
      price_per_child: original.price_per_child,
      currency_id: original.currency_id,
      max_pax: original.max_pax,
      min_pax: original.min_pax,
      valid_from: original.valid_from,
      valid_to: original.valid_to,
      is_active: original.is_active,
      cover_image: original.cover_image,
      highlights: original.highlights,
      inclusions: original.inclusions,
      exclusions: original.exclusions,
      terms: original.terms,
      created_by: req.user ? req.user.id : null,
      items: {
        create: original.items.map(item => ({
          item_type: item.item_type,
          day_number: item.day_number,
          sort_order: item.sort_order,
          hotel_id: item.hotel_id,
          hotel_name: item.hotel_name,
          room_type: item.room_type,
          nights: item.nights,
          city: item.city,
          transfer_id: item.transfer_id,
          transfer_type: item.transfer_type,
          from_location: item.from_location,
          to_location: item.to_location,
          pickup_time: item.pickup_time,
          excursion_id: item.excursion_id,
          excursion_name: item.excursion_name,
          tour_id: item.tour_id,
          tour_name: item.tour_name,
          flight_number: item.flight_number,
          flight_airline: item.flight_airline,
          flight_route: item.flight_route,
          departure_time: item.departure_time,
          arrival_time: item.arrival_time,
          other_description: item.other_description,
          description: item.description,
          price: item.price,
          remarks: item.remarks
        }))
      }
    };

    const clonedPackage = await prisma.special_packages.create({
      data: clonedData,
      include: { items: true }
    });

    res.json(clonedPackage);
  } catch (err) {
    next(err);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: { user: process.env.SMTP_USER || '', pass: process.env.SMTP_PASS || '' }
});

export async function sendBulkEmail(req, res, next) {
  try {
    const { packageName, items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items selected' });
    }

    let emailsSentCount = 0;

    for (const item of items) {
      let recipientEmail = 'reservation@verathailandia.com';
      let subject = '';
      let emailHtml = '';

      if (item.item_type === 'hotel') {
        if (item.hotel_id) {
          const hotel = await prisma.hotels.findUnique({
            where: { id: parseInt(item.hotel_id) },
            include: { hotel_contacts: true }
          });
          if (hotel && hotel.hotel_contacts && hotel.hotel_contacts.length > 0) {
            const contact = hotel.hotel_contacts.find(c => c.email);
            if (contact && contact.email) {
              recipientEmail = contact.email;
            }
          }
        }

        subject = `Special Package Inquiry - ${packageName} - Hotel: ${item.hotel_name}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; border-bottom: 2px solid #9b59b6; padding-bottom: 10px; margin-bottom: 20px;">
              <h2 style="color: #9b59b6; margin: 0;">VERA THAILANDIA</h2>
              <p style="margin: 5px 0 0; color: #73879C; font-size: 14px;">Special Package - Hotel Inquiry</p>
            </div>
            <p>Dear Partner,</p>
            <p>We would like to check the rates and availability for the following hotel stay from our special package <strong>"${packageName}"</strong>:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #9b59b6;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold; width: 120px;">Hotel Name:</td>
                  <td style="padding: 4px 0; color: #2A3F54; font-weight: bold;">${item.hotel_name}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Room Type:</td>
                  <td style="padding: 4px 0; color: #2A3F54;">${item.room_type || 'TBD'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Nights:</td>
                  <td style="padding: 4px 0; color: #2A3F54;">${item.nights || 1} Night(s)</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold;">City:</td>
                  <td style="padding: 4px 0; color: #2A3F54;">${item.city || ''}</td>
                </tr>
                ${item.remarks ? `
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold; vertical-align: top;">Remarks:</td>
                  <td style="padding: 4px 0; color: #d9534f;">${item.remarks}</td>
                </tr>` : ''}
              </table>
            </div>
            <p style="color: #73879C; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 10px;">
              VeraThailandia Co., Ltd.
            </p>
          </div>
        `;
      } else if (item.item_type === 'transfer') {
        if (item.transfer_id) {
          const transfer = await prisma.transfers.findUnique({
            where: { id: parseInt(item.transfer_id) },
            include: { suppliers: true }
          });
          if (transfer && transfer.suppliers && transfer.suppliers.email) {
            recipientEmail = transfer.suppliers.email;
          }
        }

        subject = `Special Package Inquiry - ${packageName} - Transfer: ${item.from_location} to ${item.to_location}`;
        emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <div style="text-align: center; border-bottom: 2px solid #9b59b6; padding-bottom: 10px; margin-bottom: 20px;">
              <h2 style="color: #9b59b6; margin: 0;">VERA THAILANDIA</h2>
              <p style="margin: 5px 0 0; color: #73879C; font-size: 14px;">Special Package - Transfer Inquiry</p>
            </div>
            <p>Dear Partner,</p>
            <p>We would like to check the rates and availability for the following transfer from our special package <strong>"${packageName}"</strong>:</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #9b59b6;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold; width: 120px;">Transfer Type:</td>
                  <td style="padding: 4px 0; color: #2A3F54; font-weight: bold;">Transfer (${item.transfer_type || 'SIC'})</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Route:</td>
                  <td style="padding: 4px 0; color: #2A3F54;">From ${item.from_location || 'TBD'} to ${item.to_location || 'TBD'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold;">Pickup Time:</td>
                  <td style="padding: 4px 0; color: #2A3F54;">${item.pickup_time || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold;">City:</td>
                  <td style="padding: 4px 0; color: #2A3F54;">${item.city || ''}</td>
                </tr>
                ${item.remarks ? `
                <tr>
                  <td style="padding: 4px 0; color: #73879C; font-weight: bold; vertical-align: top;">Remarks:</td>
                  <td style="padding: 4px 0; color: #d9534f;">${item.remarks}</td>
                </tr>` : ''}
              </table>
            </div>
            <p style="color: #73879C; font-size: 12px; text-align: center; margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 10px;">
              VeraThailandia Co., Ltd.
            </p>
          </div>
        `;
      }

      if (subject && emailHtml) {
        if (process.env.SMTP_USER) {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: recipientEmail,
            subject: subject,
            html: emailHtml
          });
        } else {
          console.log(`[SMTP Not Configured] Would send email to ${recipientEmail} with subject: ${subject}`);
        }
        emailsSentCount++;
      }
    }

    return res.json({ success: true, message: `Bulk email inquiry sent successfully to ${emailsSentCount} partners/suppliers.` });
  } catch (err) {
    next(err);
  }
}
