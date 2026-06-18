// Prisma numeric fields might be decimal objects, but standard math works on numbers

function applyMarkup(basePrice, markupValue, markupUnit) {
  let finalPrice;
  if (markupUnit === '%') {
    finalPrice = basePrice * (1 + markupValue / 100);
  } else {
    finalPrice = basePrice + markupValue;
  }
  // Applying ceiling to the nearest multiple of 10
  return Math.ceil(finalPrice / 10) * 10;
}

export function calculateMarkedUpPrice(basePrice, markupGroup, serviceType, markups) {
  const markup = markups.find(m => m.markup_group === markupGroup);
  if (!markup) {
    return basePrice;
  }

  let finalPrice;
  switch (serviceType) {
    case 'hotel': {
      // Find matching hotel markup percentage tier
      const hotelMarkup = (markup.hotel_markup_percentages || []).find(
        hm => basePrice >= parseFloat(hm.price_from) && basePrice <= parseFloat(hm.price_to)
      );
      if (!hotelMarkup) {
        return basePrice;
      }
      finalPrice = applyMarkup(basePrice, parseFloat(hotelMarkup.markup_percentage), '%');
      break;
    }
    case 'excursion':
      finalPrice = applyMarkup(basePrice, parseFloat(markup.excursion_markup || 0), markup.excursion_markup_unit);
      break;
    case 'tour':
      finalPrice = applyMarkup(basePrice, parseFloat(markup.tour_markup || 0), markup.tour_markup_unit);
      break;
    case 'transfer':
      finalPrice = applyMarkup(basePrice, parseFloat(markup.transfer_markup || 0), markup.transfer_markup_unit);
      break;
    default:
      return basePrice;
  }

  return finalPrice;
}

export function calculateExcursionCostLogic(excursion, request, markupGroup, markups) {
  const totalPax = (parseInt(request.number_of_adults) || 0) + (parseInt(request.number_of_kids) || 0);

  if (request.toe && request.toe.toLowerCase() === 'sic') {
    const sicPriceAdult = parseFloat(excursion.sic_price_adult || 0);
    const sicPriceChild = parseFloat(excursion.sic_price_child || 0);
    if (sicPriceAdult === 0 || sicPriceChild === 0) {
      throw new Error('SIC pricing not available for this excursion');
    }

    const markedUpAdultPrice = calculateMarkedUpPrice(sicPriceAdult, markupGroup, 'excursion', markups);
    const markedUpChildPrice = calculateMarkedUpPrice(sicPriceChild, markupGroup, 'excursion', markups);

    return (parseInt(request.number_of_adults) || 0) * markedUpAdultPrice + (parseInt(request.number_of_kids) || 0) * markedUpChildPrice;
  } else if (request.toe && request.toe.toLowerCase() === 'pvt') {
    const travelDate = new Date(request.travel_date);
    const applicablePricing = (excursion.excursion_pricing || []).find(pricing => {
      const startDate = new Date(pricing.start_date);
      const endDate = new Date(pricing.end_date);
      return totalPax === parseInt(pricing.pax) && travelDate >= startDate && travelDate <= endDate;
    });

    if (!applicablePricing) {
      throw new Error('no excursion pricing available for the requested pax and date range');
    }

    const baseCostPerPerson = parseFloat(applicablePricing.price || 0);
    const markedUpPerPersonCost = calculateMarkedUpPrice(baseCostPerPerson, markupGroup, 'excursion', markups);
    return markedUpPerPersonCost * totalPax;
  }

  throw new Error(`invalid TOE value: ${request.toe}, must be 'SIC' or 'PVT'`);
}

