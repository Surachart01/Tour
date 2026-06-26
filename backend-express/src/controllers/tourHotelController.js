import prisma from '../config/db.js';

// Helper function to calculate check-in/out dates relative to tour start date
function calculateHotelDates(tourStartDate, day) {
  const checkInDate = new Date(tourStartDate);
  checkInDate.setDate(checkInDate.getDate() + (day - 1));
  
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 1);

  const format = (d) => {
    const dayVal = String(d.getDate()).padStart(2, '0');
    const monthVal = String(d.getMonth() + 1).padStart(2, '0');
    const yearVal = d.getFullYear();
    return `${dayVal}-${monthVal}-${yearVal}`;
  };

  return {
    checkIn: format(checkInDate),
    checkOut: format(checkOutDate)
  };
}

// Helper to format date to DD-MM-YYYY
function formatDateToDDMMYYYY(date) {
  if (!date) return '';
  const d = new Date(date);
  const dayVal = String(d.getDate()).padStart(2, '0');
  const monthVal = String(d.getMonth() + 1).padStart(2, '0');
  const yearVal = d.getFullYear();
  return `${dayVal}-${monthVal}-${yearVal}`;
}

export async function getTourHotels(req, res, next) {
  try {
    const tourItemId = parseInt(req.params.tour_item_id);
    if (isNaN(tourItemId)) return res.status(400).send('Invalid tour item ID');

    const tourItem = await prisma.tour_trip_items.findUnique({
      where: { id: tourItemId },
      include: { tours: true }
    });
    if (!tourItem) return res.status(404).send('Tour trip item not found');

    // Get hotel overrides
    const overrides = await prisma.tour_trip_item_hotels.findMany({
      where: { tour_trip_item_id: tourItemId },
      orderBy: { day: 'asc' }
    });

    const response = {
      tour_trip_item_id: tourItemId,
      tour_id: tourItem.tour_id || 0,
      tour_name: tourItem.tours?.name || '',
      tour_start_date: formatDateToDDMMYYYY(tourItem.from_date),
      tour_end_date: formatDateToDDMMYYYY(tourItem.to_date),
      has_overrides: overrides.length > 0,
      hotels: []
    };

    if (overrides.length > 0) {
      // Deduplicate by day — keep only the last entry per day to fix existing duplicate DB rows
      const dedupMap = new Map();
      for (const override of overrides) {
        dedupMap.set(override.day, override);
      }
      const uniqueOverrides = Array.from(dedupMap.values());

      response.hotels = uniqueOverrides.map(override => {
        const { checkIn, checkOut } = calculateHotelDates(tourItem.from_date, override.day);
        return {
          day: override.day,
          check_in_date: checkIn,
          check_out_date: checkOut,
          hotel_id: override.hotel_id,
          hotel_name: override.hotel_name,
          room_type: override.room_type || '',
          city: override.city || '',
          replacement_note: override.replacement_note || '',
          is_override: true
        };
      });
    } else {
      // If no overrides, return hotels from tour definition
      if (!tourItem.tour_id) {
        return res.json(response);
      }

      const tour = await prisma.tours.findUnique({
        where: { id: tourItem.tour_id },
        include: {
          tour_days: {
            include: {
              tour_details: true
            },
            orderBy: {
              day: 'asc'
            }
          }
        }
      });

      const hotelsList = [];
      if (tour && tour.tour_days) {
        for (const day of tour.tour_days) {
          if (day.tour_details) {
            // Take only the first detail per day that has a hotel_name
            const detail = day.tour_details.find(d => d.hotel_name && d.hotel_name.trim() !== '');
            if (detail) {
              const { checkIn, checkOut } = calculateHotelDates(tourItem.from_date, day.day);
              hotelsList.push({
                day: day.day,
                check_in_date: checkIn,
                check_out_date: checkOut,
                hotel_id: detail.hotel_id,
                hotel_name: detail.hotel_name,
                room_type: detail.room_type || '',
                city: detail.city || '',
                is_override: false
              });
            }
          }
        }
      }
      response.hotels = hotelsList;
    }

    return res.json(response);
  } catch (err) { next(err); }
}

