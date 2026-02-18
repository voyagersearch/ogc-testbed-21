/*
  # Fix Security Issues
  
  1. Function Security
    - Fix search_path mutability for update_updated_at_column function
    - Set explicit search_path to prevent SQL injection vulnerabilities
    - Recreate all dependent triggers
  
  2. Security Issues That Cannot Be Fixed Via Migration
    - Unused indexes: These are intentional and will be used once data is populated
    - Auth DB connection strategy: Must be changed to percentage-based in Supabase Dashboard Settings
    - PostGIS extension in public schema: Cannot be moved after installation (PostGIS limitation)
    - RLS on spatial_ref_sys: System table owned by postgres superuser, cannot be modified
  
  3. Resolution
    - The spatial_ref_sys table is a PostGIS system reference table that is read-only
    - No user data is stored in it, so the RLS warning can be safely ignored
    - It contains coordinate system definitions used by PostGIS
*/

-- Fix function search_path mutability
-- Drop function with CASCADE to remove dependent triggers
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Recreate the function with explicit search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers for all tables
DROP TRIGGER IF EXISTS update_stac_items_updated_at ON stac_items;
CREATE TRIGGER update_stac_items_updated_at
  BEFORE UPDATE ON stac_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stac_collections_updated_at ON stac_collections;
CREATE TRIGGER update_stac_collections_updated_at
  BEFORE UPDATE ON stac_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