export function calculateTransferCostLogic(transfer, request, markupGroup, markups) {
  const totalPax = (parseInt(request.number_of_adults) || 0) + (parseInt(request.number_of_kids) || 0);

  if (request.tot && request.tot.toLowerCase() === 'sic') {
    const sicPriceAdult = parseFloat(transfer.sic_price_adult || 0);
    const sicPriceChild = parseFloat(transfer.sic_price_child || 0);
    if (sicPriceAdult === 0 || sicPriceChild === 0) {
      throw new Error('SIC pricing not available for this transfer');
    }

    const markedUpAdultPrice = calculateMarkedUpPrice(sicPriceAdult, markupGroup, 'transfer', markups);
    const markedUpChildPrice = calculateMarkedUpPrice(sicPriceChild, markupGroup, 'transfer', markups);

    return (parseInt(request.number_of_adults) || 0) * markedUpAdultPrice + (parseInt(request.number_of_kids) || 0) * markedUpChildPrice;
  } else if (request.tot && request.tot.toLowerCase() === 'pvt') {
    const travelDate = new Date(request.travel_date);
    const applicablePricing = (transfer.transfer_pricing || []).find(pricing => {
      const startDate = new Date(pricing.start_date);
      const endDate = new Date(pricing.end_date);
      return totalPax === parseInt(pricing.pax) && travelDate >= startDate && travelDate <= endDate;
    });

    if (!applicablePricing) {
      throw new Error('no private transfer pricing available for the requested pax and date range');
    }

    const baseCostPerPerson = parseFloat(applicablePricing.price || 0);
    const markedUpPerPersonCost = calculateMarkedUpPrice(baseCostPerPerson, markupGroup, 'transfer', markups);
    return markedUpPerPersonCost * totalPax;
  }

  throw new Error(`invalid Tot value: ${request.tot}, must be 'SIC' or 'PVT'`);
}

export function calculateTourCostLogic(tour, request, markupGroup, markups) {
  const expectedPax = (parseInt(request.single_rooms) || 0) +
                      (parseInt(request.double_rooms) || 0) * 2 +
                      (parseInt(request.triple_rooms) || 0) * 3;
  const actualPax = (parseInt(request.number_of_adults) || 0) + (parseInt(request.number_of_kids) || 0);

  if (expectedPax !== actualPax) {
    throw new Error(`mismatch in total pax: requested rooms accommodate ${expectedPax} people, but received ${actualPax} pax`);
  }

  const travelDate = new Date(request.travel_date);

  if (request.tot && request.tot.toLowerCase() === 'sic') {
    const applicablePricing = (tour.tour_pricings || tour.tour_pricing || []).find(pricing => {
      const startDate = new Date(pricing.start_date);
      const endDate = new Date(pricing.end_date);
      return travelDate >= startDate && travelDate <= endDate;
    });

    if (!applicablePricing) {
      throw new Error('no SIC pricing available for the requested date range');
    }

    const baseCost = (parseFloat(applicablePricing.single_room_price || applicablePricing.single_price || 0) * (parseInt(request.single_rooms) || 0)) +
                     (parseFloat(applicablePricing.double_room_price || applicablePricing.double_price || 0) * (parseInt(request.double_rooms) || 0) * 2) +
                     (parseFloat(applicablePricing.triple_room_price || applicablePricing.triple_price || 0) * (parseInt(request.triple_rooms) || 0) * 3);
    const perPersonCost = baseCost / actualPax;
    const markedUpPerPersonCost = calculateMarkedUpPrice(perPersonCost, markupGroup, 'tour', markups);
    return markedUpPerPersonCost * actualPax;
  } else if (request.tot && request.tot.toLowerCase() === 'pvt') {
    const applicablePricing = (tour.tour_pricings || tour.tour_pricing || []).find(pricing => {
      const startDate = new Date(pricing.start_date);
      const endDate = new Date(pricing.end_date);
      return actualPax === parseInt(pricing.pax) && travelDate >= startDate && travelDate <= endDate;
    });

    if (!applicablePricing) {
      throw new Error('no tour pricing available for the requested date range');
    }

    const singlePrice = parseFloat(applicablePricing.single_room_price || applicablePricing.single_price || 0);
    const doublePrice = parseFloat(applicablePricing.double_room_price || applicablePricing.double_price || 0);
    const triplePrice = parseFloat(applicablePricing.triple_room_price || applicablePricing.triple_price || 0);

    if (singlePrice <= 0 && (parseInt(request.single_rooms) || 0) > 0) {
      throw new Error('single rooms are not available for PVT');
    }
    if (doublePrice <= 0 && (parseInt(request.double_rooms) || 0) > 0) {
      throw new Error('double rooms are not available for PVT');
    }
    if (triplePrice <= 0 && (parseInt(request.triple_rooms) || 0) > 0) {
      throw new Error('triple rooms are not available for PVT');
    }

    const baseCostPerPerson = ((singlePrice * (parseInt(request.single_rooms) || 0)) +
                               (doublePrice * (parseInt(request.double_rooms) || 0) * 2) +
                               (triplePrice * (parseInt(request.triple_rooms) || 0) * 3)) / actualPax;

    const markedUpPerPersonCost = calculateMarkedUpPrice(baseCostPerPerson, markupGroup, 'tour', markups);
    return markedUpPerPersonCost * actualPax;
  }

  throw new Error(`invalid TOT value: ${request.tot}, must be 'SIC' or 'PVT'`);
}

