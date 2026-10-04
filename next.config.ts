import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Vercel's Supabase integration injects SUPABASE_URL and SUPABASE_ANON_KEY
    // but client components need the NEXT_PUBLIC_ prefix to access them.
    // This maps the server-side vars so the browser can use them.
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  },
};

export default nextConfig;
