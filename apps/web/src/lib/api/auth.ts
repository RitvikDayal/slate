import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getServiceClient() {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServiceClient(url, key);
}

export async function getAuthenticatedUser() {
  // Development bypass — uses mock user + service client
  if (process.env.DEV_SKIP_AUTH === "true") {
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

  // Production — use real Supabase auth
  const supabase = await createSSRClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null as unknown as User,
      supabase: getServiceClient(),
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  // Use service client for API routes (bypasses RLS for server-side operations)
  return { user, supabase: getServiceClient(), error: null };
}

export type AuthResult = Awaited<ReturnType<typeof getAuthenticatedUser>> & {
  error: ReturnType<typeof NextResponse.json> | null;
};
