require('dotenv').config();

const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const morgan         = require('morgan');
const compression    = require('compression');
const rateLimit      = require('express-rate-limit');
const swaggerUi      = require('swagger-ui-express');
const swaggerSpec    = require('./config/swagger');

const connectDB          = require('./config/database');
const { errorHandler }   = require('./middleware/error.middleware');

// Routes
const authRoutes     = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const enquiryRoutes  = require('./routes/enquiry.routes');
const categoryRoutes = require('./routes/category.routes');
const adminRoutes    = require('./routes/admin.routes');
const cmsRoutes      = require('./routes/cms.routes');
const uploadRoutes   = require('./routes/upload.routes');

const app = express();


// ─────────────────────────────────────────────
// 🔐 SECURITY
// ─────────────────────────────────────────────
app.use(helmet());
app.use(compression());


// ─────────────────────────────────────────────
// 🌐 CORS (DEV FRIENDLY)
// ─────────────────────────────────────────────
app.use(cors({
  origin: true, // allow all in dev
  credentials: true
}));


// ─────────────────────────────────────────────
// 🚦 RATE LIMIT
// ─────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, try again later' }
}));


// ─────────────────────────────────────────────
// 📦 BODY PARSER
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


// ─────────────────────────────────────────────
// 📊 LOGGER
// ─────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}


// ─────────────────────────────────────────────
// 🏠 ROOT ROUTE (FIX)
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 PrimePro Backend Running');
});


// ─────────────────────────────────────────────
// 📚 SWAGGER DOCS
// ─────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpec);
});


// ─────────────────────────────────────────────
// 💚 HEALTH CHECK
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'PrimePro API is running 🚀',
    env: process.env.NODE_ENV,
    time: new Date()
  });
});


// ─────────────────────────────────────────────
// 🔗 API ROUTES
// ─────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/properties',  propertyRoutes);
app.use('/api/enquiries',   enquiryRoutes);
app.use('/api/categories',  categoryRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/cms',         cmsRoutes);
app.use('/api/upload',      uploadRoutes);


// ─────────────────────────────────────────────
// ❌ 404 HANDLER
// ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    docs: `http://localhost:${process.env.PORT || 3000}/api/docs`
  });
});


// ─────────────────────────────────────────────
// ⚠️ GLOBAL ERROR HANDLER
// ─────────────────────────────────────────────
app.use(errorHandler);


// ─────────────────────────────────────────────
// 🚀 START SERVER
// ─────────────────────────────────────────────
connectDB().then(() => {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📖 Docs:   http://localhost:${PORT}/api/docs`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health\n`);
  });
});

module.exports = app;