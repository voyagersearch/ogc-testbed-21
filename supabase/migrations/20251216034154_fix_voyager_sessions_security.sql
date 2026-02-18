/*
  # Fix Voyager Sessions Security Issues

  1. Security Improvements
    - Add explicit deny-all RLS policy for voyager_sessions
    - Only service role can access this table (enforced by RLS)
    - Fix search_path on cleanup function to be immutable

  2. Notes
    - Unused index warnings are expected for new tables
    - Auth DB connection strategy is a project setting, not fixable via migration
*/

-- Add explicit deny-all policy for regular users
-- Service role bypasses RLS, so this doesn't affect backend operations
CREATE POLICY "Service role only - deny all user access"
  ON voyager_sessions
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- Recreate cleanup function with fixed search_path
DROP FUNCTION IF EXISTS cleanup_expired_voyager_sessions();

CREATE OR REPLACE FUNCTION cleanup_expired_voyager_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM voyager_sessions WHERE expires_at < now();
END;
$$;
