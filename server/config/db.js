const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/voxpath';

  const conn = await mongoose.connect(uri);

  console.log(`📦 MongoDB connected: ${conn.connection.host}`);
  return conn;
};

module.exports = connectDB;
