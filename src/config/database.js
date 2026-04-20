const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    mongoose.connection.on('error',        err => console.error('❌ MongoDB error:', err));
    mongoose.connection.on('disconnected', ()  => console.warn('⚠️  MongoDB disconnected'));
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;