import type { Database } from "@ai-todo/shared";
import { createClient } from "@supabase/supabase-js";

/**
 * Creates a typed Supabase client using the Database schema.
 *
 * NOTE: We use `createClient` from `@supabase/supabase-js` rather than
 * `createBrowserClient` from `@supabase/ssr` because the SSR package
 * (v0.6.x) has a type parameter mismatch with supabase-js v2.99+ that
 * causes the Database generic to resolve to `never`.
 */
export function createTypedClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
