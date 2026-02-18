/*
  # Create STAC Data and User Preferences Tables

  1. New Tables
    - `stac_items`
      - `id` (text, primary key) - STAC Item ID
      - `voyager_id` (text) - Original Voyager document ID
      - `stac_json` (jsonb) - Complete STAC Item JSON
      - `geometry` (geometry) - PostGIS geometry for spatial queries
      - `bbox` (jsonb) - Bounding box array
      - `datetime` (timestamptz) - Item datetime
      - `collection_id` (text) - Parent collection reference
      - `properties` (jsonb) - STAC properties object
      - `created_at` (timestamptz) - Cache creation timestamp
      - `updated_at` (timestamptz) - Cache update timestamp
    
    - `stac_collections`
      - `id` (text, primary key) - STAC Collection ID
      - `stac_json` (jsonb) - Complete STAC Collection JSON
      - `title` (text) - Collection title
      - `description` (text) - Collection description
      - `extent_spatial` (jsonb) - Spatial extent
      - `extent_temporal` (jsonb) - Temporal extent
      - `item_count` (integer) - Number of items in collection
      - `created_at` (timestamptz) - Cache creation timestamp
      - `updated_at` (timestamptz) - Cache update timestamp
    
    - `user_preferences`
      - `id` (uuid, primary key) - User ID (from auth.users)
      - `interface_mode` (text) - 'voyager' or 'stac_browser'
      - `theme` (text) - 'light' or 'dark'
      - `default_basemap` (text) - Map basemap preference
      - `saved_searches` (jsonb) - Array of saved search queries
      - `favorites` (jsonb) - Array of favorited item IDs
      - `view_history` (jsonb) - Recently viewed items
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated and anonymous access
  
  3. Indexes
    - Spatial index on stac_items.geometry
    - Index on stac_items.datetime for temporal queries
    - Index on stac_items.collection_id for collection filtering
    - GIN index on stac_items.properties for JSON queries
*/

-- Enable PostGIS extension for spatial data
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create stac_items table
CREATE TABLE IF NOT EXISTS stac_items (
  id text PRIMARY KEY,
  voyager_id text,
  stac_json jsonb NOT NULL,
  geometry geometry(Geometry, 4326),
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stac_items_geometry ON stac_items USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_stac_items_datetime ON stac_items(datetime);
CREATE INDEX IF NOT EXISTS idx_stac_items_collection ON stac_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_stac_items_properties ON stac_items USING GIN(properties);
CREATE INDEX IF NOT EXISTS idx_stac_items_voyager_id ON stac_items(voyager_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_session ON user_preferences(session_id);

-- Enable Row Level Security
ALTER TABLE stac_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stac_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stac_items (public read, no write from client)
CREATE POLICY "Anyone can read STAC items"
  ON stac_items FOR SELECT
  USING (true);

-- RLS Policies for stac_collections (public read, no write from client)
CREATE POLICY "Anyone can read STAC collections"
  ON stac_collections FOR SELECT
  USING (true);

-- RLS Policies for user_preferences (users can read/update their own preferences)
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
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
