import express from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { basicAuth } from '../middleware/auth.js';
import { emailService } from '../services/EmailService.js';

const router = express.Router();

// Validation schema for incoming booking
const bookingSchema = z.object({
  customer_name: z.string().min(2, "Name is too short"),
  email: z.string().email("Invalid email address"),
  booking_slot: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
  party_size: z.number().int().positive().max(20, "Party size cannot exceed 20"),
});

router.post('/', async (req, res) => {
  try {
    const validatedData = bookingSchema.parse(req.body);
    
    // Parse the date and time from the incoming string (Expected format: YYYY-MM-DDTHH:MM:00)
    // If it ends with Z or has offset, stripping those gives the local intended time.
    let localSlotStr = validatedData.booking_slot;
    if (localSlotStr.endsWith('Z')) localSlotStr = localSlotStr.slice(0, -1);
    
    const [datePart, timePart] = localSlotStr.split('T');
    const timeStr = timePart.substring(0, 5); // HH:MM
    const bookingDateObj = new Date(datePart);
    const dayOfWeek = bookingDateObj.getDay();

    // Check operating hours
    const specialCheck = await query('SELECT * FROM special_hours WHERE special_date = $1', [datePart]);
    let activeHours = null;
    
    if (specialCheck.rows.length > 0) {
      activeHours = specialCheck.rows[0];
    } else {
      const standardCheck = await query('SELECT * FROM operating_hours WHERE day_of_week = $1', [dayOfWeek]);
      activeHours = standardCheck.rows[0];
    }

    if (!activeHours || activeHours.is_closed) {
       return res.status(400).json({ error: 'The restaurant is closed completely on this date.' });
    }

    if (timeStr < activeHours.open_time.substring(0,5) || timeStr > activeHours.close_time.substring(0,5)) {
       return res.status(400).json({ error: `Please choose a time between ${activeHours.open_time.substring(0,5)} and ${activeHours.close_time.substring(0,5)}.` });
    }

    // Check if slot is available (prevent overbooking)
    // For this boilerplate, let's assume maximum 5 bookings per slot
    const slotCheck = await query(
      "SELECT COUNT(*) FROM bookings WHERE booking_slot = $1 AND status != 'Cancelled'",
      [validatedData.booking_slot]
    );

    if (parseInt(slotCheck.rows[0].count) >= 5) {
      return res.status(400).json({ error: 'This time slot is fully booked.' });
    }

    // Insert booking
    const result = await query(
      `INSERT INTO bookings (customer_name, email, booking_slot, party_size) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        validatedData.customer_name,
        validatedData.email,
        validatedData.booking_slot,
        validatedData.party_size
      ]
    );

    const newBooking = result.rows[0];

    // Trigger email notification async (don't await so we respond faster)
    emailService.sendBookingConfirmation(
      newBooking.email, 
      newBooking.customer_name, 
      newBooking
    );

    res.status(201).json(newBooking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all upcoming bookings (Staff Dashboard, protected)
router.get('/', basicAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM bookings 
       WHERE booking_slot >= CURRENT_DATE 
       ORDER BY booking_slot ASC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update a booking status (Staff Dashboard, protected)
router.patch('/:id', basicAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting 'Confirmed', 'Cancelled', 'Arrived'

    const validStatuses = ['Pending', 'Confirmed', 'Cancelled', 'Arrived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await query(
      `UPDATE bookings SET status = $1 WHERE uuid = $2 RETURNING *`,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
