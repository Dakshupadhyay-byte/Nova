-- =============================================================================
-- schema.sql — Nova Async MVP Database Schema
-- =============================================================================
-- Run this file against your PostgreSQL database to create the full schema:
--   psql -U <user> -d <database> -f schema.sql
--
-- Design philosophy:
--   • Every table gets a BIGSERIAL primary key (auto-incrementing 64-bit int)
--     instead of a plain SERIAL (32-bit) — avoids id exhaustion on busy tables.
--   • Timestamps use TIMESTAMPTZ (timestamp WITH time zone) so the DB stores
--     UTC internally. Always store UTC; convert to local time in the app layer.
--   • ON DELETE CASCADE on foreign keys means deleting a user automatically
--     removes all their associated rows — no orphaned data, no application-level
--     cleanup required. Use carefully: this is appropriate here because wellness
--     logs and focus sessions are meaningless without their owner.
-- =============================================================================


-- ─── Enable UUID extension (optional, used if you later switch to UUID PKs) ──
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- TABLE: users
-- =============================================================================
-- Authentication is handled exclusively by Google Sign-In.
-- No passwords are stored. The google_id column holds the stable subject
-- identifier ("sub") from a verified Google ID token. This is Google's
-- permanent, unique, never-reused identifier for a Google account — more
-- reliable than email, which users can change.
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    id         BIGSERIAL    PRIMARY KEY,
    name       VARCHAR(150) NOT NULL,
    email      VARCHAR(255) NOT NULL UNIQUE,

    -- google_id: the "sub" claim from a verified Google ID token.
    -- UNIQUE ensures one user row per Google account.
    -- NOT NULL because every user in this system authenticates via Google.
    google_id  VARCHAR(255) NOT NULL UNIQUE,

    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users           IS 'Application user accounts — Google Sign-In only, no passwords stored';
COMMENT ON COLUMN users.google_id IS 'Stable Google subject ID ("sub" claim from verified ID token)';


-- =============================================================================
-- TABLE: wellness_logs
-- =============================================================================
-- One row per user per calendar day (enforced by the UNIQUE constraint below).
-- The ON CONFLICT upsert in checkin.controller.js relies on that uniqueness.
-- =============================================================================
CREATE TABLE IF NOT EXISTS wellness_logs (
    id           BIGSERIAL    PRIMARY KEY,

    -- FK to users. ON DELETE CASCADE removes all logs when the user is deleted.
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- log_date: the calendar date the check-in represents (not the wall-clock
    -- timestamp of submission). Stored as DATE so it is timezone-agnostic — we
    -- always compare it against CURRENT_DATE in the user's local day, which the
    -- client is expected to pass explicitly in the request body.
    log_date     DATE         NOT NULL DEFAULT CURRENT_DATE,

    -- sleep_hours: decimal hours of sleep the user reports (e.g. 6.5 = 6h 30m).
    -- Nullable — user can submit a check-in without a sleep value.
    sleep_hours  NUMERIC(4,1) CHECK (sleep_hours >= 0 AND sleep_hours <= 24),

    -- energy_level: 1–10 subjective rating. CHECK enforced at the DB level.
    energy_level SMALLINT     CHECK (energy_level BETWEEN 1 AND 10),

    -- UNIQUE on (user_id, log_date) is the cornerstone of the upsert strategy:
    -- INSERT … ON CONFLICT (user_id, log_date) DO UPDATE.
    -- Without this constraint the ON CONFLICT clause has nothing to target and
    -- Postgres will raise an error.
    CONSTRAINT uq_wellness_user_date UNIQUE (user_id, log_date)
);

-- Composite index on (user_id, log_date DESC) — matches the dominant query:
-- "get today's entry for user X".
CREATE INDEX IF NOT EXISTS idx_wellness_logs_user_date
    ON wellness_logs (user_id, log_date DESC);

COMMENT ON TABLE  wellness_logs          IS 'Daily wellness check-ins: one row per user per day';
COMMENT ON COLUMN wellness_logs.log_date IS 'Calendar date of the check-in, supplied by client';


-- =============================================================================
-- TABLE: focus_sessions
-- =============================================================================
-- One row = one recorded focus/work session (e.g., a Pomodoro or deep-work block).
-- =============================================================================
CREATE TABLE IF NOT EXISTS focus_sessions (
    id               BIGSERIAL   PRIMARY KEY,

    -- FK to users. ON DELETE CASCADE removes sessions when the user is deleted.
    user_id          BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- duration_minutes: how many minutes the session lasted. Must be positive.
    duration_minutes INTEGER     NOT NULL CHECK (duration_minutes > 0),

    -- interruptions: how many times the user was interrupted during the session.
    -- Nullable — not always tracked. DEFAULT 0 for sessions that report no interruptions.
    interruptions    SMALLINT    NOT NULL DEFAULT 0 CHECK (interruptions >= 0),

    -- started_at: when the session actually began. The client supplies this value
    -- (not the server wall clock) so offline / backdated sessions are supported.
    started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ended_at: nullable while the session is in progress.
    ended_at         TIMESTAMPTZ,

    -- completed: FALSE until the user explicitly marks the session done.
    completed        BOOLEAN     NOT NULL DEFAULT FALSE,

    -- DB-level guard: ended_at, if set, must be after started_at.
    CONSTRAINT chk_session_times CHECK (ended_at IS NULL OR ended_at > started_at)
);

-- Composite index for user+time queries (dominant pattern for dashboard).
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_time
    ON focus_sessions (user_id, started_at DESC);

COMMENT ON TABLE  focus_sessions              IS 'Recorded deep-work / focus blocks per user';
COMMENT ON COLUMN focus_sessions.interruptions IS 'Count of interruptions during the session';
COMMENT ON COLUMN focus_sessions.completed     IS 'TRUE only when the user finished the full session';
