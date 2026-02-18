/*
  # Drop voyager_sessions table

  1. Changes
    - Drop the voyager_sessions table as it's no longer needed
    - The application now uses direct cookie-based authentication with Voyager
    - No proxy infrastructure is required

  2. Notes
    - This table was previously used to store Voyager session cookies for proxy purposes
    - With direct localhost access, browser cookies handle authentication automatically
*/

DROP TABLE IF EXISTS voyager_sessions;