function calculateMarkupRoomType(roomType, markupGroup, markups) {
  const rt = { ...roomType };
  rt.single_price = calculateMarkedUpPrice(parseFloat(rt.single_price || 0), markupGroup, 'hotel', markups);
  rt.double_price = calculateMarkedUpPrice(parseFloat(rt.double_price || 0), markupGroup, 'hotel', markups);
  if (parseFloat(rt.extra_bed_adult || 0) > 0) {
    rt.extra_bed_adult = calculateMarkedUpPrice(parseFloat(rt.extra_bed_adult || 0), markupGroup, 'hotel', markups);
  }
  if (parseFloat(rt.extra_bed_child || 0) > 0) {
    rt.extra_bed_child = calculateMarkedUpPrice(parseFloat(rt.extra_bed_child || 0), markupGroup, 'hotel', markups);
  }
  if (parseFloat(rt.extra_bed_shared || 0) > 0) {
    rt.extra_bed_shared = calculateMarkedUpPrice(parseFloat(rt.extra_bed_shared || 0), markupGroup, 'hotel', markups);
  }

  if (parseFloat(rt.food_adult_all_inclusive || 0) > 0) {
    rt.food_adult_all_inclusive = calculateMarkedUpPrice(parseFloat(rt.food_adult_all_inclusive || 0), markupGroup, 'hotel', markups);
  }
  if (parseFloat(rt.food_adult_abf || 0) > 0) {
    rt.food_adult_abf = calculateMarkedUpPrice(parseFloat(rt.food_adult_abf || 0), markupGroup, 'hotel', markups);
  }
  if (parseFloat(rt.food_adult_lunch || 0) > 0) {
    rt.food_adult_lunch = calculateMarkedUpPrice(parseFloat(rt.food_adult_lunch || 0), markupGroup, 'hotel', markups);
  }
  if (parseFloat(rt.food_adult_dinner || 0) > 0) {
    rt.food_adult_dinner = calculateMarkedUpPrice(parseFloat(rt.food_adult_dinner || 0), markupGroup, 'hotel', markups);
  }

  if (parseFloat(rt.food_child_all_inclusive || 0) > 0) {
    rt.food_child_all_inclusive = calculateMarkedUpPrice(parseFloat(rt.food_child_all_inclusive || 0), markupGroup, 'hotel', markups);
  }
  if (parseFloat(rt.food_child_abf || 0) > 0) {
    rt.food_child_abf = calculateMarkedUpPrice(parseFloat(rt.food_child_abf || 0), markupGroup, 'hotel', markups);
  }
  if (parseFloat(rt.food_child_lunch || 0) > 0) {
    rt.food_child_lunch = calculateMarkedUpPrice(parseFloat(rt.food_child_lunch || 0), markupGroup, 'hotel', markups);
  }
  if (parseFloat(rt.food_child_dinner || 0) > 0) {
    rt.food_child_dinner = calculateMarkedUpPrice(parseFloat(rt.food_child_dinner || 0), markupGroup, 'hotel', markups);
  }
  return rt;
}

