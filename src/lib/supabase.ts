import { createClient } from '@supabase/supabase-js';

// Strictly hardcoded to ensure it points to the iokcbcxmxaryoqioqfhz project
// where the 'media' bucket was just created.
const supabaseUrl = 'https://iokcbcxmxaryoqioqfhz.supabase.co';
const supabaseAnonKey = 'sb_publishable_kbs8eIasAmx4yoauqS6v7A_QAvq3rVh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
