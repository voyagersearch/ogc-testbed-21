import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserPreferences {
  id?: string;
  session_id?: string;
  interface_mode: 'voyager' | 'stac_browser' | 'ogc_records';
  theme: 'light' | 'dark';
  default_basemap: string;
  saved_searches: any[];
  favorites: string[];
  view_history: string[];
  created_at?: string;
  updated_at?: string;
}

function getSessionId(): string {
  let sessionId = localStorage.getItem('session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    localStorage.setItem('session_id', sessionId);
  }
  return sessionId;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const sessionId = getSessionId();

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user preferences:', error);
  }

  if (data) {
    return data;
  }

  const defaultPreferences: UserPreferences = {
    session_id: sessionId,
    interface_mode: 'voyager',
    theme: 'light',
    default_basemap: 'openstreetmap',
    saved_searches: [],
    favorites: [],
    view_history: []
  };

  const { data: newData, error: insertError } = await supabase
    .from('user_preferences')
    .insert(defaultPreferences)
    .select()
    .single();

  if (insertError) {
    console.error('Error creating user preferences:', insertError);
    return defaultPreferences;
  }

  return newData || defaultPreferences;
}

export async function updateUserPreferences(updates: Partial<UserPreferences>): Promise<boolean> {
  const sessionId = getSessionId();

  const { error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('session_id', sessionId);

  if (error) {
    console.error('Error updating user preferences:', error);
    return false;
  }

  return true;
}

export async function setInterfaceMode(mode: 'voyager' | 'stac_browser' | 'ogc_records'): Promise<boolean> {
  return updateUserPreferences({ interface_mode: mode });
}

export async function addFavorite(itemId: string): Promise<boolean> {
  const prefs = await getUserPreferences();
  const favorites = [...prefs.favorites];

  if (!favorites.includes(itemId)) {
    favorites.push(itemId);
    return updateUserPreferences({ favorites });
  }

  return true;
}

export async function removeFavorite(itemId: string): Promise<boolean> {
  const prefs = await getUserPreferences();
  const favorites = prefs.favorites.filter(id => id !== itemId);
  return updateUserPreferences({ favorites });
}

export async function addToViewHistory(itemId: string): Promise<boolean> {
  const prefs = await getUserPreferences();
  const viewHistory = [itemId, ...prefs.view_history.filter(id => id !== itemId)].slice(0, 50);
  return updateUserPreferences({ view_history: viewHistory });
}
