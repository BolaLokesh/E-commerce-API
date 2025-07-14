const mongoose = require('mongoose');
const colors = require('colors');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`🟢 MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    return conn; // Return the connection object
  } catch (error) {
    console.error(`🔴 Database connection error: ${error.message}`.red.bold);
    process.exit(1);
  }
};

module.exports = connectDB;
