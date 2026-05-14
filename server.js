/* ============================================================
   LUXE ESTATES — Node.js + MongoDB Backend API
   Production-hardened: auth-gated writes, rate limiting,
   CORS lockdown, security headers, no open destructive routes.
   ============================================================ */

const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bodyParser = require('body-parser');
const path       = require('path');
const crypto     = require('crypto');
require('dotenv').config();

/* ── Env validation: refuse to start without required secrets ── */
if (process.env.NODE_ENV === 'production') {
  const required = ['MONGODB_URI', 'ADMIN_USERNAME', 'ADMIN_PASSWORD', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM'];
  const missing  = required.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`✗ Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

const app  = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

/* ════════════════════════════════════════════════════════════
   SECURITY HEADERS (Helmet-equivalent, no extra dependency)
   ════════════════════════════════════════════════════════════ */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  next();
});

/* ── CORS: lock to your own origin in production ── */
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5000', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    /* Allow same-origin requests (no Origin header) and whitelisted origins */
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-admin-token'],
  credentials: true
}));

/* ── Body parsers ── */
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

/* ════════════════════════════════════════════════════════════
   RATE LIMITER (no extra dependency)
   Sliding window per IP stored in memory.
   ════════════════════════════════════════════════════════════ */
const rateLimitStore = new Map();

function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now  = Date.now();
    const rec  = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > rec.resetAt) {
      rec.count   = 0;
      rec.resetAt = now + windowMs;
    }

    rec.count++;
    rateLimitStore.set(key, rec);

    res.setHeader('X-RateLimit-Limit',     max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - rec.count));
    res.setHeader('X-RateLimit-Reset',     Math.ceil(rec.resetAt / 1000));

    if (rec.count > max) {
      return res.status(429).json({ success: false, error: message || 'Too many requests' });
    }
    next();
  };
}

/* Clean up stale rate-limit entries every 10 minutes */
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of rateLimitStore) {
    if (now > rec.resetAt) rateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

/* ── Serve static frontend files ── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── MongoDB Connection ── */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/luxe_estates';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✓ MongoDB connected successfully'))
.catch(err => console.error('✗ MongoDB connection error:', err));

/* ════════════════════════════════════════════════════════════
   SCHEMAS & MODELS
   ════════════════════════════════════════════════════════════ */

/* Property Schema */
const propertySchema = new mongoose.Schema({
  title:    { type: String, required: true },
  locality: { type: String, required: true },
  city:     { type: String, default: 'Hyderabad' },
  price:    { type: String, required: true },
  priceRaw: { type: Number, required: true },

  /* Type = Apartment, Villa, Penthouse, etc. */
  type:   { type: String, enum: ['apartment', 'villa', 'penthouse', 'plot', 'farmhouse'], required: true },

  /* Status = sale, underconstruction */
  status: { type: String, enum: ['sale', 'underconstruction'], required: true },

  bhk:   { type: Number, required: true },
  area:  { type: Number, required: true },
  baths: { type: Number, required: true },

  constructionStatus: { type: String, required: true },
  rera:  { type: String, required: true },
  img:   { type: String, required: true },

  /* Badge for UI */
  badge:    { type: String, enum: ['new', 'featured', 'premium', null], default: null },
  featured: { type: Boolean, default: false },

  /* Multiple property images (first is hero) */
  images: [String],

  /* Floor plan images */
  floorPlanImages: [String],

  /* Geo-location for Google Maps embed */
  locationLat: { type: Number, default: null },
  locationLng: { type: Number, default: null },

  /* Downloadable brochure (URL or uploaded path) */
  brochureUrl: { type: String, default: null },

  amenities:   [String],
  description: { type: String, required: true },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

const Property = mongoose.model('Property', propertySchema);

/* Conversation Schema */
const conversationSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  sessionId:    { type: String, required: true, unique: true },
  turns: [{
    question:   String,
    userChoice: String,
    response:   String,
    timestamp:  { type: Date, default: Date.now }
  }],
  filters: {
    status:   { type: String },
    budget:   [Number],
    location: String,
    bhk:      Number
  },
  conversationStatus: { type: String, enum: ['active', 'completed'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

/* Contact Form Submission Schema */
const contactSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  phone:   String,
  message: { type: String, required: true },
  status:  { type: String, enum: ['new', 'contacted', 'converted'], default: 'new' },
  createdAt: { type: Date, default: Date.now }
});
contactSchema.index({ email: 1, message: 1 });

const Contact = mongoose.model('Contact', contactSchema);

/* Wishlist Schema */
const wishlistSchema = new mongoose.Schema({
  userId:      { type: String, required: true },
  propertyIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

/* ════════════════════════════════════════════════════════════
   API ROUTES
   ════════════════════════════════════════════════════════════ */

/* ── Health Check ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Luxe Estates API is running' });
});

/* ════════════════════════════════════════════════════════════
   SEED ENDPOINT — POST /api/seed/properties
   Requires admin token. Disabled entirely in production.
   ════════════════════════════════════════════════════════════ */
app.post('/api/seed/properties', requireAdmin, async (req, res) => {
  if (IS_PROD) {
    return res.status(403).json({ success: false, error: 'Seed endpoint disabled in production' });
  }
  try {
    await Property.deleteMany({});

    const SEED_DATA = [
      {
        title: 'Prestige Skyline Tower', locality: 'Banjara Hills', city: 'Hyderabad',
        price: '₹2.85 Cr', priceRaw: 28500000,
        type: 'apartment', status: 'sale', bhk: 3, area: 1850, baths: 3,
        constructionStatus: 'Ready to Move', badge: 'premium', featured: true,
        rera: 'TSRERA/PRJ/2023/001234',
        img: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80',
        amenities: ['Swimming Pool', 'Gym', 'Covered Parking', 'Clubhouse', '24/7 Security'],
        description: 'A magnificent 3BHK residence offering panoramic city views from the 24th floor. Premium Italian marble flooring, modular kitchen, and 24×7 security.'
      },
      {
        title: 'Green Valley Residences', locality: 'Kondapur', city: 'Hyderabad',
        price: '₹68 L', priceRaw: 6800000,
        type: 'apartment', status: 'underconstruction', bhk: 2, area: 1180, baths: 2,
        constructionStatus: 'Under Construction', badge: 'new', featured: true,
        rera: 'TSRERA/PRJ/2023/005678',
        img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
        amenities: ['Landscaped Garden', 'Gym', 'Parking', 'Children Play Area'],
        description: 'Thoughtfully designed 2BHK homes nestled within 5 acres of lush landscaping. RERA approved, possession by Dec 2025.'
      },
      {
        title: 'The Windsor Apartments', locality: 'Jubilee Hills', city: 'Hyderabad',
        price: '₹1.2 Cr', priceRaw: 12000000,
        type: 'apartment', status: 'sale', bhk: 3, area: 2100, baths: 3,
        constructionStatus: 'Ready to Move', badge: 'featured', featured: true,
        rera: 'TSRERA/PRJ/2022/009012',
        img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80',
        amenities: ['Swimming Pool', 'Gym', '24/7 Security', 'Covered Parking', 'Power Backup'],
        description: 'Semi-furnished luxury 3BHK in the heart of Jubilee Hills. Walking distance to top schools and hospitals.'
      },
      {
        title: 'Lotus Petal Villas', locality: 'Kokapet', city: 'Hyderabad',
        price: '₹1.4 Cr', priceRaw: 14000000,
        type: 'villa', status: 'sale', bhk: 4, area: 2800, baths: 4,
        constructionStatus: 'Ready to Move', badge: null, featured: false,
        rera: 'TSRERA/PRJ/2023/007890',
        img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&q=80',
        amenities: ['Swimming Pool', 'Gym', 'Clubhouse', 'Private Garden', 'Gated Community'],
        description: 'Independent villas with private terrace and garden. Premium gated community with 24×7 security and club house.'
      },
      {
        title: 'Crystal Heights', locality: 'Gachibowli', city: 'Hyderabad',
        price: '₹95 L', priceRaw: 9500000,
        type: 'apartment', status: 'underconstruction', bhk: 3, area: 1600, baths: 2,
        constructionStatus: 'Under Construction', badge: 'new', featured: false,
        rera: 'TSRERA/PRJ/2024/001100',
        img: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80',
        amenities: ['Gym', 'Parking', 'Clubhouse', 'Jogging Track'],
        description: 'Modern 3BHK flats in the IT corridor. Excellent connectivity to HITEC City and Financial District.'
      },
      {
        title: 'Serene Meadows', locality: 'Manikonda', city: 'Hyderabad',
        price: '₹62 L', priceRaw: 6200000,
        type: 'apartment', status: 'sale', bhk: 2, area: 1050, baths: 2,
        constructionStatus: 'Ready to Move', badge: null, featured: false,
        rera: 'TSRERA/PRJ/2022/003344',
        img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80',
        amenities: ['Children Play Area', 'Parking', 'Security', 'Landscaped Garden'],
        description: 'Affordable 2BHK homes for the growing family. Close to schools, metro, and shopping centres.'
      },
      {
        title: 'The Imperial Penthouse', locality: 'Banjara Hills', city: 'Hyderabad',
        price: '₹7.5 Cr', priceRaw: 75000000,
        type: 'penthouse', status: 'sale', bhk: 4, area: 5200, baths: 5,
        constructionStatus: 'Ready to Move', badge: 'premium', featured: true,
        rera: 'TSRERA/PRJ/2021/000789',
        img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80',
        amenities: ['Private Pool', 'Home Theatre', 'Gym', 'Smart Home', 'Concierge Service'],
        description: 'Ultra-luxury penthouse spanning two floors with private rooftop pool. Unobstructed views of Hussain Sagar. The pinnacle of refined living.'
      },
      {
        title: 'Emerald Gardens', locality: 'Nallagandla', city: 'Hyderabad',
        price: '₹74 L', priceRaw: 7400000,
        type: 'apartment', status: 'underconstruction', bhk: 2, area: 1230, baths: 2,
        constructionStatus: 'Under Construction', badge: 'new', featured: false,
        rera: 'TSRERA/PRJ/2024/002200',
        img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
        amenities: ['Gym', 'Swimming Pool', 'Parking', 'Clubhouse'],
        description: 'RERA-approved 2BHK homes near HITEC City. Excellent connectivity and green surroundings.'
      },
      {
        title: 'Oakwood Farms', locality: 'Shankarpally', city: 'Hyderabad',
        price: '₹1.8 Cr', priceRaw: 18000000,
        type: 'farmhouse', status: 'sale', bhk: 3, area: 6000, baths: 3,
        constructionStatus: 'Ready to Move', badge: null, featured: false,
        rera: 'TSRERA/PRJ/2020/009901',
        img: 'https://images.unsplash.com/photo-1464146072230-91cabc968266?w=600&q=80',
        amenities: ['Private Farm', 'Open Terrace', 'Borewell', 'Parking', 'Organic Garden'],
        description: 'Weekend getaway farmhouse on 600 sq.yards. Peaceful, green setting with fruit orchards and organic vegetable garden.'
      },
      {
        title: 'Pinnacle Heights', locality: 'Gachibowli', city: 'Hyderabad',
        price: '₹3.2 Cr', priceRaw: 32000000,
        type: 'penthouse', status: 'sale', bhk: 4, area: 3800, baths: 4,
        constructionStatus: 'Ready to Move', badge: 'featured', featured: true,
        rera: 'TSRERA/PRJ/2022/005511',
        img: 'https://images.unsplash.com/photo-1622866306950-81d17097d458?w=600&q=80',
        amenities: ['Private Terrace', 'Swimming Pool', 'Gym', 'Smart Home', 'Concierge'],
        description: 'Stunning penthouse with 360° city view. Smart home automation, private elevator, and premium finishing throughout.'
      },
      {
        title: 'Harmony Villas', locality: 'Puppalaguda', city: 'Hyderabad',
        price: '₹2.1 Cr', priceRaw: 21000000,
        type: 'villa', status: 'underconstruction', bhk: 4, area: 3200, baths: 4,
        constructionStatus: 'Under Construction', badge: 'new', featured: false,
        rera: 'TSRERA/PRJ/2024/003388',
        img: 'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=600&q=80',
        amenities: ['Private Garden', 'Swimming Pool', 'Gym', 'Clubhouse', '24/7 Security'],
        description: 'Spacious 4BHK villas in a gated township. Each villa features a private garden and modern architecture.'
      },
      {
        title: 'Sunrise Residency', locality: 'Miyapur', city: 'Hyderabad',
        price: '₹55 L', priceRaw: 5500000,
        type: 'apartment', status: 'sale', bhk: 2, area: 980, baths: 2,
        constructionStatus: 'Ready to Move', badge: null, featured: false,
        rera: 'TSRERA/PRJ/2021/006655',
        img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
        amenities: ['Parking', 'Security', 'Children Play Area', 'Power Backup'],
        description: 'Affordable 2BHK homes with metro access. Perfect for first-time buyers looking for value in the western suburbs.'
      }
    ];

    const inserted = await Property.insertMany(SEED_DATA);
    res.json({ success: true, message: `✓ Seeded ${inserted.length} properties`, count: inserted.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ════════════════════════════════════════════════════════════
   PROPERTIES ENDPOINTS
   ════════════════════════════════════════════════════════════ */

/* Get all properties with filters and pagination */
app.get('/api/properties', async (req, res) => {
  try {
    const {
      type, bhk, minPrice, maxPrice, minArea, maxArea, locality, badge, featured, sort, status,
      page = 1, limit = 9, q, amenities
    } = req.query;

    let query = {};

    /* Property type filter */
    if (type && type !== 'rent') query.type = type;

    /* Status filter (sale, underconstruction) */
    if (status) query.status = status;

    if (bhk)    query.bhk   = parseInt(bhk);
    if (badge)  query.badge  = badge;
    if (featured === 'true') query.featured = true;

    /* Locality / search */
    if (locality) query.locality = { $regex: `^${locality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
    if (q) {
      query.$or = [
        { title:       new RegExp(q, 'i') },
        { locality:    new RegExp(q, 'i') },
        { city:        new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') }
      ];
    }

    /* Price range */
    if (minPrice || maxPrice) {
      query.priceRaw = {};
      if (minPrice) query.priceRaw.$gte = parseInt(minPrice);
      if (maxPrice) query.priceRaw.$lte = parseInt(maxPrice);
    }

    /* Area range */
    if (minArea || maxArea) {
      query.area = {};
      if (minArea) query.area.$gte = parseInt(minArea);
      if (maxArea) query.area.$lte = parseInt(maxArea);
    }

    /* Amenities filter — match properties that have ALL selected amenities */
    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim()).filter(Boolean);
      if (amenityList.length > 0) {
        query.amenities = { $all: amenityList };
      }
    }

    /* Pagination */
    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);
    const skip     = (pageNum - 1) * limitNum;

    /* Sorting */
    let sortObj = {};
    if      (sort === 'price-asc')  sortObj.priceRaw = 1;
    else if (sort === 'price-desc') sortObj.priceRaw = -1;
    else if (sort === 'area-desc')  sortObj.area     = -1;
    else                            sortObj.createdAt = -1;

    const total      = await Property.countDocuments(query);
    const properties = await Property.find(query).sort(sortObj).skip(skip).limit(limitNum);

    res.json({
      success: true,
      properties,
      pagination: {
        page:       pageNum,
        limit:      limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext:    pageNum < Math.ceil(total / limitNum),
        hasPrev:    pageNum > 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* Get unique localities + amenities for the chat UI */
app.get('/api/properties/meta', async (req, res) => {
  try {
    const localities = await Property.distinct('locality');
    const allAmenities = await Property.distinct('amenities');
    res.json({
      success: true,
      localities: localities.filter(Boolean).sort(),
      amenities:  allAmenities.filter(Boolean).sort()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* Get single property by ID */
app.get('/api/properties/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* Create new property — ADMIN ONLY (use /api/admin/properties) */
app.post('/api/properties', requireAdmin, async (req, res) => {
  try {
    const property = new Property(req.body);
    await property.save();
    res.status(201).json({ success: true, property });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* Update property — ADMIN ONLY */
app.put('/api/properties/:id', requireAdmin, async (req, res) => {
  try {
    req.body.updatedAt = Date.now();
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    res.json({ success: true, property });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* Delete property — ADMIN ONLY */
app.delete('/api/properties/:id', requireAdmin, async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ════════════════════════════════════════════════════════════
   CONVERSATION / CHAT ENDPOINTS
   ════════════════════════════════════════════════════════════ */

app.post('/api/conversations', async (req, res) => {
  try {
    const { customerName, sessionId } = req.body;
    if (!customerName || !sessionId)
      return res.status(400).json({ success: false, error: 'customerName and sessionId required' });

    const conversation = new Conversation({ customerName, sessionId, turns: [], filters: {} });
    await conversation.save();
    res.status(201).json({ success: true, conversation });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/conversations/:sessionId', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ sessionId: req.params.sessionId });
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    res.json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/conversations/:sessionId/turns', async (req, res) => {
  try {
    const { question, userChoice, response } = req.body;
    const conversation = await Conversation.findOne({ sessionId: req.params.sessionId });
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });

    conversation.turns.push({ question, userChoice, response });
    conversation.updatedAt = Date.now();
    await conversation.save();
    res.json({ success: true, conversation });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/conversations/:sessionId/filters', async (req, res) => {
  try {
    const { status, budget, location, bhk } = req.body;
    const conversation = await Conversation.findOne({ sessionId: req.params.sessionId });
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });

    if (status   !== undefined) conversation.filters.status   = status;
    if (budget   !== undefined) conversation.filters.budget   = budget;
    if (location !== undefined) conversation.filters.location = location;
    if (bhk      !== undefined) conversation.filters.bhk      = bhk;

    conversation.updatedAt = Date.now();
    await conversation.save();
    res.json({ success: true, conversation });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.put('/api/conversations/:sessionId/complete', async (req, res) => {
  try {
    const conversation = await Conversation.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { conversationStatus: 'completed', updatedAt: Date.now() },
      { new: true }
    );
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found' });
    res.json({ success: true, conversation });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ════════════════════════════════════════════════════════════
   CONTACT FORM ENDPOINTS
   ════════════════════════════════════════════════════════════ */

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message)
      return res.status(400).json({ success: false, error: 'Name, email, and message are required' });

    // Reject if same email+message submitted within the last 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const duplicate = await Contact.findOne({ email, message, createdAt: { $gte: tenMinsAgo } });
    if (duplicate)
      return res.status(429).json({ success: false, error: 'You already sent this message recently. We will get back to you soon!' });

    const contact = new Contact({ name, email, phone, message });
    await contact.save();
    res.status(201).json({ success: true, message: 'Contact form submitted successfully', contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* GET all contacts — ADMIN ONLY */
app.get('/api/contact', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: contacts.length, contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ════════════════════════════════════════════════════════════
   WHATSAPP OTP — via Twilio
   Requires env vars:
     TWILIO_ACCOUNT_SID   — from console.twilio.com
     TWILIO_AUTH_TOKEN    — from console.twilio.com
     TWILIO_WHATSAPP_FROM — e.g. "whatsapp:+14155238886" (Twilio sandbox)
   ════════════════════════════════════════════════════════════ */

/* In-memory OTP store: phone → { otp, expiresAt, attempts } */
const otpStore = new Map();
const OTP_TTL_MS      = 10 * 60 * 1000;   // 10 minutes
const OTP_MAX_TRIES   = 5;
const OTP_RESEND_WAIT = 60 * 1000;         // 1 minute between resends

/* Clean up expired OTPs every 15 minutes */
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of otpStore) {
    if (now > rec.expiresAt) otpStore.delete(key);
  }
}, 15 * 60 * 1000);

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

/* Lazy-init Twilio client so the server still starts without Twilio creds in dev */
let twilioClient = null;
function getTwilio() {
  if (twilioClient) return twilioClient;
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Twilio credentials not configured');
  twilioClient = require('twilio')(sid, token);
  return twilioClient;
}

/* Normalise phone → E.164 (+91XXXXXXXXXX for India) */
function normalisePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return '+' + digits;
  if (digits.length === 10) return '+91' + digits;
  if (raw.startsWith('+')) return '+' + digits;
  return '+' + digits;
}

/* POST /api/otp/send — send OTP via WhatsApp */
app.post('/api/otp/send',
  rateLimit({ windowMs: 60 * 1000, max: 5, message: 'Too many OTP requests. Please wait a minute.' }),
  async (req, res) => {
    try {
      const { phone, name } = req.body;
      if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required.' });

      const normPhone = normalisePhone(phone);

      /* Resend guard */
      const existing = otpStore.get(normPhone);
      if (existing && Date.now() < existing.sentAt + OTP_RESEND_WAIT) {
        const wait = Math.ceil((existing.sentAt + OTP_RESEND_WAIT - Date.now()) / 1000);
        return res.status(429).json({ success: false, error: `Please wait ${wait}s before requesting another OTP.` });
      }

      const otp = generateOtp();
      otpStore.set(normPhone, {
        otp,
        expiresAt: Date.now() + OTP_TTL_MS,
        sentAt:    Date.now(),
        attempts:  0
      });

      /* Send via Twilio WhatsApp */
      const from = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
      await getTwilio().messages.create({
        from,
        to:   `whatsapp:${normPhone}`,
        body: `Hi ${name || 'there'}! 👋\n\nYour Luxe Estates verification code is:\n\n*${otp}*\n\nValid for 10 minutes. Do not share this with anyone.\n\n— Luxe Estates Hyderabad`
      });

      console.log(`✓ OTP sent to WhatsApp ${normPhone}`);
      res.json({ success: true, message: 'OTP sent via WhatsApp.' });
    } catch (err) {
      console.error('OTP send error:', err.message);
      /* Give a user-friendly message if Twilio is not configured */
      if (err.message.includes('credentials not configured')) {
        return res.status(503).json({ success: false, error: 'WhatsApp OTP service is not configured. Contact admin.' });
      }
      res.status(500).json({ success: false, error: 'Failed to send OTP. Please try again.' });
    }
  }
);

/* POST /api/otp/verify — verify OTP */
app.post('/api/otp/verify',
  rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: 'Too many verification attempts.' }),
  (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, error: 'Phone and OTP are required.' });

    const normPhone = normalisePhone(phone);
    const rec = otpStore.get(normPhone);

    if (!rec)                          return res.status(400).json({ success: false, error: 'OTP not found. Please request a new one.' });
    if (Date.now() > rec.expiresAt)  { otpStore.delete(normPhone); return res.status(400).json({ success: false, error: 'OTP has expired. Please request a new one.' }); }
    if (rec.attempts >= OTP_MAX_TRIES) { otpStore.delete(normPhone); return res.status(400).json({ success: false, error: 'Too many incorrect attempts. Please request a new OTP.' }); }

    rec.attempts++;

    if (rec.otp !== String(otp).trim()) {
      const left = OTP_MAX_TRIES - rec.attempts;
      return res.status(400).json({ success: false, error: `Incorrect OTP. ${left} attempt${left !== 1 ? 's' : ''} remaining.` });
    }

    /* ✓ Valid — delete so it can't be reused */
    otpStore.delete(normPhone);
    console.log(`✓ OTP verified for ${normPhone}`);
    res.json({ success: true, message: 'Phone verified.' });
  }
);

/* ── Lead capture — called before showing search results ── */
app.post('/api/leads', rateLimit({ windowMs: 5 * 60 * 1000, max: 10, message: 'Too many requests' }), async (req, res) => {
  try {
    const { name, phone, email, filters } = req.body;
    if (!name || !email || !phone)
      return res.status(400).json({ success: false, error: 'Name, email, and phone are required' });

    /* Build a descriptive message from the filters so it shows up in the Contacts panel */
    const parts = [];
    if (filters) {
      if (filters.type)     parts.push(`Type: ${filters.type}`);
      if (filters.locality) parts.push(`Area: ${filters.locality}`);
      if (filters.bhk)      parts.push(`BHK: ${filters.bhk}`);
      if (filters.budget)   parts.push(`Budget: ₹${(filters.budget[0]/1e5).toFixed(0)}L – ₹${(filters.budget[1]/1e5).toFixed(0)}L`);
      if (filters.status)   parts.push(`Timeline: ${filters.status === 'sale' ? 'Immediate' : 'Under construction'}`);
    }
    const message = parts.length
      ? `[Lead from property search] ${parts.join(' | ')}`
      : '[Lead from property search]';

    /* Deduplicate: same email within 30 minutes */
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const duplicate = await Contact.findOne({ email, createdAt: { $gte: thirtyMinsAgo } });
    if (duplicate)
      return res.json({ success: true, message: 'Lead already captured recently' });

    const contact = new Contact({ name, email, phone, message });
    await contact.save();
    res.status(201).json({ success: true, message: 'Lead saved' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ════════════════════════════════════════════════════════════
   WISHLIST ENDPOINTS
   ════════════════════════════════════════════════════════════ */

app.get('/api/wishlist/:userId', async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.params.userId }).populate('propertyIds');
    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.params.userId, propertyIds: [] });
      await wishlist.save();
    }
    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/wishlist/:userId/add', async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) return res.status(400).json({ success: false, error: 'propertyId required' });

    let wishlist = await Wishlist.findOne({ userId: req.params.userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId: req.params.userId, propertyIds: [propertyId] });
    } else if (!wishlist.propertyIds.includes(propertyId)) {
      wishlist.propertyIds.push(propertyId);
    }

    wishlist.updatedAt = Date.now();
    await wishlist.save();
    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/wishlist/:userId/remove', async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) return res.status(400).json({ success: false, error: 'propertyId required' });

    const wishlist = await Wishlist.findOne({ userId: req.params.userId });
    if (!wishlist) return res.status(404).json({ success: false, error: 'Wishlist not found' });

    wishlist.propertyIds = wishlist.propertyIds.filter(id => id.toString() !== propertyId);
    wishlist.updatedAt   = Date.now();
    await wishlist.save();
    res.json({ success: true, wishlist });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ════════════════════════════════════════════════════════════
   ADMIN AUTH & PROTECTED ROUTES
   Token-based sessions with sliding expiry.
   Credentials must be set via environment variables.
   ════════════════════════════════════════════════════════════ */

/* Active admin sessions: token → expiry */
const adminSessions = new Map();
const SESSION_TTL   = 8 * 60 * 60 * 1000; // 8 hours

function genToken() { return crypto.randomBytes(32).toString('hex'); }

/* Timing-safe string comparison to prevent timing attacks */
function safeCompare(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    /* Still run timingSafeEqual with equal-length buffers to avoid leaking length */
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/* Middleware: verify admin token */
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ success: false, error: 'Unauthorised' });
  const expiry = adminSessions.get(token);
  if (!expiry || Date.now() > expiry)
    return res.status(401).json({ success: false, error: 'Session expired — please log in again' });
  /* Slide session window */
  adminSessions.set(token, Date.now() + SESSION_TTL);
  next();
}

/* Clean up expired sessions every hour */
setInterval(() => {
  const now = Date.now();
  for (const [token, expiry] of adminSessions) {
    if (now > expiry) adminSessions.delete(token);
  }
}, 60 * 60 * 1000);

/* Rate limit: 10 login attempts per 15 minutes per IP */
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts — please try again in 15 minutes'
});

/* POST /api/admin/login */
app.post('/api/admin/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body;
  const validUser = process.env.ADMIN_USERNAME;
  const validPass = process.env.ADMIN_PASSWORD;

  if (!validUser || !validPass) {
    console.error('✗ ADMIN_USERNAME / ADMIN_PASSWORD not set in environment');
    return res.status(500).json({ success: false, error: 'Server misconfiguration' });
  }

  const userOk = safeCompare(username, validUser);
  const passOk = safeCompare(password, validPass);

  if (userOk && passOk) {
    const token = genToken();
    adminSessions.set(token, Date.now() + SESSION_TTL);
    return res.json({ success: true, token });
  }
  /* Generic message — don't reveal which field was wrong */
  res.status(401).json({ success: false, error: 'Invalid credentials' });
});

/* GET /api/admin/verify */
app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ success: true });
});

/* POST /api/admin/logout */
app.post('/api/admin/logout', (req, res) => {
  const token = req.headers['x-admin-token'];
  if (token) adminSessions.delete(token);
  res.json({ success: true });
});

/* ── Admin: image upload (returns data-URI back as URL — no disk write needed) ──
   The client sends a multipart with an "image" field.
   We decode it and return it as a data URI.
   For production, swap this for Cloudinary / S3.                              */
app.post('/api/admin/upload', requireAdmin, express.raw({ type: '*/*', limit: '20mb' }), (req, res) => {
  /* express.raw() captures the raw body before bodyParser can consume it */
  try {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
    const contentType = req.headers['content-type'] || '';

    /* Extract boundary */
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
    if (!boundaryMatch) return res.status(400).json({ success: false, error: 'No boundary in multipart' });

    const boundary = '--' + boundaryMatch[1];
    const bodyStr  = body.toString('binary');
    const parts    = bodyStr.split(boundary);

    let imgBuffer  = null;
    let imgMime    = 'image/jpeg';

    for (const part of parts) {
      if (!part.includes('Content-Disposition')) continue;
      if (!part.includes('name="image"')) continue;

      const mimeMatch = part.match(/Content-Type:\s*([^\r\n]+)/i);
      if (mimeMatch) imgMime = mimeMatch[1].trim();

      /* Data starts after double CRLF */
      const dataStart = part.indexOf('\r\n\r\n');
      if (dataStart === -1) continue;
      const raw = part.slice(dataStart + 4, part.lastIndexOf('\r\n'));
      imgBuffer = Buffer.from(raw, 'binary');
      break;
    }

    if (!imgBuffer || imgBuffer.length === 0)
      return res.status(400).json({ success: false, error: 'No image data received' });

    const dataUri = `data:${imgMime};base64,${imgBuffer.toString('base64')}`;
    res.json({ success: true, url: dataUri });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Admin: create property ── */
app.post('/api/admin/properties', requireAdmin, async (req, res) => {
  try {
    /* Map admin form fields → schema fields */
    const body = mapAdminToSchema(req.body);
    const property = new Property(body);
    await property.save();
    res.status(201).json({ success: true, property });
  } catch (err) {
    const code = err.code === 11000 ? 409 : 400;
    res.status(code).json({ success: false, error: err.message });
  }
});

/* ── Admin: update property ── */
app.put('/api/admin/properties/:id', requireAdmin, async (req, res) => {
  try {
    const body = mapAdminToSchema(req.body);
    body.updatedAt = Date.now();
    const property = await Property.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true });
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    res.json({ success: true, property });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ── Admin: delete property ── */
app.delete('/api/admin/properties/:id', requireAdmin, async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) return res.status(404).json({ success: false, error: 'Property not found' });
    res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Admin: get all contacts ── */
app.get('/api/admin/contacts', requireAdmin, async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Admin: update contact status ── */
app.patch('/api/admin/contacts/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const contact = await Contact.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, contact });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ── Map admin form payload → Property schema ──
   Admin form uses:
     house_type  → schema: type  (lowercase: apartment, villa, penthouse, plot, farmhouse)
     badge       → "sale" sets status=sale, badge=null; "new" sets status=sale, badge=new
                   "underconstruction" sets status=underconstruction, badge=null
                   "premium"/"featured" set status=sale + badge=premium/featured
     status      → constructionStatus (the display string: "Ready to Move" / "Under Construction")
*/
function mapAdminToSchema(body) {
  const houseTypeMap = {
    'apartment': 'apartment', 'Apartment': 'apartment',
    'villa':     'villa',     'Villa':     'villa',
    'penthouse': 'penthouse', 'Penthouse': 'penthouse',
    'plot':      'plot',      'Plot':      'plot',
    'farmhouse': 'farmhouse', 'Farmhouse': 'farmhouse',
    'Bungalow':  'villa',     'Row House': 'villa', 'Studio': 'apartment'
  };

  const schemaType = houseTypeMap[body.house_type] || body.type || 'apartment';

  /* Determine status + badge from the admin "badge" selector */
  let schemaStatus = 'sale';
  let schemaBadge  = null;

  switch (body.badge) {
    case 'underconstruction':
      schemaStatus = 'underconstruction';
      schemaBadge  = null;
      break;
    case 'sale':
      schemaStatus = 'sale';
      schemaBadge  = null;
      break;
    case 'new':
      schemaStatus = 'sale';
      schemaBadge  = 'new';
      break;
    case 'featured':
      schemaStatus = 'sale';
      schemaBadge  = 'featured';
      break;
    case 'premium':
      schemaStatus = 'sale';
      schemaBadge  = 'premium';
      break;
    default:
      schemaStatus = body.status && ['sale','underconstruction'].includes(body.status)
        ? body.status : 'sale';
      schemaBadge  = null;
  }

  /* Parse images array — admin sends comma-separated string or array */
  let images = [];
  if (Array.isArray(body.images)) {
    images = body.images.filter(Boolean);
  } else if (typeof body.images === 'string' && body.images.trim()) {
    images = body.images.split(',').map(s => s.trim()).filter(Boolean);
  }
  /* Ensure primary img is always first in images array */
  if (body.img && !images.includes(body.img)) images.unshift(body.img);

  let floorPlanImages = [];
  if (Array.isArray(body.floorPlanImages)) {
    floorPlanImages = body.floorPlanImages.filter(Boolean);
  } else if (typeof body.floorPlanImages === 'string' && body.floorPlanImages.trim()) {
    floorPlanImages = body.floorPlanImages.split(',').map(s => s.trim()).filter(Boolean);
  }

  return {
    title:              body.title,
    locality:           body.locality,
    city:               body.city || 'Hyderabad',
    price:              body.price,
    priceRaw:           Number(body.priceRaw) || 0,
    type:               schemaType,
    status:             schemaStatus,
    bhk:                Number(body.bhk) || 2,
    area:               Number(body.area) || 0,
    baths:              Number(body.baths) || 2,
    constructionStatus: body.status || 'Ready to Move',
    rera:               body.rera || 'N/A',
    img:                body.img,
    images:             images,
    floorPlanImages:    floorPlanImages,
    locationLat:        body.locationLat  ? Number(body.locationLat)  : null,
    locationLng:        body.locationLng  ? Number(body.locationLng)  : null,
    brochureUrl:        body.brochureUrl  || null,
    badge:              schemaBadge,
    featured:           !!body.featured,
    amenities:          Array.isArray(body.amenities) ? body.amenities : [],
    description:        body.description
  };
}

/* ── Global error handler ── */
app.use((err, req, res, next) => {
  /* CORS errors */
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: IS_PROD ? 'Internal server error' : err.message });
});

/* ── Catch-all: serve index.html for any non-API, non-file route ── */
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

/* ── Start Server ── */
app.listen(PORT, () => {
  console.log(`🚀 Luxe Estates API running on port ${PORT} [${IS_PROD ? 'PRODUCTION' : 'development'}]`);
  console.log(`📌 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend:     http://localhost:${PORT}`);
  if (!IS_PROD) console.log(`🌱 Seed data:    POST http://localhost:${PORT}/api/seed/properties  (admin token required)`);
});

module.exports = app;