import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { reorderItemsSchema } from "@ai-todo/shared";

export async function POST(request: Request) {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = reorderItemsSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const data = parsed.data;
  const updates =
    "orderedIds" in data
      ? data.orderedIds.map((id, index) =>
          supabase
            .from("items")
            .update({ position: index })
            .eq("id", id)
            .eq("user_id", user.id)
        )
      : data.items.map(({ id, position }) =>
          supabase
            .from("items")
            .update({ position })
            .eq("id", id)
            .eq("user_id", user.id)
        );

  await Promise.all(updates);
  return NextResponse.json({ success: true });
}
