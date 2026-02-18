/*
  # Create Voyager Sessions Table

  1. New Tables
    - `voyager_sessions`
      - `id` (uuid, primary key) - Unique identifier
      - `session_id` (text, unique) - Session ID for client-side reference
      - `cookies` (text) - Stored Voyager session cookies
      - `user_data` (jsonb) - User information from Voyager
      - `expires_at` (timestamptz) - Session expiration time
      - `created_at` (timestamptz) - When session was created
      - `updated_at` (timestamptz) - When session was last used

  2. Security
    - Enable RLS on `voyager_sessions` table
    - Only service role can access this table (no user policies needed)

  3. Indexes
    - Index on session_id for fast lookups
    - Index on expires_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS voyager_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  cookies text NOT NULL,
  user_data jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE voyager_sessions ENABLE ROW LEVEL SECURITY;

-- Service role only - no user policies needed
-- RLS is enabled but restrictive by default

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_voyager_sessions_session_id ON voyager_sessions(session_id);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_voyager_sessions_expires_at ON voyager_sessions(expires_at);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_voyager_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM voyager_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
