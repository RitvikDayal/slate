import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/api/auth";
import { format } from "date-fns";

export async function GET() {
  const { user, supabase, error } = await getAuthenticatedUser();
  if (error) return error;
  const today = format(new Date(), "yyyy-MM-dd");
  const { data, error: dbError } = await supabase
    .from("items")
    .select("*, item_labels(label_id)")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .eq("is_completed", false)
    .gt("due_date", today)
    .order("due_date")
    .order("position");
  if (dbError)
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json(data);
}
