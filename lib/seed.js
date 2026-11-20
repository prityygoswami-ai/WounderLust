// Seed data for the travel portal. Loaded the first time the database is empty.
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

const destinations = [
  {
    id: 'goa', name: 'Goa', country: 'India', region: 'West India', category: 'Beach',
    image: img('photo-1512343879784-a960bf40e7f2'),
    description: 'Golden beaches, Portuguese heritage, seafood shacks and legendary nightlife on India\'s west coast.',
    bestTime: 'November - February', rating: 4.6,
    highlights: ['Baga & Calangute beaches', 'Old Goa churches', 'Dudhsagar Falls', 'Anjuna flea market']
  },
  {
    id: 'manali', name: 'Manali', country: 'India', region: 'Himachal Pradesh', category: 'Mountain',
    image: img('photo-1626621341517-bbf3d9990a23'),
    description: 'Snow-capped Himalayan peaks, apple orchards and adventure sports in the Kullu valley.',
    bestTime: 'October - June', rating: 4.7,
    highlights: ['Rohtang Pass', 'Solang Valley', 'Hadimba Temple', 'Old Manali cafes']
  },
  {
    id: 'jaipur', name: 'Jaipur', country: 'India', region: 'Rajasthan', category: 'Heritage',
    image: img('photo-1477587458883-47145ed94245'),
    description: 'The Pink City: majestic forts, royal palaces and colourful bazaars of Rajasthan.',
    bestTime: 'October - March', rating: 4.5,
    highlights: ['Amber Fort', 'Hawa Mahal', 'City Palace', 'Jantar Mantar']
  },
  {
    id: 'kerala', name: 'Kerala Backwaters', country: 'India', region: 'Kerala', category: 'Nature',
    image: img('photo-1602216056096-3b40cc0c9944'),
    description: 'Houseboat cruises through palm-lined canals, tea gardens of Munnar and Ayurvedic retreats.',
    bestTime: 'September - March', rating: 4.8,
    highlights: ['Alleppey houseboat', 'Munnar tea estates', 'Kathakali show', 'Varkala cliff']
  },
  {
    id: 'ladakh', name: 'Ladakh', country: 'India', region: 'Ladakh', category: 'Adventure',
    image: img('photo-1581793745862-99fde7fa73d2'),
    description: 'High-altitude desert, turquoise lakes, ancient monasteries and epic road trips.',
    bestTime: 'May - September', rating: 4.9,
    highlights: ['Pangong Lake', 'Khardung La', 'Nubra Valley', 'Thiksey Monastery']
  },
  {
    id: 'andaman', name: 'Andaman Islands', country: 'India', region: 'Bay of Bengal', category: 'Beach',
    image: img('photo-1586500036706-41963de24d8b'),
    description: 'Crystal-clear waters, coral reefs, scuba diving and white-sand island beaches.',
    bestTime: 'October - May', rating: 4.7,
    highlights: ['Radhanagar Beach', 'Cellular Jail', 'Scuba at Havelock', 'Neil Island']
  },
  {
    id: 'varanasi', name: 'Varanasi', country: 'India', region: 'Uttar Pradesh', category: 'Spiritual',
    image: img('photo-1561361513-2d000a50f0dc'),
    description: 'One of the world\'s oldest living cities, famous for the Ganga Aarti and sacred ghats.',
    bestTime: 'October - March', rating: 4.4,
    highlights: ['Dashashwamedh Ghat Aarti', 'Sunrise boat ride', 'Kashi Vishwanath', 'Sarnath']
  },
  {
    id: 'udaipur', name: 'Udaipur', country: 'India', region: 'Rajasthan', category: 'Heritage',
    image: img('photo-1568495248636-6432b97bd949'),
    description: 'The City of Lakes with romantic palaces, sunset boat rides and royal heritage hotels.',
    bestTime: 'September - March', rating: 4.6,
    highlights: ['Lake Pichola', 'City Palace', 'Jag Mandir', 'Sajjangarh sunset']
  },
  {
    id: 'bali', name: 'Bali', country: 'Indonesia', region: 'Southeast Asia', category: 'Beach',
    image: img('photo-1537996194471-e657df975ab4'),
    description: 'Rice terraces, temples, surf beaches and wellness retreats on the Island of the Gods.',
    bestTime: 'April - October', rating: 4.7,
    highlights: ['Ubud rice terraces', 'Tanah Lot temple', 'Nusa Penida', 'Seminyak beach clubs']
  },
  {
    id: 'dubai', name: 'Dubai', country: 'UAE', region: 'Middle East', category: 'City',
    image: img('photo-1512453979798-5ea266f8880c'),
    description: 'Futuristic skyline, desert safaris, luxury shopping and record-breaking attractions.',
    bestTime: 'November - March', rating: 4.6,
    highlights: ['Burj Khalifa', 'Desert safari', 'Dubai Mall', 'Palm Jumeirah']
  },
  {
    id: 'maldives', name: 'Maldives', country: 'Maldives', region: 'Indian Ocean', category: 'Beach',
    image: img('photo-1514282401047-d79a71a590e8'),
    description: 'Overwater villas, turquoise lagoons and world-class snorkelling in total seclusion.',
    bestTime: 'November - April', rating: 4.9,
    highlights: ['Overwater villa stay', 'Snorkelling with mantas', 'Sandbank picnic', 'Sunset dolphin cruise']
  },
  {
    id: 'switzerland', name: 'Switzerland', country: 'Switzerland', region: 'Europe', category: 'Mountain',
    image: img('photo-1530122037265-a5f1f91d3b99'),
    description: 'Alpine lakes, scenic trains, chocolate and the snowy peaks of the Swiss Alps.',
    bestTime: 'June - September, December - March', rating: 4.8,
    highlights: ['Jungfraujoch', 'Lucerne', 'Glacier Express', 'Interlaken']
  }
];

