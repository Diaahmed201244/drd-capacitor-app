import { createClient } from "@supabase/supabase-js";
import { environment } from "../src/environment";

const supabaseUrl = environment.supabase.url;
const supabaseAnonKey = environment.supabase.anonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase credentials. Please check your environment configuration.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
