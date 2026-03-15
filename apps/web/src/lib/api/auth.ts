import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServiceClient() {
  // Fall back to NEXT_PUBLIC_* variants which are always available
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServiceClient(url, key);
}

export async function getAuthenticatedUser() {
  // Build mock user at call time (not module load time) so env vars are available
  const userId =
    process.env.DEV_USER_ID ??
    process.env.NEXT_PUBLIC_DEV_USER_ID ??
    "8e2cd293-020f-4896-9f57-bd27cc487165";

  const mockUser: User = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email: "dev@localhost",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: new Date().toISOString(),
  };

  return { user: mockUser, supabase: getServiceClient(), error: null };
}

// Keep this export shape so API routes that destructure `error` still compile.
export type AuthResult = Awaited<ReturnType<typeof getAuthenticatedUser>> & {
  error: ReturnType<typeof NextResponse.json> | null;
};
