require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const User     = require('../models/User.model');
const Property = require('../models/Property.model');
const Enquiry  = require('../models/Enquiry.model');
const Category = require('../models/Category.model');
const CMS      = require('../models/CMS.model');

const PROPERTIES = [
  { title:'Casa Luxura Penthouse', description:'Unmatched penthouse experience in Hyderabad\'s most coveted address featuring panoramic city views, premium Italian marble, and a private rooftop terrace.', price:42000000, priceLabel:'₹4.2 Cr', type:'Residential', subtype:'Penthouse', status:'For Sale', beds:4, baths:4, area:'4,200 sq.ft', areaValue:4200, location:{address:'Road No. 10, Banjara Hills', locality:'Banjara Hills', city:'Hyderabad', state:'Telangana', pincode:'500034'}, images:[{url:'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',isPrimary:true}], amenities:['Swimming Pool','Gym','Clubhouse','24/7 Security','Power Backup','EV Charging'], developer:'Rajapushpa Group', possession:'Ready to Move', rera:'P02400003987', badge:'Premium', featured:true, rating:4.9, reviews:28 },
  { title:'Viraj Grand Villa', description:'A masterpiece of modern architecture set within 6,500 sq.ft of meticulously crafted living space with private pool and smart home automation.', price:65000000, priceLabel:'₹6.5 Cr', type:'Residential', subtype:'Villa', status:'For Sale', beds:5, baths:5, area:'6,500 sq.ft', areaValue:6500, location:{address:'Road No. 35, Jubilee Hills', locality:'Jubilee Hills', city:'Hyderabad', state:'Telangana', pincode:'500033'}, images:[{url:'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',isPrimary:true}], amenities:['Private Pool','Home Theatre','Smart Home','Landscaped Garden','Modular Kitchen','3-Car Garage'], developer:'Viraj Builders', possession:'Ready to Move', rera:'P02400004456', badge:'Featured', featured:true, rating:5.0, reviews:14 },
  { title:'Royal Nest Duplex', description:'Double-height living spaces and premium fittings in a prime financial district location. Ideal for families who demand space without compromise.', price:28000000, priceLabel:'₹2.8 Cr', type:'Residential', subtype:'Duplex', status:'For Sale', beds:4, baths:3, area:'3,200 sq.ft', areaValue:3200, location:{address:'Gachibowli Road', locality:'Gachibowli', city:'Hyderabad', state:'Telangana', pincode:'500032'}, images:[{url:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80',isPrimary:true}], amenities:['Gym','Clubhouse','Children Play Area','Visitor Parking','Landscaped Terrace'], developer:'Royal Constructions', possession:'Dec 2025', rera:'P02400005678', badge:'New Launch', featured:false, rating:4.7, reviews:19 },
  { title:'Malli Luxury Villa', description:'Fully furnished luxury villa for rent with world-class amenities, steps from Hyderabad IT corridor. Ideal for senior executives and expats.', price:80000, priceLabel:'₹80,000/mo', type:'Residential', subtype:'Villa', status:'For Rent', beds:4, baths:4, area:'4,000 sq.ft', areaValue:4000, location:{address:'Madhapur Road', locality:'Madhapur', city:'Hyderabad', state:'Telangana', pincode:'500081'}, images:[{url:'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',isPrimary:true}], amenities:['Fully Furnished','Swimming Pool','Private Garden','Security','Gym','Covered Parking'], developer:'Malli Properties', possession:'Immediate', rera:'P02400006789', badge:'Hot', featured:true, rating:4.8, reviews:22 },
  { title:'Skyline 3BHK Apartment', description:'Sustainable modern 3BHK with open-plan living, community rooftop garden, and eco-conscious design. Perfect for the forward-thinking urban professional.', price:15000000, priceLabel:'₹1.5 Cr', type:'Residential', subtype:'Apartment', status:'For Sale', beds:3, baths:3, area:'2,100 sq.ft', areaValue:2100, location:{address:'Kondapur Main Road', locality:'Kondapur', city:'Hyderabad', state:'Telangana', pincode:'500084'}, images:[{url:'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',isPrimary:true}], amenities:['Terrace Garden','Co-working Lounge','EV Parking','Solar Power','Rainwater Harvesting'], developer:'Sky Developers', possession:'Mar 2026', rera:'P02400007890', badge:'New Launch', featured:false, rating:4.6, reviews:11 },
  { title:'Horizon Grade-A Office', description:'Premium Grade-A commercial space in Hyderabad IT precinct. Column-free floor plates, high-speed fiber, and 200 car parking bays.', price:35000000, priceLabel:'₹3.5 Cr', type:'Commercial', subtype:'Office Space', status:'For Sale', beds:null, baths:null, area:'5,000 sq.ft', areaValue:5000, location:{address:'Cyber Gateway, Nanakramguda', locality:'Hitec City', city:'Hyderabad', state:'Telangana', pincode:'500032'}, images:[{url:'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80',isPrimary:true}], amenities:['24/7 Access','Cafeteria','4 Conference Rooms','Fiber Internet','200-car Parking','CCTV'], developer:'Horizon Builders', possession:'Ready to Move', rera:'P02400009012', badge:'Commercial', featured:true, rating:4.8, reviews:17 },
  { title:'Green Valley Row House', description:'Serene gated community row house surrounded by lush greenery. Designed for families seeking the perfect balance of nature and city connectivity.', price:18000000, priceLabel:'₹1.8 Cr', type:'Residential', subtype:'Row House', status:'For Sale', beds:3, baths:3, area:'2,400 sq.ft', areaValue:2400, location:{address:'Narsingi Main Road', locality:'Narsingi', city:'Hyderabad', state:'Telangana', pincode:'500075'}, images:[{url:'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80',isPrimary:true}], amenities:['Private Garden','Covered Parking','Club House','Children Park','Jogging Track'], developer:'Green Valley Homes', possession:'Jun 2026', rera:'P02400008901', badge:null, featured:false, rating:4.5, reviews:8 },
  { title:'Sunrise Farmhouse', description:'Fertile agricultural land with a charming farmhouse retreat, just 25 minutes from the airport. Ideal for weekend escapes and organic farming.', price:9500000, priceLabel:'₹95 Lakh', type:'Agriculture', subtype:'Farmhouse', status:'For Sale', beds:2, baths:2, area:'2 Acres', areaValue:87120, location:{address:'Shamshabad Road', locality:'Shamshabad', city:'Hyderabad', state:'Telangana', pincode:'501218'}, images:[{url:'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',isPrimary:true}], amenities:['Borewell','Electricity Connection','Compound Wall','Caretaker Room','Fruit Orchard'], developer:'Individual Seller', possession:'Immediate', rera:'N/A', badge:null, featured:false, rating:4.4, reviews:6 },
  { title:'Prestige Corner Shop', description:'Prominent corner retail space on a high-footfall commercial strip in Begumpet. Ideal for showroom, boutique, or flagship store.', price:45000, priceLabel:'₹45,000/mo', type:'Commercial', subtype:'Retail Shop', status:'For Lease', beds:null, baths:null, area:'800 sq.ft', areaValue:800, location:{address:'Begumpet Main Road', locality:'Begumpet', city:'Hyderabad', state:'Telangana', pincode:'500016'}, images:[{url:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',isPrimary:true}], amenities:['High Footfall Location','Parking','CCTV','24/7 Power'], developer:'Prestige Realty', possession:'Immediate', rera:'P02400009345', badge:'Lease', featured:false, rating:4.3, reviews:5 },
];

const CATEGORIES = [
  { name:'Residential', slug:'residential', description:'Apartments, Villas, Row Houses & Duplexes', icon:'🏠', color:'#3B82F6', sortOrder:1 },
  { name:'Commercial',  slug:'commercial',  description:'Office Spaces, Retail Shops & Showrooms',  icon:'🏢', color:'#F59E0B', sortOrder:2 },
  { name:'Agriculture', slug:'agriculture', description:'Farmhouses & Agricultural Plots',           icon:'🌾', color:'#22C55E', sortOrder:3 },
  { name:'Luxury',      slug:'luxury',      description:'Ultra-Premium & Signature Properties',      icon:'💎', color:'#8B5CF6', sortOrder:4 },
  { name:'Industrial',  slug:'industrial',  description:'Warehouses, Factories & Industrial Plots',  icon:'🏭', color:'#EF4444', sortOrder:5 },
];

const CMS_DATA = [
  { key:'hero',    label:'Hero Section',   value:{ title:"Find Your Dream Property in Hyderabad", subtitle:"Discover 1,200+ verified listings. Zero brokerage. RERA compliant.", ctaText:"Browse Properties", backgroundImage:"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=80" } },
  { key:'about',   label:'About Section',  value:{ heading:"Hyderabad's Most Trusted Real Estate Platform", body:"PrimePro was founded in 2012 with a simple belief — buying or renting a home should be an exciting, not stressful, experience.", yearsExperience:12, email:"info@primepro.in", phone:"1800 500 600" } },
  { key:'seo',     label:'SEO Settings',   value:{ metaTitle:"PrimePro — Premium Real Estate in Hyderabad", metaDescription:"Find verified residential, commercial and agricultural properties in Hyderabad. No brokerage. RERA certified.", keywords:"real estate hyderabad, buy flat hyderabad, villa for sale, commercial property" } },
  { key:'banners', label:'Promo Banners',  value:[] },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await Promise.all([
      User.deleteMany({}),
      Property.deleteMany({}),
      Enquiry.deleteMany({}),
      Category.deleteMany({}),
      CMS.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Users
    const [admin, superAdmin, regularUser] = await User.insertMany([
      { name:'Admin', email:'admin@primepro.in',  phone:'9876543210', password: await bcrypt.hash('Admin@123', 12), role:'admin',      isActive:true, isVerified:true },
      { name:'Super Admin',   email:'super@primepro.in',  phone:'9876543211', password: await bcrypt.hash('Super@123', 12), role:'superadmin', isActive:true, isVerified:true },
      { name:'Arjun Mehta',   email:'arjun@example.com',  phone:'9876543212', password: await bcrypt.hash('User@123',  12), role:'user',       isActive:true, isVerified:true },
    ]);
    console.log('👤 Users seeded');

    // Properties
    const createdProps = await Property.insertMany(
      PROPERTIES.map(p => ({ ...p, createdBy: admin._id }))
    );
    console.log(`🏘️  ${createdProps.length} Properties seeded`);

    // Categories
    await Category.insertMany(CATEGORIES);
    console.log('🗂️  Categories seeded');

    // CMS
    await CMS.insertMany(CMS_DATA);
    console.log('✏️  CMS seeded');

    // Enquiries
    await Enquiry.insertMany([
      { property:createdProps[0]._id, user:regularUser._id, name:'Arjun Mehta',  email:'arjun@example.com',  phone:'9876543212', message:'Interested in the penthouse. Can I schedule a site visit this weekend?', type:'Site Visit', status:'new' },
      { property:createdProps[1]._id,                       name:'Priya Sharma', email:'priya@example.com',  phone:'9876543213', message:'What is the final negotiable price for the villa?', type:'Buy Property', status:'read' },
      {                                                      name:'Ravi Kumar',   email:'ravi@example.com',   phone:'9876543214', message:'Looking for 3BHK under 2 Cr in Gachibowli or Kondapur.', type:'General Enquiry', status:'replied' },
    ]);
    console.log('📬 Enquiries seeded');

    console.log('\n✅ Database seeded successfully!');
    console.log('─────────────────────────────────────────────');
    console.log('Admin:       admin@primepro.in   /  Admin@123');
    console.log('Superadmin:  super@primepro.in   /  Super@123');
    console.log('User:        arjun@example.com   /  User@123');
    console.log('─────────────────────────────────────────────');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
}

seed();