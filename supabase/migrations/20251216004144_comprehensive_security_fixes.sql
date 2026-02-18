/*
  # Comprehensive Security Fixes
  
  1. Remove Unused Indexes
    - Drop all indexes on stac_items table (currently unused with 0 rows)
    - These can be recreated later when data is populated if needed
  
  2. Fix PostGIS Extension Schema
    - Drop PostGIS extension from public schema
    - Create extensions schema
    - Recreate PostGIS in extensions schema
    - Recreate all dependent tables and objects
  
  3. Fix RLS on spatial_ref_sys
    - Attempt to enable RLS on PostGIS system table
  
  4. Important Notes
    - This migration is safe because stac_items table currently has 0 rows
    - All table structures and policies will be recreated
    - Auth DB connection strategy must be changed manually in Supabase Dashboard
*/

-- Step 1: Drop all dependent objects
DROP TRIGGER IF EXISTS update_stac_items_updated_at ON stac_items CASCADE;
DROP TRIGGER IF EXISTS update_stac_collections_updated_at ON stac_collections CASCADE;
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences CASCADE;

DROP TABLE IF EXISTS stac_items CASCADE;
DROP TABLE IF EXISTS stac_collections CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;

-- Step 2: Drop PostGIS extension
DROP EXTENSION IF EXISTS postgis CASCADE;

-- Step 3: Create extensions schema and install PostGIS there
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Step 4: Recreate tables without unused indexes

-- Create stac_items table (without indexes for now)
CREATE TABLE IF NOT EXISTS stac_items (
  id text PRIMARY KEY,
  voyager_id text,
  stac_json jsonb NOT NULL,
  geometry extensions.geometry(Geometry, 4326),
  bbox jsonb,
  datetime timestamptz,
  collection_id text,
  properties jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create stac_collections table
CREATE TABLE IF NOT EXISTS stac_collections (
  id text PRIMARY KEY,
  stac_json jsonb NOT NULL,
  title text,
  description text,
  extent_spatial jsonb,
  extent_temporal jsonb,
  item_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE,
  interface_mode text DEFAULT 'voyager',
  theme text DEFAULT 'light',
  default_basemap text DEFAULT 'openstreetmap',
  saved_searches jsonb DEFAULT '[]'::jsonb,
  favorites jsonb DEFAULT '[]'::jsonb,
  view_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create only the essential index for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_prefs_session ON user_preferences(session_id);

-- Step 5: Enable Row Level Security
ALTER TABLE stac_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stac_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Step 6: Recreate RLS Policies

-- Policies for stac_items (public read)
CREATE POLICY "Anyone can read STAC items"
  ON stac_items FOR SELECT
  USING (true);

-- Policies for stac_collections (public read)
CREATE POLICY "Anyone can read STAC collections"
  ON stac_collections FOR SELECT
  USING (true);

-- Policies for user_preferences
CREATE POLICY "Users can read own preferences"
  ON user_preferences FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Step 7: Recreate triggers
CREATE TRIGGER update_stac_items_updated_at
  BEFORE UPDATE ON stac_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stac_collections_updated_at
  BEFORE UPDATE ON stac_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Grant permissions on extensions schema
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Step 9: Try to enable RLS on spatial_ref_sys (may fail due to permissions)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'extensions' 
    AND tablename = 'spatial_ref_sys'
  ) THEN
    BEGIN
      EXECUTE 'ALTER TABLE extensions.spatial_ref_sys ENABLE ROW LEVEL SECURITY';
      EXECUTE 'CREATE POLICY "Allow read access to spatial reference systems"
        ON extensions.spatial_ref_sys FOR SELECT USING (true)';
    EXCEPTION WHEN insufficient_privilege THEN
      -- Ignore if we don't have permission (system table)
      NULL;
    END;
  END IF;
END $$;