const day = (title, desc) => ({ title, desc });

const packages = [
  {
    id: 'goa-beach-escape', title: 'Goa Beach Escape', destinationId: 'goa', days: 4, nights: 3, price: 14999,
    image: img('photo-1512343879784-a960bf40e7f2'), type: 'Leisure', seats: 30, featured: true,
    inclusions: ['3-star beach resort', 'Daily breakfast', 'Airport transfers', 'North & South Goa sightseeing'],
    itinerary: [
      day('Arrival & Beach Evening', 'Pickup from airport, check-in and sunset at Calangute beach.'),
      day('North Goa Tour', 'Fort Aguada, Baga, Anjuna and Vagator beaches.'),
      day('South Goa & Heritage', 'Old Goa churches, Colva beach and a river cruise.'),
      day('Departure', 'Breakfast, shopping and airport drop.')
    ]
  },
  {
    id: 'manali-snow-adventure', title: 'Manali Snow Adventure', destinationId: 'manali', days: 6, nights: 5, price: 18999,
    image: img('photo-1626621341517-bbf3d9990a23'), type: 'Adventure', seats: 25, featured: true,
    inclusions: ['Volvo bus from Delhi', 'Hotel with heater', 'Breakfast & dinner', 'Solang paragliding'],
    itinerary: [
      day('Delhi to Manali', 'Overnight Volvo journey through the hills.'),
      day('Arrive Manali', 'Check-in, Hadimba Temple and Mall Road.'),
      day('Solang Valley', 'Snow activities, paragliding and ropeway.'),
      day('Rohtang / Atal Tunnel', 'Excursion to snow point and Sissu.'),
      day('Kullu & Manikaran', 'River rafting and hot springs.'),
      day('Return', 'Board Volvo back to Delhi.')
    ]
  },
  {
    id: 'royal-rajasthan', title: 'Royal Rajasthan: Jaipur & Udaipur', destinationId: 'jaipur', days: 6, nights: 5, price: 27999,
    image: img('photo-1477587458883-47145ed94245'), type: 'Cultural', seats: 20, featured: true,
    inclusions: ['Heritage hotels', 'Daily breakfast', 'AC private car', 'Folk dinner show'],
    itinerary: [
      day('Arrive Jaipur', 'Welcome dinner with Rajasthani thali.'),
      day('Jaipur Forts', 'Amber Fort, Jal Mahal and Hawa Mahal.'),
      day('Jaipur City', 'City Palace, Jantar Mantar and bazaars.'),
      day('Drive to Udaipur', 'En route visit to Chittorgarh Fort.'),
      day('Udaipur Lakes', 'City Palace and Lake Pichola boat ride.'),
      day('Departure', 'Drop at Udaipur airport.')
    ]
  },
  {
    id: 'kerala-houseboat', title: 'Kerala Houseboat & Munnar Hills', destinationId: 'kerala', days: 5, nights: 4, price: 21999,
    image: img('photo-1602216056096-3b40cc0c9944'), type: 'Honeymoon', seats: 20, featured: true,
    inclusions: ['1 night private houseboat', 'Munnar hill resort', 'All breakfasts', 'Cochin transfers'],
    itinerary: [
      day('Cochin to Munnar', 'Scenic drive past waterfalls and spice gardens.'),
      day('Munnar', 'Tea museum, Eravikulam park and Mattupetty dam.'),
      day('Thekkady', 'Periyar wildlife and spice plantation tour.'),
      day('Alleppey Houseboat', 'Cruise the backwaters with a traditional Kerala lunch.'),
      day('Departure', 'Drive back to Cochin.')
    ]
  },
  {
    id: 'ladakh-bike-expedition', title: 'Ladakh Bike Expedition', destinationId: 'ladakh', days: 8, nights: 7, price: 34999,
    image: img('photo-1581793745862-99fde7fa73d2'), type: 'Adventure', seats: 15, featured: false,
    inclusions: ['Royal Enfield bike', 'Fuel & mechanic', 'Camps and hotels', 'Inner line permits'],
    itinerary: [
      day('Arrive Leh', 'Acclimatisation day.'),
      day('Leh Local', 'Shanti Stupa, Leh Palace and monasteries.'),
      day('Nubra Valley', 'Ride over Khardung La to Nubra.'),
      day('Hunder Dunes', 'Double-humped camel safari.'),
      day('Pangong Lake', 'Ride via Shyok to Pangong.'),
      day('Pangong to Leh', 'Return via Chang La.'),
      day('Sham Valley', 'Magnetic Hill and Sangam.'),
      day('Departure', 'Fly back from Leh.')
    ]
  },
  {
    id: 'andaman-island-hopper', title: 'Andaman Island Hopper', destinationId: 'andaman', days: 6, nights: 5, price: 32999,
    image: img('photo-1586500036706-41963de24d8b'), type: 'Leisure', seats: 24, featured: false,
    inclusions: ['Ferry tickets', 'Beach resorts', 'Scuba dive session', 'Daily breakfast'],
    itinerary: [
      day('Port Blair', 'Cellular Jail and light & sound show.'),
      day('Havelock Island', 'Ferry to Havelock, Radhanagar sunset.'),
      day('Scuba Day', 'Guided scuba diving at Elephant Beach.'),
      day('Neil Island', 'Natural bridge and Bharatpur beach.'),
      day('Back to Port Blair', 'Shopping and Corbyn\'s Cove.'),
      day('Departure', 'Airport drop.')
    ]
  },
  {
    id: 'varanasi-spiritual', title: 'Varanasi Spiritual Retreat', destinationId: 'varanasi', days: 3, nights: 2, price: 8999,
    image: img('photo-1561361513-2d000a50f0dc'), type: 'Spiritual', seats: 30, featured: false,
    inclusions: ['Ghat-view hotel', 'Sunrise boat ride', 'Ganga Aarti seating', 'Sarnath tour'],
    itinerary: [
      day('Arrival & Aarti', 'Evening Ganga Aarti at Dashashwamedh Ghat.'),
      day('Sunrise & Temples', 'Boat ride, Kashi Vishwanath and Sarnath.'),
      day('Departure', 'Silk weaving visit and drop.')
    ]
  },
  {
    id: 'bali-bliss', title: 'Bali Bliss', destinationId: 'bali', days: 6, nights: 5, price: 54999,
    image: img('photo-1537996194471-e657df975ab4'), type: 'Honeymoon', seats: 20, featured: true,
    inclusions: ['Return flights', 'Private pool villa', 'Nusa Penida day trip', 'Daily breakfast'],
    itinerary: [
      day('Arrive Bali', 'Transfer to Seminyak villa.'),
      day('Ubud', 'Rice terraces, monkey forest and swing.'),
      day('Nusa Penida', 'Kelingking beach and snorkelling.'),
      day('Temples', 'Tanah Lot and Uluwatu Kecak dance.'),
      day('Leisure', 'Spa and beach clubs.'),
      day('Departure', 'Airport transfer.')
    ]
  },
  {
    id: 'dubai-delight', title: 'Dubai Delight', destinationId: 'dubai', days: 5, nights: 4, price: 49999,
    image: img('photo-1512453979798-5ea266f8880c'), type: 'Family', seats: 30, featured: true,
    inclusions: ['Return flights & visa', '4-star hotel', 'Desert safari with BBQ', 'Burj Khalifa tickets'],
    itinerary: [
      day('Arrival', 'Dhow cruise dinner at Marina.'),
      day('City Tour', 'Burj Khalifa, Dubai Mall and fountain show.'),
      day('Desert Safari', 'Dune bashing, camel ride and BBQ.'),
      day('Abu Dhabi', 'Sheikh Zayed Mosque and Ferrari World.'),
      day('Departure', 'Shopping and airport drop.')
    ]
  },
  {
    id: 'maldives-overwater', title: 'Maldives Overwater Paradise', destinationId: 'maldives', days: 4, nights: 3, price: 89999,
    image: img('photo-1514282401047-d79a71a590e8'), type: 'Honeymoon', seats: 10, featured: false,
    inclusions: ['Overwater villa', 'All meals', 'Speedboat transfers', 'Sunset cruise'],
    itinerary: [
      day('Arrive Male', 'Speedboat to resort, villa check-in.'),
      day('Ocean Day', 'Snorkelling and sandbank picnic.'),
      day('Leisure', 'Spa and sunset dolphin cruise.'),
      day('Departure', 'Transfer to Male airport.')
    ]
  },
  {
    id: 'swiss-alps', title: 'Swiss Alps Explorer', destinationId: 'switzerland', days: 7, nights: 6, price: 159999,
    image: img('photo-1530122037265-a5f1f91d3b99'), type: 'Family', seats: 16, featured: false,
    inclusions: ['Return flights & Schengen visa', 'Swiss Travel Pass', '3-star hotels', 'Jungfraujoch excursion'],
    itinerary: [
      day('Arrive Zurich', 'Transfer to Lucerne.'),
      day('Lucerne', 'Chapel Bridge and Mt. Titlis.'),
      day('Interlaken', 'Scenic train to Interlaken.'),
      day('Jungfraujoch', 'Top of Europe excursion.'),
      day('Glacier Express', 'Panoramic train to Zermatt.'),
      day('Zermatt', 'Matterhorn views.'),
      day('Departure', 'Train to Zurich airport.')
    ]
  },
  {
    id: 'udaipur-weekend', title: 'Udaipur Romantic Weekend', destinationId: 'udaipur', days: 3, nights: 2, price: 11999,
    image: img('photo-1568495248636-6432b97bd949'), type: 'Honeymoon', seats: 20, featured: false,
    inclusions: ['Lake-view hotel', 'Candle-light dinner', 'Boat ride', 'Breakfast'],
    itinerary: [
      day('Arrival', 'Lake Pichola sunset boat ride.'),
      day('Palaces', 'City Palace, Saheliyon ki Bari and Sajjangarh.'),
      day('Departure', 'Local markets and drop.')
    ]
  }
];

module.exports = { destinations, packages };
