const mongoose = require('mongoose');
const slugify  = require('slugify');

const propertySchema = new mongoose.Schema(
  {
    title:       { type: String, required: [true, 'Title is required'], trim: true },
    slug:        { type: String, unique: true, lowercase: true },
    description: { type: String, required: [true, 'Description is required'] },

    // Pricing
    price:      { type: Number, required: [true, 'Price is required'], min: 0 },
    priceLabel: { type: String }, // e.g. "₹4.2 Cr"
    priceType:  { type: String, enum: ['fixed','negotiable','on_request'], default: 'negotiable' },

    // Classification
    type: {
      type: String,
      enum: ['Residential','Commercial','Agriculture','Industrial','Luxury'],
      required: true,
    },
    subtype:  { type: String, required: true },
    status:   { type: String, enum: ['For Sale','For Rent','For Lease','Sold','Rented'], default: 'For Sale' },

    // Specs
    beds:       { type: Number, default: null },
    baths:      { type: Number, default: null },
    area:       { type: String, required: true },
    areaValue:  { type: Number },

    // Location
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

    // Images
    images: [
      {
        url:       { type: String, required: true },
        publicId:  { type: String },
        isPrimary: { type: Boolean, default: false },
        caption:   { type: String },
      },
    ],

    amenities:  [{ type: String }],
    features:   [{ type: String }],

    // Project details
    developer:   { type: String },
    possession:  { type: String },
    rera:        { type: String, default: 'Applied' },
    reraVerified:{ type: Boolean, default: false },

    // Admin controls
    badge:    { type: String, enum: ['Premium','Featured','Hot','New Launch','Lease','Commercial',null], default: null },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isSold:   { type: Boolean, default: false },

    // Analytics
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

// Auto-generate slug
propertySchema.pre('save', function (next) {
  if (this.isModified('title') || !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true }) + '-' + Date.now();
  }
  next();
});

// Virtual: primary image URL
propertySchema.virtual('image').get(function () {
  const primary = this.images?.find(img => img.isPrimary);
  return primary?.url ?? this.images?.[0]?.url ?? null;
});

// Indexes
propertySchema.index({ title: 'text', description: 'text', 'location.locality': 'text' });
propertySchema.index({ type: 1, status: 1, 'location.locality': 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ featured: 1, isActive: 1 });

module.exports = mongoose.model('Property', propertySchema);