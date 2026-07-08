import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !supabaseUrl?.includes("your_") &&
  !supabaseAnonKey?.includes("your_");

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

