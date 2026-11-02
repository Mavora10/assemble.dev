-- ==========================================================
-- ASSEMBLE.DEV — EVENT TASKS & ORGANIZER OPERATIONS SCHEMA
-- Migration: 20261102000000_event_tasks.sql
-- ==========================================================

CREATE TABLE IF NOT EXISTS event_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Logistics', -- 'Logistics', 'Marketing', 'Speakers', 'Sponsors', 'Day-Of'
    assigned_to_email VARCHAR(255),
    linked_entity_type VARCHAR(50), -- 'speaker', 'venue', 'sponsor', 'merchandise'
    linked_entity_id VARCHAR(100),
    due_date DATE,
    relative_timeline VARCHAR(100), -- 'T-30 Days', 'T-5 Days', 'Day-Of'
    status VARCHAR(50) DEFAULT 'todo', -- 'todo', 'in_progress', 'completed'
    priority VARCHAR(50) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_tasks_event_id ON event_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_category ON event_tasks(category);
CREATE INDEX IF NOT EXISTS idx_event_tasks_status ON event_tasks(status);
