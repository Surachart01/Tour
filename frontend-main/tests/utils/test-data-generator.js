const faker = require('faker');
const moment = require('moment');

class TestDataGenerator {
  constructor() {
    this.timestamp = Date.now();
    this.uniqueId = Math.random().toString(36).substr(2, 9);
  }

  // Generate unique identifiers
  generateUniqueId() {
    return `test_${this.timestamp}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate hotel data matching actual form fields
  generateHotelData() {
    const id = this.generateUniqueId();
    return {
      hotelName: `Test Hotel ${id}`,
      country: 'Thailand', // Will be selected from dropdown
      city: 'Bangkok', // Will be selected from hotelLocation dropdown  
      address: faker.address.streetAddress(),
      description: `Automated test hotel created on ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
      earlycheckinadd: Math.floor(Math.random() * 20), // 0-20%
      latecheckoutadd: Math.floor(Math.random() * 15), // 0-15%
      christmasdinner: `Christmas Package ${Math.floor(Math.random() * 1000) + 500} THB`,
      newyear: `New Year Package ${Math.floor(Math.random() * 1500) + 800} THB`,
      // Room type data for modal
      roomTypes: [
        {
          name: 'Standard Room',
          allotment: Math.floor(Math.random() * 50) + 10,
          cutoff: Math.floor(Math.random() * 7) + 1,
          singlePrice: Math.floor(Math.random() * 1000) + 500,
          doublePrice: Math.floor(Math.random() * 1500) + 800
        }
      ]
    };
  }

  // Generate transfer data
  generateTransferData() {
    const id = this.generateUniqueId();
    const types = ['TIN', 'TOUT'];
    return {
      type: types[Math.floor(Math.random() * types.length)],
      country: 'Thailand',
      city: 'Bangkok',
      description: `Test Transfer ${id} - Automated test transfer created on ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
      from: faker.address.streetName(),
      to: faker.address.streetName(),
      duration: `${Math.floor(Math.random() * 3) + 1} hours`,
      price: Math.floor(Math.random() * 500) + 100
    };
  }

  // Generate excursion data
  generateExcursionData() {
    const id = this.generateUniqueId();
    return {
      country: 'Thailand',
      city: 'Bangkok',
      name: `Test Excursion ${id}`,
      description: `Automated test excursion created on ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
      duration: `${Math.floor(Math.random() * 8) + 2} hours`,
      price: Math.floor(Math.random() * 1000) + 200,
      category: 'Cultural',
      includes: 'Guide, Transportation, Entrance fees'
    };
  }

  // Generate tour data
  generateTourData() {
    const id = this.generateUniqueId();
    return {
      country: 'Thailand',
      startCity: 'Bangkok',
      endCity: 'Phuket',
      name: `Test Tour ${id}`,
      description: `Automated test tour created on ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
      duration: `${Math.floor(Math.random() * 10) + 3} days`,
      price: Math.floor(Math.random() * 5000) + 1000,
      route: 'Bangkok - Ayutthaya - Phuket',
      includes: 'Accommodation, Transportation, Meals'
    };
  }

  // Generate lead data
  generateLeadData() {
    const id = this.generateUniqueId();
    const startDate = moment().add(Math.floor(Math.random() * 90) + 30, 'days');
    
    return {
      clientName: `Test Client ${id}`,
      clientEmail: faker.internet.email(),
      clientPhone: faker.phone.phoneNumber(),
      numberOfAdults: Math.floor(Math.random() * 4) + 1,
      numberOfKids: Math.floor(Math.random() * 3),
      startDate: startDate.format('YYYY-MM-DD'),
      bookingDate: moment().format('YYYY-MM-DD'),
      optionName: `Test Option ${id}`,
      markupPercentage: Math.floor(Math.random() * 20) + 10,
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      internalNotes: `Internal notes for test lead ${id}`,
      clientNotes: `Client notes for test lead ${id}`,
      remarks: `Test remarks created on ${moment().format('YYYY-MM-DD HH:mm:ss')}`
    };
  }

  // Generate quotation data
  generateQuotationData() {
    const id = this.generateUniqueId();
    const startDate = moment().add(Math.floor(Math.random() * 90) + 30, 'days');
    
    return {
      agentName: faker.name.findName(),
      clientName: `Test Client ${id}`,
      clientEmail: faker.internet.email(),
      clientPhone: faker.phone.phoneNumber(),
      numberOfAdults: Math.floor(Math.random() * 4) + 1,
      numberOfKids: Math.floor(Math.random() * 3),
      startDate: startDate.format('YYYY-MM-DD'),
      bookingDate: moment().format('YYYY-MM-DD'),
      bookingReference: `TEST-${id}`,
      remarks: `Test quotation created on ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
      includeAssistanceFee: Math.random() > 0.5,
      assistanceFeeAmount: 1000
    };
  }

  // Generate booking data for services
  generateHotelBookingData() {
    const checkIn = moment().add(Math.floor(Math.random() * 90) + 30, 'days');
    const checkOut = checkIn.clone().add(Math.floor(Math.random() * 7) + 1, 'days');
    
    return {
      checkInDate: checkIn.format('YYYY-MM-DD'),
      checkOutDate: checkOut.format('YYYY-MM-DD'),
      city: 'Bangkok',
      hotel: 'Test Hotel',
      roomType: 'Standard Room',
      singleRooms: Math.floor(Math.random() * 3) + 1,
      doubleRooms: Math.floor(Math.random() * 2),
      nights: checkOut.diff(checkIn, 'days')
    };
  }

  generateTransferBookingData() {
    const transferDate = moment().add(Math.floor(Math.random() * 90) + 30, 'days');
    
    return {
      city: 'Bangkok',
      date: transferDate.format('YYYY-MM-DD'),
      transferType: 'Airport Transfer',
      from: 'Airport',
      to: 'Hotel',
      time: '10:00',
      pax: Math.floor(Math.random() * 6) + 1
    };
  }

  generateExcursionBookingData() {
    const excursionDate = moment().add(Math.floor(Math.random() * 90) + 30, 'days');
    
    return {
      city: 'Bangkok',
      date: excursionDate.format('YYYY-MM-DD'),
      excursionName: 'City Tour',
      hotel: 'Test Hotel',
      pickupTime: '09:00',
      pax: Math.floor(Math.random() * 6) + 1
    };
  }

  generateTourBookingData() {
    const startDate = moment().add(Math.floor(Math.random() * 90) + 30, 'days');
    const endDate = startDate.clone().add(Math.floor(Math.random() * 10) + 3, 'days');
    
    return {
      city: 'Bangkok',
      tourName: 'Thailand Discovery',
      route: 'Bangkok - Phuket',
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      pax: Math.floor(Math.random() * 6) + 1
    };
  }

  // Generate random credentials for testing
  generateTestCredentials() {
    return {
      username: 'vtadmin',
      password: 'testing@123',
      email: 'vtadmin@example.com'
    };
  }

  // Generate dates for testing
  generateDateRange(daysFromNow = 30, duration = 7) {
    const start = moment().add(daysFromNow, 'days');
    const end = start.clone().add(duration, 'days');
    
    return {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      startDateFormatted: start.format('DD/MM/YYYY'),
      endDateFormatted: end.format('DD/MM/YYYY')
    };
  }
}

module.exports = TestDataGenerator;
