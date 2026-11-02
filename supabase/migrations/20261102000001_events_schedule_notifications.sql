-- Migration: 20261102000001_events_schedule_notifications.sql
-- Description: Adds schedule and speakers JSONB columns to events, relaxes location constraint, and adds notifications table.

-- 1. Extend events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS speakers JSONB DEFAULT '[]'::JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS volunteers_needed INT DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS associated_communities JSONB DEFAULT '[]'::JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS budget_type VARCHAR(50) DEFAULT 'no-budget';
ALTER TABLE events ADD COLUMN IF NOT EXISTS seeking_sponsors BOOLEAN DEFAULT false;

-- Allow unconfirmed / TBD venue during creation and draft states
ALTER TABLE events ALTER COLUMN location DROP NOT NULL;
ALTER TABLE events ALTER COLUMN location SET DEFAULT 'Venue to be announced';

-- 2. Attendee Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255) NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    event_title VARCHAR(255),
    type VARCHAR(100) DEFAULT 'event_update',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    changes JSONB DEFAULT '{}'::JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_email ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

