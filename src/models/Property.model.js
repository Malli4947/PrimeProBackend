const mongoose = require('mongoose');
const slugify  = require('slugify');

const propertySchema = new mongoose.Schema(
  {
    title:       { type: String, required: [true, 'Title is required'], trim: true },
    slug:        { type: String, unique: true, lowercase: true },
    description: { type: String, default: '' },

    // ── Pricing ──────────────────────────────────────────────────
    price:          { type: Number, default: null },          // legacy / search filter field
    priceLabel:     { type: String, default: null },          // legacy label e.g. "₹4.2 Cr"
    priceType:      { type: String, enum: ['fixed', 'negotiable', 'on_request'], default: 'negotiable' },

    // New price fields (used by admin UI)
    totalPrice:      { type: Number, default: null },         // raw numeric total price (₹)
    totalPriceLabel: { type: String, default: null },         // formatted label e.g. "₹1.2 Cr"
    pricePerSqy:     { type: Number, default: null },         // price per sq.yard (plots)
    pricePerSft:     { type: Number, default: null },         // price per sq.ft (apartments/villas)

    // ── Classification ───────────────────────────────────────────
    type: {
      type:     String,
      enum:     ['Residential', 'Commercial', 'Agriculture'],
      required: true,
    },
    subtype: { type: String, required: true },
    status:  {
      type:    String,
      enum:    ['For Sale', 'For Rent', 'For Lease', 'Sold', 'Rented'],
      default: 'For Sale',
    },

    // Project lifecycle status
    projectStatus: {
      type:    String,
      enum:    ['Ready to Move', 'Pre-Launch', 'Under Construction', 'OC Received', null],
      default: null,
    },

    // ── Specs (legacy — kept for backward compat) ────────────────
    beds:      { type: Number, default: null },
    baths:     { type: Number, default: null },
    area:      { type: String, default: null },
    areaValue: { type: Number, default: null },

    // ── Plot / Open Plots details ────────────────────────────────
    sqy:        { type: Number, default: null },   // total land in sq.yards
    acres:      { type: Number, default: null },   // total land in acres
    totalPlots: { type: Number, default: null },   // number of plots in the project
    plotType:   { type: String, default: null },   // Commercial | Residential | Lease
    minSqy:     { type: Number, default: null },   // minimum plot size (sq.yards)
    maxSqy:     { type: Number, default: null },   // maximum plot size (sq.yards)
    facing:     { type: String, default: null },   // E | W | N | S | E & W | E, W & N

    // ── Apartment / Villa project details ────────────────────────
    floors:     { type: Number, default: null },   // total floors in the building
    totalUnits: { type: Number, default: null },   // total units in the project
    unitType:   { type: String, default: null },   // e.g. "2 & 3 BHK"
    minSft:     { type: Number, default: null },   // minimum unit size (sq.ft)
    maxSft:     { type: Number, default: null },   // maximum unit size (sq.ft)

    // ── Location ─────────────────────────────────────────────────
    location: {
      address:  { type: String, required: true },
      locality: { type: String, required: true },
      city:     { type: String, required: true, default: 'Hyderabad' },
      state:    { type: String, default: 'Telangana' },
      pincode:  { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },

    // ── Images ───────────────────────────────────────────────────
    images: [
      {
        url:       { type: String, required: true },
        publicId:  { type: String, default: null },
        isPrimary: { type: Boolean, default: false },
        caption:   { type: String, default: '' },
      },
    ],

    amenities: [{ type: String }],
    features:  [{ type: String }],

    // ── Project details ──────────────────────────────────────────
    developer:   { type: String, default: null },
    possession:  { type: String, default: null },
    rera:        { type: String, default: null },
    reraVerified:{ type: Boolean, default: false },
    brochureLink:{ type: String, default: null },  // PDF / external brochure URL

    // ── Admin controls ───────────────────────────────────────────
    badge: {
      type: String,
      enum: [
        'Premium', 'Ultra Premium', 'Luxury', 'Ultra Luxury',
        'Featured', 'Hot', null,
      ],
      default: null,
    },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isSold:   { type: Boolean, default: false },

    // ── Analytics ────────────────────────────────────────────────
    views:     { type: Number, default: 0 },
    enquiries: { type: Number, default: 0 },
    rating:    { type: Number, min: 0, max: 5, default: 0 },
    reviews:   { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject:{ virtuals: true },
  }
);

// ── Auto-generate slug ────────────────────────────────────────
propertySchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  next();
});

// ── Virtual: primary image URL ────────────────────────────────
propertySchema.virtual('image').get(function () {
  const primary = this.images?.find(img => img.isPrimary);
  return primary?.url ?? this.images?.[0]?.url ?? null;
});

// ── Indexes ───────────────────────────────────────────────────
propertySchema.index({ title: 'text', description: 'text', 'location.locality': 'text' });
propertySchema.index({ type: 1, status: 1, 'location.locality': 1 });
propertySchema.index({ totalPrice: 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ featured: 1, isActive: 1 });

module.exports = mongoose.model('Property', propertySchema);
