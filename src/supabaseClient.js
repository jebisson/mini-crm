import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lmubqwsmvxykxtybdnng.supabase.co";
const supabaseAnonKey = "sb_publishable_jjDkdR6dxjj1LTAmViTkLw_sHM9LSLn";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);