export function calculateHotelCostLogic(hotel, request, markupGroup, markups, matchingRoomTypes, hotelFees, promotion) {
  const roomTypesReq = request.room_types || [];
  if (roomTypesReq.length === 0) {
    throw new Error('at least one room type must be specified');
  }

  const bookingDate = new Date(request.booking_date);
  const startDate = new Date(request.booking_start_date);
  const endDate = new Date(request.booking_end_date);

  const numSingleRooms = parseInt(request.number_of_single_rooms) || 0;
  const numDoubleRooms = parseInt(request.number_of_double_rooms) || 0;
  const numAdults = parseInt(request.number_of_adults) || 0;
  const numKids = parseInt(request.number_of_kids) || 0;
  const numNights = parseInt(request.number_of_nights) || 0;

  if (numSingleRooms <= 0 && numDoubleRooms <= 0) {
    throw new Error('single or double rooms must be added');
  }
  if (numAdults <= 0) {
    throw new Error('need to book room at least for one adult');
  }

  const totalGuests = numAdults + numKids;
  const totalBeds = numSingleRooms + numDoubleRooms * 2;
  let extraBedsAvailable = 0;

  // Group room types by name
  const allRoomTypesByName = {};
  for (const rt of matchingRoomTypes) {
    if (!allRoomTypesByName[rt.name]) {
      allRoomTypesByName[rt.name] = [];
    }
    allRoomTypesByName[rt.name].push(rt);
  }

  const requestedRoomTypes = {};
  for (const rtReq of roomTypesReq) {
    // Find the room type specified in the request
    const originalRoomType = matchingRoomTypes.find(x => x.id === parseInt(rtReq.room_type_id));
    if (!originalRoomType) {
      throw new Error(`room type '${rtReq.room_type}' (ID: ${rtReq.room_type_id}) not found`);
    }

    // Validate room capacity
    const requestedGuests = (parseInt(rtReq.adults) || 0) + (parseInt(rtReq.children) || 0);
    if (originalRoomType.max_capacity > 0 && requestedGuests > originalRoomType.max_capacity) {
      throw new Error(`room type '${originalRoomType.name}' has maximum capacity of ${originalRoomType.max_capacity} guests, but ${requestedGuests} guests were requested for this room`);
    }

    requestedRoomTypes[rtReq.room_type_id] = originalRoomType;

    if (rtReq.extra_adult_bed) {
      extraBedsAvailable += parseInt(originalRoomType.extra_bed_adult || 0);
    }
    if (rtReq.extra_child_bed) {
      extraBedsAvailable += parseInt(originalRoomType.extra_bed_child || 0);
    }
  }

  // Check if enough beds are available
  if (totalBeds < totalGuests) {
    if (totalBeds + extraBedsAvailable < totalGuests) {
      throw new Error('not enough beds for the number of guests');
    }
  }

  if (parseInt(request.abf_days || 0) > numNights || parseInt(request.lunch_days || 0) > numNights ||
      parseInt(request.dinner_days || 0) > numNights || parseInt(request.all_inclusive_days || 0) > numNights) {
    throw new Error('meal days cannot be more than number of nights');
  }

  // Validate coverage
  for (const rtReq of roomTypesReq) {
    const originalRT = requestedRoomTypes[rtReq.room_type_id];
    const matchingRTs = allRoomTypesByName[originalRT.name] || [];

    let currentDate = new Date(startDate.getTime());
    while (currentDate < endDate) {
      let covered = false;
      for (const matchRT of matchingRTs) {
        const rStart = new Date(matchRT.start_date);
        const rEnd = new Date(matchRT.end_date);
        if (currentDate >= rStart && currentDate <= rEnd) {
          covered = true;
          break;
        }
      }
      if (!covered) {
        throw new Error(`room type '${originalRT.name}' is not available for date ${currentDate.toISOString().slice(0,10)}`);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Validate room features
  for (const rtReq of roomTypesReq) {
    const roomType = requestedRoomTypes[rtReq.room_type_id];
    if (rtReq.extra_adult_bed && parseFloat(roomType.extra_bed_adult || 0) <= 0) {
      throw new Error(`extra bed for adults is not supported by room type '${rtReq.room_type}'`);
    }
    if (rtReq.extra_child_bed && parseFloat(roomType.extra_bed_child || 0) <= 0) {
      throw new Error(`extra bed for children is not supported by room type '${rtReq.room_type}'`);
    }
    if (rtReq.sharing_bed && parseFloat(roomType.extra_bed_shared || 0) <= 0) {
      throw new Error(`shared extra bed is not supported by room type '${rtReq.room_type}'`);
    }

    if (parseInt(request.all_inclusive_days || 0) > 0 && parseFloat(roomType.food_adult_all_inclusive || 0) <= 0) {
      throw new Error(`all-inclusive adult option is not supported by room type '${rtReq.room_type}'`);
    }
    if (parseInt(request.all_inclusive_days || 0) > 0 && parseFloat(roomType.food_child_all_inclusive || 0) <= 0) {
      throw new Error(`all-inclusive child option is not supported by room type '${rtReq.room_type}'`);
    }
    if (parseInt(request.abf_days || 0) > 0 && parseFloat(roomType.food_adult_abf || 0) <= 0) {
      throw new Error(`abf adult option is not supported by room type '${rtReq.room_type}'`);
    }
    if (parseInt(request.lunch_days || 0) > 0 && parseFloat(roomType.food_adult_lunch || 0) <= 0) {
      throw new Error(`lunch adult option is not supported by room type '${rtReq.room_type}'`);
    }
    if (parseInt(request.abf_days || 0) > 0 && parseFloat(roomType.food_child_abf || 0) <= 0) {
      throw new Error(`abf child option is not supported by room type '${rtReq.room_type}'`);
    }
    if (parseInt(request.lunch_days || 0) > 0 && parseFloat(roomType.food_child_lunch || 0) <= 0) {
      throw new Error(`lunch child option is not supported by room type '${rtReq.room_type}'`);
    }
    if (parseInt(request.dinner_days || 0) > 0 && parseFloat(roomType.food_child_dinner || 0) <= 0) {
      throw new Error(`dinner child option is not supported by room type '${rtReq.room_type}'`);
    }
    if (parseInt(request.dinner_days || 0) > 0 && parseFloat(roomType.food_adult_dinner || 0) <= 0) {
      throw new Error(`dinner adult option is not supported by room type '${rtReq.room_type}'`);
    }
  }

  let finalCost = 0;
  let discount = 0;

  // Day by day cost calculation
  let currentDate = new Date(startDate.getTime());
  while (currentDate < endDate) {
    for (const rtReq of roomTypesReq) {
      const originalRT = requestedRoomTypes[rtReq.room_type_id];
      const matchingRTs = allRoomTypesByName[originalRT.name] || [];

      let roomTypeForDay = null;
      for (const matchRT of matchingRTs) {
        const rStart = new Date(matchRT.start_date);
        const rEnd = new Date(matchRT.end_date);
        if (currentDate >= rStart && currentDate <= rEnd) {
          roomTypeForDay = matchRT;
          break;
        }
      }

      if (!roomTypeForDay) continue;

      // Apply markup
      const markedUpRoomType = calculateMarkupRoomType(roomTypeForDay, markupGroup, markups);

      if (parseInt(rtReq.adults) === 1 && numSingleRooms > 0) {
        finalCost += parseFloat(markedUpRoomType.single_price) * numSingleRooms;
      }
      if (parseInt(rtReq.adults) >= 2 && numDoubleRooms > 0) {
        finalCost += parseFloat(markedUpRoomType.double_price) * numDoubleRooms;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Handle promotions / coupon code
  let promotionForExtraBedApplied = false;
  if (promotion) {
    // Check if travel dates fall within travel range of promo (stored in booking_date_from/to in DB)
    const pStart = new Date(promotion.booking_date_from);
    const pEnd = new Date(promotion.booking_date_to);

    const isTravelDatesValid = startDate >= pStart && endDate <= pEnd;
    const daysToTravel = Math.floor((startDate.getTime() - bookingDate.getTime()) / (24 * 60 * 60 * 1000));
    const isEarlyBirdValid = !(promotion.early_bird_days > 0 && daysToTravel < promotion.early_bird_days);
    const isMinNightsValid = !(promotion.minimum_nights > 1 && numNights < promotion.minimum_nights);

    if (promotion.enabled && isTravelDatesValid && isEarlyBirdValid && isMinNightsValid) {
      if (promotion.valid_for_extra_beds) {
        // Adding extra beds cost
        for (const rtReq of roomTypesReq) {
          const roomType = requestedRoomTypes[rtReq.room_type_id];
          const markedUpRoomType = calculateMarkupRoomType(roomType, markupGroup, markups);

          if (rtReq.extra_adult_bed && parseFloat(markedUpRoomType.extra_bed_adult) > 0) {
            finalCost += parseFloat(markedUpRoomType.extra_bed_adult) * numNights;
          }
          if (rtReq.extra_child_bed && parseFloat(markedUpRoomType.extra_bed_child) > 0) {
            finalCost += parseFloat(markedUpRoomType.extra_bed_child) * numNights;
          }
          if (rtReq.sharing_bed && parseFloat(markedUpRoomType.extra_bed_shared) > 0) {
            finalCost += parseFloat(markedUpRoomType.extra_bed_shared) * numNights;
          }
        }
        promotionForExtraBedApplied = true;
      }

      if (promotion.discount_type === '%') {
        discount = finalCost * parseFloat(promotion.discount_amount) / 100;
        finalCost -= discount;
      } else {
        discount = parseFloat(promotion.discount_amount);
        finalCost -= discount;
      }
    } else {
      throw new Error('the provided promotion code is not applicable for the requested dates');
    }
  }

  // Add extra bed costs if not already handled by promotion
  if (!promotionForExtraBedApplied) {
    for (const rtReq of roomTypesReq) {
      const roomType = requestedRoomTypes[rtReq.room_type_id];
      const markedUpRoomType = calculateMarkupRoomType(roomType, markupGroup, markups);

      if (rtReq.extra_adult_bed && parseFloat(markedUpRoomType.extra_bed_adult) > 0) {
        finalCost += parseFloat(markedUpRoomType.extra_bed_adult) * numNights;
      }
      if (rtReq.extra_child_bed && parseFloat(markedUpRoomType.extra_bed_child) > 0) {
        finalCost += parseFloat(markedUpRoomType.extra_bed_child) * numNights;
      }
      if (rtReq.sharing_bed && parseFloat(markedUpRoomType.extra_bed_shared) > 0) {
        finalCost += parseFloat(markedUpRoomType.extra_bed_shared) * numNights;
      }
    }
  }

  // Fees validation
  if (!hotelFees) {
    throw new Error('hotel not available with the id mentioned');
  }

  if (request.new_year_dinner && parseFloat(hotelFees.christmas_dinner_fee || 0) <= 0 && parseFloat(hotelFees.new_year_dinner_fee || 0) <= 0) {
    // Wait, in Go: if request.NewYearDinner && hotelFees.NewYearDinnerFee <= 0: return error
    if (parseFloat(hotelFees.new_year_dinner_fee || 0) <= 0) {
      throw new Error('new year Dinner is not available at this hotel');
    }
  }
  if (request.christmas_dinner && parseFloat(hotelFees.christmas_dinner_fee || 0) <= 0) {
    throw new Error('christmas dinner is not available at this hotel');
  }
  if (request.early_checkin && parseInt(hotelFees.early_checkin_fee || 0) <= 0) {
    throw new Error('no information for early checkin available at this hotel. Please pay directly to the hotel');
  }
  if (request.late_checkout && parseInt(hotelFees.late_checkout_fee || 0) <= 0) {
    throw new Error('no information for latecheckoutfees available at this hotel. Please pay directly to the hotel');
  }

  // Add meal costs
  const referenceRoomType = requestedRoomTypes[roomTypesReq[0].room_type_id];
  const markedUpRefRT = calculateMarkupRoomType(referenceRoomType, markupGroup, markups);

  if (parseInt(request.all_inclusive_days || 0) > 0) {
    const mealCost = parseFloat(markedUpRefRT.food_adult_all_inclusive) * parseInt(request.all_inclusive_days) * numAdults;
    finalCost += mealCost;
  } else {
    const name = referenceRoomType.name.toLowerCase();
    const breakfastIncluded = name.includes('abf') || name.includes('breakfast') || name.includes('a.b.f');
    if (!breakfastIncluded && parseInt(request.abf_days || 0) > 0) {
      finalCost += parseFloat(markedUpRefRT.food_adult_abf) * parseInt(request.abf_days) * numAdults;
    }
    if (parseInt(request.lunch_days || 0) > 0) {
      finalCost += parseFloat(markedUpRefRT.food_adult_lunch) * parseInt(request.lunch_days) * numAdults;
    }
    if (parseInt(request.dinner_days || 0) > 0) {
      finalCost += parseFloat(markedUpRefRT.food_adult_dinner) * parseInt(request.dinner_days) * numAdults;
    }
  }

  if (numKids > 0) {
    if (parseInt(request.all_inclusive_days || 0) > 0) {
      finalCost += parseFloat(markedUpRefRT.food_child_all_inclusive) * parseInt(request.all_inclusive_days) * numKids;
    } else {
      if (parseInt(request.abf_days || 0) > 0) {
        finalCost += parseFloat(markedUpRefRT.food_child_abf) * parseInt(request.abf_days) * numKids;
      }
      if (parseInt(request.lunch_days || 0) > 0) {
        finalCost += parseFloat(markedUpRefRT.food_child_lunch) * parseInt(request.lunch_days) * numKids;
      }
      if (parseInt(request.dinner_days || 0) > 0) {
        finalCost += parseFloat(markedUpRefRT.food_child_dinner) * parseInt(request.dinner_days) * numKids;
      }
    }
  }

  // Dinner fees
  if (request.new_year_dinner) {
    finalCost += parseFloat(hotelFees.new_year_dinner_fee) * numAdults;
  }
  if (request.christmas_dinner) {
    finalCost += parseFloat(hotelFees.christmas_dinner_fee) * numAdults;
  }

  // Late checkout / early checkin fees
  if (request.late_checkout) {
    const lateCheckoutFee = parseInt(hotelFees.late_checkout_fee || 0);
    if (lateCheckoutFee > 100) {
      finalCost += lateCheckoutFee;
    } else {
      if (numSingleRooms > 0) {
        finalCost += (parseFloat(markedUpRefRT.single_price) * lateCheckoutFee / 100) * numSingleRooms;
      }
      if (numDoubleRooms > 0) {
        finalCost += (parseFloat(markedUpRefRT.double_price) * lateCheckoutFee / 100) * numDoubleRooms;
      }
    }
  }

  if (request.early_checkin) {
    const earlyCheckinFee = parseInt(hotelFees.early_checkin_fee || 0);
    if (earlyCheckinFee > 100) {
      finalCost += earlyCheckinFee;
    } else {
      if (numSingleRooms > 0) {
        finalCost += (parseFloat(markedUpRefRT.single_price) * earlyCheckinFee / 100) * numSingleRooms;
      }
      if (numDoubleRooms > 0) {
        finalCost += (parseFloat(markedUpRefRT.double_price) * earlyCheckinFee / 100) * numDoubleRooms;
      }
    }
  }

  if (finalCost < 0) finalCost = 0;
  if (discount < 0) discount = 0;

  // Round to nearest 10
  finalCost = Math.ceil(finalCost / 10) * 10;
  discount = Math.ceil(discount / 10) * 10;

  return { final_cost: finalCost, discount };
}
