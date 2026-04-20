const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PrimePro Real Estate API',
      version: '1.0.0',
      description: `
## PrimePro — Real Estate REST API

Full-featured REST API for the PrimePro real estate platform.

### Base URL
- **Local:** \`http://localhost:3000\`
- **Production:** \`https://api.primepro.in\`

### Authentication
Protected endpoints require a **Bearer JWT token** in the \`Authorization\` header.

**Get user token:** \`POST /api/auth/login\`

**Get admin token:** \`POST /api/auth/admin/login\`

Demo credentials:
- Admin: \`admin@primepro.in\` / \`Admin@123\`
- Super Admin: \`super@primepro.in\` / \`Super@123\`
- User: \`arjun@example.com\` / \`User@123\`

Click **Authorize** at the top and paste your token.
      `,
      contact: { name: 'PrimePro Support', email: 'info@primepro.in' },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local Development' },
      { url: 'https://api.primepro.in', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste JWT token from POST /api/auth/login or POST /api/auth/admin/login',
        },
      },
      schemas: {
        // ── Auth schemas ──────────────────────────────────
        RegisterInput: {
          type: 'object',
          required: ['name', 'email', 'phone', 'password'],
          properties: {
            name:     { type: 'string', example: 'Arjun Mehta', minLength: 2, maxLength: 80 },
            email:    { type: 'string', format: 'email', example: 'arjun@example.com' },
            phone:    { type: 'string', example: '9876543210', pattern: '^[6-9]\\d{9}$', description: '10-digit Indian mobile number' },
            password: { type: 'string', format: 'password', example: 'Secret@123', minLength: 6 },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'arjun@example.com', description: 'Provide email OR phone' },
            phone:    { type: 'string', example: '9876543210', description: 'Provide email OR phone' },
            password: { type: 'string', format: 'password', example: 'Secret@123' },
          },
        },
        AdminLoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'admin@primepro.in' },
            password: { type: 'string', format: 'password', example: 'Admin@123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string',  example: 'Login successful' },
            token:   { type: 'string',  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user:    { $ref: '#/components/schemas/UserPublic' },
          },
        },
        UserPublic: {
          type: 'object',
          properties: {
            _id:       { type: 'string',  example: '64a1f3c2b5e8a23456789012' },
            name:      { type: 'string',  example: 'Arjun Mehta' },
            email:     { type: 'string',  example: 'arjun@example.com' },
            phone:     { type: 'string',  example: '9876543210' },
            role:      { type: 'string',  enum: ['user', 'admin', 'superadmin'], example: 'user' },
            avatar:    { type: 'string',  nullable: true, example: null },
            isActive:  { type: 'boolean', example: true },
            createdAt: { type: 'string',  format: 'date-time' },
          },
        },
        UpdateProfileInput: {
          type: 'object',
          properties: {
            name:   { type: 'string', example: 'Arjun Kumar' },
            phone:  { type: 'string', example: '9876543299' },
            avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
          },
        },
        ChangePasswordInput: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', format: 'password', example: 'OldPass@123' },
            newPassword:     { type: 'string', format: 'password', example: 'NewPass@456', minLength: 6 },
          },
        },

        // ── Property schemas ──────────────────────────────
        PropertyLocation: {
          type: 'object',
          required: ['address', 'locality', 'city'],
          properties: {
            address:  { type: 'string', example: 'Road No. 10, Banjara Hills' },
            locality: { type: 'string', example: 'Banjara Hills' },
            city:     { type: 'string', example: 'Hyderabad' },
            state:    { type: 'string', example: 'Telangana' },
            pincode:  { type: 'string', example: '300034' },
            coordinates: {
              type: 'object',
              properties: {
                lat: { type: 'number', example: 17.4126 },
                lng: { type: 'number', example: 78.4071 },
              },
            },
          },
        },
        PropertyImage: {
          type: 'object',
          properties: {
            url:       { type: 'string', example: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800' },
            publicId:  { type: 'string', example: 'primepro/properties/abc123' },
            isPrimary: { type: 'boolean', example: true },
            caption:   { type: 'string', example: 'Front view' },
          },
        },
        Property: {
          type: 'object',
          properties: {
            _id:         { type: 'string', example: '64a1f3c2b5e8a23456789abc' },
            title:       { type: 'string', example: 'Casa Luxura Penthouse' },
            slug:        { type: 'string', example: 'casa-luxura-penthouse-1714000000000' },
            description: { type: 'string', example: 'Unmatched penthouse experience in Banjara Hills...' },
            price:       { type: 'number', example: 42000000 },
            priceLabel:  { type: 'string', example: '₹4.2 Cr' },
            priceType:   { type: 'string', enum: ['fixed', 'negotiable', 'on_request'] },
            type:        { type: 'string', enum: ['Residential', 'Commercial', 'Agriculture', 'Industrial', 'Luxury'] },
            subtype:     { type: 'string', example: 'Penthouse' },
            status:      { type: 'string', enum: ['For Sale', 'For Rent', 'For Lease', 'Sold', 'Rented'] },
            beds:        { type: 'number', nullable: true, example: 4 },
            baths:       { type: 'number', nullable: true, example: 4 },
            area:        { type: 'string', example: '4,200 sq.ft' },
            location:    { $ref: '#/components/schemas/PropertyLocation' },
            images:      { type: 'array', items: { $ref: '#/components/schemas/PropertyImage' } },
            image:       { type: 'string', description: 'Virtual — primary image URL', example: 'https://images.unsplash.com/...' },
            amenities:   { type: 'array', items: { type: 'string' }, example: ['Swimming Pool', 'Gym', 'Clubhouse'] },
            developer:   { type: 'string', example: 'Rajapushpa Group' },
            possession:  { type: 'string', example: 'Ready to Move' },
            rera:        { type: 'string', example: 'P02400003987' },
            badge:       { type: 'string', nullable: true, enum: ['Premium', 'Featured', 'Hot', 'New Launch', 'Lease', 'Commercial', null] },
            featured:    { type: 'boolean', example: true },
            isActive:    { type: 'boolean', example: true },
            views:       { type: 'number', example: 342 },
            enquiries:   { type: 'number', example: 18 },
            rating:      { type: 'number', example: 4.9 },
            reviews:     { type: 'number', example: 28 },
            createdAt:   { type: 'string', format: 'date-time' },
          },
        },
        CreatePropertyInput: {
          type: 'object',
          required: ['title', 'description', 'price', 'type', 'subtype', 'area', 'location'],
          properties: {
            title:       { type: 'string', example: 'Casa Luxura Penthouse' },
            description: { type: 'string', example: 'Unmatched penthouse experience...' },
            price:       { type: 'number', example: 42000000 },
            priceLabel:  { type: 'string', example: '₹4.2 Cr' },
            priceType:   { type: 'string', enum: ['fixed', 'negotiable', 'on_request'], default: 'negotiable' },
            type:        { type: 'string', enum: ['Residential', 'Commercial', 'Agriculture', 'Industrial', 'Luxury'] },
            subtype:     { type: 'string', example: 'Penthouse' },
            status:      { type: 'string', enum: ['For Sale', 'For Rent', 'For Lease'], default: 'For Sale' },
            beds:        { type: 'number', example: 4 },
            baths:       { type: 'number', example: 4 },
            area:        { type: 'string', example: '4,200 sq.ft' },
            location:    { $ref: '#/components/schemas/PropertyLocation' },
            amenities:   { type: 'array', items: { type: 'string' }, example: ['Swimming Pool', 'Gym'] },
            developer:   { type: 'string', example: 'Rajapushpa Group' },
            possession:  { type: 'string', example: 'Ready to Move' },
            rera:        { type: 'string', example: 'P02400003987' },
            badge:       { type: 'string', nullable: true },
            featured:    { type: 'boolean', example: false },
          },
        },
        PropertiesListResponse: {
          type: 'object',
          properties: {
            success:    { type: 'boolean', example: true },
            total:      { type: 'number',  example: 9 },
            count:      { type: 'number',  example: 9 },
            page:       { type: 'number',  example: 1 },
            pages:      { type: 'number',  example: 1 },
            properties: { type: 'array', items: { $ref: '#/components/schemas/Property' } },
          },
        },

        // ── Enquiry schemas ───────────────────────────────
        CreateEnquiryInput: {
          type: 'object',
          required: ['name', 'email', 'phone', 'message'],
          properties: {
            propertyId:   { type: 'string', example: '64a1f3c2b5e8a23456789abc', description: 'Optional — link to a specific property' },
            name:         { type: 'string', example: 'Arjun Mehta' },
            email:        { type: 'string', format: 'email', example: 'arjun@example.com' },
            phone:        { type: 'string', example: '9876543210' },
            message:      { type: 'string', example: 'Interested in scheduling a site visit this weekend.' },
            subject:      { type: 'string', example: 'Site Visit Request' },
            type:         { type: 'string', enum: ['General Enquiry', 'Buy Property', 'Rent / Lease', 'Sell Property', 'NRI Enquiry', 'Site Visit'], default: 'General Enquiry' },
            scheduleDate: { type: 'string', format: 'date', example: '2025-04-15' },
          },
        },
        Enquiry: {
          type: 'object',
          properties: {
            _id:          { type: 'string' },
            property:     { type: 'object', nullable: true, description: 'Populated property object or null' },
            user:         { type: 'object', nullable: true, description: 'Populated user object or null' },
            name:         { type: 'string', example: 'Arjun Mehta' },
            email:        { type: 'string', example: 'arjun@example.com' },
            phone:        { type: 'string', example: '9876543210' },
            message:      { type: 'string' },
            type:         { type: 'string', enum: ['General Enquiry', 'Buy Property', 'Rent / Lease', 'Sell Property', 'NRI Enquiry', 'Site Visit'] },
            status:       { type: 'string', enum: ['new', 'read', 'replied', 'closed'], example: 'new' },
            notes:        { type: 'string', example: 'Called client. Visit scheduled.' },
            scheduleDate: { type: 'string', nullable: true },
            createdAt:    { type: 'string', format: 'date-time' },
          },
        },
        UpdateEnquiryInput: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['new', 'read', 'replied', 'closed'], example: 'replied' },
            notes:  { type: 'string', example: 'Called client. Visit scheduled for Saturday.' },
          },
        },

        // ── Category schemas ──────────────────────────────
        Category: {
          type: 'object',
          properties: {
            _id:           { type: 'string' },
            name:          { type: 'string', example: 'Residential' },
            slug:          { type: 'string', example: 'residential' },
            description:   { type: 'string', example: 'Apartments, Villas, Row Houses & Duplexes' },
            icon:          { type: 'string', example: '🏠' },
            color:         { type: 'string', example: '#3B82F6' },
            sortOrder:     { type: 'number', example: 1 },
            isActive:      { type: 'boolean', example: true },
            propertyCount: { type: 'number', example: 6 },
          },
        },
        CreateCategoryInput: {
          type: 'object',
          required: ['name'],
          properties: {
            name:        { type: 'string', example: 'Residential' },
            description: { type: 'string', example: 'Apartments, Villas, Row Houses & Duplexes' },
            icon:        { type: 'string', example: '🏠' },
            color:       { type: 'string', example: '#3B82F6' },
            sortOrder:   { type: 'number', example: 1 },
            isActive:    { type: 'boolean', default: true },
          },
        },

        // ── CMS schemas ───────────────────────────────────
        CMSUpsertInput: {
          type: 'object',
          required: ['key', 'value'],
          properties: {
            key:   { type: 'string', example: 'hero', description: 'Unique CMS key (e.g. hero, about, seo, banners)' },
            label: { type: 'string', example: 'Hero Section' },
            value: {
              type: 'object',
              example: {
                title:           'Find Your Dream Property in Hyderabad',
                subtitle:        'Discover 1,200+ verified listings. Zero brokerage.',
                ctaText:         'Browse Properties',
                backgroundImage: 'https://images.unsplash.com/...',
              },
            },
          },
        },

        // ── Upload ────────────────────────────────────────
        UploadResponse: {
          type: 'object',
          properties: {
            success:  { type: 'boolean', example: true },
            url:      { type: 'string',  example: 'https://res.cloudinary.com/demo/image/upload/v1/primepro/properties/abc123.jpg' },
            publicId: { type: 'string',  example: 'primepro/properties/abc123' },
          },
        },
        UploadMultipleResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            images:  {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url:      { type: 'string' },
                  publicId: { type: 'string' },
                },
              },
            },
          },
        },

        // ── Admin / Dashboard ─────────────────────────────
        DashboardResponse: {
          type: 'object',
          properties: {
            success:   { type: 'boolean', example: true },
            dashboard: {
              type: 'object',
              properties: {
                stats: {
                  type: 'object',
                  properties: {
                    totalProperties:   { type: 'number', example: 9 },
                    totalUsers:        { type: 'number', example: 5 },
                    totalEnquiries:    { type: 'number', example: 6 },
                    newEnquiriesToday: { type: 'number', example: 2 },
                    activeListings:    { type: 'number', example: 8 },
                    featuredCount:     { type: 'number', example: 4 },
                  },
                },
                recentEnquiries:  { type: 'array', items: { $ref: '#/components/schemas/Enquiry' } },
                recentProperties: { type: 'array', items: { $ref: '#/components/schemas/Property' } },
                charts: {
                  type: 'object',
                  properties: {
                    enquiriesByType:  { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, count: { type: 'number' } } } },
                    propertiesByType: { type: 'array', items: { type: 'object', properties: { _id: { type: 'string' }, count: { type: 'number' } } } },
                    monthlyEnquiries: { type: 'array', items: { type: 'object', properties: { month: { type: 'string' }, count: { type: 'number' } } } },
                  },
                },
              },
            },
          },
        },

        // ── Common responses ──────────────────────────────
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string',  example: 'Operation successful' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'Error description' },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string',  example: 'Validation failed' },
            errors:  {
              type: 'object',
              example: { email: 'Enter a valid email', phone: 'Enter a valid 10-digit mobile number' },
            },
          },
        },
      },

      responses: {
        Unauthorized:  { description: 'Missing or invalid JWT token',    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        Forbidden:     { description: 'Insufficient role permissions',   content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        NotFound:      { description: 'Resource not found',              content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        ValidationErr: { description: 'Request validation failed',       content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
        ServerError:   { description: 'Internal server error',           content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      },
    },

    tags: [
      { name: 'Health',      description: 'Server health check' },
      { name: 'Auth',        description: 'User registration, login (email or phone), profile, wishlist' },
      { name: 'Properties',  description: 'Property listings — browse, search, filter, CRUD' },
      { name: 'Enquiries',   description: 'Contact and site-visit enquiry management' },
      { name: 'Categories',  description: 'Property type categories' },
      { name: 'Admin',       description: 'Admin dashboard analytics and user management (admin only)' },
      { name: 'CMS',         description: 'Website content management — hero, about, SEO, banners' },
      { name: 'Upload',      description: 'Image upload to Cloudinary (admin only)' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;