export async function updateTourHotels(req, res, next) {
  try {
    const tourItemId = parseInt(req.params.tour_item_id);
    if (isNaN(tourItemId)) return res.status(400).send('Invalid tour item ID');

    const { hotels } = req.body;
    console.log('--- updateTourHotels called --- hotels length:', hotels.length, 'body:', JSON.stringify(hotels));
    if (!Array.isArray(hotels)) {
      return res.status(400).send('hotels must be an array');
    }

    // Deduplicate incoming hotels by day number (last one wins) to prevent future duplicate DB rows
    const incomingDedupMap = new Map();
    for (const h of hotels) {
      const dayNum = parseInt(h.day);
      if (!h.hotel_name) {
        return res.status(400).send('Hotel name is required');
      }
      if (!h.day || isNaN(dayNum)) {
        return res.status(400).send('Valid day is required');
      }
      incomingDedupMap.set(dayNum, h);
    }
    const uniqueIncomingHotels = Array.from(incomingDedupMap.values());

    // Parse values and lookup hotel_ids by name
    const preparedHotels = [];
    for (const h of uniqueIncomingHotels) {
      if (!h.hotel_name) {
        return res.status(400).send('Hotel name is required');
      }
      if (!h.day || isNaN(parseInt(h.day))) {
        return res.status(400).send('Valid day is required');
      }

      let matchedHotelId = h.hotel_id ? parseInt(h.hotel_id) : null;
      if (isNaN(matchedHotelId)) {
        matchedHotelId = null;
      }

      // If no valid hotel_id, try to find in database by name
      if (!matchedHotelId && h.hotel_name) {
        const found = await prisma.hotels.findFirst({
          where: { name: h.hotel_name }
        });
        if (found) {
          matchedHotelId = found.id;
        }
      }

      preparedHotels.push({
        tour_trip_item_id: tourItemId,
        day: parseInt(h.day),
        hotel_id: matchedHotelId,
        hotel_name: h.hotel_name,
        room_type: h.room_type || null,
        city: h.city || null,
        replacement_note: h.replacement_note || null
      });
    }

    await prisma.$transaction(async (tx) => {
      // Delete existing overrides
      await tx.tour_trip_item_hotels.deleteMany({
        where: { tour_trip_item_id: tourItemId }
      });

      if (preparedHotels.length === 0) {
        return;
      }

      // Create new overrides
      await tx.tour_trip_item_hotels.createMany({
        data: preparedHotels
      });
    });

    // Return the updated list in the same response format
    const tourItem = await prisma.tour_trip_items.findUnique({
      where: { id: tourItemId },
      include: { tours: true }
    });
    
    // Get newly created overrides
    const overrides = await prisma.tour_trip_item_hotels.findMany({
      where: { tour_trip_item_id: tourItemId },
      orderBy: { day: 'asc' }
    });

    const response = {
      tour_trip_item_id: tourItemId,
      tour_id: tourItem.tour_id || 0,
      tour_name: tourItem.tours?.name || '',
      tour_start_date: formatDateToDDMMYYYY(tourItem.from_date),
      tour_end_date: formatDateToDDMMYYYY(tourItem.to_date),
      has_overrides: overrides.length > 0,
      hotels: overrides.map(override => {
        const { checkIn, checkOut } = calculateHotelDates(tourItem.from_date, override.day);
        return {
          day: override.day,
          check_in_date: checkIn,
          check_out_date: checkOut,
          hotel_id: override.hotel_id,
          hotel_name: override.hotel_name,
          room_type: override.room_type || '',
          city: override.city || '',
          replacement_note: override.replacement_note || '',
          is_override: true
        };
      })
    };

    return res.json(response);
  } catch (err) { next(err); }
}
