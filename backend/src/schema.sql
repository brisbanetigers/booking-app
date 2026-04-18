CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS bookings (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    booking_slot TIMESTAMP WITH TIME ZONE NOT NULL,
    party_size INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(50);

CREATE TABLE IF NOT EXISTS operating_hours (
    day_of_week INTEGER PRIMARY KEY, -- 0=Sun, 1=Mon, ..., 6=Sat
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS special_hours (
    special_date DATE PRIMARY KEY,
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,
    reason VARCHAR(255)
);

-- Seed standard hours (Mon-Sun, 9 AM to 5 PM defaults, weekends closed by default for safety)
INSERT INTO operating_hours (day_of_week, open_time, close_time, is_closed) VALUES 
(0, '09:00', '17:00', TRUE),  -- Sunday
(1, '09:00', '17:00', FALSE), -- Monday
(2, '09:00', '17:00', FALSE), -- Tuesday
(3, '09:00', '17:00', FALSE), -- Wednesday
(4, '09:00', '17:00', FALSE), -- Thursday
(5, '09:00', '17:00', FALSE), -- Friday
(6, '09:00', '17:00', TRUE)   -- Saturday
ON CONFLICT (day_of_week) DO NOTHING;
