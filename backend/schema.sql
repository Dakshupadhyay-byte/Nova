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


-- =============================================================================
-- TABLE: health_records
-- =============================================================================
-- Raw, normalized health records received from Android Health Connect / HC Webhook.
-- =============================================================================
CREATE TABLE IF NOT EXISTS health_records (
    id               BIGSERIAL    PRIMARY KEY,

    -- FK to users. ON DELETE CASCADE removes all health records when user is deleted.
    user_id          BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- metric_type: 'steps', 'sleep', 'heart_rate', 'calories', 'exercise', etc.
    metric_type      VARCHAR(50)  NOT NULL,

    -- source: origin app or SDK name (e.g., 'hc_webhook', 'health_connect', 'samsung_health')
    source           VARCHAR(100) NOT NULL DEFAULT 'health_connect',

    -- source_record_id: optional unique identifier provided by source SDK (nullable)
    source_record_id VARCHAR(255),

    -- timestamps: start and end time bounds of the metric sample/session
    start_time       TIMESTAMPTZ  NOT NULL,
    end_time         TIMESTAMPTZ  NOT NULL,

    -- value_numeric: aggregated or scalar value (e.g. step count, sleep hours, bpm, kcal)
    value_numeric    NUMERIC(12,4),

    -- unit: measurement unit (e.g. 'count', 'hours', 'bpm', 'kcal', 'minutes')
    unit             VARCHAR(30),

    -- payload: complete raw source record stored as JSONB for auditability
    payload          JSONB        NOT NULL DEFAULT '{}'::jsonb,

    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for dominant user + metric + time queries
CREATE INDEX IF NOT EXISTS idx_health_records_user_metric_time
    ON health_records (user_id, metric_type, start_time DESC);

-- Unique index 1: Deduplication when source_record_id IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_health_records_source_id
    ON health_records (user_id, source, metric_type, source_record_id)
    WHERE source_record_id IS NOT NULL;

-- Unique index 2: Deduplication when source_record_id IS NULL (deterministic time-range key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_health_records_time_range
    ON health_records (user_id, source, metric_type, start_time, end_time)
    WHERE source_record_id IS NULL;

COMMENT ON TABLE  health_records                  IS 'Raw health data records ingested from Health Connect / Android bridge';
COMMENT ON COLUMN health_records.source_record_id IS 'Unique record UUID from Health Connect if available';
COMMENT ON COLUMN health_records.payload          IS 'Complete un-truncated source JSON record';


-- =============================================================================
-- TABLE: user_api_keys
-- =============================================================================
-- Long-lived, revocable API credentials for health webhooks & background ingestion.
-- Plaintext tokens are NEVER stored. Only SHA-256 hashes are persisted.
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_api_keys (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash    VARCHAR(64) NOT NULL UNIQUE,
    key_prefix  VARCHAR(32) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id
    ON user_api_keys (user_id);

CREATE INDEX IF NOT EXISTS idx_user_api_keys_key_hash
    ON user_api_keys (key_hash)
    WHERE revoked_at IS NULL;

COMMENT ON TABLE  user_api_keys          IS 'Secure SHA-256 hashed API keys for webhook ingestion';
COMMENT ON COLUMN user_api_keys.key_hash IS 'SHA-256 hex digest (64 chars) of full plaintext token';


-- =============================================================================
-- TABLE: health_daily_aggregates
-- =============================================================================
-- Stores daily rollup aggregates per user computed in local Asia/Kolkata timezone.
-- =============================================================================
CREATE TABLE IF NOT EXISTS health_daily_aggregates (
    id                       BIGSERIAL     PRIMARY KEY,
    user_id                  BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date                 DATE          NOT NULL,
    total_steps              NUMERIC(12,0) NOT NULL DEFAULT 0,
    active_exercise_minutes  NUMERIC(12,2) NOT NULL DEFAULT 0,
    exercise_distance_meters NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_health_daily_user_date UNIQUE (user_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_health_daily_user_date
    ON health_daily_aggregates (user_id, log_date DESC);

COMMENT ON TABLE  health_daily_aggregates                          IS 'Daily aggregated health metrics per user in Asia/Kolkata timezone';
COMMENT ON COLUMN health_daily_aggregates.log_date                 IS 'Calendar date in Asia/Kolkata timezone';
COMMENT ON COLUMN health_daily_aggregates.total_steps              IS 'Maximum cumulative step snapshot count for the day';
COMMENT ON COLUMN health_daily_aggregates.active_exercise_minutes  IS 'Sum of exercise session duration in minutes';
COMMENT ON COLUMN health_daily_aggregates.exercise_distance_meters IS 'Sum of exercise session distance in meters';


-- =============================================================================
-- TABLE: blueprints
-- =============================================================================
-- Multi-day personalized wellness & focus roadmaps per user.
-- =============================================================================
CREATE TABLE IF NOT EXISTS blueprints (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    outcome       TEXT         NOT NULL,
    duration_days INTEGER      NOT NULL CHECK (duration_days BETWEEN 1 AND 90),
    start_date    DATE         NOT NULL DEFAULT CURRENT_DATE,
    end_date      DATE         NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'active' 
                               CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_blueprint_dates CHECK (end_date >= start_date)
);

-- Ensure a user can have at most ONE active blueprint at a time
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_blueprint_per_user
    ON blueprints (user_id)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_blueprints_user_status
    ON blueprints (user_id, status);

COMMENT ON TABLE  blueprints            IS 'Multi-day personalized wellness & focus roadmaps per user';
COMMENT ON COLUMN blueprints.outcome    IS 'User target goal (e.g. Improve my focus)';
COMMENT ON COLUMN blueprints.start_date IS 'Calendar start date of the blueprint';


-- =============================================================================
-- TABLE: blueprint_days
-- =============================================================================
-- Sequential daily missions belonging to a blueprint.
-- =============================================================================
CREATE TABLE IF NOT EXISTS blueprint_days (
    id           BIGSERIAL    PRIMARY KEY,
    blueprint_id BIGINT       NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
    day_number   INTEGER      NOT NULL CHECK (day_number > 0),
    log_date     DATE         NOT NULL,
    title        VARCHAR(255) NOT NULL,
    mission      TEXT         NOT NULL,
    rationale    TEXT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'pending' 
                              CHECK (status IN ('pending', 'completed', 'skipped')),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_blueprint_day_number UNIQUE (blueprint_id, day_number),
    CONSTRAINT uq_blueprint_day_date   UNIQUE (blueprint_id, log_date),
    CONSTRAINT chk_blueprint_day_completion CHECK (
        (status = 'completed' AND completed_at IS NOT NULL)
        OR
        (status IN ('pending', 'skipped') AND completed_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_blueprint_days_blueprint_number
    ON blueprint_days (blueprint_id, day_number);

CREATE INDEX IF NOT EXISTS idx_blueprint_days_blueprint_date
    ON blueprint_days (blueprint_id, log_date);

COMMENT ON TABLE  blueprint_days           IS 'Sequential daily missions belonging to a blueprint';
COMMENT ON COLUMN blueprint_days.mission   IS 'Actionable daily mission generated by NOVA';
COMMENT ON COLUMN blueprint_days.rationale IS 'Contextual explanation for why this mission was assigned';




