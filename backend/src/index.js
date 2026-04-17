import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './db.js';
import bookingsRouter from './routes/bookings.js';
import hoursRouter from './routes/hours.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/bookings', bookingsRouter);
app.use('/hours', hoursRouter);

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.listen(PORT, async () => {
  console.log(`Backend server listening on port ${PORT}`);
  try {
    // Attempt database initialization
    await initializeDatabase();
  } catch (err) {
    console.error('Failed to initialize database on startup. Trying to reconnect...');
  }
});
