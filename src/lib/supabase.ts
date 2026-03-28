import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://znsvwgztckihvevoqgkh.supabase.co';
const supabaseAnonKey = 'sb_publishable_9voPsGZHBEbv-5QJK3XF-w_sbpvYsn-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
