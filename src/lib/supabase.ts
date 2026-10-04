import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://iokcbcxmxaryoqioqfhz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_kbs8eIasAmx4yoauqS6v7A_QAvq3rVh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
