const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Route files
const authRoutes = require('./routes/authRoutes');
const plannerRoutes = require('./routes/plannerRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const hotelRoutes = require('./routes/hotelRoutes');
const guideRoutes = require('./routes/guideRoutes');
const packageRoutes = require('./routes/packageRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const mapRoutes = require('./routes/mapRoutes');
const googleAuthRoutes = require('./routes/googleAuthRoutes');

// Mount routers
app.use('/api/auth/google', googleAuthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/routes', mapRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`));