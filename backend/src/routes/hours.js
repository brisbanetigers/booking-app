import express from 'express';
import { z } from 'zod';
import { queryCustomer, queryStaff } from '../db.js';
import { basicAuth } from '../middleware/auth.js';

const router = express.Router();

// GET all hours (public)
router.get('/', async (req, res) => {
  try {
    const standardResult = await queryCustomer('SELECT * FROM operating_hours ORDER BY day_of_week ASC');
    const specialResult = await queryCustomer('SELECT * FROM special_hours WHERE special_date >= CURRENT_DATE ORDER BY special_date ASC');
    
    res.json({
      standard: standardResult.rows,
      special: specialResult.rows
    });
  } catch (error) {
    console.error('Error fetching hours:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update standard hours
router.post('/standard', basicAuth, async (req, res) => {
  const schema = z.array(z.object({
    day_of_week: z.number().int().min(0).max(6),
    open_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    close_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    is_closed: z.boolean()
  }));

  try {
    const data = schema.parse(req.body);
    
    // Batch update using transactions
    await queryStaff('BEGIN');
    for (const day of data) {
      await queryStaff(
        `UPDATE operating_hours SET open_time = $1, close_time = $2, is_closed = $3 WHERE day_of_week = $4`,
        [day.open_time, day.close_time, day.is_closed, day.day_of_week]
      );
    }
    await queryStaff('COMMIT');
    
    res.json({ success: true });
  } catch (error) {
    await queryStaff('ROLLBACK');
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Error updating standard hours:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update or insert special exception
router.post('/special', basicAuth, async (req, res) => {
  const schema = z.object({
    special_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    open_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
    close_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
    is_closed: z.boolean(),
    reason: z.string().max(255).optional()
  });

  try {
    const data = schema.parse(req.body);
    
    // Default fallback times if missing
    const openTime = data.open_time || '00:00';
    const closeTime = data.close_time || '00:00';

    await queryStaff(
      `INSERT INTO special_hours (special_date, open_time, close_time, is_closed, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (special_date) 
       DO UPDATE SET open_time = EXCLUDED.open_time, 
                     close_time = EXCLUDED.close_time, 
                     is_closed = EXCLUDED.is_closed, 
                     reason = EXCLUDED.reason RETURNING *`,
      [data.special_date, openTime, closeTime, data.is_closed, data.reason || null]
    );
    
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error('Error managing special hours:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Delete special exception
router.delete('/special/:date', basicAuth, async (req, res) => {
  try {
    const { date } = req.params;
    await queryStaff(`DELETE FROM special_hours WHERE special_date = $1`, [date]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting special hours:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
